// Additive campaign battle host. Uses existing deterministic HybridSession combat,
// the v5 side-view renderer, and the ORIGINAL Ghost Signal overlay/button language.
// All encounters/stats/art references come from private reviewed combat staging.
import {createHybridSession,beginHybridEncounter,actHybrid} from './hybrid-session.js';
import {currentCombatant,enemyDecision,enemyForecast,combatAction} from './rpg-combat.js';
import {createSideViewBattleScene} from './rpg-sideview-scene.js';

const $=id=>document.getElementById(id);
const make=(tag,text,className='')=>{
  const n=document.createElement(tag);if(text!==undefined)n.textContent=text;
  if(className)n.className=className;return n;
};
const button=(text,fn)=>{
  const n=make('button',text,'menu-btn sm');n.type='button';n.onclick=fn;return n;
};
const battleWorld=world=>({...world,progression:world.progression||{xp:world.stats?.xp||0}});
export function mountCampaignBattle({game,ui,journal,staging,manifest,starterId,touchMode,onSavedVictory=()=>{}}){
  if(!staging)throw new Error('Author-reviewed campaign combat staging required');
  const root=make('div',undefined,'overlay hidden');root.id='rpg-lab-battle';root.style.zIndex='22';
  const panel=make('section',undefined,'panel case');panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Aeon Circuit campaign encounter');
  panel.style.cssText='padding:calc(var(--u) * 6);gap:calc(var(--u) * 3)';
  root.append(panel);$('stage').append(root);
  let session=null,encounter=null,sideView=null,busy=false,pending=null,lastOutcome=null;
  let targetSelection=false,stopped=false;
  const present=()=>{game.mode='battle';root.classList.remove('hidden');ui.show('touch',false);};
  const clearView=()=>{sideView?.stop();sideView=null;};
  const close=()=>{
    if(stopped||journal.readJournal()?.battle)return false;
    root.classList.add('hidden');game.mode='play';ui.show('touch',!!touchMode?.());
    clearView();session=null;encounter=null;lastOutcome=null;targetSelection=false;return true;
  };
  function attach(loaded){
    if(stopped)throw new Error('Campaign battle host has been disposed');
    encounter=staging.encounter(loaded.handoff.encounter.id);
    if(!encounter)throw new Error('Encounter staging changed during saved battle');
    sideView?.stop();
    sideView=createSideViewBattleScene(staging.artFor(manifest,starterId,loaded.exploration.party,encounter));
    session=loaded;lastOutcome=null;pending=null;
    present();draw();
  }
  function start(id){
    if(stopped||busy||game.mode!=='play'||journal.readJournal()?.battle)return false;
    const spec=staging.encounter(id),world=journal.readWorld();
    if(!spec||!world||game.m?.id!==spec.mapId||
       (spec.requiresFlag&&world.flags?.[spec.requiresFlag]!==true)||
       world.encounters?.[id]?.outcome==='victory')return false;
    try{
      const initial=createHybridSession(battleWorld(world),{defaultMode:'normal',zones:[]});
      const active=beginHybridEncounter(initial,{...spec,
        enemies:spec.enemies,rewards:spec.rewards||{},canFlee:spec.canFlee!==false});
      if(!journal.beginBattle(id,active,game.snapshot())){
        ui.toast('ENCOUNTER SAVE FAILED — NO COMBAT STARTED',4);return false;
      }
      attach(active);runEnemyOpening();return true;
    }catch(error){
      console.error('Campaign combat start rejected',error);
      ui.toast('ENCOUNTER STAGING INVALID — REVIEW REQUIRED',4);return false;
    }
  }
  function startForTrigger(trigger,mapId){
    const spec=staging.triggered(mapId,trigger);
    return !!spec&&start(spec.id);
  }
  function resume(){
    const saved=journal.readJournal()?.battle;
    if(stopped||!saved||game.mode!=='play')return false;
    try{attach(saved.session);runEnemyOpening();return true;}
    catch(error){console.error('Saved battle could not resume',error);
      ui.toast('SAVED ENCOUNTER REQUIRES REVIEW',4);return false;}
  }
  function write(candidate){
    const valid=candidate.phase==='battle'?
      journal.stepBattle(candidate):journal.finishBattle(candidate);
    if(!valid)return false;
    session=candidate;
    if(candidate.phase==='exploration')lastOutcome=candidate.event.outcome;
    return true;
  }
  function showSaveRetry(candidate,visual,actions){
    if(stopped)return;
    targetSelection=false;pending={candidate,visual,actions};
    panel.replaceChildren();
    panel.append(make('h2','CAMPAIGN RECORD NOT SAVED'));
    panel.append(make('p','Your previous turn remains protected. Retry the field record before continuing.','fine'));
    panel.append(button('RETRY SAVE',()=>{
      if(!pending)return;
      const p=pending;if(!write(p.candidate)){
        ui.toast('SAVE FAILED — KEEP THIS SCREEN OPEN',3);return;
      }
      pending=null;
      afterSaved(p.visual,p.actions);
    }));
  }
  function afterSaved(visual,actions){
    if(stopped)return;
    sideView.playActions(actions);
    sideView.setBattle(visual,currentCombatant(visual));
    if(session.phase==='battle')draw();
    else panel.replaceChildren(make('h2','ENCOUNTER RESULT PENDING'),sideView.canvas);
    busy=true;
    const finish=()=>{
      if(stopped)return;
      if(sideView.isPresenting){requestAnimationFrame(finish);return;}
      busy=false;
      if(session.phase==='battle')draw();
      else showResult();
    };
    requestAnimationFrame(finish);
  }
  function take(command){
    if(stopped||busy||pending||session?.phase!=='battle')return;
    busy=true;
    try{
      let candidate=session,visual=session.battle;
      const actions=[command];
      visual=combatAction(visual,command);candidate=actHybrid(candidate,command);
      while(candidate.phase==='battle'&&currentCombatant(candidate.battle)?.startsWith('enemy:')){
        const enemy=enemyDecision(candidate.battle);
        actions.push(enemy);visual=combatAction(visual,enemy);
        candidate=actHybrid(candidate,enemy);
      }
      if(!write(candidate)){busy=false;showSaveRetry(candidate,visual,actions);return;}
      busy=false;afterSaved(visual,actions);
    }catch(error){
      busy=false;ui.toast('BATTLE COMMAND REJECTED — '+error.message,3);draw();
    }
  }
  function runEnemyOpening(){
    if(stopped||session?.phase!=='battle'||!currentCombatant(session.battle)?.startsWith('enemy:'))return;
    let candidate=session,visual=session.battle;
    const actions=[];
    try{
      while(candidate.phase==='battle'&&currentCombatant(candidate.battle)?.startsWith('enemy:')){
        const action=enemyDecision(candidate.battle);
        actions.push(action);visual=combatAction(visual,action);
        candidate=actHybrid(candidate,action);
      }
      if(!write(candidate)){showSaveRetry(candidate,visual,actions);return;}
      afterSaved(visual,actions);
    }catch(error){console.error('Campaign opening enemy turn failed',error);
      ui.toast('ENCOUNTER RESTORE HELD — REVIEW REQUIRED',4);}
  }
  function chooseTarget(command,which){
    if(stopped)return;
    targetSelection=true;
    const units=which==='enemy'?session.battle.enemies:session.battle.party;
    panel.replaceChildren(make('h2',which==='enemy'?'SELECT HOSTILE':'SELECT ALLY'),sideView.canvas);
    const row=make('div',undefined,'btn-row');row.style.flexWrap='wrap';
    for(const unit of units.filter(u=>u.hp>0)){
      const key=which+':'+unit.id;
      row.append(button(unit.name+' · HP '+unit.hp+'/'+unit.maxHp,()=>take({...command,target:key})));
    }
    const back=button('BACK',draw);
    // The existing Ghost Signal controller bridge uses this semantic marker
    // to make the B button cancel targets, never the entire active battle.
    back.dataset.campaignBattleBack='1';
    row.append(back);panel.append(row);row.querySelector('button')?.focus();
  }
  function draw(){
    if(stopped)return;
    targetSelection=false;
    panel.replaceChildren();
    if(!session||session.phase!=='battle')return;
    const state=session.battle,actor=currentCombatant(state);
    sideView.setBattle(state,actor);
    panel.append(make('h2','SIDE-VIEW ENCOUNTER // ROUND '+state.round));
    panel.append(sideView.canvas);
    const lines=[...state.party.map(x=>x.name+' HP '+x.hp+'/'+x.maxHp+' EP '+x.ep),
      ...state.enemies.map(x=>x.name+' HP '+x.hp+'/'+x.maxHp),
      'HOSTILE INTENT: '+enemyForecast(state).text,state.log.at(-1)||'SELECT YOUR COMMAND'];
    const report=make('pre',lines.join('\n'));report.style.cssText=
      'white-space:pre-wrap;font-size:calc(var(--u) * 7);line-height:1;flex-shrink:0';
    panel.append(report);
    const unit=state.party.find(x=>'party:'+x.id===actor);
    if(!unit)return;
    const row=make('div',undefined,'btn-row');
    row.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--u) * 3)';
    const enemies=state.enemies.filter(x=>x.hp>0),allies=state.party.filter(x=>x.hp>0);
    const command=(name,type,enabled,which,extras={})=>{
      const b=button(name,()=>{
        if(busy||pending)return;
        const next={actor,type,...extras};
        if(which==='enemy'){
          if(enemies.length===1)take({...next,target:'enemy:'+enemies[0].id});
          else chooseTarget(next,'enemy');
        }else if(which==='party')chooseTarget(next,'party');
        else take(next);
      });
      b.disabled=!enabled;b.style.cssText='min-width:0;padding:calc(var(--u) * 3);font-size:calc(var(--u) * 7)';
      row.append(b);
    };
    command('ATTACK','attack',true,'enemy');
    command('PULSE · 5 EP','pulse',unit.ep>=5&&(!unit.skills||unit.skills.includes('pulse')),'enemy');
    command('GUARD','guard',true);
    command('REPAIR · 5 EP','repair',unit.ep>=5&&(!unit.skills||unit.skills.includes('repair')),'party');
    command('REPAIR KIT','item',!!state.inventory['repair-kit'],'party',{item:'repair-kit'});
    command('WITHDRAW','flee',state.canFlee);
    panel.append(row);
    row.querySelector('button:not(:disabled)')?.focus();
  }
  function showResult(){
    if(stopped)return;
    targetSelection=false;
    panel.replaceChildren();
    const outcome=lastOutcome||'defeat';
    panel.append(make('h2','ENCOUNTER // '+outcome.toUpperCase()));
    panel.append(make('pre',outcome==='victory'?
      'RESULT SAVED // XP AND SALVAGE RECORDED':
      outcome==='fled'?'WITHDRAWAL SAVED // FIELD RECORD RESTORED':
      'FRAME DISABLED // FIELD RECOVERY RECORDED'));
    // Capture the source encounter before close() resets active presentation.
    const id=encounter?.id;
    const b=button('RETURN TO FIELD',()=>{
      if(close()&&outcome==='victory')onSavedVictory(id);
    });
    panel.append(b);b.focus();
  }
  const onKey=event=>{
    if(!stopped&&game.mode==='battle'&&targetSelection&&event.code==='Escape'){
      event.preventDefault();
      draw();
    }
  };
  document.addEventListener('keydown',onKey);
  const stop=()=>{
    if(stopped)return;
    stopped=true;
    document.removeEventListener('keydown',onKey);
    clearView();root.remove();
    session=null;encounter=null;pending=null;lastOutcome=null;targetSelection=false;
  };
  return Object.freeze({
    start,startForTrigger,resume,stop,
    inspect:()=>({phase:session?.phase||null,encounterId:encounter?.id||null,
      outcome:lastOutcome,busy,pendingSave:!!pending})
  });
}
