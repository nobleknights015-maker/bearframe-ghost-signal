import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_VIEW,sideViewSlots,validateBattleArtManifest,battleAnimationFrame,ANIMATION_NAMES,sideViewPose,battleSpriteBounds}
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


test('side-view maps known combat cues to supported art rows and ignores unknown visual cues',()=>{
  const ally={id:'ally',hp:12,guard:false,chargeTarget:null};
  const pose=kind=>sideViewPose(ally,'party','active',{actor:'party:ally',kind},.1);
  assert.equal(pose('overload'),'attack');
  assert.equal(pose('pulse'),'cast');
  assert.equal(pose('repair'),'cast');
  assert.equal(pose('guard'),'guard');
  assert.equal(pose('unrecognized-effect'),'idle');
  for(const kind of ['overload','pulse','repair','guard','unrecognized-effect'])
    assert.ok(ANIMATION_NAMES.includes(pose(kind)));
});

test('v5 independent per-frame exposures survive validation and play at exact boundaries',()=>{
  const original=[180,220,180,240];
  const art=validateBattleArtManifest({'party:sleeper_A':{
    src:'assets/battlers/sleeper_A.png',frameWidth:64,frameHeight:64,scale:1,
    animations:{
      idle:{row:0,frames:4,fps:4.878,durationsMs:original,loop:true},
      attack:{row:1,frames:3,fps:6,durationsMs:[120,160,200],loop:false},
      down:{row:6,frames:3,fps:4,durationsMs:[100,180,300],holdLast:true}
    }
  }})['party:sleeper_A'];
  assert.notEqual(art.animations.idle.durationsMs,original,'Imported exposures must be copied');
  assert.ok(Object.isFrozen(art.animations.idle.durationsMs));
  const draw=(name,t)=>battleAnimationFrame(art,name,t).x/64;
  assert.deepEqual([0,.179,.18,.399,.40,.579,.58,.819,.82,1.0].map(t=>draw('idle',t)),
    [0,0,1,1,2,2,3,3,0,1]);
  assert.deepEqual([0,.119,.12,.279,.28,.8].map(t=>draw('attack',t)),
    [0,0,1,1,2,2],'Non-looping attacks must hold their last frame');
  assert.equal(draw('down',10),2,'Shutdown terminal pose must remain down');
  original[0]=9999;
  assert.equal(art.animations.idle.durationsMs[0],180,'Original caller must not mutate timings');
});
test('v5 per-frame exposure metadata is validated rather than accepted blindly',()=>{
  const base={src:'assets/battlers/sleeper_A.png',frameWidth:64,frameHeight:64,scale:1};
  const clip={row:0,frames:4,fps:5};
  for(const bad of [
    {...clip,durationsMs:[120,130,150]},
    {...clip,durationsMs:[120,0,150,130]},
    {...clip,durationsMs:[100,100,100,'1']},
    {...clip,loop:'yes'},
    {...clip,holdLast:1}
  ])assert.throws(()=>validateBattleArtManifest({'party:sleeper_A':{
    ...base,animations:{idle:bad}
  }}),TypeError);
});

test('all supported formations contain 64/96/128 battlers without clipping or intersecting slots',()=>{
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&
    a.y<b.y+b.height&&a.y+a.height>b.y;
  for(let allies=1;allies<=4;allies++)for(let foes=1;foes<=6;foes++){
    const slots=sideViewSlots({party:party.slice(0,allies),enemies:enemies.slice(0,foes)});
    for(const size of [64,96,128]){
      const bounds=slots.map(slot=>battleSpriteBounds(slot,{frameWidth:size,frameHeight:size,scale:1}));
      for(const box of bounds){
        assert.ok(box.x>=0&&box.x+box.width<=BATTLE_VIEW.width);
        assert.ok(box.y>=23&&box.y+box.height<=109,'Header and name baseline stay clear');
      }
      for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)
        assert.ok(!overlaps(bounds[i],bounds[j]),`Overlapping ${allies}/${foes} formation at ${size}px`);
    }
  }
});
