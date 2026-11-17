// Public-safe, deterministic security-zone policy for optional campaign stealth.
// Pure functions: no original Ghost Signal save or mission mutation.
const validId = s => typeof s === 'string' && /^[A-Za-z][\w-]{0,95}$/.test(s) && !['constructor','prototype','__proto__'].includes(s);
const assert = (ok, message) => { if (!ok) throw new TypeError('Security policy: '+message); };
const consequences = new Set(['alarm','chase','escape','checkpoint','encounter']);
export function compileSecurityZones(zones = [], width, height) {
  assert(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0, 'invalid map dimensions');
  assert(Array.isArray(zones), 'zones must be an array');
  const ids = new Set();
  return Object.freeze(zones.map(zone => {
    assert(zone && validId(zone.id) && !ids.has(zone.id), 'invalid or duplicate zone id');
    ids.add(zone.id);
    const {x,y,w,h} = zone;
    assert([x,y,w,h].every(Number.isInteger) && x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= width*32 && y+h <= height*32, 'invalid zone bounds');
    assert(zone.mode === 'normal' || zone.mode === 'stealth', 'invalid zone mode');
    assert(zone.consequence === undefined || consequences.has(zone.consequence), 'invalid detection consequence');
    assert(zone.consequence !== 'encounter' || validId(zone.encounterId), 'encounter needs source-bound id');
    assert(zone.encounterId === undefined || validId(zone.encounterId), 'invalid encounter id');
    assert(zone.priority === undefined || Number.isSafeInteger(zone.priority), 'invalid priority');
    return Object.freeze({id:zone.id,x,y,w,h,mode:zone.mode,priority:zone.priority ?? 0,
      consequence:zone.consequence ?? 'alarm',...(zone.encounterId ? {encounterId:zone.encounterId} : {})});
  }).sort((a,b)=>b.priority-a.priority));
}
export function securityAt(zones, x, y) {
  if(!Number.isFinite(x)||!Number.isFinite(y)) return null;
  return zones.find(z=>x>=z.x && x<z.x+z.w && y>=z.y && y<z.y+z.h) ?? null;
}
// A boolean opt-in alone does not authorize an arbitrary battle. The encounter
// must also be present in the owner-private, source-bound encounter registry.
export function resolveDetection(zone, {detected=false, encounterEnabled=false, authorizedEncounterIds}={}) {
  if(!detected || !zone || zone.mode !== 'stealth') return Object.freeze({kind:'none'});
  if(zone.consequence === 'encounter') {
    const authorized = authorizedEncounterIds instanceof Set && authorizedEncounterIds.has(zone.encounterId);
    if(!encounterEnabled || !validId(zone.encounterId) || !authorized) return Object.freeze({kind:'alarm'});
    return Object.freeze({kind:'encounter',encounterId:zone.encounterId});
  }
  return Object.freeze({kind:consequences.has(zone.consequence) ? zone.consequence : 'alarm'});
}
