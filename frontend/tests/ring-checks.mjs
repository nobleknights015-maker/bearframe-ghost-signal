// Production renderer invariants: no clipping, body rescaling, face obstruction or lost edits.
export async function ringChecks(prefix){
 const S=await import(prefix+'sprite-rig.js'),R=await import(prefix+'android-rings.js'),SS=await import(prefix+'sprite-sheet.js');
 const cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
 const px=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const same=(a,b)=>a.length===b.length&&a.every((n,i)=>n===b[i]);
 const valid=c=>{let n=0;const d=px(c);for(let i=3;i<d.length;i+=4){if(d[i]!==0&&d[i]!==255)throw Error('ring alpha');if(d[i])n++;}if(!n)throw Error('empty ring sprite');};
 let cases=0,bodies=0,bounds=0;const previews=[];
 for(const style of R.RING_STYLES.filter(s=>s!=='none'))for(const size of R.RING_SIZES)for(const [baseW,baseH] of [[32,56],[40,70],[33,58],[64,112]]){
  const scale=Math.min(baseW/32,baseH/56);
  const base={...S.DEFAULT_CFG,fins:false,cloak:'none'},p=SS.humanoidProject('ring test',{...base,ring:style,ringSize:size,ringDamage:2,ringTags:true,ringMotion:'drift'});
  const set=p.sets.exploration;set.fw=baseW;set.fh=baseH;R.fitRingCanvas(p,SS.resizeSet);
  const shiftX=(set.fw-baseW)/2,shiftY=set.fh-baseH;
  for(const dir of S.DIRS)for(let i=0;i<6;i++){
   const pose=S.poseFor('walk',i,6),body=cv(baseW,baseH),image=cv(set.fw,set.fh);
   S.drawAndroid(body.getContext('2d'),base,dir,pose,body.width,body.height);S.drawAndroid(image.getContext('2d'),p.cfg,dir,pose,image.width,image.height);valid(image);cases++;
   const a=px(body),b=px(image);for(let y=0;y<body.height;y++)for(let xx=0;xx<body.width;xx++){
    const k=(y*body.width+xx)*4;if(!a[k+3]||(a[k]===8&&a[k+1]===7&&a[k+2]===11))continue;
    const v=((y+shiftY)*image.width+xx+shiftX)*4;
    for(let j=0;j<4;j++)if(a[k+j]!==b[v+j])throw Error('ring changed body/face scale or pixels '+[style,size,dir,i]);
   }bodies++;
   if(i===0||i===2||i===5)for(const lean of i===0?[-2,0,2]:[0]){
    const m=16,large=cv(set.fw+2*m,set.fh+2*m),K=scale;
    const X=v=>m+Math.round((set.fw-32*scale)/2)+Math.round(lean*scale)+Math.round(v*scale),Y=v=>m+Math.round(set.fh-56*scale)+Math.round(v*scale);
    R.drawRings(large.getContext('2d'),p.cfg,dir,pose,{K,X,Y});const data=px(large);
    for(let y=0;y<large.height;y++)for(let xx=0;xx<large.width;xx++)if((xx<m||y<m||xx>=m+set.fw||y>=m+set.fh)&&data[(y*large.width+xx)*4+3])throw Error('ring clips canvas '+[style,size,dir]);bounds++;
   }
  }
 }
 for(const ring of R.RING_STYLES.filter(s=>s!=='none'))for(const ringGlow of [0,3])for(const ringDamage of [0,3])for(const ringWidth of [1,3]){
  const p=SS.humanoidProject('light/damage',{...S.DEFAULT_CFG,ring,ringGlow,ringDamage,ringWidth});R.fitRingCanvas(p,SS.resizeSet);const set=p.sets.exploration,c=cv(set.fw,set.fh),pad=p.cfg.ringPadding;
  R.drawRings(c.getContext('2d'),p.cfg,'down',{b:0,ph:0},{K:1,X:x=>pad.x+Math.round(x),Y:y=>pad.top+Math.round(y)});valid(c);
 }
 // Monotonic canvas expansion and feet-anchored edited-pixel preservation.
 const p=SS.humanoidProject('edited',{...S.DEFAULT_CFG});const cell=SS.cell(p.sets.exploration,'down','idle',0);cell.getContext('2d').fillStyle='#12ab34';cell.getContext('2d').fillRect(0,0,1,1);p.sets.exploration.edited.add('down|idle|0');
 p.cfg.ring='double';p.cfg.ringSize='large';p.cfg.ringTags=true;R.fitRingCanvas(p,SS.resizeSet);const pad={...p.cfg.ringPadding},dims=[p.sets.exploration.fw,p.sets.exploration.fh];
 if(!same([...SS.cell(p.sets.exploration,'down','idle',0).getContext('2d').getImageData(pad.x,pad.top,1,1).data],[18,171,52,255]))throw Error('ring fit lost edit');
 p.cfg.ring='none';R.fitRingCanvas(p,SS.resizeSet);if(!same(dims,[p.sets.exploration.fw,p.sets.exploration.fh]))throw Error('ring removal shrank canvas');
 const restored=await SS.deserialize(SS.serialize(p));if(JSON.stringify(restored.cfg.ringPadding)!==JSON.stringify(pad)||!restored.sets.exploration.edited.has('down|idle|0'))throw Error('ring config/edit save');
 const {meta}=SS.buildSheet(p.sets.exploration);if(meta.anchor.y!==dims[1]||meta.anchor.x!==dims[0]/2||p.tiles[0]!==1)throw Error('ring anchor/footprint changed');
 for(const [style,name] of [['halo','Solid halo'],['segmented','Segmented archive halo'],['broken','Broken relay array'],['orbit','Tilted orbital array'],['double','Double archive array']]){
  const cfg={...S.PRESETS[style==='broken'?'Echo — relay pilgrim':'Ghost Grid — archive cowl'],ring:style,ringSize:'large',ringTags:style==='broken',ringDamage:style==='broken'?2:0,ringMotion:style==='orbit'?'drift':'pulse',overgrowth:1};
  cfg.colors={...cfg.colors,ringMaterial:style==='orbit'?'#9c8261':cfg.colors.armor,ringGlow:style==='broken'?'#bf7ce8':style==='orbit'?'#e6bd66':'#55d6e3'};
  const p=SS.humanoidProject(name,cfg);p.sets.exploration.fw=64;p.sets.exploration.fh=112;R.fitRingCanvas(p,SS.resizeSet);const s=p.sets.exploration,frames=[];
  for(let i=0;i<6;i++)for(const dir of S.DIRS){const c=cv(s.fw,s.fh);S.drawAndroid(c.getContext('2d'),p.cfg,dir,S.poseFor('walk',i,6),s.fw,s.fh);frames.push({dir,i,style:'ring',png:c.toDataURL()});}
  previews.push({name,kind:'rings',w:s.fw,h:s.fh,frames});
 }
 return {cases,bodies,bounds,previews};
}
