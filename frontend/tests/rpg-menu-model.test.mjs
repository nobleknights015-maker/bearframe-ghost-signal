import test from 'node:test';
import assert from 'node:assert/strict';
import {RPG_TABS,rpgMenuModel} from '../public/js/engine/rpg-menu-model.js';
const s={party:[{id:'sleeper',name:'Sleeper',hp:30,maxHp:40,ep:4,maxEp:10,speed:8,attack:11,skills:['pulse']}],inventory:{cell:3},equipment:{sleeper:{weapon:'pistol'}},quests:{vault:'active'},progression:{xp:50}};
test('all approved RPG tabs have safe state-backed content',()=>{
 for(const tab of RPG_TABS){const m=rpgMenuModel(s,tab,{hasSave:true,revision:2,redundant:true});assert.equal(m.tab,tab);assert.ok(m.rows[0].name);}
 assert.match(rpgMenuModel(s,'equipment').rows[0].detail,/PISTOL/i);
 assert.match(rpgMenuModel(s,'status').rows[0].detail,/HP 30\/40/);
 assert.match(rpgMenuModel(s,'save',{hasSave:true,revision:2,redundant:true}).rows[0].detail,/DUAL RECORD VERIFIED/);
});
test('invalid tabs and absent RPG state fail closed; empty menu gets explicit entry',()=>{
 assert.throws(()=>rpgMenuModel({},'status'),TypeError);
 assert.throws(()=>rpgMenuModel(s,'unapproved'),TypeError);
 assert.equal(rpgMenuModel({...s,inventory:{}},'items').rows[0].name,'NO ENTRIES');
});
