import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignEntityAvailable, createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';

function authoredWorld(){
  const width=8,height=8;
  const collision=Array.from({length:width*height},(_,i)=>{
    const x=i%width,y=Math.floor(i/width);
    return x===0||y===0||x===width-1||y===height-1?1:0;
  });
  return {schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
    id:'A00',name:'TEST',width,height,orientation:'orthogonal',
    tilewidth:32,tileheight:32,start:{x:80,y:80,dir:'right'},
    layers:[{type:'tilelayer',name:'collision',data:collision},
      {type:'objectgroup',name:'portals',objects:[]}],
    entities:[{id:'secured_console',type:'terminal',tx:2,ty:2,
      trigger:'SOURCE_CONSOLE',requiresFlag:'relay_active',
      requiresNotFlag:'lockdown_active',hideAfterFlag:'console_used'}],
    triggers:[]
  }]};
}

test('An entity requires its positive flag, absence of negative flag, and unused state',()=>{
  const entity=authoredWorld().maps[0].entities[0];
  const flags={relay_active:false,lockdown_active:false,console_used:false};
  assert.equal(campaignEntityAvailable(entity,flags),false);
  flags.relay_active=true;
  assert.equal(campaignEntityAvailable(entity,flags),true);
  flags.lockdown_active=true;
  assert.equal(campaignEntityAvailable(entity,flags),false);
  flags.lockdown_active=false;
  flags.console_used=true;
  assert.equal(campaignEntityAvailable(entity,flags),false);
  assert.equal(campaignEntityAvailable(null,flags),false);
  assert.equal(campaignEntityAvailable(entity,null),false);
  assert.deepEqual(flags,{relay_active:true,lockdown_active:false,console_used:true},
    'Pure authorization must not mutate durable story flags');
});

test('Campaign mission door gate evaluates current flags, not a stale snapshot',()=>{
  const state={flags:{}};
  const factory=createCampaignMissionFactory(authoredWorld(),{getWorld:()=>state});
  const mission=factory.missionForSync('A00');
  const entity=mission.entities()[0];
  assert.equal(mission.doorOpen(entity.id),false);
  state.flags.relay_active=true;
  assert.equal(mission.doorOpen(entity.id),true);
  state.flags.lockdown_active=true;
  assert.equal(mission.doorOpen(entity.id),false,
    'Negative milestone must lock the console even when positive prerequisite remains met');
  state.flags.lockdown_active=false;
  assert.equal(mission.doorOpen(entity.id),true);
  state.flags.console_used=true;
  assert.equal(mission.doorOpen(entity.id),false);
  assert.equal(mission.label(entity),null,'Used entity must not display a stale interaction label');
  const g={ents:[{...entity,gone:false}]};
  mission.migrate(g);
  assert.equal(g.ents[0].gone,true);
  assert.equal(mission.doorOpen('unknown_entity'),true,
    'Unknown IDs retain the original mission adapter compatibility behavior');
});
