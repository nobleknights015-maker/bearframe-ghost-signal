// UI-independent content model for Ghost Signal-styled JRPG tab panels.
export const RPG_TABS=Object.freeze(['status','party','equipment','items','skills','quests','save']);
const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const display=v=>v===null || v===undefined || v==='' ? '—' : String(v);
export function rpgMenuModel(exploration,tab='status',saveInfo={}) {
  if (!object(exploration) || !Array.isArray(exploration.party) || !RPG_TABS.includes(tab))
    throw new TypeError('Invalid RPG menu content');
  const roster=exploration.party;
  const inv=object(exploration.inventory)?exploration.inventory:{};
  const gear=object(exploration.equipment)?exploration.equipment:{};
  const quests=object(exploration.quests)?exploration.quests:{};
  const rows=[];
  if(tab==='status') for(const p of roster) rows.push({name:display(p.name||p.id),detail:'HP '+display(p.hp)+'/'+display(p.maxHp)+'  EP '+display(p.ep??0)+'/'+display(p.maxEp??0)+'  LV '+display(p.level??1)});
  if(tab==='party') for(const [i,p] of roster.entries()) rows.push({name:(exploration.activeParty?(exploration.activeParty.includes(p.id)?(exploration.activeParty.indexOf(p.id)+1)+'. ':'R. '):(i+1)+'. ')+display(p.name||p.id),detail:'UNIT '+display(p.id)+'  SPEED '+display(p.speed)+'  ATK '+display(p.attack)});
  if(tab==='equipment') for(const p of roster) rows.push({name:display(p.name||p.id),detail:['weapon','armor','accessory'].map(k=>k.toUpperCase()+' '+display(gear[p.id]?.[k])).join('\n')});
  if(tab==='items') for(const [name,count] of Object.entries(inv).sort(([a],[b])=>a.localeCompare(b))) rows.push({name:name.toUpperCase(),detail:'QUANTITY '+display(count)});
  if(tab==='skills') for(const p of roster) rows.push({name:display(p.name||p.id),detail:Array.isArray(p.skills) && p.skills.length?p.skills.join(' / '):'NO SKILLS REGISTERED'});
  if(tab==='quests') for(const [name,status] of Object.entries(quests).sort(([a],[b])=>a.localeCompare(b))) rows.push({name:name.toUpperCase(),detail:display(status).toUpperCase()});
  if(tab==='save') rows.push({name:saveInfo.hasSave?'RECORD AVAILABLE':'NO RPG RECORD',detail:'REVISION '+display(saveInfo.revision??0)+'\n'+(saveInfo.redundant?'DUAL RECORD VERIFIED':'BACKUP PENDING')});
  return Object.freeze({tab,title:'FIELD RECORD // '+tab.toUpperCase(),tabs:RPG_TABS,rows:rows.length?rows:[{name:'NO ENTRIES',detail:'NO DATA RECORDED'}]});
}
