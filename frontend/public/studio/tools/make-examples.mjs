// Writes the example projects (rig + settings, no baked frames). Run from frontend/public: node studio/tools/make-examples.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { MACHINE_PRESETS } from '../lib/machine-presets.js';
import { DEFAULT_CFG } from '../lib/sprite-rig.js';
import * as SS from '../lib/sprite-sheet.js';

const out = new URL('../examples/', import.meta.url); mkdirSync(out, { recursive: true });
const save = (file, p) => writeFileSync(new URL(file + '.bfsprite.json', out), SS.serialize(p));
save('wraith-wtr07', SS.humanoidProject('Wraith WTR-07', DEFAULT_CFG));
const M = { 'heavy-sentinel': 'Heavy Sentinel (humanoid titan)', 'hexapod-cartography-engine': 'Hexapod Cartography Engine', 'archive-sentinel': 'Archive Sentinel (floating boss)', 'micro-drone': 'Micro-drone (flyer)' };
for (const [file, key] of Object.entries(M)) { const rig = MACHINE_PRESETS[key](); save(file, SS.machineProject(rig.name, rig)); }
console.log('examples written');
