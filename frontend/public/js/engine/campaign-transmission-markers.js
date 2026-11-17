// Private-campaign transmission markers for authored reciprocal map links.
// Additive to the Ghost Signal field renderer: no mission edits, save changes,
// collision edits, secret routes, imported assets, or replacement world artwork.

const properties = entry => Array.isArray(entry)
  ? Object.fromEntries(entry.map(x=>[x.name,x.value])) : (entry||{});

export function compileCampaignTransmissionMarkers(graph){
  if(!graph||!Array.isArray(graph.ids)||typeof graph.get!=='function')
    throw new TypeError('Campaign transmission markers require a validated source graph');
  const byMap=new Map();
  for(const id of graph.ids){
    const map=graph.get(id);
    const markers=map.layers.find(l=>l.name==='portals').objects.map(portal=>{
      const gates=properties(portal.properties);
      return Object.freeze({
        id:portal.name,
        x:portal.x,y:portal.y,
        requiresFlag:gates.requiresFlag??null,
        requiresNotFlag:gates.requiresNotFlag??null
      });
    });
    byMap.set(id,Object.freeze(markers));
  }
  function statesFor(mapId,flags={}){
    const list=byMap.get(mapId);
    if(!list)return Object.freeze([]);
    const valid=flags&&typeof flags==='object'&&!Array.isArray(flags)?flags:{};
    return Object.freeze(list.map(link=>Object.freeze({
      id:link.id,x:link.x,y:link.y,
      locked:!!((link.requiresFlag&&valid[link.requiresFlag]!==true)||
        (link.requiresNotFlag&&valid[link.requiresNotFlag]===true))
    })));
  }
  return Object.freeze({statesFor,mapIds:Object.freeze([...graph.ids])});
}

function pixel(ctx,fill,x,y,w,h){
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
}
function drawTransmission(ctx,marker){
  const {x,y,locked}=marker;
  // Four restrained native-pixel sci-fi fixtures. The glyph always stays
  // inside the authored 32x32 walkable portal tile.
  const shade=locked?'#594431':'#23535b';
  const bright=locked?'#c89a5e':'#91ccd0';
  const faint=locked?'#785836':'#3e858c';
  pixel(ctx,'#101820',x+5,y+23,22,3);
  pixel(ctx,shade,x+7,y+8,18,2);
  pixel(ctx,faint,x+7,y+11,18,1);
  pixel(ctx,shade,x+4,y+12,3,12);
  pixel(ctx,shade,x+25,y+12,3,12);
  pixel(ctx,bright,x+4,y+12,3,2);
  pixel(ctx,bright,x+25,y+12,3,2);
  pixel(ctx,faint,x+8,y+24,16,2);
  pixel(ctx,bright,x+9,y+20,3,2);
  pixel(ctx,bright,x+20,y+20,3,2);
  // Legible paired chevrons indicate inter-area travel, not a pickup.
  pixel(ctx,bright,x+11,y+14,4,2);
  pixel(ctx,bright,x+13,y+16,3,2);
  pixel(ctx,bright,x+11,y+18,4,2);
  pixel(ctx,bright,x+17,y+14,4,2);
  pixel(ctx,bright,x+19,y+16,3,2);
  pixel(ctx,bright,x+17,y+18,4,2);
  if(locked)pixel(ctx,'#c89a5e',x+15,y+8,2,2);
}

/**
 * Repaints only the current campaign field's base canvas and only when a
 * source gate actually changes. The pristine baked map remains recoverable.
 * No animation/frame allocations, original base tiles, UI skin or assets
 * are altered globally.
 */
export function createCampaignTransmissionPainter(graph){
  const compiled=compileCampaignTransmissionMarkers(graph);
  const painted=new WeakMap();
  function paint(game,flags={}){
    const id=game?.m?.id,source=graph.get(id);
    const base=game?.base;
    if(!source||!base||typeof base.getContext!=='function'||
       base.width!==source.width*32||base.height!==source.height*32)return false;
    const marks=compiled.statesFor(id,flags);
    if(!marks.length)return false;
    const signature=marks.map(m=>m.id+':'+(m.locked?'L':'O')).join('|');
    let record=painted.get(base);
    if(record?.signature===signature)return false;
    const documentRef=base.ownerDocument;
    if(!documentRef||typeof documentRef.createElement!=='function')return false;
    const ctx=base.getContext('2d');
    if(!ctx||typeof ctx.drawImage!=='function')return false;
    if(!record){
      const backup=documentRef.createElement('canvas');
      backup.width=base.width;backup.height=base.height;
      const backupCtx=backup.getContext('2d');
      if(!backupCtx||typeof backupCtx.drawImage!=='function')return false;
      backupCtx.drawImage(base,0,0);
      record={backup,signature:null};
      painted.set(base,record);
    }
    ctx.drawImage(record.backup,0,0);
    ctx.save?.();
    for(const marker of marks)drawTransmission(ctx,marker);
    ctx.restore?.();
    record.signature=signature;
    return true;
  }
  return Object.freeze({paint,statesFor:compiled.statesFor});
}
