// Noncanonical two-map playable proof. Uses the ORIGINAL Ghost Signal Game, renderer,
// controls and CRT UI; no edits to the original missions, Sprite Studio, or save keys.
import {compileConnectedWorld} from './connected-world.js';
import {createConnectedFieldTravel} from './connected-field-travel.js';
import {createConnectedLabMission} from './connected-lab-mission.js';
import {createRpgSaveStore} from './rpg-save.js';
import {resolveWorldEvent,CONNECTED_LAB_EVENTS} from './world-events.js';

const copy=x=>structuredClone(x);
const $=id=>document.getElementById(id);
const NAMESPACE='bearframe_ghost_signal_connected_lab_v1';
const fresh=()=>({
  mapId:'staging',maps:{},
  world:{flags:{},events:{},inventory:{'repair-kit':1},quests:{expedition:'unstarted'}}
});
async function readMaps(){
  const files=['../../maps/rpg-lab-staging.tmj','../../maps/rpg-lab-annex.tmj'];
  return Promise.all(files.map(async path=>{
    const res=await fetch(new URL(path,import.meta.url));
    if(!res.ok)throw Error('Connected map unavailable: '+path+' HTTP '+res.status);
    return res.json();
  }));
}
export async function mountConnectedLab({game,ui,touchMode}){
  const graph=compileConnectedWorld(await readMaps());
  const db=createRpgSaveStore(localStorage,NAMESPACE);
  const loaded=db.load();
  const valid=loaded?.version===1&&loaded?.phase==='exploration'&&
    graph.get(loaded.mapId)&&loaded.world?.events&&loaded.world?.flags&&
    loaded.world?.inventory&&loaded.maps&&typeof loaded.maps==='object'&&
    (!loaded.maps[loaded.mapId]||loaded.maps[loaded.mapId].mission===loaded.mapId);
  let journal=copy(valid?{
    mapId:loaded.mapId,maps:loaded.maps,world:loaded.world
  }:fresh());
  // Dedicated RPG journal only. The original Ghost Signal save API is never written.
  game.store={...game.store,save:()=>true,clear:()=>{},saveProgress:()=>true};
  let armed=false;
  let lastAttemptedPortal=null;
  let traveler;
  const inspect=()=>({
    mapId:game.m?.id||null,mode:game.mode,field:game.snapshot(),
    world:copy(journal.world),maps:Object.keys(journal.maps),save:db.inspect(),
    busy:!!traveler?.busy
  });
  const writeJournal=next=>{
    const candidate=copy(next);
    if(candidate.mapId==='annex'&&journal.mapId==='staging')
      candidate.world.flags['visited-annex']=true;
    if(candidate.mapId==='staging'&&journal.mapId==='annex')
      candidate.world.flags['returned-staging']=true;
    if(!db.save({version:1,phase:'exploration',...candidate}))return false;
    journal=candidate;return true;
  };
  const save=()=>{
    if(!game.m||!graph.get(game.m.id)||['transition','restoring','battle'].includes(game.mode))return false;
    const next=copy(journal);
    next.mapId=game.m.id;
    next.maps[game.m.id]=game.snapshot();
    return writeJournal(next);
  };
  const commitEvent=(eventId,e,g)=>{
    const spec=CONNECTED_LAB_EVENTS[eventId];
    if(eventId==='field-archive'){
      // Repeatable read-only response derived from durable expedition state.
      // The archive never awards items, consumes flags or changes the journal.
      const flags=journal.world.flags;
      ui.toast(!flags['power-switch']
        ? 'ARCHIVE: RELAY SIGNAL ABSENT — RESTORE STAGING POWER'
        : !flags['supply-cache']
          ? 'ARCHIVE: RELAY RESTORED — SUPPLY CACHE STILL UNRECOVERED'
          : 'ARCHIVE: RELAY ONLINE — SUPPLY RECOVERED — RETURN ROUTE OPEN',4);
      return;
    }
    if(!spec)return;
    const applied=resolveWorldEvent(journal.world,spec);
    if(!applied.applied)return;
    const before=g.snapshot(),next=copy(journal);
    next.world=applied.world;
    e.gone=true;g.flags[eventId]=true;
    next.maps[g.m.id]=g.snapshot();
    if(!writeJournal(next)){
      g.applySnap(before);
      ui.toast('INTERACTION NOT RECORDED — NO ITEMS SPENT',3);
      return;
    }
    if(eventId==='power-switch')
      ui.toast('RELAY ONLINE — EXPEDITION RECORD UPDATED',3);
    else {
      g.sfx.pickup();
      ui.toast('ANCIENT REPAIR SUPPLY FOUND — RECORDED ONCE',3);
    }
  };
  const missions=new Map();
  const missionFor=async mapId=>{
    if(missions.has(mapId))return missions.get(mapId);
    const map=graph.get(mapId);
    if(!map)throw Error('Unknown connected expedition map '+mapId);
    const mission=createConnectedLabMission(map,{
      getWorld:()=>journal.world,
      onInteract:(e,g)=>commitEvent(e.id,e,g),
      onPortal:portalId=>{
        // Edge-trigger each doorway entry. A held input at a sealed hatch must
        // not flood notifications, retries or journal writes on every frame.
        if(!portalId){armed=true;lastAttemptedPortal=null;return;}
        const key=game.m.id+':'+portalId;
        if(lastAttemptedPortal===key)return;
        const direction=game.input?.dir||(game.player.moving?game.player.dir:null);
        if(direction===graph.destination(game.m.id,portalId).facing)armed=true;
        if(!armed||traveler?.busy)return;
        armed=false;
        lastAttemptedPortal=key;
        traveler.transition(portalId).then(ok=>{
          if(ok)ui.toast('AREA CONNECTED: '+game.m.id.toUpperCase(),2);
          else {
            // A locked conditional passage must be legible in actual gameplay.
            // No quest flags, map position or saves are changed by this notice.
            const gate=graph.destination(game.m.id,portalId);
            const flags=journal.world.flags;
            if(gate.requiresFlag&&flags[gate.requiresFlag]!==true)
              ui.toast('PASSAGE SEALED — WORLD CONDITION NOT MET',2);
            else if(gate.requiresNotFlag&&flags[gate.requiresNotFlag]===true)
              ui.toast('PASSAGE CLOSED — ROUTE NO LONGER ACCESSIBLE',2);
          }
        }).catch(error=>{
          console.error('Connected travel rolled back safely',error);
          ui.toast('DOORWAY BLOCKED — PREVIOUS AREA RESTORED',4);
        });
      }
    });
    missions.set(mapId,mission);
    return mission;
  };
  // Existing tested transaction owns both source/destination snapshots and rollback.
  traveler=createConnectedFieldTravel({
    game,graph,missionFor,
    readJournal:()=>copy(journal),
    writeJournal
  });
  let mission=await missionFor(journal.mapId);
  try{
    game.start(mission,journal.maps[journal.mapId]||null);
  }catch(error){
    console.warn('Connected expedition save rejected, restarting staging',error);
    journal=fresh();mission=await missionFor('staging');game.start(mission,null);
  }
  if(!valid&&!save())ui.toast('EXPEDITION AUTOSAVE UNAVAILABLE',4);
  if(valid)ui.toast('CONNECTED EXPEDITION RESTORED',3);
  ui.show('title',false);ui.show('ending',false);

  const shell=document.createElement('div');
  shell.id='rpg-lab-menu';shell.className='overlay hidden';shell.style.zIndex='12';
  const panel=document.createElement('div');
  panel.className='panel case';panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','CONNECTED EXPEDITION RECORD');
  shell.appendChild(panel);$('stage').appendChild(shell);
  const button=(label,fn)=>{
    const b=document.createElement('button');
    b.type='button';b.className='menu-btn sm';b.textContent=label;
    b.addEventListener('click',fn);return b;
  };
  const closeMenu=()=>{shell.classList.add('hidden');game.mode='play';menuBtn.focus();};
  const renderRecord=()=>{
    panel.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='EXPEDITION FIELD RECORD // TEST';
    panel.appendChild(heading);
    const record=document.createElement('pre');
    record.style.cssText='white-space:pre-wrap;overflow:auto;max-height:55%;font-size:calc(var(--u) * 10)';
    const f=journal.world.flags;
    record.textContent='AREA: '+game.m.id.toUpperCase()+
      '\\nPOWER RELAY: '+(f['power-switch']?'ACTIVE':'OFFLINE')+
      '\\nSERVICE HATCH: '+(f['power-switch']?'ACCESS GRANTED':'SEALED')+
      '\\nANNEX SUPPLY: '+(f['supply-cache']?'RECOVERED':'UNKNOWN')+
      '\\nRETURN ROUTE: '+(f['returned-staging']?'EXPLORED':'UNEXPLORED')+
      '\\nREPAIR KITS: '+(journal.world.inventory['repair-kit']||0)+
      '\\nSTORY MODE: NONCANONICAL ENGINE TEST';
    panel.appendChild(record);
    const row=document.createElement('div');row.className='btn-row';
    row.append(button('SAVE EXPEDITION',()=>{
      ui.toast(save()?'EXPEDITION SAVED':'SAVE FAILED — STAY IN FIELD',3);
      renderRecord();
    }),button('CLOSE',closeMenu));
    panel.appendChild(row);
    row.querySelector('button')?.focus();
  };
  const openMenu=()=>{
    if(game.mode!=='play'&&game.mode!=='pause')return;
    ui.show('pause',false);game.mode='rpgmenu';
    shell.classList.remove('hidden');renderRecord();
  };
  const menuBtn=button('MAP / RECORD',openMenu);
  menuBtn.id='lab-rpg-menu';menuBtn.className='pix-btn';
  menuBtn.style.cssText='right:calc(var(--u) * 62);width:calc(var(--u) * 45);font-size:calc(var(--u) * 5)';
  $('hud').appendChild(menuBtn);
  const previousResume=game.onResume;
  game.onResume=()=>{if(game.mode==='rpgmenu')closeMenu();else previousResume();};
  $('btn-save').onclick=()=>{
    $('pause-note').textContent=save()?'Expedition journal saved.':'Expedition save failed.';
  };
  $('btn-quit').onclick=()=>{
    if(save())window.location.assign(new URL('engine-lab.html',window.location.href).href);
    else $('pause-note').textContent='Save unavailable — remain in expedition.';
  };
  // The field keeps its original input handler; modal commands are handled only
  // while this additive panel is open, never while the player is walking.
  const modalButtons=()=>[...panel.querySelectorAll('button:not(:disabled)')];
  const moveFocus=step=>{
    const buttons=modalButtons();
    if(!buttons.length)return;
    const current=buttons.indexOf(document.activeElement);
    buttons[(current+step+buttons.length)%buttons.length].focus();
  };
  document.addEventListener('keydown',e=>{
    if(e.code==='KeyM'&&game.mode==='play'){e.preventDefault();openMenu();}
    else if(game.mode==='rpgmenu'){
      if(e.code==='Escape'||e.code==='Backspace'){e.preventDefault();closeMenu();}
      else if(e.code==='ArrowRight'||e.code==='ArrowDown'){
        e.preventDefault();moveFocus(1);
      }else if(e.code==='ArrowLeft'||e.code==='ArrowUp'){
        e.preventDefault();moveFocus(-1);
      }
    }
  });
  // Edge-triggered gamepad input: holding confirm must not repeatedly save.
  // No controller input is consumed outside the expedition modal.
  let previousPad='';
  const pollPad=()=>{
    const pad=game.mode==='rpgmenu'?
      (navigator.getGamepads?.()||[]).find(p=>p?.connected):null;
    const active=pad?.buttons?.[1]?.pressed?'back':
      pad?.buttons?.[0]?.pressed?'confirm':
      (pad?.buttons?.[15]?.pressed||pad?.buttons?.[13]?.pressed||
       pad?.axes?.[0]>0.55||pad?.axes?.[1]>0.55)?'next':
      (pad?.buttons?.[14]?.pressed||pad?.buttons?.[12]?.pressed||
       pad?.axes?.[0]<-0.55||pad?.axes?.[1]<-0.55)?'previous':'';
    if(active&&active!==previousPad){
      if(active==='back')closeMenu();
      else if(active==='confirm')document.activeElement?.click?.();
      else moveFocus(active==='next'?1:-1);
    }
    previousPad=active;
    requestAnimationFrame(pollPad);
  };
  requestAnimationFrame(pollPad);
  window.__connectedLab=Object.freeze({inspect,save,menu:openMenu});
  return window.__connectedLab;
}
