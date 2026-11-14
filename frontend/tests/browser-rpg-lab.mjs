// Run with: GS_BASE_URL=http://127.0.0.1:3000 node frontend/tests/browser-rpg-lab.mjs
// npm install --no-save playwright && npx playwright install chromium
// Browser smoke test, not a substitute for a full mission playthrough or physical Android testing.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const errors=[];
const artifactDir=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const diagnostics=[];
page.on('console',message=>{if(message.type()==='error')diagnostics.push('console: '+message.text());});
page.on('requestfailed',request=>diagnostics.push('request: '+request.url()+' '+(request.failure()?.errorText||'')));
page.on('pageerror',error=>errors.push(error.message));
async function labState(){
  return page.evaluate(()=>window.__rpgLab?.inspect());
}
try{
  await page.goto(base+'/index.html?rpg-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab && window.__gs?.m?.id==='rpg-lab',{timeout:20000});
  const legacyBefore=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));
  let snap=await labState();
  assert.equal(snap.mode,'play');
  assert.equal(snap.session.security.mode,'normal');
  assert.equal(snap.field.mission,'rpg-lab');
  assert.equal(snap.session.exploration.party.length,2);

  // Movement is delivered through actual keyboard controls, never by manipulating coordinates.
  const start=snap.field.player.x;
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  snap=await labState();
  assert.ok(snap.field.player.x>start+20,'Four-direction field movement did not advance');

  await page.locator('#lab-rpg-menu').click();
  await page.locator('#rpg-lab-menu').waitFor({state:'visible'});
  assert.equal((await labState()).mode,'rpgmenu');
  await page.getByRole('button',{name:'SAVE',exact:true}).last().click();
  await page.getByRole('button',{name:'SAVE RPG TEST RECORD'}).click();
  assert.equal((await labState()).save.hasSave,true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab && window.__gs?.m?.id==='rpg-lab');
  snap=await labState();
  assert.ok(snap.field.player.x>start+20,'Save/reload teleported the player back to start');
  assert.equal(snap.field.mission,'rpg-lab');
  const legacyAfter=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));
  assert.equal(legacyAfter,legacyBefore,'The RPG lab modified the original Ghost Signal save namespace');

  // WALK INTO THE ACTUAL SECURITY SECTOR, LET THE REAL SENTRY DETECT US.
  // No state teleporting or direct encounter invocation: this uses keyboard input.
  const crossed=await page.evaluate(()=>window.__gs.player.x);
  await page.keyboard.down('ArrowRight');
  try {
    await page.waitForFunction(
      ()=>window.__rpgLab?.inspect()?.session?.phase==='battle',
      {timeout:18000});
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  let battleState=await labState();
  assert.equal(battleState.mode,'battle','The real field did not pause for tactical combat');
  assert.equal(battleState.session.security.mode,'stealth','Sentry detection should occur only inside security zone');
  assert.ok(battleState.field.player.x>crossed+160,'Encounter should follow actual eastward movement');
  assert.equal(battleState.session.battle.enemies[0].id,'sentry');

  // Execute ACTUAL TACTICAL BUTTONS in turn order, including the automatic enemy response.
  const pulse=page.locator('#rpg-lab-battle button').filter({hasText:'PULSE (5 EP)'});
  const attack=page.locator('#rpg-lab-battle button').filter({hasText:'ATTACK'});
  await pulse.click();
  battleState=await labState();
  assert.equal(battleState.session.phase,'battle');
  assert.equal(battleState.session.battle.party[0].ep,5,'Pulse resource cost must persist through enemy counterattack');
  await attack.click();
  await pulse.click();
  await attack.click();
  await attack.click();

  const outcome=await labState();
  assert.equal(outcome.session.phase,'exploration','Winning encounter must resume field gameplay');
  assert.equal(outcome.mode,'play');
  assert.equal(outcome.field.flags.labResolved,true);
  assert.equal(outcome.session.exploration.progression.xp,12,'A single victory must award XP once');
  assert.equal(outcome.session.exploration.inventory['ancient-scrap'],1,'A single victory must award one scrap');
  assert.equal(outcome.session.exploration.quests.sentry,'neutralized');
  assert.equal(outcome.field.player.x,battleState.field.player.x,'Battle must restore exact field X');
  assert.equal(outcome.field.player.y,battleState.field.player.y,'Battle must restore exact field Y');

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab && window.__gs?.m?.id==='rpg-lab');
  const recovered=await labState();
  assert.equal(recovered.field.flags.labResolved,true,'Resolved sentry should stay defeated after reload');
  assert.equal(recovered.session.exploration.progression.xp,12,'Reload must not duplicate XP');
  assert.equal(recovered.session.exploration.inventory['ancient-scrap'],1,'Reload must not duplicate scrap');
  assert.equal(recovered.session.exploration.quests.sentry,'neutralized');

  // Separately exercise the AUTHORED non-combat relay handler in the real browser runtime.
  // This checks game/UI/save integration, not full traversal to the relay's tile.
  await page.evaluate(()=>{
    for(const key of Object.keys(localStorage))
      if(key.startsWith('bearframe_ghost_signal_rpg_lab_v1:'))localStorage.removeItem(key);
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab && window.__gs?.m?.id==='rpg-lab');
  await page.evaluate(()=>{
    const g=window.__gs;
    g.use(g.ent('relay')); // harness-only direct interaction for isolated alternative branch
  });
  await page.waitForFunction(()=>window.__gs.flags.labResolved===true);
  let bypass=await labState();
  assert.equal(bypass.field.flags.labRelay,true);
  assert.equal(bypass.session.exploration.quests.sentry,'bypassed via relay');
  assert.equal(bypass.session.exploration.progression.xp,0,'Bypassing combat must NOT award battle XP');
  assert.ok(!bypass.session.exploration.inventory['ancient-scrap'],'Bypassing combat must NOT award sentry scrap');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab && window.__gs?.m?.id==='rpg-lab');
  bypass=await labState();
  assert.equal(bypass.session.exploration.quests.sentry,'bypassed via relay','Bypass must persist across reload');
  assert.equal(bypass.field.flags.labResolved,true);

  // Original game is unaffected when the opt-in test query is absent.
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__gs?.mode==='title');
  assert.equal(await page.evaluate(()=>!!window.__rpgLab),false);
  await page.locator('#btn-new').click();
  await page.waitForFunction(()=>window.__gs?.m?.id==='m1');
  assert.equal(await page.evaluate(()=>window.__gs.m.id),'m1');

  // Standalone Sprite Studio is still an independent entrypoint.
  await page.goto(base+'/studio/',{waitUntil:'domcontentloaded'});
  await page.locator('#btn-new').waitFor({state:'visible'});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS browser smoke: field movement → sentry detection → tactical win → rewards/reload; relay bypass/reload; original M1 + Sprite Studio');
}catch(error){
  await mkdir(artifactDir,{recursive:true});
  const stamp='rpg-lab-failure';
  try{await page.screenshot({path:join(artifactDir,stamp+'.png'),fullPage:true});}catch(e){diagnostics.push('screenshot: '+e.message);}
  let state=null;
  try{state=await labState();}catch(e){diagnostics.push('state: '+e.message);}
  await writeFile(join(artifactDir,stamp+'.json'),JSON.stringify({url:page.url(),error:String(error.stack||error),pageErrors:errors,diagnostics,state},null,2));
  console.error('Browser failure artifacts written to '+artifactDir);
  throw error;
}finally{
  await browser.close();
}
