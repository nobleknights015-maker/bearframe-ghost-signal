// Synthetic-only release regression. Never load private campaign data in public CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

const collision=Array.from({length:64},(_,i)=>i<8||i>=56||i%8===0||i%8===7?1:0);
const worldSpec={schemaVersion:1,campaignRevision:1,startArea:'A00',maps:['A00','A01'].map(id=>({
  id,name:id,width:8,height:8,orientation:'orthogonal',tilewidth:32,tileheight:32,
  start:{x:80,y:80,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:collision},{type:'objectgroup',name:'portals',objects:[]}],
  entities:[],triggers:[],security:{defaultMode:'normal',zones:[{
    id:'shared_zone',x:64,y:64,w:64,h:64,mode:'stealth',
    consequence:'encounter',encounterId:'SOURCE_ENCOUNTER'
  }]}
}))};

test('same zone name on another map cannot authorize a battle from the previous map',()=>{
  let world={party:[{id:'A'}],inventory:{key:1},flags:{quest:true}};
  const fights=[],writes=[];
  const runtime=createCampaignSecurityRuntime({
    worldSpec,readWorld:()=>structuredClone(world),
    commitWorld:next=>{writes.push(structuredClone(next));world=structuredClone(next);return true;},
    encounterFor:(id,mapId)=>mapId==='A00'?{id,mapId}:null,
    onEncounter:(id,mapId)=>fights.push([id,mapId])
  });
  const game={mode:'play',m:{id:'A00'},player:{x:80,y:80,hidden:false},
    drones:[{state:'chase',vis:true}]};
  assert.equal(runtime.tick(game),true);
  assert.deepEqual(fights,[['SOURCE_ENCOUNTER','A00']]);
  game.m={id:'A01'};
  assert.equal(runtime.tick(game),true);
  assert.equal(world.security.mapId,'A01');
  assert.notEqual(world.security.consequence,'encounter');
  assert.deepEqual(fights,[['SOURCE_ENCOUNTER','A00']]);
  assert.equal(runtime.tick(game),false);
  assert.deepEqual(world.party,[{id:'A'}]);
  assert.deepEqual(world.inventory,{key:1});
  assert.deepEqual(world.flags,{quest:true});
  assert.equal(writes.length,2);
});
