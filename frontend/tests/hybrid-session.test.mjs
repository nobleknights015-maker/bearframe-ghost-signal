import test from 'node:test';
import assert from 'node:assert/strict';
import {createHybridSession,moveHybrid,detectHybrid,actHybrid} from '../public/js/engine/hybrid-session.js';
import {enemyDecision} from '../public/js/engine/rpg-combat.js';
const starter=()=>({ location:{mapId:'ruin',x:4,y:4,facing:'right'},
 party:[{id:'sleeper',hp:30,maxHp:30,ep:10,maxEp:10,attack:12,defense:4,speed:10}],
 inventory:{'repair-kit':1},equipment:{sleeper:{weapon:'old'}},quests:{vault:'open'},progression:{xp:1},
 stealth:{alert:0},flags:{seen:true} });
const area={zones:[{id:'security',mode:'stealth',rect:{x:32,y:32,width:64,height:64},onDetection:'encounter'}]};
const encounter=()=>({id:'guard',enemies:[{id:'drone',hp:10,maxHp:10,attack:7,defense:2,speed:4}],rewards:{xp:5,items:{scrap:1}}});
test('safe map defaults to normal; crossing boundary announces stealth',()=>{
 const start=createHybridSession(starter(),area);
 assert.equal(start.security.mode,'normal');
 const inside=moveHybrid(start,{mapId:'ruin',x:40,y:40,facing:'up'});
 assert.equal(inside.security.mode,'stealth'); assert.equal(inside.event.type,'security.boundary');
 assert.equal(start.exploration.location.x,4);
 assert.throws(()=>moveHybrid(inside,{mapId:'alien',x:40,y:40}),TypeError);
});
test('full battle handoff returns at same location, with rewards and preserved stealth state',()=>{
 let state=moveHybrid(createHybridSession(starter(),area),{mapId:'ruin',x:40,y:40,facing:'down'});
 state=detectHybrid(state,encounter()); assert.equal(state.phase,'battle');
 state=actHybrid(state,{actor:'party:sleeper',type:'attack',target:'enemy:drone'});
 assert.equal(state.phase,'exploration'); assert.equal(state.event.outcome,'victory');
 assert.deepEqual(state.exploration.location,{mapId:'ruin',x:40,y:40,facing:'down'});
 assert.equal(state.exploration.progression.xp,6); assert.equal(state.exploration.inventory.scrap,1);
 assert.deepEqual(state.exploration.flags,{seen:true}); assert.deepEqual(state.exploration.stealth,{alert:0});
 assert.equal(state.security.mode,'stealth');
});
test('non-battle detection stays in stealth and uses authored response',()=>{
 const p={zones:[{id:'halls',mode:'stealth',rect:{x:0,y:0,width:50,height:50},onDetection:'chase'}]};
 const s=detectHybrid(createHybridSession(starter(),p));
 assert.equal(s.phase,'exploration'); assert.equal(s.event.type,'security.chase');
});
test('enemy acts and flee returns to exploration without reward',()=>{
 let s=detectHybrid(createHybridSession({...starter(),location:{mapId:'ruin',x:40,y:40}},area),encounter());
 s=actHybrid(s,{actor:'party:sleeper',type:'guard'});
 s=actHybrid(s,enemyDecision(s.battle));
 s=actHybrid(s,{actor:'party:sleeper',type:'flee'});
 assert.equal(s.event.outcome,'fled'); assert.equal(s.exploration.progression.xp,1);
 assert.equal(s.exploration.location.x,40);
 assert.throws(()=>actHybrid(s,{actor:'party:sleeper',type:'guard'}),TypeError);
});
