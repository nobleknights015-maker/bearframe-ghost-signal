import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

function authoredWorld(zones=[]){
  const w=8,h=8,collision=Array.from({length:w*h},(_,i)=>{
    const x=i%w,y=Math.floor(i/w);
    return x===0||y===0||x===w-1||y===h-1?1:0;
  });
  return {schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
    id:'A00',name:'SYNTHETIC',width:w,height:h,orientation:'orthogonal',
    tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
    layers:[{type:'tilelayer',name:'collision',data:collision},
      {type:'objectgroup',name:'portals',objects:[]}],
    entities:[],triggers:[],security:{defaultMode:'normal',zones}
  }]};
}
const gate={id:'zone_one',x:64,y:64,w:64,h:64,mode:'stealth',consequence:'encounter',encounterId:'EN_SOURCE'};
const player=()=>({mode:'play',m:{id:'A00'},player:{x:80,y:80,hidden:null},
  drones:[{state:'patrol',vis:false}]});
function harness(zones=[],options={}){
  let world={flags:{relay_active:true},party:[{id:'sleeper'}],
    inventory:{scrap:3},location:{mapId:'A00'}};
  const writes=[],fights=[],alarms=[],failures=[];
  const runtime=createCampaignSecurityRuntime({
    worldSpec:authoredWorld(zones),
    readWorld:()=>structuredClone(world),
    commitWorld:next=>{
      if(options.failSave?.())return false;
      writes.push(structuredClone(next));world=structuredClone(next);return true;
    },
    encounterFor:options.encounterFor||(()=>null),
    onEncounter:(id,mapId)=>{assert.deepEqual(writes.at(-1)?.security,world.security,
      'Zone state must be durably committed before battle start');fights.push([id,mapId]);},
    onAlert:value=>alarms.push(value),
    onSaveFailure:()=>failures.push(1)
  });
  return {runtime,reads:()=>structuredClone(world),writes,fights,alarms,failures};
}
test('No private zone means no security rewrite to legacy story-only saves',()=>{
  const h=harness(),g=player();g.drones[0]={state:'chase',vis:true};
  assert.equal(h.runtime.tick(g),false);
  assert.equal(h.writes.length,0);
  assert.equal(h.reads().security,undefined);
  assert.equal(h.fights.length,0);
});
test('Authorized source-owned zone can enter battle only after saving detection',()=>{
  const h=harness([gate],{encounterFor:(id,mapId)=>id==='EN_SOURCE'&&mapId==='A00'?{id,mapId}:null});
  const g=player();
  assert.equal(h.runtime.tick(g),true,'Entering authored zone persists mode');
  assert.equal(h.reads().security.mode,'stealth');
  assert.equal(h.fights.length,0,'No fake battle without visual detection');
  g.drones[0]={state:'chase',vis:true};
  assert.equal(h.runtime.tick(g),true);
  assert.equal(h.reads().security.consequence,'encounter');
  assert.deepEqual(h.fights,[['EN_SOURCE','A00']]);
  assert.equal(h.runtime.tick(g),false,'Sustained detection cannot launch a second battle');
  assert.equal(h.fights.length,1);
  const saved=structuredClone(h.reads());
  assert.deepEqual(saved.inventory,{scrap:3});
  assert.deepEqual(saved.flags,{relay_active:true});
  const reloaded=createCampaignSecurityRuntime({
    worldSpec:authoredWorld([gate]),
    readWorld:h.reads,
    commitWorld:()=>{throw new Error('Reloaded encounter should not write');},
    encounterFor:()=>({id:'EN_SOURCE',mapId:'A00'}),
    onEncounter:()=>{throw new Error('Reload must not restart the battle');}
  });
  assert.equal(reloaded.tick(g),false,'Resume same-zone detection does not retrigger encounter');
});
test('Ghost Signal hidden=false is visible; hidden object suppresses visual detection',()=>{
  const h=harness([gate],{encounterFor:()=>({id:'EN_SOURCE',mapId:'A00'})});
  const g=player();
  g.player.hidden=false;
  g.drones=[{state:'chase',vis:true}];
  assert.equal(h.runtime.tick(g),true,'A visibly detected non-hidden player enters combat');
  assert.equal(h.fights.length,1);
  g.player.hidden={id:'locker'};
  const h2=harness([gate],{encounterFor:()=>({id:'EN_SOURCE',mapId:'A00'})});
  assert.equal(h2.runtime.tick(g),true,'The hidden player can still enter the zone');
  assert.equal(h2.fights.length,0,'Hiding must prevent visual detection consequences');
});
test('Wrong map or unapproved private battle downgrades to saved alarm',()=>{
  for(const encounterFor of [()=>null,()=>({id:'EN_SOURCE',mapId:'A01'}),
    ()=>({id:'OTHER_ENCOUNTER',mapId:'A00'})]){
    const h=harness([gate],{encounterFor}),g=player();
    g.drones=[{state:'chase',vis:true}];
    assert.equal(h.runtime.tick(g),true);
    assert.equal(h.reads().security.consequence,'alarm');
    assert.equal(h.reads().security.alert,true);
    assert.equal(h.fights.length,0);
    assert.equal(h.alarms.length,1);
    assert.equal(h.runtime.tick(g),false,'Do not flood journal with the same alarm');
  }
});
test('Failed journal write suppresses alert and encounter, then permits safe retry',()=>{
  let blocked=true;
  const h=harness([gate],{failSave:()=>blocked,encounterFor:()=>({id:'EN_SOURCE',mapId:'A00'})});
  const g=player();g.drones=[{state:'chase',vis:true}];
  assert.equal(h.runtime.tick(g),false);
  assert.equal(h.writes.length,0);
  assert.equal(h.fights.length,0);
  assert.equal(h.failures.length,1);
  assert.equal(h.runtime.tick(g),false);
  assert.equal(h.failures.length,1,'Repeated frame retries must not spam save warnings');
  blocked=false;
  assert.equal(h.runtime.tick(g),true);
  assert.equal(h.fights.length,1);
  assert.equal(h.reads().security.consequence,'encounter');
});
test('Leaving and re-entering a zone clears stale alarm without removing progression',()=>{
  const h=harness([{...gate,consequence:'alarm'}]),g=player();
  g.drones=[{state:'chase',vis:true}];
  h.runtime.tick(g);
  assert.equal(h.reads().security.alert,true);
  g.player.x=144;g.player.y=144;g.drones=[{state:'patrol',vis:false}];
  assert.equal(h.runtime.tick(g),true);
  assert.equal(h.reads().security.zoneId,null);
  assert.equal(h.reads().security.alert,false);
  assert.deepEqual(h.reads().party,[{id:'sleeper'}]);
  g.player.x=80;g.player.y=80;
  assert.equal(h.runtime.tick(g),true);
  assert.equal(h.reads().security.mode,'stealth');
  assert.equal(h.reads().security.alert,false);
});
test('Malformed author zone is rejected before field session begins',()=>{
  for(const invalid of [{...gate,id:'__proto__'},
    {...gate,w:1000},{...gate,consequence:'encounter',encounterId:'__proto__'}]){
    assert.throws(()=>createCampaignSecurityRuntime({
      worldSpec:authoredWorld([invalid]),readWorld:()=>({}),commitWorld:()=>true
    }),TypeError);
  }
});

