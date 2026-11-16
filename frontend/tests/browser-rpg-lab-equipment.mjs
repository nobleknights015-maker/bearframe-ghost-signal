// Real UI compatibility + equip-to-combat acceptance (noncanonical laboratory only).
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
try{
  await page.goto(base+'/index.html?rpg-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const before=await state();
  assert.equal(before.session.exploration.party[0].attack,11);
  assert.equal(before.session.exploration.inventory['legacy-blade'],1);
  // Exercise Gamepad API B/back navigation in the real running game loop.
  // The synthetic standard pad is a browser test fixture, not a physical controller claim.
  await page.evaluate(()=>{
    const pad={connected:true,id:'CI standard gamepad',mapping:'standard',axes:[0,0],
      buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    window.__ciPad=pad;
  });
  await page.locator('#lab-rpg-menu').click();
  await page.waitForFunction(()=>window.__gs.mode==='rpgmenu');
  await page.evaluate(()=>{window.__ciPad.buttons[1].pressed=true;window.__ciPad.buttons[1].value=1;});
  await page.waitForFunction(()=>window.__gs.mode==='play',{timeout:3000});
  await page.evaluate(()=>{window.__ciPad.buttons[1].pressed=false;window.__ciPad.buttons[1].value=0;});
  await page.locator('#lab-rpg-menu').click();
  await page.getByRole('button',{name:'EQUIPMENT',exact:true}).click();
  await page.getByRole('button',{name:'CHANGE EQUIPMENT'}).click();
  await page.getByRole('button',{name:'Sleeper Test · SLEEPER'}).click();
  const weapon=page.locator('#rpg-lab-menu button').filter({hasText:'ANCIENT BLADE'});
  const incompatible=page.locator('#rpg-lab-menu button').filter({hasText:'FOUNDRY MODULE'});
  assert.equal(await incompatible.isDisabled(),true,'Modern Foundry gear must not install in ancient Sleeper chassis');
  assert.equal(await page.locator('#rpg-lab-menu button').filter({hasText:'ECHO LINK'}).isDisabled(),true);
  assert.equal(await weapon.isEnabled(),true);
  await weapon.click();
  let equipped=await state();
  assert.equal(equipped.session.exploration.equipment.sleeper.weapon,'legacy-blade');
  assert.equal(equipped.session.exploration.inventory['legacy-blade'],undefined);
  assert.equal(equipped.session.exploration.inventory['legacy-tool'],1,'Old equipment must return to inventory');
  assert.equal(equipped.save.hasSave,true,'Equipment trade must be committed to save journal');

  await page.getByRole('button',{name:'CHANGE EQUIPMENT'}).click();
  await page.getByRole('button',{name:'Echo Test · ECHO'}).click();
  assert.equal(await page.locator('#rpg-lab-menu button').filter({hasText:'FOUNDRY MODULE'}).isDisabled(),true);
  await page.locator('#rpg-lab-menu button').filter({hasText:'ECHO LINK'}).click();
  equipped=await state();
  assert.equal(equipped.session.exploration.equipment.echo.weapon,'echo-link');
  assert.equal(equipped.session.exploration.inventory['echo-link'],undefined);
  await page.getByRole('button',{name:'CLOSE',exact:true}).click();

  // Actual field movement + sentry chase enters battle with equipment-derived stats.
  await page.keyboard.down('ArrowRight');
  try{
    await page.waitForFunction(()=>window.__rpgLab?.inspect().session.phase==='battle',{timeout:18000});
  }finally{await page.keyboard.up('ArrowRight');}
  const battle=await state();
  assert.equal(battle.session.battle.party[0].attack,15,'Sleeper weapon bonus missing from live battle');
  assert.equal(battle.session.battle.party[1].attack,9,'Echo weapon bonus missing from live battle');
  assert.equal(battle.session.battle.party[1].speed,8,'Echo speed bonus missing from live battle');
  assert.deepEqual(battle.session.battle.party[0].skills,['pulse','guard']);
  assert.deepEqual(battle.session.battle.party[1].skills,['repair','guard']);
  await page.getByRole('button',{name:'WITHDRAW'}).click();
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',{timeout:12000});
  assert.equal((await state()).session.phase,'exploration');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const restored=await state();
  assert.equal(restored.session.exploration.equipment.sleeper.weapon,'legacy-blade');
  assert.equal(restored.session.exploration.equipment.echo.weapon,'echo-link');
  assert.equal(restored.session.exploration.party[0].attack,11,'Base stat must remain unmodified');
  assert.equal(restored.session.exploration.inventory['legacy-blade'],undefined);
  assert.equal(restored.session.exploration.progression.xp,0,'Equipment/flee must not invent rewards');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS equipment: actual menu, ancient/modern chassis locks, inventory conservation, battle stats, save/reload');
}catch(error){
  await mkdir(artifactDir,{recursive:true});
  try{await page.screenshot({path:join(artifactDir,'rpg-equipment-failure.png'),fullPage:true});}catch(_){}
  let last;try{last=await state();}catch(_){last=null;}
  await writeFile(join(artifactDir,'rpg-equipment-failure.json'),JSON.stringify({error:String(error.stack||error),state:last,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
