'use strict';
// Original synthesized battle cues. No downloads, autoplay, or changes to save data.
const SFX={ctx:null,bus:null,noise:null,muted:false,voices:new Set()};
try{SFX.muted=localStorage.getItem('yundu_sound')==='off'}catch(e){}
function soundUnlock(){
 if(SFX.muted)return;
 try{if(!SFX.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=SFX.ctx=new AC();SFX.bus=c.createGain();SFX.bus.gain.value=.22;SFX.bus.connect(c.destination);
  const buffer=SFX.noise=c.createBuffer(1,c.sampleRate*.5,c.sampleRate),data=buffer.getChannelData(0);let seed=91;
  for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}}
 if(SFX.ctx.state==='suspended')SFX.ctx.resume().catch(()=>{});
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
function battleSound(k,stage,big=false){
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
function soundToggle(){SFX.muted=!SFX.muted;try{localStorage.setItem('yundu_sound',SFX.muted?'off':'on')}catch(e){}
 if(SFX.bus)SFX.bus.gain.setValueAtTime(SFX.muted?0:.22,SFX.ctx.currentTime);
 if(SFX.muted){for(const v of SFX.voices)try{v.stop()}catch(e){}}else soundUnlock();soundLabel();
}
function soundSync(){const b=document.getElementById('soundBtn');if(b)b.hidden=!!(G.dlg||G.cut||G.cred||SV.p||!ready||!['title','map','battle'].includes(G.mode))}
function soundLabel(){const b=document.getElementById('soundBtn');if(b){b.textContent='音效：'+(SFX.muted?'關':'開');b.setAttribute('aria-pressed',String(!SFX.muted))}}
(function(){
 const style=document.createElement('style');style.textContent='#soundBtn[hidden]{display:none}#soundBtn{position:fixed;z-index:60;right:calc(8px + env(safe-area-inset-right));top:calc(5px + env(safe-area-inset-top));min-width:76px;min-height:44px;padding:6px 9px;border:1px solid #b6a16c;border-radius:7px;background:rgba(12,20,28,.9);color:#ead6a5;font:14px "PingFang TC",sans-serif;touch-action:manipulation}';document.head.appendChild(style);
 const b=document.createElement('button');b.id='soundBtn';b.type='button';b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation()});b.onclick=e=>{e.stopPropagation();soundToggle()};
 for(const event of ['pointerdown','touchstart','touchend'])b.addEventListener(event,e=>e.stopPropagation(),{passive:true});document.body.appendChild(b);soundLabel();
 for(const event of ['pointerdown','touchend','keydown'])document.addEventListener(event,e=>{if(e.isTrusted&&e.target!==b)soundUnlock()},{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&SFX.ctx){for(const v of SFX.voices)try{v.stop()}catch(e){}SFX.ctx.suspend().catch(()=>{})}});
})();
