// Deterministic, UI-independent JRPG battle rules. No original Ghost Signal dependencies.
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isId = v => typeof v === 'string' && /^[\w.:-]{1,64}$/.test(v);
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const deepCopy = v => JSON.parse(JSON.stringify(v));
const deepFreeze = v => {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.values(v).forEach(deepFreeze); Object.freeze(v);
  }
  return v;
};
const normalize = (units, side) => {
  if (!Array.isArray(units) || !units.length || units.length > 6) throw new TypeError('Expected 1–6 combatants per side');
  return units.map(u => {
    if (!isObject(u) || !isId(u.id) || !integer(u.maxHp, 1, 99999) ||
        !integer(u.hp, 0, u.maxHp) || !integer(u.attack, 1, 9999) ||
        !integer(u.defense, 0, 9999) || !integer(u.speed, 1, 9999) ||
        !integer(u.maxEp ?? 0, 0, 9999) || !integer(u.ep ?? 0, 0, u.maxEp ?? 0)) {
      throw new TypeError('Invalid combatant');
    }
    // Older save schemas omit a skill catalog; retain their legacy behavior.
    // New actors with an authored catalog may only execute their actual skills.
    if (u.skills !== undefined && (!Array.isArray(u.skills) || u.skills.some(k => !['pulse','repair','guard'].includes(k)) ||
      new Set(u.skills).size !== u.skills.length)) throw new TypeError('Invalid combatant skills');
    if (u.tactics !== undefined && (side !== 'enemy' || u.tactics !== 'charged-strike'))
      throw new TypeError('Invalid enemy combat tactics');
    return { id:u.id, name:typeof u.name === 'string' ? u.name : u.id, side,
      hp:u.hp, maxHp:u.maxHp, ep:u.ep ?? 0, maxEp:u.maxEp ?? 0,
      attack:u.attack, defense:u.defense, speed:u.speed,
      skills:u.skills === undefined ? null : [...u.skills], guard:false,
      tactics:u.tactics ?? null, chargeTarget:null, disrupted:false };
  });
};
const all = s => [...s.party, ...s.enemies];
const living = units => units.filter(u => u.hp > 0);
const makeOrder = s => all(s).filter(u => u.hp > 0).sort((a,b) => b.speed-a.speed).map(u => u.side+':'+u.id);
const findUnit = (s, key) => all(s).find(u => u.side+':'+u.id === key);
const assertItems = items => {
  if (!isObject(items) || Object.keys(items).some(k => !isId(k) || !integer(items[k], 0, 999999))) {
    throw new TypeError('Invalid inventory counts');
  }
};
const withTurn = s => {
  while (s.cursor < s.order.length && (!findUnit(s,s.order[s.cursor]) || findUnit(s,s.order[s.cursor]).hp <= 0)) s.cursor++;
  if (s.cursor >= s.order.length) { s.round++; s.order=makeOrder(s); s.cursor=0; }
};

export function startBattle({ party, enemies, inventory = {}, canFlee = true, rewards = {} }) {
  const p = normalize(party,'party'), e=normalize(enemies,'enemy');
  if (p.some(x => e.some(y => y.id === x.id)) || new Set(p.map(x => x.id)).size !== p.length ||
      new Set(e.map(x => x.id)).size !== e.length || !living(p).length || !living(e).length) throw new TypeError('Invalid or duplicate units');
  assertItems(inventory);
  if (!isObject(rewards) || !integer(rewards.xp ?? 0, 0, 999999) ||
      (rewards.items !== undefined && (assertItems(rewards.items), false))) throw new TypeError('Invalid rewards');
  const s = { version:1, status:'active', round:1, cursor:0, order:[], party:p, enemies:e,
    inventory:deepCopy(inventory), canFlee:!!canFlee,
    rewards:{xp:rewards.xp ?? 0, items:deepCopy(rewards.items ?? {})}, log:[] };
  s.order=makeOrder(s);
  return deepFreeze(s);
}

export function currentCombatant(state) {
  if (!isObject(state) || state.version !== 1) throw new TypeError('Invalid battle');
  return state.status === 'active' ? state.order[state.cursor] ?? null : null;
}

const vulnerableTarget = state => living(state.party)
  .sort((a,b) => (a.hp/a.maxHp)-(b.hp/b.maxHp))[0];

export function enemyForecast(state) {
  if (!isObject(state) || state.version !== 1) throw new TypeError('Invalid battle');
  const foe=state.enemies.find(e=>e.hp>0);
  if (!foe) return {kind:'none',text:'SECURITY QUIET'};
  if (foe.tactics!=='charged-strike') {
    const target=vulnerableTarget(state);
    return {kind:'attack',target:target?.id??null,
      text:'STRIKE '+(target?.name||'UNKNOWN').toUpperCase()};
  }
  const locked=foe.chargeTarget && findUnit(state,foe.chargeTarget);
  if (locked?.hp>0) return {kind:'overload',target:locked.id,
    text:'HEAVY STRIKE ON '+locked.name.toUpperCase()+' — GUARD OR DISRUPT WITH PULSE'};
  if (foe.disrupted) {
    const target=vulnerableTarget(state);
    return {kind:'attack',target:target?.id??null,
      text:'CHARGE DISRUPTED — NORMAL STRIKE'};
  }
  return {kind:'charge',target:null,text:'CHARGING NEXT TURN — NO DAMAGE THIS ACTION'};
}

