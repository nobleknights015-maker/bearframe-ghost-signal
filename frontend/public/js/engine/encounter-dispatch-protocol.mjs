// Pure public-safe state transitions; not wired into the production game.
// A durable battle snapshot MUST be committed atomically with activation.
const valid = s => s && typeof s === 'object' && !Array.isArray(s);
export function stageEncounter(state, token, battle) {
  if (!valid(state) || typeof token !== 'string' || !/^[a-zA-Z0-9:_-]{1,128}$/.test(token) || ['__proto__','constructor','prototype'].includes(token) || !valid(battle)) throw new TypeError('Invalid encounter input');
  const records = valid(state.encounterDispatch) ? state.encounterDispatch : {};
  if (Object.hasOwn(records, token)) return state;
  return {...state, encounterDispatch: {...records, [token]: {phase:'pending', battle:structuredClone(battle)}}};
}
export function activateEncounter(state, token) {
  const record=(Object.hasOwn(state?.encounterDispatch ?? {}, token) ? state.encounterDispatch[token] : null);
  if (!record || record.phase !== 'pending') return state;
  return {...state, encounterDispatch:{...state.encounterDispatch,[token]:{...record,phase:'active'}}};
}
export function acknowledgeEncounter(state, token) {
  const record=(Object.hasOwn(state?.encounterDispatch ?? {}, token) ? state.encounterDispatch[token] : null);
  if (!record || record.phase !== 'active') return state;
  return {...state, encounterDispatch:{...state.encounterDispatch,[token]:{...record,phase:'complete'}}};
}
export function recoveryAction(state, token) {
  const record=(Object.hasOwn(state?.encounterDispatch ?? {}, token) ? state.encounterDispatch[token] : null);
  return record?.phase === 'pending' ? 'activate' : record?.phase === 'active' ? 'resume-battle' : 'none';
}
