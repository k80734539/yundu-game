'use strict';
const MUSIC={muted:false,bus:null,cache:new Map(),current:null,key:null,ticket:0,pending:false,retiring:null,retry:0};
const AMBIENT={current:null,key:null,ticket:0,pending:false,retiring:null,retry:0};
const AUDIO_UI={panel:null,consumeUntil:0};
const MUSIC_KEYS=['mist','mist_alt','village','night','battle','boss'];
try{MUSIC.muted=localStorage.getItem('yundu_music')==='off'}catch(e){}
function audioBuffer(key){
 const c=SFX.ctx;if(!c||!AUDIO_ASSETS[key])return Promise.resolve(null);
 const cache=MUSIC_KEYS.includes(key)?MUSIC.cache:SFX.buffers;
 if(cache.has(key)){const b=cache.get(key);cache.delete(key);cache.set(key,b);return Promise.resolve(b)}
 if(SFX.loading.has(key))return SFX.loading.get(key);
 const task=fetch(AUDIO_ASSETS[key]+'?v='+ASSET_V).then(r=>{if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer()}).then(b=>c.decodeAudioData(b)).then(b=>{
  if(c.state==='closed')return null;if(cache===MUSIC.cache&&key!==MUSIC.key)return b;cache.set(key,b);if(cache===MUSIC.cache)while(cache.size>2)cache.delete(cache.keys().next().value);return b;
 }).catch(()=>{SFX.failed.add(key);return null}).finally(()=>SFX.loading.delete(key));
 SFX.loading.set(key,task);return task;
}
function warmSfx(){if(SFX.warm||SFX.muted)return;SFX.warm=true;Object.keys(AUDIO_ASSETS).filter(k=>!MUSIC_KEYS.includes(k)&&!['river','insects'].includes(k)).forEach(k=>audioBuffer(k))}
function playSfx(key,volume=1.4,rate=1){
 const c=SFX.ctx;if(SFX.muted||!c||c.state!=='running'||document.hidden||SFX.voices.size>=16)return false;
 const buffer=SFX.buffers.get(key);if(!buffer){if(!SFX.failed.has(key))audioBuffer(key);return false}
 const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(SFX.bus);
 SFX.voices.add(source);source.onended=()=>{SFX.voices.delete(source);source.disconnect();gain.disconnect()};source.start();return true;
}
function musicForState(){
 if(!ready)return null;if(G.mode==='battle')return G.B?.en.some(e=>e.boss)?'boss':'battle';
 if(G.mode==='boat')return'night';if(G.mode==='end')return'mist_alt';
 if(G.mode==='map'){if(activeScene()?.id==='camp')return'mist_alt';return M.id==='village'?'village':'night'}
 return'mist';
}
function ambientForState(){if(!ready)return null;if(G.mode==='boat')return'river';if(G.mode==='map')return M.id==='reeds'?'insects':'river';return null}
function stopLoop(track){
 if(track.retiring){try{track.retiring.stop()}catch(e){}track.retiring=null}
 const old=track.current;track.current=null;if(!old)return;
 const t=SFX.ctx.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setTargetAtTime(0,t,.08);try{old.source.stop(t+.35)}catch(e){}track.retiring=old.source;
}
function syncLoop(track,key,ambient=false){
 if(key===track.key&&(track.current||track.pending||!key||performance.now()<track.retry))return;
 track.key=key;const ticket=++track.ticket;stopLoop(track);track.pending=!!key;if(!key)return;
 audioBuffer(key).then(buffer=>{
  if(ticket!==track.ticket)return;track.pending=false;
  if(!buffer){track.retry=performance.now()+30000;return}
  const c=SFX.ctx;if(c.state!=='running'||document.hidden){track.key=null;return}
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(ambient?SFX.bus:MUSIC.bus);
  gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(ambient?.45:1,c.currentTime+.45);
  source.onended=()=>{source.disconnect();gain.disconnect()};source.start();track.current={source,gain,key};
 });
}
function audioSyncTracks(){if(!SFX.ctx||SFX.ctx.state!=='running'||document.hidden)return;syncLoop(MUSIC,MUSIC.muted?null:musicForState());syncLoop(AMBIENT,SFX.muted?null:ambientForState(),true)}
function battleSound(k,stage,big=false,src=null,critical=false){
 let key=null,rate=1;
 if(stage==='start'){
  if(['slash','sweep'].includes(k)&&src?.e!=='yx')key='pole';
  else if(['foxfire','wave'].includes(k)){key='gather';rate=2}
 }else{
  key=({rain:'heal',item:'item',splash:'water',wave:'wave',tail:'water',leaf:'leaf',foxfire:'fox'})[k]||null;
  if(['slash','sweep','claw'].includes(k)&&src?.e!=='yx')key='wood';
  if(critical)playSfx('critical',1.5);
 }
 if(!key||!playSfx(key,critical?.85:big?1.6:1.4,rate))synthBattleSound(k,stage,big);
}
function soundUi(k){
 if(G.mode==='battle'&&G.B?.ph==='msg')return;
 const direction=['up','down','left','right'].includes(k);if(direction&&!SV.p&&G.mode!=='battle')return;
 if(!direction&&!['ok','cancel','menu'].includes(k))return;
 const cancel=k==='cancel'||k==='menu'||(k==='ok'&&SV.p&&/^(返回|關閉|取消)$/.test(SV.items[SV.sel]?.l||'')),key=cancel?'cancel':'move';
 if(!playSfx(key,direction?.55:.85,k==='ok'?1.18:1))soundTone(cancel?420:720,cancel?300:860,.065,.07);
}
function soundToggle(){
 SFX.muted=!SFX.muted;try{localStorage.setItem('yundu_sound',SFX.muted?'off':'on')}catch(e){}
 if(SFX.bus)SFX.bus.gain.setValueAtTime(SFX.muted?0:.22,SFX.ctx.currentTime);
 if(SFX.muted){for(const v of SFX.voices)try{v.stop()}catch(e){}syncLoop(AMBIENT,null)}else soundUnlock();soundLabel();
}
function musicToggle(){
 MUSIC.muted=!MUSIC.muted;try{localStorage.setItem('yundu_music',MUSIC.muted?'off':'on')}catch(e){}
 if(MUSIC.bus)MUSIC.bus.gain.setValueAtTime(MUSIC.muted?0:.22,SFX.ctx.currentTime);
 if(MUSIC.muted)syncLoop(MUSIC,null);else soundUnlock();soundLabel();
}
function soundLabel(){
 for(const [id,label,on] of [['sfxToggle','音效',!SFX.muted],['musicToggle','音樂',!MUSIC.muted]]){const b=document.getElementById(id);if(b){b.textContent=label+'：'+(on?'開':'關');b.setAttribute('aria-pressed',String(on))}}
}
function closeSound(){if(AUDIO_UI.panel){AUDIO_UI.panel.hidden=true;document.getElementById('soundBtn').setAttribute('aria-expanded','false')}}
function openSound(){const p=AUDIO_UI.panel;p.hidden=!p.hidden;document.getElementById('soundBtn').setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden){soundUnlock();document.getElementById('musicToggle').focus()}}
function soundSync(){
 const b=document.getElementById('soundBtn');if(b){b.hidden=!!(G.dlg||G.cut||G.cred||!ready||!['title','map','battle'].includes(G.mode));if(b.hidden)closeSound()}
 audioSyncTracks();
}
(function(){
 const style=document.createElement('style');style.textContent='#soundBtn[hidden],#soundPanel[hidden]{display:none}#soundBtn{position:fixed;z-index:62;right:calc(8px + env(safe-area-inset-right));top:calc(5px + env(safe-area-inset-top));min-width:76px;min-height:44px;padding:6px 9px;border:1px solid #b6a16c;border-radius:7px;background:rgba(12,20,28,.9);color:#ead6a5;font:14px "PingFang TC",sans-serif;touch-action:manipulation}#soundPanel{position:fixed;z-index:63;right:calc(8px + env(safe-area-inset-right));top:calc(54px + env(safe-area-inset-top));width:180px;padding:10px;box-sizing:border-box;border:1px solid #b6a16c;border-radius:8px;background:#101d28;color:#ead6a5;font:16px "PingFang TC",sans-serif;box-shadow:0 3px 15px #0009}#soundPanel button{display:block;width:100%;min-height:44px;margin-top:6px;border:1px solid #8c815d;border-radius:6px;background:#24343e;color:#f1e3c1;font:16px "PingFang TC",sans-serif;touch-action:manipulation}';document.head.appendChild(style);
 const b=document.createElement('button');b.id='soundBtn';b.type='button';b.textContent='聲音設定';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','soundPanel');b.onclick=e=>{e.stopPropagation();openSound()};document.body.appendChild(b);
 const p=AUDIO_UI.panel=document.createElement('section');p.id='soundPanel';p.hidden=true;p.setAttribute('aria-label','聲音設定');p.innerHTML='聲音設定<button type="button" id="musicToggle"></button><button type="button" id="sfxToggle"></button><button type="button" id="soundClose">關閉</button>';document.body.appendChild(p);
 document.getElementById('musicToggle').onclick=musicToggle;document.getElementById('sfxToggle').onclick=soundToggle;document.getElementById('soundClose').onclick=()=>{closeSound();b.focus()};soundLabel();
 for(const el of [b,p])for(const event of ['pointerdown','touchstart','touchend','click','keydown'])el.addEventListener(event,e=>{if(event==='keydown'&&e.key==='Escape'){e.preventDefault();closeSound();b.focus()}e.stopPropagation()},{passive:false});
 for(const event of ['pointerdown','touchstart','click'])document.addEventListener(event,e=>{
  if(b.contains(e.target)||p.contains(e.target))return;
  if(!p.hidden){closeSound();AUDIO_UI.consumeUntil=performance.now()+400;e.preventDefault();e.stopImmediatePropagation()}
  else if(performance.now()<AUDIO_UI.consumeUntil){e.preventDefault();e.stopImmediatePropagation()}
 },{capture:true,passive:false});
 for(const event of ['pointerdown','touchend','keydown'])document.addEventListener(event,e=>{if(e.isTrusted)soundUnlock()},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(!p.hidden){if(e.key==='Escape'){e.preventDefault();closeSound();b.focus()}e.stopPropagation()}},{capture:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&SFX.ctx){for(const v of SFX.voices)try{v.stop()}catch(e){}SFX.ctx.suspend().catch(()=>{})}});
})();
