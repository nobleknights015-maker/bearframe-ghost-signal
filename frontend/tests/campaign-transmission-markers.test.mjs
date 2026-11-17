import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCampaignTransmissionMarkers,createCampaignTransmissionPainter} from
  '../public/js/engine/campaign-transmission-markers.js';
import {compileCampaignWorld,createCampaignMissionFactory} from '../public/js/engine/campaign-world.js';

function fixture(){
  const map=(id,toId,portal,back,gate=false)=>{
    const width=8,height=8;
    const col=Array.from({length:width*height},(_,i)=>{
      const x=i%width,y=Math.floor(i/width);
      return x===0||y===0||x===width-1||y===height-1?1:0;
    });
    const side=id==='A00'?5:2;
    return {id,name:id,width,height,orientation:'orthogonal',tilewidth:32,tileheight:32,
      start:{x:80,y:80,dir:'right'},
      layers:[{type:'tilelayer',name:'collision',data:col},
        {type:'objectgroup',name:'portals',objects:[{
          name:portal,x:side*32,y:3*32,width:32,height:32,
          properties:[{name:'toMap',value:toId},{name:'toPortal',value:back},
            {name:'facing',value:'right'},
            ...(gate?[{name:'requiresFlag',value:'relay_active'}]:[])]
        }]}],entities:[],triggers:[]};
  };
  return {schemaVersion:1,campaignRevision:1,startArea:'A00',
    maps:[map('A00','A01','link_east','link_west',true),
      map('A01','A00','link_west','link_east')]};
}
function canvas(){
  const calls=[];
  const c={
    width:256,height:256,calls,
    getContext:()=>({
      drawImage:(...args)=>calls.push(['drawImage',...args.map(x=>typeof x==='number'?x:'canvas')]),
      fillRect:(...args)=>calls.push(['fillRect',...args]),
      set fillStyle(value){calls.push(['color',value]);},
      save:()=>calls.push(['save']),restore:()=>calls.push(['restore'])
    })
  };
  c.ownerDocument={createElement:()=>canvas()};
  return c;
}
test('Private source portals are marked only at reciprocal authored map tiles',()=>{
  const source=fixture(),compiled=compileCampaignTransmissionMarkers(compileCampaignWorld(source));
  assert.deepEqual(compiled.mapIds,['A00','A01']);
  const [locked]=compiled.statesFor('A00',{});
  assert.deepEqual(locked,{id:'link_east',x:160,y:96,locked:true});
  assert.deepEqual(compiled.statesFor('A00',{relay_active:true})[0],
    {...locked,locked:false});
  assert.equal(compiled.statesFor('A01',{})[0].locked,false);
  assert.deepEqual(compiled.statesFor('not_an_area',{}),[]);
});
test('Markers remain opt-in and update in place when a gate opens',()=>{
  const painter=createCampaignTransmissionPainter(compileCampaignWorld(fixture()));
  const base=canvas(),game={m:{id:'A00'},base};
  assert.equal(painter.paint(game,{}),true);
  assert.equal(base.calls.some(c=>c[0]==='color'&&c[1]==='#c89a5e'),true);
  const originalCount=base.calls.length;
  assert.equal(painter.paint(game,{}),false,'Unchanged game frame must not repaint');
  assert.equal(base.calls.length,originalCount);
  assert.equal(painter.paint(game,{relay_active:true}),true);
  assert.equal(base.calls.some(c=>c[0]==='color'&&c[1]==='#91ccd0'),true);
  assert.equal(base.calls.filter(x=>x[0]==='drawImage').length,2,
    'Gate changes must restore untouched world floor before repaint');
  assert.equal(painter.paint(game,{relay_active:true}),false);
});
test('No canvas, wrong map, or mismatched native pixel dimensions are no-ops',()=>{
  const painter=createCampaignTransmissionPainter(compileCampaignWorld(fixture()));
  assert.equal(painter.paint({m:{id:'A00'}},{}),false);
  assert.equal(painter.paint({m:{id:'unknown'},base:canvas()},{}),false);
  const wrong=canvas();wrong.width=128;
  assert.equal(painter.paint({m:{id:'A00'},base:wrong},{}),false);
});
test('Invisible wrong-map portals are rejected by graph validation',()=>{
  const world=fixture();
  world.maps[0].layers[1].objects[0].properties[0].value='not_an_area';
  assert.throws(()=>compileCampaignTransmissionMarkers(compileCampaignWorld(world)),/nonreciprocal route/);
});
test('Markers never mutate underlying portal gates or source map arrays',()=>{
  const world=fixture(),before=JSON.stringify(world),p=createCampaignTransmissionPainter(compileCampaignWorld(world));
  const g={m:{id:'A00'},base:canvas()};
  p.paint(g,{relay_active:true});
  p.paint(g,{relay_active:false});
  assert.equal(JSON.stringify(world),before);
});

test('Existing campaign mission loop paints gate indicators without changing travel',()=>{
  const source=fixture();let flags={},updates=0,portals=0;
  const factory=createCampaignMissionFactory(source,{
    getWorld:()=>({flags}),onUpdate:()=>updates++,onPortal:()=>portals++
  });
  const base=canvas();
  const g={m:{id:'A00'},base,mode:'dialog',player:{x:80,y:80,hidden:null}};
  const mission=factory.missionForSync('A00');
  mission.update(g,1/60);
  assert.equal(base.calls.length,0,'Dialogue should not change field presentation');
  g.mode='play';mission.update(g,1/60);
  assert.equal(base.calls.some(x=>x[0]==='color'&&x[1]==='#c89a5e'),true);
  assert.equal(updates,1,'Existing mission update callback still executes');
  assert.equal(portals,1,'Existing portal proximity detection still executes');
  flags={relay_active:true};
  mission.update(g,1/60);
  assert.equal(base.calls.some(x=>x[0]==='color'&&x[1]==='#91ccd0'),true,
    'Quest milestone changes actual live transmission marker');
  assert.equal(updates,2);
  assert.equal(JSON.stringify(source),JSON.stringify(fixture()),'Source map remains unchanged');
});
