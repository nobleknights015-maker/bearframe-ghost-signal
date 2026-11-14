"""Compose original native chassis and character frames for visual review."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import argparse,json
ap=argparse.ArgumentParser();ap.add_argument('renders',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
meta=json.loads((a.renders/'preview-index.json').read_text());font=ImageFont.truetype('DejaVuSans.ttf',16)
def compose(items,name,style):
 frames=[]
 for i in range(6):
  cv=Image.new('RGB',(832,len(items)*190),'#202630');d=ImageDraw.Draw(cv)
  for row,item in enumerate(items):
   y=row*190;d.text((10,y+6),item['name'],font=font,fill='white')
   for col,direction in enumerate(['down','up','right','left']):
    im=Image.open(a.renders/'frames'/str(item['index'])/f'{style}-{direction}-{i}.png').resize((80,140),Image.Resampling.NEAREST);cv.paste(im,(100+col*180,y+32),im);d.text((104+col*180,y+171),direction,font=font,fill='#b8c7cf')
  frames.append(cv)
 frames[1].save(a.output/(name+'.png'));frames[0].save(a.output/(name+'.gif'),save_all=True,append_images=frames[1:],duration=125,loop=0,optimize=False)
compose([p for p in meta if p['kind']=='chassis'],'body-options','chassis')
characters=[p for p in meta if p['kind']=='character' and not p['name'].startswith('Bearframe')]
for i in range(0,len(characters),4):compose(characters[i:i+4],'characters-'+str(i//4+1),'character')
