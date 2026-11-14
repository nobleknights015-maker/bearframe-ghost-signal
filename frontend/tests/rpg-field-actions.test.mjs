import test from 'node:test';
import assert from 'node:assert/strict';
import {useFieldConsumable,FIELD_CONSUMABLES} from '../public/js/engine/rpg-field-actions.js';

const field=()=>({
  location:{mapId:'rpg-lab',x:176,y:288,facing:'right'},
  party:[{id:'sleeper',hp:14,maxHp:38},{id:'echo',hp:29,maxHp:29}],
  inventory:{'repair-kit':2},equipment:{},quests:{},progression:{xp:0}
});
test('consumable heals chosen wounded party member and changes one item on a copied state',()=>{
 const source=field(),newState=useFieldConsumable(source,'repair-kit','sleeper');
 assert.equal(newState.healed,20);
 assert.equal(newState.exploration.party[0].hp,34);
 assert.equal(newState.exploration.party[1].hp,29);
 assert.equal(newState.exploration.inventory['repair-kit'],1);
 assert.equal(source.party[0].hp,14);
 assert.equal(source.inventory['repair-kit'],2);
 assert.ok(FIELD_CONSUMABLES['repair-kit'].heal===20);
});
test('cannot waste or duplicate consumables; invalid choices preserve state',()=>{
 const source=field(),before=JSON.stringify(source);
 for(const [item,recipient] of [['repair-kit','echo'],['repair-kit','missing'],
 ['scrap','sleeper'],['repair-kit','sleeper-x']]){
   assert.throws(()=>useFieldConsumable(source,item,recipient),TypeError);
   assert.equal(JSON.stringify(source),before);
 }
 source.inventory['repair-kit']=0;
 assert.throws(()=>useFieldConsumable(source,'repair-kit','sleeper'),TypeError);
 source.inventory['repair-kit']=1;source.party[0].hp=0;
 assert.throws(()=>useFieldConsumable(source,'repair-kit','sleeper'),TypeError);
});
test('healing clamps to max HP rather than wasting overflow',()=>{
 const s=field();s.party[0].hp=36;
 const result=useFieldConsumable(s,'repair-kit','sleeper');
 assert.equal(result.healed,2);
 assert.equal(result.exploration.party[0].hp,38);
});
