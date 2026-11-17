// Exact 32x32 native pixel crops from user-supplied, redistribution-permitted game packs.
// l = Top Down Lab by Luis Zuno / Ansimuz (public-license.txt allows redistribution).
// r = Robot Warfare by mattwalkden (CC0 public-domain dedication).
// An indexed, deflate-compressed representation retains original native RGBA pixels.
// No owner-restricted starship, Craftpix, or terrain atlas art is included in this source.
const CELL_IDS = ["l0_4","l1_4","l2_4","l1_5","l4_5","l5_5","l6_5","l8_0","l8_1","l4_1","l5_1","r0_5","r1_5","r0_6","r4_6","r5_6","r3_6","r4_7","r4_2","r5_2","r2_3","r3_3","r6_6","r0_7"];
const PALETTE = "000000005c7cbcff2a4582ff4060a0ff002060ff000000ff8c783cffe6c45cff206060ff004040ff00a080ffcdcdc0ff2f2f13ff4a4a2dff606040ff7e7e5fff0e204dff06226dff131340ff1f6363ff0f7881ff1a1a24a8ffffff001a1a24000e204d000b97aaff";
const PACK = "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";
const TILE=32, CELLS=24;
const COLORS=new Uint8Array(PALETTE.match(/.{8}/g).flatMap(hex => [0,2,4,6].map(i => parseInt(hex.slice(i,i+2),16))));
const textures=new Map();
let available=false;
try {
  const bytes=Uint8Array.from(atob(PACK),c=>c.charCodeAt(0));
  const decoded=new Uint8Array(await new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  ).arrayBuffer());
  if(decoded.length!==CELLS*TILE*TILE)throw Error('Environment atlas truncated');
  for(let n=0;n<CELLS;n++){
    const cv=document.createElement('canvas');cv.width=TILE;cv.height=TILE;
    const ctx=cv.getContext('2d'),image=ctx.createImageData(TILE,TILE);
    for(let p=0;p<TILE*TILE;p++){
      const src=decoded[n*TILE*TILE+p]*4,dst=p*4;
      image.data[dst]=COLORS[src];image.data[dst+1]=COLORS[src+1];
      image.data[dst+2]=COLORS[src+2];image.data[dst+3]=COLORS[src+3];
    }
    ctx.putImageData(image,0,0);textures.set(CELL_IDS[n],cv);
  }
  available=true;
}catch(e){console.warn('Environment pack unavailable; retaining native fallback',e);}
const hash=(x,y,s=0)=>{
  let n=Math.imul(x+11,0x9e3779b1)^Math.imul(y+29,0x85ebca77)^s;
  n=Math.imul(n^(n>>>16),0x7feb352d);return (n^(n>>>15))>>>0;
};
const GROUND={
  surface:['r0_6','r0_5','r1_5','r3_6','r4_6','r5_6'],
  ruins:['r1_5','r0_5','r4_6','r5_6','r0_6','r3_6'],
  storm:['r0_5','r1_5','r0_6','r4_2','r5_2','r4_6']
};
export function packAudit(){return {loaded:available,cells:textures.size,size:32,
  sources:['Top Down Lab (Ansimuz, redistributable)','Robot Warfare (mattwalkden, CC0)']};}
export function paintPackFloor(ctx,theme,x,y){
  if(!available || !Object.hasOwn(GROUND,theme))return false;
  const set=GROUND[theme];
  let key=set[hash(x>>1,y>>1,15)%3];
  if(hash(x,y,31)%9===0)key=set[3+hash(x,y,21)%3];
  if(theme==='storm'&&x>=30&&x<=49&&(y===18||y===19||y===20))
    key=['r4_2','r5_2','r2_3','r3_3'][hash(x,y,44)%4];
  const cell=textures.get(key);if(!cell)return false;
  ctx.save();ctx.globalAlpha=theme==='storm'?0.94:0.88;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(cell,x*TILE,y*TILE);ctx.restore();
  return true;
}
export function paintPackProp(ctx,p,theme){
  if(!available || !GROUND[theme])return false;
  if(p.t!=='machine'&&p.t!=='rack')return false;
  const parts=p.t==='machine'?['l4_1','l5_1','l8_0','l8_1']:['l8_0','l8_1'];
  ctx.save();ctx.globalAlpha=.93;ctx.imageSmoothingEnabled=false;
  for(let ix=0;ix<(p.w||1);ix++)for(let iy=0;iy<(p.h||1);iy++){
    const tile=textures.get(parts[(ix+iy*3)%parts.length]);
    ctx.drawImage(tile,(p.x+ix)*TILE,(p.y+iy)*TILE);
  }
  ctx.restore();return true;
}
