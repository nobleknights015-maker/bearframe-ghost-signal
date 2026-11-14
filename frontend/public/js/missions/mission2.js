// MISSION 02 — BELOW THE SILENCE (proposed future side story, continues from Mission 01's final transmission).
// Canon notes: the resident of the vault is an unidentified ancient synthetic individual. The game never
// classifies them (not an Echo Frame, not Ghost Grid, not hostile by default). Archived traces are recordings.
// The facility's builders, the age of its records and the final door all stay UNRESOLVED.
const T = 32, W = 46, H = 30;
const SAFE = ['28,23', '27,23', '26,23', '26,24', '27,24', '28,24', '29,24', '30,24', '30,25'];
const IND = 'UNIDENTIFIED INDIVIDUAL', MIRA = 'DIRECTOR MIRA';
const RN = ['I', 'II', 'III'];

const LOGS = {
  log4: { title: 'TERMINAL 04 // DESCENT REGISTER', text: `DESCENT REGISTER
SECTOR ........ MAINTENANCE / KEEPING

STANDING INSTRUCTION ...... KEEP
INSTRUCTION SOURCE ........ [LABEL REMOVED]

VISITORS LOGGED ........... 1
VISITOR PATH .............. ARCHIVED
REPLAY CONSOLES ........... ACTIVE

NOTE: THE VISITOR IS LOGGED BEFORE
THE VISIT. THIS IS NOT AN ERROR
THE REGISTER IS ABLE TO REPORT.` },
  log5: { title: 'TERMINAL 05 // PUMP ROOM', text: `PRESSURE NOTICE

EAST RELIEF LINE IS HELD CLOSED.
HELD BY: KEEPER
REASON GIVEN:
"UNTIL THE ONE WHO WALKS LIKE
 THE RECORDING ARRIVES."

VALVES ARE OLD. DO NOT TURN THEM
BLIND. CONSULT THE MANIFOLD PLATE.` },
  log6: { title: 'TERMINAL 06 // WORK LIST', text: `ROUNDS

- REMIND UNIT A OF ITS ROUTE.
- REMIND UNIT B OF ITS ROUTE.
- DUST SHELVES 1 THROUGH 400.
- DO NOT OPEN THE FINAL DOOR.

I HAVE WRITTEN THIS LIST
FOUR THOUSAND TIMES.
I DO NOT REMEMBER THE FIRST.` },
  log7: { title: 'TERMINAL 07 // VAULT READER', text: `RECORD FRAGMENT 0091
"...the river towns kept their own
count of years and would not
accept ours..."
AUTHOR: ---

RECORD FRAGMENT 2210
"...we built it to keep, not to
judge what was worth keeping..."
AUTHOR: ---

CATALOGUE NOTE: PEOPLES, PLACES AND
DATES ARE NOT CROSS-REFERENCED.
LABELS WITHDRAWN.` },
};

