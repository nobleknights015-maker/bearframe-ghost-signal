import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignWorld,createCampaignMissionFactory,auditCampaignPortalApproaches} from '../public/js/engine/campaign-world.js';
const collision=(w,h)=>Array.from({length:w*h},(_,i)=>{const x=i%w,y=Math.floor(i/w);return x===0||x===w-1||y===0||y===h-1?1:0;});
function map(id,other,p,reverse,px=6,py=3){
  const w=10,h=8;
  return {id,name:'TEST-'+id,orientation:'orthogonal',tilewidth:32,tileheight:32,width:w,height:h,
   start:{x:80,y:112,dir:'right'},layers:[{type:'tilelayer',name:'collision',data:collision(w,h)},
   {type:'objectgroup',name:'portals',objects:[{id:1,name:p,x:px*32,y:py*32,width:32,height:32,properties:{toMap:other,toPortal:reverse,facing:'right'}}]}],
   entities:[{id:'archived_machine',type:'terminal',tx:3,ty:3,trigger:'TEST_MACHINE',hideAfterFlag:'machine_read'}],
   triggers:[{id:'scan_range',x:4*32,y:3*32,width:32,height:32,trigger:'SCAN_MARK',sceneId:'SC-999',requiresFlag:'machine_read'}],
   props:[],lamps:[],drones:[],objective:'Test map',objectives:[{text:'Read machine',doneFlag:'machine_read'}]
  };
}
const maps=()=>[map('A00','A01','east','west',8,3),map('A01','A00','west','east',1,3)];
const content=()=>({schemaVersion:1,campaignRevision:2,startArea:'A00',maps:maps()});
test('Uppercase authoritative area IDs, reciprocal transitions, and native 32px scene triggers',()=>{
 const graph=compileCampaignWorld(content());
 assert.deepEqual(graph.ids,['A00','A01']);
 assert.equal(graph.destination('A00','east').mapId,'A01');
 assert.equal(graph.destination('A00','east').x,48);
 assert.equal(graph.destination('A00','east').y,112);
 assert.deepEqual(graph.startLocation,{mapId:'A00',x:80,y:112,facing:'right'});
});
test('Binds exact triggers and private field entities without auto-completing scenes',()=>{
 const calls=[],state={flags:{}};
 const w=createCampaignMissionFactory(content(),{
  getWorld:()=>state,onEnter:m=>calls.push(['enter',m.id]),
  onPortal:(id)=>{if(id)calls.push(['portal',id]);},
  onTrigger:t=>calls.push(['trigger',t.sceneId,t.trigger]),
  onInteract:e=>calls.push(['interact',e.id])
 });
 const m=w.missionForSync('A00'),world=m.buildMap();
 assert.equal(world.w,10);assert.equal(world.h,8);
 assert.equal(world.grid[3*10+4],2);
 assert.equal(world.grid[0],0);
 assert.equal(m.entities().length,2,'Map source object plus physical portal doorway');
 assert.equal(m.entities()[1].type,'bulkhead');
 assert.equal(m.entities()[1].portalId,'east');
 assert.equal(m.label(m.entities()[0]),'ARCHIVED MACHINE');
 const g={mode:'play',player:{x:80,y:112,hidden:null},ents:m.entities()};
 m.onStart(g);
 m.update(g,.016);
 assert.deepEqual(calls,[['enter','A00']]);
 g.player.x=144;m.update(g,.016);
 assert.equal(calls.some(x=>x[0]==='trigger'),false,'trigger must honor private required flag');
 state.flags.machine_read=true;
 g.player.x=112;m.update(g,.016);
 g.player.x=144;m.update(g,.016);
 m.update(g,.016);
 assert.equal(calls.filter(x=>x[0]==='trigger').length,1,'entry trigger is edge-driven, not fired every frame');
 g.player.x=272;m.update(g,.016);m.update(g,.016);
 assert.equal(calls.filter(x=>x[0]==='portal').length,0,
   'Stepping on a doorway tile must NEVER auto-transfer maps');
 assert.equal(m.label(m.entities()[1]),'OPEN BULKHEAD');
 m.interact(g.ents[1],g);
 assert.deepEqual(calls.filter(x=>x[0]==='portal'),[['portal','east']],
   'The physical doorway must respond to intentional interaction only');
 g.ents[0].gone=false;m.migrate(g);assert.equal(g.ents[0].gone,true);
});
test('Authored encounter-only area triggers do not require a synthetic story scene',()=>{
  const c=content();
  c.maps[0].triggers.push({id:'encounter_zone',x:5*32,y:3*32,width:32,height:32,
    trigger:'SOURCE_HOSTILE_START'});
  const calls=[];
  const graph=compileCampaignWorld(c);
  assert.ok(graph.get('A00').triggers.some(t=>t.id==='encounter_zone'));
  const adapter=createCampaignMissionFactory(c,{onTrigger:t=>calls.push([t.trigger,t.sceneId])});
  const mission=adapter.missionForSync('A00');
  const g={mode:'play',player:{x:176,y:112,hidden:null},ents:[]};
  mission.update(g,.016);
  assert.deepEqual(calls,[['SOURCE_HOSTILE_START',undefined]]);
  const invalid=content();
  invalid.maps[0].triggers.push({id:'bad_zone',x:5*32,y:3*32,width:32,height:32,
    trigger:'SOURCE_HOSTILE_START',sceneId:'__proto__'});
  assert.throws(()=>compileCampaignWorld(invalid),/invalid trigger/);
});
test('Rejects duplicate areas, nonreciprocal portals, unsafe collision, and overlapping portal tiles',()=>{
 const invalid=content();invalid.maps[1].id='A00';
 assert.throws(()=>compileCampaignWorld(invalid),/duplicate\/invalid area id/);
 const noReturn=content();noReturn.maps[1].layers[1].objects[0].properties.toMap='A02';
 assert.throws(()=>compileCampaignWorld(noReturn),/nonreciprocal/);
 const blocked=content();blocked.maps[1].layers[0].data[3*10+1]=1;
 assert.throws(()=>compileCampaignWorld(blocked),/invalid portal/);
 const overlap=content();overlap.maps[0].layers[1].objects.push({...overlap.maps[0].layers[1].objects[0],name:'east2'});
 assert.throws(()=>compileCampaignWorld(overlap),/overlapping portals/);
});
test('Gate metadata stays fail-closed and private world flags are not mutated',()=>{
 const c=content();c.maps[0].layers[1].objects[0].properties.requiresFlag='power_restored';
 const graph=compileCampaignWorld(c);
 assert.equal(graph.destination('A00','east').requiresFlag,'power_restored');
 assert.equal(graph.destination('A01','west').requiresFlag,undefined);
 const door=createCampaignMissionFactory(c,{getWorld:()=>({flags:{power_restored:false}})})
   .missionForSync('A00').entities()[1];
 assert.equal(door.requiresFlag,'power_restored');
 assert.equal(door.type,'bulkhead');
 assert.equal(createCampaignMissionFactory(c,{getWorld:()=>({flags:{power_restored:false}})})
   .missionForSync('A00').label(door),'SEALED BULKHEAD');
 const prior={flags:{power_restored:false}};
 const mission=createCampaignMissionFactory(c,{getWorld:()=>prior});
 const status=mission.missionForSync('A00').objectives();
 assert.equal(status[0].done,false);
 assert.deepEqual(prior,{flags:{power_restored:false}});
});
test('Portal QA catches a valid reciprocal doorway isolated behind interior collision',()=>{
  const good=content(),clean=auditCampaignPortalApproaches(good);
  assert.equal(clean.areaCount,2);
  assert.equal(clean.portalCount,2);
  assert.equal(clean.inaccessiblePortals,0);
  const sealed=content(),col=sealed.maps[0].layers[0].data;
  for(let y=1;y<sealed.maps[0].height-1;y++)col[y*10+5]=1;
  assert.doesNotThrow(()=>compileCampaignWorld(sealed),
    'Portal tile and topology remain valid, but walking route is blocked');
  const qa=auditCampaignPortalApproaches(sealed);
  assert.equal(qa.inaccessiblePortals,1);
  assert.equal(qa.accessiblePortals,1);
  assert.deepEqual(qa.blockedPortals,[{areaId:'A00',portalId:'east'}]);
  assert.equal(auditCampaignPortalApproaches(good).inaccessiblePortals,0,
    'Pure audit never mutates original collision or routes');
});

