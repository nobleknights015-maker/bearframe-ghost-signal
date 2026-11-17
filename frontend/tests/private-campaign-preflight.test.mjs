import test from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdtemp,mkdir,writeFile,readFile,rm,unlink} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {preflightPrivateCampaign} from '../narrative-tools/preflight_private_campaign.mjs';

const ids=['sleeper_A','sleeper_B','sleeper_C','sleeper_D',
  ...Array.from({length:38},(_,i)=>'synthetic_'+i)];
const actions=['idle','attack','ranged','cast','guard','hit','down','victory','charge'];
const table=Array.from({length:256},(_,i)=>{
  let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
const crc=buffer=>{let c=0xffffffff;for(const v of buffer)c=table[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const chunk=(type,bytes)=>{
  const t=Buffer.from(type),header=Buffer.alloc(4),foot=Buffer.alloc(4);
  header.writeUInt32BE(bytes.length);foot.writeUInt32BE(crc(Buffer.concat([t,bytes])));
  return Buffer.concat([header,t,bytes,foot]);
};
const png=(w,h)=>{
  const raw=Buffer.alloc(h*(w*4+1)),head=Buffer.alloc(13);
  head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',head),
    chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
};
const animation=Object.fromEntries(actions.map((name,row)=>[
  name,{row,frames:1,durationsMs:[90],loop:name==='idle'}
]));
const map=()=>({id:'A00',name:'Synthetic QA sector',width:8,height:7,
  orientation:'orthogonal',tilewidth:32,tileheight:32,start:{x:80,y:112,dir:'right'},
  layers:[{type:'tilelayer',name:'collision',data:Array.from({length:56},(_,i)=>
    i<8||i>=48||i%8===0||i%8===7?1:0)},
    {type:'objectgroup',name:'portals',objects:[]}],entities:[],triggers:[]});
const world=()=>({schemaVersion:1,status:'authored-blockout-review-candidate',
  campaignRevision:2,layoutDigest:'synthetic-qa',startArea:'A00',
  openingScene:{sceneId:'SC_OPEN',trigger:'NEW_GAME'},maps:[map()],choiceGates:{}});
const story=()=>({schemaVersion:1,revision:2,flagSchema:{
  gameplay_flags:['seen'],exclusive_enums:{},relationships:{}},
  scenes:[{id:'SC_OPEN',trigger:'NEW_GAME',dialogue:[],sets:'seen'}],
  dialogue:[],choices:[],insertions:[],encounters:[]});
async function fixture(){
  const root=await mkdtemp(join(tmpdir(),'bearframe-preflight-'));
  await Promise.all(['assets/world','assets/battlers','portraits','story']
    .map(p=>mkdir(join(root,p),{recursive:true})));
  const worldImg=png(288,224),battleImg=png(384,576),portrait=png(96,96);
  const characters=ids.map(id=>({id,
    world:{src:'assets/world/'+id+'.png',frameWidth:32,frameHeight:56,
      columns:9,rows:4,directions:['down','left','right','up'],
      walkColumns:[1,2,3,4,5,6,7,8]},
    battle:{src:'assets/battlers/'+id+'.png',frameWidth:64,frameHeight:64,
      columns:6,rows:9,animations:animation}
  }));
  // Real Ghost Grid/Nullframe world atlases are not 32x56 Sleepers.
  // Validate their approved larger frame geometry rather than misreporting
  // every nonstarter as corrupt or missing.
  const enemy=characters.find(x=>x.id==='synthetic_0');
  enemy.world.frameWidth=48;enemy.world.frameHeight=64;
  for(const id of ids){
    await writeFile(join(root,'assets/world',id+'.png'),
      id==='synthetic_0'?png(432,256):worldImg);
    await writeFile(join(root,'assets/battlers',id+'.png'),battleImg);
  }
  for(const id of ids.slice(0,4))
    await writeFile(join(root,'portraits',id+'.png'),portrait);
  await writeFile(join(root,'asset-manifest.json'),JSON.stringify({schema:'aeon.asset-library.v4',characters}));
  await writeFile(join(root,'story/campaign.json'),JSON.stringify(story()));
  await writeFile(join(root,'story/opening-world-review-candidate.json'),JSON.stringify(world()));
  const edit=async(path,fn)=>{
    const full=join(root,path),data=JSON.parse(await readFile(full,'utf8'));
    fn(data);await writeFile(full,JSON.stringify(data));
  };
  return {root,edit,cleanup:()=>rm(root,{recursive:true,force:true})};
}
const has=(report,code)=>report.problems.some(p=>p.code===code);
test('Source-safe report approves complete synthetic art/scene contract without printing story',async()=>{
 const f=await fixture();
 try{
  const r=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(r.pass,true,JSON.stringify(r.problems));
  assert.deepEqual(r.problems,[]);
  assert.deepEqual(r.counts,{characters:42,portraits:4,areas:1,sourceAreas:0,reachableAreas:1,
    scenes:1,stagedScenes:1,encounters:0,combatEncounters:0,mandatoryBattles:0,quests:0,stagedQuests:0});
  assert.equal(JSON.stringify(r).includes('SC_OPEN'),false,'No private scene identifiers in report');
 }finally{await f.cleanup();}
});
test('Missing or corrupted images fail explicitly, never silently become placeholders',async()=>{
 const f=await fixture();
 try{
  await unlink(join(f.root,'assets/world/sleeper_A.png'));
  const file=join(f.root,'assets/battlers/sleeper_B.png');
  const bytes=await readFile(file);bytes[bytes.length-18]^=32;await writeFile(file,bytes);
  const r=await preflightPrivateCampaign({root:f.root});
  assert.equal(r.pass,false);
  assert.equal(has(r,'MISSING_V5_ATLASES'),true);
  assert.equal(has(r,'INVALID_V5_ATLASES'),true);
 }finally{await f.cleanup();}
});
test('Review profile allows later story scenes, release requires explicit stage triggers',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',s=>s.scenes.push({
    id:'SC_LATER',trigger:'OWNER_TRIGGER',dialogue:[],sets:''
  }));
  const preview=await preflightPrivateCampaign({root:f.root,profile:'review'});
  const production=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(preview.pass,true);
  assert.equal(production.pass,false);
  assert.equal(has(production,'UNSTAGED_STORY_SCENES'),true);
 }finally{await f.cleanup();}
});
test('Mandatory fights cannot count as release-ready without authored enemy staging',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',c=>c.encounters.push({id:'EN_SOURCE'}));
  await f.edit('story/opening-world-review-candidate.json',w=>{
    w.mandatoryCombats=[{sceneId:'SC_OPEN',encounterId:'EN_SOURCE',saveOutcomeRequired:'victory'}];
  });
  const r=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(r.pass,false);
  assert.equal(r.counts.mandatoryBattles,1);
  assert.equal(has(r,'REQUIRED_COMBAT_STAGING_NOT_INSTALLED'),true);
 }finally{await f.cleanup();}
});
test('Reviewed enemy, four starter combat rosters and authored battle art satisfy the gate',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',c=>c.encounters.push({id:'EN_SOURCE'}));
  await f.edit('story/opening-world-review-candidate.json',w=>{
    w.mandatoryCombats=[{sceneId:'SC_OPEN',encounterId:'EN_SOURCE',saveOutcomeRequired:'victory'}];
    w.combat={schemaVersion:1,campaignRevision:2,layoutDigest:w.layoutDigest,
      partyByStarter:Object.fromEntries(ids.slice(0,4).map(id=>[id,[{
        id:'sleeper',artId:id,lineage:'sleeper',name:'Synthetic Sleeper',
        hp:30,maxHp:30,ep:10,maxEp:10,attack:15,defense:4,speed:9
      }]])),
      encounters:[{id:'EN_SOURCE',mapId:'A00',enemies:[{
        id:'hostile',artId:'synthetic_0',name:'Synthetic Foe',
        hp:10,maxHp:10,attack:4,defense:1,speed:6
      }],rewards:{xp:9,items:{scrap:1}}}]};
  });
  const r=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(r.pass,true,JSON.stringify(r.problems));
  assert.equal(r.counts.combatEncounters,1);
  assert.equal(r.counts.mandatoryBattles,1);
 }finally{await f.cleanup();}
});

