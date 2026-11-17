import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.GS_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:844,height:390}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const privateFiles={
  'asset-manifest.json':{schema:'aeon.asset-library.v4',characters:Array.from({length:42},(_,i)=>({id:'synthetic_'+i}))},
  'campaign.json':{schemaVersion:1,revision:2},
  'opening-world-review-candidate.json':{status:'authored-blockout-review-candidate',
    campaignRevision:2,layoutDigest:'synthetic-approved-review'}
};
try{
  await page.goto(base+'/engine-lab.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#campaign-review').isVisible(),false,
    'Public debug launcher cannot offer a missing private campaign');
  assert.match(await page.locator('#campaign-install-status').innerText(),/REQUIRES OWNER-APPROVED/);
  assert.equal(await page.locator('a[href="index.html"]').isVisible(),true,
    'Original Ghost Signal must stay reachable');

  await page.route('**/assets/aeon/**',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').at(-1);
    if(!privateFiles[name])return route.fulfill({status:404,body:'Missing'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(privateFiles[name])});
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#campaign-review').waitFor({state:'visible'});
  assert.equal(await page.locator('#campaign-review').getAttribute('href'),'campaign.html');
  assert.match(await page.locator('#campaign-install-status').innerText(),/NOT FINAL/);

  privateFiles['opening-world-review-candidate.json'].campaignRevision=999;
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#campaign-review').isVisible(),false,
    'A mismatched story revision must not activate a review route');
  assert.deepEqual(errors,[]);
  console.log('PASS Android test launcher: private campaign access is hidden unless source staging matches, originals preserved');
}finally{await browser.close();}
