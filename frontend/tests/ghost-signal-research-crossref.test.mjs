import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {mission3} from '../public/js/missions/mission3.js';
import {mission4} from '../public/js/missions/mission4.js';
import {mission5} from '../public/js/missions/mission5.js';
import {mission6} from '../public/js/missions/mission6.js';
import {walkable,sceneDigest} from '../tools/map-quality-gate.mjs';
const spec=JSON.parse(readFileSync(fileURLToPath(new URL('../quality/ghost-signal-research-crossref.json',import.meta.url)),'utf8'));
const ms={m3:mission3,m4:mission4,m5:mission5,m6:mission6};
const k=(x,y)=>x+','+y, near=(s,e)=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s.has(k(e.tx+dx,e.ty+dy)));
const ent=(m,id)=>{const e=m.entities().find(x=>x.id===id);assert.ok(e,m.id+' missing '+id);return e};
test('Work chat and Ghost Signal Warehouse sources are cross-referenced without changing Aeon',()=>{
 assert.equal(spec.game,'BEARFRAME: GHOST SIGNAL Expanded');
 assert.equal(spec.sources.length,3);assert.ok(spec.scope.includes('NO new missions'));
 for(const [id,c] of Object.entries(spec.sites)){
  const m=ms[id],g=m.buildMap(),[x,y]=c.viewport;
  assert.equal(g.grid[y*g.w+x],2,id+' camera is not on floor');
  assert.equal(sceneDigest(m).length,64);
  c.routeAnchors.forEach(name=>ent(m,name));
 }
});
test('G01 M03 command aperture is three native tiles and all objectives reachable',()=>{
 const m=mission3,g=m.buildMap(),at=(x,y)=>g.grid[y*g.w+x],s=walkable(m).seen;
 assert.deepEqual([9,10,11,12,13].map(x=>at(x,17)),[1,2,2,2,1]);
 for(const id of ['mira','outpost','coupler','ridgeRelay','return'])assert.ok(near(s,ent(m,id)),id);
});
test('G02 M04 rescue and return can traverse damaged transit and triage',()=>{
 const m=mission4,s=walkable(m).seen;
 for(const x of [19,33,44,45,47])assert.ok(s.has(k(x,20)),'rescue corridor '+x);
 for(const id of ['survivor','medkit','exit'])assert.ok(near(s,ent(m,id)),id);
});
test('G03 M05 gate blocks until power isolated',()=>{
 const m=mission5,door=ent(m,'fieldGate'),a=walkable(m),b=walkable(m,{isolated:true});
 assert.equal(a.seen.has(k(door.tx,door.ty)),false);
 assert.equal(b.seen.has(k(door.tx,door.ty)),true);
 assert.equal(near(a.seen,ent(m,'uplink')),false);
 assert.equal(near(b.seen,ent(m,'uplink')),true);
});
test('G03 M06 staged five-door sequence and service return work after unlock',()=>{
 const m=mission6,ids=['airlockDoor','observatoryDoor','archiveDoor','lowerDoor','returnDoor'];
 const fs=[{}, {airlock:true},{airlock:true,powerRouted:true},{airlock:true,powerRouted:true,registerRead:true}];
 for(const [i,flags] of fs.entries()){
  const s=walkable(m,flags).seen;
  assert.ok(s.size>0);
  for(const id of ids){const e=ent(m,id),open=m.doorOpen(id,{flags});
   if(!open)assert.ok(!s.has(k(e.tx,e.ty)),id+' prematurely open '+i);
   else if(i===3)assert.ok(s.has(k(e.tx,e.ty)),id+' still closed');
  }
 }
 const complete=walkable(m,fs[3]).seen;
 assert.ok(near(complete,ent(m,'receiver'))&&near(complete,ent(m,'entrance')));
});