test('A 29-area synthetic world has reciprocal, physically accessible routes',()=>{
  const count=29,ids=Array.from({length:count},(_,i)=>'A'+String(i).padStart(2,'0'));
  const areas=ids.map((id,i)=>{
    const w=10,h=8,portals=[];
    if(i>0)portals.push({id:1,name:'west',x:32,y:96,width:32,height:32,
      properties:{toMap:ids[i-1],toPortal:'east',facing:'left'}});
    if(i<count-1)portals.push({id:2,name:'east',x:256,y:96,width:32,height:32,
      properties:{toMap:ids[i+1],toPortal:'west',facing:'right'}});
    return {id,name:'SYNTHETIC '+id,orientation:'orthogonal',
      tilewidth:32,tileheight:32,width:w,height:h,
      start:{x:80,y:112,dir:'right'},
      layers:[{type:'tilelayer',name:'collision',data:collision(w,h)},
        {type:'objectgroup',name:'portals',objects:portals}],
      entities:[],triggers:[],props:[],lamps:[],drones:[]};
  });
  const spec={schemaVersion:1,campaignRevision:2,startArea:ids[0],maps:areas};
  const checker=auditCampaignPortalApproaches(spec);
  assert.deepEqual({areas:checker.areaCount,links:checker.portalCount,
    walkable:checker.accessiblePortals,unreachable:checker.inaccessiblePortals},
    {areas:29,links:56,walkable:56,unreachable:0});
  const graph=compileCampaignWorld(spec);
  let current=ids[0];
  for(let i=1;i<count;i++){
    const next=graph.destination(current,'east');
    assert.equal(next.mapId,ids[i]);
    current=next.mapId;
  }
  assert.equal(current,ids.at(-1));
});
