import test from 'node:test';
import assert from 'node:assert/strict';
import {createRpgSaveStore,RPG_SAVE_NAMESPACE} from '../public/js/engine/rpg-save.js';
const store=()=>{
 const data=new Map([['bearframe_ghost_signal_save_v1','ORIGINAL']]);
 return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
};
test('new saves rotate across isolated slots, survive reload and preserve original game',()=>{
 const memory=store(), db=createRpgSaveStore(memory);
 assert.equal(db.load(),null);
 assert.equal(db.save({phase:'exploration',level:1}),true);
 assert.equal(db.save({phase:'exploration',level:2}),true);
 assert.equal(db.load().level,2); assert.equal(db.inspect().revision,2);
 assert.equal(memory.getItem('bearframe_ghost_signal_save_v1'),'ORIGINAL');
 assert.equal(createRpgSaveStore(memory).load().level,2);
 assert.equal(db.clear(),true); assert.equal(db.load(),null);
});
test('corrupted newest record falls back to validated previous slot',()=>{
 const mem=store(), db=createRpgSaveStore(mem);
 db.save({phase:'exploration',hp:30}); db.save({phase:'exploration',hp:20});
 mem.setItem(RPG_SAVE_NAMESPACE+':B','{"v":1,"seq":9999,"body":"oops","hash":"00000000"}');
 assert.equal(db.load().hp,30); assert.equal(db.inspect().revision,1);
});
test('failed write does not report success and leaves last good save',()=>{
 const mem=store(), db=createRpgSaveStore(mem); db.save({phase:'exploration',level:3});
 const failing={getItem:mem.getItem,setItem:(key,v)=>{if(key.endsWith(':B')) throw Error('quota'); mem.setItem(key,v);},removeItem:mem.removeItem};
 const another=createRpgSaveStore(failing);
 assert.equal(another.save({phase:'exploration',level:4}),false);
 assert.equal(another.load().level,3);
});
test('rejects invalid payload, circular data and reserved namespace',()=>{
 const mem=store(), db=createRpgSaveStore(mem);
 assert.equal(db.save({level:1}),false);
 const circular={phase:'exploration'}; circular.self=circular;
 assert.equal(db.save(circular),false);
 assert.throws(()=>createRpgSaveStore(mem,'bearframe_ghost_signal_save_v1'),TypeError);
});
