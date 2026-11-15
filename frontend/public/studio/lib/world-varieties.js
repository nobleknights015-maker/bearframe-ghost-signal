import {validateRig} from './rig-safety.js';
// Curated original design studies. Identity/lore remains separate from body and job.
const P=(id,p,s,x,y,w,h,o={})=>({id,p,s,x,y,w,h,...o}),DIRS=['down','up','right','left'];
const C={bone:'#bcb6a5',dark:'#41484b',under:'#1b2227',glow:'#65cad2',accent:'#a187bd',cloth:'#66546f',moss:'#657749',rust:'#856147',brass:'#9e8a60'};
const idleClips={exploration:[{name:'idle',type:'idle',frames:8,fps:6}],battle:[{name:'idle',type:'idle',frames:8,fps:6}]};
const physical=(d,sg)=>d==='up'?sg:-sg;
function rooted(o,parent,id,x,y,z=12){
 o.push(P(id+'.root',parent,'plate',x,y,8,3,{ox:4,c:'moss',wx:0,z}),P(id+'.vine',id+'.root','cable',0,1,6,12,{ox:3,c:'moss',n:2,amp:.4,z:z+.1}));
}
function ring(o,parent,id,x,y,w,h,z=-5){for(const [half,depth] of [['back',z],['front',z+1]])o.push(P(id+'.'+half,parent,'ring',x,y,w,h,{ox:w/2,oy:h/2,half,th:3,seg:16,sd:id,c:'bone',g:'glow',broken:.1,z:depth}));}
function finish(name,family,role,w,h,anchor,tiles,build,anims,clips=idleClips){
 return validateRig({name,w,h,style:'sleek',groundAnchor:anchor,tiles,worldSpec:{version:1,family,role,stage:'design-study'},colors:{...C},weather:{rust:.2,moss:.25,wear:.16},views:Object.fromEntries(DIRS.map(d=>[d,build(d)])),anims,clips:structuredClone(clips)});
}
export function ancientDefender(options={}){
 const role=options.role||'bulwark';if(!['bulwark','breaker'].includes(role))throw Error('Unsupported defender role');
 const build=d=>{
  const side=['right','left'].includes(d),sign=d==='left'?-1:1,back=d==='up',o=[];
  o.push(P('torso',null,'taper',48,64,side?24:34,32,{ox:side?12:17,oy:32,t:.65,z:0,m:1}),P('pelvis','torso','plate',0,0,side?17:22,10,{ox:side?8.5:11,c:'dark',z:0}),P('spine','torso','plate',back?0:side?-sign*8:0,-28,side?8:18,24,{ox:side?4:9,c:'dark',z:back?3:-1}),P('head','torso','plate',side?sign*2:0,-33,13,14,{ox:6.5,oy:14,z:3,m:1}));
  o.push(P('neck','torso','plate',0,-35,6,8,{ox:3,c:'under',z:1}));
  ring(o,'torso','halo',side?-sign*8:0,-27,side?16:66,66,-6);
  for(const sg of [-1,1])o.push(P('crest.'+sg,'head','taper',sg*4,-11,4,9,{ox:2,r:sg*155,t:.1,c:'dark',z:4}));
  if(!back){o.push(P('optic','head','disc',side?sign*5:0,-7,side?4:6,6,{ox:side?2:3,oy:3,g:'glow',z:5}));for(const sg of [-1,1])o.push(P('chest.'+sg,'torso','taper',side?sign*5:sg*9,-27,side?12:18,18,{ox:side?6:9,r:side?0:sg*18,t:.35,z:2,m:1}));o.push(P('core.rim','torso','disc',side?sign*11:0,-16,side?7:15,15,{ox:side?3.5:7.5,oy:7.5,c:'brass',z:3}),P('core','core.rim','disc',0,0,side?4:10,10,{ox:side?2:5,oy:5,g:'glow',z:4}));}
  else o.push(P('back.vent','torso','plate',0,-25,13,15,{ox:6.5,c:'under',z:4}),P('back.node','torso','disc',0,-8,6,6,{ox:3,oy:3,g:'glow',z:5}));
  for(const [label,sg] of [['L',-1],['R',1]]){
   const near=!side||(d==='right'?label==='R':label==='L'),z=side?(near?6:-5):3,x=side?(near?sign*3:-sign*3):physical(d,sg)*24,dk=near?{}:{dk:1};
   o.push(P('shoulder.'+label,'torso','plate',x,-27,side?17:21,14,{ox:side?8.5:10.5,oy:3,z,m:1,...dk}));
   for(let k=0;k<2;k++)o.push(P('pauldron.'+label+'.'+k,'shoulder.'+label,'taper',side?-sign*3:physical(d,sg)*(3+k),5+k*5,side?16:20,12,{ox:side?8:10,t:.4,r:side?sign*10:physical(d,sg)*-20,z:z+.2+k*.1,...dk}));
   o.push(P('arm.'+label+'.upper','shoulder.'+label,'plate',0,11,8,17,{ox:4,c:'dark',z:z-.2,...dk}),P('arm.'+label+'.elbow','arm.'+label+'.upper','disc',0,17,10,10,{ox:5,oy:5,c:'brass',z,...dk}),P('arm.'+label+'.fore','arm.'+label+'.upper','taper',0,17,label==='R'&&role==='breaker'?16:12,20,{ox:label==='R'&&role==='breaker'?8:6,t:.65,z:z+.1,...dk}),P('hand.'+label,'arm.'+label+'.fore','plate',0,19,10,10,{ox:5,c:'dark',z:z+.2,...dk}));
   for(let k=0;k<3;k++)o.push(P('finger.'+label+'.'+k,'hand.'+label,'plate',-3+k*3,8,2,5,{ox:1,c:'dark',z:z+.3,...dk}));
   const lx=side?(near?-sign*2:sign*3):physical(d,sg)*9,lz=side?(near?3:-3):1;
   o.push(P('leg.'+label+'.upper','pelvis','taper',lx,6,side?12:14,20,{ox:side?6:7,t:.65,z:lz,...dk}),P('leg.'+label+'.knee','leg.'+label+'.upper','disc',0,20,10,10,{ox:5,oy:5,c:'dark',z:lz+.2,...dk}),P('leg.'+label+'.shin','leg.'+label+'.upper','taper',0,20,12,19,{ox:6,t:.5,z:lz+.3,...dk}),P('leg.'+label+'.foot','leg.'+label+'.shin','plate',side?sign*2:0,19,side?17:14,7,{ox:side?(sign>0?6:11):7,c:'dark',z:lz+.4,...dk}));
   if(label==='L'&&role==='bulwark')o.push(P('shield.L','arm.L.fore','taper',side?-sign*5:physical(d,sg)*3,-3,side?7:20,29,{ox:side?3.5:10,t:.55,z:z+.5,c:'bone',...dk}),P('shield.L.inlay','shield.L','plate',0,5,side?2:3,16,{ox:side?1:1.5,c:'brass',z:z+.6,...dk}));
   if(label==='R'&&role==='breaker')o.push(P('cannon.R','arm.R.fore','plate',side?sign*4:0,8,side?16:9,9,{ox:side?8:4.5,c:'dark',z:z+.5,...dk}),P('cannon.R.lens','cannon.R','disc',side?sign*7:0,5,side?3:6,6,{ox:side?1.5:3,oy:3,g:'glow',z:z+.6,...dk}));
  }
  o.push(P('tabard','torso','banner',side?-sign*10:-12,-2,9,32,{ox:4.5,c:'cloth',g:'accent',z:back?12:5,amp:.25}));
  rooted(o,'shoulder.L','growth',0,2,12);return o;
 };
 const anims={idle:{core:{glow:[.12,0]},'back.node':{glow:[.12,0]}}};
 return finish('Ancient defender — '+role,'heavy-biped',role,96,124,{x:48,y:116},[2,2],build,anims);
}
export function slenderCustodian(options={}){
 const role=options.role||'keeper';if(!['keeper','surveyor'].includes(role))throw Error('Unsupported slender role');
 const build=d=>{
  const side=['right','left'].includes(d),sign=d==='left'?-1:1,back=d==='up',o=[];
  o.push(P('torso',null,'taper',32,61,side?11:15,26,{ox:side?5.5:7.5,oy:26,t:.6,z:0}),P('pelvis','torso','plate',0,0,side?10:14,7,{ox:side?5:7,c:'dark',z:0}),P('neck','torso','plate',0,-30,4,7,{ox:2,c:'under',z:1}),P('head','torso','plate',side?sign:0,-30,10,12,{ox:5,oy:12,c:'dark',z:2}));
  ring(o,'torso','halo',side?-sign*4:0,-27,side?9:45,53,-5);
  if(!back)o.push(P('optic','head','disc',side?sign*4:0,-6,side?3:5,6,{ox:side?1.5:2.5,oy:3,g:'glow',z:3}),P('core','torso','disc',side?sign*5:0,-19,side?3:7,7,{ox:side?1.5:3.5,oy:3.5,g:'glow',z:3}));
  else o.push(P('archive.port','torso','ring',0,-17,9,9,{ox:4.5,oy:4.5,th:2,g:'glow',z:3}));
  if(role==='keeper')for(const sg of [-1,1])o.push(P('cowl.'+sg,'head','taper',sg*4,-12,5,17,{ox:2.5,t:.35,r:sg*13,c:'cloth',z:4}));
  else o.push(P('antenna','head','taper',side?-sign*3:-3,-10,2,12,{ox:1,r:160,t:.2,c:'brass',z:3}));
  for(const [label,sg] of [['L',-1],['R',1]]){
   const near=!side||(d==='right'?label==='R':label==='L'),dk=near?{}:{dk:1},z=side?(near?5:-4):3,x=side?(near?sign*2:-sign*2):physical(d,sg)*11;
   o.push(P('shoulder.'+label,'torso','taper',x,-24,9,10,{ox:4.5,t:.3,z,...dk}),P('arm.'+label+'.upper','shoulder.'+label,'plate',0,7,4,13,{ox:2,c:'dark',z:z-.2,...dk}),P('arm.'+label+'.fore','arm.'+label+'.upper','taper',0,13,6,15,{ox:3,t:.55,z,...dk}),P('hand.'+label,'arm.'+label+'.fore','plate',0,15,5,6,{ox:2.5,c:'dark',z:z+.2,...dk}));
   const lx=side?(near?-sign:sign*2):physical(d,sg)*4;
   o.push(P('leg.'+label+'.upper','pelvis','taper',lx,5,7,18,{ox:3.5,t:.65,z:near?1:-2,...dk}),P('leg.'+label+'.shin','leg.'+label+'.upper','taper',0,18,6,19,{ox:3,t:.45,z:near?2:-2,...dk}),P('leg.'+label+'.foot','leg.'+label+'.shin','plate',side?sign:0,19,side?10:7,5,{ox:side?(sign>0?3:7):3.5,c:'dark',z:near?2:-2,...dk}));
   o.push(P('waist.cloth.'+label,'pelvis','banner',side?-sign*4:physical(d,sg)*6,3,7,34,{ox:3.5,c:'cloth',g:'accent',amp:.3,z:back?6:side?-1:2}));
   if(label==='R'&&role==='surveyor')o.push(P('probe.R','hand.R','taper',0,5,2,12,{ox:1,t:.05,c:'brass',z:z+.3,...dk}));
  }
  o.push(P('scarf','torso','plate',0,-27,side?12:19,5,{ox:side?6:9.5,c:'cloth',z:7}));rooted(o,'shoulder.L','growth',0,1,8);return o;
 };
 return finish('Slender custodian — '+role,'slender-biped',role,64,112,{x:32,y:108},[1,1],build,{idle:{core:{glow:[.12,0]}}});
}
export function suspendedCustodian(options={}){
 const role=options.role||'archive';if(!['archive','relay'].includes(role))throw Error('Unsupported suspended role');
 const build=d=>{
  const side=['right','left'].includes(d),sign=d==='left'?-1:1,back=d==='up',relay=role==='relay',o=[];
  o.push(P('root',null,'plate',64,52,side?18:26,22,{ox:side?9:13,oy:22,z:0,c:'dark'}),P('spire','root','taper',relay?-6:0,-22,relay?8:13,28,{ox:relay?4:6.5,r:180,t:.12,z:1}),P('collar','root','plate',0,-2,24,7,{ox:12,z:2}),P('lantern','root','glass',0,7,relay?11:16,40,{ox:relay?5.5:8,g:'glow',z:2}),P('cage','lantern','plate',0,37,relay?16:22,6,{ox:relay?8:11,c:'brass',z:3}),P('spike','cage','taper',0,4,relay?10:16,34,{ox:relay?5:8,t:.05,z:1}));
  o.push(P('lantern.support','root','plate',0,2,6,10,{ox:3,c:'under',z:1}));
  o.push(P('halo.brace','root','plate',0,-25,side?50:70,4,{ox:side?25:35,c:'dark',z:3}),P('halo.mast','root','plate',0,-23,5,22,{ox:2.5,oy:22,c:'dark',z:2}));
  ring(o,'root','halo',0,-25,side?64:86,24,-5);if(relay)ring(o,'root','relay.array',side?-sign*15:-16,-32,side?12:30,38,-3);
  o.push(P('head','root','plate',relay?(side?sign*11:physical(d,1)*13):0,-15,relay?18:13,12,{ox:relay?9:6.5,oy:6,z:4,m:1}));
  if(!back){o.push(P('optic','head','disc',side?sign*5:0,0,relay?8:6,relay?8:6,{ox:relay?4:3,oy:relay?4:3,g:'glow',z:5}));if(relay)o.push(P('optic.small','head','disc',side?sign*3:-6,-3,3,3,{ox:1.5,oy:1.5,g:'glow',z:5}));}
  else o.push(P('vent','head','plate',0,0,10,5,{ox:5,oy:2.5,c:'dark',z:5}));
  for(const [label,sg] of [['L',-1],['R',1]]){
   const near=!side||(d==='right'?label==='R':label==='L'),s=side?sign:physical(d,sg),z=side?(near?5:-4):3,dk=near?{}:{dk:1},len=relay&&label==='R'?31:23;
   o.push(P('arm.'+label+'.upper','root','taper',side?(near?sign*7:-sign*5):physical(d,sg)*16,-2,8,len,{ox:4,t:.65,r:-s*44,c:'bone',z,...dk}),P('arm.'+label+'.joint','arm.'+label+'.upper','disc',0,len,8,8,{ox:4,oy:4,c:'brass',z:z+.1,...dk}),P('arm.'+label+'.fore','arm.'+label+'.upper','plate',0,len,6,relay&&label==='R'?27:21,{ox:3,r:s*90,c:'dark',z:z+.2,...dk}));
   for(const k of [-1,1])o.push(P('claw.'+label+'.'+k,'arm.'+label+'.fore','taper',k*2,relay&&label==='R'?26:20,3,9,{ox:1.5,r:k*18,t:.05,c:'brass',z:z+.3,...dk}));
   o.push(P('banner.'+label,'halo.brace','banner',side?sg*19:sg*28,1,relay?6:10,relay?32:49,{ox:relay?3:5,c:'cloth',g:'accent',z:back?6:-2,amp:.4}));
  }
  rooted(o,'halo.brace','growth',-18,0,8);return o;
 };
 const idle={root:{y:[1.2,0]},lantern:{glow:[.12,0]},optic:{glow:[.12,0]},'arm.L.upper':{rot:[1.5,0]},'arm.R.upper':{rot:[1.5,.5]}};
 const walk={...structuredClone(idle),root:{y:[1.2,0],rot:[.8,.25]}};
 const clips={exploration:[{name:'idle',type:'idle',frames:8,fps:6},{name:'hover',type:'walk',frames:8,fps:6}],battle:[{name:'idle',type:'idle',frames:8,fps:6}]};
 return finish('Suspended custodian — '+role,role==='relay'?'asymmetric-relay-custodian':'suspended-archive-spindle',role,128,152,{x:64,y:146},[3,3],build,{idle,walk},clips);
}
export const WORLD_VARIETIES={
 'Ancient Bulwark (design study)':()=>ancientDefender({role:'bulwark'}),
 'Ancient Breaker (design study)':()=>ancientDefender({role:'breaker'}),
 'Slender Keeper (design study)':()=>slenderCustodian({role:'keeper'}),
 'Slender Surveyor (design study)':()=>slenderCustodian({role:'surveyor'}),
 'Suspended Archivist (design study)':()=>suspendedCustodian({role:'archive'}),
 'Asymmetric Relay (design study)':()=>suspendedCustodian({role:'relay'})
};
