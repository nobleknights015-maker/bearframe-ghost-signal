import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignWorld} from '../public/js/engine/campaign-world.js';

function world() {
  const width=8,height=8;
  const collision=Array.from({length:width*height},(_,i)=>{
    const x=i%width,y=Math.floor(i/width);
    return x===0||y===0||x===width-1||y===height-1?1:0;
  });
  return {schemaVersion:1,campaignRevision:1,startArea:'A00',maps:[{
    id:'A00',name:'test',width,height,orientation:'orthogonal',tilewidth:32,tileheight:32,
    start:{x:80,y:80,dir:'right'},
    layers:[{type:'tilelayer',name:'collision',data:collision},
      {type:'objectgroup',name:'portals',objects:[]}],
    entities:[{id:'terminal_one',type:'terminal',tx:2,ty:2,trigger:'TEST_TRIGGER'}]
  }]};
}
test('Private entity gate identifiers reject prototype pollution and malformed values',()=>{
  for(const field of ['requiresFlag','requiresNotFlag','hideAfterFlag']){
    for(const value of ['__proto__','constructor','bad flag',12,'']){
      const w=world();w.maps[0].entities[0][field]=value;
      assert.throws(()=>compileCampaignWorld(w),/invalid entity/,field+' '+String(value));
    }
  }
});
test('Contradictory entity prerequisites fail closed, while valid source flags remain supported',()=>{
  const w=world();w.maps[0].entities[0].requiresFlag='relay_active';
  w.maps[0].entities[0].requiresNotFlag='relay_active';
  assert.throws(()=>compileCampaignWorld(w),/contradictory entity gate/);
  w.maps[0].entities[0].requiresNotFlag='alarm_active';
  w.maps[0].entities[0].hideAfterFlag='terminal_used';
  assert.deepEqual(compileCampaignWorld(w).ids,['A00']);
});
