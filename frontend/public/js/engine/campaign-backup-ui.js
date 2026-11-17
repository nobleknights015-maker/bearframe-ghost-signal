// Additive portable record transfer in campaign title menu.
// Uses the EXISTING Ghost Signal title/menu styles and controller focus root.
// Works offline; private campaign content never leaves the device by default.
import {createCampaignJournal} from './campaign-journal.js';
import {makeCampaignBackup,inspectCampaignBackup,restoreCampaignBackup} from './campaign-backup.js';

const starters=['sleeper_A','sleeper_B','sleeper_C','sleeper_D'];
const item=(tag,text,className='')=>{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(className)node.className=className;
  return node;
};
const button=(text,fn)=>{
  const node=item('button',text,'menu-btn sm');
  node.type='button';node.onclick=fn;return node;
};
export function mountCampaignBackupUI({title,storage,content,worldSpec,
  confirmReplacement,hasSave,onImported=()=>{}}){
  if(!title||typeof hasSave!=='function'||typeof confirmReplacement!=='function')
    throw new TypeError('Portable campaign save UI requires the original title controls');
  const main=title.querySelector('.title-main'),original=main?.querySelector('.menu');
  if(!original)throw new TypeError('Original Ghost Signal title menu was not found');
  const launch=button('SAVE BACKUP / RESTORE',open);
  launch.id='campaign-backup-launch';
  launch.className='menu-btn';
  original.append(launch);
  const transfer=item('div',undefined,'menu hidden');
  transfer.id='campaign-backup-menu';
  transfer.style.cssText='max-width:100%;gap:calc(var(--u)*3)';
  const heading=item('h2','CAMPAIGN SAVE TRANSFER');
  heading.style.fontSize='calc(var(--u)*13)';
  const note=item('div','Choose an existing Sleeper record to back up, or paste a previously copied backup to restore.','fine');
  const chooser=item('div',undefined,'btn-row');
  chooser.style.cssText='display:flex;flex-wrap:wrap;gap:calc(var(--u)*3)';
  const area=item('textarea');
  area.id='campaign-backup-text';
  area.placeholder='Paste your own Aeon Circuit campaign backup here';
  area.maxLength=2*1024*1024;
  area.spellcheck=false;area.setAttribute('aria-label','Portable campaign save text');
  area.style.cssText='box-sizing:border-box;width:100%;height:calc(var(--u)*70);resize:none;min-height:70px;color:#e1e7dc;background:#080b0d;border:1px solid #555;padding:calc(var(--u)*3);font-family:monospace;font-size:calc(var(--u)*7)';
  const actions=item('div',undefined,'btn-row');
  actions.style.cssText='display:flex;flex-wrap:wrap;gap:calc(var(--u)*3)';
  const status=item('p','BACKUPS STAY ON THIS DEVICE UNTIL YOU COPY THEM.','fine');
  status.id='campaign-backup-status';
  status.setAttribute('role','status');
  const warn=item('p','Save this text somewhere private before uninstalling an APK. Imports require the same approved story and map revision.','fine');
  const closeButton=button('BACK',close);
  function message(text){status.textContent=text;}
  function updateChoices(){
    chooser.replaceChildren();
    for(const starterId of starters){
      const node=button('BACK UP '+starterId.replace('_',' ').toUpperCase(),async()=>{
        try{
          const journal=createCampaignJournal({storage,starterId,content,worldSpec});
          if(!journal.load())throw new Error('No valid saved record for this Sleeper');
          area.value=makeCampaignBackup(journal);
          area.focus();area.select();
          message('BACKUP READY — COPY THE TEXT TO A SAFE PLACE BEFORE CHANGING APKS');
          // Browser clipboard is permission-dependent on Android; if denied,
          // text stays selected for the user's normal Copy action.
          try{
            if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(area.value);
            message('BACKUP COPIED — SAVE IT PRIVATELY BEFORE UNINSTALLING');
          }catch{message('BACKUP SELECTED — USE YOUR DEVICE COPY COMMAND');}
        }catch(e){message('BACKUP UNAVAILABLE — '+e.message);}
      });
      node.disabled=!hasSave(starterId);
      chooser.append(node);
    }
  }
  const select=button('SELECT BACKUP TEXT',()=>{area.focus();area.select();});
  const paste=button('PASTE FROM CLIPBOARD',async()=>{
    try{
      if(!navigator.clipboard?.readText)throw new Error('Clipboard paste unavailable');
      area.value=await navigator.clipboard.readText();
      message('BACKUP TEXT PASTED — REVIEW THEN SELECT RESTORE');
    }catch{area.focus();message('USE YOUR DEVICE PASTE COMMAND IN THE TEXT BOX');}
  });
  const restore=button('RESTORE PASTED RECORD',async()=>{
    try{
      const backup=inspectCampaignBackup(area.value,{content,worldSpec});
      const replacing=hasSave(backup.starterId);
      // Reuse the existing protected replacement-confirmation modal.
      // It must sit above our editor and own controller focus until dismissed.
      if(replacing){
        transfer.classList.add('hidden');
        const approved=await confirmReplacement(backup.starterId);
        transfer.classList.remove('hidden');
        if(!approved){message('EXISTING SAVE KEPT — NO CHANGES MADE');return;}
      }
      const result=restoreCampaignBackup(area.value,{storage,content,worldSpec,
        replace:replacing});
      message('RESTORED '+result.starterId.toUpperCase()+
        ' — '+(result.hasBattle?'SAVED BATTLE':'FIELD')+' RECORD VERIFIED. SELECT CONTINUE.');
      updateChoices();onImported(result); // No running game is ever hot-swapped.
    }catch(e){message('RESTORE BLOCKED — '+e.message);}
  });
  actions.append(select,paste,restore,closeButton);
  transfer.append(heading,note,chooser,area,actions,status,warn);
  original.after(transfer);
  let openNow=false;
  function open(){
    if(openNow)return;
    openNow=true;area.value='';
    updateChoices();message('SAVE TRANSFER READY — NO EXISTING RECORDS HAVE BEEN ALTERED');
    original.classList.add('hidden');
    transfer.classList.remove('hidden');
    const first=chooser.querySelector('button:not(:disabled)')||closeButton;
    first.focus();
  }
  function close(){
    if(!openNow)return;
    openNow=false;transfer.classList.add('hidden');
    original.classList.remove('hidden');launch.focus();
  }
  function keydown(event){
    if(!openNow)return;
    if(event.code==='Escape'){
      event.preventDefault();event.stopPropagation();close();
    }
  }
  document.addEventListener('keydown',keydown);
  return Object.freeze({
    open,close,
    inspect:()=>({open:openNow,hasText:!!area.value}),
    stop(){close();document.removeEventListener('keydown',keydown);
      launch.remove();transfer.remove();}
  });
}
