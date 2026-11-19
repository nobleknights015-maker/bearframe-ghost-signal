/**
 * Owner-art-safe structural check for source-sized machinery vs actual
 * authored collision. The owner-owned PNGs are deliberately NOT loaded here.
 *
 * The rule is conservative: fully solid machinery must occupy entirely solid
 * tile footprints. Floor decals and interactive 1-cell controls are not
 * machinery and are not required to block movement.
 *
 * Game: Aeon Circuit: The Silent Wake (original Ghost Signal engine).
 * Does not change runtime movement, art, mission, character or save behavior.
 */
export function verifySolidEquipmentArt({map, placements, tileSize=32}={}){
 const problems=[];
 const add=(code,id)=>problems.push({code,id:String(id??'unnamed')});
 const integer=Number.isSafeInteger;
 if(!map||!integer(map.w)||!integer(map.h)||map.w<1||map.h<1||
    !Array.isArray(map.grid)||map.grid.length!==map.w*map.h||
    map.grid.some(n=>!integer(n))||map.tileSize!==tileSize||
    !integer(tileSize)||tileSize<=0){
   add('INVALID_MAP',null);return {pass:false,problems,reviewStatus:'source-only'};
 }
 if(!Array.isArray(placements)){add('INVALID_PLACEMENTS',null);return {pass:false,problems,reviewStatus:'source-only'};}
 const ids=new Set();
 for(const prop of placements){
  const id=prop?.id;
  if(typeof id!=='string'||id.length===0||ids.has(id)){add('DUPLICATE_OR_INVALID_ID',id);continue;}
  ids.add(id);
  if(prop.role!=='solid-equipment')continue; // decals are visual/transparent
  if(!Array.isArray(prop.origin)||prop.origin.length!==2||
     !prop.origin.every(integer)||!Array.isArray(prop.sourceSize)||
     prop.sourceSize.length!==2||!prop.sourceSize.every(n=>integer(n)&&n>0)){
    add('INVALID_MACHINE_GEOMETRY',id);continue;
  }
  const [x,y]=prop.origin,[w,h]=prop.sourceSize;
  // Source image sizes stay in their original native pixel units; use ceil.
  const footprintWidth=Math.ceil(w/tileSize),footprintHeight=Math.ceil(h/tileSize);
  let invalid=false;
  for(let ty=y;ty<y+footprintHeight;ty++)for(let tx=x;tx<x+footprintWidth;tx++){
    if(tx<0||ty<0||tx>=map.w||ty>=map.h||
       map.grid[ty*map.w+tx]!==0)invalid=true;
  }
  if(invalid)add('EQUIPMENT_OVERLAPS_WALKABLE',id);
 }
 return {pass:problems.length===0,problems,reviewStatus:'source-only-not-running-frame-acceptance'};
}
