// Reusable, side-effect-free area security policy for future JRPG integration.
// Deliberately not imported by the original Ghost Signal missions.
export const SECURITY_MODES = Object.freeze(['normal', 'stealth']);
export const DETECTION_RESPONSES = Object.freeze(['alarm', 'chase', 'escape', 'checkpoint', 'encounter']);

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const validNumber = n => typeof n === 'number' && Number.isFinite(n);
const validRect = r => r && typeof r === 'object' && !Array.isArray(r) &&
  ['x', 'y', 'width', 'height'].every(k => validNumber(r[k])) &&
  r.width > 0 && r.height > 0;
const safeId = s => typeof s === 'string' && s.length > 0;

export function compileAreaPolicy(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new TypeError('Area policy must be an object');
  const defaultMode = own(spec, 'defaultMode') ? spec.defaultMode : 'normal';
  if (!SECURITY_MODES.includes(defaultMode)) throw new TypeError('Invalid default security mode');
  const zones = own(spec, 'zones') ? spec.zones : [];
  if (!Array.isArray(zones)) throw new TypeError('Zones must be an array');
  const ids = new Set();
  const compiled = zones.map((zone, index) => {
    if (!zone || typeof zone !== 'object' || Array.isArray(zone) ||
        !safeId(zone.id) || ids.has(zone.id) || !validRect(zone.rect) ||
        !SECURITY_MODES.includes(zone.mode)) throw new TypeError('Invalid or duplicate security zone at index ' + index);
    ids.add(zone.id);
    const response = own(zone, 'onDetection') ? zone.onDetection : 'alarm';
    if (!DETECTION_RESPONSES.includes(response)) throw new TypeError('Invalid detection response for ' + zone.id);
    return Object.freeze({
      id: zone.id, mode: zone.mode, onDetection: response,
      rect: Object.freeze({ x: zone.rect.x, y: zone.rect.y, width: zone.rect.width, height: zone.rect.height })
    });
  });
  return Object.freeze({ defaultMode, zones: Object.freeze(compiled) });
}

// Coordinates are in world pixels. Last matching zone wins, allowing explicit overlays.
// Left/top inclusive, right/bottom exclusive: boundary crossings have no overlap.
export function securityAt(policy, x, y) {
  if (!policy || !Array.isArray(policy.zones) || !SECURITY_MODES.includes(policy.defaultMode) ||
      !validNumber(x) || !validNumber(y)) throw new TypeError('Invalid security lookup');
  let selected = null;
  for (const zone of policy.zones) {
    const r = zone.rect;
    if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) selected = zone;
  }
  return Object.freeze({
    mode: selected ? selected.mode : policy.defaultMode,
    zoneId: selected ? selected.id : null,
    onDetection: selected ? selected.onDetection : null
  });
}

// Pure transition descriptor: the caller retains ownership of player/party/inventory,
// quests, security actors and persistence; no save writes or movement are performed.
export function securityTransition(policy, fromX, fromY, toX, toY) {
  const from = securityAt(policy, fromX, fromY);
  const to = securityAt(policy, toX, toY);
  return Object.freeze({ from, to, changed: from.mode !== to.mode || from.zoneId !== to.zoneId });
}
