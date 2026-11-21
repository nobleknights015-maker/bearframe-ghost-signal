import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from './helpers/private-zip-manifest-preflight.mjs';
const digest = 'a'.repeat(64);
const e = (name, bytes=1) => ({name, bytes, sha256:digest});
const check = (entries, expectedNames, opts) => validateManifest({entries, expectedNames},opts);
test('accepts exact set independent of order',()=>assert.deepEqual(check([e('b'),e('a')],['a','b']),{entryCount:2,declaredBytes:2}));
test('rejects missing entry',()=>assert.throws(()=>check([e('a')],['a','b'])));
test('rejects unexpected entry',()=>assert.throws(()=>check([e('a'),e('x')],['a','b'])));
test('rejects duplicate entry',()=>assert.throws(()=>check([e('a'),e('a')],['a','b'])));
test('rejects duplicate expected names',()=>assert.throws(()=>check([e('a'),e('a')],['a','a'])));
test('rejects case-colliding expected names',()=>assert.throws(()=>check([e('a'),e('A')],['a','A'])));
for (const bad of ['../a','a/../b','a/./b','a//b','/a','C:/a','a\\b','a\u0000b','a\nb','a/'.concat('x'.repeat(241)), 'e\u0301']) {
 test('rejects unsafe path '+JSON.stringify(bad),()=>assert.throws(()=>check([e(bad)],[bad])));
}
test('rejects malformed digest',()=>assert.throws(()=>check([{...e('a'),sha256:'z'.repeat(64)}],['a'])));
test('rejects negative and fractional sizes',()=>{for(const n of [-1,1.5,NaN,Infinity]) assert.throws(()=>check([e('a',n)],['a']));});
test('rejects individual oversize',()=>assert.throws(()=>check([e('a',4)],['a'],{maxEntryBytes:3})));
test('rejects aggregate oversize',()=>assert.throws(()=>check([e('a',3),e('b',3)],['a','b'],{maxTotalBytes:5})));
test('accepts exact aggregate boundary',()=>assert.equal(check([e('a',3),e('b',2)],['a','b'],{maxTotalBytes:5}).declaredBytes,5));
test('rejects invalid limits',()=>assert.throws(()=>check([e('a')],['a'],{maxTotalBytes:-1})));
