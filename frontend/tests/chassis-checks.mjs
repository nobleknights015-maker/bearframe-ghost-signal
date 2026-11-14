export async function chassisChecks(prefix){
 const S=await import(prefix+'sprite-rig.js'),C=await import(prefix+'android-chassis.js'),A=await import(prefix+'android-catalog.js');
 const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const valid=c=>{let count=0;for(const [i,v] of px(c).entries())if(i%4===3){if(v!==0&&v!==255)throw Error('chassis alpha');if(v)count++;}if(!count)throw Error('empty chassis');};
 let cases=0,bones=0,soles=0,outfits=0;const previews=[];
 for(const chassis of Object.keys(C.PROFILES))for(const [w,h] of [[32,56],[64,112]])for(const dir of S.DIRS)for(const type of S.ANIM_TYPES)for(let i=0;i<6;i++){
  const cfg={...S.DEFAULT_CFG,chassis,cloak:'none',fins:false},pose=S.poseFor(type,i,6),image=cv(w,h);S.drawAndroid(image.getContext('2d'),cfg,dir,pose,w,h);valid(image);cases++;
  const legs=C.chassisLegs(cfg,dir,pose);
  for(const L of legs){
   if(!L.projected){if(Math.abs(Math.hypot(L.knee.x-L.hip.x,L.knee.y-L.hip.y)-L.l1)>.002||Math.abs(Math.hypot(L.knee.x-L.ankle.x,L.knee.y-L.ankle.y)-L.l2)>.002)throw Error('leg segment length changed');bones++;}
   const k=w/32;if(L.ankle.y===50&&type==='walk'){
    const data=px(image),fy=Math.round((L.ankle.y+3)*k);let x=Math.round(L.ankle.x*k)+(Math.round((pose.lean||0)*k));if(dir==='left')x=w-1-x;
    if(!data[(fy*w+x)*4+3])throw Error('planted sole missing');soles++;
   }
  }
 }
 const generic={...S.DEFAULT_CFG,fins:false,cloak:'none',pouches:false};
 for(const chassis of ['standard','lean-male','lean-female','broad']){
  const frames=[];for(let i=0;i<6;i++)for(const dir of S.DIRS){const c=cv(64,112);S.drawAndroid(c.getContext('2d'),{...generic,chassis},dir,S.poseFor('walk',i,6),64,112);frames.push({dir,i,style:'chassis',png:c.toDataURL()});}previews.push({name:chassis,kind:'chassis',w:64,h:112,frames});
 }
 for(const [name,def] of Object.entries(A.CHARACTER_PRESETS)){
  const cfg={...S.DEFAULT_CFG,...structuredClone(def)},frames=[];
  for(const [w,h] of [[32,56],[64,112]])for(let i=0;i<6;i++)for(const dir of S.DIRS){const c=cv(w,h);S.drawAndroid(c.getContext('2d'),cfg,dir,S.poseFor('walk',i,6),w,h);valid(c);outfits++;if(w===64)frames.push({dir,i,style:'character',png:c.toDataURL()});}
  previews.push({name,kind:'character',w:64,h:112,frames});
 }
 // Body variants have distinct torso silhouettes even with every outfit removed.
 const signatures=[];for(const chassis of ['standard','lean-male','lean-female']){const c=cv(64,112);S.drawAndroid(c.getContext('2d'),{...generic,chassis},'down',{b:0},64,112);signatures.push(c.toDataURL());}if(new Set(signatures).size!==3)throw Error('body options identical');
 return {cases,bones,soles,outfits,previews};
}
