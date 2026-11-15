// Noncanonical connected-field transaction for the existing Ghost Signal Game.
// Caller supplies the existing Game instance, authored mission factory, and RPG journal store.
// No writes to original Ghost Signal save keys. Commit is one journal write.
const copy=value=>structuredClone(value);
export function createConnectedFieldTravel({game,graph,missionFor,readJournal,writeJournal}){
  if(!game||!graph||!missionFor||!readJournal||!writeJournal)throw new Error('Connected travel: missing dependency');
  let busy=false;
  const transition=async(portalId)=>{
    if(busy||game.mode!=='play')return false;
    const source=game.m?.id;
    if(!graph.get(source))throw new Error('Connected travel: unknown current map');
    const destination=graph.destination(source,portalId);
    const oldJournal=copy(readJournal());
    const before=game.snapshot();
    const previousMission=game.m;
    busy=true;
    game.mode='transition';
    try{
      // Prepare everything before changing the live Game field.
      const mission=await missionFor(destination.mapId);
      if(!mission||mission.id!==destination.mapId)throw new Error('Connected travel: invalid destination mission');
      const journal=copy(oldJournal);
      journal.maps??={};
      journal.maps[source]=before;
      const prior=journal.maps[destination.mapId]??null;
      // Game.start is the existing renderer/collision/drone initialization path.
      game.start(mission,prior);
      if(!game.free(destination.x,destination.y))throw new Error('Connected travel: blocked arrival');
      Object.assign(game.player,{x:destination.x,y:destination.y,dir:destination.facing,moving:false});
      journal.mapId=destination.mapId;
      journal.maps[destination.mapId]=game.snapshot();
      // One durable journal write contains both maps and the current location.
      if(writeJournal(journal)!==true)throw new Error('Connected travel: journal write failed');
      game.mode='play';
      return true;
    }catch(error){
      // Reinitialize the previous map, then restore its exact snapshot.
      game.start(previousMission,before);
      game.mode='play';
      throw error;
    }finally{busy=false;}
  };
  return {transition,get busy(){return busy;}};
}
