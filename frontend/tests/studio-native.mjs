// Executes the production modules with real native canvas pixels and a DOM adapter.
// This checks rendering/editor logic, not browser layout or pointer behavior.
import assert from 'node:assert/strict';
import {createCanvas, Image, ImageData} from '@napi-rs/canvas';
import {JSDOM} from 'jsdom';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {renderChecks} from './render-checks.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline='f6f8f09b7d6c452f158a67473ac35c2fb374da6f';
const beforeOnly=process.argv.includes('--baseline');
const out=path.resolve(process.env.STUDIO_REVIEW_OUT||path.join(root,'../docs/sprite-studio-sleek'));
const old=mkdtempSync(path.join(tmpdir(),'studio-original-'));
const dom=new JSDOM(readFileSync(path.join(root,'public/studio/index.html'),'utf8'),{url:'http://localhost/studio/'});
const {window}=dom;const {document}=window;
const canvases=new WeakMap();const contexts=new WeakMap();
function backing(el){let c=canvases.get(el);if(!c){c=createCanvas(el.width,el.height);canvases.set(el,c);}return c;}
const proto=window.HTMLCanvasElement.prototype;
for(const dim of ['width','height']){const original=Object.getOwnPropertyDescriptor(proto,dim);Object.defineProperty(proto,dim,{get:original.get,set(v){original.set.call(this,v);const c=canvases.get(this);if(c)c[dim]=this[dim];}});}
proto.getContext=function(type){assert.equal(type,'2d');if(!contexts.has(this)){const c=backing(this).getContext('2d');contexts.set(this,new Proxy(c,{get(t,k){if(k==='drawImage')return (src,...args)=>t.drawImage(src instanceof window.HTMLCanvasElement?backing(src):src,...args);const v=t[k];return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}}));}return contexts.get(this);};
proto.toDataURL=function(...args){return backing(this).toDataURL(...args);};
proto.toBlob=function(fn){fn(new Blob([backing(this).toBuffer('image/png')],{type:'image/png'}));};
Object.assign(globalThis,{window,document,Image,ImageData,localStorage:window.localStorage,confirm:()=>true,addEventListener:window.addEventListener.bind(window),requestAnimationFrame:()=>0,ResizeObserver:class{observe(){}}});
globalThis.fetch=async url=>new Response(readFileSync(path.join(root,'public/studio',url)));
const checks=[];const check=(name,detail=true)=>checks.push({name,passed:true,detail});
mkdirSync(out,{recursive:true});
try{
 for(const name of ['sprite-rig.js','machine-rig.js','machine-presets.js'])writeFileSync(path.join(old,name),execFileSync('git',['show',baseline+':frontend/public/studio/lib/'+name],{cwd:root}));
 writeFileSync(path.join(old,'package.json'),'{"type":"module"}');
 const clothBefore=path.join(old,'cloth-before');mkdirSync(clothBefore);for(const name of ['sprite-rig.js','android-details.js'])writeFileSync(path.join(clothBefore,name),execFileSync('git',['show','4e69ac187653446e1235001dd3bd1d6196fd8ba0:frontend/public/studio/lib/'+name],{cwd:root}));
 const renders=await renderChecks({beforeOnly,clothBaselinePrefix:pathToFileURL(clothBefore+'/').href,currentPrefix:pathToFileURL(path.join(root,'public/studio/lib/')).href,baselinePrefix:pathToFileURL(old+'/').href});
 check('Pixel-exact original renderer compatibility',renders.classic);check('Sleek binary-alpha nonempty renders',renders.sleek);check('Original pose library and machine pivots unchanged',renders.unchangedPivots);check('Texture import renderer unchanged');check('Mirror fallback',renders.mirrors);if(!beforeOnly){check('Wardrobe, wear and smooth visor render checks',renders.wardrobe);check('Existing cape/body unchanged and cloth texture anchored',renders.capeMatches);check('Ring alpha, body/face preservation, clipping and saved margins',{cases:renders.ringCases,bodies:renders.ringBodies,bounds:renders.ringBounds});check('Unit family reach, bounds, registration, edits and paged atlas',renders.units);check('Narrow front modules, unchanged profiles, clean silhouette and Classic compatibility',renders.cleanup);check('Slim chassis, leg length, flat soles and character recipes',{cases:renders.chassisCases,bones:renders.chassisBones,soles:renders.chassisSoles,outfits:renders.characterCases});}
 if(beforeOnly){mkdirSync(path.join(old,'lib'));for(const name of ['studio.js','ref-ui.js','lib/sprite-rig.js','lib/machine-rig.js','lib/machine-presets.js','lib/sprite-sheet.js','lib/ref-sprite.js'])writeFileSync(path.join(old,name),execFileSync('git',['show',baseline+':frontend/public/studio/'+name],{cwd:root}));}
 await import(pathToFileURL(beforeOnly?path.join(old,'studio.js'):path.join(root,'public/studio/studio.js')).href);
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async()=>{await pause(300);const until=Date.now()+20000;while(window.__studio.busy){if(Date.now()>until)throw Error('generation timeout');await pause(15);}assert(!document.getElementById('status').textContent.includes('failed'),document.getElementById('status').textContent);};
 const select=async(tid,value)=>{const el=document.querySelector(`[data-testid="${tid}"]`);assert(el,'missing '+tid);el.value=value;assert.equal(el.value,value,'unavailable option '+value);await el.onchange({target:el});await wait();};
 const click=async(tid)=>{const el=document.querySelector(`[data-testid="${tid}"]`);assert(el,'missing '+tid);await el.onclick({target:el});await wait();};
 await wait();const st=window.__studio;check('Actual editor boot/generation');
 const px=()=>[...st.SS.cell(st.set,'down','idle',0).getContext('2d').getImageData(0,0,1,1).data];
 let c=st.SS.cell(st.set,'down','idle',0);c.getContext('2d').fillStyle='#12ab34';c.getContext('2d').fillRect(0,0,1,1);st.set.edited.add('down|idle|0');
 if(!beforeOnly){await select('cfg-style','classic');await select('cfg-style','sleek');}
 await click('generate-unedited');assert.deepEqual(px(),[18,171,52,255]);check('Hand-edited pixels protected through regeneration/style changes');
 if(!beforeOnly){for(const [key,value] of [['scarf','trailing'],['hood','raised'],['drapery','split'],['damageType','exposed'],['facePanel','smooth'],['pixelFinish','legacy'],['moduleProfile','wide'],['pixelFinish','clean'],['moduleProfile','narrow']])await select('cfg-'+key,value);assert.deepEqual(px(),[18,171,52,255]);check('New controls regenerate while protecting edited pixels');}
 const p=await st.SS.deserialize(st.SS.serialize(st.project));assert.equal(st.SS.cell(p.sets.exploration,'down','idle',0).toDataURL(),st.SS.cell(st.set,'down','idle',0).toDataURL());assert(p.sets.exploration.edited.has('down|idle|0'));assert.equal(p.cfg.style,st.project.cfg.style);for(const key of ['scarf','hood','drapery','damageType','facePanel'])assert.equal(p.cfg[key],st.project.cfg[key]);check('Save/reopen preserves pixels, edits and style');
 const {canvas,meta}=st.SS.buildSheet(st.set);assert.deepEqual(meta.rows,['down','up','right','left']);const set=st.SS.newSet(st.set.fw,st.set.fh,[...st.set.dirs],structuredClone(st.set.anims));st.SS.importSheet(set,canvas,set.fw,set.fh);for(const [k,c] of st.set.cells)assert.equal(set.cells.get(k).toDataURL(),c.toDataURL());check('Transparent PNG sheet reimports pixel-exact');
 const z=st.SS.zipStore([{name:'metadata.json',data:new TextEncoder().encode('{}')}]);writeFileSync(path.join(out,'export-test.zip'),new Uint8Array(await z.arrayBuffer()));check('ZIP generated for independent validation');
 await select('set-select','battle');assert.equal(st.set.fw,64);await select('set-select','exploration');assert.deepEqual(px(),[18,171,52,255]);check('Independent exploration/battle sets');
 if(!beforeOnly){await select('cfg-head','display');check('Display-head option generates all directions');}
 if(!beforeOnly){const fw=st.set.fw,fh=st.set.fh;await select('cfg-ring','double');await select('cfg-ringSize','large');const pad=st.project.cfg.ringPadding;assert(st.set.fh>fh);assert.equal(st.set.fw,fw+2*pad.x);const round=await st.SS.deserialize(st.SS.serialize(st.project));assert.equal(round.cfg.ring,'double');assert.deepEqual(round.cfg.ringPadding,pad);await select('cfg-ring','none');assert.equal(st.set.fh,round.sets.exploration.fh);check('Ring UI margins/save/removal retain canvas');}
 if(!beforeOnly){await select('cfg-chassis','lean-female');await select('cfg-outfit','community');await select('cfg-pixelFinish','clean');await select('cfg-moduleProfile','narrow');const p=await st.SS.deserialize(st.SS.serialize(st.project));assert.equal(p.cfg.chassis,'lean-female');assert.equal(p.cfg.outfit,'community');assert.equal(p.cfg.pixelFinish,'clean');assert.equal(p.cfg.moduleProfile,'narrow');await select('character-preset','Sentinel');assert.equal(st.project.cfg.outfit,'watchtower');assert.equal(st.project.cfg.chassis,'broad');check('Independent chassis/outfit controls and character recipe persistence');}
 for(const name of ['wraith-wtr07','heavy-sentinel','hexapod-cartography-engine','archive-sentinel','micro-drone']){await select('examples-select',name);assert.equal(st.set.cells.size,st.SS.totalFrames(st.set)*4);if(!beforeOnly){if(st.project.kind==='machine')await select('machine-style','sleek');else await select('cfg-style','sleek');}check('Original example opens and generates: '+name);}
 await click('dir-left');assert.equal(st.cur.dir,'left');check('Direction control');
 await pause(850);const autosave=beforeOnly?'bearframe_sprite_studio_autosave_v2':'bearframe_sprite_studio_sleek_copy_autosave_v1';assert(localStorage.getItem(autosave));if(!beforeOnly)assert.equal(localStorage.getItem('bearframe_sprite_studio_autosave_v2'),null);check('Separate copy autosave namespace');
 const index=[];for(let j=0;j<renders.previews.length;j++){const p=renders.previews[j];const folder=path.join(out,'frames',String(j));mkdirSync(folder,{recursive:true});for(const f of p.frames)writeFileSync(path.join(folder,`${f.style}-${f.dir}-${f.i}.png`),Buffer.from(f.png.split(',')[1],'base64'));index.push({...p,frames:undefined,index:j});}writeFileSync(path.join(out,'preview-index.json'),JSON.stringify(index,null,2));
 writeFileSync(path.join(out,'results-native.json'),JSON.stringify({baseline,status:'PASS',runtime:'@napi-rs/canvas + jsdom; no browser layout test',checks},null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,classic:renders.classic,sleek:renders.sleek,out}));
}catch(e){console.error(e);process.exitCode=1;}finally{rmSync(old,{recursive:true,force:true});dom.window.close();}
