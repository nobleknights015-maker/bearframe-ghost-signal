import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnectedFieldTravel} from '../public/js/engine/connected-field-travel.js';
const clone=x=>structuredClone(x);
function fixture(){
 const graph={get:id=>['staging','annex'].includes(id)?{}:null,destination:(id,p)=>{
  assert.equal(p,id==='staging'?'east-gate':'west-gate');
  return id==='staging'?{mapId:'annex',x:80,y:80,facing:'left'}:{mapId:'staging',x:48,y:48,facing:'right'};
 }};
 const missions={staging:{id:'staging'},annex:{id:'annex'}};
 let journal={mapId:'staging',maps:{}},writes=0,failWrite=false,failLoad=false,blocked=false;
 const game={m:missions.staging,mode:'play',player:{x:48,y:48,dir:'right',moving:false},
  snapshot(){return {mission:this.m.id,player:clone(this.player),flags:{collected:this.m.id==='staging'}};},
  start(m,snap){this.m=m;this.mode='play';this.player=clone(snap?.player??{x:16,y:16,dir:'down'});},
  free(){return !blocked;}};
 const travel=createConnectedFieldTravel({game,graph,
  missionFor:async id=>{if(failLoad)throw Error('load failed');return missions[id];},
  readJournal:()=>clone(journal),writeJournal:j=>{writes++;if(failWrite)return false;journal=clone(j);return true;}});
 return {game,travel,get journal(){return journal;},get writes(){return writes;},
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
  assert.deepEqual(f.journal,{mapId:'staging',maps:{}});
  assert.equal(f.travel.busy,false);
 });
}
test('no transition while another modal owns the field',async()=>{
 const f=fixture();f.game.mode='dialog';
 assert.equal(await f.travel.transition('east-gate'),false);
 assert.equal(f.writes,0);
});
