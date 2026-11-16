// Live adapter for owner-installed narrative data. All story and staging stay private.
import {createNarrativeState,nextNarrativeScene,beginNarrativeScene,narrativeLines,
 acknowledgeNarrativeLine,applyNarrativeChoice,completeNarrativeScene} from './narrative-runtime.js';

const copy=value=>structuredClone(value);
const attached=(content,sceneId)=>content.choices.filter(choice=>choice.scene.split('/').includes(sceneId));

// Choice placement is explicit source staging: null means before the first line;
// a line identifier means immediately after that line has been acknowledged.
// Missing bindings fail closed instead of moving every choice to a scene's end.
export function validateNarrativeStaging(content,sceneId,choiceGates){
  const scene=content.scenes.find(scene=>scene.id===sceneId);
  if(!scene)throw new Error('Unknown narrative scene');
  for(const choice of attached(content,sceneId)){
    const gate=choiceGates[choice.id];
    if(!gate||!Object.hasOwn(gate,'afterLine')||
       (gate.afterLine!==null&&!scene.dialogue.includes(gate.afterLine)))
      throw new Error('Narrative choice placement is not staged');
  }
}

export function mountCampaignNarrative({
 game,ui,content,readWorld,commitWorld,choiceGates={},
 canComplete=()=>true,onComplete=()=>{},onBlocked=()=>{},
 choiceRoot=globalThis.document?.getElementById('dialog-choices')
}){
  if(!game||!ui||typeof readWorld!=='function'||typeof commitWorld!=='function')
    throw new TypeError('Narrative host is incomplete');
  let stopped=false,token=0,owned=false,priorMode=null;
  const snapshot=()=>{
    const world=copy(readWorld());
    return {world,state:createNarrativeState(content,world.narrative||{})};
  };
  const blocked=reason=>{onBlocked(reason);return false;};
  const takeMode=mode=>{
    if(!owned){priorMode=game.mode;owned=true;}
    game.mode=mode;
  };
  const release=()=>{
    if(owned&&['dialog','choice'].includes(game.mode))game.mode=priorMode;
    owned=false;priorMode=null;
  };
  // A successful synchronous write is required before any dependent UI/effect.
  function persist(world,state){
    const next={...world,narrative:state,flags:{...(world.flags||{}),...state.flags}};
    try{if(commitWorld(copy(next))!==true)return blocked('save');}
    catch{return blocked('save');}
    return true;
  }
  function transact(change){
    const {world,state}=snapshot();
    return persist(world,change(state));
  }
  function once(callback){
    const expected=++token;let used=false;
    return (...args)=>{
      if(stopped||used||token!==expected)return;
      used=true;callback(...args);
    };
  }
  function pump(){
    if(stopped)return false;
    ++token;
    const {world,state}=snapshot(),id=state.activeScene;
    if(!id){release();return false;}
    try{validateNarrativeStaging(content,id,choiceGates);}
    catch{return blocked('staging');}
    const pending=attached(content,id).filter(choice=>!state.choices[choice.id]);
    const ready=pending.find(choice=>{
      const anchor=choiceGates[choice.id].afterLine;
      return anchor===null||state.linesRead[anchor];
    });
    if(ready){
      const drafts=state.choiceDrafts?.[ready.id]||[];
      if(!Array.isArray(drafts)||new Set(drafts).size!==drafts.length||
         drafts.length>=(ready.selection_count||1)||
         drafts.some(option=>!Object.hasOwn(ready.options,option)))
        return blocked('draft');
      const options=Object.keys(ready.options).filter(option=>!drafts.includes(option));
      takeMode('choice');
      ui.choose(ready.prompt,options,once(index=>{
        if(!Number.isInteger(index)||index<0||index>=options.length){pump();return;}
        transact(current=>{
          const selected=[...(current.choiceDrafts?.[ready.id]||[]),options[index]];
          if(selected.length===(ready.selection_count||1)){
            const next=applyNarrativeChoice(content,current,ready.id,selected);
            if(next.choiceDrafts)delete next.choiceDrafts[ready.id];
            return next;
          }
          return {...current,choiceDrafts:{...(current.choiceDrafts||{}),[ready.id]:selected}};
        });
        pump();
      }));
      // Original UI handles pointerdown. Native keyboard/controller click has
      // detail 0, and needs its own bridge without editing the locked UI source.
      const renderToken=token;
      choiceRoot?.querySelectorAll('button').forEach((button,index)=>{
        button.addEventListener('keydown',event=>{
          if(token!==renderToken||stopped)return;
          if(['Enter','Space'].includes(event.code)){
            event.preventDefault();event.stopPropagation();
            if(!event.repeat)ui.pick(index);
          }else if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.code)){
            event.preventDefault();event.stopPropagation();
            const buttons=[...choiceRoot.querySelectorAll('button')];
            const delta=['ArrowLeft','ArrowUp'].includes(event.code)?-1:1;
            buttons[(index+delta+buttons.length)%buttons.length]?.focus();
          }
        });
        button.addEventListener('click',event=>{
          if(event.detail===0&&token===renderToken&&!stopped)ui.pick(index);
        });
      });
      choiceRoot?.querySelector('button')?.focus();
      return true;
    }
    const line=narrativeLines(content,state).find(line=>!state.linesRead[line.line_id]);
    if(line){
      takeMode('dialog');
      ui.say([{s:line.speaker||'SYSTEM',t:line.text}],once(()=>{
        transact(current=>acknowledgeNarrativeLine(content,current,line.line_id));
        pump();
      }));
      return true;
    }
    // A hidden/missing anchor is unresolved staging, never permission to guess.
    if(pending.length)return blocked('staging');
    // Combat/quest adapters may withhold completion until their saved outcome.
    if(canComplete(id,copy(world))!==true){release();return blocked('completion');}
    const complete=completeNarrativeScene(content,state,id);
    if(!persist(world,complete))return false;
    release();onComplete(id,copy(complete));return true;
  }
  return {
    trigger(triggerId,{sceneId}={}){
      if(stopped)return false;
      const {world,state}=snapshot();
      if(state.activeScene)return blocked('active');
      const scene=nextNarrativeScene(content,state);
      if(!scene||scene.trigger!==triggerId||(sceneId&&sceneId!==scene.id))return false;
      try{validateNarrativeStaging(content,scene.id,choiceGates);}
      catch{return blocked('staging');}
      const next=beginNarrativeScene(content,state,scene.id,{trigger:triggerId});
      if(!persist(world,next))return false;
      pump();return true;
    },
    resume(){return pump();},
    inspect(){return copy(snapshot().state);},
    stop(){
      stopped=true;++token;
      if(owned){ui.choiceCb=null;ui.cb=null;ui.line=null;ui.queue=[];
        ui.show?.('dialog',false);release();}
    }
  };
}
