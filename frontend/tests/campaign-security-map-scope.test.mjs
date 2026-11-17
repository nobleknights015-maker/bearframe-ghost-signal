// Public-safe synthetic map-scope regression: no owner campaign assets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

const collision=Array.from({length:64},(_,i)=>i<8||i>=56||i%8===0||i%8===7?1:0);
function spec(){
  return {schemaVersion:1,campaignRevision:1,startArea:'A00',maps:['A00','A01'].map(id=>({
    id,name:id,width:8,height:8,orientation:'orthogonal',tilewidth:32,tileheight:32,
    start:{x:80,y:80,dir:'right'},layers:[
      {type:'tilelayer',name:'collision',data:collision},
      {type:'objectgroup',name:'portals',objects:[]}],
    entities:[],triggers:[],security:{defaultMode:'normal',zones:[{
      id:'shared_zone',x:64,y:64,w:64,h:64,mode:'stealth',
      consequence:'encounter',encounterId:'SOURCE_ENCOUNTER'
    }]}
  }))};
}
test('identical zone IDs across different maps do not reuse a prior encounter or security record',()=>{
  let world={flags:{quest_complete:false},party:[{id:'A'}],inventory:{key:1}};
  const fights=[],writes=[];
  const runtime=createCampaignSecurityRuntime({
    worldSpec:spec(),readWorld:()=>structuredClone(world),
    commitWorld:next=>{writes.push(structuredClone(next));world=structuredClone(next);return true;},
    encounterFor:(id,mapId)=>({id,mapId}),
    onEncounter:(id,mapId)=>fights.push([id,mapId])
  });
  const game={mode:'play',m:{id:'A00'},player:{x:80,y:80,hidden:false},
    drones:[{state:'chase',vis:true}]};
  assert.equal(runtime.tick(game),true);
  assert.deepEqual(fights,[['SOURCE_ENCOUNTER','A00']]);
  assert.equal(runtime.tick(game),false);
  game.m={id:'A01'};
  assert.equal(runtime.tick(game),true,'New map must persist its own security state');
  assert.equal(world.security.mapId,'A01');
  assert.deepEqual(fights,[['SOURCE_ENCOUNTER','A00'],['SOURCE_ENCOUNTER','A01']]);
  assert.equal(runtime.tick(game),false,'Repeated detection must not double-launch');
  assert.equal(writes.length,2);
  assert.deepEqual(world.party,[{id:'A'}]);
  assert.deepEqual(world.inventory,{key:1});
  assert.deepEqual(world.flags,{quest_complete:false});
});
test('normal exploration outside authored security zones never fabricates combat',()=>{
  let world={flags:{untouched:true}},writes=0,fights=0;
  const runtime=createCampaignSecurityRuntime({
    worldSpec:spec(),readWorld:()=>structuredClone(world),
    commitWorld:next=>{writes++;world=next;return true;},
    encounterFor:(id,mapId)=>({id,mapId}),
    onEncounter:()=>fights++
  });
  const game={mode:'play',m:{id:'A00'},player:{x:144,y:144,hidden:false},
    drones:[{state:'chase',vis:true}]};
  assert.equal(runtime.tick(game),false);
  assert.equal(writes,0);
  assert.equal(fights,0);
  assert.equal(world.security,undefined);
});
