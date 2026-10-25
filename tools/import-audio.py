"""Prepare the user's music/SFX for the browser; keep source files unchanged."""
from pathlib import Path
import subprocess,json,hashlib,wave
import numpy as np
SRC=Path('C:/Users/aaron/Downloads/雲渡仙緣/音樂音效')
OUT=Path('assets/audio');OUT.mkdir(exist_ok=True)
TMP=Path('tests/out/audio-v33');TMP.mkdir(parents=True,exist_ok=True)
PLAN={
 'mist':('霧渡.mp3','music',None,None),
 'mist_alt':('霧渡1.mp3','music',None,None),
 'village':('蘆花渡.mp3','music',None,None),
 'night':('蘆葦蕩夜行.mp4','music',None,None),
 'battle':('破霧迎敵.mp3','music',None,None),
 'boss':('河伯怒潮.mp3','music',None,None),
 'river':('環境音amb_river.mp3','ambient',0,30),
 'insects':('蟲鳴聲.mp3','ambient',0,30),
 'level':('角色升級、修為突破、境界提升.mp3','sfx',0,1.65),
 'item':('使用藥水、服用丹藥、使用道具.mp3','sfx',.14,.7),
 'cancel':('取消操作、返回上一頁、關閉選單.mp3','sfx',0,.3),
 'move':('切換選單、移動選項、選擇物品.mp3','sfx',0,.2),
 'heal':('春霖治療.mp3','sfx',3.8,6),
 'leaf':('蘆葦飛葉.mp3','sfx',.3,1),
 'wave':('河伯巨浪.mp3','sfx',4.15,6.5),
 'down':('妖物消散.mp3','sfx',2.1,3.2),
 'critical':('(會心一擊.mp3','sfx',0,1.2),
 'water':('水彈命中.mp3','sfx',0,1),
 'fox':('狐火爆散.mp3','sfx',.5,2.45),
 'gather':('靈力聚集.mp3','sfx',.3,1.7),
 'wood':('實木打擊.mp3','sfx',.02,.65),
 'pole':('竹篙攻擊).mp3','sfx',.48,1.05),
}
rows=[];catalog={}
for key,(filename,kind,start,end) in PLAN.items():
 source=SRC/filename;rate=22050 if kind=='ambient' else 44100;channels=2 if kind=='music' else 1
 pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vn','-ac',str(channels),'-ar',str(rate),'-f','f32le','-']),dtype='<f4').reshape(-1,channels).copy()
 source_duration=len(pcm)/rate
 if kind=='music':
  blocks=pcm[:len(pcm)//882*882].reshape(-1,882*channels);rms=np.sqrt(np.mean(blocks**2,axis=1));active=np.where(rms>max(.002,float(rms.max())*.025))[0]
  start=max(0,float(active[0])*.02-.08);end=min(source_duration,float(active[-1])*.02+.35)
 pcm=pcm[round(start*rate):round(end*rate)]
 crossfade=0
 if kind!='sfx':
  crossfade=2 if kind=='music' else .3;n=min(round(crossfade*rate),len(pcm)//4);ramp=np.linspace(0,1,n,dtype=np.float32)[:,None]
  seam=pcm[-n:]*(1-ramp)+pcm[:n]*ramp;pcm=np.concatenate([pcm[n:-n],seam])
 else:
  fade=min(round(rate*.008),len(pcm)//4);pcm[:fade]*=np.linspace(0,1,fade)[:,None]
  fade=min(round(rate*.1),len(pcm)//4);pcm[-fade:]*=np.linspace(1,0,fade)[:,None]
 rms=float(np.sqrt(np.mean(pcm**2)));peak=float(np.max(abs(pcm)));target=.1 if kind=='music' else .06 if kind=='ambient' else .11
 gain=min(target/max(.0001,rms),.88/max(.0001,peak));pcm*=gain
 wav=TMP/(key+'.wav')
 with wave.open(str(wav),'wb') as f:f.setnchannels(channels);f.setsampwidth(2);f.setframerate(rate);f.writeframes((np.clip(pcm,-1,1)*32767).astype('<i2').tobytes())
 dest=OUT/(key+'_v33.mp3');subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-map_metadata','-1','-c:a','libmp3lame','-b:a','128k' if kind=='music' else '64k' if kind=='ambient' else '96k',str(dest)],check=True)
 decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(dest),'-f','f32le','-']),dtype='<f4')
 wav.unlink(missing_ok=True)
 row={'key':key,'source':filename,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceDuration':source_duration,'kind':kind,'trim':[start,end],'crossfade':crossfade,'gain':gain,'duration':len(pcm)/rate,'sampleRate':rate,'channels':channels,'decodedPeak':float(np.max(abs(decoded))),'path':dest.as_posix(),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()};rows.append(row);catalog[key]=dest.as_posix()
 print(key,round(row['duration'],3),'seconds, peak',round(row['decodedPeak'],3))
Path('docs/audio/manifest-v33.json').write_text(json.dumps({'source':'user-provided recordings','files':rows},ensure_ascii=False,indent=2),encoding='utf-8')
Path('src/audio_assets.js').write_text("'use strict';\n// User-provided music and sound effects, prepared by tools/import-audio.py.\nconst AUDIO_ASSETS="+json.dumps(catalog,indent=1)+";\n",encoding='utf-8')
