// Content-agnostic narrative transactions. Private authored records are installed
// offline; no screenplay, campaign identifiers, or executable strings ship here.
const copy=value=>structuredClone(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const key=value=>typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(value)&&
  !['__proto__','prototype','constructor'].includes(value);
const requireKey=value=>{if(!key(value))throw new TypeError('Invalid narrative identifier');return value;};
const findScene=(content,id)=>{
  const scene=content.scenes.find(x=>x.id===id);
  if(!scene)throw new TypeError('Unknown narrative scene');return scene;
};
const choiceScenes=choice=>choice.scene.split('/');
const insertFor=(content,id)=>content.insertions.find(x=>x.scene_id===id);

export function createNarrativeState(content,prior={}){
  if(content.schemaVersion!==1||!Array.isArray(content.scenes)||!object(content.flagSchema)||!object(prior))
    throw new TypeError('Invalid narrative source or save');
  const state={...copy(prior),version:1,revision:content.revision,
    flags:{...(prior.flags||{})},enums:{...(prior.enums||{})},
    completed:{...(prior.completed||{})},skipped:{...(prior.skipped||{})},
    linesRead:{...(prior.linesRead||{})},choices:{...(prior.choices||{})},
    relationships:{...(prior.relationships||{})},activeScene:prior.activeScene||null};
  for(const id of content.flagSchema.gameplay_flags){
    requireKey(id);
    if(state.flags[id]===undefined)state.flags[id]=false;
    if(typeof state.flags[id]!=='boolean')throw new TypeError('Invalid saved narrative flag');
  }
  for(const [id,values] of Object.entries(content.flagSchema.exclusive_enums)){
    requireKey(id);
    if(state.enums[id]===undefined)state.enums[id]=values.includes('unset')?'unset':values[0];
    if(!values.includes(state.enums[id]))throw new TypeError('Invalid saved narrative choice');
  }
  for(const [id,spec] of Object.entries(content.flagSchema.relationships||{})){
    requireKey(id);
    if(state.relationships[id]===undefined)state.relationships[id]=spec.initial;
    if(!Number.isFinite(state.relationships[id])||state.relationships[id]<spec.min||state.relationships[id]>spec.max)
      throw new TypeError('Invalid saved relationship');
  }
  if(state.activeScene)findScene(content,state.activeScene);
  return state;
}

// Supports only the authored boolean and equality grammar; never evals source.
export function narrativeCondition(state,expression){
  if(!expression?.trim())return true;
  return expression.split(';').every(part=>{
    const match=/^([A-Za-z][A-Za-z0-9_-]*)(?:\s*={1,2}\s*([A-Za-z0-9_-]+))?$/.exec(part.trim());
    if(!match)throw new TypeError('Unsupported narrative condition');
    const id=requireKey(match[1]),expected=match[2];
    if(expected===undefined)return state.flags[id]===true;
    if(expected==='true'||expected==='false')return state.flags[id]===(expected==='true');
    return state.enums[id]===expected;
  });
}

function effects(content,state,expression){
  for(const part of (expression||'').split(';').filter(x=>x.trim())){
    const match=/^([A-Za-z][A-Za-z0-9_-]*)(?:\s*=\s*([A-Za-z0-9_-]+))?$/.exec(part.trim());
    if(!match)throw new TypeError('Unsupported narrative effect');
    const id=requireKey(match[1]),value=match[2];
    if(value===undefined||value==='true'||value==='false'){
      state.flags[id]=value!=='false';
    }else{
      if(!content.flagSchema.exclusive_enums[id]?.includes(value))throw new TypeError('Undeclared enum assignment');
      state.enums[id]=value;
    }
  }
}

export function nextNarrativeScene(content,state){
  return content.scenes.find(scene=>!state.completed[scene.id]&&!state.skipped[scene.id])||null;
}
export function narrativeLines(content,state,sceneId=state.activeScene){
  const scene=findScene(content,sceneId);
  const ids=new Set(scene.dialogue);
  return content.dialogue.filter(line=>ids.has(line.line_id)&&narrativeCondition(state,line.condition))
    .sort((a,b)=>Number(a.sequence)-Number(b.sequence)).map(copy);
}
export function beginNarrativeScene(content,state,sceneId,{trigger}={}){
  const scene=findScene(content,sceneId);
  if(state.completed[sceneId])return copy(state);
  if(state.activeScene&&state.activeScene!==sceneId)throw new Error('Another narrative scene is active');
  if(nextNarrativeScene(content,state)?.id!==sceneId)throw new Error('Narrative milestone is not ready');
  if(trigger!==scene.trigger)throw new Error('Narrative trigger mismatch');
  const insertion=insertFor(content,sceneId);
  if(insertion&&!narrativeCondition(state,insertion.requires))throw new Error('Narrative prerequisite incomplete');
  return {...copy(state),activeScene:sceneId};
}
export function acknowledgeNarrativeLine(content,state,lineId){
  if(!state.activeScene)throw new Error('No active narrative scene');
  if(state.linesRead[lineId])return copy(state);
  const line=narrativeLines(content,state).find(x=>!state.linesRead[x.line_id]);
  if(!line||line.line_id!==lineId)throw new Error('Narrative dialogue is out of sequence');
  const next=copy(state);
  effects(content,next,line.event_effects);
  next.linesRead[lineId]=true;
  return next;
}
export function applyNarrativeChoice(content,state,choiceId,optionIds){
  const contract=content.choices.find(x=>x.id===choiceId);
  if(!contract||!choiceScenes(contract).includes(state.activeScene))throw new Error('Choice is not active');
  const chosen=Array.isArray(optionIds)?optionIds:[optionIds];
  if(chosen.length!==(contract.selection_count||1)||new Set(chosen).size!==chosen.length||
     chosen.some(id=>!Object.hasOwn(contract.options,id)))throw new TypeError('Invalid narrative choice selection');
  const prior=state.choices[choiceId];
  if(prior){
    if(JSON.stringify(prior)!==JSON.stringify(chosen))throw new Error('Confirmed choice is already committed');
    return copy(state);
  }
  const next=copy(state);
  for(const option of chosen)effects(content,next,contract.options[option]);
  next.choices[choiceId]=copy(chosen);return next;
}
export function completeNarrativeScene(content,state,sceneId=state.activeScene){
  const scene=findScene(content,sceneId);
  if(state.completed[sceneId])return copy(state);
  if(state.activeScene!==sceneId)throw new Error('Narrative scene is not active');
  if(narrativeLines(content,state,sceneId).some(x=>!state.linesRead[x.line_id]))throw new Error('Dialogue remains unread');
  if(content.choices.some(x=>choiceScenes(x).includes(sceneId)&&!state.choices[x.id]))throw new Error('Narrative choice remains unconfirmed');
  const next=copy(state);
  effects(content,next,scene.sets);
  effects(content,next,insertFor(content,sceneId)?.sets);
  next.completed[sceneId]=true;next.activeScene=null;return next;
}
export function skipOptionalNarrativeScene(content,state,sceneId){
  findScene(content,sceneId);
  if(nextNarrativeScene(content,state)?.id!==sceneId||state.activeScene||
     insertFor(content,sceneId)?.optional?.toLowerCase()!=='true')throw new Error('Only a pending optional scene may be skipped');
  const next=copy(state);next.skipped[sceneId]=true;return next;
}
