// Optional Bearframe wardrobe and age layers. Design-grid geometry is rasterized
// at the output resolution; no source-image cuts, antialiasing or rig deformation.
export const WARDROBE = {
  scarf: ['none', 'wrap', 'trailing', 'cowl'],
  hood: ['none', 'raised', 'draped'],
  drapery: ['none', 'mantle', 'tabard', 'split'],
  damageType: ['worn', 'cracked', 'exposed', 'scorched'],
};
export function appearance({c,cfg,dir,pose,K,X,Y,P}) {
  const b=pose.b||0, side=dir==='left'||dir==='right', back=dir==='up';
  const wear=Number(cfg.clothWear)||0, growth=Number(cfg.overgrowth)||0;
  const C=P.C;
  const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16),t=f>0?255:0,a=Math.abs(f);return '#'+[16,8,0].map(s=>Math.round(((n>>s)&255)*(1-a)+t*a).toString(16).padStart(2,'0')).join('');};
  const rand=(x,y=0)=>{const n=Math.sin(x*91.7+y*13.3)*43758.5453;return n-Math.floor(n);};
  const inside=(x,y,pts)=>{let hit=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [a,b]=pts[i],[u,v]=pts[j];if((b>y)!==(v>y)&&x<(u-a)*(y-b)/(v-b)+a)hit=!hit;}return hit;};
  // Garment-space folds: wraps curve around the neck; hanging cloth has broad
  // vertical valleys; a hood has a crown, rim and shaded side volume.
  // Motion deforms the mask and shading together, keeping wear attached to cloth.
  const cloth=(pts,{holes=[],role='drapery',flow=role==='hood'?'hood':role==='scarf'?'wrap':'hang',ragged=true}={})=>{
    const color=cfg.colors[role]||C, H=shade(color,.20), D=shade(color,-.30), E=shade(color,-.52);
    const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
    const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
    const w=maxX-minX,h=maxY-minY,e=1/K, moving=flow==='hang';
    const wind=t=>moving?Math.sin((pose.ph||0)-t*1.4)*.65*t*t:0;
    const visible=(x,y)=>inside(x,y,pts)&&!holes.some(hole=>inside(x,y,hole));
    for(let py=Y(minY);py<Y(maxY);py++)for(let px=X(minX-1);px<X(maxX+1);px++){
      const y=minY+(py-Y(minY)+.5)/K, v=y-minY,t=v/h;
      const x=minX+(px-X(minX)+.5)/K-wind(t),u=x-minX,q=u/w;
      if(!visible(x,y))continue;
      const hem=maxY-y;
      // Coherent notches, not scattered bright pinholes or a uniformly serrated edge.
      const notch=rand(Math.floor(u),7)>.72?wear*(.65+rand(Math.floor(u),9)*.65):0;
      if(ragged&&wear&&hem<notch)continue;
      if(ragged&&wear>=2&&t>.5&&rand(Math.floor(u/1.5),Math.floor(v/2.5))>.995-(wear-2)*.003)continue;
      const left=!visible(x-e,y),right=!visible(x+e,y),top=!visible(x,y-e),bottom=!visible(x,y+e);
      let col=color;
      if(flow==='wrap'){
        // Two overlapping U-shaped folds instead of vertical zebra stripes.
        const curve=Math.max(0,1-Math.pow((q-.5)*2,2));
        const ridge=.6+curve*Math.min(2.2,h*.38),fold=v-ridge;
        if(fold>=0&&fold<e)col=H;
        else if(fold>=e&&fold<2*e)col=D;
        else if(v>ridge+1.6&&v<ridge+1.6+e)col=D;
        else if(q>.8||v>h*.78)col=D;
      }else if(flow==='hood'){
        // One broad lit crown and a shaded far side, with a recessed face rim.
        const crown=.8+Math.pow((q-.46)*2,2)*h*.18;
        const nearFold=.23+.14*t,farFold=.78-.12*t;
        if(q<nearFold||q>farFold)col=D;
        if(q>=nearFold&&q<nearFold+e/w&&t>.18)col=H;
        if(q>farFold-e/w&&q<farFold&&t>.28)col=E;
        // Creases gather toward the nape instead of running as parallel stripes.
        const gather=Math.abs(u-w*.49)-Math.max(0,h-v)*.22;
        if(t>.55&&Math.abs(gather)<e*.7)col=D;
        if(v<crown+e)col=H;
        if(t>.91)col=D;
        const inner=holes.some(hole=>inside(x-e,y,hole)||inside(x+e,y,hole)||inside(x,y-e,hole)||inside(x,y+e,hole));
        if(inner)col=q<.5?H:E;
      }else{
        // Cape-like long folds: a broad light plane and two restrained valleys.
        const a=w*(.26+.05*t),z=w*(.68-.06*t);
        if(u>a-e&&u<a)col=H;
        else if(u>=a&&u<a+Math.max(e,w*.11))col=D;
        else if(u>z&&u<z+Math.max(e,w*.10))col=E;
        else if(q>.85)col=D;
        if(v<e)col=D;
      }
      // Dark selvage separates cloth from armor; highlights are selective.
      if(left||right||bottom)col=D;
      if(top&&q<.65)col=H;
      c.fillStyle=col;c.fillRect(px,py,1,1);
    }
  };
  const rear=()=>{
    if(cfg.scarf==='trailing'){
      const sway=Math.sin(pose.ph||0)*.8;
      cloth(side?[[11,15+b],[14,17+b],[10+sway,27+b],[6+sway,33+b],[7,25+b]]:[[8,16+b],[11,17+b],[8+sway,29+b],[5+sway,32+b],[6,25+b]],{role:'scarf',flow:'hang'});
    }
    if(cfg.drapery==='split'){
      const sway=Math.sin(pose.ph||0)*.6;
      for(const [x,w] of (side?[[8,4]]:[[7,5],[21,4]]))cloth([[x,30+b],[x+w,30+b],[x+w+sway,42+b],[x+w/2+sway,46+b],[x-1+sway,42+b]]);
    }
  };
  const surface=()=>{
    if(!growth)return;
    // Growth is rooted in armor, never sprinkled across face displays or empty air.
    const img=c.getImageData(0,0,c.canvas.width,c.canvas.height),d=img.data;
    const armor=new Set([P.W,P.Wh,P.S,P.D].map(s=>parseInt(s.slice(1),16)));
    const anchors=side?[[13,18+b],[16,26+b],[15+(pose.s||0),35]]:[[7,18+b],[23,18+b],[12,27+b],[18,34]];
    const moss=cfg.colors.moss||'#63754a',dark='#374a30',light='#8c9860';
    for(let k=0;k<Math.min(anchors.length,growth+1);k++){
      const [ax,ay]=anchors[k]; let root=null;
      for(let py=Y(ay-2);py<Y(ay+3);py++)for(let px=X(ax-3);px<X(ax+4);px++){
        if(px<0||py<0||px>=img.width||py>=img.height)continue;
        const i=(py*img.width+px)*4,col=(d[i]<<16)|(d[i+1]<<8)|d[i+2];
        const x=(px-X(ax))/K,y=(py-Y(ay))/K;
        if(!d[i+3]||!armor.has(col)||x*x/10+y*y/5>1||rand(Math.floor(x*1.4)+k*13,Math.floor(y*1.4))<.25)continue;
        c.fillStyle=rand(Math.floor(x),Math.floor(y)+k)<.3?light:rand(Math.floor(x)+4,Math.floor(y))>.6?dark:moss;c.fillRect(px,py,1,1);root=[px,py];
      }
      if(growth>=2&&root){c.fillStyle=dark;for(let j=0;j<growth+1;j++)c.fillRect(root[0]+Math.round((j%3===0?1:0)*K),root[1]+Math.round(j*K),Math.max(1,Math.round(K)),Math.max(1,Math.round(K)));}
    }
  };
  const front=()=>{
    surface();
    if(cfg.drapery==='mantle')cloth(side?[[9,15+b],[18,15+b],[20,20+b],[15,22+b],[9,21+b]]:[[5,16+b],[11,14+b],[21,14+b],[27,17+b],[25,23+b],[20,21+b],[16,18+b],[10,22+b],[6,22+b]],{flow:'wrap'});
    if(cfg.drapery==='tabard'){
      if(side)cloth([[11,17+b],[14,17+b],[13,30+b],[15,41+b],[11,43+b],[9,31+b]]);
      else if(back)cloth([[12,16+b],[20,16+b],[20,31+b],[22,41+b],[16,45+b],[10,41+b],[12,30+b]]);
      else {cloth([[11,16+b],[14,17+b],[13,28+b],[15,39+b],[11,42+b],[9,32+b]]);cloth([[19,17+b],[21,16+b],[23,32+b],[21,42+b],[17,39+b],[19,28+b]]);}
    }
    if(cfg.hood==='draped')cloth(side?[[9,12+b],[13,14+b],[18,16+b],[15,20+b],[9,18+b],[7,16+b]]:[[7,13+b],[11,15+b],[16,16+b],[21,15+b],[25,13+b],[25,17+b],[20,21+b],[12,21+b],[7,17+b]],{role:'hood',flow:'wrap'});
    if(cfg.scarf&&cfg.scarf!=='none'){
      const deep=cfg.scarf==='cowl'?4:2;
      cloth(side?[[10,14+b],[20,14+b],[21,16+b],[16,17+b+deep],[9,17+b],[8,15+b]]:[[9,14+b],[14,15+b],[20,14+b],[23,15+b],[22,17+b],[16,17+b+deep],[10,17+b],[8,16+b]],{ragged:false,role:'scarf'});
    }
    if(cfg.hood==='raised'){
      const outer=side?[[9,5+b],[12,1+b],[18,1+b],[22,5+b],[23,13+b],[20,18+b],[13,17+b],[8,13+b]]:[[8,6+b],[11,1+b],[20,1+b],[24,6+b],[24,14+b],[20,18+b],[12,18+b],[8,14+b]];
      const opening=side?[[17,5+b],[21,6+b],[23,10+b],[21,14+b],[17,15+b],[16,10+b]]:[[12,5+b],[19,5+b],[22,9+b],[20,14+b],[16,16+b],[11,13+b],[10,9+b]];
      cloth(outer,{holes:back?[]:[opening],ragged:false,role:'hood',flow:'hood'});
    }
  };
  return {rear,front,cloth};
}
