// MISSION 03 — RETURN TO THE SURFACE.
// Ghost Signal expansion candidate. New events are provisional connective fiction, not retroactive canon.
// Mira leads Exploration. Sentinel coordinates Watchtower. No site/faction lineage is identified without evidence.
const T = 32, W = 56, H = 34;

const LOGS = {
  field: { title: 'FIELD STATION // EXPEDITION LOG',
    text: 'EXPLORATION SURVEY — PERIMETER HOLD\n\nSite authority ........ DIRECTOR MIRA\nWatchtower liaison ... WTR-07 / WRAITH\n\nBelow-grade contact: unclassified.\nRecords: provenance not established.\nNo extraction without custody review.\n\nSurface relay path is noisy.\nDo not mistake a carrier for an identity.' },
  relay: { title: 'RIDGE RELAY // TECHNICAL READOUT',
    text: 'FIELD RELAY — ROUTE A\n\nUPLINK .................. DEGRADED\nREPEATER ................ OLD / INACTIVE\nLOCAL CARRIER ........... INTERMITTENT\n\nNo confirmed link to the vault.\nNo verified creation date.\nA modern survey coupler may restore\ntelemetry without opening the site.' },
};

const EVIDENCE = {
  e3_tracks: { cat: 'CLUE', title: 'Tracks above the service lift',
    text: 'Fresh expedition footfalls overlap much older impressions. The prints do not establish the age or identity of whoever made the underlying tracks. The perimeter remains a survey site, not an excavation.' },
  e3_marker: { cat: 'CLUE', title: 'Survey boundary stakes',
    text: 'Exploration markers are intentionally placed outside the old structure. Director Mira has kept the boundary stable until risk and ownership can be assessed.' },
  e3_carrier: { cat: 'SIGNAL', title: 'Unassigned ridge carrier',
    text: 'The upper ridge emits a low-power pulse. Its envelope resembles part of the signal monitored below, but a resemblance is not a source attribution. The repeater has no usable ownership plate.' },
  e3_cradle: { cat: 'MACHINERY', title: 'Weathered surface relay mount',
    text: 'The mounting plate predates Exploration’s recent field equipment. Repeated repairs and replacement contacts make manufacturer and chronological identification unreliable.' },
  e3_survey: { cat: 'CLUE', title: 'Surveyor annotations',
    text: 'Nova mapped two possible approaches and explicitly marked the third as unverified. The scan contains uncertainty, rather than a fabricated answer.' },
};

const STEP = [
  'Speak to Director Mira at the survey outpost',
  'Review the surface perimeter and evidence',
  'Collect the spare survey coupler',
  'Inspect the ridge carrier and restore telemetry',
  'Review the findings with Nova',
  'Make a recommendation to Mira',
];

function fieldMap() {
  const grid = new Uint8Array(W * H);
  // Open-air field instead of another rectangular indoor stealth corridor.
  for (let y = 3; y <= 30; y++)
    for (let x = 2; x <= 53; x++) grid[y * W + x] = 2;
  // Ridge breaks the skyline while leaving a generous central passage.
  for (let x = 27; x <= 39; x++)
    for (let y = 4; y <= 7; y++) grid[y * W + x] = 1;
  for (let x = 29; x <= 37; x++)
    for (let y = 28; y <= 30; y++) grid[y * W + x] = 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (!grid[y * W + x]) {
      let nextToFloor = false;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny * W + nx] === 2) nextToFloor = true;
        }
      if (nextToFloor) grid[y * W + x] = 1;
    }
  return { w: W, h: H, grid };
}