test('Thrown storage failure cannot trigger combat or alert and retries safely',()=>{
  let attempts=0,world={flags:{preserved:true}},failures=0,fights=0,alarms=0;
  const runtime=createCampaignSecurityRuntime({
    worldSpec:authoredWorld([gate]),
    readWorld:()=>structuredClone(world),
    commitWorld:next=>{
      attempts++;
      if(attempts<=2)throw new Error('Synthetic storage quota failure');
      world=structuredClone(next);return true;
    },
    encounterFor:()=>({id:'EN_SOURCE',mapId:'A00'}),
    onEncounter:()=>{fights++;},
    onAlert:()=>{alarms++;},
    onSaveFailure:()=>{failures++;}
  });
  const g=player();g.drones=[{state:'chase',vis:true}];
  assert.equal(runtime.tick(g),false);
  assert.equal(runtime.tick(g),false);
  assert.equal(failures,1,'Repeated exceptions report one storage failure');
  assert.equal(fights,0);
  assert.equal(alarms,0);
  assert.equal(world.security,undefined,'Failed commits leave saved world untouched');
  assert.equal(runtime.tick(g),true);
  assert.equal(fights,1);
  assert.equal(alarms,0);
  assert.equal(world.security.consequence,'encounter');
  assert.deepEqual(world.flags,{preserved:true});
  assert.equal(runtime.tick(g),false);
  assert.equal(fights,1);
});
