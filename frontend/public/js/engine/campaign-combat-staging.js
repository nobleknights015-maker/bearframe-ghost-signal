// Source-authorized PRIVATE campaign combat bindings. This module defines the
// contract, never enemy placements, unapproved stats, story, or art.
import {mapV5Art} from './aeon-v5-bridge.js';
const clone=x=>structuredClone(x);
const ids=['sleeper_A','sleeper_B','sleeper_C','sleeper_D'];
const validId=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const stat=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const fail=message=>{throw new Error('Campaign combat staging: '+message);};
const checkUnit=(unit,ally)=>{
  if(!unit||!validId(unit.id)||!validId(unit.artId)||
     !stat(unit.maxHp,1,99999)||!stat(unit.hp,1,unit.maxHp)||
     !stat(unit.attack,1,9999)||!stat(unit.defense,0,9999)||
     !stat(unit.speed,1,9999)||!stat(unit.maxEp??0,0,9999)||
     !stat(unit.ep??0,0,unit.maxEp??0))fail('invalid '+(ally?'party':'enemy')+' combat stats');
  if(ally&&(!['sleeper','echo','ghost-grid','nullframe','hollow'].includes(unit.lineage)||
    (unit.skills!==undefined&&(!Array.isArray(unit.skills)||unit.skills.some(s=>!['pulse','repair','guard'].includes(s)))))
  )fail('invalid party lineage or skills');
  if(!ally&&unit.tactics!==undefined&&unit.tactics!=='charged-strike')fail('invalid enemy tactics');
};
export function compileCampaignCombatStaging(spec,{worldSpec,content,manifest}){
  if(spec===undefined||spec===null)return null; // The older story-only preview still works.
  if(!spec||spec.schemaVersion!==1||spec.campaignRevision!==content?.revision||
     spec.layoutDigest!==worldSpec?.layoutDigest||
     !spec.partyByStarter||typeof spec.partyByStarter!=='object'||
     !Array.isArray(spec.encounters))fail('invalid private review revision or structure');
  const knownAreas=new Set(worldSpec.maps.map(m=>m.id));
  const authoredEncounters=new Set((content.encounters||[]).map(e=>e.id));
  const partyByStarter={};
  for(const id of ids){
    const party=spec.partyByStarter[id];
    if(!Array.isArray(party)||!party.length||party.length>4||
       party[0]?.id!=='sleeper'||party[0]?.artId!==id||
       new Set(party.map(x=>x.id)).size!==party.length)fail('starter roster differs from selected portrait '+id);
    for(const unit of party)checkUnit(unit,true);
    mapV5Art(manifest,Object.fromEntries(party.map(u=>['party:'+u.id,u.artId])));
    partyByStarter[id]=clone(party);
  }
  const entries=new Map(),triggers=new Map();
  for(const encounter of spec.encounters){
    if(!validId(encounter?.id)||entries.has(encounter.id)||!authoredEncounters.has(encounter.id)||
       !knownAreas.has(encounter.mapId)||!Array.isArray(encounter.enemies)||
       encounter.enemies.length<1||encounter.enemies.length>6||
       new Set(encounter.enemies.map(u=>u.id)).size!==encounter.enemies.length)
      fail('unknown or duplicate authored encounter');
    for(const enemy of encounter.enemies)checkUnit(enemy,false);
    if(encounter.trigger!==undefined&&!validId(encounter.trigger))fail('invalid encounter trigger');
    if(encounter.requiresFlag!==undefined&&!validId(encounter.requiresFlag))fail('invalid encounter prerequisite');
    if(encounter.rewards!==undefined){
      const r=encounter.rewards;
      if(!r||!stat(r.xp??0,0,999999)||!r.items||typeof r.items!=='object'||
         Object.entries(r.items).some(([id,n])=>!validId(id)||!stat(n,0,999999)))
        fail('invalid authored rewards');
    }
    mapV5Art(manifest,Object.fromEntries(encounter.enemies.map(u=>['enemy:'+u.id,u.artId])));
    if(encounter.trigger){
      const key=encounter.mapId+':'+encounter.trigger;
      if(triggers.has(key))fail('ambiguous encounter trigger');
      triggers.set(key,encounter.id);
    }
    entries.set(encounter.id,clone(encounter));
  }
  const mandatory=worldSpec.mandatoryCombat;
  if(mandatory&&(!entries.has(mandatory.encounterId)||
      !content.scenes?.some(s=>s.id===mandatory.sceneId)||
      mandatory.saveOutcomeRequired!=='victory'))fail('mandatory campaign battle not staged');
  return Object.freeze({
    roster:id=>partyByStarter[id]?clone(partyByStarter[id]):null,
    encounter:id=>entries.has(id)?clone(entries.get(id)):null,
    triggered:(mapId,trigger)=>entries.has(triggers.get(mapId+':'+trigger))?clone(entries.get(triggers.get(mapId+':'+trigger))):null,
    artFor:(manifest,starterId,party,encounter)=>{
      const bindings=Object.fromEntries([...party.map(u=>['party:'+u.id,u.artId]),
        ...encounter.enemies.map(u=>['enemy:'+u.id,u.artId])]);
      if(party[0]?.artId!==starterId)fail('battle portrait and world identity disagree');
      return mapV5Art(manifest,bindings);
    }
  });
}
