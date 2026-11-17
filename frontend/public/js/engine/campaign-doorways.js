// Owner-authored reciprocal portals become visible, physical field objects.
// Reuses the EXISTING Ghost Signal door/hatch/bulkhead pixel art renderer.
// A doorway is an interaction, never an invisible step-on teleport.
const props = raw => Array.isArray(raw) ?
  Object.fromEntries(raw.map(p=>[p.name,p.value])) : (raw||{});
const types=new Set(['bulkhead','hatch','exit']);
const prompts=Object.freeze({bulkhead:'BULKHEAD',hatch:'HATCH',exit:'ELEVATOR / EXIT'});
const idValid=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(s);
const blocked=properties=>!types.has(properties.portalStyle);
export function compileCampaignDoorways(graph){
  if(!graph||!Array.isArray(graph.ids)||typeof graph.get!=='function')
    throw new TypeError('Campaign doorways need the validated private route graph');
  const maps=new Map();
  for(const areaId of graph.ids){
    const area=graph.get(areaId),portals=area?.layers?.find(l=>l.name==='portals')?.objects;
    if(!Array.isArray(portals))throw new TypeError('Campaign doorways need reciprocal source portals');
    const doorways=portals.map(portal=>{
      const p=props(portal.properties);
      const style=p.portalStyle??'bulkhead';
      if(!idValid(portal.name)||!types.has(style)||
         (p.portalArt!==undefined&&!/^[a-z][a-z0-9_]{0,63}$/.test(p.portalArt)))
        throw new TypeError('Campaign doorway style, art binding or source identifier is invalid');
      return Object.freeze({
        id:'campaign_door_'+portal.name,
        // Runtime sprite art uses the same original 32x32 field entity path.
        type:style,portalId:portal.name,portalArt:p.portalArt??null,
        tx:portal.x/32,ty:portal.y/32,
        w:1,h:1,interact:true,solid:false,
        requiresFlag:p.requiresFlag??null,
        requiresNotFlag:p.requiresNotFlag??null,
        prompt:prompts[style]
      });
    });
    const originalIds=new Set((area.entities||[]).map(e=>e.id));
    if(doorways.some(e=>originalIds.has(e.id))||
       new Set(doorways.map(e=>e.id)).size!==doorways.length)
      throw new TypeError('Campaign doorway collides with a source entity');
    maps.set(areaId,Object.freeze(doorways));
  }
  const forArea=id=>(maps.get(id)||Object.freeze([])).map(door=>({...door}));
  const canOpen=(door,flags={})=>{
    const safe=flags&&typeof flags==='object'&&!Array.isArray(flags)?flags:{};
    return !!door&&(!door.requiresFlag||safe[door.requiresFlag]===true)&&
      (!door.requiresNotFlag||safe[door.requiresNotFlag]!==true);
  };
  const label=(door,flags)=>!canOpen(door,flags)?
    'SEALED '+door.prompt:'OPEN '+door.prompt;
  return Object.freeze({forArea,canOpen,label});
}
