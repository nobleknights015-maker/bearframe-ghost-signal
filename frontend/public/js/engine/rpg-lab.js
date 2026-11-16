// Playable noncanonical RPG integration lab, activated ONLY by ?rpg-lab=1.
// Reuses the existing Ghost Signal Game field, stealth, tiles, fonts, overlays and controls.
import {createHybridSession,moveHybrid,detectHybrid,actHybrid,setHybridActiveParty} from './hybrid-session.js';
import {currentCombatant,enemyDecision,enemyForecast,combatAction} from './rpg-combat.js';
import {rpgMenuModel,RPG_TABS} from './rpg-menu-model.js';
import {createRpgSaveStore} from './rpg-save.js';
import {useFieldConsumable} from './rpg-field-actions.js';
import {createParty,equipItem} from './rpg-party.js';
import {LAB_GEAR} from './rpg-lab-gear.js';
import {migrateLabWorld} from './rpg-lab-migration.js';
import {createLabMission,LAB_POLICY_SPEC} from './rpg-lab-mission.js';
import {createSideViewBattleScene} from './rpg-sideview-scene.js';
import {RPG_BATTLER_ART} from './rpg-battle-art.js';
import {GENERATED_CHARACTERS} from './rpg-generated-registrations.js';
import {createConnectedFieldTravel} from './connected-field-travel.js';
import {resolveWorldEvent,CONNECTED_LAB_EVENTS} from './world-events.js';
import {bindV5WorldSheet} from './aeon-v5-bridge.js';
const demoRequest=typeof location==='undefined'?null:new URLSearchParams(location.search).get('character-demo');
const DEV_CHARACTER=demoRequest&&GENERATED_CHARACTERS[demoRequest]?.status==='development-only'?demoRequest:null;

const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const px=(x,y,facing='right')=>({mapId:'rpg-lab',x,y,facing});
const initial=(selectedStarter=null)=>({
  location:px(5.5*32,9*32),party:[
    {id:DEV_CHARACTER||'sleeper',lineage:'sleeper',...(selectedStarter?{artId:selectedStarter,skinId:selectedStarter.slice(-1)}:{}),name:selectedStarter?'Sleeper '+selectedStarter.slice(-1):DEV_CHARACTER?'Noncanonical Test Frame':'Sleeper Test',hp:38,maxHp:38,ep:10,maxEp:10,attack:11,defense:4,speed:10,level:1,skills:['pulse','guard']},
    {id:'echo',lineage:'echo',name:'Echo Test',hp:29,maxHp:29,ep:10,maxEp:10,attack:7,defense:2,speed:7,level:1,skills:['repair','guard']}
  ],inventory:{'repair-kit':1,'legacy-blade':1,'echo-link':1,'foundry-module':1},equipment:{[DEV_CHARACTER||'sleeper']:{weapon:'legacy-tool'},echo:{}},
  quests:{archive:'unknown',perimeter:'unexplored',sentry:'unresolved'},progression:{xp:0},
  stealth:{alert:0},flags:{}
});
const threat=()=>({
  id:'sentinel-lab',enemies:[
    {id:'sentry',name:'Old Sentry',hp:42,maxHp:42,ep:0,maxEp:0,attack:9,defense:4,speed:8,tactics:'charged-strike'}
  ],canFlee:true,gearCatalog:LAB_GEAR,rewards:{xp:12,items:{'ancient-scrap':1}}
});
const activeEnemy=b=>b.enemies.find(e=>e.hp>0);
const softButton=(label,handler)=>{
  const b=document.createElement('button'); b.className='menu-btn sm';b.type='button';
  b.textContent=label;b.addEventListener('click',handler);return b;
};
const el=(tag,cls,text)=>{
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;return node;
};
function overlay(id,title){
  const shell=el('div','overlay hidden');shell.id=id;shell.style.zIndex='12';
  const panel=el('div','panel case');panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title);
  shell.appendChild(panel);$('stage').appendChild(shell);return {shell,panel};
}

