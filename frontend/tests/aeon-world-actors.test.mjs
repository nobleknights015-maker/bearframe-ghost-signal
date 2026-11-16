import test from 'node:test';
import assert from 'node:assert/strict';
import {loadV5WorldActor,createV5SecurityRenderer} from '../public/js/engine/aeon-world-actors.js';
const entry=(id='old_sentry',width=96,height=96)=>({id,world:{src:'assets/world/'+id+'.png',
 frameWidth:width,frameHeight:height,columns:9,rows:4,directions:['down','left','right','up'],
 idleColumn:0,walkColumns:[1,2,3,4,5,6,7,8],fps:8,anchor:[width/2,height]}});
const manifest=(e=entry())=>({schema:'aeon.asset-library.v4',characters:[e]});
const withImage=async(fn,width=864,height=384)=>{
 const original=globalThis.Image;
 globalThis.Image=class{naturalWidth=width;naturalHeight=height;set src(value){this.url=value;this.onload();}};
 try{await fn();}finally{if(original===undefined)delete globalThis.Image;else globalThis.Image=original;}
};
test('world actor loader validates identity, native dimensions and immutable metadata',async()=>{
 await withImage(async()=>{
  const source=manifest();const a=await loadV5WorldActor(source,'old_sentry');
  assert.match(a.image.url,/\/assets\/aeon\/assets\/world\/old_sentry.png$/);
  assert.ok(Object.isFrozen(a.world.walkColumns));source.characters[0].world.anchor[0]=0;
  assert.deepEqual(a.world.anchor,[48,96]);
  for(const change of [
   {src:'https://example.test/a.png'},{src:'assets/world/../old_sentry.png'},
   {frameWidth:0},{frameHeight:97},{columns:8},{rows:3},
   {directions:['down','down','right','up']},{walkColumns:[1,2,3,4]},{idleColumn:1},
   {anchor:[48,95]},{fps:0}
  ])await assert.rejects(loadV5WorldActor(manifest({...entry(),world:{...entry().world,...change}}),'old_sentry'),TypeError);
  await assert.rejects(loadV5WorldActor(manifest(),'unknown'),TypeError);
  await assert.rejects(loadV5WorldActor({...manifest(),characters:[entry(),entry()]},'old_sentry'),TypeError);
 });
 await withImage(async()=>assert.rejects(loadV5WorldActor(manifest(),'old_sentry'),/dimensions/),863,384);
 await withImage(async()=>{
  const echo=await loadV5WorldActor(manifest(entry('echo_industrial_maintenance',64,80)),'echo_industrial_maintenance');
  assert.deepEqual(echo.world.anchor,[32,80]);
 },576,320);
});
test('security renderer uses all source walk columns, row metadata and native bottom-center feet',async()=>{
 await withImage(async()=>{
  const asset=await loadV5WorldActor(manifest(),'old_sentry');
  const render=createV5SecurityRenderer(asset),calls=[];
  const ctx={save(){},restore(){},drawImage(...args){calls.push(args);}};
  const d={c:{artId:'old_sentry'},x:100,y:120,dir:'down',state:'patrol'};
  assert.equal(render(ctx,d,0),true);assert.equal(calls.at(-1)[1],0,'First frame is stationary idle');
  const columns=[];
  for(let i=0;i<9;i++){
   d.x++;render(ctx,d,i/8+.125);columns.push(calls.at(-1)[1]/96);
   assert.deepEqual(calls.at(-1).slice(3),[96,96,Math.round(d.x)-48,24,96,96]);
  }
  assert.deepEqual(columns,[1,2,3,4,5,6,7,8,1]);
  for(const [row,dir] of asset.world.directions.entries()){
   d.dir=dir;render(ctx,d,2);assert.equal(calls.at(-1)[2],row*96);
   assert.equal(calls.at(-1)[1],0,'Stationary unit never moonwalks');
  }
  d.state='disabled';d.x++;render(ctx,d,3);assert.equal(calls.at(-1)[1],0,'Disabled actor stays idle');
  const count=calls.length;
  assert.equal(render(ctx,{...d,c:{artId:'another_actor'}},4),false);
  assert.equal(render(ctx,{...d,dir:'diagonal'},4),false);
  assert.equal(calls.length,count,'Unsupported actors remain available to original renderer');
 });
});

test('original Ghost Signal security drawing remains the default and hooks must explicitly handle a unit',async()=>{
 const {Game}=await import('../public/js/game.js');
 let marks=0,handled=0;
 const ctx={fillRect(){marks++;}};
 const unit={x:80,y:112,dir:'down',state:'patrol',alert:0};
 Game.prototype.renderSecurityUnit.call({},ctx,unit,0);
 assert.ok(marks>0,'Default draw must still paint the original security unit');
 marks=0;
 Game.prototype.renderSecurityUnit.call({drawSecurityUnit(){handled++;return true;}},ctx,unit,0);
 assert.equal(handled,1);assert.equal(marks,0,'Handled custom art must not be overpainted by original art');
 Game.prototype.renderSecurityUnit.call({drawSecurityUnit(){return false;}},ctx,unit,0);
 assert.ok(marks>0,'An unbound actor must retain the original fallback');
});
