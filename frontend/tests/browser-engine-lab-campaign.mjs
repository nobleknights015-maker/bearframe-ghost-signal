import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const privateFiles={
  'asset-manifest.json':{schema:'aeon.asset-library.v4',characters:[
    ...['sleeper_A','sleeper_B','sleeper_C','sleeper_D'].map(id=>({id,world:{src:'assets/world/'+id+'.png'},battle:{src:'assets/battlers/'+id+'.png'}})),
    ...Array.from({length:38},(_,i)=>({id:'synthetic_'+i}))
  ]},
  'campaign.json':{schemaVersion:1,revision:2},
  'opening-world-review-candidate.json':{status:'authored-blockout-review-candidate',
    campaignRevision:2,layoutDigest:'synthetic-approved-review'}
};
try{
  await page.goto(base+'/engine-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#campaign-review').isVisible(),false,
    'Public debug launcher cannot offer a missing private campaign');
  assert.equal(await page.locator('#aeon-unified').isVisible(),false,
    'A missing V5 art catalog must not advertise an unplayable unified mode');
  assert.match(await page.locator('#campaign-install-status').innerText(),/REQUIRE OWNER-INSTALLED/);
  assert.equal(await page.locator('a[href="index.html"]').isVisible(),true,
    'Original Ghost Signal must stay reachable');
  assert.equal(await page.locator('#owner-aeon-zip').getAttribute('type'),'file',
    'Debug APK must expose a user-initiated local private ZIP picker');
  assert.match(await page.locator('#owner-aeon-zip').getAttribute('accept'),/zip/,
    'Only owner-provided archive format is offered');
  assert.equal(await page.locator('#owner-aeon-import label').isVisible(),true,
    'The importer must remain available even before private art exists');

  await page.route('**/assets/aeon/**',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').at(-1);
    if(!privateFiles[name])return route.fulfill({status:404,body:'Missing'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(privateFiles[name])});
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#campaign-review').waitFor({state:'visible'});
  assert.equal(await page.locator('#aeon-unified').isVisible(),true,
    'Installed v5 starter art should unlock the unified engine test mode');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'aeon-unified');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),
    'index.html?connected-lab=1','Keyboard moves in the two-column developer launcher');
  await page.evaluate(()=>{
    const pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    window.__launcherPad=pad;
    document.getElementById('aeon-unified').focus();
    pad.buttons[13].pressed=true;
  });
  await page.waitForFunction(()=>document.activeElement?.getAttribute('href')==='index.html?connected-lab=1');
  await page.evaluate(()=>window.__launcherPad.buttons[13].pressed=false);
  await page.waitForTimeout(64);
  await page.evaluate(()=>{
    const a=document.getElementById('aeon-unified');
    a.addEventListener('click',event=>{event.preventDefault();window.__padAccepted=true},{once:true});
    a.focus();
    window.__launcherPad.buttons[0].pressed=true;
  });
  await page.waitForFunction(()=>window.__padAccepted===true);
  await page.evaluate(()=>window.__launcherPad.buttons[0].pressed=false);
  await page.waitForTimeout(60);
  await page.evaluate(()=>{
    document.querySelector('a[href="studio/"]').focus();
    window.__launcherPad.buttons[15].pressed=true;
  });
  await page.waitForFunction(()=>document.activeElement?.htmlFor==='owner-aeon-zip');
  await page.evaluate(()=>window.__launcherPad.buttons[15].pressed=false);
  assert.equal(await page.locator('#campaign-review').getAttribute('href'),'campaign.html');
  assert.match(await page.locator('#campaign-install-status').innerText(),/NOT FINAL/);

  privateFiles['opening-world-review-candidate.json'].campaignRevision=999;
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#campaign-review').isVisible(),false,
    'A mismatched story revision must not activate a review route');
  assert.equal(await page.locator('#aeon-unified').isVisible(),true,
    'An installed art library still permits noncanonical engine testing without story data');
  assert.deepEqual(errors,[]);
  console.log('PASS Android test launcher: optional Aeon modes hidden without art, source revisions enforced, keyboard and gamepad controls, original modes kept');
}finally{await browser.close();}
