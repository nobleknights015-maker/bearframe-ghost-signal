import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const importer=fileURLToPath(new URL('../narrative-tools/import_campaign.py',import.meta.url));
test('offline narrative import verifies source hashes, chronology, totals and exact records',()=>{
 const output=execFileSync('python3',['-c',String.raw`
import csv, hashlib, importlib.util, json, pathlib, tempfile, sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('campaign', __import__('sys').argv[1]);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 tables={
 'dialogue':[{'line_id':'synthetic-line','scene_id':'SC-990','sequence':'1','category':'main','text':'Synthetic fixture only.','condition':'','event_effects':''}],
 'quests':[{'id':'synthetic-quest'}],
 'encounters':[{'id':'synthetic-encounter','area':'synthetic-area'}],
 'areas':[{'id':'synthetic-area','connected_to':''}],
 'insertions':[{'scene_id':'SC-901','insert_after_scene':'SC-990','optional':'True','requires':'','sets':''}],
 'storyboards':[{'shot_id':'synthetic-shot','scene_id':'SC-990'}]}
 for key,name in module.FILES.items():
  path=p/name;path.parent.mkdir(parents=True,exist_ok=True)
  with path.open('w',newline='') as f:
   writer=csv.DictWriter(f,fieldnames=list(tables[key][0]));writer.writeheader();writer.writerows(tables[key])
 def write(name,value):
  path=p/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(value)
 write('Game_Data/07_STORY_FLAGS.json',json.dumps({'gameplay_flags':[],'exclusive_enums':{},'relationships':{}}))
 write('Game_Data/14_CHOICE_CONTRACTS.json',json.dumps({'choices':[]}))
 first='### SC-990 — Synthetic first\n**Location:** Fixture | **Trigger:** '+chr(96)+'START'+chr(96)+' | **Sets:** '+chr(96)*2+'\n'
 second='### SC-901 — Synthetic inserted\n**Location:** Fixture | **Trigger:** '+chr(96)+'INSPECT'+chr(96)+' | **Sets:** '+chr(96)*2+'\n'
 write('Story/02_SCENE_SCREENPLAY.md',first+second)
 def manifest():
  paths=[x for x in p.rglob('*') if x.is_file() and x.name!='QA_MANIFEST.json']
  write('QA_MANIFEST.json',json.dumps({'file_hashes':{str(x.relative_to(p)):hashlib.sha256(x.read_bytes()).hexdigest() for x in paths},'totals':{'staged_scenes':2,'dialogue_lines':1,'quests':1,'encounters':1,'areas':1,'textual_storyboard_shots':1,'choice_contracts':0}}))
 manifest();result=module.import_campaign(p)
 assert [s['id'] for s in result['scenes']]==['SC-990','SC-901']
 assert result['dialogue']==tables['dialogue']
 write('Story/02_SCENE_SCREENPLAY.md',second+first)
 try:module.import_campaign(p);raise AssertionError('modified source accepted')
 except ValueError as e:assert 'hash mismatch' in str(e)
 manifest()
 try:module.import_campaign(p);raise AssertionError('wrong insertion accepted')
 except ValueError as e:assert 'Insertion order mismatch' in str(e)
 print('PASS')
`,importer],{encoding:'utf8'});
 assert.equal(output.trim(),'PASS');
});
