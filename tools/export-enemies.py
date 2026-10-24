from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path('docs/art/enemies-v24'); config={};names=['idle0','idle1','cast','attack','hit','down']
for key,height in [('shui',120),('lu',170),('hebo',300)]:
 d=json.loads((root/('hebo-v2' if key=='hebo' else key)/'pipeline-meta.json').read_text());box=d['frames'][0]['aligned_bbox'];factor=height/(box[3]-box[1]);config[key]={'factor':factor,'x':256,'y':474,'size':512}
 for i,name in enumerate(names):
  im=Image.open(root/('hebo-v2' if key=='hebo' else key)/f'sheet-{i+1}.png').convert('RGBA');im.save(f'assets/img/{key}_{name}.webp',lossless=True)
 im=Image.open(root/('hebo-v2' if key=='hebo' else key)/'sheet-1.png').crop(box);im.resize((round(im.width*factor),height),Image.Resampling.LANCZOS).save(f'assets/img/{key}.webp',lossless=True)
 print(key,'qa',d['qa']['status'],'matte',d['matte']['qa_after_despill'])
(root/'runtime.json').write_text(json.dumps(config,indent=2))
preview=Image.new('RGB',(900,600),'#20333d')
for r,key in enumerate(['shui','lu','hebo']):
 for c in range(6):
  im=Image.open(root/('hebo-v2' if key=='hebo' else key)/f'sheet-{c+1}.png');im.thumbnail((145,175));preview.paste(im,(c*150,r*200+12),im)
  ImageDraw.Draw(preview).text((c*150+6,r*200+182),key+' '+names[c],fill='white')
preview.save(root/'preview.png')
