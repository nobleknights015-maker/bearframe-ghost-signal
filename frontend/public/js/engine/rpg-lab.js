// Playable noncanonical RPG integration lab, activated ONLY by ?rpg-lab=1.
// Reuses the existing Ghost Signal Game field, stealth, tiles, fonts, overlays and controls.
import {createHybridSession,moveHybrid,detectHybrid,actHybrid} from './hybrid-session.js';
import {currentCombatant,enemyDecision} from './rpg-combat.js';
import {rpgMenuModel,RPG_TABS} from './rpg-menu-model.js';
import {createRpgSaveStore} from './rpg-save.js';
import {useFieldConsumable} from './rpg-field-actions.js';
import {createParty,equipItem} from './rpg-party.js';
import {LAB_GEAR} from './rpg-lab-gear.js';
import {migrateLabWorld} from './rpg-lab-migration.js';
import {createLabMission,LAB_POLICY_SPEC} from './rpg-lab-mission.js';

const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const px=(x,y,facing='right')=>({mapId:'rpg-lab',x,y,facing});
const initial=()=>({
  location:px(5.5*32,9*32),party:[
    {id:'sleeper',lineage:'sleeper',name:'Sleeper Test',hp:38,maxHp:38,ep:10,maxEp:10,attack:11,defense:4,speed:10,level:1,skills:['pulse','guard']},
    {id:'echo',lineage:'echo',name:'Echo Test',hp:29,maxHp:29,ep:10,maxEp:10,attack:7,defense:2,speed:7,level:1,skills:['repair','guard']}
  ],inventory:{'repair-kit':1,'legacy-blade':1,'echo-link':1,'foundry-module':1},equipment:{sleeper:{weapon:'legacy-tool'},echo:{}},
  quests:{archive:'unknown',perimeter:'unexplored',sentry:'unresolved'},progression:{xp:0},
  stealth:{alert:0},flags:{}
});
const threat=()=>({
  id:'sentinel-lab',enemies:[
    {id:'sentry',name:'Old Sentry',hp:42,maxHp:42,ep:0,maxEp:0,attack:9,defense:4,speed:8}
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

export function mountRpgLab({game,ui,sfx,touchMode}) {
  // Never write a Ghost Signal mission save/progress key from the lab.
  game.store={save:()=>true,clear:()=>{},loadProgress:()=>({unlocked:{},done:{},case:null}),saveProgress:()=>true};
  const db=createRpgSaveStore(localStorage,'bearframe_ghost_signal_rpg_lab_v1');
  let session=createHybridSession(initial(),LAB_POLICY_SPEC),cooldown=0,menuTab='status';
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
      session=createHybridSession(clone(checkpointRpg),LAB_POLICY_SPEC);
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
  const status=()=>session;
  const location=()=>px(game.player.x,game.player.y,game.player.dir);
  const apply=(fn)=>{
    const next=clone(session.exploration);fn(next);
    session=createHybridSession(next,LAB_POLICY_SPEC);
  };
  const save=()=>{
    if(session.phase!=='exploration')return false;
    const g=game.snapshot();
    const world=clone(session.exploration);world.location=location();
    const security=game.drones.map(d=>({x:d.x,y:d.y,dir:d.dir,state:d.state,wp:d.wp,
      alert:d.alert,blind:d.blind,invCd:d.invCd,t:d.t,lost:d.lost,last:d.last,target:d.target,
      seen:d.seen,searchN:d.searchN,hitCd:d.hitCd,returning:d.returning}));
    return db.save({version:1,phase:'exploration',world,field:g,security});
  };
  const updateLocation=()=>{
    if(session.phase!=='exploration')return;
    const now=location(),before=session.exploration.location;
    if(now.x!==before.x||now.y!==before.y||now.facing!==before.facing)
      session=moveHybrid(session,now);
    const inStealth=session.security.mode==='stealth';
    $('hud-stealth').classList.toggle('hidden',!inStealth);
    if(inStealth&&!game.flags.labEntered) {
      game.flags.labEntered=true;
      apply(e=>e.quests.perimeter='entered');
      ui.toast('SECURITY PERIMETER — MOVEMENT / LIGHT / SCAN MATTER',3);
    }
  };
  const disableSentry=()=>{
    for(const d of game.drones){d.state='disabled';d.t=1e9;d.alert=0;d.vis=false;}
  };
  const mission=createLabMission({
    onUpdate(g){
      updateLocation();
      if(g.flags.labResolved){disableSentry();return;}
      if(g.time<cooldown || session.phase!=='exploration' || session.security.mode!=='stealth')return;
      if(g.drones.some(d=>d.state==='chase'))startEncounter();
    },
    onInteract(e,g){
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
  });
  const saved=db.load();
  const valid=!!saved&&saved.version===1&&saved.phase==='exploration'&&
    saved.world?.location?.mapId==='rpg-lab'&&saved.field?.mission==='rpg-lab';
  if(valid){
    try{session=createHybridSession(migrateLabWorld(saved.world),LAB_POLICY_SPEC);}
    catch(_){session=createHybridSession(initial(),LAB_POLICY_SPEC);}
  }
  ui.show('title',false);ui.show('ending',false);
  let restored=false;
  try { game.start(mission,valid?saved.field:null); restored=valid; }
  catch (error) {
    // Corrupt or future-incompatible snapshots never destroy the original game or brick the lab.
    console.warn('RPG lab restore invalid, starting fresh',error);
    session=createHybridSession(initial(),LAB_POLICY_SPEC);
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
    const header=el('div','case-head'),heading=el('h2','', 'RPG FIELD RECORD // TEST');
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
            active:session.exploration.party.map(p=>p.id),
            inventory:session.exploration.inventory,equipment:session.exploration.equipment
          });
          const next=equipItem(party,memberId,'weapon',id,LAB_GEAR);
          const world=clone(session.exploration);
          world.inventory=clone(next.inventory);
          world.equipment=clone(next.equipment);
          session=createHybridSession(world,LAB_POLICY_SPEC);
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
          session=createHybridSession(result.exploration,LAB_POLICY_SPEC);
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
    battle.panel.appendChild(el('h2','', 'SECURITY ENCOUNTER // ROUND '+b.round));
    const report=el('pre','');
    report.style.cssText='white-space:pre-wrap;font-size:calc(var(--u) * 10);line-height:1.15';
    const targetForecast=[...b.party].filter(p=>p.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
    report.textContent=b.party.map(p=>p.name+'  HP '+p.hp+'/'+p.maxHp+'  EP '+p.ep).join('\n')+
      '\n'+b.enemies.map(e=>e.name+'  HP '+e.hp+'/'+e.maxHp).join('\n')+
      '\nSENTRY INTENT: STRIKE '+(targetForecast?.name||'UNKNOWN')+'\n'+(b.log.at(-1)||'Observe, defend or disrupt.');
    battle.panel.appendChild(report);
    if(!unit)return;
    battle.panel.appendChild(el('div','fine',unit.name.toUpperCase()+' // SELECT COMMAND'));
    const commands=el('div','btn-row');
    commands.style.flexWrap='wrap';
    const foe=activeEnemy(b);
    const options=[
      ['ATTACK',{type:'attack',target:'enemy:'+foe.id},true],
      ['PULSE (5 EP)',{type:'pulse',target:'enemy:'+foe.id},unit.ep>=5&&unit.id==='sleeper'],
      ['GUARD',{type:'guard'},true],
      ['REPAIR (5 EP)',{type:'repair'},unit.ep>=5&&unit.id==='echo'],
      ['KIT',{type:'item',item:'repair-kit'},!!b.inventory['repair-kit']],
      ['WITHDRAW',{type:'flee'},b.canFlee]
    ];
    for(const [label,command,enabled] of options){
      const button=softButton(label,()=>{
        if(command.type==='repair'||command.type==='item')chooseAllyTarget({actor,...command});
        else takeAction({actor,...command});
      });
      button.disabled=!enabled;commands.appendChild(button);
    }
    battle.panel.appendChild(commands);
    commands.querySelector('button:not(:disabled)')?.focus();
  }
  function chooseAllyTarget(command){
    if(session.phase!=='battle')return;
    const candidates=session.battle.party.filter(unit=>unit.hp>0);
    battle.panel.replaceChildren();
    battle.panel.appendChild(el('h2','',command.type==='repair'?'REPAIR // SELECT ALLY':'REPAIR KIT // SELECT ALLY'));
    battle.panel.appendChild(el('div','fine','Choose the party member who receives the resource. No EP or item is consumed until confirmed.'));
    const choices=el('div','btn-row');
    choices.style.flexWrap='wrap';
    for(const unit of candidates){
      choices.appendChild(softButton(unit.name+' · HP '+unit.hp+'/'+unit.maxHp,
        ()=>takeAction({...command,target:'party:'+unit.id})));
    }
    choices.appendChild(softButton('BACK',showBattle));
    battle.panel.appendChild(choices);
    choices.querySelector('button')?.focus();
  }
  function takeAction(action){
    try{
      session=actHybrid(session,action);
      while(session.phase==='battle'&&currentCombatant(session.battle)?.startsWith('enemy:'))
        session=actHybrid(session,enemyDecision(session.battle));
      if(session.phase==='battle'){showBattle();return;}
      battle.shell.classList.add('hidden');game.mode='play';
      ui.show('touch',!!touchMode?.());
      const result=session.event.outcome;
      apply(s=>{s.quests.sentry=result==='victory'?'neutralized':result;});
      if(result==='victory'){
        game.flags.labResolved=true;disableSentry();ui.toast('SENTRY NEUTRALIZED // XP AND SALVAGE RECORDED',4);
      }else{
        cooldown=game.time+6;
        if(result==='defeat') apply(s=>s.party.forEach(p=>{p.hp=Math.max(1,Math.ceil(p.maxHp/2));}));
        game.drones.forEach(d=>{d.state='investigate';d.t=3;d.alert=0;d.target={x:d.x,y:d.y};d.repath=0;});
        ui.toast(result==='fled'?'WITHDRAWN — SEARCH CONTINUES':'PARTY DISABLED — FIELD RECOVERY REQUIRED',4);
      }
      save();
    }catch(err){ui.toast('COMMAND INVALID: '+err.message,2);}
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
  $('btn-quit').onclick=()=>{if(save())window.location.assign(window.location.pathname);else $('pause-note').textContent='Save failed. Remain in sector until record is safe.';};
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
    inspect:()=>({mode:game.mode,session:status(),save:db.inspect(),field:game.snapshot()}),
    save,menu:openMenu
  });
  return window.__rpgLab;
}
