// MISSION 01 — THE SILENT FACILITY (proposed future side story).
// Canon notes: the facility's makers, purpose and signal source stay UNRESOLVED. The trace is an
// environmental recording, not a person. The security unit is a non-sentient automated machine.
const T = 32, W = 46, H = 26;
const SEQ = [2, 3, 1];
const VOICE = 'UNIDENTIFIED // VOICEPRINT MATCH: WTR-07';

const LOG_A = `INTAKE REGISTER
ENTRY 0001 OF 0001

ARRIVALS THIS CYCLE ....... 1
DESIGNATION ............... [UNPARSED]
GAIT PROFILE .............. STORED

NOTICE: GAIT PROFILE ALREADY ON FILE.
AGE OF EXISTING FILE ...... 312 YR
CLOCK INTEGRITY ........... UNVERIFIED

> EMERGENCY LIGHTING: ENGAGED
> SERVICE DOOR 1: RELEASED
> AUTHORIZED BY: ---`;

const LOG_B = `MACHINE HALL / MAINTENANCE NOTICE

SERVICE DOOR 2 HOLDS ONLY WHILE
FLOOR SENSOR IV IS WEIGHTED.
TWO OPERATORS REQUIRED.
DO NOT ATTEMPT ALONE.

--- REHEARSAL LOG ---
PATH CAPTURED.  PATH REPEATED.
DELAY ........ 5.0 S
DEVIATION .... 0.00

SUBJECT HAS NOTICED THE REPETITION.
THIS WAS ALSO ON FILE.`;

const LOG_C = `AUXILIARY POWER / RESTART PROCEDURE

1. SEAT POWER CELL IN HOUSING.
2. THROW BREAKERS IN POSTED ORDER.

POSTED ORDER IS PAINTED ABOVE
THE HOUSING.

NOTE: PAINT IS NOT RATED FOR
THIS MUCH TIME. USE A SURVEY LAMP.

LAST RESTART PERFORMED BY:
[SEE INTAKE REGISTER]`;

