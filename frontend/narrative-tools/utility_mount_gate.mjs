/** Source-only geometry contract for wall-mounted utilities, full-height
 * panels and lamps. Does not imply visual quality or gameplay acceptance. */
export function verifyUtilityMounts({map,runs,modules,lamps}={}){
 const problems=[];
 const fail=(code,id)=>problems.push({code,id});
 const int=Number.isSafeInteger;
 const valid=map&&int(map.w)&&int(map.h)&&map.w>0&&map.h>0&&map.tileSize===32&&Array.isArray(map.grid)&&map.grid.length===map.w*map.h&&map.grid.every(v=>v===0||v===2);
 if(!valid||![runs,modules,lamps].every(Array.isArray))return {pass:false,problems:[{code:'INVALID_INPUT'}]};
 const solid=(x,y)=>int(x)&&int(y)&&x>=0&&y>=0&&x<map.w&&y<map.h&&map.grid[y*map.w+x]===0;
 const cell=c=>Array.isArray(c)&&c.length===2&&c.every(int);
 const ids=new Set();
 for(const e of [...runs,...modules]){
  if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id))fail('BAD_ID',e?.id);else ids.add(e.id);
 }
 for(const e of runs){
  const path=e?.cells;
  if(!Array.isArray(path)||path.length<2||!path.every(cell)){fail('BAD_RUN',e?.id);continue;}
  const seen=new Set();
  for(let i=0;i<path.length;i++){
   const [x,y]=path[i],k=`${x},${y}`;
   if(!solid(x,y))fail('RUN_OFF_WALL',e.id);
   if(seen.has(k))fail('RUN_REPEATED_CELL',e.id);seen.add(k);
   if(i&&Math.abs(x-path[i-1][0])+Math.abs(y-path[i-1][1])!==1)fail('RUN_DISCONTINUITY',e.id);
  }
 }
 for(const e of modules){
  if(!cell(e?.origin)||!cell(e?.sourceSize)||e.sourceSize.some(n=>n<=0||n%32)){fail('BAD_MODULE',e?.id);continue;}
  const [x,y]=e.origin,[w,h]=e.sourceSize;
  if(x<0||y<0||x+w/32>map.w||y+h/32>map.h){fail('MODULE_OUT_OF_BOUNDS',e.id);continue;}
  for(let dy=0;dy<h/32;dy++)for(let dx=0;dx<w/32;dx++)if(!solid(x+dx,y+dy))fail('MODULE_OVER_WALKABLE',e.id);
 }
 const mounted=new Set();
 for(const e of lamps){const k=`${e?.x},${e?.y}`;if(!solid(e?.x,e?.y))fail('LAMP_OFF_WALL',k);if(mounted.has(k))fail('DUPLICATE_LAMP',k);mounted.add(k);}
 return {pass:problems.length===0,problems};
}
