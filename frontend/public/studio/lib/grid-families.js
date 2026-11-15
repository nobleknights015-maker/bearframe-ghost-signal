import {solveTwoBone,validateRig} from './rig-safety.js';
const TAU=2*Math.PI,dirs=['down','up','right','left'],actions=['idle','walk','attack','charge','hurt','malfunction','defeat'];
const P=(id,p,s,x,y,w,h,o={})=>({id,p,s,x,y,w,h,...o});
const colors={bone:'#b9b1a0',dark:'#414448',under:'#20262b',glow:'#57c8ce',accent:'#b99a60',cloth:'#665767',moss:'#647747',rust:'#885f42',brass:'#9d8656'};
const angle=(a,b)=>Math.atan2(-(b.x-a.x),b.y-a.y)*180/Math.PI;
export const CRAWLER_LEGS=['LF','LM','LR','RF','RM','RR'];
export function crawlerStep(phase,duty=.6){
 const p=((phase%1)+1)%1,stride=10;
 if(p<duty)return {x:stride/2-stride*p/duty,lift:0,stance:true};
 const u=(p-duty)/(1-duty),m=-stride*(1-duty)/duty;
 return {x:(2*u**3-3*u*u+1)*(-stride/2)+(u**3-2*u*u+u)*m+(-2*u**3+3*u*u)*(stride/2)+(u**3-u*u)*m,lift:64*u*u*(1-u)*(1-u),stance:false};
}
export function gridCrawler(options={}){
 const spec={version:1,family:'six-leg-crawler',gait:'tripod',role:'cartographer',...options};
 if(spec.version!==1||!['tripod','ripple'].includes(spec.gait)||!['cartographer','salvager'].includes(spec.role))throw Error('Unsupported crawler recipe');
 const build=dir=>{
  const side=['right','left'].includes(dir),sign=dir==='left'?-1:1,back=dir==='up',o=[];
  o.push(P('body',null,'plate',64,48,side?62:30,15,{ox:side?31:15,oy:7.5,z:0,m:1}),P('belly','body','plate',0,7,side?44:22,6,{ox:side?22:11,c:'dark',z:-1}),P('deck','body','plate',-2,-11,side?30:22,6,{ox:side?15:11,z:1,m:1}),P('mast','body','plate',0,-12,5,17,{ox:2.5,oy:17,z:1,c:'dark'}));
  for(const [half,z] of [['back',-5],['front',7]])o.push(P('ring.'+half,'mast','ring',0,-15,side?70:62,18,{ox:side?35:31,oy:9,half,th:3,seg:16,sd:'archive-array',g:'glow',broken:.12,z,m:1}));
  o.push(P('cables','body','cable',0,-3,side?46:24,19,{ox:side?23:12,n:5,c:'under',z:-2}),P('growth','mast','cable',-10,-12,26,17,{ox:13,n:4,c:'moss',z:8}));
  o.push(P('head','body','plate',side?sign*32:0,back?-2:3,side?16:20,12,{ox:8,oy:6,z:back?-1:3,m:1}));
  if(!back)o.push(P('lens','head','disc',side?sign*5:0,0,8,8,{ox:4,oy:4,g:'glow',z:4}),P('lens.small','head','disc',side?sign*4:-7,-3,4,4,{ox:2,oy:2,g:'glow',z:4}));
  else o.push(P('vent','head','plate',0,0,13,5,{ox:6.5,oy:2.5,c:'dark',z:4}));
  o.push(P('probe','head','taper',side?sign*7:6,4,3,spec.role==='salvager'?13:10,{ox:1.5,t:spec.role==='salvager'?.6:.05,r:side?-sign*65:-20,z:2,c:'brass'}));
  for(const id of CRAWLER_LEGS){
   const sg=id[0]==='L'?-1:1,j='FMR'.indexOf(id[1]),near=side?(dir==='right'?sg===1:sg===-1):j===0,z=side?(near?5:-4):5-j*3,dk=near?{}:{dk:1},hx=side?sign*(22-j*22):(back?sg:-sg)*11,hy=side?2:(back?1-j: j-1)*4;
   o.push(P('leg.'+id+'.upper','body','plate',hx,hy,6,22,{ox:3,c:'dark',z,...dk}),P('leg.'+id+'.lower','leg.'+id+'.upper','taper',0,22,6,24,{ox:3,t:.65,z,...dk}),P('leg.'+id+'.joint','leg.'+id+'.upper','disc',0,22,8,8,{ox:4,oy:4,c:'brass',z:z+.3,...dk}),P('leg.'+id+'.foot','leg.'+id+'.lower','plate',0,24,9,4,{ox:4.5,oy:2,c:'dark',z:z+.4,...dk}));
  }
  return o;
 };
 return validateRig({name:'Grid crawler study',w:128,h:96,tiles:[4,2],groundAnchor:{x:64,y:84},unitSpec:spec,locomotion:{strideLength:10/(spec.gait==='ripple'?5/6:.6),dutyFactor:spec.gait==='ripple'?5/6:.6},colors:{...colors},weather:{rust:.35,moss:.55,wear:.2},views:Object.fromEntries(dirs.map(d=>[d,build(d)])),anims:Object.fromEntries(actions.map(a=>[a,{}]))});
}
export function orbitalCore(options={}){
 const spec={version:1,family:'orbital-core',role:'analyst',...options};if(spec.version!==1||!['analyst','relay'].includes(spec.role))throw Error('Unsupported orbital recipe');
 const build=dir=>{
  const side=['left','right'].includes(dir),sign=dir==='left'?-1:1,back=dir==='up',o=[P('core',null,'disc',48,36,side?24:30,30,{ox:side?12:15,oy:15,c:'dark',z:0}),P('shell','core','plate',0,-13,side?24:30,9,{ox:side?12:15,oy:4,z:1,m:1})];
  for(const [ring,w,h,rot] of [['outer',76,24,-14],['inner',48,50,20]])for(const [half,z] of [['back',-5],['front',5]])o.push(P(ring+'.'+half,'core','ring',0,0,w,h,{ox:w/2,oy:h/2,half,th:3,seg:ring==='outer'?16:12,r:side?-rot:rot,sd:ring,g:'glow',broken:ring==='outer'?.12:0,z,m:1}));
  if(!back)o.push(P('optic','core','disc',side?sign*10:0,0,side?7:15,15,{ox:side?3.5:7.5,oy:7.5,g:'glow',z:3}),P('optic.rim','core','ring',side?sign*10:0,0,side?11:21,21,{ox:side?5.5:10.5,oy:10.5,th:2,seg:12,c:'brass',z:3}));
  else o.push(P('archive','core','glass',0,0,12,18,{ox:6,oy:9,g:'glow',z:3}));
  for(const sg of [-1,1])o.push(P('banner.'+(sg<0?'L':'R'),'core','banner',sg*(side?10:17),12,8,25,{ox:4,c:'cloth',z:-1,amp:.5,g:'accent'}));
  o.push(P('tag','core','plate',spec.role==='relay'?19:-19,10,5,10,{ox:2.5,c:'brass',z:6}),P('rooted-growth','core','cable',-18,-16,18,13,{ox:9,c:'moss',n:3,z:6}));return o;
 };
 return validateRig({name:'Orbital core study',w:96,h:88,tiles:[2,2],groundAnchor:{x:48,y:79},unitSpec:spec,colors:{...colors},weather:{rust:.25,moss:.3,wear:.15},views:Object.fromEntries(dirs.map(d=>[d,build(d)])),anims:Object.fromEntries(actions.map(a=>[a,{}]))});
}
export function evaluateGrid(rig,dir,type,i,n){
 const spec=rig.unitSpec;if(spec.version!==1)throw Error('Unsupported Grid family version');const parts=structuredClone(rig.views[dir]);if(!parts)throw Error('Grid family needs explicit '+dir+' view');
 const map=new Map(parts.map(p=>[p.id,p])),t=n>0?i/n:0,side=['left','right'].includes(dir),sign=dir==='left'?-1:1,back=dir==='up',one=n>1?i/(n-1):0,fall=type==='defeat'?one*one*(3-2*one):0,channels={};
 if(spec.family==='six-leg-crawler'){
  const body=map.get('body'),restY=body.y;body.y+=fall*7;
  for(const [k,id] of CRAWLER_LEGS.entries()){
   const upper=map.get('leg.'+id+'.upper'),lower=map.get('leg.'+id+'.lower'),boot=map.get('leg.'+id+'.foot'),sg=id[0]==='L'?-1:1,j='FMR'.indexOf(id[1]),duty=spec.gait==='ripple'?5/6:.6,phase=spec.gait==='ripple'?k/6:([0,2,4].includes(k)?0:.5),step=type==='walk'?crawlerStep(t+phase,duty):{x:0,lift:0,stance:true};
   const hip={x:upper.x,y:upper.y},target={x:side?upper.x+sign*(j===0?12:j===2?-12:8)+sign*step.x:(back?sg:-sg)*[26,43,34][j],y:(side?82:[86,80,74][j])-restY-step.lift+(side?0:(back?-1:1)*step.x*.35)};
   const q=solveTwoBone(hip,target,22,24,side?sign:(back?sg:-sg)),a=angle(q.hip,q.knee),g=angle(q.knee,q.ankle);upper.r=a;lower.r=g-a;boot.r=-g;
   upper.y-=fall*3;upper.contact=step.stance;upper.target={...q.ankle};map.get('leg.'+id+'.joint').y=22;
  }
  const active=Math.sin(Math.PI*one);if(type==='attack')map.get('probe').r+=(side?-sign:1)*28*active;if(type==='hurt')body.x+=Math.sin(Math.PI*one)*2;if(type==='malfunction')map.get('probe').r+=(i%8===3?8:0);
  if(type==='charge')channels.lens={glow:[.35,0,2]};if(fall)channels.lens={glowTo:-1};
 }else if(spec.family==='orbital-core'){
  const core=map.get('core');core.y+=Math.sin(t*TAU)*1.5+fall*16;if(type==='walk')core.r=Math.sin(t*TAU)*2;if(type==='hurt')core.x+=Math.sin(Math.PI*one)*3;
  for(const key of ['outer','inner'])for(const half of ['back','front'])channels[key+'.'+half]={spin:(key==='outer'?1:-1)*(map.get(key+'.'+half).seg/3),...(fall?{glowTo:-1}:{})};
  if(type==='attack'||type==='charge')channels.optic={glow:[.35,0,2]};if(type==='defeat')channels.optic={glowTo:-1};if(type==='malfunction')core.r=(i%8===3?3:0);
 }else throw Error('Unsupported Grid family');
 return {...rig,views:{[dir]:parts},anims:{...rig.anims,[type]:channels}};
}
