// Aeon Circuit side-view battle renderer: pure visual consumer of immutable rpg-combat states.
// The existing Ghost Signal renderer owns EXPLORATION; this canvas is battle-only.
// No third-party art or combat math. Until production sheets arrive, draw clearly marked
// schematic diagnostic units rather than pretending they are final character sprites.
import {BATTLE_VIEW,sideViewSlots,validateBattleArtManifest,battleAnimationFrame} from './rpg-sideview-layout.js';

const COL={bg:'#0b0d12',floor:'#20252b',wall:'#171c22',steel:'#46505a',red:'#ff3b30',
  text:'#dcd6d8',ally:'#a6c9d0',echo:'#91a8ae',foe:'#b26e6b',glow:'#f2bd75'};
const get=(battle,key)=>[...battle.party,...battle.enemies]
  .find(u=>u.side+':'+u.id===key);
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(h)));};
const line=(c,x,y,dx,dy,color)=>{rect(c,x,y,dx,dy,color);};
export function createSideViewBattleScene(manifest={}) {
  const art=validateBattleArtManifest(manifest);
  const canvas=document.createElement('canvas');
  canvas.id='rpg-sideview-field';canvas.width=BATTLE_VIEW.width;canvas.height=BATTLE_VIEW.height;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Side-view battle field: allies on the left, enemies on the right');
  canvas.setAttribute('data-testid','rpg-sideview-battle');
  canvas.style.cssText='display:block;max-width:100%;width:calc(var(--u) * 416);height:calc(var(--u) * 116);margin:auto;image-rendering:pixelated;border:calc(var(--u) * 1) solid #46505a;background:#0b0d12;flex-shrink:0';
  const c=canvas.getContext('2d',{alpha:false});
  c.imageSmoothingEnabled=false;
  const images={};
  for(const [key,spec] of Object.entries(art)){
    const img=new Image();images[key]={image:img,loaded:false};
    img.onload=()=>{images[key].loaded=img.naturalWidth>=spec.frameWidth&&
      img.naturalHeight>=spec.frameHeight*(Math.max(...Object.values(spec.animations).map(x=>x.row))+1);};
    img.onerror=()=>{images[key].loaded=false;};
    img.src=new URL('../../'+spec.src,import.meta.url).href;
  }
  let state=null,activeKey=null,cue=null,started=performance.now(),isRunning=false,frameToken=null;
  const elapsed=()=>Math.max(0,(performance.now()-started)/1000);
  function background(t) {
    rect(c,0,0,416,116,COL.bg);
    rect(c,0,0,416,55,COL.wall);
    for(let x=0;x<416;x+=64){
      rect(c,x,5,1,50,'#303942');
      rect(c,x+13,12,20,2,'#252d36');
      rect(c,x+40,23,17,1,'#30363e');
      rect(c,x+31,37,27,1,'#252d36');
    }
    rect(c,0,45,416,4,'#242b33');
    rect(c,0,51,416,65,COL.floor);
    for(let y=55;y<116;y+=14){rect(c,0,y,416,1,'#29313a');}
    for(let x=0;x<416;x+=32){
      rect(c,x,61+(x%3),1,55,'#313943');
      rect(c,x+13,92,9,1,'#323b44');
    }
    rect(c,194,56,2,60,'#55302e');
    rect(c,199,57,2,57,'#55302e');
    rect(c,3,4,410,1,COL.steel);
    rect(c,3,111,410,1,COL.steel);
    rect(c,4,13,34,1,COL.red);
    rect(c,379,13,32,1,COL.red);
    if((t*3|0)%2===0){rect(c,204,7,2,2,COL.red);}
    c.textAlign='center';
    c.font='6px monospace';c.fillStyle='#77808a';
    c.fillText('ALLY LINE',104,14);c.fillText('HOSTILE LINE',328,14);
    c.fillStyle='#8d7572';c.fillText('FIELD / QA VIEW',208,108);
  }
  function schematic(slot,unit,t,pose,selected){
    const {x,y,side,index}=slot;
    const active=selected?COL.red:side==='party'?COL.ally:COL.foe;
    const phase=Math.round(Math.sin(t*5+index)*1);
    let offset=0;
    if(pose==='attack'||pose==='ranged')offset=side==='party'?12:-12;
    if(pose==='hit')offset=(Math.floor(t*34)%2?2:-2);
    const X=x+offset,Y=y+phase;
    const isFoe=side==='enemy';
    const bright=isFoe?COL.foe:index===1?COL.echo:COL.ally;
    rect(c,X-16,Y-2,31,3,'#090b0d'); // floor shadow, locked to feet
    c.save();
    c.translate(Math.round(X),Math.round(Y));
    if(isFoe)c.scale(-1,1); // diagnostic units authored facing right by default
    // clearly schematic humanoid/robot silhouettes, to be swapped for real alpha sheets.
    rect(c,-9,-34,20,17,'#101418');  // torso depth
    rect(c,-7,-46,15,13,bright);     // head
    rect(c,-5,-43,10,5,'#101418');   // visor
    rect(c,1,-42,4,2,COL.red);
    rect(c,-12,-35,23,21,bright);
    rect(c,-7,-32,14,7,'#202a30');
    rect(c,-3,-29,8,3,isFoe?COL.red:'#b9e2eb'); // old-core diagnostic stripe
    rect(c,-13,-34,4,18,'#71828d');
    rect(c,9,-34,4,18,'#71828d');
    if(pose==='attack'||pose==='ranged'){
      rect(c,10,-34,15,4,isFoe?'#f2bd75':'#dcd6d8');
      rect(c,22,-36,4,8,COL.red);
    } else if(pose==='guard'){
      rect(c,8,-37,11,24,'#8eabb2');rect(c,10,-34,6,18,'#3d555c');
    }
    rect(c,-9,-14,7,14,'#66737b');rect(c,3,-14,7,14,'#66737b');
    rect(c,-11,-3,10,3,'#222a30');rect(c,3,-3,10,3,'#222a30');
    if(unit.hp<=0){c.fillStyle='#0c0d10';c.globalAlpha=.6;c.fillRect(-14,-47,30,48);}
    c.restore();
    c.textAlign='center';c.font='6px monospace';c.fillStyle=selected?COL.red:COL.text;
    c.fillText((unit.name||unit.id).toUpperCase().slice(0,15),x,y+8);
  }
  function sheet(slot,spec,unit,t,pose,selected){
    const record=images[slot.key];
    if(!record?.loaded)return false;
    const frame=battleAnimationFrame(spec,pose,t);
    const height=Math.min(86,spec.frameHeight*spec.scale),scale=height/spec.frameHeight;
    const width=spec.frameWidth*scale;
    let nudge=0;
    if(pose==='attack'||pose==='ranged')nudge=slot.side==='party'?12:-12;
    if(pose==='hit')nudge=(Math.floor(t*24)%2?2:-2);
    c.save();
    c.translate(Math.round(slot.x+nudge),Math.round(slot.y));
    if(slot.side==='enemy')c.scale(-1,1);
    c.drawImage(record.image,frame.x,frame.y,frame.width,frame.height,
      -Math.round(width/2),-Math.round(height),Math.round(width),Math.round(height));
    c.restore();
    c.textAlign='center';c.font='6px monospace';c.fillStyle=selected?COL.red:COL.text;
    c.fillText((unit.name||unit.id).toUpperCase().slice(0,15),slot.x,slot.y+8);
    return true;
  }
  function cues(slots,t){
    if(!cue)return;
    const age=t-cue.when;
    if(age<0||age>.68){if(age>.68)cue=null;return;}
    const target=slots.find(x=>x.key===cue.target);
    const from=slots.find(x=>x.key===cue.actor);
    const spread=Math.round(age*10);
    if(target&&(cue.kind==='attack'||cue.kind==='pulse'||cue.kind==='overload')){
      const col=cue.kind==='pulse'?'#a8e9ff':cue.kind==='overload'?COL.red:COL.glow;
      rect(c,target.x-15-spread,target.y-39-spread,30+spread*2,2,col);
      rect(c,target.x-15-spread,target.y-39-spread,2,37+spread*2,col);
      rect(c,target.x+14+spread,target.y-39-spread,2,37+spread*2,col);
    }
    if(from&&cue.kind==='guard')rect(c,from.x-23,from.y-57,46,3,COL.glow);
    if(target&&(cue.kind==='repair'||cue.kind==='item')){
      for(let i=0;i<5;i++)rect(c,target.x-17+i*8,target.y-44+Math.sin(age*9+i)*7,3,3,'#7dffb0');
    }
    if(from&&cue.kind==='charge'){
      rect(c,from.x-16,from.y-56,32,2,COL.red);
      rect(c,from.x-12,from.y-60,24,2,COL.glow);
    }
  }
  function draw(now){
    const t=(now-started)/1000;
    background(t);
    if(!state)return;
    const slots=sideViewSlots(state);
    for(const slot of slots){
      const unit=get(state,slot.key);
      const active=activeKey===slot.key;
      if(active&&unit.hp>0){rect(c,slot.x-18,slot.y+11,36,1,COL.red);}
      const delta=cue?t-cue.when:1e5;
      const pose=unit.hp===0?'down':
        cue&&delta>=0&&delta<.34&&cue.actor===slot.key?cue.kind:
        cue&&delta>=0&&delta<.42&&cue.target===slot.key?
          (cue.kind==='attack'||cue.kind==='pulse'||cue.kind==='overload'?'hit':'idle'):
        unit.guard?'guard':unit.chargeTarget?'charge':'idle';
      if(!(art[slot.key]&&sheet(slot,art[slot.key],unit,t,pose,active)))
        schematic(slot,unit,t,pose,active);
      const fill=Math.round(30*Math.max(0,unit.hp)/unit.maxHp);
      rect(c,slot.x-15,slot.y-52,30,3,'#070809');
      rect(c,slot.x-15,slot.y-52,fill,2,unit.hp>unit.maxHp*.35?'#7dffb0':'#ff3b30');
    }
    cues(slots,t);
    c.fillStyle='#dcd6d8';c.font='7px monospace';c.textAlign='center';
    c.fillText('VS',210,44);
    c.fillStyle='#97949c';c.font='6px monospace';
    c.fillText('SIDE-VIEW QA — PRODUCTION ART PENDING',208,21);
  }
  function tick(now) {
    if(!isRunning)return;
    if(canvas.isConnected&&!canvas.closest('.hidden'))draw(now);
    frameToken=requestAnimationFrame(tick);
  }
  function start(){
    if(isRunning)return;
    isRunning=true;frameToken=requestAnimationFrame(tick);
  }
  function stop(){isRunning=false;if(frameToken!==null)cancelAnimationFrame(frameToken);frameToken=null;}
  return Object.freeze({
    canvas,
    setBattle(battle,actor){
      state=battle;activeKey=actor;
      canvas.setAttribute('aria-label','Side-view battle: '+battle.party.length+
        ' allied frames left, '+battle.enemies.length+' enemies right');
      draw(performance.now());start();
    },
    playAction(action){
      cue={actor:action.actor,target:action.target||null,
        kind:action.type,when:elapsed()};
    },
    get layout(){return state?sideViewSlots(state):[];},
    stop
  });
}
