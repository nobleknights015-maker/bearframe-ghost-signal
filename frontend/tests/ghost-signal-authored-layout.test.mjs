import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const load=path=>readFileSync(resolve(publicRoot,path),'utf8');
const compiled=await import('data:text/javascript;base64,'+
 Buffer.from(load('js/art/authored-environments.js')).toString('base64'));

const missions=['mission3','mission4','mission5','mission6'];
for(const [i,name] of missions.entries()){
 test(name+' authored visual treatment respects mission coordinates and floor solidity',async()=>{
   const mod=await import('data:text/javascript;base64,'+
      Buffer.from(load('js/missions/'+name+'.js')).toString('base64'));
   const m=mod['mission'+(i+3)],scene=compiled.authoredSite(m),map=m.buildMap();
   assert.equal(m.id,'m'+(i+3));
   assert.equal(compiled.isAuthored(m),true);
   assert.ok(scene.zones.length>=2);
   assert.ok(scene.paths.length>=3);
   assert.ok(scene.sites.length>=3);
   const sx=Math.floor(m.start.x/32),sy=Math.floor(m.start.y/32);
   assert.equal(map.grid[sy*map.w+sx],2,'player starts on navigable terrain');
   const at=(x,y)=>x<0||y<0||x>=map.w||y>=map.h?0:map.grid[y*map.w+x];
   const ctx={calls:[],fillStyle:'#000',
      fillRect(x,y,w,h){this.calls.push({x,y,w,h,color:this.fillStyle});}};
   compiled.paintAuthoredFloor(ctx,m,sx,sy,at);
   assert.ok(ctx.calls.some(x=>x.x===sx*32&&x.y===sy*32&&x.w===32&&x.h===32));
   assert.ok(ctx.calls.length<25,'regressed into noisy per-pixel randomized floor');
   ctx.calls.length=0;
   const prop=m.props.find(p=>p.t==='machine');
   assert.ok(prop,'expect purposeful machine props');
   assert.equal(compiled.drawAuthoredMachine(ctx,m,prop),true);
   assert.ok(ctx.calls.length>5);
   assert.ok(ctx.calls.length<((prop.w||1)*32*(prop.h||1))/4,
     'machine should be modular, not an overpainted photographic wall');
   const colorSamples=new Set();
   for(let y=sy;y<Math.min(sy+9,map.h);y++)
     for(let x=sx;x<Math.min(sx+9,map.w);x++)if(at(x,y)===2){
       ctx.calls.length=0;compiled.paintAuthoredFloor(ctx,m,x,y,at);
       colorSamples.add(ctx.calls[0].color);
     }
   assert.ok(colorSamples.size>1,'map locations should remain visually distinct');
 });
}
test('M01/M02 stay on original renderer and expansion never paints uncontrolled overlays',()=>{
 assert.equal(compiled.isAuthored({id:'m1'}),false);
 assert.equal(compiled.isAuthored({id:'m2'}),false);
 assert.equal(compiled.authoredSite({id:'m1'}),null);
 const renderer=load('js/art/tiles.js');
 assert.match(renderer,/g === 2 && isAuthored\(mission\)/);
 assert.match(renderer,/paintAuthoredFloor/);
 assert.match(renderer,/paintAuthoredWall/);
 assert.match(renderer,/paintAuthoredSites/);
 assert.match(renderer,/drawAuthoredMachine/);
 assert.match(renderer,/paintPackAuthoredDetail/);
 assert.match(renderer,/if\(!drawAuthoredMachine/);
 assert.match(load('js/engine/save.js'),/bearframe_ghost_signal_save_v1/);
});
