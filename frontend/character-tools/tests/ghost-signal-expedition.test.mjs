import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadImage} from '@napi-rs/canvas';
const tools=dirname(fileURLToPath(import.meta.url));
const assets=resolve(tools,'../../public/assets/characters');
test('upgraded generator produced native world sheets for all M03/M04 NPCs',async()=>{
 const manifest=JSON.parse(await readFile(resolve(assets,'ghost-signal-expedition.json'),'utf8'));
 assert.equal(manifest.generator,'upgraded-sprite-studio-sleek-copy');
 assert.equal(manifest.status,'unreviewed-drafts-not-canonical-visual-approvals');
 assert.deepEqual(manifest.directions,['down','up','right','left']);
 assert.equal(manifest.assets.length,4);
 assert.deepEqual(manifest.assets.map(x=>x.entity),['mira','nova','kai','survivor']);
 for(const item of manifest.assets){
  assert.match(item.src,/^assets\/characters\/gs_[a-z]+_exp_draft\.png$/);
  const bytes=await readFile(resolve(assets,item.id+'.png'));
  const img=await loadImage(bytes);
  assert.equal(img.width,384);assert.equal(img.height,224);
  assert.ok(item.nontransparentPixels>350);
  assert.equal(item.pngSha256.length,64);
  await access(resolve(tools,'../../character-output/ghost-signal-expedition',item.id,'source.bfsprite.json'));
  await access(resolve(tools,'../../character-output/ghost-signal-expedition',item.id,'battle.png'));
  await access(resolve(tools,'../../character-output/ghost-signal-expedition',item.id,'preview.png'));
 }
});
