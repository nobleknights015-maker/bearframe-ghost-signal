/**
 * Ghost Signal visual production quality gate: Node-only.
 * Atlas Warehouse research: ghost-signal-environment-design-and-map-quality-2026-11-18
 * No raw licensed art, no runtime save/UI/gameplay modifications.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const program=JSON.parse(readFileSync(resolve(root,'quality/ghost-signal-map-program.json'),'utf8'));
const key=(x,y)=>x+','+y;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export const gridAt=(map,x,y)=>x<0||y<0||x>=map.w||y>=map.h?0:map.grid[y*map.w+x];
const within=(box,x,y)=>x>=box[0]&&x<=box[2]&&y>=box[1]&&y<=box[3];
export function blockedCells(m){
 const occupied=new Set();
 for(const p of [...m.props,...m.entities()].filter(p=>p.solid)){
  const x=p.x??p.tx,y=p.y??p.ty;
  for(let dy=0;dy<(p.h||1);dy++)for(let dx=0;dx<(p.w||1);dx++)occupied.add(key(x+dx,y+dy));
 }
 return occupied;
}
export function walkable(m,flags={}){
 const map=m.buildMap(),solid=blockedCells(m);
 const door=new Map(m.entities().filter(e=>e.type==='door').map(e=>[key(e.tx,e.ty),e]));
 const pass=(x,y)=>gridAt(map,x,y)===2&&!solid.has(key(x,y))&&
  (!door.has(key(x,y))||m.doorOpen(door.get(key(x,y)).id,{flags}));
 const x=Math.floor(m.start.x/32),y=Math.floor(m.start.y/32),seen=new Set(),q=[];
 if(pass(x,y)){seen.add(key(x,y));q.push([x,y]);}
 for(let i=0;i<q.length;i++)for(const [dx,dy] of dirs){
  const nx=q[i][0]+dx,ny=q[i][1]+dy,k=key(nx,ny);
  if(pass(nx,ny)&&!seen.has(k)){seen.add(k);q.push([nx,ny]);}
 }
 return {map,seen,pass};
}
export function sceneDigest(m){
 const map=m.buildMap();
 const data={version:1,id:m.id,w:map.w,h:map.h,grid:Array.from(map.grid),
 props:m.props.map(p=>({t:p.t,x:p.x,y:p.y,w:p.w||1,h:p.h||1,solid:!!p.solid})),
 entities:m.entities().map(e=>({id:e.id,type:e.type,tx:e.tx,ty:e.ty,w:e.w||1,h:e.h||1,solid:!!e.solid}))};
 return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
export function reserveCritical(m){
 return m.entities().filter(e=>['door','terminal','npc','exit','item'].includes(e.type))
  .map(e=>({id:e.id,kind:e.type,x:e.tx,y:e.ty,w:e.w||1,h:e.h||1,approach:1}));
}
export function auditMission(m,design=program.missions[m.id]){
 if(!design)return [m.id+': missing site program'];
 const errors=[],{map,seen,pass}=walkable(m),es=m.entities(),byId=new Map(es.map(e=>[e.id,e]));
 if(!seen.size)errors.push('blocked player start');
 if(design.zones.length<program.rules.minimumFunctionalZones)errors.push('insufficient functional zones');
 for(const z of design.zones){
  const e=byId.get(z.anchor);
  if(!e)errors.push(z.id+': missing functional anchor '+z.anchor);
  else if(!within(z.box,e.tx,e.ty))errors.push(z.id+': anchor outside zone');
  let free=0;for(let y=z.box[1];y<=z.box[3];y++)for(let x=z.box[0];x<=z.box[2];x++)if(gridAt(map,x,y)===2)free++;
  if(free<8)errors.push(z.id+': no usable floor area');
  if(!z.purpose)errors.push(z.id+': zone lacks purpose');
 }
 for(const id of design.neededObjectives){
  const e=byId.get(id);
  if(!e){errors.push('missing objective '+id);continue;}
  const near=[[0,0],...dirs].some(([dx,dy])=>seen.has(key(e.tx+dx,e.ty+dy)));
  const gated=e.type==='door'||(m.id==='m5'&&id==='uplink')||
    (m.id==='m6'&&['registry','receiver'].includes(id));
  if(!near&&!gated)errors.push('no route to '+id);
 }
 for(const e of es.filter(e=>e.type==='door')){
  if(gridAt(map,e.tx,e.ty)!==2)errors.push('door '+e.id+' has no real opening');
  if(dirs.filter(([dx,dy])=>gridAt(map,e.tx+dx,e.ty+dy)===1).length<2)
   errors.push('door '+e.id+' disconnected from walls');
  if(m.props.some(p=>p.solid&&e.tx>=p.x&&e.tx<p.x+(p.w||1)&&e.ty>=p.y&&e.ty<p.y+(p.h||1)))
   errors.push('door '+e.id+' overlapped by solid prop');
 }
 for(const e of es.filter(e=>e.interact&&e.type!=='door'))
  if(!dirs.some(([dx,dy])=>pass(e.tx+dx,e.ty+dy)))
   errors.push('interaction '+e.id+' lacks approach tile');
 return errors;
}
const cross=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function auditArtwork(m,manifest){
 const errors=[],reserved=reserveCritical(m),map=m.buildMap();
 if(!manifest||manifest.mission!==m.id)return [m.id+': missing/wrong artwork manifest'];
 if(manifest.sceneDigest!==sceneDigest(m))
  errors.push('stale scenery: artwork and collision refer to different map revisions');
 if(!Array.isArray(manifest.placements))return [...errors,'no artwork placement registry'];
 for(const p of manifest.placements){
  if(!p.id||!p.purpose||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!p.w||!p.h)
   {errors.push('anonymous/unscoped placement '+(p.id||'?'));continue;}
  if(p.w*32<(p.nativeWidth||0)||p.h*32<(p.nativeHeight||0))
   errors.push(p.id+': art exceeds native footprint');
  if(p.type==='door-art'){
   const e=reserved.find(r=>r.id===p.anchor&&r.kind==='door');
   if(!e)errors.push(p.id+': false static door with no scripted anchor');
   else if(p.state==='closed')errors.push(p.id+': static closed door contradicts dynamic door');
  }
  if(['fixture','furniture','machine','door-art'].includes(p.type))
   for(const r of reserved)if(cross(p,r)&&!(p.type==='door-art'&&p.anchor===r.id))
    errors.push(p.id+' overlaps '+r.kind+' '+r.id);
  if(p.type==='wall')for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++)
   if(gridAt(map,x,y)!==1)errors.push(p.id+': wall painted across traversable '+x+','+y);
  if(p.type==='fixture'&&p.collision!==true)
   errors.push(p.id+': non-colliding solid fixture');
 }
 return [...new Set(errors)];
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=[];
 for(let n=3;n<=6;n++){
  const m=(await import('../public/js/missions/mission'+n+'.js'))['mission'+n];
  out.push({mission:m.id,sceneDigest:sceneDigest(m),zones:program.missions[m.id].zones.map(z=>z.id),
   reserved:reserveCritical(m),errors:auditMission(m)});
 }
 if(process.argv.includes('--json'))console.log(JSON.stringify({schema:'ghost-signal-qa-scene-v1',results:out},null,2));
 else out.forEach(r=>console.log(r.mission+' '+(r.errors.length?'FAIL '+r.errors.join('; '):'PASS')+' digest='+r.sceneDigest.slice(0,12)+' zones='+r.zones.join(',')));
 if(out.some(r=>r.errors.length))process.exitCode=1;
}
