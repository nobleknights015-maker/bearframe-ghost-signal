// Reference → Sprite dialog for Bearframe Sprite Studio. Everything runs in the browser on the loaded image.
import * as RS from './lib/ref-sprite.js';

const $ = id => document.getElementById(id), DIRS = ['down', 'up', 'right', 'left'], NAMES = { down: 'FRONT', up: 'BACK', right: 'RIGHT SIDE', left: 'LEFT SIDE' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initRefUI(api) {
  let img = null, box = null, drag = null, sel = null; const slots = {}, src = $('r2s-src'), cutc = $('r2s-cut');
  const say = t => { $('r2s-msg').textContent = t; };
  function drawSrc() {
    if (!img) return; const st = $('r2s-stage'), k = Math.min((st.clientWidth - 8) / img.width, (st.clientHeight - 8) / img.height) || 1;
    src.width = Math.max(1, Math.round(img.width * k)); src.height = Math.max(1, Math.round(img.height * k)); const c = src.getContext('2d'); c.drawImage(img, 0, 0, src.width, src.height);
    if (box) { c.strokeStyle = '#ff3b30'; c.lineWidth = 2; c.strokeRect(box.x * src.width, box.y * src.height, box.w * src.width, box.h * src.height); }
  }
  const pos = e => { const r = src.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)]; };
  src.addEventListener('pointerdown', e => { if (!img) return; drag = pos(e); box = null; src.setPointerCapture(e.pointerId); });
  src.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = pos(e); box = { x: Math.min(x, drag[0]), y: Math.min(y, drag[1]), w: Math.abs(x - drag[0]), h: Math.abs(y - drag[1]) }; drawSrc(); });
  src.addEventListener('pointerup', () => { drag = null; if (box && (box.w < .01 || box.h < .01)) box = null; drawSrc(); say(box ? 'Box set. Assign it to a view.' : 'Drag a box around one view of the subject (or assign the whole image).'); });
  const setImage = im => { img = im; box = null; drawSrc(); say('Image loaded. Drag a box around one view of the subject, then assign it.'); };
  const loadUrl = url => new Promise((res, rej) => { const im = new Image(); im.onload = () => { setImage(im); res(); }; im.onerror = () => rej(new Error('not an image')); im.src = url; });
  $('r2s-load').onclick = () => $('r2s-file').click();
  $('r2s-file').onchange = e => { const f = e.target.files[0]; if (f) loadUrl(URL.createObjectURL(f)).catch(err => say('Load failed: ' + err.message)); e.target.value = ''; };

  function assign(dir, b = box) {
    if (!img) return say('Load a reference image first.'); b = b || { x: 0, y: 0, w: 1, h: 1 };
    const sw = Math.max(1, Math.round(b.w * img.width)), sh = Math.max(1, Math.round(b.h * img.height)), k = Math.min(1, 512 / Math.max(sw, sh)), W = Math.max(1, Math.round(sw * k)), H = Math.max(1, Math.round(sh * k));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, b.x * img.width, b.y * img.height, sw, sh, 0, 0, W, H);
    const px = c.getImageData(0, 0, W, H).data; slots[dir] = { px, W, H, mask: RS.segment(px, W, H, { tol: +$('r2s-tol').value }) }; sel = dir; drawSlots(); say(NAMES[dir] + ' assigned. Check the cut-out; click it to remove leftover background.');
  }
  function cutout(s) { const d = new ImageData(new Uint8ClampedArray(s.px), s.W, s.H); for (let i = 0; i < s.W * s.H; i++) if (!s.mask[i]) d.data[i * 4 + 3] = 0; const cv = document.createElement('canvas'); cv.width = s.W; cv.height = s.H; cv.getContext('2d').putImageData(d, 0, 0); return cv; }
  function drawSlots() {
    DIRS.forEach(d => { const b = $('r2s-slot-' + d); b.classList.toggle('on', d === sel); b.textContent = NAMES[d] + (slots[d] ? ': reference' : ': will be reconstructed'); });
    const s = slots[sel]; if (!s) { cutc.width = cutc.height = 1; return; } cutc.width = s.W; cutc.height = s.H; cutc.getContext('2d').drawImage(cutout(s), 0, 0);
  }
  document.querySelectorAll('[data-r2s-assign]').forEach(b => b.onclick = () => assign(b.dataset.r2sAssign));
  DIRS.forEach(d => { $('r2s-slot-' + d).onclick = () => { sel = d; drawSlots(); }; });
  $('r2s-clear').onclick = () => { if (sel) delete slots[sel]; drawSlots(); };
  $('r2s-tol').onchange = () => { const s = slots[sel]; if (s) { s.mask = RS.segment(s.px, s.W, s.H, { tol: +$('r2s-tol').value }); drawSlots(); } };
  cutc.addEventListener('click', e => { const s = slots[sel]; if (!s) return; const r = cutc.getBoundingClientRect(); RS.wand(s.px, s.W, s.H, s.mask, clamp(Math.floor((e.clientX - r.left) / r.width * s.W), 0, s.W - 1), clamp(Math.floor((e.clientY - r.top) / r.height * s.H), 0, s.H - 1), +$('r2s-wtol').value, e.shiftKey ? 1 : 0); drawSlots(); });

  async function generate() {
    const dirs = DIRS.filter(d => slots[d]); if (!dirs.length) return say('Assign at least one reference view first.');
    const n = clamp(+$('r2s-colors').value || 20, 4, 48), maxW = +$('r2s-w').value || 0, sm = [], bb = {}; let Hs = clamp(+$('r2s-h').value || 64, 8, 508);
    for (const d of dirs) {
      const s = slots[d]; let x0 = s.W, x1 = -1, y0 = s.H, y1 = -1, cnt = 0; for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) if (s.mask[y * s.W + x]) { cnt++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) return say(NAMES[d] + ' cut-out is empty. Lower the background tolerance or re-assign.'); bb[d] = [x1 - x0 + 1, y1 - y0 + 1]; const step = Math.max(1, Math.floor(Math.sqrt(cnt / 3000)));
      for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) if (s.mask[y * s.W + x]) { const o = (y * s.W + x) * 4; sm.push([s.px[o], s.px[o + 1], s.px[o + 2]]); }
    }
    if (maxW) for (const d of dirs) Hs = Math.min(Hs, Math.floor((maxW - 7) / 1.1 * bb[d][1] / bb[d][0]));
    const pal = RS.buildPalette(sm, n), sp = {}; for (const d of dirs) sp[d] = RS.pixelize(slots[d].px, slots[d].W, slots[d].H, slots[d].mask, Hs / bb[d][1], pal);
    let out; try { out = RS.buildRig(sp, pal, { name: $('r2s-name').value.trim() || 'reference sprite', type: $('r2s-type').value, fw: maxW }); } catch (e) { return say('Generation failed: ' + e.message); }
    say('Rendering frames…'); const S = await api.apply(out.rig, $('r2s-keep').checked); $('r2s-report').textContent = out.report; compare(S, out.rig); say('Sprite project generated. Close this panel to edit frames; hand-edited frames are kept on regeneration.'); return out;
  }
  // Reference cut-outs beside the generated sprites, plus the walk cycles, for honest visual checking.
  function compare(S, rig) {
    const cv = $('r2s-compare'), z = Math.max(1, Math.floor(150 / S.fh)), cw = Math.max(S.fw * z, 120) + 12, rh = S.fh * z + 26, walk = S.anims.find(a => a.type === 'walk'), idle = S.anims.find(a => a.type === 'idle') || S.anims[0];
    const wz = walk ? Math.max(1, Math.min(z, Math.floor(4 * cw / (walk.frames * S.fw)))) : 1;
    cv.width = cw * 4; cv.height = rh * 2 + (walk ? (S.fh * wz + 20) * 4 : 0) + 8; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#1b2026'; c.fillRect(0, 0, cv.width, cv.height); c.font = '11px monospace';
    DIRS.forEach((d, i) => {
      const x = i * cw + 6; c.fillStyle = '#7f8994'; c.fillText(NAMES[d] + (slots[d] ? ' reference' : ' (no reference)'), x, 12);
      if (slots[d]) { const co = cutout(slots[d]), k = Math.min((cw - 12) / co.width, (rh - 26) / co.height); c.imageSmoothingEnabled = true; c.drawImage(co, x, 18, co.width * k, co.height * k); c.imageSmoothingEnabled = false; }
      c.fillStyle = slots[d] ? '#3fd8e6' : '#ffb347'; c.fillText(slots[d] ? 'sprite from reference' : /mirrored/.test(rig.ref.sources[d]) ? 'sprite: mirrored' : 'sprite: reconstructed', x, rh + 12); c.drawImage(api.SS.cell(S, d, idle.name, 0), x, rh + 18, S.fw * z, S.fh * z);
      if (walk) { const y = rh * 2 + i * (S.fh * wz + 20); c.fillStyle = '#7f8994'; c.fillText('walk ' + d, 6, y + 12); for (let f = 0; f < walk.frames; f++) c.drawImage(api.SS.cell(S, d, walk.name, f), 6 + f * S.fw * wz, y + 16, S.fw * wz, S.fh * wz); }
    });
  }
  $('r2s-go').onclick = generate;
  $('btn-r2s').onclick = () => { $('r2s').hidden = false; drawSrc(); drawSlots(); };
  $('r2s-close').onclick = () => { $('r2s').hidden = true; };
  addEventListener('resize', () => { if (!$('r2s').hidden) drawSrc(); });
  window.__r2s = { loadUrl, assign: (dir, b) => assign(dir, b ? { x: b[0], y: b[1], w: b[2], h: b[3] } : null), generate, slots, clear: () => { DIRS.forEach(d => delete slots[d]); sel = null; drawSlots(); } };
}
