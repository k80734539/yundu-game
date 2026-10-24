'use strict';
// 戰鬥畫面：底部面板(左狀態/右指令)、觸控 bTap
function drawBattle(now){const B=G.B,t=now/1000;UI();let SX=0,SY=0;if(B.shk){const a=(now-B.shk.at)/B.shk.d;if(a<1){const k=B.shk.a*(1-a);SX=(Math.random()*2-1)*k;SY=(Math.random()*2-1)*k}else B.shk=null}X.translate(SX,SY);X.fillStyle='#000';X.fillRect(0,0,SW,SH);cover(I[B.opt.bg||'bg_reeds'],.5,.6);X.fillStyle='rgba(0,0,20,.22)';X.fillRect(0,0,SW,SH);
 const port=SH>SW,fs=port&&SH<640?Math.min(FS(),13):FS(),u=Math.min(SW,SH)/400,n=B.en.length,np=G.party.length,ent=Math.min(1,(now-G.bT)/400);const H=B.hit=[];
 const u2=G.party[B.ai]||G.party[0];let L=[],info='',back=false;
 if(B.ph=='cmd')L=['攻擊','技能','道具','防禦','逃跑'];
 if(B.ph=='skill'){L=u2.skills.map(s=>s+' '+SK[s].mp+'MP');info=SK[u2.skills[B.sel]]?SK[u2.skills[B.sel]].d:'';back=true}
 if(B.ph=='item'){const ks=Object.keys(G.inv).filter(i=>G.inv[i]>0);L=ks.map(k=>k+'×'+G.inv[k]);info=ks[B.sel]?ITEMS[ks[B.sel]].d:'';back=true}
 if(B.ph=='target'){L=[B.tk=='E'?'點選敵人':'點選隊友'];back=true}
 const LL=back?[...L,'◀ 返回']:L;
 // ---- bottom panel geometry
 const lh=fs+(port?12:10),cols=port?1:2,nR=port?Math.max(5,LL.length):Math.max(3,Math.ceil(LL.length/2)),rh=fs*2+18;
 const x0=SA.l+6,pW=SW-SA.l-SA.r-12,mW=port?Math.max(fs*6.6,pW*.36):Math.min(fs*13,pW*.42),ph=Math.max(np*rh+12,nR*lh+16),y0=SH-SA.b-ph-6;
 const sW=pW-mW-6;
 // ---- sprites geometry
 const ps=(port?1.55:1.6)*u*(port&&SH<600?.95:1),sh=66*ps,base=y0-4;
 const PP=i=>port?[SW/2+(i-(np-1)/2)*Math.min(110*u,(pW)/Math.max(np,1)),base]:[SW-SA.r-70*u-(np-1-i)*80*u,base-(np-1-i)*0];
 const ecx=port?SW/2:SA.l+(SW-SA.l-SA.r)*.36,ey=port?base-sh-fs-20:base-fs-22,top=SA.t+fs*2+34;
 const need=.75*(B.en.some(e=>e.boss)?260:135)*u,es=Math.max(.35,Math.min(1,(ey-top)/need));
 const spc=Math.min(170*u,(port?SW-40:SW*.55)/Math.max(n,1));
 const current=B.ph==='msg'&&B.msgs[0];if(Array.isArray(current)&&current[1].motion==='qzAttack'&&current[1].at==null)startFx(current[1],now);
 B.po=o=>{const ei=B.en.indexOf(o);if(ei>=0){const im=I[o.e],s2=(o.boss?(port?.95:.78):o.e=='lu'?.72:.75)*u*es;return[ecx+(ei-(n-1)/2)*spc,ey-im.height*s2/2,im.width*s2,im.height*s2]}const pi=G.party.indexOf(o),q=PP(Math.max(0,pi));return[q[0],q[1]-sh*.45,40*ps,sh]};B.u=u;
 X.font=(fs-2)+'px '+FONT;
 const stage={left:SA.l, right:SW-SA.r,top,bottom:y0-2,labels:B.en.map(e=>{const q=B.po(e),bw=Math.max(Math.min(90,q[2]*.9),X.measureText(e.n).width+8);return{x:q[0]-bw/2,y:ey+3,w:bw,h:fs+18}})};
 B.qzPose=null;
 // enemies
 B.en.forEach((e,i)=>{let da=0;if(e.hp<=0&&e.dieAt){if(now>e.dieAt+650)return;if(now>e.dieAt){da=(now-e.dieAt)/650;if(!e.dz){e.dz=1;const q=B.po&&B.po(e);if(q)for(let k=0;k<26;k++)vp({x:q[0]+(Math.random()-.5)*q[2]*.7,y:q[1]+(Math.random()-.5)*q[3]*.7,vx:(Math.random()-.5)*1.2,vy:-1-Math.random()*2.2,col:k%2?'#bfe8ff':'#fff',sz:2+Math.random()*3,life:500+Math.random()*400})}}}const im=I[e.e],s=(e.boss?(port?.95:.78):e.e=='lu'?.72:.75)*u*es,w=im.width*s,h=im.height*s,x=ecx+(i-(n-1)/2)*spc,y=ey,bob=Math.sin(t*2.2+e.ph)*3*u;
  const fx=B.fx.find(f=>f.t==e&&!f.heal&&now>=f.at&&now-f.at<500);X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(x,y,w*.38,8*u,0,0,7);X.fill();
  X.save();X.globalAlpha=ent*(1-da);if(fx&&Math.floor((now-fx.at)/70)%2)X.globalAlpha*=.4;if(da){X.translate(x,y);X.scale(1+da*.25,1-da*.5);X.translate(-x,-y)}X.drawImage(im,x-w/2+(fx?Math.sin(now/20)*3:0),y-h+bob-da*20*u,w,h);if(da>0){X.globalCompositeOperation='lighter';X.globalAlpha=(1-da)*.6;X.drawImage(im,x-w/2,y-h+bob-da*20*u,w,h)}X.restore();if(da)return;
  if(B.ph=='target'&&B.tk=='E')H.push({x:x-Math.max(w,60)/2,y:y-h-10,w:Math.max(w,60),h:h+fs+30,fn:()=>{B.sel=i;press('ok')}})});
 // party sprites
 G.party.forEach((p,i)=>{const [x,y]=PP(i),hf=B.fx.find(f=>f.t==p&&!f.heal&&now>=f.at&&now-f.at<500),act=i==B.ai&&B.ph!='msg',lunge=B.ph=='msg'&&i==B.ai&&B.fx.some(f=>B.en.includes(f.t)&&!f.sp?.motion&&now-f.at<450);
  const pose=p.e==='qz'&&B.qzMotion?.src===p?qzAttackPose(now,[x,y],B.po(B.qzMotion.tg[0]),I.qz_left0.width*ps,I.qz_left0.height*ps,stage):null;if(pose)B.qzPose=pose;
  const d=pose?(pose.dir>0?'left':'right'):port?'up':'left',fr=pose?pose.frame:lunge?1:(act?Math.floor(t*4)%2*2:0),im=I[p.e+'_'+d+fr]||I[p.e+'_'+d+'0'];if(!im)return;const w=im.width*ps,h=im.height*ps;
  let dx=0,dy=0;if(lunge){if(port)dy=-14*u;else dx=-22*u}if(hf)dx+=Math.sin(now/20)*4;
  if(pose)drawQzAttack(im,pose,w,h,u,ent*(p.hp>0?1:.35),stage);else{
  X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(x,y-3,w*.28,6*u,0,0,7);X.fill();
  X.save();X.globalAlpha=ent*(p.hp>0?1:.35);if(hf&&Math.floor((now-hf.at)/70)%2)X.globalAlpha*=.4;X.drawImage(im,x-w/2+dx,y-h+dy,w,h);X.restore()}if(p.guard&&p.hp>0)shield(x+dx,y-h*.5+dy,w*.62,h*.58,.35+Math.sin(t*4)*.1);
  if(act||(B.ph=='target'&&B.tk=='A'&&B.sel==i))txt('▼',x,y-h-2+Math.sin(t*6)*2,fs,'#ff0','center');
  if(B.ph=='target'&&B.tk=='A')H.push({x:x-w/2,y:y-h,w,h,fn:()=>{B.sel=i;press('ok')}})});
 // Draw enemy labels above sprites so motion never cuts holes through a character or weapon.
 B.en.forEach((e,i)=>{const q=B.po(e),im=I[e.e],s=(e.boss?(port?.95:.78):e.e=='lu'?.72:.75)*u*es,w=im.width*s,h=im.height*s,x=ecx+(i-(n-1)/2)*spc,y=ey,bw=Math.min(90,w*.9);if(e.hp<=0&&e.dieAt)return;txt(e.n,x,y+fs+6,fs-2,'#fff','center');X.fillStyle='#400';X.fillRect(x-bw/2,y+fs+12,bw,6);X.fillStyle='#e44';X.fillRect(x-bw/2,y+fs+12,bw*e.hp/e.mhp,6);if(B.ph=='target'&&B.tk=='E'&&B.sel==i)txt('▼',x,y-h-6+Math.sin(t*8)*3,fs+6,'#ff0','center')});
 B.fx=B.fx.filter(f=>now-f.at<1000);
 drawVFX(now);UI();
 // bottom panel
 box(x0,y0,pW,ph,.94);
 G.party.forEach((p,i)=>{const x=x0+8,y=y0+6+i*rh,w=sW-10,act=i==B.ai&&B.ph!='msg';
  if(act){X.fillStyle='rgba(255,230,120,.12)';X.fillRect(x-2,y,w+4,rh-4);X.strokeStyle='#ff0';X.lineWidth=1.5;rr(x-2,y,w+4,rh-4,5);X.stroke()}
  const is=rh-10;X.globalAlpha=p.hp>0?1:.4;X.drawImage(I['pt_'+p.e],x+2,y+3,is,is);X.globalAlpha=1;const tx=x+is+8,tw=w-is-10;
  txt(p.n,tx,y+fs+2,fs,p.hp>0?'#fff':'#888');txt('Lv'+p.lv+(p.st?' 毒':'')+(p.guard?' 防':''),tx+X.measureText(p.n).width+6,y+fs+2,fs-4,p.st?'#f9a':'#cde');
  txt(p.hp+'/'+p.mhp,x+w-2,y+fs+2,fs-3,'#cfc','right');
  const by=y+fs+8;X.fillStyle='#300';X.fillRect(tx,by,tw,6);X.fillStyle='#4c4';X.fillRect(tx,by,tw*p.hp/p.mhp,6);
  X.fillStyle='#003';X.fillRect(tx,by+9,tw*.6,4);X.fillStyle='#48f';X.fillRect(tx,by+9,tw*.6*p.mp/p.mmp,4);txt('MP '+p.mp,x+w-2,by+15,fs-5,'#cdf','right');
  if(B.ph=='target'&&B.tk=='A')H.push({x,y,w,h:rh,fn:()=>{B.sel=i;press('ok')}})});
 const mx0=x0+pW-mW,colw=(mW-8)/cols;X.strokeStyle='rgba(201,178,107,.5)';X.beginPath();X.moveTo(mx0-3,y0+8);X.lineTo(mx0-3,y0+ph-8);X.stroke();
 if(B.ph=='msg')txt('點擊繼續 ▶',mx0+mW/2,y0+ph/2+fs/3,fs-2,'rgba(220,220,240,.6)','center');
 else LL.forEach((l,i)=>{const c=i%cols,r=Math.floor(i/cols),ix=mx0+4+c*colw,iy=y0+8+r*lh,isB=back&&i==LL.length-1,sel=!isB&&i==B.sel&&B.ph!='target';
  if(sel){X.fillStyle='rgba(255,230,120,.16)';rr(ix,iy,colw-4,lh-2,5);X.fill()}
  txt((sel?'▶ ':'')+l,ix+8,iy+lh/2+fs*.36,fs,isB?'#9cf':sel?'#ffe9a8':B.ph=='target'?'#ccc':'#fff');
  H.push({x:ix,y:iy,w:colw-4,h:lh,fn:isB?()=>press('cancel'):B.ph=='target'?()=>{}:()=>{B.sel=i;press('ok')}})});
 // damage popups
 for(const f of B.fx){if(now<f.at)continue;const a=(now-f.at)/1000,q=B.po(f.t);const x=q[0],y=q[1]-q[3]*.3;const sc=a<.12?.4+a/.12*(f.crit?1.4:1):(f.crit?1.8:1.4)-Math.min(f.crit?.6:.4,(a-.12)*2.2);
  const s0=f.heal?'+'+f.d:''+f.d,col=f.heal?'#7f7':f.crit?'#ffe14a':B.en.includes(f.t)?'#fff':'#f88';X.save();X.globalAlpha=Math.min(1,(1-a)*2.2);X.translate(x,y-a*34*u);X.scale(sc,sc);X.font='bold '+(fs+8)+'px '+FONT;X.textAlign='center';X.lineWidth=4;X.strokeStyle=f.heal?'#031':'#000';X.strokeText(s0,0,0);X.fillStyle=col;X.fillText(s0,0,0);
  if(f.crit){X.font='bold '+(fs-1)+'px '+FONT;X.strokeText('會心！',0,-fs-4);X.fillStyle='#ffb02e';X.fillText('會心！',0,-fs-4)}X.restore()}
 if(B.fl){const a=(now-B.fl.at)/B.fl.d;if(a<1){X.fillStyle='rgba('+B.fl.c+','+(B.fl.k*(1-a))+')';X.fillRect(0,0,SW,SH)}else B.fl=null}
 // top bar
 const mw=Math.min(SW-SA.l-SA.r-16,640),mx=(SW-mw)/2,my=SA.t+8;
 if(B.ph=='msg'){const M0=B.msgs[0],T0=Array.isArray(M0)?M0[0]:(M0||''),mk=B.msgs.length+T0;if(Array.isArray(M0)&&M0[1].at==null)startFx(M0[1],now);if(B.mk!==mk){B.mk=mk;B.mT=now}else if(now-B.mT>1500){B.mk=null;press('ok')}X.font=fs+'px '+FONT;const ls=wrap(T0,mw-28).slice(0,3);box(mx,my,mw,ls.length*(fs+8)+22,.93);ls.forEach((l,j)=>txt(l,mx+14,my+fs+10+j*(fs+8),fs));txt('▼',mx+mw-20,my+ls.length*(fs+8)+14,fs-5,'#c9b26b')}
 else{X.font=fs+'px '+FONT;const ls=wrap(u2.n+' 的行動'+(info?'：'+info:''),mw-28).slice(0,2);box(mx,my,mw,ls.length*(fs+8)+16,.93);ls.forEach((l,j)=>txt(l,mx+14,my+fs+8+j*(fs+8),fs,'#ffd'))}}
function bTap(x,y){const B=G.B;if(!B||G.mode!='battle')return;if(B.ph=='msg'){B.mk=null;press('ok');return}
 const h=(B.hit||[]).slice().reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(h)h.fn()}
{const tp=(x,y)=>{if(G.mode=='battle')bTap(x,y)};cv.addEventListener('touchstart',e=>{if(G.mode!='battle')return;e.preventDefault();const r=cv.getBoundingClientRect();for(const t of e.changedTouches)tp(t.clientX-r.left,t.clientY-r.top)},{passive:false});
 cv.addEventListener('mousedown',e=>{const r=cv.getBoundingClientRect();tp(e.clientX-r.left,e.clientY-r.top)});}
