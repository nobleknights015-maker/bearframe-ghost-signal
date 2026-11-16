// Validated, noncanonical Tiled JSON map graph for the existing Ghost Signal field runtime.
// No renderer, mission or legacy save changes. Tiles are native 32px, four-cardinal only.
const DIRECTIONS=new Set(['up','down','left','right']);
const isId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]*$/.test(x);
const fail=m=>{throw new Error('Connected map: '+m);};
const validFlag=x=>typeof x==='string'&&/^[a-z][a-z0-9-]*$/.test(x);
const props=p=>Array.isArray(p)?Object.fromEntries(p.map(v=>[v.name,v.value])):p;
export function compileConnectedWorld(maps){
  if(!Array.isArray(maps)||maps.length<2)fail('at least two maps required');
  const byId=new Map();
  for(const map of maps){
    if(!isId(map.id)||byId.has(map.id))fail('duplicate/invalid map id');
    if(map.orientation!=='orthogonal'||map.tilewidth!==32||map.tileheight!==32||
       !Number.isInteger(map.width)||!Number.isInteger(map.height)||map.width<3||map.height<3)
      fail('invalid Tiled dimensions '+map.id);
    const ground=map.layers?.find(l=>l.name==='collision'&&l.type==='tilelayer');
    if(!ground||!Array.isArray(ground.data)||ground.data.length!==map.width*map.height||
       ground.data.some(v=>v!==0&&v!==1))fail('invalid collision mask '+map.id);
    const portals=map.layers?.find(l=>l.name==='portals'&&l.type==='objectgroup')?.objects;
    if(!Array.isArray(portals)||!portals.length)fail('missing portals '+map.id);
    const ids=new Set();
    const occupiedTiles=new Set();
    for(const p of portals){
      if(!isId(p.name)||ids.has(p.name))fail('invalid/duplicate portal '+map.id);
      ids.add(p.name);
      if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x%32||p.y%32)
        fail('portal must be tile-aligned');
      const tileKey=p.x+','+p.y;
      if(occupiedTiles.has(tileKey))fail('overlapping portal tiles '+map.id+'/'+p.name);
      occupiedTiles.add(tileKey);
      if(!p.properties||!isId(props(p.properties).toMap)||!isId(props(p.properties).toPortal)||
         !DIRECTIONS.has(props(p.properties).facing))fail('invalid destination '+p.name);
      const gate=props(p.properties).requiresFlag;
      if(gate!==undefined&&!validFlag(gate))fail('invalid portal flag '+p.name);
      const absent=props(p.properties).requiresNotFlag;
      if(absent!==undefined&&(!validFlag(absent)||absent===gate))fail('invalid inverse portal flag '+p.name);
    }
    byId.set(map.id,map);
  }
  const walkable=(m,x,y)=>{
    const tx=Math.floor(x/32),ty=Math.floor(y/32);
    return tx>=0&&ty>=0&&tx<m.width&&ty<m.height&&
      m.layers.find(l=>l.name==='collision').data[ty*m.width+tx]===0;
  };
  for(const map of maps)for(const p of map.layers.find(l=>l.name==='portals').objects){
    const target=byId.get(props(p.properties).toMap);
    const reverse=target?.layers.find(l=>l.name==='portals')?.objects.find(q=>q.name===props(p.properties).toPortal);
    if(!reverse||props(reverse.properties).toMap!==map.id||props(reverse.properties).toPortal!==p.name)
      fail('nonreciprocal portal '+map.id+'/'+p.name);
    for(const [m,portal] of [[map,p],[target,reverse]]){
      if(!walkable(m,portal.x+16,portal.y+16))fail('unsafe portal tile '+m.id+'/'+portal.name);
      const sx=portal.x+16,sy=portal.y+16;
      // Existing Game.free uses a 12x10 feet box, so validate its four corners.
      if(![[sx-6,sy-8],[sx+6,sy-8],[sx-6,sy+2],[sx+6,sy+2]].every(([x,y])=>walkable(m,x,y)))
        fail('unsafe player footprint '+m.id+'/'+portal.name);
    }
  }
  return Object.freeze({
    ids:Object.freeze([...byId.keys()]),
    get(id){return byId.get(id)||null;},
    destination(mapId,portalId){
      const m=byId.get(mapId),p=m?.layers.find(l=>l.name==='portals')?.objects.find(x=>x.name===portalId);
      if(!p)fail('unknown portal '+mapId+'/'+portalId);
      const to=byId.get(props(p.properties).toMap);
      const arrival=to.layers.find(l=>l.name==='portals').objects.find(x=>x.name===props(p.properties).toPortal);
      return Object.freeze({mapId:to.id,portalId:arrival.name,x:arrival.x+16,y:arrival.y+16,facing:props(p.properties).facing,...(props(p.properties).requiresFlag?{requiresFlag:props(p.properties).requiresFlag}:{}),...(props(p.properties).requiresNotFlag?{requiresNotFlag:props(p.properties).requiresNotFlag}:{})});
    }
  });
}
