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
const animations=Object.fromEntries(['idle','attack','ranged','cast','guard','hit','down','victory','charge']
  .map((name,row)=>[name,{row,frames:1,durationsMs:[80],loop:name==='idle'}]));
const manifest={schema:'aeon.asset-library.v4',characters:chars.map(id=>({id,world:{src:'assets/world/'+id+'.png',frameWidth:32,
  frameHeight:56,columns:9,rows:4,directions:['down','left','right','up'],walkColumns:[1,2,3,4,5,6,7,8]},
  battle:{src:'assets/battlers/'+id+'.png',frameWidth:64,frameHeight:64,columns:6,rows:9,animations}}))};
const coll=()=>Array.from({length:8*7},(_,i)=>i<8||i>=48||i%8===0||i%8===7?1:0);
const area=(id,next,portal,back,x)=>({id,name:'SYNTHETIC AREA',orientation:'orthogonal',tilewidth:32,tileheight:32,
  width:8,height:7,start:{x:80,y:112,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:coll()},
    {type:'objectgroup',name:'portals',objects:[{name:portal,id:1,x:x*32,y:96,width:32,height:32,
       properties:{toMap:next,toPortal:back,facing:id==='A00'?'right':'left',...(id==='A00'?{requiresFlag:'door_open'}:{})}}]}],
  entities:id==='A00'?[{id:'door_console',type:'terminal',tx:4,ty:3,interact:true,trigger:'INSPECT_MACHINE',
       sceneId:'door',label:'INSPECT CONSOLE',hideAfterFlag:'door_open'}]:[],triggers:[],lamps:[],props:[],drones:[],
  objective:'Synthetic contract check',objectives:[],
  ...(id==='A01'?{entryTrigger:'ARRIVE_A01'}:{})});
const world={schemaVersion:1,campaignRevision:2,status:'authored-blockout-review-candidate',startArea:'A00',
  openingScene:{sceneId:'opening',trigger:'NEW_GAME'},layoutDigest:'synthetic-contract-v2',
  maps:[area('A00','A01','east','west',6),area('A01','A00','west','east',1)],choiceGates:{}};
const content={schemaVersion:1,revision:2,
  flagSchema:{gameplay_flags:['game_started','door_open','trial_complete'],exclusive_enums:{},relationships:{}},
  scenes:[{id:'opening',trigger:'NEW_GAME',dialogue:['line-opening'],sets:'game_started'},
    {id:'door',trigger:'INSPECT_MACHINE',dialogue:['line-machine'],sets:'door_open'},
    {id:'trial',trigger:'ARRIVE_A01',dialogue:[],sets:'trial_complete'}],
  dialogue:[{line_id:'line-opening',sequence:1,speaker:'SYSTEM',text:'Synthetic opening.',condition:'',event_effects:''},
    {line_id:'line-machine',sequence:1,speaker:'SYSTEM',text:'Synthetic terminal.',condition:'',event_effects:''}],
  insertions:[],choices:[],encounters:[{id:'SYNTHETIC_ENCOUNTER'},{id:'SYNTHETIC_ENCOUNTER_2'}]};
const soldier=id=>({id:'sleeper',artId:id,lineage:'sleeper',name:'Synthetic Sleeper',
  hp:36,maxHp:36,ep:10,maxEp:10,attack:28,defense:4,speed:20,skills:['pulse','repair','guard']});
