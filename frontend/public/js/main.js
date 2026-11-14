// Boot: scaling, menus, settings, main loop.
import { Game, VW, VH } from './game.js';
import { Input } from './engine/input.js';
import { Sfx } from './engine/audio.js';
import { store } from './engine/save.js';
import { UI } from './ui.js';
import { MISSIONS, FIRST_MISSION } from './missions/index.js';
import { FW, FH } from './art/wraith.js';

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
  ui.show('title', true); $('btn-continue').disabled = !store.load(); refreshTouch();
  const c = $('title-sprite').getContext('2d'); c.clearRect(0, 0, FW, FH); c.drawImage(game.sheet, 0, 0, FW, FH, 0, 0, FW, FH);
}
function begin(snap) {
  sfx.init(); ui.show('title', false);
  game.start(MISSIONS[(snap && snap.mission) || FIRST_MISSION], snap); refreshTouch();
  try { if (coarse && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (_) {}
}

game.onPause = () => { game.mode = 'pause'; ui.objectives(game.m.objectives(game)); $('pause-note').textContent = ''; ui.show('pause', true); sfx.blip(); };
game.onResume = () => { ui.show('pause', false); ui.show('settings', false); game.mode = 'play'; };
game.onEnd = (stats, time) => {
  const mm = String(Math.floor(time / 60)).padStart(2, '0'), ss = String(Math.floor(time % 60)).padStart(2, '0');
  $('ending-stats').textContent = `TIME INSIDE ............. ${mm}:${ss}\nDATA LOGS RECOVERED ..... ${stats.logs} / 3\nSCANNER PULSES .......... ${stats.scans}\nSECURITY UNIT CONTACTS .. ${stats.hits}\nCHECKPOINT RESTORES ..... ${stats.restores}\n\nFACILITY ORIGIN ......... UNRESOLVED\nTRANSMISSION SOURCE ..... UNRESOLVED\nFINAL DOOR .............. SEALED\n\nTO BE CONTINUED.`;
  ui.show('ending', true); refreshTouch();
};

$('btn-new').onclick = () => begin(null);
$('btn-continue').onclick = () => { const s = store.load(); if (s) begin(s); };
$('btn-pause').onclick = () => { if (game.mode === 'play') game.onPause(); };
$('btn-resume').onclick = () => game.onResume();
$('btn-save').onclick = () => { $('pause-note').textContent = game.checkpoint(true) ? 'Field record saved to this device.' : 'Could not write to device storage.'; };
$('btn-quit').onclick = () => { game.checkpoint(true); showTitle(); };
$('btn-ending-title').onclick = showTitle;

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
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'play') game.onPause(); });

let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  game.update(dt); game.render();
  $('t-light').classList.toggle('on', !!(game.player && game.player.light));
  requestAnimationFrame(loop);
}
showTitle();
requestAnimationFrame(loop);
