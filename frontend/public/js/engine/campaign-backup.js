// Portable, user-initiated campaign save transfer between signed Android
// debug builds. No network access, no private story/art data in public code.
// Pure validation happens against an isolated journal BEFORE any live write.
import {createRpgSaveStore} from './rpg-save.js';
import {createCampaignJournal} from './campaign-journal.js';

const FORMAT='aeon-silent-wake-campaign-save';
const MAX_BACKUP_TEXT=2*1024*1024;
const starterOK=x=>typeof x==='string'&&/^sleeper_[ABCD]$/.test(x);
const checksum=body=>{
  // Same portable accidental-corruption checksum used by our RPG journal.
  // This is NOT a cryptographic signature: backups are user-controlled data.
  let hash=2166136261;
  for(let i=0;i<body.length;i++)hash=Math.imul(hash^body.charCodeAt(i),16777619);
  return (hash>>>0).toString(16).padStart(8,'0');
};
const key=id=>'bearframe_aeon_campaign_'+id+'_v1';
const memory=()=>{
  const entries=new Map();
  return {getItem:k=>entries.get(k)||null,
    setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
};
function verifyRecord(record,{starterId,content,worldSpec}){
  if(!starterOK(starterId)||!content||!worldSpec||!record||
     record.starterId!==starterId||record.world?.starterId!==starterId||
     record.storyRevision!==content.revision||
     record.layoutDigest!==worldSpec.layoutDigest)
    throw new Error('Backup identity or approved story revision mismatch');
  const tmp=memory(),storage=createRpgSaveStore(tmp,key(starterId));
  if(!storage.save(record))throw new Error('Backup record is not a valid journal');
  const journal=createCampaignJournal({storage:tmp,starterId,content,worldSpec});
  if(!journal.load())throw new Error('Backup journal failed owner campaign validation');
  // Do not accept foreign/corrupt map snapshots which would later be handed
  // to Game.start() on reload. Older narrative-only saves may omit field.
  for(const [mapId,snapshot] of Object.entries(record.maps||{})){
    const map=journal.graph.get(mapId);
    if(!map||snapshot?.mission!==mapId||
       !Number.isFinite(snapshot.player?.x)||!Number.isFinite(snapshot.player?.y)||
       snapshot.player.x<0||snapshot.player.y<0||
       snapshot.player.x>=map.width*32||snapshot.player.y>=map.height*32)
      throw new Error('Backup contains an invalid saved area position');
  }
  if(record.field!==null&&record.field!==undefined){
    const map=journal.graph.get(record.mapId),snapshot=record.field;
    if(!map||snapshot.mission!==record.mapId||
       !Number.isFinite(snapshot.player?.x)||!Number.isFinite(snapshot.player?.y)||
       snapshot.player.x<0||snapshot.player.y<0||
       snapshot.player.x>=map.width*32||snapshot.player.y>=map.height*32)
      throw new Error('Backup field position cannot be loaded');
  }
  return journal.readJournal();
}
export function makeCampaignBackup(journal){
  const record=journal?.readJournal?.();
  if(!record||!starterOK(record.starterId))throw new Error('No loaded campaign to back up');
  const body=JSON.stringify(record);
  const exportText=JSON.stringify({
    format:FORMAT,version:1,starterId:record.starterId,
    storyRevision:record.storyRevision,layoutDigest:record.layoutDigest,
    checksum:checksum(body),record
  });
  if(exportText.length>MAX_BACKUP_TEXT)throw new Error('Campaign backup exceeds mobile transfer limit');
  return exportText;
}
export function inspectCampaignBackup(text,{content,worldSpec}){
  if(typeof text!=='string'||text.length<20||text.length>MAX_BACKUP_TEXT)
    throw new Error('Backup text is empty or too large');
  let packageData;
  try{packageData=JSON.parse(text);}catch{throw new Error('Backup is not valid JSON');}
  if(!packageData||packageData.format!==FORMAT||packageData.version!==1||
     !starterOK(packageData.starterId)||typeof packageData.checksum!=='string'||
     packageData.storyRevision!==content?.revision||
     packageData.layoutDigest!==worldSpec?.layoutDigest)
    throw new Error('Backup format, owner starter or campaign revision mismatch');
  const body=JSON.stringify(packageData.record);
  if(checksum(body)!==packageData.checksum)
    throw new Error('Backup data checksum mismatch');
  const record=verifyRecord(packageData.record,{
    starterId:packageData.starterId,content,worldSpec
  });
  return Object.freeze({
    starterId:packageData.starterId,
    record,
    mapId:record.mapId,
    hasBattle:!!record.battle
  });
}
export function restoreCampaignBackup(text,{storage,content,worldSpec,replace=false}){
  const verified=inspectCampaignBackup(text,{content,worldSpec});
  const {starterId,record}=verified;
  // Read this starter's CURRENT validated journal. Missing/corrupt slot
  // metadata is not automatically grounds to discard raw user data.
  const journal=createCampaignJournal({storage,starterId,content,worldSpec});
  const existing=journal.load();
  if(existing&&!replace)throw new Error('Existing campaign requires explicit replacement approval');
  const namespace=key(starterId),primary=storage.getItem(namespace+':A'),
        secondary=storage.getItem(namespace+':B');
  if(!existing&&(primary!==null||secondary!==null))
    throw new Error('Existing unreadable records must be recovered, not overwritten');
  const save=createRpgSaveStore(storage,namespace);
  if(!save.save(record))throw new Error('Backup could not be committed to local storage');
  const check=createCampaignJournal({storage,starterId,content,worldSpec});
  if(!check.load()||JSON.stringify(check.readJournal())!==JSON.stringify(record))
    throw new Error('Backup write verification failed; inspect existing records');
  return Object.freeze({starterId,mapId:record.mapId,hasBattle:!!record.battle});
}
