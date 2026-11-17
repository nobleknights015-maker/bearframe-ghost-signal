// Source-bound, read-only quest projection for the owner-installed campaign.
// Only flags explicitly declared by the private screenplay may reveal a quest.
// Ambiguous free-text requirements and unstaged outcomes are NEVER guessed.
// Does not write to saves or publish any quest dialogue/art in public source.
const validId=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(x)&&
  !['__proto__','prototype','constructor'].includes(x);
const validText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const fail=message=>{throw new TypeError('Campaign quest staging: '+message);};

export function compileCampaignQuestJournal(content,worldSpec={}){
  const authored=content?.quests??[];
  const bindings=worldSpec?.questBindings??[];
  const declared=content?.flagSchema?.gameplay_flags;
  if(!Array.isArray(authored)||authored.length>512||!Array.isArray(declared)||
     declared.some(flag=>!validId(flag))||new Set(declared).size!==declared.length)
    fail('invalid private quest and flag contract');
  if(!Array.isArray(bindings)||bindings.length>512)
    fail('invalid owner quest bindings');
  const source=new Map(),titles=new Set();
  for(const quest of authored){
    if(!quest||!validId(quest.id)||source.has(quest.id)||
       !validText(quest.title,256)||!validText(quest.player_objective,1024)||
       titles.has(quest.title))
      fail('duplicate or invalid authored quest');
    source.set(quest.id,quest);titles.add(quest.title);
  }
  const known=new Set(declared),overrides=new Map();
  for(const binding of bindings){
    if(!binding||!validId(binding.questId)||!source.has(binding.questId)||
       overrides.has(binding.questId)||!['startFlag','completeFlag','questId']
         .every(key=>Object.hasOwn(binding,key)||key!=='questId')||
       (!Object.hasOwn(binding,'startFlag')&&!Object.hasOwn(binding,'completeFlag')))
      fail('invalid or duplicate authored quest binding');
    for(const key of ['startFlag','completeFlag']){
      if(Object.hasOwn(binding,key)&&(!validId(binding[key])||!known.has(binding[key])))
        fail('quest binding references undeclared flag');
    }
    overrides.set(binding.questId,binding);
  }
  const staged=[];
  for(const quest of authored){
    const binding=overrides.get(quest.id);
    // Source fields are identifiers only when EXACTLY present in the
    // authoritative declared-flag registry; prose/complex expressions
    // must have explicit owner-authored overrides.
    const rawStart=binding?.startFlag??quest.start_trigger;
    const rawComplete=binding?.completeFlag??quest.completion_flags;
    if(!known.has(rawStart)||!known.has(rawComplete))continue;
    staged.push(Object.freeze({
      id:quest.id,title:quest.title,objective:quest.player_objective,
      startFlag:rawStart,completeFlag:rawComplete
    }));
  }
  return Object.freeze({
    sourceCount:authored.length,stagedCount:staged.length,
    project(flags={}){
      if(!flags||typeof flags!=='object'||Array.isArray(flags))flags={};
      return Object.fromEntries(staged.filter(q=>flags[q.startFlag]===true||
        flags[q.completeFlag]===true).map(q=>[
          q.title,(flags[q.completeFlag]===true?'COMPLETE':'ACTIVE')+
            ' — '+q.objective
        ]));
    }
  });
}
