// Optional anatomical armor silhouettes. Original rig remains the default.
export const CHASSIS=['standard','lean-male','lean-female','broad'];
export const PROFILES={
 'lean-male':{chest:10,waist:7,hips:10,shoulder:5.7,limb:4.3},
 'lean-female':{chest:9.5,waist:5.8,hips:11,shoulder:5.1,limb:4.1},
 broad:{chest:12,waist:8,hips:11.5,shoulder:7,limb:5},
};
export function legIK(hip,ankle,bend=1){
 const l1=8,l2=8.5,dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.hypot(dx,dy);
 const r=Math.max(.01,Math.min(l1+l2-.001,d)),u=dx/(d||1),v=dy/(d||1);
 const a=(l1*l1-l2*l2+r*r)/(2*r),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 return {hip,knee:{x:hip.x+u*a+v*h*bend,y:hip.y+v*a-u*h*bend},ankle,l1,l2};
}
export function chassisLegs(cfg,dir,pose){
 const side=dir==='left'||dir==='right',b=pose.b||0,s=pose.s||0;
 const lifts=[pose.lL||0,pose.lR||0];
 return [0,1].map(i=>{
  const far=i===0,hip={x:side?(far?15:17):(far?13:19),y:34+Math.min(1.2,b*.25)};
  if(side)return {...legIK(hip,{x:hip.x+(far?-s:s),y:50-lifts[i]}),far};
  // Sagittal bend is projected into depth for front/back, avoiding sideways knee flips.
  const sagittal=legIK({x:0,y:hip.y},{x:far?-s:s,y:50-lifts[i]});
  return {hip,knee:{x:hip.x+sagittal.knee.x*.12,y:sagittal.knee.y},ankle:{x:hip.x,y:50-lifts[i]},far,projected:true,l1:8,l2:8.5};
 });
}
const inside=(x,y,p)=>{let a=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [u,v]=p[i],[s,t]=p[j];if((v>y)!==(t>y)&&x<(s-u)*(y-v)/(t-v)+u)a=!a;}return a;};
export function chassisTools({c,cfg,K,X,Y,P}){
 const poly=(pts,col,edge=false,far=false)=>{
  const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1])),e=1/K;
  for(let py=Y(minY);py<Y(maxY);py++)for(let px=X(minX);px<X(maxX);px++){
   const x=minX+(px-X(minX)+.5)/K,y=minY+(py-Y(minY)+.5)/K;if(!inside(x,y,pts))continue;
   let color=col;
   if(edge){const lit=!inside(x-e,y,pts)||!inside(x,y-e,pts),dark=!inside(x+e,y,pts)||!inside(x,y+e,pts);// Keep thin corner tips at the plate color instead of alternating bright/dark sparks.
    color=cfg.style==='sleek'&&cfg.pixelFinish==='clean'&&lit&&dark?col:lit?(far?P.W:P.Wh):dark?(far?P.D:P.S):col;
    // Damage stays inside its own plate, in local coordinates, not on the torso/other leg.
    const ix=Math.floor(x-minX),iy=Math.floor(y-minY),n=(ix*17+iy*31+pts.length*7)%67,damage=cfg.damage||0;
    if(damage&&n<damage)color=P.D;
    if(damage>=2&&cfg.damageType==='exposed'&&ix===Math.floor((maxX-minX)/2)&&iy>1&&iy<4)color=iy%2?P.K:P.B;
   }
   c.fillStyle=color;c.fillRect(px,py,1,1);
  }
 };
 const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(X(x),Y(y),Math.max(1,X(x+w)-X(x)),Math.max(1,Y(y+h)-Y(y)));};
 const disc=(x,y,rad,col)=>poly([[x-rad,y],[x-rad*.6,y-rad*.8],[x+rad*.6,y-rad*.8],[x+rad,y],[x+rad*.6,y+rad*.8],[x-rad*.6,y+rad*.8]],col);
 const bone=(a,b,w0,w1,col,edge=false,far=false,start=0,end=0)=>{
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=dy/d,ny=-dx/d;
  const ax=a.x+dx*start,ay=a.y+dy*start,bx=b.x-dx*end,by=b.y-dy*end;
  poly([[ax-nx*w0/2,ay-ny*w0/2],[ax+nx*w0/2,ay+ny*w0/2],[bx+nx*w1/2,by+ny*w1/2],[bx-nx*w1/2,by-ny*w1/2]],col,edge,far);
 };
 return {poly,r,disc,bone};
}
export function drawChassis(args,{shouldersOnly=false}={}){
 const {cfg,dir,pose,P}=args,shape=PROFILES[cfg.chassis];if(!shape)return;
 const {poly,r,disc,bone}=chassisTools(args),b=pose.b||0,a=pose.a||0,side=dir==='right'||dir==='left',back=dir==='up';
 const limb=shape.limb+(cfg.build||0)*.35;
 const leg=L=>{
  const {hip,knee,ankle,far}=L,dk=side&&far;
  bone(hip,knee,limb*.8,limb*.63,P.K);bone(knee,ankle,limb*.6,limb*.52,P.K);
  bone(hip,knee,limb,limb*.73,dk?P.S:P.W,true,dk,.08,.10);
  disc(knee.x,knee.y,limb*.43,P.K);disc(knee.x,knee.y,limb*.27,dk?P.S:P.W);
  bone(knee,ankle,limb*.82,limb*.52,dk?P.S:P.W,true,dk,.16,.05);
  const mid={x:knee.x+(ankle.x-knee.x)*.4,y:knee.y+(ankle.y-knee.y)*.4};r(mid.x-.25,mid.y, .65,2,dk?P.Rd:P.R);
  const x=ankle.x,y=ankle.y;
  if(side){poly([[x-2,y],[x+1,y],[x+2,y+1],[x+4.5,y+1.7],[x+4.5,y+3],[x-2.5,y+3],[x-2.5,y+1]],dk?P.S:P.W,true,dk);r(x-2.5,y+3,7,1,P.K);}
  else{poly([[x-1.7,y],[x+1.7,y],[x+2.7,y+1.5],[x+2.7,y+3],[x-2.7,y+3],[x-2.7,y+1.5]],P.W,true);r(x-2.7,y+3,5.4,1,P.K);}
 };
 const arm=(right,far=false)=>{
  const sign=right?1:-1,scan=pose.scan&&right;
  let shoulder,elbow,wrist;
  if(side){shoulder={x:far?13:16,y:21+b};elbow={x:(far?12:16)+(far?-a:a)*.3,y:26+b};wrist={x:(far?12:16)+(far?-a:a)*.5,y:33+b+(far?-a:a)*.35};if(scan&&!far){elbow={x:20,y:24+b};wrist={x:26,y:24+b};}}
  else{shoulder={x:16+sign*8,y:21+b};elbow={x:16+sign*(8.2+a*.12),y:26+b};wrist={x:16+sign*(8.7+a*.2),y:33+b+(right?-a:a)*.35};if(scan){elbow={x:24,y:20+b};wrist={x:24,y:12+b};}}
  bone(shoulder,elbow,2.7,2.3,P.K);bone(elbow,wrist,2.4,2,P.K);
  bone(shoulder,elbow,limb*.85,limb*.6,far?P.S:P.W,true,far,.1,.12);disc(elbow.x,elbow.y,1.35,P.Gd);
  bone(elbow,wrist,limb*.85,limb*.56,far?P.S:P.W,true,far,.16,.06);disc(wrist.x,wrist.y,1.8,P.K);
  r(wrist.x-1,wrist.y-.5,2,1,far?P.G:P.S);
  if(scan&&!far)r(wrist.x-.4,wrist.y-1.7,1,1,pose.flare?P.Rb:P.R);
 };
 const shoulders=()=>{
  if(side){poly([[12,16+b],[16,15.5+b],[20,18+b],[19,22+b],[14,21.5+b],[12,19+b]],P.W,true);return;}
  const w=Math.min(6.5,shape.shoulder+(cfg.armor==='heavy'?1:0));
  for(const sign of [-1,1]){const x=16+sign*6;poly([[x,16+b],[x+sign*w,17+b],[x+sign*(w+.4),20+b],[x+sign*(w-1),22+b],[x,21+b]],P.W,true);}
 };
 if(shouldersOnly){shoulders();return;}
 const legs=chassisLegs(cfg,dir,pose);leg(legs[0]);if(side)arm(false,true);leg(legs[1]);
 if(side){
  const inset=cfg.chassis==='lean-female'?.6:cfg.chassis==='broad'?-.5:0;
  poly([[12,17+b],[18,17+b],[20,20+b],[19,24+b],[17.5-inset,27+b],[18,31+b],[20,33+b],[16,35+b],[12,33+b],[13+inset,29+b],[12+inset,24+b]],P.K);
  poly([[15,18+b],[18.5,18+b],[20,20+b],[19,23+b],[16,23.5+b]],P.W,true);
  poly([[15,25+b],[18,25+b],[17.5,28+b],[15,29+b]],P.S,true);
  r(19,20+b,1,2,P.R);poly([[13,31+b],[18,31+b],[20,33+b],[17,35+b],[13,34+b]],P.W,true);
  if(cfg.backpack){poly([[9,18+b],[12,18+b],[12,29+b],[8,28+b]],P.Gd,true);r(9,21+b,1,3,P.R);}
 }else{
  const ch=shape.chest/2,wa=shape.waist/2,hip=shape.hips/2;
  poly([[16-ch,17+b],[16+ch,17+b],[16+ch,23+b],[16+wa,27+b],[16+wa,30+b],[16+hip,33+b],[16,35+b],[16-hip,33+b],[16-wa,30+b],[16-wa,27+b],[16-ch,23+b]],P.K);
  if(back){poly([[12,18+b],[20,18+b],[19,25+b],[16,28+b],[13,25+b]],P.W,true);r(15.5,19+b,1,8,P.G);r(14.5,24+b,3,1,P.R);}
  else{
   for(const sign of [-1,1]){poly([[16+sign*.8,18+b],[16+sign*ch,18+b],[16+sign*(ch+.2),21+b],[16+sign*(ch-1),23.5+b],[16+sign*1.6,23+b]],P.W,true);
    poly([[16+sign*3.6,24+b],[16+sign*4.2,25+b],[16+sign*wa,29.5+b],[16+sign*1.7,29+b],[16+sign*2.5,26+b]],P.S,true);}
   poly([[16,19.3+b],[18.5,21+b],[18,23+b],[16,24+b],[14,23+b],[13.5,21+b]],P.Gd);
   r(15,20.5+b,2,1,P.R);r(14.5,21.5+b,3,1.5,P.R);r(15.5,23+b,1,1,P.Rb);
  }
  poly([[16-hip,31+b],[16+hip,31+b],[16+hip-.5,33+b],[18.5,34+b],[16,35+b],[13.5,34+b],[16-hip+.5,33+b]],P.W,true);
  r(15,31.3+b,2,1,P.B);
  if(cfg.backpack&&back){poly([[12,19+b],[20,19+b],[20,28+b],[12,28+b]],P.Gd,true);r(13,21+b,6,1,P.R);}
 }
 if(!side)arm(false);arm(true);shoulders();
 if(cfg.pouches){r(side?12:10,32+b,2.5,3,P.Bd);if(!side)r(19.5,32+b,2.5,3,P.Bd);}
}
