import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCampaignNarrative} from '../public/js/engine/campaign-narrative.js';

const fixture=()=>({
 schemaVersion:1,revision:2,
 flagSchema:{gameplay_flags:['read','finished','second'],exclusive_enums:{route:['unset','left','right']}},
 scenes:[{id:'opening',trigger:'WAKE',dialogue:['intro','branch'],sets:'finished'},
 {id:'following',trigger:'ENTER',dialogue:[],sets:'second'}],
 insertions:[],
 dialogue:[{line_id:'intro',speaker:'SYSTEM',text:'Synthetic opening.',sequence:1,condition:'',event_effects:'read'},
 {line_id:'branch',speaker:'GUIDE',text:'Synthetic branch.',sequence:2,condition:'route=right',event_effects:''}],
 choices:[{id:'route',scene:'opening',prompt:'Synthetic route?',selection_count:1,
 options:{LEFT:'route=left',RIGHT:'route=right'}}]
});
function host({content=fixture(),gates={route:{afterLine:'intro'}},allow=()=>true,...opts}={}){
 let world={flags:{legacy:true},inventory:['kept']},fail=false,writes=0;
 const game={mode:'play'},blocked=[],completed=[];
 const ui={say(lines,cb){this.lines=lines;this.lineCb=cb;this.choiceCb=null;},
 choose(prompt,options,cb){this.options=options;this.choiceCb=cb;this.lineCb=null;},
 show(){},pick(index){const cb=this.choiceCb;this.choiceCb=null;cb?.(index);}};
 const config={game,ui,content,choiceGates:gates,readWorld:()=>structuredClone(world),
 commitWorld(next){if(fail)return false;world=structuredClone(next);writes++;return true;},
 canComplete:allow,onBlocked:reason=>blocked.push(reason),onComplete:id=>completed.push(id),...opts};
 let controller=mountCampaignNarrative(config);
 return {game,ui,blocked,completed,content,get world(){return structuredClone(world);},
 get writes(){return writes;},get controller(){return controller;},
 fail(value){fail=value;},ack(){ui.lineCb();},pick(index){ui.pick(index);},
 reload(){controller.stop();controller=mountCampaignNarrative(config);return controller;}};
}
test('actual trigger, dialogue and choice progress durably in the staged order',()=>{
 const h=host();
 assert.equal(h.controller.trigger('WRONG'),false);assert.equal(h.writes,0);
 assert.equal(h.controller.trigger('WAKE'),true);assert.equal(h.game.mode,'dialog');
 assert.deepEqual(h.ui.lines,[{s:'SYSTEM',t:'Synthetic opening.'}]);
 assert.equal(h.world.narrative.flags.read,false);
 h.ack();assert.equal(h.game.mode,'choice');assert.equal(h.world.narrative.flags.read,true);
 assert.equal(h.world.flags.legacy,true);assert.deepEqual(h.world.inventory,['kept']);
 h.pick(1);assert.equal(h.world.narrative.enums.route,'right');assert.equal(h.game.mode,'dialog');
 h.ack();assert.equal(h.world.narrative.completed.opening,true);
 assert.equal(h.game.mode,'play');assert.deepEqual(h.completed,['opening']);
 assert.equal(h.world.narrative.completed.following,undefined);
 assert.equal(h.controller.trigger('WAKE'),false);
 assert.equal(h.controller.trigger('ENTER'),true);
 assert.equal(h.world.narrative.completed.following,true);
});
test('failed initial save never opens dialogue or publishes progression',()=>{
 const h=host();h.fail(true);
 assert.equal(h.controller.trigger('WAKE'),false);
 assert.equal(h.world.narrative,undefined);assert.equal(h.ui.lines,undefined);
 assert.equal(h.game.mode,'play');assert.deepEqual(h.blocked,['save']);
});
test('failed line acknowledgement replays the same line and ignores stale callbacks',()=>{
 const h=host();h.controller.trigger('WAKE');const old=h.ui.lineCb;
 h.fail(true);h.ack();assert.equal(h.world.narrative.flags.read,false);
 assert.equal(h.ui.lines[0].t,'Synthetic opening.');
 h.fail(false);old();assert.equal(h.world.narrative.flags.read,false);
 h.ack();assert.equal(h.world.narrative.flags.read,true);
 assert.equal(h.game.mode,'choice');
});
test('failed choice write applies neither branch nor effects, then retries once',()=>{
 const h=host();h.controller.trigger('WAKE');h.ack();const old=h.ui.choiceCb;
 h.fail(true);h.pick(1);
 assert.equal(h.world.narrative.enums.route,'unset');
 h.fail(false);old(0);assert.equal(h.world.narrative.enums.route,'unset');
 h.pick(0);assert.equal(h.world.narrative.enums.route,'left');
 assert.equal(h.world.narrative.completed.opening,true);
 assert.deepEqual(h.completed,['opening']);
});
test('multi-select drafts survive reload without applying partial effects',()=>{
 const content=fixture();content.choices[0]={id:'route',scene:'opening',prompt:'Choose two.',
 selection_count:2,options:{ONE:'route=right',TWO:'read',THREE:'route=left'}};
 const h=host({content});h.controller.trigger('WAKE');h.ack();h.pick(0);
 assert.deepEqual(h.world.narrative.choiceDrafts.route,['ONE']);
 assert.equal(h.world.narrative.enums.route,'unset');
 h.reload().resume();assert.deepEqual(h.ui.options,['TWO','THREE']);
 h.pick(0);assert.deepEqual(h.world.narrative.choices.route,['ONE','TWO']);
 assert.equal(h.world.narrative.enums.route,'right');
 assert.equal(h.world.narrative.choiceDrafts.route,undefined);
 h.ack();assert.equal(h.world.narrative.completed.opening,true);
});
test('scene completion waits for a saved external outcome and does not autoplay',()=>{
 let ready=false;const h=host({allow:()=>ready});
 h.controller.trigger('WAKE');h.ack();h.pick(0);
 assert.equal(h.world.narrative.flags.finished,false);
 assert.equal(h.world.narrative.activeScene,'opening');
 assert.equal(h.game.mode,'play');assert.ok(h.blocked.includes('completion'));
 ready=true;h.controller.resume();
 assert.equal(h.world.narrative.flags.finished,true);
 assert.equal(h.world.narrative.completed.following,undefined);
 h.controller.resume();assert.deepEqual(h.completed,['opening']);
});
test('completion write can be retried without repeating confirmed choices',()=>{
 // Fail only after the gated outcome is released.
 let ready=false;const x=host({allow:()=>ready});
 x.controller.trigger('WAKE');x.ack();x.pick(0);
 ready=true;x.fail(true);assert.equal(x.controller.resume(),false);
 assert.equal(x.world.narrative.completed.opening,undefined);
 assert.deepEqual(x.world.narrative.choices.route,['LEFT']);
 assert.deepEqual(x.ui.options,['RETRY']);
 x.fail(false);x.pick(0);
 assert.equal(x.world.narrative.completed.opening,true);
});
test('missing choice placement fails before any save or presentation',()=>{
 const h=host({gates:{}});
 assert.equal(h.controller.trigger('WAKE'),false);assert.equal(h.writes,0);
 assert.deepEqual(h.blocked,['staging']);
});
test('stop invalidates outstanding callbacks while preserving resumable state',()=>{
 const h=host();h.controller.trigger('WAKE');const old=h.ui.lineCb;
 h.controller.stop();old();
 assert.equal(h.world.narrative.flags.read,false);assert.equal(h.game.mode,'play');
 assert.equal(h.controller.trigger('WAKE'),false);
 h.reload().resume();h.ack();assert.equal(h.game.mode,'choice');
});
test('start-bound choices reveal their conditional opening lines after confirmation',()=>{
 const h=host({gates:{route:{afterLine:null}}});
 h.controller.trigger('WAKE');assert.equal(h.game.mode,'choice');
 h.pick(1);assert.equal(h.game.mode,'dialog');h.ack();h.ack();
 assert.equal(h.world.narrative.completed.opening,true);
});
