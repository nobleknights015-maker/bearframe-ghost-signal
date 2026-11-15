import {renderRig} from './machine-rig.js';
// Frame-local attachment points use the same evaluated transforms as the baked image.
export function battleMetadata(rig,set){
 if(rig?.battleSpec?.version!==1)return undefined;
 const sockets=rig.battleSpec.sockets||[],frames=[];
 for(const direction of set.dirs)for(const a of set.anims)for(let index=0;index<a.frames;index++){const edited=set.edited?.has(direction+'|'+a.name+'|'+index);frames.push({direction,animation:a.name,index,...(edited?{points:null,requiresReview:true}:{points:renderRig(null,rig,direction,a.type,index,a.frames,set.fw,set.fh,{sockets})})});}
 return {version:1,role:rig.battleSpec.role,eventSockets:rig.battleSpec.eventSockets,poses:rig.battleSpec.poses,coordinateSpace:'frame-pixels',source:'procedural-rig; hand-edited frames require attachment review',frames,localEffects:'attack emission is baked; projectiles and damage belong to the consumer'};
}
