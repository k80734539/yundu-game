'use strict';
// UI 繪圖工具（UI()/txt/box/FS）與對話框 drawDlg
// ---------- render helpers ----------
const FONT='"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
function txt(t,x,y,s,c,al){X.font=(s||17)+'px '+FONT;X.fillStyle=c||'#fff';X.textAlign=al||'left';X.fillText(t,x,y);X.textAlign='left'}
function box(x,y,w,h,a){X.save();X.globalAlpha=a==null?1:a;X.fillStyle='rgba(12,16,34,.88)';rr(x,y,w,h,8);X.fill();X.strokeStyle='#c9b26b';X.lineWidth=1.5;rr(x+1.5,y+1.5,w-3,h-3,7);X.stroke();X.restore()}
function rr(x,y,w,h,r){X.beginPath();X.moveTo(x+r,y);X.arcTo(x+w,y,x+w,y+h,r);X.arcTo(x+w,y+h,x,y+h,r);X.arcTo(x,y+h,x,y,r);X.arcTo(x,y,x+w,y,r);X.closePath()}
function wrap(t,w){const out=[];t.split('\n').forEach(par=>{let l='';for(const ch of par){if(X.measureText(l+ch).width>w&&l){out.push(l);l=ch}else l+=ch}out.push(l)});return out}
function cover(im,fx,fy){const s=Math.max(SW/im.width,SH/im.height),w=im.width*s,h=im.height*s;const ox=Math.min(0,Math.max(SW-w,SW/2-(fx==null?.5:fx)*w)),oy=Math.min(0,Math.max(SH-h,SH/2-(fy==null?.5:fy)*h));X.drawImage(im,ox,oy,w,h);return{s,ox,oy}}
function light(x,y,r,col){const g=X.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');X.fillStyle=g;X.fillRect(x-r,y-r,2*r,2*r)}
const UI=()=>X.setTransform(K,0,0,K,0,0);
const FS=()=>Math.max(14,Math.min(19,Math.min(SW,SH)/22));
// 每位角色的 sprite 規格。預設（沒列在 SPR）= 舊版 72×66、3 幀（0 站、1/2 步）、腳底在 y=66、顯示比例 1。
// qz／bl／yx = v19 新版（三人共用同一縮放，三人身高相對一致；v32 五位村民為 NPCSPR 靜態規格，其他角色依各自規格） 192×192、4 幀（0 左腳前、1 站、2 右腳前、3 站）、腳底邊緣 y=180；k 縮放後可見身高與舊圖（60 px）相同。
const SPR4={n:4,idle:1,seq:[0,1,2,3],map:[1,0,2],k:.353,fh:180},SPR={qz:SPR4,bl:SPR4,yx:SPR4};
const NPCSPR=Object.fromEntries(['lin','zhou','granny','chief','wang'].map(k=>[k,{k:.353,fh:180}]));
const sprSpec=key=>sprIs(key)?SPR[sprC(key)]:NPCSPR[key];
const sprC=key=>key.split('_')[0];
const sprIs=key=>/^[a-z]+_(down|up|left|right)\d$/.test(key);
// 規格只在圖片真的是新版 192px 時才套用（舊快取圖片搭新 JS 時退回原尺寸，不會畫成極小）
const sprNew=key=>sprSpec(key)&&I[key]?.naturalWidth>100;
const sprK=key=>sprNew(key)?sprSpec(key).k:1;      // 顯示縮放（相對原圖像素）
const sprFeet=key=>sprNew(key)?sprSpec(key).fh:(I[key]?.height||66);  // 腳底邊緣在原圖的 y
const sprIdle=(k,dir)=>k+'_'+dir+(SPR[k]?SPR[k].idle:0);
// 以腳底 (x,y)（舊版基準：圖底 = y+2）畫 sprite；s 為額外縮放
function sprDraw(key,x,y,s,round){const im=I[key],k=sprK(key)*(s||1);if(!im?.naturalWidth)return;const w=im.width*k,h=im.height*k,l=x-w/2,t=y+2-sprFeet(key)*k;if(round)X.drawImage(im,Math.round(l),Math.round(t),w,h);else X.drawImage(im,l,t,w,h)}
function spriteKey(k,dir,f){if(NPCSPR[k]&&I[k]?.naturalWidth>100)return k;const S=SPR[k],fr=S?(f>0?S.seq[Math.floor(f)&3]:S.idle):(f>0?[0,1,0,2][Math.floor(f)&3]:0);let key=k+'_'+dir+fr;if(I[key]?.naturalWidth)return key;key=k+'_'+dir+(S?S.idle:0);if(I[key]?.naturalWidth)return key;key=k+'_down'+(S?S.idle:0);return I[key]?.naturalWidth?key:k}
function chr(key,x,y,a){const im=I[key];if(!im?.naturalWidth){X.fillStyle='#647477';X.fillRect(x-8,y-28,16,26);X.beginPath();X.arc(x,y-34,8,0,7);X.fill();return}X.fillStyle='rgba(0,0,0,.32)';X.beginPath();X.ellipse(x,y-1,13,4.5,0,0,7);X.fill();if(a!=null)X.globalAlpha=a;sprDraw(key,x,y,1,1);X.globalAlpha=1}
function drawObj(o,t){if(o.rootGate&&G.flags.reedSolved&&(!o.bossGate||G.flags.reedBoss||G.flags.camp||G.flags.templeSeal))return;if(o.fire&&I.campfire?.naturalWidth)return;if(o.tal&&G.flags.tal)return;let k=o.k;if(o.chest&&G.opened[o.chest])k='chest_o';const im=I[k],s=o.s,w=im.width*s,h=im.height*s;
 X.save();X.translate(o.x,o.y);if(o.sway){X.transform(1,0,Math.sin(t*1.3+o.sway)*.035+Math.sin(t*.6+o.sway*.7)*.012,1,0,0)}if(o.mir)X.scale(-1,1);
 if(!o.flat&&!o.sway){X.fillStyle='rgba(20,25,10,.25)';X.beginPath();X.ellipse(0,-2,w*.38,Math.max(5,h*.05),0,0,7);X.fill()}
 if(o.tal){X.translate(0,Math.sin(t*2)*2)}
 if(o.boat){X.translate(0,Math.sin(t*1.6)*2);X.fillStyle='rgba(255,230,150,'+(.22+.1*Math.sin(t*3))+')';X.beginPath();X.ellipse(0,-6,w*.52,h*.32,0,0,7);X.fill();X.strokeStyle='rgba(255,240,190,.55)';X.lineWidth=2;X.beginPath();X.ellipse(0,-4,w*.5,h*.28,0,0,7);X.stroke()}
 X.drawImage(im,-w/2,-h+6*Math.min(1,s),w,h);X.restore()}
function dialogLayout(d=G.dlg){const [n,t]=d.l[d.i],pk=PORT[n];const fs=FS(),port=SW>SH,top=dlgTop();
 const x=SA.l+8,w=Math.min(SW-SA.l-SA.r-16,760),bx=x+(SW-SA.l-SA.r-16-w)/2;X.font=fs+'px '+FONT;
 const ps=pk?Math.round(fs*5.2):0,tx=bx+14+(pk?ps+12:0),tw=bx+w-14-tx,lines=wrap(t,tw);
 const h=Math.max(ps+24,(n?fs+12:0)+lines.length*(fs+8)+26);
 const y=top?SA.t+8:JOY.touch?SH-SA.b-200-h:SH-SA.b-12-h;
 return{fs,bx,w,ps,tx,lines,h,y};}
function drawDlg(){const d=G.dlg,[n,t]=d.l[d.i],pk=PORT[n];UI();const {fs,bx,w,ps,tx,lines,h,y}=dialogLayout(d);
 box(bx,y,w,h,.95);if(pk){const portrait=I[scenePortrait(n,pk)]?.naturalWidth?I[scenePortrait(n,pk)]:I['pt_'+pk];X.save();X.globalAlpha=scenePortraitAlpha(performance.now());const hero=pk==='qz'||pk==='bl'||pk==='yx'||!!NPCSPR[pk];if(hero){X.shadowColor='rgba(0,0,0,.45)';X.shadowBlur=4}if(portrait?.naturalWidth)X.drawImage(portrait,bx+12,y+12,ps,ps);X.restore();if(!hero){X.strokeStyle='#c9b26b';X.lineWidth=1.5;X.strokeRect(bx+12,y+12,ps,ps)}}
 let yy=y+fs+12;const sys=n=='提示'||n=='系統';if(n){txt(sys?'◆ '+n:'【'+n+'】',tx,yy,fs,sys?'#8fd0ff':'#f3dfa0');yy+=fs+12}lines.forEach(l=>{txt(l,tx,yy,fs,sys?'#cfe8ff':undefined);yy+=fs+8});
 txt('▼',bx+w-22,y+h-10+Math.sin(tm()*3)*2,fs-4,'#c9b26b')}
