#!/usr/bin/env python3
"""Install an owner-supplied narrative package into ignored, offline game assets.

No screenplay or campaign identifiers are embedded in this importer. CSV records
remain verbatim; only a separately derived runtime index is added.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re

FILES = {
    'dialogue': 'Story/02_DIALOGUE.csv',
    'quests': 'Game_Data/03_QUESTS.csv',
    'encounters': 'Game_Data/04_ENCOUNTERS.csv',
    'areas': 'Game_Data/06_AREAS.csv',
    'insertions': 'Game_Data/13_SCENE_INSERTIONS.csv',
    'storyboards': 'Story/05_STORYBOARDS.csv',
}

def unique(rows, key, label):
    values = [r[key] for r in rows]
    if len(values) != len(set(values)):
        raise ValueError('Duplicate ' + label)

def import_campaign(root):
    root = Path(root)
    manifest = json.loads((root / 'QA_MANIFEST.json').read_text())
    # Refuse altered approved input; never normalize or rewrite source files.
    hashes = manifest['file_hashes']
    for name, expected in hashes.items():
        path = root / name
        if root.resolve() not in path.resolve().parents:
            raise ValueError('Invalid source path')
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Source hash mismatch: ' + name)
    tables = {}
    for key, name in FILES.items():
        with (root / name).open(newline='', encoding='utf-8-sig') as stream:
            tables[key] = list(csv.DictReader(stream))
    flags = json.loads((root / 'Game_Data/07_STORY_FLAGS.json').read_text())
    choices = json.loads((root / 'Game_Data/14_CHOICE_CONTRACTS.json').read_text())
    screenplay = (root / 'Story/02_SCENE_SCREENPLAY.md').read_text()
    headings = list(re.finditer(r'^### (SC-\d+) — (.+)$', screenplay, re.M))
    scenes = []
    for i, heading in enumerate(headings):
        block = screenplay[heading.end():headings[i+1].start() if i+1 < len(headings) else len(screenplay)]
        metadata = re.search(r'\*\*Location:\*\* (.*?)\s*\|\s*\*\*Trigger:\*\* `([^`]+)`\s*\|\s*\*\*Sets:\*\* `([^`]*)`', block)
        if not metadata:
            raise ValueError('Missing scene metadata')
        scenes.append({'id': heading[1], 'title': heading[2],
                       'location': metadata[1], 'trigger': metadata[2],
                       'sets': metadata[3], 'screenplay': block,
                       'dialogue': [x['line_id'] for x in tables['dialogue'] if x['scene_id'] == heading[1]]})
    unique(scenes, 'id', 'scene')
    for key, column in [('dialogue', 'line_id'), ('quests', 'id'), ('encounters', 'id'),
                        ('areas', 'id'), ('insertions', 'scene_id'), ('storyboards', 'shot_id')]:
        unique(tables[key], column, key)
    scene_ids = [s['id'] for s in scenes]
    area_ids = {a['id'] for a in tables['areas']}
    for row in tables['insertions']:
        if row['scene_id'] not in scene_ids or row['insert_after_scene'] not in scene_ids:
            raise ValueError('Unknown insertion dependency')
        if scene_ids.index(row['scene_id']) != scene_ids.index(row['insert_after_scene']) + 1:
            raise ValueError('Insertion order mismatch')
    for row in tables['dialogue']:
        # Ambient and side conversations are retained even without staged scenes.
        if row['category'] == 'main' and row['scene_id'] not in scene_ids:
            raise ValueError('Dialogue references unknown scene')
    for row in tables['encounters']:
        if row['area'] not in area_ids:
            raise ValueError('Encounter references unknown area')
    for row in tables['areas']:
        if any(x and x not in area_ids for x in row['connected_to'].split(';')):
            raise ValueError('Area references unknown destination')
    counts = {'staged_scenes': len(scenes), 'dialogue_lines': len(tables['dialogue']),
              'quests': len(tables['quests']), 'encounters': len(tables['encounters']),
              'textual_storyboard_shots': len(tables['storyboards']), 'areas': len(tables['areas']),
              'choice_contracts': len(choices['choices'])}
    if counts != manifest['totals']:
        raise ValueError('Source totals mismatch')
    for choice in choices['choices']:
        if any(x not in scene_ids for x in choice['scene'].split('/')):
            raise ValueError('Choice references unknown scene')
        # An explicit numeric runtime field; source prompt/options remain exact.
        choice['selection_count'] = 2 if re.search(r'choose two\b', choice['prompt'], re.I) else 1
    return {'schemaVersion': 1, 'revision': 2, 'sourceHashes': hashes,
            'scenes': scenes, **tables, 'flagSchema': flags, 'choices': choices['choices'],
            'counts': counts}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'public/assets/aeon/story/campaign.json')
    args = parser.parse_args()
    content = import_campaign(args.source)
    data = (json.dumps(content, ensure_ascii=False, indent=2) + '\n').encode()
    if args.output.exists() and args.output.read_bytes() != data:
        raise SystemExit('Refusing to overwrite differing installed narrative content')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(data)
    print(json.dumps({'ok': True, 'counts': content['counts'],
                      'sha256': hashlib.sha256(data).hexdigest()}))

if __name__ == '__main__':
    main()
