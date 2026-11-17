import test from 'node:test';
import assert from 'node:assert/strict';
import {compileSecurityZones,securityAt,resolveDetection} from '../public/js/engine/campaign-security-policy.mjs';
test('normal field never triggers battle and boundary is exact',()=>{
 const z=compileSecurityZones([{id:'normal',x:0,y:0,w:32,h:32,mode:'normal'}],6,6);
 assert.equal(securityAt(z,31,31)?.id,'normal');assert.equal(securityAt(z,32,31),null);
 assert.deepEqual(resolveDetection(z[0],{detected:true,encounterEnabled:true}),{kind:'none'});
});
test('overlapping zones use explicit priority and preserve input',()=>{
 const input=[{id:'wide',x:0,y:0,w:96,h:96,mode:'normal'},{id:'ruin',x:32,y:32,w:32,h:32,mode:'stealth',priority:2,consequence:'chase'}];
 const z=compileSecurityZones(input,6,6);assert.equal(securityAt(z,40,40)?.id,'ruin');assert.equal(input[0].priority,undefined);
});
test('optional encounter cannot start without opt-in',()=>{
 const z=compileSecurityZones([{id:'gate',x:0,y:0,w:32,h:32,mode:'stealth',consequence:'encounter',encounterId:'SourceEncounter'}],6,6)[0];
 assert.deepEqual(resolveDetection(z,{detected:true}),{kind:'alarm'});
 assert.deepEqual(resolveDetection(z,{detected:true,encounterEnabled:true}),{kind:'alarm'});
 assert.deepEqual(resolveDetection(z,{detected:true,encounterEnabled:true,authorizedEncounterIds:new Set(['WrongEncounter'])}),{kind:'alarm'});
 assert.deepEqual(resolveDetection(z,{detected:true,encounterEnabled:false,authorizedEncounterIds:new Set(['SourceEncounter'])}),{kind:'alarm'});
 assert.deepEqual(resolveDetection(z,{detected:true,encounterEnabled:true,authorizedEncounterIds:new Set(['SourceEncounter'])}),{kind:'encounter',encounterId:'SourceEncounter'});
});
test('reject malformed bounds, identifiers and forced unsourced battle',()=>{
 for(const bad of [{id:'__proto__',x:0,y:0,w:32,h:32,mode:'stealth'},{id:'z',x:190,y:0,w:32,h:32,mode:'normal'},{id:'z',x:0,y:0,w:32,h:32,mode:'stealth',consequence:'encounter'}]) assert.throws(()=>compileSecurityZones([bad],6,6));
});

test('malformed runtime zone cannot force encounter or unknown consequence',()=>{
 assert.deepEqual(resolveDetection({mode:'stealth',consequence:'encounter',encounterId:'__proto__'}, {detected:true,encounterEnabled:true,authorizedEncounterIds:new Set(['__proto__'])}),{kind:'alarm'});
 assert.deepEqual(resolveDetection({mode:'stealth',consequence:'unknown'}, {detected:true}),{kind:'alarm'});
});
