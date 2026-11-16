import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileConnectedWorld} from '../public/js/engine/connected-world.js';

const map=id=>JSON.parse(readFileSync(new URL('../public/maps/rpg-lab-'+id+'.tmj',import.meta.url),'utf8'));
test('existing reciprocal expedition gates remain valid',()=>{
  const graph=compileConnectedWorld([map('staging'),map('annex')]);
  assert.equal(graph.destination('staging','service-hatch').requiresFlag,'power-switch');
  assert.equal(graph.destination('annex','service-return').mapId,'staging');
});
test('two portals on one tile are rejected rather than arbitrarily selected',()=>{
  const staging=map('staging'),annex=map('annex');
  const portals=staging.layers.find(layer=>layer.name==='portals').objects;
  portals[1].x=portals[0].x;
  portals[1].y=portals[0].y;
  assert.throws(()=>compileConnectedWorld([staging,annex]),/overlapping portal tiles/);
});
