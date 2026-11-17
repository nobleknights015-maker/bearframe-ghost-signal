// Bearframe character-production API. Calls the EXISTING Sprite Studio renderers.
// No character redesigns, browser UI automation, save-format migrations, or gameplay mutation.
import {createCanvas, loadImage, Image, ImageData} from '@napi-rs/canvas';
import {readFile, writeFile, mkdir, copyFile, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const toolsDir=path.dirname(fileURLToPath(import.meta.url));
const frontend=path.resolve(toolsDir,'..');
const source=path.resolve(process.env.BF_STUDIO_LIB || path.join(frontend,'public/studio/lib'));
const load=name=>import(pathToFileURL(path.join(source,name)).href);
const [{drawAndroid,poseFor,DEFAULT_CFG,PRESETS,DIRS},{renderRig},{MACHINE_PRESETS},SS]=
  await Promise.all([load('sprite-rig.js'),load('machine-rig.js'),
    load('machine-presets.js'),load('sprite-sheet.js')]);
if(!globalThis.document)globalThis.document={createElement(tag){
  if(tag!=='canvas')throw Error('Native generator requested unsupported DOM node '+tag);
  return createCanvas(1,1);
}};
if(!globalThis.Image)globalThis.Image=Image;
if(!globalThis.ImageData)globalThis.ImageData=ImageData;
export const OUTPUT_ROOT=path.join(frontend,'character-output');
export const WORLD_DIRECTIONS=Object.freeze(['down','up','right','left']);
export const BATTLE_ROWS=Object.freeze(['idle','attack','ranged','cast','guard','hit','down','victory','charge']);
export const BATTLE_FRAMES=Object.freeze({idle:4,attack:6,ranged:6,cast:6,guard:3,hit:3,down:6,victory:4,charge:4});
export const SOURCE_ACTION=Object.freeze({
  idle:'idle',attack:'attack',ranged:'scan',cast:'scan',guard:'crouch',
  hit:'hurt',down:'defeat',victory:'idle',charge:'charge'
});
const WORLD_ACTIONS=Object.freeze([
  {name:'idle',frames:4,fps:6},
  {name:'walk',frames:6,fps:10},
  {name:'scan',frames:2,fps:6},
  {name:'malfunction',frames:4,fps:8}
]);
const idOk=id=>typeof id==='string'&&/^[a-z][A-Za-z0-9_-]{2,63}$/.test(id);
const reserved=id=>/^sleeper_[ABCD]$/.test(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const filepath=(id,root=OUTPUT_ROOT)=>path.join(root,id);
const states=new Map();
const asInt=(value,defaultValue,min,max)=>value===undefined?defaultValue:
  Number.isInteger(value)&&value>=min&&value<=max?value:(()=>{throw Error('Invalid dimension or count')})();
function checkSpec(spec) {
  if(!spec||typeof spec!=='object'||Array.isArray(spec)||!idOk(spec.id))throw Error('Invalid character id/spec');
  if(reserved(spec.id))throw Error('Approved Sleeper starter '+spec.id+' must use importApprovedSpriteSheet; procedural redraw forbidden');
  const kind=spec.kind||'humanoid';
  if(!['humanoid','machine'].includes(kind))throw Error('Kind must be humanoid or machine');
  if(typeof spec.faction!=='string'||!spec.faction||spec.faction.length>64)throw Error('Faction required');
  if(spec.battleSide!==undefined&&!['party','enemy'].includes(spec.battleSide))throw Error('battleSide must be party or enemy');
  if(spec.appearanceReference||spec.approvedSourceSheet)throw Error('A reference cannot be auto-traced. Import its approved native sprite sheet explicitly; never substitute a generated preset for an established character.');
  if(spec.seed!==undefined&&(!Number.isSafeInteger(spec.seed)||spec.seed<0))throw Error('Seed must be nonnegative safe integer');
  return kind;
}
function deterministicGlow(color,seed) {
  if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('Invalid glow palette');
  let h=(seed^0x9e3779b9)>>>0;h=Math.imul(h^(h>>>16),0x85ebca6b);
  const vals=[1,3,5].map((n,j)=>Math.min(255,Math.max(0,parseInt(color.slice(n,n+2),16)+((h>>>(j*5))&15)-7)));
  return '#'+vals.map(v=>v.toString(16).padStart(2,'0')).join('');
}
function matchingPreset(preset,available) {
  if(!preset)return null;
  if(!Object.hasOwn(available,preset))throw Error('Unknown Studio preset '+preset);
  return available[preset];
}
function chooseMachinePreset(spec) {
  const preset=matchingPreset(spec.preset,MACHINE_PRESETS);
  if(preset)return preset();
  const labels={
    heavy:'Heavy Sentinel (humanoid titan)',hexapod:'Hexapod Cartography Engine',
    drone:'Micro-drone (flyer)',floater:'Archive Sentinel (floating boss)',
    boss:'Archive Sentinel (floating boss)',custom:'Custom machine (blank rig)'
  };
  const label=labels[spec.body]||null;
  if(!label)throw Error('Unsupported machine body '+String(spec.body)+': supply an authored rig or a Studio machine preset (quadrupeds require a suitable rig)');
  return MACHINE_PRESETS[label]();
}
function newState(spec,kind,root) {
  let project,warnings=[];
  if(kind==='humanoid'){
    const original=clone(matchingPreset(spec.preset,PRESETS)||DEFAULT_CFG);
    const cfg={...original,...clone(spec.appearance||{}),...clone(spec.accessories||{}),
      colors:{...clone(original.colors),...clone(spec.colors||{})}};
    if(spec.damage!==undefined)cfg.damage=asInt(spec.damage,0,0,3);
    if(spec.wear!==undefined&&!Object.hasOwn(cfg,'clothWear'))warnings.push('Wear setting recorded; baseline Studio does not render clothWear');
    if(spec.overgrowth!==undefined&&!Object.hasOwn(cfg,'overgrowth'))warnings.push('Overgrowth setting recorded; baseline Studio does not render overgrowth');
    if(spec.malfunction)warnings.push('Malfunction action generated; advanced chassis-specific glitches need visual review');
    if(spec.variation===true)cfg.colors.glow=deterministicGlow(cfg.colors.glow,spec.seed||0);
    project=SS.humanoidProject(spec.id,cfg);
  }else{
    const rig=spec.rig?clone(spec.rig):chooseMachinePreset(spec);
    if(spec.weather)rig.weather={...rig.weather,...clone(spec.weather)};
    if(spec.colors)rig.colors={...rig.colors,...clone(spec.colors)};
    if(!rig.views||!rig.anims)throw Error('Machine rig needs authored views and motion definitions');
    project=SS.machineProject(spec.id,rig);
    warnings.push('Machine contact/support pose requires rig-specific visual review; bounding-box alpha is not a valid sole/ground test for walkers and floaters');
  }
  return {id:spec.id,spec:clone(spec),kind,root,project,warnings,meta:null};
}
export async function generateCharacter(spec,{outputRoot=OUTPUT_ROOT}={}) {
  const kind=checkSpec(spec),root=path.resolve(outputRoot);
  if(existsSync(filepath(spec.id,root)))throw Error('Character output exists: refusing to overwrite approved/hand-edited work');
  const character=newState(spec,kind,root);
  await mkdir(filepath(spec.id,root),{recursive:true});
  await writeFile(path.join(filepath(spec.id,root),'request.json'),JSON.stringify(spec,null,2)+'\n');
  states.set(spec.id,character);
  return character;
}
async function resolveCharacter(id,root=OUTPUT_ROOT) {
  if(!idOk(id))throw Error('Invalid character ID');
  const live=states.get(id);
  if(live&&path.resolve(live.root)===path.resolve(root))return live;
  const base=filepath(id,root),spec=JSON.parse(await readFile(path.join(base,'request.json'),'utf8'));
  if(reserved(id))throw Error('Approved starter: use imported immutable sheets; no regeneration');
  const kind=checkSpec(spec),state=newState(spec,kind,path.resolve(root));
  const sourceProject=path.join(base,'source.bfsprite.json');
  if(existsSync(sourceProject)){
    state.project=await SS.deserialize(await readFile(sourceProject,'utf8'));
    if(state.project.kind!==kind)throw Error('Saved Studio project kind mismatch');
  }
  states.set(id,state);return state;
}
function sizeFor(state,group) {
  const spec=state.spec;
  const frame=spec.frameSizes?.[group]||{};
  if(group==='world'){
    const w=state.kind==='humanoid'?32:state.project.rig.w;
    const h=state.kind==='humanoid'?56:state.project.rig.h;
    return [asInt(frame.width,w,8,512),asInt(frame.height,h,8,512)];
  }
  const expected=spec.body==='boss'?128:
    state.kind==='machine'&&(spec.body!=='drone')?96:64;
  const v=asInt(frame.width??frame.height,expected,32,128);
  if(![64,96,128].includes(v))throw Error('Battle cell must be 64, 96, or 128');
  return [v,v];
}
function render(state,dir,action,index,count,w,h) {
  const cv=createCanvas(w,h),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(state.kind==='humanoid')drawAndroid(ctx,state.project.cfg,dir,poseFor(action,index,count),w,h);
  else{
    const available=Object.keys(state.project.rig.anims||{});
    const actual=available.includes(action)?action:available.includes('idle')?'idle':available[0];
    if(!actual)throw Error('Machine rig has no drawable action');
    if(actual!==action&&index===0)state.warnings.push('Machine action '+action+' uses '+actual+' fallback; requires art review');
    renderRig(ctx,state.project.rig,dir,actual,index,count,w,h);
  }
  return cv;
}
function safeSet(state,group,w,h,dirs,clips) {
  const existing=state.project.sets[group];
  if(existing?.edited?.size&&(existing.fw!==w||existing.fh!==h))
    throw Error('Hand-edited '+group+' frames have incompatible dimensions: import a native sheet; never scale them');
  if(existing?.edited?.size){
    existing.anims=clips;existing.dirs=dirs;return existing;
  }
  state.project.sets[group]=SS.newSet(w,h,dirs,clips);
  return state.project.sets[group];
}
function renderEdited(state,s,dir,sourceName,i,action,n,w,h) {
  const k=SS.key(dir,sourceName,i);
  if(s.edited?.has(k)){
    if(!s.cells.has(k))throw Error('Edited frame missing '+k);
    return s.cells.get(k);
  }
  const cv=render(state,dir,action,i,n,w,h);
  const target=SS.cell(s,dir,sourceName,i);target.getContext('2d').clearRect(0,0,w,h);
  target.getContext('2d').drawImage(cv,0,0);
  return target;
}
async function saveProject(state) {
  await writeFile(path.join(filepath(state.id,state.root),'source.bfsprite.json'),SS.serialize(state.project));
}
const writePng=async(name,cv)=>writeFile(name,cv.toBuffer('image/png'));
// Imported, reviewed pixel art is immutable. Regeneration must never silently
// replace the exact artwork from a previous import, including non-starter IDs.
async function ensureGeneratedRoleWritable(id,root,role) {
  const file=path.join(filepath(id,root),'imports.json');
  if(!existsSync(file))return;
  const imported=JSON.parse(await readFile(file,'utf8'));
  if(imported[role])throw Error('Approved imported '+role+' art is immutable; create an explicitly reviewed new version instead of regenerating');
}
export async function generateOverworldAnimations(characterId,{outputRoot=OUTPUT_ROOT}={}) {
  await ensureGeneratedRoleWritable(characterId,path.resolve(outputRoot),'world');
  const state=await resolveCharacter(characterId,path.resolve(outputRoot));
  const [fw,fh]=sizeFor(state,'world'),clips=clone(WORLD_ACTIONS),dirs=[...WORLD_DIRECTIONS];
  const set=safeSet(state,'exploration',fw,fh,dirs,clips);
  const count=clips.reduce((n,a)=>n+a.frames,0),atlas=createCanvas(fw*count,fh*dirs.length),ctx=atlas.getContext('2d');
  let col=0;const animations={};
  for(const clip of clips){
    animations[clip.name]={start:col,count:clip.frames,frames:clip.frames,fps:clip.fps,loop:true};
    for(let i=0;i<clip.frames;i++)dirs.forEach((dir,row)=>{
      const cell=renderEdited(state,set,dir,clip.name,i,clip.name,clip.frames,fw,fh);
      ctx.drawImage(cell,(col+i)*fw,row*fh);
    });
    col+=clip.frames;
  }
  const footprint=state.spec.collisionTiles||state.project.tiles||[1,1];
  if(!Array.isArray(footprint)||footprint.length!==2||footprint.some(v=>!Number.isInteger(v)||v<1||v>16))
    throw Error('Invalid tile footprint');
  const meta={characterId,frameWidth:fw,frameHeight:fh,tileSize:32,footprintTiles:[...footprint],
    anchor:{x:Math.floor(fw/2),y:fh},rows:dirs,animations,columns:count,
    url:'assets/characters/'+characterId+'.png'};
  const directory=filepath(characterId,state.root);
  await writePng(path.join(directory,'world.png'),atlas);
  await writeFile(path.join(directory,'world.json'),JSON.stringify(meta,null,2)+'\n');
  await saveProject(state);
  return meta;
}
function matchSource(s,key,sourceName,index) {
  const options=s?.anims?.find(a=>a.name===sourceName);
  if(!options)return null;
  const keyIndex=Math.min(index,options.frames-1),id=SS.key('right',sourceName,keyIndex);
  return s.cells.get(id)||null;
}
export async function generateBattleAnimations(characterId,{outputRoot=OUTPUT_ROOT}={}) {
  await ensureGeneratedRoleWritable(characterId,path.resolve(outputRoot),'battle');
  const state=await resolveCharacter(characterId,path.resolve(outputRoot));
  const [fw,fh]=sizeFor(state,'battle');
  const atlas=createCanvas(fw*6,fh*BATTLE_ROWS.length),ctx=atlas.getContext('2d');
  const s=state.project.sets.battle;
  if(s?.edited?.size&&(s.fw!==fw||s.fh!==fh))
    throw Error('Hand-edited battle cells cannot be resized; import approved native atlas instead');
  const clips=BATTLE_ROWS.map(name=>({name,type:SOURCE_ACTION[name],frames:BATTLE_FRAMES[name],fps:name==='idle'?6:name==='hit'?12:10}));
  const target=safeSet(state,'battle',fw,fh,['right'],clips);
  const animations={};
  for(const [row,name] of BATTLE_ROWS.entries()){
    const frames=BATTLE_FRAMES[name],action=SOURCE_ACTION[name];
    animations[name]={row,frames,fps:clips[row].fps};
    for(let i=0;i<frames;i++){
      const edited=matchSource(target,name,i)||matchSource(s,action,i);
      const key=SS.key('right',name,i);
      if(target.edited.has(key)&&!target.cells.has(key))throw Error('Missing hand-edited frame '+key);
      const frame=target.edited.has(key)?target.cells.get(key):
        edited&&s?.edited?.has(SS.key('right',action,Math.min(i,(s.anims.find(a=>a.name===action)?.frames||1)-1)))?edited:
        render(state,'right',action,i,frames,fw,fh);
      if(frame.width!==fw||frame.height!==fh)throw Error('Edited cell dimensions mismatch '+name);
      ctx.drawImage(frame,i*fw,row*fh);
      if(!target.edited.has(key)){
        const cell=SS.cell(target,'right',name,i);cell.getContext('2d').clearRect(0,0,fw,fh);
        cell.getContext('2d').drawImage(frame,0,0);
      }
    }
  }
  const meta={characterId,frameWidth:fw,frameHeight:fh,anchor:{x:Math.floor(fw/2),y:fh},
    facing:'right',columns:6,rows:[...BATTLE_ROWS],animations,
    src:'assets/battlers/'+characterId+'.png',scale:1,
    adapter:'Sprite Studio actions to fixed 6x9 side-view engine contract',
    hasNativeAuthoredRows:false};
  const directory=filepath(characterId,state.root);
  await writePng(path.join(directory,'battle.png'),atlas);
  await writeFile(path.join(directory,'battle.json'),JSON.stringify(meta,null,2)+'\n');
  await saveProject(state);
  return meta;
}
export async function importApprovedSpriteSheet(file,metadata,{outputRoot=OUTPUT_ROOT}={}) {
  const {characterId,role,approval}=metadata||{};
  if(!idOk(characterId)||!['world','battle','portrait'].includes(role)||approval?.reviewed!==true||
    typeof approval.reviewer!=='string'||!approval.reviewer.trim())
    throw Error('Imported sheet needs characterId, role, and explicit reviewer approval');
  const sourcePath=path.resolve(file),destDir=filepath(characterId,path.resolve(outputRoot));
  await mkdir(destDir,{recursive:true});
  const dest=path.join(destDir,role+'.png');
  if(existsSync(dest))throw Error('Existing approved sheet is immutable; manual revision required');
  const bytes=await readFile(sourcePath),img=await loadImage(bytes);
  if(!img.width||!img.height)throw Error('Invalid imported PNG');
  await copyFile(sourcePath,dest);
  if(!existsSync(path.join(destDir,'request.json')))
    await writeFile(path.join(destDir,'request.json'),JSON.stringify({
      id:characterId,kind:metadata.kind||'humanoid',
      faction:metadata.faction||'unspecified',approval:'import-only'
    },null,2)+'\n');
  const manifestPath=path.join(destDir,'imports.json');
  const imports=existsSync(manifestPath)?JSON.parse(await readFile(manifestPath,'utf8')):{};
  imports[role]={sha256:sha(bytes),reviewedBy:approval.reviewer,approvedAt:approval.date||null,
    dimensions:[img.width,img.height],metadata:metadata.sheetMetadata||null};
  await writeFile(manifestPath,JSON.stringify(imports,null,2)+'\n');
  if(metadata.sheetMetadata)await writeFile(path.join(destDir,role+'.json'),
    JSON.stringify(metadata.sheetMetadata,null,2)+'\n');
  return imports[role];
}
function assertMeta(meta,id,role) {
  if(meta.characterId!==id||!Number.isInteger(meta.frameWidth)||
     !Number.isInteger(meta.frameHeight)||meta.frameWidth<8||meta.frameHeight<8)
    throw Error(role+' identity/dimension metadata incorrect');
  if(role==='world'){
    if(meta.tileSize!==32||JSON.stringify(meta.rows)!==JSON.stringify(WORLD_DIRECTIONS)||
       !meta.animations.idle||!meta.animations.walk)throw Error('Missing 32px/4-way world contract');
  }else{
    if(meta.columns!==6||JSON.stringify(meta.rows)!==JSON.stringify(BATTLE_ROWS))
      throw Error('Missing exact 6x9 side-view rows');
    for(const [i,name] of BATTLE_ROWS.entries()){
      const a=meta.animations[name];
      if(!a||a.row!==i||a.frames<1||a.frames>6||!Number.isFinite(a.fps))
        throw Error('Incorrect battle action row '+name);
    }
  }
  if(meta.anchor.x<0||meta.anchor.x>meta.frameWidth||meta.anchor.y!==meta.frameHeight)
    throw Error('Foot anchor is not bottom-registered');
}
export async function validateCharacter(characterId,{outputRoot=OUTPUT_ROOT}={}) {
  if(!idOk(characterId))throw Error('Invalid character ID');
  const base=filepath(characterId,path.resolve(outputRoot)),problems=[],assets={};
  for(const role of ['world','battle','portrait']){
    const file=path.join(base,role+'.png');
    if(!existsSync(file)){problems.push(role+' image missing');continue;}
    const bytes=await readFile(file),img=await loadImage(bytes);
    if(!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))problems.push(role+' is not a PNG');
    const cv=createCanvas(img.width,img.height),c=cv.getContext('2d');c.drawImage(img,0,0);
    const px=c.getImageData(0,0,img.width,img.height).data;
    let opaque=0,transparent=0,partialAlpha=0;for(let i=3;i<px.length;i+=4){if(px[i]===0)transparent++;else{opaque++;if(px[i]!==255)partialAlpha++;}}
    if(!opaque||!transparent)problems.push(role+' must have nonempty pixels AND transparency');
    if(partialAlpha)problems.push(role+' has '+partialAlpha+' partially transparent pixels (native pixel alpha must be binary)');
    assets[role]={width:img.width,height:img.height,sha256:sha(bytes),opaquePixels:opaque};
    if(role==='portrait')continue;
    const metaFile=path.join(base,role+'.json');
    if(!existsSync(metaFile)){problems.push(role+' metadata missing');continue;}
    const meta=JSON.parse(await readFile(metaFile,'utf8'));
    try{assertMeta(meta,characterId,role);}catch(e){problems.push(e.message);}
    const expected=role==='world'?
      [meta.frameWidth*meta.columns,meta.frameHeight*4]:
      [meta.frameWidth*6,meta.frameHeight*9];
    if(img.width!==expected[0]||img.height!==expected[1])
      problems.push(role+' atlas pixel dimensions differ from metadata');
    if(img.width===expected[0]&&img.height===expected[1]){
      // An atlas with valid geometry but an entirely empty direction/action is not an asset.
      const checkRow=(row,start,count)=>{
        for(let y=row*meta.frameHeight;y<(row+1)*meta.frameHeight;y++)
          for(let x=start*meta.frameWidth;x<(start+count)*meta.frameWidth;x++)
            if(px[(y*img.width+x)*4+3])return true;
        return false;
      };
      if(role==='world'){
        for(let row=0;row<4;row++){
          const idle=meta.animations?.idle,walk=meta.animations?.walk;
          if(!idle||!walk||!checkRow(row,idle.start,idle.count)||!checkRow(row,walk.start,walk.count))
            problems.push('Missing idle/walk pixels for '+WORLD_DIRECTIONS[row]);
        }
      }else for(const [row,name] of BATTLE_ROWS.entries()){
        const clip=meta.animations?.[name];
        if(!clip||!checkRow(row,0,clip.frames))
          problems.push('Missing visible battle action row '+name);
      }
    }
    if(role==='world'&&img.width===expected[0]&&img.height===expected[1]){
      const actions=['idle','walk','scan','malfunction'];let offset=0;
      for(const action of actions){
        const a=meta.animations?.[action];
        if(!a||a.start!==offset||!Number.isInteger(a.count)||a.count<1)
          problems.push('World clip order/count incorrect: '+action);
        else offset+=a.count;
      }
      const walk=meta.animations.walk;
      // Alpha bounds are a reliable grounded-foot proxy only for humanoids. Multi-leg rigs and
      // floaters require explicit support-joint/ground projection QA, not last opaque pixel.
      const request=JSON.parse(await readFile(path.join(base,'request.json'),'utf8'));
      if(walk&&walk.count>0&&request.kind==='humanoid'){
        for(let row=0;row<4;row++){
          const bounds=[];
          for(let col=walk.start;col<walk.start+walk.count;col++){
            let bottom=-1;
            for(let y=0;y<meta.frameHeight;y++)for(let x=0;x<meta.frameWidth;x++){
              const index=((row*meta.frameHeight+y)*img.width+col*meta.frameWidth+x)*4+3;
              if(px[index])bottom=Math.max(bottom,y);
            }
            bounds.push(bottom);
          }
          if(bounds.includes(-1)||Math.max(...bounds)-Math.min(...bounds)>2)
            problems.push('Walk sprite feet drift beyond registered anchor in '+WORLD_DIRECTIONS[row]);
        }
      }
    }
  }
  if(!existsSync(path.join(base,'request.json')))problems.push('Request/source missing');
  return {characterId,ok:problems.length===0,problems,assets};
}
export async function exportCharacter(characterId,{outputRoot=OUTPUT_ROOT}={}) {
  const base=filepath(characterId,path.resolve(outputRoot));
  let world,battle;
  try{
    world=JSON.parse(await readFile(path.join(base,'world.json'),'utf8'));
    battle=JSON.parse(await readFile(path.join(base,'battle.json'),'utf8'));
  }catch{throw Error('Generate or import both world and battle assets before export');}
  assertMeta(world,characterId,'world');assertMeta(battle,characterId,'battle');
  const portraitPath=path.join(base,'portrait.png');
  if(!existsSync(portraitPath)){
    if(reserved(characterId))throw Error('Approved starters need their real original selection portrait');
    const state=await resolveCharacter(characterId,path.resolve(outputRoot));
    const cv=createCanvas(96,96),c=cv.getContext('2d');c.imageSmoothingEnabled=false;
    const front=render(state,'down','idle',0,1,60,88);
    c.drawImage(front,18,8);await writePng(portraitPath,cv);
  }
  const checks=await validateCharacter(characterId,{outputRoot});
  if(!checks.ok)throw Error('Asset validation failed: '+checks.problems.join('; '));
  const request=JSON.parse(await readFile(path.join(base,'request.json'),'utf8'));
  const manifest={schemaVersion:1,characterId,kind:request.kind,faction:request.faction,
    status:reserved(characterId)?'reviewed-import':'draft',
    source:'Existing Bearframe Sprite Studio rendering modules',
    generationSeed:request.seed||0,portrait:'portrait.png',world:'world.png',battle:'battle.png',
    identity:{portrait:characterId,world:world.characterId,battle:battle.characterId},
    worldMetadata:'world.json',battleMetadata:'battle.json',
    collisionTiles:world.footprintTiles,battleEngine:{
      src:battle.src,frameWidth:battle.frameWidth,frameHeight:battle.frameHeight,
      scale:1,animations:battle.animations
    },checks,notes:states.get(characterId)?.warnings||[]};
  await writeFile(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const preview=createCanvas(720,280),p=preview.getContext('2d');
  p.fillStyle='#13191f';p.fillRect(0,0,720,280);p.imageSmoothingEnabled=false;
  const wimg=await loadImage(await readFile(path.join(base,'world.png')));
  const bimg=await loadImage(await readFile(path.join(base,'battle.png')));
  const portrait=await loadImage(await readFile(portraitPath));
  p.drawImage(portrait,8,8,96,96);
  for(let i=0;i<4;i++)p.drawImage(wimg,0,i*world.frameHeight,world.frameWidth,world.frameHeight,120+i*115,25,world.frameWidth*2,world.frameHeight*2);
  for(let i=0;i<6;i++)p.drawImage(bimg,i*battle.frameWidth,battle.frameHeight,battle.frameWidth,battle.frameHeight,10+i*116,160,Math.min(108,battle.frameWidth),Math.min(108,battle.frameHeight));
  await writePng(path.join(base,'preview.png'),preview);
  return manifest;
}
export async function registerCharacter(characterId,{outputRoot=OUTPUT_ROOT,development=false,reviewFile=null}={}) {
  const base=filepath(characterId,path.resolve(outputRoot));
  const check=await validateCharacter(characterId,{outputRoot});
  if(!check.ok)throw Error(check.problems.join('; '));
  const manifest=JSON.parse(await readFile(path.join(base,'manifest.json'),'utf8'));
  if(manifest.characterId!==characterId)throw Error('Manifest identity changed');
  if(development){
    if(!/^test_[a-z0-9_-]+$/.test(characterId))throw Error('Only test_* drafts may auto-register in development');
  }else{
    if(!reviewFile)throw Error('Production registration requires human reviewFile');
    const approval=JSON.parse(await readFile(path.resolve(reviewFile),'utf8'));
    if(approval.characterId!==characterId||approval.approved!==true||
      !approval.reviewer||!approval.assets||
      ['world','battle','portrait'].some(role=>approval.assets[role]!==check.assets[role]?.sha256))
      throw Error('Review evidence must match approved world, battle AND portrait hashes');
  }
  const destBase=path.join(frontend,'public/assets');
  const paths={battle:path.join(destBase,'battlers',characterId+'.png'),
    world:path.join(destBase,'characters',characterId+'.png'),
    portrait:path.join(destBase,'portraits',characterId+'.png')};
  const registryPath=path.join(frontend,'public/js/engine/rpg-generated-registrations.js');
  const registryJson=path.join(destBase,'character-registry.json');
  const registry=existsSync(registryJson)?JSON.parse(await readFile(registryJson,'utf8')):{};
  if(registry[characterId])throw Error('Character registry identity already exists');
  for(const name of Object.keys(paths)){
    if(existsSync(paths[name]))throw Error('Registered sprite exists: '+name+'; never overwrite without explicit migration');
    await mkdir(path.dirname(paths[name]),{recursive:true});
  }
  for(const name of Object.keys(paths))await copyFile(path.join(base,name+'.png'),paths[name]);
  const sourceRequest=JSON.parse(await readFile(path.join(base,'request.json'),'utf8'));
  const battleSide=development?'party':sourceRequest.battleSide||'enemy';
  registry[characterId]={id:characterId,portrait:'assets/portraits/'+characterId+'.png',
    world:'assets/characters/'+characterId+'.png',
    battle:'assets/battlers/'+characterId+'.png',
    worldMetadata:JSON.parse(await readFile(path.join(base,'world.json'),'utf8')),
    battleMetadata:JSON.parse(await readFile(path.join(base,'battle.json'),'utf8')),
    status:development?'development-only':'approved',battleSide};
  await mkdir(path.dirname(registryPath),{recursive:true});
  await writeFile(registryJson,JSON.stringify(registry,null,2)+'\n');
  const battlers=Object.fromEntries(Object.entries(registry).map(([id,row])=>
    [(row.battleSide==='party'?'party:':'enemy:')+id,row.battleMetadata&&{
      src:row.battle,frameWidth:row.battleMetadata.frameWidth,
      frameHeight:row.battleMetadata.frameHeight,scale:1,
      animations:row.battleMetadata.animations
    }]));
  await writeFile(registryPath,
    '// Auto-generated by Bearframe character-tools registration. Manual review before publishing.\n'+
    'export const GENERATED_CHARACTERS=Object.freeze('+JSON.stringify(registry,null,2)+');\n'+
    'export const RPG_GENERATED_BATTLERS=Object.freeze('+JSON.stringify(battlers,null,2)+');\n');
  return registry[characterId];
}
export async function inspectGenerated({outputRoot=OUTPUT_ROOT}={}) {
  if(!existsSync(outputRoot))return [];
  return (await readdir(outputRoot,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
}
