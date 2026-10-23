'use strict';
// 主迴圈 frame() 與測試掛勾 window.__*
function frame(){requestAnimationFrame(frame);if(JOY.hide){const hb=G.mode=='battle';if(JOY.hidden!==hb)JOY.hide(hb)}const now=performance.now(),dt=Math.min(3,(now-lastT)/16.667);lastT=now;
 try{if(cv.width!=Math.round(innerWidth*K)||cv.height!=Math.round(innerHeight*K))fit();
  if(ready&&G.mode=='map')update(dt);X.setTransform(1,0,0,1,0,0);X.imageSmoothingEnabled=true;X.imageSmoothingQuality='high';
  if(G.mode=='title'||!ready)drawTitle(now);else if(G.mode=='map')drawWorld(now);else if(G.mode=='boat')drawBoat(now);else if(G.mode=='battle')drawBattle(now);else if(G.mode=='over')drawOver();else if(G.mode=='end')drawEnd(now);
  if(G.dlg&&ready)drawDlg()}catch(e){console.error(e);window.__err=(window.__err||[]).concat(String(e&&e.stack||e))}}
requestAnimationFrame(frame);
window.G_=()=>G;window.__sb=(k,o)=>startBattle(k,o||{});window.__ex=(p,t)=>{G.B.pend=p;exec(t)};window.__ep=()=>enemyPhase();window.press=press;window.M_=()=>M;window.TP=(x,y,d)=>{G.x=x;G.y=y;if(d)G.dir=d;G.hist=[];for(const z of M.zones)z.in=inZ(z)};
