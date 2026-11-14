// Shared authoring validation and fixed-length reach handling. No canvas dependencies.
export function solveTwoBone(hip,target,l1,l2,bend=1){
 if(![hip.x,hip.y,target.x,target.y,l1,l2].every(Number.isFinite)||l1<=0||l2<=0)throw Error('Invalid limb dimensions');
 const dx=target.x-hip.x,dy=target.y-hip.y,d=Math.hypot(dx,dy),u=d>1e-12?dx/d:0,v=d>1e-12?dy/d:1;
 const r=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,d));
 const ankle=r===d?{...target}:{x:hip.x+u*r,y:hip.y+v*r},a=(l1*l1-l2*l2+r*r)/(2*r),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 return {hip,knee:{x:hip.x+u*a+v*h*bend,y:hip.y+v*a-u*h*bend},ankle,l1,l2,clamped:r!==d};
}
export function validateRig(rig){
 if(!rig||!Number.isFinite(rig.w)||!Number.isFinite(rig.h)||rig.w<1||rig.h<1||rig.w>2048||rig.h>2048)throw Error('Rig dimensions must be between 1 and 2048');
 if(!rig.views||!Object.keys(rig.views).length)throw Error('Rig needs a view');
 const shapes=new Set(['plate','taper','disc','ring','cable','banner','glass','tex']);
 for(const [dir,parts] of Object.entries(rig.views)){
  if(!Array.isArray(parts)||!parts.length)throw Error(dir+': empty view');const map=new Map();
  for(const p of parts){if(typeof p.id!=='string'||!p.id||map.has(p.id))throw Error(dir+': missing or duplicate part ID '+p.id);if(!shapes.has(p.s))throw Error(dir+': invalid shape '+p.s);for(const k of ['x','y','w','h'])if(!Number.isFinite(p[k]))throw Error(p.id+': invalid '+k);if(p.w<=0||p.h<=0)throw Error(p.id+': nonpositive dimensions');map.set(p.id,p);}
  const done=new Set(),active=new Set();const visit=p=>{if(active.has(p.id))throw Error(dir+': parent cycle at '+p.id);if(done.has(p.id))return;active.add(p.id);if(p.p){if(!map.has(p.p))throw Error(p.id+': missing parent '+p.p);visit(map.get(p.p));}active.delete(p.id);done.add(p.id);};parts.forEach(visit);
 }
 return rig;
}
