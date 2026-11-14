// Only extends known older lab saves with non-item party metadata.
// Do not grant equipment, replay item pickups, rewrite quest progress or alter coordinates.
const copy=x=>JSON.parse(JSON.stringify(x));
const legacy=Object.freeze({
  sleeper:{lineage:'sleeper',skills:['pulse','guard']},
  echo:{lineage:'echo',skills:['repair','guard']}
});
export function migrateLabWorld(world){
  if(!world || typeof world!=='object' || !Array.isArray(world.party))
    throw new TypeError('Invalid old RPG lab world');
  const next=copy(world);
  for(const actor of next.party){
    const expected=legacy[actor.id];
    if(!expected)continue;
    if(actor.lineage===undefined)actor.lineage=expected.lineage;
    if(actor.skills===undefined)actor.skills=[...expected.skills];
  }
  return next;
}
