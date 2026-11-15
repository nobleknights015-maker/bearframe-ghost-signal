export async function layerChecks(prefix,beforePrefix){
 const S=await import(prefix+'sprite-rig.js'),M=await import(prefix+'machine-rig.js'),F=await import(prefix+'unit-families.js'),A=await import(prefix+'android-catalog.js');
 const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);let stableOutfits=0,stableEcho=0,armPixels=0,profileArmSamples=0;
 if(beforePrefix){const old=await import(beforePrefix+'sprite-rig.js'),om=await import(beforePrefix+'machine-rig.js'),of=await import(beforePrefix+'unit-families.js');
  for(const def of Object.values(A.CHARACTER_PRESETS))for(const d of ['down','up'])for(let i=0;i<6;i++)for(const [w,h] of [[32,56],[64,112]]){const a=cv(w,h),b=cv(w,h),cfg={...S.DEFAULT_CFG,...structuredClone(def)},pose=S.poseFor('walk',i,6);old.drawAndroid(a.getContext('2d'),cfg,d,pose,w,h);S.drawAndroid(b.getContext('2d'),cfg,d,pose,w,h);if(!equal(px(a),px(b)))throw Error('front/back outfit changed');stableOutfits++;}
  for(const role of ['survey','maintenance'])for(const d of ['down','right','left'])for(const type of ['idle','walk','attack','charge','hurt','malfunction','defeat'])for(let i=0;i<8;i++){const a=cv(56,80),b=cv(56,80);om.renderRig(a.getContext('2d'),of.industrialEcho({role}),d,type,i,8,56,80);M.renderRig(b.getContext('2d'),F.industrialEcho({role}),d,type,i,8,56,80);if(!equal(px(a),px(b)))throw Error('non-back Echo changed');stableEcho++;}
 }
 // Forearm and hand centers must remain visible through the profile garment pass.
 for(const def of Object.values(A.CHARACTER_PRESETS))for(const d of ['right','left'])for(let i=0;i<6;i++){
  const cfg={...S.DEFAULT_CFG,...structuredClone(def)},pose=S.poseFor('walk',i,6),a=cv(64,112),b=cv(64,112);S.drawAndroid(a.getContext('2d'),{...cfg,outfit:'none'},d,pose,64,112);S.drawAndroid(b.getContext('2d'),cfg,d,pose,64,112);const bare=px(a),dressed=px(b),elbow={x:16+pose.a*.3,y:26+pose.b},wrist={x:16+pose.a*.5,y:33+pose.b+pose.a*.35};
  for(const t of [.35,.65,1]){let x=Math.round((elbow.x+(wrist.x-elbow.x)*t)*2),y=Math.round((elbow.y+(wrist.y-elbow.y)*t)*2);if(d==='left')x=63-x;const at=(y*64+x)*4;if(![0,1,2,3].every(k=>bare[at+k]===dressed[at+k]))throw Error('profile outfit hides forearm or hand');profileArmSamples++;}
 }
 // Owner-approved layering: rear fabric stays above both arm chains throughout walking.
 let rearFabricPixels=0;
 for(const role of ['survey','maintenance'])for(let frame=0;frame<8;frame++){
  const rig=F.industrialEcho({role}),parts=rig.views.up,mask=structuredClone(rig);
  for(const p of mask.views.up)if(p.id!=='mantle'){p.s='tex';p.t='missing';}
  const a=cv(56,80),b=cv(56,80);M.renderRig(a.getContext('2d'),rig,'up','walk',frame,8,56,80,{outline:false});M.renderRig(b.getContext('2d'),mask,'up','walk',frame,8,56,80,{outline:false});const full=px(a),fabric=px(b);
  for(let i=0;i<full.length;i+=4)if(fabric[i+3]){if(![0,1,2,3].every(k=>full[i+k]===fabric[i+k]))throw Error('back fabric is covered by arms');rearFabricPixels++;}
 }
 return {stableOutfits,stableEcho,armPixels,profileArmSamples,rearFabricPixels};
}
