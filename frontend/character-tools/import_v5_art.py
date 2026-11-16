#!/usr/bin/env python3
"""Install owned v5 sprite atlases for *local QA*, never public release.

Usage:
  python3 frontend/character-tools/import_v5_art.py \
      /private/Aeon_Circuit_Animated_Asset_Polish_v5.zip \
      /private/Aeon_Circuit_Four_Starter_Selection_Crops.zip

No external dependencies; original ZIP bytes preserved. Existing differing files are
not overwritten. Files land under ignored frontend/public/assets/aeon/ only.
"""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile
from struct import unpack

ROOT = 'Aeon_Circuit_Animated_Asset_Polish_v5/'
IDS = tuple('sleeper_' + letter for letter in 'ABCD')
DIRS = ['down', 'left', 'right', 'up']
CLIPS = ('idle','attack','ranged','cast','guard','hit','down','victory','charge')

def sha256(data): return hashlib.sha256(data).hexdigest()

def png_size(raw):
    if not raw.startswith(b'\x89PNG\r\n\x1a\n') or len(raw) < 33:
        raise ValueError('Invalid PNG signature')
    width, height = unpack('>II', raw[16:24])
    if raw[24] != 8 or raw[25] != 6:
        raise ValueError('Expected native 8-bit RGBA PNG')
    return width, height

def install(art_zip, portrait_zip, output_root):
    output_root = Path(output_root).resolve()
    with ZipFile(art_zip) as art, ZipFile(portrait_zip) as portraits:
        if art.testzip() or portraits.testzip():
            raise ValueError('Asset archive CRC mismatch')
        manifest = json.loads(art.read(ROOT + 'asset-manifest.json'))
        if manifest.get('schema') != 'aeon.asset-library.v4':
            raise ValueError('Wrong Aeon v5 manifest schema')
        units = manifest.get('characters')
        if not isinstance(units,list) or len(units)!=42:
            raise ValueError('Expected exactly 42 v5 character identities')
        names = [u['id'] for u in units]
        if len(set(names)) != len(names) or any(n not in names for n in IDS):
            raise ValueError('Duplicate or missing Sleeper identity')
        idmap = {u['id']:u for u in units}
        checked = {}
        for u in units:
            for role in ('world','battle'):
                meta = u[role]
                rel = meta['src']
                if not isinstance(rel,str) or not rel.startswith('assets/'+('battlers' if role=='battle' else 'world')+'/') or \
                   not rel.endswith('.png') or '..' in rel:
                    raise ValueError('Unsafe art asset path: '+str(rel))
                payload = art.read(ROOT + rel)
                if sha256(payload)!=meta['sha256']:
                    raise ValueError('Art SHA-256 mismatch for '+u['id']+'/'+role)
                dims = png_size(payload)
                expected = meta['frameWidth']*meta['columns'],meta['frameHeight']*meta['rows']
                if dims!=expected:
                    raise ValueError('Art atlas dimensions changed for '+u['id']+'/'+role)
                if role=='world' and (meta['directions']!=DIRS or meta['walkColumns']!=list(range(1,9))):
                    raise ValueError('V5 world walk contract changed for '+u['id'])
                if role=='battle':
                    if meta['columns']!=6 or meta['rows']!=9:
                        raise ValueError('V5 battle sheet must be 6x9')
                    for i,clip in enumerate(CLIPS):
                        row=meta['animations'][clip]
                        if row['row']!=i or len(row['durationsMs'])!=row['frames'] or \
                           sum(row['durationsMs'])!=row['totalMs']:
                            raise ValueError('Invalid action exposures for '+u['id']+'/'+clip)
                checked[rel]=payload
        # Copy only rendered art and the runtime metadata/helpers, not source scripts,
        # references, QA screenshots, private storyboard data or unapproved portraits.
        for item in art.namelist():
            if item.startswith(ROOT+'assets/') and item.endswith('.png'):
                rel=item[len(ROOT):]
                if '..' in rel or rel.startswith('/'):
                    raise ValueError('Unsafe auxiliary asset path')
                checked.setdefault(rel,art.read(item))
        for extra in ('asset-manifest.json','engine-bindings.json',
                      'runtime/asset-library.mjs','runtime/action-player.mjs',
                      'runtime/engine-adapter.mjs','runtime/aeon-asset-runtime.mjs',
                      'runtime/battle-exchange.mjs'):
            checked[extra]=art.read(ROOT+extra)
        mapping=json.loads(portraits.read('starter_selection_manifest.json'))
        choices={row['id']:row for row in mapping['choices']}
        if set(choices)!=set(IDS):
            raise ValueError("Owner's four starter portraits are not identity-matched")
        for id in IDS:
            choice=choices[id]
            if choice['overworld_sprite_identity']!=id or choice['battle_sprite_identity']!=id:
                raise ValueError('Portrait-to-sprite ID mismatch for '+id)
            checked['portraits/'+id+'.png']=portraits.read(choice['bust_image'])
            png_size(checked['portraits/'+id+'.png'])
        # Validate *everything* before touching target. Never rewrite a different
        # approved user file; also detect collisions on repeated local installations.
        for rel,data in checked.items():
            target=(output_root/rel).resolve()
            if not target.is_relative_to(output_root):
                raise ValueError('Unsafe destination outside art bundle')
            if target.exists() and target.read_bytes()!=data:
                raise FileExistsError('Existing art differs; manual approval required: '+rel)
        for rel,data in checked.items():
            target=output_root/rel
            target.parent.mkdir(parents=True,exist_ok=True)
            if not target.exists(): target.write_bytes(data)
        return {'status':'v5-visual-review-candidate','characters':len(units),
                'originalAtlasHashes':84,'assets':len(checked),'starters':list(IDS),
                'destination':str(output_root),'sourceManifestSha256':sha256(art.read(ROOT+'asset-manifest.json'))}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('art_zip',type=Path)
    parser.add_argument('starter_portrait_zip',type=Path)
    parser.add_argument('--output-dir',type=Path,default=Path(__file__).resolve().parents[1]/'public/assets/aeon')
    a=parser.parse_args()
    print(json.dumps(install(a.art_zip,a.starter_portrait_zip,a.output_dir),indent=2))
if __name__ == '__main__': main()