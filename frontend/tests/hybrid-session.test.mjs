import test from 'node:test';
import assert from 'node:assert/strict';
import {createHybridSession,moveHybrid,detectHybrid,actHybrid,setHybridActiveParty,beginHybridEncounter} from '../public/js/engine/hybrid-session.js';
import {enemyDecision,currentCombatant} from '../public/js/engine/rpg-combat.js';
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


test('equipped stats and authored skills enter live battle without changing base saved stats',()=>{
 const world=starter();world.party[0].lineage='sleeper';world.party[0].skills=['pulse','guard'];
 world.equipment.sleeper.weapon='old-blade';
 const catalog={'old-blade':{slot:'weapon',attack:4,allowedLineages:['sleeper']}};
 const s=createHybridSession({...world,location:{mapId:'ruin',x:40,y:40}},area);
 const battle=detectHybrid(s,{...encounter(),gearCatalog:catalog,
  enemies:[{id:'drone',hp:50,maxHp:50,attack:7,defense:2,speed:4}]});
 assert.equal(battle.phase,'battle');
 assert.equal(battle.battle.party[0].attack,16);
 assert.deepEqual(battle.battle.party[0].skills,['pulse','guard']);
 assert.equal(s.exploration.party[0].attack,12,'Equip must not mutate persisted base stats');
 const later=actHybrid(battle,{actor:'party:sleeper',type:'flee'});
 assert.equal(later.exploration.party[0].attack,12);
 assert.equal(later.exploration.equipment.sleeper.weapon,'old-blade');
});

const campaign=()=>{
 const s=starter();s.location={mapId:'ruin',x:40,y:40};
 s.party=Array.from({length:4},(_,i)=>({...s.party[0],id:'unit'+i,name:'Unit '+i}));
 s.party[3]={...s.party[3],hp:7,ep:3,tag:{preserve:true}};
 s.activeParty=['unit2','unit0','unit1'];
 return s;
};
test('campaign activates three in selected order, merges results and preserves reserve exactly',()=>{
 const world=campaign(),reserve=JSON.stringify(world.party[3]);
 let s=detectHybrid(createHybridSession(world,area),encounter());
 assert.deepEqual(s.battle.party.map(p=>p.id),['unit2','unit0','unit1']);
 assert.throws(()=>actHybrid(s,{actor:'party:unit3',type:'attack',target:'enemy:drone'}),TypeError);
 s=actHybrid(s,{actor:'party:unit2',type:'attack',target:'enemy:drone'});
 assert.equal(s.event.outcome,'victory');
 assert.equal(JSON.stringify(s.exploration.party[3]),reserve,'Reserve HP/EP and metadata remain byte-for-byte data-equivalent');
 assert.deepEqual(s.exploration.party.map(p=>p.id),world.party.map(p=>p.id),'Roster order never changes');
 assert.deepEqual(s.exploration.activeParty,world.activeParty);
 assert.equal(s.exploration.inventory.scrap,1);
 assert.equal(s.exploration.progression.xp,6);
 const settled=JSON.stringify(s);
 assert.throws(()=>actHybrid(s,{actor:'party:unit2',type:'attack',target:'enemy:drone'}),TypeError);
 assert.equal(JSON.stringify(s),settled,'Completed session cannot issue rewards twice');
});
test('campaign validates lineup atomically, swaps in exploration and applies gear only to active units',()=>{
 const world=campaign();world.equipment.unit3={weapon:'old'};
 for(const activeParty of [[],['unknown'],['unit0','unit0','unit1'],['unit0','unit1','unit2','unit3'],['unit0','unit1']])
  assert.throws(()=>createHybridSession({...world,activeParty},area),TypeError);
 const s=createHybridSession(world,area);
 const rotated=setHybridActiveParty(s,['unit3','unit0','unit1']);
 assert.deepEqual(rotated.exploration.party,s.exploration.party);
 assert.deepEqual(s.exploration.activeParty,['unit2','unit0','unit1']);
 assert.throws(()=>setHybridActiveParty(s,undefined),TypeError);
 const gearCatalog={old:{slot:'weapon',attack:4}};
 const b=detectHybrid(rotated,{...encounter(),gearCatalog});
 assert.deepEqual(b.battle.party.map(p=>p.id),['unit3','unit0','unit1']);
 assert.equal(b.battle.party[0].hp,7);
 assert.equal(b.battle.party[0].ep,3);
 assert.equal(b.battle.party[0].attack,16);
 assert.equal(rotated.exploration.party[3].attack,12,'Gear only modifies derived battle stats');
 assert.throws(()=>setHybridActiveParty(b,['unit0','unit1','unit2']),TypeError);
 const result=actHybrid(b,{actor:'party:unit3',type:'flee'});
 assert.equal(result.event.outcome,'fled');
 assert.deepEqual(result.exploration.party[2],world.party[2]);
 assert.equal(result.exploration.progression.xp,1);
 assert.equal(result.exploration.inventory.scrap,undefined);
});

