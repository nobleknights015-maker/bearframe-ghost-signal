// A complete input-driven tactical response to the sentry's readable wind-up.
// No teleporting, no direct combatAction calls, no synthetic world state.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import {join} from 'node:path';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifacts=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const inspect=()=>page.evaluate(()=>window.__rpgLab?.inspect());
try{
  await page.goto(base+'/index.html?rpg-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__rpgLab?.inspect().session.phase==='battle',{timeout:18000});
  }finally{await page.keyboard.up('ArrowRight');}
  const start=await inspect();
  assert.equal(start.session.battle.enemies[0].tactics,'charged-strike');
  const log=page.locator('#rpg-lab-battle');
  assert.match(await log.innerText(),/CHARGING NEXT TURN — NO DAMAGE THIS ACTION/,
    'The warning must tell the player the enemy is winding up');
  await page.getByRole('button',{name:'ATTACK',exact:true}).click(); // Sleeper; the sentry then locks target
  let charged=await inspect();
  assert.equal(charged.session.battle.enemies[0].chargeTarget,'party:sleeper');
  assert.equal(charged.session.battle.party[0].hp,38,'Charging should not deal damage');
  assert.match(await log.innerText(),/HEAVY STRIKE ON SLEEPER TEST — GUARD OR DISRUPT WITH PULSE/,
    'The actual locked target and counterplay must be visible');
  // Echo can defend while the target prepares to respond.
  await page.getByRole('button',{name:'GUARD',exact:true}).click(); // Echo
  let next=await inspect();
  assert.equal(next.session.battle.round,2);
  await page.getByRole('button',{name:'GUARD',exact:true}).click(); // Sleeper guards targeted strike
  next=await inspect();
  assert.equal(next.session.phase,'battle');
  assert.equal(next.session.battle.party[0].hp,29,
    'Guarded charged strike must do exactly half of the 18 unguarded damage');
  assert.ok(next.session.battle.log.some(m=>m.includes('sentry overload sleeper -9 HP')),
    'Battle log must reveal guarded heavy-strike damage');
  assert.equal(next.session.battle.enemies[0].chargeTarget,null);
  await page.getByRole('button',{name:'WITHDRAW',exact:true}).click(); // Echo withdraws
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',{timeout:12000});
  const fled=await inspect();
  assert.equal(fled.session.phase,'exploration');
  assert.equal(fled.session.exploration.party[0].hp,29,'Remaining HP must cross back into the field');
  assert.equal(fled.session.exploration.progression.xp,0);
  assert.equal(fled.session.exploration.inventory['ancient-scrap'],undefined);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const restored=await inspect();
  assert.equal(restored.session.exploration.party[0].hp,29);
  assert.equal(restored.session.exploration.quests.sentry,'fled');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS tactics: visible sentry charge, targeted guard halves heavy strike, no damage on wind-up, flee/reload preserves HP');
}catch(error){
  await mkdir(artifacts,{recursive:true});
  try{await page.screenshot({path:join(artifacts,'rpg-tactics-failure.png'),fullPage:true});}catch(_){}
  let state;try{state=await inspect();}catch(_){state=null;}
  await writeFile(join(artifacts,'rpg-tactics-failure.json'),JSON.stringify({error:String(error.stack||error),state,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
