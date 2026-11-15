export async function motionChecks(prefix){
 const H=await import(prefix+'heavy-motion.js'),T=await import(prefix+'clip-timing.js'),F=await import(prefix+'world-varieties.js'),M=await import(prefix+'machine-rig.js'),SS=await import(prefix+'sprite-sheet.js'),B=await import(prefix+'machine-bounds.js');
 const ok=(v,m)=>{if(!v)throw Error(m);},cv=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 let stanceSamples=0,footChecks=0,loopChecks=0;
 for(let i=0;i<600;i++){const t=i/600;ok([H.heavyStep(t),H.heavyStep(t+.5)].filter(x=>x.stance).length>=1,'heavy has airborne phase');stanceSamples++;}
 for(const t of [.05,.1,.2,.3]){const a=H.heavyStep(t),b=H.heavyStep(t+.01);ok(a.stance&&b.stance&&Math.abs(b.x-a.x+H.HEAVY_GAIT.strideLength*.01)<1e-9,'heavy stance slides in world space');}
 for(const role of ['bulwark','breaker']){
  const r=F.ancientDefender({role}),p=SS.machineProject(role,r);B.fitMachineProject(p);const anchor=JSON.stringify(p.rig.groundAnchor);
  for(const d of ['down','up','right','left'])for(let i=0;i<12;i++){
   const e=H.evaluateHeavy(p.rig,d,'walk',i,12),markers=M.renderRig(null,p.rig,d,'walk',i,12,p.rig.w,p.rig.h,{pivotsOnly:true});ok(JSON.stringify(e.groundAnchor)===anchor,'heavy anchor moves');
   for(const q of e.heavyPose){ok(!q.clamped,'normal heavy pose outside reach');ok(Math.abs(Math.hypot(q.knee.x-q.hip.x,q.knee.y-q.hip.y)-20)<1e-8,'heavy femur stretches');ok(Math.abs(Math.hypot(q.ankle.x-q.knee.x,q.ankle.y-q.knee.y)-19)<1e-8,'heavy shin stretches');const boot=markers.find(m=>m.id==='leg.'+q.limb+'.foot');ok(Math.abs(boot.y+7-q.soleY)<1e-8,'boot offset rotates sole off floor');if(q.stance&&['right','left'].includes(d))ok(Math.abs(q.soleY-p.rig.groundAnchor.y)<1e-8,'planted heavy sole lifts');footChecks++;}
  }
  for(const d of ['down','up','right','left'])for(const type of ['idle','walk']){const n=type==='walk'?12:8,a=cv(p.rig.w,p.rig.h),b=cv(p.rig.w,p.rig.h);M.renderRig(a.getContext('2d'),p.rig,d,type,0,n,a.width,a.height);M.renderRig(b.getContext('2d'),p.rig,d,type,n,n,b.width,b.height);const x=pixels(a),y=pixels(b);ok(x.every((v,i)=>v===y[i]),'heavy material/pose loop does not close');loopChecks++;}
 }
 const S=await import(prefix+'slender-motion.js');let slenderFeet=0,slenderLoops=0;
 for(let i=0;i<600;i++){const t=i/600;ok(S.slenderStep(t).stance||S.slenderStep(t+.5).stance,'slender has airborne phase');}
 for(const t of [.05,.1,.2,.3]){const a=S.slenderStep(t),b=S.slenderStep(t+.01);ok(Math.abs(b.x-a.x+S.SLENDER_GAIT.strideLength*.01)<1e-9,'slender stance slides');}
 for(const role of ['keeper','surveyor']){
  const p=SS.machineProject(role,F.slenderCustodian({role}));B.fitMachineProject(p);const original=JSON.stringify(p.rig),anchor=JSON.stringify(p.rig.groundAnchor);
  for(const d of ['down','up','right','left']){
   const hashes=new Set();
   for(let i=0;i<12;i++){
    const e=S.evaluateSlender(p.rig,d,'walk',i,12),markers=M.renderRig(null,p.rig,d,'walk',i,12,p.rig.w,p.rig.h,{pivotsOnly:true});ok(JSON.stringify(e.groundAnchor)===anchor,'slender anchor moves');
    for(const q of e.slenderPose){ok(!q.clamped,'slender normal reach clamps');ok(Math.abs(Math.hypot(q.knee.x-q.hip.x,q.knee.y-q.hip.y)-18)<1e-8,'slender femur stretches');ok(Math.abs(Math.hypot(q.ankle.x-q.knee.x,q.ankle.y-q.knee.y)-19)<1e-8,'slender shin stretches');const boot=markers.find(m=>m.id==='leg.'+q.limb+'.foot');ok(Math.abs(boot.y+5-q.soleY)<1e-8,'slender sole offset');if(q.stance&&['right','left'].includes(d))ok(Math.abs(q.soleY-p.rig.groundAnchor.y)<1e-8,'slender planted sole lifts');slenderFeet++;}
    if(role==='surveyor')ok(e.views[d].find(p=>p.id==='probe.R').p==='hand.R','surveyor probe detached');
    const c=cv(p.rig.w,p.rig.h);M.renderRig(c.getContext('2d'),p.rig,d,'walk',i,12,c.width,c.height);hashes.add(c.toDataURL());
   }
   ok(hashes.size===12,'slender duplicated walk poses');
   const a=cv(p.rig.w,p.rig.h),b=cv(p.rig.w,p.rig.h);M.renderRig(a.getContext('2d'),p.rig,d,'walk',0,12,a.width,a.height);M.renderRig(b.getContext('2d'),p.rig,d,'walk',12,12,b.width,b.height);const bp=pixels(b);ok(pixels(a).every((v,i)=>v===bp[i]),'slender loop seam');slenderLoops++;
  }
  ok(JSON.stringify(p.rig)===original,'slender evaluator mutates source');const saved=await SS.deserialize(SS.serialize(p));ok(saved.rig.locomotion.controller==='slender-v1','slender controller lost on save');
  const legacy=structuredClone(p.rig);delete legacy.locomotion;ok(S.evaluateSlender(legacy,'down','walk',1,12)===legacy,'old saved study silently animated');
 }
 const a={name:'proof',type:'idle',frames:3,fps:10,loop:false,durationsMs:[100,300,200],events:[{frame:0,name:'start'},{frame:1,name:'impact'}]};
 for(const [ms,index] of [[0,0],[99,0],[100,1],[399,1],[400,2],[600,2],[9000,2]])ok(T.frameAtTime(a,ms).index===index,'held-frame clock wrong');ok(T.frameAtTime(a,600).done,'one-shot restarts');ok(T.frameAtTime({...a,loop:true},600).index===0,'loop boundary wrong');ok(T.eventsBetween(a,-1,600).map(e=>e.name).join(',')==='start,impact','one-shot events wrong');ok(T.eventsBetween({...a,loop:true},-1,700).map(e=>e.timeMs).join(',')==='0,100,600,700','loop-crossing events wrong');
 for(const bad of [{...a,durationsMs:[0,300,200]},{...a,events:[{frame:3,name:'bad'}]},{...a,loop:'yes'}]){let threw=false;try{T.clipTiming(bad);}catch{threw=true;}ok(threw,'invalid timing accepted');}
 ok(T.resizeClip(a,7).events[1].frame===3,'one-shot event retime wrong');ok(T.resizeClip({...a,loop:true},6).events[1].frame===2,'loop event retime wrong');
 const set=SS.newSet(4,4,['down'],[a]);const atlas=SS.buildAtlasPages(set);ok(atlas.meta.frames.map(f=>f.durationMs).join(',')==='100,300,200','atlas loses holds');ok(atlas.meta.clipInfo.proof.loop===false&&atlas.meta.clipInfo.proof.events[1].timeMs===100,'atlas loses events or loop mode');const strip=SS.buildSheet(set);ok(strip.meta.animations.proof.durationMs===600,'strip loses clip timing');
 const project=SS.blankProject('timing',4,4);project.sets.exploration=set;const reopened=await SS.deserialize(SS.serialize(project));ok(reopened.sets.exploration.anims[0].durationsMs[1]===300,'save loses frame holds');
 return {stanceSamples,footChecks,loopChecks,slenderFeet,slenderLoops,timing:'holds, loops, one-shots, events, atlas and save PASS'};
}
