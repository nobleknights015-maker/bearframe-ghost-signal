// Additive live campaign security bridge. The original Ghost Signal drones,
// stealth HUD, renderer and missions are NEVER patched. Only owner-authored
// campaign security zones can opt into durable alerts or source-approved combat.
import {compileCampaignWorld} from './campaign-world.js';
import {compileSecurityZones,securityAt} from './campaign-security-policy.js';
import {applySecurityDetection} from './campaign-security-detection.js';

const EMPTY=Object.freeze({zoneId:null,mode:'normal',alert:false,consequence:'none'});
const same=(a,b)=>a?.mapId===b.mapId&&a.zoneId===b.zoneId&&
  a.mode===b.mode&&a.alert===b.alert&&a.consequence===b.consequence;

/**
 * Security state is an optional addition to the existing campaign world
 * record. It is saved BEFORE any alert reaction or authored encounter starts.
 * No zone means no new state and no changes to existing campaign saves.
 */
export function createCampaignSecurityRuntime({
  worldSpec,readWorld,commitWorld,encounterFor=()=>null,
  onEncounter=()=>{},onAlert=()=>{},onSaveFailure=()=>{}
}={}){
  if(typeof readWorld!=='function'||typeof commitWorld!=='function'||
     typeof encounterFor!=='function'||typeof onEncounter!=='function'||
     typeof onAlert!=='function'||typeof onSaveFailure!=='function')
    throw new TypeError('Campaign security bridge requires source and journal adapters');
  const graph=compileCampaignWorld(worldSpec),zonesByArea=new Map();
  for(const id of graph.ids){
    const area=graph.get(id),source=area.security;
    if(source!==undefined&&(!source||typeof source!=='object'||Array.isArray(source)||
      !['normal','stealth'].includes(source.defaultMode??'normal')))
      throw new TypeError('Campaign security bridge: invalid private area policy');
    const zones=compileSecurityZones(source?.zones??[],area.width,area.height);
    // An area must explicitly declare its own zones. No invented patrol,
    // detection source or combat trigger is generated from a default mode.
    zonesByArea.set(id,zones);
  }
  let failedSave=false;
  function tick(game){
    if(game?.mode!=='play'||!game.m||!game.player||
       !Number.isFinite(game.player.x)||!Number.isFinite(game.player.y))return false;
    const mapId=game.m.id,zones=zonesByArea.get(mapId);
    if(!zones)return false;
    const world=readWorld();
    if(!world||typeof world!=='object')return false;
    const zone=securityAt(zones,game.player.x,game.player.y);
    // Leave old story-only records untouched until security is explicitly
    // relevant; entering/leaving a previously active zone is relevant.
    if(!zone&&!world.security)return false;
    const previous=world.security?.mapId===mapId?world.security:EMPTY;
    // Real Ghost Signal detection signal only: chasing drone with visual.
    // No fake auto-alarms from simply crossing a marked tile.
    const detected=!!zone&&zone.mode==='stealth'&&!game.player.hidden&&
      Array.isArray(game.drones)&&game.drones.some(d=>d?.state==='chase'&&d.vis===true);
    // Double authorization: encounter is defined by the source-owned zone
    // AND available from validated private combat staging for THIS area.
    const authored=zone?.consequence==='encounter'?
      encounterFor(zone.encounterId,mapId):null;
    const allowed=authored?.id===zone?.encounterId&&authored?.mapId===mapId;
    const current=applySecurityDetection(previous,zone,detected?zone:null,{
      detected,encounterEnabled:allowed,authorizedEncounterIds:
        allowed?new Set([zone.encounterId]):new Set()
    });
    const next=Object.freeze({mapId,zoneId:current.zoneId,
      mode:current.mode,alert:current.alert,consequence:current.consequence});
    if(same(world.security,next))return false;
    // A pending save failure cannot launch a battle or claim a durable alert.
    // Storage adapters may reject a write by returning false OR throwing
    // (for example, quota exhaustion). Neither path may dispatch gameplay.
    let saved=false;
    try { saved=commitWorld({...world,security:next})===true; }
    catch { saved=false; }
    if(!saved){
      if(!failedSave)onSaveFailure();
      failedSave=true;return false;
    }
    failedSave=false;
    if(next.consequence==='encounter'&&
       (previous.consequence!=='encounter'||previous.zoneId!==next.zoneId))
      onEncounter(zone.encounterId,mapId);
    else if(next.alert&&!previous.alert)onAlert(next,mapId);
    return true;
  }
  return Object.freeze({
    tick,
    zonesFor:id=>zonesByArea.get(id)||Object.freeze([]),
    sourceAreaCount:graph.ids.length
  });
}
