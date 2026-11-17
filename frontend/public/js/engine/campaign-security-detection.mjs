import {resolveDetection} from './campaign-security-policy.mjs';
import {transitionSecurity} from './campaign-security-transition.mjs';

// Bind detection to the exact zone that produced it. A delayed result from
// another zone must never trigger a battle or alarm after a map transition.
export function applySecurityDetection(previous, activeZone, detectedZone, options = {}) {
  if (detectedZone !== null && (!detectedZone || typeof detectedZone.id !== 'string')) {
    throw new TypeError('invalid detection source zone');
  }
  const outcome = resolveDetection(detectedZone, options);
  return transitionSecurity(previous, activeZone, {
    ...outcome,
    zoneId: detectedZone?.id ?? null
  });
}
