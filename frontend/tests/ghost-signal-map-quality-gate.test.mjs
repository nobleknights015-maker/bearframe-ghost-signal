import test from 'node:test';
import assert from 'node:assert/strict';
import {mission3} from '../public/js/missions/mission3.js';
import {mission4} from '../public/js/missions/mission4.js';
import {mission5} from '../public/js/missions/mission5.js';
import {mission6} from '../public/js/missions/mission6.js';
import {auditMission,auditArtwork,program,sceneDigest,walkable,reserveCritical} from '../tools/map-quality-gate.mjs';
for(const m of [mission3,mission4,mission5,mission6]){
 test(m.id+' location program and gameplay access meet research-based quality gate',()=>{
  const p=program.missions[m.id];
  assert.ok(p.place&&p.operationalChain&&p.historicalClue&&p.zones.length>=3);
  assert.deepEqual(auditMission(m),[]);
  assert.equal(sceneDigest(m).length,64);
  assert.ok(walkable(m).seen.size>100);
  assert.ok(reserveCritical(m).some(x=>x.kind==='terminal'));
 });
}
test('stale art is rejected even if scene dimensions are unchanged',()=>{
 const changed={...mission3,buildMap(){const g=mission3.buildMap();g.grid[7*g.w+20]=1;return g;}};
 assert.notEqual(sceneDigest(changed),sceneDigest(mission3));
 assert.match(auditArtwork(mission3,{mission:'m3',sceneDigest:sceneDigest(changed),placements:[]}).join(' '),/stale scenery/);
});
test('console over terminal and furniture over Mira are rejected',()=>{
 const issues=auditArtwork(mission3,{mission:'m3',sceneDigest:sceneDigest(mission3),placements:[
 {id:'bad-screen',purpose:'display',type:'machine',x:9,y:12,w:2,h:2,nativeWidth:64,nativeHeight:64},
 {id:'bad-box',purpose:'supply',type:'furniture',x:12,y:18,w:1,h:1,nativeWidth:32,nativeHeight:32}
 ]});
 assert.ok(issues.some(x=>x.includes('outpost')));
 assert.ok(issues.some(x=>x.includes('mira')));
});
test('false door, non-colliding blocker and fake art wall are rejected',()=>{
 const issues=auditArtwork(mission3,{mission:'m3',sceneDigest:sceneDigest(mission3),placements:[
 {id:'fake-door',purpose:'fake access',type:'door-art',x:9,y:14,w:2,h:2,nativeWidth:64,nativeHeight:64},
 {id:'floating-console',purpose:'controls',type:'fixture',collision:false,x:35,y:22,w:1,h:1,nativeWidth:32,nativeHeight:32},
 {id:'bad-wall',purpose:'divider',type:'wall',x:10,y:20,w:1,h:1,nativeWidth:32,nativeHeight:32}
 ]});
 assert.ok(issues.some(x=>x.includes('false static door')));
 assert.ok(issues.some(x=>x.includes('non-colliding')));
 assert.ok(issues.some(x=>x.includes('wall painted across traversable')));
});
test('oversized art cannot be squeezed into a 32px footprint',()=>{
 const issues=auditArtwork(mission3,{mission:'m3',sceneDigest:sceneDigest(mission3),placements:[
 {id:'giant-machine',purpose:'computer',type:'machine',x:34,y:20,w:1,h:1,nativeWidth:96,nativeHeight:64}]});
 assert.ok(issues.some(x=>x.includes('art exceeds native footprint')));
});
test('correctly sized purposeful machine away from scripted anchors passes',()=>{
 assert.deepEqual(auditArtwork(mission3,{mission:'m3',sceneDigest:sceneDigest(mission3),placements:[
 {id:'survey-bench',purpose:'expedition supplies',type:'machine',x:34,y:24,w:2,h:1,nativeWidth:64,nativeHeight:32}
 ]}),[]);
});
