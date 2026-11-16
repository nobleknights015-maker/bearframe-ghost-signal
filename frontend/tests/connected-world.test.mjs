import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileConnectedWorld} from '../public/js/engine/connected-world.js';
function map(id,other,exit,entry){
 const width=8,height=6,data=Array(width*height).fill(0);
 for(let x=0;x<width;x++){data[x]=1;data[(height-1)*width+x]=1;}
 for(let y=0;y<height;y++){data[y*width]=1;data[y*width+width-1]=1;}
 return {id,orientation:'orthogonal',tilewidth:32,tileheight:32,width,height,
 layers:[{name:'collision',type:'tilelayer',data},{name:'portals',type:'objectgroup',objects:[
 {name:exit,x:5*32,y:3*32,properties:{toMap:other,toPortal:entry,facing:id==='staging'?'left':'right'}}
 ]}]};
}
const pair=()=>[map('staging','annex','east-gate','west-gate'),map('annex','staging','west-gate','east-gate')];
test('two authored Tiled-style maps provide reciprocal walkable four-way portal landings',()=>{
 const graph=compileConnectedWorld(pair());
 assert.deepEqual(graph.ids,['staging','annex']);
 const b=graph.destination('staging','east-gate');
 assert.deepEqual(b,{mapId:'annex',portalId:'west-gate',x:176,y:112,facing:'left'});
 const a=graph.destination(b.mapId,b.portalId);
 assert.deepEqual(a,{mapId:'staging',portalId:'east-gate',x:176,y:112,facing:'right'});
});
test('rejects dangling or nonreciprocal portals before field transition',()=>{
 const maps=pair();maps[1].layers[1].objects[0].properties.toPortal='wrong';
 assert.throws(()=>compileConnectedWorld(maps),/nonreciprocal/);
});
test('rejects solid landing and invalid map data',()=>{
 const maps=pair();maps[1].layers[0].data[3*8+5]=1;
 assert.throws(()=>compileConnectedWorld(maps),/unsafe portal/);
 const other=pair();other[0].tilewidth=16;
 assert.throws(()=>compileConnectedWorld(other),/dimensions/);
});
test('rejects duplicate portal IDs and non-cardinal facing',()=>{
 const maps=pair();maps[0].layers[1].objects.push({...maps[0].layers[1].objects[0]});
 assert.throws(()=>compileConnectedWorld(maps),/duplicate portal/);
 const other=pair();other[0].layers[1].objects[0].properties.facing='diagonal';
 assert.throws(()=>compileConnectedWorld(other),/destination/);
});

test('checked-in Tiled JSON assets compile as a connected map graph',()=>{
 const maps=['staging','annex'].map(name=>JSON.parse(readFileSync(new URL('../public/maps/rpg-lab-'+name+'.tmj',import.meta.url),'utf8')));
 const graph=compileConnectedWorld(maps);
 assert.equal(graph.destination('staging','east-gate').mapId,'annex');
 assert.equal(graph.destination('annex','west-gate').mapId,'staging');
 const hatch=graph.destination('staging','service-hatch');
 assert.deepEqual({
   map:hatch.mapId,return:hatch.portalId,gate:hatch.requiresFlag,x:hatch.x,y:hatch.y
 },{map:'annex',return:'service-return',gate:'power-switch',x:144,y:80});
 const back=graph.destination('annex','service-return');
 assert.deepEqual({map:back.mapId,return:back.portalId},
   {map:'staging',return:'service-hatch'});
 assert.equal(back.requiresFlag,undefined,'Return route must stay available');
});

test('conditional portal metadata is validated and preserved without changing ordinary doors',()=>{
 const maps=pair();maps[0].layers[1].objects[0].properties.requiresFlag='relay-online';
 const graph=compileConnectedWorld(maps);
 assert.equal(graph.destination('staging','east-gate').requiresFlag,'relay-online');
 assert.equal(graph.destination('annex','west-gate').requiresFlag,undefined);
 maps[0].layers[1].objects[0].properties.requiresFlag='../../unsafe';
 assert.throws(()=>compileConnectedWorld(maps),/invalid portal flag/);
});

test('inverse portal gate supports mutually exclusive shortcuts and rejects contradictions',()=>{
 const maps=pair();const p=maps[0].layers[1].objects[0];
 p.properties.requiresNotFlag='bridge-collapsed';
 assert.equal(compileConnectedWorld(maps).destination('staging','east-gate').requiresNotFlag,'bridge-collapsed');
 p.properties.requiresFlag='bridge-collapsed';
 assert.throws(()=>compileConnectedWorld(maps),/inverse portal flag/);
 p.properties.requiresNotFlag='bad/flag';
 assert.throws(()=>compileConnectedWorld(maps),/inverse portal flag/);
});