export const mission3 = {
  id: 'm3', title: 'RETURN TO THE SURFACE',
  visualTheme: 'surface', ambient: 'daylight', hideStealth: true,
  // Map actor IDs to local, approved 32x56 Sprite Studio compatibility PNGs after review.
  // No licensed/private character art is distributed in the public source.
  actorAssets: {},
  logs: LOGS, evidence: EVIDENCE,
  start: { x: 7.5 * T, y: 20 * T, dir: 'right' },
  buildMap: fieldMap,
  props: [
    { t: 'machine', x: 5, y: 9, w: 4, h: 2, solid: 1 },
    { t: 'machine', x: 12, y: 9, w: 4, h: 2, solid: 1 },
    { t: 'crate', x: 5, y: 25, solid: 1 },
    { t: 'crate', x: 6, y: 25, solid: 1 },
    { t: 'crate', x: 15, y: 13, solid: 1 },
    { t: 'cable', x: 9, y: 10, w: 3 },
    { t: 'cable', x: 8, y: 24, w: 4 },
    { t: 'debris', x: 22, y: 9 },
    { t: 'debris', x: 26, y: 23 },
    { t: 'debris', x: 34, y: 12 },
    { t: 'debris', x: 41, y: 23 },
    { t: 'machine', x: 46, y: 7, w: 4, h: 2, solid: 1 },
    { t: 'machine', x: 48, y: 21, w: 3, h: 2, solid: 1 },
    { t: 'cable', x: 45, y: 13, w: 5 },
  ],
  lamps: [{ x: 5, y: 14 }, { x: 10, y: 14 }, { x: 18, y: 19 }, { x: 47, y: 11 }],
  drones: [], // Safe expedition area: no fake detection HUD, no mandatory stealth.
  entities() {
    return [
      { id: 'outpost', type: 'terminal', tx: 9, ty: 12, solid: true, interact: true },
      { id: 'mira', type: 'npc', role: 'mira', tx: 12, ty: 17, solid: true, interact: true },
      { id: 'nova', type: 'npc', role: 'nova', tx: 15, ty: 23, solid: true, interact: true },
      { id: 'kai', type: 'npc', role: 'kai', tx: 24, ty: 17, solid: true, interact: true },
      { id: 'pad', type: 'pad', tx: 8, ty: 22 },
      { id: 'coupler', type: 'item', tx: 11, ty: 26, interact: true },
      { id: 'ridgeRelay', type: 'terminal', tx: 47, ty: 12, solid: true, interact: true },
      { id: 'return', type: 'exit', tx: 5, ty: 18, h: 2, interact: true },
      { id: 'clueTracks', type: 'clue', kind: 'clue', ev: 'e3_tracks', name: 'OLD TRACKS', tx: 18, ty: 14, hidden: true, interact: true },
      { id: 'clueBoundary', type: 'clue', kind: 'clue', ev: 'e3_marker', name: 'BOUNDARY STAKES', tx: 25, ty: 10, interact: true },
      { id: 'clueCarrier', type: 'clue', kind: 'signal', ev: 'e3_carrier', name: 'RIDGE CARRIER', tx: 43, ty: 15, hidden: true, interact: true },
      { id: 'clueCradle', type: 'clue', kind: 'machine', ev: 'e3_cradle', name: 'RELAY MOUNT', tx: 50, ty: 16, interact: true },
      { id: 'clueSurvey', type: 'clue', kind: 'clue', ev: 'e3_survey', name: 'SURVEY ANNOTATIONS', tx: 29, ty: 23, hidden: true, interact: true },
    ];
  },

  objectives(g) {
    const f = g.flags;
    return [
      { t: STEP[0], done: !!f.briefed },
      { t: STEP[1], done: g.evCount('m3') >= 2 },
      { t: STEP[2], done: !!(f.couplerTaken || f.relay) },
      { t: STEP[3], done: !!f.relay },
      { t: STEP[4], done: !!f.reviewed },
      { t: STEP[5], done: !!f.ended },
    ];
  },
  objective(g) {
    const f = g.flags;
    if (!f.briefed) return 'Speak with Director Mira at the surface survey outpost.';
    if (g.evCount('m3') < 2) return 'Examine surface evidence. SCAN to locate traces.';
    if (!f.couplerTaken) return 'Collect the survey coupler near the supply crates.';
    if (!f.relay) return 'Inspect the ridge carrier and reconnect the field relay.';
    if (!f.reviewed) return 'Review the evidence with Nova at the expedition outpost.';
    return 'Return to Director Mira with your recommendation.';
  },
  onStart(g) {
    g.flags.power = true;
    g.flags.lights = false;
    const m2 = g.store.loadProgress().outcomes?.m2;
    const recordReport = m2
      ? (m2.tookRecord ? 'The resident offered an unlabelled record. I accepted it for your custody review.' : 'I left the unlabelled record with the resident. Consent and provenance remain unresolved.')
      : 'The outcome of the earlier record offer is not retained in this legacy save. I will not invent what happened.';
    g.say([
      { s: 'MIRA', t: 'Wraith, welcome back above ground. Exploration has the perimeter. Sentinel has the security channel. Neither is changing hands.' },
      { s: 'WRAITH', t: 'The resident below is an individual, not a catalog entry. Their origin and the transmitter remain unverified.' },
      { s: 'WRAITH', t: recordReport },
      { s: 'SENTINEL // COMMS', t: 'Report what you saw. Not what the site wants you to believe. I will keep the Watchtower channel clear.' },
      { s: 'MIRA', t: 'Nova is mapping the ridge; Kai is handling field research. Check the surface evidence, then speak with me before anyone crosses a new boundary.' },
    ], () => g.checkpoint(true));
  },
  update() {},
  doorOpen() { return true; },
  onScan() {},
  onEvidence(id, g) {
    if (id === 'e3_carrier') g.say([{ s: 'WRAITH', t: 'Similar waveform. Unknown source. Those are two different facts.' }]);
    if (id === 'e3_tracks') g.say([{ s: 'WRAITH', t: 'The surface record is no cleaner than the one underground. We mark it uncertain.' }]);
  },
  label(e, g) {
    if (e.id === 'mira') return g.flags.reviewed ? 'REPORT TO DIRECTOR MIRA' : 'SPEAK WITH DIRECTOR MIRA';
    if (e.id === 'nova') return 'SPEAK WITH NOVA // CARTOGRAPHY';
    if (e.id === 'kai') return 'SPEAK WITH KAI // FIELD RESEARCH';
    if (e.id === 'outpost') return 'READ EXPEDITION LOG';
    if (e.id === 'coupler') return 'RECOVER SURVEY COUPLER';
    if (e.id === 'ridgeRelay') return 'INSPECT RIDGE RELAY';
    if (e.id === 'return') return 'REVIEW EXTRACTION ROUTE';
    return null;
  },
  interact(e, g) {
    const f = g.flags;
    const say = t => g.say([{ s: 'WRAITH', t }]);
    if (e.id === 'outpost') return g.terminal(LOGS.field.title, LOGS.field.text, () => g.addLog('field'));
    if (e.id === 'return') return say('Extraction is clear. No reason to leave an unfinished field report.');
    if (e.id === 'kai') return g.say([
      { s: 'KAI', t: 'The wind exposed impressions near the old path. I have not assigned them an age. The ridge carrier is measurable, not yet explainable.' },
      { s: 'WRAITH', t: 'I will log both without labeling the maker.' },
    ]);
    if (e.id === 'coupler') {
      if (f.couplerTaken) return;
      e.gone = true;
      f.couplerTaken = true;
      g.inv.surveyCoupler = true;
      g.sfx.pickup();
      g.toast('SURVEY COUPLER RECOVERED — FIELD EQUIPMENT', 3);
      return g.checkpoint(true);
    }
    if (e.id === 'ridgeRelay') {
      return g.terminal(LOGS.relay.title, LOGS.relay.text, () => {
        g.addLog('relay');
        if (!f.briefed) return say('Mira has not authorized the field inspection.');
        if (!g.inv.surveyCoupler) return say('A modern survey coupler is needed. There should be one at the outpost supply crates.');
        if (!g.hasEv('e3_carrier')) return say('I need a scanned sample of the ridge carrier before connecting anything.');
        if (f.relay) return g.toast('RELAY: TELEMETRY VERIFIED. SOURCE STILL UNCONFIRMED.', 3);
        f.relay = true;
        g.inv.surveyCoupler = false;
        g.sfx.power();
        g.say([
          { s: 'SYSTEM', t: 'SURFACE TELEMETRY ONLINE. Carrier sample archived. No descent hardware activated.' },
          { s: 'SENTINEL // COMMS', t: 'Good. A repaired receiver is not permission to open the transmitter. I will preserve the raw trace.' },
        ], () => g.checkpoint(true));
      });
    }
    if (e.id === 'nova') {
      if (!f.briefed) return say('Mira is coordinating the outpost. I should hear the survey brief first.');
      if (g.evCount('m3') < 2) return g.say([{ s: 'NOVA', t: 'Two independent observations first. I will not draw a complete map from one uncertain mark.' }]);
      if (!f.relay) return g.say([{ s: 'NOVA', t: 'The ridge telemetry is still offline. I can annotate our evidence, but I cannot establish its routing.' }]);
      f.reviewed = true;
      return g.say([
        { s: 'NOVA', t: 'The field map is updated. Two verified observations, an unassigned carrier, and explicit unknowns. No guessed population or site history.' },
        { s: 'WRAITH', t: 'Your map says where we can safely go, not who built this place.' },
        { s: 'NOVA', t: 'Exactly. Mira can decide whether to expand the perimeter.' },
      ], () => g.checkpoint(true));
    }
    if (e.id === 'mira') {
      if (!f.briefed) {
        f.briefed = true;
        return g.say([
          { s: 'MIRA', t: 'You are Watchtower support for this survey, Wraith. My people map, sample, and withdraw. No one takes a resident or their records as property.' },
          { s: 'WRAITH', t: 'Understood. I will bring you a documented risk assessment rather than an origin story.' },
        ], () => g.checkpoint(true));
      }
      if (!f.reviewed) return g.say([
        { s: 'MIRA', t: 'Talk to Nova after recording the surface evidence and restoring the ridge telemetry. I want her map, not a hunch.' },
      ]);
      if (f.ended) return g.toast('FIELD REPORT FILED', 2);
      return g.choose('What should Wraith recommend to Mira?', [
        'Hold the existing quarantine perimeter',
        'Expand surface-only, supervised survey',
      ], i => {
        f.recommendation = i === 0 ? 'hold' : 'surface';
        f.ended = true;
        const suggestion = i === 0
          ? 'Hold the perimeter. We cannot establish the age, owner, or origin of these systems.'
          : 'Permit a supervised surface survey. Do not enter or disturb the inhabited vault.';
        g.say([
          { s: 'WRAITH', t: suggestion },
          { s: 'MIRA', t: i === 0
            ? 'Agreed. Exploration maintains the boundary until we have an evidence-based reason to move it.'
            : 'Approved for surface mapping only. No entry below grade, no extraction, and no contact without consent.' },
          { s: 'SENTINEL // COMMS', t: 'Watchtower has the record and the restrictions. Different department. Same objective.' },
          { s: 'WRAITH', t: 'The signal is still a question. At least we are asking it correctly.' },
        ], () => g.finish());
      });
    }
  },
  outcome(g) { return { recommendation: g.flags.recommendation || 'unfiled', source: 'm3-field-report' }; },
  ending(g) {
    return {
      title: 'SURFACE SURVEY: FILED',
      lines: [
        'SURFACE EVIDENCE ......... ' + g.evCount('m3') + ' / 5',
        'RELAY TELEMETRY .......... ' + (g.flags.relay ? 'RESTORED' : 'OFFLINE'),
        'RECOMMENDATION .......... ' + (g.flags.recommendation === 'surface' ? 'SURFACE SURVEY' : 'PERIMETER HOLD'),
        '',
        'FIELD COMMAND ........... EXPLORATION / MIRA',
        'SECURITY OVERSIGHT ...... WATCHTOWER / SENTINEL',
        'FACILITY ORIGIN ......... UNVERIFIED',
        'VAULT RESIDENT .......... NOT CLASSIFIED',
        '',
        'CASE REMAINS OPEN.',
      ],
    };
  },
};
