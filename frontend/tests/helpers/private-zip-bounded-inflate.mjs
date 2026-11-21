// Public-safe bounded per-entry ZIP decompression primitive. Not a ZIP parser.
import { inflateRawSync } from 'node:zlib';
const MAX_ENTRY = 64 * 1024 * 1024;
const MAX_COMPRESSED = 64 * 1024 * 1024;
const MAX_RATIO = 100;
export function decodeBoundedZipEntry({ method, compressed, uncompressedBytes }, limits = {}) {
  const { maxEntryBytes = MAX_ENTRY, maxCompressedBytes = MAX_COMPRESSED, maxRatio = MAX_RATIO } = limits;
  if (![maxEntryBytes,maxCompressedBytes,maxRatio].every(x => Number.isSafeInteger(x) && x > 0)) throw Error('invalid ZIP limits');
  if (!Buffer.isBuffer(compressed)) throw Error('compressed payload must be Buffer');
  if (!Number.isSafeInteger(uncompressedBytes) || uncompressedBytes < 0 || uncompressedBytes > maxEntryBytes) throw Error('unsafe declared output size');
  if (compressed.length > maxCompressedBytes) throw Error('compressed entry too large');
  if (uncompressedBytes > compressed.length * maxRatio) throw Error('compression ratio exceeded');
  if (method !== 0 && method !== 8) throw Error('unsupported ZIP compression method');
  if (method === 0 && compressed.length !== uncompressedBytes) throw Error('stored entry length mismatch');
  // Bound decompression itself; do not inflate then check length.
  let output;
  try { output = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: uncompressedBytes + 1 }); }
  catch { throw Error('ZIP decompression rejected'); }
  if (output.length !== uncompressedBytes) throw Error('decompressed length mismatch');
  return output;
}
