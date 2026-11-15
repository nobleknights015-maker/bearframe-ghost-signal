import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require('@napi-rs/canvas');globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const {gridCrawler,orbitalCore}=await import('../public/studio/lib/grid-families.js'),{renderRig}=await import('../public/studio/lib/machine-rig.js'),{fitMachineProject}=await import('../public/studio/lib/machine-bounds.js'),{machineProject}=await import('../public/studio/lib/sprite-sheet.js');
const out=path.resolve(process.argv[2]||'../docs/sprite-studio-grid-families');mkdirSync(out,{recursive:true});
const units=[gridCrawler(),orbitalCore()].map(r=>{const p=machineProject(r.name,r);fitMachineProject(p);return p;});
for(let i=0;i<12;i++){
 const cv=createCanvas(1080,500),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,1080,500);c.imageSmoothingEnabled=false;c.font='16px sans-serif';
 for(const [row,p] of units.entries()){c.fillStyle='white';c.fillText(p.name+' — '+(row?'hover / orbit':'tripod walk'),14,row*250+24);for(const [j,d] of ['down','up','right','left'].entries()){const f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,d,row?'idle':'walk',i,12,f.width,f.height);c.drawImage(f,j*270+5,row*250+32,f.width*2,f.height*2);c.fillStyle='#c8d0d8';c.fillText(d,j*270+100,row*250+244);}}
 writeFileSync(path.join(out,`review-${i}.png`),cv.toBuffer('image/png'));
}writeFileSync(path.join(out,'recipes.json'),JSON.stringify(units.map(p=>p.rig),null,2));
