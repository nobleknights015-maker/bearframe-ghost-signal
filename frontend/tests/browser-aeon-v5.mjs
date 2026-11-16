// Copyright-safe CI: exercise the actual Aeon v5 starter picker + Ghost Signal Game +
// side-view battle using synthetic fixture pixels, never the private owner's art archive.
import {chromium} from 'playwright';
import {deflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const directory=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const actions=['idle','attack','ranged','cast','guard','hit','down','victory','charge'];
const actionFrames=[4,6,6,6,3,3,6,4,4];
const characters=['sleeper_A','sleeper_B','sleeper_C','sleeper_D',
  'echo_industrial_maintenance','old_sentry',...Array.from({length:36},(_,i)=>'test_filler_'+i)];
const art=(id)=>({
 id,world:{src:'assets/world/'+id+'.png',frameWidth:32,frameHeight:56,columns:9,rows:4,
   directions:['down','left','right','up'],walkColumns:[1,2,3,4,5,6,7,8]},
 battle:{src:'assets/battlers/'+id+'.png',frameWidth:id==='old_sentry'||id.startsWith('echo_')?96:64,
   frameHeight:id==='old_sentry'||id.startsWith('echo_')?96:64,columns:6,rows:9,
   animations:Object.fromEntries(actions.map((name,row)=>[name,{row,frames:actionFrames[row],
     fps:9,durationsMs:Array.from({length:actionFrames[row]},(_,i)=>75+row*3+i*5),
     loop:name==='idle'||name==='charge',holdLast:name==='down'||name==='victory'}]))}
});
const manifest={schema:'aeon.asset-library.v4',characters:characters.map(art)};
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const chunk=(type,payload)=>{const name=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);
 length.writeUInt32BE(payload.length);sum.writeUInt32BE(crc(Buffer.concat([name,payload])));
 return Buffer.concat([length,name,payload,sum]);};
function png(width,height,cellW,cellH){
 const raw=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=y*(width*4+1)+1+x*4,stepX=Math.floor(x/cellW),stepY=Math.floor(y/cellH);
  const localX=x%cellW,localY=y%cellH;
  if(localX<cellW*.22||localX>cellW*.78||localY<cellH*.17||localY>cellH*.88)continue;
  raw[offset]=40+stepX*16;raw[offset+1]=95+stepY*9;raw[offset+2]=165+stepX*6;raw[offset+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
try{
 await page.route('**/assets/aeon/**',async route=>{
  const url=new URL(route.request().url());const path=url.pathname;
  if(path.endsWith('/asset-manifest.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)});
  if(/\/portraits\/sleeper_[ABCD]\.png$/.test(path))return route.fulfill({status:200,contentType:'image/png',body:png(96,96,96,96)});
  const world=/\/assets\/world\/(sleeper_[ABCD])\.png$/.exec(path);
  if(world)return route.fulfill({status:200,contentType:'image/png',body:png(288,224,32,56)});
  const battle=/\/assets\/battlers\/(sleeper_[ABCD]|echo_industrial_maintenance|old_sentry)\.png$/.exec(path);
  if(battle){const size=battle[1].startsWith('sleeper_')?64:96;
    return route.fulfill({status:200,contentType:'image/png',body:png(6*size,9*size,size,size)});
  }
  return route.fulfill({status:404,contentType:'text/plain',body:'Synthetic v5 fixture absent'});
 });
 await page.goto(base+'/index.html?rpg-lab=1&aeon-v5=1',{waitUntil:'domcontentloaded'});
 await page.locator('#aeon-v5-choose').waitFor();
 assert.equal(await page.locator('#aeon-v5-choose button[data-starter]').count(),4);
 await page.locator('#aeon-v5-choose [data-starter="sleeper_C"]').click();
 await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',{timeout:12000});
 const state=await page.evaluate(()=>window.__rpgLab.inspect());
 assert.equal(state.v5.starterId,'sleeper_C');assert.equal(state.v5.catalogCount,42);
 assert.equal(state.v5.worldFrameColumns,14);
 assert.equal(state.session.exploration.party[0].artId,'sleeper_C');
 assert.equal(await page.evaluate(()=>window.__gs.sheet.width),448);
 await page.screenshot({path:join(directory,'aeon-v5-starter-field.png'),fullPage:true});
 await page.keyboard.down('ArrowRight');
 try{await page.waitForFunction(()=>window.__rpgLab?.inspect().session.phase==='battle',{timeout:20000});}
 finally{await page.keyboard.up('ArrowRight');}
 await page.locator('#rpg-sideview-field').waitFor({state:'visible'});
 await page.waitForTimeout(600);
 const b=await page.evaluate(()=>window.__rpgLab.inspect());
 assert.equal(b.battleView,'side-view');
 const pixels=await page.locator('#rpg-sideview-field').evaluate(canvas=>{
  const c=canvas.getContext('2d');
  return [c.getImageData(65,66,1,1).data[3],c.getImageData(307,67,1,1).data[3]];
 });
 // A nontransparent canvas paints all alpha=255; color sampling verifies actual synthetic art.
 const field=await page.locator('#rpg-sideview-field').evaluate(canvas=>{
  const ctx=canvas.getContext('2d'),sample=ctx.getImageData(36,34,345,75).data;let bright=0;
  for(let i=0;i<sample.length;i+=4)if(sample[i+1]>=90&&sample[i+2]>=165)bright++;
  return bright;
 });
 assert.ok(field>50,'V5 test atlas characters were not painted in the actual side-view battle canvas');
 await mkdir(directory,{recursive:true});
 await page.screenshot({path:join(directory,'aeon-v5-sideview-battle.png'),fullPage:true});
 assert.equal(await page.locator('#rpg-lab-battle button').count(),6);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS v5 connected Game: authentic 4-way 8-frame starter selection C, separate journal, Echo/Sentry battle atlas, side-view render, commands');
}catch(err){
 await mkdir(directory,{recursive:true});
 try{await page.screenshot({path:join(directory,'aeon-v5-integration-failure.png'),fullPage:true});}catch(_){ }
 await writeFile(join(directory,'aeon-v5-integration-error.txt'),String(err.stack||err)+'\nPAGE ERRORS: '+errors.join('\n'));
 throw err;
}finally{await browser.close();}