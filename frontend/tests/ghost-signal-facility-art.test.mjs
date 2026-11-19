import test from 'node:test';
import assert from 'node:assert/strict';
import {mission5} from '../public/js/missions/mission5.js';
import {mission6} from '../public/js/missions/mission6.js';
import {sceneDigest,gridAt} from '../tools/map-quality-gate.mjs';
import {auditFacilityArt} from '../tools/facility-art-audit.mjs';
import {isHorizontalBunkerDoor,drawHorizontalBunkerDoor} from '../public/js/art/bunker-doors.js';
import {readFileSync} from 'node:fs';
const fixture=(id,x,y)=>({id,purpose:'grounded equipment',type:'solid-fixture',x,y,w:1,h:1,nativeWidth:32,nativeHeight:32});
function manifest(m){
 const map=m.buildMap(),placements=[],seen=new Set();
 for(const p of m.props.filter(p=>p.solid))for(let y=p.y;y<p.y+(p.h||1);y++)for(let x=p.x;x<p.x+(p.w||1);x++){
  if(gridAt(map,x,y)===1||seen.has(x+','+y))continue;seen.add(x+','+y);placements.push(fixture('f'+x+'-'+y,x,y));
 }
 for(const e of m.entities().filter(e=>e.type==='door'))placements.push({id:e.id,purpose:'live frame',type:'door-frame',x:e.tx,y:e.ty,w:1,h:1,orientation:gridAt(map,e.tx,e.ty-1)===1&&gridAt(map,e.tx,e.ty+1)===1?'vertical':'horizontal'});
 return {schema:'purposeful-facility-v1',mission:m.id,sceneDigest:sceneDigest(m),placements};
}
test('M05 and M06 manifests require every real solid prop and real door frame',()=>{
 for(const m of [mission5,mission6])assert.deepEqual(auditFacilityArt(m,manifest(m)),[]);
});
test('unsupported, duplicated, overlapping, and invisible fixtures fail validation',()=>{
 const a=manifest(mission6);a.placements.push(fixture('floating',19,24),fixture('over-terminal',18,22),{...a.placements[0],id:'overlap'});
 const missing=a.placements.splice(3,1)[0];
 const e=auditFacilityArt(mission6,a).join('\n');
 for(const term of ['unsupported solid artwork','covers live entity','overlapping fixture','invisible solid prop'])assert.ok(e.includes(term),e+' missing '+term);
 assert.ok(e.includes(missing.x+','+missing.y));
});
test('stale manifests, wrong door axes and floor details on collision fail',()=>{
 const a=manifest(mission6);a.sceneDigest='old';assert.match(auditFacilityArt(mission6,a).join(' '),/stale/);
 a.sceneDigest=sceneDigest(mission6);a.placements.find(p=>p.id==='observatoryDoor').orientation='vertical';
 a.placements.push({...fixture('bad-floor',21,19),type:'floor-detail'});
 assert.match(auditFacilityArt(mission6,a).join(' '),/wrong door anchor\/orientation/);
 assert.match(auditFacilityArt(mission6,a).join(' '),/floor artwork not on clear floor/);
});
test('only two M06 door IDs use horizontal slides and both have horizontal collision walls',()=>{
 const g=mission6.buildMap(),es=mission6.entities().filter(e=>e.type==='door');
 assert.deepEqual(es.filter(e=>isHorizontalBunkerDoor(mission6,e)).map(e=>e.id),['observatoryDoor','lowerDoor']);
 for(const e of es.filter(e=>isHorizontalBunkerDoor(mission6,e))){assert.equal(gridAt(g,e.tx-1,e.ty),1);assert.equal(gridAt(g,e.tx+1,e.ty),1);assert.equal(gridAt(g,e.tx,e.ty),2);}
 assert.ok(!isHorizontalBunkerDoor({id:'m2'},es[1]));assert.ok(!isHorizontalBunkerDoor(mission5,{id:'lowerDoor',type:'door'}));
});
test('horizontal leaf spans opening when closed, proportionally retracts and leaves no solid leaf when open',()=>{
 const e=mission6.entities().find(e=>e.id==='observatoryDoor');
 const spans=open=>{const a=[],c={fillStyle:'',fillRect(x,y,w,h){a.push({x,y,w,h,color:this.fillStyle})}};drawHorizontalBunkerDoor(c,{...e,open});assert.ok(a.every(p=>p.x>=e.tx*32&&p.x+p.w<=(e.tx+1)*32&&p.y>=e.ty*32&&p.y+p.h<=(e.ty+1)*32));return a;};
 assert.ok(spans(0).some(p=>p.w===32&&p.h===14));assert.ok(spans(.5).some(p=>p.w===16&&p.h===14));assert.ok(!spans(1).some(p=>p.h===14));
 assert.match(readFileSync(new URL('../public/js/art/tiles.js',import.meta.url),'utf8'),/if \(isHorizontalBunkerDoor\(g\.m, e\)\)/);
});
