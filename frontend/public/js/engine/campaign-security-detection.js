import {resolveDetection} from './campaign-security-policy.js';
import {transitionSecurity} from './campaign-security-transition.js';

// Bind detection to the exact zone that produced it. A delayed result from
// another zone must never trigger a battle or alarm after a map transition.
export function applySecurityDetection(previous, activeZone, detectedZone, options = {}) {
  if (detectedZone !== null && (!detectedZone || typeof detectedZone !== 'object' || Array.isArray(detectedZone) ||
      typeof detectedZone.id !== 'string' || !/^[A-Za-z][\w-]{0,95}$/.test(detectedZone.id) ||
      ['constructor','prototype','__proto__'].includes(detectedZone.id) ||
      !['normal','stealth'].includes(detectedZone.mode))) {
    throw new TypeError('invalid detection source zone');
  }
  // Use the currently active zone as the authoritative policy. A stale or
  // reconstructed detection payload must not substitute another encounter
  // configuration merely because its zone ID and mode happen to match.
  const sameZone = detectedZone && activeZone && detectedZone.id === activeZone.id && detectedZone.mode === activeZone.mode;
  const outcome = resolveDetection(sameZone ? activeZone : null, options);
  return transitionSecurity(previous, activeZone, {
    ...outcome,
    zoneId: detectedZone?.id ?? null,
    zoneMode: detectedZone?.mode ?? null
  });
}
