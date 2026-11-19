// Boot: scaling, menus, settings, main loop.
import { Game, VW, VH } from './game.js';
import { Input } from './engine/input.js';
import { Sfx } from './engine/audio.js';
import { store } from './engine/save.js';
import { UI } from './ui.js';
import { MISSIONS, FIRST_MISSION } from './missions/index.js';
import { FW, FH, IDLE0, IDLEN } from './art/wraith.js';

const $ = id => document.getElementById(id);
const settings = store.loadSettings();
const sfx = new Sfx(); sfx.setVolume(settings.volume);
const input = new Input();
const ui = new UI(sfx);
const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const touchMode = () => settings.touch === 'on' || (settings.touch === 'auto' && coarse);

const game = new Game({ canvas: $('screen'), ui, input, sfx, store, settings, touchMode });
window.__gs = game;

function fit() {
  const s = Math.min(innerWidth / VW, innerHeight / VH), st = $('stage');
  st.style.width = Math.floor(VW * s) + 'px'; st.style.height = Math.floor(VH * s) + 'px';
  document.documentElement.style.setProperty('--u', s + 'px');
}
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();

function refreshTouch() { ui.show('touch', touchMode() && game.mode !== 'title' && game.mode !== 'ending'); }
function showTitle() {
  game.mode = 'title'; ['pause', 'settings', 'ending', 'hud', 'dialog', 'terminal'].forEach(id => ui.show(id, false));
  ['casefile'].forEach(id => ui.show(id, false));
  ui.show('title', true); $('btn-continue').disabled = !store.load(); const progress = store.loadProgress();
  // Pre-expansion owners may already have completed M02 before M03 was introduced.
  let migrated = false;
  if (progress.done.m2 && !progress.unlocked.m3) { progress.unlocked.m3 = true; migrated = true; }
  if (progress.done.m3 && !progress.unlocked.m4) { progress.unlocked.m4 = true; migrated = true; }
  if (progress.done.m4 && !progress.unlocked.m5) { progress.unlocked.m5 = true; migrated = true; }
  if (progress.done.m5 && !progress.unlocked.m6) { progress.unlocked.m6 = true; migrated = true; }
  if (migrated) store.saveProgress(progress);
  ui.show('btn-m2', !!progress.unlocked.m2);
  ui.show('btn-m3', !!progress.unlocked.m3);
  ui.show('btn-m4', !!progress.unlocked.m4);
  ui.show('btn-m5', !!progress.unlocked.m5);
  ui.show('btn-m6', !!progress.unlocked.m6);
  refreshTouch();
}
function titleSprite(now) {
  const c = $('title-sprite').getContext('2d'), f = IDLE0 + (Math.floor(now / 320) % IDLEN); c.clearRect(0, 0, FW, FH); c.drawImage(game.sheet, f * FW, 0, FW, FH, 0, 0, FW, FH);
}
function begin(snap, missionId) {
  sfx.init(); ui.show('title', false); ui.show('ending', false);
  const id = (snap && snap.mission) || missionId || FIRST_MISSION; let carry = null;
  if (!MISSIONS[id]) { showTitle(); return; }
  if (!snap && id !== FIRST_MISSION) { const pc = store.loadProgress().case; if (pc) carry = { ev: pc.ev.filter(e => e.m !== id), logs: pc.logs.filter(l => l.m !== id) }; }
  ui.fade(true);
  game.start(MISSIONS[id], snap, carry); refreshTouch();
  setTimeout(() => ui.fade(false), 120);
  if (!snap) { $('card-num').textContent = 'MISSION ' + (id.slice(1).padStart(2, '0')); $('card-title').textContent = MISSIONS[id].title; const cd = $('card'); cd.classList.remove('play'); void cd.offsetWidth; cd.classList.add('play'); }
  try { if (coarse && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (_) {}
}

game.onPause = () => { game.mode = 'pause'; ui.objectives(game.m.objectives(game)); $('pause-note').textContent = ''; ui.show('pause', true); sfx.blip(); };
game.onResume = () => { ui.show('pause', false); ui.show('settings', false); game.mode = 'play'; };
game.onEnd = (g) => {
  const time = g.time, stats = g.stats, e = g.m.ending(g);
  const mm = String(Math.floor(time / 60)).padStart(2, '0'), ss = String(Math.floor(time % 60)).padStart(2, '0');
  $('ending-title').textContent = e.title;
  $('ending-stats').textContent = `TIME INSIDE ............. ${mm}:${ss}\nSCANNER PULSES .......... ${stats.scans}\nSECURITY UNIT CONTACTS .. ${stats.hits}\nCHECKPOINT RESTORES ..... ${stats.restores}\n` + e.lines.join('\n');
  if (g.m.next) $('btn-next').textContent = 'PROCEED TO MISSION ' + (g.m.next.slice(1).padStart(2, '0'));
  ui.show('btn-next', !!g.m.next); ui.show('ending', true); refreshTouch();
};

$('btn-new').onclick = () => begin(null);
$('btn-continue').onclick = () => { const s = store.load(); if (s) begin(s); };
$('btn-pause').onclick = () => { if (game.mode === 'play') game.onPause(); };
$('btn-resume').onclick = () => game.onResume();
$('btn-save').onclick = () => { $('pause-note').textContent = game.checkpoint(true) ? 'Field record saved to this device.' : 'Could not write to device storage.'; };
$('btn-quit').onclick = () => { game.checkpoint(true); showTitle(); };
$('btn-ending-title').onclick = showTitle;
$('btn-m2').onclick = () => begin(null, 'm2');
$('btn-m3').onclick = () => begin(null, 'm3');
$('btn-m4').onclick = () => begin(null, 'm4');
$('btn-m5').onclick = () => begin(null, 'm5');
$('btn-m6').onclick = () => begin(null, 'm6');
$('btn-next').onclick = () => begin(null, game.m.next);
$('btn-case').onclick = () => game.openCase();
$('btn-pause-case').onclick = () => game.openCase();

let settingsFrom = 'title';
const openSettings = from => { settingsFrom = from; ui.show(from, false); syncSettings(); ui.show('settings', true); };
$('btn-title-settings').onclick = () => openSettings('title');
$('btn-pause-settings').onclick = () => openSettings('pause');
$('settings-close').onclick = () => { ui.show('settings', false); ui.show(settingsFrom, true); };
function syncSettings() {
  $('set-volume').value = Math.round(settings.volume * 100);
  $('set-flicker').textContent = settings.flicker ? 'ON' : 'REDUCED';
  $('set-touch').textContent = settings.touch.toUpperCase();
}
$('set-volume').oninput = e => { settings.volume = e.target.value / 100; sfx.init(); sfx.setVolume(settings.volume); sfx.blip(); store.saveSettings(settings); };
$('set-flicker').onclick = () => { settings.flicker = !settings.flicker; store.saveSettings(settings); syncSettings(); };
$('set-touch').onclick = () => { settings.touch = { auto: 'on', on: 'off', off: 'auto' }[settings.touch]; store.saveSettings(settings); syncSettings(); refreshTouch(); };

input.bindPad($('dpad'));
input.bindButton($('t-act'), 'interact'); input.bindButton($('t-light'), 'light'); input.bindButton($('t-scan'), 'scan');
function safeBackgroundPause() {
  if (game.mode !== 'play') return;
  game.checkpoint(true);
  game.onPause();
  input.release();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) safeBackgroundPause(); });
addEventListener('ghost-signal-host-pause', safeBackgroundPause);

let last = performance.now(), slow = 0, frames = 0;
function loop(now) {
  const raw = now - last, dt = Math.min(.05, raw / 1000); last = now;
  if (game.mode === 'play' && !game.lowFx) { frames++; if (raw > 26) slow++; if (frames >= 180) { if (slow > 90) game.lowFx = true; frames = slow = 0; } }
  game.update(dt); if (game.mode === 'title') titleSprite(now); else game.render();
  $('t-light').classList.toggle('on', !!(game.player && game.player.light));
  requestAnimationFrame(loop);
}
showTitle();
requestAnimationFrame(loop);
