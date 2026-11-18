import test from 'node:test';
import assert from 'node:assert/strict';
import {stageEncounter,activateEncounter,acknowledgeEncounter,recoveryAction} from '../public/js/engine/encounter-dispatch-protocol.mjs';
const initial=()=>({party:[{id:'A'}],inventory:{scrap:3},quests:{q1:true}});
const token='A00:zone1:EN_SOURCE:1';
test('stage is idempotent and preserves progression',()=>{
 const s=initial(),p=stageEncounter(s,token,{id:'EN_SOURCE'});
 assert.strictEqual(stageEncounter(p,token,{id:'DIFFERENT'}),p);
 assert.deepEqual(p.party,s.party);assert.deepEqual(p.inventory,s.inventory);assert.deepEqual(p.quests,s.quests);
});
test('pending restart requests activation, not dispatch',()=>{
 const p=structuredClone(stageEncounter(initial(),token,{id:'EN_SOURCE'}));
 assert.equal(recoveryAction(p,token),'activate');
});
test('active restart resumes durable battle, never dispatches new one',()=>{
 const a=structuredClone(activateEncounter(stageEncounter(initial(),token,{id:'EN_SOURCE'}),token));
 assert.equal(recoveryAction(a,token),'resume-battle');assert.strictEqual(activateEncounter(a,token),a);
});
test('completed encounters never reactivate',()=>{
 const c=acknowledgeEncounter(activateEncounter(stageEncounter(initial(),token,{id:'EN_SOURCE'}),token),token);
 assert.equal(recoveryAction(structuredClone(c),token),'none');assert.strictEqual(activateEncounter(c,token),c);
});
test('unrecognized and prototype keys rejected',()=>{
 assert.throws(()=>stageEncounter(initial(),'__proto__',{}),TypeError);
 assert.equal(recoveryAction(initial(),'absent'),'none');
});
test('caller state and battle inputs are not mutated',()=>{
 const s=initial(),battle={id:'EN_SOURCE',enemies:[{hp:7}]};
 const p=stageEncounter(s,token,battle);battle.enemies[0].hp=0;
 assert.equal(p.encounterDispatch[token].battle.enemies[0].hp,7);
 assert.equal(s.encounterDispatch,undefined);
});
