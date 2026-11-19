import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySolidEquipmentArt} from '../narrative-tools/solid_equipment_art_gate.mjs';

function fixture(){
 const w=7,h=5,grid=Array.from({length:w*h},(_,i)=>{
  const x=i%w,y=Math.floor(i/w);
  return x===0||x===6||y===0||y===4||x>=2&&x<=4&&y>=1&&y<=2?0:2;
 });
 return {
  map:{w,h,tileSize:32,grid},
  placements:[
   {id:'transformer',role:'solid-equipment',origin:[2,1],sourceSize:[96,64]},
   {id:'floor-arrow',role:'floor-decal',origin:[5,3],sourceSize:[32,32]}
  ]
 };
}
const has=(r,code)=>r.problems.some(p=>p.code===code);

test('authored solid equipment footprint and floor decals are distinct',()=>{
 const r=verifySolidEquipmentArt(fixture());assert.equal(r.pass,true,JSON.stringify(r.problems));
});
test('a big object overlapping walkable floor fails before art review',()=>{
 const f=fixture();f.placements[0].origin=[3,1];
 const r=verifySolidEquipmentArt(f);assert.equal(r.pass,false);
 assert.equal(has(r,'EQUIPMENT_OVERLAPS_WALKABLE'),true);
});
test('a machine outside the map fails closed',()=>{
 const f=fixture();f.placements[0].origin=[6,1];
 assert.equal(has(verifySolidEquipmentArt(f),'EQUIPMENT_OVERLAPS_WALKABLE'),true);
});
test('missing art sizes and duplicate IDs reject the source staging data',()=>{
 const f=fixture();f.placements[0].sourceSize=[96,0];
 f.placements[1].id='transformer';
 const r=verifySolidEquipmentArt(f);assert.equal(r.pass,false);
 assert.equal(has(r,'INVALID_MACHINE_GEOMETRY'),true);
 assert.equal(has(r,'DUPLICATE_OR_INVALID_ID'),true);
});
test('malformed map fails safely without reading from absent grid',()=>{
 assert.equal(has(verifySolidEquipmentArt({}),'INVALID_MAP'),true);
});
