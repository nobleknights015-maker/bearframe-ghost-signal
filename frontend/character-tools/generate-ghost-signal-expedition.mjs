// Bake DRAFT Ghost Signal NPCs using the UPGRADED Sprite Studio renderer.
// The immutable Wraith/vault resident art and owner-reviewed character sheets are never replaced.
// Source: sprite-studio-sleek-copy, including android-chassis, catalog, wardrobe and native frame rendering.
import {generateCharacter,generateOverworldAnimations,generateBattleAnimations,exportCharacter,validateCharacter}
  from './character-api.mjs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const frontend=resolve(here,'..');
const outputRoot=resolve(frontend,'character-output/ghost-signal-expedition');
const gameAssets=resolve(frontend,'public/assets/characters');
const BLUEPRINT=[
  {
    entity:'mira', id:'gs_mira_exp_draft',
    // This is the upgraded generator's EXISTING Mira reference preset.
    catalogPreset:'Mira', faction:'exploration',
    description:'Mira preset — generated review draft, not canon-art signoff'
  },
  {
    entity:'nova', id:'gs_nova_exp_draft',preset:'Exploration Surveyor',faction:'exploration',
    appearance:{head:'mono',scarf:'wrap',headgear:'goggles',backpack:true,pouches:true,damage:0},
    colors:{armor:'#c3d0d0',trim:'#344b56',under:'#172027',glow:'#79dce1',
      cloak:'#3a5b68',leather:'#656258'},
    description:'Provisional cartographer draft — user review required'
  },
  {
    entity:'kai', id:'gs_kai_exp_draft',preset:'Exploration Surveyor',faction:'exploration',
    appearance:{head:'band',scarf:'none',headgear:'none',backpack:true,pouches:true,damage:1},
    colors:{armor:'#bfc9b7',trim:'#45594b',under:'#202a24',glow:'#8be9c0',
      cloak:'#55705d',leather:'#5c4a38'},
    description:'Provisional field researcher draft — user review required'
  },
  {
    entity:'survivor', id:'gs_survivor_exp_draft',preset:'Exploration Surveyor',faction:'exploration',
    appearance:{head:'mono',scarf:'wrap',headgear:'goggles',backpack:true,damage:2,clothWear:1},
    colors:{armor:'#b9b6a9',trim:'#515450',under:'#252726',glow:'#87cbb9',
      cloak:'#4d655d',leather:'#685642'},
    description:'Provisional recovered surveyor draft — user review required'
  },
];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(outputRoot,{recursive:true});
await mkdir(gameAssets,{recursive:true});
const manifest={
 schema:'ghost-signal.generator-draft.v1',generator:'upgraded-sprite-studio-sleek-copy',
 sourceBranch:'sprite-studio-sleek-copy',
 status:'unreviewed-drafts-not-canonical-visual-approvals',
 directions:['down','up','right','left'],frameSize:[32,56],
 columns:12,rows:4,layout:{walk:[0,6],idle:[6,4],scan:[10,2]},assets:[]
};
for (const bp of BLUEPRINT) {
  const spec={
   id:bp.id,kind:'humanoid',faction:bp.faction,body:'modern-bearframe-field',
   storyStatus:'provisional-surface-chapters-art-review',
   ...(bp.catalogPreset?{catalogPreset:bp.catalogPreset}:{preset:bp.preset}),
   ...(bp.appearance?{appearance:bp.appearance}:{}),
   ...(bp.colors?{colors:bp.colors}:{}),
   frameSizes:{world:{width:32,height:56},battle:{width:64,height:64}},
   collisionTiles:[1,1],variation:false,
  };
  const dir=join(outputRoot,bp.id);
  if(existsSync(dir))throw Error('Refusing to overwrite existing Studio project: '+bp.id);
  await generateCharacter(spec,{outputRoot});
  const world=await generateOverworldAnimations(bp.id,{outputRoot});
  await generateBattleAnimations(bp.id,{outputRoot});
  await exportCharacter(bp.id,{outputRoot});
  const qa=await validateCharacter(bp.id,{outputRoot});
  if(!qa.ok)throw Error('Advanced generator validation failed: '+bp.id+' '+qa.problems.join('; '));
  if(world.frameWidth!==32||world.frameHeight!==56||world.columns!==16||
      world.rows.join()!=='down,up,right,left')
    throw Error('Unexpected native upgraded Studio atlas layout: '+bp.id);
  const image=await loadImage(await readFile(join(dir,'world.png')));
  const canvas=createCanvas(32*12,56*4),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const selections=[
   ...Array.from({length:6},(_,i)=>world.animations.walk.start+i),
   ...Array.from({length:4},(_,i)=>world.animations.idle.start+i),
   ...Array.from({length:2},(_,i)=>world.animations.scan.start+i),
  ];
  for (let row=0;row<4;row++)for(let col=0;col<selections.length;col++)
    ctx.drawImage(image,selections[col]*32,row*56,32,56,col*32,row*56,32,56);
  const bytes=canvas.toBuffer('image/png');
  const file=bp.id+'.png';
  await writeFile(join(gameAssets,file),bytes);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let visible=0;for(let i=3;i<data.length;i+=4)if(data[i])visible++;
  if(visible<350)throw Error('Empty upgraded sheet: '+bp.id);
  manifest.assets.push({
   entity:bp.entity,id:bp.id,src:'assets/characters/'+file,
   pngSha256:sha256(bytes),nontransparentPixels:visible,
   nativeWorld:{columns:world.columns,rows:world.rows,animations:world.animations},
   fullReviewProject:'character-output/ghost-signal-expedition/'+bp.id,
   status:'draft-for-owner-visual-review',notes:bp.description
  });
  console.log(bp.entity+': '+file+' ['+bytes.length+' bytes, '+visible+' visible pixels]');
}
await writeFile(join(gameAssets,'ghost-signal-expedition.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Baked '+manifest.assets.length+' upgraded Studio NPC drafts for Ghost Signal M03/M04.');
