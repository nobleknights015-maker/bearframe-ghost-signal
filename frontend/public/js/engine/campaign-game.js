// PRIVATE opening-campaign review entry. Runs the existing Ghost Signal field,
// UI, native four-way starter art, and the saved PR #5 narrative adapter.
// This is NOT a completed campaign/battle/Android release. No private story here.
import {loadAeonV5,chooseStarter,buildV5WorldSheet,bindV5WorldSheet} from './aeon-v5-bridge.js';
import {createCampaignMissionFactory} from './campaign-world.js';
import {createCampaignJournal} from './campaign-journal.js';
import {mountCampaignNarrative} from './campaign-narrative.js';
import {createConnectedFieldTravel} from './connected-field-travel.js';
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
    const layer=document.createElement('div');layer.className='overlay';layer.id='campaign-replace';layer.style.zIndex='60';
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
  title.querySelector('.fine').textContent='Owner-approved story; reconstructed geometry pending review. Campaign combat not yet connected.';
  title.querySelector('.motto').textContent='STORY / EXPLORATION / PERSISTENCE';
  title.querySelector('.title-art').classList.add('hidden');$('btn-m2').classList.add('hidden');
  $('btn-new').textContent='NEW CAMPAIGN';
  const [manifest,content,worldSpec]=await Promise.all([
    loadAeonV5(),readPrivate('story/campaign.json'),readPrivate('story/opening-world-review-candidate.json')
  ]);
  if(worldSpec?.status!=='authored-blockout-review-candidate'||worldSpec.campaignRevision!==content.revision)
    throw new Error('Campaign layout is absent or does not match the approved story revision');
  const hasSave=id=>{try{return localStorage.getItem(saveFor(id)+':A')!==null||
    localStorage.getItem(saveFor(id)+':B')!==null;}catch{return false;}};
  $('btn-continue').disabled=!STARTERS.some(hasSave);
  let busy=false,active=null;
  async function begin(continuing){
    if(busy)return;busy=true;
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
        bootstrap:{party:[{id:'sleeper',artId:starterId}]}});
      if(continuing? !journal.load():!journal.newGame())throw new Error('Campaign journal could not be loaded/saved');
      // Stop callbacks from previous previews before rebinding this Game.
      active?.narrative.stop();active=null;
      let narrative=null,traveler=null,portalArmed=false,lastPortal=null;
      const commitWorld=next=>{
        const prior=journal.readJournal();if(!prior)return false;
        if(!game.m||!journal.graph.get(game.m.id))return journal.commitWorld(next);
        const snap=game.snapshot();
        const maps={...prior.maps,[game.m.id]:snap};
        return journal.writeJournal({...prior,mapId:game.m.id,maps,field:snap,world:next});
      };
      const blocked=reason=>{
        if(reason==='completion')ui.toast('PROGRESSION HELD — SAVED ENCOUNTER OUTCOME REQUIRED',4);
        else if(reason==='save')ui.toast('CAMPAIGN SAVE FAILED — RETRY',3);
        else if(reason==='staging')ui.toast('SCENE STAGING REQUIRES AUTHOR REVIEW',3);
      };
      narrative=mountCampaignNarrative({game,ui,content,readWorld:journal.readWorld,
        commitWorld,choiceGates:worldSpec.choiceGates||{},canComplete:journal.canComplete,
        onBlocked:blocked,onComplete:()=>ui.toast('FIELD RECORD UPDATED',2)});
      const invoke=(trigger,sceneId)=>{
        if(game.mode!=='play'||!trigger)return false;
        return narrative.trigger(trigger,{sceneId});
      };
      const factory=createCampaignMissionFactory(worldSpec,{
        getWorld:journal.readWorld,
        onInteract(e){
          if(!e.trigger){ui.toast('OBJECT AWAITS AUTHOR REVIEW',2);return;}
          if(e.requiresFlag&&journal.readWorld()?.flags?.[e.requiresFlag]!==true){
            ui.toast('ACCESS REQUIRES PREVIOUS MILESTONE',2);return;}
          invoke(e.trigger,e.sceneId);
        },
        onTrigger(t){invoke(t.trigger,t.sceneId);},
        onEnter(m){
          if(!m.entryTrigger)return;
          // Game.start runs during travel. Trigger ONLY after travel is durably saved.
          setTimeout(()=>{
            if(game.m?.id===m.id&&game.mode==='play'){
              const next=content.scenes.find(s=>s.trigger===m.entryTrigger);
              if(next)invoke(next.trigger,next.id);
            }
          },0);
        },
        onPortal(id){
          if(!id){portalArmed=true;lastPortal=null;return;}
          if(id===lastPortal||game.mode!=='play'||traveler?.busy)return;
          const target=factory.graph.destination(game.m.id,id);
          const heading=game.input?.dir||(game.player.moving?game.player.dir:null);
          if(heading===target.facing)portalArmed=true;
          if(!portalArmed)return;
          lastPortal=id;portalArmed=false;
          traveler.transition(id).then(ok=>{
            if(!ok)ui.toast('PASSAGE SEALED — MILESTONE REQUIRED',3);
            else ui.toast('AREA RECORD SAVED',1.8);
          }).catch(error=>{console.warn('Campaign route rolled back',error);
            ui.toast('ROUTE UNAVAILABLE — PREVIOUS AREA RESTORED',3);});
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
      active={journal,narrative,factory,traveler,starterId};
      if(!continuing){
        if(!journal.saveField(area,game.snapshot()))throw new Error('Fresh field position could not be saved');
        // The only automatic scene trigger is the source-authorized NEW GAME event.
        invoke(worldSpec.openingScene.trigger,worldSpec.openingScene.sceneId);
      }else if(journal.readWorld()?.narrative?.activeScene)narrative.resume();
      window.__campaign=Object.freeze({
        inspect:()=>({starterId,mapId:game.m?.id||null,mode:game.mode,
          story:journal.readWorld()?.narrative?.activeScene||null,
          saved:journal.inspect(),areaCount:factory.graph.ids.length,
          status:'authored-blockout-review-candidate'}),
        save:()=>journal.saveField(game.m.id,game.snapshot())
      });
      $('btn-save').onclick=()=>{$('pause-note').textContent=window.__campaign.save()?'CAMPAIGN RECORD SAVED':'CAMPAIGN SAVE FAILED — REMAIN HERE';};
      $('btn-quit').onclick=()=>{
        if(window.__campaign.save())location.assign(new URL('campaign.html',location.href).href);
        else $('pause-note').textContent='CAMPAIGN SAVE FAILED — REMAIN HERE';};
    }catch(error){
      console.error('Private campaign preview failed',error);
      game.mode='title';ui.show('title',true);
      ui.toast('CAMPAIGN PREVIEW UNAVAILABLE — VERIFY PRIVATE ART AND STAGING',5);
    }finally{busy=false;}
  }
  $('btn-new').onclick=()=>begin(false);
  $('btn-continue').onclick=()=>begin(true);
  addEventListener('ghost-signal-host-pause',()=>{
    if(active&&game.mode==='play')active.journal.saveField(game.m.id,game.snapshot());
  });
  document.addEventListener('visibilitychange',()=>{
    if(active&&document.hidden&&game.mode==='play')active.journal.saveField(game.m.id,game.snapshot());
  });
  return {get active(){return !!active;}};
}