import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {
 generateCharacter,generateOverworldAnimations,generateBattleAnimations,exportCharacter,
 validateCharacter,importApprovedSpriteSheet,BATTLE_ROWS,WORLD_DIRECTIONS
} from '../character-api.mjs';
const spec=JSON.parse(await readFile(new URL('../requests/test_relay_01.json',import.meta.url),'utf8'));
const digest=async x=>(await readFile(x)).toString('base64');
test('native Studio generator produces registered-format world + battle and editable project',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'aeon-studio-'));
 try{
  await generateCharacter(spec,{outputRoot:root});
  const w=await generateOverworldAnimations(spec.id,{outputRoot:root});
  const b=await generateBattleAnimations(spec.id,{outputRoot:root});
  const m=await exportCharacter(spec.id,{outputRoot:root});
  assert.deepEqual(w.rows,WORLD_DIRECTIONS);
  assert.deepEqual(b.rows,BATTLE_ROWS);
  assert.deepEqual(Object.values(b.animations).map(x=>x.row),[0,1,2,3,4,5,6,7,8]);
  assert.equal(w.tileSize,32);assert.deepEqual(w.footprintTiles,[1,1]);
  assert.deepEqual(m.identity,{portrait:spec.id,world:spec.id,battle:spec.id});
  assert.equal(b.frameWidth,64);assert.equal(b.frameHeight,64);
  assert.equal(w.frameWidth,32);assert.equal(w.frameHeight,56);
  assert.equal(m.status,'draft');
  const qa=await validateCharacter(spec.id,{outputRoot:root});
  assert.equal(qa.ok,true,qa.problems.join('; '));
  assert.equal(qa.assets.battle.width,384);
  assert.equal(qa.assets.battle.height,576);
  assert.equal(qa.assets.world.height,224);
  assert.equal(qa.assets.portrait.width,96);
  assert((await readFile(path.join(root,spec.id,'source.bfsprite.json'))).length>500);
  await assert.rejects(generateCharacter(spec,{outputRoot:root}),/refusing to overwrite/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('identical seed and specification reproduce binary-identical generated pixels',async()=>{
 const roots=await Promise.all([0,1].map(()=>mkdtemp(path.join(tmpdir(),'aeon-replay-'))));
 try{
  for(const root of roots){
   await generateCharacter({...spec,id:'test_repeat_01'},{outputRoot:root});
   await generateOverworldAnimations('test_repeat_01',{outputRoot:root});
   await generateBattleAnimations('test_repeat_01',{outputRoot:root});
   await exportCharacter('test_repeat_01',{outputRoot:root});
  }
  for(const image of ['world.png','battle.png','portrait.png']){
   const a=await digest(path.join(roots[0],'test_repeat_01',image));
   const b=await digest(path.join(roots[1],'test_repeat_01',image));
   assert.equal(a,b,image+' differs despite same seed and spec');
  }
 }finally{await Promise.all(roots.map(root=>rm(root,{recursive:true,force:true})));}
});
test('approved sleeper identities cannot be procedurally replaced or imported without review',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'aeon-gate-'));
 try{
  await assert.rejects(generateCharacter({...spec,id:'sleeper_A'},{outputRoot:root}),/must use importApprovedSpriteSheet/);
  await assert.rejects(importApprovedSpriteSheet('not-a-file.png',{characterId:'sleeper_A',role:'portrait'},{outputRoot:root}),/reviewer approval/);
  await assert.rejects(generateCharacter({...spec,id:'test_bad_path',appearanceReference:'private-character.png'},{outputRoot:root}),/reference cannot be auto-traced/);
  await assert.rejects(generateCharacter({...spec,id:'test_bad_bypass',appearanceReference:'canonical.png',approvedSourceSheet:true},{outputRoot:root}),/reference cannot be auto-traced/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('edited Studio frame stays unchanged through separate-process regeneration',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'aeon-edited-'));
 try{
  await generateCharacter({...spec,id:'test_edited_01'},{outputRoot:root});
  await generateOverworldAnimations('test_edited_01',{outputRoot:root});
  await generateBattleAnimations('test_edited_01',{outputRoot:root});
  const projectFile=path.join(root,'test_edited_01','source.bfsprite.json');
  const p=JSON.parse(await readFile(projectFile,'utf8'));
  const key='down|idle|0',cell=p.sets.exploration.cells[key];
  assert(cell&&cell.startsWith('data:image/png;base64,'));
  p.sets.exploration.edited.push(key);
  await writeFile(projectFile,JSON.stringify(p));
  execFileSync(process.execPath,[new URL('../cli.mjs',import.meta.url).pathname,'world','test_edited_01'],
    {env:{...process.env,BF_CHARACTER_OUTPUT:root},stdio:'pipe'});
  const after=JSON.parse(await readFile(projectFile,'utf8'));
  assert.equal(after.sets.exploration.cells[key],cell,'Hand-edited frame was overwritten');
  assert(after.sets.exploration.edited.includes(key));
 }finally{await rm(root,{recursive:true,force:true});}
});


test('nonhumanoid hexapod and heavy rigs remain machine-specific with independently sized battle cells',async()=>{
 for(const [body,id] of [['hexapod','test_hexapod_01'],['heavy','test_heavy_01']]){
  const root=await mkdtemp(path.join(tmpdir(),'aeon-machine-'));
  try{
   await generateCharacter({id,kind:'machine',body,faction:'noncanonical-qa',seed:13},{outputRoot:root});
   const w=await generateOverworldAnimations(id,{outputRoot:root});
   const b=await generateBattleAnimations(id,{outputRoot:root});
   await exportCharacter(id,{outputRoot:root});
   assert(b.frameWidth===96,'Large machine must have 96-pixel battle cell');
   assert(w.frameWidth>32&&w.frameHeight>56,'Machine world sprite must not be forced into humanoid frame');
   assert(w.footprintTiles[0]>=1);
   const qa=await validateCharacter(id,{outputRoot:root});
   assert(qa.ok,qa.problems.join('; '));
  }finally{await rm(root,{recursive:true,force:true});}
 }
});

test('reviewed imported world and battle pixels are never replaced by procedural regeneration',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'aeon-approved-import-'));
 try{
  const id='test_approved_import_01', source={...spec,id:'test_unreviewed_source_01'};
  await generateCharacter(source,{outputRoot:root});
  await generateOverworldAnimations(source.id,{outputRoot:root});
  await generateBattleAnimations(source.id,{outputRoot:root});
  const from=path.join(root,source.id), metadata={reviewed:true,reviewer:'owner-test'};
  for(const role of ['world','battle']){
    await importApprovedSpriteSheet(path.join(from,role+'.png'),{
      characterId:id,role,approval:metadata,
      sheetMetadata:JSON.parse(await readFile(path.join(from,role+'.json'),'utf8'))
        &&{...JSON.parse(await readFile(path.join(from,role+'.json'),'utf8')),characterId:id}
    },{outputRoot:root});
  }
  const target=path.join(root,id);
  const originals=await Promise.all(['world','battle'].map(role=>digest(path.join(target,role+'.png'))));
  await assert.rejects(generateOverworldAnimations(id,{outputRoot:root}),/Approved imported world art is immutable/);
  await assert.rejects(generateBattleAnimations(id,{outputRoot:root}),/Approved imported battle art is immutable/);
  for(const [index,role] of ['world','battle'].entries())
    assert.equal(await digest(path.join(target,role+'.png')),originals[index],role+' was modified');
 }finally{await rm(root,{recursive:true,force:true});}
});
