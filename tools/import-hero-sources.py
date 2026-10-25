from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json
root=Path('docs/art/heroes-v27')
plan=json.loads((root/'import-plan.json').read_text());records=[]
for key,names in plan['names'].items():
 frames=root/(key+'-keyed')/'frames'
 rest=np.array(Image.open(frames/'frame-00.png').convert('RGBA'));ys,xs=np.where(rest[:,:,3]>=128);restGround=int(ys.max()+1)
 restTop=plan['qzdBodyTop'] if key=='qzd' else int(ys.min())
 factor=270/(restGround-restTop)
 for i,name in enumerate(names):
  p=frames/('frame-%02d.png'%i);im=Image.open(p).convert('RGBA');a=np.array(im);ys,xs=np.where(a[:,:,3]>=128);ground=int(ys.max()+1)
  xx=xs[ys>=ground-plan[key+'FootBand']];anchor=[float((xx.min()+xx.max()+1)/2),float(ground)]
  if key=='qzd' and str(i) in plan['qzdOverrides']:anchor=plan['qzdOverrides'][str(i)]
  w,h=[round(n*factor) for n in im.size]
  scaled=im.convert('RGBa').resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')
  x=240-round(anchor[0]*factor);y=355-round(anchor[1]*factor)
  canvas=Image.new('RGBA',(480,420));canvas.paste(scaled,(x,y))
  before=np.array(scaled)[:,:,3];after=np.array(canvas)[:,:,3]
  assert int(before.sum())==int(after.sum()),(key,name,'clipped art')
  mask=after>16;yy,xx=np.where(mask);box=[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]
  assert box[0]>2 and box[1]>2 and box[2]<478 and box[3]<418,(key,name,box)
  out=Path('assets/img')/(key+'_'+name+'.webp');canvas.save(out,lossless=True,method=6)
  records.append({'key':key,'pose':name,'scale':factor,'source':str(p),'sourceAnchor':anchor,'outputAnchor':[240,355],'bounds':box,'clippedAlpha':0,'colorGrade':'none','path':str(out)})
(root/'registration.json').write_text(json.dumps(records,indent=2))
preview=Image.new('RGB',(1500,510),'#69747a');d=ImageDraw.Draw(preview)
for i,r in enumerate(records):
 row=i//10;col=i%10
 im=Image.open(r['path']);im.thumbnail((150,145));preview.paste(im,(col*150,row*170),im);d.text((col*150+5,row*170+148),r['key']+' '+r['pose'],fill='white')
preview.save(root/'poses-preview.png')
print('Exported',len(records),'RGBA frames; 480x420, shared foot root; no clipped alpha')
