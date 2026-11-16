// Real Chromium proof: generated character in the live Ghost Signal Game field
// and the existing RPG side-view renderer, with the original mode left unmodified.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const artifact=path.join(frontend,'test-artifacts','generated-character');
mkdirSync(artifact,{recursive:true});
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];const page=await browser.newPage({viewport:{width:960,height:540}});
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(base+'/index.html?rpg-lab=1&character-demo=test_relay_01',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__characterDemoReady?.applied===true,{timeout:20000});
 const field=await page.evaluate(()=>({
   mode:window.__gs.mode,player:window.__gs.player,
   width:window.__gs.sheet.width,height:window.__gs.sheet.height,
   firstPixel:Array.from(window.__gs.sheet.getContext('2d').getImageData(0,0,1,1).data)
 }));
 assert.equal(field.width,384);assert.equal(field.height,224);
 assert(field.player&&Number.isFinite(field.player.x),'Game has real field player');
 await page.screenshot({path:path.join(artifact,'field.png')});
 let walked=false,walkResult=null;
 for(const key of ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown']){
   await page.keyboard.down(key);
   await page.waitForTimeout(320);
   const live=await page.evaluate(()=>({
     x:window.__gs.player.x,y:window.__gs.player.y,
     moving:window.__gs.player.moving,
     dir:window.__gs.player.dir
   }));
   if(Math.hypot(live.x-field.player.x,live.y-field.player.y)>2){
     walked=true;walkResult={key,...live};
     await page.screenshot({path:path.join(artifact,'field-walking.png')});
     await page.keyboard.up(key);
     break;
   }
   await page.keyboard.up(key);
 }
 assert(walked,'Generated field actor did not move under any cardinal input');
 assert(walkResult.moving,'Movement occurred but walking pose was not active');
 const mode=await page.evaluate(async()=>{
   const {createSideViewBattleScene}=await import('./js/engine/rpg-sideview-scene.js');
   const {RPG_BATTLER_ART}=await import('./js/engine/rpg-battle-art.js');
   assertRegistry(RPG_BATTLER_ART);
   const scene=createSideViewBattleScene(RPG_BATTLER_ART);
   document.body.appendChild(scene.canvas);
   const state={
     status:'active',
     party:[{side:'party',id:'test_relay_01',name:'Test Relay',hp:30,maxHp:30,guard:false,chargeTarget:null}],
     enemies:[{side:'enemy',id:'sentry',name:'Sentry',hp:42,maxHp:42,guard:false,chargeTarget:null}]
   };
   scene.setBattle(state,'party:test_relay_01');
   scene.playActions([{actor:'party:test_relay_01',target:'enemy:sentry',type:'attack'}]);
   window.__testScene=scene;
   const loadedImage=new Image();
   loadedImage.src=new URL('assets/battlers/test_relay_01.png',location.href).href;
   await loadedImage.decode();
   if(loadedImage.naturalWidth!==384||loadedImage.naturalHeight!==576)
     throw Error('Invalid live battle atlas geometry');
   return {width:scene.canvas.width,height:scene.canvas.height,battleSrc:RPG_BATTLER_ART['party:test_relay_01'].src};
   function assertRegistry(r){if(!r['party:test_relay_01'])throw Error('Test character not in real battle registry');}
 });
 assert.equal(mode.width,416);assert.equal(mode.height,116);
 assert.equal(mode.battleSrc,'assets/battlers/test_relay_01.png');
 await page.waitForTimeout(120);
 await page.locator('canvas#rpg-sideview-field').screenshot({path:path.join(artifact,'battle-attack.png')});
 await page.evaluate(()=>{
   window.__testScene.setBattle({
     status:'victory',
     party:[{side:'party',id:'test_relay_01',name:'Test Relay',hp:30,maxHp:30,guard:false}],
     enemies:[{side:'enemy',id:'sentry',name:'Sentry',hp:0,maxHp:42,guard:false}]
   },'party:test_relay_01');
 });
 await page.waitForTimeout(80);
 await page.locator('canvas#rpg-sideview-field').screenshot({path:path.join(artifact,'battle-victory.png')});
 // Original game remains a separate route, with native Wraith visuals and save keys.
 const original=await browser.newPage({viewport:{width:960,height:540}});
 original.on('pageerror',e=>errors.push(String(e)));
 await original.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
 await original.waitForFunction(()=>!!window.__gs);
 assert.equal(await original.evaluate(()=>window.__gs.sheet.width),384);
 assert.equal(await original.evaluate(()=>window.__gs.mode),'title');
 assert.equal(await original.evaluate(()=>window.__characterDemoReady),undefined);
 await original.close();
 const studio=await browser.newPage({viewport:{width:1200,height:800}});
 studio.on('pageerror',e=>errors.push(String(e)));
 await studio.goto(base+'/studio/',{waitUntil:'domcontentloaded'});
 await studio.waitForFunction(()=>!!window.__studio?.project,{timeout:20000});
 await studio.close();
 assert.deepEqual(errors,[],'Uncaught browser errors');
 writeFileSync(path.join(artifact,'result.json'),JSON.stringify({
   status:'passed',character:'test_relay_01',field,walk:walkResult,battle:mode,
   assertions:['actual Game field sprite sheet','walked under real cardinal inputs','original Ghost Signal unaffected',
    'real side-view battle scene','battle actions/victory','original Sprite Studio loads']
 },null,2));
 console.log('PASS: Generated noncanonical character loaded in original Game field, RPG side-view renderer, and Studio regression.');
}finally{await browser.close();}
