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
  ui.show('title', true); $('btn-continue').disabled = !store.load(); ui.show('btn-m2', !!store.loadProgress().unlocked.m2); refreshTouch();
}
function titleSprite(now) {
  const c = $('title-sprite').getContext('2d'), f = IDLE0 + (Math.floor(now / 320) % IDLEN); c.clearRect(0, 0, FW, FH); c.drawImage(game.sheet, f * FW, 0, FW, FH, 0, 0, FW, FH);
}
function begin(snap, missionId) {
  sfx.init(); ui.show('title', false); ui.show('ending', false);
  const id = (snap && snap.mission) || missionId || FIRST_MISSION; let carry = null;
  if (!snap && id !== FIRST_MISSION) { const pc = store.loadProgress().case; if (pc) carry = { ev: pc.ev.filter(e => e.m !== id), logs: pc.logs.filter(l => l.m !== id) }; }
  ui.fade(true);
  game.start(MISSIONS[id], snap, carry); refreshTouch();
  setTimeout(() => ui.fade(false), 120);
  if (!snap) { $('card-num').textContent = 'MISSION ' + (id === 'm2' ? '02' : '01'); $('card-title').textContent = MISSIONS[id].title; const cd = $('card'); cd.classList.remove('play'); void cd.offsetWidth; cd.classList.add('play'); }
  try { if (coarse && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (_) {}
}

game.onPause = () => { game.mode = 'pause'; ui.objectives(game.m.objectives(game)); $('pause-note').textContent = ''; ui.show('pause', true); sfx.blip(); };
game.onResume = () => { ui.show('pause', false); ui.show('settings', false); game.mode = 'play'; };
game.onEnd = (g) => {
  const time = g.time, stats = g.stats, e = g.m.ending(g);
  const mm = String(Math.floor(time / 60)).padStart(2, '0'), ss = String(Math.floor(time % 60)).padStart(2, '0');
  $('ending-title').textContent = e.title;
  $('ending-stats').textContent = `TIME INSIDE ............. ${mm}:${ss}\nSCANNER PULSES .......... ${stats.scans}\nSECURITY UNIT CONTACTS .. ${stats.hits}\nCHECKPOINT RESTORES ..... ${stats.restores}\n` + e.lines.join('\n');
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
addEventListener('ghost-signal-host-pause',()=>{if(game.mode==='play')game.onPause();});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'play') game.onPause(); });

// Controller focus follows the existing Ghost Signal overlay buttons and styling.
let lastPadMenuDir = null;
function navigateControllerOverlay(pad) {
  const roots = ['aeon-v5-choose', 'aeon-confirm', 'rpg-lab-battle', 'rpg-lab-menu', 'settings', 'casefile', 'pause', 'terminal', 'ending', 'title', 'dialog'];
  const root = roots.map($).find(node => node && !node.classList.contains('hidden'));
  if (!root) { lastPadMenuDir = null; return; }
  const buttons = [...root.querySelectorAll('button')].filter(b => !b.disabled && b.getClientRects().length);
  if (!buttons.length) { lastPadMenuDir = pad.dir; return; }
  const activeIndex = buttons.indexOf(document.activeElement);
  if (pad.dir && pad.dir !== lastPadMenuDir) {
    const delta = ['up', 'left'].includes(pad.dir) ? -1 : 1;
    const next = activeIndex < 0 ? (delta < 0 ? buttons.length - 1 : 0) : (activeIndex + delta + buttons.length) % buttons.length;
    buttons[next].focus();
  }
  lastPadMenuDir = pad.dir;
  if (pad.actions.includes('interact')) {
    const active = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
    if (game.mode === 'choice' && root.id === 'dialog') {
      const choice = [...root.querySelectorAll('.choice-btn')].indexOf(active);
      if (choice >= 0) ui.pick(choice);
    } else active.click();
  }
  if (pad.actions.includes('back')) {
    if (root.id === 'aeon-v5-choose') [...root.querySelectorAll('button')].find(b=>b.textContent==='BACK')?.click();
    else if (root.id === 'aeon-confirm') root.querySelector('button')?.click();
    else if (root.id === 'settings') $('settings-close').click();
    else if (root.id === 'casefile') ui.closeCase();
    else if (root.id === 'terminal') ui.closeTerminal();
    else if (root.id === 'pause') game.onResume();
    else if (root.id === 'rpg-lab-menu') game.onResume(); // gamepad B backs out of RPG menu, matching keyboard Escape
    else if (root.id === 'rpg-lab-battle') root.querySelector('[data-campaign-battle-back]')?.click(); // cancel target only
  }
}

