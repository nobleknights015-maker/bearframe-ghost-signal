import test from 'node:test';
import assert from 'node:assert/strict';
import { beginEncounter, finishEncounter } from '../public/js/engine/encounter-handoff.js';

const state = () => ({
  location:{mapId:'ruins',x:64,y:96,facing:'up'},
  party:[{id:'sleeper',hp:35}], inventory:{cell:2},
  equipment:{sleeper:{weapon:'rusted'}}, quests:{gate:'active'},
  progression:{level:3}, stealth:{alert:1}, flags:{door:true}
});
const begin = s => beginEncounter(s,{id:'security-drone',enemies:['drone']});

test('battle snapshot is detached from exploration state', () => {
  const original=state(), h=begin(original);
  original.location.x=100;
  original.party[0].hp=1;
  original.inventory.cell=0;
  assert.equal(h.snapshot.location.x,64);
  assert.equal(h.snapshot.party[0].hp,35);
  assert.equal(h.snapshot.inventory.cell,2);
  assert.equal(h.snapshot.stealth.alert,1);
  assert.ok(Object.isFrozen(h.snapshot.party[0]));
});
test('victory restores location and stealth, applies RPG result', () => {
  const h=begin(state());
  const r=finishEncounter(h,'victory',{party:[{id:'sleeper',hp:22}],quests:{gate:'done'}});
  assert.equal(r.phase,'exploration');
  assert.deepEqual(r.exploration.location,{mapId:'ruins',x:64,y:96,facing:'up'});
  assert.equal(r.exploration.stealth.alert,1);
  assert.equal(r.exploration.party[0].hp,22);
  assert.equal(h.snapshot.party[0].hp,35);
});
test('flee and defeat return to exploration without teleport', () => {
  for (const outcome of ['fled','defeat']) {
    const r=finishEncounter(begin(state()),outcome);
    assert.equal(r.outcome,outcome);
    assert.equal(r.exploration.location.x,64);
  }
});
test('rejects invalid encounters, missing state, and teleport patches', () => {
  assert.throws(() => beginEncounter(state(),{id:'',enemies:['drone']}),TypeError);
  assert.throws(() => beginEncounter(state(),{id:'x',enemies:[]}),TypeError);
  const incomplete=state(); delete incomplete.inventory;
  assert.throws(() => begin(incomplete),TypeError);
  const h=begin(state());
  assert.throws(() => finishEncounter(h,'ongoing'),TypeError);
  assert.throws(() => finishEncounter(h,'victory',{location:{mapId:'other',x:0,y:0}}),TypeError);
  assert.throws(() => finishEncounter(h,'victory',{party:{id:'wrong'}}),TypeError);
});
