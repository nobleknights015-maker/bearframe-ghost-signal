import {solveTwoBone} from './rig-safety.js';
const TAU=2*Math.PI,DUTY=.62,SPAN=14;
export const SLENDER_GAIT={version:1,dutyFactor:DUTY,strideLength:SPAN/DUTY,cycleFrames:12,fps:9,projection:.28};
// Narrow, deliberate steps. The return matches stance velocity at both contacts.
export function slenderStep(phase){
 const p=((phase%1)+1)%1;
 if(p<DUTY)return {x:SPAN/2-SPAN*p/DUTY,lift:0,stance:true};
 const u=(p-DUTY)/(1-DUTY),m=-SPAN*(1-DUTY)/DUTY;
 return {x:(2*u**3-3*u*u+1)*(-SPAN/2)+(u**3-2*u*u+u)*m+(-2*u**3+3*u*u)*(SPAN/2)+(u**3-u*u)*m,lift:56*u*u*(1-u)*(1-u),stance:false};
}
const angle=(a,b)=>Math.atan2(-(b.x-a.x),b.y-a.y)*180/Math.PI;
export function evaluateSlender(rig,dir,type,i,n){
 if(type!=='walk'||rig.locomotion?.controller!=='slender-v1')return rig;
 const parts=structuredClone(rig.views[dir]);if(!parts)throw Error('Slender unit requires an authored view');
 const map=new Map(parts.map(p=>[p.id,p])),root=map.get('torso'),pelvis=map.get('pelvis'),base={x:root.x,y:root.y},t=n>0?i/n:0,side=['right','left'].includes(dir),sign=dir==='left'?-1:1,back=dir==='up';
 root.y+=1.5+.3*Math.cos(t*TAU*2);const sway=side?0:.35*Math.sin(t*TAU);root.x+=sway;
 const diagnostics=[];
 for(const [label,sg] of [['L',-1],['R',1]]){
  const upper=map.get('leg.'+label+'.upper'),lower=map.get('leg.'+label+'.shin'),boot=map.get('leg.'+label+'.foot'),step=slenderStep(t+(label==='R'?.5:0)),l1=upper.h,l2=lower.h;
  const hip={x:root.x+pelvis.x+upper.x,y:root.y+pelvis.y+upper.y},targetX=base.x+pelvis.x+upper.x,ankleY=base.y+pelvis.y+upper.y+l1+l2-step.lift;
  const q=solveTwoBone({x:0,y:hip.y},{x:step.x,y:ankleY},l1,l2,1);
  const project=side?{hip,knee:{x:hip.x+sign*q.knee.x,y:q.knee.y},ankle:{x:targetX+sign*q.ankle.x,y:q.ankle.y}}:{hip,knee:{x:targetX+sway*.5+(back?sg:-sg)*q.knee.x*.06,y:q.knee.y+(back?-1:1)*q.knee.x*SLENDER_GAIT.projection},ankle:{x:targetX,y:q.ankle.y+(back?-1:1)*q.ankle.x*SLENDER_GAIT.projection}};
  const u=angle(project.hip,project.knee),g=angle(project.knee,project.ankle),ul=Math.hypot(project.knee.x-hip.x,project.knee.y-hip.y),ll=Math.hypot(project.ankle.x-project.knee.x,project.ankle.y-project.knee.y);
  upper.r=u;upper.h=ul;lower.y=ul;lower.r=g-u;lower.h=ll;
  const toeOffset=boot.x,rad=g*Math.PI/180;boot.x=Math.cos(rad)*toeOffset;boot.y=ll-Math.sin(rad)*toeOffset;boot.r=-g;
  const arm=map.get('arm.'+label+'.upper'),fore=map.get('arm.'+label+'.fore'),phase=t*TAU+(label==='R'?Math.PI:0),loaded=label==='R'&&rig.worldSpec.role==='surveyor',amp=loaded?3:9;
  arm.r=side?sign*Math.cos(phase)*amp:(back?sg:-sg)*(2+Math.cos(phase)*amp*.25);fore.r=(side?sign:(back?sg:-sg))*(5+Math.cos(phase-.2)*(loaded?1:2));
  // Use a closed material cycle only for this new walk, preserving idle/saved art.
  map.get('waist.cloth.'+label).closedLoop=true;
  diagnostics.push({limb:label,stance:step.stance,step,hip:q.hip,knee:q.knee,ankle:q.ankle,l1,l2,clamped:q.clamped,screenAnkle:project.ankle,soleY:project.ankle.y+boot.h});
 }
 return {...rig,views:{[dir]:parts},anims:{...rig.anims,walk:{}},slenderPose:diagnostics};
}
