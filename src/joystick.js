// overlay virtual joystick + A/B (touch devices only)
const JOY={x:0,y:0,on:false,onA:null,onB:null,touch:('ontouchstart' in window)||navigator.maxTouchPoints>0};
(function(){if(!JOY.touch)return;document.documentElement.classList.add('touch');
 const ov=document.createElement('canvas');ov.id='ov';ov.style.cssText='background:transparent;margin:0;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:50;touch-action:none';document.body.appendChild(ov);
 const c=ov.getContext('2d');let W,H,dpr;function rs(w,h){dpr=devicePixelRatio||1;const vv=window.visualViewport;W=typeof w=='number'?w:Math.round(vv?vv.width:innerWidth);H=typeof h=='number'?h:Math.round(Math.min(innerHeight,vv?vv.height:1e9));ov.style.width=W+'px';ov.style.height=H+'px';ov.width=W*dpr;ov.height=H*dpr}window.JOYfit=rs;rs();addEventListener('resize',rs);
 const pr=document.createElement('div');pr.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(pr);
 const sa=k=>parseFloat(getComputedStyle(pr)['padding'+{t:'Top',r:'Right',b:'Bottom',l:'Left'}[k]])||0;
 const R=56;let jid=null,ax=0,ay=0,kx=0,ky=0;const btn={A:{id:null},B:{id:null}};
 function bpos(){const r=sa('r'),b=sa('b'),s=Math.min(W,H)<500?1:1.15;return{A:[W-r-58*s,H-b-90*s,36*s],B:[W-r-138*s,H-b-50*s,30*s]}}
 function hitBtn(x,y){const P=bpos();for(const k of['A','B']){const[p,q,r]=P[k];if(Math.hypot(x-p,y-q)<r+14)return k}return null}
 function upd(){const dx=kx-ax,dy=ky-ay,m=Math.hypot(dx,dy);const cl=Math.min(m,R);JOY.x=m?dx/m*cl/R:0;JOY.y=m?dy/m*cl/R:0;JOY.on=jid!==null&&m>R*.25;if(!JOY.on){JOY.x=JOY.y=0}}
 function st(e){e.preventDefault();for(const t of e.changedTouches){const x=t.clientX,y=t.clientY,b=hitBtn(x,y);
   if(b&&btn[b].id===null){btn[b].id=t.identifier;const f=b=='A'?JOY.onA:JOY.onB;f&&f();continue}
   if(x<W*.55&&jid===null){jid=t.identifier;ax=kx=x;ay=ky=y;upd()}}}
 function mv(e){e.preventDefault();for(const t of e.changedTouches)if(t.identifier===jid){kx=t.clientX;ky=t.clientY;if(Math.hypot(kx-ax,ky-ay)>R*1.6){const a=Math.atan2(ky-ay,kx-ax);ax=kx-Math.cos(a)*R*1.6;ay=ky-Math.sin(a)*R*1.6}upd()}}
 function en(e){e.preventDefault();for(const t of e.changedTouches){if(t.identifier===jid){jid=null;upd()}for(const k in btn)if(btn[k].id===t.identifier)btn[k].id=null}
   if(e.touches.length==0){jid=null;btn.A.id=btn.B.id=null;upd()}}
 ov.addEventListener('touchstart',st,{passive:false});ov.addEventListener('touchmove',mv,{passive:false});ov.addEventListener('touchend',en,{passive:false});ov.addEventListener('touchcancel',en,{passive:false});
 const reset=()=>{jid=null;btn.A.id=btn.B.id=null;upd()};addEventListener('blur',reset);document.addEventListener('visibilitychange',reset);
 JOY._reset=reset;JOY.hidden=false;JOY.hide=h=>{JOY.hidden=h;ov.style.pointerEvents=h?'none':'auto';reset()};
 (function draw(){requestAnimationFrame(draw);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);if(JOY.hidden||(typeof SV!=='undefined'&&SV.p))return;
  let bx=ax,by=ay,al=.35;if(jid===null){bx=sa('l')+90;by=H-sa('b')-90;al=.12}
  c.globalAlpha=al;c.fillStyle='#000';c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(bx,by,R,0,7);c.fill();c.globalAlpha=al+.2;c.stroke();
  c.fillStyle='#e8e8f0';c.beginPath();c.arc(bx+JOY.x*R,by+JOY.y*R,24,0,7);c.fill();
  const P=bpos();for(const k of['A','B']){const[p,q,r]=P[k],dn=btn[k].id!==null;const active=typeof nearbyInteraction==='function'&&!!nearbyInteraction();c.globalAlpha=dn?.8:k==='A'&&active?.8:.34;c.fillStyle=k==='A'&&active?'#38685e':'#102432';c.strokeStyle=k==='A'&&active?'#c4e6d6':'#c5b28c';c.beginPath();c.arc(p,q,r,0,7);c.fill();c.globalAlpha=dn?.9:.6;c.stroke();c.fillStyle='#fff';c.font='bold '+(r*.8|0)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(k,p,q-5);c.font='12px sans-serif';c.fillStyle=k==='A'&&active?'#ddf4e8':'#eee7d6';c.fillText(k==='A'&&typeof journeyAction==='function'?journeyAction():k==='B'?(typeof G==='undefined'?'返回':G.dlg?'繼續':G.mode==='map'?'狀態':G.mode==='title'&&!G.cred?'素材':'返回'):'互動',p,q+17)}
  c.globalAlpha=1})()})();
