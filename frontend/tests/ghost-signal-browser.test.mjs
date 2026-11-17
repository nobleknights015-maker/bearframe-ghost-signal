// Real browser smoke: preserves original entry and launches unlocked M03.
// Run in CI after installing playwright and chromium. Does not use private assets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://127.0.0.1:4173/';

async function liveServer() {
  const server = spawn(process.execPath, ['serve.js'], {
    cwd: frontend,
    stdio: 'ignore',
    env: { ...process.env, PORT: '4173', HOST: '127.0.0.1' },
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('server exited before ready');
    try { const r = await fetch(url); if (r.ok) return server; } catch {}
    await sleep(150);
  }
  server.kill();
  throw new Error('Ghost Signal static server did not start');
}
test('Chromium renders original title and isolated surface expansion', { timeout: 120000 }, async () => {
  const server = await liveServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({viewport:{width:960,height:540}});
    const exceptions = [];
    page.on('pageerror', e => exceptions.push(e.message));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.locator('#btn-new').waitFor({state:'visible'});
    assert.equal(await page.title(),'BEARFRAME: GHOST SIGNAL');
    await page.locator('#btn-new').click();
    await page.waitForFunction(()=>window.__gs?.m?.id==='m1');
    assert.equal(await page.evaluate(()=>window.__gs.m.id),'m1');
    await page.evaluate(()=>window.__gs.render());
    await page.evaluate(()=>{
      // Preserve the original save namespace; only authorize M03 in a simulated completed profile.
      const key='bearframe_ghost_signal_progress_v1';
      localStorage.setItem(key,JSON.stringify({unlocked:{m2:true,m3:true,m4:true,m5:true},done:{m1:true,m2:true},case:{ev:[],logs:[]}}));
    });
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#btn-m3').waitFor({state:'visible'});
    await page.locator('#btn-m3').click();
    await page.waitForFunction(()=>window.__gs?.m?.id==='m3');
    const state=await page.evaluate(()=>{
      const g=window.__gs; g.render();
      return {mission:g.m.id,mode:g.mode,theme:g.m.visualTheme,
        width:g.map.w,height:g.map.h,stealth:g.stealth()[0],
        actorCount:g.ents.filter(e=>e.role).length};
    });
    assert.equal(state.mission,'m3');
    assert.equal(state.theme,'surface');
    assert.equal(state.stealth,'FIELD SURVEY');
    assert.equal(state.actorCount,3);
    await page.waitForFunction(() => window.__gs?.actorSheets?.mira?.ready === true);
    await page.waitForFunction(() => window.__gs?.actorSheets?.nova?.ready === true);
    await page.waitForFunction(() => window.__gs?.actorSheets?.kai?.ready === true);
    assert.ok(state.width>40 && state.height>25);
    const screenshots=resolve(frontend,'test_reports');
    await mkdir(screenshots,{recursive:true});
    await page.screenshot({path:resolve(screenshots,'ghost-signal-m03-chromium.png')});
    // Verify actual pixel bytes from the user's cleared asset packs loaded inside
    // Chromium, rather than accepting procedural fallback alone.
    const art = await page.evaluate(async () => {
      const pack=await import('/js/art/pack-textures.js');
      const cv=document.createElement('canvas');cv.width=32;cv.height=32;
      const ctx=cv.getContext('2d');
      const painted=pack.paintPackFloor(ctx,'ruins',0,0);
      const rgba=ctx.getImageData(0,0,32,32).data;
      const colored=Array.from({length:1024},(_,i)=>rgba[i*4+3]).filter(a=>a>0).length;
      return {...pack.packAudit(),painted,colored};
    });
    assert.equal(art.loaded,true,'Native user asset pack missing or failed to decompress');
    assert.equal(art.cells,24);
    assert.equal(art.size,32);
    assert.equal(art.painted,true);
    assert.ok(art.colored>700,'Real 32x32 source terrain did not actually render');
    // Check the second expansion chapter without changing the original playthrough.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#btn-m4').waitFor({state:'visible'});
    await page.locator('#btn-m4').click();
    await page.waitForFunction(()=>window.__gs?.m?.id==='m4');
    const rescue = await page.evaluate(()=>{
      const g=window.__gs;
      g.render();
      return {mission:g.m.id,theme:g.m.visualTheme,stealth:g.stealth()[0],survivor:!!g.ent('survivor')};
    });
    assert.deepEqual(rescue,{mission:'m4',theme:'ruins',stealth:'FIELD SURVEY',survivor:true});
    await page.waitForFunction(() => window.__gs?.actorSheets?.survivor?.ready === true);
    await page.screenshot({path:resolve(screenshots,'ghost-signal-m04-chromium.png')});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#btn-m5').waitFor({state:'visible'});
    await page.locator('#btn-m5').click();
    await page.waitForFunction(()=>window.__gs?.m?.id==='m5');
    const relay=await page.evaluate(()=>{
      const g=window.__gs;g.render();
      return {mission:g.m.id,status:g.stealth()[0],gateClosed:g.solidAt(31*32+16,18*32+16),
        gateExists:!!g.ent('fieldGate'),weather:g.m.weather};
    });
    assert.deepEqual(relay,{mission:'m5',status:'RELAY SERVICE',gateClosed:true,gateExists:true,weather:'electrical'});
    await page.screenshot({path:resolve(screenshots,'ghost-signal-m05-chromium.png')});
    // Full UI exercise: dismiss the authored opening dialogue, inspect the real
    // physical collision interlock, then verify the engine animates open.
    const door = await page.evaluate(()=>{
      const g=window.__gs;
      for(let i=0;i<20&&g.mode==='dialog';i++)g.ui.advance();
      if(g.mode!=='play')throw Error('Opening Mission 05 dialogue did not complete');
      const actual=g.ent('fieldGate');
      const tileX=actual.tx*32+16,tileY=actual.ty*32+16;
      const before=g.solidAt(tileX,tileY);
      g.flags.isolated=true;
      g.updateWorld(.4);
      const after=g.solidAt(tileX,tileY);
      const opened=actual.open;
      g.flags.isolated=false;
      actual.open=0;
      g.player.x=(actual.tx-2)*32+16;g.player.y=tileY;
      g.cam=null;g.refreshHud();g.render();
      return {before,after,opened,status:g.stealth()[0],label:document.getElementById('hud-stealth')?.textContent??''};
    });
    assert.equal(door.before,true);
    assert.equal(door.after,false);
    assert.equal(door.opened,1);
    assert.equal(door.status,'RELAY SERVICE');
    await page.screenshot({path:resolve(screenshots,'ghost-signal-m05-gate-chromium.png')});
    assert.deepEqual(exceptions,[]);
  } finally {
    await browser?.close();
    server.kill();
  }
});
