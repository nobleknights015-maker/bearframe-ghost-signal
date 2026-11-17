// Synthetic release regression only. No private campaign source or artwork.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

const collision=Array.from({length:64},(_,i)=>i<8||i>=56||i%8===0||i%8===7?1:0);
const worldSpec={schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
  id:'A00',name:'Synthetic Test',width:8,height:8,orientation:'orthogonal',
  tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:collision},
    {type:'objectgroup',name:'portals',objects:[]}],
  entities:[],triggers:[],security:{defaultMode:'normal',zones:[{
    id:'security_room',x:64,y:64,w:64,h:64,mode:'stealth',
    consequence:'encounter',encounterId:'TEST_ENCOUNTER'
  }]}
}]};

test('hiding suppresses encounter and failed persistence cannot dispatch combat',()=>{
  let world={party:[{id:'A'}],inventory:{key:2},flags:{opened:true}};
  let rejectNext=false,saveFailures=0,commits=0;
  const encounters=[];
  const runtime=createCampaignSecurityRuntime({
    worldSpec,readWorld:()=>structuredClone(world),
    commitWorld:next=>{
      commits++;
      if(rejectNext){rejectNext=false;return false;}
      world=structuredClone(next);return true;
    },
    encounterFor:(id,mapId)=>({id,mapId}),
    onEncounter:(id,mapId)=>encounters.push([id,mapId]),
    onSaveFailure:()=>saveFailures++
  });
  const game={mode:'play',m:{id:'A00'},
    player:{x:80,y:80,hidden:true},
    drones:[{state:'chase',vis:true}]};
  assert.equal(runtime.tick(game),true,'entering authored zone persists non-alert state');
  assert.equal(world.security.alert,false);
  assert.deepEqual(encounters,[]);
  game.player.hidden=false;
  rejectNext=true;
  assert.equal(runtime.tick(game),false,'rejected journal write blocks encounter');
  assert.deepEqual(encounters,[]);
  assert.equal(world.security.alert,false,'rejected write must not mutate durable world');
  assert.equal(saveFailures,1);
  assert.equal(runtime.tick(game),true,'safe retry persists before encounter');
  assert.deepEqual(encounters,[['TEST_ENCOUNTER','A00']]);
  assert.equal(runtime.tick(game),false,'repeat detection must not double-dispatch');
  assert.equal(saveFailures,1);
  assert.equal(commits,3);
  assert.deepEqual(world.party,[{id:'A'}]);
  assert.deepEqual(world.inventory,{key:2});
  assert.deepEqual(world.flags,{opened:true});
});

test('inactive gameplay cannot dispatch or persist security encounters',()=>{
  let writes=0,fights=0;
  const runtime=createCampaignSecurityRuntime({
    worldSpec,readWorld:()=>({flags:{}}),
    commitWorld:()=>{writes++;return true;},
    encounterFor:(id,mapId)=>({id,mapId}),
    onEncounter:()=>fights++
  });
  const game={mode:'battle',m:{id:'A00'},player:{x:80,y:80,hidden:false},
    drones:[{state:'chase',vis:true}]};
  assert.equal(runtime.tick(game),false);
  assert.equal(writes,0);
  assert.equal(fights,0);
});
