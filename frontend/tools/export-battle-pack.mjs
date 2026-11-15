import {createHash} from 'node:crypto';
import {createCanvas,ImageData} from '@napi-rs/canvas';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';
globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const {WORLD_VARIETIES}=await import('../public/studio/lib/world-varieties.js'),{renderRig}=await import('../public/studio/lib/machine-rig.js'),SS=await import('../public/studio/lib/sprite-sheet.js'),{fitMachineProject}=await import('../public/studio/lib/machine-bounds.js'),{battleMetadata}=await import('../public/studio/lib/battle-export.js');
const file=path.resolve(process.argv[2]||'Aeon_Circuit_Six_Unit_Battle_Animations_v1.zip'),files=[],summary=[];
for(const [name,build] of Object.entries(WORLD_VARIETIES)){
 const p=SS.machineProject(name,build());fitMachineProject(p);const s=p.sets.battle,role=p.rig.worldSpec.role;
 for(const dir of s.dirs)for(const a of s.anims)for(let i=0;i<a.frames;i++)renderRig(SS.cell(s,dir,a.name,i).getContext('2d'),p.rig,dir,a.type,i,a.frames,s.fw,s.fh);
 const {pages,meta}=SS.buildAtlasPages(s,{name,unit:p.rig.worldSpec,footprintTiles:p.tiles,designSize:{w:p.rig.w,h:p.rig.h},battle:battleMetadata(p.rig,s)});
 for(const f of meta.frames){const c=SS.cell(s,f.direction,f.animation,f.index);f.pixelSha256=createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');}
 for(const [i,page] of pages.entries())files.push({name:role+'/page-'+i+'.png',data:page.toBuffer('image/png')});
 files.push({name:role+'/metadata.json',data:new TextEncoder().encode(JSON.stringify(meta,null,2))},{name:role+'/recipe.json',data:new TextEncoder().encode(JSON.stringify(p.rig,null,2))});summary.push({role,frames:meta.frames.length,pages:pages.length,frameSize:[s.fw,s.fh],anchor:meta.anchor});
}
files.push({name:'README.txt',data:new TextEncoder().encode('Aeon Circuit creator battle animation candidates v1\nSix original procedural designs; seven authored action clips per role plus idle.\nFour cardinal views; 16 exposures per action including deliberate holds.\nUse metadata frame rectangles, durations, clip loop=false, anchor, socket points and event binding.\nEmission flashes are baked; do not spawn a duplicate flash from the same marker.\nProjectiles, targeting, hitboxes and damage are NOT implemented by this asset pack.\nDefeat ends down/powered off; recover starts at that same pose.\nAttack, charge, guard, hurt and malfunction return to neutral.\nNo gameplay or physical-phone validation claimed. Owner visual approval remains pending.\nRecipe JSON is rig source; run frontend/tools/export-battle-pack.mjs in the source repository to reproduce.\n')},{name:'inventory.json',data:new TextEncoder().encode(JSON.stringify(summary,null,2))});
const zip=SS.zipStore(files);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,new Uint8Array(await zip.arrayBuffer()));console.log(JSON.stringify({file,bytes:zip.size,units:summary},null,2));
