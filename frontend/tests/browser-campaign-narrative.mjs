// Synthetic data exercises the locked, original Ghost Signal UI in Chromium.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390}});
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
async function install(){
 await page.evaluate(async()=>{
  const {mountCampaignNarrative}=await import('/js/engine/campaign-narrative.js');
  const content={schemaVersion:1,revision:2,
   flagSchema:{gameplay_flags:['read','done'],exclusive_enums:{route:['unset','left','right']}},
   scenes:[{id:'opening',trigger:'WAKE',dialogue:['intro','branch'],sets:'done'}],
   insertions:[],
   dialogue:[{line_id:'intro',speaker:'SYSTEM',text:'Synthetic opening.',sequence:1,condition:'',event_effects:'read'},
    {line_id:'branch',speaker:'SYSTEM',text:'Synthetic branch.',sequence:2,condition:'route=right',event_effects:''}],
   choices:[{id:'route',scene:'opening',prompt:'Synthetic route?',selection_count:1,
    options:{LEFT:'route=left',RIGHT:'route=right'}}]};
  const game=window.__gs,ui=game.ui;
  ui.sfx={static(){},blip(){},beep(){}};
  ui.show('title',false);
  const read=()=>JSON.parse(localStorage.getItem('synthetic_campaign_adapter')||'{"flags":{"legacy":true}}');
  const controller=mountCampaignNarrative({game,ui,content,
   readWorld:read,commitWorld:world=>{
    if(window.__adapter.fail||(window.__adapter.failCompletion&&world.narrative?.completed.opening))return false;
    localStorage.setItem('synthetic_campaign_adapter',JSON.stringify(world));return true;
   },choiceGates:{route:{afterLine:'intro'}}});
  window.__adapter={controller,ui,game,read,fail:false,failCompletion:false};
 });
}
const saved=()=>page.evaluate(()=>window.__adapter.read());
async function advance(){
 // Acknowledge a fully displayed line through the original pointer handler.
 await page.evaluate(()=>{const ui=window.__adapter.ui;ui.shown=ui.line.t.length;});
 await page.locator('#dialog').click({position:{x:10,y:10}});
}
try{
 await page.goto(base+'/index.html',{waitUntil:'networkidle'});await install();
 assert.equal(await page.evaluate(()=>window.__adapter.controller.trigger('WAKE')),true);
 assert.equal(await page.locator('#dialog-speaker').textContent(),'SYSTEM');
 await page.evaluate(()=>window.__adapter.fail=true);
 await advance();assert.equal((await saved()).narrative.flags.read,false);
 await page.evaluate(()=>window.__adapter.fail=false);
 await advance();assert.equal((await saved()).narrative.flags.read,true);
 assert.equal(await page.locator('#dialog-choices button').count(),2);
 // Keyboard click must work despite original UI using pointerdown.
 await page.locator('#dialog-choices button').nth(1).focus();
 await page.keyboard.press('Enter');
 assert.equal((await saved()).narrative.enums.route,'right');
 assert.equal((await saved()).narrative.completed.opening,undefined);
 await page.reload({waitUntil:'networkidle'});await install();
 assert.equal(await page.evaluate(()=>window.__adapter.controller.resume()),true);
 assert.equal(await page.locator('#dialog-speaker').textContent(),'SYSTEM');
 await page.evaluate(()=>window.__adapter.failCompletion=true);
 await advance();assert.equal((await saved()).narrative.completed.opening,undefined);
 assert.equal(await page.locator('#dialog-choices button').textContent(),'1. RETRY');
 await page.evaluate(()=>window.__adapter.failCompletion=false);
 await page.locator('#dialog-choices button').click();
 assert.equal((await saved()).narrative.completed.opening,true);
 assert.equal((await saved()).flags.legacy,true);
 assert.equal(await page.evaluate(()=>window.__adapter.game.mode),'title');
 // Pointerdown plus its subsequent click must not consume a newly opened line.
 await page.evaluate(()=>{localStorage.removeItem('synthetic_campaign_adapter');window.__adapter.controller.trigger('WAKE');});
 await advance();
 await page.locator('#dialog-choices button').nth(1).click();
 assert.equal((await saved()).narrative.linesRead.branch,undefined);
 assert.equal((await saved()).narrative.completed.opening,undefined);
 await advance();assert.equal((await saved()).narrative.completed.opening,true);
 assert.deepEqual(errors,[]);
 console.log('Original Ghost Signal UI: narrative pointer, keyboard, rollback and reload passed.');
}finally{await browser.close();}
