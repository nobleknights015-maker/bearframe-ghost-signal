import {createCanvas,ImageData} from '@napi-rs/canvas';
import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';
globalThis.ImageData=ImageData;globalThis.document={createElement:()=>createCanvas(1,1)};
const {WORLD_VARIETIES}=await import('../public/studio/lib/world-varieties.js'),{renderRig}=await import('../public/studio/lib/machine-rig.js'),{machineProject}=await import('../public/studio/lib/sprite-sheet.js'),{fitMachineProject}=await import('../public/studio/lib/machine-bounds.js');
const out=path.resolve(process.argv[2]||'../docs/sprite-studio-battle-motion');mkdirSync(out,{recursive:true});
const actions=(process.argv[3]||'attack,guard,defeat,recover,charge,hurt,malfunction').split(','),dirs=['down','up','right','left'];
const units=Object.entries(WORLD_VARIETIES).map(([name,b])=>{const p=machineProject(name,b());fitMachineProject(p);return {name,p};});
for(const action of actions){
 const folder=path.join(out,action);mkdirSync(folder,{recursive:true});
 for(let i=0;i<16;i++){
  const c=createCanvas(1200,900),x=c.getContext('2d');x.fillStyle='#202630';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;x.font='15px sans-serif';
  for(const [k,{name,p}] of units.entries()){
   const col=k%3,row=Math.floor(k/3),f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,'right',action,i,16,f.width,f.height);
   const scale=2,anchor=p.rig.groundAnchor,dx=col*400+170-anchor.x*scale,dy=row*450+390-anchor.y*scale;x.strokeStyle='#48505a';x.beginPath();x.moveTo(col*400,row*450+390);x.lineTo(col*400+395,row*450+390);x.stroke();x.drawImage(f,dx,dy,f.width*scale,f.height*scale);x.fillStyle='#e1e6eb';x.fillText(name.replace(' (design study)',''),col*400+10,row*450+20);x.fillText(action+' — frame '+i,col*400+10,row*450+420);
  }
  writeFileSync(path.join(folder,`frame-${i}.png`),c.toBuffer('image/png'));
 }
}
// Full cardinal contact sheets at anticipation, active, recoil and terminal poses.
for(const {name,p} of units){const c=createCanvas(1000,1000),x=c.getContext('2d');x.fillStyle='#202630';x.fillRect(0,0,1000,1000);x.imageSmoothingEnabled=false;x.font='13px sans-serif';
 for(const [row,d] of dirs.entries())for(const [col,i] of [0,6,7,15].entries()){
  const f=createCanvas(p.rig.w,p.rig.h);renderRig(f.getContext('2d'),p.rig,d,'attack',i,16,f.width,f.height);const a=p.rig.groundAnchor,scale=1.5,dx=col*250+125-a.x*scale,dy=row*250+225-a.y*scale;x.drawImage(f,dx,dy,f.width*scale,f.height*scale);x.fillStyle='white';x.fillText(d+' / '+i,col*250+15,row*250+18);
 }writeFileSync(path.join(out,p.rig.worldSpec.role+'-four-views.png'),c.toBuffer('image/png'));
}
writeFileSync(path.join(out,'recipes.json'),JSON.stringify(units.map(u=>u.p.rig),null,2));
