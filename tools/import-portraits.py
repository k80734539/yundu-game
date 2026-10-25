from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib,sys
sys.path.insert(0,str(Path.home()/'.codex/skills/generate2dsprite/scripts'))
import forge_matte
root=Path('docs/art/portraits-v28')
plan=json.loads((root/'crop-plan.json').read_text())
qa=[]
for row in plan['portraits']:
 key=row['character'];index=row['view'];name=Path(row['path']).name;box=row['sourceCrop'];meta=json.loads((root/(key+'-keyed')/'animation.json').read_text());frame=meta['frames'][index];im=Image.open(root/(key+'-keyed')/frame['file']).convert('RGBA');ox,oy=frame['sheet_origin'];im=im.crop([box[0]-ox,box[1]-oy,box[2]-ox,box[3]-oy]).convert('RGBa').resize((512,512),Image.Resampling.LANCZOS).convert('RGBA')
 a=np.array(im);rgb=a[:,:,:3].astype(int);protect=(rgb[:,:,0]-rgb[:,:,2]>20)&(rgb[:,:,1]>110)
 before=forge_matte.matte_qa(im,'magenta');pixels,report=forge_matte.despill(im,'edge',radius=2,protect=protect,key='magenta');im=Image.fromarray(pixels);after=forge_matte.matte_qa(im,'magenta');im.save(Path('assets/img')/name,lossless=True,method=6)
 qa.append({'file':name,'edgeDespill':report,'before':before,'after':after,'protect':'warm real pink/skin: R-B>20 and G>110','alphaUnchanged':bool(np.array_equal(a[:,:,3],pixels[:,:,3]))})
 print(name,'ring',round(before['outer_ring_spill_fraction'],4),'->',round(after['outer_ring_spill_fraction'],4),'opaque key',after['opaque_key_px'])
(root/'matte-qa.json').write_text(json.dumps(qa,indent=2))
canvas=Image.new('RGB',(1280,530),'#243943');d=ImageDraw.Draw(canvas);font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',18)
labels=['青舟（三分之四）','白苓（三分之四）','雲纖（三分之四）','青舟（正面）','白苓（正面）']
for i,row in enumerate(plan['portraits']):
 im=Image.open(row['path']);im.thumbnail((240,240));canvas.paste(im,(i*256,25),im);d.text((i*256+15,280),labels[i],font=font,fill='white');im.thumbnail((120,120));canvas.paste(im,(i*256+64,335),im)
canvas.save(root/'portraits-preview.png')
