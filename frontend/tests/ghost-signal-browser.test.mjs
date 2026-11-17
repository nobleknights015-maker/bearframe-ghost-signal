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
      localStorage.setItem(key,JSON.stringify({unlocked:{m2:true,m3:true},done:{m1:true,m2:true},case:{ev:[],logs:[]}}));
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
    assert.ok(state.width>40 && state.height>25);
    const screenshots=resolve(frontend,'test_reports');
    await mkdir(screenshots,{recursive:true});
    await page.screenshot({path:resolve(screenshots,'ghost-signal-m03-chromium.png')});
    assert.deepEqual(exceptions,[]);
  } finally {
    await browser?.close();
    server.kill();
  }
});
