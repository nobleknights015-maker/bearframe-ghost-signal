import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignWorld,createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';
import {compileCampaignDoorways} from '../public/js/engine/campaign-doorways.js';

function fixture(){
 const one=(id,next,name,returnName,kind,gate)=>{
  const w=8,h=8;
  return {id,name:'SYNTHETIC',orientation:'orthogonal',tilewidth:32,tileheight:32,
   width:w,height:h,start:{x:80,y:80,dir:'right'},
   layers:[{type:'tilelayer',name:'collision',data:Array.from({length:w*h},(_,i)=>{
    const x=i%w,y=Math.floor(i/w);return x===0||y===0||x===w-1||y===h-1?1:0;
   })},{type:'objectgroup',name:'portals',objects:[{
    name,x:(id==='A00'?5:2)*32,y:96,width:32,height:32,
    properties:{toMap:next,toPortal:returnName,facing:'right',
     portalStyle:kind,...(gate?{requiresFlag:'relay_fixed'}:{})}
   }]}],entities:[],triggers:[],props:[],lamps:[],drones:[]};
 };
 return {schemaVersion:1,campaignRevision:2,startArea:'A00',
  maps:[one('A00','A01','east','west','bulkhead',true),
        one('A01','A00','west','east','hatch',false)]};
}
test('Authenticated source links compile to actual original 32px entity art, not a floor glyph',()=>{
 const c=compileCampaignDoorways(compileCampaignWorld(fixture()));
 const doors=c.forArea('A00'),back=c.forArea('A01');
 assert.equal(doors.length,1);assert.equal(back.length,1);
 assert.deepEqual({type:doors[0].type,tx:doors[0].tx,ty:doors[0].ty,
   portalId:doors[0].portalId,interact:doors[0].interact,solid:doors[0].solid},
  {type:'bulkhead',tx:5,ty:3,portalId:'east',interact:true,solid:false});
 assert.equal(back[0].type,'hatch');
 assert.equal(c.label(doors[0],{}),'SEALED BULKHEAD');
 assert.equal(c.label(doors[0],{relay_fixed:true}),'OPEN BULKHEAD');
 assert.equal(c.label(back[0],{}),'OPEN HATCH');
 assert.equal(c.forArea('unknown').length,0);
});
test('Doorway visuals are opt-in for three original engine-supported physical portal types',()=>{
 const c=fixture();
 c.maps[0].layers[1].objects[0].properties.portalStyle='exit';
 const chooser=compileCampaignDoorways(compileCampaignWorld(c));
 assert.equal(chooser.forArea('A00')[0].type,'exit');
 const invalid=fixture();
 invalid.maps[0].layers[1].objects[0].properties.portalStyle='teleport_tile';
 assert.throws(()=>compileCampaignDoorways(compileCampaignWorld(invalid)),/style/);
 const old=fixture();
 delete old.maps[0].layers[1].objects[0].properties.portalStyle;
 assert.equal(compileCampaignDoorways(compileCampaignWorld(old)).forArea('A00')[0].type,
  'bulkhead','Unreviewed old passages use an industrial door, not invented final art');
});
test('Standing on portal tile never teleports; interacting with door does',()=>{
 const source=fixture(),calls=[],flags={};
 const f=createCampaignMissionFactory(source,{getWorld:()=>({flags}),
  onPortal:(id,g)=>calls.push({id,map:g.m?.id})});
 const m=f.missionForSync('A00'),entity=m.entities()[0];
 const g={mode:'play',m:{id:'A00'},ents:m.entities(),player:{x:176,y:112,hidden:null}};
 m.update(g,1/60);m.update(g,1/60);
 assert.equal(calls.length,0);
 assert.equal(m.label(entity),'SEALED BULKHEAD');
 m.interact(g.ents[0],g);
 assert.deepEqual(calls,[{id:'east',map:'A00'}],
   'Only a deliberate interact action can request a source route');
 flags.relay_fixed=true;
 assert.equal(m.label(entity),'OPEN BULKHEAD');
 m.update(g,1/60);
 assert.equal(calls.length,1);
 m.interact(g.ents[0],g);
 assert.equal(calls.length,2);
 assert.deepEqual(source,fixture(),'Pure door creation does not touch approved private maps');
});
test('Reject generated doorway ID collisions with real source entities',()=>{
 const c=fixture();
 c.maps[0].entities.push({id:'campaign_door_east',type:'terminal',tx:4,ty:3});
 assert.throws(()=>createCampaignMissionFactory(c),/collides with a source entity/);
});
test('Physical doorway is still present on both sides of a reciprocal gate',()=>{
 const source=fixture(),f=createCampaignMissionFactory(source);
 const a=f.missionForSync('A00').entities(),b=f.missionForSync('A01').entities();
 assert.equal(a[0].portalId,'east');
 assert.equal(b[0].portalId,'west');
 assert.equal(f.destination('A00','east').mapId,'A01');
 assert.equal(f.destination('A01','west').mapId,'A00');
});
