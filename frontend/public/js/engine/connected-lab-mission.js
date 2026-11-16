// Noncanonical Tiled-authored expedition rooms mounted on the real Ghost Signal Game.
// Independent of the canonical Director's Cut scenes and the original Ghost Signal missions.
const tile=32;
const entityFor=id=>id==='staging'?
  [{id:'power-switch',type:'terminal',tx:3,ty:2,interact:true}]:
  [{id:'supply-cache',type:'cell',tx:3,ty:2,interact:true},
   {id:'field-archive',type:'terminal',tx:5,ty:3,interact:true}];
export function createConnectedLabMission(map,{onPortal,onInteract,getWorld}={}){
  if(!map||!['staging','annex'].includes(map.id))throw new Error('Unknown expedition test map');
  const w=map.width,h=map.height;
  const collision=map.layers.find(l=>l.type==='tilelayer'&&l.name==='collision').data;
  const portals=map.layers.find(l=>l.type==='objectgroup'&&l.name==='portals').objects;
  const grid=Uint8Array.from(collision,v=>v===0?2:0);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!grid[y*w+x]){
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{
      const nx=x+dx,ny=y+dy;return nx>=0&&ny>=0&&nx<w&&ny<h&&grid[ny*w+nx]===2;
    });
    if(near)grid[y*w+x]=1;
  }
  return {
    id:map.id,title:'CONNECTED EXPEDITION / '+map.id.toUpperCase(),
    start:{x:2.5*tile,y:3.5*tile,dir:'right'},
    buildMap(){return {w,h,grid:new Uint8Array(grid)};},
    props:map.id==='staging'?[{t:'cable',x:2,y:4,w:4}]:[{t:'debris',x:5,y:2}],
    lamps:[{x:2,y:2},{x:5,y:3}],drones:[],
    entities(){return entityFor(map.id).map(e=>({...e}));},
    evidence:{},logs:{},
    objectives(g){
      const f=getWorld?.()?.flags||{};
      return [
        {t:'Activate the staging power relay',done:!!f['power-switch']},
        {t:'Recover the annex repair supply',done:!!f['supply-cache']},
        {t:'Use both area portals',done:!!f['visited-annex']&&!!f['returned-staging']},
        {t:'Restore power to unlock the service hatch',done:!!f['power-switch']}
      ];
    },
    objective(g){
      const f=getWorld?.()?.flags||{};
      if(map.id==='staging'&&!f['power-switch'])
        return 'Restore the relay. The upper service hatch is sealed until powered.';
      if(map.id==='staging')
        return f['returned-staging']?'Expedition routes recorded. Service hatch online.':
          'Upper service hatch online. Explore the annex or eastern doorway.';
      return f['supply-cache']?'Return through the western door or service hatch.':
        'Inspect the old supply cache. The upper service hatch also returns to staging.';
    },
    onStart(g){g.flags.lights=true;g.toast('CONNECTED WORLD TEST // '+map.id.toUpperCase(),3);},
    update(g,dt){
      if(g.mode!=='play'||g.player.hidden)return;
      const entry=portals.find(p=>Math.hypot(g.player.x-(p.x+16),g.player.y-(p.y+16))<10);
      onPortal?.(entry?.name||null);
    },
    onScan(){},onEvidence(){},onEcho(){},
    migrate(g){
      const flags=getWorld?.()?.flags||{};
      for(const e of g.ents)if(flags[e.id])e.gone=true;
    },
    doorOpen(){return true;},blocked(){return false;},
    label(e,g){
      if(e.id==='power-switch')return getWorld?.()?.flags?.['power-switch']?null:'ACTIVATE TEST RELAY';
      if(e.id==='supply-cache')return getWorld?.()?.flags?.['supply-cache']?null:'RECOVER OLD REPAIR SUPPLY';
      if(e.id==='field-archive')return 'READ EXPEDITION ARCHIVE';
      return null;
    },
    interact(e,g){onInteract?.(e,g);},
    ending(){return {title:'EXPEDITION TEST COMPLETE',lines:[]};}
  };
}
