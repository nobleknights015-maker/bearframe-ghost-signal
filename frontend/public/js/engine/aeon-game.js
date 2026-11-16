// Additive unified engine entry. The fixture is explicitly noncanonical until
// the private authored campaign areas have their own reviewed runtime bindings.
import {loadAeonV5,chooseStarter,buildV5WorldSheet,mapV5Art} from './aeon-v5-bridge.js';
import {createAeonConnectedField} from './aeon-connected-field.js';
import {loadV5WorldActor,createV5SecurityRenderer} from './aeon-world-actors.js';
import {mountRpgLab} from './rpg-lab.js';
import {createRpgSaveStore} from './rpg-save.js';
const $=id=>document.getElementById(id);
const ids=['sleeper_A','sleeper_B','sleeper_C','sleeper_D'];
const saveFor=id=>createRpgSaveStore(localStorage,'bearframe_aeon_unified_'+id+'_v1');

export async function mountAeonGame({game,ui,sfx,touchMode,refreshTouch}){
  document.title='AEON CIRCUIT: THE SILENT WAKE // ENGINE';
  const title=$('title');
  title.querySelector('h1').replaceChildren(document.createTextNode('AEON CIRCUIT'),document.createElement('br'));
  const subtitle=document.createElement('span');subtitle.textContent='THE SILENT WAKE';title.querySelector('h1').append(subtitle);
  title.querySelector('.kicker').textContent='AEON CIRCUIT // DEVELOPMENT';
  title.querySelector('.sub').textContent='UNIFIED ENGINE CHECKPOINT';
  title.querySelector('.fine').textContent='Noncanonical test areas. Approved campaign remains private and is not playable here yet.';
  title.querySelector('.motto').textContent='EXPLORATION / STEALTH / SIDE-VIEW COMBAT';
  title.querySelector('.title-art').classList.add('hidden');
  $('btn-m2').classList.add('hidden');
  $('btn-new').textContent='NEW GAME';
  $('btn-continue').disabled=!ids.some(id=>saveFor(id).inspect().hasSave);
  let busy=false;
  async function begin(continuing){
    if(busy)return;busy=true;
    try{
      sfx.init();
      const manifest=await loadAeonV5();
      game.mode='rpgmenu';
      const starterId=await chooseStarter(manifest,{cancel:true,title:continuing?'CONTINUE // SELECT SLEEPER':'NEW GAME // SELECT SLEEPER',
        description:continuing?'Choose a character with a saved field record.':'Choose the matching portrait, field sprite and battler.',
        enabled:id=>!continuing||saveFor(id).inspect().hasSave});
      if(!starterId){game.mode='title';return;}
      if(!continuing&&saveFor(starterId).inspect().hasSave){
        const confirmed=await confirmReplacement(starterId);
        if(!confirmed){game.mode='title';return;}
      }
      const [field,securityArt]=await Promise.all([buildV5WorldSheet(manifest,starterId),loadV5WorldActor(manifest,'old_sentry')]);
      const battleArt=mapV5Art(manifest,{'party:sleeper':starterId,'party:echo':'echo_industrial_maintenance','enemy:sentry':'old_sentry'});
      const connected=await createAeonConnectedField();
      game.drawSecurityUnit=createV5SecurityRenderer(securityArt);
      mountRpgLab({game,ui,sfx,touchMode,connected,newGame:!continuing,
        v5:{starterId,field,battleArt,manifestVersion:manifest.schema,catalogCount:manifest.characters.length}});
      refreshTouch();
      // Persist a new character immediately, before any input or lifecycle event.
      if(!window.__rpgLab.save())ui.toast('AUTOSAVE UNAVAILABLE — SAVE BEFORE EXITING',4);
    }catch(error){
      console.error('Unified engine startup failed',error);game.mode='title';ui.show('title',true);
      ui.toast('START FAILED — CHECK PRIVATE ART INSTALLATION',5);
    }finally{busy=false;}
  }
  $('btn-new').onclick=()=>begin(false);
  $('btn-continue').onclick=()=>begin(true);
}

function confirmReplacement(id){
  return new Promise(resolve=>{
    const finish=value=>{document.removeEventListener('keydown',navigate);shell.remove();resolve(value);};
    const navigate=event=>{
      if(event.code==='Escape'){event.preventDefault();finish(false);}
      else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
        event.preventDefault();const buttons=[...panel.querySelectorAll('button')];
        const index=buttons.indexOf(document.activeElement);buttons[index===0?1:0].focus();
      }
    };
    const shell=document.createElement('div');shell.id='aeon-confirm';shell.className='overlay';shell.style.zIndex='60';
    const panel=document.createElement('section');panel.className='panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    const heading=document.createElement('h2');heading.textContent='REPLACE '+id.replace('_',' ').toUpperCase()+' RECORD?';
    panel.append(heading);
    for(const [label,value] of [['KEEP RECORD',false],['START NEW RECORD',true]]){
      const button=document.createElement('button');button.className='menu-btn';button.textContent=label;
      button.onclick=()=>finish(value);panel.append(button);
    }
    shell.append(panel);$('stage').append(shell);document.addEventListener('keydown',navigate);panel.querySelector('button').focus();
  });
}
