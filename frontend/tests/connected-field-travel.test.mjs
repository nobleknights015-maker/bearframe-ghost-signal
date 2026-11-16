import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnectedFieldTravel} from '../public/js/engine/connected-field-travel.js';
const clone=x=>structuredClone(x);
function fixture({requiresFlag,requiresNotFlag,flags={}}={}){
 const graph={get:id=>['staging','annex'].includes(id)?{}:null,destination:(id,p)=>{
  assert.equal(p,id==='staging'?'east-gate':'west-gate');
  return id==='staging'?{mapId:'annex',x:80,y:80,facing:'left',...(requiresFlag?{requiresFlag}:{}),...(requiresNotFlag?{requiresNotFlag}:{})}:{mapId:'staging',x:48,y:48,facing:'right'};
 }};
 const missions={staging:{id:'staging'},annex:{id:'annex'}};
 let journal={mapId:'staging',maps:{},world:{flags}},writes=0,legacyWrites=0,failWrite=false,failLoad=false,blocked=false;
 const game={store:{save:()=>{legacyWrites++;return true;}},m:missions.staging,mode:'play',snap:{mission:'staging',player:{x:32,y:48,dir:'up'}},player:{x:48,y:48,dir:'right',moving:false},
  snapshot(){return {mission:this.m.id,player:clone(this.player),flags:{collected:this.m.id==='staging'}};},
  start(m,snap){this.m=m;this.mode='play';this.player=clone(snap?.player??{x:16,y:16,dir:'down'});if(!snap)this.store.save(this.snapshot());},
  free(){return !blocked;}};
 const travel=createConnectedFieldTravel({game,graph,
  missionFor:async id=>{if(failLoad)throw Error('load failed');return missions[id];},
  readJournal:()=>clone(journal),writeJournal:j=>{writes++;if(failWrite)return false;journal=clone(j);return true;}});
 return {game,travel,get journal(){return journal;},get writes(){return writes;},get legacyWrites(){return legacyWrites;},
  failWrite:()=>failWrite=true,failLoad:()=>failLoad=true,block:()=>blocked=true};
}
test('bidirectional field travel saves source and destination in one journal write',async()=>{
 const f=fixture();
 assert.equal(await f.travel.transition('east-gate'),true);
 assert.equal(f.game.m.id,'annex');assert.equal(f.game.player.x,80);
 assert.equal(f.journal.maps.staging.player.x,48);
 assert.equal(f.journal.maps.annex.player.x,80);
 assert.equal(await f.travel.transition('west-gate'),true);
 assert.equal(f.journal.mapId,'staging');assert.equal(f.game.player.dir,'right');
 assert.equal(f.writes,2);
});
for(const failure of ['failWrite','failLoad','block']){
 test('field and journal roll back on '+failure,async()=>{
  const f=fixture();f[failure]();
  await assert.rejects(f.travel.transition('east-gate'));
  assert.equal(f.game.m.id,'staging');
  assert.deepEqual(f.game.player,{x:48,y:48,dir:'right',moving:false});
  assert.deepEqual(f.journal,{mapId:'staging',maps:{},world:{flags:{}}});
  assert.equal(f.travel.busy,false);
 });
}
test('no transition while another modal owns the field',async()=>{
 const f=fixture();f.game.mode='dialog';
 assert.equal(await f.travel.transition('east-gate'),false);
 assert.equal(f.writes,0);
});

test('connected travel never overwrites the original Ghost Signal mission save, even on rollback',async()=>{
 const f=fixture();const originalStore=f.game.store;
 await f.travel.transition('east-gate');
 assert.equal(f.legacyWrites,0);assert.equal(f.game.store,originalStore);
 f.failWrite();
 await assert.rejects(f.travel.transition('west-gate'));
 assert.equal(f.legacyWrites,0);assert.equal(f.game.store,originalStore);
});

test('arrival checkpoint matches portal spawn and rollback retains source checkpoint',async()=>{
 const f=fixture();const sourceCheckpoint=clone(f.game.snap);
 await f.travel.transition('east-gate');
 assert.equal(f.game.snap.mission,'annex');
 assert.equal(f.game.snap.player.x,80);
 assert.equal(f.game.snap.player.y,80);
 const arrivalCheckpoint=clone(f.game.snap);
 f.failWrite();
 await assert.rejects(f.travel.transition('west-gate'));
 assert.deepEqual(f.game.snap,arrivalCheckpoint);
 assert.notDeepEqual(f.game.snap,sourceCheckpoint);
});

test('locked conditional door leaves player, journal and legacy saves untouched',async()=>{
 const f=fixture({requiresFlag:'relay-online'});
 const before=clone(f.game.player);
 assert.equal(await f.travel.transition('east-gate'),false);
 assert.deepEqual(f.game.player,before);
 assert.equal(f.game.m.id,'staging');
 assert.equal(f.writes,0);assert.equal(f.legacyWrites,0);
 assert.equal(f.travel.busy,false);
});
test('conditional door opens only for explicit true durable flag',async()=>{
 const f=fixture({requiresFlag:'relay-online',flags:{'relay-online':true}});
 assert.equal(await f.travel.transition('east-gate'),true);
 assert.equal(f.game.m.id,'annex');assert.equal(f.writes,1);
});

test('inverse gate stays open until a durable flag becomes explicitly true',async()=>{
 const open=fixture({requiresNotFlag:'bridge-collapsed',flags:{'bridge-collapsed':false}});
 assert.equal(await open.travel.transition('east-gate'),true);
 const closed=fixture({requiresNotFlag:'bridge-collapsed',flags:{'bridge-collapsed':true}});
 assert.equal(await closed.travel.transition('east-gate'),false);
 assert.equal(closed.writes,0);assert.equal(closed.legacyWrites,0);
});
