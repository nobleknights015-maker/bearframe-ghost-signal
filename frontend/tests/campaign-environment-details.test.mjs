import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignEnvironmentArt} from '../public/js/engine/campaign-environment-art.js';
import {compileCampaignEnvironmentDetails,paintCampaignEnvironmentDetails} from
  '../public/js/engine/campaign-environment-details.js';
import {createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';
import {bakeMap,bakeOver} from '../public/js/art/tiles.js';

const path=name=>'assets/aeon/environment/'+name+'.png';
const atlasName='atlases/wasteland_terrain';
const image=(w,h)=>({naturalWidth:w,naturalHeight:h});
function art(){
 const manifest={schema:'aeon.private-environment-art.v1',tileSize:32,
  doorways:{service:{closed:path('doors/service_closed')},
    overgrown:{closed:path('doors/overgrown_closed')},
    elevator:{closed:path('doors/elevator_closed')}},
  palettes:{earth:{floor:path('terrain/wasteland_earth'),wall:path('terrain/wasteland_clay')}},
  objects:{wasteland_terrain:path(atlasName)}};
 const images=new Map([
  [path('doors/service_closed'),image(32,64)],
  [path('doors/overgrown_closed'),image(64,64)],
  [path('doors/elevator_closed'),image(64,64)],
  [path('terrain/wasteland_earth'),image(32,32)],
  [path('terrain/wasteland_clay'),image(32,32)],
  [path(atlasName),image(544,512)]
 ]);
 return {images,manifest,env:compileCampaignEnvironmentArt(manifest,images)};
}
function map(id,to,name,back){
 const w=9,h=9,coll=Array.from({length:w*h},(_,i)=>{
  const x=i%w,y=Math.floor(i/w);return x===0||y===0||x===w-1||y===h-1?1:0;
 });
 return {id,name:'SYNTHETIC FIELD',width:w,height:h,orientation:'orthogonal',
  tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},environmentPalette:'earth',
  layers:[{name:'collision',type:'tilelayer',data:coll},
   {name:'portals',type:'objectgroup',objects:[{name,x:5*32,y:3*32,width:32,height:32,
    properties:{toMap:to,toPortal:back,facing:'right'}}]}],
  entities:[{id:'console',type:'terminal',tx:4,ty:4}],
  triggers:[],props:[],lamps:[],drones:[],
  environmentDetails:[
   {id:'dry_grass',atlas:'wasteland_terrain',layer:'ground',tx:3,ty:5,
     sx:0,sy:64,sw:32,sh:32},
   {id:'wall_erosion',atlas:'wasteland_terrain',layer:'background',tx:0,ty:5,
     sx:32,sy:64,sw:32,sh:32},
   {id:'edge_silhouette',atlas:'wasteland_terrain',layer:'foreground',tx:8,ty:6,
     sx:64,sy:64,sw:32,sh:32}
  ]};
}
const world=()=>({schemaVersion:1,campaignRevision:2,startArea:'A00',
 maps:[map('A00','A01','east','west'),map('A01','A00','west','east')]});
