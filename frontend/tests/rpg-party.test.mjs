import test from 'node:test';
import assert from 'node:assert/strict';
import {createParty,setActiveParty,addItem,equipItem,rewardXp,battleParty} from '../public/js/engine/rpg-party.js';
const members=[{id:'sleeper',hp:30,maxHp:30,ep:10,maxEp:10,attack:10,defense:3,speed:9,level:1,xp:0},{id:'echo',hp:20,maxHp:20,attack:7,defense:2,speed:6,level:1,xp:0}];
const create=()=>createParty({members,active:['sleeper'],inventory:{pistol:1,blade:1}});
const catalog={pistol:{slot:'weapon',attack:4},blade:{slot:'weapon',attack:8}};
test('equipment inventory is conserved across swaps and modifies battle stats',()=>{
 const a=create(),b=equipItem(a,'sleeper','weapon','pistol',catalog),c=addItem(b,'blade',1);
 assert.equal(b.inventory.pistol,undefined); assert.equal(a.inventory.pistol,1);
 assert.equal(battleParty(b,catalog)[0].attack,14);
 const d=equipItem(c,'sleeper','weapon','blade',catalog);
 assert.equal(d.inventory.pistol,1); assert.equal(d.inventory.blade,1);
 assert.equal(battleParty(d,catalog)[0].attack,18);
});
test('active party rotation, experience and immutable operations',()=>{
 const a=create(),b=setActiveParty(a,['sleeper','echo']),c=rewardXp(b,90);
 assert.equal(c.members[0].level,3); assert.equal(c.members[1].level,3);
 assert.equal(a.members[0].level,1); assert.equal(battleParty(c).length,2);
});
test('prevents invented gear, invalid members, duplicate roster, and item underflow',()=>{
 const a=create(); assert.throws(()=>equipItem(a,'echo','weapon','unknown',catalog),TypeError);
 assert.throws(()=>setActiveParty(a,['sleeper','sleeper']),TypeError);
 assert.throws(()=>addItem(a,'pistol',-2),TypeError);
 assert.throws(()=>createParty({members:[members[0],members[0]],active:['sleeper']}),TypeError);
});
