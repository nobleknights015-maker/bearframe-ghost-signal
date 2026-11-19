import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','public');
const read=p=>readFileSync(resolve(root,p),'utf8');
const {mission5:m}=await import('data:text/javascript;base64,'+Buffer.from(read('js/missions/mission5.js')).toString('base64'));
function harness(selection=0){
 const entities=m.entities().map(e=>({...e,open:0,w:e.w||1,h:e.h||1}));
 const g={
  flags:{},inv:{},caseFile:{ev:[],logs:[]},saves:0,finished:false,
  store:{loadProgress:()=>({outcomes:{m4:{extracted:true,rescueMethod:'guided'}}})},
  sfx:{pickup(){},power(){}},toast(){},checkpoint(){this.saves++;return true;},
  ent:id=>entities.find(e=>e.id===id),
  terminal(_title,_body,done){done?.();},
  say(_lines,done){done?.();},
  choose(_prompt,choices,done){assert.equal(choices.length,2);done(selection);},
  addLog(id){if(!this.caseFile.logs.some(e=>e.id===id)){this.caseFile.logs.push({id,m:'m5',...m.logs[id]});return true;}return false;},
  addEvidence(id){if(!this.hasEv(id)){this.caseFile.ev.push({id,m:'m5',...m.evidence[id]});return true;}return false;},
  hasEv(id){return this.caseFile.ev.some(e=>e.id===id);},
  evCount(id){return this.caseFile.ev.filter(e=>e.m===id).length;},
  finish(){this.finished=true;},
 };
 return g;
}
test('M05 keeps Wraith in a gated, unique surface district without misclassifying the signal',()=>{
 assert.equal(m.id,'m5');assert.equal(m.visualTheme,'storm');
 assert.equal(m.weather,'electrical');assert.equal(m.statusLabel,'RELAY SERVICE');
 assert.deepEqual(m.drones,[]);assert.equal(m.hideStealth,true);
 assert.match(m.evidence.e5_carrier.text, /neither its origin nor its source identity/);
 assert.match(m.logs.order.text,/EXPLORATION: OPERATIONAL CONTROL/);
 assert.equal(m.buildMap().grid.length,64*38);
});
test('Physical sliding gate separates the playable west/east regions and unlocks one passage',()=>{
 const map=m.buildMap(),g=harness();
 const entities=m.entities(),blocked=new Set();
 for(const p of m.props.filter(q=>q.solid))for(let y=p.y;y<p.y+(p.h||1);y++)
  for(let x=p.x;x<p.x+(p.w||1);x++)blocked.add(x+','+y);
 for(const e of entities.filter(q=>q.solid))for(let y=e.ty;y<e.ty+(e.h||1);y++)
  for(let x=e.tx;x<e.tx+(e.w||1);x++)blocked.add(x+','+y);
 const passable=(x,y,gate)=>{
   return x>=0&&y>=0&&x<map.w&&y<map.h&&map.grid[y*map.w+x]===2
     &&!blocked.has(x+','+y)&&(gate||x!==31||y!==18);
 };
 function flood(open){
  const seed=[Math.floor(m.start.x/32),Math.floor(m.start.y/32)];
  const visited=new Set([seed.join(',')]),queue=[seed];
  assert.ok(passable(seed[0],seed[1],open));
  for(let i=0;i<queue.length;i++){
   const [x,y]=queue[i];
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,key=nx+','+ny;
    if(passable(nx,ny,open)&&!visited.has(key)){visited.add(key);queue.push([nx,ny]);}
   }
  }
  return visited;
 }
 const before=flood(false),after=flood(true);
 assert.equal(m.doorOpen('fieldGate',g),false);
 assert.ok(!before.has('32,18'),'cannot enter east area before isolation');
 assert.ok(before.has('28,18'),'west breaker is accessible');
 assert.ok(after.has('32,18'),'door permits east travel after isolation');
 for(const id of ['order','isolationKit','breaker','uplink','extraction','carrier']){
  const e=entities.find(x=>x.id===id);assert.ok(e,id);
  assert.ok([[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>after.has((e.tx+dx)+','+(e.ty+dy))),id+' unreachable even after opening');
 }
 g.flags.isolated=true;assert.equal(m.doorOpen('fieldGate',g),true);
 assert.equal(m.doorOpen('unknown',g),false);
});
test('Authorization, insulation and scanned fault must precede opening the door',()=>{
 const g=harness();m.onStart(g);
 assert.equal(m.hazardsEnabled(g),false);
 m.interact(g.ent('breaker'),g);assert.equal(g.flags.isolated,undefined);
 m.interact(g.ent('order'),g);assert.equal(g.flags.authorized,true);
 m.interact(g.ent('breaker'),g);assert.equal(g.flags.isolated,undefined);
 m.interact(g.ent('isolationKit'),g);assert.equal(g.inv.isolator,true);
 m.interact(g.ent('breaker'),g);assert.equal(g.flags.isolated,undefined);
 g.addEvidence('e5_fault');m.interact(g.ent('breaker'),g);
 assert.equal(g.flags.isolated,true);assert.equal(g.inv.isolator,false);
 assert.equal(m.doorOpen('fieldGate',g),true);
 m.interact(g.ent('uplink'),g);assert.equal(g.flags.calibrated,undefined);
 g.addEvidence('e5_carrier');m.interact(g.ent('uplink'),g);
 assert.equal(g.flags.channel,'bounded');assert.equal(g.flags.calibrated,true);
 assert.equal(m.hazardsEnabled(g),true);
 m.interact(g.ent('extraction'),g);
 assert.equal(g.flags.extracted,true);assert.equal(g.finished,true);
 assert.ok(m.objectives(g).every(x=>x.done));
 assert.equal(m.ending(g).title,'THE BROKEN RELAY: SECURED');
 assert.equal(m.outcome(g).surfaceOnly,true);
 assert.ok(g.saves>=3);
});
test('Alternative sealed sample decision never asserts an unknown signal origin',()=>{
 const g=harness(1);m.onStart(g);
 m.interact(g.ent('order'),g);
 m.interact(g.ent('isolationKit'),g);
 g.addEvidence('e5_fault');m.interact(g.ent('breaker'),g);
 g.addEvidence('e5_carrier');m.interact(g.ent('uplink'),g);
 assert.equal(g.flags.channel,'sealed-raw');
 assert.equal(m.outcome(g).channel,'sealed-raw');
 assert.match(m.ending(g).lines.join('\n'),/CARRIER ORIGIN .......... UNCONFIRMED/);
});
test('Existing engine and upgraded generator remain connected alongside M05',()=>{
 assert.match(read('js/missions/index.js'),/\[mission5\.id\]: mission5/);
 assert.match(read('js/missions/mission4.js'),/next:'m5'/);
 assert.match(read('index.html'),/mission5-button/);
 assert.match(read('js/main.js'),/btn-m5/);
 assert.match(read('js/main.js'),/progress\.done\.m4 && !progress\.unlocked\.m5/);
 assert.match(read('js/game.js'),/this\.m\.hazardsEnabled/);
 assert.match(read('js/art/tiles.js'),/stormFloor/);
 assert.match(read('js/engine/save.js'),/bearframe_ghost_signal_save_v1/);
 assert.match(read('studio/studio.js'),/CHARACTER_PRESETS/);
});
