export async function unitFamilyChecks(prefix){
 const {industrialEcho,evaluateUnit}=await import(prefix+'unit-families.js'),{validateRig,solveTwoBone}=await import(prefix+'rig-safety.js'),{renderRig}=await import(prefix+'machine-rig.js'),{fitMachineProject}=await import(prefix+'machine-bounds.js'),SS=await import(prefix+'sprite-sheet.js');
 const assert=(v,m)=>{if(!v)throw Error(m);},cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});let reach=0,renders=0;
 for(const a of [0,.2,4,16.5,100])for(const bend of [-1,1]){const r=solveTwoBone({x:0,y:0},{x:a,y:a},8,8.5,bend);assert(Math.abs(Math.hypot(r.knee.x,r.knee.y)-8)<1e-8,'upper length');assert(Math.abs(Math.hypot(r.knee.x-r.ankle.x,r.knee.y-r.ankle.y)-8.5)<1e-8,'lower length');reach++;}
 const custom=SS.machineProject('Custom aspect',industrialEcho());custom.sets.exploration.fw+=1;let failed=false;try{fitMachineProject(custom);}catch{failed=true;}assert(failed&&custom.rig.w===56,'custom aspect silently rescaled');
 let rearArmCases=0;
 for(const role of ['survey','maintenance'])for(const type of ['idle','walk','attack','charge','hurt','malfunction','defeat'])for(let i=0;i<8;i++){
  const r=industrialEcho({role}),front=evaluateUnit(r,'down',type,i,8),back=evaluateUnit(r,'up',type,i,8);
  for(const id of ['arm.L.upper','arm.L.fore','arm.R.upper','arm.R.fore']){const a=front.views.down.find(p=>p.id===id),b=back.views.up.find(p=>p.id===id);assert(Math.abs(a.r+b.r)<1e-8,'back arm repeats front-facing motion');}
  const old=structuredClone(r);if(role==='maintenance')old.views.up.find(p=>p.id==='claw.R').x=2;
  assert(JSON.stringify(evaluateUnit(old,'up',type,i,8).views.up)===JSON.stringify(back.views.up),'saved back-arm correction differs');rearArmCases++;
 }
 const rig=industrialEcho(),cycle=structuredClone(rig);const arm=d=>rig.views[d].find(p=>p.id==='arm.R.upper');assert(arm('down').x<0&&arm('up').x>0&&arm('right').z>0&&arm('left').z<0,'physical right tool changed sides');cycle.views.down[0].p='spine';let rejected=false;try{validateRig(cycle);}catch{rejected=true;}assert(rejected,'cycle accepted');
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
 const G=await import(prefix+'grid-families.js');
 // A planted foot cancels constant world travel, including the slower ripple stride.
 for(const duty of [.6,5/6]){const a=G.crawlerStep(.1,duty),b=G.crawlerStep(.2,duty);assert(Math.abs(b.x-a.x+10/duty*.1)<1e-8,'planted crawler foot slides');}
let gridRenders=0,gridBounds=0,contacts=0,vineConnections=0;
 for(const gait of ['tripod','ripple'])for(let i=0;i<120;i++){let support=0;for(let k=0;k<6;k++){const phase=gait==='ripple'?k/6:([0,2,4].includes(k)?0:.5);if(G.crawlerStep(i/120+phase,gait==='ripple'?5/6:.6).stance)support++;}assert(support>=(gait==='ripple'?5:3),'crawler support lost');contacts++;}
 for(const build of [()=>G.gridCrawler(),()=>G.gridCrawler({gait:'ripple',role:'salvager'}),()=>G.orbitalCore(),()=>G.orbitalCore({role:'relay'})]){
  const original=build(),p=SS.machineProject(original.name,original);fitMachineProject(p);const anchor=JSON.stringify(p.rig.groundAnchor);
  for(const d of ['down','up','right','left'])for(const type of Object.keys(original.anims))for(let i=0;i<8;i++){
   const e=evaluateUnit(p.rig,d,type,i,8);assert(JSON.stringify(e.groundAnchor)===anchor,'hover anchor moved');validateRig(e);
   if(original.unitSpec.family==='six-leg-crawler'){for(const id of G.CRAWLER_LEGS){const u=e.views[d].find(x=>x.id==='leg.'+id+'.upper'),l=e.views[d].find(x=>x.id==='leg.'+id+'.lower');assert(u.h===22&&l.h===24,'crawler bone length changed');}}
   const c=cv(p.rig.w,p.rig.h);renderRig(c.getContext('2d'),p.rig,d,type,i,8,c.width,c.height);const px=c.getContext('2d').getImageData(0,0,c.width,c.height).data;assert(px.some((v,k)=>k%4===3&&v===255),'empty Grid view');assert(px.every((v,k)=>k%4!==3||v===0||v===255),'Grid alpha');gridRenders++;
   // Isolate roots/strands while retaining their complete parent transforms. Every vine pixel
   // must belong to the connected root patch at native scale (8-neighbour raster adjacency).
   const mask=structuredClone(p.rig),id=original.unitSpec.family==='six-leg-crawler'?'growth':'rooted-growth';
   for(const parts of Object.values(mask.views))for(const part of parts)if(part.id!==id&&part.id!==id+'.root'){part.s='tex';part.t='missing';}
   const mc=cv(p.rig.w,p.rig.h);renderRig(mc.getContext('2d'),mask,d,type,i,8,mc.width,mc.height,{outline:false});const alpha=mc.getContext('2d').getImageData(0,0,mc.width,mc.height).data,all=[];
   for(let k=3;k<alpha.length;k+=4)if(alpha[k])all.push((k-3)/4);assert(all.length,'missing rooted growth');const seen=new Set([all[0]]),queue=[all[0]];
   for(let q=0;q<queue.length;q++){const v=queue[q],x=v%mc.width,y=Math.floor(v/mc.width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*mc.width+xx;if(xx>=0&&xx<mc.width&&yy>=0&&yy<mc.height&&alpha[k*4+3]&&!seen.has(k)){seen.add(k);queue.push(k);}}}
   assert(seen.size===all.length,'detached vine pixels');vineConnections++;
   const b=renderRig(null,p.rig,d,type,i,8,p.rig.w,p.rig.h,{boundsOnly:true});assert(b.left>=0&&b.top>=0&&b.right<=p.rig.w&&b.bottom<=p.rig.h,'Grid clipping');gridBounds++;
  }
  // Older saved Grid recipes receive the same attachment correction on regeneration.
  const legacy=structuredClone(original),vid=original.unitSpec.family==='six-leg-crawler'?'growth':'rooted-growth';
  for(const d of ['down','up','right','left']){legacy.views[d]=legacy.views[d].filter(x=>x.id!==vid+'.root');const v=legacy.views[d].find(x=>x.id===vid);delete v.rootSocket;Object.assign(v,{p:original.unitSpec.family==='six-leg-crawler'?'mast':'core',x:-18,y:-16,w:18});const repaired=evaluateUnit(legacy,d,'walk',2,8).views[d],fresh=evaluateUnit(original,d,'walk',2,8).views[d];assert(JSON.stringify(repaired)===JSON.stringify(fresh),'saved vine repair differs');}
  const reopened=await SS.deserialize(SS.serialize(p));assert(reopened.rig.unitSpec.family===original.unitSpec.family,'Grid save family');assert(JSON.stringify(reopened.rig.groundAnchor)===anchor,'Grid save anchor');
 }
 return {rearArmCases,vineConnections,gridRenders,gridBounds,contacts,reach,renders,bounds,pages:atlas.pages.length,frames:atlas.meta.frames.length,family:rig.unitSpec.family};
}
