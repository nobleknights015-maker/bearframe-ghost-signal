// Frame timing and inert event data. No callbacks or game actions execute in the creator.
export function clipTiming(a){
 if(!a||!Number.isInteger(a.frames)||a.frames<1||a.frames>4096||!Number.isFinite(a.fps)||a.fps<=0||a.fps>60)throw Error('Invalid clip frame count or FPS');
 if(a.loop!=null&&typeof a.loop!=='boolean')throw Error('Loop must be true or false');
 const durations=a.durationsMs==null?Array(a.frames).fill(1000/a.fps):a.durationsMs;
 if(!Array.isArray(durations)||durations.length!==a.frames||durations.some(x=>!Number.isFinite(x)||x<1||x>60000))throw Error('Provide one duration (1–60000 ms) for every frame');
 const starts=[];let total=0;for(const d of durations){starts.push(total);total+=d;}
 const events=a.events||[];if(!Array.isArray(events)||events.length>120||events.some(e=>!e||!Number.isInteger(e.frame)||e.frame<0||e.frame>=a.frames||typeof e.name!=='string'||!e.name.trim()||e.name.length>80))throw Error('Events need a valid frame and name');
 return {durationsMs:[...durations],startsMs:starts,durationMs:total,loop:a.loop!==false,events:events.map(e=>({...e,timeMs:starts[e.frame]}))};
}
export function frameAtTime(a,ms){
 const t=clipTiming(a),elapsed=Math.max(0,Number.isFinite(ms)?ms:0),done=!t.loop&&elapsed>=t.durationMs,local=t.loop?elapsed%t.durationMs:Math.min(elapsed,t.durationMs),index=done?a.frames-1:Math.max(0,t.startsMs.findLastIndex(x=>x<=local));
 return {index,done,localMs:local,durationMs:t.durationMs,events:t.events.filter(e=>e.frame===index)};
}
export function eventsBetween(a,fromMs,toMs){
 const t=clipTiming(a);if(!Number.isFinite(fromMs)||!Number.isFinite(toMs)||toMs<fromMs)throw Error('Invalid event interval');const out=[];
 const first=t.loop?Math.max(0,Math.floor(Math.max(0,fromMs)/t.durationMs)):0,last=t.loop?Math.floor(Math.max(0,toMs)/t.durationMs):0;
 if(last-first>1000)throw Error('Event interval spans too many loops');
 for(let cycle=first;cycle<=last;cycle++)for(const e of t.events){const at=cycle*t.durationMs+e.timeMs;if(at>fromMs&&at<=toMs)out.push({...e,timeMs:at,cycle});}return out;
}

export function resizeClip(a,frames){
 const next={...a,frames,durationsMs:undefined};if(a.events){const from=a.loop===false?Math.max(1,a.frames-1):a.frames,to=a.loop===false?Math.max(0,frames-1):frames;next.events=a.events.map(e=>({...e,frame:Math.min(frames-1,Math.round(e.frame/from*to))}));}clipTiming(next);return next;
}
