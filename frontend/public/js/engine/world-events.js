// Pure, allowlisted RPG world-event reducer. No map JSON eval or hidden mutation.
// Campaign content may refer only to validated, stable event/flag/quest/item IDs.
const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(id);
const validState=x=>x&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>structuredClone(x);
const requireId=(value,kind)=>{if(!validId(value))throw new TypeError('Invalid '+kind);};
export function resolveWorldEvent(world,spec){
  if(!validState(world)||!validState(world.flags)||!validState(world.events)||
     !validState(world.inventory)||!validState(world.quests)||
     !validState(spec)||!Array.isArray(spec.conditions)||!Array.isArray(spec.effects))
    throw new TypeError('Invalid authored world event');
  requireId(spec.id,'event ID');
  if(world.events[spec.id])return Object.freeze({applied:false,reason:'already-completed',world:copy(world)});
  for(const condition of spec.conditions){
    if(!validState(condition))throw new TypeError('Invalid event condition');
    if(condition.type==='flagEquals'){
      requireId(condition.id,'condition flag');
      if(typeof condition.value!=='boolean')throw new TypeError('Invalid condition value');
      if(!!world.flags[condition.id]!==condition.value)
        return Object.freeze({applied:false,reason:'prerequisite',world:copy(world)});
    }else if(condition.type==='hasItem'){
      requireId(condition.id,'required item');
      if(!Number.isSafeInteger(condition.count)||condition.count<1)throw new TypeError('Invalid item requirement');
      if((world.inventory[condition.id]||0)<condition.count)
        return Object.freeze({applied:false,reason:'prerequisite',world:copy(world)});
    }else throw new TypeError('Unsupported world event condition');
  }
  const next=copy(world);
  // Validate and apply on a private copy; errors cannot partially mutate caller.
  for(const effect of spec.effects){
    if(!validState(effect))throw new TypeError('Invalid world event effect');
    if(effect.type==='setFlag'){
      requireId(effect.id,'flag ID');
      if(typeof effect.value!=='boolean')throw new TypeError('Invalid flag value');
      next.flags[effect.id]=effect.value;
    }else if(effect.type==='addItem'){
      requireId(effect.id,'item ID');
      if(!Number.isSafeInteger(effect.count)||effect.count<1||effect.count>9999)
        throw new TypeError('Invalid world reward count');
      const old=next.inventory[effect.id]||0;
      if(!Number.isSafeInteger(old)||old<0||old+effect.count>999999)
        throw new TypeError('Inventory capacity exceeded');
      next.inventory[effect.id]=old+effect.count;
    }else if(effect.type==='setQuest'){
      requireId(effect.id,'quest ID');
      if(!validId(effect.stage))throw new TypeError('Invalid quest stage');
      next.quests[effect.id]=effect.stage;
    }else throw new TypeError('Unsupported world event effect');
  }
  next.events[spec.id]=true;
  return Object.freeze({applied:true,reason:'committed',world:next});
}

// Noncanonical expedition content. Director's Cut v2 event tables are PRIVATE,
// and will be imported separately only after protected story schema validation.
export const CONNECTED_LAB_EVENTS=Object.freeze({
  'power-switch':Object.freeze({
    id:'power-switch',conditions:[],
    effects:[{type:'setFlag',id:'power-switch',value:true},
             {type:'setQuest',id:'expedition',stage:'power-restored'}]
  }),
  'supply-cache':Object.freeze({
    id:'supply-cache',conditions:[],
    effects:[{type:'setFlag',id:'supply-cache',value:true},
             {type:'addItem',id:'repair-kit',count:1},
             {type:'setQuest',id:'expedition',stage:'supply-recovered'}]
  })
});
