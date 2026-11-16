// Copyright-safe end-to-end opening campaign preview. The PRIVATE Director's Cut
// and approved character PNGs are never uploaded to public Actions artifacts.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifacts=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const starters=['sleeper_A','sleeper_B','sleeper_C','sleeper_D'];
const chars=[...starters,...Array.from({length:38},(_,i)=>'synthetic_'+i)];
const manifest={schema:'aeon.asset-library.v4',characters:chars.map(id=>({id,world:{src:'assets/world/'+id+'.png',frameWidth:32,
  frameHeight:56,columns:9,rows:4,directions:['down','left','right','up'],walkColumns:[1,2,3,4,5,6,7,8]},
  battle:{src:'assets/battlers/'+id+'.png',frameWidth:64,frameHeight:64,columns:6,rows:9,animations:{}}}))};
const coll=()=>Array.from({length:8*7},(_,i)=>i<8||i>=48||i%8===0||i%8===7?1:0);
const area=(id,next,portal,back,x)=>({id,name:'SYNTHETIC AREA',orientation:'orthogonal',tilewidth:32,tileheight:32,
  width:8,height:7,start:{x:80,y:112,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:coll()},
    {type:'objectgroup',name:'portals',objects:[{name:portal,id:1,x:x*32,y:96,width:32,height:32,
       properties:{toMap:next,toPortal:back,facing:id==='A00'?'right':'left',...(id==='A00'?{requiresFlag:'door_open'}:{})}}]}],
  entities:id==='A00'?[{id:'door_console',type:'terminal',tx:4,ty:3,interact:true,trigger:'INSPECT_MACHINE',
       sceneId:'door',label:'INSPECT CONSOLE',hideAfterFlag:'door_open'}]:[],triggers:[],lamps:[],props:[],drones:[],
  objective:'Synthetic contract check',objectives:[]});
const world={schemaVersion:1,campaignRevision:2,status:'authored-blockout-review-candidate',startArea:'A00',
  openingScene:{sceneId:'opening',trigger:'NEW_GAME'},layoutDigest:'synthetic-contract-v2',
  maps:[area('A00','A01','east','west',6),area('A01','A00','west','east',1)],choiceGates:{}};
const content={schemaVersion:1,revision:2,
  flagSchema:{gameplay_flags:['game_started','door_open'],exclusive_enums:{},relationships:{}},
  scenes:[{id:'opening',trigger:'NEW_GAME',dialogue:['line-opening'],sets:'game_started'},
    {id:'door',trigger:'INSPECT_MACHINE',dialogue:['line-machine'],sets:'door_open'}],
  dialogue:[{line_id:'line-opening',sequence:1,speaker:'SYSTEM',text:'Synthetic opening.',condition:'',event_effects:''},
    {line_id:'line-machine',sequence:1,speaker:'SYSTEM',text:'Synthetic terminal.',condition:'',event_effects:''}],
  insertions:[],choices:[],encounters:[]};
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const chunk=(type,payload)=>{const name=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);
  length.writeUInt32BE(payload.length);sum.writeUInt32BE(crc(Buffer.concat([name,payload])));
  return Buffer.concat([length,name,payload,sum]);};
