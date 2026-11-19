import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public/js');
const load=p=>readFileSync(resolve(root,p),'utf8');
const pure=await import('data:text/javascript;base64,'+Buffer.from(load('art/electrical-arcs.js')).toString('base64'));
const mission=await import('data:text/javascript;base64,'+Buffer.from(load('missions/mission5.js')).toString('base64'));
const {isRelayElectricalArc,drawRelayElectricalArc}=pure;
const m5=mission.mission5;
const arcs=m5.entities().filter(e=>['arcA','arcB','arcC'].includes(e.id));
const ctx=()=>({ops:[],fillStyle:'#000',fillRect(x,y,w,h){this.ops.push({x,y,w,h,color:this.fillStyle});}});
const paint=(e,s,t,low=false)=>{const c=ctx();drawRelayElectricalArc(c,e,s,t,low);return c};
const colors=c=>c.ops.map(o=>o.color).join(',');
const engine=load('game.js');
const match=engine.match(/jetState\(e\)\s*\{([^}]+)\}/);
assert.ok(match,'engine jetState function not found');
const state=new Function('e',match[1]);
test('arc renderer opts into exactly three M05 hazards; never M01/M02',()=>{
 assert.deepEqual(arcs.map(e=>e.id),['arcA','arcB','arcC']);
 assert.ok(arcs.every(e=>isRelayElectricalArc(m5,e)));
 assert.equal(isRelayElectricalArc({id:'m2'},arcs[0]),false);
 assert.equal(isRelayElectricalArc({id:'m1'},arcs[0]),false);
 assert.equal(isRelayElectricalArc(m5,{type:'jet',id:'jet21_17'}),false);
 assert.equal(isRelayElectricalArc(m5,{type:'terminal',id:'arcA'}),false);
});
test('existing engine cycle and damage remain unchanged',()=>{
 const e=arcs[0];
 assert.deepEqual([0,1.399,1.4,2,3,3.01,3.49,3.5].map(t=>state.call({time:t},e)),[2,2,0,0,0,1,1,2]);
 assert.match(engine,/this\.jetState\(e\) === 2/);
 assert.match(engine,/this\.drain\(8\)/);
 assert.match(engine,/ARC DISCHARGE/);
 assert.equal(m5.weather,'electrical');
 assert.match(load('art/tiles.js'),/if\s*\(isRelayElectricalArc\(g\.m, e\)\)/);
});
test('M05 inactive/warning/active are distinct; reduced FX still conveys hazard',()=>{
 const e=arcs[0],a=paint(e,0,2),b=paint(e,1,3.25),c=paint(e,2,0),d=paint(e,2,0,true);
 assert.notEqual(colors(a),colors(b));
 assert.notEqual(colors(b),colors(c));
 assert.ok(b.ops.some(o=>o.color==='#f5d895'));
 assert.ok(c.ops.some(o=>o.color==='#e5faff'));
 assert.ok(d.ops.some(o=>o.color==='#e5faff'));
 assert.ok(d.ops.length<c.ops.length);
 assert.ok(!a.ops.some(o=>o.color==='#e5faff'));
 assert.ok(!b.ops.some(o=>o.color==='#e5faff'));
 for(const v of [a,b,c,d])for(const o of v.ops){
  assert.ok(o.x>=e.tx*32&&o.x+o.w<=(e.tx+1)*32);
  assert.ok(o.y>=e.ty*32&&o.y+o.h<=(e.ty+1)*32);
 }
});
test('original neutral steam case stays intact after M05 opt-in',()=>{
 const tiles=load('art/tiles.js');
 assert.match(tiles,/if\s*\(isRelayElectricalArc\(g\.m, e\)\)[\s\S]*?break;[^\n]*M05-only/);
 assert.match(tiles,/rgba\(220,230,235,/);
 assert.match(tiles,/case 'jet':/);
 assert.match(tiles,/const s = \(g\.m\.hazardsEnabled && !g\.m\.hazardsEnabled\(g\)\) \? 0 : g\.jetState\(e\)/);
});
test('no flashes or fullscreen alpha manipulations inside arc draw helper',()=>{
 const code=drawRelayElectricalArc.toString();
 assert.ok(!/globalAlpha|clearRect|requestAnimationFrame|globalCompositeOperation/.test(code));
});
