import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLabWorld} from '../public/js/engine/rpg-lab-migration.js';

const old=()=>({
 location:{mapId:'rpg-lab',x:520,y:300,facing:'down'},
 party:[{id:'sleeper',hp:22,maxHp:38,ep:5,maxEp:10,attack:11,defense:4,speed:10},
        {id:'echo',hp:10,maxHp:29,ep:0,maxEp:10,attack:7,defense:2,speed:7}],
 inventory:{'ancient-scrap':1,'repair-kit':2},equipment:{sleeper:{weapon:'legacy-tool'},echo:{}},
 quests:{archive:'read',sentry:'neutralized'},progression:{xp:12},flags:{labResolved:true}
});
test('older RPG lab saves acquire lineage and skill metadata without rewriting earned state',()=>{
 const source=old(),result=migrateLabWorld(source);
 assert.equal(result.party[0].lineage,'sleeper');
 assert.deepEqual(result.party[0].skills,['pulse','guard']);
 assert.equal(result.party[1].lineage,'echo');
 assert.deepEqual(result.party[1].skills,['repair','guard']);
 for(const k of ['location','inventory','equipment','quests','progression','flags'])
  assert.deepEqual(result[k],source[k]);
 assert.equal(result.party[0].hp,22);
 assert.equal(source.party[0].lineage,undefined,'Migration must not mutate original snapshot');
});
test('migration is idempotent, preserves authored changes and never creates inventory items',()=>{
 const source=migrateLabWorld(old());
 source.party[0].skills=['guard'];source.party[0].lineage='custom-test-lineage';
 assert.deepEqual(migrateLabWorld(source),source);
 assert.equal(migrateLabWorld(old()).inventory['legacy-blade'],undefined);
 assert.throws(()=>migrateLabWorld({}),TypeError);
});
