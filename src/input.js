'use strict';
// 輸入：鍵盤與 press()（搖桿在 joystick.js）
// ---------- input ----------
function interact(){const v=DV[G.dir],fx=G.x+v[0]*24,fy=G.y-12+v[1]*22;let best=null,bd=1e9;
 for(const it of M.inter){const d1=Math.hypot(it.x-fx,it.y-fy),d2=Math.hypot(it.x-G.x,it.y-(G.y-12));const d=Math.min(d1,d2+8);if(d<it.r&&d<bd){bd=d;best=it}}
 if(best)best.act()}
function press(k){if(!ready)return;
 if(G.mode=='title'){if(G.cred){G.cred=0;return}if(k=='cred'||k=='cancel'){G.cred=1;return}if(k=='ok')newGame();return}
 if(G.mode=='over'){if(k=='ok')retry();return}
 if(G.mode=='end'){if(k=='ok'&&performance.now()-G.endT>800)G={mode:'title',cred:0};return}
 if(G.dlg){if(k=='ok'||k=='cancel'){G.dlg.i++;if(G.dlg.i>=G.dlg.l.length){const cb=G.dlg.cb;G.dlg=null;cb&&cb()}}return}
 if(G.mode=='battle')return bKey(k);
 if(G.mode=='map'){if(k=='ok')interact();else if(k=='cancel')status()}}
const KM={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'ok',Enter:'ok',z:'ok',Z:'ok',Escape:'cancel',x:'cancel',X:'cancel',c:'cred',C:'cred'};
const keys={};
addEventListener('keydown',e=>{const k=KM[e.key];if(!k)return;e.preventDefault();const dir=DV[k];if(dir)keys[k]=1;if(e.repeat&&!dir)return;if(!(dir&&G.mode=='map'&&!G.dlg))press(k)});
addEventListener('keyup',e=>{const k=KM[e.key];if(k)keys[k]=0});
const clearK=()=>{JOY._reset&&JOY._reset();for(const k in keys)keys[k]=0};addEventListener('blur',clearK);document.addEventListener('visibilitychange',clearK);addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
JOY.onA=()=>press('ok');JOY.onB=()=>press('cancel');
(function(){let cur=null,last=0;setInterval(()=>{if(!JOY.on||(G.mode=='map'&&!G.dlg)){cur=null;return}const d=Math.abs(JOY.x)>Math.abs(JOY.y)?(JOY.x>0?'right':'left'):(JOY.y>0?'down':'up');const n=Date.now();if(d!==cur||n-last>=220){cur=d;last=n;press(d)}},30)})();
if(!JOY.touch)cv.addEventListener('click',()=>{if(G.mode=='title'&&!G.cred)press('ok')});
