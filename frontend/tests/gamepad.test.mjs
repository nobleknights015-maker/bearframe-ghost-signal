import test from 'node:test';
import assert from 'node:assert/strict';
import {createGamepadReader} from '../public/js/engine/gamepad.js';
const pad=(axes=[0,0],pressed=[])=>({connected:true,axes,buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i)}))});
test('no controller and deadzone never create phantom input',()=>{
 const r=createGamepadReader(); assert.deepEqual(r.poll([]),{dir:null,actions:[]});
 assert.equal(r.poll([pad([.21,-.12])]).dir,null);
});
test('analog movement chooses exactly one of four directions',()=>{
 const r=createGamepadReader();
 assert.equal(r.poll([pad([.8,.7])]).dir,'right');
 assert.equal(r.poll([pad([.3,-.8])]).dir,'up');
 assert.equal(r.poll([pad([-.7,.1])]).dir,'left');
 assert.equal(r.poll([pad([.1,.7])]).dir,'down');
});
test('dpad overrides stick and inputs trigger once per press',()=>{
 const r=createGamepadReader(); const one=pad([.9,0],[12,0,9]);
 assert.equal(r.poll([one]).dir,'up');
 assert.deepEqual(r.poll([one]).actions,[]);
 r.poll([pad()]);
 assert.deepEqual(r.poll([one]).actions,['interact','pause']);
 assert.deepEqual(r.poll([]).actions,[]);
 assert.deepEqual(r.poll([one]).actions,['interact','pause']);
});
