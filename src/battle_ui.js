'use strict';
// v22 戰鬥畫面：全螢幕背景＋斜角站位（敵人左上、我方右下斜排）、八角指令鈕、底部三張角色卡、觸控 bTap
// 設計座標：直式 390×844（我方腳底 雲纖(185,505) 青舟(262,585) 白苓(335,665)），依實際畫面等比縮放；橫式另有一組座標。
const BP_FEET=[[160,540],[240,625],[320,710]],BP_EN={1:[[100,300]],2:[[70,260],[150,340]],3:[[60,250],[150,320],[70,390]],b:[[100,330]]};
function bLayout(n){const port=SH>SW,aw=SW-SA.l-SA.r,L={port,aw};
 L.U=port?Math.min(SW/390,SH/844):SH/390;L.s=BFR.scale*L.U;L.eu=L.U;
 L.ch=port?Math.max(62,Math.round(82*L.U)):54;L.cy=SH-SA.b-L.ch-8;const gap=port?10:8;
 L.cw=port?(aw-24-gap*2)/3:Math.min(210,(aw-24-gap*2)/3);L.cx0=port?SA.l+12:SA.l+(aw-(L.cw*3+gap*2))/2;L.gap=gap;
 const fp=port?(q=>[SW/2+(SA.l-SA.r)/2+(q[0]-195)*L.U,SH-SA.b-(844-q[1])*L.U]):null;
 if(port){L.feet=BP_FEET.map(fp);L.en=(k,boss)=>(BP_EN[boss?'b':Math.min(3,k)]||BP_EN[1]).map(fp)}
 else{const k=SH/390,cx=SA.l+aw*.72,cyf=L.cy-64*k;L.feet=[[cx-80*k,cyf-52*k],[cx,cyf],[cx+80*k,cyf+52*k]];
  const ex=SA.l+aw*.25,ey=L.cy-92*k;L.en=(m,boss)=>boss?[[ex,ey+16*k]]:Array.from({length:m},(_,i)=>[ex+(i-(m-1)/2)*80*k,ey+(i-(m-1)/2)*50*k])}
 // 指令鈕（畫面右緣中段、由上往下疊，仿仙劍；不遮住任何角色）：直式 x=SW-SA.r-40、第一顆在 SH*.30，每 50px 一顆；逃跑在左上
 L.bd=Math.max(34,Math.min(44,40*Math.max(.9,L.U)));L.bs=Math.max(46,Math.round(50*Math.max(.92,L.U)));L.bx=SW-SA.r-(port?Math.max(34,40*L.U):34);L.by=Math.max(SA.t+86,Math.round(port?SH*.30:SA.t+96*L.U));
 L.ex=[SA.l+14+L.bd/2,SA.t+14+L.bd/2];return L}
function bSlot(p,i){return BSLOT[p.e]!=null?BSLOT[p.e]:Math.min(i,2)}
function oct(cx,cy,r){X.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=cx+Math.cos(a)*r*1.0824,y=cy+Math.sin(a)*r*1.0824;i?X.lineTo(x,y):X.moveTo(x,y)}X.closePath()}
function octBtn(cx,cy,d,ch,sel,fs){X.save();oct(cx,cy,d/2);X.fillStyle=sel?'rgba(70,58,24,.96)':'rgba(12,16,34,.9)';X.fill();X.strokeStyle=sel?'#ffe9a8':'#c9b26b';X.lineWidth=sel?2.5:1.5;X.stroke();oct(cx,cy,d/2-3);X.strokeStyle='rgba(201,178,107,.35)';X.lineWidth=1;X.stroke();X.restore();
 X.font='bold '+Math.round(fs+2)+'px '+FONT;X.textAlign='center';X.fillStyle=sel?'#fff1c0':'#f3e6b0';X.fillText(ch,cx,cy+(fs+2)*.36);X.textAlign='left'}
