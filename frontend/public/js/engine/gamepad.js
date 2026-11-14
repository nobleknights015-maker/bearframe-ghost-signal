// Gamepad-standard polling. Cardinal directions only, deadzone, edge-triggered actions.
const ACTIONS={0:'interact',1:'back',2:'scan',3:'light',4:'menu-prev',5:'menu-next',8:'case',9:'pause'};
const down=(p,i)=>!!(p?.buttons?.[i]?.pressed || p?.buttons?.[i]?.value>0.5);
const axis=(p,i)=>Number.isFinite(p?.axes?.[i]) ? p.axes[i] : 0;
const choose = p => {
  if (down(p,12)) return 'up';
  if (down(p,13)) return 'down';
  if (down(p,14)) return 'left';
  if (down(p,15)) return 'right';
  const x=axis(p,0),y=axis(p,1),deadzone=.4;
  if(Math.max(Math.abs(x),Math.abs(y))<deadzone) return null;
  return Math.abs(x)>=Math.abs(y) ? (x>0?'right':'left') : (y>0?'down':'up');
};
export function createGamepadReader() {
  let was=new Set();
  return Object.freeze({
    poll(pads) {
      const p=Array.from(pads || []).find(v=>v && v.connected !== false);
      if (!p) { was=new Set(); return {dir:null,actions:[]}; }
      const pressed=new Set(Object.keys(ACTIONS).filter(i=>down(p,Number(i))).map(i=>ACTIONS[i]));
      const actions=[...pressed].filter(a=>!was.has(a)); was=pressed;
      return {dir:choose(p),actions};
    },
    reset() { was=new Set(); }
  });
}