test('Unstaged future screenplay choices are deferred in review but block a final game',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',s=>{
    s.scenes.push({id:'SC_LATER',trigger:'OWNER_FUTURE',dialogue:[],sets:''});
    s.choices.push({id:'CHOICE_FUTURE',scene:'SC_LATER',prompt:'Synthetic later choice',
      options:{A:'synthetic'},selection_count:1});
  });
  const review=await preflightPrivateCampaign({root:f.root,profile:'review'});
  const release=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(has(review,'CHOICE_PRESENTATION_NOT_AUTHORED'),false);
  assert.equal(has(release,'CHOICE_PRESENTATION_NOT_AUTHORED'),true);
  assert.equal(has(release,'UNSTAGED_STORY_SCENES'),true);
 }finally{await f.cleanup();}
});

test('Release detects source-authored areas absent from a fully connected review blockout',async()=>{
 const f=await fixture();
 try{
   await f.edit('story/campaign.json',s=>{
     s.areas=[{id:'A00',name:'Synthetic start'},{id:'A01',name:'Unstaged source area'}];
   });
   const review=await preflightPrivateCampaign({root:f.root,profile:'review'});
   const release=await preflightPrivateCampaign({root:f.root,profile:'release'});
   assert.equal(review.pass,true,JSON.stringify(review.problems));
   assert.equal(release.pass,false);
   assert.equal(release.counts.sourceAreas,2);
   assert.equal(release.counts.areas,1);
   assert.equal(has(release,'UNSTAGED_SOURCE_AREAS'),true);
   assert.equal(release.problems.find(p=>p.code==='UNSTAGED_SOURCE_AREAS').count,1);
   await f.edit('story/campaign.json',s=>s.areas=[{id:'A01',name:'Only other area'}]);
   const bad=await preflightPrivateCampaign({root:f.root,profile:'review'});
   assert.equal(has(bad,'UNKNOWN_STAGED_SOURCE_AREAS'),true,
     'Even a review map cannot claim a location absent from the approved area source');
 }finally{await f.cleanup();}
});

