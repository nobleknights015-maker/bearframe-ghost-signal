// Public synthetic regression only: no owner story, maps, art, or saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

const collision=Array.from({length:64},(_,i)=>i<8||i>=56||i%8===0||i%8===7?1:0);
const worldSpec={schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
 id:'A00',name:'Synthetic Storage Failure',width:8,height:8,orientation:'orthogonal',
 tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
 layers:[{type:'tilelayer',name:'collision',data:collision},
 {type:'objectgroup',name:'portals',objects:[]}],entities:[],triggers:[],
 security:{defaultMode:'normal',zones:[{id:'secure',x:64,y:64,w:64,h:64,
 mode:'stealth',consequence:'encounter',encounterId:'SYNTHETIC_ONLY'}]}
}]};

test('thrown persistence prevents battle and preserves durable party state until retry',()=>{
 let world={party:[{id:'A'}],inventory:{cell:3},flags:{quest:true}};
 let throwNext=false,failures=0,writes=0;
 const fights=[];
 const runtime=createCampaignSecurityRuntime({
  worldSpec,readWorld:()=>structuredClone(world),
  commitWorld:next=>{
   writes++;
   if(throwNext){throwNext=false;throw new Error('synthetic storage quota');}
   world=structuredClone(next);return true;
  },
  encounterFor:(id,mapId)=>({id,mapId}),
  onEncounter:(id,mapId)=>fights.push([id,mapId]),
  onSaveFailure:()=>failures++
 });
 const game={mode:'play',m:{id:'A00'},player:{x:80,y:80,hidden:true},
 drones:[{state:'chase',vis:true}]};
 assert.equal(runtime.tick(game),true);
 assert.equal(world.security.alert,false);
 game.player.hidden=false;
 throwNext=true;
 assert.equal(runtime.tick(game),false,'storage exception must fail closed');
 assert.equal(failures,1);
 assert.deepEqual(fights,[]);
 assert.equal(world.security.alert,false,'failed write must not advance durable security');
 assert.deepEqual(world.party,[{id:'A'}]);
 assert.deepEqual(world.inventory,{cell:3});
 assert.deepEqual(world.flags,{quest:true});
 assert.equal(runtime.tick(game),true,'retry after recovery must persist');
 assert.deepEqual(fights,[['SYNTHETIC_ONLY','A00']]);
 assert.equal(runtime.tick(game),false,'no duplicate encounter after recovery');
 assert.equal(writes,3);
 assert.equal(failures,1);
});
