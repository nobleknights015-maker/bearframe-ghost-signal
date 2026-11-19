// Optional humanoid Echo/Ghost Grid arrays. Rings are rear-layer native pixels.
// Transparent canvas margins preserve body scale and the bottom-center anchor.
export const RING_STYLES=['none','halo','segmented','broken','orbit','double'];
export const RING_SIZES=['compact','standard','large'];
export const RING_MOTIONS=['steady','pulse','drift'];
const TAU=Math.PI*2;
const tone=(hex,f)=>{const n=parseInt(hex.slice(1),16),t=f>0?255:0,a=Math.abs(f);return '#'+[16,8,0].map(s=>Math.round(((n>>s)&255)*(1-a)+t*a).toString(16).padStart(2,'0')).join('');};
const level=v=>Math.max(0,Math.min(3,Number(v)||0));
function arrays(cfg,dir,pose={}){
  if(!RING_STYLES.includes(cfg.ring)||cfg.ring==='none')return [];
  const side=dir==='left'||dir==='right',r={compact:8,standard:11,large:14}[cfg.ringSize]||11;
  const drift=cfg.ringMotion==='drift'?Math.sin(pose.ph||0)*.35:0;
  const cx=side?10.5:16,cy=4+(pose.b||0)+drift;
  const vertical={cx,cy,rx:side?r*.36:r,ry:r,roll:side?-.10:0};
  if(cfg.ring==='orbit')return [{cx,cy:cy-1,rx:side?r*.65:r+2,ry:side?r*.7:r*.36,roll:side?.24:-.28}];
  if(cfg.ring==='double')return [{...vertical,rx:side?(r+2)*.36:r+2,ry:r+2},{cx,cy:cy-1,rx:side?r*.6:r,ry:side?r*.66:r*.38,roll:side?.22:-.30}];
  return [vertical];
}
export function ringPadding(cfg){
  let x=0,top=0;
  for(const dir of ['down','right'])for(const a of arrays(cfg,dir)){
    const co=Math.cos(a.roll),si=Math.sin(a.roll);
    const ex=Math.hypot(a.rx*co,a.ry*si),ey=Math.hypot(a.rx*si,a.ry*co);
    // Outline, up to two design pixels of attack/malfunction lean, and side tags need clear margins.
    const extra=cfg.ringTags?5:4;
    x=Math.max(x,Math.ceil(ex-a.cx+extra),Math.ceil(a.cx+ex-32+extra));
    top=Math.max(top,Math.ceil(ey-a.cy+2.5));
  }
  return {x:Math.max(0,x),top:Math.max(0,top)};
}
export function fitRingCanvas(project,resizeSet){
  if(project.kind!=='humanoid')return false;
  const cfg=project.cfg,old=cfg.ringPadding||{x:0,top:0},need=ringPadding(cfg);
  const next={x:Math.max(old.x||0,need.x),top:Math.max(old.top||0,need.top)};
  if(next.x===(old.x||0)&&next.top===(old.top||0))return false;
  for(const set of Object.values(project.sets)){
    const k=cfg.ringScales?.[set.fw+'x'+set.fh]??Math.min(set.fw/(32+2*(old.x||0)),set.fh/(56+(old.top||0)));
    // Even horizontal growth keeps the old bottom-center pixel registration exact,
    // including custom, fractional design scales such as a 40x70 frame.
    const fw=set.fw+2*Math.ceil((next.x-(old.x||0))*k),fh=set.fh+Math.ceil((next.top-(old.top||0))*k);
    resizeSet(set,fw,fh);cfg.ringScales??={};cfg.ringScales[fw+'x'+fh]=k;
  }
  // Never auto-shrink a canvas: edits in the transparent margins must survive.
  cfg.ringPadding=next;return true;
}
export function drawRings(c,cfg,dir,pose,{K,X,Y}){
  const list=arrays(cfg,dir,pose);if(!list.length)return;
  const metal=cfg.colors.ringMaterial||cfg.colors.armor,glow=cfg.colors.ringGlow||cfg.colors.glow;
  const bright=tone(metal,.38),dark=tone(metal,-.48),rust=cfg.colors.rust||'#816347';
  const segments=Math.max(6,Math.min(16,Math.round(Number(cfg.ringSegments)||10)));
  const damage=level(cfg.ringDamage),light=cfg.ringGlow==null?2:level(cfg.ringGlow);
  const pulse=cfg.ringMotion==='pulse'?Math.sin(pose.ph||0):0;
  const segmentAt=turn=>{
    turn-=Math.floor(turn);const s=Math.floor(turn*segments),f=turn*segments-s;
    const broken=cfg.ring==='broken'?Math.max(1,damage):damage;
    if((cfg.ring!=='halo'&&(f<.09||f>.91))||(broken&&(s%7===2||(broken>=2&&s%5===4)||(broken>=3&&s%4===1))))return null;
    return {s,f,broken};
  };
  for(let index=0;index<list.length;index++){
    const width=Math.max(1,Math.min(3,Number(cfg.ringWidth)||2));
    const a=list[index],co=Math.cos(a.roll),si=Math.sin(a.roll),th=index?Math.max(1,width*.75):width+(['segmented','broken'].includes(cfg.ring)?.3:0);
    const ex=Math.hypot(a.rx*co,a.ry*si),ey=Math.hypot(a.rx*si,a.ry*co);
    for(let py=Y(a.cy-ey-1);py<Y(a.cy+ey+1);py++)for(let px=X(a.cx-ex-1);px<X(a.cx+ex+1);px++){
      const dx=(px+.5-X(a.cx))/K,dy=(py+.5-Y(a.cy))/K;
      const u=co*dx+si*dy,v=-si*dx+co*dy;
      const q=(u/a.rx)**2+(v/a.ry)**2,inner=(u/Math.max(.5,a.rx-th))**2+(v/Math.max(.5,a.ry-th))**2;
      if(q>1||inner<1)continue;
      const part=segmentAt(Math.atan2(v/a.ry,u/a.rx)/TAU);if(!part)continue;
      const {s,f,broken}=part;
      const band=(1-Math.sqrt(q))/(1-Math.sqrt(q)+Math.sqrt(inner)-1+1e-6);
      let color=u/a.rx+v/a.ry<-.15?bright:metal;
      if(band<.13||band>.86)color=dark;
      if(light&&s%3===0&&f>.23&&f<.77&&band>.23&&band<.78)color=tone(glow,light===1?-.35:light===3||pulse>.4?.3:0);
      else if(broken>=2&&(s%3===1)&&f<.33)color=rust;
      c.fillStyle=color;c.fillRect(px,py,1,1);
    }
    if(cfg.ringTags&&index===0)for(const sign of [-1,1]){
      const u=sign*a.rx*.84,v=a.ry*.48;if(!segmentAt(Math.atan2(v/a.ry,u/a.rx)/TAU))continue;
      const x=a.cx+co*u-si*v,y=a.cy+si*u+co*v;
      c.fillStyle=dark;c.fillRect(X(x),Y(y),Math.max(1,Math.round(K)),Math.max(1,Math.round(4*K)));
      c.fillStyle=metal;c.fillRect(X(x-.6),Y(y+3),Math.max(1,Math.round(2*K)),Math.max(1,Math.round(3*K)));
      if(light){c.fillStyle=glow;c.fillRect(X(x),Y(y+4),Math.max(1,Math.round(K)),Math.max(1,Math.round(K)));}
    }
  }
}
