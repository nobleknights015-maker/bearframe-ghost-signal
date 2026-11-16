// Durable PRIVATE campaign journal. Uses the existing corruption-checked RPG
// dual-record save store; never touches original Ghost Signal or QA lab keys.
// Authored story transactions are performed by narrative-runtime/campaign-narrative.
import {createRpgSaveStore} from './rpg-save.js';
import {createNarrativeState} from './narrative-runtime.js';
import {compileCampaignWorld} from './campaign-world.js';
const copy=x=>structuredClone(x);
const starterOK=x=>typeof x==='string'&&/^sleeper_[ABCD]$/.test(x);
const idOK=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(x);

export function createCampaignJournal({storage,starterId,content,worldSpec,bootstrap={}}){
  if(!starterOK(starterId))throw new TypeError('Campaign starter must be an approved A-D identity');
  const graph=compileCampaignWorld(worldSpec);
  if(content?.schemaVersion!==1||!Array.isArray(content.scenes)||content.revision!==worldSpec.campaignRevision)
    throw new TypeError('Campaign and layout revisions disagree');
  const db=createRpgSaveStore(storage,'bearframe_aeon_campaign_'+starterId+'_v1');
  const safeBoot=copy(bootstrap);
  if(Object.keys(safeBoot).some(key=>!['party','inventory','quests','flags','equipment','stats'].includes(key)))
    throw new TypeError('Campaign bootstrap has unsupported fields');
  let record=null;
  const newWorld=()=>{
    const narrative=createNarrativeState(content,{});
    const world={story_schema:2,starterId,narrative,
      flags:{...narrative.flags,...(safeBoot.flags||{})},
      inventory:{...(safeBoot.inventory||{})},
      party:copy(safeBoot.party||[]),equipment:copy(safeBoot.equipment||{}),
      quests:copy(safeBoot.quests||{}),stats:copy(safeBoot.stats||{}),
      encounters:{},events:{},location:{...graph.startLocation}};
    if(world.party.length&&world.party[0].artId!==starterId)
      throw new TypeError('Campaign party sprite does not match chosen portrait');
    return world;
  };
  const accept=next=>{
    if(!next||next.version!==1||next.phase!=='exploration'||!graph.get(next.mapId)||
      next.starterId!==starterId||next.storySchema!==2||
      next.storyRevision!==content.revision||next.layoutDigest!==worldSpec.layoutDigest||
      !next.world||next.world.starterId!==starterId||next.world.story_schema!==2||
      !next.maps||typeof next.maps!=='object')return false;
    if(next.world.location?.mapId!==next.mapId)return false;
    // A corrupt or older narrative body must never silently restart a campaign.
    try{createNarrativeState(content,next.world.narrative);}catch{return false;}
    return true;
  };
  const persist=next=>{
    if(!accept(next))return false;
    const snapshot=copy(next);
    if(db.save(snapshot)!==true)return false;
    record=snapshot;return true;
  };
  const current=()=>record?copy(record):null;
  const readWorld=()=>record?copy(record.world):null;
  const commitWorld=nextWorld=>{
    if(!record||!nextWorld||nextWorld.starterId!==starterId||
       nextWorld.story_schema!==2||nextWorld.location?.mapId!==record.mapId)return false;
    return persist({...record,world:copy(nextWorld)});
  };
  const setEncounterOutcome=(encounterId,outcome)=>{
    if(!record||!idOK(encounterId)||!content.encounters?.some(e=>e.id===encounterId)||
       !['victory','fled','defeat'].includes(outcome))return false;
    const existing=record.world.encounters?.[encounterId];
    if(existing)return existing.outcome===outcome; // no second reward or result mutation
    const updated=readWorld();updated.encounters??={};
    updated.encounters[encounterId]={outcome};
    return commitWorld(updated);
  };
  const canComplete=(sceneId,world=readWorld())=>{
    const mandatory=worldSpec.mandatoryCombat;
    return !mandatory||mandatory.sceneId!==sceneId||
      world?.encounters?.[mandatory.encounterId]?.outcome===mandatory.saveOutcomeRequired;
  };
  return Object.freeze({
    get starterId(){return starterId;},
    get graph(){return graph;},
    inspect(){return Object.freeze({hasSave:db.inspect().hasSave,loaded:!!record,
      mapId:record?.mapId||null,revision:db.inspect().revision});},
    newGame(){
      const world=newWorld();
      return persist({version:1,phase:'exploration',starterId,storySchema:2,
        storyRevision:content.revision,layoutDigest:worldSpec.layoutDigest,
        mapId:graph.startLocation.mapId,maps:{},field:null,world});
    },
    load(){const saved=db.load();if(!saved||!accept(saved))return false;
      record=copy(saved);return true;},
    readWorld,commitWorld,readJournal:current,
    writeJournal:next=>{
      if(!record||!next||!graph.get(next.mapId))return false;
      const world=copy(next.world);
      if(world.starterId!==starterId||world.story_schema!==2)return false;
      world.location={...world.location,mapId:next.mapId};
      return persist({...record,mapId:next.mapId,maps:copy(next.maps||{}),
        field:next.field||null,world});
    },
    saveField:(mapId,snapshot)=>{
      if(!record||!graph.get(mapId)||mapId!==record.mapId||!snapshot||snapshot.mission!==mapId)return false;
      const maps={...record.maps,[mapId]:copy(snapshot)};
      return persist({...record,field:copy(snapshot),maps});
    },
    setEncounterOutcome,canComplete,
    // The caller should never erase a record merely because a normal load fails.
    clear(){record=null;return db.clear();}
  });
}