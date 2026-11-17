// MISSION 06 — THE SEALED REGISTRY
// Ghost Signal expansion candidate — distinct abandoned BUNKER, not the occupied vault.
// Neither the old architecture nor the received signal is assigned an unproven origin.
const T=32,W=64,H=42;
const LOGS={
 order:{title:'FIELD ACCESS // EXPLORATION CLEARANCE',text:'EXPLORATION PERIMETER OPERATIONS\nDIRECTOR MIRA // SERVICE ENTRY 06\n\nACCESS: ABANDONED AUXILIARY SHELTER\nSTATUS: NO CONFIRMED OCCUPANTS\n\nSecure failing airlock manually.\nSurvey the archive without opening any\nlower passages toward the occupied vault.\n\nWATCHTOWER: SECURITY OVERSIGHT ONLY.'},
 pressure:{title:'AIRLOCK SAFETY // DIFFERENTIAL',text:'EXTERNAL PRESSURE .. NORMAL\nINSIDE SUPPLY ...... STAGNANT\nCARTRIDGE SLOT ..... EMPTY\n\nVENT ISOLATOR ...... FAILED\nACCESS DOOR ........ FAIL-CLOSED\n\nRecover a modern filter from the\nwest equipment bay. Scan the damaged\nlock seal before attempting an override.'},
 power:{title:'SERVICE BREAKER // POWER PLAN',text:'ARCHIVE BUS ........ FAIL SAFE\nARCHIVE DOOR ....... POWER LOCKED\nLOWER LINK ........ DISCONNECTED\n\nThe old observation console is\nentirely local to this shelter.\nNo connection is authorized to the\ninhabited record vault.'},
 registry:{title:'THE SEALED REGISTRY // READ-ONLY',text:'LOCAL ARCHIVE HEADER\n\nRECORD COUNTS ......... CONFLICT\nTIMESTAMP LENGTH ...... VARIABLE\nLAST MAINTENANCE ...... UNVERIFIED\nIDENTITY OF AUTHORS .. NOT PRESENT\n\nIndex 01 lists a repair dated after\nthe most recent station blackout.\nThe entry may be corrupted.\nNo proven source accompanies it.'},
 receiver:{title:'SERVICE RECEIVER // EGRESS ROUTE',text:'RECEIVE-ONLY ..... STABLE\nDOWNLINK ......... ISOLATED\nSURFACE RELAY .... M05 ARCHIVED\nSIGNAL ORIGIN .... NOT VERIFIED\n\nChoose one evidence-handling protocol.\nNo outbound interrogation authorized.'}
};
const EVIDENCE={
 e6_seal:{cat:'MACHINERY',title:'Damaged airlock seal',text:'An auxiliary bunker airlock suffered an ordinary mechanical failure. A modern cartridge can bridge the pressure interlock without energizing the lower levels.'},
 e6_bus:{cat:'MACHINERY',title:'Unpowered archive bus',text:'Archive bus status is inconsistent with the damaged shell, but there is no confirmed author for the records stored here.'},
 e6_timestamp:{cat:'CLUE',title:'Conflicting date plate',text:'The scratched service plate does not agree with the local time ledger. Environmental wear prevents confident dating.'},
 e6_witness:{cat:'RECORD',title:'Missing occupant ledger',text:'No verified occupant or victim is listed. The absence of a record cannot establish whether anyone lived here.'},
 e6_carrier:{cat:'SIGNAL',title:'Shelter receiver harmonics',text:'An isolated receiver reports the same unassigned carrier pattern. The bunker supplies no independently verified origin.'},
 e6_filter:{cat:'CLUE',title:'Modernized air filter housing',text:'A repair cartridge sits in a much older mount. Its compatibility proves someone adapted the mechanism, not who built the original shelter.'},
};
function buildMap(){
 const grid=new Uint8Array(W*H);
 const put=(x,y,v)=>{if(x>=0&&x<W&&y>=0&&y<H)grid[y*W+x]=v;};
 // One continuous navigable bunker: six physical rooms, four mechanically gated
 // passageways and a loop route on extraction. No map-change trigger tiles.
 for(let y=5;y<=36;y++)for(let x=4;x<=59;x++)put(x,y,2);
 for(let x=4;x<=59;x++){put(x,5,1);put(x,36,1);}
 for(let y=5;y<=36;y++){put(4,y,1);put(59,y,1);}
 for(let y=6;y<=35;y++) {put(21,y,1);put(41,y,1);}
 put(21,20,2);put(41,19,2);put(41,29,2);
 // West equipment bay, central observation room, and split eastern archive.
 for(let x=5;x<=20;x++)put(x,27,1);
 put(12,27,2);
 for(let x=22;x<=40;x++)put(x,16,1);
 put(31,16,2);
 for(let x=42;x<=58;x++)put(x,27,1);
 put(50,27,2);
 // Broken pillars and channels emphasize constructed rooms and sight-lines.
 for(const [x0,y0,x1,y1] of [
  [14,8,15,11],[7,30,8,32],[25,21,26,22],[35,31,36,33],
  [45,9,46,11],[56,20,57,22],[44,31,45,32],
 ])for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)put(x,y,1);
 return {w:W,h:H,grid};
}
const dialogue=(g,lines,done)=>g.say(lines.map(([s,t])=>({s,t})),done);
export const mission6={
 id:'m6',title:'THE SEALED REGISTRY',visualTheme:'bunker',ambient:'dusk',
 statusLabel:'BUNKER SURVEY',hideStealth:true,weather:'none',
 logs:LOGS,evidence:EVIDENCE,
 start:{x:8.5*T,y:20*T,dir:'right'},buildMap,
 actorAssets:{},
 markers:[
  {x:7,y:21,kind:'extraction'},
  {x:20,y:20,kind:'gate'},
  {x:40,y:19,kind:'gate'},
  {x:50,y:26,kind:'gate'},
  {x:48,y:16,kind:'relay'},
 ],
 props:[
  {t:'machine',x:8,y:8,w:4,h:2,solid:1},{t:'rack',x:11,y:10,w:1,h:3,solid:1},
  {t:'machine',x:16,y:31,w:3,h:2,solid:1},
  {t:'crate',x:17,y:13,solid:1},{t:'crate',x:18,y:13,solid:1},
  {t:'debris',x:15,y:22},{t:'cable',x:20,y:22,w:3},
  {t:'machine',x:29,y:8,w:4,h:2,solid:1},
  {t:'rack',x:37,y:10,w:1,h:3,solid:1},
  {t:'machine',x:32,y:25,w:3,h:2,solid:1},
  {t:'debris',x:29,y:21},{t:'cable',x:36,y:18,w:4},
  {t:'machine',x:47,y:10,w:4,h:2,solid:1},
  {t:'rack',x:55,y:14,w:1,h:3,solid:1},
  {t:'machine',x:52,y:33,w:4,h:2,solid:1},
  {t:'debris',x:47,y:23},{t:'cable',x:45,y:30,w:4},
 ],
 lamps:[
  {x:10,y:16},{x:19,y:20},{x:14,y:31},
  {x:31,y:12},{x:34,y:20},{x:38,y:32},
  {x:48,y:18},{x:53,y:24},{x:52,y:32},
 ],drones:[],
 entities(){
  return [
   {id:'entrance',type:'exit',tx:6,ty:21,w:1,h:2,interact:true},
   {id:'order',type:'terminal',tx:10,ty:17,interact:true,solid:true},
   {id:'filter',type:'item',tx:12,ty:31,interact:true},
   {id:'seal',type:'clue',kind:'machine',ev:'e6_seal',name:'AIRLOCK SEAL',tx:18,ty:19,interact:true},
   {id:'airlockControl',type:'terminal',tx:18,ty:22,interact:true,solid:true},
   {id:'airlockDoor',type:'door',tx:21,ty:20,interact:false},
   {id:'pressureJet',type:'jet',tx:29,ty:21,ph:1.2},
   {id:'bus',type:'clue',kind:'machine',ev:'e6_bus',name:'ARCHIVE POWER BUS',tx:33,ty:20,interact:true},
   {id:'breaker',type:'terminal',tx:37,ty:23,interact:true,solid:true},
   {id:'observatoryDoor',type:'door',tx:31,ty:16,interact:false},
   {id:'datePlate',type:'clue',kind:'clue',ev:'e6_timestamp',name:'UNMATCHED DATE PLATE',tx:28,ty:12,interact:true},
   {id:'shelf',type:'clue',kind:'clue',ev:'e6_filter',name:'FILTER HOUSING',tx:35,ty:13,interact:true},
   {id:'archiveDoor',type:'door',tx:41,ty:19,interact:false},
   {id:'registry',type:'terminal',tx:51,ty:16,interact:true,solid:true},
   {id:'witness',type:'clue',kind:'signal',ev:'e6_witness',name:'OCCUPANT REGISTER',tx:53,ty:21,hidden:true,interact:true},
   {id:'lowerDoor',type:'door',tx:50,ty:27,interact:false},
   {id:'returnDoor',type:'door',tx:41,ty:29,interact:false},
   {id:'receiver',type:'terminal',tx:54,ty:31,interact:true,solid:true},
   {id:'carrier',type:'clue',kind:'signal',ev:'e6_carrier',name:'UNASSIGNED CARRIER',tx:53,ty:29,hidden:true,interact:true},
   {id:'arcA',type:'jet',tx:47,ty:30,ph:0},
   {id:'arcB',type:'jet',tx:49,ty:31,ph:1.3},
   {id:'pad',type:'pad',tx:10,ty:23},
  ];
 },
 onStart(g){
  g.flags.lights=false;g.flags.power=false;
  const m5=g.store?.loadProgress?.().outcomes?.m5;
  dialogue(g,[
   ['MIRA','Wraith, an auxiliary shelter on our surface route is still sealed. It is a separate structure. We are NOT reopening the inhabited record vault.'],
   ['WRAITH',m5?.extracted?'The relay repair held. We can survey this shelter without transmitting to the lower system.':'I only have surface-level access orders. I will not assume a previous relay operation succeeded.'],
   ['SENTINEL // COMMS','Watchtower has confirmed a failing pressure lock and isolated power bus. I will monitor the safety line; Mira has operational command.'],
   ['MIRA','Bring back verifiable records. If the clocks disagree, record the disagreement. Do not invent an origin for it.']
  ],()=>g.checkpoint(true));
 },
 update(){},
 doorOpen(id,g){
  return id==='airlockDoor'?!!g.flags.airlock:
   id==='observatoryDoor'?!!g.flags.powerRouted:
   id==='archiveDoor'?!!g.flags.powerRouted:
   id==='lowerDoor'||id==='returnDoor'?!!g.flags.registerRead:false;
 },
 hazardsEnabled(g){return !!g.flags.registerRead;},
 label(e,g){
  const f=g.flags;
  if(e.id==='entrance')return f.completed?'EXIT SHELTER':'RETURN TO SURFACE';
  if(e.id==='order')return 'READ SHELTER ACCESS ORDER';
  if(e.id==='filter')return f.filter?'FILTER COLLECTED':'RECOVER PRESSURE FILTER';
  if(e.id==='airlockControl')return f.airlock?'INSPECT AIRLOCK SAFETY':'REPAIR PRESSURE INTERLOCK / OPEN DOOR';
  if(e.id==='breaker')return f.powerRouted?'READ POWER ISOLATION':'RESTORE LOCAL ARCHIVE POWER';
  if(e.id==='registry')return f.registerRead?'REREAD UNVERIFIED REGISTRY':'READ SEPARATE SHELTER REGISTRY';
  if(e.id==='receiver')return f.captured?'REVIEW RECEIVER STATUS':'ARCHIVE RECEIVE-ONLY HARMONICS';
  return null;
 },
 objective(g){
  const f=g.flags;
  if(!f.authorized)return 'READ the SURFACE SHELTER ORDER at the west field terminal.';
  if(!f.filter)return 'RECOVER the PRESSURE FILTER in the south-west supply bay.';
  if(!f.airlock)return 'SCAN the DAMAGED SEAL, then operate the pressure interlock.';
  if(!f.powerRouted)return 'SCAN the POWER BUS and isolate the local ARCHIVE BREAKER.';
  if(!f.registerRead)return 'CROSS the physical archive door and READ the sealed registry.';
  if(!f.captured)return 'DESCEND THROUGH THE LOWER DOOR; SCAN the receiver and archive its carrier.';
  return 'RETURN THROUGH THE LOWER SERVICE PASSAGE to the WEST EXTRACTION HATCH.';
 },
 objectives(g){const f=g.flags;return [
  {t:'Review Mira’s access order',done:!!f.authorized},
  {t:'Recover a compatible filter',done:!!f.filter},
  {t:'Repair airlock and physically enter central service hall',done:!!f.airlock},
  {t:'Isolate and restore local archive circuit',done:!!f.powerRouted},
  {t:'Inspect the unverified registry',done:!!f.registerRead},
  {t:'Secure receive-only signal evidence',done:!!f.captured},
  {t:'Leave the bunker via the west hatch',done:!!f.completed},
 ];},
 onEvidence(id,g){
  if(id==='e6_timestamp')dialogue(g,[['WRAITH','The dates disagree. That is the finding; there is not enough evidence to assign a builder.']]);
  if(id==='e6_carrier')g.toast('CARRIER LOGGED — SOURCE UNCONFIRMED',2.6);
 },
 onScan(){},
 interact(e,g){
  const f=g.flags,say=t=>dialogue(g,[['WRAITH',t]]);
  if(e.id==='order')return g.terminal(LOGS.order.title,LOGS.order.text,()=>{
   g.addLog('order');f.authorized=true;g.checkpoint(true);
  });
  if(e.id==='filter'){
   if(f.filter)return;f.filter=true;g.inv.pressureFilter=true;
   e.gone=true;g.sfx.pickup();g.toast('PRESSURE CARTRIDGE RECOVERED',2.5);g.checkpoint(true);return;
  }
  if(e.id==='airlockControl')return g.terminal(LOGS.pressure.title,LOGS.pressure.text,()=>{
   g.addLog('pressure');
   if(!f.authorized)return say('The service order must be read before opening an abandoned structure.');
   if(!g.inv.pressureFilter)return say('A compatible pressure filter is needed. Check the west equipment bay.');
   if(!g.hasEv('e6_seal'))return say('I need to SCAN and document the damaged seal before opening the airlock.');
   if(f.airlock)return g.toast('PRESSURE LOCK NORMAL. INNER DOOR OPEN.',2);
   f.airlock=true;g.inv.pressureFilter=false;g.sfx.power();
   return dialogue(g,[
    ['SYSTEM','PRESSURE EQUALIZED. PHYSICAL AIRLOCK RELEASED. INTERIOR SERVICE BUS REMAINS ISOLATED.'],
    ['SENTINEL // COMMS','Physical seal cleared. No downstream power detected. Safe to enter central service hall.']
   ],()=>g.checkpoint(true));
  });
  if(e.id==='breaker')return g.terminal(LOGS.power.title,LOGS.power.text,()=>{
   g.addLog('power');
   if(!f.airlock)return say('The airlock remains closed.');
   if(!g.hasEv('e6_bus'))return say('I will not energize a damaged bus until it has been SCANNED.');
   if(f.powerRouted)return g.toast('ARCHIVE CIRCUIT LOCAL ONLY — NO LOWER LINK.',2);
   f.powerRouted=true;f.lights=true;f.power=true;g.sfx.power();
   return dialogue(g,[
    ['SYSTEM','OBSERVATORY DOOR RELEASED. ARCHIVE DOOR RELEASED. LOWER CONDUIT STILL ISOLATED.'],
    ['MIRA','You can read the archive. Keep both exits marked; the lower service passage is still closed.']
   ],()=>g.checkpoint(true));
  });
  if(e.id==='registry')return g.terminal(LOGS.registry.title,LOGS.registry.text,()=>{
   g.addLog('registry');
   if(!f.powerRouted)return say('The archive bus is offline.');
   if(f.registerRead)return say('A date mismatch is evidence. It is not an explanation.');
   f.registerRead=true;g.sfx.door();
   return dialogue(g,[
    ['WRAITH','The index contains maintenance entries with dates I cannot reconcile. This does not tell us who made them.'],
    ['SENTINEL // COMMS','Archive entries retained as unverified. I can now monitor the lower service passage.'],
    ['SYSTEM','LOWER SERVICE PASSAGE RELEASED. RECEIVER REMAINS RECEIVE-ONLY.']
   ],()=>g.checkpoint(true));
  });
  if(e.id==='receiver')return g.terminal(LOGS.receiver.title,LOGS.receiver.text,()=>{
   g.addLog('receiver');
   if(!f.registerRead)return say('The lower passage is still secured.');
   if(!g.hasEv('e6_carrier'))return say('The aerial sample is concealed behind interference. SCAN and log the receiver first.');
   if(f.captured)return g.toast('SHELTER CARRIER SEALED. DOWNLINK OFF.',2);
   return g.choose('How should Wraith preserve the shelter signal?',[
    'File bounded surface telemetry',
    'Seal the unprocessed local sample for Watchtower review'
   ],i=>{
    f.captured=true;f.archive=i===0?'bounded':'sealed-raw';g.sfx.pickup();
    return dialogue(g,[
     ['WRAITH',i===0?'Only the safe route telemetry leaves this shelter.':'The raw sample stays sealed. It will not be used to assign an identity.'],
     ['MIRA','Exploration now has the navigation data. Withdraw through the lower corridor while its vents are active.'],
     ['SENTINEL // COMMS','The second physical door leads west into the service hall. Use it; the registry stays untouched.']
    ],()=>g.checkpoint(true));
   });
  });
  if(e.id==='entrance'){
   if(!f.captured)return say('The survey order is still open. The bunker record has not been secured.');
   f.completed=true;
   return dialogue(g,[
    ['WRAITH','The shelter archive is preserved, not interpreted. No lower-vault contact was attempted.'],
    ['MIRA','That is the correct field report. Exploration will mark this bunker for controlled study.'],
    ['SENTINEL // COMMS','Watchtower record updated: sealed provenance, safe exit confirmed. Different department. Same objective.']
   ],()=>g.finish());
  }
 },
 outcome(g){return {archive:g.flags.archive||'none',completed:!!g.flags.completed,
  poweredArchiveOnly:!!g.flags.powerRouted,unknownOrigin:true,entry:'physical-doors'};},
 ending(g){return {title:'THE SEALED REGISTRY: WITHDRAWN',lines:[
  'AIRLOCK ................. SERVICEABLE',
  'ARCHIVE CIRCUIT ........ ISOLATED / LOCAL',
  'REGISTRY ................ READ-ONLY',
  'RAW CARRIER ............. '+(g.flags.archive==='sealed-raw'?'SEALED FOR REVIEW':'BOUNDED REPORT'),
  'EVIDENCE ................ '+g.evCount('m6')+' / 6',
  'SERVICE DOORS ........... PHYSICALLY TRAVERSED',
  'OCCUPANT STATUS ......... UNCONFIRMED',
  'AUTHORSHIP .............. UNKNOWN',
  'LOWER VAULT ............. NOT CONTACTED',
  '',
  'THE CASE REMAINS OPEN.'
 ]};}
};
