import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignQuestJournal} from '../public/js/engine/campaign-quest-journal.js';
import {rpgMenuModel} from '../public/js/engine/rpg-menu-model.js';

const story=()=>({schemaVersion:1,revision:1,flagSchema:{
  gameplay_flags:['relay_found','relay_ready','relay_repaired','vault_open','vault_cleared'],
  exclusive_enums:{},relationships:{}},
  quests:[
    {id:'quest_relay',title:'Recover the relay',player_objective:'Restore an authorized circuit',
      start_trigger:'relay_found',completion_flags:'relay_repaired'},
    {id:'quest_vault',title:'Locate the vault',player_objective:'Investigate the sealed chamber',
      start_trigger:'reach-vault;unknown requirement',completion_flags:'vault_cleared'}
  ]});
test('Source-authored flag events reveal a quest only when started, never ahead of story',()=>{
 const source=story(),q=compileCampaignQuestJournal(source,{});
 assert.equal(q.sourceCount,2);
 assert.equal(q.stagedCount,1,'Ambiguous requirements must not be guessed');
 const flags={relay_found:false,relay_repaired:false};
 assert.deepEqual(q.project(flags),{});
 flags.relay_found=true;
 assert.deepEqual(q.project(flags),{'Recover the relay':'ACTIVE — Restore an authorized circuit'});
 flags.relay_repaired=true;
 assert.deepEqual(q.project(flags),{'Recover the relay':'COMPLETE — Restore an authorized circuit'});
 assert.equal(source.quests[0].player_objective,'Restore an authorized circuit');
});

test('Owner-reviewed private flag bindings stage ambiguous source quests without inventing flags',()=>{
 const source=story(),spec={questBindings:[{
   questId:'quest_vault',startFlag:'vault_open',completeFlag:'vault_cleared'
 }]};
 const q=compileCampaignQuestJournal(source,spec);
 assert.equal(q.stagedCount,2);
 assert.deepEqual(q.project({vault_open:true}),{
   'Locate the vault':'ACTIVE — Investigate the sealed chamber'
 });
 assert.deepEqual(q.project({vault_cleared:true}),{
   'Locate the vault':'COMPLETE — Investigate the sealed chamber'
 });
 const before={flags:{vault_open:true},inventory:{core:3},party:[{id:'sleeper'}],
   quests:{'Personal field record':'ongoing'}};
 const derived={...q.project(before.flags),...before.quests};
 const model=rpgMenuModel({...before,quests:derived},'quests');
 assert.equal(model.rows.length,2);
 assert.deepEqual(before.quests,{'Personal field record':'ongoing'},
   'Rendering quest titles cannot overwrite durable save data');
});

test('Bindings fail closed on unknown quests, missing or unapproved source flags, and duplicates',()=>{
 for(const binding of [
   {questId:'quest_missing',startFlag:'vault_open',completeFlag:'vault_cleared'},
   {questId:'quest_vault',startFlag:'__proto__',completeFlag:'vault_cleared'},
   {questId:'quest_vault',startFlag:'unapproved_flag',completeFlag:'vault_cleared'},
   {questId:'quest_vault',startFlag:''},
   {questId:'quest_vault'}
 ])assert.throws(()=>compileCampaignQuestJournal(story(),{questBindings:[binding]}),TypeError);
 const b={questId:'quest_vault',startFlag:'vault_open',completeFlag:'vault_cleared'};
 assert.throws(()=>compileCampaignQuestJournal(story(),{questBindings:[b,b]}),/duplicate/);
});

test('Legacy story-only campaign and invalid flags cannot leak future quests',()=>{
 const s=story();delete s.quests;
 const empty=compileCampaignQuestJournal(s,{});
 assert.equal(empty.sourceCount,0);
 assert.deepEqual(empty.project({relay_found:true}),{});
 assert.deepEqual(compileCampaignQuestJournal(story(),{}).project(null),{});
 const invalid=story();invalid.flagSchema.gameplay_flags.push('__proto__');
 assert.throws(()=>compileCampaignQuestJournal(invalid,{}),TypeError);
});
