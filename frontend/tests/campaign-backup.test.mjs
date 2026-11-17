import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignJournal} from '../public/js/engine/campaign-journal.js';
import {createHybridSession,beginHybridEncounter,actHybrid} from '../public/js/engine/hybrid-session.js';
import {makeCampaignBackup,inspectCampaignBackup,restoreCampaignBackup}
  from '../public/js/engine/campaign-backup.js';

const storage=()=>{const rows=new Map();
 return {getItem:key=>rows.get(key)||null,
   setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
};
const map=()=>({id:'A00',name:'Private synthetic',width:8,height:7,
 orientation:'orthogonal',tilewidth:32,tileheight:32,
 start:{x:80,y:112,dir:'right'},layers:[
   {type:'tilelayer',name:'collision',data:Array.from({length:56},(_,i)=>
     i<8||i>=48||i%8===0||i%8===7?1:0)},
   {type:'objectgroup',name:'portals',objects:[]}],entities:[],triggers:[]});
const world=()=>({schemaVersion:1,status:'authored-blockout-review-candidate',
 campaignRevision:2,layoutDigest:'synthetic-private-layout',startArea:'A00',maps:[map()]});
const content=()=>({schemaVersion:1,revision:2,
 flagSchema:{gameplay_flags:['seen'],exclusive_enums:{},relationships:{}},
 scenes:[{id:'OPEN',trigger:'BEGIN',dialogue:[],sets:'seen'}],
 dialogue:[],choices:[],insertions:[],encounters:[]});
const make=(store,starterId='sleeper_A',worldSpec=world(),story=content())=>
 createCampaignJournal({storage:store,starterId,worldSpec,content:story,
   bootstrap:{party:[{id:'sleeper',artId:starterId}],inventory:{scrap:1}}});
const options=()=>({content:content(),worldSpec:world()});
const withRecord=(store,starterId='sleeper_A')=>{
 const journal=make(store,starterId);assert.equal(journal.newGame(),true);
 const state=journal.readWorld();state.inventory.scrap=7;state.flags.seen=true;
 assert.equal(journal.commitWorld(state),true);
 assert.equal(journal.saveField('A00',{mission:'A00',player:{x:96,y:112,dir:'right'}}),true);
 return journal;
};
const hash=body=>{let h=2166136261;for(let i=0;i<body.length;i++)h=Math.imul(h^body.charCodeAt(i),16777619);
 return (h>>>0).toString(16).padStart(8,'0');};
test('Portable backup round trips real corruption-checked journal, quests and coordinates',()=>{
 const origin=withRecord(storage(),'sleeper_C');
 const encoded=makeCampaignBackup(origin);
 assert.ok(!encoded.includes('PRIVATE NONEXISTENT SPOILERS'));
 const verified=inspectCampaignBackup(encoded,options());
 assert.equal(verified.starterId,'sleeper_C');
 assert.equal(verified.mapId,'A00');
 assert.equal(verified.hasBattle,false);
 assert.equal(verified.record.world.inventory.scrap,7);
 const target=storage();
 assert.deepEqual(restoreCampaignBackup(encoded,{storage:target,...options()}),
   {starterId:'sleeper_C',mapId:'A00',hasBattle:false});
 const loaded=make(target,'sleeper_C');assert.equal(loaded.load(),true);
 assert.deepEqual(loaded.readJournal(),origin.readJournal());
 assert.equal(make(target,'sleeper_A').load(),false,'Starter namespaces stay independent');
});
test('Rejects accidental corruption and edited revision/identity before writing anything',()=>{
 const origin=withRecord(storage()),text=makeCampaignBackup(origin),dest=storage();
 const bad=JSON.parse(text);bad.record.world.inventory.scrap=900;
 assert.throws(()=>inspectCampaignBackup(JSON.stringify(bad),options()),/checksum/);
 assert.throws(()=>restoreCampaignBackup(JSON.stringify(bad),{storage:dest,...options()}),/checksum/);
 assert.equal(make(dest).load(),false);
 const rev=JSON.parse(text);rev.storyRevision=42;
 assert.throws(()=>inspectCampaignBackup(JSON.stringify(rev),options()),/revision/);
 const id=JSON.parse(text);id.starterId='sleeper_B';
 assert.throws(()=>inspectCampaignBackup(JSON.stringify(id),options()),/identity/);
 assert.throws(()=>inspectCampaignBackup('not json',options()),/empty|too large|JSON/);
 assert.throws(()=>inspectCampaignBackup('x'.repeat(2*1024*1024+1),options()),/large/);
});
test('Refuses overwriting an existing valid record without user approval',()=>{
 const current=storage(),old=withRecord(current),oldWorld=old.readJournal();
 const incomingStore=storage(),incoming=withRecord(incomingStore);
 const state=incoming.readWorld();state.inventory.scrap=99;
 assert.equal(incoming.commitWorld(state),true);
 const backup=makeCampaignBackup(incoming);
 assert.throws(()=>restoreCampaignBackup(backup,{storage:current,...options()}),/explicit replacement/);
 const still=make(current);assert.equal(still.load(),true);
 assert.deepEqual(still.readJournal(),oldWorld);
 const result=restoreCampaignBackup(backup,{storage:current,...options(),replace:true});
 assert.equal(result.starterId,'sleeper_A');
 const replaced=make(current);assert.equal(replaced.load(),true);
 assert.equal(replaced.readWorld().inventory.scrap,99);
});
test('Write rejection keeps previous save intact without claiming success',()=>{
 const current=storage(),original=withRecord(current),old=original.readJournal();
 const donor=withRecord(storage()),backup=makeCampaignBackup(donor);
 const save=current.setItem;current.setItem=()=>{throw new Error('storage full');};
 assert.throws(()=>restoreCampaignBackup(backup,{storage:current,...options(),replace:true}),/could not be committed/);
 current.setItem=save;
 const existing=make(current);assert.equal(existing.load(),true);
 assert.deepEqual(existing.readJournal(),old);
});
test('Rejects invalid imported positions even when outer checksum is recomputed',()=>{
 const original=withRecord(storage());
 const body=JSON.parse(makeCampaignBackup(original));
 body.record.maps.A00.player.x=999999;
 body.checksum=hash(JSON.stringify(body.record));
 assert.throws(()=>inspectCampaignBackup(JSON.stringify(body),options()),/invalid saved area position/);
});
test('Unknown valid-checksum journal bytes cannot overwrite unreadable user slots',()=>{
 const donor=withRecord(storage()),backup=makeCampaignBackup(donor);
 const current=storage();current.setItem('bearframe_aeon_campaign_sleeper_A_v1:A','corrupt but user-owned');
 assert.throws(()=>restoreCampaignBackup(backup,{storage:current,...options()}),/unreadable records/);
 assert.equal(current.getItem('bearframe_aeon_campaign_sleeper_A_v1:A'),'corrupt but user-owned');
});

test('Interrupted side-view combat transfers and resumes on the exact turn, without extra loot',()=>{
 const originStore=storage(),story=content(),worldSpec=world();
 story.encounters.push({id:'EN_SYNTHETIC'});
 const party=[{id:'sleeper',artId:'sleeper_A',lineage:'sleeper',
   name:'Synthetic Sleeper',hp:30,maxHp:30,ep:10,maxEp:10,
   attack:28,defense:3,speed:20,skills:['pulse','guard']}];
 const journal=createCampaignJournal({storage:originStore,starterId:'sleeper_A',
   content:story,worldSpec,bootstrap:{party,activeParty:['sleeper'],
     inventory:{},progression:{xp:0}}});
 assert.equal(journal.newGame(),true);
 const initial=createHybridSession(journal.readWorld(),{defaultMode:'normal',zones:[]});
 const battle=beginHybridEncounter(initial,{
   id:'EN_SYNTHETIC',mapId:'A00',enemies:[{
     id:'hostile',artId:'synthetic',name:'Synthetic Hostile',hp:9,maxHp:9,
     ep:0,maxEp:0,attack:2,defense:0,speed:3
   }],rewards:{xp:6,items:{scrap:1}},canFlee:true
 });
 const snapshot={mission:'A00',player:{x:80,y:112,dir:'right'}};
 assert.equal(journal.beginBattle('EN_SYNTHETIC',battle,snapshot),true);
 const data=makeCampaignBackup(journal),dest=storage();
 assert.equal(inspectCampaignBackup(data,{content:story,worldSpec}).hasBattle,true);
 assert.equal(restoreCampaignBackup(data,{storage:dest,content:story,worldSpec}).hasBattle,true);
 const resumed=createCampaignJournal({storage:dest,starterId:'sleeper_A',content:story,worldSpec});
 assert.equal(resumed.load(),true);
 assert.deepEqual(resumed.readJournal().battle.session,battle);
 const outcome=actHybrid(resumed.readJournal().battle.session,{
   actor:'party:sleeper',type:'attack',target:'enemy:hostile'
 });
 assert.equal(outcome.phase,'exploration');
 assert.equal(resumed.finishBattle(outcome),true);
 assert.equal(resumed.readWorld().inventory.scrap,1);
 assert.equal(resumed.readWorld().progression.xp,6);
 assert.equal(resumed.finishBattle(outcome),false,'Replaying the same reward cannot award it twice');
});
