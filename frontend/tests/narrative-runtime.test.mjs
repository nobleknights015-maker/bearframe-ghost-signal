import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrativeState,beginNarrativeScene,nextNarrativeScene,narrativeLines,
 acknowledgeNarrativeLine,applyNarrativeChoice,completeNarrativeScene,
 skipOptionalNarrativeScene,narrativeCondition} from '../public/js/engine/narrative-runtime.js';
const fixture=()=>({schemaVersion:1,revision:2,
 flagSchema:{gameplay_flags:['started','opened','visited'],exclusive_enums:{route:['unset','left','right']},relationships:{trust:{initial:0,min:0,max:3}}},
 scenes:[{id:'scene-start',trigger:'START',sets:'started',dialogue:['line-one','line-two','line-three']},
 {id:'scene-insert',trigger:'INSPECT',sets:'visited',dialogue:[]},
 {id:'scene-next',trigger:'ENTER',sets:'',dialogue:[]}],
 insertions:[{scene_id:'scene-insert',insert_after_scene:'scene-start',optional:'True',requires:'started',sets:'visited'}],
 dialogue:[{line_id:'line-one',scene_id:'scene-start',sequence:'1',condition:'',text:'First.',event_effects:'opened'},
 {line_id:'line-two',scene_id:'scene-start',sequence:'2',condition:'opened',text:'Second.',event_effects:''},
 {line_id:'line-three',scene_id:'scene-start',sequence:'3',condition:'route==right',text:'Branch.',event_effects:''}],
 choices:[{id:'choice-route',scene:'scene-start',selection_count:1,options:{LEFT:'route=left',RIGHT:'route=right'}}]});
function begin(content,state=createNarrativeState(content)){
 return beginNarrativeScene(content,state,'scene-start',{trigger:'START'});
}
function read(content,state){
 while(true){const line=narrativeLines(content,state).find(x=>!state.linesRead[x.line_id]);if(!line)return state;
 state=acknowledgeNarrativeLine(content,state,line.line_id);}
}
test('migration fills new defaults without resetting old flags, enum, party or completed scenes',()=>{
 const content=fixture(),prior={flags:{opened:true,legacy_flag:true},enums:{route:'right'},completed:{older:true},party:['kept'],relationships:{trust:2}};
 const migrated=createNarrativeState(content,prior);
 assert.equal(migrated.flags.started,false);assert.equal(migrated.flags.opened,true);
 assert.equal(migrated.enums.route,'right');assert.deepEqual(migrated.party,['kept']);
 assert.equal(migrated.relationships.trust,2);assert.equal(migrated.completed.older,true);
 assert.equal(prior.flags.started,undefined);
 assert.throws(()=>createNarrativeState(content,{enums:{route:'bad'}}),/Invalid saved/);
});
test('scene trigger and authored insertion chronology gate progression',()=>{
 const content=fixture(),state=createNarrativeState(content);
 assert.equal(nextNarrativeScene(content,state).id,'scene-start');
 assert.throws(()=>beginNarrativeScene(content,state,'scene-next',{trigger:'ENTER'}),/milestone/);
 assert.throws(()=>beginNarrativeScene(content,state,'scene-start',{trigger:'WRONG'}),/trigger/);
 let active=begin(content,state);
 assert.throws(()=>completeNarrativeScene(content,active),/unread/);
 assert.throws(()=>acknowledgeNarrativeLine(content,active,'line-two'),/sequence/);
 active=read(content,active);
 assert.throws(()=>completeNarrativeScene(content,active),/choice/);
 active=applyNarrativeChoice(content,active,'choice-route','LEFT');
 const done=completeNarrativeScene(content,active);
 assert.equal(done.flags.started,true);assert.equal(done.activeScene,null);
 assert.equal(nextNarrativeScene(content,done).id,'scene-insert');
 const skipped=skipOptionalNarrativeScene(content,done,'scene-insert');
 assert.equal(nextNarrativeScene(content,skipped).id,'scene-next');
 assert.equal(skipped.flags.visited,false);
 assert.throws(()=>skipOptionalNarrativeScene(content,skipped,'scene-next'),/optional/);
});
test('dialogue effects are exactly once and branches follow confirmed choice',()=>{
 const content=fixture();let state=begin(content);
 state=acknowledgeNarrativeLine(content,state,'line-one');
 assert.equal(state.flags.opened,true);
 assert.deepEqual(acknowledgeNarrativeLine(content,state,'line-one'),state);
 state=applyNarrativeChoice(content,state,'choice-route','RIGHT');
 assert.equal(narrativeLines(content,state).length,3);
 assert.throws(()=>applyNarrativeChoice(content,state,'choice-route','LEFT'),/committed/);
 state=read(content,state);state=completeNarrativeScene(content,state);
 const previous=structuredClone(state);
 assert.deepEqual(completeNarrativeScene(content,state,'scene-start'),previous);
 assert.deepEqual(state,previous);
});
test('multi-select contract requires exact distinct option count and is atomic',()=>{
 const content=fixture();content.choices[0]={id:'choice-route',scene:'scene-start',selection_count:2,
 options:{ONE:'opened=true',TWO:'visited=true',BAD:'opened=false;route=invalid'}};
 const state=begin(content),prior=structuredClone(state);
 assert.throws(()=>applyNarrativeChoice(content,state,'choice-route',['ONE']),/selection/);
 assert.throws(()=>applyNarrativeChoice(content,state,'choice-route',['ONE','ONE']),/selection/);
 assert.throws(()=>applyNarrativeChoice(content,state,'choice-route',['ONE','BAD']),/enum/);
 assert.deepEqual(state,prior);
 const next=applyNarrativeChoice(content,state,'choice-route',['ONE','TWO']);
 assert.equal(next.flags.opened,true);assert.equal(next.flags.visited,true);
});
test('unsupported expression and prototype assignment fail without executing source',()=>{
 const content=fixture(),state=begin(content);
 assert.throws(()=>narrativeCondition(state,'started || true'),/Unsupported/);
 assert.throws(()=>narrativeCondition(state,'constructor'),/identifier/);
 assert.equal(narrativeCondition(state,'route=unset'),true);
 content.dialogue[0].event_effects='__proto__=polluted';
 assert.throws(()=>acknowledgeNarrativeLine(content,state,'line-one'));
 assert.equal({}.polluted,undefined);assert.equal(state.flags.opened,false);
});
