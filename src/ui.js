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
function spriteKey(k,dir,f){const fr=f>0?[0,1,0,2][Math.floor(f)&3]:0;let key=k+'_'+dir+fr;if(I[key])return key;key=k+'_'+dir+'0';if(I[key])return key;key=k+'_down0';return I[key]?key:k}
function chr(key,x,y,a){const im=I[key];X.fillStyle='rgba(0,0,0,.32)';X.beginPath();X.ellipse(x,y-1,13,4.5,0,0,7);X.fill();if(a!=null)X.globalAlpha=a;X.drawImage(im,Math.round(x-im.width/2),Math.round(y-im.height+2));X.globalAlpha=1}
function drawObj(o,t){if(o.tal&&G.flags.tal)return;let k=o.k;if(o.chest&&G.opened[o.chest])k='chest_o';const im=I[k],s=o.s,w=im.width*s,h=im.height*s;
 X.save();X.translate(o.x,o.y);if(o.sway){X.transform(1,0,Math.sin(t*1.3+o.sway)*.03,1,0,0)}if(o.mir)X.scale(-1,1);
 if(!o.flat&&!o.sway){X.fillStyle='rgba(20,25,10,.25)';X.beginPath();X.ellipse(0,-2,w*.38,Math.max(5,h*.05),0,0,7);X.fill()}
 if(o.tal){X.translate(0,Math.sin(t*2)*2)}
 if(o.boat){X.translate(0,Math.sin(t*1.6)*2);X.fillStyle='rgba(255,230,150,'+(.22+.1*Math.sin(t*3))+')';X.beginPath();X.ellipse(0,-6,w*.52,h*.32,0,0,7);X.fill();X.strokeStyle='rgba(255,240,190,.55)';X.lineWidth=2;X.beginPath();X.ellipse(0,-4,w*.5,h*.28,0,0,7);X.stroke()}
 X.drawImage(im,-w/2,-h+6*Math.min(1,s),w,h);X.restore()}
function drawDlg(){const d=G.dlg,[n,t]=d.l[d.i],pk=PORT[n];UI();const fs=FS(),port=SW>SH,top=dlgTop();
 const x=SA.l+8,w=Math.min(SW-SA.l-SA.r-16,760),bx=x+(SW-SA.l-SA.r-16-w)/2;X.font=fs+'px '+FONT;
 const ps=pk?Math.round(fs*5.2):0,tx=bx+14+(pk?ps+12:0),tw=bx+w-14-tx,lines=wrap(t,tw);
 const h=Math.max(ps+24,(n?fs+12:0)+lines.length*(fs+8)+26);
 const y=top?SA.t+8:JOY.touch?SH-SA.b-200-h:SH-SA.b-12-h;
 box(bx,y,w,h,.95);if(pk&&I['pt_'+pk]){X.drawImage(I['pt_'+pk],bx+12,y+12,ps,ps);X.strokeStyle='#c9b26b';X.lineWidth=1.5;X.strokeRect(bx+12,y+12,ps,ps)}
 let yy=y+fs+12;const sys=n=='提示'||n=='系統';if(n){txt(sys?'◆ '+n:'【'+n+'】',tx,yy,fs,sys?'#8fd0ff':'#f3dfa0');yy+=fs+12}lines.forEach(l=>{txt(l,tx,yy,fs,sys?'#cfe8ff':undefined);yy+=fs+8});
 txt('▼',bx+w-22,y+h-10+Math.sin(tm()*3)*2,fs-4,'#c9b26b')}
