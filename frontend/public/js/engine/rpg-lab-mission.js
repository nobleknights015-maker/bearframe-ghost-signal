// Noncanonical playable test-sector map for Ghost Signal's actual field renderer.
// Deliberately not inserted into MISSIONS: the original side-story remains untouched.
import { compileAreaPolicy } from './area-policy.js';

export const LAB_TILE = 32;
export const LAB_POLICY_SPEC = Object.freeze({
  defaultMode:'normal',
  zones:[{ id:'security-perimeter', mode:'stealth', onDetection:'encounter',
    rect:{x:15*LAB_TILE,y:5*LAB_TILE,width:11*LAB_TILE,height:9*LAB_TILE} }]
});
export const LAB_POLICY = compileAreaPolicy(LAB_POLICY_SPEC);

const W=28,H=17;
const REGION = [
  [2,5,10,14],    // safe staging
  [11,8,14,10],   // narrow shared connection
  [15,5,25,14],   // hostile security sector
  [11,12,14,13],  // optional lower detour
];
export function createLabMap() {
  const grid=new Uint8Array(W*H);
  for(const [x0,y0,x1,y1] of REGION)
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) grid[y*W+x]=2;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(!grid[y*W+x]){
    outer:for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;
      if(xx>=0&&yy>=0&&xx<W&&yy<H&&grid[yy*W+xx]===2){grid[y*W+x]=1;break outer;}
    }
  }
  return {w:W,h:H,grid};
}
const prototypes=[
  {id:'archive',type:'terminal',tx:7,ty:5,solid:true,interact:true},
  {id:'salvage',type:'cell',tx:8,ty:12,interact:true},
  {id:'recharge',type:'pad',tx:5,ty:13},
  {id:'alcove',type:'locker',tx:17,ty:13,interact:true},
  {id:'relay',type:'terminal',tx:23,ty:7,solid:true,interact:true},
];
export function createLabMission(callbacks={}) {
  return {
    id:'rpg-lab',title:'ENGINE TEST SECTOR // NONCANONICAL',
    start:{x:5.5*LAB_TILE,y:9*LAB_TILE,dir:'right'},
    buildMap:createLabMap,
    props:[
      {t:'crate',x:3,y:5,solid:1},{t:'crate',x:9,y:14,solid:1},
      {t:'machine',x:20,y:5,w:2,h:1,solid:1},
      {t:'machine',x:19,y:11,w:2,h:2,solid:1},
      {t:'debris',x:15,y:12},{t:'cable',x:11,y:9,w:4},
    ],
    lamps:[{x:5,y:5},{x:9,y:5},{x:17,y:5},{x:24,y:5},{x:5,y:13},{x:24,y:13}],
    drones:[{start:[21,8],zone:[15,5,25,14],waypoints:[[21,8],[24,9],[24,12],[17,12],[17,7],[21,7]]}],
    entities(){return prototypes.map(e=>({...e}));},
    evidence:{},logs:{},
    objectives(g){return [
      {t:'Inspect the archive terminal',done:!!g.flags.labArchive},
      {t:'Collect the salvage supply',done:!!g.flags.labSalvage},
      {t:'Reach the security perimeter',done:!!g.flags.labEntered},
      {t:'Neutralize or bypass the sentry',done:!!g.flags.labResolved},
    ];},
    objective(g){
      if(!g.flags.labArchive) return 'Inspect the archive terminal in the staging room.';
      if(!g.flags.labEntered) return 'Cross into the security perimeter and observe the sentry.';
      if(!g.flags.labResolved) return 'Evade, disable, or confront the security sentry.';
      return 'Sector test complete. Open RPG FIELD RECORD to inspect your party.';
    },
    onStart(g){
      g.flags.lights=true;
      g.toast('RPG ENGINE LAB — NONCANONICAL · C / RPG FOR FIELD RECORD',5);
    },
    update(g,dt){ if(callbacks.onUpdate) callbacks.onUpdate(g,dt); },
    onScan(g,found,stunned){if(callbacks.onScan) callbacks.onScan(g,found,stunned);},
    onEvidence(){},onEcho(){},migrate(){},
    doorOpen(){return true;},
    blocked(){return false;},
    label(e,g){
      if(e.id==='archive') return 'READ FIELD ARCHIVE';
      if(e.id==='salvage') return g.flags.labSalvage?null:'COLLECT REPAIR SUPPLY';
      if(e.id==='relay') return g.flags.labRelay?'RELAY DISABLED':'DISABLE SECURITY RELAY';
      return null;
    },
    interact(e,g){if(callbacks.onInteract)callbacks.onInteract(e,g);},
    ending(){return {title:'TEST SECTOR COMPLETE',lines:['NONCANONICAL QA SECTOR']};}
  };
}
