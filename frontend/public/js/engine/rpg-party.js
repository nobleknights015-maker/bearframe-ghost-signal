// Immutable party, equipment, inventory and progression operations for the hybrid RPG.
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = v => JSON.parse(JSON.stringify(v));
const seal = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(seal); Object.freeze(v); } return v; };
const id = v => typeof v === 'string' && /^[a-z\d_.:-]{1,64}$/i.test(v);
const count = v => Number.isInteger(v) && v >= 0 && v <= 999999;
const SLOTS = Object.freeze(['weapon','armor','accessory']);
const valid = s => plain(s) && Array.isArray(s.members) && Array.isArray(s.active) && plain(s.inventory) && plain(s.equipment);
const entry = (s, memberId) => s.members.find(m=>m.id===memberId);

export function createParty({members,active,inventory={},equipment={}}) {
  if (!Array.isArray(members) || !members.length || members.length>12 ||
      members.some(m=>!plain(m) || !id(m.id) || !count(m.level || 1) || !count(m.xp || 0)) ||
      new Set(members.map(m=>m.id)).size!==members.length ||
      !Array.isArray(active) || !active.length || active.length>4 ||
      new Set(active).size!==active.length || active.some(x=>!members.some(m=>m.id===x)) ||
      !plain(inventory) || Object.entries(inventory).some(([k,v])=>!id(k) || !count(v)) || !plain(equipment))
    throw new TypeError('Invalid party');
  const s={members:clone(members),active:[...active],inventory:clone(inventory),equipment:clone(equipment)};
  for(const m of s.members) s.equipment[m.id] ??= {};
  return seal(s);
}

export function setActiveParty(s, ids) {
  if (!valid(s) || !Array.isArray(ids) || !ids.length || ids.length>4 || new Set(ids).size!==ids.length || ids.some(x=>!entry(s,x))) throw new TypeError('Invalid active party');
  return seal({...s,active:[...ids]});
}

export function addItem(s,itemId,delta) {
  if (!valid(s) || !id(itemId) || !Number.isInteger(delta) || delta===0 ||
      !count((s.inventory[itemId]||0)+delta)) throw new TypeError('Invalid inventory update');
  const next=clone(s); next.inventory[itemId]=(next.inventory[itemId] || 0)+delta;
  if (!next.inventory[itemId]) delete next.inventory[itemId];
  return seal(next);
}

export function equipItem(s,memberId,slot,itemId,catalog) {
  if (!valid(s) || !entry(s,memberId) || !SLOTS.includes(slot) || !plain(catalog) ||
      !id(itemId) || !plain(catalog[itemId]) || catalog[itemId].slot!==slot ||
      !(s.inventory[itemId]>0)) throw new TypeError('Cannot equip item');
  const next=clone(s); const current=next.equipment[memberId]?.[slot];
  next.inventory[itemId]--;
  if (!next.inventory[itemId]) delete next.inventory[itemId];
  next.equipment[memberId] ??= {};
  next.equipment[memberId][slot]=itemId;
  if (current) next.inventory[current]=(next.inventory[current]||0)+1;
  return seal(next);
}

export function rewardXp(s,amount) {
  if (!valid(s) || !count(amount)) throw new TypeError('Invalid experience');
  const next=clone(s);
  for(const m of next.members) if(next.active.includes(m.id)) {
    m.xp=(m.xp||0)+amount; m.level ||= 1;
    while(m.level<99 && m.xp>=20*m.level*m.level) m.level++;
  }
  return seal(next);
}

export function battleParty(s,catalog={}) {
  if (!valid(s)) throw new TypeError('Invalid party');
  return s.active.map(k=>{
    const m=entry(s,k), gear=s.equipment[k]||{};
    const bonus=stat=>Object.values(gear).reduce((n,item)=>n+(Number.isInteger(catalog[item]?.[stat])?catalog[item][stat]:0),0);
    return {id:m.id,name:m.name||m.id,hp:m.hp,maxHp:m.maxHp,ep:m.ep||0,maxEp:m.maxEp||0,
      attack:Math.max(1,m.attack+bonus('attack')),defense:Math.max(0,m.defense+bonus('defense')),
      speed:Math.max(1,m.speed+bonus('speed'))};
  });
}