let last = performance.now(), slow = 0, frames = 0;
function loop(now) {
  const raw = now - last, dt = Math.min(.05, raw / 1000); last = now;
  try {
    if (navigator.getGamepads) {
      const modal = ['title','pause','settings','ending','case','terminal','choice','rpgmenu','battle'].includes(game.mode);
      const pad = input.pollGamepads(navigator.getGamepads(), !modal);
      if (modal) navigateControllerOverlay(pad);
      else lastPadMenuDir = null;
    }
  } catch (_) { /* Gamepad API may be unavailable in restricted browsers. */ }
  if (game.mode === 'play' && !game.lowFx) { frames++; if (raw > 26) slow++; if (frames >= 180) { if (slow > 90) game.lowFx = true; frames = slow = 0; } }
  game.update(dt); if (game.mode === 'title' || !game.m) titleSprite(now); else game.render();
  $('t-light').classList.toggle('on', !!(game.player && game.player.light));
  requestAnimationFrame(loop);
}
showTitle();
if (location.pathname.endsWith('/campaign.html')) {
  import('./engine/campaign-game.js').then(({mountCampaignGame})=>
    mountCampaignGame({game,ui,sfx,touchMode,refreshTouch}))
    .catch(error=>{console.error('Private campaign initialization failed',error);
      ui.toast('CAMPAIGN INSTALLATION MISSING — SEE CONSOLE',5);});
} else if (location.pathname.endsWith('/aeon.html')) {
  import('./engine/aeon-game.js').then(({mountAeonGame})=>mountAeonGame({game,ui,sfx,touchMode,refreshTouch}))
    .catch(error=>{console.error('Aeon initialization failed',error);ui.toast('AEON INITIALIZATION FAILED',5);});
} else if (new URLSearchParams(location.search).get('connected-lab') === '1') {
  import('./engine/connected-lab.js').then(({mountConnectedLab}) =>
    mountConnectedLab({game,ui,sfx,touchMode}).then(refreshTouch)
  ).catch(error=>{
    console.error('Connected expedition test failed to mount',error);
    ui.toast('CONNECTED EXPEDITION INIT FAILED — SEE CONSOLE',5);
  });
} else if (new URLSearchParams(location.search).get('rpg-lab') === '1') {
  import('./engine/rpg-lab.js').then(async ({mountRpgLab}) => {
    let v5=null;
    if(new URLSearchParams(location.search).get('aeon-v5')==='1') {
      // This opt-in path only loads verified local/private art once installed.
      // Never override the original game, Wraith art or other lab saves.
      const module=await import('./engine/aeon-v5-bridge.js');
      v5=await module.prepareAeonV5();
    }
    mountRpgLab({game, ui, sfx, touchMode,v5});
    refreshTouch();
    const requested=new URLSearchParams(location.search).get('character-demo');
    if(requested)import('./engine/rpg-field-art.js')
      .then(({bindGeneratedFieldSprite})=>bindGeneratedFieldSprite(game,requested))
      .then(result=>{window.__characterDemoReady=result;})
      .catch(error=>{window.__characterDemoError=String(error);console.error('Character preview failed',error);});
  }).catch(error => {
    console.error('Noncanonical RPG integration lab failed to mount', error);
    ui.toast('RPG LAB INIT FAILED — SEE CONSOLE', 5);
  });
}
requestAnimationFrame(loop);
