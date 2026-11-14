"""Compose native ring test frames without rescaling the body to fit its new canvas."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import argparse,json
ap=argparse.ArgumentParser();ap.add_argument('renders',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
items=[p for p in json.loads((a.renders/'preview-index.json').read_text()) if p['kind']=='rings'];assert items
font=ImageFont.truetype('DejaVuSans.ttf',16);frames=[]
for i in range(6):
 cv=Image.new('RGB',(832,len(items)*240),'#202630');d=ImageDraw.Draw(cv)
 for row,item in enumerate(items):
  y=row*240;d.text((10,y+7),item['name'],font=font,fill='white')
  for col,direction in enumerate(['down','up','right','left']):
   im=Image.open(a.renders/'frames'/str(item['index'])/f'ring-{direction}-{i}.png');im=im.resize((round(im.width*1.2),round(im.height*1.2)),Image.Resampling.NEAREST)
   x=col*200+60+(100-im.width)//2;cv.paste(im,(x,y+209-im.height),im);d.text((col*200+88,y+217),direction,font=font,fill='#b8c7cf')
 frames.append(cv)
frames[1].save(a.output/'ring-options.png')
frames[0].save(a.output/'ring-options.gif',save_all=True,append_images=frames[1:],loop=0,duration=125,optimize=False)
