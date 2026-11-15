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
 // At explicit rear-view quarter-cycle poses, one arm reaches away and must be
 // occluded where it overlaps the rear silhouette; the other swings toward us.
 let rearOccluded=0,rearNearVisible=0;
 for(const role of ['survey','maintenance'])for(const frame of [2,6]){
  const rig=F.industrialEcho({role}),evaluated=F.evaluateUnit(rig,'up','walk',frame,8),near=frame===2?'R':'L',far=frame===2?'L':'R';
  const isArm=(p,label)=>p.id.startsWith('arm.'+label+'.')||p.id==='tool.'+label||p.id.startsWith('tool.'+label+'.')||p.id==='claw.'+label;
  const render=parts=>{const r={...evaluated,unitSpec:undefined,views:{up:parts}},c=cv(56,80);M.renderRig(c.getContext('2d'),r,'up','walk',frame,8,56,80,{outline:false});return px(c);};
  const parts=evaluated.views.up;for(const p of parts)if(isArm(p,near)||isArm(p,far)){p.c='accent';delete p.g;p.wx=0;}
  const full=render(parts),only=label=>render(parts.map(p=>isArm(p,label)?p:{...p,s:'tex',t:'missing'})),body=render(parts.map(p=>isArm(p,near)||isArm(p,far)?{...p,s:'tex',t:'missing'}:p));
  const n=only(near),f=only(far);let nearOverlap=0,hidden=0;
  for(let i=0;i<full.length;i+=4){if(n[i+3]){armPixels++;if(body[i+3])nearOverlap++;if(![0,1,2,3].every(k=>full[i+k]===n[i+k]))throw Error('near rear arm is hidden');}if(f[i+3]&&body[i+3]&&[0,1,2,3].every(k=>full[i+k]===body[i+k]))hidden++;}
  if(!hidden)throw Error('away-swing rear arm never occluded');rearOccluded+=hidden;rearNearVisible+=nearOverlap;
 }
 if(!rearNearVisible)throw Error('no tested near-arm/body overlap');
 return {stableOutfits,stableEcho,armPixels,profileArmSamples,rearOccluded,rearNearVisible};
}
