import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_VIEW,sideViewSlots,validateBattleArtManifest,battleAnimationFrame,ANIMATION_NAMES,sideViewPose}
  from '../public/js/engine/rpg-sideview-layout.js';

const party=[0,1,2,3].map(i=>({id:'ally-'+i}));
const enemies=[0,1,2,3,4,5].map(i=>({id:'foe-'+i}));
test('side-view has stable unique authored party/enemy positions with correct facing',()=>{
  assert.deepEqual(BATTLE_VIEW,{width:416,height:116});
  const layout=sideViewSlots({party,enemies});
  assert.equal(layout.length,10);
  assert.ok(layout.every(slot=>slot.y>=0&&slot.y<BATTLE_VIEW.height),'Every actor must have feet within canvas');
  assert.equal(new Set(layout.map(s=>s.x+':'+s.y)).size,10);
  assert.ok(layout.filter(x=>x.side==='party').every(x=>x.facing==='right'&&x.x<200));
  assert.ok(layout.filter(x=>x.side==='enemy').every(x=>x.facing==='left'&&x.x>200));
  assert.equal(layout[0].key,'party:ally-0');
  assert.equal(layout[4].key,'enemy:foe-0');
  assert.ok(Object.isFrozen(layout));
  assert.throws(()=>sideViewSlots({party:[...party,{id:'fifth'}],enemies}),TypeError);
  assert.throws(()=>sideViewSlots({party,enemies:[...enemies,{id:'seventh'}]}),TypeError);
});

test('side-view battler sheet contract accepts real transparent sprite atlas with named animation rows',()=>{
  const spec={
    'party:sleeper':{
      src:'assets/battlers/sleeper.png',frameWidth:64,frameHeight:64,scale:1,
      animations:{idle:{row:0,frames:4,fps:5},attack:{row:1,frames:6,fps:12},
        cast:{row:3,frames:6,fps:10},hit:{row:5,frames:3,fps:9},guard:{row:4,frames:2,fps:5}}
    }
  };
  const data=validateBattleArtManifest(spec);
  assert.ok(Object.isFrozen(data['party:sleeper'].animations));
  assert.deepEqual(battleAnimationFrame(data['party:sleeper'],'attack',0),{x:0,y:64,width:64,height:64});
  assert.deepEqual(battleAnimationFrame(data['party:sleeper'],'attack',.25),{x:192,y:64,width:64,height:64});
  assert.deepEqual(battleAnimationFrame(data['party:sleeper'],'down',.25),{x:64,y:0,width:64,height:64},'Missing state falls back to idle');
  assert.deepEqual(validateBattleArtManifest({}),{});
  assert.deepEqual(ANIMATION_NAMES.includes('victory'),true);
});

test('side-view rejects external files, traversal, invalid sheet geometry and unapproved animation rows',()=>{
  const base={src:'assets/battlers/frame.png',frameWidth:64,frameHeight:64,scale:1,animations:{idle:{row:0,frames:4,fps:6}}};
  for(const bad of [
    {...base,src:'https://external.example/frame.png'},
    {...base,src:'assets/battlers/../../secrets.png'},
    {...base,frameWidth:0},
    {...base,scale:0},
    {...base,animations:{idle:{row:0,frames:7,fps:6}}},
    {...base,animations:{attack:{row:1,frames:4,fps:6}}},
    {...base,animations:{idle:{row:0,frames:4,fps:6},hacked:{row:1,frames:4,fps:6}}},
    {...base,animations:{idle:{row:1,frames:4,fps:6}}},
    {...base,animations:{idle:{row:0,frames:4,fps:6},attack:{row:8,frames:4,fps:6}}},
    {...base,animations:{idle:{row:0,frames:4,fps:6},charge:{row:9,frames:4,fps:6}}}
  ])assert.throws(()=>validateBattleArtManifest({'party:sleeper':bad}),TypeError);
});


test('terminal down and victory animations hold last cel while idle and attack loop',()=>{
  const art=validateBattleArtManifest({'party:test':{
    src:'assets/battlers/test.png',frameWidth:64,frameHeight:64,scale:1,
    animations:{idle:{row:0,frames:4,fps:4},attack:{row:1,frames:6,fps:10},
      down:{row:6,frames:3,fps:6},victory:{row:7,frames:4,fps:6}}
  }})['party:test'];
  assert.equal(battleAnimationFrame(art,'down',10).x,128);
  assert.equal(battleAnimationFrame(art,'victory',10).x,192);
  assert.equal(battleAnimationFrame(art,'down',0).x,0);
  assert.equal(battleAnimationFrame(art,'attack',.6).x,0);
  assert.equal(battleAnimationFrame(art,'idle',1).x,0);
});

test('terminal side-view outcomes override old cues without changing combat state',()=>{
  const ally=Object.freeze({id:'ally',hp:12,guard:false,chargeTarget:null});
  const foe=Object.freeze({id:'foe',hp:9,guard:false,chargeTarget:null});
  const hit={actor:'enemy:foe',target:'party:ally',kind:'attack'};
  assert.equal(sideViewPose(ally,'party','active',hit,.1),'hit');
  assert.equal(sideViewPose(ally,'party','victory',hit,.1),'victory');
  assert.equal(sideViewPose(foe,'enemy','defeat',hit,.1),'victory');
  assert.equal(sideViewPose({...ally,hp:0},'party','victory',hit,.1),'down');
  assert.equal(sideViewPose(foe,'enemy','victory',hit,.1),'attack');
  assert.equal(sideViewPose(ally,'party','active',null),'idle');
  assert.equal(ally.hp,12);
});
