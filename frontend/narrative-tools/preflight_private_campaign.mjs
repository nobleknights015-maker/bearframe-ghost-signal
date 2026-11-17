#!/usr/bin/env node
// Offline, non-spoiler static release preflight for OWNER-INSTALLED Aeon content.
// This does not claim a full campaign or run proprietary story in public CI.
import {readFile} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileCampaignWorld,auditCampaignPortalApproaches} from '../public/js/engine/campaign-world.js';
import {compileCampaignEncounterGates} from '../public/js/engine/campaign-encounter-gates.js';
import {compileCampaignCombatStaging} from '../public/js/engine/campaign-combat-staging.js';
import {worldSheetSpec,mapV5Art} from '../public/js/engine/aeon-v5-bridge.js';
import {validateNarrativeStaging} from '../public/js/engine/campaign-narrative.js';

const STARTERS=['sleeper_A','sleeper_B','sleeper_C','sleeper_D'];
const ACTIONS=['idle','attack','ranged','cast','guard','hit','down','victory','charge'];
const PNG_SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const sourceName=x=>x instanceof Error?x.message:String(x);
const pngPath=x=>typeof x==='string'&&/^assets\/(world|battlers)\/[a-zA-Z0-9_-]+\.png$/.test(x);
const validFilePath=(root,path)=>{
  const full=resolve(root,path),rel=relative(root,full);
  if(rel.startsWith('..')||isAbsolute(rel))throw new Error('Asset path escapes owner package');
  return full;
};
const CRC_TABLE=Array.from({length:256},(_,i)=>{
  let c=i;
  for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
  return c>>>0;
});
const crc32=data=>{
  let c=0xffffffff;
  for(const byte of data)c=CRC_TABLE[(c^byte)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
};
async function pngSize(root,path){
  const b=await readFile(validFilePath(root,path));
  if(b.length<60||b.length>64*1024*1024||
     !b.subarray(0,8).equals(PNG_SIGNATURE))
    throw new Error('Unreadable PNG');
  let position=8,head=null,hasPixels=false,ended=false;
  while(position+12<=b.length){
    const length=b.readUInt32BE(position);
    if(length>b.length-position-12)throw new Error('Truncated PNG');
    const type=b.toString('ascii',position+4,position+8);
    const payload=b.subarray(position+8,position+8+length);
    if(crc32(b.subarray(position+4,position+8+length))!==b.readUInt32BE(position+8+length))
      throw new Error('PNG chunk checksum failed');
    if(!head){
      if(type!=='IHDR'||length!==13)throw new Error('Missing PNG header');
      const width=payload.readUInt32BE(0),height=payload.readUInt32BE(4);
      if(width<1||height<1||width>16384||height>16384)
        throw new Error('Unsafe PNG dimensions');
      head={width,height};
    }else if(type==='IDAT')hasPixels=true;
    else if(type==='IEND'){
      if(length!==0||position+12!==b.length)throw new Error('Invalid PNG end');
      ended=true;break;
    }
    position+=12+length;
  }
  if(!head||!hasPixels||!ended)throw new Error('Incomplete PNG image');
  return head;
}
async function readJSON(root,path){
  return JSON.parse(await readFile(validFilePath(root,path),'utf8'));
}
const error=(problems,code,count=1)=>{
  if(count>0)problems.push({code,count});
};
export async function preflightPrivateCampaign({root,profile='review'}={}){
  if(!root||!['review','release'].includes(profile))throw new TypeError('Expected owner asset root and review or release profile');
  root=resolve(root);
  const problems=[],report={profile,pass:false,
    counts:{characters:0,portraits:0,areas:0,sourceAreas:0,reachableAreas:0,scenes:0,
      stagedScenes:0,encounters:0,combatEncounters:0,mandatoryBattles:0},
    problems};
  let manifest,content,world;
  for(const [name,path] of [
    ['manifest','asset-manifest.json'],
    ['content','story/campaign.json'],
    ['world','story/opening-world-review-candidate.json']
  ]){
    try{
      const parsed=await readJSON(root,path);
      if(name==='manifest')manifest=parsed;
      else if(name==='content')content=parsed;
      else world=parsed;
    }catch{error(problems,'MISSING_OR_INVALID_'+name.toUpperCase());}
  }
  if(!manifest||!content||!world)return report;
  if(manifest.schema!=='aeon.asset-library.v4'||!Array.isArray(manifest.characters)||
     manifest.characters.length!==42||
     new Set(manifest.characters.map(x=>x.id)).size!==42)
    error(problems,'INCOMPLETE_V5_MANIFEST');
  else report.counts.characters=manifest.characters.length;
  if(content.schemaVersion!==1||!Array.isArray(content.scenes)||world.campaignRevision!==content.revision||
     world.status!=='authored-blockout-review-candidate'||!world.layoutDigest)
    error(problems,'STORY_LAYOUT_REVISION_MISMATCH');
  report.counts.scenes=content.scenes?.length||0;
  report.counts.encounters=content.encounters?.length||0;
  report.counts.areas=world.maps?.length||0;
  report.counts.sourceAreas=content.areas?.length||0;
  // Source-authored areas not yet mapped are NOT unreachable: they are
  // absent, and must have their own release blocker (29 vs 5 on recovered
  // Director's Cut v2). Unknown candidate area IDs also fail closed.
  if(Array.isArray(content.areas)&&content.areas.length){
    const sourceIds=new Set(content.areas.map(a=>a.id));
    const mappedIds=new Set((world.maps||[]).map(m=>m.id));
    error(problems,'UNKNOWN_STAGED_SOURCE_AREAS',
      [...mappedIds].filter(id=>!sourceIds.has(id)).length);
    if(profile==='release')
      error(problems,'UNSTAGED_SOURCE_AREAS',
        [...sourceIds].filter(id=>!mappedIds.has(id)).length);
  }

  const entries=Array.isArray(manifest.characters)?manifest.characters:[];
  let missingSheets=0,invalidSheets=0;
  for(const art of entries){
    try{
      if(!art||!art.id||!pngPath(art.world?.src)||!pngPath(art.battle?.src))
        throw new Error('Manifest art references not installed');
      // The four Sleeper player sheets are exactly 32x56. Other reviewed
      // actors legitimately use larger world cells (up to 128x176) and must
      // be validated against THEIR OWN native atlas metadata, not the
      // player-only sprite contract.
      const worldMeta=art.world;
      if(STARTERS.includes(art.id))worldSheetSpec(manifest,art.id);
      else if(worldMeta.columns!==9||worldMeta.rows!==4||
         !Number.isInteger(worldMeta.frameWidth)||worldMeta.frameWidth<16||worldMeta.frameWidth>256||
         !Number.isInteger(worldMeta.frameHeight)||worldMeta.frameHeight<16||worldMeta.frameHeight>256||
         JSON.stringify(worldMeta.directions)!==JSON.stringify(['down','left','right','up'])||
         JSON.stringify(worldMeta.walkColumns)!==JSON.stringify([1,2,3,4,5,6,7,8]))
        throw new Error('Invalid reviewed nonstarter world atlas contract');
      mapV5Art(manifest,{['enemy:'+art.id]:art.id});
      const w=await pngSize(root,art.world.src);
      const b=await pngSize(root,art.battle.src);
      if(w.width!==art.world.frameWidth*art.world.columns||
         w.height!==art.world.frameHeight*art.world.rows||
         b.width!==art.battle.frameWidth*art.battle.columns||
         b.height!==art.battle.frameHeight*art.battle.rows||
         ACTIONS.some(action=>!art.battle.animations?.[action]))
        throw new Error('Atlas geometry does not match manifest');
    }catch(e){
      if(/ENOENT/.test(sourceName(e)))missingSheets++;
      else invalidSheets++;
    }
  }
  error(problems,'MISSING_V5_ATLASES',missingSheets);
  error(problems,'INVALID_V5_ATLASES',invalidSheets);
  for(const id of STARTERS){
    try{await pngSize(root,'portraits/'+id+'.png');report.counts.portraits++;}
    catch{error(problems,'MISSING_STARTER_PORTRAIT');}
  }

  let graph=null,gates=null,combat=null;
  try{graph=compileCampaignWorld(world);}
  catch{error(problems,'INVALID_NATIVE_32PX_WORLD_GRAPH');}
  if(graph){
    const reachable=new Set([world.startArea]),queue=[world.startArea];
    while(queue.length){
      const map=graph.get(queue.shift());
      for(const p of map.layers.find(l=>l.name==='portals').objects){
        const d=graph.destination(map.id,p.name);
        if(!reachable.has(d.mapId)){reachable.add(d.mapId);queue.push(d.mapId);}
      }
    }
    report.counts.reachableAreas=reachable.size;
    if(profile==='release')error(problems,'UNREACHABLE_AUTHORED_AREAS',graph.ids.length-reachable.size);
    // Topological links can be reciprocal yet still physically unreachable
    // behind static walls. This is a real softlock for ANY review/play build.
    const approaches=auditCampaignPortalApproaches(world);
    error(problems,'UNWALKABLE_PORTAL_APPROACHES',approaches.inaccessiblePortals);
  }
  try{gates=compileCampaignEncounterGates(world,content);
    report.counts.mandatoryBattles=gates.ordered.length;
  }catch{error(problems,'INVALID_AUTHOR_MANDATORY_COMBAT_GATES');}
  try{
    combat=compileCampaignCombatStaging(world.combat,{worldSpec:world,content,manifest});
    report.counts.combatEncounters=world.combat?.encounters?.length||0;
  }catch{error(problems,'INVALID_REVIEWED_COMBAT_STAGING');}
  if(profile==='release'&&report.counts.encounters>0&&!combat)
    error(problems,'REQUIRED_COMBAT_STAGING_NOT_INSTALLED');

  const triggerNames=new Set();
  if(world.openingScene?.trigger)triggerNames.add(world.openingScene.trigger);
  for(const map of world.maps||[]){
    if(map.entryTrigger)triggerNames.add(map.entryTrigger);
    for(const entity of map.entities||[])if(entity.trigger)triggerNames.add(entity.trigger);
    for(const trigger of map.triggers||[])if(trigger.trigger)triggerNames.add(trigger.trigger);
  }
  const authored=Array.isArray(content.scenes)?content.scenes:[];
  report.counts.stagedScenes=authored.filter(scene=>triggerNames.has(scene.trigger)).length;
  if(profile==='release')
    error(problems,'UNSTAGED_STORY_SCENES',authored.length-report.counts.stagedScenes);
  // A review-candidate opening cannot be failed for future screenplay
  // choices that have not yet been mapped. Production release still requires
  // every choice's explicit anchor; a staged review scene must pass now.
  let badChoices=0;
  for(const scene of authored){
    if(profile==='review'&&!triggerNames.has(scene.trigger))continue;
    try{validateNarrativeStaging(content,scene.id,world.choiceGates||{});}
    catch{badChoices++;}
  }
  error(problems,'CHOICE_PRESENTATION_NOT_AUTHORED',badChoices);
  if(profile==='release'&&combat){
    const stageIds=new Set(world.combat.encounters.map(e=>e.id));
    error(problems,'UNSTAGED_AUTHORED_ENCOUNTERS',
      (content.encounters||[]).filter(e=>!stageIds.has(e.id)).length);
  }
  // No private scene identifiers, dialogue, filenames, enemy names or screenplay
  // text appear in the public-facing report. Any failures block release.
  report.pass=problems.length===0;
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const profile=args.includes('--release')?'release':'review';
  const root=resolve(args.find(a=>!a.startsWith('--'))||'frontend/public/assets/aeon');
  const report=await preflightPrivateCampaign({root,profile});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.pass)process.exitCode=1;
}
