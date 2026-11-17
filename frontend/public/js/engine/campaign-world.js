// Data-driven campaign map graph and Ghost Signal mission adapter.
// PRIVATE campaign geometry/actors/story triggers are installed offline, never in source.
// Preserves the original Game, UI, saves, and noncanonical engine test routes.
const dir = new Set(['up','down','left','right']);
const idOk = x => typeof x==='string' && /^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(x) &&
  !['__proto__','prototype','constructor'].includes(x);
const props = x => Array.isArray(x) ? Object.fromEntries(x.map(y=>[y.name,y.value])) : (x||{});
const fail = msg => {throw new Error('Campaign world: '+msg);};
const inside = (m,x,y) => x>=0 && y>=0 && x<m.width*32 && y<m.height*32;
const bounds = (m,x,y,w,h) => [x,y,w,h].every(Number.isInteger) && w>0 && h>0 && x>=0 && y>=0 && x+w<=m.width*32 && y+h<=m.height*32;
const walkable=(m,x,y)=>{
  if(!inside(m,x,y))return false;
  const collision=m.layers.find(l=>l.name==='collision').data;
  return collision[Math.floor(y/32)*m.width+Math.floor(x/32)]===0;
};
const feetSafe=(m,x,y)=>[[x-6,y-8],[x+6,y-8],[x-6,y+2],[x+6,y+2]].every(([a,b])=>walkable(m,a,b));
const portalAt=(m,id)=>m.layers.find(l=>l.name==='portals').objects.find(p=>p.name===id);
const validateObjects=(m,objs,label)=>{
  if(!Array.isArray(objs))fail('invalid '+label+' '+m.id);
  const ids=new Set();
  for(const o of objs){
    if(!idOk(o.id)||ids.has(o.id))fail('invalid or duplicate '+label+' id '+m.id);
    ids.add(o.id);
    if(label==='entity'){
      if(!Number.isInteger(o.tx)||!Number.isInteger(o.ty)||o.tx<1||o.ty<1||
        o.tx>=m.width-1||o.ty>=m.height-1||!walkable(m,o.tx*32+16,o.ty*32+16))fail('unsafe entity '+o.id);
      if(!['terminal','cell','note','npc','crate','door'].includes(o.type))fail('unknown entity type '+o.id);
      if(o.trigger!==undefined&&!idOk(o.trigger))fail('invalid entity trigger '+o.id);
    } else {
      if(!bounds(m,o.x,o.y,o.width,o.height)||!idOk(o.trigger)||
         (o.sceneId!==undefined&&!idOk(o.sceneId)))fail('invalid trigger '+o.id);
      if(o.requiresFlag!==undefined&&!idOk(o.requiresFlag))fail('invalid trigger prerequisite '+o.id);
      if(o.requiresNotFlag!==undefined&&!idOk(o.requiresNotFlag))fail('invalid negative prerequisite '+o.id);
    }
  }
};
export function compileCampaignWorld(world){
  if(!world||world.schemaVersion!==1||!Array.isArray(world.maps)||!world.maps.length||
     !idOk(world.startArea)||!idOk(world.campaignRevision)&&!Number.isInteger(world.campaignRevision))fail('invalid campaign structure');
  const byId=new Map();
  for(const map of world.maps){
    if(!idOk(map.id)||byId.has(map.id))fail('duplicate/invalid area id');
    if(!Number.isInteger(map.width)||!Number.isInteger(map.height)||map.width<6||map.height<6||
       map.orientation!=='orthogonal'||map.tilewidth!==32||map.tileheight!==32)fail('invalid dimensions '+map.id);
    const col=map.layers?.find(l=>l.type==='tilelayer'&&l.name==='collision');
    const portals=map.layers?.find(l=>l.type==='objectgroup'&&l.name==='portals')?.objects;
    if(!Array.isArray(col?.data)||col.data.length!==map.width*map.height||col.data.some(x=>x!==0&&x!==1)||
       !Array.isArray(portals))fail('invalid layers '+map.id);
    if(!map.start||!dir.has(map.start.dir)||!feetSafe(map,map.start.x,map.start.y))fail('unsafe start '+map.id);
    validateObjects(map,map.entities||[],'entity');validateObjects(map,map.triggers||[],'trigger');
    const seen=new Set(),tiles=new Set();
    for(const p of portals){
      const target=props(p.properties);
      if(!idOk(p.name)||seen.has(p.name)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x%32||p.y%32||
         p.width!==32||p.height!==32||!feetSafe(map,p.x+16,p.y+16)||!idOk(target.toMap)||
         !idOk(target.toPortal)||!dir.has(target.facing))fail('invalid portal '+map.id+'/'+p.name);
      if((target.requiresFlag!==undefined&&!idOk(target.requiresFlag))||
         (target.requiresNotFlag!==undefined&&!idOk(target.requiresNotFlag))||
         (target.requiresFlag&&target.requiresNotFlag&&target.requiresFlag===target.requiresNotFlag))
        fail('invalid gate '+p.name);
      const tile=p.x+','+p.y;
      if(tiles.has(tile))fail('overlapping portals '+map.id);
      seen.add(p.name);tiles.add(tile);
    }
    byId.set(map.id,map);
  }
  if(!byId.has(world.startArea))fail('missing campaign start area');
  for(const map of world.maps)for(const p of map.layers.find(l=>l.name==='portals').objects){
    const target=props(p.properties),other=byId.get(target.toMap),inverse=other&&portalAt(other,target.toPortal);
    if(!inverse||props(inverse.properties).toMap!==map.id||props(inverse.properties).toPortal!==p.name)
      fail('nonreciprocal route '+map.id+'/'+p.name);
  }
  const start=world.maps.find(x=>x.id===world.startArea);
  return Object.freeze({
    ids:Object.freeze([...byId.keys()]),
    get:id=>byId.get(id)||null,
    startLocation:Object.freeze({mapId:start.id,x:start.start.x,y:start.start.y,facing:start.start.dir}),
    destination(mapId,portalId){
      const m=byId.get(mapId),p=m&&portalAt(m,portalId);
      if(!p)fail('unknown portal '+mapId+'/'+portalId);
      const v=props(p.properties),q=portalAt(byId.get(v.toMap),v.toPortal);
      return Object.freeze({mapId:v.toMap,portalId:q.name,x:q.x+16,y:q.y+16,facing:v.facing,
        ...(v.requiresFlag?{requiresFlag:v.requiresFlag}:{}),
        ...(v.requiresNotFlag?{requiresNotFlag:v.requiresNotFlag}:{})});
    }
  });
}

