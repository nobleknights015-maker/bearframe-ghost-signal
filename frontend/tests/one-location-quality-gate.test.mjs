import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOneLocationQualityGate} from '../narrative-tools/one_location_quality_gate.mjs';

function sample() {
  // Synthetic 7 x 5 fixture: a single door at (3,2) divides left/right bays.
  const w = 7, h = 5;
  const grid = Array.from({length: w * h}, (_, i) => {
    const x = i % w, y = Math.floor(i / w);
    if (x === 0 || y === 0 || x === 6 || y === 4 || x === 3 && y !== 2) return 0;
    return 2;
  });
  return {
    map: {w, h, tileSize: 32, grid, start: {x: 48, y: 80}},
    lockedDoor: {tx: 3, ty: 2},
    gatedDestination: {tx: 5, ty: 2},
    requiredInteractive: [{id: 'unlock', tx: 1, ty: 1}],
    artLayers: [{id: 'base', width: 224, height: 160}, {id: 'over', width: 224, height: 160}]
  };
}
const problem = (report, code) => report.problems.some(entry => entry.code === code);
test('one-room structural gate tests locked, unlocked, return, full reachable and native art', () => {
  const r = verifyOneLocationQualityGate(sample());
  assert.equal(r.pass, true, JSON.stringify(r.problems));
  assert.deepEqual(r.counts, {walkable: 13, reachableWhenSealed: 6, reachableWhenReleased: 13});
});
test('rejects a shortcut around the only controlled door', () => {
  const f = sample(); f.map.grid[1 * f.map.w + 3] = 2;
  const r = verifyOneLocationQualityGate(f);
  assert.equal(r.pass, false);assert.equal(problem(r, 'GATE_BYPASS'), true);
});
test('rejects unreachable decorative floor pockets', () => {
  const f = sample(); f.map.grid[2 * f.map.w + 4] = 0;
  f.map.grid[1 * f.map.w + 4] = 0;f.map.grid[3 * f.map.w + 4] = 0;
  const r = verifyOneLocationQualityGate(f);
  assert.equal(r.pass, false);assert.equal(problem(r, 'DISCONNECTED_WALKABLE'), true);
});
test('rejects misplaced interactive controls and source tiles with incorrect dimensions', () => {
  const f=sample();f.requiredInteractive=[{id:'relay',tx:4,ty:2}];f.artLayers[1].width=192;
  const r=verifyOneLocationQualityGate(f);
  assert.equal(r.pass,false);assert.equal(problem(r,'ART_DIMENSION_MISMATCH'),true);
  assert.equal(problem(r,'INTERACTIVE_BEHIND_LOCK'),true);
});
test('rejects malformed grid and absent map without throwing', () => {
  assert.equal(problem(verifyOneLocationQualityGate({}),'INVALID_COLLISION_GRID'),true);
  const f=sample();f.map.grid.pop();
  assert.equal(problem(verifyOneLocationQualityGate(f),'INVALID_COLLISION_GRID'),true);
});
