import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOrientedBulkhead as check} from '../narrative-tools/oriented_bulkhead_gate.mjs';
const fixture=()=>({map:{w:5,h:5,tileSize:32,grid:Array.from({length:25},(_,i)=>i>=11&&i<=13?2:0)},gate:{tx:2,ty:2},axis:'east-west',stateArt:[{x:72,y:40,w:16,h:16}]});
test('east-west gate with opposing approaches, perpendicular jambs and solid state art',()=>assert.equal(check(fixture()).pass,true));
test('wrong source orientation fails',()=>{const f=fixture();f.axis='north-south';assert.equal(check(f).pass,false);});
test('missing jamb or perpendicular walkable lane fails',()=>{const f=fixture();f.map.grid[7]=2;assert.ok(check(f).problems.includes('JAMB_MISMATCH'));});
test('state art crossing onto the walkable threshold fails',()=>{const f=fixture();f.stateArt[0].y=56;assert.ok(check(f).problems.includes('STATE_ART_OVERLAPS_PASSAGE'));});
test('bad dimensions and off-map state rectangles fail closed',()=>{assert.equal(check({}).pass,false);const f=fixture();f.stateArt[0].x=-1;assert.ok(check(f).problems.includes('INVALID_STATE_ART'));});