export function createCampaignMissionFactory(world,{getWorld=()=>({}),onPortal=()=>{},onInteract=()=>{},
  onTrigger=()=>{},onEnter=()=>{},onUpdate=()=>{}}={}){
  const graph=compileCampaignWorld(world),missions=new Map();
  const missionForSync=id=>{
    if(missions.has(id))return missions.get(id);
    const source=graph.get(id);
    if(!source)fail('unknown mission '+id);
    const col=source.layers.find(l=>l.name==='collision').data;
    const grid=Uint8Array.from(col,x=>x?0:2),w=source.width,h=source.height;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!grid[y*w+x]&&
      [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>a>=0&&b>=0&&a<w&&b<h&&grid[b*w+a]===2))grid[y*w+x]=1;
    const portals=source.layers.find(l=>l.name==='portals').objects;
    let lastPortal=null,lastTrigger=null;
    const mission={
      id:source.id,title:source.name,
      start:{...source.start},
      buildMap(){return {w,h,grid:new Uint8Array(grid)};},
      props:source.props||[],lamps:source.lamps||[],drones:source.drones||[],
      entities(){return (source.entities||[]).map(x=>({...x}));},
      evidence:{},logs:{},
      objectives(){return (source.objectives||[]).map(x=>({t:x.text,done:!!getWorld()?.flags?.[x.doneFlag]}));},
      objective(){return source.objective||'Explore the area';},
      onStart(g){onEnter(source,g);},
      update(g,dt){
        if(g.mode!=='play'||g.player.hidden)return;
        const x=g.player.x,y=g.player.y;
        const entry=portals.find(p=>Math.hypot(x-(p.x+16),y-(p.y+16))<10);
        if(!entry){lastPortal=null;onPortal(null,g);}
        else if(entry.name!==lastPortal){lastPortal=entry.name;onPortal(entry.name,g);}
        if(g.mode!=='play')return;
        const hit=(source.triggers||[]).find(t=>x>=t.x&&x<t.x+t.width&&y>=t.y&&y<t.y+t.height&&
          (!t.requiresFlag||getWorld()?.flags?.[t.requiresFlag]===true)&&
          (!t.requiresNotFlag||getWorld()?.flags?.[t.requiresNotFlag]!==true));
        if(!hit)lastTrigger=null;
        else if(hit.id!==lastTrigger){lastTrigger=hit.id;onTrigger(hit,g);}
        if(g.mode==='play')onUpdate(g,dt);
      },
      migrate(g){
        const flags=getWorld()?.flags||{};
        for(const e of g.ents)if(e.hideAfterFlag&&flags[e.hideAfterFlag])e.gone=true;
      },
      doorOpen(id){const e=(source.entities||[]).find(e=>e.id===id);
        return !e?.requiresFlag||getWorld()?.flags?.[e.requiresFlag]===true;},
      blocked(){return false;},
      label(e){if(e.hideAfterFlag&&getWorld()?.flags?.[e.hideAfterFlag])return null;
        return e.label||e.id.toUpperCase().replaceAll('_',' ');},
      interact(e,g){onInteract(e,g);},
      onScan(){},onEvidence(){},onEcho(){},
      ending(){return {title:'FIELD RECORD',lines:[]}}};
    missions.set(id,mission);return mission;
  };
  for(const id of graph.ids)missionForSync(id);
  return Object.freeze({graph,missionForSync,missionFor:async id=>missionForSync(id),
    get:id=>graph.get(id),destination:(mapId,portalId)=>graph.destination(mapId,portalId),
    startLocation:graph.startLocation,
    policyFor(id){const m=graph.get(id);if(!m)fail('unknown security area '+id);
      return {defaultMode:m.security?.defaultMode||'normal',zones:m.security?.zones||[]};}
  });
}