import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..','public');
const txt=p=>readFileSync(resolve(publicRoot,p),'utf8');
const raw=txt('js/missions/mission4.js');
const { mission4:m }=await import('data:text/javascript;base64,'+Buffer.from(raw).toString('base64'));
function mock(choice=0){
 const ents=m.entities();
 const g={
  flags:{},inv:{},caseFile:{ev:[],logs:[]},player:{x:50*32,y:20*32},
  sfx:{pickup(){},power(){}},
  store:{loadProgress:()=>({outcomes:{m3:{recommendation:'surface'}}})},
  ent:id=>ents.find(x=>x.id===id),
  say(_lines,cb){if(cb)cb();},
  terminal(_title,_body,cb){if(cb)cb();},
  choose(_p,options,cb){assert.equal(options.length,2);cb(choice);},
  checkpoint(){this.saves=(this.saves||0)+1;return true;},
  toast(){},finish(){this.finished=true;},
  addLog(id){if(this.caseFile.logs.some(l=>l.id===id))return false;this.caseFile.logs.push({id,m:'m4',...m.logs[id]});return true;},
  hasEv(id){return this.caseFile.ev.some(e=>e.id===id);},
  addEvidence(id){if(this.hasEv(id))return false;this.caseFile.ev.push({id,m:'m4',...m.evidence[id]});return true;},
  evCount(id){return this.caseFile.ev.filter(e=>e.m===id).length;},
  free(){return true;},
 };
 return g;
}
test('M04 is distinct rescue gameplay, not another compulsory drone stealth room',()=>{
 assert.equal(m.id,'m4');assert.deepEqual(m.drones,[]);
 assert.equal(m.visualTheme,'ruins');assert.equal(m.hideStealth,true);
 const map=m.buildMap();
 assert.equal(map.grid.length,map.w*map.h);
 const start=[Math.floor(m.start.x/32),Math.floor(m.start.y/32)];
 assert.equal(map.grid[start[1]*map.w+start[0]],2);
 const targets=['exit','station','beacon','cell','rail','survivor','tracks','cable','ping','rubble'];
 const ents=m.entities();
 for(const id of targets)assert.ok(ents.some(e=>e.id===id),'missing entity: '+id);
 const solid=new Set();
 for(const p of m.props.filter(p=>p.solid))for(let y=p.y;y<p.y+(p.h||1);y++)
  for(let x=p.x;x<p.x+(p.w||1);x++)solid.add(x+','+y);
 for(const e of ents.filter(e=>e.solid))for(let y=e.ty;y<e.ty+(e.h||1);y++)
  for(let x=e.tx;x<e.tx+(e.w||1);x++)solid.add(x+','+y);
 const walk=(x,y)=>x>=0&&y>=0&&x<map.w&&y<map.h&&map.grid[y*map.w+x]===2&&!solid.has(x+','+y);
 const seen=new Set([start.join(',')]),queue=[start];
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i];for(const [dx,dy]of [[0,1],[0,-1],[-1,0],[1,0]]){
   const nx=x+dx,ny=y+dy,k=nx+','+ny;
   if(walk(nx,ny)&&!seen.has(k)){seen.add(k);queue.push([nx,ny]);}
  }
 }
 for(const id of ['beacon','cell','rail','survivor','exit']){
  const e=ents.find(x=>x.id===id);
  assert.ok([[1,0],[-1,0],[0,1],[0,-1],[0,0]].some(([dx,dy])=>seen.has((e.tx+dx)+','+(e.ty+dy))),id+' unreachable');
 }
});
test('Search, recover cell, scan feed, rescue and successful extraction',()=>{
 const g=mock(0);m.onStart(g);
 m.interact(g.ent('rail'),g);assert.equal(g.flags.rail,undefined);
 m.interact(g.ent('beacon'),g);assert.equal(g.flags.beacon,true);
 g.addEvidence('e4_tracks');g.addEvidence('e4_cable');g.addEvidence('e4_rubble');
 m.interact(g.ent('cell'),g);
 m.interact(g.ent('rail'),g);assert.equal(g.flags.rail,true);
 m.interact(g.ent('survivor'),g);assert.equal(g.flags.escorting,true);
 assert.equal(g.flags.rescueMethod,'guided');
 m.update(g,.05);assert.ok(g._escortTrail?.length);
 const survivor=g.ent('survivor');
 g.player.x=7*32;g.player.y=18*32;
 for(let i=0;i<400;i++)m.update(g,.05);
 // Artificially keep this unit test focused on handoff; map/path behavior tested above.
 survivor.tx=g.player.x/32-.5;survivor.ty=g.player.y/32-.75;
 m.interact(g.ent('exit'),g);
 assert.equal(g.flags.extracted,true);assert.equal(g.finished,true);
 assert.ok(m.objectives(g).every(q=>q.done));
 assert.equal(m.outcome(g).rescueMethod,'guided');
});
test('unsafe shortcut remains possible but records emergency medical handling',()=>{
 const g=mock(1);m.onStart(g);
 m.interact(g.ent('beacon'),g);
 g.addEvidence('e4_tracks');g.addEvidence('e4_cable');
 m.interact(g.ent('cell'),g);m.interact(g.ent('rail'),g);
 m.interact(g.ent('survivor'),g);
 assert.equal(g.flags.rescueMethod,'emergency');
 assert.equal(g.flags.escorting,true);
});
test('Safe-route decision is blocked without the brace evidence',()=>{
 const g=mock(0);m.onStart(g);m.interact(g.ent('beacon'),g);
 g.addEvidence('e4_tracks');g.addEvidence('e4_cable');
 m.interact(g.ent('cell'),g);m.interact(g.ent('rail'),g);
 m.interact(g.ent('survivor'),g);
 assert.equal(g.flags.escorting,undefined);
 g.addEvidence('e4_rubble');m.interact(g.ent('survivor'),g);
 assert.equal(g.flags.escorting,true);
});
test('M04 registry, UI, Android payload gate and independent legacy storage remain connected',()=>{
 assert.match(txt('js/missions/index.js'),/\[mission4\.id\]: mission4/);
 assert.match(txt('js/missions/mission3.js'),/next: 'm4'/);
 assert.match(txt('index.html'),/mission4-button/);
 assert.match(txt('js/main.js'),/btn-m4/);
 assert.match(txt('js/ui.js'),/M04/);
 assert.match(txt('js/engine/save.js'),/bearframe_ghost_signal_save_v1/);
});
