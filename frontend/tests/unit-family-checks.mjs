export async function unitFamilyChecks(prefix){
 const {industrialEcho,evaluateUnit}=await import(prefix+'unit-families.js'),{validateRig,solveTwoBone}=await import(prefix+'rig-safety.js'),{renderRig}=await import(prefix+'machine-rig.js'),{fitMachineProject}=await import(prefix+'machine-bounds.js'),SS=await import(prefix+'sprite-sheet.js');
 const assert=(v,m)=>{if(!v)throw Error(m);},cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});let reach=0,renders=0;
 for(const a of [0,.2,4,16.5,100])for(const bend of [-1,1]){const r=solveTwoBone({x:0,y:0},{x:a,y:a},8,8.5,bend);assert(Math.abs(Math.hypot(r.knee.x,r.knee.y)-8)<1e-8,'upper length');assert(Math.abs(Math.hypot(r.knee.x-r.ankle.x,r.knee.y-r.ankle.y)-8.5)<1e-8,'lower length');reach++;}
 const custom=SS.machineProject('Custom aspect',industrialEcho());custom.sets.exploration.fw+=1;let failed=false;try{fitMachineProject(custom);}catch{failed=true;}assert(failed&&custom.rig.w===56,'custom aspect silently rescaled');
 const rig=industrialEcho(),cycle=structuredClone(rig);cycle.views.down[0].p='spine';let rejected=false;try{validateRig(cycle);}catch{rejected=true;}assert(rejected,'cycle accepted');
 const missing=structuredClone(rig);missing.views.down[1].p='missing';rejected=false;try{validateRig(missing);}catch{rejected=true;}assert(rejected,'missing socket accepted');
 const p=SS.machineProject('Industrial Echo study',rig);fitMachineProject(p);let bounds=0;
 for(const d of ['down','up','right','left'])for(const type of Object.keys(rig.anims))for(let i=0;i<8;i++){
  const c=cv(p.rig.w,p.rig.h);renderRig(c.getContext('2d'),p.rig,d,type,i,8,c.width,c.height);const px=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let j=3;j<px.length;j+=4){assert(px[j]===0||px[j]===255,'family alpha');count+=!!px[j];}assert(count,'empty family');renders++;
 }
 for(const s of Object.values(p.sets))for(const d of s.dirs)for(const a of s.anims)for(let i=0;i<a.frames;i++){const b=renderRig(null,p.rig,d,a.type,i,a.frames,p.rig.w,p.rig.h,{boundsOnly:true});assert(b.left>=-1e-8&&b.top>=-1e-8&&b.right<=p.rig.w+1e-8&&b.bottom<=p.rig.h+1e-8,'fitted bounds');bounds++;}
 // Pixel and registration translation through margin fitting, including a hand edit.
 const old=SS.machineProject('Heavy', (await import(prefix+'machine-presets.js')).MACHINE_PRESETS['Heavy Sentinel (humanoid titan)']()),s=old.sets.exploration,c=SS.cell(s,'down','idle',0);c.getContext('2d').fillStyle='#12ab34';c.getContext('2d').fillRect(1,1,1,1);s.edited.add('down|idle|0');const pad=fitMachineProject(old);assert(pad,'heavy not fitted');const pix=SS.cell(s,'down','idle',0).getContext('2d').getImageData(1+pad.x,1+pad.top,1,1).data;assert(pix[0]===18&&pix[1]===171&&pix[2]===52,'edit moved incorrectly');assert(s.edited.has('down|idle|0'),'edit flag lost');assert(old.tiles[0]===2&&old.tiles[1]===2,'footprint changed');
 const restored=await SS.deserialize(SS.serialize(old));assert(restored.sets.exploration.anchor.y===s.anchor.y,'anchor lost');
 // Force multiple pages and independently recompose every frame rectangle.
 const set=SS.newSet(20,20,['down','up'],[{name:'idle',type:'idle',frames:5,fps:8}]);for(const d of set.dirs)for(let i=0;i<5;i++){const x=SS.cell(set,d,'idle',i).getContext('2d');x.fillStyle=`rgb(${i*20+1},${d==='up'?100:10},33)`;x.fillRect(0,0,20,20);}
 const atlas=SS.buildAtlasPages(set,{},40);assert(atlas.pages.length===3,'page count');for(const f of atlas.meta.frames){assert(atlas.pages[f.page].width<=40&&atlas.pages[f.page].height<=40,'page limit');const x=atlas.pages[f.page].getContext('2d').getImageData(f.x,f.y,1,1).data,y=SS.cell(set,f.direction,f.animation,f.index).getContext('2d').getImageData(0,0,1,1).data;assert([...x].every((v,i)=>v===y[i]),'atlas rectangle wrong');}
 return {reach,renders,bounds,pages:atlas.pages.length,frames:atlas.meta.frames.length,family:rig.unitSpec.family};
}
