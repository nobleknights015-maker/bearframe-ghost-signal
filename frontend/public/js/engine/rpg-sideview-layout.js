// Side-view battle presentation contract for Aeon Circuit.
// Entirely visual: never mutates combat, inventory, quests or turn order.
// Native battle viewport: 416 × 116 pixels inside Ghost Signal's 480 × 270 UI.
export const BATTLE_VIEW=Object.freeze({width:416,height:116});
export const ANIMATION_NAMES=Object.freeze([
  'idle','attack','ranged','cast','guard','hit','down','victory','charge'
]);
const ALLY_SLOTS=Object.freeze([
  Object.freeze({x:68,y:106}),
  Object.freeze({x:119,y:110}),
  Object.freeze({x:68,y:65}),
  Object.freeze({x:119,y:76})
]);
const ENEMY_SLOTS=Object.freeze([
  Object.freeze({x:308,y:106}),
  Object.freeze({x:363,y:110}),
  Object.freeze({x:308,y:65}),
  Object.freeze({x:363,y:76}),
  Object.freeze({x:336,y:90}),
  Object.freeze({x:392,y:92})
]);
export function sideViewSlots(battle) {
  if(!battle||!Array.isArray(battle.party)||!Array.isArray(battle.enemies)||
    battle.party.length>4||battle.enemies.length>6)
    throw new TypeError('Side-view requires at most four active allies and six foes');
  const map=(units,side,slots)=>units.map((unit,index)=>{
    if(!unit||typeof unit.id!=='string')throw new TypeError('Invalid side-view combatant');
    return Object.freeze({key:side+':'+unit.id,side,index,...slots[index],facing:side==='party'?'right':'left'});
  });
  return Object.freeze([...map(battle.party,'party',ALLY_SLOTS),...map(battle.enemies,'enemy',ENEMY_SLOTS)]);
}
const assetPath=value=>typeof value==='string'&&
  /^assets\/battlers\/[a-zA-Z0-9/_-]+\.png$/.test(value)&&!value.includes('..');
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
      rows[name]=Object.freeze({row:anim.row,frames:anim.frames,fps:anim.fps});
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
  const elapsed=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
  const index=Math.floor(elapsed*anim.fps);
  // Terminal poses must hold their last frame instead of looping back to standing.
  const terminal=name==='down'||name==='victory';
  const frame=terminal?Math.min(index,anim.frames-1):index%anim.frames;
  return Object.freeze({x:frame*spec.frameWidth,
    y:anim.row*spec.frameHeight,width:spec.frameWidth,height:spec.frameHeight});
}

// Resolve presentation poses from the immutable combat snapshot; never alter battle rules.
// Terminal results override stale action cues, so defeated units cannot appear to attack.
export function sideViewPose(unit,side,status,cue=null,age=Infinity) {
  if(!unit||!Number.isFinite(unit.hp))throw new TypeError('Invalid visual combatant');
  if(unit.hp<=0)return 'down';
  if(status==='victory'&&side==='party')return 'victory';
  if(status==='defeat'&&side==='enemy')return 'victory';
  if(cue&&age>=0&&age<.34&&cue.actor===side+':'+unit.id)
    return ['pulse','repair','item'].includes(cue.kind)?'cast':
      cue.kind==='overload'?'attack':ANIMATION_NAMES.includes(cue.kind)?cue.kind:'idle';
  if(cue&&age>=0&&age<.42&&cue.target===side+':'+unit.id)
    return ['attack','pulse','overload'].includes(cue.kind)?'hit':'idle';
  return unit.guard?'guard':unit.chargeTarget?'charge':'idle';
}
