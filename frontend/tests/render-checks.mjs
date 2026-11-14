export async function renderChecks({beforeOnly=false,currentPrefix='/studio/lib/',baselinePrefix='/__baseline__/'}={}) {
  const current = await import(currentPrefix+'sprite-rig.js'); const old = await import(baselinePrefix+'sprite-rig.js');
  const machine = await import(currentPrefix+'machine-rig.js'); const oldMachine = await import(baselinePrefix+'machine-rig.js');
  const presets = await import(currentPrefix+'machine-presets.js');
  const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const canvas = (w,h) => Object.assign(document.createElement('canvas'),{width:w,height:h});
  const pixels = cv => cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const equal = (a,b) => a.length===b.length && a.every((v,i)=>v===b[i]);
  const valid = cv => {const a=pixels(cv);let opaque=0;for(let i=3;i<a.length;i+=4){if(a[i]!==0&&a[i]!==255)throw Error('partial alpha');if(a[i])opaque++;}if(!opaque)throw Error('empty render');return opaque;};
  let classic=0, sleek=0, mirrors=0, unchangedPivots=0; const previews=[];
  for (const [name,cfg0] of Object.entries(old.PRESETS)) {
   for (const [w,h] of [[32,56],[64,112]]) for (const type of old.ANIM_TYPES) for (const dir of old.DIRS) for (const i of [0,2,5]) {
    const cfg=JSON.parse(JSON.stringify(cfg0)); delete cfg.style; const pose=old.poseFor(type,i,6);
    if(JSON.stringify(current.poseFor(type,i,6))!==JSON.stringify(pose))throw Error('pose library changed');
    const a=canvas(w,h),b=canvas(w,h);old.drawAndroid(a.getContext('2d'),cfg,dir,pose,w,h);current.drawAndroid(b.getContext('2d'),cfg,dir,pose,w,h);valid(b);
    if(!equal(pixels(a),pixels(b)))throw Error('legacy humanoid changed '+[name,w,type,dir,i]);classic++;
    if(!beforeOnly){const s=canvas(w,h);current.drawAndroid(s.getContext('2d'),{...cfg,style:'sleek'},dir,pose,w,h);valid(s);sleek++;}
   }
   const sizes=[64,112];const frames=[];
   for(let i=0;i<6;i++)for(const dir of old.DIRS){for(const style of ['classic', 'sleek']){
    const cfg={...cfg0,style};const cv=canvas(...sizes);(style==='classic'?old:current).drawAndroid(cv.getContext('2d'),cfg,dir,old.poseFor('walk',i,6),...sizes);
    frames.push({dir,i,style,png:cv.toDataURL('image/png')});
   }}
   previews.push({name,kind:'humanoid',w:64,h:112,frames});
  }
  for(const [name,build] of Object.entries(presets.MACHINE_PRESETS)){
   const rig=build();
   for(const type of Object.keys(rig.anims))for(const dir of old.DIRS)for(const i of [0,3,7]){
    const a=canvas(rig.w,rig.h),b=canvas(rig.w,rig.h);oldMachine.renderRig(a.getContext('2d'),rig,dir,type,i,8,rig.w,rig.h);machine.renderRig(b.getContext('2d'),rig,dir,type,i,8,rig.w,rig.h);valid(b);
    if(!equal(pixels(a),pixels(b)))throw Error('legacy machine changed '+[name,type,dir,i]);classic++;
    if(!beforeOnly){const r={...rig,style:'sleek'},s=canvas(rig.w,rig.h);const m1=machine.renderRig(s.getContext('2d'),r,dir,type,i,8,rig.w,rig.h);valid(s);sleek++;
     const m0=oldMachine.renderRig(null,rig,dir,type,i,8,rig.w,rig.h,{pivotsOnly:true});if(JSON.stringify(m0)!==JSON.stringify(m1))throw Error('machine pivot changed');unchangedPivots++;}
   }
   const frames=[];for(let i=0;i<8;i++)for(const dir of old.DIRS)for(const style of ['classic','sleek']){
    const cv=canvas(rig.w,rig.h);(style==='classic'?oldMachine:machine).renderRig(cv.getContext('2d'),{...rig,style},dir,'walk',i,8,rig.w,rig.h);frames.push({i,dir,style,png:cv.toDataURL('image/png')});
   }previews.push({name,kind:'machine',w:rig.w,h:rig.h,frames});
  }
  // Same skeletal data and metadata, including imported tex rigs, are not a styling target.
  const tex={w:8,h:8,colors:{},weather:{},texPal:['#ffffff','#00ffff'],texGlow:[2],tex:{t:{w:3,h:3,d:'111120111'}},views:{down:[{id:'t',s:'tex',t:'t',x:4,y:2,w:3,h:3}]},anims:{idle:{}}};
  const ta=canvas(16,16),tb=canvas(16,16);oldMachine.renderRig(ta.getContext('2d'),tex,'down','idle',0,1,16,16);machine.renderRig(tb.getContext('2d'),{...tex,style:'sleek'},'down','idle',0,1,16,16);if(!equal(pixels(ta),pixels(tb)))throw Error('reference textures modified');
  const rig=presets.MACHINE_PRESETS['Hexapod Cartography Engine']();
  for(const style of ['classic','sleek']){const r=canvas(rig.w,rig.h),l=canvas(rig.w,rig.h);machine.renderRig(r.getContext('2d'),{...rig,style},'right','walk',2,8,rig.w,rig.h);machine.renderRig(l.getContext('2d'),{...rig,style},'left','walk',2,8,rig.w,rig.h);const a=pixels(r),b=pixels(l);for(let y=0;y<rig.h;y++)for(let x=0;x<rig.w;x++)for(let j=0;j<4;j++)if(a[(y*rig.w+x)*4+j]!==b[(y*rig.w+rig.w-1-x)*4+j])throw Error('machine mirror');mirrors++;}
  let wardrobe=0;
  const options=[{scarf:'wrap'},{scarf:'trailing'},{scarf:'cowl'},{hood:'raised'},{hood:'draped'},{drapery:'mantle'},{drapery:'tabard'},{drapery:'split'},{overgrowth:3},{damage:3,damageType:'cracked'},{damage:3,damageType:'exposed'},{damage:3,damageType:'scorched'}];
  if(!beforeOnly){
   const base={...current.DEFAULT_CFG,fins:false,cloak:'none'};
   for(const opt of options)for(const [w,h] of [[32,56],[64,112]])for(const dir of current.DIRS)for(let i=0;i<6;i++){
    const cv=canvas(w,h);current.drawAndroid(cv.getContext('2d'),{...base,...opt,clothWear:2},dir,current.poseFor('walk',i,6),w,h);valid(cv);wardrobe++;
   }
   const cv=canvas(64,112);current.drawAndroid(cv.getContext('2d'),{...base,facePanel:'smooth'},'down',{b:0},64,112,{outline:false});
   const a=pixels(cv),color=(x,y)=>[...a.slice((y*64+x)*4,(y*64+x)*4+3)];
   const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
   for(const y of [8,12,13])if(!equal(color(31,y*2),rgb(base.colors.under)))throw Error('center visor strip returned');
   const clean=canvas(64,112),grown=canvas(64,112);current.drawAndroid(clean.getContext('2d'),base,'down',{b:0},64,112);current.drawAndroid(grown.getContext('2d'),{...base,overgrowth:3},'down',{b:0},64,112);const cl=pixels(clean),gr=pixels(grown);for(let y=4;y<30;y++)for(let x=20;x<44;x++)for(let j=0;j<4;j++)if(cl[(y*64+x)*4+j]!==gr[(y*64+x)*4+j])throw Error('growth crossed the face');
   for(const [name,cfg] of Object.entries(current.PRESETS).filter(([n])=>/—/.test(n))){const frames=[];for(let i=0;i<6;i++)for(const dir of current.DIRS){const cv=canvas(64,112);current.drawAndroid(cv.getContext('2d'),cfg,dir,current.poseFor('walk',i,6),64,112);frames.push({dir,i,style:'wardrobe',png:cv.toDataURL()});}previews.push({name,kind:'wardrobe',w:64,h:112,frames});}
  }
  return {classic,sleek,mirrors,unchangedPivots,wardrobe,previews,defaultStyle:current.DEFAULT_CFG.style||'classic'};

}
