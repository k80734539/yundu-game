from PIL import Image
from pathlib import Path
sources={'hebo':'4926A539-F11D-4821-9638-41D6E9E17D8B','lu':'369132A6-6953-42DE-BA57-F24EF101BE8A','shui':'ABD90FA1-DD48-4F74-9F68-CE1349D0568D'}
for key,name in sources.items():
 im=Image.open(Path('docs/art/enemies-v24')/(key+'-original.png')).convert('RGB')
 print(key,im.size)
 sheet=Image.new('RGB',(1800,1200),(255,0,255))
 for i in range(6):
  r,c=divmod(i,3);left=c*512;right=(c+1)*512
  if r==1 and key in ('hebo','lu'):
   left=[0,570,1010][c];right=[570,1010,1536][c]
  cell=im.crop((left,r*512,right,(500 if key=='hebo' and r==0 else (r+1)*512)));sheet.paste(cell,(c*600+(600-cell.width)//2,r*600+(600-cell.height)//2))
 sheet.save('docs/art/enemies-v24/'+key+('-source2.png' if key=='hebo' else '-source.png'))
