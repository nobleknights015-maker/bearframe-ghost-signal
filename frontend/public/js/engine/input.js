import { createGamepadReader } from './gamepad.js';
// Keyboard + touch input. Movement is strictly four-directional (last pressed direction wins).
const MOVE = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const ACT = { KeyE: 'interact', Space: 'interact', Enter: 'interact', KeyF: 'light', KeyQ: 'scan', ShiftLeft: 'scan', Escape: 'pause', KeyP: 'pause', KeyC: 'case', Digit1: 'opt1', Digit2: 'opt2' };

export class Input {
  constructor() {
    this.stack = []; this.touchDir = null; this.padDir = null; this.padReader = createGamepadReader(); this.q = [];
    addEventListener('keydown', e => {
      // Modal navigation owns keys it has already handled at document level.
      if (e.defaultPrevented || e.target.tagName === 'INPUT') return;
      const d = MOVE[e.code];
      if (d) { if (!this.stack.includes(d)) this.stack.push(d); e.preventDefault(); }
      else if (ACT[e.code]) { if (!e.repeat) this.q.push(ACT[e.code]); if (e.code === 'Space') e.preventDefault(); }
    });
    addEventListener('keyup', e => { const d = MOVE[e.code]; if (d) this.stack = this.stack.filter(x => x !== d); });
    const release = () => { this.stack = []; this.padDir = null; this.q = []; this.releaseTouch?.(); this.touchDir = null; };
    addEventListener('blur', release);
    addEventListener('ghost-signal-host-pause', release);
    addEventListener('contextmenu', e => e.preventDefault());
  }
  get dir() { return this.touchDir || this.stack[this.stack.length - 1] || this.padDir || null; }
  pollGamepads(pads, queueActions = true) {
    const state = this.padReader.poll(pads);
    this.padDir = state.dir;
    if (queueActions) for (const action of state.actions) {
      if (['interact','scan','light','pause','case'].includes(action)) this.q.push(action);
      else if (action === 'back') this.q.push('pause');
    }
    return state;
  }
  take() { const q = this.q; this.q = []; return q; }
  bindPad(el) {
    const set = e => {
      const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      this.touchDir = Math.hypot(dx, dy) < r.width * .12 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      el.dataset.dir = this.touchDir || '';
    };
    let pointer = null;
    const end = e => {
      if (e && e.pointerId !== pointer) return;
      pointer = null; this.touchDir = null; el.dataset.dir = '';
    };
    this.releaseTouch = () => end();
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (pointer !== null) return;
      pointer = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      set(e);
    });
    el.addEventListener('pointermove', e => { if (e.pointerId === pointer) set(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, end));
  }
  bindButton(el, action) { el.addEventListener('pointerdown', e => { e.preventDefault(); this.q.push(action); }); }
}