function png(width,height,cellW,cellH){
  const raw=Buffer.alloc(height*(width*4+1));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const idx=y*(width*4+1)+1+x*4;
    if(x%cellW<cellW*.2||x%cellW>cellW*.8||y%cellH<cellH*.2||y%cellH>cellH*.9)continue;
    raw[idx]=140;raw[idx+1]=40+(Math.floor(x/cellW)*15);raw[idx+2]=180;raw[idx+3]=255;
  }
  const head=Buffer.alloc(13);head.writeUInt32BE(width,0);head.writeUInt32BE(height,4);head[8]=8;head[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const inspect=()=>page.evaluate(()=>window.__campaign?.inspect());
async function acknowledge(){
  await page.evaluate(()=>{const ui=window.__gs.ui;if(ui.line)ui.shown=ui.line.t.length;});
  await page.locator('#dialog').click({position:{x:12,y:12}});
}
try{
  await page.route('**/assets/aeon/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/asset-manifest.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)});
    if(path.endsWith('/story/campaign.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(content)});
    if(path.endsWith('/story/opening-world-review-candidate.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(world)});
    if(/\/portraits\/sleeper_[ABCD]\.png$/.test(path))return route.fulfill({status:200,contentType:'image/png',body:png(96,96,96,96)});
    if(/\/assets\/world\/sleeper_[ABCD]\.png$/.test(path))return route.fulfill({status:200,contentType:'image/png',body:png(288,224,32,56)});
    return route.fulfill({status:404,contentType:'text/plain',body:'No synthetic campaign asset'});
  });
  await page.goto(base+'/campaign.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#btn-new')?.textContent==='NEW CAMPAIGN',{timeout:12000});
  await page.locator('#btn-new').click();
  await page.locator('#aeon-v5-choose').waitFor();
  assert.equal(await page.locator('#aeon-v5-choose button[data-starter]').count(),4);
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.waitForFunction(()=>window.__campaign?.inspect().story==='opening',{timeout:12000});
  assert.equal((await inspect()).mapId,'A00');
  assert.equal((await inspect()).mode,'dialog');
  assert.equal(await page.locator('#dialog-speaker').innerText(),'SYSTEM');
  await acknowledge();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play');
  assert.equal((await inspect()).story,null);
  assert.equal(await page.evaluate(()=>window.__gs.sheet.width),448);
  assert.equal((await inspect()).starterId,'sleeper_D');
  await page.keyboard.press('KeyE'); // No object yet adjacent: no accidental scene.
  assert.equal((await inspect()).story,null);
  await page.locator('#btn-pause').click();
  assert.equal((await inspect()).mode,'pause');
  await page.locator('#btn-save').click();
  await page.locator('#btn-resume').click();
  assert.equal((await inspect()).mode,'play');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#btn-continue')?.disabled===false);
  await page.locator('#btn-continue').click();
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play');
  assert.equal((await inspect()).story,null,'Completed intro should not replay on resume');
  assert.equal((await inspect()).mapId,'A00');

  // Exercise the actual public campaign entry: walk up to an authored terminal,
  // acknowledge its source dialogue, unlock the gated area, cross the portal
  // with player input, then load that destination from the durable journal.
  let held=null;
  try{
    for(let i=0;i<150;i++){
      const p=await page.evaluate(()=>({x:window.__gs?.player?.x,mode:window.__gs?.mode}));
      assert.equal(p.mode,'play','Walking to the terminal must not change field mode');
      if(Math.abs(p.x-113)<3)break;
      const direction=p.x>113?'ArrowLeft':'ArrowRight';
      if(held!==direction){
        if(held)await page.keyboard.up(held);
        held=direction;await page.keyboard.down(held);
      }
      await page.waitForTimeout(35);
      if(i===149)throw new Error('Unable to reach authored console using normal walking');
    }
  }finally{if(held)await page.keyboard.up(held);}
  assert.equal(await page.evaluate(()=>window.__gs.target()?.id),'door_console');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__campaign?.inspect().story==='door',null,{timeout:12000});
  assert.equal(await page.locator('#dialog-speaker').innerText(),'SYSTEM');
  await acknowledge();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play',null,{timeout:12000});
  assert.equal((await inspect()).story,null,'Terminal dialogue must resolve before the route unlocks');

  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__campaign?.inspect().mapId==='A01',null,{timeout:15000});
  }finally{await page.keyboard.up('ArrowRight');}
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play',null,{timeout:12000});
  assert.equal((await inspect()).areaCount,2);
  const arrival=await page.evaluate(()=>({x:window.__gs.player.x,dir:window.__gs.player.dir}));
  assert.equal(arrival.x,48,'Arrival must use the reciprocal portal feet coordinate');
  assert.equal(arrival.dir,'right');
  await page.locator('#btn-pause').click();
  await page.locator('#btn-save').click();
  await page.locator('#btn-resume').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#btn-continue')?.disabled===false);
  await page.locator('#btn-continue').click();
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play',null,{timeout:12000});
  assert.equal((await inspect()).mapId,'A01','Continue must preserve cross-area travel');
  assert.equal((await inspect()).story,null,'Continue must not replay resolved narrative scenes');
  assert.equal(await page.evaluate(()=>window.__gs.player.x),48,
    'Continue must restore the saved destination position, not its area spawn');
  assert.equal(errors.length,0,errors.join('\n'));
  await mkdir(artifacts,{recursive:true});
  await page.screenshot({path:join(artifacts,'campaign-opening-synthetic.png'),fullPage:true});
  console.log('PASS campaign preview: Ghost Signal UI, four starter picker, real opening narrative, v5 world art, durable save/continue without duplicate intro');
}catch(error){
  await mkdir(artifacts,{recursive:true});
  try{await page.screenshot({path:join(artifacts,'campaign-opening-failure.png'),fullPage:true});}catch(_){}
  await writeFile(join(artifacts,'campaign-opening-error.txt'),String(error.stack||error)+'\nPAGE ERRORS '+errors.join('\n'));
  throw error;
}finally{await browser.close();}