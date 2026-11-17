import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignEnvironmentArt,loadCampaignEnvironmentArt} from '../public/js/engine/campaign-environment-art.js';
import {createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';
import {bakeMap,drawEntity} from '../public/js/art/tiles.js';

const path=name=>'assets/aeon/environment/'+name+'.png';
const manifest=()=>({schema:'aeon.private-environment-art.v1',tileSize:32,
 doorways:{
  service:{closed:path('doors/service_closed'),open:path('doors/service_open')},
  overgrown:{closed:path('doors/overgrown_closed')},
  elevator:{closed:path('doors/elevator_closed'),open:path('doors/elevator_open')},
 },
 palettes:{station_abandoned:{floor:path('terrain/station_rust'),wall:path('terrain/station_wall')}}
});
const sprite=(width,height)=>({naturalWidth:width,naturalHeight:height});
const images=()=>new Map([
 [path('doors/service_closed'),sprite(32,64)],
 [path('doors/service_open'),sprite(32,64)],
 [path('doors/overgrown_closed'),sprite(64,64)],
 [path('doors/elevator_closed'),sprite(64,64)],
 [path('doors/elevator_open'),sprite(64,64)],
 [path('terrain/station_rust'),sprite(32,32)],
 [path('terrain/station_wall'),sprite(32,32)]]);
function source(){
 const width=8,height=8,collision=Array.from({length:width*height},(_,i)=>{
  const x=i%width,y=Math.floor(i/width);
  return x===0||y===0||x===width-1||y===height-1?1:0;
 });
 const map=(id,dest,name,back)=>({id,name:'Source review '+id,width,height,
  orientation:'orthogonal',tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
  ...(id==='A00'?{environmentPalette:'station_abandoned'}:{}),
  layers:[{type:'tilelayer',name:'collision',data:collision},
   {type:'objectgroup',name:'portals',objects:[{
    name,x:(id==='A00'?5:2)*32,y:96,width:32,height:32,
    properties:{toMap:dest,toPortal:back,facing:'right',
      portalStyle:'bulkhead',portalArt:'service',...(id==='A00'?{requiresFlag:'relay_fixed'}:{})}
   }]}],entities:[],triggers:[],props:[],lamps:[],drones:[]});
 return {schemaVersion:1,campaignRevision:2,startArea:'A00',
  maps:[map('A00','A01','east','west'),map('A01','A00','west','east')]};
}
test('Loads real native door art with authored source IDs, without regenerating pixel sprites',()=>{
 const sourceImages=images(),art=compileCampaignEnvironmentArt(manifest(),sourceImages);
 assert.equal(art.doorIds.length,3);
 assert.equal(art.paletteIds.length,1);
 assert.equal(art.imageCount,7);
 assert.equal(art.door('bulkhead').id,'service');
 assert.equal(art.door('hatch').id,'overgrown');
 assert.equal(art.door('exit').id,'elevator');
 assert.equal(art.door('bulkhead','service').closed,sourceImages.get(path('doors/service_closed')));
});
test('Source palettes can require real owner terrain backdrop without inventing a sky texture',()=>{
 const owner=manifest();
 owner.palettes.station_abandoned.backdrop='terrain';
 const loaded=compileCampaignEnvironmentArt(owner,images());
 assert.equal(loaded.palette('station_abandoned').backdrop,'terrain');
 assert.equal(compileCampaignEnvironmentArt(manifest(),images()).palette('station_abandoned').backdrop,null,
  'Default original Ghost Signal backdrop stays untouched');
 const bad=manifest();
 bad.palettes.station_abandoned.backdrop='procedural-space';
 assert.throws(()=>compileCampaignEnvironmentArt(bad,images()),/invalid private terrain palette/);
});
test('Rejects missing native sprites, non-32 terrain, unauthorized paths, or nonexistent source palettes',()=>{
 const a=manifest(),i=images();
 i.delete(path('doors/service_open'));
 assert.throws(()=>compileCampaignEnvironmentArt(a,i),/missing or non-native/);
 const b=images();b.set(path('terrain/station_wall'),sprite(16,16));
 assert.throws(()=>compileCampaignEnvironmentArt(a,b),/non-native/);
 const c=manifest();c.doorways.service.closed='https://evil.example/private.png';
 assert.throws(()=>compileCampaignEnvironmentArt(c,images()),/invalid private door/);
 const d=compileCampaignEnvironmentArt(manifest(),images());
 assert.throws(()=>d.palette('invented_wasteland'),/unknown owner terrain palette/);
 assert.equal(d.palette(null),null);
});
test('No private source pack remains an explicit review-only fallback, never an accepted release',async()=>{
 const optional=await loadCampaignEnvironmentArt({
  read:async()=>({ok:false,status:404}),loadImage:async()=>{throw Error('should not load');}
 });
 assert.equal(optional,null);
 await assert.rejects(()=>loadCampaignEnvironmentArt({
  requireInstalled:true,read:async()=>({ok:false,status:404}),loadImage:async()=>{}
 }),/installation missing/);
});
test('Actual installed private sprites bind to physical doors and source-selected terrain',()=>{
 const actual=images(),art=compileCampaignEnvironmentArt(manifest(),actual),src=source();
 const before=JSON.stringify(src);
 let flags={};
 const f=createCampaignMissionFactory(src,{environmentArt:art,getWorld:()=>({flags})});
 const a=f.missionForSync('A00'),b=f.missionForSync('A01');
 assert.equal(a.environmentArt.floor,actual.get(path('terrain/station_rust')));
 assert.equal(b.environmentArt,null,'No guessed palette for an unauthorised area');
 const [door]=a.entities();
 assert.equal(door.type,'bulkhead');
 assert.equal(door.portalId,'east');
 assert.equal(door.artImages.closed,actual.get(path('doors/service_closed')));
 assert.equal(door.artImages.open,actual.get(path('doors/service_open')));
 const g={mode:'play',m:{id:'A00'},player:{x:176,y:112,hidden:false},ents:a.entities()};
 a.update(g,.016);
 assert.equal(g.ents[0].open,0);
 flags={relay_fixed:true};
 a.update(g,.016);
 assert.equal(g.ents[0].open,1);
 assert.equal(JSON.stringify(src),before,'No original map or story mutation');
});
test('Real closed and open owner door images render at native size, bottom-aligned',()=>{
 const art=compileCampaignEnvironmentArt(manifest(),images());
 const f=createCampaignMissionFactory(source(),{environmentArt:art});
 const e=f.missionForSync('A00').entities()[0];
 const calls=[];
 const c={drawImage:(...args)=>calls.push(args),imageSmoothingEnabled:true};
 drawEntity(c,{...e,open:0},{time:0,flags:{}});
 drawEntity(c,{...e,open:1},{time:0,flags:{}});
 assert.equal(calls.length,2);
 assert.equal(calls[0][0],art.door('bulkhead').closed);
 assert.equal(calls[1][0],art.door('bulkhead').open);
 assert.deepEqual(calls[0].slice(1),[160,64],'32x64 image is anchored at 32px portal');
 assert.equal(c.imageSmoothingEnabled,false,'Never interpolate the supplied native pixel art');
});
test('Source-selected real map palette bypasses procedural floor and wall drawing',()=>{
 const art=compileCampaignEnvironmentArt(manifest(),images());
 const mission=createCampaignMissionFactory(source(),{environmentArt:art}).missionForSync('A00');
 const calls=[];
 const ctx={
  drawImage:(...args)=>calls.push(args),fillRect:()=>{},
  set fillStyle(_){},imageSmoothingEnabled:true
 };
 const prior=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const canvas=bakeMap(mission.buildMap(),mission);
  assert.equal(canvas.width,256);assert.equal(canvas.height,256);
  assert.ok(calls.some(x=>x[0]===art.palette('station_abandoned').floor));
  assert.ok(calls.some(x=>x[0]===art.palette('station_abandoned').wall));
  assert.equal(ctx.imageSmoothingEnabled,false);
 }finally{globalThis.document=prior;}
});
