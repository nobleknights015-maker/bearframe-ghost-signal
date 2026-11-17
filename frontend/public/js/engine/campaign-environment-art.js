// Real owner-supplied environment art adapter for Aeon Circuit only.
// Image bytes and license texts belong in the owner's ignored PRIVATE import;
// the public engine ships only this validated loading interface and tests.
const IMAGE_PATH=/^assets\/aeon\/environment\/(?:doors|terrain|objects|atlases)\/[a-z0-9_]+\.png$/;
const ID=/^[a-z][a-z0-9_]{0,63}$/;
const TILE=32;
const ROOT=new URL('../../assets/aeon/',import.meta.url);
const SITE=new URL('../../',ROOT);
const validImage=path=>typeof path==='string'&&IMAGE_PATH.test(path);
const isRecord=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const fail=reason=>{throw new Error('Private environment art: '+reason);};
function checkedPaths(manifest){
  if(manifest?.schema!=='aeon.private-environment-art.v1'||manifest.tileSize!==TILE||
      !isRecord(manifest.doorways)||!isRecord(manifest.palettes))fail('wrong import manifest version');
  const imagePaths=new Set(),doorways=new Map(),palettes=new Map(),objects=new Map();
  for(const [id,pair] of Object.entries(manifest.doorways)){
    if(!ID.test(id)||!isRecord(pair)||!validImage(pair.closed)||
       (pair.open!==undefined&&!validImage(pair.open)))fail('invalid private door '+id);
    imagePaths.add(pair.closed);
    if(pair.open)imagePaths.add(pair.open);
    doorways.set(id,Object.freeze({...pair}));
  }
  for(const [id,pair] of Object.entries(manifest.palettes)){
    if(!ID.test(id)||!isRecord(pair)||!validImage(pair.floor)||!validImage(pair.wall)||
       (pair.backdrop!==undefined&&pair.backdrop!=='terrain'))
      fail('invalid private terrain palette '+id);
    imagePaths.add(pair.floor);imagePaths.add(pair.wall);
    palettes.set(id,Object.freeze({...pair}));
  }
  // The owner supplied real wasteland/ruin/bunker atlases. Their full native
  // sheets are larger than individual 32-128px door sprites.
  if(manifest.objects!==undefined&&!isRecord(manifest.objects))
    fail('invalid atlas registry');
  for(const [id,src] of Object.entries(manifest.objects||{})){
    if(!ID.test(id)||!validImage(src))fail('invalid source atlas '+id);
    imagePaths.add(src);objects.set(id,src);
  }
  return {imagePaths,doorways,palettes,objects};
}
export function compileCampaignEnvironmentArt(manifest,images){
  const {imagePaths,doorways,palettes,objects}=checkedPaths(manifest);
  if(!(images instanceof Map))fail('expected decoded owner asset images');
  for(const src of imagePaths){
    const img=images.get(src);
    const w=img?.naturalWidth??img?.width,h=img?.naturalHeight??img?.height;
    const atlas=[...objects.values()].includes(src);
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||
       w>(atlas?2048:128)||h>(atlas?2048:128)||
       w%TILE!==0||h%TILE!==0)
      fail('missing or non-native source sprite: '+src);
  }
  for(const [id,pair] of palettes){
    for(const key of ['floor','wall']){
      const img=images.get(pair[key]);
      if((img.naturalWidth??img.width)!==TILE||(img.naturalHeight??img.height)!==TILE)
        fail('terrain tile must be native 32x32: '+id+'/'+key);
    }
  }
  const defaultDoors=Object.freeze({bulkhead:'service',hatch:'overgrown',exit:'elevator'});
  return Object.freeze({
    door:(style,override=null)=>{
      const id=override||defaultDoors[style];
      if(!id||!doorways.has(id))fail('missing owner door selection '+id);
      const pair=doorways.get(id);
      return Object.freeze({closed:images.get(pair.closed),
        open:images.get(pair.open||pair.closed),id});
    },
    palette:id=>{
      if(!id)return null; // no silent invented biome-to-area mapping
      const pair=palettes.get(id);
      if(!pair)fail('unknown owner terrain palette '+id);
      return Object.freeze({floor:images.get(pair.floor),wall:images.get(pair.wall),
        backdrop:pair.backdrop??null,id});
    },
    atlas:id=>{
      const source=objects.get(id);
      if(!source)fail('unknown owner environment atlas '+id);
      return images.get(source);
    },
    atlasIds:Object.freeze([...objects.keys()]),
    doorIds:Object.freeze([...doorways.keys()]),
    paletteIds:Object.freeze([...palettes.keys()]),
    imageCount:imagePaths.size
  });
}
const fetchImage=src=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error('Owner PNG missing: '+src));
  image.src=new URL(src,SITE).href;
});
export async function loadCampaignEnvironmentArt({requireInstalled=false,
  read=globalThis.fetch?.bind(globalThis),loadImage=fetchImage}={}){
  if(typeof read!=='function'||typeof loadImage!=='function')
    fail('environment image APIs unavailable');
  const url=new URL('environment/environment-art.json',ROOT);
  const result=await read(url,{cache:'no-cache'});
  if(!result.ok){
    if(result.status===404&&!requireInstalled)return null; // Only provisional review.
    fail('owner environment installation missing (HTTP '+result.status+')');
  }
  const manifest=await result.json(),{imagePaths}=checkedPaths(manifest);
  const entries=await Promise.all([...imagePaths].map(async path=>
    [path,await loadImage(path)]));
  return compileCampaignEnvironmentArt(manifest,new Map(entries));
}
