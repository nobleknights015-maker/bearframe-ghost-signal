// Unified-engine expedition fixture on the existing Ghost Signal field renderer.
// These rooms remain noncanonical QA content, never substitutes for authored areas.
import {compileConnectedWorld} from './connected-world.js';
import {createConnectedLabMission} from './connected-lab-mission.js';

const MAP_FILES=Object.freeze(['rpg-lab-staging.tmj','rpg-lab-annex.tmj']);
const NORMAL=Object.freeze({defaultMode:'normal',zones:Object.freeze([])});
const ANNEX=Object.freeze({defaultMode:'normal',zones:Object.freeze([
  Object.freeze({id:'annex-security',mode:'stealth',onDetection:'encounter',
    rect:Object.freeze({x:32,y:32,width:192,height:128})})
])});

async function loadMaps(){
  return Promise.all(MAP_FILES.map(async file=>{
    const response=await fetch(new URL('../../maps/'+file,import.meta.url));
    if(!response.ok)throw new Error('Unified expedition map unavailable: HTTP '+response.status);
    return response.json();
  }));
}

export async function createAeonConnectedField({
  getWorld=()=>({flags:{}}),onInteract,onUpdate,onPortal,readMaps=loadMaps
}={}){
  const hooks={getWorld,onInteract,onUpdate,onPortal};
  const graph=compileConnectedWorld(await readMaps());
  if(graph.ids.length!==2||!graph.get('staging')||!graph.get('annex'))
    throw new Error('Unified expedition requires the existing staging and annex maps');
  const missions=new Map();
  const missionForSync=mapId=>{
    if(missions.has(mapId))return missions.get(mapId);
    const map=graph.get(mapId);
    if(!map)throw new Error('Unknown unified expedition area');
    const mission=createConnectedLabMission(map,{
      getWorld:()=>hooks.getWorld?.(),
      onInteract:(e,g)=>hooks.onInteract?.(e,g),
      onPortal:portal=>hooks.onPortal?.(portal,currentGame)
    });
    let currentGame=null;
    // Only the additive unified fixture owns this patrol. Standalone connected
    // rooms and the original Ghost Signal missions retain their exact contents.
    if(mapId==='annex')mission.drones=[{
      artId:'old_sentry',start:[5,2],zone:[2,1,6,4],
      waypoints:[[5,2],[5,4],[3,4],[3,1],[5,1]]
    }];
    const baseUpdate=mission.update,baseMigrate=mission.migrate;
    const disableResolved=g=>{
      if(!hooks.getWorld?.()?.flags?.labResolved)return;
      for(const drone of g.drones||[]){
        drone.state='disabled';drone.t=1e9;drone.alert=0;drone.vis=false;
      }
    };
    mission.update=(g,dt)=>{
      currentGame=g;
      disableResolved(g);
      // The portal callback may synchronously enter transition mode. Never
      // begin an encounter or event in that same frame after leaving the area.
      baseUpdate(g,dt);
      if(g.mode==='play')hooks.onUpdate?.(g,dt);
    };
    mission.migrate=g=>{baseMigrate(g);disableResolved(g);};
    missions.set(mapId,mission);
    return mission;
  };
  graph.ids.forEach(missionForSync);
  return Object.freeze({
    graph,missionForSync,
    async missionFor(mapId){return missionForSync(mapId);},
    bind(callbacks={}){Object.assign(hooks,callbacks);},
    policyFor(mapId){
      if(!graph.get(mapId))throw new Error('Unknown unified expedition security area');
      return mapId==='annex'?ANNEX:NORMAL;
    },
    startLocation:Object.freeze({mapId:'staging',x:80,y:112,facing:'right'})
  });
}
