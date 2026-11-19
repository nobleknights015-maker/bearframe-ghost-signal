// Native-size, collision-backed private scene manifest validator. No licensed asset bytes.
import {sceneDigest,gridAt} from './map-quality-gate.mjs';
const key=(x,y)=>x+","+y;
const cells=(x,y,w=1,h=1)=>Array.from({length:h},(_,j)=>Array.from({length:w},(_,i)=>[x+i,y+j])).flat();
export function auditFacilityArt(m,scene){
 const map=m.buildMap(),errors=[],solid=new Set(),reserved=new Set(),painted=new Set(),doors=new Map(),frames=new Set(),ids=new Set();
 if(scene?.schema!=='purposeful-facility-v1'||scene.mission!==m.id||scene.sceneDigest!==sceneDigest(m)||!Array.isArray(scene.placements))return ['wrong or stale facility manifest'];
 for(const p of m.props.filter(p=>p.solid))for(const [x,y] of cells(p.x,p.y,p.w||1,p.h||1))solid.add(key(x,y));
 for(const e of m.entities()){
  for(const [x,y] of cells(e.tx,e.ty,e.w||1,e.h||1))reserved.add(key(x,y));
  if(e.type==='door')doors.set(e.id,e);
 }
 for(const p of scene.placements){
  if(!p.id||!p.purpose||ids.has(p.id)){errors.push('missing or duplicate authored purpose/ID');continue;}ids.add(p.id);
  if(p.type==='route'){
   if(!Array.isArray(p.points)||p.points.length<2||p.points.some(a=>!Array.isArray(a)||a.length!==2||a.some(v=>!Number.isInteger(v))||gridAt(map,...a)===0))errors.push(p.id+' invalid route');
   continue;
  }
  if(![p.x,p.y,p.w,p.h].every(Number.isInteger)||p.w<1||p.h<1){errors.push(p.id+' invalid bounds');continue;}
  if(p.type==='door-frame'){
   const e=doors.get(p.id),vertical=gridAt(map,p.x,p.y-1)===1&&gridAt(map,p.x,p.y+1)===1;
   if(!e||p.x!==e.tx||p.y!==e.ty||p.w!==1||p.h!==1||p.orientation!==(vertical?'vertical':'horizontal'))errors.push(p.id+' wrong door anchor/orientation');
   else frames.add(p.id);
   continue;
  }
  if(!['solid-fixture','floor-detail'].includes(p.type)){errors.push(p.id+' invalid art role');continue;}
  if(!Number.isInteger(p.nativeWidth)||!Number.isInteger(p.nativeHeight)||p.nativeWidth<1||p.nativeHeight<1||Math.ceil(p.nativeWidth/32)!==p.w||Math.ceil(p.nativeHeight/32)!==p.h)errors.push(p.id+' wrong native footprint');
  for(const [x,y] of cells(p.x,p.y,p.w,p.h)){
   const k=key(x,y),wall=gridAt(map,x,y)===1;
   if(reserved.has(k))errors.push(p.id+' covers live entity '+k);
   if(p.type==='solid-fixture'){
    if(!wall&&!solid.has(k))errors.push(p.id+' unsupported solid artwork '+k);
    if(painted.has(k))errors.push(p.id+' overlapping fixture '+k);
    painted.add(k);
   }else if(gridAt(map,x,y)!==2||solid.has(k))errors.push(p.id+' floor artwork not on clear floor '+k);
  }
 }
 for(const id of doors.keys())if(!frames.has(id))errors.push('missing real door frame '+id);
 for(const k of solid){const [x,y]=k.split(',').map(Number);if(gridAt(map,x,y)!==1&&!painted.has(k))errors.push('invisible solid prop '+k);}
 return [...new Set(errors)];
}
