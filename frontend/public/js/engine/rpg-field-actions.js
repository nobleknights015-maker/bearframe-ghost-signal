// Deterministic field-side RPG transactions. Combat consumables are handled by rpg-combat.js.
// The functions never mutate the caller's save object, so a rejected choice cannot consume an item.
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const copy=value=>JSON.parse(JSON.stringify(value));
export const FIELD_CONSUMABLES=Object.freeze({
  'repair-kit':Object.freeze({heal:20,label:'REPAIR KIT'})
});

export function useFieldConsumable(exploration,itemId,actorId){
  if(!plain(exploration)||!plain(exploration.inventory)||!Array.isArray(exploration.party))
    throw new TypeError('Invalid field party state');
  const definition=FIELD_CONSUMABLES[itemId];
  if(!definition)throw new TypeError('Unknown consumable');
  const units=exploration.party;
  const actor=units.find(u=>u.id===actorId);
  const count=exploration.inventory[itemId];
  if(!actor||!Number.isInteger(count)||count<=0)
    throw new TypeError('Consumable unavailable');
  if(!Number.isInteger(actor.hp)||!Number.isInteger(actor.maxHp)||
     actor.maxHp<=0||actor.hp<=0||actor.hp>=actor.maxHp)
    throw new TypeError('No living wounded recipient');
  const next=copy(exploration);
  const recipient=next.party.find(u=>u.id===actorId);
  const healed=Math.min(definition.heal,recipient.maxHp-recipient.hp);
  recipient.hp+=healed;
  next.inventory[itemId]-=1;
  return Object.freeze({exploration:next,healed,itemId,recipientId:actorId});
}
