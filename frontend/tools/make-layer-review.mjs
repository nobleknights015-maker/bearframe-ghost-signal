import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(root,'package.json')),{createCanvas,ImageData}=require('@napi-rs/canvas');globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const before='ded6e05b78263c07f2b0cde653f95e4e984cf387',dir=mkdtempSync(path.join(tmpdir(),'sprite-layers-')),out=path.resolve(process.argv[2]||path.join(root,'../docs/sprite-studio-layers'));mkdirSync(out,{recursive:true});
try{
 writeFileSync(path.join(dir,'package.json'),'{"type":"module"}');for(const name of execFileSync('git',['ls-tree','--full-tree','--name-only',before+':frontend/public/studio/lib'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(n=>n.endsWith('.js')))writeFileSync(path.join(dir,name),execFileSync('git',['show',before+':frontend/public/studio/lib/'+name],{cwd:root}));
 const old=await import(pathToFileURL(path.join(dir,'sprite-rig.js'))),now=await import('../public/studio/lib/sprite-rig.js'),oldMachine=await import(pathToFileURL(path.join(dir,'machine-rig.js'))),newMachine=await import('../public/studio/lib/machine-rig.js'),{industrialEcho}=await import('../public/studio/lib/unit-families.js'),{CHARACTER_PRESETS}=await import('../public/studio/lib/android-catalog.js');
 const label=(c,t,x,y)=>{c.fillStyle='white';c.font='16px sans-serif';c.fillText(t,x,y);};
 for(let i=0;i<8;i++){
  const cv=createCanvas(640,450),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,640,450);c.imageSmoothingEnabled=false;
  for(const [row,role] of ['survey','maintenance'].entries())for(let j=0;j<2;j++){
   const mod=j?newMachine:oldMachine,rig=industrialEcho({role});label(c,role+' — '+(j?'fixed':'before'),j*320+14,row*225+22);const f=createCanvas(rig.w,rig.h);
   // Old painter needs the old recipe as well: new per-view z values are part of this repair.
   if(!j){const {industrialEcho:oldFactory}=await import(pathToFileURL(path.join(dir,'unit-families.js')));Object.assign(rig,oldFactory({role}));}
   mod.renderRig(f.getContext('2d'),rig,'up','walk',i,8,f.width,f.height);c.drawImage(f,j*320+100,row*225+38,112,160);
  }writeFileSync(path.join(out,'echo-'+i+'.png'),cv.toBuffer('image/png'));
 }
 for(let i=0;i<6;i++){
  const cv=createCanvas(832,760),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,832,760);c.imageSmoothingEnabled=false;
  for(const [row,[name,isOld]] of [['Vale',true],['Vale',false],['Brix',true],['Brix',false]].entries()){
   const mod=isOld?old:now,cfg={...mod.DEFAULT_CFG,...structuredClone(CHARACTER_PRESETS[name])},y=row*190;label(c,name+' — '+(isOld?'before':'wrapped profile'),10,y+22);
   for(const [col,d] of ['down','up','right','left'].entries()){const f=createCanvas(64,112);mod.drawAndroid(f.getContext('2d'),cfg,d,mod.poseFor('walk',i,6),64,112);c.drawImage(f,100+col*180,y+32,80,140);label(c,d,104+col*180,y+184);}
  }writeFileSync(path.join(out,'outfit-'+i+'.png'),cv.toBuffer('image/png'));
 }
}finally{rmSync(dir,{recursive:true,force:true});}
