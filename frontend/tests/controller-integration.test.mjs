import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../public/js/engine/input.js';
const pad=(pressed=[],axes=[0,0])=>({connected:true,axes,buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i)}))});

test('gamepad supplements Ghost Signal input without replacing keyboard/touch',()=>{
 const listeners=new Map(), old=globalThis.addEventListener;
 globalThis.addEventListener=(type,fn)=>{ const all=listeners.get(type)||[]; all.push(fn); listeners.set(type,all); };
 try {
   const i=new Input();
   i.pollGamepads([pad([0,2],[.75,0])]);
   assert.equal(i.dir,'right');
   assert.deepEqual(i.take(),['interact','scan']);
   i.pollGamepads([pad([0,2],[.75,0])]);
   assert.deepEqual(i.take(),[],'Button edge must not retrigger each frame');
   const event={code:'KeyA',target:{tagName:'DIV'},preventDefault(){}};
   for(const fn of listeners.get('keydown')) fn(event);
   assert.equal(i.dir,'left','Keyboard takes priority over gamepad');
   i.touchDir='down'; assert.equal(i.dir,'down','Touch D-pad takes top priority');
   i.touchDir=null;
   for(const fn of listeners.get('keyup')) fn({code:'KeyA'});
   assert.equal(i.dir,'right');
   i.pollGamepads([]); assert.equal(i.dir,null);
 } finally { globalThis.addEventListener=old; }
});

test('controller can be polled for UI without sending gameplay actions',()=>{
 const old=globalThis.addEventListener;globalThis.addEventListener=()=>{};
 try {
   const i=new Input();
   const state=i.pollGamepads([pad([0,9])],false);
   assert.deepEqual(state.actions,['interact','pause']);
   assert.deepEqual(i.take(),[]);
 } finally {globalThis.addEventListener=old;}
});
