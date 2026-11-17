// Live browser acceptance for two connected Tiled maps in the original Ghost Signal runtime.
// Use actual four-way keyboard movement, interact inputs and the on-screen save UI; never teleport.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const root=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifacts=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__connectedLab?.inspect());
async function travel(direction,destination){
  await page.keyboard.down(direction);
  try{
    await page.waitForFunction(expected=>window.__connectedLab?.inspect().mapId===expected,
      destination,{timeout:12000});
  }finally{await page.keyboard.up(direction);}
}
async function walkToX(target){
  let previous=null;
  try{
    for(let n=0;n<180;n++){
      const pos=await page.evaluate(()=>({x:window.__gs.player.x,mode:window.__gs.mode}));
      assert.equal(pos.mode,'play');
      if(Math.abs(pos.x-target)<5)return;
      const key=target<pos.x?'ArrowLeft':'ArrowRight';
      if(key!==previous){
        if(previous)await page.keyboard.up(previous);
        await page.keyboard.down(key);previous=key;
      }
      await page.waitForTimeout(32);
    }
    throw Error('Movement stalled before X '+target);
  }finally{if(previous)await page.keyboard.up(previous);}
}
async function walkToY(target){
  let previous=null;
  try{
    for(let n=0;n<180;n++){
      const pos=await page.evaluate(()=>({y:window.__gs.player.y,mode:window.__gs.mode}));
      assert.equal(pos.mode,'play');
      if(Math.abs(pos.y-target)<5)return;
      const key=target<pos.y?'ArrowUp':'ArrowDown';
      if(key!==previous){
        if(previous)await page.keyboard.up(previous);
        await page.keyboard.down(key);previous=key;
      }
      await page.waitForTimeout(32);
    }
    throw Error('Movement stalled before Y '+target);
  }finally{if(previous)await page.keyboard.up(previous);}
}
try{
  await page.goto(root+'/index.html?connected-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__connectedLab?.inspect().mapId==='staging',{timeout:15000});
  const baseline=await state();
  assert.equal(baseline.mode,'play');
  assert.equal(baseline.world.inventory['repair-kit'],1);
  assert.equal(baseline.world.flags['visited-annex'],undefined);
  assert.equal(await page.evaluate(()=>!!window.__rpgLab),false);
  const legacy=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));

  // Approach the authored service hatch BEFORE powering the relay.
  // A locked gate must not switch maps, save progress or consume anything.
  await walkToX(144);
  await walkToY(80);
  await page.waitForTimeout(100);
  const sealed=await state();
  assert.equal(sealed.mapId,'staging','Sealed service hatch wrongly allowed passage');
  assert.deepEqual(sealed.world,baseline.world,'A locked hatch modified durable world state');
  assert.equal(sealed.world.inventory['repair-kit'],1);
  await walkToY(112);
  await walkToX(80);

  await travel('ArrowRight','annex'); // walk through existing unrestricted east exit
  let moved=await state();
  assert.equal(moved.mode,'play');
  assert.equal(moved.world.flags['visited-annex'],true);
  assert.equal(moved.field.mission,'annex');
  assert.ok(moved.field.player.x>32&&moved.field.player.x<76,'Arrival must use west doorway');
  await walkToX(87);
  assert.equal(await page.evaluate(()=>window.__gs.target()?.id),'supply-cache');
  await page.keyboard.press('KeyE'); // real interaction, no direct handler call
  await page.waitForFunction(()=>window.__connectedLab?.inspect().world.events['supply-cache']===true);
  let collected=await state();
  assert.equal(collected.world.inventory['repair-kit'],2);
  assert.equal(collected.world.flags['supply-cache'],true);
  assert.equal(await page.evaluate(()=>window.__gs.ent('supply-cache').gone),true);
  const savedX=collected.field.player.x;
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__connectedLab?.inspect().mapId==='annex');
  collected=await state();
  assert.equal(collected.world.inventory['repair-kit'],2,'Cache reward lost on reloading second map');
  assert.equal(collected.field.player.x,savedX,'Field position not persisted in annex');
  assert.equal(await page.evaluate(()=>window.__gs.ent('supply-cache').gone),true);
  await page.keyboard.press('KeyE');
  assert.equal((await state()).world.inventory['repair-kit'],2,'Collected cache must not grant duplicate items');

  await travel('ArrowLeft','staging'); // step back through actual west doorway
  moved=await state();
  assert.equal(moved.world.flags['returned-staging'],true);
  assert.equal(moved.field.mission,'staging');
  assert.ok(moved.field.player.x>185,'Return must use eastern staging spawn');
  await walkToX(112);
  assert.equal(await page.evaluate(()=>window.__gs.target()?.id),'power-switch');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__connectedLab?.inspect().world.events['power-switch']===true);
  const powered=await state();
  assert.equal(powered.world.flags['power-switch'],true);
  assert.equal(powered.world.inventory['repair-kit'],2);
  assert.equal(powered.world.quests.expedition,'power-restored');
  await page.locator('#lab-rpg-menu').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'SAVE EXPEDITION');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'CLOSE',
    'Arrow keys must navigate modal without moving the field actor');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'SAVE EXPEDITION');
  await page.keyboard.press('Enter'); // real keyboard confirmation
  assert.equal((await state()).mode,'rpgmenu','Confirm must keep record open');
  await page.getByRole('button',{name:'SAVE EXPEDITION'}).click();
  assert.equal((await state()).save.hasSave,true);
  assert.match(await page.locator('#rpg-lab-menu').innerText(),/POWER RELAY: ACTIVE/);
  assert.match(await page.locator('#rpg-lab-menu').innerText(),/SERVICE HATCH: ACCESS GRANTED/);
  await page.keyboard.press('Escape');
  assert.equal((await state()).mode,'play','Escape closes modal without field movement');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'lab-rpg-menu',
    'Closing the modal must return keyboard focus to its launcher');
  await page.keyboard.press('Enter');
  assert.equal((await state()).mode,'rpgmenu','Focused launcher must reopen using Enter');
  await page.getByRole('button',{name:'CLOSE'}).click();
  assert.equal((await state()).mode,'play');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__connectedLab?.inspect().mapId==='staging');
  const final=await state();
  assert.equal(final.world.flags['visited-annex'],true);
  assert.equal(final.world.flags['returned-staging'],true);
  assert.equal(final.world.flags['power-switch'],true);
  assert.equal(final.world.flags['supply-cache'],true);
  assert.equal(final.world.inventory['repair-kit'],2);
  assert.equal(final.world.quests.expedition,'power-restored');
  assert.equal(await page.evaluate(()=>window.__gs.ent('power-switch').gone),true);

  // The SAME physical service hatch must open after the relay event is
  // committed, survive reload, and return via the reciprocal upper doorway.
  await walkToX(144);
  await travel('ArrowUp','annex');
  const unlocked=await state();
  assert.equal(unlocked.mapId,'annex');
  assert.ok(Math.abs(unlocked.field.player.x-144)<5);
  assert.ok(Math.abs(unlocked.field.player.y-80)<5);
  assert.equal(unlocked.world.flags['power-switch'],true);
  assert.equal(unlocked.world.inventory['repair-kit'],2);
  await travel('ArrowDown','staging');
  assert.equal((await state()).mapId,'staging');
  assert.equal((await state()).world.inventory['repair-kit'],2,
    'Hatch round trip duplicated or consumed the supply reward');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1')),legacy,
    'Original Ghost Signal save was overwritten by expedition');
  assert.equal(errors.length,0,errors.join('\n'));
  // The Android debug QA launcher uses real finger-tappable links for both labs.
  await page.locator('#btn-pause').click();
  await page.waitForFunction(()=>window.__gs?.mode==='pause');
  await page.locator('#btn-quit').click();
  await page.waitForURL(/engine-lab\.html/);
  const launcher=page.getByRole('navigation',{name:'Engine test modes'});
  // Public debug APKs intentionally hide the Aeon unified route until the
  // owner-installed V5 art package is present. The four playable test modes
  // still work and preserve their independent journals.
  assert.equal(await launcher.getByRole('link').count(),4);
  assert.equal(await launcher.getByRole('link',{name:'AEON UNIFIED ENGINE',exact:true}).count(),0);
  assert.equal(await page.locator('#aeon-unified').isVisible(),false);
  assert.equal(await launcher.getByRole('link',{name:'ORIGINAL GHOST SIGNAL'}).getAttribute('href'),'index.html');
  const link=launcher.getByRole('link',{name:'JRPG COMBAT'});
  const bounds=await link.boundingBox();
  assert.ok(bounds&&bounds.width>40&&bounds.height>40,'Debug launcher must expose usable touch targets');
  await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  await page.locator('#btn-pause').click();
  await page.waitForFunction(()=>window.__gs?.mode==='pause');
  await page.locator('#btn-quit').click();
  await page.waitForURL(/engine-lab\.html/);
  const connected=page.getByRole('link',{name:'CONNECTED WORLD'});
  const area=await connected.boundingBox();
  assert.ok(area);
  await page.touchscreen.tap(area.x+area.width/2,area.y+area.height/2);
  await page.waitForFunction(()=>window.__connectedLab?.inspect().mapId==='staging');
  assert.equal((await state()).world.inventory['repair-kit'],2,
    'Switching test modes must retain connected expedition save');
  console.log('PASS connected expedition: sealed/unlocked authored service hatch, real A→B→A, durable events, touchscreen QA launcher, separate RPG modes');
}catch(error){
  await mkdir(artifacts,{recursive:true});
  try{await page.screenshot({path:join(artifacts,'connected-expedition-failure.png'),fullPage:true});}catch(_){}
  let snapshot=null;try{snapshot=await state();}catch(_){}
  await writeFile(join(artifacts,'connected-expedition-failure.json'),JSON.stringify({error:String(error.stack||error),state:snapshot,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
