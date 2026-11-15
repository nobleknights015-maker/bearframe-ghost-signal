import {createRequire} from 'node:module';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';
const require=createRequire(import.meta.url),{createCanvas,ImageData}=require('@napi-rs/canvas');globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const {WORLD_VARIETIES}=await import('../public/studio/lib/world-varieties.js'),{renderRig}=await import('../public/studio/lib/machine-rig.js'),{fitMachineProject}=await import('../public/studio/lib/machine-bounds.js'),{machineProject}=await import('../public/studio/lib/sprite-sheet.js');
const out=path.resolve(process.argv[2]||'../docs/sprite-studio-world-varieties');mkdirSync(out,{recursive:true});
const recipes=Object.entries(WORLD_VARIETIES).map(([name,b])=>[name,b,name.includes('Suspended')||name.includes('Relay')?'walk':'idle']);
const saved=[];
for(let page=0;page<3;page++){
 const units=recipes.slice(page*2,page*2+2).map(([name,b,action])=>{const p=machineProject(name,b());fitMachineProject(p);let bounds={l:p.rig.w,t:p.rig.h,r:0,b:0};for(const d of ['down','up','right','left'])for(let i=0;i<8;i++){const f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,d,action,i,8,f.width,f.height);const a=f.getContext('2d').getImageData(0,0,f.width,f.height).data;for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++)if(a[(y*f.width+x)*4+3]){bounds.l=Math.min(bounds.l,x);bounds.t=Math.min(bounds.t,y);bounds.r=Math.max(bounds.r,x+1);bounds.b=Math.max(bounds.b,y+1);}}return {p,name,action,bounds};});
 saved.push(...units.map(({p})=>p.rig));
 for(let i=0;i<8;i++){
  const cv=createCanvas(1120,840),c=cv.getContext('2d');c.fillStyle='#202630';c.fillRect(0,0,cv.width,cv.height);c.imageSmoothingEnabled=false;c.font='18px sans-serif';
  for(const [row,{p,name,action,bounds}] of units.entries()){const y=row*420;c.fillStyle='white';c.fillText(name,14,y+25);for(const [j,d] of ['down','up','right','left'].entries()){const f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,d,action,i,8,f.width,f.height);const w=bounds.r-bounds.l,h=bounds.b-bounds.t,k=Math.max(1,Math.min(6,Math.floor(260/w),Math.floor(340/h)));c.drawImage(f,bounds.l,bounds.t,w,h,j*280+(280-w*k)/2,y+42,w*k,h*k);c.fillStyle='#c8d0d8';c.fillText(d,j*280+110,y+410);}}
  writeFileSync(path.join(out,`varieties-${page}-${i}.png`),cv.toBuffer('image/png'));
 }
}

writeFileSync(path.join(out,'recipes.json'),JSON.stringify(saved,null,2));
