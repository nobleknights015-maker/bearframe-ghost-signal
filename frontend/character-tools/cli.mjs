#!/usr/bin/env node
// Development CLI. Never auto-registers canonical characters or publishes private art.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 generateCharacter,generateOverworldAnimations,generateBattleAnimations,
 importApprovedSpriteSheet,exportCharacter,validateCharacter,registerCharacter,OUTPUT_ROOT
} from './character-api.mjs';
const [operation,input,extra]=process.argv.slice(2);
const options={outputRoot:process.env.BF_CHARACTER_OUTPUT?path.resolve(process.env.BF_CHARACTER_OUTPUT):OUTPUT_ROOT};
const usage='Usage: node cli.mjs generate path/to/request.json | world id | battle id | export id | validate id | register id --development | register id path/to/review.json | import path/to/metadata.json path/to/sheet.png';
try{
 let result;
 if(operation==='generate'){
   if(!input)throw Error(usage);
   const spec=JSON.parse(await readFile(path.resolve(input),'utf8'));
   await generateCharacter(spec,options);
   const world=await generateOverworldAnimations(spec.id,options);
   const battle=await generateBattleAnimations(spec.id,options);
   const exported=await exportCharacter(spec.id,options);
   result={id:spec.id,world,battle,manifest:exported,location:path.join(options.outputRoot,spec.id)};
 }else if(operation==='world')result=await generateOverworldAnimations(input,options);
 else if(operation==='battle')result=await generateBattleAnimations(input,options);
 else if(operation==='export')result=await exportCharacter(input,options);
 else if(operation==='validate')result=await validateCharacter(input,options);
 else if(operation==='import')result=await importApprovedSpriteSheet(extra,JSON.parse(await readFile(path.resolve(input),'utf8')),options);
 else if(operation==='register')result=await registerCharacter(input,{...options,
    development:extra==='--development',reviewFile:extra==='--development'?null:extra});
 else throw Error(usage);
 console.log(JSON.stringify({ok:true,result},null,2));
 if(operation==='validate'&&!result.ok)process.exitCode=1;
}catch(e){console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;}
