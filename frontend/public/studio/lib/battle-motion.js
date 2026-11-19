import {solveTwoBone} from './rig-safety.js';
const DIRS=['down','up','right','left'],RAD=Math.PI/180;
const zero={drop:0,travel:0,la:0,lb:0,ra:0,rb:0,spread:0,bow:0,light:.6};
const K=(at,p={})=>({...zero,...p,at});
// Authored pose-to-pose actions. Angles are physical sagittal angles, not screen rotations.
// Their projected chains are reconstructed independently for each authored camera view.
const strikes={
 bulwark:[K(0),K(3,{drop:2,travel:-2,la:-12,lb:20}),K(6,{drop:3,la:30,lb:25}),K(7,{drop:4,travel:4,la:65,lb:20,ra:12,rb:18}),K(8,{drop:4,travel:4,la:60,lb:25}),K(11,{drop:2,la:25,lb:15}),K(15)],
 breaker:[K(0),K(3,{drop:2,ra:48,rb:35,light:.75}),K(6,{drop:3,ra:65,rb:20,la:18,lb:25,light:1}),K(7,{drop:3,ra:65,rb:20,la:18,lb:25,light:1}),K(8,{drop:4,travel:-3,ra:48,rb:28,bow:-5,light:.8}),K(11,{drop:2,ra:35,rb:20}),K(15)],
 keeper:[K(0),K(3,{drop:1,la:28,lb:35,ra:28,rb:35}),K(6,{drop:2,la:55,lb:25,ra:55,rb:25,spread:2,light:.85}),K(7,{drop:2,travel:1,la:65,lb:20,ra:65,rb:20,spread:3,light:1}),K(9,{drop:2,la:52,lb:30,ra:52,rb:30,light:.8}),K(12,{drop:1,la:25,lb:20,ra:25,rb:20}),K(15)],
 surveyor:[K(0),K(3,{drop:1,ra:20,rb:40,bow:8}),K(6,{drop:2,ra:60,rb:25,la:10,lb:20,light:.85}),K(7,{drop:2,travel:2,ra:72,rb:12,la:12,lb:20,light:1}),K(9,{drop:2,ra:58,rb:25,light:.8}),K(12,{drop:1,ra:25,rb:25}),K(15)],
 archive:[K(0),K(3,{la:8,ra:8,lb:-10,rb:-10,bow:6,light:.7}),K(6,{la:22,ra:22,lb:-25,rb:-25,spread:3,light:1}),K(7,{la:26,ra:26,lb:-30,rb:-30,spread:4,light:1}),K(9,{drop:2,la:18,ra:18,lb:-20,rb:-20,light:.8}),K(12,{la:8,ra:8,lb:-8,rb:-8}),K(15)],
 relay:[K(0),K(3,{ra:12,rb:-10,la:-6,lb:8,bow:8,light:.7}),K(6,{ra:32,rb:-30,la:8,lb:-12,spread:2,light:1}),K(7,{ra:40,rb:-36,la:12,lb:-15,spread:3,light:1}),K(9,{drop:2,ra:24,rb:-20,la:5,lb:-5,light:.8}),K(12,{ra:10,rb:-8}),K(15)]
};
const downPose=role=>['archive','relay'].includes(role)?{drop:12,la:-18,ra:-12,lb:18,rb:12,bow:24,light:0}:{drop:['bulwark','breaker'].includes(role)?18:16,travel:2,la:20,ra:25,lb:45,rb:40,bow:28,light:0};
function timeline(role,type){
 const heavy=['bulwark','breaker'].includes(role),suspended=['archive','relay'].includes(role);
 if(type==='attack')return strikes[role];
 if(type==='defeat')return [K(0),K(3,{drop:2,bow:-5,light:.45}),K(6,{...downPose(role),drop:downPose(role).drop*.45,light:.3}),K(11,downPose(role)),K(15,downPose(role))];
 if(type==='recover')return [K(0,downPose(role)),K(3,downPose(role)),K(7,{...downPose(role),drop:downPose(role).drop*.6,light:.3}),K(12,{drop:2,bow:8,light:.5}),K(15)];
 if(type==='hurt')return [K(0),K(2,{drop:heavy?3:2,travel:-2,bow:-10,la:-8,ra:-8,light:.4}),K(4,{drop:heavy?2:1,travel:-1,bow:-5,la:-4,ra:-4,light:.5}),K(9),K(15)];
 if(type==='malfunction')return [K(0),K(3,{ra:8,rb:12,bow:4,light:.4}),K(4,{ra:8,rb:12,bow:4,light:.4}),K(5,{ra:-4,rb:28,bow:4,light:.35}),K(6,{ra:-4,rb:28,bow:4,light:.35}),K(8,{ra:4,rb:8,light:.5}),K(12),K(15)];
 if(type==='charge'){const p=strikes[role].find(k=>k.at===6);return [K(0),K(4,{...p,light:.7}),K(7,{...p,light:1}),K(10,{...p,light:1}),K(13,{...p,la:p.la*.4,ra:p.ra*.4,lb:p.lb*.4,rb:p.rb*.4,drop:p.drop*.4,spread:p.spread*.4,light:.75}),K(15)];}
 if(type==='guard'){
  const p=role==='bulwark'?{drop:4,la:60,lb:25,ra:15,rb:25}:role==='breaker'?{drop:4,la:52,lb:38,ra:20,rb:35}:suspended?{la:16,ra:16,lb:-18,rb:-18,spread:2,light:.8}:{drop:2,la:50,lb:35,ra:50,rb:35,spread:2,light:.8};
  return [K(0),K(4,p),K(10,p),K(13,{...p,drop:(p.drop||0)*.4,la:p.la*.4,ra:p.ra*.4,lb:p.lb*.4,rb:p.rb*.4,spread:(p.spread||0)*.4}),K(15)];
 }
 return null;
}
export function battlePose(role,type,i,n){
 const keys=timeline(role,type);if(!keys)return null;const at=Math.max(0,Math.min(15,n>1?i/(n-1)*15:15));let a=keys[0],b=keys.at(-1);
 for(let j=1;j<keys.length;j++)if(at<=keys[j].at){a=keys[j-1];b=keys[j];break;}
 const u=a.at===b.at?0:Math.max(0,Math.min(1,(at-a.at)/(b.at-a.at))),s=u*u*(3-2*u),p={};for(const k of Object.keys(zero))p[k]=a[k]+(b[k]-a[k])*s;return p;
}
const eventFor={bulwark:'shield.impact',breaker:'cannon.emit',keeper:'seal.emit',surveyor:'probe.emit',archive:'lantern.emit',relay:'relay.emit'};
export function battleClips(role){
 if(!strikes[role])throw Error('Unsupported battle role');
 const clip=(name,events,durations)=>({name,type:name,frames:16,fps:12,loop:false,durationsMs:durations||[100,80,80,120,90,90,180,80,100,90,90,100,100,100,100,140],events:events.map(([frame,name])=>({frame,name}))});
 return [{name:'idle',type:'idle',frames:8,fps:6,loop:true},
 clip('attack',[[3,'anticipation'],[7,eventFor[role]],[15,'action.complete']]),
 clip('charge',[[7,'charge.ready'],[13,'charge.release'],[15,'action.complete']]),
 clip('guard',[[4,'guard.ready'],[11,'guard.release'],[15,'action.complete']]),
 clip('hurt',[[2,'reaction.peak'],[15,'action.complete']],[60,60,120,90,90,90,90,90,90,90,90,90,90,90,90,140]),
 clip('malfunction',[[3,'fault.begin'],[8,'fault.recover'],[15,'action.complete']]),
 clip('defeat',[[11,'unit.down']],[100,80,80,100,100,100,120,120,120,120,120,180,140,140,140,300]),
 clip('recover',[[3,'unit.restart'],[15,'unit.ready']])];
}
const SOCKETS={bulwark:{part:'shield.L',x:0,y:13},breaker:{part:'cannon.R.lens',x:0,y:0},keeper:{part:'hand.R',x:0,y:5},surveyor:{part:'probe.R',x:0,y:11},archive:{part:'lantern',x:0,y:20},relay:{part:'arm.R.fore',x:0,y:27}};
export function addBattleLibrary(rig){
 const role=rig.worldSpec.role;rig.battleSpec={version:1,role,sockets:[{name:'action.origin',...SOCKETS[role]}],eventSockets:{[eventFor[role]]:'action.origin'},poses:{attack:['neutral','neutral'],charge:['neutral','neutral'],guard:['neutral','neutral'],hurt:['neutral','neutral'],malfunction:['neutral','neutral'],defeat:['neutral','down'],recover:['down','neutral']}};rig.clips.battle=battleClips(role);for(const c of rig.clips.battle)if(c.type!=='idle')rig.anims[c.type]={};return rig;
}
const angle=(a,b)=>Math.atan2(-(b.x-a.x),b.y-a.y)/RAD;
function applyChain(map,label,hip,knee,wrist,kind){
 const upper=map.get('arm.'+label+'.upper'),fore=map.get('arm.'+label+'.fore'),u=angle(hip,knee),g=angle(knee,wrist),ul=Math.hypot(knee.x-hip.x,knee.y-hip.y),ll=Math.hypot(wrist.x-knee.x,wrist.y-knee.y);
 upper.r=u;upper.h=ul;fore.y=ul;fore.r=g-u;fore.h=ll;
 const joint=map.get('arm.'+label+(kind==='suspended'?'.joint':'.elbow'));if(joint)joint.y=ul;
 const hand=map.get('hand.'+label);if(hand)hand.y=ll-(kind==='heavy'?1:0);
 for(const part of map.values())if(part.id.startsWith('claw.'+label+'.'))part.y=ll-1;
 return {g,ul,ll,hip,knee,wrist};
}
function bipedLegs(rig,map,p,dir,base){
 const root=map.get('torso'),pelvis=map.get('pelvis'),side=['right','left'].includes(dir),sign=dir==='left'?-1:1,facing=dir==='up'?-1:1,diagnostics=[];
 if(p.drop===0&&p.travel===0)return diagnostics;
 for(const [label,sg] of [['L',-1],['R',1]]){
  const upper=map.get('leg.'+label+'.upper'),lower=map.get('leg.'+label+'.shin'),boot=map.get('leg.'+label+'.foot'),l1=upper.h,l2=lower.h,baseHipY=base.y+pelvis.y+upper.y,baseHipX=base.x+pelvis.x+upper.x;
  const q=solveTwoBone({x:0,y:baseHipY+p.drop},{x:-p.travel,y:baseHipY+l1+l2},l1,l2,1),hip={x:root.x+pelvis.x+upper.x,y:root.y+pelvis.y+upper.y};
  const knee=side?{x:hip.x+sign*q.knee.x,y:q.knee.y}:{x:baseHipX+(facing===-1?sg:-sg)*q.knee.x*.06,y:q.knee.y+facing*(q.knee.x+p.travel)*.28};
  const ankle=side?{x:hip.x+sign*q.ankle.x,y:q.ankle.y}:{x:baseHipX,y:q.ankle.y+facing*(q.ankle.x+p.travel)*.28};
  const u=angle(hip,knee),g=angle(knee,ankle),ul=Math.hypot(knee.x-hip.x,knee.y-hip.y),ll=Math.hypot(ankle.x-knee.x,ankle.y-knee.y);upper.r=u;upper.h=ul;lower.y=ul;lower.r=g-u;lower.h=ll;
  const kp=map.get('leg.'+label+'.knee');if(kp)kp.y=ul;
  const toe=boot.x,rad=g*RAD;boot.x=Math.cos(rad)*toe;boot.y=ll-Math.sin(rad)*toe;boot.r=-g;
  diagnostics.push({label,...q,screenAnkle:ankle,soleY:ankle.y+boot.h});
 }
 return diagnostics;
}
export function evaluateBattle(rig,dir,type,i,n){
 if(rig.battleSpec?.version!==1||!DIRS.includes(dir))return null;
 const p=battlePose(rig.battleSpec.role,type,i,n);if(!p)return null;
 const parts=structuredClone(rig.views[dir]);if(!parts)throw Error('Battle action requires an authored view');const map=new Map(parts.map(p=>[p.id,p])),family=rig.worldSpec.family,heavy=family==='heavy-biped',suspended=!['heavy-biped','slender-biped'].includes(family),side=['right','left'].includes(dir),sign=dir==='left'?-1:1,facing=dir==='up'?-1:1,root=map.get(suspended?'root':'torso'),base={x:root.x,y:root.y},poseGlow={};
 root.x+=side?sign*p.travel:0;root.y+=p.drop+(side?0:facing*p.travel*.28);
 const legs=suspended?[]:bipedLegs(rig,map,p,dir,base),arms=[];
 const head=map.get('head');head.r=(head.r||0)+(side?sign*p.bow:0);if(!side)head.y+=Math.sin(p.bow*RAD)*3;
 for(const [label,sg] of [['L',-1],['R',1]]){
  const upper=map.get('arm.'+label+'.upper'),fore=map.get('arm.'+label+'.fore'),a=(label==='L'?p.la:p.ra)*RAD,b=(label==='L'?p.lb:p.rb)*RAD;
  // Suspended manipulators keep their unequal authored rest angles and bone lengths.
  const restU=suspended?(upper.r||0):0,restF=suspended?(fore.r||0):0;
  const sgn=suspended?(side?sign:(facing===-1?sg:-sg)):sign;
  if(suspended){upper.r=restU-sgn*(label==='L'?p.la:p.ra);fore.r=restF-sgn*(label==='L'?p.lb:p.rb);arms.push({label,l1:upper.h,l2:fore.h});continue;}
  const shoulder=map.get('shoulder.'+label),hip={x:root.x+shoulder.x+upper.x,y:root.y+shoulder.y+upper.y},z1=Math.sin(a)*upper.h,y1=Math.cos(a)*upper.h,z2=z1+Math.sin(a+b)*fore.h,y2=y1+Math.cos(a+b)*fore.h,physical=(facing===-1?sg:-sg),spread=p.spread;
  const knee=side?{x:hip.x+sign*z1,y:hip.y+y1}:{x:hip.x+physical*spread*.5,y:hip.y+y1+facing*z1*.28},wrist=side?{x:hip.x+sign*z2,y:hip.y+y2}:{x:hip.x+physical*spread,y:hip.y+y2+facing*z2*.28};
  const chain=applyChain(map,label,hip,knee,wrist,heavy?'heavy':'slender');arms.push({label,l1:rig.views[dir].find(q=>q.id===upper.id).h,l2:rig.views[dir].find(q=>q.id===fore.id).h,projected:chain});
  // Raised rear-view arms reach away from the camera, behind the torso and rear cloth.
  if(!side&&facing===-1&&(a!==0||b!==0)){for(const part of parts)if(part.id.startsWith('arm.'+label+'.')||part.id.startsWith('hand.'+label)||part.id.startsWith('finger.'+label+'.')||part.id.startsWith('probe.'+label)||part.id.startsWith('shield.'+label)||part.id.startsWith('cannon.'+label))part.z=-2;}
  if(heavy&&label==='L'&&map.has('shield.L')&&(a!==0||b!==0)){
   const sh=map.get('shield.L'),g=chain.g*RAD,effort=Math.min(1,Math.abs(a+b)/(85*RAD));
   sh.r=-(chain.g)*effort;
   // Shield covers wrist/forearm; blend from its original socket into an upright brace.
   const dx=(side?-sign*3:0),dy=-14,wx=chain.wrist.x-chain.knee.x+dx,wy=chain.wrist.y-chain.knee.y+dy;
   const xx=Math.cos(g)*wx+Math.sin(g)*wy,yy=-Math.sin(g)*wx+Math.cos(g)*wy;sh.x+=(xx-sh.x)*effort;sh.y+=(yy-sh.y)*effort;
  }
  if(heavy&&label==='R'&&map.has('cannon.R')&&(type==='attack'||type==='charge')){const c=map.get('cannon.R'),effort=Math.min(1,Math.abs(a+b)/(85*RAD));c.r=-chain.g*effort;const g=chain.g*RAD,dx=chain.wrist.x-chain.knee.x+(side?sign*11:0),dy=chain.wrist.y-chain.knee.y+(side?0:facing*2);const xx=Math.cos(g)*dx+Math.sin(g)*dy,yy=-Math.sin(g)*dx+Math.cos(g)*dy;c.x+=(xx-c.x)*effort;c.y+=(yy-c.y)*effort;if(dir==='up'&&effort>0)map.get('cannon.R.lens').z=-3;}
 }
 for(const id of ['core','optic','back.node','cannon.R.lens','lantern','optic.small','archive.port'])if(map.has(id))poseGlow[id]=p.light;
 const at=n>1?i/(n-1)*15:15,socket=rig.battleSpec.sockets?.[0];
 if(type==='attack'&&at>=7&&at<9&&socket){
  const power=1-(at-7)/2,size=(rig.battleSpec.role==='archive'?30:rig.battleSpec.role==='keeper'?19:12)*power,z=(map.get(socket.part).z||0)+2;
  parts.push({id:'battle.fx.outer',p:socket.part,s:'ring',x:socket.x,y:socket.y,w:size,h:size,ox:size/2,oy:size/2,th:Math.max(1,size*.1),seg:8,c:'accent',g:'glow',wx:0,z},
   {id:'battle.fx.core',p:socket.part,s:'disc',x:socket.x,y:socket.y,w:Math.max(2,size*.35),h:Math.max(2,size*.35),ox:Math.max(2,size*.35)/2,oy:Math.max(2,size*.35)/2,g:'glow',wx:0,z:z+.1});
 }
 // Freeze decorative material phase on one-shots: exact endpoint poses remain stable.
 return {...rig,views:{[dir]:parts},anims:{...rig.anims,[type]:{}},materialPhase:0,poseGlow,battlePose:{role:rig.battleSpec.role,type,pose:p,legs,arms}};
}
