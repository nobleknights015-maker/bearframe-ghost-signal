import test from 'node:test';
import assert from 'node:assert/strict';
import {startBattle,currentCombatant,combatAction,enemyDecision,battleResultPatch} from '../public/js/engine/rpg-combat.js';
const units=()=>({party:[{id:'sleeper',name:'Sleeper',hp:35,maxHp:40,ep:10,maxEp:10,attack:12,defense:4,speed:11}],enemies:[{id:'drone',hp:30,maxHp:30,attack:7,defense:2,speed:6}],inventory:{'repair-kit':2},rewards:{xp:12,items:{scrap:2}}});
test('initial battle sorts deterministic turns and freezes state',()=>{
 const s=startBattle(units()); assert.equal(currentCombatant(s),'party:sleeper'); assert.ok(Object.isFrozen(s.party[0]));
 assert.throws(()=>startBattle({...units(),enemies:[units().party[0]]}),TypeError);
});
test('attack, AI counterattack, rounds and victory with rewards',()=>{
 let s=startBattle(units()); s=combatAction(s,{actor:'party:sleeper',type:'attack',target:'enemy:drone'});
 assert.equal(s.enemies[0].hp,19); assert.equal(currentCombatant(s),'enemy:drone');
 s=combatAction(s,enemyDecision(s)); assert.equal(s.party[0].hp,30); assert.equal(s.round,2);
 s=combatAction(s,{actor:'party:sleeper',type:'pulse',target:'enemy:drone'});
 assert.equal(s.enemies[0].hp,2); assert.equal(s.party[0].ep,5);
 s=combatAction(s,enemyDecision(s));
 s=combatAction(s,{actor:'party:sleeper',type:'attack',target:'enemy:drone'});
 assert.equal(s.status,'victory'); assert.equal(currentCombatant(s),null);
 const patch=battleResultPatch(s,units().party,{xp:3});
 assert.equal(patch.progression.xp,15); assert.equal(patch.inventory.scrap,2);
 assert.equal(patch.party[0].hp,25);
});
test('items, repair, guarding and skill limits',()=>{
 let s=startBattle(units());
 s=combatAction(s,{actor:'party:sleeper',type:'guard'});
 s=combatAction(s,enemyDecision(s));
 assert.equal(s.party[0].hp,32);
 s=combatAction(s,{actor:'party:sleeper',type:'item',item:'repair-kit',target:'party:sleeper'});
 assert.equal(s.party[0].hp,40); assert.equal(s.inventory['repair-kit'],1);
 assert.throws(()=>combatAction(s,{actor:'enemy:drone',type:'item',target:'enemy:drone',item:'repair-kit'}),TypeError);
});
test('flee does not award loot, invalid target is rejected',()=>{
 let s=startBattle(units());
 assert.throws(()=>combatAction(s,{actor:'party:sleeper',type:'attack',target:'party:sleeper'}),TypeError);
 assert.throws(()=>combatAction(s,{actor:'enemy:drone',type:'attack',target:'party:sleeper'}),TypeError);
 s=combatAction(s,{actor:'party:sleeper',type:'flee'});
 assert.equal(s.status,'fled'); assert.equal(battleResultPatch(s,units().party,{xp:3}).progression.xp,3);
});
test('defeat triggers when all party members have zero HP',()=>{
 let s=startBattle({...units(),party:[{...units().party[0],hp:1,speed:1}],enemies:[{...units().enemies[0],speed:10}]});
 s=combatAction(s,enemyDecision(s)); assert.equal(s.status,'defeat');
});