function drawCard(L,p,i,act,fs,now){const x=L.cx0+i*(L.cw+L.gap),w=L.cw,h=L.ch,y=L.cy-(act?3:0),pt=I['pt_'+p.e+'_battle']?.naturalWidth?I['pt_'+p.e+'_battle']:I['pt_'+p.e],hp=Math.max(0,p.hp)/p.mhp,nf=Math.min(fs,15);
 X.save();X.fillStyle=act?'rgba(52,44,22,.96)':'rgba(12,16,34,.92)';rr(x,y,w,h,8);X.fill();X.strokeStyle=act?'#ffe14a':'#c9b26b';X.lineWidth=act?2.5:1.5;rr(x+1,y+1,w-2,h-2,8);X.stroke();X.restore();
 const a=L.port?Math.round(h*.5):h-14,ax=x+8,ay=y+7;
 X.save();X.globalAlpha=p.hp>0?1:.4;rr(ax,ay,a,a,7);X.clip();if(pt?.naturalWidth)X.drawImage(pt,ax,ay,a,a);X.restore();X.strokeStyle='rgba(201,178,107,.7)';X.lineWidth=1;rr(ax,ay,a,a,7);X.stroke();
 const tx=ax+a+7,tw=x+w-8-tx;X.font=nf+'px '+FONT;let f2=nf;while(f2>10&&X.measureText(p.n).width>tw)f2--;
 txt(p.n,tx,ay+f2+1,f2,p.hp>0?'#fff':'#888');
 const st=(p.st?'毒 ':'')+(p.guard&&p.hp>0?'防':'');
 if(L.port){txt('Lv'+p.lv,tx,ay+f2+Math.max(11,f2-2)+5,Math.max(10,f2-3),'#cde');if(st)txt(st,tx+X.measureText('Lv'+p.lv).width+5,ay+f2+Math.max(11,f2-2)+5,Math.max(10,f2-3),p.st?'#f9a':'#ffe9a8');
  txt(Math.max(0,p.hp)+'/'+p.mhp,x+w-8,y+h-24-3,Math.max(10,f2-3),'#cfc','right');
  X.fillStyle='#300';X.fillRect(ax,y+h-24,w-16,7);X.fillStyle='#4c4';X.fillRect(ax,y+h-24,(w-16)*hp,7);
  X.fillStyle='#003';X.fillRect(ax,y+h-13,w-16,5);X.fillStyle='#48f';X.fillRect(ax,y+h-13,(w-16)*Math.max(0,p.mp)/p.mmp,5)}
 else{txt(Math.max(0,p.hp)+'/'+p.mhp,x+w-8,ay+f2+1,Math.max(10,f2-3),'#cfc','right');if(st)txt(st,tx+X.measureText(p.n).width+6,ay+f2+1,Math.max(10,f2-3),p.st?'#f9a':'#ffe9a8');
  X.fillStyle='#300';X.fillRect(tx,y+h-26,tw,7);X.fillStyle='#4c4';X.fillRect(tx,y+h-26,tw*hp,7);X.fillStyle='#003';X.fillRect(tx,y+h-15,tw,5);X.fillStyle='#48f';X.fillRect(tx,y+h-15,tw*Math.max(0,p.mp)/p.mmp,5)}
 return{x,y:L.cy,w,h}}
