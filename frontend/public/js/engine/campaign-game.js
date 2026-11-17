// PRIVATE opening-campaign review entry. Runs the existing Ghost Signal field,
// UI, native four-way starter art, and the saved PR #5 narrative adapter.
// This is NOT a completed campaign/battle/Android release. No private story here.
import {loadAeonV5,chooseStarter,buildV5WorldSheet,bindV5WorldSheet} from './aeon-v5-bridge.js';
import {createCampaignMissionFactory,campaignEntityAvailable} from './campaign-world.js';
import {createCampaignJournal} from './campaign-journal.js';
import {mountCampaignNarrative} from './campaign-narrative.js';
import {createConnectedFieldTravel} from './connected-field-travel.js';
import {compileCampaignCombatStaging} from './campaign-combat-staging.js';
import {mountCampaignBattle} from './campaign-battle.js';
import {mountCampaignFieldMenu} from './campaign-field-menu.js';
import {compileCampaignQuestJournal} from './campaign-quest-journal.js';
import {loadCampaignEnvironmentArt} from './campaign-environment-art.js';
import {mountCampaignBackupUI} from './campaign-backup-ui.js';
import {createCampaignSecurityRuntime} from './campaign-security-runtime.js';
const ROOT=new URL('../../assets/aeon/',import.meta.url);
const STARTERS=Object.freeze(['sleeper_A','sleeper_B','sleeper_C','sleeper_D']);
const $=id=>document.getElementById(id);
async function readPrivate(path){
  const result=await fetch(new URL(path,ROOT),{cache:'no-store'});
  if(!result.ok)throw new Error('Private campaign installation missing: '+path+' (HTTP '+result.status+')');
  return result.json();
}
const saveFor=id=>'bearframe_aeon_campaign_'+id+'_v1';
// Confirmation uses EXISTING industrial Ghost Signal buttons; never native confirm().
function confirmReplacement(id){
  return new Promise(resolve=>{
    const layer=document.createElement('div');layer.className='overlay';layer.id='aeon-confirm';layer.style.zIndex='60';
    const panel=document.createElement('section');panel.className='panel case';panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Replace saved campaign');
    const title=document.createElement('h2');title.textContent='REPLACE '+id.replace('_',' ').toUpperCase()+' RECORD?';panel.append(title);
    const close=choice=>{document.removeEventListener('keydown',keys);layer.remove();resolve(choice);};
    const keys=event=>{if(event.code==='Escape'){event.preventDefault();close(false);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
      event.preventDefault();const buttons=[...panel.querySelectorAll('button')];buttons[buttons.indexOf(document.activeElement)===0?1:0].focus();}};
    for(const [text,value] of [['KEEP RECORD',false],['REPLACE RECORD',true]]){
      const b=document.createElement('button');b.className='menu-btn';b.textContent=text;
      b.onclick=()=>close(value);panel.append(b);
    }
    layer.append(panel);$('stage').append(layer);document.addEventListener('keydown',keys);
    panel.querySelector('button')?.focus();
  });
}
export async function mountCampaignGame({game,ui,sfx,touchMode,refreshTouch}){
  const title=$('title');document.title='AEON CIRCUIT: THE SILENT WAKE // CAMPAIGN REVIEW';
  const h1=title.querySelector('h1');h1.replaceChildren(document.createTextNode('AEON CIRCUIT'),document.createElement('br'));
  const subtitle=document.createElement('span');subtitle.textContent='THE SILENT WAKE';h1.append(subtitle);
  title.querySelector('.kicker').textContent='AEON CIRCUIT // PRIVATE CAMPAIGN REVIEW';
  title.querySelector('.sub').textContent='REBUILT OPENING BLOCKOUT / NOT FINAL ART';
  title.querySelector('.fine').textContent='Approved campaign review. Story, geometry, and battle staging require owner-installed content.';
  title.querySelector('.motto').textContent='STORY / EXPLORATION / PERSISTENCE';
  title.querySelector('.title-art').classList.add('hidden');$('btn-m2').classList.add('hidden');
  $('btn-new').textContent='NEW CAMPAIGN';
  const [manifest,content,worldSpec]=await Promise.all([
    loadAeonV5(),readPrivate('story/campaign.json'),readPrivate('story/opening-world-review-candidate.json')
  ]);
  if(worldSpec?.status!=='authored-blockout-review-candidate'||worldSpec.campaignRevision!==content.revision)
    throw new Error('Campaign layout is absent or does not match the approved story revision');
  // Optional owner-authored combat staging lives inside the ignored private layout
  // package. Without it the existing story/exploration review remains available.
  const combatStaging=compileCampaignCombatStaging(worldSpec.combat,{worldSpec,content,manifest});
  // Read-only source-driven journal: no invented quest objectives, rewards or
  // new save fields. Unstaged future quests stay hidden until author review.
  const questJournal=compileCampaignQuestJournal(content,worldSpec);
  // Owner-private native terrain/door sprites. A production layout can
  // explicitly require this installation and refuse generic blockout art.
  const environmentArt=await loadCampaignEnvironmentArt({
    requireInstalled:worldSpec.requiresEnvironmentArt===true
  });
  // Describe actual installed capabilities rather than claiming battles are
  // missing after the campaign-combat bridge was merged.
  title.querySelector('.sub').textContent=combatStaging?
    'PRIVATE CAMPAIGN // STORY + COMBAT REVIEW':'PRIVATE CAMPAIGN // STORY + FIELD REVIEW';
  title.querySelector('.motto').textContent=combatStaging?
    'STORY / EXPLORATION / SIDE-VIEW COMBAT':'STORY / EXPLORATION / PERSISTENCE';
  const hasSave=id=>{try{return localStorage.getItem(saveFor(id)+':A')!==null||
    localStorage.getItem(saveFor(id)+':B')!==null;}catch{return false;}};
  $('btn-continue').disabled=!STARTERS.some(hasSave);
  const backupUI=mountCampaignBackupUI({title,storage:localStorage,content,worldSpec,
    confirmReplacement,hasSave,
    onImported:()=>{$('btn-continue').disabled=!STARTERS.some(hasSave);}
  });
  let busy=false,active=null;
  async function begin(continuing){
    if(busy)return;busy=true;
    backupUI.close();
    try{
      sfx.init();game.mode='rpgmenu';
      const starterId=await chooseStarter(manifest,{cancel:true,
        title:continuing?'CONTINUE CAMPAIGN // SELECT SLEEPER':'NEW CAMPAIGN // SELECT SLEEPER',
        description:'Four owner-approved identities. The opening maps are review candidates.',
        enabled:id=>!continuing||hasSave(id)});
      if(!starterId){game.mode='title';return;}
      if(!continuing&&hasSave(starterId)&&!await confirmReplacement(starterId)){
        game.mode='title';return;
      }
      const field=await buildV5WorldSheet(manifest,starterId);
      const journal=createCampaignJournal({storage:localStorage,starterId,content,worldSpec,
        bootstrap:combatStaging?{party:combatStaging.roster(starterId),
          activeParty:combatStaging.roster(starterId).slice(0,3).map(x=>x.id),
          progression:{xp:0}}:{party:[{id:'sleeper',artId:starterId}]}});
      if(continuing? !journal.load():!journal.newGame())throw new Error('Campaign journal could not be loaded/saved');
      // Add combat stats only from approved staging when continuing a legacy
      // story-only save. Keep its narrative, inventory, flags and map intact.
      if(combatStaging){
        const savedWorld=journal.readWorld();
        if(savedWorld.party?.[0]?.artId!==starterId)
          throw new Error('Saved campaign portrait differs from starter');
        if(!savedWorld.party?.[0]?.maxHp){
          if(savedWorld.party.length!==1||savedWorld.party[0].id!=='sleeper')
            throw new Error('Old party needs reviewed combat migration');
          savedWorld.party=combatStaging.roster(starterId);
          savedWorld.activeParty=savedWorld.party.slice(0,3).map(x=>x.id);
          savedWorld.progression??={xp:0};
          if(!journal.commitWorld(savedWorld))throw new Error('Combat migration not saved');
        }
      }
      // Stop callbacks from previous previews before rebinding this Game.
      active?.fieldMenu?.stop();active?.combat?.stop();active?.narrative.stop();active=null;
      let narrative=null,combat=null,traveler=null;
      const commitWorld=next=>{
        const prior=journal.readJournal();if(!prior)return false;
        if(!game.m||!journal.graph.get(game.m.id))return journal.commitWorld(next);
        const snap=game.snapshot();
        const maps={...prior.maps,[game.m.id]:snap};
        return journal.writeJournal({...prior,mapId:game.m.id,maps,field:snap,world:next});
      };
      const blocked=reason=>{
        if(reason==='completion'){
          const scene=journal.readWorld()?.narrative?.activeScene;
          const mandatory=journal.pendingCombat(scene);
          if(mandatory&&combat?.start(mandatory.encounterId))return;
          ui.toast('PROGRESSION HELD — SAVED ENCOUNTER OUTCOME REQUIRED',4);
        }
        else if(reason==='save')ui.toast('CAMPAIGN SAVE FAILED — RETRY',3);
        else if(reason==='staging')ui.toast('SCENE STAGING REQUIRES AUTHOR REVIEW',3);
      };
      narrative=mountCampaignNarrative({game,ui,content,readWorld:journal.readWorld,
        commitWorld,choiceGates:worldSpec.choiceGates||{},canComplete:journal.canComplete,
        onBlocked:blocked,onComplete:()=>ui.toast('FIELD RECORD UPDATED',2)});
      const invoke=(trigger,sceneId)=>{
        if(game.mode!=='play'||!trigger)return false;
        if(combat?.startForTrigger(trigger,game.m?.id))return true;
        const running=journal.readWorld()?.narrative?.activeScene;
        if(running){
          const staged=content.scenes.find(s=>s.id===running);
          if(staged?.trigger===trigger)return narrative.resume();
        }
        return narrative.trigger(trigger,{sceneId});
      };
      if(combatStaging){
        combat=mountCampaignBattle({game,ui,journal,staging:combatStaging,
          manifest,starterId,touchMode,onSavedVictory:()=>narrative.resume()});
      }
      // Opt-in only: read real Ghost Signal drone visibility, persist the
      // owner-authored zone state, and authorize battles from private staging.
      // Ordinary maps and the original stealth demo remain unchanged.
      const security=createCampaignSecurityRuntime({
        worldSpec,readWorld:journal.readWorld,commitWorld,
        encounterFor:(id,mapId)=>{
          const staged=combatStaging?.encounter(id);
          return staged?.mapId===mapId?staged:null;
        },
        onEncounter:id=>{
          if(!combat?.start(id))
            ui.toast('SECURITY ENCOUNTER REQUIRES AUTHOR REVIEW',2);
        },
        onSaveFailure:()=>ui.toast('SECURITY RECORD NOT SAVED — RETRY',3)
      });
      const factory=createCampaignMissionFactory(worldSpec,{
        environmentArt,
        getWorld:journal.readWorld,
        onInteract(e){
          if(!campaignEntityAvailable(e,journal.readWorld()?.flags)){
            ui.toast('ACCESS SEALED — SOURCE MILESTONE REQUIRED',2);return;}
          if(!e.trigger){ui.toast('OBJECT AWAITS AUTHOR REVIEW',2);return;}
          invoke(e.trigger,e.sceneId);
        },
        onTrigger(t){invoke(t.trigger,t.sceneId);},
        onUpdate(g){security.tick(g);},
        onEnter(m){
          if(!m.entryTrigger)return;
          // Game.start runs during travel. Trigger ONLY after travel is durably saved.
          setTimeout(()=>{
            if(game.m?.id===m.id&&game.mode==='play'){
              const next=content.scenes.find(s=>s.trigger===m.entryTrigger);
              invoke(m.entryTrigger,next?.id);
            }
          },0);
        },
        onPortal(id){
          // Only the original Game INTERACT action on a rendered bulkhead,
          // hatch, or lift enters a route. Walking onto a tile never teleports.
          if(!id||game.mode!=='play'||traveler?.busy)return;
          traveler.transition(id).then(ok=>{
            if(!ok)ui.toast('ENTRANCE SEALED — STORY MILESTONE REQUIRED',3);
            else ui.toast('AREA RECORD SAVED',1.8);
          }).catch(error=>{console.warn('Campaign doorway rolled back',error);
            ui.toast('ENTRANCE UNAVAILABLE — PREVIOUS AREA RESTORED',3);});
        }
      });
      traveler=createConnectedFieldTravel({game,graph:factory.graph,
        missionFor:factory.missionFor,
        readJournal:journal.readJournal,writeJournal:journal.writeJournal});
      // Game.start's original save adapter must never write main's Wraith records.
      game.store={save:()=>true,clear:()=>{},loadProgress:()=>({unlocked:{},done:{},case:null}),saveProgress:()=>true};
      bindV5WorldSheet(game,field);
      const current=journal.readJournal(),area=current.mapId;
      const previousSnapshot=current.maps?.[area]||current.field;
      game.start(factory.missionForSync(area),previousSnapshot?.mission===area?previousSnapshot:null);
      ui.show('title',false);ui.show('ending',false);refreshTouch();
      active={journal,narrative,combat,factory,traveler,starterId,security};
      if(!continuing){
        if(!journal.saveField(area,game.snapshot()))throw new Error('Fresh field position could not be saved');
        // The only automatic scene trigger is the source-authorized NEW GAME event.
        invoke(worldSpec.openingScene.trigger,worldSpec.openingScene.sceneId);
      }else if(journal.readJournal()?.battle){
        if(!combat?.resume())throw new Error('Saved battle cannot be restored');
      }else if(journal.readWorld()?.narrative?.activeScene)narrative.resume();
      window.__campaign=Object.freeze({
        inspect:()=>({starterId,mapId:game.m?.id||null,mode:game.mode,
          story:journal.readWorld()?.narrative?.activeScene||null,
          battle:combat?.inspect()||null,
          saved:journal.inspect(),security:journal.readWorld()?.security||null,
          areaCount:factory.graph.ids.length,
          status:'authored-blockout-review-candidate'}),
        save:()=>journal.saveField(game.m.id,game.snapshot())
      });
      $('btn-save').onclick=()=>{$('pause-note').textContent=window.__campaign.save()?'CAMPAIGN RECORD SAVED':'CAMPAIGN SAVE FAILED — REMAIN HERE';};
      $('btn-quit').onclick=()=>{
        if(window.__campaign.save())location.assign(new URL('campaign.html',location.href).href);
        else $('pause-note').textContent='CAMPAIGN SAVE FAILED — REMAIN HERE';};
      // Additive in-campaign party / inventory / quest / save record: uses
      // existing Ghost Signal colors, panels, controller overlay and RPG model.
      // Never starts in narrative/dialogue/battle mode or touches main saves.
      active.fieldMenu=mountCampaignFieldMenu({game,ui,journal,touchMode,questJournal});
    }catch(error){
      console.error('Private campaign preview failed',error);
      game.mode='title';ui.show('title',true);
      ui.toast('CAMPAIGN PREVIEW UNAVAILABLE — VERIFY PRIVATE ART AND STAGING',5);
    }finally{busy=false;}
  }
  $('btn-new').onclick=()=>begin(false);
  $('btn-continue').onclick=()=>begin(true);
  // Main Ghost Signal registers its host-pause and visibility handlers before
  // this adapter. Those handlers change mode from 'play' to 'pause' first, so
  // checking ONLY 'play' silently skipped the campaign save on Android HOME.
  const saveFieldOnLifecycle=()=>{
    if(!active||!game.m||!['play','pause'].includes(game.mode)||
       active.journal.readJournal()?.battle)return false;
    return active.journal.saveField(game.m.id,game.snapshot());
  };
  addEventListener('ghost-signal-host-pause',saveFieldOnLifecycle);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)saveFieldOnLifecycle();
  });
  // An explicit pause is another durable field checkpoint, even when a
  // subsequent Android lifecycle event never arrives.
  $('btn-pause').addEventListener('click',()=>{
    if(game.mode==='pause')saveFieldOnLifecycle();
  });
  return {get active(){return !!active;}};
}