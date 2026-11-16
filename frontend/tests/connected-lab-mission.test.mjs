import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileConnectedWorld} from '../public/js/engine/connected-world.js';
import {createConnectedLabMission} from '../public/js/engine/connected-lab-mission.js';
const load=async name=>JSON.parse(await readFile(new URL('../public/maps/rpg-lab-'+name+'.tmj',import.meta.url),'utf8'));

test('real authored Tiled rooms convert to Ghost Signal collision, entities and reciprocal walkable exits',async()=>{
 const [staging,annex]=await Promise.all([load('staging'),load('annex')]);
 const graph=compileConnectedWorld([staging,annex]);
 const d=graph.destination('staging','east-gate'),back=graph.destination('annex','west-gate');
 assert.deepEqual({map:d.mapId,x:d.x,y:d.y,facing:d.facing},
   {map:'annex',x:48,y:112,facing:'right'});
 assert.deepEqual({map:back.mapId,x:back.x,y:back.y,facing:back.facing},
   {map:'staging',x:208,y:112,facing:'left'});
 for(const map of [staging,annex]){
   const mission=createConnectedLabMission(map,{getWorld:()=>({flags:{}})});
   const region=mission.buildMap();
   assert.equal(region.w,8);assert.equal(region.h,6);
   assert.equal(region.grid.length,48);
   assert.equal(region.grid[0],0,'Exterior remains solid');
   assert.equal(region.grid[3*8+3],2,'Interior remains walkable');
   assert.equal(mission.drones.length,0,'Noncanonical staging should not invent patrol fights');
   assert.ok(mission.objectives({}).length>=3);
   assert.equal(mission.entities().length,map.id==='annex'?2:1,'Annex includes cache and repeatable archive');
 }
});
test('portal trigger uses actual player feet position; label and restoration reflect persistent world state',async()=>{
 const [staging,annex]=await Promise.all([load('staging'),load('annex')]);
 let near=[],interacted=[],state={flags:{}};
 const a=createConnectedLabMission(staging,{
   getWorld:()=>state,
   onPortal:key=>near.push(key),
   onInteract:e=>interacted.push(e.id)
 });
 const g={mode:'play',player:{x:80,y:112,hidden:null},flags:{},ents:a.entities(),toast(){}};
 a.update(g,.02);assert.equal(near.at(-1),null);
 g.player.x=208;a.update(g,.02);assert.equal(near.at(-1),'east-gate');
 g.mode='rpgmenu';a.update(g,.02);assert.equal(near.length,2,'No portal travel under modal menu');
 a.interact(g.ents[0],g);assert.deepEqual(interacted,['power-switch']);
 assert.equal(a.label(g.ents[0],g),'ACTIVATE TEST RELAY');
 state={flags:{'power-switch':true}};
 a.migrate(g);assert.equal(g.ents[0].gone,true);
 assert.equal(a.label(g.ents[0],g),null);
 const b=createConnectedLabMission(annex,{getWorld:()=>({flags:{'supply-cache':true}})});
 const cache={ents:b.entities()};b.migrate(cache);
 assert.equal(cache.ents[0].gone,true);
});
