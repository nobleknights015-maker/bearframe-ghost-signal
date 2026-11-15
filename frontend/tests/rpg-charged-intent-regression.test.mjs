import test from 'node:test';
import assert from 'node:assert/strict';
import {startBattle,currentCombatant,enemyDecision,enemyForecast,combatAction} from '../public/js/engine/rpg-combat.js';

const party=()=>[
  {id:'sleeper',name:'Sleeper',hp:38,maxHp:38,ep:10,maxEp:10,attack:11,defense:4,speed:12,skills:['pulse','guard']},
  {id:'echo',name:'Echo',hp:29,maxHp:29,ep:10,maxEp:10,attack:7,defense:2,speed:7,skills:['repair','guard']}
];
const enemy=()=>[{id:'sentry',name:'Old Sentry',hp:42,maxHp:42,attack:9,defense:4,speed:9,tactics:'charged-strike'}];
const act=(s,actor,type,extra={})=>combatAction(s,{actor,type,...extra});

test('authored charge: pulse disrupts locked strike, consumes EP and exposes fallback intent',()=>{
  let s=startBattle({party:party(),enemies:enemy(),rewards:{xp:12,items:{'ancient-scrap':1}}});
  assert.equal(currentCombatant(s),'party:sleeper');
  s=act(s,'party:sleeper','guard');
  assert.equal(enemyForecast(s).kind,'charge');
  s=combatAction(s,enemyDecision(s));
  assert.equal(s.enemies[0].chargeTarget,'party:sleeper');
  assert.equal(s.party[0].hp,38,'wind-up must not inflict damage');
  assert.equal(enemyForecast(s).kind,'overload');
  s=act(s,'party:echo','guard');
  assert.equal(currentCombatant(s),'party:sleeper');
  s=act(s,'party:sleeper','pulse',{target:'enemy:sentry'});
  assert.equal(s.party[0].ep,5);
  assert.equal(s.enemies[0].chargeTarget,null);
  assert.equal(s.enemies[0].disrupted,true);
  assert.equal(enemyForecast(s).kind,'attack');
  assert.equal(enemyDecision(s).type,'attack','disrupted enemy cannot deliver heavy strike');
  assert.throws(()=>act(s,'enemy:sentry','overload',{target:'party:sleeper'}),/No charged strike/);
  const before=s.party[0].hp;
  s=combatAction(s,enemyDecision(s));
  assert.ok(s.party[0].hp<before);
  assert.equal(s.enemies[0].chargeTarget,null);
  assert.equal(s.enemies[0].disrupted,false,'normal attack resets the charge cycle');
  assert.equal(s.status,'active');
});

test('charged enemy cannot forge heavy strike before completing wind-up',()=>{
  let s=startBattle({party:party(),enemies:enemy()});
  s=act(s,'party:sleeper','guard');
  assert.equal(currentCombatant(s),'enemy:sentry');
  assert.throws(()=>act(s,'enemy:sentry','overload',{target:'party:sleeper'}),/No charged strike/);
  assert.equal(enemyDecision(s).type,'charge');
  assert.equal(s.enemies[0].chargeTarget,null,'rejected command leaves immutable state unchanged');
});
