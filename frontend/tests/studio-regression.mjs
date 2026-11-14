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
 await page.route('**/__test__/**', route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!['render-checks.mjs','ring-checks.mjs','chassis-checks.mjs'].includes(name))return route.abort();return route.fulfill({contentType:'application/javascript',body:readFileSync(path.join(root,'tests',name))});});
 await page.route('**/__cloth_before__/**',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!['sprite-rig.js','android-details.js'].includes(name))return route.abort();return route.fulfill({contentType:'application/javascript',body:execFileSync('git',['show','4e69ac187653446e1235001dd3bd1d6196fd8ba0:frontend/public/studio/lib/'+name],{cwd:root})});});
 await page.goto('http://127.0.0.1:'+port+'/studio/');
 await page.waitForFunction(() => window.__studio && !window.__studio.busy && window.__studio.set.cells.size > 0);
 const wait = async () => { await page.waitForTimeout(350); await page.waitForFunction(() => !__studio.busy); };
 const check = (name, detail = true) => results.checks.push({ name, detail, passed: true });
 check('Studio boot and initial generation');
 const renders = await page.evaluate(async ({beforeOnly}) => {const {renderChecks}=await import('/__test__/render-checks.mjs');return renderChecks({beforeOnly});},{beforeOnly});
 check('Pixel-exact original render compatibility',renders.classic);check('Binary transparent nonempty native renders',{classic:renders.classic,sleek:renders.sleek});check('Unchanged pose library and machine pivots',renders.unchangedPivots);check('Reference-texture renderer unchanged');if(!beforeOnly){check('Cape/body preservation and anchored cloth texture',renders.capeMatches);check('Rings retain body size, clean alpha, canvas bounds and saved margins',{cases:renders.ringCases,bounds:renders.ringBounds});check('Slim chassis, fixed leg segments, planted soles and character outfits',{cases:renders.chassisCases,bones:renders.chassisBones,soles:renders.chassisSoles,outfits:renders.characterCases});}check('Four directions and mirror fallback',renders.mirrors);
 // Editable frames must survive style changes and regeneration-unedited.
 await page.getByTestId('tool-pencil').click();
 await page.getByTestId('color-input').evaluate(el=>{el.value='#12ab34';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.getByTestId('edit-canvas').click({position:{x:1,y:1}});
 assert(await page.evaluate(()=>__studio.set.edited.has('down|idle|0')));check('Actual pointer pencil edit');
 if(!beforeOnly){await page.getByTestId('cfg-style').selectOption('classic');await wait();await page.getByTestId('cfg-style').selectOption('sleek');await wait();}
 await page.getByTestId('generate-unedited').click();await wait();
 assert.deepEqual(await page.evaluate(()=>[...__studio.SS.cell(__studio.set,'down','idle',0).getContext('2d').getImageData(0,0,1,1).data]),[18,171,52,255]);check('Edited pixel protected during regeneration/style changes');
 if(!beforeOnly){for(const [k,v] of [['scarf','cowl'],['hood','raised'],['drapery','tabard'],['facePanel','smooth'],['damageType','cracked']]){await page.getByTestId('cfg-'+k).selectOption(v);await wait();}await page.getByTestId('color-hood').evaluate(el=>{el.value='#bdb5a9';el.dispatchEvent(new Event('input',{bubbles:true}));});await wait();assert.equal(await page.evaluate(()=>__studio.project.cfg.colors.hood),'#bdb5a9');check('Wardrobe controls, separate fabric colors and continuous face panel',renders.wardrobe);}
 const round=await page.evaluate(async()=>{const p=__studio.project;const text=__studio.SS.serialize(p);const restored=await __studio.SS.deserialize(text);const a=__studio.SS.cell(p.sets.exploration,'down','idle',0).toDataURL(),b=__studio.SS.cell(restored.sets.exploration,'down','idle',0).toDataURL();return {equal:a===b,edited:restored.sets.exploration.edited.has('down|idle|0'),style:restored.cfg.style};});assert(round.equal&&round.edited);check('Project save/reopen roundtrip',round);
 const sheet=await page.evaluate(()=>{const {canvas,meta}=__studio.SS.buildSheet(__studio.set);return {w:canvas.width,h:canvas.height,meta,png:canvas.toDataURL()};});assert.equal(sheet.meta.rows.length,4);check('PNG sheet + direction/animation metadata', {w:sheet.w,h:sheet.h,rows:sheet.meta.rows});
 const imported=await page.evaluate(async()=>{const S=__studio.SS;const old=__studio.set;const {canvas}=S.buildSheet(old);const s=S.newSet(old.fw,old.fh,[...old.dirs],structuredClone(old.anims));S.importSheet(s,canvas,s.fw,s.fh);return {pixels:[...old.cells].every(([k,c])=>s.cells.get(k).toDataURL()===c.toDataURL()),edited:s.edited.size};});assert(imported.pixels);check('Exported sheet reimports pixel-exact',imported);
 const zip=await page.evaluate(async()=>{const z=__studio.SS.zipStore([{name:'metadata.json',data:new TextEncoder().encode('{}')}]);const b=new Uint8Array(await z.arrayBuffer());return [b[0],b[1],b[2],b[3]];});assert.deepEqual(zip,[80,75,3,4]);check('ZIP export container');
 // Exercise the real browser download and file-input handlers as well as the library APIs.
 if(!beforeOnly){await page.evaluate(()=>{delete __studio.project.cfg.facePanel;});const saved=await page.evaluate(()=>__studio.SS.serialize(__studio.project));await page.getByTestId('file-project').setInputFiles({name:'old-sleek.json',mimeType:'application/json',buffer:Buffer.from(saved)});await wait();assert.equal(await page.evaluate(()=>__studio.project.cfg.facePanel),'smooth');assert.deepEqual(await page.evaluate(()=>[...__studio.SS.cell(__studio.set,'down','idle',0).getContext('2d').getImageData(0,0,1,1).data]),[18,171,52,255]);check('Old Sleek visor refresh preserves hand edits');}
 const savedPromise=page.waitForEvent('download');await page.getByTestId('save-project').click();const saved=await savedPromise;const savedBytes=readFileSync(await saved.path());assert.equal(JSON.parse(savedBytes).format,'bearframe-sprite-project');
 await page.getByTestId('file-project').setInputFiles({name:'saved.bfsprite.json',mimeType:'application/json',buffer:savedBytes});await wait();assert(await page.evaluate(()=>__studio.set.edited.has('down|idle|0')));check('Save download and file-input reopen');
 const pngPromise=page.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.png')});const jsonPromise=page.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.json')});await page.getByTestId('export-sheet').click();const [pd,jd]=await Promise.all([pngPromise,jsonPromise]);assert.equal(readFileSync(await pd.path()).subarray(1,4).toString(),'PNG');assert.equal(JSON.parse(readFileSync(await jd.path())).rows.length,4);check('Real PNG + JSON downloads');
 const zipPromise=page.waitForEvent('download');await page.getByTestId('export-frames').click();const zd=await zipPromise;assert.equal(readFileSync(await zd.path()).readUInt32LE(0),0x04034b50);check('Real frame ZIP download');
 await page.screenshot({path:path.join(out,'desktop-editor.png'),fullPage:true});
 await page.getByTestId('set-select').selectOption('battle');await wait();assert.equal(await page.evaluate(()=>__studio.set.fw),64);check('Independent battle set');await page.getByTestId('set-select').selectOption('exploration');await wait();
 if(!beforeOnly){await page.getByTestId('cfg-head').selectOption('display');await wait();check('New native display head generates');}
 if(!beforeOnly){await page.getByTestId('cfg-ring').selectOption('double');await wait();await page.getByTestId('cfg-ringSize').selectOption('large');await wait();await page.getByTestId('cfg-ringWidth').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});await wait();const fit=await page.evaluate(()=>({w:__studio.set.fw,h:__studio.set.fh,pad:__studio.project.cfg.ringPadding,tiles:__studio.project.tiles}));assert(fit.h>56);assert.equal(fit.w,32+2*fit.pad.x);assert.deepEqual(fit.tiles,[1,1]);const promise=page.waitForEvent('download');await page.getByTestId('save-project').click();const d=await promise;await page.getByTestId('file-project').setInputFiles({name:'ring-project.json',mimeType:'application/json',buffer:readFileSync(await d.path())});await wait();assert.equal(await page.evaluate(()=>__studio.project.cfg.ring),'double');await page.getByTestId('cfg-ring').selectOption('none');await wait();assert.equal(await page.evaluate(()=>__studio.set.fh),fit.h);check('Ring controls, fitted canvas and downloaded project reopen');}
 if(!beforeOnly){await page.getByTestId('cfg-chassis').selectOption('lean-female');await wait();await page.getByTestId('cfg-outfit').selectOption('community');await wait();await page.getByTestId('character-preset').selectOption('Penney');await wait();assert.equal(await page.evaluate(()=>__studio.project.cfg.chassis),'lean-female');assert.equal(await page.evaluate(()=>__studio.project.cfg.outfit),'community');const p=page.waitForEvent('download');await page.getByTestId('save-project').click();const d=await p;await page.getByTestId('file-project').setInputFiles({name:'character.json',mimeType:'application/json',buffer:readFileSync(await d.path())});await wait();assert.equal(await page.evaluate(()=>__studio.project.name),'Penney');await page.getByTestId('character-preset').selectOption('Atlas');await wait();assert.equal(await page.evaluate(()=>__studio.project.cfg.chassis),'broad');assert.equal(await page.evaluate(()=>__studio.project.cfg.outfitVariant),'harness');check('Male/female chassis, character outfit selection and saved preset reopening');}
 // Each original example still opens through the real editor and fills its complete set.
 for(const name of ['heavy-sentinel','hexapod-cartography-engine','archive-sentinel','micro-drone']){
  await page.getByTestId('examples-select').selectOption(name);await wait();await page.waitForFunction(()=>!__studio.busy&&__studio.set.cells.size>=__studio.SS.totalFrames(__studio.set)*__studio.set.dirs.length);
  if(!beforeOnly){await page.getByTestId('machine-style').selectOption('sleek');await wait();}
  check('Example opens/generates: '+name);
 }
 await page.setViewportSize({width:915,height:412});await page.getByTestId('dir-left').click();await wait();check('Phone landscape generation/direction switch');await page.screenshot({path:path.join(out,'phone-landscape-editor.png'),fullPage:true});
 assert.deepEqual(results.pageErrors,[]);check('No browser page errors');
 // Exact raw native renders for reproducible visual review; no screenshot/phone metadata.
 const images=[];
 for(let p=0;p<renders.previews.length;p++){const spec=renders.previews[p];const folder=path.join(out,'frames',String(p));mkdirSync(folder,{recursive:true});for(const f of spec.frames){const file=path.join(folder,`${f.style}-${f.dir}-${f.i}.png`);writeFileSync(file,Buffer.from(f.png.split(',')[1],'base64'));}images.push({...spec,frames:undefined,index:p});}
 writeFileSync(path.join(out,'preview-index.json'),JSON.stringify(images,null,2));
 results.renderCounts={classic:renders.classic,sleek:renders.sleek,unchangedPivots:renders.unchangedPivots};results.status='PASS';
}catch(e){results.status='FAIL';results.error=e.stack;process.exitCode=1;}
finally{if(browser)await browser.close();server.kill();writeFileSync(path.join(out,beforeOnly?'baseline-checks.json':'checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({...results,checks:results.checks.length},null,2));}
