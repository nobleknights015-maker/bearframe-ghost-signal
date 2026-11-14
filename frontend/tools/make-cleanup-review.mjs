// Native before/after renders at a pinned generator checkpoint; no reference-art crops.
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(root,'package.json')),{createCanvas,ImageData}=require('@napi-rs/canvas');
globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const before='fdea3ffef7fb2e7e5baa9e829b2448fbae25a7fa',dir=mkdtempSync(path.join(tmpdir(),'sprite-cleanup-')),out=path.resolve(process.argv[2]||path.join(root,'../docs/sprite-studio-pixel-cleanup'));mkdirSync(out,{recursive:true});
try{
 writeFileSync(path.join(dir,'package.json'),'{"type":"module"}');const names=execFileSync('git',['ls-tree','--full-tree','--name-only',before+':frontend/public/studio/lib'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(n=>n.endsWith('.js'));for(const n of names)writeFileSync(path.join(dir,n),execFileSync('git',['show',before+':frontend/public/studio/lib/'+n],{cwd:root}));
 const old=await import(pathToFileURL(path.join(dir,'sprite-rig.js'))),now=await import(pathToFileURL(path.join(root,'public/studio/lib/sprite-rig.js'))),{CHARACTER_PRESETS}=await import(pathToFileURL(path.join(root,'public/studio/lib/android-catalog.js')));
 for(let i=0;i<6;i++){
  const cv=createCanvas(832,760),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,cv.width,cv.height);c.font='16px sans-serif';c.imageSmoothingEnabled=false;
  for(const [row,[name,beforeFlag]] of [['Vale',true],['Vale',false],['Penney',true],['Penney',false]].entries()){
   const mod=beforeFlag?old:now,cfg={...mod.DEFAULT_CFG,...structuredClone(CHARACTER_PRESETS[name])},y=row*190;c.fillStyle='white';c.fillText(name+' — '+(beforeFlag?'before':'clean + narrow'),10,y+21);
   for(const [j,d] of ['down','up','right','left'].entries()){
    const frame=createCanvas(64,112);mod.drawAndroid(frame.getContext('2d'),cfg,d,mod.poseFor('walk',i,6),64,112);c.drawImage(frame,100+j*180,y+32,80,140);c.fillStyle='#b8c7cf';c.fillText(d,104+j*180,y+184);
   }
  }
  writeFileSync(path.join(out,`walk-${i}.png`),cv.toBuffer('image/png'));
 }
 const cv=createCanvas(640,320),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,640,320);c.imageSmoothingEnabled=false;c.font='16px sans-serif';
 for(let row=0;row<2;row++){
  const mod=row?now:old;c.fillStyle='white';c.fillText(row?'Clean + narrower modules':'Before',10,row*160+22);
  for(const [j,d] of ['down','up','right','left'].entries()){
   const f=createCanvas(64,112);mod.drawAndroid(f.getContext('2d'),{...mod.DEFAULT_CFG,...structuredClone(CHARACTER_PRESETS.Penney)},d,{b:0,ph:0},64,112);c.drawImage(f,14,0,36,34,j*160+18,row*160+32,126,119);
  }
 }
 writeFileSync(path.join(out,'head-comparison.png'),cv.toBuffer('image/png'));
}finally{rmSync(dir,{recursive:true,force:true});}
