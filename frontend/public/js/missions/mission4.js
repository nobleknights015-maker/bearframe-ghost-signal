// MISSION 04 — THE MISSING SURVEY
// Distinct search/rescue chapter. Events are Ghost Signal expansion fiction pending owner canon review.
// Exploration (Mira) directs rescue operations; Watchtower (Sentinel) coordinates security support.
const T=32, W=62, H=36;
const LOGS={
  beacon:{title:'DISTRESS PING // FIELD BEACON',text:'EXPEDITION RECOVERY SIGNAL\nTRANSMITTER ......... SURVEY TEAM 4\nLATEST REPEAT ....... PARTIAL\nSTATUS .............. NO REPLY\n\nTwo position packets disagree.\nNeither is sufficient to locate an operator.'},
  panel:{title:'TRANSIT DISTRIBUTION PANEL',text:'TRANSIT SPINE / SERVICE BUS\n\nCIRCUIT A ...... REGULATOR\nCIRCUIT B ...... EMERGENCY LAMPS\nLOAD: .......... INCOMPLETE\n\nThe emergency rail can be bridged\nwith a replacement cell only after\nthe cracked feed line is surveyed.'},
};
const EVIDENCE={
  e4_tracks:{cat:'CLUE',title:'Surveyor tracks by the ridge',text:'Two recent field treads cross the old basalt route. One turns toward the transit bay. Nothing identifies the facility builders.'},
  e4_cable:{cat:'MACHINERY',title:'Cracked service feed',text:'The low-voltage emergency feed is cracked near a relay pedestal. A modern regulator cell can isolate the fault without energizing the old lower vault.'},
  e4_beacon:{cat:'SIGNAL',title:'Distress ping triangulation',text:'The surface receiver confirms a live, low-power expedition beacon. Its arrival angles favor the collapsed east bay. This is not a voiceprint or proof of the unknown vault transmitter.'},
  e4_rubble:{cat:'CLUE',title:'Damaged load-bearing braces',text:'The transit bay braces can support a careful escorted return if the emergency lamps are restored and the survivor is able to walk. The alternative is a faster emergency carry.'},
  e4_medkit:{cat:'CLUE',title:'Discarded medical pouch',text:'A recent Exploration Department field pouch. Its use indicates the missing operator attempted self-care, not that they have already been recovered.'},
};
const OBJECTIVES=[
 'Read the missing team beacon',
 'Locate two independent traces',
 'Recover a field regulator cell',
 'Re-energize the emergency lighting',
 'Locate and assess the stranded surveyor',
 'Escort the survivor to the extraction point',
];
function map(){
 const grid=new Uint8Array(W*H);
 for(let y=4;y<=32;y++)for(let x=3;x<=58;x++)grid[y*W+x]=2;
 // Broken transit ridge: separate open corridors with connecting passages.
 for(let x=23;x<=40;x++)for(let y=8;y<=10;y++)grid[y*W+x]=1;
 for(let x=28;x<=39;x++)for(let y=27;y<=31;y++)grid[y*W+x]=1;
 for(let x=40;x<=43;x++)for(let y=23;y<=27;y++)grid[y*W+x]=1;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!grid[y*W+x]){
  let edge=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,ny=y+dy;
   if(nx>=0&&ny>=0&&nx<W&&ny<H&&grid[ny*W+nx]===2)edge=true;
  }
  if(edge)grid[y*W+x]=1;
 }
 return {w:W,h:H,grid};
}
export const mission4={
 id:'m4',title:'THE MISSING SURVEY',visualTheme:'ruins',ambient:'dusk',hideStealth:true,
 actorAssets:{survivor:{src:'assets/characters/gs_survivor_exp_draft.png'}},
 logs:LOGS,evidence:EVIDENCE,
 start:{x:7.5*T,y:19*T,dir:'right'},
 buildMap:map,
 props:[
  {t:'machine',x:6,y:8,w:4,h:2,solid:1},
  {t:'machine',x:12,y:8,w:3,h:2,solid:1},
  {t:'crate',x:11,y:25,solid:1},
  {t:'crate',x:14,y:25,solid:1},
  {t:'debris',x:17,y:16},{t:'debris',x:25,y:13},{t:'debris',x:35,y:18},
  {t:'cable',x:19,y:14,w:5},{t:'cable',x:36,y:15,w:5},
  {t:'machine',x:37,y:9,w:3,h:2,solid:1},
  {t:'rack',x:46,y:10,w:1,h:3,solid:1},
  {t:'debris',x:44,y:22},{t:'debris',x:52,y:25},
  {t:'machine',x:53,y:11,w:3,h:2,solid:1},
  {t:'crate',x:50,y:27,solid:1}
 ],
 lamps:[{x:11,y:13},{x:22,y:17},{x:38,y:16},{x:52,y:19}],
 drones:[],
 entities(){
  return [
   {id:'exit',type:'exit',tx:6,ty:18,h:2,interact:true},
   {id:'station',type:'terminal',tx:10,ty:13,solid:true,interact:true},
   {id:'beacon',type:'terminal',tx:15,ty:21,solid:true,interact:true},
   {id:'cell',type:'item',tx:12,ty:27,interact:true},
   {id:'rail',type:'terminal',tx:39,ty:12,solid:true,interact:true},
   {id:'survivor',type:'npc',role:'surveyor',tx:50,ty:20,interact:true},
   {id:'tracks',type:'clue',kind:'clue',ev:'e4_tracks',name:'RIDGE TRACKS',tx:22,ty:12,hidden:true,interact:true},
   {id:'cable',type:'clue',kind:'machine',ev:'e4_cable',name:'FEED LINE',tx:34,ty:16,interact:true},
   {id:'ping',type:'clue',kind:'signal',ev:'e4_beacon',name:'BEACON TRACE',tx:29,ty:18,hidden:true,interact:true},
   {id:'rubble',type:'clue',kind:'clue',ev:'e4_rubble',name:'BAY BRACING',tx:45,ty:24,hidden:true,interact:true},
   {id:'medkit',type:'clue',kind:'clue',ev:'e4_medkit',name:'MEDICAL POUCH',tx:54,ty:22,interact:true},
   {id:'pad',type:'pad',tx:8,ty:23},
   {id:'jet1',type:'jet',tx:32,ty:20,ph:0},
   {id:'jet2',type:'jet',tx:33,ty:20,ph:1.9},
  ];
 },
 objectives(g){
  const f=g.flags;
  return [
   {t:OBJECTIVES[0],done:!!f.beacon},
   {t:OBJECTIVES[1],done:g.evCount('m4')>=2},
   {t:OBJECTIVES[2],done:!!(f.cellRecovered||f.rail)},
   {t:OBJECTIVES[3],done:!!f.rail},
   {t:OBJECTIVES[4],done:!!f.escorting||!!f.extracted},
   {t:OBJECTIVES[5],done:!!f.extracted},
  ];
 },
 objective(g){
  const f=g.flags;
  if(!f.beacon)return 'Access the missing survey team beacon at the field camp.';
  if(g.evCount('m4')<2)return 'SCAN the approach for evidence from Survey Team 4.';
  if(!f.cellRecovered)return 'Recover a regulator cell from the expedition supply cache.';
  if(!f.rail)return 'Scan the service feed, then restore the emergency rail.';
  if(!f.escorting)return 'Search the east transit bay. Check the missing surveyor.';
  return 'Escort the recovered surveyor back to the west extraction point.';
 },
 onStart(g){
  g.flags.power=true;g.flags.lights=false;
  const reco=g.store?.loadProgress?.().outcomes?.m3?.recommendation;
  g.say([
   {s:'MIRA',t:'A surveyor missed the extraction window. Emergency search authorization only. Do not open any ancient vaults or change our site boundaries.'},
   {s:'SENTINEL // COMMS',t:'I have eyes on the perimeter. Exploration has the search. Wraith, stay on the mapped surface route and preserve evidence.'},
   {s:'WRAITH',t:reco==='hold'
     ? 'We recommended holding the boundary. A search for our missing operator is not permission to start excavating.'
     : 'The supervised surface route is open. No step beyond it without evidence and Mira\'s approval.'},
   {s:'MIRA',t:'Start with the beacon. We need two independent observations before we call any position confirmed.'},
  ],()=>g.checkpoint(true));
 },
 update(g,dt){
  if(!g.flags.escorting||g.flags.extracted)return;
  const s=g.ent('survivor'),p=g.player;
  if(!s)return;
  s.interact=false;
  // Follow the ACTUAL path walked by Wraith, not a direct wall-clipping line.
  // On Continue, restart the short trail beside Wraith; the rescue choice persists.
  if(!g._escortTrail){
   s.tx=p.x/T-1; s.ty=p.y/T-.75;
   g._escortTrail=[{x:p.x,y:p.y}];
  }
  const trail=g._escortTrail,last=trail[trail.length-1];
  if(Math.hypot(p.x-last.x,p.y-last.y)>=7)trail.push({x:p.x,y:p.y});
  if(trail.length>600)trail.splice(0,trail.length-600);
  const goal=trail[0],sx=(s.tx+.5)*T,sy=(s.ty+.75)*T;
  const dx=goal.x-sx,dy=goal.y-sy,dist=Math.hypot(dx,dy);
  if(dist<9&&trail.length>1)trail.shift();
  s.moving=dist>9;
  if(s.moving)s.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  if(dist>9) {
   const step=Math.min(dist-9,Math.min(dt,.05)*100);
   const nx=sx+(dx/dist)*step,ny=sy+(dy/dist)*step;
   if(g.free ? g.free(nx,ny) : true){s.tx=nx/T-.5;s.ty=ny/T-.75;}
  }
 },
 doorOpen(){return true;},
 onScan(){},
 onEvidence(id,g){
  if(id==='e4_beacon')g.say([{s:'WRAITH',t:'Triangulated the distress packet. This signal is from a modern expedition beacon, not evidence of who built the old site.'}]);
  if(id==='e4_cable')g.say([{s:'WRAITH',t:'Cracked line. A modern cell should bridge it safely if I isolate the old feed.'}]);
 },
 label(e,g){
  if(e.id==='exit')return 'REQUEST EXTRACTION';
  if(e.id==='station')return 'READ RECOVERY ORDERS';
  if(e.id==='beacon')return 'ACCESS DISTRESS BEACON';
  if(e.id==='cell')return 'RECOVER REGULATOR CELL';
  if(e.id==='rail')return 'RESTORE EMERGENCY RAIL';
  if(e.id==='survivor')return g.flags.escorting?null:'ASSESS STRANDED SURVEYOR';
  return null;
 },
 interact(e,g){
  const f=g.flags;
  const say=t=>g.say([{s:'WRAITH',t}]);
  if(e.id==='station')return g.terminal('EXPEDITION FIELD ORDER', 'MIRA // EMERGENCY SEARCH\nRecover the missing surveyor.\nUse modern safety equipment only.\nNo extraction of unknown historical material.',()=>{});
  if(e.id==='beacon')return g.terminal(LOGS.beacon.title,LOGS.beacon.text,()=>{
   g.addLog('beacon');if(!f.beacon){f.beacon=true;g.checkpoint(true);}
  });
  if(e.id==='cell'){
   if(f.cellRecovered)return;
   f.cellRecovered=true;g.inv.regulatorCell=true;e.gone=true;g.sfx.pickup();g.checkpoint(true);
   return g.toast('FIELD REGULATOR CELL RECOVERED',3);
  }
  if(e.id==='rail')return g.terminal(LOGS.panel.title,LOGS.panel.text,()=>{
   g.addLog('panel');
   if(!f.beacon)return say('Mira asked me to log the missing team beacon before using this system.');
   if(!g.inv.regulatorCell)return say('I need a modern regulator cell from the expedition supply cache.');
   if(!g.hasEv('e4_cable'))return say('A cracked feed line is nearby. I need to scan it before sending power.');
   if(f.rail)return g.toast('EMERGENCY RAIL ONLINE',2);
   g.inv.regulatorCell=false;f.rail=true;f.lights=true;g.sfx.power();
   return g.say([
    {s:'SYSTEM',t:'EMERGENCY LAMPS RESTORED. Ancient lower-level bus still isolated.'},
    {s:'SENTINEL // COMMS',t:'Correct procedure. A modern rescue is not an excuse to energize an unclassified site.'},
   ],()=>g.checkpoint(true));
  });
  if(e.id==='survivor'){
   if(!f.rail)return g.say([{s:'SURVEYOR',t:'The east brace is moving. Emergency lamps are out. I need a lit route before I can cross.'},
    {s:'WRAITH',t:'I will restore the safety rail first. Stay away from the old feed.'}]);
   if(f.escorting)return say('Stay with me. Extraction is west, at the field marker.');
   return g.say([
    {s:'SURVEYOR',t:'I am functional, but my leg servo is binding. The transit braces shifted after the power dropped.'},
    {s:'WRAITH',t:'We can take the measured route, or move you quickly and let the medics examine the joint on return.'},
   ],()=>g.choose('Extraction method?',[
    'Mark the safe braces and guide the surveyor',
    'Emergency carry to the field boundary',
   ],i=>{
    if(i===0&&!g.hasEv('e4_rubble')){
     return say('I need to scan the bay bracing before calling a route safe.');
    }
    f.rescueMethod=i===0?'guided':'emergency';
    f.escorting=true;
    e.interact=false;g.checkpoint(true);
    g.say([
     {s:'WRAITH',t:i===0?'The bracing is mapped. Stay close; we move together.':'We will use emergency extraction. Medical will inspect the damaged servo.'},
     {s:'SURVEYOR',t:'Understood. Thank you for coming back.'},
    ]);
   }));
  }
  if(e.id==='exit'){
   if(!f.escorting)return say('We do not extract without the missing surveyor.');
   const s=g.ent('survivor'),d=Math.hypot((s.tx+.5)*T-g.player.x,(s.ty+.75)*T-g.player.y);
   if(d>64)return g.toast('SURVEYOR TOO FAR FROM EXTRACTION — REGROUP',3);
   f.extracted=true;s.gone=true;
   return g.say([
    {s:'MIRA',t:'I have the survivor. Medical is on standby. Good work, Wraith. No one crosses the site boundary until the follow-up survey.'},
    {s:'SENTINEL // COMMS',t:'One life recovered. The unknown signal remains unknown. Both facts matter.'},
    {s:'WRAITH',t:'Field report closing. The questions below are still there. We have time to ask them properly.'},
   ],()=>g.finish());
  }
 },
 outcome(g){return {extracted:!!g.flags.extracted,rescueMethod:g.flags.rescueMethod||'unknown'};},
 ending(g){
  return {title:'THE MISSING SURVEY: RECOVERED',lines:[
   'SURVIVOR EXTRACTED ....... '+(g.flags.extracted?'YES':'NO'),
   'METHOD ................... '+(g.flags.rescueMethod==='guided'?'GUIDED SAFETY ROUTE':'EMERGENCY EXTRACTION'),
   'EVIDENCE LOGGED ......... '+g.evCount('m4')+' / 5',
   'EMERGENCY LIGHTING ...... '+(g.flags.rail?'RESTORED':'OFFLINE'),
   '',
   'FIELD COMMAND ........... DIRECTOR MIRA',
   'WATCHTOWER OVERSIGHT .... SENTINEL',
   'UNKNOWN SIGNAL .......... STILL UNRESOLVED',
   '',
   'SEARCH RECORD CLOSED. UNDERLYING CASE OPEN.',
  ]};
 },
};
