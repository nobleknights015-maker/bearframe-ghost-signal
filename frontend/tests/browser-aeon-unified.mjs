// Actual unified UI/keyboard flow. No teleports, combat injection, save fabrication,
// hidden lab URLs or private artwork are used by this copyright-safe acceptance.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {installSyntheticV5} from './helpers/synthetic-v5.mjs';

const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifacts=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const browser=await chromium.launch({headless:true});
let page;
const errors=[];
const state=()=>page.evaluate(()=>window.__rpgLab?.inspect());
async function title(){
  await page.goto(base+'/aeon.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'NEW GAME',exact:true}).waitFor();
}
async function choose(id,continuing=false,keyboard=false){
  await page.locator(continuing?'#btn-continue':'#btn-new').click();
  await page.locator('#aeon-v5-choose').waitFor();
  assert.equal(await page.locator('#aeon-v5-choose [data-starter]').count(),4);
  const choice=page.locator('#aeon-v5-choose [data-starter="'+id+'"]');
  assert.equal(await choice.isEnabled(),true);
  if(keyboard){
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.starter),id);
    await page.keyboard.press('Enter');
  }else await choice.click();
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',null,{timeout:15000});
  const live=await state();
  assert.equal(live.v5.starterId,id);
  assert.equal(live.session.exploration.party[0].artId,id);
  assert.equal(live.v5.worldFrameColumns,14);
  assert.equal(live.save.hasSave,true);
  assert.equal(await page.evaluate(()=>window.__gs.sheet.width),448);
}
async function travel(key,mapId){
  await page.keyboard.down(key);
  try{
    await page.waitForFunction(id=>window.__rpgLab?.inspect().connected?.mapId===id,
      mapId,{timeout:12000});
  }finally{await page.keyboard.up(key);}
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play');
}
async function walkToX(x){
  let held=null;
  try{
    for(let i=0;i<180;i++){
      const now=await state();assert.equal(now.mode,'play');
      const position=now.field.player.x;
      if(Math.abs(position-x)<4)return;
      const key=position>x?'ArrowLeft':'ArrowRight';
      if(key!==held){if(held)await page.keyboard.up(held);held=key;await page.keyboard.down(key);}
      await page.waitForTimeout(32);
    }
    throw Error('Field movement stalled before '+x);
  }finally{if(held)await page.keyboard.up(held);}
}
try{
  await mkdir(artifacts,{recursive:true});
  // Four independent fresh records prove the immutable picker-to-field identity.
  for(const id of ['sleeper_B','sleeper_C','sleeper_D','sleeper_A']){
    const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
    page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await installSyntheticV5(page);await title();
    if(id==='sleeper_B'){
      await page.locator('#btn-new').click();
      await page.locator('#aeon-v5-choose').waitFor();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'BACK');
      await page.keyboard.press('Enter');
      await page.locator('#aeon-v5-choose').waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>window.__gs.mode),'title');
      assert.equal(await page.locator('#title').isVisible(),true);
      assert.equal(await page.evaluate(()=>!!window.__rpgLab),false);
    }
    await choose(id,false,id==='sleeper_B');
    const initial=await state();assert.equal(initial.connected.mapId,'staging');
    assert.equal(initial.session.exploration.inventory['repair-kit'],1);
    await page.screenshot({path:join(artifacts,'aeon-unified-'+id+'-field.png'),fullPage:true});
    if(id!=='sleeper_A')await context.close();
  }
  const legacy=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));
  await walkToX(112);
  assert.equal(await page.evaluate(()=>window.__gs.target()?.id),'power-switch');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__rpgLab.inspect().session.exploration.events['power-switch']===true);
  await travel('ArrowRight','annex');
  assert.equal(await page.evaluate(()=>window.__gs.drones[0].c.artId),'old_sentry');
  assert.equal(await page.evaluate(()=>typeof window.__gs.drawSecurityUnit),'function');
  // Enter the real visible patrol's sightline using movement; its ordinary chase
  // callback starts the existing deterministic side-view battle.
  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__rpgLab?.inspect().session.phase==='battle',null,{timeout:25000});
  }finally{await page.keyboard.up('ArrowRight');}
  assert.equal((await state()).battleView,'side-view');
  await page.locator('#rpg-sideview-field').waitFor({state:'visible'});
  await page.screenshot({path:join(artifacts,'aeon-unified-sideview.png'),fullPage:true});
  for(let turn=0;turn<16;turn++){
    const live=await state();if(live.session.phase!=='battle')break;
    const attack=page.getByRole('button',{name:'ATTACK',exact:true});
    await attack.waitFor({state:'visible'});
    await page.waitForFunction(()=>{
      const b=[...document.querySelectorAll('#rpg-lab-battle button')].find(x=>x.textContent==='ATTACK');
      return b&&!b.disabled;
    },null,{timeout:12000});
    await attack.click();
    // A full action queue must finish before another command is accepted.
    await page.waitForFunction(()=>{
      const s=window.__rpgLab.inspect();
      if(s.session.phase!=='battle')return !!document.querySelector('#rpg-lab-battle button');
      const b=[...document.querySelectorAll('#rpg-lab-battle button')].find(x=>x.textContent==='ATTACK');
      return b&&!b.disabled;
    },null,{timeout:15000});
  }
  await page.getByRole('button',{name:'RETURN TO FIELD',exact:true}).waitFor({timeout:15000});
  const result=await state();
  assert.match(await page.locator('#rpg-lab-battle h2').innerText(),/VICTORY/);
  assert.equal(result.session.exploration.flags.labResolved,true);
  assert.equal(result.session.exploration.progression.xp,12);
  assert.equal(result.session.exploration.inventory['ancient-scrap'],1);
  const hp=result.session.exploration.party.map(x=>x.hp);
  await page.getByRole('button',{name:'RETURN TO FIELD',exact:true}).click();
  await page.waitForFunction(()=>window.__rpgLab.inspect().mode==='play');
  await walkToX(112);
  assert.equal(await page.evaluate(()=>window.__gs.target()?.id),'supply-cache');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__rpgLab.inspect().session.exploration.events['supply-cache']===true);
  const kits=(await state()).session.exploration.inventory['repair-kit'];
  assert.equal(kits,2);await page.keyboard.press('KeyE');
  assert.equal((await state()).session.exploration.inventory['repair-kit'],kits);
  await travel('ArrowLeft','staging');
  await page.locator('#lab-rpg-menu').click();
  await page.getByRole('button',{name:'AREA MAP',exact:true}).click();
  const areaRecord=await page.locator('#rpg-lab-menu pre').innerText();
  assert.match(areaRecord,/\[CURRENT\] STAGING/);
  assert.match(areaRecord,/\[LINKED\] ANNEX/);
  await page.getByRole('button',{name:'BACK',exact:true}).click();
  await page.getByRole('button',{name:'PARTY',exact:true}).click();
  await page.getByRole('button',{name:'FORMATION / RESERVE',exact:true}).click();
  await page.getByRole('button',{name:'MOVE ECHO TEST FORWARD',exact:true}).click();
  assert.deepEqual((await state()).session.exploration.activeParty,['echo','sleeper']);
  assert.match(await page.locator('#rpg-lab-menu pre').innerText(),/1\. Echo Test/);
  await page.getByRole('button',{name:'BACK',exact:true}).click();
  await page.getByRole('button',{name:'SAVE',exact:true}).click();
  await page.getByRole('button',{name:'SAVE RPG TEST RECORD',exact:true}).click();
  assert.equal((await state()).save.hasSave,true);
  await page.getByRole('button',{name:'CLOSE',exact:true}).click();
  const beforeReload=await state();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'NEW GAME',exact:true}).waitFor();
  assert.equal(await page.locator('#btn-continue').isEnabled(),true);
  await choose('sleeper_A',true);
  const restored=await state(),world=restored.session.exploration;
  assert.equal(restored.connected.mapId,'staging');
  assert.deepEqual(world.activeParty,['echo','sleeper'],'Recorded formation must survive Continue');
  assert.equal(restored.field.player.x,beforeReload.field.player.x);
  assert.equal(restored.field.player.y,beforeReload.field.player.y);
  assert.deepEqual(world.party.map(x=>x.hp),hp);
  assert.equal(world.progression.xp,12);assert.equal(world.inventory['ancient-scrap'],1);
  assert.equal(world.inventory['repair-kit'],kits);
  assert.equal(world.events['power-switch'],true);assert.equal(world.events['supply-cache'],true);
  await travel('ArrowRight','annex');
  assert.equal(await page.evaluate(()=>window.__gs.drones.every(d=>d.state==='disabled')),true);
  assert.equal((await state()).session.exploration.progression.xp,12,'Revisit must not duplicate battle rewards');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1')),legacy);
  assert.deepEqual(errors,[]);
  console.log('PASS unified engine: four identities, real connected travel/interactions, patrol battle, victory rewards, menu save, reload/continue and no repeated reward');
}catch(error){
  let snapshot=null;try{snapshot=await state();}catch(_){}
  try{await page.screenshot({path:join(artifacts,'aeon-unified-failure.png'),fullPage:true});}catch(_){}
  await writeFile(join(artifacts,'aeon-unified-failure.json'),JSON.stringify({error:String(error.stack||error),state:snapshot,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
