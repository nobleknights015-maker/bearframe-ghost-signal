// Browser-verified Ghost Signal asynchronous checkpoint rollback + RPG journal durability.
// A single direct fixture call collects salvage; actual restore occurs via the normal energy-depletion loop.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const artifactDir=process.env.GS_ARTIFACT_DIR||'frontend/test-artifacts';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__rpgLab?.inspect());
try{
  await page.goto(base+'/index.html?rpg-lab=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const legacy=await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1'));
  let snapshot=await state();
  assert.equal(snapshot.session.exploration.inventory['repair-kit'],1);
  const collected=await page.evaluate(()=>{
    const g=window.__gs;
    g.use(g.ent('salvage')); // QA fixture: isolate checkpoint handling without walking to item
    return {collected:g.flags.labSalvage,entityGone:g.ent('salvage').gone};
  });
  assert.equal(collected.collected,true);
  assert.equal(collected.entityGone,true);
  snapshot=await state();
  assert.equal(snapshot.session.exploration.inventory['repair-kit'],2);
  assert.equal(snapshot.save.hasSave,true);

  // Real Ghost Signal energy depletion triggers delayed restore; NO direct restore/applySnap call.
  await page.evaluate(()=>{window.__gs.player.energy=0;});
  await page.waitForFunction(()=>window.__gs.mode==='restoring',{timeout:2500});
  await page.waitForFunction(()=>window.__gs.mode==='play'&&window.__gs.stats.restores>=1,{timeout:6000});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().session.exploration.inventory['repair-kit']===1,{timeout:2000});
  const rolledBack=await state();
  assert.equal(rolledBack.session.exploration.inventory['repair-kit'],1);
  assert.equal(rolledBack.field.flags.labSalvage,undefined);
  assert.equal(await page.evaluate(()=>window.__gs.ent('salvage').gone),false);
  assert.equal(rolledBack.field.player.x,5.5*32);

  // A second app load must not revive the item that Ghost Signal's checkpoint undid.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__rpgLab?.inspect().field.mission==='rpg-lab');
  const reloaded=await state();
  assert.equal(reloaded.session.exploration.inventory['repair-kit'],1,
    'Reopened journal resurrected a post-checkpoint consumable');
  assert.equal(reloaded.field.flags.labSalvage,undefined,
    'Reopened journal resurrected post-checkpoint world state');
  assert.equal(reloaded.field.player.x,5.5*32);
  assert.equal(await page.evaluate(()=>localStorage.getItem('bearframe_ghost_signal_save_v1')),legacy);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS recovery: real energy-depletion restore rolls back RPG + field, persists corrected journal, survives reload');
}catch(error){
  await mkdir(artifactDir,{recursive:true});
  try{await page.screenshot({path:join(artifactDir,'rpg-recovery-failure.png'),fullPage:true});}catch(_){}
  let last;try{last=await state();}catch(_){last=null;}
  await writeFile(join(artifactDir,'rpg-recovery-failure.json'),JSON.stringify({error:String(error.stack||error),state:last,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
