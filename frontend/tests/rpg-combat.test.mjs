import test from 'node:test';
import assert from 'node:assert/strict';
import {startBattle,currentCombatant,combatAction,enemyDecision,enemyForecast,battleResultPatch} from '../public/js/engine/rpg-combat.js';
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


test('authored party skill catalogs are enforced by the battle rules, not just by button visibility',()=>{
 const config=units();
 config.party=[
   {...config.party[0],skills:['pulse','guard']},
   {id:'echo',name:'Echo',hp:20,maxHp:20,ep:10,maxEp:10,attack:7,defense:2,speed:8,skills:['repair','guard']}
 ];
 let s=startBattle(config);
 assert.throws(()=>combatAction(s,{actor:'party:sleeper',type:'repair',target:'party:sleeper'}),/Ability unavailable/);
 assert.deepEqual(currentCombatant(s),'party:sleeper');
 s=combatAction(s,{actor:'party:sleeper',type:'pulse',target:'enemy:drone'});
 assert.equal(currentCombatant(s),'party:echo','Echo acts before the slower enemy');
 assert.throws(()=>combatAction(s,{actor:'party:echo',type:'pulse',target:'enemy:drone'}),/Ability unavailable/);
 assert.equal(s.party.find(u=>u.id==='echo').ep,10,'Rejected skill cannot spend EP');
 s=combatAction(s,{actor:'party:echo',type:'repair',target:'party:sleeper'});
 assert.equal(s.party.find(u=>u.id==='echo').ep,5);
 assert.equal(currentCombatant(s),'enemy:drone');
 s=combatAction(s,enemyDecision(s));
 assert.throws(()=>startBattle({...units(),party:[{...units().party[0],skills:['pulse','pulse']}]}),/Invalid combatant skills/);
 assert.throws(()=>startBattle({...units(),party:[{...units().party[0],skills:['hack-world']}]}),/Invalid combatant skills/);
});


test('authored sentry telegraphs charged damage, allowing targeted guard mitigation',()=>{
 const config=units();
 config.party=[{...config.party[0],id:'sleeper',hp:38,maxHp:38,speed:10,skills:['pulse','guard']},
  {id:'echo',hp:29,maxHp:29,ep:10,maxEp:10,attack:7,defense:2,speed:7,skills:['repair','guard']}];
 config.enemies=[{id:'sentry',name:'Old Sentry',hp:100,maxHp:100,attack:9,defense:4,speed:8,tactics:'charged-strike'}];
 let battle=startBattle(config);
 assert.equal(enemyForecast(battle).kind,'charge');
 battle=combatAction(battle,{actor:'party:sleeper',type:'attack',target:'enemy:sentry'});
 assert.equal(enemyDecision(battle).type,'charge');
 battle=combatAction(battle,enemyDecision(battle));
 assert.equal(battle.enemies[0].chargeTarget,'party:sleeper');
 assert.equal(enemyForecast(battle).kind,'overload');
 assert.match(enemyForecast(battle).text,/SLEEPER.*GUARD OR DISRUPT/);
 assert.equal(battle.party[0].hp,38,'Telegraph turn itself deals no damage');
 battle=combatAction(battle,{actor:'party:echo',type:'guard'});
 battle=combatAction(battle,{actor:'party:sleeper',type:'guard'});
 assert.equal(enemyDecision(battle).type,'overload');
 assert.throws(()=>combatAction(battle,{actor:'enemy:sentry',type:'overload',target:'party:echo'}),/No charged strike/);
 battle=combatAction(battle,enemyDecision(battle));
 assert.equal(battle.party[0].hp,29,'Guard must halve the exact 18-point heavy attack to 9');
 assert.equal(battle.enemies[0].chargeTarget,null);
 assert.equal(enemyForecast(battle).kind,'charge','Sentry must telegraph the next heavy attack too');
});
test('Pulse interrupts a visible charge but does not grant a free enemy turn',()=>{
 const config=units();
 config.party=[{...config.party[0],id:'sleeper',hp:38,maxHp:38,speed:10,skills:['pulse','guard']},
  {id:'echo',hp:29,maxHp:29,ep:10,maxEp:10,attack:7,defense:2,speed:7,skills:['repair','guard']}];
 config.enemies=[{id:'sentry',hp:100,maxHp:100,attack:9,defense:4,speed:8,tactics:'charged-strike'}];
 let battle=startBattle(config);
 battle=combatAction(battle,{actor:'party:sleeper',type:'attack',target:'enemy:sentry'});
 battle=combatAction(battle,enemyDecision(battle));
 battle=combatAction(battle,{actor:'party:echo',type:'guard'});
 const original=battle;
 battle=combatAction(battle,{actor:'party:sleeper',type:'pulse',target:'enemy:sentry'});
 assert.equal(battle.party[0].ep,5);
 assert.equal(battle.enemies[0].chargeTarget,null);
 assert.equal(battle.enemies[0].disrupted,true);
 assert.equal(enemyForecast(battle).kind,'attack');
 assert.match(battle.log.at(-1),/CHARGE DISRUPTED/);
 assert.equal(original.enemies[0].chargeTarget,'party:sleeper','Battle transitions cannot mutate earlier snapshots');
 assert.equal(enemyDecision(battle).type,'attack');
 battle=combatAction(battle,enemyDecision(battle));
 assert.equal(battle.enemies[0].disrupted,false);
 assert.equal(battle.party[0].hp,31,'Disrupted attack remains a normal threat with a meaningful consequence');
});
test('authored enemy tactics reject invalid and forged player charge actions',()=>{
 const config=units();
 assert.throws(()=>startBattle({...config,enemies:[{...config.enemies[0],tactics:'infinite-win'}]}),/Invalid enemy combat tactics/);
 assert.throws(()=>startBattle({...config,party:[{...config.party[0],tactics:'charged-strike'}]}),/Invalid enemy combat tactics/);
 const battle=startBattle(config);
 assert.throws(()=>combatAction(battle,{actor:'party:sleeper',type:'charge',target:'enemy:drone'}),/Charge action unavailable/);
 assert.throws(()=>combatAction(battle,{actor:'party:sleeper',type:'overload',target:'enemy:drone'}),/No charged strike/);
});
