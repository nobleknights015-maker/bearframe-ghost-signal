// Exact source lock on the owner's approved Ghost Signal interface and Sprite Studio entry point.
// These hashes are Git blob hashes of baseline/ghost-signal-20261114, not arbitrary snapshots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const locked = {
  '../public/index.html': '12a33cecb266c91f3ad145d52e50a859ede03d1b',
  '../public/css/game.css': '74802727aa4d405c0518a9f8e5586678d0e33cef',
  '../public/js/ui.js': '80b5d35a99e6c0e821e82a2a5e6f6296768f7f7e',
  '../public/studio/index.html': '27cdaacfa2af1ced064b2a6df5640eab54a9eacc'
};
for (const [path, expected] of Object.entries(locked)) {
  test('frozen visual source: '+path, () => {
    const bytes=readFileSync(fileURLToPath(new URL(path,import.meta.url)));
    const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(blob,expected,'Original UI source changed: '+path);
  });
}
