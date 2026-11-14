// Run: node --test frontend/tests/ghost-signal-ui-lock.test.mjs
// Static guardrails supplement (not replace) browser screenshots and physical touch testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const html = source('../public/index.html');
const css = source('../public/css/game.css');
const ui = source('../public/js/ui.js');
const main = source('../public/js/main.js');
const game = source('../public/js/game.js');

test('canonical 480x270 stage, fonts and existing interaction targets remain', () => {
  assert.match(html, /<canvas id="screen" width="480" height="270"/);
  assert.match(html, /Silkscreen/);
  assert.match(html, /VT323/);
  for (const id of [
    'hud', 'hud-stealth', 'hud-energy', 'objective-text', 'btn-pause', 'btn-case',
    'dpad', 't-scan', 't-light', 't-act', 'dialog', 'dialog-choices',
    'terminal', 'terminal-close', 'title', 'btn-continue', 'btn-new',
    'pause', 'btn-resume', 'btn-save', 'btn-quit', 'casefile',
    'tab-ev', 'tab-logs', 'case-detail', 'settings'
  ]) assert.ok(html.includes('id="' + id + '"'), 'Missing original UI target: ' + id);
});

test('owner-approved palette and squared pixel presentation remain', () => {
  for (const [token, value] of Object.entries({
    red: '#ff3b30', silver: '#dcd6d8', gun: '#15181c',
    line: '#3a3f47', phos: '#7dffb0'
  })) assert.match(css, new RegExp('--' + token + ':\\s*' + value, 'i'));
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /#crt\s*\{/);
  assert.match(css, /#dpad\s*\{/);
  assert.match(css, /\.menu-btn\s*\{/);
  assert.match(css, /\.panel\s*\{/);
  assert.match(css, /border-radius:\s*0/);
});

test('existing comms, casefile, terminal, HUD and fade interface remains available', () => {
  for (const method of ['say', 'advance', 'choose', 'pick', 'openCase', 'closeCase',
    'caseTab', 'terminal', 'closeTerminal', 'hud', 'objectives', 'fade']) {
    assert.match(ui, new RegExp('\\b' + method + '\\s*\\('), 'Missing UI method: ' + method);
  }
  // Canvas dimensions are exported by the core Game module and consumed by main.
  // Do not require redundant magic-number literals in the boot script.
  assert.match(main, /import\s*\{\s*Game,\s*VW,\s*VH\s*\}\s*from\s*'\.\/game\.js'/);
  assert.match(game, /export const T\s*=\s*32,\s*VW\s*=\s*480,\s*VH\s*=\s*270/);
});
