// Data-only bridge between Ghost Signal exploration, authored stealth zones, and JRPG combat.
// The live Ghost Signal mission loop, renderer, menus and local-storage keys are untouched.
import { compileAreaPolicy, securityAt, securityTransition } from './area-policy.js';
import { beginEncounter, finishEncounter } from './encounter-handoff.js';
import { startBattle, combatAction, battleResultPatch } from './rpg-combat.js';
import { createParty, createCampaignParty, battleParty } from './rpg-party.js';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const copy = x => JSON.parse(JSON.stringify(x));
const seal = x => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(seal); Object.freeze(x); } return x; };
const location = loc => object(loc) && typeof loc.mapId === 'string' && loc.mapId && Number.isFinite(loc.x) && Number.isFinite(loc.y);

const selectedIds=world=>world.activeParty??world.party.map(member=>member.id);
function campaignRoster(world){
  return createCampaignParty({members:world.party,active:world.activeParty,
    inventory:world.inventory,equipment:world.equipment});
}

// Only explicit campaign lineups use the three-active limit. Existing saves and
// Ghost Signal QA sessions without activeParty keep their four-slot behavior.
export function setHybridActiveParty(session,ids){
  if(!object(session)||session.phase!=='exploration'||!Array.isArray(ids))throw new TypeError('Formation requires exploration');
  const exploration={...session.exploration,activeParty:copy(ids)};
  campaignRoster(exploration);
  return seal({...session,exploration,event:{type:'party.formation'}});
}

export function createHybridSession(exploration, areaSpec = {}) {
  if (!object(exploration) || !location(exploration.location) || !Array.isArray(exploration.party) ||
      !object(exploration.inventory) || !object(exploration.equipment) || !object(exploration.quests) ||
      !object(exploration.progression)) throw new TypeError('Invalid hybrid exploration state');
  if(exploration.activeParty!==undefined)campaignRoster(exploration);
  const policy = compileAreaPolicy(areaSpec);
  const state = copy(exploration);
  return seal({ phase:'exploration', exploration:state, policy,
    security:securityAt(policy,state.location.x,state.location.y), battle:null, handoff:null, event:null });
}

export function moveHybrid(session, destination) {
  if (!object(session) || session.phase !== 'exploration' || !location(destination) ||
      destination.mapId !== session.exploration.location.mapId) throw new TypeError('Invalid in-map movement');
  const before=session.exploration.location;
  const boundary=securityTransition(session.policy,before.x,before.y,destination.x,destination.y);
  const next=copy(session.exploration);
  next.location=copy(destination);
  return seal({...session, exploration:next, security:boundary.to,
    event:boundary.changed ? {type:'security.boundary',from:boundary.from,to:boundary.to} : null });
}

export function detectHybrid(session, encounter = null) {
  if (!object(session) || session.phase !== 'exploration' || session.security?.mode !== 'stealth')
    throw new TypeError('Detection requires active stealth');
  const response=session.security.onDetection || 'alarm';
  if (response !== 'encounter') return seal({...session,event:{type:'security.'+response,zoneId:session.security.zoneId}});
  return beginHybridEncounter(session,encounter);
}

// Authored visible enemies and scene triggers can enter combat in normal areas.
// Stealth detection keeps its policy guard above; both paths share one handoff,
// equipment derivation, deterministic combat state and result transaction.
export function beginHybridEncounter(session,encounter){
  if(!object(session)||session.phase!=='exploration')throw new TypeError('Encounter requires exploration');
  if (!object(encounter) || !Array.isArray(encounter.enemies)) throw new TypeError('Missing authored encounter');
  const handoff=beginEncounter(session.exploration,{id:encounter.id,enemies:encounter.enemies.map(e=>e.id)});
  // Derive combat stats from the same persisted equipment inventory shown by the menu.
  // The encounter supplies a catalog; the world owns equipment, not a second battle loadout.
  if(session.exploration.activeParty!==undefined)campaignRoster(session.exploration);
  const ids=selectedIds(session.exploration);
  const combatParty=encounter.gearCatalog===undefined ?
    ids.map(id=>session.exploration.party.find(member=>member.id===id)) :
    battleParty(createParty({
      members:session.exploration.party,
      active:ids,
      inventory:session.exploration.inventory,
      equipment:session.exploration.equipment
    }),encounter.gearCatalog);
  const battle=startBattle({party:combatParty,enemies:encounter.enemies,
    inventory:session.exploration.inventory,canFlee:encounter.canFlee !== false,rewards:encounter.rewards || {}});
  return seal({...session, phase:'battle',battle,handoff,event:{type:'battle.start',encounterId:encounter.id}});
}

export function actHybrid(session, action) {
  if (!object(session) || session.phase !== 'battle' || !session.battle || !session.handoff)
    throw new TypeError('No active battle');
  const battle=combatAction(session.battle,action);
  if (battle.status === 'active') return seal({...session,battle,event:{type:'battle.turn',round:battle.round}});
  const snapshot=session.handoff.snapshot;
  const active=selectedIds(snapshot).map(id=>snapshot.party.find(member=>member.id===id));
  const result=battleResultPatch(battle,active,snapshot.progression);
  const updated=new Map(result.party.map(member=>[member.id,member]));
  // Reserves are outside combat: keep their HP, EP, equipment and identity exact.
  const patch={...result,party:snapshot.party.map(member=>updated.get(member.id)??member)};
  const restored=finishEncounter(session.handoff,battle.status,patch);
  return seal({phase:'exploration',exploration:restored.exploration,policy:session.policy,
    security:securityAt(session.policy,restored.exploration.location.x,restored.exploration.location.y),
    battle:null,handoff:null,event:{type:'battle.end',outcome:battle.status,log:battle.log.slice()}});
}
