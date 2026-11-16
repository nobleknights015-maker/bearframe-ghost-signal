import test from 'node:test';
import assert from 'node:assert/strict';
import {createParty,setActiveParty,addItem,equipItem,rewardXp,battleParty,createCampaignParty,swapPartyReserve} from '../public/js/engine/rpg-party.js';
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


test('Sleeper lineage rejects Echo and modern Foundry gear before consuming inventory',()=>{
 const catalog={
   'old-blade':{slot:'weapon',attack:4,allowedLineages:['sleeper']},
   'echo-link':{slot:'weapon',speed:2,allowedLineages:['echo']},
   'foundry-chip':{slot:'weapon',attack:20,allowedLineages:['modern']}
 };
 const s=createParty({members:[{...members[0],lineage:'sleeper'}, {...members[1],lineage:'echo'}],
  active:['sleeper','echo'],inventory:{'old-blade':1,'echo-link':1,'foundry-chip':1}});
 const original=JSON.stringify(s);
 assert.throws(()=>equipItem(s,'sleeper','weapon','foundry-chip',catalog),/incompatible/);
 assert.throws(()=>equipItem(s,'sleeper','weapon','echo-link',catalog),/incompatible/);
 assert.equal(JSON.stringify(s),original);
 const modernless=equipItem(s,'sleeper','weapon','old-blade',catalog);
 assert.equal(modernless.inventory['old-blade'],undefined);
 assert.equal(battleParty(modernless,catalog)[0].attack,members[0].attack+4);
 const echoReady=equipItem(modernless,'echo','weapon','echo-link',catalog);
 assert.equal(battleParty(echoReady,catalog)[1].speed,members[1].speed+2);
});

test('campaign three-active plus one reserve is explicit while legacy keeps four slots',()=>{
 const roster=Array.from({length:4},(_,i)=>({...members[0],id:'unit'+i}));
 const legacy=createParty({members:roster,active:roster.map(m=>m.id)});
 assert.equal(battleParty(legacy).length,4);
 const campaign=createCampaignParty({members:roster,active:['unit0','unit1','unit2']});
 assert.equal(campaign.mode,'campaign');
 assert.throws(()=>setActiveParty(campaign,['unit0','unit1','unit2','unit3']),TypeError);
 assert.throws(()=>createCampaignParty({members:roster,active:['unit0','unit1']}),TypeError);
 const swap=swapPartyReserve(campaign,'unit1','unit3');
 assert.deepEqual(swap.active,['unit0','unit3','unit2']);
 assert.deepEqual(swap.members,campaign.members);
 assert.deepEqual(campaign.active,['unit0','unit1','unit2']);
 assert.throws(()=>swapPartyReserve(campaign,'unit3','unit0'),TypeError);
 assert.throws(()=>swapPartyReserve(campaign,'unit0','unit1'),TypeError);
 const reward=rewardXp(swap,25);
 assert.equal(reward.members[1].xp,0,'Reserve receives no unapproved XP');
 assert.equal(reward.members[3].xp,25);
});
