// Live module wiring test with a deliberately small DOM/Game host. This verifies
// mount callbacks and durable journals; it does not substitute for browser/device QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game} from '../public/js/game.js';
import {mountRpgLab} from '../public/js/engine/rpg-lab.js';
import {createAeonConnectedField} from '../public/js/engine/aeon-connected-field.js';
const clone=x=>structuredClone(x);
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.listeners={};this.hiddenClasses=new Set();
  this.classList={add:x=>this.hiddenClasses.add(x),remove:x=>this.hiddenClasses.delete(x),toggle:(x,on)=>on?this.hiddenClasses.add(x):this.hiddenClasses.delete(x)};}
 append(...nodes){this.children.push(...nodes);} appendChild(node){this.append(node);return node;}
 replaceChildren(...nodes){this.children=[...nodes];} setAttribute(){} getContext(){return {};}
 addEventListener(name,fn){this.listeners[name]=fn;}
 querySelector(){return null;} querySelectorAll(){return [];}
}
function environment(storage){
 const originals=new Map();
 const replace=(name,value)=>{originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
 const ids=new Map(['stage','hud','hud-stealth','btn-save','pause-note','btn-quit'].map(id=>[id,new Element()]));
 const events=new Map();
 replace('document',{createElement:tag=>new Element(tag),getElementById:id=>ids.get(id),addEventListener(){}});
 replace('window',{location:{href:'https://example.test/aeon.html'}});
 replace('localStorage',storage);replace('Image',class {set src(_) {}});
 replace('addEventListener',(name,fn)=>events.set(name,fn));
 return {ids,events,restore(){for(const [name,descriptor] of originals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}};
}
function host(){
 return {mode:'title',m:null,flags:{},player:{},drones:[],time:0,store:{save:()=>{throw Error('Legacy save touched');}},sfx:{pickup(){}},
  checkpoint:Game.prototype.checkpoint,
  restore(){this.applySnap(this.snap);},
  applySnap:Game.prototype.applySnap, snapshot:Game.prototype.snapshot,
  makeDrones(){return this.m.drones.map(()=>({x:176,y:80,dir:'down',state:'patrol'}));},
  start(mission,snap){this.m=mission;this.flags={};this.inv={};this.stats={};this.caseFile={ev:[],logs:[]};this.player={...mission.start,moving:false,energy:100};this.ents=mission.entities();this.drones=mission.drones.map(()=>({x:176,y:80,dir:'down',state:'patrol'}));this.mode='play';if(snap)this.applySnap(snap);mission.migrate(this);this.checkpoint();},
  free(){return true;},toast(){},onResume(){this.mode='play';}};
}
const maps=()=>Promise.all(['staging','annex'].map(async id=>JSON.parse(await readFile(new URL('../public/maps/rpg-lab-'+id+'.tmj',import.meta.url),'utf8'))));
const v5={starterId:'sleeper_C',catalogCount:42,field:{id:'sleeper_C',canvas:{width:448,height:224}},battleArt:{}};
const settled=()=>new Promise(resolve=>setImmediate(resolve));

test('mounted unified field wires real mission callbacks, atomic portals and reload without legacy writes',async()=>{
 const values=new Map([['bearframe_ghost_signal_save_v1','legacy-sentinel']]);let refuseWrites=false;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(refuseWrites)throw Error('storage full');values.set(k,v);},removeItem:k=>values.delete(k)};
 let env=environment(storage);
 try{
  const connected=await createAeonConnectedField({readMaps:maps});
  const game=host(),toasts=[];
  let lab=mountRpgLab({game,connected,v5,ui:{show(){},toast:text=>toasts.push(text)},sfx:{},touchMode:()=>false,newGame:true});
  assert.equal(game.mode,'play');assert.equal(game.m.id,'staging');
  assert.equal(lab.inspect().session.exploration.party[0].artId,'sleeper_C');
  assert.equal(game.sheet.width,448);
  const relay=game.ents.find(e=>e.id==='power-switch');
  refuseWrites=true;
  game.m.interact(relay,game);
  assert.equal(lab.inspect().session.exploration.events['power-switch'],undefined,'Failed save rolls back runtime event');
  assert.equal(game.flags['power-switch'],undefined);
  assert.equal(relay.gone,false,'Failed save restores live entity visibility');
  refuseWrites=false;
  game.m.interact(relay,game);game.m.interact(relay,game);
  assert.equal(lab.inspect().session.exploration.events['power-switch'],true);
  assert.equal(lab.inspect().session.exploration.quests.expedition,'power-restored');
  assert.equal(toasts.filter(t=>t==='FIELD RECORD UPDATED').length,1);
  // Real mission.update discovers the portal from feet position; no direct travel API.
  game.m.update(game,.016);
  game.player.x=208;game.player.y=112;
  refuseWrites=true;
  game.m.update(game,.016);
  await settled();
  assert.equal(game.m.id,'staging','Failed portal journal restores the source map');
  assert.equal(game.player.x,208,'Failed portal keeps exact source feet position');
  assert.equal(lab.inspect().session.exploration.location.mapId,'staging');
  assert.equal(lab.inspect().connected.busy,false);
  refuseWrites=false;
  game.player.x=176;game.m.update(game,.016); // leave doorway to rearm
  game.player.x=208;
  game.m.update(game,.016);game.m.update(game,.016);
  await settled();
  assert.equal(game.m.id,'annex');assert.equal(game.player.x,48);
  assert.equal(lab.inspect().connected.busy,false);
  assert.deepEqual(lab.inspect().connected.maps.sort(),['annex','staging']);
  const cache=game.ents.find(e=>e.id==='supply-cache');
  game.m.interact(cache,game);game.m.interact(cache,game);
  assert.equal(lab.inspect().session.exploration.inventory['repair-kit'],2);
  // Lifecycle listener persists current coordinates through the mounted save owner.
  game.player.x=90;env.events.get('ghost-signal-host-pause')();
  env.restore();env=environment(storage);
  const resumed=host(),again=await createAeonConnectedField({readMaps:maps});
  lab=mountRpgLab({game:resumed,connected:again,v5,ui:{show(){},toast(){}},sfx:{},touchMode:()=>false});
  assert.equal(resumed.m.id,'annex');assert.equal(resumed.player.x,90);
  assert.equal(resumed.ents.find(e=>e.id==='supply-cache').gone,true);
  resumed.m.interact(resumed.ents[0],resumed);
  assert.equal(lab.inspect().session.exploration.inventory['repair-kit'],2,'Reload cannot duplicate reward');
  resumed.m.update(resumed,.016);resumed.player.x=48;resumed.m.update(resumed,.016);
  await settled();
  assert.equal(resumed.m.id,'staging');assert.equal(resumed.player.x,208);
  assert.equal(resumed.ents.find(e=>e.id==='power-switch').gone,true);
  assert.equal(values.get('bearframe_ghost_signal_save_v1'),'legacy-sentinel');
 }finally{env.restore();}
});
