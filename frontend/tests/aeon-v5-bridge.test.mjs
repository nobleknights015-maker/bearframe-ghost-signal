import test from 'node:test';
import assert from 'node:assert/strict';
import {mapV5Art,worldSheetSpec,bindV5WorldSheet} from '../public/js/engine/aeon-v5-bridge.js';
import {validateBattleArtManifest,battleAnimationFrame} from '../public/js/engine/rpg-sideview-layout.js';
const NAMES=['idle','attack','ranged','cast','guard','hit','down','victory','charge'];
const make=(id,cell=64)=>({id,world:{src:'assets/world/'+id+'.png',columns:9,rows:4,
  frameWidth:32,frameHeight:56,directions:['down','left','right','up'],walkColumns:[1,2,3,4,5,6,7,8]},
  battle:{src:'assets/battlers/'+id+'.png',frameWidth:cell,frameHeight:cell,
    columns:6,rows:9,animations:Object.fromEntries(NAMES.map((name,i)=>{
      const frames=name==='idle'?4:name==='guard'||name==='hit'?3:6;
      const durationsMs=Array(frames).fill(120);
      return [name,{row:i,frames,durationsMs,loop:name==='idle'||name==='charge',
        fps:1000/120,holdLast:name==='down'||name==='victory'}];
    }))}});
const fixture={schema:'aeon.asset-library.v4',characters:[make('sleeper_B'),make('echo_industrial_maintenance',96),make('old_sentry',96)]};
test('v5 mappings preserve exact A-D identity, enemy roles and variable frame exposures',()=>{
 const specs=mapV5Art(fixture,{'party:sleeper':'sleeper_B','party:echo':'echo_industrial_maintenance','enemy:sentry':'old_sentry'});
 assert.equal(Object.keys(specs).length,3);
 assert.equal(specs['party:sleeper'].src,'assets/aeon/assets/battlers/sleeper_B.png');
 assert.equal(specs['enemy:sentry'].frameWidth,96);
 const validated=validateBattleArtManifest(specs);
 assert.equal(battleAnimationFrame(validated['party:sleeper'],'attack',.13).x,64);
 assert.equal(battleAnimationFrame(validated['party:sleeper'],'down',900).x,320);
 assert.deepEqual(validated['party:sleeper'].animations.attack.durationsMs,Array(6).fill(120));
});
test('v5 rejects missing art identities, improper world direction order and invalid actor key',()=>{
 assert.throws(()=>mapV5Art(fixture,{'party:echo':'missing_echo'}),/Missing approved-id artwork/);
 assert.throws(()=>mapV5Art(fixture,{'foo:sleeper':'sleeper_B'}),/Bad combat actor key/);
 assert.throws(()=>worldSheetSpec(fixture,'missing_starter'),/mismatch/);
 assert.equal(worldSheetSpec(fixture,'sleeper_B').walkColumns.length,8);
 const malformed={...fixture,characters:[{...fixture.characters[0],world:{...fixture.characters[0].world,directions:['down','up','left','right']}}]};
 assert.throws(()=>worldSheetSpec(malformed,'sleeper_B'),/mismatch/);
});
test('v5 field frame binding uses all eight distinct walk frames with independent Game instance',()=>{
 const game={player:{scanT:0,moving:true,anim:0},time:0,frame(){return 6;},sheet:null};
 assert.equal(bindV5WorldSheet(game,{canvas:{width:448,height:224},id:'sleeper_C'}),true);
 const frames=new Set();for(let tick=0;tick<=10;tick++){game.player.anim=tick;frames.add(game.frame());}
 assert.deepEqual([...frames].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]);
 assert.equal(game.ghostSheet,game.sheet,'Player history must not render as another character');
 assert.equal(game.echoSheet,game.sheet);assert.equal(game.fieldSpriteAnchorY,56);
 game.player.moving=false;assert.equal(game.frame(),8);
 game.player.scanT=.4;assert.equal(game.frame(),12);
 assert.throws(()=>bindV5WorldSheet(game,{canvas:{width:384,height:224},id:'sleeper_C'}),/Bad V5 field sheet/);
});
import {sideViewPose} from '../public/js/engine/rpg-sideview-layout.js';
test('authored v5 release and full pose duration do not end a strike at the old .34s hard limit',()=>{
 const attacker={id:'sleeper',hp:38,guard:false,chargeTarget:null};
 const victim={id:'sentry',hp:42,guard:false,chargeTarget:null};
 const cue={actor:'party:sleeper',target:'enemy:sentry',kind:'attack'};
 assert.equal(sideViewPose(attacker,'party','active',cue,.5,.56,.42,.22),'attack');
 assert.equal(sideViewPose(victim,'enemy','active',cue,.15,.56,.42,.22),'idle');
 assert.equal(sideViewPose(victim,'enemy','active',cue,.3,.56,.42,.22),'hit');
});
test('v5 rejects invalid authored frame exposure and out-of-clip release markers',()=>{
 const invalid=(mutate)=>{
   const character=structuredClone(fixture.characters[0]);
   mutate(character.battle.animations.attack);
   return {...fixture,characters:[character,...fixture.characters.slice(1)]};
 };
 for(const value of [0,-1,1.5,Infinity,10001]){
   const manifest=invalid(clip=>{clip.durationsMs[0]=value;});
   assert.throws(()=>mapV5Art(manifest,{'party:sleeper':'sleeper_B'}),/Invalid authored action timing/);
 }
 const releasePastEnd=invalid(clip=>{clip.events=[{kind:'release',atMs:721}];});
 assert.throws(()=>mapV5Art(releasePastEnd,{'party:sleeper':'sleeper_B'}),/Invalid authored release timing/);
 const releaseAtZero=invalid(clip=>{clip.events=[{kind:'release',atMs:0}];});
 const result=mapV5Art(releaseAtZero,{'party:sleeper':'sleeper_B'});
 assert.equal(result['party:sleeper'].animations.attack.releaseMs,0);
 assert.deepEqual(result['party:sleeper'].animations.attack.durationsMs,Array(6).fill(120));
});
