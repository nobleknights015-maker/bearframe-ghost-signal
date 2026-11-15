import { chassisTools } from './android-chassis.js';
// Clothing is authored around body landmarks; accessories never use limb textures.
export function outfitLayers(args,cloth){
 const {cfg,dir,pose,P}=args,{poly,r,disc}=chassisTools(args),b=pose.b||0,side=dir==='left'||dir==='right',back=dir==='up';
 const type=cfg.outfit||'none',O=cfg.colors.outfit||P.W,T=cfg.colors.accent||P.R;
 const drape=(pts,opts)=>cloth(pts.map(([x,y])=>[x,Math.min(52,y)]),opts);
 const long=['command','research','community','visuals','support'].includes(type);
 const tails=()=>{
  if(!long)return;
  const petal=['community','visuals','support'].includes(type),length=type==='support'?39:type==='visuals'?43:cfg.outfitVariant==='long'?49:47;
  if(side){drape([[11,18+b],[14,19+b],[13,31+b],[15,length-3+b],[10,length+b],[6,length-4+b],[9,30+b]],{role:'outfit',flow:'hang'});return;}
  for(const sign of [-1,1]){const x=16+sign*5;drape([[x,18+b],[x+sign*2,20+b],[x+sign*1,30+b],[x+sign*5,length-4+b],[x+sign*(petal?2:4),length+b],[x-sign*2,length-3+b],[x-sign*1,30+b]],{role:'outfit',flow:'hang'});}
 };
 const motif=(x,y,kind)=>{
  if(kind==='tower'){r(x,y,1,5,P.R);r(x-1,y+1,3,1,P.R);r(x-1,y+4,3,1,P.R);}
  else if(kind==='flower'){disc(x,y,1.5,T);r(x-.4,y-.4,1,1,P.Cd);}
  else if(kind==='star'){r(x,y-1,1,3,T);r(x-1,y,3,1,T);}
  else{r(x-1,y-1,1,1,P.Rb);r(x+1,y-1,1,1,P.Rb);r(x-1,y,3,2,P.R);r(x,y+1,1,1,P.Rb);}
 };
 const front=()=>{
  if(type==='none'&&(!cfg.headgear||cfg.headgear==='none'))return;
  if(['command','research','support','visuals'].includes(type)){
   // High collars and diagonal lapels leave the chest display exposed.
   poly(side?[[10,15+b],[18,15+b],[19,17+b],[13,18+b],[10,17+b]]:[[11,15+b],[14,17+b],[16,19+b],[18,17+b],[21,15+b],[20,19+b],[18,22+b],[16,20+b],[14,22+b],[12,19+b]],O,true);
   if(side){r(11,16+b,1,3,T);}
   else for(const sign of [-1,1]){poly([[16+sign*3,18+b],[16+sign*5,18+b],[16+sign*3,25+b],[16+sign*1.8,23+b]],O,true);r(16+sign*4,18+b,.6,2,T);}
  }
  if(type==='research'){
   const hem=cfg.outfitVariant==='long'?49:cfg.outfitVariant==='asymmetric'?46:43;
   if(side)drape([[10,26+b],[13,27+b],[13,37+b],[11,hem+b],[8,hem-2+b]],{role:'outfit',flow:'hang'});
   else for(const sign of [-1,1]){const length=cfg.outfitVariant==='asymmetric'&&sign<0?41:hem;drape([[16+sign*4,26+b],[16+sign*6,27+b],[16+sign*6,34+b],[16+sign*8,length+b],[16+sign*3,length-2+b],[16+sign*2,33+b]],{role:'outfit',flow:'hang'});r(16+sign*5,28+b,.65,5,P.R);}
   if(cfg.idTag){r(side?12:10,19+b,2,4,P.Gd);r(side?12:10,19.5+b,1.5,2.5,P.W);r(side?12:10,20+b,1,1,P.R);}
  }
  if(type==='community'||type==='visuals'){
   if(!side)for(const sign of [-1,1]){drape([[16+sign*5,16+b],[16+sign*10,18+b],[16+sign*9,25+b],[16+sign*6,22+b]],{role:'outfit',flow:'wrap'});motif(16+sign*8,20+b,type==='community'?'flower':'star');}
   else drape([[10,16+b],[17,16+b],[19,20+b],[12,24+b],[9,21+b]],{role:'outfit',flow:'wrap'});
  }
  if(type==='explorer'){
   if(!side){poly([[9,17+b],[11,17+b],[15,30+b],[13,30+b]],P.B);r(9,25+b,3,4,P.Bd);motif(21,19+b,'star');}
   else{r(11,18+b,1,11,P.B);r(9,25+b,3,4,P.Bd);}
   if(back)motif(16,30+b,'star');
  }
  if(type==='engineer'){
   if(cfg.outfitVariant==='harness'){
    if(!side){for(const x of [11,20]){r(x,17+b,1.2,14,P.B);r(x-.3,25+b,2,1,T);}r(11,30+b,10,2,P.Bd);}
    else{r(11,18+b,1,14,P.B);r(10,29+b,5,2,P.Bd);}
   }else{
    drape(side?[[12,24+b],[16,25+b],[16,38+b],[12,40+b],[10,37+b]]:[[12,24+b],[20,24+b],[21,37+b],[16,41+b],[11,37+b]],{role:'outfit',flow:'hang'});
    r(side?12:13,28+b,side?3:6,3,P.Bd);r(side?12:13,28+b,side?3:6,1,T);r(side?14:18,32+b,1,4,T);
   }
  }
  if(type==='watchtower'){
   drape(side?[[10,16+b],[17,16+b],[20,19+b],[12,24+b],[8,22+b]]:[[5,17+b],[11,15+b],[16,18+b],[22,15+b],[27,18+b],[24,25+b],[18,21+b],[13,22+b],[7,24+b]],{role:'outfit',flow:'wrap'});
   motif(side?15:8,19+b,'tower');
  }
  if(type==='command'&&back){motif(16,29+b,'bear');r(12,40+b,1,3,T);r(20,40+b,1,3,T);}
  if(type==='support'&&!side){motif(22,19+b,'bear');r(11,32+b,2,3,P.B);}
  if(type!=='none'&&!back&&!side)motif(16,21+b,type==='watchtower'?'tower':'bear');
  if(back&&['community','visuals'].includes(type))motif(16,28+b,type==='community'?'flower':'star');
  // Tiny role-specific helmet fittings; ear modules and visor remain visible.
  if(cfg.headgear==='goggles'){
   if(side){r(13,4+b,7,1,P.B);disc(16,4+b,1.5,T);}else{r(11,4+b,10,1,P.B);disc(13,4+b,1.5,T);disc(19,4+b,1.5,T);}
  }else if(cfg.headgear==='crest'){poly(side?[[13,3+b],[15,1+b],[17,4+b]]:[[14,3+b],[16,1+b],[18,3+b],[16,5+b]],T,true);}
  else if(cfg.headgear==='swept'){poly(side?[[11,4+b],[18,2+b],[20,4+b],[15,5+b]]:[[11,4+b],[14,2+b],[20,2+b],[21,4+b],[16,5+b]],P.S,true);r(side?14:14,3+b,side?4:5,.6,P.R);}
 };
 // Keep the original garment geometry; redraw the near arm above profile clothing.
 return {rear:tails,front,wrapsProfile:side&&(long||type==='engineer'||type==='explorer')};
}
