// In-game interface layer (HUD, comms dialog, ancient terminal, menus).
const $ = id => document.getElementById(id);

export class UI {
  constructor(sfx) {
    this.sfx = sfx; this.queue = []; this.line = null; this.shown = 0; this.cb = null; this.toastT = 0; this.termCb = null;
    $('dialog').addEventListener('pointerdown', e => { e.preventDefault(); this.advance(); });
    $('terminal-close').addEventListener('click', () => this.closeTerminal());
  }
  show(id, on) { $(id).classList.toggle('hidden', !on); }
  visible(id) { return !$(id).classList.contains('hidden'); }

  say(lines, cb) { this.queue = lines.slice(); this.cb = cb; this.show('dialog', true); this.show('prompt', false); this.next(); }
  next() {
    this.line = this.queue.shift();
    if (!this.line) { this.show('dialog', false); const cb = this.cb; this.cb = null; if (cb) cb(); return; }
    const s = this.line.s; this.shown = 0;
    $('dialog').className = s === 'SYSTEM' ? 'sys' : s.startsWith('UNIDENTIFIED') ? 'unk' : '';
    $('dialog-speaker').textContent = s; $('dialog-text').textContent = '';
    if (s.startsWith('UNIDENTIFIED') || this.line.fx === 'static') this.sfx.static(); else this.sfx.blip();
  }
  advance() { if (!this.line) return; if (this.shown < this.line.t.length) { this.shown = this.line.t.length; $('dialog-text').textContent = this.line.t; } else this.next(); }
  get talking() { return !!this.line; }

  terminal(title, text, cb) { this.termCb = cb; $('terminal-title').textContent = title; $('terminal-text').textContent = text; this.show('terminal', true); this.sfx.beep(); }
  closeTerminal() { if (!this.visible('terminal')) return; this.show('terminal', false); const cb = this.termCb; this.termCb = null; if (cb) cb(); }

  toast(text, sec = 3) { $('toast').textContent = text; this.show('toast', true); this.toastT = sec; }
  update(dt) {
    if (this.line && this.shown < this.line.t.length) { this.shown = Math.min(this.line.t.length, this.shown + dt * 70); $('dialog-text').textContent = this.line.t.slice(0, this.shown | 0); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.show('toast', false); }
  }
  hud(energy, objective, status, prompt) {
    const e = Math.max(0, Math.round(energy));
    if (e !== this._e) { this._e = e; $('energy-fill').style.width = e + '%'; $('energy-value').textContent = e; $('energy-fill').parentElement.parentElement.classList.toggle('low', e <= 25); }
    if (objective !== this._o) { this._o = objective; $('objective-text').textContent = objective; }
    if (status !== this._s) { this._s = status; $('hud-status').innerHTML = status; }
    if (prompt !== this._p) { this._p = prompt; this.show('prompt', !!prompt); if (prompt) $('prompt').innerHTML = prompt; }
  }
  objectives(list) {
    $('objective-list').innerHTML = '';
    let open = false;
    for (const o of list) { const li = document.createElement('li'); li.textContent = (!o.done && open) ? '— signal pending —' : o.t; li.className = o.done ? 'done' : open ? 'locked' : ''; if (!o.done) open = true; $('objective-list').appendChild(li); }
  }
  fade(on) { $('fade').classList.toggle('on', on); }
}
