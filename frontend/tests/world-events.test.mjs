import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWorldEvent,CONNECTED_LAB_EVENTS} from '../public/js/engine/world-events.js';
const initial=()=>({flags:{},events:{},inventory:{'repair-kit':1},quests:{expedition:'unstarted'}});
test('live expedition relay and cache are authored, immutable, once-only events',()=>{
 const before=initial();
 const activated=resolveWorldEvent(before,CONNECTED_LAB_EVENTS['power-switch']);
 assert.equal(activated.applied,true);
 assert.equal(activated.world.flags['power-switch'],true);
 assert.equal(activated.world.quests.expedition,'power-restored');
 assert.equal(before.events['power-switch'],undefined,'Source must remain untouched');
 const collected=resolveWorldEvent(activated.world,CONNECTED_LAB_EVENTS['supply-cache']);
 assert.equal(collected.world.inventory['repair-kit'],2);
 assert.equal(collected.world.events['supply-cache'],true);
 assert.equal(collected.world.quests.expedition,'supply-recovered');
 const repeat=resolveWorldEvent(collected.world,CONNECTED_LAB_EVENTS['supply-cache']);
 assert.equal(repeat.applied,false);assert.equal(repeat.reason,'already-completed');
 assert.deepEqual(repeat.world,collected.world);
});
test('conditions gate actions without changing world or consuming inventory',()=>{
 const before=initial(),required={id:'locked-hatch',conditions:[{type:'flagEquals',id:'power-switch',value:true},{type:'hasItem',id:'repair-kit',count:2}],
   effects:[{type:'setFlag',id:'opened-hatch',value:true}]};
 const result=resolveWorldEvent(before,required);
 assert.equal(result.applied,false);assert.equal(result.reason,'prerequisite');
 assert.deepEqual(before,initial());
 let after=resolveWorldEvent(before,CONNECTED_LAB_EVENTS['power-switch']).world;
 assert.equal(resolveWorldEvent(after,required).applied,false);
 after=resolveWorldEvent(after,CONNECTED_LAB_EVENTS['supply-cache']).world;
 const opened=resolveWorldEvent(after,required);
 assert.equal(opened.applied,true);assert.equal(opened.world.flags['opened-hatch'],true);
});
test('unknown effects and malformed authorship fail atomically without touching progress',()=>{
 const before=initial();
 for(const effect of [
   {type:'run-script',code:'window.location="bad"'},
   {type:'addItem',id:'repair-kit',count:-1},
   {type:'setQuest',id:'expedition',stage:'??'},
   {type:'setFlag',id:'bad flag',value:true}
 ]){
  assert.throws(()=>resolveWorldEvent(before,{id:'bad-event',conditions:[],effects:[
   {type:'addItem',id:'repair-kit',count:1},effect
  ]}),TypeError);
  assert.deepEqual(before,initial());
 }
 assert.throws(()=>resolveWorldEvent(before,{id:'bad-event',conditions:[{type:'eval',expression:'true'}],effects:[]}),TypeError);
 assert.deepEqual(before,initial());
});
