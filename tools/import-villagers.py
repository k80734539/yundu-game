"""Package user-provided villager art; no generated poses or recolouring."""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path.home()/'.codex/skills/generate2dsprite/scripts'))
import forge_matte
ROOT=Path('docs/art/villagers-v32')
PLAN={
 'lin':{'name':'林嬸','height':156,'portrait':[35,90,385,440]},
 'zhou':{'name':'老周','height':162,'portrait':[470,0,970,500]},
 'granny':{'name':'阿婆','height':146,'portrait':[240,70,800,630]},
 'chief':{'name':'村長','height':164,'portrait':[240,0,840,600]},
 'wang':{'name':'王大叔','height':164,'portrait':[440,0,960,520]},
}
def resize(im,size):return im.convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA')
reports=[]
for key,p in PLAN.items():
 meta=json.loads((ROOT/(key+'-keyed')/'animation.json').read_text())
 im=Image.open(ROOT/(key+'-keyed')/meta['frames'][0]['file']).convert('RGBA')
 arr=np.array(im);rgb=arr[:,:,:3].astype(int)
 # Remove chroma-coloured painted ground shadows, keeping real low-saturation cloth.
 shadow=(np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]>65)&(rgb[:,:,1]<100)
 arr[shadow]=0;im=Image.fromarray(arr)
 protect=(rgb[:,:,0]-rgb[:,:,2]>20)&(rgb[:,:,1]>100)
 pixels,despill=forge_matte.despill(im,'edge',radius=2,protect=protect,key='magenta');im=Image.fromarray(pixels)
 bbox=Image.fromarray((np.array(im)[:,:,3]>160).astype('uint8')*255).getbbox()
 box=(max(0,bbox[0]-2),max(0,bbox[1]-2),min(im.width,bbox[2]+2),min(im.height,bbox[3]+1))
 body=im.crop(box);scale=p['height']/body.height;size=(round(body.width*scale),p['height'])
 frame=Image.new('RGBA',(192,192));frame.alpha_composite(resize(body,size),(96-size[0]//2,180-size[1]))
 portrait=resize(im.crop(p['portrait']),(512,512))
 row={'key':key,**p,'bodyCrop':box,'root':[96,180],'canvas':[192,192],'sourceScale':scale,'despill':despill,'assets':[]}
 for kind,pic in [('npc',frame),('pt',portrait)]:
  pixels,finalDespill=forge_matte.despill(pic,'edge',radius=3,key='magenta');pic=Image.fromarray(pixels)
  filename=f'{kind}_{key}_v32.webp';target=Path('assets/img')/filename;pic.save(target,lossless=True,method=6)
  row['assets'].append({'kind':kind,'file':str(target),'qa':forge_matte.matte_qa(pic,'magenta'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 reports.append(row)
(ROOT/'manifest.json').write_text(json.dumps({'art_source':'existing','route':'user-provided images; chroma key, crop and premultiplied resize','characters':reports},ensure_ascii=False,indent=2),encoding='utf-8')
preview=Image.new('RGB',(1400,680),'#263b42');draw=ImageDraw.Draw(preview);font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',22)
for i,(key,p) in enumerate(PLAN.items()):
 portrait=Image.open(f'assets/img/pt_{key}_v32.webp');portrait=resize(portrait,(260,260));preview.paste(portrait,(i*280+10,20),portrait)
 frame=Image.open(f'assets/img/npc_{key}_v32.webp');preview.paste(frame,(i*280+44,335),frame)
 small=resize(frame,(68,68));preview.paste(small,(i*280+106,560),small);draw.text((i*280+92,290),p['name'],font=font,fill='#f0dfb4')
preview.save(ROOT/'preview.jpg',quality=92)
for row in reports:
 for a in row['assets']:print(a['file'],'opaque key',a['qa']['opaque_key_px'],'ring',a['qa']['outer_ring_spill_fraction'])
