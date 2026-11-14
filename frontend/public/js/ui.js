// In-game interface layer (HUD, comms dialog, ancient terminal, menus).
const $ = id => document.getElementById(id);

export class UI {
  constructor(sfx) {
    this.sfx = sfx; this.queue = []; this.line = null; this.shown = 0; this.cb = null; this.toastT = 0; this.termCb = null;
    $('dialog').addEventListener('pointerdown', e => { e.preventDefault(); this.advance(); });
    $('terminal-close').addEventListener('click', () => this.closeTerminal());
    $('case-close').addEventListener('click', () => this.closeCase());
    $('tab-ev').addEventListener('click', () => this.caseTab('ev'));
    $('tab-logs').addEventListener('click', () => this.caseTab('logs'));
  }
  show(id, on) { $(id).classList.toggle('hidden', !on); }
  visible(id) { return !$(id).classList.contains('hidden'); }

  say(lines, cb) { this.queue = lines.slice(); this.cb = cb; this.show('dialog', true); this.show('prompt', false); this.next(); }
  next() {
    this.line = this.queue.shift();
    if (!this.line) { this.show('dialog', false); const cb = this.cb; this.cb = null; if (cb) cb(); return; }
    const s = this.line.s; this.shown = 0;
    $('dialog').className = s === 'SYSTEM' ? 'sys' : s.startsWith('UNIDENTIFIED INDIVIDUAL') ? 'ind' : s.startsWith('UNIDENTIFIED') ? 'unk' : s.startsWith('DIRECTOR') ? 'mira' : '';
    $('dialog-speaker').textContent = s; $('dialog-text').textContent = '';
    if (s.startsWith('UNIDENTIFIED //') || this.line.fx === 'static') this.sfx.static(); else this.sfx.blip();
  }
  advance() { if (this.choiceCb || !this.line) return; if (this.shown < this.line.t.length) { this.shown = this.line.t.length; $('dialog-text').textContent = this.line.t; } else this.next(); }
  choose(prompt, options, cb) {
    this.choiceCb = cb; this.line = null; this.show('dialog', true); this.show('prompt', false); $('dialog').className = 'choice';
    $('dialog-speaker').textContent = 'WRAITH // DECISION'; $('dialog-text').textContent = prompt;
    const box = $('dialog-choices'); box.innerHTML = '';
    options.forEach((o, i) => { const b = document.createElement('button'); b.className = 'menu-btn sm choice-btn'; b.textContent = `${i + 1}. ${o}`; b.dataset.testid = 'choice-' + (i + 1); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.pick(i); }); box.appendChild(b); });
    this.sfx.beep();
  }
  pick(i) { const cb = this.choiceCb; if (!cb) return; this.choiceCb = null; $('dialog-choices').innerHTML = ''; this.show('dialog', false); cb(i); }

  openCase(cf, cb) { this.cf = cf; this.caseCb = cb; this.show('casefile', true); this.caseTab(this.tab || 'ev'); }
  closeCase() { if (!this.visible('casefile')) return; this.show('casefile', false); const cb = this.caseCb; this.caseCb = null; if (cb) cb(); }
  caseTab(tab) {
    this.tab = tab; const cf = this.cf, items = tab === 'ev' ? cf.ev : cf.logs, list = $('case-list');
    $('tab-ev').textContent = `EVIDENCE (${cf.ev.length})`; $('tab-logs').textContent = `LOG ARCHIVE (${cf.logs.length})`;
    $('tab-ev').classList.toggle('active', tab === 'ev'); $('tab-logs').classList.toggle('active', tab === 'logs');
    list.innerHTML = ''; $('case-detail').textContent = items.length ? '' : (tab === 'ev' ? 'No evidence recorded.\n\nSCAN to mark anomalies, then EXAMINE them to log evidence.' : 'No terminal logs recovered yet.');
    items.forEach((it, i) => {
      const li = document.createElement('li'), b = document.createElement('button'); b.className = 'case-item'; b.dataset.testid = 'case-item-' + it.id;
      b.textContent = `${it.m === 'm2' ? 'M02' : 'M01'} ${it.cat ? '[' + it.cat + '] ' : ''}${it.title}`;
      const open = () => { [...list.querySelectorAll('.case-item')].forEach(x => x.classList.remove('active')); b.classList.add('active'); $('case-detail').textContent = it.title + '\n' + '-'.repeat(Math.min(34, it.title.length)) + '\n\n' + it.text; };
      b.addEventListener('click', open); li.appendChild(b); list.appendChild(li); if (i === items.length - 1) open();
    });
  }
  get talking() { return !!this.line; }

  terminal(title, text, cb) { this.termCb = cb; $('terminal-title').textContent = title; $('terminal-text').textContent = text; this.show('terminal', true); this.sfx.beep(); }
  closeTerminal() { if (!this.visible('terminal')) return; this.show('terminal', false); const cb = this.termCb; this.termCb = null; if (cb) cb(); }

  toast(text, sec = 3) { $('toast').textContent = text; this.show('toast', true); this.toastT = sec; }
  update(dt) {
    if (this.line && this.shown < this.line.t.length) { this.shown = Math.min(this.line.t.length, this.shown + dt * 70); $('dialog-text').textContent = this.line.t.slice(0, this.shown | 0); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.show('toast', false); }
  }
  hud(energy, objective, status, prompt, stealth) {
    if (stealth && stealth[0] !== this._st) { this._st = stealth[0]; $('hud-stealth').textContent = stealth[0]; $('hud-stealth').className = stealth[1]; }
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