function drawBattle(now){const B=G.B,t=now/1000;UI();let SX=0,SY=0;if(B.shk){const a=(now-B.shk.at)/B.shk.d;if(a<1){const k=B.shk.a*(1-a);SX=(Math.random()*2-1)*k;SY=(Math.random()*2-1)*k}else B.shk=null}X.translate(SX,SY);X.fillStyle='#000';X.fillRect(-20,-20,SW+40,SH+40);cover(I[B.opt.bg||'bg_reeds'],.5,.6);X.fillStyle='rgba(0,0,20,.22)';X.fillRect(-20,-20,SW+40,SH+40);
 const fs=FS(),n=B.en.length,np=G.party.length,ent=Math.min(1,(now-G.bT)/400),H=B.hit=[],L=B.L=bLayout(),u=L.U,s=L.s;B.u=u;
 const u2=G.party[B.ai]||G.party[0];
 // 訊息裡的特效在這一格就啟動（不等到上方訊息框畫出來），受擊／倒下 pose 才不會早一格
 {const c0=B.ph==='msg'&&B.msgs[0];if(Array.isArray(c0)&&c0[1].at==null)startFx(c0[1],now)}
 // ---- 幾何：敵人（左上）與我方（右下斜排）
 const boss=B.en.some(e=>e.boss),ES=L.en(n,boss&&n===1);
 const eScale=e=>(e.boss?.57:e.e=='lu'?.59:.58)*L.eu;  // 小水妖≈70px、蘆葦精≈100px、河伯≈170px（390×844）
 B.po=o=>{const ei=B.en.indexOf(o);if(ei>=0){const im=I[o.e],s2=eScale(o),q=ES[Math.min(ei,ES.length-1)];return[q[0],q[1]-im.height*s2/2,im.width*s2,im.height*s2]}
  const pi=G.party.indexOf(o),F=L.feet[bSlot(o,Math.max(0,pi))];return[F[0],F[1]-135*s,95*s,270*s]};
 B.feetOf=p=>L.feet[bSlot(p,Math.max(0,G.party.indexOf(p)))];
 X.font=(fs-2)+'px '+FONT;
 // ---- 敵人（後方，依序由左上畫到右下）
 const lab=[];B.en.forEach((e,i)=>{let da=0;if(e.hp<=0&&e.dieAt){if(now>e.dieAt+650)return;if(now>e.dieAt){da=(now-e.dieAt)/650;if(!e.dz){e.dz=1;const q=B.po&&B.po(e);if(q)for(let k=0;k<26;k++)vp({x:q[0]+(Math.random()-.5)*q[2]*.7,y:q[1]+(Math.random()-.5)*q[3]*.7,vx:(Math.random()-.5)*1.2,vy:-1-Math.random()*2.2,col:k%2?'#bfe8ff':'#fff',sz:2+Math.random()*3,life:500+Math.random()*400})}}}
  const im=I[e.e],s2=eScale(e),w=im.width*s2,h=im.height*s2,q=ES[Math.min(i,ES.length-1)],x=q[0],y=q[1],bob=Math.sin(t*2.2+e.ph)*3*u;
  const fx=B.fx.find(f=>f.t==e&&!f.heal&&now>=f.at&&now-f.at<500);X.fillStyle='rgba(0,0,0,.38)';X.beginPath();X.ellipse(x,y-2*u,w*.4,Math.max(4,6*u),0,0,7);X.fill();
  X.save();X.globalAlpha=ent*(1-da);if(fx&&Math.floor((now-fx.at)/70)%2)X.globalAlpha*=.4;if(da){X.translate(x,y);X.scale(1+da*.25,1-da*.5);X.translate(-x,-y)}X.drawImage(im,x-w/2+(fx?Math.sin(now/20)*3:0),y-h+bob-da*20*u,w,h);if(da>0){X.globalCompositeOperation='lighter';X.globalAlpha=(1-da)*.6;X.drawImage(im,x-w/2,y-h+bob-da*20*u,w,h)}X.restore();if(da)return;
  const bw=Math.min(90,Math.max(w*.9,60));lab.push(()=>{X.font=(fs-2)+'px '+FONT;txt(e.n,x,y+fs+4,fs-2,'#fff','center');X.fillStyle='#400';X.fillRect(x-bw/2,y+fs+10,bw,6);X.fillStyle='#e44';X.fillRect(x-bw/2,y+fs+10,bw*e.hp/e.mhp,6)});
  if(B.ph=='target'&&B.tk=='E'){if(B.sel==i)txt('▼',x,y-h-6+Math.sin(t*8)*3,fs+6,'#ff0','center');H.push({x:x-Math.max(w,60)/2,y:y-h-10,w:Math.max(w,60),h:h+fs+30,fn:()=>{B.sel=i;press('ok')}})}});
 lab.forEach(f=>f());
 // ---- 我方（斜排；依腳底 y 由上往下畫）
 B.pose={};const order=G.party.map((p,i)=>i).sort((a,b)=>B.feetOf(G.party[a])[1]-B.feetOf(G.party[b])[1]);
 order.forEach(i=>{const p=G.party[i],F=B.feetOf(p),sl=bSlot(p,i),act=i==B.ai&&B.ph!='msg'&&!B.won,ps=bPose(p,sl,now,F,s,L);B.pose[i]=ps.name;
  const im=I[ps.pre+'_'+ps.name]?.naturalWidth?I[ps.pre+'_'+ps.name]:I[ps.pre+'_idle0'];const hx=ps.hit?Math.sin(now/20)*4*u:0,x=F[0]+ps.dx+hx,y=F[1]+ps.dy,al=ent*(p.hp>0||ps.name==='down'?1:.35);
  X.fillStyle='rgba(0,0,0,.38)';X.beginPath();X.ellipse(x,y-2*u,58*s,Math.max(5,15*s),0,0,7);X.fill();
  if(im?.naturalWidth){X.save();X.globalAlpha=al;if(ps.hit&&Math.floor((now-(B.fx.find(f=>f.t===p&&!f.heal&&now>=f.at&&now-f.at<HIT_MS)||{at:0}).at)/70)%2)X.globalAlpha*=.6;X.drawImage(im,x-BFR.fx*s,y-BFR.fy*s,BFR.w*s,BFR.h*s);X.restore()}
  if(p.guard&&p.hp>0)shield(x,y-125*s,70*s,140*s,.3+Math.sin(t*4)*.1);
  if(act||(B.ph=='target'&&B.tk=='A'&&B.sel==i))txt('▼',x,y-290*s+Math.sin(t*6)*2,fs,'#ff0','center');
  if(B.ph=='target'&&B.tk=='A')H.push({x:F[0]-Math.max(55*s,24),y:F[1]-285*s,w:Math.max(110*s,48),h:295*s,fn:()=>{B.sel=i;press('ok')}})});
 B.fx=B.fx.filter(f=>now-f.at<1000);
 drawVFX(now);UI();
 // ---- 底部角色卡
 B.cards=[];G.party.forEach((p,i)=>{const act=i==B.ai&&B.ph!='msg'&&!B.won,c=drawCard(L,p,i,act,fs,now);B.cards.push(c);
  if(B.ph=='target'&&B.tk=='A')H.push({x:c.x,y:c.y,w:c.w,h:c.h,fn:()=>{B.sel=i;press('ok')}})});
 // ---- 指令：八角小圖示鈕（右下往上疊；逃跑在左上）；技能／道具清單浮在卡片上方
 let info='';const bhs=Math.max(46,L.bd+6),push=(cx,cy,fn)=>H.push({x:cx-bhs/2,y:cy-bhs/2,w:bhs,h:bhs,fn});
 if(B.ph=='cmd'){const G4=[['攻',0],['技',1],['道',2],['防',3]];
  G4.forEach(([ch,i])=>{const cx=L.bx,cy=L.by+i*L.bs,sel=B.sel==i;octBtn(cx,cy,L.bd,ch,sel,fs);push(cx,cy,()=>{B.sel=i;press('ok')})});
  octBtn(L.ex[0],L.ex[1],L.bd,'逃',B.sel==4,fs);push(L.ex[0],L.ex[1],()=>{B.sel=4;press('ok')})}
 else if(B.ph=='skill'||B.ph=='item'){let LL;
  if(B.ph=='skill'){LL=u2.skills.map(sk=>sk+' '+SK[sk].mp+'MP');info=SK[u2.skills[B.sel]]?SK[u2.skills[B.sel]].d:''}
  else{const ks=Object.keys(G.inv).filter(i=>G.inv[i]>0);LL=ks.map(k=>k+'×'+G.inv[k]);info=ks[B.sel]?ITEMS[ks[B.sel]].d:''}
  const lh=fs+16,pw=Math.min(L.aw-24,Math.max(190,fs*11)),ph=(LL.length+1)*lh+12,px=SW-SA.r-12-pw,py=Math.max(SA.t+80,Math.min(L.cy-8-ph,L.by-24));box(px,py,pw,ph,.95);
  [...LL,'◀ 返回'].forEach((l,i)=>{const isB=i==LL.length,sel=!isB&&i==B.sel,iy=py+6+i*lh;
   if(sel){X.fillStyle='rgba(255,230,120,.16)';rr(px+5,iy,pw-10,lh-2,5);X.fill()}
   txt((sel?'▶ ':'')+l,px+16,iy+lh/2+fs*.36,fs,isB?'#9cf':sel?'#ffe9a8':'#fff');
   H.push({x:px,y:iy,w:pw,h:lh,fn:isB?()=>press('cancel'):()=>{B.sel=i;press('ok')}})})}
 else if(B.ph=='target'){info=B.tk=='E'?'點選敵人':'點選隊友';octBtn(L.bx,L.by,L.bd,'返',false,fs);push(L.bx,L.by,()=>press('cancel'))}
 // ---- 傷害數字
 for(const f of B.fx){if(now<f.at)continue;const a=(now-f.at)/1000,q=B.po(f.t);const x=q[0],y=q[1]-q[3]*.3;const sc=a<.12?.4+a/.12*(f.crit?1.4:1):(f.crit?1.8:1.4)-Math.min(f.crit?.6:.4,(a-.12)*2.2);
  const s0=f.heal?'+'+f.d:''+f.d,col=f.heal?'#7f7':f.crit?'#ffe14a':B.en.includes(f.t)?'#fff':'#f88';X.save();X.globalAlpha=Math.min(1,(1-a)*2.2);X.translate(x,y-a*34*u);X.scale(sc,sc);X.font='bold '+(fs+8)+'px '+FONT;X.textAlign='center';X.lineWidth=4;X.strokeStyle=f.heal?'#031':'#000';X.strokeText(s0,0,0);X.fillStyle=col;X.fillText(s0,0,0);
  if(f.crit){X.font='bold '+(fs-1)+'px '+FONT;X.strokeText('會心！',0,-fs-4);X.fillStyle='#ffb02e';X.fillText('會心！',0,-fs-4)}X.restore()}
 if(B.fl){const a=(now-B.fl.at)/B.fl.d;if(a<1){X.fillStyle='rgba('+B.fl.c+','+(B.fl.k*(1-a))+')';X.fillRect(0,0,SW,SH)}else B.fl=null}
 // ---- 上方訊息框（指令選單時讓出左上角的逃跑鈕）
 const left=B.ph=='cmd'?SA.l+14+L.bd+8:SA.l+8,mw=Math.min(SW-SA.r-8-left,640),mx=left,my=SA.t+8;
 if(B.ph=='msg'){const M0=B.msgs[0],T0=Array.isArray(M0)?M0[0]:(M0||''),mk=B.msgs.length+T0;if(Array.isArray(M0)&&M0[1].at==null)startFx(M0[1],now);if(B.mk!==mk){B.mk=mk;B.mT=now}else if(now-B.mT>1500){B.mk=null;press('ok')}X.font=fs+'px '+FONT;const ls=wrap(T0,mw-28).slice(0,3);box(mx,my,mw,ls.length*(fs+8)+22,.93);ls.forEach((l,j)=>txt(l,mx+14,my+fs+10+j*(fs+8),fs));txt('▼',mx+mw-20,my+ls.length*(fs+8)+14,fs-5,'#c9b26b')}
 else{X.font=fs+'px '+FONT;const ls=wrap(u2.n+' 的行動'+(info?'：'+info:''),mw-28).slice(0,2);box(mx,my,mw,ls.length*(fs+8)+16,.93);ls.forEach((l,j)=>txt(l,mx+14,my+fs+8+j*(fs+8),fs,'#ffd'))}}
function bTap(x,y){const B=G.B;if(!B||G.mode!='battle')return;if(B.ph=='msg'){B.mk=null;press('ok');return}
 const h=(B.hit||[]).slice().reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(h)h.fn()}
{const tp=(x,y)=>{if(G.mode=='battle')bTap(x,y)};cv.addEventListener('touchstart',e=>{if(G.mode!='battle')return;e.preventDefault();const r=cv.getBoundingClientRect();for(const t of e.changedTouches)tp(t.clientX-r.left,t.clientY-r.top)},{passive:false});
 cv.addEventListener('mousedown',e=>{const r=cv.getBoundingClientRect();tp(e.clientX-r.left,e.clientY-r.top)});}
