import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignWorld,auditCampaignGameplayReachability,
  createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';

function fixture(){
 const w=8,h=8;
 const wall=Array.from({length:w*h},(_,i)=>{
  const x=i%w,y=Math.floor(i/w);
  return x===0||x===w-1||y===0||y===h-1?1:0;
 });
 const make=(id,next,portal,back,x)=>{
  const m={id,name:'SYNTHETIC',width:w,height:h,orientation:'orthogonal',
   tilewidth:32,tileheight:32,start:{x:80,y:112,dir:'right'},
   layers:[{type:'tilelayer',name:'collision',data:wall.slice()},
    {type:'objectgroup',name:'portals',objects:[{
     name:portal,x:x*32,y:3*32,width:32,height:32,
     properties:{toMap:next,toPortal:back,facing:'right'}
    }]}],
   entities:[],triggers:[],props:[],lamps:[],drones:[]};
  return m;
 };
 const a=make('A00','A01','east','west',5),
  b=make('A01','A00','west','east',1);
 a.entities.push({id:'test_npc',type:'npc',tx:4,ty:4});
 a.triggers.push({id:'source_story',x:4*32,y:4*32,width:32,height:32,
  trigger:'SOURCE_SCENE'});
 return {schemaVersion:1,campaignRevision:2,startArea:'A00',maps:[a,b]};
}
const collisions=m=>m.layers.find(l=>l.name==='collision').data;
test('Exact authored portal, NPC and story trigger are reachable from source start',()=>{
 const spec=fixture(),before=JSON.stringify(spec),qa=auditCampaignGameplayReachability(spec);
 assert.deepEqual({areas:qa.areaCount,checks:qa.checks,blocked:qa.blockedCount},
  {areas:2,checks:4,blocked:0});
 assert.ok(qa.reachedWalkableCells>0);
 assert.equal(JSON.stringify(spec),before,'Navigation audit cannot rewrite source map or story');
});
test('A reciprocal graph is NOT a guarantee of a walkable area exit',()=>{
 const spec=fixture(),w=spec.maps[0].width;
 for(let y=1;y<7;y++)collisions(spec.maps[0])[y*w+3]=1;
 assert.doesNotThrow(()=>compileCampaignWorld(spec),'Legal route can still be physically unreachable');
 const qa=auditCampaignGameplayReachability(spec);
 assert.ok(qa.blocked.some(x=>x.mapId==='A00'&&x.kind==='portal'&&x.id==='east'));
});
test('A trapped source actor and story zone must fail independently',()=>{
 const spec=fixture(),col=collisions(spec.maps[0]),w=spec.maps[0].width;
 for(const [x,y] of [[4,3],[3,4],[5,4],[4,5]])col[y*w+x]=1;
 assert.doesNotThrow(()=>compileCampaignWorld(spec));
 const blocked=auditCampaignGameplayReachability(spec).blocked;
 assert.ok(blocked.some(x=>x.kind==='entity'&&x.id==='test_npc'));
 assert.ok(blocked.some(x=>x.kind==='trigger'&&x.id==='source_story'));
});
test('New private structural maps opt into fail-closed preflight without modifying original demo',()=>{
 const approved=fixture();
 approved.requiresNavigationQA=true;
 assert.doesNotThrow(()=>createCampaignMissionFactory(approved));
 const sealed=fixture();
 for(let y=1;y<7;y++)collisions(sealed.maps[0])[y*8+3]=1;
 sealed.requiresNavigationQA=true;
 assert.throws(()=>createCampaignMissionFactory(sealed),/inaccessible authored gameplay position/);
 // Old revision imports still load the original behavior when not opting in.
 sealed.requiresNavigationQA=false;
 assert.doesNotThrow(()=>createCampaignMissionFactory(sealed));
});
test('Approach from an adjacent tile is valid for a solid-style authored entity',()=>{
 const spec=fixture();
 // Asset art may cover the NPC tile but the original Game.target() can reach
 // its bounding box from immediately next to it.
 spec.maps[0].entities[0].tx=4;spec.maps[0].entities[0].ty=4;
 const col=collisions(spec.maps[0]);
 col[4*8+3]=1;col[3*8+4]=1;col[4*8+5]=1;
 assert.equal(auditCampaignGameplayReachability(spec).blockedCount,0,
   'A reachable tile next to the scene entity is enough for interaction');
});
