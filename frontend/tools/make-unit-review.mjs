import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(root,'package.json')),{createCanvas,ImageData}=require('@napi-rs/canvas');globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const {industrialEcho}=await import('../public/studio/lib/unit-families.js'),{renderRig}=await import('../public/studio/lib/machine-rig.js'),{fitMachineProject}=await import('../public/studio/lib/machine-bounds.js'),{machineProject}=await import('../public/studio/lib/sprite-sheet.js');
const out=path.resolve(process.argv[2]||path.join(root,'../docs/sprite-studio-unit-expansion'));mkdirSync(out,{recursive:true});
const units=['survey','maintenance'].map(role=>{const p=machineProject('Industrial Echo',industrialEcho({role}));fitMachineProject(p);return p;});
for(let i=0;i<8;i++){const cv=createCanvas(832,440),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,832,440);c.font='16px sans-serif';c.imageSmoothingEnabled=false;
 for(const [row,p] of units.entries()){const y=row*220;c.fillStyle='white';c.fillText('Industrial Echo — '+p.rig.unitSpec.role,10,y+20);
  for(const [j,d] of ['down','up','right','left'].entries()){const f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,d,'walk',i,8,f.width,f.height);const k=Math.min(140/f.width,174/f.height),w=Math.round(f.width*k),h=Math.round(f.height*k);c.drawImage(f,90+j*185,y+30,w,h);c.fillStyle='#bdc9cf';c.fillText(d,104+j*185,y+215);}
 }writeFileSync(path.join(out,'walk-'+i+'.png'),cv.toBuffer('image/png'));}
