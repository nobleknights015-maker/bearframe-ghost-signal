// Real-input routes and defeat/withdrawal acceptance. No player teleport, no direct Game.use, no fake rewards.
// Run as a second Chromium job after the regular RPG browser integration smoke.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifactDir=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__rpgLab?.inspect());
async function enterFreshLab(){
  await page.goto(base+'/index.html?rpg-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
}
async function moveTo(axis,target){
  const keys={x:['ArrowLeft','ArrowRight'],y:['ArrowUp','ArrowDown']};
  let held=null;
  try{
    for(let n=0;n<340;n++){
      const v=await page.evaluate(()=>({
        mode:window.__gs.mode,
        x:window.__gs.player.x,y:window.__gs.player.y,
        energy:window.__gs.player.energy,
        drone:window.__gs.drone&&{x:window.__gs.drone.x,y:window.__gs.drone.y,state:window.__gs.drone.state},
        scanCd:window.__gs.scanCd
      }));
      assert.equal(v.mode,'play','Encounter occurred while traversing bypass route at '+axis+' '+v[axis]);
      const distance=target-v[axis];
      if(Math.abs(distance)<4)return;
      const key=distance<0?keys[axis][0]:keys[axis][1];
      if(key!==held){if(held)await page.keyboard.up(held);await page.keyboard.down(key);held=key;}
      if(v.drone&&v.drone.state!=='disabled'&&
        Math.hypot(v.x-v.drone.x,v.y-v.drone.y)<107&&v.scanCd<=0&&v.energy>20){
        await page.keyboard.press('KeyQ'); // real scanner: temporarily disables the security machine
      }
      await page.waitForTimeout(32);
    }
    throw new Error('Movement stalled heading to '+axis+'='+target);
  }finally{if(held)await page.keyboard.up(held);}
}
async function moveIntoCombat(){
  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__rpgLab?.inspect().session.phase==='battle',{timeout:18000});
  }finally{await page.keyboard.up('ArrowRight');}
}

try{
  await enterFreshLab();
  const legacy=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));
  // Enter lower perimeter and approach relay from beneath. Every move comes from real keyboard input.
  await moveTo('x',16.5*32);
  await moveTo('y',14.5*32);
  await moveTo('x',22.5*32);
  await moveTo('y',7.5*32);
  const before=await state();
  assert.equal(before.session.phase,'exploration','Non-combat route must not start combat');
  assert.equal(before.field.flags.labEntered,true);
  assert.equal(before.field.flags.labResolved,undefined);
  const hasRelayTarget=await page.evaluate(()=>window.__gs.target()?.id);
  assert.equal(hasRelayTarget,'relay','Relay must be interactable from actual map position');
  await page.keyboard.press('KeyE'); // actual interact input
  await page.waitForFunction(()=>window.__gs.flags.labResolved===true,{timeout:3000});
  const after=await state();
  assert.equal(after.field.flags.labRelay,true);
  assert.equal(after.session.exploration.quests.sentry,'bypassed via relay');
  assert.equal(after.session.exploration.progression.xp,0);
  assert.equal(after.session.exploration.inventory['ancient-scrap'],undefined);
  assert.equal(after.save.hasSave,true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const resumed=await state();
  assert.equal(resumed.field.flags.labResolved,true);
  assert.equal(resumed.session.exploration.quests.sentry,'bypassed via relay');
  assert.equal(resumed.field.player.x,after.field.player.x,'Non-combat path position lost on reload');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1')),legacy);

  // Fresh session: flee with the on-screen command, then verify return-to-map and persistent no-reward result.
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))
    if(k.startsWith('bearframe_ghost_signal_rpg_lab_v1:'))localStorage.removeItem(k);});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  await moveIntoCombat();
  const fight=await state();
  assert.equal(fight.session.phase,'battle');
  assert.equal(fight.mode,'battle');
  await page.getByRole('button',{name:'WITHDRAW'}).click();
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',{timeout:12000});
  const fled=await state();
  assert.equal(fled.session.phase,'exploration');
  assert.equal(fled.mode,'play');
  assert.equal(fled.session.exploration.quests.sentry,'fled');
  assert.equal(fled.field.flags.labResolved,undefined);
  assert.equal(fled.session.exploration.progression.xp,0);
  assert.equal(fled.session.exploration.inventory['ancient-scrap'],undefined);
  assert.equal(fled.field.player.x,fight.field.player.x,'Flee must return to original field coordinate');
  assert.equal(fled.save.hasSave,true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const fleeReload=await state();
  assert.equal(fleeReload.session.exploration.quests.sentry,'fled');
  assert.equal(fleeReload.session.exploration.progression.xp,0);
  assert.equal(fleeReload.field.flags.labResolved,undefined);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS routes: full keyboard map-to-relay bypass; input-based sentry flee; journal reload; no unauthorized rewards');
}catch(error){
  await mkdir(artifactDir,{recursive:true});
  try{await page.screenshot({path:join(artifactDir,'rpg-route-failure.png'),fullPage:true});}catch(_){}
  let last;
  try{last=await state();}catch(_){last=null;}
  await writeFile(join(artifactDir,'rpg-route-failure.json'),JSON.stringify({error:String(error.stack||error),state:last,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
