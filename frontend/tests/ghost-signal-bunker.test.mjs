import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const src=p=>readFileSync(resolve(root,p),'utf8');
const {mission6:m}=await import('data:text/javascript;base64,'+Buffer.from(src('js/missions/mission6.js')).toString('base64'));

function simulated(choice=0){
 const ents=m.entities().map(e=>({w:1,h:1,open:0,...e}));
 const g={flags:{},inv:{},caseFile:{ev:[],logs:[]},saves:0,finished:false,
  store:{loadProgress:()=>({outcomes:{m5:{extracted:true}}})},
  ent(id){return ents.find(e=>e.id===id);},
  toast(){},sfx:{pickup(){},power(){},door(){}},
  checkpoint(){this.saves++;return true;},
  terminal(_title,_body,done){done?.();},
  say(_lines,done){done?.();},
  choose(_prompt,options,done){assert.equal(options.length,2);done(choice);},
  hasEv(id){return this.caseFile.ev.some(x=>x.id===id);},
  addEvidence(id){if(this.hasEv(id))return false;this.caseFile.ev.push({id,m:'m6',...m.evidence[id]});return true;},
  addLog(id){if(this.caseFile.logs.some(x=>x.id===id))return false;this.caseFile.logs.push({id,m:'m6',...m.logs[id]});return true;},
  evCount(id){return this.caseFile.ev.filter(e=>e.m===id).length;},
  finish(){this.finished=true;}
 };
 return g;
}
const pos=e=>[e.tx,e.ty];
function reachable(g){
 const map=m.buildMap(), solid=new Set();
 for(const p of m.props.filter(p=>p.solid))
  for(let y=p.y;y<p.y+(p.h||1);y++)
   for(let x=p.x;x<p.x+(p.w||1);x++)solid.add(x+','+y);
 for(const e of m.entities().filter(e=>e.solid))
  for(let y=e.ty;y<e.ty+(e.h||1);y++)
   for(let x=e.tx;x<e.tx+(e.w||1);x++)solid.add(x+','+y);
 const doors=new Map(m.entities().filter(e=>e.type==='door').map(e=>[e.tx+','+e.ty,e]));
 const pass=(x,y)=>{
  if(x<0||y<0||x>=map.w||y>=map.h||map.grid[y*map.w+x]!==2)return false;
  if(solid.has(x+','+y))return false;
  const door=doors.get(x+','+y);
  return !door || m.doorOpen(door.id,g);
 };
 const x=Math.floor(m.start.x/32),y=Math.floor(m.start.y/32),visited=new Set([x+','+y]),q=[[x,y]];
 assert.ok(pass(x,y),'invalid spawn');
 for(let i=0;i<q.length;i++){
  const [a,b]=q[i];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const xx=a+dx,yy=b+dy,k=xx+','+yy;
   if(pass(xx,yy)&&!visited.has(k)){visited.add(k);q.push([xx,yy]);}
  }
 }
 return visited;
}
function near(visited,e){
 return [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>visited.has((e.tx+x)+','+(e.ty+y)));
}
test('Bunker is an architected continuous six-room facility, not a teleport tile grid',()=>{
 assert.equal(m.id,'m6');assert.equal(m.visualTheme,'bunker');
 assert.equal(m.drones.length,0);assert.equal(m.hideStealth,true);
 const map=m.buildMap();
 assert.deepEqual([map.w,map.h],[64,42]);
 const doors=m.entities().filter(e=>e.type==='door');
 assert.deepEqual(doors.map(e=>e.id),['airlockDoor','observatoryDoor','archiveDoor','lowerDoor','returnDoor']);
 assert.ok(doors.every(e=>map.grid[e.ty*map.w+e.tx]===2),'doors must be on real traversable floor cells');
 assert.ok(map.grid[20*map.w+20]===2);
 assert.ok(map.grid[19*map.w+41]===2);
 assert.ok(map.grid[29*map.w+41]===2);
 assert.equal(m.markers.some(x=>x.kind==='extraction'),true);
 assert.match(m.logs.registry.text,/IDENTITY OF AUTHORS .. NOT PRESENT/);
 assert.match(m.evidence.e6_carrier.text,/no independently verified origin/);
});
test('Doors physically restrict and unlock staged paths, preserving the lower return loop',()=>{
 const g=simulated(),at=id=>g.ent(id),a=reachable(g);
 for(const id of ['order','filter','seal','airlockControl','entrance'])
  assert.ok(near(a,at(id)),'west mission target '+id+' unreachable');
 assert.ok(!near(a,at('breaker')),'central breaker reachable through closed airlock');
 assert.ok(!near(a,at('registry')),'archive reachable through closed doors');
 assert.ok(!near(a,at('receiver')),'receiver reachable through closed doors');
 g.flags.airlock=true;
 let b=reachable(g);assert.ok(near(b,at('breaker')),'central hall inaccessible after airlock');
 assert.ok(!near(b,at('registry')),'archive should remain locked without power');
 g.flags.powerRouted=true;
 b=reachable(g);assert.ok(near(b,at('registry')),'registry should be reachable after breaker');
 assert.ok(near(b,at('datePlate')),'optional observatory should be reachable after breaker');
 assert.ok(!near(b,at('receiver')),'lower passage should remain locked until registry read');
 g.flags.registerRead=true;
 b=reachable(g);
 assert.ok(near(b,at('receiver')),'lower receiver inaccessible after registry');
 assert.ok(b.has('40,29'),'shortcut return passage not connected');
 assert.ok(b.has('42,29'),'return door cannot be traversed when open');
});
test('Quest sequence enforces scan, repair, evidence, safe archive choice and extraction',()=>{
 const g=simulated(1),use=id=>m.interact(g.ent(id),g);
 m.onStart(g);
 assert.ok(!m.doorOpen('airlockDoor',g));
 assert.ok(!m.hazardsEnabled(g));
 use('airlockControl');assert.ok(!g.flags.airlock);
 use('order');assert.equal(g.flags.authorized,true);
 use('filter');assert.equal(g.inv.pressureFilter,true);
 use('airlockControl');assert.ok(!g.flags.airlock,'seal not scanned');
 g.addEvidence('e6_seal');use('airlockControl');
 assert.equal(g.flags.airlock,true);
 assert.equal(g.inv.pressureFilter,false);
 use('breaker');assert.ok(!g.flags.powerRouted,'power bus not scanned');
 g.addEvidence('e6_bus');use('breaker');assert.equal(g.flags.powerRouted,true);
 assert.equal(m.doorOpen('observatoryDoor',g),true);
 assert.equal(m.doorOpen('archiveDoor',g),true);
 assert.equal(m.doorOpen('lowerDoor',g),false);
 use('receiver');assert.ok(!g.flags.captured);
 use('registry');assert.equal(g.flags.registerRead,true);
 assert.equal(m.doorOpen('lowerDoor',g),true);
 assert.equal(m.doorOpen('returnDoor',g),true);
 assert.equal(m.hazardsEnabled(g),true);
 use('receiver');assert.ok(!g.flags.captured,'unscanned carrier must block choice');
 g.addEvidence('e6_carrier');use('receiver');
 assert.equal(g.flags.archive,'sealed-raw');assert.equal(g.flags.captured,true);
 use('entrance');assert.equal(g.finished,true);assert.equal(g.flags.completed,true);
 assert.equal(m.outcome(g).entry,'physical-doors');
 assert.ok(m.objectives(g).every(x=>x.done));
 assert.equal(m.ending(g).title,'THE SEALED REGISTRY: WITHDRAWN');
 assert.ok(g.saves>=4);
});
test('Bounded archival choice and provenance constraints survive mission outcome',()=>{
 const g=simulated(0);
 g.flags.authorized=true;g.flags.filter=true;g.flags.airlock=true;g.flags.powerRouted=true;g.flags.registerRead=true;
 g.addEvidence('e6_carrier');m.interact(g.ent('receiver'),g);
 assert.equal(m.outcome(g).archive,'bounded');
 assert.equal(m.outcome(g).unknownOrigin,true);
 assert.match(m.ending(g).lines.join('\n'),/AUTHORSHIP .............. UNKNOWN/);
});
test('Original missions, upgraded generator and Android asset gate remain registered',()=>{
 assert.match(src('js/missions/index.js'),/\[mission6\.id\]: mission6/);
 assert.match(src('js/missions/mission5.js'),/next:'m6'/);
 assert.match(src('js/main.js'),/progress\.done\.m5 && !progress\.unlocked\.m6/);
 assert.match(src('index.html'),/mission6-button/);
 assert.match(src('js/art/pack-textures.js'),/bunker:/);
 assert.match(src('js/art/tiles.js'),/bunkerFloor/);
 assert.match(src('js/engine/save.js'),/bearframe_ghost_signal_save_v1/);
 assert.match(src('studio/studio.js'),/CHARACTER_PRESETS/);
});