world.mandatoryCombats=[
  {sceneId:'trial',encounterId:'SYNTHETIC_ENCOUNTER',saveOutcomeRequired:'victory'},
  {sceneId:'trial',encounterId:'SYNTHETIC_ENCOUNTER_2',saveOutcomeRequired:'victory'}
];
world.combat={schemaVersion:1,campaignRevision:2,layoutDigest:world.layoutDigest,
  partyByStarter:Object.fromEntries(starters.map(id=>[id,[soldier(id)]])),
  encounters:[{id:'SYNTHETIC_ENCOUNTER',mapId:'A01',enemies:[
    {id:'sentinel',artId:'synthetic_0',name:'Synthetic Sentry',
      hp:12,maxHp:12,ep:0,maxEp:0,attack:2,defense:1,speed:4}],
    rewards:{xp:5,items:{synthetic_scrap:1}},canFlee:true},
    {id:'SYNTHETIC_ENCOUNTER_2',mapId:'A01',enemies:[
      {id:'sentry_next',artId:'synthetic_0',name:'Synthetic Second Sentry',
        hp:12,maxHp:12,ep:0,maxEp:0,attack:2,defense:1,speed:4}],
      rewards:{xp:7,items:{second_scrap:1}},canFlee:true}
    ]};
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
    if(/\/assets\/battlers\/(?:sleeper_[ABCD]|synthetic_0)\.png$/.test(path))
      return route.fulfill({status:200,contentType:'image/png',body:png(384,576,64,64)});
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
  // A protected record can be kept instead of overwritten, including when
  // Back/Escape is sent by keyboard or the existing gamepad menu bridge.
  await page.locator('#btn-new').click();
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.locator('#aeon-confirm').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('#aeon-confirm').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.__gs.mode),'title');
  assert.equal(await page.locator('#btn-continue').isEnabled(),true);
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

  // The authored airlock is physically represented; walking over a tile
  // cannot trigger an encounter or move the player to a second area.
  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__gs?.player?.x>=185,null,{timeout:15000});
  }finally{await page.keyboard.up('ArrowRight');}
  assert.equal((await inspect()).mapId,'A00');
  assert.equal(await page.evaluate(()=>window.__gs.target()?.portalId),'east');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__campaign?.inspect().mapId==='A01',null,{timeout:15000});
  // Source-authored battle gate blocks scene completion until the encounter's
  // real combat outcome and loot are durably recorded in one journal write.
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='battle',null,{timeout:12000});
  assert.equal((await inspect()).story,'trial');
  assert.equal((await inspect()).battle.encounterId,'SYNTHETIC_ENCOUNTER');
  await page.locator('#rpg-sideview-field').waitFor({state:'visible'});
  // Device interruption in the middle of a live battle must resume this turn.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#btn-continue')?.disabled===false);
  await page.locator('#btn-continue').click();
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='battle',null,{timeout:12000});
  assert.equal((await inspect()).battle.encounterId,'SYNTHETIC_ENCOUNTER');
  await page.getByRole('button',{name:'ATTACK',exact:true}).click();
  await page.getByRole('button',{name:'RETURN TO FIELD'}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'RETURN TO FIELD'}).click();
  await page.waitForFunction(()=>window.__campaign?.inspect().battle?.encounterId==='SYNTHETIC_ENCOUNTER_2'&&
    window.__campaign?.inspect().mode==='battle',null,{timeout:12000});
  assert.equal((await inspect()).story,'trial',
    'First saved victory must not prematurely complete a scene with two mandatory battles');
  // Confirm first victory was durably recorded before the second battle began.
  const midway=await page.evaluate(()=>{
    const keys=['A','B'].map(x=>localStorage.getItem('bearframe_aeon_campaign_sleeper_D_v1:'+x));
    return keys.filter(Boolean).map(raw=>JSON.parse(JSON.parse(raw).body));
  });
  assert.equal(midway.some(s=>s.world.encounters?.SYNTHETIC_ENCOUNTER?.outcome==='victory'),true);
  assert.equal(midway.some(s=>s.world.encounters?.SYNTHETIC_ENCOUNTER_2?.outcome==='victory'),false);
  // The second mandatory battle, like the first, must survive a hard reload.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#btn-continue')?.disabled===false);
  await page.locator('#btn-continue').click();
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.waitForFunction(()=>window.__campaign?.inspect().battle?.encounterId==='SYNTHETIC_ENCOUNTER_2',
    null,{timeout:12000});
  // Battle targets must cancel without fleeing, attacking or losing a
  // durable turn, using the SAME B/Back controller input as other menus.
  await page.evaluate(()=>{
    const pad={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    window.__campaignTestPad=pad;
  });
  await page.getByRole('button',{name:'REPAIR · 5 EP'}).click();
  await page.waitForFunction(()=>document.querySelector('#rpg-lab-battle h2')?.textContent==='SELECT ALLY');
  await page.evaluate(()=>window.__campaignTestPad.buttons[1].pressed=true);
  await page.waitForFunction(()=>document.querySelector('#rpg-lab-battle h2')?.textContent?.startsWith('SIDE-VIEW ENCOUNTER'));
  await page.evaluate(()=>window.__campaignTestPad.buttons[1].pressed=false);
  assert.equal((await inspect()).battle.encounterId,'SYNTHETIC_ENCOUNTER_2');
  await page.getByRole('button',{name:'REPAIR · 5 EP'}).click();
  await page.waitForFunction(()=>document.querySelector('#rpg-lab-battle h2')?.textContent==='SELECT ALLY');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('#rpg-lab-battle h2')?.textContent?.startsWith('SIDE-VIEW ENCOUNTER'));
  assert.equal((await inspect()).battle.phase,'battle');
  await page.getByRole('button',{name:'ATTACK',exact:true}).click();
  await page.getByRole('button',{name:'RETURN TO FIELD'}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'RETURN TO FIELD'}).click();
  await page.waitForFunction(()=>window.__campaign?.inspect().mode==='play',null,{timeout:12000});
  assert.equal((await inspect()).story,null,'Only both saved victories unblock the authored scene');
  const durable=await page.evaluate(()=>{
    const keys=['A','B'].map(x=>localStorage.getItem('bearframe_aeon_campaign_sleeper_D_v1:'+x));
    const saves=keys.filter(Boolean).map(raw=>JSON.parse(JSON.parse(raw).body));
    return {saves};});
  assert.equal(durable.saves.some(s=>s.world.encounters?.SYNTHETIC_ENCOUNTER?.outcome==='victory'),true);
  assert.equal(durable.saves.some(s=>s.world.inventory?.synthetic_scrap===1),true);
  assert.equal(durable.saves.some(s=>s.world.inventory?.second_scrap===1),true);
  assert.equal(durable.saves.some(s=>s.world.progression?.xp===12),true,
    'Each authored battle must award XP exactly once');
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
  // Even an in-page campaign remount must dispose stale side-view host,
  // animation loop and controller DOM before installing the next one.
  await page.evaluate(()=>document.getElementById('btn-new').click());
  await page.locator('#aeon-v5-choose button[data-starter="sleeper_D"]').click();
  await page.locator('#aeon-confirm').getByRole('button',{name:'REPLACE RECORD'}).click();
  await page.waitForFunction(()=>window.__campaign?.inspect().story==='opening',null,{timeout:12000});
  assert.equal(await page.locator('#rpg-lab-battle').count(),1,
    'Only one battle overlay may survive an in-page campaign remount');
  assert.equal(errors.length,0,errors.join('\n'));
  await mkdir(artifacts,{recursive:true});
  await page.screenshot({path:join(artifacts,'campaign-battle-synthetic.png'),fullPage:true});
  console.log('PASS campaign combat: two ordered mandatory fights, each interrupted safely, atomic rewards and gated scene completion');
}catch(error){
  await mkdir(artifacts,{recursive:true});
  try{await page.screenshot({path:join(artifacts,'campaign-battle-failure.png'),fullPage:true});}catch(_){}
  await writeFile(join(artifacts,'campaign-battle-error.txt'),String(error.stack||error)+'\nPAGE ERRORS '+errors.join('\n'));
  throw error;
}finally{await browser.close();}