test('campaign defeat patches active damage while reserve remains outside the encounter',()=>{
 const world=campaign();
 for(const member of world.party.slice(0,3)){member.hp=1;member.defense=0;}
 const reserve=world.party[3];
 let s=detectHybrid(createHybridSession(world,area),{...encounter(),
  enemies:[{id:'drone',hp:1000,maxHp:1000,attack:100,defense:20,speed:100}]});
 let turns=0;
 while(s.phase==='battle'&&turns++<40){
  const actor=currentCombatant(s.battle);
  s=actHybrid(s,actor.startsWith('enemy:')?enemyDecision(s.battle):{actor,type:'guard'});
 }
 assert.equal(s.event.outcome,'defeat');
 assert.ok(s.exploration.party.slice(0,3).every(member=>member.hp===0));
 assert.deepEqual(s.exploration.party[3],reserve);
 assert.equal(s.exploration.progression.xp,1);
 assert.equal(s.exploration.inventory.scrap,undefined);
});

test('authored normal-area encounters use the real handoff while stealth detection stays gated',()=>{
 const original=createHybridSession(starter());
 assert.equal(original.security.mode,'normal');
 assert.throws(()=>detectHybrid(original,encounter()),/active stealth/);
 let s=beginHybridEncounter(original,encounter());
 assert.equal(s.phase,'battle');
 assert.equal(s.event.encounterId,'guard');
 assert.throws(()=>beginHybridEncounter(s,encounter()),/requires exploration/);
 assert.equal(original.phase,'exploration','Entry leaves its previous checkpoint immutable');
 s=actHybrid(s,{actor:'party:sleeper',type:'attack',target:'enemy:drone'});
 assert.equal(s.event.outcome,'victory');
 assert.equal(s.security.mode,'normal');
 assert.deepEqual(s.exploration.location,original.exploration.location);
 assert.deepEqual(s.exploration.flags,original.exploration.flags);
 assert.equal(s.exploration.progression.xp,6);
 assert.equal(s.exploration.inventory.scrap,1);
 assert.throws(()=>actHybrid(s,{actor:'party:sleeper',type:'attack',target:'enemy:drone'}),TypeError);
 for(const bad of [null,{}, {id:'empty',enemies:[]}])
  assert.throws(()=>beginHybridEncounter(original,bad),TypeError);
});
test('normal authored entry retains campaign lineup and reserve through victory and flee',()=>{
 const world=campaign();world.location={mapId:'ruin',x:4,y:4,facing:'right'};
 const original=createHybridSession(world,area);
 assert.equal(original.security.mode,'normal');
 let battle=beginHybridEncounter(original,encounter());
 assert.deepEqual(battle.battle.party.map(member=>member.id),world.activeParty);
 const won=actHybrid(battle,{actor:'party:unit2',type:'attack',target:'enemy:drone'});
 assert.deepEqual(won.exploration.party[3],world.party[3]);
 assert.deepEqual(won.exploration.activeParty,world.activeParty);
 assert.equal(won.security.mode,'normal');
 battle=beginHybridEncounter(original,encounter());
 const fled=actHybrid(battle,{actor:'party:unit2',type:'flee'});
 assert.equal(fled.event.outcome,'fled');
 assert.deepEqual(fled.exploration.party,world.party);
 assert.deepEqual(fled.exploration.activeParty,world.activeParty);
 assert.equal(fled.exploration.inventory.scrap,undefined);
 assert.equal(fled.exploration.progression.xp,1);
});
