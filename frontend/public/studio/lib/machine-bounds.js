import {renderRig} from './machine-rig.js';
import {validateRig} from './rig-safety.js';
// Expands margins at fixed design scale; edited pixels follow the same root translation.
export function fitMachineProject(p){
 if(p.kind!=='machine')throw Error('Select a machine project');validateRig(p.rig);const r=p.rig,ow=r.w,oh=r.h;
 for(const s of Object.values(p.sets)){const k=Math.min(s.fw/ow,s.fh/oh);if(Math.abs(s.fw-ow*k)>1||Math.abs(s.fh-oh*k)>1)throw Error('Fit margins requires a proportional design canvas; keep the current custom canvas unchanged.');}
 let left=0,top=0,right=ow,bottom=oh;
 for(const s of Object.values(p.sets))for(const d of s.dirs)for(const a of s.anims)for(let i=0;i<a.frames;i++){
  const b=renderRig(null,r,d,a.type,i,a.frames,ow,oh,{boundsOnly:true});left=Math.min(left,b.left);top=Math.min(top,b.top);right=Math.max(right,b.right);bottom=Math.max(bottom,b.bottom);
 }
 // Even design margins retain integer registration at native, 1.5x and 2x export scales.
 const even=x=>Math.ceil(x/2)*2;const px=even(Math.max(-left,right-ow)),pt=even(-top),pb=even(bottom-oh);
 if(!px&&!pt&&!pb)return false;
 const nw=ow+2*px,nh=oh+pt+pb;if(nw>2048||nh>2048)throw Error('Fitted rig exceeds the 2048 design-pixel limit');
 // JSON cloning breaks shared preset references across views, just as project serialization does.
 const next=JSON.parse(JSON.stringify(r));next.w=nw;next.h=nh;
 for(const parts of Object.values(next.views))for(const part of parts)if(!part.p){part.x+=px;part.y+=pt;}
 if(next.unitSpec)next.unitSpec.offset={x:(next.unitSpec.offset?.x||0)+px,y:(next.unitSpec.offset?.y||0)+pt};
 const previous=r.groundAnchor||{x:ow/2,y:oh};next.groundAnchor={x:previous.x+px,y:previous.y+pt};
 for(const s of Object.values(p.sets)){
  const k=Math.min(s.fw/ow,s.fh/oh),fw=Math.round(nw*k),fh=Math.round(nh*k),dx=Math.round(px*k),dy=Math.round(pt*k),anchor=s.anchor||{x:previous.x*k,y:previous.y*k};
  for(const [key,old] of s.cells){const c=document.createElement('canvas');c.width=fw;c.height=fh;c.getContext('2d').drawImage(old,dx,dy);s.cells.set(key,c);}
  s.fw=fw;s.fh=fh;s.anchor={x:anchor.x+dx,y:anchor.y+dy};
 }
 p.rig=next;return {x:px,top:pt,bottom:pb};
}
