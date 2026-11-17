// Public synthetic Issue #1 regression. Intentionally red until durable dispatch recovery exists.
// No private source, art, map geometry, or original Ghost Signal save keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSecurityRuntime} from '../public/js/engine/campaign-security-runtime.js';

const collision=Array.from({length:64},(_,i)=>i<8||i>=56||i%8===0||i%8===7?1:0);
const worldSpec={schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
  id:'A00',name:'Synthetic Restart Recovery',width:8,height:8,orientation:'orthogonal',
  tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:collision},
    {type:'objectgroup',name:'portals',objects:[]}],
  entities:[],triggers:[],security:{defaultMode:'normal',zones:[{
    id:'secure',x:64,y:64,w:64,h:64,mode:'stealth',
    consequence:'encounter',encounterId:'SYNTHETIC_RESTART_ONLY'
  }]}
}]};
const game={mode:'play',m:{id:'A00'},player:{x:80,y:80,hidden:false},
  drones:[{state:'chase',vis:true}]};

test('persisted alert is recoverable after encounter callback throws and runtime restarts',()=>{
  let durable={party:[{id:'A'}],inventory:{cell:3},flags:{quest:true}};
  let attempts=0;
  const adapters={
    worldSpec,
    readWorld:()=>structuredClone(durable),
    commitWorld:next=>{durable=structuredClone(next);return true;},
    encounterFor:(id,mapId)=>({id,mapId}),
    onEncounter:()=>{attempts++;if(attempts===1)throw Error('synthetic dispatch failure');}
  };
  const first=createCampaignSecurityRuntime(adapters);
  assert.throws(()=>first.tick(game),/synthetic dispatch failure/);
  assert.equal(durable.security.alert,true,'alert was committed before dispatch');
  assert.equal(attempts,1);
  const restarted=createCampaignSecurityRuntime(adapters);
  assert.equal(restarted.tick(game),true,'restart must resume pending encounter dispatch');
  assert.equal(attempts,2,'pending encounter must be retried once');
  assert.equal(restarted.tick(game),false,'acknowledged encounter must not repeat');
  assert.equal(attempts,2);
  assert.deepEqual(durable.party,[{id:'A'}]);
  assert.deepEqual(durable.inventory,{cell:3});
  assert.deepEqual(durable.flags,{quest:true});
});
