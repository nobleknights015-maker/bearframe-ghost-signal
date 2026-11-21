// Public-safe post-extraction integrity gate; caller must independently enforce ZIP parser limits.
import { createHash, timingSafeEqual } from 'node:crypto';
import { validateManifest } from './private-zip-manifest-preflight.mjs';
export function verifyExtractedPayloads({ entries, expectedNames, payloads }, limits) {
  const summary = validateManifest({ entries, expectedNames }, limits);
  if (!(payloads instanceof Map) || payloads.size !== entries.length) throw Error('payload count mismatch');
  let total = 0;
  for (const entry of entries) {
    const bytes = payloads.get(entry.name);
    if (!Buffer.isBuffer(bytes)) throw Error('missing or non-buffer payload');
    if (bytes.length !== entry.bytes) throw Error('payload length mismatch');
    const actual = createHash('sha256').update(bytes).digest();
    const expected = Buffer.from(entry.sha256, 'hex');
    if (!timingSafeEqual(actual, expected)) throw Error('payload digest mismatch');
    total += bytes.length;
  }
  if (total !== summary.declaredBytes) throw Error('payload total mismatch');
  return Object.freeze({ entryCount: summary.entryCount, verifiedBytes: total });
}
