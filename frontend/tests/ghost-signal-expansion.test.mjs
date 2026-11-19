// Focused, dependency-free regression tests for the additive Ghost Signal expansion.
// Run: node --test frontend/tests/ghost-signal-expansion.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = p => readFileSync(resolve(root, p), 'utf8');
const loadMission = async p => import('data:text/javascript;base64,' + Buffer.from(read(p)).toString('base64'));
const { mission3 } = await loadMission('js/missions/mission3.js');

test('original mission registry remains first and includes all three chapters', () => {
  const reg = read('js/missions/index.js');
  assert.match(reg, /FIRST_MISSION = mission1\.id/);
  for (const id of ['mission1', 'mission2', 'mission3']) assert.match(reg, new RegExp('\\[' + id + '\\.id\\]'));
  assert.match(read('js/missions/mission2.js'), /next: 'm3'/);
});

test('the surface map is traversable, including the outpost and relay', () => {
  const m = mission3.buildMap(), e = mission3.entities();
  assert.equal(m.grid.length, m.w * m.h);
  assert.equal(mission3.visualTheme, 'surface');
  assert.equal(mission3.hideStealth, true);
  assert.deepEqual(mission3.drones, []);
  const blocked = new Set();
  for (const p of mission3.props.filter(p => p.solid))
    for (let y = p.y; y < p.y + (p.h || 1); y++)
      for (let x = p.x; x < p.x + (p.w || 1); x++) blocked.add(x + ',' + y);
  for (const q of e.filter(q => q.solid))
    for (let y = q.ty; y < q.ty + (q.h || 1); y++)
      for (let x = q.tx; x < q.tx + (q.w || 1); x++) blocked.add(x + ',' + y);
  const valid = (x,y) => x >= 0 && y >= 0 && x < m.w && y < m.h &&
    m.grid[y * m.w + x] === 2 && !blocked.has(x + ',' + y);
  const sx = Math.floor(mission3.start.x / 32), sy = Math.floor(mission3.start.y / 32);
  assert.ok(valid(sx, sy), 'spawn must be walkable');
  const seen = new Set([sx + ',' + sy]), queue = [[sx,sy]];
  for(let i=0;i<queue.length;i++) {
    const [x,y] = queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx, ny=y+dy, key=nx+','+ny;
      if(valid(nx,ny) && !seen.has(key)) { seen.add(key); queue.push([nx,ny]); }
    }
  }
  for(const id of ['mira','nova','kai','outpost','coupler','ridgeRelay','return','clueCarrier']) {
    const q=e.find(q=>q.id===id); assert.ok(q, id + ' is missing');
    assert.ok([[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((q.tx+dx)+','+(q.ty+dy))), id + ' cannot be reached');
  }
});

function harness(choice = 1) {
  const ents = mission3.entities();
  const g = {
    flags:{}, inv:{}, caseFile:{ev:[],logs:[]}, player:{x:0,y:0,energy:100},
    sfx:{pickup(){}, power(){}}, checkpoints:0, finished:false,
    ent: id => ents.find(x=>x.id===id),
    evCount: id => g.caseFile.ev.filter(x=>x.m===id).length,
    hasEv: id => g.caseFile.ev.some(x=>x.id===id),
    addEvidence(id) { if(this.hasEv(id)) return false; this.caseFile.ev.push({id,m:'m3',...mission3.evidence[id]}); return true; },
    addLog(id) { if(this.caseFile.logs.some(x=>x.id===id)) return false; this.caseFile.logs.push({id,m:'m3',...mission3.logs[id]}); return true; },
    say(_lines,callback) { if(callback) callback(); },
    choose(_prompt,options,callback) { assert.equal(options.length,2); callback(choice); },
    terminal(_title,_text,callback) { callback(); },
    checkpoint() { this.checkpoints++; return true; },
    toast(){},
    finish() { this.finished=true; },
  };
  return g;
}

test('chapter gates relay restoration, evidence review, and decision', () => {
  const g=harness(); mission3.onStart(g);
  mission3.interact(g.ent('ridgeRelay'),g);
  assert.equal(g.flags.relay, undefined);
  mission3.interact(g.ent('mira'),g);
  assert.equal(g.flags.briefed, true);
  mission3.interact(g.ent('nova'),g);
  assert.equal(g.flags.reviewed, undefined);
  g.addEvidence('e3_tracks'); g.addEvidence('e3_marker');
  mission3.interact(g.ent('coupler'),g);
  assert.equal(g.inv.surveyCoupler,true);
  assert.equal(g.ent('coupler').gone,true);
  mission3.interact(g.ent('ridgeRelay'),g); // no scanned carrier yet
  assert.equal(g.flags.relay,undefined);
  g.addEvidence('e3_carrier');
  mission3.interact(g.ent('ridgeRelay'),g);
  assert.equal(g.flags.relay,true);
  assert.equal(g.inv.surveyCoupler,false);
  mission3.interact(g.ent('nova'),g);
  assert.equal(g.flags.reviewed,true);
  mission3.interact(g.ent('mira'),g);
  assert.equal(g.flags.recommendation,'surface');
  assert.equal(g.finished,true);
  assert.ok(g.checkpoints >= 3);
  assert.ok(mission3.objectives(g).every(x=>x.done));
  assert.equal(mission3.ending(g).title,'SURFACE SURVEY: FILED');
});

test('the alternate recommendation is preserved independently of mission 02', () => {
  const g=harness(0); mission3.onStart(g);
  mission3.interact(g.ent('mira'),g);
  g.addEvidence('e3_tracks'); g.addEvidence('e3_marker'); g.addEvidence('e3_carrier');
  mission3.interact(g.ent('coupler'),g);
  mission3.interact(g.ent('ridgeRelay'),g);
  mission3.interact(g.ent('nova'),g);
  mission3.interact(g.ent('mira'),g);
  assert.equal(g.flags.recommendation,'hold');
  assert.equal(g.finished,true);
});

test('legacy save keys, UI locks, and original procedural mission behavior remain intact', () => {
  const save=read('js/engine/save.js'), art=read('js/art/tiles.js'), game=read('js/game.js');
  assert.match(save,/bearframe_ghost_signal_save_v1/);
  assert.match(save,/bearframe_ghost_signal_progress_v1/);
  assert.match(art,/mission\.visualTheme === 'surface'/);
  assert.match(game,/this\.m\.ambient === 'daylight'/);
  assert.match(game,/this\.m\.hideStealth/);
  assert.match(read('js/main.js'),/btn-m3/);
  assert.match(read('index.html'),/mission3-button/);
  assert.match(read('js/ui.js'),/M03/);
  assert.ok(!read('js/missions/mission1.js').includes('mission3'));
});
