import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignCombatStaging} from '../public/js/engine/campaign-combat-staging.js';
import {createCampaignJournal} from '../public/js/engine/campaign-journal.js';
import {createHybridSession,beginHybridEncounter,actHybrid} from '../public/js/engine/hybrid-session.js';
import {currentCombatant,enemyDecision} from '../public/js/engine/rpg-combat.js';

const empty=()=>{const kv=new Map();return {kv,getItem:k=>kv.get(k)||null,
  setItem(k,v){kv.set(k,v);},removeItem:k=>kv.delete(k)};};
const animation=Object.fromEntries(['idle','attack','ranged','cast','guard','hit','down','victory','charge']
  .map((name,row)=>[name,{row,frames:1,durationsMs:[90],loop:name==='idle'}]));
const manifest={schema:'aeon.asset-library.v4',characters:['sleeper_A','sleeper_B','sleeper_C','sleeper_D','synthetic_foe']
  .map(id=>({id,battle:{src:'assets/battlers/'+id+'.png',frameWidth:64,frameHeight:64,
    columns:6,rows:9,animations:animation}}))};
const actor=id=>({id:'sleeper',artId:id,lineage:'sleeper',name:'Synthetic Sleeper',hp:30,maxHp:30,
  ep:10,maxEp:10,attack:24,defense:4,speed:20,skills:['pulse','guard']});
const foe=()=>({id:'test_foe',artId:'synthetic_foe',name:'Synthetic Hostile',hp:14,maxHp:14,
  ep:0,maxEp:0,attack:2,defense:1,speed:4});
const map=()=>({id:'A00',name:'Synthetic area',width:8,height:7,orientation:'orthogonal',
  tilewidth:32,tileheight:32,start:{x:80,y:112,dir:'right'},layers:[
    {type:'tilelayer',name:'collision',data:Array.from({length:56},(_,i)=>
      i<8||i>=48||i%8===0||i%8===7?1:0)},
    {type:'objectgroup',name:'portals',objects:[]}],entities:[],triggers:[]});
const content=()=>({schemaVersion:1,revision:2,flagSchema:{gameplay_flags:['complete','boss_done'],exclusive_enums:{},relationships:{}},
  scenes:[{id:'SC-008',trigger:'TRIAL',dialogue:[],sets:'complete'}],dialogue:[],insertions:[],choices:[],
  encounters:[{id:'EN-005',kind:'boss',area:'A00',set_flag:'boss_done'}]});
const worldSpec=()=>({schemaVersion:1,status:'authored-blockout-review-candidate',
  campaignRevision:2,layoutDigest:'synthetic-v2',startArea:'A00',maps:[map()],
  mandatoryCombat:{sceneId:'SC-008',encounterId:'EN-005',saveOutcomeRequired:'victory'}});
const stage=(world=worldSpec())=>({schemaVersion:1,campaignRevision:2,layoutDigest:world.layoutDigest,
  partyByStarter:Object.fromEntries(['sleeper_A','sleeper_B','sleeper_C','sleeper_D'].map(id=>[id,[actor(id)]])),
  encounters:[{id:'EN-005',mapId:'A00',trigger:'START_TRIAL',enemies:[foe()],
    rewards:{xp:12,items:{ancient_scrap:1}},canFlee:true}]});
