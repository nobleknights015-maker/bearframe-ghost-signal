// Side-view battle presentation contract for Aeon Circuit.
// Entirely visual: never mutates combat, inventory, quests or turn order.
// Native battle viewport: 416 × 116 pixels inside Ghost Signal's 480 × 270 UI.
export const BATTLE_VIEW=Object.freeze({width:416,height:116});
export const ANIMATION_NAMES=Object.freeze([
  'idle','attack','ranged','cast','guard','hit','down','victory','charge'
]);
// Formation cells reserve the header (0..22) and name baseline (115).
// Dense groups use separate depth rows rather than overlapping full-size sheets.
function formationSlots(count,side){
  const left=side==='party';
  const columns=count<=2?count:count<=4?2:3;
  const rows=Math.ceil(count/columns);
  const xPositions=columns===1?[left?96:326]:columns===2?
    (left?[52,144]:[276,372]):[248,312,376];
  const cellHeight=rows===1?86:37;
  return Array.from({length:count},(_,index)=>({
    x:xPositions[index%columns],y:rows===1?109:index<columns?60:109,
    cellWidth:columns===3?60:88,cellHeight
  }));
}
export function sideViewSlots(battle) {
  if(!battle||!Array.isArray(battle.party)||!Array.isArray(battle.enemies)||
    battle.party.length>4||battle.enemies.length>6)
    throw new TypeError('Side-view requires at most four active allies and six foes');
  const map=(units,side,slots)=>units.map((unit,index)=>{
    if(!unit||typeof unit.id!=='string')throw new TypeError('Invalid side-view combatant');
    return Object.freeze({key:side+':'+unit.id,side,index,...slots[index],facing:side==='party'?'right':'left'});
  });
  return Object.freeze([...map(battle.party,'party',formationSlots(battle.party.length,'party')),...map(battle.enemies,'enemy',formationSlots(battle.enemies.length,'enemy'))]);
}
const assetPath=value=>typeof value==='string'&&
  /^assets\/(?:battlers|aeon\/assets\/battlers)\/[a-zA-Z0-9/_-]+\.png$/.test(value)&&!value.includes('..');
export function validateBattleArtManifest(manifest) {
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw new TypeError('Invalid battler manifest');
  const validated={};
  for(const [key,spec] of Object.entries(manifest)){
    if(!/^(party|enemy):[a-zA-Z0-9_-]{1,64}$/.test(key)||
      !spec||typeof spec!=='object'||!assetPath(spec.src)||
      !Number.isInteger(spec.frameWidth)||spec.frameWidth<16||spec.frameWidth>192||
      !Number.isInteger(spec.frameHeight)||spec.frameHeight<16||spec.frameHeight>192||
      !Number.isInteger(spec.scale)||spec.scale<1||spec.scale>2||
      !spec.animations||typeof spec.animations!=='object')throw new TypeError('Invalid battler art '+key);
    const rows={};
    for(const [name,anim] of Object.entries(spec.animations)){
      if(!ANIMATION_NAMES.includes(name)||!anim||
        !Number.isInteger(anim.row)||anim.row<0||anim.row>=ANIMATION_NAMES.length||
        !Number.isInteger(anim.frames)||anim.frames<1||anim.frames>6||
        !Number.isFinite(anim.fps)||anim.fps<1||anim.fps>30)
        throw new TypeError('Invalid battler animation '+name);
      // v5 authored exposure timing is optional; older fixed-FPS atlases remain valid.
      const durations=anim.durationsMs;
      if(durations!==undefined&&(!Array.isArray(durations)||
         durations.length!==anim.frames||
         durations.some(ms=>!Number.isInteger(ms)||ms<1||ms>10000)))
        throw new TypeError('Invalid per-frame timing '+name);
      if(anim.releaseMs!==undefined&&(!Number.isInteger(anim.releaseMs)||anim.releaseMs<0||anim.releaseMs>10000))
        throw new TypeError('Invalid release timing');
      if(anim.loop!==undefined&&typeof anim.loop!=='boolean')throw new TypeError('Invalid clip loop flag');
      if(anim.holdLast!==undefined&&typeof anim.holdLast!=='boolean')throw new TypeError('Invalid clip hold flag');
      rows[name]=Object.freeze({
        row:anim.row,frames:anim.frames,fps:anim.fps,
        ...(durations?{durationsMs:Object.freeze([...durations])}:{}),
        ...(anim.loop!==undefined?{loop:anim.loop}:{}),
        ...(anim.holdLast!==undefined?{holdLast:anim.holdLast}:{}),
        ...(anim.releaseMs!==undefined?{releaseMs:anim.releaseMs}:{})
      });
    }
    if(!rows.idle)throw new TypeError('Battler needs idle animation');
    // The authored 6x9 contract requires each action to occupy its canonical row.
    // Reject misplaced rows before any asset is bound, even when the PNG dimensions fit.
    for(const [name,anim] of Object.entries(rows)){
      if(anim.row!==ANIMATION_NAMES.indexOf(name))throw new TypeError('Battler action row mismatch '+name);
    }
    validated[key]=Object.freeze({src:spec.src,frameWidth:spec.frameWidth,
      frameHeight:spec.frameHeight,scale:spec.scale,animations:Object.freeze(rows)});
  }
  return Object.freeze(validated);
}
export function battleAnimationFrame(spec,name,elapsedSeconds) {
  const anim=spec.animations[name]||spec.animations.idle;
  const time=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
  const terminal=name==='down'||name==='victory';
  const hold=terminal||anim.holdLast===true||anim.loop===false;
  let frame=0;
  if(anim.durationsMs){
    // Use the exact v5 exposure boundaries rather than an averaged FPS.
    const total=anim.durationsMs.reduce((sum,ms)=>sum+ms,0);
    const position=hold?Math.min(time*1000,total):((time*1000)%total);
    let end=0;
    for(let index=0;index<anim.durationsMs.length;index++){
      end+=anim.durationsMs[index];
      if(position<end||index===anim.durationsMs.length-1){frame=index;break;}
    }
  }else{
    const index=Math.floor(time*anim.fps);
    frame=hold?Math.min(index,anim.frames-1):index%anim.frames;
  }
  return Object.freeze({x:frame*spec.frameWidth,
    y:anim.row*spec.frameHeight,width:spec.frameWidth,height:spec.frameHeight});
}

