// MISSION 05 — THE BROKEN RELAY (standalone Ghost Signal expansion).
// STORY STATUS: review candidate, not approved source-canon. Unknown transmitter and vault origin stay unknown.
// Watchtower supplies technical security. Exploration keeps the surface survey command.
const T=32, W=64, H=38;
const LOGS={
  order:{title:'RELAY SERVICE ORDER // EXPLORATION',text:'DIRECTOR MIRA // SURFACE FACILITIES\n\nWork on the storm-damaged uplink only.\nDo not energize subterranean routes.\n\nWATCHTOWER: SECURITY SUPPORT\nEXPLORATION: OPERATIONAL CONTROL\n\nNo authorization to open the vault.'},
  faults:{title:'DISTRIBUTION PANEL // SAFETY STATUS',text:'FIELD BUS 02 ... GROUNDED\nTRANSIT GATE ... LOCKED / FAIL CLOSED\nSURGE BLEED ... DAMAGED\n\nUse a modern insulating coupler.\nConfirm the cracked junction by scan.\nKeep the old understructure isolated.'},
  signal:{title:'RIDGE UPLINK // RECEIVE-ONLY',text:'RECEIVER ... SERVICE-READY\nCARRIER ... UNASSIGNED\nSOURCE ... NOT ESTABLISHED\nPROVENANCE ... NOT ESTABLISHED\n\nTwo archive settings available:\n- bounded telemetry for rescue navigation\n- sealed raw capture for later review\n\nNeither setting transmits into the vault.'}
};
const EVIDENCE={
  e5_fault:{cat:'MACHINERY',title:'Arc-damaged service junction',
    text:'A modern junction has lost insulation. The cross-field gate is wired to fail closed until the feeder is isolated. The lower system is physically disconnected.'},
  e5_plate:{cat:'CLUE',title:'Service gate identity plate',
    text:'A recent Exploration service door was mounted across older foundations. Its serial belongs to the survey work, not the unverified site below.'},
  e5_carrier:{cat:'SIGNAL',title:'Unassigned carrier harmonics',
    text:'The receiving aerial records a repeating signal, but neither its origin nor its source identity can be authenticated from these samples.'},
  e5_scorch:{cat:'CLUE',title:'Discharge marks on the walk',
    text:'The eastern service walk is exposed to timed electrical bleed. Returning during a surge requires a measured route, not an enemy encounter.'},
  e5_routing:{cat:'MACHINERY',title:'Isolated lower feeder',
    text:'The lower conduit remains disconnected at the manual breaker. Restoring the surface uplink must not energize the inhabited vault.'}
};
function buildMap(){
 const grid=new Uint8Array(W*H);
 for(let y=4;y<=34;y++)for(let x=3;x<=60;x++)grid[y*W+x]=2;
 // Two distinct surface areas separated by genuine impassable terrain.
 // Only a single mechanical sliding gate at (31,18) links the areas.
 for(let y=4;y<=34;y++)grid[y*W+31]=1;
 grid[18*W+31]=2;
 // Weathered retaining walls create intentional navigable channels, not a bare floor.
 for(let y=6;y<=13;y++)for(let x=20;x<=23;x++)grid[y*W+x]=1;
 for(let y=24;y<=31;y++)for(let x=23;x<=26;x++)grid[y*W+x]=1;
 for(let x=37;x<=48;x++)grid[8*W+x]=1;
 for(let x=36;x<=43;x++)grid[30*W+x]=1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(grid[y*W+x]===0){
  let near=false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy;
   if(nx>=0&&nx<W&&ny>=0&&ny<H&&grid[ny*W+nx]===2)near=true;
  }
  if(near)grid[y*W+x]=1;
 }
 // Operational power building -> narrow gate -> protected exterior
 // utility passage -> receiver room. Every structure has a walked opening.
 const wall=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
  if(grid[y*W+x]===2)grid[y*W+x]=1;};
 wall(5,9,30,9);wall(4,10,4,16);wall(4,24,4,28);
 wall(5,28,30,28);wall(30,10,30,15);wall(30,22,30,28);
 wall(20,10,20,15);wall(20,23,20,27); // west workshop partition
 wall(34,12,49,12);wall(34,24,49,24);
 wall(33,13,33,16);wall(33,22,33,23);
 wall(50,13,50,16);wall(50,22,50,23);
 wall(51,9,60,9);wall(51,26,60,26);
 wall(50,10,50,12);wall(50,24,50,26); // receiver dock opens to central roadway
 return {w:W,h:H,grid};
}
export const mission5={
 id:'m5',title:'THE BROKEN RELAY',next:'m6',visualTheme:'storm',ambient:'dusk',
 weather:'electrical',hideStealth:true,statusLabel:'RELAY SERVICE',
 logs:LOGS,evidence:EVIDENCE,
 start:{x:7.5*T,y:19*T,dir:'right'},
 buildMap,
 actorAssets:{},
 markers:[{x:7,y:20,kind:'extraction'},{x:30,y:19,kind:'gate'},{x:54,y:16,kind:'relay'}],
 props:[
  {t:'machine',x:8,y:10,w:4,h:2,solid:1},
  {t:'rack',x:12,y:10,w:1,h:3,solid:1},
  {t:'crate',x:17,y:25,solid:1},
  {t:'crate',x:18,y:25,solid:1},
  {t:'debris',x:15,y:15},{t:'debris',x:26,y:14},
  {t:'cable',x:25,y:18,w:4},
  {t:'machine',x:27,y:24,w:3,h:2,solid:1},
  {t:'machine',x:36,y:11,w:4,h:2,solid:1},
  {t:'rack',x:44,y:15,w:1,h:2,solid:1},
  {t:'debris',x:40,y:23},{t:'debris',x:46,y:26},
  {t:'machine',x:53,y:10,w:4,h:2,solid:1},
  {t:'cable',x:49,y:13,w:4},
  {t:'debris',x:57,y:26}
 ],
 lamps:[{x:10,y:16},{x:26,y:20},{x:35,y:18},{x:49,y:20},{x:57,y:16}],
 drones:[],
 entities(){
  return [
   {id:'order',type:'terminal',tx:11,ty:14,solid:true,interact:true},
   {id:'extraction',type:'exit',tx:5,ty:20,h:2,interact:true},
   {id:'isolationKit',type:'item',tx:16,ty:27,interact:true},
   {id:'breaker',type:'terminal',tx:28,ty:19,solid:true,interact:true},
   {id:'fieldGate',type:'door',tx:31,ty:18,w:1,h:1,interact:false},
   {id:'uplink',type:'terminal',tx:55,ty:15,solid:true,interact:true},
   {id:'pad',type:'pad',tx:10,ty:27},
   {id:'arcA',type:'jet',tx:40,ty:18,ph:0},
   {id:'arcB',type:'jet',tx:43,ty:19,ph:1.4},
   {id:'arcC',type:'jet',tx:47,ty:18,ph:2.2},
   {id:'fault',type:'clue',kind:'machine',ev:'e5_fault',name:'DAMAGED SURFACE JUNCTION',tx:26,ty:17,interact:true},
   {id:'plate',type:'clue',kind:'clue',ev:'e5_plate',name:'SERVICE GATE PLATE',tx:30,ty:16,interact:true},
   {id:'carrier',type:'clue',kind:'signal',ev:'e5_carrier',name:'UNASSIGNED UPLINK CARRIER',tx:50,ty:16,hidden:true,interact:true},
   {id:'scorch',type:'clue',kind:'clue',ev:'e5_scorch',name:'DISCHARGE MARKS',tx:44,ty:23,hidden:true,interact:true},
   {id:'routing',type:'clue',kind:'machine',ev:'e5_routing',name:'ISOLATED LOWER FEED',tx:36,ty:22,interact:true}
  ];
 },
 objectives(g){
  const f=g.flags;
  return [
   {t:'Review Mira’s surface service order',done:!!f.authorized},
   {t:'Recover a modern insulating coupler',done:!!(f.kit||f.isolated)},
   {t:'Scan the fault and isolate the field bus',done:!!f.isolated},
   {t:'Cross the sliding gate and record the carrier',done:g.hasEv('e5_carrier')},
   {t:'Restore receive-only relay telemetry',done:!!f.calibrated},
   {t:'Return to west extraction through the surge corridor',done:!!f.extracted}
  ];
 },
 objective(g){
  const f=g.flags;
  if(!f.authorized)return 'READ THE SURFACE SERVICE ORDER at the western field console.';
  if(!f.kit)return 'RECOVER an insulating coupler at the west supply cache.';
  if(!f.isolated)return 'SCAN the damaged junction; isolate the field bus to open the sliding gate.';
  if(!g.hasEv('e5_carrier'))return 'CROSS THE GATE and SCAN the carrier near the eastern uplink.';
  if(!f.calibrated)return 'CONFIGURE the receive-only relay. Preserve the unresolved source.';
  return 'SURGE ACTIVE. Reach the WEST EXTRACTION HATCH.';
 },
 onStart(g){
  g.flags.power=true;g.flags.lights=false;
  const last=g.store?.loadProgress?.().outcomes?.m4;
  g.say([
   {s:'MIRA',t:'Wraith, Exploration owns this repair site. The last search proved the surface uplink cannot be trusted in a storm. You are authorized to fix the receiver, nothing beneath it.'},
   {s:'WRAITH',t:last?.extracted?'The missing surveyor is safe. We need a reliable return channel before anyone goes back into the field.':'This operation is limited to the surface field bus. We are not assuming the outcome of an unrecorded rescue.'},
   {s:'SENTINEL // COMMS',t:'Watchtower is monitoring the discharge pattern. That service gate should stay closed until the damaged feeder is isolated.'},
   {s:'MIRA',t:'Use a modern coupler. Inspect the break. Record exactly what the carrier says—and what it does not.'}
  ],()=>g.checkpoint(true));
 },
 update(){},
 doorOpen(id,g){return id==='fieldGate'&&!!g.flags.isolated;},
 hazardsEnabled(g){return !!g.flags.calibrated;},
 onScan(){},
 onEvidence(id,g){
  if(id==='e5_carrier')g.say([{s:'WRAITH',t:'Carrier confirmed. Nothing about these readings identifies a sender or a builder.'}]);
 },
 label(e,g){
  const f=g.flags;
  if(e.id==='order')return 'READ EXPLORATION WORK ORDER';
  if(e.id==='extraction')return f.calibrated?'EVACUATE THROUGH HATCH':'CHECK EXTRACTION HATCH';
  if(e.id==='isolationKit')return 'RECOVER INSULATING COUPLER';
  if(e.id==='breaker')return f.isolated?'CHECK ISOLATED BREAKER':'ISOLATE FIELD BUS / RELEASE GATE';
  if(e.id==='uplink')return f.calibrated?'REVIEW RELAY TELEMETRY':'CONFIGURE RECEIVE-ONLY UPLINK';
  return null;
 },
 interact(e,g){
  const f=g.flags;
  const say=t=>g.say([{s:'WRAITH',t}]);
  if(e.id==='order')return g.terminal(LOGS.order.title,LOGS.order.text,()=>{
   g.addLog('order');if(!f.authorized){f.authorized=true;g.checkpoint(true);}
  });
  if(e.id==='isolationKit'){
   if(f.kit)return;
   f.kit=true;g.inv.isolator=true;e.gone=true;g.sfx.pickup();
   g.toast('MODERN INSULATING COUPLER RECOVERED',3);
   return g.checkpoint(true);
  }
  if(e.id==='breaker')return g.terminal(LOGS.faults.title,LOGS.faults.text,()=>{
   g.addLog('faults');
   if(!f.authorized)return say('This work needs Mira’s authorization.');
   if(!g.inv.isolator)return say('An insulating coupler is missing. Check the west supply cache.');
   if(!g.hasEv('e5_fault'))return say('The junction is damaged. I need to SCAN it before touching the breaker.');
   if(f.isolated)return g.toast('FIELD BUS ISOLATED. SLIDING GATE RELEASED.',2);
   g.inv.isolator=false;f.isolated=true;g.sfx.power();
   return g.say([
    {s:'SYSTEM',t:'SURFACE BUS ISOLATED. SERVICE GATE RELEASED. LOWER FEED REMAINS OFFLINE.'},
    {s:'SENTINEL // COMMS',t:'I see the gate releasing. Physical interlock confirmed. Continue to the receiver; do not route power below.'}
   ],()=>g.checkpoint(true));
  });
  if(e.id==='uplink')return g.terminal(LOGS.signal.title,LOGS.signal.text,()=>{
   g.addLog('signal');
   if(!f.isolated)return say('The east gate is locked. Secure the surface feeder first.');
   if(!g.hasEv('e5_carrier'))return say('I will not calibrate against an unverified carrier. SCAN the aerial sample first.');
   if(f.calibrated)return g.toast('RECEIVE-ONLY UPLINK ONLINE. SOURCE UNKNOWN.',2);
   return g.choose('How should Wraith archive the carrier?',[
    'Transmit bounded telemetry only',
    'Seal the raw sample for later Watchtower review',
   ],i=>{
    f.channel=i===0?'bounded':'sealed-raw';f.calibrated=true;g.flags.lights=true;
    g.sfx.power();
    g.say([
     {s:'SYSTEM',t:'RECEIVER ONLINE. LOWER CONDUIT STILL ISOLATED. SURGE BLEED DETECTED ON SERVICE WALK.'},
     {s:'SENTINEL // COMMS',t:'An electrical discharge is moving across the walk. Keep the scanner ready; read the vents and return along the west route.'},
     {s:'WRAITH',t:i===0?'Bounded telemetry only. No raw carrier retransmission.':'Raw carrier sealed for Watchtower analysis. This is evidence, not proof of identity.'}
    ],()=>g.checkpoint(true));
   });
  });
  if(e.id==='extraction'){
   if(!f.calibrated)return say('The service order remains open. We need receive-only telemetry restored before withdrawing.');
   if(f.extracted)return g.toast('EXTRACTION CONFIRMED',2);
   f.extracted=true;
   return g.say([
    {s:'WRAITH',t:'Surface relay restored. All new traffic stays outside the vault. No contact attempted.'},
    {s:'MIRA',t:'Exploration has the working telemetry. Good. The next survey can proceed with a safe withdrawal route.'},
    {s:'SENTINEL // COMMS',t:'Unassigned signal retained as unassigned. Different department. Same objective.'}
   ],()=>g.finish());
  }
 },
 outcome(g){return {channel:g.flags.channel||'none',surfaceOnly:!!g.flags.isolated,extracted:!!g.flags.extracted};},
 ending(g){return {title:'THE BROKEN RELAY: SECURED',lines:[
  'SERVICE GATE ............ RELEASED',
  'RECEIVER ................ '+(g.flags.calibrated?'ONLINE':'OFFLINE'),
  'FIELD REPORT ............ '+(g.flags.channel==='sealed-raw'?'SEALED RAW CAPTURE':'BOUNDED TELEMETRY'),
  'SURGE CROSSING .......... COMPLETE',
  'EVIDENCE LOGGED ......... '+g.evCount('m5')+' / 5',
  '',
  'OPERATIONAL COMMAND ..... EXPLORATION / MIRA',
  'SECURITY OVERSIGHT ...... WATCHTOWER / SENTINEL',
  'LOWER VAULT ............. NOT ENERGIZED',
  'CARRIER ORIGIN .......... UNCONFIRMED',
  '',
  'INVESTIGATION CONTINUES.'
 ]};}
};
