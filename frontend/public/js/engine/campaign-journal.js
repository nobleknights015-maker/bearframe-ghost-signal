// Durable PRIVATE campaign journal. Uses the existing corruption-checked RPG
// dual-record save store; never touches original Ghost Signal or QA lab keys.
// Authored story transactions are performed by narrative-runtime/campaign-narrative.
import {createRpgSaveStore} from './rpg-save.js';
import {createNarrativeState} from './narrative-runtime.js';
import {compileCampaignWorld} from './campaign-world.js';
import {compileCampaignEncounterGates} from './campaign-encounter-gates.js';
const copy=x=>structuredClone(x);
const starterOK=x=>typeof x==='string'&&/^sleeper_[ABCD]$/.test(x);
const idOK=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(x);

export function createCampaignJournal({storage,starterId,content,worldSpec,bootstrap={}}){
  if(!starterOK(starterId))throw new TypeError('Campaign starter must be an approved A-D identity');
  const graph=compileCampaignWorld(worldSpec);
  const combatGates=compileCampaignEncounterGates(worldSpec,content);
  const sourceEncounters=new Map((content.encounters||[]).map(e=>[e.id,e]));
  const declaredFlags=new Set(content.flagSchema?.gameplay_flags||[]);
  const sourceBattleAllowed=(id,mapId)=>{
    const source=sourceEncounters.get(id);
    return !!source&&(!source.kind||['battle','boss'].includes(source.kind))&&
      (!source.area||source.area===mapId)&&
      (!source.set_flag||(idOK(source.set_flag)&&declaredFlags.has(source.set_flag)));
  };
  if(content?.schemaVersion!==1||!Array.isArray(content.scenes)||content.revision!==worldSpec.campaignRevision)
    throw new TypeError('Campaign and layout revisions disagree');
  const db=createRpgSaveStore(storage,'bearframe_aeon_campaign_'+starterId+'_v1');
  const safeBoot=copy(bootstrap);
  if(Object.keys(safeBoot).some(key=>!['party','inventory','quests','flags','equipment','stats','progression','activeParty'].includes(key)))
    throw new TypeError('Campaign bootstrap has unsupported fields');
  let record=null;
  const newWorld=()=>{
    const narrative=createNarrativeState(content,{});
    const world={story_schema:2,starterId,narrative,
      flags:{...narrative.flags,...(safeBoot.flags||{})},
      inventory:{...(safeBoot.inventory||{})},
      party:copy(safeBoot.party||[]),
      ...(safeBoot.activeParty?{activeParty:copy(safeBoot.activeParty)}:{}),
      ...(safeBoot.progression?{progression:copy(safeBoot.progression)}:{}),
      equipment:copy(safeBoot.equipment||{}),
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
    // An interrupted encounter is an additive checkpoint inside the existing
    // exploration record, not a new or incompatible save format.
    if(next.battle!==undefined){
      const b=next.battle;
      if(!b||!idOK(b.encounterId)||!sourceBattleAllowed(b.encounterId,next.mapId)||
         b.session?.phase!=='battle'||b.session?.handoff?.encounter?.id!==b.encounterId||
         b.session?.exploration?.location?.mapId!==next.mapId||
         b.field?.mission!==next.mapId)return false;
    }
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
    if(!record||record.battle||!nextWorld||nextWorld.starterId!==starterId||
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
  const canComplete=(sceneId,world=readWorld())=>combatGates.canComplete(sceneId,world);
  const pendingCombat=(sceneId,world=readWorld())=>combatGates.pendingForScene(sceneId,world);
  return Object.freeze({
    get starterId(){return starterId;},
    get graph(){return graph;},
    inspect(){return Object.freeze({hasSave:db.inspect().hasSave,loaded:!!record,
      mapId:record?.mapId||null,revision:db.inspect().revision,
      redundant:db.inspect().redundant});},
    newGame(){
      const world=newWorld();
      return persist({version:1,phase:'exploration',starterId,storySchema:2,
        storyRevision:content.revision,layoutDigest:worldSpec.layoutDigest,
        mapId:graph.startLocation.mapId,maps:{},field:null,world});
    },
    load(){const saved=db.load();if(!saved||!accept(saved))return false;
      record=copy(saved);return true;},
    readWorld,commitWorld,readJournal:current,pendingCombat,
    writeJournal:next=>{
      if(!record||record.battle||!next||!graph.get(next.mapId))return false;
      const world=copy(next.world);
      if(world.starterId!==starterId||world.story_schema!==2)return false;
      const field=next.maps?.[next.mapId]||next.field||null;
      world.location={...world.location,mapId:next.mapId,
        ...(Number.isFinite(field?.player?.x)?{x:field.player.x}:{}),
        ...(Number.isFinite(field?.player?.y)?{y:field.player.y}:{}),
        ...(field?.player?.dir?{facing:field.player.dir}:{})};
      return persist({...record,mapId:next.mapId,maps:copy(next.maps||{}),
        field:field?copy(field):null,world});
    },
    saveField:(mapId,snapshot)=>{
      if(!record||record.battle||!graph.get(mapId)||mapId!==record.mapId||!snapshot||snapshot.mission!==mapId)return false;
      const maps={...record.maps,[mapId]:copy(snapshot)};
      const world=readWorld();
      world.location={...world.location,mapId,
        ...(Number.isFinite(snapshot.player?.x)?{x:snapshot.player.x}:{}),
        ...(Number.isFinite(snapshot.player?.y)?{y:snapshot.player.y}:{}),
        ...(snapshot.player?.dir?{facing:snapshot.player.dir}:{})};
      return persist({...record,field:copy(snapshot),maps,world});
    },
    setEncounterOutcome,canComplete,
    beginBattle(encounterId,session,field){
      if(!record||record.battle||!idOK(encounterId)||
         !sourceBattleAllowed(encounterId,record.mapId)||
         record.world.encounters?.[encounterId]?.outcome==='victory'||
         session?.phase!=='battle'||session?.handoff?.encounter?.id!==encounterId||
         session?.exploration?.location?.mapId!==record.mapId||
         !field||field.mission!==record.mapId)return false;
      // Persist both the prebattle world and the first deterministic turn
      // before displaying anything; reload returns to the same turn.
      const maps={...record.maps,[record.mapId]:copy(field)};
      return persist({...record,maps,field:copy(field),
        battle:{encounterId,session:copy(session),field:copy(field)}});
    },
    stepBattle(session){
      if(!record?.battle||session?.phase!=='battle'||
         session.handoff?.encounter?.id!==record.battle.encounterId||
         session.exploration?.location?.mapId!==record.mapId)return false;
      return persist({...record,battle:{...record.battle,session:copy(session)}});
    },
    finishBattle(session){
      if(!record?.battle||session?.phase!=='exploration'||
         !['victory','fled','defeat'].includes(session.event?.outcome))return false;
      const encounterId=record.battle.encounterId,world=copy(session.exploration);
      if(!sourceBattleAllowed(encounterId,record.mapId))return false;
      if(world.starterId!==starterId||world.story_schema!==2||
         world.location?.mapId!==record.mapId||
         JSON.stringify(world.narrative)!==JSON.stringify(record.world.narrative)||
         record.world.encounters?.[encounterId]?.outcome==='victory')return false;
      world.encounters={...(record.world.encounters||{}),[encounterId]:{outcome:session.event.outcome}};
      // Only a completed, source-authorized battle grants its screenplay
      // milestone. Record the flag in the exact SAME atomic journal save as
      // HP/EP, rewards and outcome; flee/defeat never silently unlock quests.
      const authoredFlag=sourceEncounters.get(encounterId)?.set_flag;
      if(session.event.outcome==='victory'&&authoredFlag)
        world.flags={...(world.flags||{}),[authoredFlag]:true};
      // Match the established RPG field-recovery contract: a defeated party
      // can still move and recover rather than loading into a permanent softlock.
      if(session.event.outcome==='defeat')for(const unit of world.party)
        if(unit.hp===0)unit.hp=Math.max(1,Math.ceil(unit.maxHp/2));
      const next={...record,world};delete next.battle;
      // Outcome, HP, EP, XP, loot and encounter gate commit together.
      return persist(next);
    },
    // The caller should never erase a record merely because a normal load fails.
    clear(){record=null;return db.clear();}
  });
}