// Resolve presentation poses from the immutable combat snapshot; never alter battle rules.
// Terminal results override stale action cues, so defeated units cannot appear to attack.
export function sideViewPose(unit,side,status,cue=null,age=Infinity,actorDuration=.34,reactionDuration=.42,releaseAt=0) {
  if(!unit||!Number.isFinite(unit.hp))throw new TypeError('Invalid visual combatant');
  if(unit.hp<=0)return 'down';
  if(status==='victory'&&side==='party')return 'victory';
  if(status==='defeat'&&side==='enemy')return 'victory';
  if(cue&&age>=0&&age<actorDuration&&cue.actor===side+':'+unit.id)
    return ['pulse','repair','item'].includes(cue.kind)?'cast':
      cue.kind==='overload'?'attack':ANIMATION_NAMES.includes(cue.kind)?cue.kind:'idle';
  if(cue&&age>=releaseAt&&age<releaseAt+reactionDuration&&cue.target===side+':'+unit.id)
    return ['attack','pulse','overload','ranged'].includes(cue.kind)?'hit':'idle';
  return unit.guard?'guard':unit.chargeTarget?'charge':'idle';
}

// Build a presentation-only queue. Preserve actor recoil AND the full target
// reaction; repeated commands append after the current queue rather than erase it.
export function battleClipDuration(clip,fallback=.55){
  return clip?.durationsMs?clip.durationsMs.reduce((n,ms)=>n+ms,0)/1000:
    clip?clip.frames/clip.fps:fallback;
}
export function battleActionTimeline(actions,art,begin=0){
  if(!Array.isArray(actions))throw new TypeError('Expected ordered combat actions');
  let when=begin;
  return Object.freeze(actions.map(action=>{
    const pose=['pulse','repair','item'].includes(action.type)?'cast':
      action.type==='overload'?'attack':action.type;
    const clip=art[action.actor]?.animations[pose];
    const actorDuration=battleClipDuration(clip);
    const releaseAt=(clip?.releaseMs??0)/1000;
    const damaging=['attack','pulse','overload','ranged'].includes(action.type);
    const reactionDuration=damaging&&action.target?
      battleClipDuration(art[action.target]?.animations.hit,.42):0;
    const duration=Math.max(.36,actorDuration,releaseAt+reactionDuration);
    const entry=Object.freeze({actor:action.actor,target:action.target||null,
      kind:action.type,when,duration,actorDuration,reactionDuration,releaseAt});
    when+=duration+.04;
    return entry;
  }));
}

// Proportional per-slot bounds for real sheets. Geometry belongs to the stage,
// never to atlas crop bounds, so different cels cannot jitter or float.
export function battleSpriteBounds(slot,spec){
  const scale=Math.min(spec.scale,slot.cellHeight/spec.frameHeight,
    slot.cellWidth/spec.frameWidth);
  const height=Math.max(1,Math.floor(spec.frameHeight*scale));
  const width=Math.max(1,Math.floor(spec.frameWidth*scale));
  return Object.freeze({x:slot.x-Math.floor(width/2),y:slot.y-height,width,height});
}
