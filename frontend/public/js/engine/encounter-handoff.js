// Pure JRPG encounter boundary. No imports from Ghost Signal runtime, UI or saves.
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const safe = x => typeof x === 'string' && x.length > 0;
const clone = x => {
  if (Array.isArray(x)) return x.map(clone);
  if (object(x)) return Object.fromEntries(Object.entries(x).map(([k,v]) => [k, clone(v)]));
  if (x === null || typeof x === 'string' || typeof x === 'boolean' ||
      (typeof x === 'number' && Number.isFinite(x))) return x;
  throw new TypeError('State must contain JSON-safe data');
};
const frozen = x => {
  if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); }
  return x;
};
const fields = ['location','party','inventory','equipment','quests','progression'];
export const ENCOUNTER_OUTCOMES = Object.freeze(['victory','defeat','fled']);

export function beginEncounter(exploration, encounter) {
  if (!object(exploration) || !object(encounter) || !safe(encounter.id) ||
      !Array.isArray(encounter.enemies) || !encounter.enemies.length ||
      !encounter.enemies.every(safe)) throw new TypeError('Invalid encounter');
  for (const field of fields) {
    if (!(field in exploration)) throw new TypeError('Missing exploration field: ' + field);
  }
  const p = exploration.location;
  if (!object(p) || !safe(p.mapId) || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
      !Array.isArray(exploration.party) || !object(exploration.inventory) ||
      !object(exploration.equipment) || !object(exploration.quests) ||
      !object(exploration.progression)) throw new TypeError('Invalid exploration snapshot');
  return frozen({ version:1, phase:'battle',
    encounter:{ id:encounter.id, enemies:[...encounter.enemies] },
    snapshot: clone(exploration) });
}

export function finishEncounter(handoff, outcome, patch = {}) {
  if (!object(handoff) || handoff.version !== 1 || handoff.phase !== 'battle' ||
      !object(handoff.snapshot) || !ENCOUNTER_OUTCOMES.includes(outcome) || !object(patch))
    throw new TypeError('Invalid encounter completion');
  const allowed = ['party','inventory','equipment','quests','progression'];
  if (Object.keys(patch).some(k => !allowed.includes(k)))
    throw new TypeError('Patch cannot change location or arbitrary exploration state');
  const next = clone(handoff.snapshot);
  for (const [key, value] of Object.entries(patch)) {
    if ((key === 'party' && !Array.isArray(value)) ||
        (key !== 'party' && !object(value))) throw new TypeError('Invalid encounter patch: ' + key);
    next[key] = clone(value);
  }
  return frozen({ phase:'exploration', outcome, exploration:next });
}
