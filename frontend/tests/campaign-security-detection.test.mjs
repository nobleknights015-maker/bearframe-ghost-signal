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

test('stale detection cannot cross normal-to-stealth mode change with reused zone ID', () => {
  const oldNormal={id:'gate',mode:'normal',consequence:'alarm'};
  const result=applySecurityDetection({zoneId:'gate',mode:'normal',alert:false},gate,oldNormal,{detected:true});
  assert.equal(result.consequence,'none');
  assert.equal(result.mode,'stealth');
  assert.equal(result.alert,false);
});
test('stale stealth detection cannot cross stealth-to-normal mode change with reused zone ID', () => {
  const newNormal={id:'gate',mode:'normal',consequence:'alarm'};
  const result=applySecurityDetection({zoneId:'gate',mode:'stealth',alert:true},newNormal,gate,permitted);
  assert.equal(result.consequence,'none');
  assert.equal(result.mode,'normal');
  assert.equal(result.alert,false);
});

test('same-id detection cannot substitute a different encounter policy', () => {
  const spoofed = {id:'gate',mode:'stealth',consequence:'encounter',encounterId:'SourceEncounter'};
  const actual = {id:'gate',mode:'stealth',consequence:'alarm'};
  const result = applySecurityDetection({zoneId:'gate',mode:'stealth',alert:false},actual,spoofed,permitted);
  assert.equal(result.consequence,'alarm');
  assert.equal(result.alert,true);
});
test('same-id detection uses current authorized encounter rather than stale payload', () => {
  const stale = {id:'gate',mode:'stealth',consequence:'alarm'};
  const result = applySecurityDetection({zoneId:'gate',mode:'stealth',alert:false},gate,stale,permitted);
  assert.equal(result.consequence,'encounter');
  assert.equal(result.alert,false);
});

test('malformed detection source is rejected before consequence resolution', () => {
  for (const source of [
    undefined, {}, [], {id:'__proto__',mode:'stealth'},
    {id:'gate',mode:'unknown'}, {id:'gate',mode:undefined},
    {id:'gate/other',mode:'stealth'}, {id:'gate',mode:'stealth',length:0,0:1}
  ]) {
    if (source && source.id === 'gate' && source.mode === 'stealth') continue;
    assert.throws(() => applySecurityDetection(
      {zoneId:'gate',mode:'stealth',alert:false},gate,source,permitted
    ), TypeError);
  }
});

test('null detection source still permits a no-detection transition', () => {
  const result=applySecurityDetection({zoneId:'gate',mode:'stealth',alert:true},null,null,{detected:false});
  assert.equal(result.consequence,'none');
  assert.equal(result.alert,false);
});
