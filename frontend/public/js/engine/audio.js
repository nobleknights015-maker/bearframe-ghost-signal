// Generated retro sound + ambience (WebAudio only, no assets).
export class Sfx {
  constructor() { this.ctx = null; this.vol = .7; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
    const g = this.ctx.createGain(); g.gain.value = .09; lp.connect(g); g.connect(this.master);
    [41, 41.6, 62].forEach(f => { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); });
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = .13; lg.gain.value = .04; lfo.connect(lg); lg.connect(g.gain); lfo.start();
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  tone(f, dur, type = 'square', vol = .12, to = null, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  }
  noise(dur, vol = .1, freq = 1200, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  }
  step() { this.noise(.04, .035, 500); }
  blip() { this.tone(880, .04, 'square', .05); }
  beep() { this.tone(620, .08, 'square', .08); this.tone(930, .1, 'square', .08, null, .08); }
  deny() { this.tone(160, .18, 'square', .1, 110); }
  door() { this.noise(.5, .12, 300); this.tone(70, .5, 'sawtooth', .1, 45); }
  scan() { this.tone(300, .5, 'sine', .14, 1800); this.noise(.3, .04, 3000); }
  stun() { this.tone(900, .35, 'sawtooth', .1, 80); this.noise(.3, .1, 2500); }
  static() { this.noise(.7, .14, 2200); this.noise(.3, .1, 700, .2); }
  alert() { this.tone(520, .12, 'square', .12); this.tone(390, .12, 'square', .12, null, .14); this.tone(520, .12, 'square', .12, null, .28); }
  hit() { this.noise(.2, .2, 900); this.tone(120, .25, 'sawtooth', .16, 50); }
  pickup() { this.tone(520, .07, 'square', .09); this.tone(780, .07, 'square', .09, null, .07); this.tone(1040, .12, 'square', .09, null, .14); }
  charge() { this.tone(220, .3, 'triangle', .1, 660); }
  spark() { this.noise(.15, .2, 4000); this.deny(); }
  power() { this.tone(50, 1.6, 'sawtooth', .16, 200); this.tone(100, 1.6, 'square', .05, 400); this.noise(1.2, .08, 400); }
}