test('Large original owner atlases load natively while preserving strict PNG source boundaries',()=>{
 const {manifest,images,env}=art();
 assert.equal(env.atlas('wasteland_terrain'),images.get(path(atlasName)));
 assert.deepEqual(env.atlasIds,['wasteland_terrain']);
 assert.equal(env.imageCount,6);
 assert.throws(()=>env.atlas('nonexistent'),/unknown owner environment atlas/);
 const bad={...manifest,objects:{wasteland_terrain:'https://thirdparty/tiles.png'}};
 assert.throws(()=>compileCampaignEnvironmentArt(bad,images),/invalid source atlas/);
 const wrong=new Map(images);wrong.set(path(atlasName),image(545,512));
 assert.throws(()=>compileCampaignEnvironmentArt(manifest,wrong),/non-native/);
 const huge=new Map(images);huge.set(path(atlasName),image(4096,4096));
 assert.throws(()=>compileCampaignEnvironmentArt(manifest,huge),/non-native/);
});
test('Compile native owner atlas crop rectangles with immutable source map and no collision changes',()=>{
 const {env}=art(),source=map('A00','A01','east','west'),before=JSON.stringify(source);
 const result=compileCampaignEnvironmentDetails(source,env);
 assert.equal(result.count,3);
 assert.equal(result.ground.length,1);
 assert.equal(result.background.length,1);
 assert.equal(result.foreground.length,1);
 assert.deepEqual([result.ground[0].sx,result.ground[0].sy,result.ground[0].sw,
  result.ground[0].sh,result.ground[0].x,result.ground[0].y],
 [0,64,32,32,96,160]);
 assert.equal(JSON.stringify(source),before);
 const c={calls:[],drawImage(...args){this.calls.push(args);},imageSmoothingEnabled:true};
 assert.equal(paintCampaignEnvironmentDetails(c,result,'ground'),1);
 assert.equal(c.calls.length,1);
 assert.equal(c.calls[0][0],env.atlas('wasteland_terrain'));
 assert.deepEqual(c.calls[0].slice(1),[0,64,32,32,96,160,32,32]);
 assert.equal(c.imageSmoothingEnabled,false);
});
test('Rejects unknown atlas, out-of-bounds crops and scenery obscuring story, routes or players',()=>{
 const {env}=art();
 const invalid=(overrides)=>{
  const m=map('A00','A01','east','west');
  m.environmentDetails[0]={...m.environmentDetails[0],...overrides};
  return m;
 };
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({atlas:'wrong'}),env),/unknown owner environment atlas/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({sx:544}),env),/atlas crop beyond/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({sw:13}),env),/invalid or duplicate/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({tx:8,sw:64}),env),/outside source map/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({id:'../bad'}),env),/invalid or duplicate/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({layer:'foreground',tx:3,ty:5}),env),/structural scenery masks walkable floor/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({layer:'background',tx:4,ty:4}),env),/obscures critical source position/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({layer:'background',tx:5,ty:3}),env),/obscures critical source position/);
 assert.throws(()=>compileCampaignEnvironmentDetails(invalid({layer:'background',tx:2,ty:2}),env),/obscures critical source position/);
 const duplicate=map('A00','A01','east','west');
 duplicate.environmentDetails[1].id='dry_grass';
 assert.throws(()=>compileCampaignEnvironmentDetails(duplicate,env),/invalid or duplicate/);
});
test('Opt-in source decorative layers are baked exactly once, without per-frame scenery generation',()=>{
 const {env}=art(),before=world(),stringified=JSON.stringify(before);
 const f=createCampaignMissionFactory(before,{environmentArt:env});
 const mission=f.missionForSync('A00');
 assert.equal(mission.environmentDetails.count,3);
 const calls=[],ctx={
  fills:0,
  drawImage(...args){calls.push(args);},fillRect(){this.fills++},set fillStyle(_){},
  imageSmoothingEnabled:true
 };
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const base=bakeMap(mission.buildMap(),mission);
  const baseFills=ctx.fills; // Baked floor edge shadows are expected.
  const over=bakeOver(mission.buildMap(),mission);
  assert.equal(base.width,288);
  assert.equal(over.height,288);
  const real=calls.filter(c=>c[0]===env.atlas('wasteland_terrain'));
  assert.equal(real.length,3);
  assert.equal(ctx.fills,baseFills,
    'No extra generic Ghost Signal overhead/industrial machinery should paint over owner wasteland');
  assert.deepEqual(real.map(c=>[c[1],c[2],c[5],c[6]]),
   [[0,64,96,160],[32,64,0,160],[64,64,256,192]]);
 }finally{globalThis.document=previous;}
 assert.equal(JSON.stringify(before),stringified);
 const normal=bakeOver;assert.equal(typeof normal,'function');
});
test('Old Ghost Signal missions and private maps without an authored detail list remain untouched',()=>{
 const {env}=art(),source=world();
 delete source.maps[0].environmentDetails;
 const f=createCampaignMissionFactory(source,{environmentArt:env});
 assert.equal(f.missionForSync('A00').environmentDetails.count,0);
 assert.equal(compileCampaignEnvironmentDetails({...source.maps[0],environmentDetails:[]},env).count,0);
});
