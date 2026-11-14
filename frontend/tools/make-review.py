"""Compose unmodified native test renders for review. Requires Pillow."""
import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('renders',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
try:font=ImageFont.truetype('DejaVuSans.ttf',16)
except OSError:font=ImageFont.load_default()
items=json.loads((a.renders/'preview-index.json').read_text())
def sprite(j,style,direction,i):return Image.open(a.renders/'frames'/str(j)/f'{style}-{direction}-{i}.png').convert('RGBA')
for kind,indices in [('humanoid',[0,1,2,3]),('machines',[4,5,6,7])]:
 cv=Image.new('RGB',(1040,1040),'#202630');d=ImageDraw.Draw(cv)
 for row,j in enumerate(indices):
  v=items[j];y=row*260;d.text((12,y+8),v['name'],font=font,fill='white')
  for col,style in enumerate(['classic','sleek']):
   x=col*520;d.text((x+12,y+36),style.upper(),font=font,fill='#74e2e6' if style=='sleek' else '#cccccc')
   for di,direction in enumerate(['down','up','right','left']):
    im=sprite(j,style,direction,1);scale=min(2,160/im.height,114/im.width);im=im.resize((int(im.width*scale),int(im.height*scale)),Image.Resampling.NEAREST)
    cv.paste(im,(x+di*128+(128-im.width)//2,y+65),im);d.text((x+di*128+38,y+231),direction,font=font,fill='#b8c7cf')
 cv.save(a.output/f'{kind}-comparison.png')
frames=[]
for i in range(6):
 im=Image.new('RGB',(800,300),'#202630');d=ImageDraw.Draw(im)
 for j,style in enumerate(['classic','sleek']):
  d.text((j*400+12,12),style.upper()+' / SAME WALK POSES',font=font,fill='white')
  for k,direction in enumerate(['down','up','right','left']):
   sp=sprite(0,style,direction,i).resize((96,168),Image.Resampling.NEAREST);im.paste(sp,(j*400+k*98+3,65),sp);d.text((j*400+k*98+10,255),direction,font=font,fill='#b8c7cf')
 frames.append(im)
frames[0].save(a.output/'humanoid-walk-comparison.gif',save_all=True,append_images=frames[1:],duration=125,loop=0,optimize=False)
