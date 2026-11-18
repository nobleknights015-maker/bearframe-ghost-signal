import test from 'node:test';
import assert from 'node:assert/strict';
import {stageEncounter,activateEncounter,acknowledgeEncounter,recoveryAction} from '../public/js/engine/encounter-dispatch-protocol.mjs';
const token='A00:zone:EN1:1';
const base=()=>({party:[{id:'A',hp:12}],inventory:{scrap:2},quests:{intro:true}});
const roundtrip=s=>JSON.parse(JSON.stringify(s));
test('crash before staging leaves original progression and no phantom battle',()=>{
 const s=base();assert.equal(recoveryAction(roundtrip(s),token),'none');
 assert.equal(s.encounterDispatch,undefined);
});
test('durable pending journal survives reload and activates once',()=>{
 const s=roundtrip(stageEncounter(base(),token,{enemies:[{id:'E',hp:5}]}));
 assert.equal(recoveryAction(s,token),'activate');
 const active=activateEncounter(s,token);
 assert.equal(recoveryAction(roundtrip(active),token),'resume-battle');
 assert.strictEqual(activateEncounter(active,token),active);
});
test('crash after activation resumes same battle snapshot without redispatch',()=>{
 const s=roundtrip(activateEncounter(stageEncounter(base(),token,{enemies:[{id:'E',hp:5}]}),token));
 assert.deepEqual(s.encounterDispatch[token].battle,{enemies:[{id:'E',hp:5}]});
 assert.equal(recoveryAction(s,token),'resume-battle');
 assert.deepEqual(s.party,base().party);
});
test('completed token stays complete after reload and duplicate acknowledgment',()=>{
 const s=acknowledgeEncounter(activateEncounter(stageEncounter(base(),token,{id:'E'}),token),token);
 const loaded=roundtrip(s);assert.equal(recoveryAction(loaded,token),'none');
 assert.strictEqual(acknowledgeEncounter(loaded,token),loaded);
 assert.strictEqual(stageEncounter(loaded,token,{id:'NEW'}),loaded);
});
test('two tokens remain isolated and preserve other progression fields',()=>{
 const s=stageEncounter(stageEncounter(base(),token,{id:'E'}),'A01:zone:EN2:1',{id:'F'});
 const a=activateEncounter(s,token);
 assert.equal(recoveryAction(a,'A01:zone:EN2:1'),'activate');
 assert.deepEqual(a.inventory,base().inventory);assert.deepEqual(a.quests,base().quests);
});