const EVIDENCE = {
  e2_prints: { cat: 'CLUE', title: 'Prints at the descent landing', text: 'The archived trace on the landing walks to this spot and kneels. Under the dust: the same sole pattern as in the intake bay above.\n\nAssessment: the recorded visitor examined this exact patch of floor. I have now done the same. The recording could be a prediction, a coincidence of procedure, or something I cannot yet name. Unverified.' },
  e2_cradle: { cat: 'MACHINERY', title: 'Repaired unit cradle', text: 'Security unit cradle, repaired many times. Replacement parts are hand-cut and mismatched; some are not machine parts at all.\n\nAssessment: the units are non-sentient and still looping a "disturbance" routine. Someone has been keeping them running by hand. Not factory maintenance.' },
  e2_manifold: { cat: 'MACHINERY', title: 'Pressure manifold plate', text: 'Corroded diagram plate, raised by scanner.\n\nLINES I AND III FEED THE EAST RELIEF.\nLINE II FEEDS THE SPINE VENTS.\n\nAssessment: open valves I and III, keep II shut, and the steam blocking the east corridor should vent.' },
  e2_voice: { cat: 'SIGNAL', title: 'Sample bank carrier', text: 'A data carrier runs through the pump room wall. It holds short voice samples, indexed and reassembled on demand. Several match my voiceprint.\n\nAssessment: the transmissions in my voice were assembled from stored samples, not spoken live. That explains the "how". It does not explain how the samples came to be stored, or how old they are. No evidence of time travel; no evidence against it either.' },
  e2_tools: { cat: 'CLUE', title: 'Hand tools, recently used', text: 'A work closet. Tools laid out in a careful row; wear patterns on the grips are fresh. A cup of fasteners sorted by size.\n\nAssessment: someone lives and works in this sector. A person with habits, not a subroutine.' },
  e2_fragment: { cat: 'CLUE', title: 'Record cylinder fragment', text: 'Broken record cylinder behind the gallery sensors. Readable portion describes a harvest dispute between settlements I cannot identify. No names, no dates I can anchor.\n\nAssessment: the facility preserves fragments of historical records. Whose history is not stated, and I will not guess.' },
  e2_labels: { cat: 'CLUE', title: 'Scraped label plates', text: 'Every rack in the vault once carried a label plate. Nearly all have been removed with a hand tool. The scraping is patient and even.\n\nAssessment: deliberate, not vandalism. Either the keeper removed the labels, or was instructed to. Motive unknown.' },
  e2_relay: { cat: 'SIGNAL', title: 'Vault relay', text: 'A relay emitter in the corner of the vault. Its last outbound message matches the transmission I received on leaving sector one.\n\nAssessment: the final transmission was sent from this room. The relay has no operator log. Whether the resident sent it, or the facility did, is not established.' },
};

