import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignJournal} from '../public/js/engine/campaign-journal.js';
const storage=()=>{const kv=new Map();return {kv,getItem:k=>kv.get(k)||null,
  setItem(k,v){kv.set(k,v)},removeItem:k=>kv.delete(k)};};
const map=(id,to,p,reverse)=>({id,name:'PRIVATE-TEST',width:8,height:7,orientation:'orthogonal',tilewidth:32,tileheight:32,
  start:{x:80,y:112,dir:'right'},layers:[
    {type:'tilelayer',name:'collision',data:Array.from({length:56},(_,i)=>i<8||i>=48||i%8===0||i%8===7?1:0)},
    {type:'objectgroup',name:'portals',objects:[{id:1,name:p,x:(id==='A00'?6:1)*32,y:96,width:32,height:32,properties:{toMap:to,toPortal:reverse,facing:'right'}}]}
  ],entities:[],triggers:[]});
const world=()=>({schemaVersion:1,campaignRevision:2,status:'authored-blockout-review-candidate',layoutDigest:'test-layout-sha',startArea:'A00',maps:[map('A00','A01','east','west'),map('A01','A00','west','east')],mandatoryCombat:{sceneId:'SC-008',encounterId:'EN-005',saveOutcomeRequired:'victory'}});
const story=()=>({schemaVersion:1,revision:2,flagSchema:{gameplay_flags:['safe_flag'],exclusive_enums:{},relationships:{}},scenes:[{id:'SC-008',trigger:'ACTIVATE',dialogue:[],sets:''}],dialogue:[],choices:[],insertions:[],encounters:[{id:'EN-005'}]});
const make=(store,id='sleeper_A',boot={})=>createCampaignJournal({storage:store,starterId:id,content:story(),worldSpec:world(),bootstrap:boot});
test('Private campaign durable new game, independent starter identities, and source revision lock',()=>{
 const data=storage(),a=make(data,'sleeper_A',{party:[{artId:'sleeper_A'}]});
 assert.equal(a.inspect().loaded,false);
 assert.equal(a.newGame(),true);
 assert.equal(a.readWorld().narrative.revision,2);
 assert.equal(a.readWorld().story_schema,2);
 assert.equal(a.readWorld().location.mapId,'A00');
 assert.equal(a.inspect().hasSave,true);
 const resumed=make(data,'sleeper_A');
 assert.equal(resumed.load(),true);
 assert.deepEqual(resumed.readWorld(),a.readWorld());
 assert.equal(make(data,'sleeper_B').load(),false);
 assert.throws(()=>make(data,'sleeper_C',{party:[{artId:'sleeper_B'}]}).newGame(),/sprite does not match/);
});
test('Durable narrative writes commit exactly once and failed writes retain old world',()=>{
 const data=storage(),j=make(data);assert.equal(j.newGame(),true);
 const first=j.readWorld();first.flags.safe_flag=true;
 assert.equal(j.commitWorld(first),true);
 const original=j.readWorld();original.flags.safe_flag=false;
 const set=data.setItem;data.setItem=()=>{throw Error('quota exceeded')};
 assert.equal(j.commitWorld(original),false);
 assert.equal(j.readWorld().flags.safe_flag,true);
 data.setItem=set;
 assert.equal(make(data).load(),true);
 assert.equal(make(data).readWorld(),null,'A different journal instance must load explicitly');
});
test('Combat completion checks mandatory durable victory, never transcript or memory-only status',()=>{
 const data=storage(),j=make(data);j.newGame();
 assert.equal(j.canComplete('SC-008'),false);
 assert.equal(j.canComplete('SC-999'),true);
 assert.equal(j.setEncounterOutcome('EN-005','victory'),true);
 assert.equal(j.canComplete('SC-008'),true);
 assert.equal(j.setEncounterOutcome('EN-005','victory'),true);
 assert.equal(j.setEncounterOutcome('EN-005','fled'),false);
 assert.deepEqual(j.readWorld().encounters,{'EN-005':{outcome:'victory'}});
 const copy=make(data);assert.equal(copy.load(),true);
 assert.equal(copy.canComplete('SC-008'),true);
});
test('Journal persists route transitions, field snapshots, and refuses foreign or invalid map',()=>{
 const j=make(storage());j.newGame();
 const old=j.readJournal();
 const next={...old,mapId:'A01',maps:{A00:{mission:'A00',player:{x:80,y:112}}}};
 assert.equal(j.writeJournal(next),true);
 assert.equal(j.readWorld().location.mapId,'A01');
 assert.equal(j.writeJournal({...next,mapId:'UNLISTED'}),false);
 assert.equal(j.saveField('A01',{mission:'A01',player:{x:48,y:112}}),true);
 assert.equal(j.saveField('A01',{mission:'A00'}),false);
 assert.equal(j.readJournal().maps.A01.player.x,48);
 assert.equal(j.readJournal().maps.A00.player.x,80);
});