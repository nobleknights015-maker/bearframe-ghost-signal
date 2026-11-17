// Public-safe transition reducer. Caller persists the resulting campaign-only state.
// No global storage, original mission mutation, or implicit battle launch.
export function transitionSecurity(previous, nextZone, detection = {kind:'none'}) {
  if (!previous || typeof previous !== 'object' || Array.isArray(previous)) throw new TypeError('invalid security state');
  if (!detection || !['none','alarm','chase','escape','checkpoint','encounter'].includes(detection.kind)) throw new TypeError('invalid detection result');
  if (nextZone !== null && (!nextZone || typeof nextZone.id !== 'string' || !/^[A-Za-z][\w-]{0,95}$/.test(nextZone.id) || !['normal','stealth'].includes(nextZone.mode))) throw new TypeError('invalid security zone');
  const zoneId = nextZone?.id ?? null;
  const mode = nextZone?.mode ?? 'normal';
  const entered = zoneId !== (previous.zoneId ?? null);
  const priorAlert = previous.alert === true;
  const kind = mode === 'stealth' ? detection.kind : 'none';
  // Alarm/chase persists within a zone until resolved; leaving or changing
  // zones clears inherited alert, never party, position, quest or inventory.
  const alert = mode === 'stealth' && ((!entered && priorAlert) || kind === 'alarm' || kind === 'chase');
  return Object.freeze({zoneId,mode,alert,entered,consequence:kind});
}
