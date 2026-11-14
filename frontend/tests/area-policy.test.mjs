// Run: node --test frontend/tests/area-policy.test.mjs (Node with ESM support)
import test from 'node:test';
import assert from 'node:assert/strict';
import { compileAreaPolicy, securityAt, securityTransition } from '../public/js/engine/area-policy.js';

const policy = compileAreaPolicy({ zones: [
  { id: 'ruin', mode: 'stealth', rect: { x: 32, y: 64, width: 64, height: 96 }, onDetection: 'chase' },
  { id: 'safe-room', mode: 'normal', rect: { x: 48, y: 80, width: 16, height: 16 } }
] });

test('default normal exploration and exact half-open boundaries', () => {
  assert.deepEqual(securityAt(policy, 31.999, 64), { mode: 'normal', zoneId: null, onDetection: null });
  assert.equal(securityAt(policy, 32, 64).mode, 'stealth');
  assert.equal(securityAt(policy, 95.999, 159.999).mode, 'stealth');
  assert.equal(securityAt(policy, 96, 160).mode, 'normal');
});
test('last zone overlays safely and does not mutate position or player state', () => {
  const player = Object.freeze({ x: 45, y: 85, party: Object.freeze(['unit']), inventory: Object.freeze({ key: 1 }) });
  const t = securityTransition(policy, player.x, player.y, 50, 85);
  assert.equal(t.changed, true);
  assert.equal(t.from.mode, 'stealth');
  assert.equal(t.to.mode, 'normal');
  assert.deepEqual(player, { x: 45, y: 85, party: ['unit'], inventory: { key: 1 } });
  assert.equal(securityTransition(policy, 50, 85, 51, 85).changed, false);
});
test('detection response is authored, never automatically combat', () => {
  assert.equal(securityAt(policy, 33, 70).onDetection, 'chase');
  const combat = compileAreaPolicy({ zones: [{ id: 'boss', mode: 'stealth', rect: { x: 0, y: 0, width: 32, height: 32 }, onDetection: 'encounter' }] });
  assert.equal(securityAt(combat, 1, 1).onDetection, 'encounter');
  assert.equal(securityAt(policy, 1, 1).onDetection, null);
});
test('rejects malformed policies, invalid geometry, duplicate IDs and unsupported responses', () => {
  for (const bad of [
    null, [], { defaultMode: 'diagonal' }, { zones: {} },
    { zones: [{ id: 'x', mode: 'stealth', rect: { x: 0, y: 0, width: 0, height: 2 } }] },
    { zones: [{ id: 'x', mode: 'stealth', rect: { x: 0, y: 0, width: 1, height: Infinity } }] },
    { zones: [{ id: 'x', mode: 'stealth', rect: { x: 0, y: 0, width: 1, height: 1 }, onDetection: 'forced-battle' }] },
    { zones: [{ id: 'x', mode: 'normal', rect: { x: 0, y: 0, width: 1, height: 1 } }, { id: 'x', mode: 'stealth', rect: { x: 2, y: 2, width: 1, height: 1 } }] }
  ]) assert.throws(() => compileAreaPolicy(bad), TypeError);
  assert.throws(() => securityAt(policy, NaN, 2), TypeError);
});
test('compiled policy is independent of mutable caller data', () => {
  const spec = { zones: [{ id: 'z', mode: 'stealth', rect: { x: 0, y: 0, width: 10, height: 10 } }] };
  const p = compileAreaPolicy(spec);
  spec.zones[0].rect.width = 100;
  assert.equal(securityAt(p, 50, 5).mode, 'normal');
  assert.ok(Object.isFrozen(p.zones[0].rect));
});
