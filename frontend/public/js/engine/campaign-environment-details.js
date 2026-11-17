// PRIVATE source-authored map-dressing contract. No runtime random scatter.
// Only actual owner-supplied PNG atlases can supply scenery. No collision,
// events, save data, world topology, or generated images are introduced.
const TILE=32,ID=/^[a-z][a-z0-9_]{0,63}$/;
const LAYERS=new Set(['ground','background','foreground']);
const safeNumber=n=>Number.isInteger(n)&&n>=0;
const complain=reason=>{throw new Error('Campaign environment detail: '+reason);};
const intersection=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const sourceRect=({sx,sy,sw,sh})=>({sx,sy,sw,sh});
/**
 * Each item is a source-owner-reviewed rectangle, in native multiples of 32.
 * Optional decorations MUST NOT modify gameplay collision or hide source
 * triggers. Foreground fragments may only occupy non-walkable tiles.
 */
export function compileCampaignEnvironmentDetails(map,art){
  const rows=map?.environmentDetails??[];
  if(!Array.isArray(rows)||rows.length>256)complain('invalid detail list');
  if(!rows.length)return Object.freeze({ground:[],background:[],foreground:[],count:0});
  if(!art||typeof art.atlas!=='function')complain('owner atlas import is absent');
  const collision=map.layers?.find(l=>l.name==='collision')?.data;
  if(!Array.isArray(collision)||collision.length!==map.width*map.height)
    complain('missing validated collision');
  const usedIds=new Set(),output={ground:[],background:[],foreground:[]};
  const reserved=[];
  const reserve=(x,y,w,h,label)=>reserved.push({x,y,w,h,label});
  reserve(Math.floor(map.start.x/TILE),Math.floor(map.start.y/TILE),1,1,'start');
  for(const e of map.entities||[])reserve(e.tx,e.ty,1,1,e.id);
  for(const p of map.layers.find(l=>l.name==='portals').objects)
    reserve(p.x/TILE,p.y/TILE,p.width/TILE,p.height/TILE,p.name);
  for(const t of map.triggers||[])
    reserve(Math.floor(t.x/TILE),Math.floor(t.y/TILE),
      Math.ceil(t.width/TILE),Math.ceil(t.height/TILE),t.id);
  for(const row of rows){
    if(!row||!ID.test(row.id)||usedIds.has(row.id)||!ID.test(row.atlas)||
       !LAYERS.has(row.layer)||!safeNumber(row.tx)||!safeNumber(row.ty)||
       ![row.sx,row.sy,row.sw,row.sh].every(safeNumber)||
       row.sw===0||row.sh===0||row.sw>192||row.sh>192||
       [row.sx,row.sy,row.sw,row.sh].some(v=>v%TILE))
      complain('invalid or duplicate source detail');
    usedIds.add(row.id);
    const width=row.sw/TILE,height=row.sh/TILE;
    if(row.tx+width>map.width||row.ty+height>map.height)
      complain('scenery outside source map: '+row.id);
    const sprite=art.atlas(row.atlas),sw=sprite?.naturalWidth??sprite?.width,sh=sprite?.naturalHeight??sprite?.height;
    if(row.sx+row.sw>sw||row.sy+row.sh>sh)
      complain('atlas crop beyond source image: '+row.id);
    const box={x:row.tx,y:row.ty,w:width,h:height};
    if(row.layer!=='ground'&&reserved.some(r=>intersection(box,r)))
      complain('scenery obscures critical source position: '+row.id);
    // Avoid solid-looking foreground objects masking accessible floor; only
    // transparent ground decals may cover traversable authored tiles.
    if(row.layer==='foreground'&&
       Array.from({length:width*height},(_,i)=>{
         const x=row.tx+i%width,y=row.ty+Math.floor(i/width);
         return collision[y*map.width+x]!==1;
       }).some(Boolean))complain('foreground artwork masks walkable floor: '+row.id);
    const detail=Object.freeze({
      id:row.id,atlas:row.atlas,layer:row.layer,image:sprite,
      sx:row.sx,sy:row.sy,sw:row.sw,sh:row.sh,
      x:row.tx*TILE,y:row.ty*TILE
    });
    output[row.layer].push(detail);
  }
  return Object.freeze({ground:Object.freeze(output.ground),background:Object.freeze(output.background),
    foreground:Object.freeze(output.foreground),count:rows.length});
}

export function paintCampaignEnvironmentDetails(ctx,details,layer){
  if(!details||!LAYERS.has(layer))return 0;
  const rows=details[layer]||[];
  if(!rows.length)return 0;
  ctx.imageSmoothingEnabled=false;
  for(const row of rows)
    ctx.drawImage(row.image,row.sx,row.sy,row.sw,row.sh,row.x,row.y,row.sw,row.sh);
  return rows.length;
}
