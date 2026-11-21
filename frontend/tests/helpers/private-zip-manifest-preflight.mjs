// Public-safe manifest metadata preflight. NOT a ZIP parser or image-integrity verifier.
const MAX_ENTRY = 64 * 1024 * 1024;
const MAX_TOTAL = 256 * 1024 * 1024;
function safeName(n) {
  return typeof n === 'string' && n.length > 0 && n.length <= 240 &&
    !n.startsWith('/') && !n.includes('\\') && !/^[A-Za-z]:/.test(n) &&
    !/[\u0000-\u001f\u007f]/.test(n) &&
    n.split('/').every(p => p && p !== '.' && p !== '..') &&
    n.normalize('NFC') === n;
}
export function validateManifest({ entries, expectedNames }, { maxEntryBytes = MAX_ENTRY, maxTotalBytes = MAX_TOTAL } = {}) {
  if (!Array.isArray(entries) || !Array.isArray(expectedNames) || entries.length !== expectedNames.length || !expectedNames.length)
    throw Error('entry count mismatch');
  if (!Number.isSafeInteger(maxEntryBytes) || maxEntryBytes < 0 || !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 0)
    throw Error('invalid limits');
  const expected = new Set(); const expectedFolded = new Set();
  for (const n of expectedNames) {
    if (!safeName(n) || expected.has(n) || expectedFolded.has(n.toLowerCase())) throw Error('unsafe expected name list');
    expected.add(n); expectedFolded.add(n.toLowerCase());
  }
  const seen = new Set(); let total = 0;
  for (const e of entries) {
    const n = e?.name;
    if (!safeName(n) || !expected.has(n) || seen.has(n)) throw Error('unsafe or unexpected entry');
    if (typeof e.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(e.sha256)) throw Error('invalid digest');
    if (!Number.isSafeInteger(e.bytes) || e.bytes < 0 || e.bytes > maxEntryBytes || e.bytes > maxTotalBytes - total)
      throw Error('unsafe entry or total size');
    total += e.bytes; seen.add(n);
  }
  return Object.freeze({ entryCount: seen.size, declaredBytes: total });
}
