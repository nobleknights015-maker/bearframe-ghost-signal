// Opt-in Aeon Circuit v5 renderer bridge. Adds NO new gameplay/combat rules.
// Source art lives in the owner's offline assets/aeon bundle, never in public repo.
const STARTERS=Object.freeze(['sleeper_A','sleeper_B','sleeper_C','sleeper_D']);
const ACTIONS=Object.freeze(['idle','attack','ranged','cast','guard','hit','down','victory','charge']);
const WORLD_DIRS=Object.freeze(['down','up','right','left']);
const ROOT=new URL('../../assets/aeon/',import.meta.url);
const safePath=p=>typeof p==='string'&&/^assets\/(world|battlers)\/[a-zA-Z0-9_-]+\.png$/.test(p);
export function mapV5Art(manifest,bindings) {
  if(manifest?.schema!=='aeon.asset-library.v4'||!Array.isArray(manifest.characters))
    throw new TypeError('Wrong Aeon v5 art manifest');
  const byId=new Map(manifest.characters.map(row=>[row.id,row]));
  const result={};
  for(const [actorKey,artId] of Object.entries(bindings)) {
    if(!/^(party|enemy):[a-zA-Z0-9_-]{1,64}$/.test(actorKey))throw new TypeError('Bad combat actor key');
    const entry=byId.get(artId);
    if(!entry?.battle||!safePath(entry.battle.src))throw new Error('Missing approved-id artwork: '+artId);
    const b=entry.battle;
    if(b.columns!==6||b.rows!==9||![64,96,128].includes(b.frameWidth)||b.frameWidth!==b.frameHeight)
      throw new Error('Unexpected six-by-nine battle sheet for '+artId);
    const animations={};
    for(const name of ACTIONS){
      const clip=b.animations?.[name];
      if(!clip)throw new Error('Missing action '+name+' for '+artId);
      if(clip.row!==ACTIONS.indexOf(name)||clip.frames<1||clip.frames>6||
         !Array.isArray(clip.durationsMs)||clip.durationsMs.length!==clip.frames||
         clip.durationsMs.some(ms=>!Number.isInteger(ms)||ms<1||ms>10000))
        throw new Error('Invalid authored action timing '+name+' for '+artId);
      const totalMs=clip.durationsMs.reduce((sum,ms)=>sum+ms,0);
      const release=clip.events?.find(e=>e.kind==='release')?.atMs;
      if(release!==undefined&&(!Number.isInteger(release)||release<0||release>totalMs))
        throw new Error('Invalid authored release timing '+name+' for '+artId);
      animations[name]={row:clip.row,frames:clip.frames,fps:clip.fps||clip.frames*1000/totalMs,
        durationsMs:[...clip.durationsMs],loop:!!clip.loop,holdLast:!!clip.holdLast,
        ...(release!==undefined?{releaseMs:release}:{})};
    }
    result[actorKey]={src:'assets/aeon/'+b.src,frameWidth:b.frameWidth,
      frameHeight:b.frameHeight,scale:1,animations};
  }
  return result;
}
export function worldSheetSpec(manifest,id){
  const entry=manifest.characters?.find(x=>x.id===id);
  const w=entry?.world;
  if(!w||!safePath(w.src)||w.columns!==9||w.rows!==4||w.frameWidth!==32||w.frameHeight!==56||
     JSON.stringify(w.directions)!==JSON.stringify(['down','left','right','up'])||
     JSON.stringify(w.walkColumns)!==JSON.stringify([1,2,3,4,5,6,7,8]))
    throw new Error('V5 Sleeper world sheet mismatch: '+id);
  return w;
}
const loadImage=src=>new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('Art image could not load: '+src));img.src=src;
});
export async function buildV5WorldSheet(manifest,id){
  if(!STARTERS.includes(id))throw new Error('Starter identity not approved: '+id);
  const w=worldSheetSpec(manifest,id);
  const img=await loadImage(new URL(w.src,ROOT).href);
  if(img.naturalWidth!==w.frameWidth*9||img.naturalHeight!==w.frameHeight*4)
    throw new Error('V5 world PNG dimensions changed: '+id);
  // Respect the source's full EIGHT walk frames, original direction order and foot anchor.
  // Only this opt-in RPG lab overrides its own Game.frame() (14 cols), not Ghost Signal.
  const canvas=document.createElement('canvas');canvas.width=14*32;canvas.height=4*56;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let row=0;row<WORLD_DIRS.length;row++){
    const srcRow=w.directions.indexOf(WORLD_DIRS[row]);
    for(let col=0;col<8;col++)ctx.drawImage(img,(col+1)*32,srcRow*56,32,56,col*32,row*56,32,56);
    for(let col=8;col<14;col++)ctx.drawImage(img,0,srcRow*56,32,56,col*32,row*56,32,56);
  }
  return {canvas,source:img,id};
}
export function bindV5WorldSheet(game,{canvas,id}){
  if(!STARTERS.includes(id)||canvas.width!==448||canvas.height!==224)throw new Error('Bad V5 field sheet');
  game.sheet=canvas;
  // Ghost Signal trace echoes belong to the selected player identity as well.
  game.ghostSheet=canvas;game.echoSheet=canvas;game.fieldSpriteAnchorY=56;
  // Existing Game player movement, collision, camera, stealth, save and HUD remain authoritative.
  // This changes only frame selection in this opted-in RPG Game instance.
  game.frame=()=>{
    const p=game.player;
    return p.scanT>0?12+(p.scanT>.3?0:1):p.moving?
      Math.floor(p.anim*8/11)%8:8+(Math.floor(game.time/.32)%4);
  };
  return true;
}
export async function loadAeonV5(){
  const response=await fetch(new URL('asset-manifest.json',ROOT),{cache:'no-cache'});
  if(!response.ok)throw new Error('Install approved v5 asset bundle first (HTTP '+response.status+')');
  const manifest=await response.json();
  if(manifest?.schema!=='aeon.asset-library.v4'||manifest.characters?.length!==42)
    throw new Error('Expected 42-character v5 asset library');
  for(const id of STARTERS)worldSheetSpec(manifest,id);
  return manifest;
}
export async function chooseStarter(manifest,options={}){
  return new Promise(resolve=>{
    const stage=document.getElementById('stage');
    const finish=id=>{document.removeEventListener('keydown',navigate);shell.remove();resolve(id);};
    const navigate=event=>{
      const buttons=[...shell.querySelectorAll('button:not(:disabled)')];
      if(!buttons.length)return;
      if(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(event.code)){
        event.preventDefault();const current=buttons.indexOf(document.activeElement);
        const step=['ArrowUp','ArrowLeft'].includes(event.code)?-1:1;
        buttons[(Math.max(0,current)+step+buttons.length)%buttons.length].focus();
      }else if(options.cancel&&event.code==='Escape'){event.preventDefault();finish(null);}
    };
    const shell=document.createElement('div');
    shell.id='aeon-v5-choose';shell.className='overlay';shell.style.zIndex='60';
    const panel=document.createElement('section');panel.className='panel case';
    panel.style.cssText='display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*5);padding:calc(var(--u)*8)';
    const title=document.createElement('h2');title.textContent=options.title||'CHOOSE ANCIENT SLEEPER // V5 ART QA';panel.append(title);
    const info=document.createElement('p');info.textContent=options.description||'Select one of the four approved character identities. This is a noncanonical development test.';
    info.style.cssText='font-size:calc(var(--u)*7);text-align:center';panel.append(info);
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:calc(var(--u)*5);width:100%';
    for(const id of STARTERS){
      const button=document.createElement('button');button.className='menu-btn sm';
      button.type='button';button.dataset.starter=id;button.disabled=options.enabled?!options.enabled(id):false;
      button.style.cssText='display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*2);min-width:0;padding:calc(var(--u)*2)';
      const picture=document.createElement('img');picture.alt=id+' approved character selection';
      picture.src=new URL('portraits/'+id+'.png',ROOT).href;
      picture.style.cssText='height:calc(var(--u)*130);max-width:100%;width:100%;object-fit:contain;image-rendering:auto';
      picture.onerror=()=>{picture.style.display='none';button.textContent=id+' / portrait missing';};
      const label=document.createElement('span');label.textContent=id.replace('_',' ');
      label.style.fontSize='calc(var(--u)*7)';button.append(picture,label);
      button.addEventListener('click',()=>finish(id));grid.append(button);
    }
    panel.append(grid);
    if(options.cancel){const back=document.createElement('button');back.type='button';back.className='menu-btn sm';back.textContent='BACK';back.onclick=()=>finish(null);panel.append(back);}
    shell.append(panel);stage.append(shell);document.addEventListener('keydown',navigate);
    grid.querySelector('button:not(:disabled)')?.focus();
  });
}
export async function prepareAeonV5(){
  const manifest=await loadAeonV5();
  const starterId=await chooseStarter(manifest);
  const field=await buildV5WorldSheet(manifest,starterId);
  const battleArt=mapV5Art(manifest,{
    'party:sleeper':starterId,
    'party:echo':'echo_industrial_maintenance',
    'enemy:sentry':'old_sentry'
  });
  return {starterId,field,battleArt,manifestVersion:manifest.schema,
    catalogCount:manifest.characters.length};
}