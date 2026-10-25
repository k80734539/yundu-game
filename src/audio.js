'use strict';
// Original synthesized battle cues. Used as fallback when supplied effects are not loaded.
const SFX={ctx:null,bus:null,noise:null,muted:false,voices:new Set(),buffers:new Map(),loading:new Map(),failed:new Set(),warm:false};
try{SFX.muted=localStorage.getItem('yundu_sound')==='off'}catch(e){}
function soundUnlock(){
 if(SFX.muted&&MUSIC.muted)return;
 try{if(!SFX.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=SFX.ctx=new AC();SFX.bus=c.createGain();SFX.bus.gain.value=SFX.muted?0:.22;SFX.bus.connect(c.destination);MUSIC.bus=c.createGain();MUSIC.bus.gain.value=MUSIC.muted?0:.22;MUSIC.bus.connect(c.destination);
  const buffer=SFX.noise=c.createBuffer(1,c.sampleRate*.5,c.sampleRate),data=buffer.getChannelData(0);let seed=91;
  for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}}
 if(SFX.ctx.state!=='running')SFX.ctx.resume().then(()=>{audioSyncTracks();warmSfx()}).catch(()=>{});else{audioSyncTracks();warmSfx()}
 }catch(e){/* Audio is optional on unsupported devices. */}
}
function soundTone(hz,end,dur,vol,offset=0,type='sine'){
 const c=SFX.ctx;if(SFX.muted||!c||c.state!=='running'||document.hidden||SFX.voices.size>=16)return;
 const at=c.currentTime+offset,source=hz?c.createOscillator():c.createBufferSource(),gain=c.createGain();
 if(hz){source.type=type;source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+dur)}
 else{source.buffer=SFX.noise;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=end;source.connect(filter);filter.connect(gain)}
 if(hz)source.connect(gain);gain.connect(SFX.bus);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(vol,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
 SFX.voices.add(source);source.onended=()=>{SFX.voices.delete(source);source.disconnect();gain.disconnect()};source.start(at);source.stop(at+dur+.02);
}
function synthBattleSound(k,stage,big=false){
 if(stage==='start'){
  if(['slash','sweep','claw','tail','leaf'].includes(k))soundTone(0,1800,.13,.24);
  else if(['foxfire','wave','splash'].includes(k))soundTone(240,720,.22,.15);
  return;
 }
 if(k==='rain'||k==='item'){[660,830,990].forEach((hz,i)=>soundTone(hz,hz,.24,.14,i*.065));return}
 if(k==='guard'){soundTone(740,380,.2,.18,0,'triangle');return}
 if(k==='poison'){soundTone(180,110,.2,.12);return}
 const water=['splash','wave','tail'].includes(k),magic=k==='foxfire';
 soundTone(water?100:magic?210:150,water?45:65,big?.25:.15,big?.48:.3,0,'triangle');
 soundTone(0,water?900:magic?2400:1600,big?.24:.13,big?.35:.22);
 if(magic)soundTone(880,220,.25,.13);
}
