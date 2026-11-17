// Campaign field record: reuse Ghost Signal menu styling and the tested
// reusable RPG menu/party models. No gameplay math, screenplay or private
// art is defined here; each view reads the durable campaign journal.
import {rpgMenuModel,RPG_TABS} from './rpg-menu-model.js';
import {createCampaignParty,swapPartyReserve} from './rpg-party.js';

const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{
  const n=document.createElement(tag);
  if(text!==undefined)n.textContent=text;
  if(cls)n.className=cls;
  return n;
};
const button=(label,fn)=>{
  const n=node('button',label,'menu-btn sm');
  n.type='button';n.addEventListener('click',fn);return n;
};

export function mountCampaignFieldMenu({game,ui,journal,touchMode,questJournal=null}){
  if(!game||!ui||!journal||typeof journal.readWorld!=='function'||
     typeof journal.writeJournal!=='function')
    throw new TypeError('Campaign field menu requires existing game and journal');
  const shell=node('div',undefined,'overlay hidden');
  shell.id='rpg-lab-menu';shell.style.zIndex='16';
  const panel=node('section',undefined,'panel case');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','Aeon Circuit field record');
  shell.append(panel);$('stage').append(shell);
  const entry=node('button','RPG','pix-btn');
  entry.id='campaign-field-menu';entry.type='button';
  entry.setAttribute('aria-label','Open campaign field record');
  entry.style.right='calc(var(--u) * 62)';
  entry.style.width='calc(var(--u) * 31)';
  entry.style.fontSize='calc(var(--u) * 6)';
  $('hud').append(entry);

  let opened=false,stopped=false,tab='status';
  const visible=()=>!stopped&&game.mode==='rpgmenu'&&opened;
  function close(){
    if(!visible())return false;
    opened=false;game.mode='play';shell.classList.add('hidden');
    ui.show('touch',!!touchMode?.());
    return true;
  }
  function open(){
    if(stopped||opened||game.mode!=='play'||!journal.readJournal())return false;
    opened=true;game.mode='rpgmenu';ui.show('touch',false);
    shell.classList.remove('hidden');render();return true;
  }
  function persistParty(nextWorld){
    const record=journal.readJournal(),field=game.snapshot();
    if(!record||record.battle||record.mapId!==game.m?.id||
       field.mission!==record.mapId)return false;
    return journal.writeJournal({...record,mapId:record.mapId,
      maps:{...record.maps,[record.mapId]:field},
      field,world:nextWorld});
  }
  function formation(){
    if(!visible())return;
    const world=journal.readWorld();
    panel.replaceChildren(node('h2','FORMATION // ACTIVE & RESERVE'));
    const back=button('BACK',render);
    const active=world.activeParty;
    if(!Array.isArray(active)){
      panel.append(node('p','FORMATION NOT STAGED FOR THIS CAMPAIGN RECORD','fine'),back);
      back.focus();return;
    }
    let party;
    try{
      party=createCampaignParty({members:world.party,active,
        inventory:world.inventory,equipment:world.equipment});
    }catch(_){
      panel.append(node('p','FORMATION RECORD REQUIRES REVIEW','fine'),back);
      back.focus();return;
    }
    const listing=node('pre',[...active.map((id,i)=>(i+1)+'. '+(world.party.find(u=>u.id===id)?.name||id)),
      ...world.party.filter(u=>!active.includes(u.id)).map(u=>'R. '+(u.name||u.id))].join('\n'));
    listing.style.cssText='white-space:pre-wrap;font-size:calc(var(--u)*9)';
    panel.append(listing);
    const row=node('div',undefined,'btn-row');row.style.flexWrap='wrap';
    const reserves=world.party.filter(u=>!active.includes(u.id));
    for(const reserve of reserves)for(const id of active){
      const member=world.party.find(u=>u.id===id);
      row.append(button('SWAP '+(member?.name||id)+' / '+(reserve.name||reserve.id),()=>{
        try{
          const next=swapPartyReserve(party,id,reserve.id);
          if(!persistParty({...world,activeParty:[...next.active]})){
            ui.toast('FORMATION CHANGE NOT SAVED',3);return;
          }
          ui.toast('FORMATION RECORDED',2);
          formation();
        }catch(error){ui.toast('FORMATION REJECTED — '+error.message,3);}
      }));
    }
    row.append(back);panel.append(row);
    row.querySelector('button')?.focus();
  }
  function render(){
    if(!visible())return;
    const world=journal.readWorld();
    // Present only quests unlocked by source-authored durable flags. Keep
    // manually recorded quest entries intact; this view never edits saves.
    const staged=questJournal?.project(world.flags)||{};
    const menuWorld={...world,quests:{...staged,...world.quests}};
    const model=rpgMenuModel(menuWorld,tab,journal.inspect());
    panel.replaceChildren();
    const header=node('div',undefined,'case-head');
    header.append(node('h2',model.title),button('CLOSE',close));
    panel.append(header);
    const tabs=node('div',undefined,'btn-row');tabs.style.flexWrap='wrap';
    for(const id of RPG_TABS){
      const b=button(id.toUpperCase(),()=>{tab=id;render();});
      if(tab===id)b.classList.add('active');
      tabs.append(b);
    }
    panel.append(tabs);
    const body=node('div',undefined,'case-body');
    const list=node('ul');
    list.style.cssText='list-style:none;width:42%;overflow:auto;max-height:calc(var(--u)*126)';
    const detail=node('pre',model.rows[0].detail);
    detail.style.cssText='white-space:pre-wrap;overflow:auto;flex:1;font-size:calc(var(--u)*9)';
    for(const row of model.rows){
      const item=node('li'),b=node('button',row.name,'case-item');
      b.type='button';b.addEventListener('click',()=>{detail.textContent=row.detail;});
      item.append(b);list.append(item);
    }
    body.append(list,detail);panel.append(body);
    if(tab==='party'&&Array.isArray(world.activeParty)&&world.party.length>1)
      panel.append(button('FORMATION / RESERVE',formation));
    if(tab==='save'){
      panel.append(button('SAVE CAMPAIGN RECORD',()=>{
        const ok=journal.saveField(game.m.id,game.snapshot());
        ui.toast(ok?'CAMPAIGN FIELD RECORD SAVED':'CAMPAIGN SAVE FAILED',3);
        if(ok)render();
      }));
    }
    panel.querySelector('.case-head button')?.focus();
  }
  function keydown(event){
    if(stopped)return;
    if(event.code==='KeyM'&&game.mode==='play'&&!event.repeat){
      if(open())event.preventDefault();return;
    }
    if(!visible())return;
    if(event.code==='Escape'){
      event.preventDefault();close();return;
    }
    if(event.code==='ArrowUp'||event.code==='ArrowDown'){
      const buttons=[...shell.querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);
      if(!buttons.length)return;
      event.preventDefault();
      const i=buttons.indexOf(document.activeElement);
      const shift=event.code==='ArrowUp'?-1:1;
      buttons[i<0?0:(i+shift+buttons.length)%buttons.length].focus();
    }
  }
  const previousResume=game.onResume;
  const resume=()=>{if(!close())previousResume?.();};
  game.onResume=resume;
  entry.addEventListener('click',open);
  document.addEventListener('keydown',keydown);
  return Object.freeze({
    open,close,
    inspect:()=>({opened:visible(),tab,loaded:!!journal.readJournal()}),
    stop(){
      if(stopped)return;
      if(visible())close();
      stopped=true;
      document.removeEventListener('keydown',keydown);
      entry.remove();shell.remove();
      if(game.onResume===resume)game.onResume=previousResume;
    }
  });
}
