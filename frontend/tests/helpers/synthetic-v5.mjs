// Synthetic copyright-safe atlas fixture shared by unified-engine acceptance.
import {deflateSync} from 'node:zlib';
const actions=['idle','attack','ranged','cast','guard','hit','down','victory','charge'];
const actionFrames=[4,6,6,6,3,3,6,4,4];
const characters=['sleeper_A','sleeper_B','sleeper_C','sleeper_D',
  'echo_industrial_maintenance','old_sentry',...Array.from({length:36},(_,i)=>'test_filler_'+i)];
const art=(id)=>({
 id,world:{src:'assets/world/'+id+'.png',frameWidth:id==='old_sentry'?96:32,frameHeight:id==='old_sentry'?96:56,columns:9,rows:4,
   idleColumn:0,fps:8,anchor:id==='old_sentry'?[48,96]:[16,56],
   directions:['down','left','right','up'],walkColumns:[1,2,3,4,5,6,7,8]},
 battle:{src:'assets/battlers/'+id+'.png',frameWidth:id==='old_sentry'||id.startsWith('echo_')?96:64,
   frameHeight:id==='old_sentry'||id.startsWith('echo_')?96:64,columns:6,rows:9,
   animations:Object.fromEntries(actions.map((name,row)=>[name,{row,frames:actionFrames[row],
     fps:9,durationsMs:Array.from({length:actionFrames[row]},(_,i)=>75+row*3+i*5),
     loop:name==='idle'||name==='charge',holdLast:name==='down'||name==='victory'}]))}
});
const manifest={schema:'aeon.asset-library.v4',characters:characters.map(art)};
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const chunk=(type,payload)=>{const name=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);
 length.writeUInt32BE(payload.length);sum.writeUInt32BE(crc(Buffer.concat([name,payload])));
 return Buffer.concat([length,name,payload,sum]);};
function png(width,height,cellW,cellH){
 const raw=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=y*(width*4+1)+1+x*4,stepX=Math.floor(x/cellW),stepY=Math.floor(y/cellH);
  const localX=x%cellW,localY=y%cellH;
  if(localX<cellW*.22||localX>cellW*.78||localY<cellH*.17||localY>cellH*.88)continue;
  raw[offset]=40+stepX*16;raw[offset+1]=95+stepY*9;raw[offset+2]=165+stepX*6;raw[offset+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

export async function installSyntheticV5(page){
 await page.route('**/assets/aeon/**',async route=>{
  const url=new URL(route.request().url());const path=url.pathname;
  if(path.endsWith('/asset-manifest.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)});
  if(/\/portraits\/sleeper_[ABCD]\.png$/.test(path))return route.fulfill({status:200,contentType:'image/png',body:png(96,96,96,96)});
  const world=/\/assets\/world\/(sleeper_[ABCD]|old_sentry)\.png$/.exec(path);
  if(world){const width=world[1]==='old_sentry'?96:32,height=world[1]==='old_sentry'?96:56;
    return route.fulfill({status:200,contentType:'image/png',body:png(9*width,4*height,width,height)});}
  const battle=/\/assets\/battlers\/(sleeper_[ABCD]|echo_industrial_maintenance|old_sentry)\.png$/.exec(path);
  if(battle){const size=battle[1].startsWith('sleeper_')?64:96;
    return route.fulfill({status:200,contentType:'image/png',body:png(6*size,9*size,size,size)});
  }
  return route.fulfill({status:404,contentType:'text/plain',body:'Synthetic v5 fixture absent'});
 });
}
