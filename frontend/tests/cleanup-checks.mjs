export async function cleanupChecks(prefix){
 const S=await import(prefix+'sprite-rig.js');
 const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const draw=(cfg,dir,w,h)=>{const c=canvas(w,h);S.drawAndroid(c.getContext('2d'),cfg,dir,{b:0,ph:0},w,h);return pixels(c);};
 const base={...S.DEFAULT_CFG,chassis:'lean-female',outfit:'none',headgear:'none',fins:false,cloak:'none',modules:true,pixelFinish:'legacy',moduleProfile:'wide'};
 let narrowed=0,sideMatches=0,classicMatches=0,alphaMatches=0;
 for(const [w,h] of [[32,56],[64,112]])for(const dir of S.DIRS){
  const a=draw(base,dir,w,h),b=draw({...base,moduleProfile:'narrow'},dir,w,h),k=w/32;let changed=0;
  for(let p=0;p<a.length;p+=4)if(a[p]!==b[p]||a[p+1]!==b[p+1]||a[p+2]!==b[p+2]||a[p+3]!==b[p+3]){
   changed++;const y=Math.floor(p/4/w);if(y<6*k||y>14*k)throw Error('module change escaped head');
  }
  if(['left','right'].includes(dir)){if(changed)throw Error('profile module changed');sideMatches++;}
  else{if(!changed)throw Error('module width did not change');
   const y=9*k;let ca=0,cb=0;for(let x=0;x<w;x++)if(x<11*k||x>=21*k){ca+=!!a[(y*w+x)*4+3];cb+=!!b[(y*w+x)*4+3];}if(cb>=ca)throw Error('front module not narrower');narrowed++;
  }
  const clean=draw({...base,pixelFinish:'clean'},dir,w,h);for(let p=3;p<a.length;p+=4)if(a[p]!==clean[p])throw Error('cleanup changed body silhouette');alphaMatches++;
  const classic=draw({...base,style:'classic'},dir,w,h),flags=draw({...base,style:'classic',moduleProfile:'narrow',pixelFinish:'clean'},dir,w,h);for(let p=0;p<classic.length;p++)if(classic[p]!==flags[p])throw Error('Classic finish changed');classicMatches++;
 }
 return {narrowed,sideMatches,alphaMatches,classicMatches};
}
