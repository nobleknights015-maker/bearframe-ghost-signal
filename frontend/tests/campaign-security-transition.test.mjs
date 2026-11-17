import test from 'node:test';
import assert from 'node:assert/strict';
import {transitionSecurity} from '../public/js/engine/campaign-security-transition.mjs';
const stealth={id:'corridor',mode:'stealth'};
test('crossing normal to stealth and back preserves caller-owned campaign state',()=>{
 const world={x:32,y:64,party:['A','B'],inventory:['key'],questFlags:{relay:true},zoneId:null,alert:false};
 const a=transitionSecurity(world,stealth);
 assert.deepEqual(a,{zoneId:'corridor',mode:'stealth',alert:false,entered:true,consequence:'none'});
 const b=transitionSecurity({...world,...a},null);
 assert.equal(b.mode,'normal');assert.equal(b.alert,false);
 assert.deepEqual(world,{x:32,y:64,party:['A','B'],inventory:['key'],questFlags:{relay:true},zoneId:null,alert:false});
});
test('alarm persists within stealth and clears on exit',()=>{
 const a=transitionSecurity({zoneId:'corridor',alert:false},stealth,{kind:'alarm'});
 assert.equal(a.alert,true);
 assert.equal(transitionSecurity(a,stealth).alert,true);
 assert.equal(transitionSecurity(a,null).alert,false);
});
test('normal regions never emit encounter or alarms',()=>{
 assert.equal(transitionSecurity({alert:true},null,{kind:'encounter'}).consequence,'none');
});
test('rejects invalid state, zones and outcomes',()=>{
 assert.throws(()=>transitionSecurity(null,stealth));
 assert.throws(()=>transitionSecurity({}, {id:'__proto__',mode:'stealth'}));
 assert.throws(()=>transitionSecurity({},stealth,{kind:'battle'}));
});
test('alert does not bleed into a different stealth zone',()=>{
 const a=transitionSecurity({zoneId:'corridor',alert:true},{id:'vault',mode:'stealth'});
 assert.equal(a.alert,false);assert.equal(a.entered,true);
});

test('escape and checkpoint resolve an existing alert in the same stealth zone',()=>{
 for(const kind of ['escape','checkpoint']){
  const result=transitionSecurity({zoneId:'corridor',alert:true},stealth,{kind});
  assert.equal(result.alert,false);
  assert.equal(result.consequence,kind);
  assert.equal(result.entered,false);
 }
});
test('reserved property names cannot become security zone IDs',()=>{
 for(const id of ['constructor','prototype','__proto__']){
  assert.throws(()=>transitionSecurity({}, {id,mode:'stealth'}),TypeError);
 }
});

test('late detection from old zone cannot trigger a battle after crossing a boundary',()=>{
 const vault={id:'vault',mode:'stealth'};
 const old={zoneId:'corridor',mode:'stealth',alert:false};
 const late=transitionSecurity(old,vault,{kind:'encounter',zoneId:'corridor'});
 assert.equal(late.consequence,'none');
 assert.equal(late.alert,false);
 assert.equal(late.zoneId,'vault');
 assert.equal(late.entered,true);
 const current=transitionSecurity(late,vault,{kind:'encounter',zoneId:'vault'});
 assert.equal(current.consequence,'encounter');
});
test('late alarms cannot follow a player into normal exploration',()=>{
 const result=transitionSecurity({zoneId:'corridor',alert:true},null,{kind:'alarm',zoneId:'corridor'});
 assert.equal(result.consequence,'none');
 assert.equal(result.alert,false);
});

test('switching security mode with the same zone id resets stale alert state',()=>{
 const sameIdNormal={id:'corridor',mode:'normal'};
 const normal=transitionSecurity({zoneId:'corridor',mode:'stealth',alert:true},sameIdNormal);
 assert.equal(normal.entered,true);
 assert.equal(normal.alert,false);
 const resumed=transitionSecurity({...normal,alert:true},stealth);
 assert.equal(resumed.entered,true);
 assert.equal(resumed.alert,false);
});
