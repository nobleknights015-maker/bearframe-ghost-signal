import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnectedLabMission} from '../public/js/engine/connected-lab-mission.js';

const map={id:'annex',width:8,height:6,layers:[
 {name:'collision',type:'tilelayer',data:Array(48).fill(0)},
 {name:'portals',type:'objectgroup',objects:[]}
]};
test('annex archive is repeatable, separately identified and responds through normal interaction',()=>{
 const calls=[];
 const mission=createConnectedLabMission(map,{getWorld:()=>({flags:{'power-switch':true}}),
   onInteract:(entity)=>calls.push(entity.id)});
 const archive=mission.entities().find(e=>e.id==='field-archive');
 assert.ok(archive);
 assert.equal(archive.type,'terminal');
 assert.equal(archive.interact,true);
 assert.equal(mission.label(archive,{}),'READ EXPEDITION ARCHIVE');
 mission.interact(archive,{});
 mission.interact(archive,{});
 assert.deepEqual(calls,['field-archive','field-archive']);
 assert.equal(archive.gone,undefined);
});
