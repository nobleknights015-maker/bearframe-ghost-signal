import {evaluateGrid} from './grid-families.js';
import {solveTwoBone,validateRig} from './rig-safety.js';
const TAU=2*Math.PI,P=(id,p,s,x,y,w,h,o={})=>({id,p,s,x,y,w,h,...o});
export function industrialEcho(options={}){
 const spec={version:1,family:'legacy-industrial-biped',role:'survey',optic:'cluster',hunch:14,cloth:true,...options};
 if(spec.version!==1||!['survey','maintenance'].includes(spec.role)||!['cluster','slit'].includes(spec.optic)||!Number.isFinite(spec.hunch)||spec.hunch<0||spec.hunch>20)throw Error('Unsupported industrial Echo recipe');
 const build=dir=>{
  const side=['left','right'].includes(dir),sign=dir==='left'?-1:1,back=dir==='up',parts=[];
  parts.push(P('pelvis',null,'plate',28,46,12,5,{ox:6,oy:2,c:'dark',z:0}),P('spine','pelvis','plate',0,-3,13,18,{ox:6.5,oy:18,r:side?sign*spec.hunch:0,z:0,m:1}),P('backpack','spine','plate',side?-sign*7:0,-15,side?6:11,12,{ox:side?3:5.5,z:back?4:-2,c:'dark',m:1}),P('pipes','spine','cable',side?-sign*5:-4,-13,8,21,{ox:4,n:3,c:'rust',z:side?-1:2,amp:.3}),P('neck','spine','plate',0,-23,4,7,{ox:2,c:'under',z:2}),P('head','spine','plate',side?sign*2:0,-23,11,10,{ox:5.5,oy:10,r:side?-sign*spec.hunch:0,z:4,m:1}));
  if(!back){parts.push(P('optic.main','head',side? 'disc':'disc',side?sign*3:-1,-6,spec.optic==='slit'?7:4,spec.optic==='slit'?2:4,{ox:spec.optic==='slit'?3.5:2,oy:2,g:'glow',z:6}));if(spec.optic==='cluster')parts.push(P('optic.small','head','disc',side?sign*3:3,-3,2,2,{ox:1,oy:1,g:'accent',z:6}));}
  else parts.push(P('head.vent','head','plate',0,-7,6,4,{ox:3,c:'dark',z:6}));
  if(spec.cloth)parts.push(P('mantle','spine','banner',side?-sign*6:-7,-18,side?6:9,25,{ox:4,c:'cloth',z:back?5:-3,amp:.7}));
  for(const [label,sg] of [['L',-1],['R',1]]){
   const near=side?(dir==='right'?label==='R':label==='L'):true,z=side?(near?5:-5):2,dk=side&&!near?{dk:1}:{};
   parts.push(P('leg.'+label+'.femur','pelvis','plate',side?(near?-1:1):(back?sg:-sg)*4,0,6,12,{ox:3,z,...dk}),P('leg.'+label+'.tibia','leg.'+label+'.femur','taper',0,12,5,13,{ox:2.5,t:.72,z,...dk}),P('leg.'+label+'.knee','leg.'+label+'.femur','disc',0,12,6,6,{ox:3,oy:3,c:'dark',z:z+.2,...dk}),P('leg.'+label+'.boot','leg.'+label+'.tibia','plate',0,13,side?8:6,4,{ox:side?(sign>0?3:5):3,c:'dark',z:z+.3,...dk}));
   const x=side?(near?0:sign*2):(back?sg:-sg)*9;
   parts.push(P('arm.'+label+'.upper','spine','plate',x,-16,5,10,{ox:2.5,z:back?2:z+1,c:label==='R'?'dark':'bone',...dk}),P('arm.'+label+'.fore','arm.'+label+'.upper','plate',0,10,4,10,{ox:2,z:back?3:z+1,...dk}));
   if(label==='R'&&spec.role==='survey')parts.push(P('tool.R','arm.R.fore','taper',0,10,3,9,{ox:1.5,t:.1,c:'brass',z:back?3.5:z+2,...dk}),P('tool.R.tip','tool.R','disc',0,7,2,2,{ox:1,g:'accent',z:back?3.8:z+3,...dk}));
   else{parts.push(P('tool.'+label,'arm.'+label+'.fore','plate',0,10,5,4,{ox:2.5,c:'dark',z:back?3.5:z+2,...dk}));if(label==='R')parts.push(P('claw.R','tool.R','taper',back?-2:2,3,2,5,{t:0,c:'brass',z:back?3.5:z+2,...dk}));}
  }
  return parts;
 };
 return validateRig({name:'Industrial Echo study',w:56,h:80,tiles:[1,1],groundAnchor:{x:28,y:74},unitSpec:spec,locomotion:{strideLength:10,dutyFactor:.6,phaseOffsets:{L:0,R:.5}},colors:{bone:'#aaa18e',dark:'#3b3b38',under:'#1b1d1d',glow:'#79bab4',accent:'#c4bb65',cloth:'#65575e',moss:'#667143',rust:'#885e43',brass:'#9b8556'},weather:{rust:.25,moss:.25,wear:.12},views:Object.fromEntries(['down','up','right','left'].map(d=>[d,build(d)])),anims:Object.fromEntries(['idle','walk','attack','charge','hurt','malfunction','defeat'].map(a=>[a,{}]))});
}
function foot(phase){const p=((phase%1)+1)%1,d=.6,stride=6;if(p<d)return {x:stride/2-stride*p/d,lift:0,stance:true};const u=(p-d)/(1-d),u2=u*u,u3=u2*u,m=-stride*(1-d)/d;return {x:(2*u3-3*u2+1)*(-stride/2)+(u3-2*u2+u)*m+(-2*u3+3*u2)*(stride/2)+(u3-u2)*m,lift:48*u2*(1-u)*(1-u),stance:false};}
const angle=(a,b)=>Math.atan2(-(b.x-a.x),b.y-a.y)*180/Math.PI;
export function evaluateUnit(rig,dir,type,i,n){
 if(!rig.unitSpec)return rig;if(['six-leg-crawler','orbital-core'].includes(rig.unitSpec.family))return evaluateGrid(rig,dir,type,i,n);if(rig.unitSpec.version!==1||rig.unitSpec.family!=='legacy-industrial-biped')throw Error('Unsupported unit family version');
 const parts=structuredClone(rig.views[dir]);if(!parts)throw Error('Unit family requires an authored '+dir+' view');const map=new Map(parts.map(p=>[p.id,p])),t=n>0?i/n:0,side=['left','right'].includes(dir),sign=dir==='left'?-1:1,walk=type==='walk',one=n>1?i/(n-1):0,fall=type==='defeat'?one:0,b=walk?.3*Math.sin(t*TAU*2):fall*7;
 const pelvis=map.get('pelvis');pelvis.y+=b;
 const facing=dir==='up'?-1:1;
 // Repair saved pre-fix back-view tool geometry as well as freshly built recipes.
 if(dir==='up'&&map.has('claw.R'))map.get('claw.R').x=-2;
 for(const [label,sg] of [['L',-1],['R',1]]){
  const upper=map.get('leg.'+label+'.femur'),lower=map.get('leg.'+label+'.tibia'),boot=map.get('leg.'+label+'.boot'),step=walk?foot(t+(label==='R'?.5:0)):{x:0,lift:fall*3};
  const hip={x:0,y:46+b},ankle={x:step.x,y:70-step.lift},L=solveTwoBone(hip,ankle,12,13,1);
  const projected=side?{hip:{x:upper.x,y:0},knee:{x:upper.x+sign*L.knee.x,y:L.knee.y-hip.y},ankle:{x:upper.x+sign*L.ankle.x,y:L.ankle.y-hip.y}}:{hip:{x:upper.x,y:0},knee:{x:upper.x+L.knee.x*.1,y:L.knee.y-hip.y},ankle:{x:upper.x,y:L.ankle.y-hip.y}};
  // Projected front/back chains use their projected attachment lengths, not a sideways knee rotation.
  const q=projected,a=angle(q.hip,q.knee),g=angle(q.knee,q.ankle),uLen=Math.hypot(q.knee.x-q.hip.x,q.knee.y-q.hip.y),lLen=Math.hypot(q.ankle.x-q.knee.x,q.ankle.y-q.knee.y);
  upper.r=a;upper.h=uLen;lower.y=uLen;lower.r=g-a;lower.h=lLen;map.get('leg.'+label+'.knee').y=uLen;boot.y=lLen;boot.r=-g;
  const arm=map.get('arm.'+label+'.upper'),fore=map.get('arm.'+label+'.fore');const screenSign=dir==='up'?sg:-sg;arm.r=side?sign*(label==='L'?-7:7):screenSign*5;fore.r=side?sign*8:screenSign*4;
  if(walk)arm.r+=Math.sin(t*TAU+(label==='L'?Math.PI:0))*10*(side?sign:sg*facing);
  if(['attack','charge'].includes(type)&&label==='R'){const k=Math.sin(one*Math.PI);arm.r-=sign*facing*65*k;fore.r+=sign*facing*35*k;}
  if(type==='malfunction'&&label==='R')fore.r+=(i%6===2?9:0)*sign*facing;
  if(dir==='up'){
   // In a rear view, forward reach is away from the camera. The two walking
   // arms occupy opposite depth planes; never force both above the rear cloth.
   const depth=walk?Math.sin(t*TAU+(label==='L'?Math.PI:0)):['attack','charge'].includes(type)&&label==='R'?-Math.sin(one*Math.PI):0;
   const plane=depth>1e-6?'near':depth< -1e-6?'far':'passing';
   arm.z=plane==='near'?8:plane==='far'?-3:2;fore.z=plane==='near'?9:plane==='far'?-2:3;
   for(const p of parts)if(p.id==='tool.'+label||p.id.startsWith('tool.'+label+'.')||p.id==='claw.'+label){p.z=plane==='near'?(p.id.endsWith('.tip')?11:10):plane==='far'?-1:3.5;}
  }

 }
 const anims={...rig.anims,[type]:{}};if(type==='malfunction')anims[type]['optic.main']={flick:.4};if(type==='defeat')anims[type]['optic.main']={glowTo:-1};
 return {...rig,views:{[dir]:parts},anims};
}
