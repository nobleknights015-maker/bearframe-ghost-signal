// Dual-record, corruption-checked RPG save adapter. Does not touch original Ghost Signal keys.
export const RPG_SAVE_NAMESPACE = 'bearframe_ghost_signal_rpg_v1';
const checksum = data => {
  let hash=2166136261;
  for (let i=0; i<data.length; i++) hash=Math.imul(hash ^ data.charCodeAt(i),16777619);
  return (hash>>>0).toString(16).padStart(8,'0');
};
const parse = raw => {
  try {
    const record=JSON.parse(raw);
    if (!record || record.v !== 1 || !Number.isSafeInteger(record.seq) || record.seq < 1 ||
        !record.body || typeof record.body !== 'string' || record.hash !== checksum(record.body)) return null;
    const payload=JSON.parse(record.body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return {seq:record.seq,payload};
  } catch (_) { return null; }
};
export function createRpgSaveStore(storage, namespace = RPG_SAVE_NAMESPACE) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function' || !/^bearframe_[\w-]+$/.test(namespace) ||
      namespace.startsWith('bearframe_ghost_signal_save_') || namespace.startsWith('bearframe_ghost_signal_progress_') ||
      namespace.startsWith('bearframe_ghost_signal_settings_')) throw new TypeError('Invalid RPG save adapter');
  const keys=[namespace+':A',namespace+':B'];
  const read = () => keys.map(key => { try { return {...parse(storage.getItem(key)),key}; } catch (_) { return {key}; } })
    .filter(r=>Number.isSafeInteger(r.seq)).sort((a,b)=>b.seq-a.seq);
  return Object.freeze({
    load() { const r=read()[0]; return r ? JSON.parse(JSON.stringify(r.payload)) : null; },
    save(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
      let body;
      try { body=JSON.stringify(payload); if (!body || !JSON.parse(body) || JSON.parse(body).phase === undefined) return false; }
      catch (_) { return false; }
      const entries=read(), seq=(entries[0]?.seq || 0)+1;
      if (!Number.isSafeInteger(seq)) return false;
      const oldKey=entries[0]?.key;
      const nextKey=oldKey === keys[0] ? keys[1] : keys[0];
      const packed=JSON.stringify({v:1,seq,body,hash:checksum(body)});
      try {
        storage.setItem(nextKey,packed);
        const check=parse(storage.getItem(nextKey));
        return !!check && check.seq === seq && check.payload.phase === payload.phase;
      } catch (_) { return false; }
    },
    clear() { try { for(const key of keys) storage.removeItem(key); return true; } catch (_) { return false; } },
    inspect() { const entries=read(); return Object.freeze({hasSave:!!entries.length,revision:entries[0]?.seq || 0,redundant:entries.length>1}); }
  });
}
