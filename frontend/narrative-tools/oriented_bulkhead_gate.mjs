/** Source-only QA: a one-cell gate has opposing approaches and solid jambs.
 * State-art rectangles are deliberately limited to solid cells, away from the
 * passage and approaches. The existing engine owns the animated door leaf.
 * This is not a replacement for rendered or mobile QA. */
export function verifyOrientedBulkhead({map,gate,axis,stateArt=[]}={}){
 const problems=[];
 const fail=code=>problems.push(code);
 const int=Number.isSafeInteger;
 if(!map||!int(map.w)||!int(map.h)||map.w<3||map.h<3||map.tileSize!==32||
    !Array.isArray(map.grid)||map.grid.length!==map.w*map.h||map.grid.some(v=>v!==0&&v!==2)||
    !gate||!int(gate.tx)||!int(gate.ty)||!['east-west','north-south'].includes(axis)||!Array.isArray(stateArt)){
   fail('INVALID_GATE_INPUT');return {pass:false,problems};
 }
 const inside=(x,y)=>x>=0&&y>=0&&x<map.w&&y<map.h;
 const floor=(x,y)=>inside(x,y)&&map.grid[y*map.w+x]===2;
 const {tx:x,ty:y}=gate;
 const along=axis==='east-west'?[[-1,0],[1,0]]:[[0,-1],[0,1]];
 const across=axis==='east-west'?[[0,-1],[0,1]]:[[-1,0],[1,0]];
 if(!floor(x,y))fail('GATE_NOT_OPENABLE');
 if(!along.every(([a,b])=>floor(x+a,y+b)))fail('APPROACH_MISMATCH');
 if(!across.every(([a,b])=>inside(x+a,y+b)&&!floor(x+a,y+b)))fail('JAMB_MISMATCH');
 for(const r of stateArt){
   if(!r||![r.x,r.y,r.w,r.h].every(int)||r.x<0||r.y<0||r.w<1||r.h<1||r.x+r.w>map.w*32||r.y+r.h>map.h*32){fail('INVALID_STATE_ART');continue;}
   for(let ty=Math.floor(r.y/32);ty<=Math.floor((r.y+r.h-1)/32);ty++)
     for(let tx=Math.floor(r.x/32);tx<=Math.floor((r.x+r.w-1)/32);tx++)
       if(floor(tx,ty))fail('STATE_ART_OVERLAPS_PASSAGE');
 }
 return {pass:problems.length===0,problems:[...new Set(problems)]};
}
