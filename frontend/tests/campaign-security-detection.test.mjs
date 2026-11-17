import test from 'node:test';
import assert from 'node:assert/strict';
import {applySecurityDetection} from '../public/js/engine/campaign-security-detection.mjs';

const gate = {id:'gate',mode:'stealth',consequence:'encounter',encounterId:'SourceEncounter'};
const vault = {id:'vault',mode:'stealth',consequence:'alarm'};
const permitted = {detected:true,encounterEnabled:true,authorizedEncounterIds:new Set(['SourceEncounter'])};

test('same-zone authorized detection enters encounter', () => {
  const result=applySecurityDetection({zoneId:'gate',mode:'stealth',alert:false},gate,gate,permitted);
  assert.equal(result.consequence,'encounter');
  assert.equal(result.zoneId,'gate');
});
test('delayed encounter from old zone cannot enter battle in new zone', () => {
  const result=applySecurityDetection({zoneId:'gate',mode:'stealth',alert:true},vault,gate,permitted);
  assert.equal(result.consequence,'none');
  assert.equal(result.alert,false);
  assert.equal(result.zoneId,'vault');
});
test('delayed alarm after exiting stealth is ignored', () => {
  const result=applySecurityDetection({zoneId:'vault',mode:'stealth',alert:true},null,vault,{detected:true});
  assert.equal(result.consequence,'none');
  assert.equal(result.alert,false);
});
test('unapproved encounter remains an alarm', () => {
  const result=applySecurityDetection({zoneId:'gate',mode:'stealth',alert:false},gate,gate,{detected:true,encounterEnabled:true,authorizedEncounterIds:new Set()});
  assert.equal(result.consequence,'alarm');
});
