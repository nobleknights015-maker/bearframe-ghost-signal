"""Compare unmodified native test frames before/after the cloth shader change."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,argparse
ap=argparse.ArgumentParser();ap.add_argument('before',type=Path);ap.add_argument('after',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
items=[i for i in json.loads((a.after/'preview-index.json').read_text()) if i['kind']=='wardrobe'];font=ImageFont.truetype('DejaVuSans.ttf',15)
frames=[]
for i in range(6):
 cv=Image.new('RGB',(1080,240*len(items)),'#202630');d=ImageDraw.Draw(cv)
 for row,item in enumerate(items):
  y=row*240;d.text((8,y+4),item['name'],fill='white',font=font)
  for col,(path,label) in enumerate([(a.before,'BEFORE'),(a.after,'CAPE-STYLE FOLDS')]):
   x=col*540;d.text((x+8,y+27),label,fill='#b8c7cf' if col==0 else '#79d9df',font=font)
   for k,direction in enumerate(['down','up','right','left']):
    p=Image.open(path/'frames'/str(item['index'])/f'wardrobe-{direction}-{i}.png').resize((96,168),Image.Resampling.NEAREST);cv.paste(p,(x+24+k*128,y+55),p)
 frames.append(cv)
frames[1].save(a.output/'before-after.png')
frames[0].save(a.output/'before-after.gif',save_all=True,append_images=frames[1:],loop=0,duration=125,optimize=False)
