import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','assets','img');
const py=[
"import json,sys",
"from pathlib import Path",
"from PIL import Image",
"import numpy as np",
"from scipy import ndimage",
"root=Path(sys.argv[1])",
"spec={'ui_intent_tail.webp':(128,128),'ui_intent_charge.webp':(128,128),'ui_intent_wave.webp':(128,128),'ui_intent_stagger.webp':(128,128),'ui_intent_drink.webp':(128,128),'ui_intent_whirl.webp':(128,128),'ui_tide_ebb.webp':(128,128),'ui_tide_mid.webp':(128,128),'ui_tide_rise.webp':(128,128),'ui_qi_empty.webp':(96,96),'ui_qi_full.webp':(96,96),'ui_tide_gauge.webp':(64,320),'ui_tide_marker.webp':(48,48),'fx_tail_sweep.webp':(768,384),'fx_wave_big.webp':(1536,512),'fx_splash.webp':(512,512),'fx_charge_ring.webp':(512,512),'hebo_wave.webp':(512,512)}",
"out={}",
"for name,wh in spec.items():",
" im=Image.open(root/name).convert('RGBA'); assert im.size==wh,(name,im.size,wh)",
" a=np.asarray(im.getchannel('A')); assert (a==0).any() and (a>0).any(),name+' alpha'",
" labels,n=ndimage.label(a>0,structure=np.ones((3,3),dtype=np.uint8)); counts=np.bincount(labels.ravel())[1:]; small=[int(x) for x in counts if x<30]",
" assert not small,(name,'small disconnected alpha components',small)",
" ys,xs=np.where(a>0); bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]; out[name]={'size':list(im.size),'bbox':bbox,'components':int(n)}",
"for name in ['fx_tail_sweep.webp','fx_wave_big.webp','fx_splash.webp','fx_charge_ring.webp','hebo_wave.webp']:",
" x,y,r,b=out[name]['bbox']; w,h=spec[name]; assert x>=4 and y>=4 and r<=w-4 and b<=h-4,(name,'touches edge',out[name]['bbox'])",
"pose=out['hebo_wave.webp']['bbox']; idle=Image.open(root/'hebo_idle0.webp').convert('RGBA').getchannel('A').getbbox(); pw=pose[2]-pose[0]; iw=idle[2]-idle[0]",
"assert abs(pose[3]-476)<=6,('foot baseline',pose); assert abs((pose[0]+pose[2])/2-256)<=20,('horizontal center',pose); assert .9<=pw/iw<=1.1,('visible width ratio',pw/iw)",
"print(json.dumps({'assets':out,'idle_bbox':idle,'wave_width_ratio':pw/iw},ensure_ascii=False))"
].join('\n');
export async function heboUiFx(){
const r=spawnSync('python3',['-c',py,here],{encoding:'utf8'});
if(r.status!==0)throw new Error(r.stderr||r.stdout||'image validation failed');
const result=JSON.parse(r.stdout);
console.log('PASS: '+Object.keys(result.assets).length+' images meet size, alpha, component, and edge checks.');
console.log('PASS: hebo_wave alignment (width ratio '+(result.wave_width_ratio*100).toFixed(1)+'%, center and foot baseline).');
for(const [name,v] of Object.entries(result.assets))console.log(name+': '+v.size[0]+'x'+v.size[1]+', '+v.components+' alpha component(s), bbox '+v.bbox.join(','));
return true}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await heboUiFx();
