// Live side-view presentation acceptance: real stealth detection -> animated battle canvas.
// Never triggers combat from a test hook and never modifies the protected original game.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
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
  const battle=await inspect();
  assert.equal(battle.battleView,'side-view','The actual battle must mount side-view, not a text-only layout');
  assert.equal(battle.mode,'battle');
  const canvas=page.locator('#rpg-sideview-field');
  await canvas.waitFor({state:'visible'});
  const dims=await canvas.evaluate(el=>({
    width:el.width,height:el.height,css:el.getBoundingClientRect().toJSON(),
    described:el.getAttribute('aria-label')
  }));
  assert.equal(dims.width,416);assert.equal(dims.height,116);
  assert.match(dims.described,/allied frames left, 1 enemies right/);
  assert.ok(dims.css.width>300&&dims.css.height>80,'Side-view stage must be legible in landscape');
  const pixels=await canvas.evaluate(el=>{
    const c=el.getContext('2d');
    const sample=(x0,y0,x1,y1)=>{
      const colors=new Set();
      for(let y=y0;y<y1;y+=3)for(let x=x0;x<x1;x+=3){
        const v=c.getImageData(x,y,1,1).data;
        colors.add(v[0]+','+v[1]+','+v[2]);
      }
      return colors.size;
    };
    return {left:sample(36,31,145,108),right:sample(287,31,390,108)};
  });
  assert.ok(pixels.left>=6,'Ally side must render visible differentiated pixel art');
  assert.ok(pixels.right>=6,'Enemy side must render visible differentiated pixel art');
  await mkdir(artifacts,{recursive:true});
  await page.screenshot({path:join(artifacts,'sideview-battle-preview.png'),fullPage:true});
  assert.match(await page.locator('#rpg-lab-battle').innerText(),/SIDE-VIEW SECURITY ENCOUNTER/);
  assert.match(await page.locator('#rpg-lab-battle').innerText(),/CHARGING NEXT TURN/);
  const commands=page.locator('#rpg-lab-battle button');
  assert.equal(await commands.count(),6,'The visible stage must retain every original tactical command');
  const before=await canvas.evaluate(c=>c.toDataURL());
  await page.getByRole('button',{name:'ATTACK',exact:true}).click(); // Sleeper, then sentry charge
  await page.waitForTimeout(110);
  const after=await canvas.evaluate(c=>c.toDataURL());
  assert.notEqual(after,before,'Side-view actors, effects or turn focus must respond to combat actions');
  assert.equal((await inspect()).session.battle.enemies[0].chargeTarget,'party:sleeper');
  assert.match(await page.locator('#rpg-lab-battle').innerText(),/HEAVY STRIKE ON SLEEPER TEST/);
  await page.getByRole('button',{name:'GUARD',exact:true}).click(); // Echo
  await page.getByRole('button',{name:'GUARD',exact:true}).click(); // Sleeper
  assert.equal((await inspect()).session.battle.party[0].hp,29,'The visual layer must not alter guard damage rules');
  await page.getByRole('button',{name:'WITHDRAW',exact:true}).click();
  await page.waitForFunction(()=>window.__rpgLab?.inspect().mode==='play',{timeout:12000});
  assert.equal((await inspect()).mode,'play');
  assert.equal((await inspect()).session.exploration.party[0].hp,29);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS side-view: visible left/right battlers, pixel render, reactive turn animation, command continuity, guarded damage and field return');
}catch(error){
  await mkdir(artifacts,{recursive:true});
  try{await page.screenshot({path:join(artifacts,'sideview-battle-failure.png'),fullPage:true});}catch(_){}
  let state;try{state=await inspect();}catch(_){state=null;}
  await writeFile(join(artifacts,'sideview-battle-failure.json'),JSON.stringify({error:String(error.stack||error),state,pageErrors:errors},null,2));
  throw error;
}finally{await browser.close();}