test('Private review rejects reciprocal portal links that are blocked by static walls',async()=>{
  const f=await fixture();
  try{
    await f.edit('story/opening-world-review-candidate.json',spec=>{
      const original=spec.maps[0],other=structuredClone(original);
      other.id='A01';other.name='Second synthetic area';
      const first={id:1,name:'east',x:6*32,y:3*32,width:32,height:32,
        properties:{toMap:'A01',toPortal:'west',facing:'right'}};
      const back={id:1,name:'west',x:32,y:3*32,width:32,height:32,
        properties:{toMap:'A00',toPortal:'east',facing:'left'}};
      original.layers[1].objects=[first];
      other.layers[1].objects=[back];
      for(let y=1;y<original.height-1;y++)
        original.layers[0].data[y*original.width+4]=1;
      spec.maps.push(other);
    });
    const r=await preflightPrivateCampaign({root:f.root,profile:'review'});
    assert.equal(r.pass,false);
    assert.equal(r.counts.reachableAreas,2,
      'The topological graph is connected despite an impassable interior wall');
    assert.equal(has(r,'UNWALKABLE_PORTAL_APPROACHES'),true);
    assert.equal(r.problems.find(p=>p.code==='UNWALKABLE_PORTAL_APPROACHES').count,1);
    assert.equal(JSON.stringify(r).includes('east'),false,
      'Public QA category cannot leak owner-specific portal names');
  }finally{await f.cleanup();}
});

test('Release requires explicit source-backed quest stages and leaks no private quest names',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',s=>{
    s.flagSchema.gameplay_flags.push('quest_started','quest_done');
    s.quests=[
      {id:'quest_one',title:'Synthetic owner-only title',
        player_objective:'Synthetic owner-only objective',
        start_trigger:'quest_started',completion_flags:'quest_done'},
      {id:'quest_two',title:'Another owner-only title',
        player_objective:'Another owner-only objective',
        start_trigger:'ambiguous;source requirement',completion_flags:'quest_done'}
    ];
  });
  const review=await preflightPrivateCampaign({root:f.root,profile:'review'});
  assert.equal(review.pass,true,JSON.stringify(review.problems));
  assert.equal(review.counts.quests,2);
  assert.equal(review.counts.stagedQuests,1);
  const release=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(has(release,'UNSTAGED_SOURCE_QUESTS'),true);
  assert.equal(release.problems.find(p=>p.code==='UNSTAGED_SOURCE_QUESTS').count,1);
  assert.equal(JSON.stringify(release).includes('Synthetic owner-only title'),false);
  await f.edit('story/opening-world-review-candidate.json',w=>{
    w.questBindings=[{questId:'quest_two',startFlag:'quest_started',completeFlag:'quest_done'}];
  });
  const completed=await preflightPrivateCampaign({root:f.root,profile:'release'});
  assert.equal(completed.pass,true,JSON.stringify(completed.problems));
  assert.equal(completed.counts.stagedQuests,2);
 }finally{await f.cleanup();}
});

test('Malformed private quest flag references fail review rather than silently generating objectives',async()=>{
 const f=await fixture();
 try{
  await f.edit('story/campaign.json',s=>{
    s.quests=[{id:'quest_one',title:'Synthetic title',player_objective:'Synthetic objective',
      start_trigger:'unreviewed',completion_flags:'unreviewed'}];
  });
  await f.edit('story/opening-world-review-candidate.json',w=>{
    w.questBindings=[{questId:'quest_one',startFlag:'__proto__'}];
  });
  const review=await preflightPrivateCampaign({root:f.root,profile:'review'});
  assert.equal(review.pass,false);
  assert.equal(has(review,'INVALID_REVIEWED_QUEST_BINDINGS'),true);
 }finally{await f.cleanup();}
});
