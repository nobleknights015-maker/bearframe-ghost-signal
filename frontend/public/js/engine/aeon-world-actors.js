// Private v5 world art adapter. Draws source pixels only; patrol AI, collision,
// sightlines, map grid and saved security state remain owned by Ghost Signal.
const DIRECTIONS=Object.freeze(['down','left','right','up']);
const ROOT=new URL('../../assets/aeon/',import.meta.url);
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id);
export async function loadV5WorldActor(manifest,id){
  if(manifest?.schema!=='aeon.asset-library.v4'||!Array.isArray(manifest.characters)||!safeId(id))
    throw new TypeError('Invalid v5 world actor request');
  const matches=manifest.characters.filter(entry=>entry.id===id);
  if(matches.length!==1)throw new TypeError('Missing or duplicate v5 world actor');
  const world=matches[0].world;
  if(!world||world.src!=='assets/world/'+id+'.png'||
    !Number.isInteger(world.frameWidth)||world.frameWidth<16||world.frameWidth>192||
    !Number.isInteger(world.frameHeight)||world.frameHeight<16||world.frameHeight>192||
    world.columns!==9||world.rows!==4||
    !Array.isArray(world.directions)||world.directions.length!==4||
    DIRECTIONS.some(dir=>!world.directions.includes(dir))||
    world.idleColumn!==0||JSON.stringify(world.walkColumns)!==JSON.stringify([1,2,3,4,5,6,7,8])||
    !Number.isFinite(world.fps)||world.fps<1||world.fps>30||
    JSON.stringify(world.anchor)!==JSON.stringify([world.frameWidth/2,world.frameHeight]))
    throw new TypeError('Invalid v5 world actor sheet');
  const image=await new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('V5 world actor image unavailable'));
    img.src=new URL(world.src,ROOT).href;
  });
  if(image.naturalWidth!==world.frameWidth*world.columns||image.naturalHeight!==world.frameHeight*world.rows)
    throw new TypeError('V5 world actor image dimensions changed');
  return Object.freeze({id,image,world:Object.freeze({
    frameWidth:world.frameWidth,frameHeight:world.frameHeight,
    directions:Object.freeze([...world.directions]),idleColumn:world.idleColumn,
    walkColumns:Object.freeze([...world.walkColumns]),fps:world.fps,
    anchor:Object.freeze([...world.anchor])
  })});
}
export function createV5SecurityRenderer(asset){
  if(!safeId(asset?.id)||!asset.image||!asset.world)throw new TypeError('Load v5 world actor first');
  const previous=new WeakMap(),w=asset.world;
  return (ctx,drone,time)=>{
    if(drone?.c?.artId!==asset.id||!Number.isFinite(drone.x)||!Number.isFinite(drone.y))return false;
    const row=w.directions.indexOf(drone.dir);if(row<0)return false;
    const now=Number.isFinite(time)?Math.max(0,time):0;
    const prior=previous.get(drone);
    const moving=drone.state!=='disabled'&&!!prior&&
      Math.hypot(drone.x-prior.x,drone.y-prior.y)>.001;
    const since=moving&&prior.moving&&now>=prior.time?prior.since:now;
    previous.set(drone,{x:drone.x,y:drone.y,time:now,since,moving});
    const column=moving?w.walkColumns[Math.floor((now-since)*w.fps)%w.walkColumns.length]:w.idleColumn;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(asset.image,column*w.frameWidth,row*w.frameHeight,w.frameWidth,w.frameHeight,
      Math.round(drone.x)-w.anchor[0],Math.round(drone.y)-w.anchor[1],w.frameWidth,w.frameHeight);
    ctx.restore();return true;
  };
}