export const mission1 = {
  id: 'm1', title: 'THE SILENT FACILITY', next: 'm2',
  logs: {
    logA: { title: 'TERMINAL 01 // INTAKE', text: LOG_A }, logB: { title: 'TERMINAL 02 // MACHINE HALL', text: LOG_B }, logC: { title: 'TERMINAL 03 // AUXILIARY POWER', text: LOG_C },
  },
  evidence: {
    e1_prints: { cat: 'CLUE', title: 'Dust prints, intake bay', text: 'Boot prints under the dust layer, leading from the hatch to the intake terminal.\n\nSole pattern is consistent with Watchtower reconnaissance plating (WTR-07). The dust settled on top of them is far deeper than one visit can explain.\n\nAssessment: consistent with the register claim that a matching gait profile was "already on file". Age unverified.' },
    e1_drag: { cat: 'CLUE', title: 'Drag marks, machine hall', text: 'Parallel scoring in the floor plating. Something heavy and cylindrical was dragged from the direction of the auxiliary room and left in the debris at the south-west corner of the hall.\n\nAssessment: the missing power cell. Someone, or something, removed it deliberately.' },
    e1_cradle: { cat: 'MACHINERY', title: 'Damaged unit cradle', text: 'Charging cradle for the automated security unit. Guidance board is cracked; the unit cannot complete its return cycle and loops its "disturbance" routine instead.\n\nIts forward sensor is the only one still working: it is close to blind from behind and slow to resolve a target in the dark.\n\nAssessment: obsolete, malfunctioning, non-sentient. A machine stuck in a loop, not an enemy.' },
    e1_carrier: { cat: 'SIGNAL', title: 'Carrier leak at the final door', text: 'A weak carrier wave leaks through the seal of bulkhead 0. Same modulation as the transmission that used my voiceprint.\n\nAssessment: the voice originates from, or is relayed through, whatever lies behind the final door. This does not establish who is speaking.' },
    e1_echo: { cat: 'SIGNAL', title: 'Archived trace, machine hall', text: 'The hall projector holds an older recording than the five-second trace that follows me.\n\nThe archived figure crosses the hall, stops in front of the final door, waits, and withdraws without touching it. Height and stride match my own profile.\n\nAssessment: a recorded trace. Not a person, not proof of anything about when it was captured. But whoever was recorded made the same decision I did.' },
  },
  migrate(g) { for (const k of ['logA', 'logB', 'logC']) if (g.flags[k]) g.addLog(k); g.stats.logs = g.caseFile.logs.filter(l => l.m === 'm1').length; },
  onEvidence(id, g) {
    if (id === 'e1_drag') { const c = g.ent('cell'); if (c.hidden) { c.hidden = false; c.pingT = g.time + 4; g.toast('THE DRAG MARKS END IN THE DEBRIS — POWER CELL LOCATED', 3.5); } }
    if (id === 'e1_cradle') g.say([{ s: 'WRAITH', t: 'A loop, not a hunter. It sees forward, poorly, and worse in the dark. I can work with that.' }]);
  },
  onEcho(id, g) {
    g.addEvidence('e1_echo'); const c = g.ent('c_carrier'); c.hidden = false; c.scanned = true; c.pingT = g.time + 4;
    g.say([{ s: 'WRAITH', t: 'An older recording. It walked to the final door, stopped, and left it shut. Something by the door is still transmitting.' }]);
  },
  ending(g) {
    return { title: 'SECTOR ONE: EXITED', lines: [`EVIDENCE LOGGED ......... ${g.evCount('m1')} / 5`, `DATA LOGS RECOVERED ..... ${g.caseFile.logs.filter(l => l.m === 'm1').length} / 3`, '', 'FACILITY ORIGIN ......... UNRESOLVED', 'TRANSMISSION SOURCE ..... INSIDE THE SECTOR', 'FINAL DOOR .............. SEALED', '', 'MISSION 02 AUTHORIZED: BELOW THE SILENCE'] };
  },
  start: { x: 3.5 * T, y: 14 * T, dir: 'right' },

  buildMap() {
    const grid = new Uint8Array(W * H);
    const carve = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * W + x] = 2; };
    carve(2, 9, 11, 18);      // Room A: intake bay
    carve(12, 13, 15, 14);    // corridor A-B
    carve(16, 4, 33, 22);     // Room B: machine hall
    carve(34, 16, 36, 17);    // corridor B-C
    carve(37, 11, 44, 21);    // Room C: auxiliary power
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!grid[y * W + x]) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny * W + nx] === 2) grid[y * W + x] = 1; }
    }
    return { w: W, h: H, grid };
  },

  props: [
    { t: 'hazard', x: 2, y: 12, w: 2, h: 4 }, { t: 'hazard', x: 32, y: 6, w: 2, h: 4 }, { t: 'hazard', x: 23, y: 4, w: 4, h: 2 }, { t: 'hazard', x: 29, y: 17, w: 1, h: 1 },
    { t: 'crate', x: 2, y: 9, solid: 1 }, { t: 'crate', x: 3, y: 9, solid: 1 }, { t: 'crate', x: 2, y: 18, solid: 1 }, { t: 'crate', x: 11, y: 18, solid: 1 },
    { t: 'machine', x: 10, y: 9, w: 2, h: 1, solid: 1 }, { t: 'cable', x: 4, y: 11, w: 5 }, { t: 'debris', x: 6, y: 17 },
    { t: 'machine', x: 19, y: 7, w: 3, h: 2, solid: 1 }, { t: 'machine', x: 27, y: 7, w: 3, h: 2, solid: 1 }, { t: 'machine', x: 20, y: 12, w: 2, h: 3, solid: 1 },
    { t: 'machine', x: 27, y: 12, w: 3, h: 2, solid: 1 }, { t: 'machine', x: 18, y: 18, w: 2, h: 2, solid: 1 }, { t: 'machine', x: 31, y: 19, w: 2, h: 2, solid: 1 },
    { t: 'machine', x: 23, y: 20, w: 2, h: 1, solid: 1 }, { t: 'crate', x: 33, y: 22, solid: 1 }, { t: 'crate', x: 16, y: 4, solid: 1 },
    { t: 'debris', x: 17, y: 21 }, { t: 'debris', x: 30, y: 5 }, { t: 'debris', x: 24, y: 16 }, { t: 'debris', x: 16, y: 9 }, { t: 'cable', x: 22, y: 10, w: 5 }, { t: 'cable', x: 26, y: 21, w: 4 },
    { t: 'machine', x: 40, y: 16, w: 2, h: 2, solid: 1 }, { t: 'crate', x: 44, y: 21, solid: 1 }, { t: 'crate', x: 37, y: 21, solid: 1 }, { t: 'cable', x: 39, y: 13, w: 4 }, { t: 'debris', x: 44, y: 14 },
  ],
  lamps: [{ x: 4, y: 8 }, { x: 10, y: 8 }, { x: 18, y: 3 }, { x: 31, y: 3 }, { x: 15, y: 18 }, { x: 34, y: 12 }, { x: 25, y: 23 }, { x: 38, y: 10 }, { x: 43, y: 10 }, { x: 45, y: 18 }],

  entities() {
    return [
      { id: 'hatch', type: 'hatch', tx: 1, ty: 13, h: 2, interact: true },
      { id: 'termA', type: 'terminal', tx: 7, ty: 9, solid: true, interact: true },
      { id: 'padA', type: 'pad', tx: 9, ty: 16 },
      { id: 'doorA', type: 'door', tx: 13, ty: 13, h: 2, interact: true },
      { id: 'termB', type: 'terminal', tx: 20, ty: 4, solid: true, interact: true },
      { id: 'bulkhead', type: 'bulkhead', tx: 24, ty: 3, w: 2, interact: true },
      { id: 'exit', type: 'exit', tx: 34, ty: 7, h: 2, interact: true },
      { id: 'plate', type: 'plate', tx: 29, ty: 17 },
      { id: 'cell', type: 'cell', tx: 17, ty: 21, hidden: true, interact: true },
      { id: 'doorC', type: 'door', tx: 35, ty: 16, h: 2, interact: true },
      { id: 'termC', type: 'terminal', tx: 37, ty: 12, solid: true, interact: true },
      { id: 'gen', type: 'gen', tx: 39, ty: 11, w: 2, solid: true, interact: true },
      { id: 'br1', type: 'breaker', n: 1, tx: 42, ty: 11, solid: true, interact: true },
      { id: 'br2', type: 'breaker', n: 2, tx: 43, ty: 11, solid: true, interact: true },
      { id: 'br3', type: 'breaker', n: 3, tx: 44, ty: 11, solid: true, interact: true },
      { id: 'mark', type: 'marking', tx: 39, ty: 10, w: 2, hidden: true },
      { id: 'lever', type: 'lever', tx: 37, ty: 19, solid: true, interact: true },
      { id: 'padC', type: 'pad', tx: 43, ty: 20 },
      { id: 'lockA', type: 'locker', tx: 30, ty: 4, solid: true, interact: true },
      { id: 'lockB', type: 'locker', tx: 16, ty: 17, solid: true, interact: true },
      { id: 'c_prints', type: 'clue', kind: 'clue', ev: 'e1_prints', name: 'DUST PRINTS', tx: 5, ty: 14, hidden: true, interact: true },
      { id: 'c_drag', type: 'clue', kind: 'clue', ev: 'e1_drag', name: 'DRAG MARKS', tx: 20, ty: 20, hidden: true, interact: true },
      { id: 'c_cradle', type: 'clue', kind: 'machine', ev: 'e1_cradle', name: 'UNIT CRADLE', tx: 33, ty: 4, solid: true, interact: true },
      { id: 'c_carrier', type: 'clue', kind: 'signal', ev: 'e1_carrier', name: 'CARRIER LEAK', tx: 26, ty: 5, hidden: true, interact: true },
      { id: 'proj', type: 'projector', tx: 22, ty: 4, solid: true, interact: true, path: [[17, 14], [17, 10], [24, 10], [24, 5], [24, 7]] },
    ];
  },

  drone: { start: [25, 10], zone: [16, 4, 33, 22], waypoints: [[25, 10], [32, 10], [32, 15], [25, 16], [25, 21], [20, 21], [17, 15], [17, 10]] },

  objectives(g) {
    const f = g.flags;
    return [
      { t: 'Access the intake terminal', done: !!f.logA },
      { t: 'Enter the machine hall', done: !!f.hall },
      { t: 'Get through service door 2', done: !!f.cRoom },
      { t: 'Recover a power cell', done: !!(g.inv.cell || f.cellIn) },
      { t: 'Restore auxiliary power', done: !!f.power },
      { t: 'Leave through the emergency exit', done: !!f.ended },
    ];
  },
  objective(g) {
    const f = g.flags;
    if (!f.logA) return 'Find and access the intake terminal.';
    if (!f.hall) return 'Service door 1 has released. Enter the machine hall.';
    if (!f.cRoom) return f.logB ? 'Weight floor sensor IV, then reach service door 2 before your trace leaves it.' : 'Find a way through service door 2. Check the hall terminal.';
    if (!f.power) {
      if (!f.cellIn && !g.inv.cell) return 'Recover a power cell. SCAN the machine hall for a signature.';
      if (!f.cellIn) return 'Seat the power cell in the auxiliary housing.';
      return f.order ? 'Throw the breakers in the posted order: II, III, I.' : 'Find the posted breaker order. SCAN near the housing.';
    }
    return 'Auxiliary power restored. Reach the emergency exit in the machine hall.';
  },

  onStart(g) {
    g.say([
      { s: 'SENTINEL', t: "Wraith. Director Mira's survey team is holding the perimeter. This is their expedition. We are guests with better armor." },
      { s: 'SENTINEL', t: 'Limited reconnaissance. Observe, record, withdraw. Do not touch anything that looks like it wants to be touched.' },
      { s: 'WRAITH', t: 'Understood. The signal timestamp still reads three hundred and twelve years.' },
      { s: 'SENTINEL', t: 'Unverified. Old clocks lie. Different department, same obj—', fx: 'static' },
      { s: 'SYSTEM', t: 'COMMS: CARRIER LOST.  The entry hatch has sealed behind you.' },
      { s: 'WRAITH', t: 'Flashlight costs energy. Scanner costs more. Spend both carefully.' },
    ], () => g.toast(g.touchMode() ? 'D-PAD: MOVE  ·  USE / LIGHT / SCAN ON THE RIGHT' : 'MOVE: WASD / ARROWS  ·  USE: E  ·  LIGHT: F  ·  SCAN: Q', 6));
  },

  update(g, dt) {
    const f = g.flags, p = g.player;
    if (!f.hall && p.x > 16 * T + 10) {
      f.hall = true; f.ghost = true;
      g.say([
        { s: 'WRAITH', t: 'Movement. Behind me. ...Same height. Same stride. It is walking where I walked, five seconds late.' },
        { s: 'WRAITH', t: 'No frame. No mind. Not a person: a projection. The facility is recording my movements and playing them back.' },
        { s: 'SYSTEM', t: 'Automated security unit detected. Obsolete, malfunctioning, non-sentient. It investigates disturbances, including the trace.' },
        { s: 'WRAITH', t: 'A scanner pulse at close range should disrupt it for a few seconds. Lights off makes me harder to track. The wall alcoves are deep enough to stand in.' },
        { s: 'SYSTEM', t: 'Scanner also marks anomalies as evidence. EXAMINE marked evidence to log it in the case file (C).' },
      ], () => g.checkpoint(true));
    }
    if (!f.cRoom && p.x > 37 * T + 4) {
      f.cRoom = true;
      g.say([{ s: 'WRAITH', t: 'Auxiliary power room. Generator housing, three breakers, one terminal. The induction pad still holds a charge.' }], () => g.checkpoint(true));
    }
    const plate = g.ent('plate'), gh = g.ghost, byGhost = gh && g.onEnt(plate, gh), byMe = g.onEnt(plate, p);
    if (byGhost || byMe) {
      if (g.plateT <= 0) g.sfx.blip();
      if (byGhost && !byMe && !f.plateTip && !f.lever && !f.power) { f.plateTip = true; g.toast('SENSOR IV WEIGHTED BY TRACE — SERVICE DOOR 2 HOLDING', 3); }
      g.plateT = 1.2;
    } else { g.plateT = Math.max(0, g.plateT - dt); if (g.plateT === 0) f.plateTip = false; }
  },

  doorOpen(id, g) {
    const f = g.flags;
    if (id === 'doorA') return !!f.logA;
    return !!(f.lever || f.power || g.plateT > 0);
  },

  label(e, g) {
    const f = g.flags;
    switch (e.id) {
      case 'hatch': return 'INSPECT ENTRY HATCH';
      case 'termA': case 'termB': case 'termC': return 'ACCESS TERMINAL';
      case 'doorA': return f.logA ? null : 'INSPECT SERVICE DOOR 1';
      case 'doorC': return (f.lever || f.power || e.open > 0) ? null : 'INSPECT SERVICE DOOR 2';
      case 'bulkhead': return 'INSPECT FINAL DOOR';
      case 'exit': return f.power ? 'OPEN EMERGENCY EXIT' : 'INSPECT EMERGENCY EXIT';
      case 'cell': return 'TAKE POWER CELL';
      case 'gen': return (!f.cellIn && g.inv.cell) ? 'SEAT POWER CELL' : 'INSPECT HOUSING';
      case 'br1': case 'br2': case 'br3': return f.power ? null : 'THROW BREAKER ' + ['I', 'II', 'III'][e.n - 1];
      case 'lever': return f.lever ? null : 'PULL MANUAL RELEASE';
    }
    return null;
  },

  interact(e, g) {
    const f = g.flags, W1 = (t) => g.say([{ s: 'WRAITH', t }]);
    const readLog = (key) => { g.addLog(key); if (!f[key]) { f[key] = true; return true; } return false; };
    switch (e.id) {
      case 'hatch': return g.say([{ s: 'SYSTEM', t: 'ENTRY HATCH: SEALED. No command was issued from this side.' }, { s: 'WRAITH', t: 'Then I find another way out. Mira will want the long route documented anyway.' }]);
      case 'termA': return g.terminal('TERMINAL 01 // INTAKE', LOG_A, () => {
        if (!readLog('logA')) return;
        f.lights = true; g.sfx.door();
        g.say([
          { s: 'SYSTEM', t: 'Emergency lighting has activated. Service door 1 has unlocked. No authorization was given.' },
          { s: VOICE, t: '"Do not open the final door."' },
          { s: 'WRAITH', t: 'That is my voice. I have not said that.' },
          { s: 'WRAITH', t: 'Logged as evidence, not as instruction. Proceeding.' },
        ], () => g.checkpoint(true));
      });
      case 'doorA': g.sfx.deny(); return W1('Sealed. No manual release on this side. The intake terminal is still drawing power.');
      case 'termB': return g.terminal('TERMINAL 02 // MACHINE HALL', LOG_B, () => {
        g.disturb(g.player.x, g.player.y);
        if (readLog('logB')) g.say([{ s: 'WRAITH', t: 'Two operators. I am one. The trace repeats me five seconds late... that makes two.' }, { s: 'WRAITH', t: 'Stand on sensor IV, walk to the door, and wait for the recording to stand where I stood.' }]);
      });
      case 'doorC': g.sfx.deny(); return W1(f.logB ? 'It holds only while sensor IV is weighted. I need something on that plate while I stand here.' : 'Service door 2. Slaved to a floor sensor somewhere in this hall. The hall terminal may explain.');
      case 'bulkhead':
        f.finalSeen = true; g.sfx.static();
        return g.say([
          { s: 'SYSTEM', t: 'BULKHEAD 0. Markings illegible. Seal intact. A manual release is present on this side.' },
          { s: VOICE, t: '"Do not open the final door."' },
          { s: 'WRAITH', t: 'Watchtower gathers evidence. It does not take dares. The door stays shut until someone can explain it.' },
        ]);
      case 'exit':
        if (!f.power) { g.sfx.deny(); return g.say([{ s: 'SYSTEM', t: 'EMERGENCY EXIT: NO POWER. Auxiliary supply offline.' }, { s: 'WRAITH', t: 'The drive is intact. It needs auxiliary power. There will be a generator room.' }]); }
        f.ended = true; g.sfx.door();
        return g.say([
          { s: 'SYSTEM', t: 'Emergency exit cycling. Outer seal released.' },
          { s: 'SENTINEL', t: '—raith. Carrier restored. You were dark for some time. Report.', fx: 'static' },
          { s: 'WRAITH', t: 'First sector exited. No persons encountered. One automated security unit, malfunctioning. One anomaly: the facility records movement and replays it.' },
          { s: 'WRAITH', t: 'Origin, builders and purpose unresolved. And one door I chose not to open.' },
          { s: 'SENTINEL', t: 'Restraint. Noted, and appreciated. Director Mira will want all of it. So will I.' },
          { s: 'SYSTEM', t: 'INCOMING TRANSMISSION. Source: the sector you just left. Timestamp: unverified.' },
          { s: VOICE, t: '"You left it closed. Good. ...It was never locked from your side."' },
          { s: 'WRAITH', t: '...Sentinel. Add one more item to the report.' },
        ], () => g.finish());
      case 'cell':
        e.gone = true; g.inv.cell = true; g.sfx.pickup(); g.disturb(g.player.x, g.player.y); g.checkpoint(true);
        return g.say([{ s: 'SYSTEM', t: 'Recovered: auxiliary power cell. Housing corroded. Charge holding.' }, { s: 'WRAITH', t: 'Older than anything in the City. Still working. Noted.' }]);
      case 'gen':
        if (f.power) return W1('Running. Rough, but running.');
        if (f.cellIn) return W1(f.order ? 'Cell seated. Posted order: II, III, I.' : 'Cell seated. The restart order was painted above the housing. Too faded to read unaided; a scan should raise it.');
        if (!g.inv.cell) { g.sfx.deny(); f.needCell = true; return W1('Housing is empty. Drag marks lead back toward the machine hall. A scanner sweep out there should find a cell signature.'); }
        g.inv.cell = false; f.cellIn = true; g.sfx.pickup(); g.checkpoint(true);
        return g.say([{ s: 'SYSTEM', t: 'Power cell seated. Breakers live. Restart sequence required.' }]);
      case 'br1': case 'br2': case 'br3': {
        if (!f.cellIn) { g.sfx.deny(); return W1('Dead. No current without a cell in the housing.'); }
        f.seq = f.seq || [];
        if (f.seq.includes(e.n)) return;
        if (SEQ[f.seq.length] !== e.n) { f.seq = []; g.drain(6); g.sfx.spark(); g.player.hurt = .4; return g.toast('SEQUENCE FAULT — BREAKERS RESET  ·  ENERGY −6', 3); }
        f.seq.push(e.n); g.sfx.beep();
        if (f.seq.length < 3) return g.toast(`BREAKER ${['I', 'II', 'III'][e.n - 1]} ACCEPTED  (${f.seq.length}/3)`, 2);
        f.power = true; f.lights = true; g.sfx.power();
        return g.say([
          { s: 'SYSTEM', t: 'AUXILIARY POWER RESTORED. Service doors released. Emergency exit drive: powered.' },
          { s: 'WRAITH', t: 'The exit is on the east wall of the machine hall. The security unit will be awake too.' },
        ], () => g.checkpoint(true));
      }
      case 'lever': f.lever = true; g.sfx.door(); return g.toast('MANUAL RELEASE — SERVICE DOOR 2 LOCKED OPEN', 3);
      case 'termC': return g.terminal('TERMINAL 03 // AUXILIARY POWER', LOG_C, () => { if (readLog('logC')) g.say([{ s: 'WRAITH', t: '"See intake register." The register had one entry. Mine.' }]); });
    }
  },

  onScan(g, found, stunned) {
    const f = g.flags, p = g.player;
    for (const e of found) {
      if (e.id === 'cell') { g.sfx.pickup(); g.toast('SCAN: POWER CELL SIGNATURE LOCATED IN DEBRIS', 3); }
      if (e.id === 'mark') { f.order = true; g.toast('SCAN: FADED PAINT RAISED —  II · III · I', 4); }
    }
    if (found.length || stunned) return;
    const cell = g.ent('cell');
    if (cell.hidden && p.x > 16 * T && p.x < 34 * T) {
      const dx = (cell.tx + .5) * T - p.x, dy = (cell.ty + .5) * T - p.y;
      const dir = (Math.abs(dy) > 60 ? (dy > 0 ? 'SOUTH' : 'NORTH') : '') + (Math.abs(dy) > 60 && Math.abs(dx) > 60 ? '-' : '') + (Math.abs(dx) > 60 ? (dx > 0 ? 'EAST' : 'WEST') : '');
      g.toast(`SCAN: FAINT POWER SIGNATURE — ${dir || 'VERY CLOSE'}`, 3);
    }
  },
};
