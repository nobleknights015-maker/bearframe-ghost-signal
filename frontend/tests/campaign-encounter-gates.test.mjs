import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignEncounterGates} from '../public/js/engine/campaign-encounter-gates.js';
import {createCampaignJournal} from '../public/js/engine/campaign-journal.js';

const baseContent=()=>({
  schemaVersion:1,revision:2,
  flagSchema:{gameplay_flags:['scene_one','scene_two'],exclusive_enums:{},relationships:{}},
  scenes:[{id:'SC_01',trigger:'OPEN',dialogue:[],sets:'scene_one'},
    {id:'SC_02',trigger:'FOLLOW',dialogue:[],sets:'scene_two'}],
  dialogue:[],choices:[],insertions:[],
  encounters:[{id:'EN_A'},{id:'EN_B'},{id:'EN_C'}]
});
const makeMap=()=>({
  id:'A00',name:'Synthetic test area',width:8,height:7,
  orientation:'orthogonal',tilewidth:32,tileheight:32,
  start:{x:80,y:112,dir:'right'},layers:[
    {type:'tilelayer',name:'collision',data:Array.from({length:56},(_,i)=>
      i<8||i>=48||i%8===0||i%8===7?1:0)},
    {type:'objectgroup',name:'portals',objects:[]}
  ],entities:[],triggers:[]
});
const world=()=>({
 schemaVersion:1,status:'authored-blockout-review-candidate',
 campaignRevision:2,layoutDigest:'synthetic-gates-1',startArea:'A00',maps:[makeMap()],
 mandatoryCombats:[
   {sceneId:'SC_01',encounterId:'EN_A',saveOutcomeRequired:'victory'},
   {sceneId:'SC_01',encounterId:'EN_B',saveOutcomeRequired:'victory'},
   {sceneId:'SC_02',encounterId:'EN_C',saveOutcomeRequired:'victory'}
 ]
});
const db=()=>{const m=new Map();return {
  getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)
};};
test('Ordered gates refuse scene completion until EVERY authored victory is saved',()=>{
 const gates=compileCampaignEncounterGates(world(),baseContent());
 const progress={encounters:{}};
 assert.deepEqual(gates.ordered.map(g=>g.encounterId),['EN_A','EN_B','EN_C']);
 assert.equal(gates.canComplete('SC_01',progress),false);
 assert.equal(gates.pendingForScene('SC_01',progress).encounterId,'EN_A');
 assert.equal(gates.canComplete('SC_02',progress),false);
 assert.equal(gates.canComplete('unrelated',progress),true);
 progress.encounters.EN_A={outcome:'victory'};
 progress.encounters.EN_B={outcome:'fled'};
 assert.equal(gates.pendingForScene('SC_01',progress).encounterId,'EN_B');
 assert.equal(gates.canComplete('SC_01',progress),false);
 progress.encounters.EN_B={outcome:'victory'};
 assert.equal(gates.canComplete('SC_01',progress),true);
 assert.equal(gates.canComplete('SC_02',progress),false);
 assert.equal(gates.pendingForScene('SC_02',progress).encounterId,'EN_C');
 assert.equal(gates.forScene('SC_01').length,2);
});
test('Legacy one-encounter world remains byte-schema compatible',()=>{
 const old=world();delete old.mandatoryCombats;
 old.mandatoryCombat={sceneId:'SC_01',encounterId:'EN_A',saveOutcomeRequired:'victory'};
 const gates=compileCampaignEncounterGates(old,baseContent());
 assert.equal(gates.ordered.length,1);
 assert.equal(gates.pendingForScene('SC_01',{}).encounterId,'EN_A');
 assert.equal(gates.canComplete('SC_02',{}),true);
 assert.equal(compileCampaignEncounterGates({...old,mandatoryCombat:undefined},baseContent()).ordered.length,0);
});
test('Rejects contradictory, repeated, missing or non-victory gates instead of guessing',()=>{
 const c=baseContent(),w=world();
 assert.throws(()=>compileCampaignEncounterGates({...w,mandatoryCombat:w.mandatoryCombats[0]},c),/either legacy/);
 for(const bad of [
  [{sceneId:'MISSING',encounterId:'EN_A',saveOutcomeRequired:'victory'}],
  [{sceneId:'SC_01',encounterId:'UNLISTED',saveOutcomeRequired:'victory'}],
  [{sceneId:'SC_01',encounterId:'EN_A',saveOutcomeRequired:'fled'}],
  [w.mandatoryCombats[0],w.mandatoryCombats[0]],
  [null]
 ])assert.throws(()=>compileCampaignEncounterGates({...w,mandatoryCombats:bad},c),/invalid/);
 assert.throws(()=>compileCampaignEncounterGates({...w,mandatoryCombats:{}},c),/bounded/);
});
test('Corruption-resistant journal saves ordered gate outcomes, continues and rejects duplicates',()=>{
 const data=db(),spec=world(),content=baseContent();
 const make=()=>createCampaignJournal({storage:data,starterId:'sleeper_A',worldSpec:spec,content,
   bootstrap:{party:[{id:'sleeper',artId:'sleeper_A'}]}});
 const first=make();assert.equal(first.newGame(),true);
 assert.equal(first.pendingCombat('SC_01').encounterId,'EN_A');
 assert.equal(first.setEncounterOutcome('EN_A','victory'),true);
 assert.equal(first.canComplete('SC_01'),false);
 const second=make();assert.equal(second.load(),true);
 assert.equal(second.pendingCombat('SC_01').encounterId,'EN_B');
 assert.equal(second.setEncounterOutcome('EN_A','victory'),true);
 assert.equal(second.setEncounterOutcome('EN_A','fled'),false);
 assert.equal(second.setEncounterOutcome('EN_B','defeat'),true);
 assert.equal(second.canComplete('SC_01'),false);
 // A failed/defeated result cannot silently convert into a victory in the
 // public test helper. Real gameplay retry runs a new staged battle transaction.
 assert.equal(second.setEncounterOutcome('EN_B','victory'),false);
 assert.equal(second.setEncounterOutcome('EN_C','victory'),true);
 assert.equal(second.canComplete('SC_02'),true);
 assert.equal(second.canComplete('SC_01'),false);
});
