// Additive JRPG sprite loader: sprite IDs, native frame metadata, correct feet and 32px collision grid.
// Ghost Signal's Wraith renderer and missions are not modified.
import {GENERATED_CHARACTERS} from './rpg-generated-registrations.js';
const DIRECTIONS=['down','up','right','left'];
export function getCharacterAsset(id){return Object.hasOwn(GENERATED_CHARACTERS,id)?GENERATED_CHARACTERS[id]:null;}
export async function loadCharacterFieldArt(id){
  const rec=getCharacterAsset(id);if(!rec)throw Error('Unknown registered field character '+id);
  const img=new Image();img.decoding='sync';
  img.src=new URL('../../'+rec.world,import.meta.url).href;
  await img.decode();
  const meta=rec.worldMetadata;
  if(!meta||meta.characterId!==id||meta.tileSize!==32||
    JSON.stringify(meta.rows)!==JSON.stringify(DIRECTIONS)||
    img.naturalWidth!==meta.columns*meta.frameWidth||
    img.naturalHeight!==4*meta.frameHeight)throw Error('Invalid generated world geometry/identity');
  return {id,image:img,meta};
}
export function drawRegisteredFieldCharacter(ctx,asset,{x,y,direction='down',
  animation='idle',elapsedSeconds=0,scale=1}={}){
  const {image,meta}=asset,clip=meta.animations[animation]||meta.animations.idle;
  if(!clip)throw Error('Field animation has no idle fallback');
  const dir=Math.max(0,DIRECTIONS.indexOf(direction));
  const index=Math.floor(Math.max(0,elapsedSeconds)*clip.fps)%clip.count;
  const fw=meta.frameWidth,fh=meta.frameHeight;
  const targetW=Math.round(fw*scale),targetH=Math.round(fh*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,(clip.start+index)*fw,dir*fh,fw,fh,
    Math.round(x-(meta.anchor?.x??fw/2)*scale),Math.round(y-(meta.anchor?.y??fh)*scale),
    targetW,targetH);
  ctx.restore();
}
export async function bindGeneratedFieldSprite(game,id){
  // Compatibility adapter for the unchanged Ghost Signal Game sheet contract.
  // Larger rigs use drawRegisteredFieldCharacter in the RPG field, not forced 32x56 scaling.
  const asset=await loadCharacterFieldArt(id),{meta,image}=asset;
  if(meta.frameWidth!==32||meta.frameHeight!==56)
    return {applied:false,reason:'Original Wraith Game has a fixed 32x56 sheet; larger RPG actors use drawRegisteredFieldCharacter'};
  for(const [name,n] of [['walk',6],['idle',4],['scan',2]]){
    if(!meta.animations[name]||meta.animations[name].count<n)
      return {applied:false,reason:'Ghost Signal compatibility requires '+n+' '+name+' frames'};
  }
  const cv=document.createElement('canvas');cv.width=32*12;cv.height=56*4;
  const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let row=0;row<4;row++){
    let column=0;
    for(const name of ['walk','idle','scan']){
      const a=meta.animations[name];
      const count=name==='walk'?6:name==='idle'?4:2;
      for(let i=0;i<count;i++,column++)
        ctx.drawImage(image,(a.start+i)*32,row*56,32,56,column*32,row*56,32,56);
    }
  }
  game.sheet=cv;
  return {applied:true,id,worldCanvas:cv,asset};
}