const create=(storage,starter='sleeper_A')=>{
  const contentData=content(),worldData=worldSpec();
  const compiler=compileCampaignCombatStaging(stage(worldData),
    {worldSpec:worldData,content:contentData,manifest});
  const journal=createCampaignJournal({storage,starterId:starter,content:contentData,worldSpec:worldData,
    bootstrap:{party:compiler.roster(starter),inventory:{},progression:{xp:0}}});
  return {journal,compiler};
};
const snapshot=()=>({mission:'A00',player:{x:80,y:112,dir:'right'}});
const battle=(j,spec)=>{
  const world=j.readWorld(),session=createHybridSession(world,{defaultMode:'normal',zones:[]});
  return beginHybridEncounter(session,{...spec,canFlee:true});
};
test('Source-approved roster, exact encounter IDs and art bindings reject invented enemies',()=>{
  const w=worldSpec(),c=content();
  const compiled=compileCampaignCombatStaging(stage(w),{worldSpec:w,content:c,manifest});
  assert.equal(compiled.roster('sleeper_D')[0].artId,'sleeper_D');
  assert.equal(compiled.triggered('A00','START_TRIAL').id,'EN-005');
  assert.equal(compiled.triggered('A01','START_TRIAL'),null);
  const art=compiled.artFor(manifest,'sleeper_D',[actor('sleeper_D')],compiled.encounter('EN-005'));
  assert.equal(art['party:sleeper'].frameWidth,64);
  assert.ok(art['enemy:test_foe']);
  const bad=stage(w);bad.encounters[0].id='UNREVIEWED';
  assert.throws(()=>compileCampaignCombatStaging(bad,{worldSpec:w,content:c,manifest}),/unknown or duplicate/);
  const wrong=stage(w);wrong.partyByStarter.sleeper_A[0].artId='sleeper_B';
  assert.throws(()=>compileCampaignCombatStaging(wrong,{worldSpec:w,content:c,manifest}),/selected portrait/);
  const missing=stage(w);delete missing.encounters[0].id;
  assert.throws(()=>compileCampaignCombatStaging(missing,{worldSpec:w,content:c,manifest}));
  const puzzle=content();puzzle.encounters[0].kind='puzzle';
  assert.throws(()=>compileCampaignCombatStaging(stage(w),{worldSpec:w,content:puzzle,manifest}),
    /not a turn-based battle/,'Authored puzzles must never be converted into combat');
  const wrongArea=content();wrongArea.encounters[0].area='A03';
  assert.throws(()=>compileCampaignCombatStaging(stage(w),{worldSpec:w,content:wrongArea,manifest}),
    /belongs to another area/,'No source encounter may migrate to another planet region');
  const undeclared=content();undeclared.encounters[0].set_flag='unapproved_milestone';
  assert.throws(()=>compileCampaignCombatStaging(stage(w),{worldSpec:w,content:undeclared,manifest}),
    /victory flag is not declared/,'No invented story flags');
});
test('Durable battle starts, survives reload, saves result and awards exactly once',()=>{
  const store=empty(),{journal:j,compiler}=create(store);
  assert.equal(j.newGame(),true);
  const spec=compiler.encounter('EN-005'),initial=battle(j,spec),field=snapshot();
  assert.equal(j.beginBattle(spec.id,initial,field),true);
  assert.equal(j.saveField('A00',field),false,'Field saves cannot overwrite an unfinished battle');
  const story=j.readWorld();story.flags.complete=true;
  assert.equal(j.commitWorld(story),false,'Narrative writes cannot jump around active combat');
  const {journal:loaded}=create(store);assert.equal(loaded.load(),true);
  assert.equal(loaded.readJournal().battle.session.battle.round,1);
  assert.equal(loaded.readJournal().battle.encounterId,'EN-005');
  const first=actHybrid(loaded.readJournal().battle.session,{
    actor:'party:sleeper',type:'guard'
  });
  assert.equal(first.phase,'battle');
  assert.equal(loaded.stepBattle(first),true);
  const reloaded=create(store).journal;assert.equal(reloaded.load(),true);
  assert.deepEqual(reloaded.readJournal().battle.session.battle,first.battle);
  let current=first;
  while(current.phase==='battle'&&currentCombatant(current.battle)?.startsWith('enemy:'))
    current=actHybrid(current,enemyDecision(current.battle));
  assert.equal(current.phase,'battle');
  current=actHybrid(current,{actor:'party:sleeper',type:'attack',target:'enemy:test_foe'});
  assert.equal(current.phase,'exploration');
  assert.equal(current.event.outcome,'victory');
  assert.equal(reloaded.finishBattle(current),true);
  assert.equal(reloaded.readJournal().battle,undefined);
  assert.equal(reloaded.readWorld().progression.xp,12);
  assert.equal(reloaded.readWorld().inventory.ancient_scrap,1);
  assert.equal(reloaded.readWorld().flags.boss_done,true,
    'Winning the exact source boss sets its authored victory flag atomically');
  assert.equal(reloaded.canComplete('SC-008'),true);
  assert.equal(reloaded.beginBattle(spec.id,initial,field),false,'No duplicate victory rewards');
  const final=create(store).journal;assert.equal(final.load(),true);
  assert.equal(final.readWorld().encounters['EN-005'].outcome,'victory');
  assert.equal(final.readWorld().inventory.ancient_scrap,1);
  assert.equal(final.readWorld().flags.boss_done,true,
    'A loaded victory retains its authored quest milestone');
});
test('Failed battle write keeps previous battle and rewards exactly zero until retry',()=>{
  const store=empty(),{journal:j,compiler}=create(store);j.newGame();
  const old=battle(j,compiler.encounter('EN-005'));
  j.beginBattle('EN-005',old,snapshot());
  let resolved=actHybrid(old,{actor:'party:sleeper',type:'attack',target:'enemy:test_foe'});
  assert.equal(resolved.phase,'exploration');
  const set=store.setItem;store.setItem=()=>{throw new Error('quota');};
  assert.equal(j.finishBattle(resolved),false);
  assert.equal(j.readJournal().battle.session.phase,'battle');
  assert.equal(j.readWorld().inventory.ancient_scrap,undefined);
  assert.equal(j.readWorld().flags.boss_done,false,
    'A failed battle save must preserve the declared false boss milestone');
  store.setItem=set;
  assert.equal(j.finishBattle(resolved),true);
  assert.equal(j.finishBattle(resolved),false);
  assert.equal(j.readWorld().inventory.ancient_scrap,1);
  assert.equal(j.readWorld().flags.boss_done,true);
});
