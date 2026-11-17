// Ordered, author-reviewed mandatory campaign combat gates.
// A narrative scene can require several distinct authored victories before
// it completes. Historical opening-world mandatoryCombat remains supported.
// No enemies, placement, narrative decisions or rewards are generated here.
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(x)&&
  !['__proto__','prototype','constructor'].includes(x);
const fail=message=>{throw new Error('Campaign encounter gates: '+message);};

export function compileCampaignEncounterGates(worldSpec,content){
  if(!worldSpec||!content||!Array.isArray(content.scenes)||
     !Array.isArray(content.encounters))
    fail('source contract is incomplete');
  if(worldSpec.mandatoryCombat!==undefined&&worldSpec.mandatoryCombats!==undefined)
    fail('specify either legacy mandatoryCombat or ordered mandatoryCombats, not both');
  let source=[];
  if(worldSpec.mandatoryCombats!==undefined){
    if(!Array.isArray(worldSpec.mandatoryCombats)||
       worldSpec.mandatoryCombats.length>512)
      fail('mandatoryCombats must be a bounded authored array');
    source=worldSpec.mandatoryCombats;
  }else if(worldSpec.mandatoryCombat!==undefined)source=[worldSpec.mandatoryCombat];
  const scenes=new Set(content.scenes.map(s=>s.id));
  const encounters=new Set(content.encounters.map(e=>e.id));
  const seen=new Set();
  const gates=[];
  for(const g of source){
    if(!g||!id(g.sceneId)||!scenes.has(g.sceneId)||
       !id(g.encounterId)||!encounters.has(g.encounterId)||
       g.saveOutcomeRequired!=='victory'||seen.has(g.encounterId))
      fail('invalid, unauthored or duplicate mandatory encounter');
    seen.add(g.encounterId);
    gates.push(Object.freeze({
      sceneId:g.sceneId,encounterId:g.encounterId,
      saveOutcomeRequired:'victory'
    }));
  }
  const ordered=Object.freeze(gates);
  const pendingForScene=(sceneId,world)=>{
    for(const gate of ordered)
      if(gate.sceneId===sceneId&&
         world?.encounters?.[gate.encounterId]?.outcome!=='victory')return gate;
    return null;
  };
  return Object.freeze({
    ordered,
    forScene:sceneId=>Object.freeze(ordered.filter(g=>g.sceneId===sceneId)),
    pendingForScene,
    canComplete:(sceneId,world)=>pendingForScene(sceneId,world)===null
  });
}