export function enemyDecision(state) {
  const key=currentCombatant(state), unit=key && findUnit(state,key);
  if (!unit || unit.side !== 'enemy') throw new TypeError('Enemy is not active');
  const target=vulnerableTarget(state);
  if(unit.tactics==='charged-strike'){
    const locked=unit.chargeTarget && findUnit(state,unit.chargeTarget);
    if(locked?.hp>0) return {actor:key,type:'overload',target:unit.chargeTarget};
    if(!unit.disrupted) return {actor:key,type:'charge',target:'party:'+target.id};
  }
  return { actor:key, type:'attack', target:'party:'+target.id };
}

export function combatAction(battle, action) {
  if (!isObject(battle) || battle.version !== 1 || battle.status !== 'active' ||
      !isObject(action) || action.actor !== currentCombatant(battle)) throw new TypeError('Invalid turn');
  const s=deepCopy(battle), actor=findUnit(s,action.actor);
  if (['pulse','repair','guard'].includes(action.type) &&
      Array.isArray(actor.skills) && !actor.skills.includes(action.type))
    throw new TypeError('Ability unavailable to this combatant');
  const target=findUnit(s,action.target);
  const hostile=target && target.side !== actor.side && target.hp > 0;
  const ally=target && target.side === actor.side && target.hp > 0;
  let message=''; actor.guard=false;
  if (action.type === 'attack' || action.type === 'pulse' || action.type === 'overload') {
    if (!hostile) throw new TypeError('Attack requires living opponent');
    if (action.type==='overload' &&
      (actor.side!=='enemy' || actor.tactics!=='charged-strike' || actor.chargeTarget!==action.target))
      throw new TypeError('No charged strike is ready');
    if (action.type === 'pulse') {
      if (actor.ep < 5) throw new TypeError('Insufficient energy');
      actor.ep -= 5;
    }
    const base=Math.max(1, actor.attack-Math.floor(target.defense/2));
    let damage=action.type==='pulse' ? base+Math.ceil(actor.attack/2) :
      action.type==='overload' ? base*2+4 : base;
    if (target.guard) damage=Math.max(1,Math.ceil(damage/2));
    target.hp=Math.max(0,target.hp-damage);
    message=actor.id+' '+action.type+' '+target.id+' -'+damage+' HP';
    if(action.type==='pulse' && target.tactics==='charged-strike' && target.chargeTarget){
      target.chargeTarget=null;target.disrupted=true;
      message+=' / CHARGE DISRUPTED';
    }
    if(action.type==='overload')actor.chargeTarget=null;
    if(action.type==='attack' && actor.tactics==='charged-strike')actor.disrupted=false;
  } else if (action.type === 'charge') {
    const chargedUnit=actor.chargeTarget && findUnit(s,actor.chargeTarget);
    if(actor.side!=='enemy' || actor.tactics!=='charged-strike' ||
       actor.disrupted || chargedUnit?.hp>0 || !hostile)
      throw new TypeError('Charge action unavailable');
    actor.chargeTarget=action.target;
    message=actor.id+' LOCKS HEAVY STRIKE ON '+target.id;
  } else if (action.type === 'guard') {
    if (action.target !== undefined) throw new TypeError('Guard has no target');
    actor.guard=true; message=actor.id+' guards';
  } else if (action.type === 'repair') {
    if (!ally || actor.ep < 5) throw new TypeError('Repair requires living ally and 5 EP');
    actor.ep-=5; target.hp=Math.min(target.maxHp,target.hp+30); message=actor.id+' repairs '+target.id;
  } else if (action.type === 'item') {
    if (actor.side !== 'party' || !ally || action.item !== 'repair-kit' || !s.inventory['repair-kit']) throw new TypeError('Cannot use item');
    s.inventory['repair-kit']--; target.hp=Math.min(target.maxHp,target.hp+20);
    message=actor.id+' uses repair-kit on '+target.id;
  } else if (action.type === 'flee') {
    if (actor.side !== 'party' || !s.canFlee || action.target !== undefined) throw new TypeError('Cannot flee');
    s.status='fled'; message=actor.id+' withdrew';
  } else throw new TypeError('Unknown action');
  s.log.push(message);
  if (s.log.length > 80) s.log.shift();
  if (s.status === 'active') {
    if (!living(s.enemies).length) s.status='victory';
    else if (!living(s.party).length) s.status='defeat';
    else { s.cursor++; withTurn(s); }
  }
  return deepFreeze(s);
}

export function battleResultPatch(battle, originalParty, originalProgression = {}) {
  if (!isObject(battle) || !['victory','defeat','fled'].includes(battle.status) ||
      !Array.isArray(originalParty) || !isObject(originalProgression)) throw new TypeError('Battle not resolved');
  const ids=new Set(battle.party.map(u => u.id));
  if (ids.size !== originalParty.length || originalParty.some(x=>!ids.has(x.id))) throw new TypeError('Party mismatch');
  const party=originalParty.map(u => { const b=battle.party.find(x=>x.id===u.id); return {...deepCopy(u),hp:b.hp,ep:b.ep}; });
  const inventory=deepCopy(battle.inventory);
  const progression=deepCopy(originalProgression);
  if (battle.status === 'victory') {
    progression.xp=(Number.isInteger(progression.xp) ? progression.xp : 0)+battle.rewards.xp;
    for (const [id,count] of Object.entries(battle.rewards.items)) inventory[id]=(inventory[id] || 0)+count;
  }
  return deepFreeze({party,inventory,progression});
}
