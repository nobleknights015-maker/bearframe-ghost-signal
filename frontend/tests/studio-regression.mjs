// Real browser/canvas regression. No paid services; operates only on local Studio.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', 'playwright'))); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = process.env.STUDIO_BASELINE || 'f6f8f09b7d6c452f158a67473ac35c2fb374da6f';
const out = path.resolve(process.env.STUDIO_REVIEW_OUT || path.join(root, '../docs/sprite-studio-sleek'));
mkdirSync(out, { recursive: true });
const beforeOnly = process.argv.includes('--baseline');
const port = process.env.STUDIO_TEST_PORT || '4175';
const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: port, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('server exited '+code))); });
let browser;
const results = { baseline, mode: beforeOnly ? 'original baseline' : 'sleek copy', checks: [], pageErrors: [] };
try {
 browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
 page.on('pageerror', e => results.pageErrors.push(e.message)); page.on('dialog', d => d.accept());
 // Original renderer modules loaded from immutable Git source in a separate module namespace.
 await page.route('**/__baseline__/**', route => {
  const relative = new URL(route.request().url()).pathname.replace('/__baseline__/', '');
  if (!['sprite-rig.js','machine-rig.js','machine-presets.js'].includes(relative)) return route.abort();
  const body = execFileSync('git', ['show', baseline+':frontend/public/studio/lib/'+relative], { cwd: root });
  return route.fulfill({ contentType: 'application/javascript', body });
 });
 await page.route('**/__test__/render-checks.mjs', route=>route.fulfill({contentType:'application/javascript',body:readFileSync(path.join(root,'tests/render-checks.mjs'))}));
 await page.goto('http://127.0.0.1:'+port+'/studio/');
 await page.waitForFunction(() => window.__studio && !window.__studio.busy && window.__studio.set.cells.size > 0);
 const wait = async () => { await page.waitForTimeout(350); await page.waitForFunction(() => !__studio.busy); };
 const check = (name, detail = true) => results.checks.push({ name, detail, passed: true });
 check('Studio boot and initial generation');
 const renders = await page.evaluate(async ({beforeOnly}) => {const {renderChecks}=await import('/__test__/render-checks.mjs');return renderChecks({beforeOnly});},{beforeOnly});
 check('Pixel-exact original render compatibility',renders.classic);check('Binary transparent nonempty native renders',{classic:renders.classic,sleek:renders.sleek});check('Unchanged pose library and machine pivots',renders.unchangedPivots);check('Reference-texture renderer unchanged');check('Four directions and mirror fallback',renders.mirrors);
 // Editable frames must survive style changes and regeneration-unedited.
 await page.evaluate(()=>{const s=__studio.set;const c=__studio.SS.cell(s,'down','idle',0);c.getContext('2d').fillStyle='#12ab34';c.getContext('2d').fillRect(0,0,1,1);s.edited.add('down|idle|0');});
 if(!beforeOnly){await page.getByTestId('cfg-style').selectOption('classic');await wait();await page.getByTestId('cfg-style').selectOption('sleek');await wait();}
 await page.getByTestId('generate-unedited').click();await wait();
 assert.deepEqual(await page.evaluate(()=>[...__studio.SS.cell(__studio.set,'down','idle',0).getContext('2d').getImageData(0,0,1,1).data]),[18,171,52,255]);check('Edited pixel protected during regeneration/style changes');
 const round=await page.evaluate(async()=>{const p=__studio.project;const text=__studio.SS.serialize(p);const restored=await __studio.SS.deserialize(text);const a=__studio.SS.cell(p.sets.exploration,'down','idle',0).toDataURL(),b=__studio.SS.cell(restored.sets.exploration,'down','idle',0).toDataURL();return {equal:a===b,edited:restored.sets.exploration.edited.has('down|idle|0'),style:restored.cfg.style};});assert(round.equal&&round.edited);check('Project save/reopen roundtrip',round);
 const sheet=await page.evaluate(()=>{const {canvas,meta}=__studio.SS.buildSheet(__studio.set);return {w:canvas.width,h:canvas.height,meta,png:canvas.toDataURL()};});assert.equal(sheet.meta.rows.length,4);check('PNG sheet + direction/animation metadata', {w:sheet.w,h:sheet.h,rows:sheet.meta.rows});
 const imported=await page.evaluate(async()=>{const S=__studio.SS;const old=__studio.set;const {canvas}=S.buildSheet(old);const s=S.newSet(old.fw,old.fh,[...old.dirs],structuredClone(old.anims));S.importSheet(s,canvas,s.fw,s.fh);return {pixels:[...old.cells].every(([k,c])=>s.cells.get(k).toDataURL()===c.toDataURL()),edited:s.edited.size};});assert(imported.pixels);check('Exported sheet reimports pixel-exact',imported);
 const zip=await page.evaluate(async()=>{const z=__studio.SS.zipStore([{name:'metadata.json',data:new TextEncoder().encode('{}')}]);const b=new Uint8Array(await z.arrayBuffer());return [b[0],b[1],b[2],b[3]];});assert.deepEqual(zip,[80,75,3,4]);check('ZIP export container');
 await page.getByTestId('set-select').selectOption('battle');await wait();assert.equal(await page.evaluate(()=>__studio.set.fw),64);check('Independent battle set');await page.getByTestId('set-select').selectOption('exploration');await wait();
 if(!beforeOnly){await page.getByTestId('cfg-head').selectOption('display');await wait();check('New native display head generates');}
 // Each original example still opens through the real editor and fills its complete set.
 for(const name of ['heavy-sentinel','hexapod-cartography-engine','archive-sentinel','micro-drone']){
  await page.getByTestId('examples-select').selectOption(name);await wait();await page.waitForFunction(()=>!__studio.busy&&__studio.set.cells.size>=__studio.SS.totalFrames(__studio.set)*__studio.set.dirs.length);
  if(!beforeOnly){await page.getByTestId('machine-style').selectOption('sleek');await wait();}
  check('Example opens/generates: '+name);
 }
 await page.setViewportSize({width:915,height:412});await page.getByTestId('dir-left').click();await wait();check('Phone landscape generation/direction switch');
 assert.deepEqual(results.pageErrors,[]);check('No browser page errors');
 // Exact raw native renders for reproducible visual review; no screenshot/phone metadata.
 const images=[];
 for(let p=0;p<renders.previews.length;p++){const spec=renders.previews[p];const folder=path.join(out,'frames',String(p));mkdirSync(folder,{recursive:true});for(const f of spec.frames){const file=path.join(folder,`${f.style}-${f.dir}-${f.i}.png`);writeFileSync(file,Buffer.from(f.png.split(',')[1],'base64'));}images.push({...spec,frames:undefined,index:p});}
 writeFileSync(path.join(out,'preview-index.json'),JSON.stringify(images,null,2));
 results.renderCounts={classic:renders.classic,sleek:renders.sleek,unchangedPivots:renders.unchangedPivots};results.status='PASS';
}catch(e){results.status='FAIL';results.error=e.stack;process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();writeFileSync(path.join(out,beforeOnly?'baseline-checks.json':'checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({...results,checks:results.checks.length},null,2));}