export function mountRpgLab({game,ui,sfx,touchMode,v5=null,connected=null,newGame=false}) {
  // Never write a Ghost Signal mission save/progress key from the lab.
  game.store={save:()=>true,clear:()=>{},loadProgress:()=>({unlocked:{},done:{},case:null}),saveProgress:()=>true};
  // Separate per-starter QA save namespaces; no original save migration or mutations.
  const db=createRpgSaveStore(localStorage,connected?
    'bearframe_aeon_unified_'+v5.starterId+'_v1':v5?
    'bearframe_ghost_signal_rpg_v5_'+v5.starterId+'_v1':
    'bearframe_ghost_signal_rpg_lab_v1');
  const fresh=()=>{const state=initial(v5?.starterId||null);
    if(connected){state.location=clone(connected.startLocation);state.activeParty=state.party.map(p=>p.id).slice(0,3);state.events={};state.quests={expedition:'unstarted',sentry:'unresolved'};}
    return state;};
  const policy=()=>connected?connected.policyFor(game.m?.id||'staging'):LAB_POLICY_SPEC;
  let maps={},traveler=null,portalArmed=false;
  let session=createHybridSession(fresh(),policy()),cooldown=0,menuTab='status';
  let checkpointRpg=clone(session.exploration);
  const originalCheckpoint=game.checkpoint.bind(game);
  game.checkpoint=(silent)=>{
    const ok=originalCheckpoint(silent);
    if(session.phase==='exploration')checkpointRpg=clone(session.exploration);
    return ok;
  };
  const originalRestore=game.restore.bind(game);
  const originalApplySnap=game.applySnap.bind(game);
  let rollbackPending=false;
  game.applySnap=(snapshot,minEnergy)=>{
    const result=originalApplySnap(snapshot,minEnergy);
    if(rollbackPending){
      rollbackPending=false;
      // Game.restore applies the field snapshot asynchronously (fade transition).
      // Rewind RPG data at the exact same boundary, then persist the restored field.
      session=createHybridSession(clone(checkpointRpg),policy());
      queueMicrotask(()=>{
        if(!save()){
          // Never leave an obsolete post-checkpoint journal that could resurrect loot.
          db.clear();
          ui.toast('CHECKPOINT RECOVERED IN MEMORY — RPG SAVE UNAVAILABLE',4);
        }
      });
    }
    return result;
  };
  game.restore=()=>{rollbackPending=true;originalRestore();};
  const menu=overlay('rpg-lab-menu','RPG FIELD RECORD');
  const battle=overlay('rpg-lab-battle','TURN-BASED ENCOUNTER');
  const sideView=createSideViewBattleScene(v5?.battleArt||RPG_BATTLER_ART);
  if(v5)bindV5WorldSheet(game,v5.field);
  battle.panel.style.cssText='padding:calc(var(--u) * 6);gap:calc(var(--u) * 3)';
  const status=()=>session;
  const location=()=>({...px(game.player.hidden?game.player.hx:game.player.x,game.player.hidden?game.player.hy:game.player.y,game.player.dir),mapId:game.m?.id||'rpg-lab'});
  const apply=(fn)=>{
    const next=clone(session.exploration);fn(next);
    session=createHybridSession(next,policy());
  };
  const save=()=>{
    if(session.phase!=='exploration')return false;
    const g=game.snapshot();
    const world=clone(session.exploration);world.location=location();
    const security=game.drones.map(d=>({x:d.x,y:d.y,dir:d.dir,state:d.state,wp:d.wp,
      alert:d.alert,blind:d.blind,invCd:d.invCd,t:d.t,lost:d.lost,last:d.last,target:d.target,
      seen:d.seen,searchN:d.searchN,hitCd:d.hitCd,returning:d.returning}));
    if(connected)maps={...maps,[g.mission]:g};
    return db.save({version:1,phase:'exploration',world,field:g,security,...(connected?{mapId:g.mission,maps}: {})});
  };
  const updateLocation=()=>{
    if(session.phase!=='exploration')return;
    const now=location(),before=session.exploration.location;
    if(now.x!==before.x||now.y!==before.y||now.facing!==before.facing)
      session=moveHybrid(session,now);
    const inStealth=session.security.mode==='stealth';
    $('hud-stealth').classList.toggle('hidden',!inStealth);
    if(!connected&&inStealth&&!game.flags.labEntered) {
      game.flags.labEntered=true;
      apply(e=>e.quests.perimeter='entered');
      ui.toast('SECURITY PERIMETER — MOVEMENT / LIGHT / SCAN MATTER',3);
    }
  };
  const disableSentry=()=>{
    for(const d of game.drones){d.state='disabled';d.t=1e9;d.alert=0;d.vis=false;}
  };
  const callbacks={
    onUpdate(g){
      updateLocation();
      if(g.flags.labResolved||session.exploration.flags.labResolved){disableSentry();return;}
      if(g.time<cooldown || session.phase!=='exploration' || session.security.mode!=='stealth')return;
      if(g.drones.some(d=>d.state==='chase'))startEncounter();
    },
    onInteract(e,g){
      if(connected){
        const spec=CONNECTED_LAB_EVENTS[e.id];if(!spec)return;
        const result=resolveWorldEvent(session.exploration,spec);if(!result.applied)return;
        const previous=session,before=g.snapshot();
        session=createHybridSession(result.world,policy());e.gone=true;g.flags[e.id]=true;
        if(!save()){session=previous;g.applySnap(before);ui.toast('INTERACTION NOT RECORDED — TRY AGAIN',3);return;}
        g.sfx.pickup();ui.toast('FIELD RECORD UPDATED',3);return;
      }
      if(e.id==='archive'){
        g.flags.labArchive=true;apply(s=>s.quests.archive='read');
        g.terminal('FIELD ARCHIVE / TEST RECORD',
          'NONCANONICAL ENGINE TEST.\n\nTHIS SECTOR TESTS REAL GHOST SIGNAL FIELD MOVEMENT, STEALTH, AUTHOR-DEFINED ENCOUNTERS, PARTY STATE AND PERSISTENCE.\n\nTHE SECURITY RELAY MAY BE DISABLED WITHOUT BATTLE.');
        save();
      }
      else if(e.id==='salvage'&&!g.flags.labSalvage){
        g.flags.labSalvage=true;e.gone=true;g.sfx.pickup();
        apply(s=>{s.inventory['repair-kit']=(s.inventory['repair-kit']||0)+1;});
        g.toast('REPAIR KIT RECOVERED — INVENTORY UPDATED',3);save();
      }
      else if(e.id==='relay'&&!g.flags.labRelay){
        g.flags.labRelay=true;g.flags.labResolved=true;disableSentry();
        apply(s=>s.quests.sentry='bypassed via relay');
        g.terminal('SECURITY RELAY', 'RELAY ISOLATED.\n\nSENTRY OFFLINE. THE SECURITY ZONE CAN BE CLEARED WITHOUT A FIGHT.\n\nSAME FIELD MAP. SAME PARTY AND INVENTORY.');
        save();
      }
    }
  };
  let mission;
  if(connected){
    connected.bind({getWorld:()=>session.exploration,...callbacks,onPortal:portalId=>{
      if(!portalId){portalArmed=true;return;}
      if(!portalArmed||traveler?.busy||game.mode!=='play'||session.phase!=='exploration')return;
      portalArmed=false;
      traveler.transition(portalId).then(ok=>{if(ok){checkpointRpg=clone(session.exploration);updateLocation();}})
        .catch(error=>{console.warn('Area travel rolled back',error);ui.toast('DOORWAY UNAVAILABLE — AREA RESTORED',3);});
    }});
    traveler=createConnectedFieldTravel({game,graph:connected.graph,missionFor:connected.missionFor,
      readJournal:()=>({mapId:game.m.id,maps,world:session.exploration}),
      writeJournal:journal=>{
        const world=clone(journal.world);world.location=location();
        if(!db.save({version:1,phase:'exploration',...journal,world,field:game.snapshot()}))return false;
        maps=clone(journal.maps);session=createHybridSession(world,policy());return true;
      }});
  }else mission=createLabMission(callbacks);
  const saved=newGame?null:db.load();
  let valid=!!saved&&saved.version===1&&saved.phase==='exploration'&&
    (connected?!!connected.graph.get(saved.world?.location?.mapId)&&saved.field?.mission===saved.world.location.mapId:
      saved.world?.location?.mapId==='rpg-lab'&&saved.field?.mission==='rpg-lab');
  let rejectedSave=false;
  if(valid){
    try{
      if(connected){
        const world=saved.world,starter=world.party?.find(p=>p.id==='sleeper');
        const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
        if(!object(world.flags)||!object(world.events)||!object(saved.maps)||
          !starter||starter.artId!==v5.starterId||starter.skinId!==v5.starterId.slice(-1)||
          !Number.isFinite(saved.field?.player?.x)||!Number.isFinite(saved.field?.player?.y)||
          saved.field.player.x!==world.location.x||saved.field.player.y!==world.location.y)
          throw new Error('Saved identity or field state mismatch');
      }
      session=createHybridSession(connected?saved.world:migrateLabWorld(saved.world),connected?connected.policyFor(saved.world.location.mapId):policy());if(connected)maps=clone(saved.maps||{});}
    catch(_){rejectedSave=true;valid=false;maps={};session=createHybridSession(fresh(),connected?connected.policyFor('staging'):policy());}
  }
  if(connected)mission=connected.missionForSync(valid?saved.world.location.mapId:'staging');
  ui.show('title',false);ui.show('ending',false);
  let restored=false;
  try { game.start(mission,valid?saved.field:null); restored=valid; }
  catch (error) {
    // Corrupt or future-incompatible snapshots never destroy the original game or brick the lab.
    console.warn('RPG lab restore invalid, starting fresh',error);
    maps={};
    if(connected)mission=connected.missionForSync('staging');
    session=createHybridSession(fresh(),connected?connected.policyFor('staging'):policy());
    game.start(mission,null);
    ui.toast('INVALID RPG TEST SAVE — STARTED A FRESH SECTOR',4);
  }
  if(restored&&!game.flags.labResolved&&Array.isArray(saved.security)){
    const allowed=['x','y','dir','state','wp','alert','blind','invCd','t','lost','last','target','seen','searchN','hitCd','returning'];
    for(let i=0;i<game.drones.length;i++){
      const row=saved.security[i];if(!row||typeof row!=='object')continue;
      if(!Number.isFinite(row.x)||!Number.isFinite(row.y)||!['up','down','left','right'].includes(row.dir)||
          !['patrol','investigate','chase','disabled'].includes(row.state))continue;
      for(const key of allowed)if(row[key]!==undefined)game.drones[i][key]=clone(row[key]);
      game.drones[i].path=[];game.drones[i].repath=0;
    }
  }
  if(game.flags.labResolved)disableSentry();
  checkpointRpg=clone(session.exploration);
  ui.show('title',false);
  updateLocation();
  if(rejectedSave)ui.toast('INVALID RPG RECORD — RECOVERED A FRESH FIELD',4);
  const openMenu=()=>{
    if(game.mode!=='play'&&game.mode!=='pause')return;
    game.mode='rpgmenu';ui.show('pause',false);menu.shell.classList.remove('hidden');
    renderMenu();
  };
  const closeMenu=()=>{
    menu.shell.classList.add('hidden');game.mode='play';
  };
  const menuButton=el('button','pix-btn','RPG');
  menuButton.id='lab-rpg-menu';menuButton.type='button';
  menuButton.setAttribute('aria-label','RPG field record');
  menuButton.style.right='calc(var(--u) * 62)';
  menuButton.style.width='calc(var(--u) * 31)';
  menuButton.style.fontSize='calc(var(--u) * 6)';
  menuButton.addEventListener('click',openMenu);
  $('hud').appendChild(menuButton);

  function renderMenu(){
    menu.panel.replaceChildren();
    const header=el('div','case-head'),heading=el('h2','', connected?'AEON CIRCUIT // FIELD RECORD':'RPG FIELD RECORD // TEST');
    header.append(heading,softButton('CLOSE',closeMenu));menu.panel.appendChild(header);
    const tabs=el('div','btn-row');
    tabs.style.flexWrap='wrap';
    for(const t of RPG_TABS){
      const b=softButton(t.toUpperCase(),()=>{menuTab=t;renderMenu();});
      if(t===menuTab)b.classList.add('active');
      tabs.appendChild(b);
    }
    menu.panel.appendChild(tabs);
    const model=rpgMenuModel(session.exploration,menuTab,db.inspect());
    const body=el('div','case-body'),list=el('ul');
    list.style.cssText='list-style:none;width:40%;overflow:auto;touch-action:pan-y';
    const detail=el('pre','',model.rows[0].detail);
    detail.style.cssText='white-space:pre-wrap;overflow:auto;flex:1;font-size:calc(var(--u) * 10);touch-action:pan-y';
    for(const row of model.rows){
      const li=el('li'),btn=el('button','case-item',row.name);
      btn.addEventListener('click',()=>{detail.textContent=row.detail;});
      li.appendChild(btn);list.appendChild(li);
    }
    body.append(list,detail);menu.panel.appendChild(body);
    if(menuTab==='party'&&connected)menu.panel.appendChild(softButton('FORMATION / RESERVE',renderFormation));
    if(menuTab==='status'&&connected)menu.panel.appendChild(softButton('AREA MAP',renderAreaMap));
    if(menuTab==='equipment')menu.panel.appendChild(
      softButton('CHANGE EQUIPMENT',chooseEquipmentMember));
    if(menuTab==='items'){
      const kit=softButton('USE REPAIR KIT',()=>chooseFieldRecipient('repair-kit'));
      kit.disabled=!(session.exploration.inventory['repair-kit']>0 &&
        session.exploration.party.some(p=>p.hp>0&&p.hp<p.maxHp));
      menu.panel.appendChild(kit);
    }
    if(menuTab==='save')menu.panel.appendChild(softButton('SAVE RPG TEST RECORD',
      ()=>{const ok=save();ui.toast(ok?'RPG RECORD SAVED':'RPG SAVE FAILED',2.5);renderMenu();}));
  }
  function renderAreaMap(){
    menu.panel.replaceChildren();
    menu.panel.appendChild(el('h2','','CONNECTED AREA RECORD'));
    const record=el('pre','');
    record.style.cssText='white-space:pre-wrap;overflow:auto;font-size:calc(var(--u) * 10)';
    record.textContent=connected.graph.ids.map(id=>(id===game.m.id?'[CURRENT] ':'[LINKED] ')+id.toUpperCase()).join('\n')+
      '\n\nPOSITION '+Math.floor(game.player.x/32)+', '+Math.floor(game.player.y/32)+
      '\n32 PX FIELD GRID // WALK THROUGH MARKED DOORWAYS';
    menu.panel.append(record,softButton('BACK',renderMenu));
    menu.panel.querySelector('button')?.focus();
  }
  function renderFormation(){
    menu.panel.replaceChildren();menu.panel.appendChild(el('h2','','PARTY // FORMATION'));
    const world=session.exploration,active=world.activeParty||world.party.map(p=>p.id).slice(0,3);
    const reserve=world.party.filter(p=>!active.includes(p.id));
    menu.panel.appendChild(el('div','fine','Three active slots and one reserve. Changes are recorded before combat.'));
    const row=el('div','btn-row');row.style.flexWrap='wrap';
    function commit(ids){
      const previous=session;
      try{session=setHybridActiveParty(session,ids);if(!save()){session=previous;ui.toast('FORMATION NOT CHANGED — SAVE UNAVAILABLE',3);}}
      catch(error){session=previous;ui.toast('FORMATION BLOCKED: '+error.message,3);}
      renderFormation();
    }
    for(const [index,id] of active.entries()){
      const unit=world.party.find(p=>p.id===id);
      if(index>0)row.appendChild(softButton('MOVE '+unit.name.toUpperCase()+' FORWARD',()=>{
        const next=[...active];[next[index-1],next[index]]=[next[index],next[index-1]];commit(next);
      }));
      for(const alternate of reserve)row.appendChild(softButton('SWAP '+unit.name.toUpperCase()+' / '+alternate.name.toUpperCase(),
        ()=>commit(active.map(value=>value===id?alternate.id:value))));
    }
    const listing=el('pre','',active.map((id,i)=>(i+1)+'. '+world.party.find(p=>p.id===id).name).join('\n')+
      '\nRESERVE: '+(reserve.map(p=>p.name).join(', ')||'NONE RECRUITED'));
    listing.style.fontSize='calc(var(--u) * 10)';
    row.appendChild(softButton('BACK',renderMenu));menu.panel.append(listing,row);row.querySelector('button')?.focus();
  }
  function chooseEquipmentMember(){
    if(game.mode!=='rpgmenu')return;
    menu.panel.replaceChildren();
    menu.panel.appendChild(el('h2','','EQUIPMENT // SELECT FRAME'));
    const options=el('div','btn-row');options.style.flexWrap='wrap';
    for(const unit of session.exploration.party){
      options.appendChild(softButton(unit.name+' · '+unit.lineage.toUpperCase(),
        ()=>chooseEquipmentItem(unit.id)));
    }
    options.appendChild(softButton('BACK',renderMenu));
    menu.panel.appendChild(options);
    options.querySelector('button')?.focus();
  }
  function chooseEquipmentItem(memberId){
    const unit=session.exploration.party.find(p=>p.id===memberId);
    if(!unit||game.mode!=='rpgmenu')return;
    menu.panel.replaceChildren();
    menu.panel.appendChild(el('h2','',unit.name.toUpperCase()+' // WEAPON'));
    menu.panel.appendChild(el('div','fine','Modern Foundry equipment cannot interface with ancient or Echo chassis.'));
    const options=el('div','btn-row');options.style.flexWrap='wrap';
    for(const [id,count] of Object.entries(session.exploration.inventory)){
      const item=LAB_GEAR[id];
      if(!item||!count||item.slot!=='weapon')continue;
      const permitted=item.allowedLineages.includes(unit.lineage);
      const btn=softButton(item.label.toUpperCase()+' · ATK +'+(item.attack||0)+
        (permitted?'':' · INCOMPATIBLE'),()=>{
        const prior=session;
        try{
          const party=createParty({
            members:session.exploration.party,
            active:session.exploration.activeParty||session.exploration.party.map(p=>p.id),
            inventory:session.exploration.inventory,equipment:session.exploration.equipment
          });
          const next=equipItem(party,memberId,'weapon',id,LAB_GEAR);
          const world=clone(session.exploration);
          world.inventory=clone(next.inventory);
          world.equipment=clone(next.equipment);
          session=createHybridSession(world,policy());
          if(!save()){
            session=prior;
            ui.toast('EQUIPMENT NOT CHANGED — SAVE UNAVAILABLE',3);
          }else ui.toast(unit.name.toUpperCase()+' EQUIPPED '+item.label.toUpperCase(),3);
        }catch(error){
          session=prior;
          ui.toast('EQUIPMENT BLOCKED — '+error.message,2.5);
        }
        renderMenu();
      });
      btn.disabled=!permitted;options.appendChild(btn);
    }
    options.appendChild(softButton('BACK',chooseEquipmentMember));
    menu.panel.appendChild(options);
    options.querySelector('button:not(:disabled)')?.focus();
  }
  function chooseFieldRecipient(itemId){
    if(game.mode!=='rpgmenu')return;
    menu.panel.replaceChildren();
    menu.panel.appendChild(el('h2','','FIELD SUPPLY // SELECT RECIPIENT'));
    menu.panel.appendChild(el('div','fine','Repair kits restore up to 20 HP. Only living wounded units qualify.'));
    const options=el('div','btn-row');
    options.style.flexWrap='wrap';
    for(const unit of session.exploration.party.filter(p=>p.hp>0&&p.hp<p.maxHp)){
      options.appendChild(softButton(unit.name+' · HP '+unit.hp+'/'+unit.maxHp,()=>{
        const old=session;
        try{
          const result=useFieldConsumable(session.exploration,itemId,unit.id);
          session=createHybridSession(result.exploration,policy());
          // A field transaction only completes when its updated journal is durable.
          if(!save()){
            session=old;
            ui.toast('FIELD ITEM NOT USED — SAVE UNAVAILABLE',3);
            renderMenu();return;
          }
          ui.toast(result.recipientId.toUpperCase()+' RESTORED '+result.healed+' HP',2.5);
          renderMenu();
        }catch(error){
          session=old;
          ui.toast('FIELD ITEM BLOCKED — '+error.message,2.5);
          renderMenu();
        }
      }));
    }
    options.appendChild(softButton('BACK',renderMenu));
    menu.panel.appendChild(options);
    options.querySelector('button')?.focus();
  }
  function showBattle(){
    battle.panel.replaceChildren();
    if(session.phase!=='battle')return;
    const b=session.battle,actor=currentCombatant(b),unit=b.party.find(u=>'party:'+u.id===actor);
    battle.panel.appendChild(el('h2','', 'SIDE-VIEW SECURITY ENCOUNTER // ROUND '+b.round));
    sideView.setBattle(b,actor);
    battle.panel.appendChild(sideView.canvas);
    const report=el('pre','');
    report.style.cssText='white-space:pre-wrap;overflow:hidden;flex-shrink:0;font-size:calc(var(--u) * 8);line-height:1';
    const warning=enemyForecast(b);
    report.textContent=b.party.map(p=>p.name+' HP '+p.hp+'/'+p.maxHp+' EP '+p.ep).join(' / ')+
      '\n'+b.enemies.map(e=>e.name+' HP '+e.hp+'/'+e.maxHp).join(' / ')+
      '\nSENTRY INTENT: '+warning.text+'\n'+(b.log.at(-1)||'Observe, defend or disrupt.');
    battle.panel.appendChild(report);
    if(!unit)return;
    const commands=el('div','btn-row');
    commands.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(var(--u) * 3);flex-shrink:0';
    const foe=activeEnemy(b);
    const options=[
      ['ATTACK',{type:'attack',target:'enemy:'+foe.id},true],
      ['PULSE (5 EP)',{type:'pulse',target:'enemy:'+foe.id},unit.ep>=5&&(unit.id==='sleeper'||unit.id===DEV_CHARACTER)],
      ['GUARD',{type:'guard'},true],
      ['REPAIR (5 EP)',{type:'repair'},unit.ep>=5&&unit.id==='echo'],
      ['KIT',{type:'item',item:'repair-kit'},!!b.inventory['repair-kit']],
      ['WITHDRAW',{type:'flee'},b.canFlee]
    ];
    for(const [label,command,enabled] of options){
      const button=softButton(label,()=>{
        if(command.type==='repair'||command.type==='item')chooseAllyTarget({actor,...command});
        else if(['attack','pulse'].includes(command.type)&&b.enemies.filter(e=>e.hp>0).length>1)chooseEnemyTarget({actor,...command});
        else takeAction({actor,...command});
      });
      button.disabled=!enabled;
      button.style.cssText='min-width:0;padding:calc(var(--u) * 3);font-size:calc(var(--u) * 7);text-align:center';
      commands.appendChild(button);
    }
    battle.panel.appendChild(commands);
    commands.querySelector('button:not(:disabled)')?.focus();
  }
  function chooseEnemyTarget(command){
    if(session.phase!=='battle'||presentationBusy)return;
    battle.panel.replaceChildren();battle.panel.appendChild(el('h2','','SELECT HOSTILE TARGET'));
    battle.panel.appendChild(sideView.canvas);
    const options=el('div','btn-row');options.style.flexWrap='wrap';
    for(const enemy of session.battle.enemies.filter(e=>e.hp>0)){
      const button=softButton(enemy.name+' · HP '+enemy.hp+'/'+enemy.maxHp,()=>{
        // Rebuild the stage/report before the locked action queue begins.
        showBattle();takeAction({...command,target:'enemy:'+enemy.id});
      });
      button.addEventListener('focus',()=>sideView.setBattle(session.battle,'enemy:'+enemy.id));
      options.appendChild(button);
    }
    options.appendChild(softButton('BACK',showBattle));battle.panel.appendChild(options);options.querySelector('button')?.focus();
  }
  function chooseAllyTarget(command){
    if(session.phase!=='battle'||presentationBusy)return;
    const candidates=session.battle.party.filter(unit=>unit.hp>0);
    battle.panel.replaceChildren();
    battle.panel.appendChild(el('h2','',command.type==='repair'?'REPAIR // SELECT ALLY':'REPAIR KIT // SELECT ALLY'));
    battle.panel.appendChild(el('div','fine','Choose the party member who receives the resource. No EP or item is consumed until confirmed.'));
    const choices=el('div','btn-row');
    choices.style.flexWrap='wrap';
    for(const unit of candidates){
      choices.appendChild(softButton(unit.name+' · HP '+unit.hp+'/'+unit.maxHp,
        ()=>{showBattle();takeAction({...command,target:'party:'+unit.id});}));
    }
    choices.appendChild(softButton('BACK',showBattle));
    battle.panel.appendChild(choices);
    choices.querySelector('button')?.focus();
  }
  let presentationBusy=false;
  async function takeAction(action){
    if(presentationBusy||session.phase!=='battle')return;
    presentationBusy=true;
    try{
      const actionSequence=[action];
      let visualBattle=combatAction(session.battle,action);
      session=actHybrid(session,action);
      while(session.phase==='battle'&&currentCombatant(session.battle)?.startsWith('enemy:')){
        const response=enemyDecision(session.battle);
        actionSequence.push(response);
        visualBattle=combatAction(session.battle,response);
        session=actHybrid(session,response);
      }
      sideView.playActions(actionSequence);
      sideView.setBattle(visualBattle,currentCombatant(visualBattle));
      const outcome=session.phase==='exploration'?session.event.outcome:null;
      if(outcome){
      const result=outcome;
      apply(s=>{s.quests.sentry=result==='victory'?'neutralized':result;});
      if(result==='victory'){
        game.flags.labResolved=true;disableSentry();
        apply(s=>{s.flags.labResolved=true;});
        ui.toast('SENTRY NEUTRALIZED // XP AND SALVAGE RECORDED',4);
      }else{
        cooldown=game.time+6;
        if(result==='defeat') apply(s=>s.party.filter(p=>!s.activeParty||s.activeParty.includes(p.id)).forEach(p=>{p.hp=Math.max(1,Math.ceil(p.maxHp/2));}));
        game.drones.forEach(d=>{d.state='investigate';d.t=3;d.alert=0;d.target={x:d.x,y:d.y};d.repath=0;});
        ui.toast(result==='fled'?'WITHDRAWN — SEARCH CONTINUES':'PARTY DISABLED — FIELD RECOVERY REQUIRED',4);
      }
        save(); // outcome flags and rewards become durable as one record
      }
      if(session.phase==='battle')showBattle();
      // The deterministic result is ready, but complete authored strike/recoil and
      // target recovery clips before accepting another command or leaving the stage.
      for(const button of battle.panel.querySelectorAll('button'))button.disabled=true;
      await new Promise(resolve=>{
        const wait=()=>sideView.isPresenting?requestAnimationFrame(wait):resolve();
        requestAnimationFrame(wait);
      });
      presentationBusy=false;
      if(session.phase==='battle'){showBattle();return;}
      const result=outcome;
      const saved=save();
      if(!connected&&saved){battle.shell.classList.add('hidden');game.mode='play';ui.show('touch',!!touchMode?.());return;}
      battle.panel.replaceChildren();
      battle.panel.appendChild(el('h2','', 'ENCOUNTER // '+result.toUpperCase()));
      battle.panel.appendChild(el('pre','',result==='victory'?'SALVAGE AND EXPERIENCE RECORDED':'PARTY RETURNING TO THE FIELD'));
      const finish=()=>{
        if(!save()){ui.toast('SAVE UNAVAILABLE — RETRY TO KEEP THE RESULT',3);return;}
        battle.shell.classList.add('hidden');game.mode='play';ui.show('touch',!!touchMode?.());
      };
      const button=softButton(saved?'RETURN TO FIELD':'RETRY SAVE / RETURN',finish);
      battle.panel.appendChild(button);button.focus();
    }catch(err){presentationBusy=false;ui.toast('COMMAND INVALID: '+err.message,2);if(session.phase==='battle')showBattle();}
  }
  function startEncounter(){
    if(session.phase!=='exploration'||game.flags.labResolved)return;
    try{
      session=detectHybrid(session,threat());
      if(session.phase!=='battle')return;
      game.mode='battle';battle.shell.classList.remove('hidden');
      ui.show('touch',false);showBattle();
    }catch(err){ui.toast('ENCOUNTER FAILED: '+err.message,3);}
  }
  // In this explicitly opted-in test only, the original pause SAVE action must write the RPG journal.
  $('btn-save').onclick=()=>{$('pause-note').textContent=save()?'RPG test record saved to this device.':'RPG record could not be saved.';};
  $('btn-quit').onclick=()=>{if(save())window.location.assign(new URL(connected?'aeon.html':'engine-lab.html',window.location.href).href);else $('pause-note').textContent='Save failed. Remain in sector until record is safe.';};
  addEventListener('ghost-signal-host-pause',()=>{if(session.phase==='exploration'&&db.inspect().hasSave)save();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session.phase==='exploration'&&db.inspect().hasSave)save();});
  const previousResume=game.onResume;
  game.onResume=()=>{
    if(game.mode==='pause')previousResume();
    else if(game.mode==='rpgmenu')closeMenu();
  };
  document.addEventListener('keydown',event=>{
    if(!['rpgmenu','battle'].includes(game.mode)) {
      if(event.code==='KeyM'&&game.mode==='play'){event.preventDefault();openMenu();}
      return;
    }
    if(event.code==='Escape'&&game.mode==='rpgmenu'){event.preventDefault();closeMenu();}
    if(event.code==='ArrowDown'||event.code==='ArrowUp'){
      const root=game.mode==='battle'?battle.shell:menu.shell;
      const buttons=[...root.querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);
      if(!buttons.length)return;
      const index=buttons.indexOf(document.activeElement);
      const offset=event.code==='ArrowDown'?1:-1;
      buttons[(index<0?0:(index+offset+buttons.length)%buttons.length)].focus();event.preventDefault();
    }
  });
  // Lab-specific convenience API: safe for browser automation and reproducible QA.
  window.__rpgLab=Object.freeze({
    inspect:()=>({mode:game.mode,session:status(),save:db.inspect(),field:game.snapshot(),
      battleView:session.phase==='battle'||presentationBusy?'side-view':null,
      connected:connected?{mapId:game.m.id,maps:Object.keys(maps),busy:!!traveler?.busy}:null,
      presenting:presentationBusy,
      v5:v5?{starterId:v5.starterId,catalogCount:v5.catalogCount,worldFrameColumns:14}:null}),
    save,menu:openMenu
  });
  return window.__rpgLab;
}
