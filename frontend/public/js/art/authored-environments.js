// Authored composition system for Ghost Signal's four expansion environments.
// Background styling is organized around actual mission routes and functional zones,
// not randomized texture soup. Purely visual: no collision, objectives or save changes.
const T=32;
const DESIGN={
 m3:{
  type:'surface',
  zones:[
   {r:[5,10,19,26],tone:'outpost'},
   {r:[40,10,52,22],tone:'relay'},
  ],
  paths:[
   [5,17,20,21],[17,16,47,20],[10,13,14,24],
   [44,11,48,20],[13,22,18,25],
  ],
  accent:'#67a898',
  sites:[
   {x:8,y:15,w:8,h:1,k:'command'},
   {x:11,y:21,w:6,h:1,k:'supply'},
   {x:43,y:11,w:7,h:1,k:'antenna'},
  ],
 },
 m4:{
  type:'ruins',
  zones:[
   {r:[5,13,18,29],tone:'camp'},
   {r:[33,10,43,22],tone:'transit'},
   {r:[46,14,58,28],tone:'rescue'},
  ],
  paths:[
   [6,18,26,22],[22,18,48,22],[46,17,55,22],
   [36,11,40,22],[12,21,16,28],
  ],
  accent:'#c0a175',
  sites:[
   {x:9,y:14,w:6,h:1,k:'command'},
   {x:35,y:11,w:6,h:1,k:'rail'},
   {x:48,y:25,w:7,h:1,k:'rescue'},
  ],
 },
 m5:{
  type:'storm',
  zones:[
   {r:[5,11,29,26],tone:'maintenance'},
   {r:[33,13,50,24],tone:'transit'},
   {r:[50,10,59,24],tone:'relay'},
  ],
  paths:[
   [6,17,31,21],[31,17,54,21],[52,12,57,21],
   [25,15,30,24],
  ],
  accent:'#8ca6be',
  sites:[
   {x:26,y:17,w:5,h:3,k:'gate'},
   {x:37,y:15,w:6,h:1,k:'rail'},
   {x:52,y:12,w:6,h:2,k:'antenna'},
  ],
 },
 m6:{
  type:'bunker',
  zones:[
   {r:[5,6,20,26],tone:'entry'},
   {r:[5,28,20,35],tone:'supplies'},
   {r:[22,6,40,15],tone:'observatory'},
   {r:[22,17,40,35],tone:'maintenance'},
   {r:[42,6,58,26],tone:'archive'},
   {r:[42,28,58,35],tone:'receiver'},
  ],
  paths:[
   [6,18,21,22],[21,18,42,22],[41,18,56,22],
   [28,16,34,24],[47,27,53,32],[40,27,44,31]
  ],
  accent:'#6fa7a4',
  sites:[
   {x:7,y:16,w:6,h:1,k:'entry'},
   {x:27,y:9,w:8,h:1,k:'observatory'},
   {x:47,y:13,w:9,h:1,k:'archive'},
   {x:48,y:31,w:8,h:1,k:'receiver'},
  ],
 }
};
const inRect=(x,y,r)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];
const noise=(x,y,s=1)=>((Math.imul(x+117,73856093)^Math.imul(y+19,19349663)^s)>>>0)%100;
const PALETTE={
 surface:{
  raw:['#293934','#263530'],path:['#404744','#424945'],
  outpost:['#35413d','#394540'],relay:['#2d4140','#324744'],
  seam:'#4a5550',speck:'#566457'
 },
 ruins:{
  raw:['#343c37','#323a36'],path:['#494b45','#4c4e47'],
  camp:['#40473e','#424b41'],transit:['#404a46','#3c4541'],rescue:['#474b43','#44473d'],
  seam:'#59635d',speck:'#6a6c5c'
 },
 storm:{
  raw:['#222d37','#23313a'],path:['#3c4750','#404a54'],
  maintenance:['#313e46','#303e49'],transit:['#354752','#364450'],relay:['#30424b','#344650'],
  seam:'#52606a',speck:'#61737a'
 },
 bunker:{
  raw:['#222c32','#232e34'],path:['#313d43','#303b42'],
  entry:['#2a343b','#2b373e'],supplies:['#333b36','#323b37'],
  observatory:['#283b40','#2c3a3e'],maintenance:['#333b41','#313d43'],
  archive:['#343c3d','#313e3e'],receiver:['#293b3d','#2d3e40'],
  seam:'#46575d',speck:'#5c7076'
 }
};
function R(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(x,y,w,h);}
export function isAuthored(m){return !!DESIGN[m?.id];}
export function authoredSite(m){return DESIGN[m?.id]||null;}
export function paintAuthoredFloor(c,m,x,y,at){
 const scene=DESIGN[m.id],pal=PALETTE[scene.type],n=noise(x,y,19);
 let tone='raw';
 const zone=scene.zones.find(z=>inRect(x,y,z.r));if(zone)tone=zone.tone;
 if(scene.paths.some(p=>inRect(x,y,p)))tone='path';
 const color=(pal[tone]||pal.raw)[n%2],X=x*T,Y=y*T;
 R(c,color,X,Y,T,T);
 // Deliberately quiet surfaces; small detail, not a tiled collage.
 if(scene.type==='bunker'){
  R(c,pal.seam,X,Y,T,1);
  R(c,'rgba(0,0,0,.24)',X+T-1,Y,1,T);
  if(n%5===0)for(const [ax,ay]of [[5,5],[26,5],[5,26],[26,26]])R(c,'#647178',X+ax,Y+ay,2,2);
 }else if(tone==='path'){
  // Larger continuous ground plane. No per-cell contrast seams.
  if(n%9===0)R(c,pal.speck,X+10+(n%9),Y+14,5,1);
 }else if(n<12){
  R(c,pal.speck,X+8+(n%10),Y+7+(n%11),2,2);
  R(c,pal.speck,X+18,Y+21,1,3);
 }
 if(at(x,y-1)===1)R(c,'rgba(0,0,0,.18)',X,Y,T,4);
 return true;
}
export function paintAuthoredWall(c,m,x,y,at){
 const scene=DESIGN[m.id],X=x*T,Y=y*T;
 const indoor=scene.type==='bunker';
 R(c,indoor?'#172228':'#1b2826',X,Y,T,T);
 if(at(x,y+1)===2){
  R(c,indoor?'#43535a':'#3c504a',X,Y+2,T,22);
  R(c,indoor?'#677982':'#657568',X,Y+2,T,2);
  R(c,'#141b20',X,Y+24,T,8);
  if(noise(x,y,33)%4===0) {
   R(c,indoor?'#25383d':'#2d4039',X+6,Y+8,20,10);
   R(c,'#6b8588',X+8,Y+11,16,2);
  }
 } else {
  if(at(x-1,y)===2)R(c,'#5e6b69',X,Y,3,T);
  if(at(x+1,y)===2)R(c,'#5e6b69',X+T-3,Y,3,T);
  if(at(x,y-1)===2)R(c,'#53605e',X,Y,T,3);
 }
 return true;
}
export function paintAuthoredSites(c,m,at){
 const scene=DESIGN[m.id];if(!scene)return 0;
 const accent=scene.accent;let count=0;
 for(const s of scene.sites){
   const X=s.x*T,Y=s.y*T,W=s.w*T,H=s.h*T;
   // Station boundaries and titles are on top of specific authored work pads.
   // They don't imply new collisions, doors or teleport targets.
   c.save();c.strokeStyle=accent;c.globalAlpha=.45;c.lineWidth=2;
   c.strokeRect(X+3,Y+3,W-6,H-6);
   c.restore();
   R(c,accent,X+6,Y+6,Math.min(W-12,42),2);
   R(c,'#162125',X+6,Y+10,Math.min(W-12,30),3);
   count++;
 }
 return count;
}
export function drawAuthoredMachine(c,m,p){
 // Replace giant "floating wall" machines with grounded workbench modules.
 // Occupies the *same* solid collision footprint supplied by the mission.
 const X=p.x*T,Y=p.y*T,W=(p.w||1)*T,H=(p.h||1)*T;
 if(p.t==='machine'){
  R(c,'rgba(0,0,0,.28)',X+4,Y+H-2,W-8,6);
  R(c,'#141d23',X+2,Y+6,W-4,H-10);
  R(c,'#43545b',X+4,Y+7,W-8,4);
  R(c,'#2c3c45',X+5,Y+12,W-10,H-23);
  // Segmented actual modules, no repeated full-scale panel art as walls.
  for(let k=0;k<(p.w||1);k++){
    const bx=X+k*T;
    R(c,'#111d24',bx+6,Y+17,20,Math.max(8,H-34));
    R(c,k%3===0?'#82beb3':'#b3a47a',bx+9,Y+21,14,3);
    R(c,'#364c50',bx+9,Y+28,14,2);
    R(c,'#506469',bx+7,Y+H-17,18,5);
  }
  R(c,'#131c20',X+5,Y+H-9,W-10,7);
  return true;
 }
 if(p.t==='rack'){
  R(c,'rgba(0,0,0,.35)',X+4,Y+H-1,W-8,5);
  R(c,'#17262c',X+3,Y+5,W-6,H-10);
  R(c,'#57686c',X+3,Y+5,W-6,2);
  for(let py=Y+13;py<Y+H-10;py+=14){
   R(c,'#283f45',X+7,py,W-14,8);
   R(c,'#72a9a7',X+10,py+3,4,2);
   R(c,'#a99a68',X+17,py+3,4,2);
  }
  return true;
 }
 return false;
}
