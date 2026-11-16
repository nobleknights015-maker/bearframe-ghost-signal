import test from 'node:test';
import assert from 'node:assert/strict';
import {createSideViewBattleScene} from '../public/js/engine/rpg-sideview-scene.js';
import {battleActionTimeline,validateBattleArtManifest,sideViewPose} from '../public/js/engine/rpg-sideview-layout.js';
const manifest={
  'party:ally':{src:'assets/battlers/ally.png',frameWidth:64,frameHeight:64,scale:1,
    animations:{idle:{row:0,frames:4,fps:4},attack:{row:1,frames:6,fps:10,durationsMs:[100,100,100,100,100,100],releaseMs:200},victory:{row:7,frames:4,fps:5}}},
  'enemy:foe':{src:'assets/battlers/foe.png',frameWidth:64,frameHeight:64,scale:1,
    animations:{idle:{row:0,frames:4,fps:4},hit:{row:5,frames:3,fps:10,durationsMs:[150,200,250]},down:{row:6,frames:6,fps:5}}}
};
const battle={status:'active',party:[{id:'ally',side:'party',hp:12,maxHp:12}],enemies:[{id:'foe',side:'enemy',hp:20,maxHp:20}]};
test('queued action waits for full target reaction and authored fixed-FPS recoil',()=>{
  const art=validateBattleArtManifest(manifest);
  const queue=battleActionTimeline([{type:'attack',actor:'party:ally',target:'enemy:foe'},
    {type:'guard',actor:'party:ally'}],art,10);
  assert.equal(queue[0].actorDuration,.6);
  assert.equal(queue[0].reactionDuration,.6);
  assert.equal(queue[0].releaseAt,.2);
  assert.equal(queue[0].duration,.8,'Target recovery finishes after attacker recoil');
  assert.equal(queue[1].when,10.84);
  assert.equal(sideViewPose(battle.enemies[0],'enemy','active',queue[0],.65,
    queue[0].actorDuration,queue[0].reactionDuration,queue[0].releaseAt),'hit');
  assert.equal(sideViewPose(battle.party[0],'party','active',queue[0],.65,
    queue[0].actorDuration,queue[0].reactionDuration,queue[0].releaseAt),'idle');
  const fixed=battleActionTimeline([{type:'victory',actor:'party:ally'}],art)[0];
  assert.equal(fixed.actorDuration,.8,'Legacy FPS timing is preserved too');
});
test('live canvas starts reactions at release, terminal clips at transition, and appends actions',()=>{
  const saved=Object.fromEntries(['document','Image','performance','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,globalThis[k]]));
  let now=0,callback;const draws=[],texts=[];
  const context={fillRect(){},fillText(text){texts.push(text);},save(){},restore(){},translate(){},scale(){},drawImage(...args){draws.push(args);}};
  const canvas={style:{},isConnected:true,setAttribute(){},getContext(){return context;},closest(){return null;}};
  Object.assign(globalThis,{
    document:{createElement(){return canvas;}},performance:{now:()=>now},
    Image:class{naturalWidth=384;naturalHeight=576;set src(value){this.path=value;this.onload();}},
    requestAnimationFrame:fn=>{callback=fn;return 1;},cancelAnimationFrame(){}
  });
  let scene;
  const paint=t=>{now=t*1000;draws.length=0;callback(now);return draws.map(a=>({path:a[0].path,x:a[1],y:a[2]}));};
  try{
    scene=createSideViewBattleScene(manifest);scene.setBattle(battle,'party:ally');
    assert.equal(texts.at(-1),'SIDE-VIEW // TACTICAL LINK','Bound sprites are not mislabeled as diagnostic art');
    scene.playActions([{type:'attack',actor:'party:ally',target:'enemy:foe'}]);
    let frames=paint(.21);assert.equal(frames[1].y,320);assert.equal(frames[1].x,0,'Hit starts at release, not actor start');
    frames=paint(.4);assert.equal(frames[1].x,64,'Target respects its own exposure boundaries');
    scene.playActions([{type:'guard',actor:'party:ally'}]);
    assert.ok(scene.presentationRemainingSeconds>.9,'New command appends rather than deleting recoil');
    frames=paint(.65);assert.equal(frames[1].y,320,'Target reaction continues past attacker animation');
    assert.equal(frames[0].y,0,'Attacker returns idle while target recovers');
    now=10000;draws.length=0;
    scene.setBattle({...battle,status:'victory',enemies:[{...battle.enemies[0],hp:0}]},null);
    assert.equal(draws[0][1],0,'Victory enters on first cel even at late battle clock');
    assert.equal(draws[1][1],0,'Shutdown enters on first cel even at late battle clock');
    frames=paint(10.21);assert.equal(frames[0].x,64);assert.equal(frames[1].x,64);
    paint(20);assert.equal(scene.isPresenting,false);
    scene.setBattle(battle,'party:ally');
    scene.playActions([{type:'attack',actor:'party:ally',target:'enemy:foe'}]);
    scene.setBattle({...battle,status:'victory',enemies:[{...battle.enemies[0],hp:0}]},null);
    frames=paint(20.1);
    assert.equal(frames[0].y,64,'Final result must not replace the killing strike with victory');
    assert.equal(frames[1].y,0,'Defeated target stays standing until release');
    frames=paint(20.21);
    assert.equal(frames[1].y,384,'Shutdown starts on actual impact');
    frames=paint(20.81);
    assert.equal(frames[0].y,448,'Victory starts only after full action and reaction');
    assert.equal(frames[0].x,0,'Victory begins at its first exposure');
    assert.equal(scene.isPresenting,true,'Final overlay waits for complete victory and shutdown');
    paint(21.61);assert.equal(scene.isPresenting,false);
    assert.equal(battle.enemies[0].hp,20,'Presentation never mutates combat data');
  }finally{scene?.stop();for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