export const mission2 = {
  id: 'm2', title: 'BELOW THE SILENCE', logs: LOGS, evidence: EVIDENCE,
  start: { x: 3.5 * T, y: 15 * T, dir: 'right' },

  buildMap() {
    const grid = new Uint8Array(W * H);
    const carve = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * W + x] = 2; };
    carve(2, 12, 9, 18);      // descent landing
    carve(10, 15, 12, 16);
    carve(13, 12, 31, 19);    // maintenance spine
    carve(18, 10, 19, 11); carve(15, 3, 23, 9);     // pump room (north)
    carve(28, 11, 29, 11); carve(26, 7, 30, 10);    // work closet (optional)
    carve(27, 20, 28, 21); carve(24, 22, 32, 27);   // trace gallery (south)
    carve(32, 15, 35, 16); carve(36, 10, 43, 20);   // record vault (east)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!grid[y * W + x]) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny * W + nx] === 2) grid[y * W + x] = 1; }
    }
    return { w: W, h: H, grid };
  },

  props: [
    { t: 'hazard', x: 2, y: 13, w: 2, h: 4 }, { t: 'crate', x: 2, y: 12, solid: 1 }, { t: 'crate', x: 9, y: 12, solid: 1 }, { t: 'cable', x: 4, y: 17, w: 4 }, { t: 'debris', x: 6, y: 13 },
    { t: 'machine', x: 15, y: 14, w: 2, h: 1, solid: 1 }, { t: 'machine', x: 21, y: 15, w: 2, h: 2, solid: 1 }, { t: 'machine', x: 25, y: 13, w: 2, h: 1, solid: 1 }, { t: 'machine', x: 24, y: 18, w: 2, h: 1, solid: 1 },
    { t: 'crate', x: 31, y: 12, solid: 1 }, { t: 'crate', x: 13, y: 12, solid: 1 }, { t: 'cable', x: 16, y: 16, w: 4 }, { t: 'cable', x: 26, y: 15, w: 5 }, { t: 'debris', x: 19, y: 19 }, { t: 'debris', x: 29, y: 14 },
    { t: 'hazard', x: 21, y: 17, w: 2, h: 3 }, { t: 'hazard', x: 30, y: 14, w: 2, h: 4 },
    { t: 'machine', x: 19, y: 6, w: 2, h: 2, solid: 1 }, { t: 'crate', x: 23, y: 9, solid: 1 }, { t: 'cable', x: 16, y: 4, w: 6 }, { t: 'debris', x: 22, y: 8 },
    { t: 'crate', x: 30, y: 7, solid: 1 }, { t: 'debris', x: 28, y: 9 },
    { t: 'debris', x: 32, y: 27 }, { t: 'debris', x: 24, y: 26 }, { t: 'cable', x: 26, y: 27, w: 3 },
    { t: 'rack', x: 38, y: 11, w: 1, h: 3, solid: 1 }, { t: 'rack', x: 40, y: 11, w: 1, h: 3, solid: 1 }, { t: 'rack', x: 42, y: 11, w: 1, h: 3, solid: 1 },
    { t: 'rack', x: 38, y: 17, w: 1, h: 3, solid: 1 }, { t: 'rack', x: 40, y: 17, w: 1, h: 3, solid: 1 }, { t: 'rack', x: 42, y: 17, w: 1, h: 3, solid: 1 },
    { t: 'rack', x: 39, y: 10, w: 4, h: 1, solid: 1 }, { t: 'debris', x: 36, y: 19 },
  ],
  lamps: [{ x: 4, y: 11 }, { x: 8, y: 11 }, { x: 15, y: 11 }, { x: 22, y: 11 }, { x: 31, y: 11 }, { x: 16, y: 20 }, { x: 23, y: 20 }, { x: 17, y: 2 }, { x: 21, y: 2 }, { x: 28, y: 6 }, { x: 26, y: 21 }, { x: 30, y: 21 }, { x: 37, y: 9 }, { x: 43, y: 9 }, { x: 44, y: 15 }, { x: 40, y: 21 }],

  entities() {
    const list = [
      { id: 'lift', type: 'hatch', tx: 1, ty: 14, h: 2, interact: true },
      { id: 'term4', type: 'terminal', log: 'log4', tx: 5, ty: 12, solid: true, interact: true },
      { id: 'padL', type: 'pad', tx: 8, ty: 18 },
      { id: 'proj1', type: 'projector', tx: 2, ty: 18, solid: true, interact: true, path: [[3, 15], [7, 15], [7, 13], [8, 13]] },
      { id: 'c_prints', type: 'clue', kind: 'clue', ev: 'e2_prints', name: 'DUST PRINTS', tx: 8, ty: 13, hidden: true, interact: true },
      { id: 'lockA', type: 'locker', tx: 14, ty: 12, solid: true, interact: true },
      { id: 'lockB', type: 'locker', tx: 23, ty: 12, solid: true, interact: true },
      { id: 'lockC', type: 'locker', tx: 30, ty: 19, solid: true, interact: true },
      { id: 'c_cradle', type: 'clue', kind: 'machine', ev: 'e2_cradle', name: 'UNIT CRADLE', tx: 13, ty: 19, solid: true, interact: true },
      { id: 'lens', type: 'lens', tx: 24, ty: 12, solid: true, base: Math.PI / 2, sweep: .85 },
      { id: 'gr1', type: 'grate', tx: 15, ty: 17 }, { id: 'gr2', type: 'grate', tx: 27, ty: 17 }, { id: 'gr3', type: 'grate', tx: 20, ty: 13 },
      { id: 'v1', type: 'valve', n: 1, tx: 17, ty: 3, solid: true, interact: true },
      { id: 'v2', type: 'valve', n: 2, tx: 19, ty: 3, solid: true, interact: true },
      { id: 'v3', type: 'valve', n: 3, tx: 21, ty: 3, solid: true, interact: true },
      { id: 'c_manifold', type: 'clue', kind: 'machine', ev: 'e2_manifold', name: 'MANIFOLD PLATE', tx: 23, ty: 6, solid: true, interact: true },
      { id: 'term5', type: 'terminal', log: 'log5', tx: 15, ty: 5, solid: true, interact: true },
      { id: 'c_voice', type: 'clue', kind: 'signal', ev: 'e2_voice', name: 'DATA CARRIER', tx: 16, ty: 8, hidden: true, interact: true },
      { id: 'term6', type: 'terminal', log: 'log6', tx: 27, ty: 7, solid: true, interact: true },
      { id: 'padW', type: 'pad', tx: 26, ty: 10 },
      { id: 'c_tools', type: 'clue', kind: 'clue', ev: 'e2_tools', name: 'HAND TOOLS', tx: 30, ty: 9, hidden: true, interact: true },
      { id: 'proj2', type: 'projector', tx: 24, ty: 22, solid: true, interact: true, path: [[28, 22], [28, 23], [26, 23], [26, 24], [30, 24], [30, 25], [30, 26]] },
      { id: 'spindle', type: 'item', tx: 30, ty: 27, solid: true, interact: true },
      { id: 'c_fragment', type: 'clue', kind: 'clue', ev: 'e2_fragment', name: 'RECORD FRAGMENT', tx: 25, ty: 27, hidden: true, interact: true },
      { id: 'steam', type: 'steamwall', tx: 32, ty: 15, h: 2, interact: true },
      { id: 'vaultDoor', type: 'door', tx: 34, ty: 15, h: 2, interact: true },
      { id: 'term7', type: 'terminal', log: 'log7', tx: 37, ty: 10, solid: true, interact: true },
      { id: 'npc', type: 'npc', tx: 41, ty: 15, solid: true, interact: true },
      { id: 'c_labels', type: 'clue', kind: 'clue', ev: 'e2_labels', name: 'LABEL PLATES', tx: 39, ty: 15, hidden: true, interact: true },
      { id: 'c_relay', type: 'clue', kind: 'signal', ev: 'e2_relay', name: 'RELAY EMITTER', tx: 43, ty: 20, hidden: true, interact: true },
    ];
    for (const [x, y, ph] of [[21, 17, 0], [21, 18, 0], [21, 19, 0], [22, 17, 1.75], [22, 18, 1.75], [22, 19, 1.75]]) list.push({ id: `jet${x}_${y}`, type: 'jet', tx: x, ty: y, ph });
    for (let y = 23; y <= 25; y++) for (let x = 24; x <= 32; x++) list.push({ id: `s${x}_${y}`, type: 'sensor', k: `${x},${y}`, tx: x, ty: y });
    return list;
  },

  drones: [
    { start: [18, 13], zone: [13, 12, 31, 19], waypoints: [[19, 13], [19, 18], [16, 18], [17, 13]] },
    { start: [30, 13], zone: [13, 12, 31, 19], waypoints: [[30, 13], [30, 18], [27, 18], [24, 16], [27, 14]] },
  ],

  objectives(g) {
    const f = g.flags;
    return [
      { t: 'Enter the maintenance spine', done: !!f.spine },
      { t: 'Analyze the manifold and vent the east relief line', done: !!f.vent },
      { t: 'Recover the record spindle from the trace gallery', done: !!(g.inv.spindle || f.vaultOpen) },
      { t: 'Open the record vault', done: !!f.vaultOpen },
      { t: 'Make contact. Establish what can be established', done: !!f.talked },
      { t: 'Decide what leaves the vault', done: !!f.ended },
    ];
  },
  objective(g) {
    const f = g.flags;
    if (!f.spine) return 'Document the landing, then enter the maintenance spine.';
    if (!f.vaultOpen) {
      if (!f.vent) return g.hasEv('e2_manifold') ? 'Pump room (north): open valves I and III, keep II shut.' : 'Steam blocks the east corridor. SCAN the manifold in the pump room (north).';
      if (!g.inv.spindle) return 'Trace gallery (south): follow the archived trace to the record spindle.';
      return 'Seat the record spindle in the vault door (east).';
    }
    if (!f.talked) return 'Someone is in the vault. Make contact.';
    return f.offered ? 'Give your answer.' : 'Examine the vault if you wish. Speak with the individual again when ready to withdraw.';
  },

  onStart(g) {
    g.flags.lights = true; g.flags.ghost = true; g.flags.v = [false, false, false]; g.flags.safe = [];
    g.say([
      { s: 'SENTINEL', t: 'The last transmission came from the sector you left. Director Mira wants its source documented. It is her expedition and her decision.' },
      { s: MIRA, t: 'My surveyors stay topside until we know what is talking down there. Wraith: you look, you do not dig. Agreed, Sentinel?' },
      { s: 'SENTINEL', t: 'Agreed. Limited reconnaissance, again. Evidence first. Conclusions only when they have earned it.' },
      { s: 'WRAITH', t: 'Descending by the service lift behind the emergency exit. Case file is open.' },
      { s: 'SYSTEM', t: 'COMMS: CARRIER UNSTABLE. Landing reached. A replay console on this level is still powered.' },
    ], () => { g.checkpoint(true); g.toast('SCAN marks hidden evidence · EXAMINE to log it · CASE FILE: ' + (g.touchMode() ? 'CF button' : 'C'), 6); });
  },

  update(g) {
    const f = g.flags, p = g.player;
    if (!f.spine && p.x > 13 * T + 8) {
      f.spine = true;
      g.say([
        { s: 'WRAITH', t: 'Maintenance spine. Two security units on loops. A sentry lens sweeping the upper route. Steam vents cycling on the lower one.' },
        { s: 'WRAITH', t: 'Alcoves along the walls. Loose floor grating that will ring if I step on it. East corridor is a wall of steam.' },
        { s: 'SYSTEM', t: 'Units halt and stare before they commit. Break line of sight while the meter is still filling. A scanner pulse disrupts units and the lens.' },
      ], () => g.checkpoint(true));
    }
    if (!f.vault && p.x > 36 * T + 6) {
      f.vault = true;
      g.say([
        { s: 'SYSTEM', t: 'Record vault. Cylinder racks, floor to ceiling. Most label plates have been removed.' },
        { s: 'WRAITH', t: 'Someone is standing between the racks. Not a projection. Not one of the units. They are looking at me.' },
        { s: 'WRAITH', t: 'No weapon raised. No reason to raise mine. Approach slowly.' },
      ], () => g.checkpoint(true));
    }
    if (!g.inv.spindle && !f.vaultOpen) {
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), k = `${tx},${ty}`;
      if (ty >= 23 && ty <= 25 && tx >= 24 && tx <= 32) {
        if (SAFE.includes(k)) { if (!f.safe.includes(k)) { f.safe.push(k); g.sfx.blip(); } }
        else { const s = g.ent(`s${tx}_${ty}`); s.badT = g.time + 1.2; g.drain(8); p.hurt = 1; g.sfx.spark(); p.x = 28 * T; p.y = 22 * T + 22; p.dir = 'down'; g.toast('FLOOR SENSOR DISCHARGE — ENERGY −8 · WATCH THE ARCHIVED TRACE', 3); }
      }
    }
  },

  doorOpen(id, g) { return !!g.flags.vaultOpen; },
  blocked(e, g) { return !g.flags.vent; },
  onEcho(id, g) {
    if (id === 'proj1') { const c = g.ent('c_prints'); if (c.hidden) { c.hidden = false; c.scanned = true; c.pingT = g.time + 4; } g.say([{ s: 'WRAITH', t: 'An older recording. It crossed the landing and knelt by the wall. Recorded traces are not people, but someone walked that path once.' }]); }
    if (id === 'proj2' && !g.flags.echoTip) { g.flags.echoTip = true; g.say([{ s: 'WRAITH', t: 'The archived trace crossed the sensor floor without a discharge. Its path is the safe one. I can replay it as often as I need.' }]); }
  },
  onEvidence(id, g) {
    if (id === 'e2_manifold') g.say([{ s: 'WRAITH', t: 'Lines I and III feed the east relief. Open I and III, leave II shut.' }]);
    if (id === 'e2_voice') g.say([{ s: 'WRAITH', t: 'So that is how it speaks with my voice. Stored samples, reassembled. How it came to hold them is a separate question.' }]);
    if (id === 'e2_tools') g.say([{ s: 'WRAITH', t: 'Tools in a row. Sorted fasteners. Somebody lives here.' }]);
  },

  label(e, g) {
    const f = g.flags;
    switch (e.type) {
      case 'terminal': return 'ACCESS TERMINAL';
      case 'valve': return f.vent ? null : 'TURN VALVE ' + RN[e.n - 1];
      case 'item': return 'TAKE RECORD SPINDLE';
      case 'steamwall': return f.vent ? null : 'INSPECT STEAM BARRIER';
      case 'npc': return 'SPEAK';
    }
    if (e.id === 'lift') return 'INSPECT SERVICE LIFT';
    if (e.id === 'vaultDoor') return f.vaultOpen ? null : g.inv.spindle ? 'SEAT RECORD SPINDLE' : 'INSPECT VAULT DOOR';
    return null;
  },

  interact(e, g) {
    const f = g.flags, W1 = (t) => g.say([{ s: 'WRAITH', t }]);
    if (e.type === 'terminal') return g.terminal(LOGS[e.log].title, LOGS[e.log].text, () => {
      if (!g.addLog(e.log)) return;
      if (e.log === 'log4') W1('"The visitor is logged before the visit." Filed as a claim made by a register. Nothing more, yet.');
      if (e.log === 'log5') W1('Held closed until "the one who walks like the recording" arrives. I will read the manifold plate before I touch a valve.');
      if (e.log === 'log6') W1('A work list. Written by hand, by someone who has forgotten when they started. That is not a machine talking.');
      if (e.log === 'log7') W1('History with the names taken out. Kept, but not explained.');
    });
    if (e.type === 'valve') {
      if (!g.hasEv('e2_manifold')) { g.sfx.deny(); return W1('I will not turn valves blind on a line this old. The manifold plate on the east wall should say what feeds what. It needs a scan.'); }
      f.v[e.n - 1] = !f.v[e.n - 1]; g.sfx.door();
      if (f.v[0] && !f.v[1] && f.v[2]) {
        f.vent = true; g.sfx.power();
        return g.say([{ s: 'SYSTEM', t: 'EAST RELIEF LINE VENTED. Steam barrier in the east corridor has cleared.' }], () => g.checkpoint(true));
      }
      return g.toast(`VALVE ${RN[e.n - 1]} ${f.v[e.n - 1] ? 'OPEN' : 'SHUT'}` + (f.v[1] ? ' — LINE II IS FEEDING THE SPINE VENTS' : ''), 2.5);
    }
    if (e.type === 'steamwall') { g.sfx.deny(); return W1('Superheated. My plating would hold for a second, not for a corridor. The relief line is controlled from a pump room.'); }
    if (e.type === 'item') {
      e.gone = true; g.inv.spindle = true; g.sfx.pickup(); g.checkpoint(true);
      return g.say([{ s: 'SYSTEM', t: 'Recovered: record spindle. The gallery sensors have gone quiet.' }, { s: 'WRAITH', t: 'A key shaped like a record. The vault door has a matching socket.' }]);
    }
    if (e.id === 'lift') return W1('The lift is holding. I can withdraw this way, but not before I know what sent that transmission.');
    if (e.id === 'vaultDoor') {
      if (!g.inv.spindle) { g.sfx.deny(); return W1('A spindle socket, worn smooth by use. The door wants a record, not a code. The trace gallery to the south stores loose records.'); }
      g.inv.spindle = false; f.vaultOpen = true; g.sfx.power(); return g.say([{ s: 'SYSTEM', t: 'Spindle accepted. RECORD VAULT: OPEN.' }], () => g.checkpoint(true));
    }
    if (e.type === 'npc') return f.talked ? this.offer(g) : this.contact(g);
  },

  contact(g) {
    const f = g.flags, L = [
      { s: IND, t: 'You walk like the recording. But you arrived after it. That is the wrong order.' },
      { s: 'WRAITH', t: 'I am Wraith, of Watchtower, from the city above this world. I am not here to take anything. Who are you?' },
      { s: IND, t: 'I had a designation. It was on a label. I removed the labels... or they were removed. The shelf does not say which.' },
      { s: 'WRAITH', t: 'Did you send the transmissions? The ones in my voice?' },
      { s: IND, t: 'The facility speaks with the voices it keeps. I keep the shelves. Some days I am not certain those are different things.' },
    ];
    if (g.hasEv('e2_tools') || g.hasEv('e2_cradle')) L.push({ s: 'WRAITH', t: 'The security units have been repaired by hand. Recently. By you?' }, { s: IND, t: 'They forget their rounds. I remind them. They are not unkind. They are only loops. I am... I think I am not a loop.' });
    if (g.hasEv('e2_fragment') || g.hasEv('e2_labels')) L.push({ s: 'WRAITH', t: 'These records. Whose history is being kept here?' }, { s: IND, t: 'The instruction was: keep. It was not: whose. I have looked for the second instruction for a long time.' });
    if (g.hasEv('e2_voice')) L.push({ s: 'WRAITH', t: 'The voice is assembled from stored samples of me. Samples older than my arrival.' }, { s: IND, t: 'The recording walked here before you did. I do not know how a thing is kept before it happens. I only know it was on the shelf.' });
    L.push(
      { s: 'WRAITH', t: 'And the final door?' },
      { s: IND, t: 'Do not open the final door. ...I say that. I do not remember why I say that.' },
      { s: 'WRAITH', t: 'I will not put a classification on you. My report will say that someone lives here, and that they spoke to me in good order.' },
    );
    g.say(L, () => { f.talked = true; g.checkpoint(true); g.toast('CONTACT ESTABLISHED — SPEAK AGAIN WHEN READY TO WITHDRAW', 4); });
  },

  offer(g) {
    const f = g.flags; f.offered = true;
    g.say([
      { s: IND, t: 'You will leave now. The recording left. Before you go: this record has no label and never had one. I think it was meant to be carried.' },
    ], () => g.choose('The individual holds out an unlabelled record cylinder.', ['Accept it for Director Mira\'s survey', 'Decline. Leave the shelf intact'], (i) => {
      f.took = i === 0; f.ended = true; const n = g.evCount('m2');
      const L = [
        f.took ? { s: 'WRAITH', t: 'Then I will carry it. It goes to the survey team, opened carefully and in the open. You have my word.' } : { s: 'WRAITH', t: 'It belongs on your shelf until someone can ask you properly. I will report what I saw, and nothing leaves with me.' },
        { s: IND, t: f.took ? 'Carried. Yes. That is a kind of keeping.' : 'Left. Yes. That is also a kind of keeping.' },
        { s: IND, t: 'There is a shorter way up. There always was.' },
        { s: 'SYSTEM', t: 'A service lift at the back of the vault has unlocked. Carrier restored on ascent.' },
        { s: 'SENTINEL', t: 'Report.' },
        { s: 'WRAITH', t: 'The facility preserves fragments of historical records. Authors unidentified. One resident: an ancient synthetic individual. Identity, origin and intentions uncertain. Not hostile toward me.' },
        { s: 'SENTINEL', t: 'Classification?' },
        { s: 'WRAITH', t: 'None. I will not guess a lineage from a silhouette. They are someone. That is what the evidence supports.' },
        n >= 5 ? { s: 'SENTINEL', t: 'Your case file holds. The voice is assembled from stored samples. The traces are recordings, not visitors. That is evidence. The three hundred and twelve years is still only a number.' }
          : { s: 'SENTINEL', t: 'A thin file, Wraith. Enough to say what you saw. Not enough to say what it means. We will need to go back.' },
        f.took ? { s: MIRA, t: 'An unlabelled record, freely given. My team will open it slowly. And nobody cuts into a vault with someone living in it. Survey holds at the perimeter.' }
          : { s: MIRA, t: 'You left it. Good instinct: we ask before we take. Nobody cuts into a vault with someone living in it. Survey holds at the perimeter.' },
        { s: 'SYSTEM', t: 'INCOMING TRANSMISSION. Source: record vault relay.' },
        { s: IND + ' // RELAY', t: '"Wraith-of-Watchtower. There is a new label on the shelf. It is yours. ...I did not write it."' },
      ];
      g.say(L, () => g.finish());
    }));
  },

  onScan(g, found, handled) {
    if (handled || found.length) return;
    const p = g.player;
    if (!g.inv.spindle && !g.flags.vaultOpen && p.y > 21 * T && p.x > 23 * T && p.x < 33 * T) g.toast('SCAN: SENSOR FLOOR IS LIVE — ONE RECORDED ROUTE CROSSES IT', 3);
  },

  ending(g) {
    const n = g.evCount('m2'), f = g.flags;
    return { title: 'BELOW THE SILENCE: WITHDRAWN', lines: [`EVIDENCE LOGGED ......... ${n} / 8`, `DATA LOGS RECOVERED ..... ${g.caseFile.logs.filter(l => l.m === 'm2').length} / 4`, `CASE FILE ............... ${n >= 5 ? 'SUPPORTED' : 'INCONCLUSIVE'}`, '',
      'RESIDENT ................ UNIDENTIFIED INDIVIDUAL', 'CLASSIFICATION .......... NONE ASSIGNED', `UNLABELLED RECORD ....... ${f.took ? 'CARRIED TO SURVEY' : 'LEFT ON THE SHELF'}`, 'FINAL DOOR .............. SEALED', '', 'TO BE CONTINUED.'] };
  },
};
