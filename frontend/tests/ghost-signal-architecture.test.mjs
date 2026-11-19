// Mission structure regression: walls and their openings must be part of the map
// collision grid, not only scenery that Wraith can walk through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const mission=async n=>{
 const file=readFileSync(resolve(root,'js/missions/mission'+n+'.js'),'utf8');
 return (await import('data:text/javascript;base64,'+Buffer.from(file).toString('base64')))['mission'+n];
};
const [m3,m4,m5,m6]=await Promise.all([3,4,5,6].map(mission));
const K=(x,y)=>x+','+y;
function walk(m,flags={}){
 const map=m.buildMap(),entities=m.entities(),solid=new Set();
 for(const p of [...m.props,...entities].filter(x=>x.solid)){
  const px=p.x??p.tx,py=p.y??p.ty;
  for(let y=py;y<py+(p.h||1);y++)for(let x=px;x<px+(p.w||1);x++)solid.add(K(x,y));
 }
 const doors=new Map(entities.filter(e=>e.type==='door').map(e=>[K(e.tx,e.ty),e]));
 const pass=(x,y)=>x>=0&&y>=0&&x<map.w&&y<map.h&&map.grid[y*map.w+x]===2&&!solid.has(K(x,y))&&
  (!doors.has(K(x,y))||m.doorOpen(doors.get(K(x,y)).id,{flags}));
 const sx=Math.floor(m.start.x/32),sy=Math.floor(m.start.y/32);
 assert.ok(pass(sx,sy),m.id+' spawn blocked');
 const seen=new Set([K(sx,sy)]),q=[[sx,sy]];
 for(let i=0;i<q.length;i++)for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){
  const x=q[i][0]+dx,y=q[i][1]+dy,k=K(x,y);
  if(pass(x,y)&&!seen.has(k)){seen.add(k);q.push([x,y]);}
 }
 const near=id=>{
  const e=entities.find(e=>e.id===id);
  assert.ok(e,m.id+' missing '+id);
  return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(K(e.tx+dx,e.ty+dy)));
 };
 const wall=(x,y)=>map.grid[y*map.w+x]===1;
 return {seen,near,wall};
}
test('M03 command, supply and relay are actual compounds with open entrances',()=>{
 const {seen,near,wall}=walk(m3);
 for(const [x,y] of [[7,17],[17,17],[7,27],[18,27],[42,15],[50,15]])
  assert.ok(wall(x,y),'missing command or relay wall');
 for(const [x,y] of [[11,17],[12,24],[42,18]])
  assert.ok(seen.has(K(x,y)),'access opening blocked');
 for(const id of ['outpost','mira','nova','coupler','ridgeRelay','clueCarrier','return'])
  assert.ok(near(id),'unreachable '+id);
});
test('M04 structurally damaged rescue shelters preserve complete escorted route',()=>{
 const {seen,near,wall}=walk(m4);
 for(const [x,y] of [[19,12],[33,14],[44,14],[45,26],[47,18],[56,21]])
  assert.ok(wall(x,y),'missing ruined facility wall');
 for(const [x,y] of [[19,20],[33,20],[44,20],[45,20],[47,20]])
  assert.ok(seen.has(K(x,y)),'rescue corridor cut');
 for(const id of ['station','beacon','cell','rail','survivor','medkit','exit'])
  assert.ok(near(id),'unreachable '+id);
});
test('M05 real workshop partition/gate contains receiver until isolated',()=>{
 const a=walk(m5),b=walk(m5,{isolated:true});
 for(const [x,y] of [[20,13],[20,26],[34,12],[50,14]])
  assert.ok(a.wall(x,y),'missing maintenance structure');
 for(const id of ['order','isolationKit','breaker','extraction'])
  assert.ok(a.near(id),'west target unreachable: '+id);
 assert.equal(a.near('uplink'),false);
 assert.ok(b.seen.has('31,18'),'mechanical gate should physically open');
 assert.ok(b.near('uplink'),'uplink unreachable with open gate');
});
test('M06 added service bulkheads preserve staged five-door mystery route',()=>{
 const a=walk(m6),b=walk(m6,{airlock:true}),
  c=walk(m6,{airlock:true,powerRouted:true}),
  d=walk(m6,{airlock:true,powerRouted:true,registerRead:true});
 for(const [x,y] of [[7,18],[16,18],[23,27],[37,27],[46,20],[56,20]])
  assert.ok(a.wall(x,y),'missing bunker bulkhead');
 for(const id of ['entrance','order','filter','seal','airlockControl'])
  assert.ok(a.near(id),'west target unreachable '+id);
 assert.equal(a.near('breaker'),false);
 assert.ok(b.near('breaker'),'central hall blocked after pressure repair');
 assert.ok(c.near('registry'),'archive blocked after power restoration');
 assert.ok(c.near('datePlate'),'observatory blocked after power restoration');
 assert.equal(c.near('receiver'),false);
 assert.ok(d.near('receiver'),'receiver blocked after registry');
 assert.ok(d.seen.has('41,29')&&d.seen.has('42,29'),'return loop blocked');
});
