import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAeonConnectedField} from '../public/js/engine/aeon-connected-field.js';
import {compileAreaPolicy,securityAt} from '../public/js/engine/area-policy.js';

const readMaps=()=>Promise.all(['staging','annex'].map(async id=>
  JSON.parse(await readFile(new URL('../public/maps/rpg-lab-'+id+'.tmj',import.meta.url),'utf8'))));

test('unified field reuses real reciprocal rooms and scopes the visible patrol to annex',async()=>{
  const field=await createAeonConnectedField({readMaps});
  assert.deepEqual(field.startLocation,{mapId:'staging',x:80,y:112,facing:'right'});
  const staging=await field.missionFor('staging'),annex=await field.missionFor('annex');
  assert.equal(await field.missionFor('annex'),annex);
  assert.equal(staging.drones.length,0);
  assert.equal(annex.drones.length,1);
  assert.equal(annex.entities()[0].id,'supply-cache');
  assert.equal(field.graph.destination('staging','east-gate').mapId,'annex');
  assert.equal(field.graph.destination('annex','west-gate').mapId,'staging');
  assert.equal(securityAt(compileAreaPolicy(field.policyFor('staging')),80,112).mode,'normal');
  assert.equal(securityAt(compileAreaPolicy(field.policyFor('annex')),80,112).onDetection,'encounter');
  await assert.rejects(field.missionFor('missing'),/Unknown/);
});

test('portal transition and modal frames cannot also start encounters',async()=>{
  let ticks=0,entered=null;
  const field=await createAeonConnectedField({readMaps,onUpdate:()=>ticks++,
    onPortal:(portal,g)=>{if(portal){entered=portal;g.mode='transition';}}});
  const mission=await field.missionFor('staging');
  const g={mode:'play',player:{x:80,y:112,hidden:false},drones:[]};
  mission.update(g,.02);assert.equal(ticks,1);
  g.player.x=208;mission.update(g,.02);
  assert.equal(entered,'east-gate');assert.equal(ticks,1);
  g.mode='battle';mission.update(g,.02);assert.equal(ticks,1);
});

test('resolved encounter stays disabled on map revisit and field events retain world authority',async()=>{
  let world={flags:{}},interaction=null;
  const field=await createAeonConnectedField({readMaps,getWorld:()=>world,
    onInteract:(e,g)=>interaction={id:e.id,map:g.m.id}});
  const mission=await field.missionFor('annex');
  const drone={state:'patrol',t:0,alert:1,vis:true};
  const g={m:mission,mode:'play',player:{x:80,y:112,hidden:false},drones:[drone],ents:mission.entities()};
  mission.interact(g.ents[0],g);assert.deepEqual(interaction,{id:'supply-cache',map:'annex'});
  world={flags:{labResolved:true,'supply-cache':true}};
  mission.migrate(g);
  assert.equal(g.ents[0].gone,true);
  assert.equal(drone.state,'disabled');assert.equal(drone.vis,false);
  assert.equal(drone.t,1e9);
});

test('late-bound callbacks and world replace bootstrap delegates in cached missions',async()=>{
  const field=await createAeonConnectedField({readMaps});
  const mission=field.missionForSync('staging');
  let updated=0,portal=null,interacted=false;
  field.bind({getWorld:()=>({flags:{'power-switch':true}}),
    onUpdate:()=>updated++,onPortal:id=>portal=id,onInteract:()=>interacted=true});
  const g={mode:'play',player:{x:208,y:112,hidden:false},drones:[],ents:mission.entities()};
  mission.update(g,.02);mission.interact(g.ents[0],g);mission.migrate(g);
  assert.equal(updated,1);assert.equal(portal,'east-gate');assert.equal(interacted,true);
  assert.equal(g.ents[0].gone,true);
  assert.equal(mission,await field.missionFor('staging'));
});
