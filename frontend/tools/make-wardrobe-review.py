"""Compose actual native wardrobe test frames; no sprite repainting."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,argparse
ap=argparse.ArgumentParser();ap.add_argument('renders',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
meta=json.loads((a.renders/'preview-index.json').read_text());items=[x for x in meta if x['kind']=='wardrobe'];font=ImageFont.truetype('DejaVuSans.ttf',16)
assert items,'Native tests must finish before composing a preview'
frames=[]
for i in range(6):
 cv=Image.new('RGB',(832,190*len(items)),'#202630');d=ImageDraw.Draw(cv)
 for row,item in enumerate(items):
  y=row*190;d.text((10,y+6),item['name'],font=font,fill='white')
  for col,direction in enumerate(['down','up','right','left']):
   im=Image.open(a.renders/'frames'/str(item['index'])/f'wardrobe-{direction}-{i}.png');im=im.resize((80,140),Image.Resampling.NEAREST);cv.paste(im,(100+col*180,y+32),im);d.text((104+col*180,y+171),direction,font=font,fill='#b8c7cf')
 frames.append(cv)
frames[0].save(a.output/'wardrobe-options.gif',save_all=True,append_images=frames[1:],loop=0,duration=125,optimize=False)
frames[1].save(a.output/'wardrobe-options.png')
