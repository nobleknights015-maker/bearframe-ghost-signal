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

function touchFixture(run) {
 const windowListeners=new Map(), elementListeners=new Map(), old=globalThis.addEventListener;
 globalThis.addEventListener=(type,fn)=>windowListeners.set(type,fn);
 try {
  const input=new Input();
  const element={dataset:{},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},addEventListener:(type,fn)=>elementListeners.set(type,fn)};
  input.bindPad(element);
  const emit=(type,id,x=90,y=50)=>elementListeners.get(type)({pointerId:id,clientX:x,clientY:y,pointerType:'touch',preventDefault(){}});
  run({input,element,emit,windowListeners});
 } finally {globalThis.addEventListener=old;}
}

test('D-pad keeps the initiating finger until that finger releases',()=>touchFixture(({input,emit})=>{
 emit('pointermove',9); assert.equal(input.dir,null,'Unstarted contact must not activate the pad');
 emit('pointerdown',1); assert.equal(input.dir,'right');
 emit('pointerdown',2,50,90); emit('pointermove',2,50,90);
 assert.equal(input.dir,'right','Second finger must not steal movement');
 emit('pointerup',2); assert.equal(input.dir,'right','Second finger must not release the first');
 emit('pointermove',1,50,10); assert.equal(input.dir,'up');
 emit('pointercancel',1); assert.equal(input.dir,null);
 emit('pointermove',1); assert.equal(input.dir,null,'Canceled contact must remain released');
 emit('pointerdown',2,10,50); assert.equal(input.dir,'left','A new contact works after cancellation');
 emit('lostpointercapture',2); assert.equal(input.dir,null);
}));

test('host pause releases held controls, queued actions and the visual D-pad',()=>touchFixture(({input,element,emit,windowListeners})=>{
 emit('pointerdown',1);
 input.pollGamepads([pad([0],[.75,0])]);
 input.stack=['left'];
 windowListeners.get('ghost-signal-host-pause')();
 assert.equal(input.dir,null);
 assert.deepEqual(input.take(),[],'Old interaction must not fire on resume');
 assert.equal(element.dataset.dir,'');
 emit('pointermove',1); assert.equal(input.dir,null,'Stale held contact cannot resume movement');
 emit('pointerdown',2,50,90); assert.equal(input.dir,'down');
 windowListeners.get('blur')(); assert.equal(input.dir,null);
}));


test('handled modal keys do not enqueue field movement or reopen pause after closing a menu',()=>{
 const old=globalThis.addEventListener,listeners=new Map();
 globalThis.addEventListener=(type,fn)=>{const all=listeners.get(type)||[];all.push(fn);listeners.set(type,all);};
 try{
  const input=new Input();
  for(const code of ['Escape','ArrowRight','Enter'])for(const listener of listeners.get('keydown'))
   listener({code,target:{tagName:'BUTTON'},defaultPrevented:true,preventDefault(){}});
  assert.equal(input.dir,null);
  assert.deepEqual(input.take(),[]);
 }finally{globalThis.addEventListener=old;}
});
