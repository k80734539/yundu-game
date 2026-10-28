'use strict';
// v22 戰鬥畫面：全螢幕背景＋左中右橫向站位（敵人左上、我方左／中／右排開，中間略低）、八角指令鈕、底部三張角色卡、觸控 bTap
// 設計座標：直式 390×844（我方腳底 左雲纖(110,640) 中青舟(210,670) 右白苓(310,640)），依實際畫面等比縮放；橫式另有一組座標。
// v29: keep opposing diagonal ranks and leave a wider central battle lane.
const BP_FEET=[[205,700],[250,610],[295,520]],BP_EN={1:[[105,460]],2:[[75,525],[140,365]],3:[[70,540],[115,390],[150,260]],b:[[105,460]]};
function bLayout(n){const port=SH>SW,aw=SW-SA.l-SA.r,L={port,aw};
 L.U=port?Math.min(SW/390,SH/844):SH/390;L.s=BFR.scale*L.U*(port?1:CFG.battleUi.landscapeScale);L.eu=L.U;
 L.ch=port?Math.max(62,Math.round(82*L.U)):54;L.cy=SH-SA.b-L.ch-8;const gap=port?10:8;
 L.cw=port?(aw-24-gap*2)/3:Math.min(210,(aw-24-gap*2)/3);L.cx0=port?SA.l+12:SA.l+(aw-(L.cw*3+gap*2))/2;L.gap=gap;
 const fp=port?(q=>[SW/2+(SA.l-SA.r)/2+(q[0]-195)*L.U,SH-SA.b-(844-q[1])*L.U]):null;
 if(port){L.feet=BP_FEET.map(q=>fp([q[0]+15,q[1]]));L.en=(k,boss)=>(BP_EN[boss?'b':Math.min(3,k)]||BP_EN[1]).map(q=>fp([q[0]-15,q[1]-35]))}
 else{const k=SH/390,cx=SA.l+aw*.77;L.feet=[[cx-80*k,L.cy-34*k],[cx,L.cy-88*k],[cx+64*k,L.cy-142*k]];
  const ex=SA.l+Math.max(aw*.23,162*k+12),ey=L.cy-125*k;L.en=(m,boss)=>boss?[[ex,ey+15*k]]:m===1?[[ex,ey]]:m===2?[[ex-58*k,ey+20*k],[ex+58*k,ey-35*k]]:[[ex-96*k,ey+36*k],[ex,ey-10*k],[ex+96*k,ey-56*k]]}
 // 指令鈕（畫面右緣中段、由上往下疊，仿仙劍；不遮住任何角色）：直式 x=SW-SA.r-40、第一顆在 SH*.30，每 50px 一顆；逃跑在左上
 L.bd=Math.max(34,Math.min(44,40*Math.max(.9,L.U)));L.bs=Math.max(46,Math.round(50*Math.max(.92,L.U)));L.bx=SW-SA.r-(port?Math.max(34,40*L.U):34);L.by=Math.max(SA.t+86,Math.round(port?SH*.30:SA.t+96*L.U));
 L.pd=Math.min(L.cw*(port?.96:.74),Math.max(90,SH*(port?.16:.20)));L.py=L.cy+L.ch-L.pd;L.infoTop=Math.max(L.cy+L.ch*.42,L.py+L.pd*.66);
 L.ex=[SA.l+14+L.bd/2,SA.t+14+L.bd/2];return L}
function bSlot(p,i){return BSLOT[p.e]!=null?BSLOT[p.e]:Math.min(i,2)}
function oct(cx,cy,r){X.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=cx+Math.cos(a)*r*1.0824,y=cy+Math.sin(a)*r*1.0824;i?X.lineTo(x,y):X.moveTo(x,y)}X.closePath()}
function octBtn(cx,cy,d,ch,sel,fs){
 X.save();X.shadowColor='rgba(0,0,0,.8)';X.shadowBlur=5;X.shadowOffsetY=3;
 const metal=X.createLinearGradient(cx-d/2,cy-d/2,cx+d/2,cy+d/2);metal.addColorStop(0,'#fff0b0');metal.addColorStop(.25,'#a78c4d');metal.addColorStop(.6,'#55472d');metal.addColorStop(1,'#dec78d');
 oct(cx,cy,d/2);X.fillStyle=metal;X.fill();X.shadowBlur=0;X.shadowOffsetY=0;
 oct(cx,cy,d/2-3);const fill=X.createLinearGradient(cx,cy-d/2,cx,cy+d/2);fill.addColorStop(0,sel?'#655536':'#293c38');fill.addColorStop(1,'#151a20');X.fillStyle=fill;X.fill();X.strokeStyle=sel?'#ffe8a3':'#b6a16c';X.lineWidth=1;X.stroke();
 oct(cx,cy,d/2-6);X.strokeStyle='rgba(235,218,161,.28)';X.stroke();
 const labels={攻:'攻擊',技:'法術',道:'物品',防:'防禦',逃:'逃跑',返:'返回'},label=labels[ch]||ch,size=Math.min(fs,d*.30);
 X.font='bold '+Math.round(size)+'px '+FONT;X.textAlign='center';X.lineJoin='round';X.lineWidth=3;X.strokeStyle='#09202a';X.strokeText(label,cx,cy+size*.36);X.fillStyle=sel?'#ecffe7':'#75e5de';X.fillText(label,cx,cy+size*.36);X.restore()}
function drawCard(L,p,i,act,fs,now){
 const x=L.cx0+i*(L.cw+L.gap),w=L.cw,h=L.ch,y=L.cy,pt=I['pt_'+p.e+'_battle']?.naturalWidth?I['pt_'+p.e+'_battle']:I['pt_'+p.e];
 const d=L.pd,bx=L.port?x+(w-d)/2:x+4,by=L.py;
 X.save();X.globalAlpha=p.hp>0?1:.4;X.shadowColor=act?'rgba(247,211,137,.65)':'rgba(0,0,0,.55)';X.shadowBlur=act?8:3;
 if(pt?.naturalWidth)X.drawImage(pt,bx,by,d,d);X.restore();
 X.save();const shade=X.createLinearGradient(x,L.infoTop,x,y+h);shade.addColorStop(0,'rgba(18,24,29,.22)');shade.addColorStop(1,'rgba(12,20,28,.94)');X.fillStyle=shade;X.fillRect(x,L.infoTop,w,y+h-L.infoTop);
 X.strokeStyle=act?'#e8cb8c':'rgba(176,155,105,.55)';X.lineWidth=act?1.5:1;X.strokeRect(x+.5,L.infoTop+.5,w-1,y+h-L.infoTop-1);
 const nf=Math.max(10,Math.min(L.port?12:15,fs)),right=x+w-7,hpy=y+h*.71,mpy=y+h*.96;
 X.shadowColor='#000';X.shadowBlur=3;
 txt(p.n,L.port?x+7:right,L.port?hpy:y+12,nf,act?'#ffe6ab':'#e8e6d8',L.port?'left':'right');
 txt(Math.max(0,p.hp)+'/'+p.mhp,right,hpy,nf,'#efa588','right');txt(Math.max(0,p.mp)+'/'+p.mmp,right,mpy,nf,'#83cce6','right');
 if(p.st||p.guard||p.weak||p.sealed)txt(p.st?'毒':p.sealed?'封':p.weak?'弱':'防',x+7,mpy,nf-1,p.st?'#e9a4cb':p.sealed||p.weak?'#ffd68a':'#c8ded5');X.shadowBlur=0;
 X.restore();
 return{x,y:L.py,w,h:y+h-L.py,portrait:{x:bx,y:by,w:d,h:d},infoTop:L.infoTop}}
// v24: supplied enemy poses, one shared scale and ground anchor per creature.
const EART={
  "shui": {
    "factor": 0.48,
    "x": 256,
    "y": 474,
    "size": 512
  },
  "lu": {
    "factor": 0.5329153605015674,
    "x": 256,
    "y": 474,
    "size": 512
  },
  "laolu": {
    "factor": 0.42,
    "x": 256,
    "y": 474,
    "size": 512
  },
  "hebo": {
    "factor": 0.9259259259259259,
    "x": 256,
    "y": 474,
    "size": 512
  }
};
function enemyPose(e,now){const B=G.B;
 if(e.hp<=0&&e.dieAt!=null&&now>=e.dieAt)return 'down';
 if(B.fx.some(f=>f.t===e&&!f.heal&&now>=f.at&&now-f.at<450))return 'hit';
 const a=(B.vx||[]).findLast(sp=>sp.src===e&&sp.at!=null&&now>=sp.at&&now-sp.at<(VDUR[sp.k]||500));
 if(a){if(a.k==='wave')return e.e==='hebo'?'wave':'cast';if(e.e==='hebo'&&(a.k==='drink'||a.k==='whirl'))return a.k;if(e.e==='hebo'&&a.k==='roar')return 'cast';return now-a.at<100?'cast':'attack'}
 if(e.e==='hebo'&&B.hebo){const hs=B.hebo.state;if(hs===HEBO_STATE.CHARGING)return 'charge'+(Math.floor(now/280)%2);if(hs===HEBO_STATE.STAGGERED)return 'stagger';if(B.heboPhase2)return 'rage'+((Math.floor(now/600)+Math.floor(e.ph))%2)}
 return 'idle'+((Math.floor(now/600)+Math.floor(e.ph))%2)}
function enemyImage(e,now,x,y,scale){const c=EART[e.e],pose=enemyPose(e,now);let im=I[e.e+'_'+pose];if(!im?.naturalWidth&&/^(charge|stagger|rage|wave)/.test(pose))im=I[e.e+'_idle0'];
 if(c&&im?.naturalWidth){const z=c.factor*scale;return{im,x:x-c.x*z,y:y-c.y*z,w:c.size*z,h:c.size*z,pose}}
 const base=I[e.e];return{im:base,x:x-base.width*scale/2,y:y-base.height*scale,w:base.width*scale,h:base.height*scale,pose:'fallback'}}
function drawBattleBackground(B){const requested=B.opt.bg||'bg_reeds',key=I[requested]?.naturalWidth?requested:'bg_reeds',im=I[key];if(im?.naturalWidth){B.bgFit=Object.assign(cover(im,.5,.5),{key,width:im.naturalWidth,height:im.naturalHeight})}else{B.bgFit=null;X.fillStyle='#24343c';X.fillRect(-20,-20,SW+40,SH+40)}}
// 河伯戰：行動預告氣泡、水位條、渡氣珠（圖示來自 ui_*.webp，沒載入時畫簡單圓形）
const TIDE_COL=['#9fd8ff','#ffffff','#ffb36b'],INTENT_RING={tail:'#ffffff',charge:'#ffd86b',wave:'#ff6b6b',stagger:'#b9a0ff',drink:'#ffd86b',whirl:'#ffd86b',spear:'#ff8a5c',roar:'#ffd86b'},INTENT_ICON={spear:'charge',roar:'tail'};
const INTENT_TXT={tail:'龍尾：打一人',charge:'蓄力！下一擊濁浪',wave:'濁浪：全隊大傷・可擋',stagger:'失衡：動不了',drink:'吞水：回復體力',whirl:'漩渦：封一人法術',spear:'水柱：標記的人防禦',roar:'龍吼：全隊攻擊下降'};
const INTENT_TIP={tail:'龍尾橫掃：隨機打其中一個人。',charge:'河伯正在蓄力，下一次行動就是濁浪滔天。',wave:'濁浪滔天：全隊大傷害！點準光環就能撐篙擋住。',stagger:'河伯失衡了，這回合動不了，趁機猛攻！',drink:'吞水：河伯會回復一些體力。',whirl:'漩渦：打一個人，並封住他下一回合的法術。',spear:'水柱突刺：腳下有水紋的那個人會被重擊，那個人「防禦」就能完全擋住。',roar:'龍吼：全隊受到一點傷害，攻擊力下降兩回合。春霖或清心草可以解除。'};
function uiIcon(key,x,y,s,ring,alpha){const im=I[key];X.save();X.globalAlpha=alpha==null?1:alpha;
 X.fillStyle='rgba(8,18,28,.78)';X.beginPath();X.arc(x+s/2,y+s/2,s/2,0,7);X.fill();
 if(im?.naturalWidth){const k=s*.8/Math.max(im.naturalWidth,im.naturalHeight);X.drawImage(im,x+s/2-im.naturalWidth*k/2,y+s/2-im.naturalHeight*k/2,im.naturalWidth*k,im.naturalHeight*k)}
 else{X.fillStyle=ring||'#fff';X.beginPath();X.arc(x+s/2,y+s/2,s*.22,0,7);X.fill()}
 if(ring){X.strokeStyle=ring;X.lineWidth=Math.max(2,s*.07);X.beginPath();X.arc(x+s/2,y+s/2,s/2-1,0,7);X.stroke()}X.restore()}
function setTip(B,t,now){B.tipTxt=t;B.tipT=now}
function drawIntent(B,lx,y,fs,H,now){if(!B.hebo)return;const f=heboForecast(B,2),sz=Math.max(11,fs-3),ic=Math.max(28,fs*1.9),ar=Math.max(10,ic*.4);
 // 小型：兩個圖示＋箭頭，沒有底板；第一個圖示下方只有兩個字，細節點圖示才顯示
 const w=ic+ar+ic*.84+8,x=Math.max(SA.l+4,Math.min(lx,SW-SA.r-84-w)),s2=ic*.84;
 const draw=(o,xx,yy,s,dim)=>uiIcon('ui_intent_'+(INTENT_ICON[o.k]||o.k),xx,yy,s,INTENT_RING[o.k],dim);
 draw(f[0],x,y,ic,1);
 X.save();X.globalAlpha=.8;X.fillStyle='#e8f4ff';X.font=sz+'px '+FONT;X.textAlign='center';X.fillText('›',x+ic+ar/2,y+ic/2+sz*.3);X.restore();
 if(f[1])draw(f[1],x+ic+ar,y+(ic-s2)/2,s2,.8);
 const lab=f[0].a,col=f[0].k==='wave'?'#ff9a9a':f[0].k==='stagger'?'#d8c8ff':'#ffe9b0';
 X.save();X.shadowColor='#000';X.shadowBlur=4;txt(lab,x+ic/2,y+ic+sz+1,sz,col,'center');X.restore();
 H.push({x:x,y:y,w:ic,h:ic+sz+4,fn:()=>setTip(B,'河伯下一步：'+INTENT_TIP[f[0].k],performance.now())});
 if(f[1])H.push({x:x+ic+ar,y:y,w:s2,h:ic,fn:()=>setTip(B,'再下一步：'+INTENT_TIP[f[1].k],performance.now())})}
function drawTideGauge(B,fs,H,now){if(!B.hebo)return;const td=tideNow(B),gw=Math.max(24,fs*1.9),gh=Math.min(SH*.26,140),gx=SA.l+6,gy=SA.t+Math.max(82,fs*4.4),seg=gh/3,segOf=t=>2-t;
 [2,1,0].forEach((t,i)=>{X.fillStyle=t===td?TIDE_COL[t]:'rgba(20,34,46,.55)';X.globalAlpha=t===td?.55:1;X.fillRect(gx+gw*.2,gy+i*seg+2,gw*.6,seg-4);X.globalAlpha=1});
 const gi=I.ui_tide_gauge;if(gi?.naturalWidth)X.drawImage(gi,gx,gy,gw,gh);else{X.strokeStyle='#c9a85c';X.lineWidth=2;X.strokeRect(gx+gw*.2,gy,gw*.6,gh)}
 const my=gy+segOf(td)*seg+seg/2,mk=I.ui_tide_marker;if(mk?.naturalWidth)X.drawImage(mk,gx+gw*.5-gw*.36,my-gw*.36,gw*.72,gw*.72);
 const ti=gw*1.15;uiIcon('ui_tide_'+['ebb','mid','rise'][td],gx+gw+4,my-ti/2,ti,TIDE_COL[td]);
 const q=B.qi||0,full=q>=CFG.hebo.qiMax,n=Math.floor(q/(CFG.hebo.qiMax/5)),ps=Math.max(16,fs*1.35),lsz=Math.max(11,fs-3),py=gy+gh+10+lsz+4;
 const hint=!G.flags.heboUiSeen&&B.turn<=1;if(B.turn>=2)G.flags.heboUiSeen=1;
 X.save();X.shadowColor='#000';X.shadowBlur=4;txt('潮位',gx+gw/2,gy-5,lsz,'#cfe','center');txt('渡氣',gx+gw/2,py-5,lsz,'#cfe','center');X.restore();
 if(hint){const pu=.45+.55*Math.abs(Math.sin(now/260));X.save();X.strokeStyle='rgba(255,230,120,'+pu+')';X.lineWidth=2.5;X.strokeRect(gx-3,gy-lsz-9,gw+ti+12,gh+lsz+14);X.strokeRect(gx-3,py-lsz-9,gw+8,5*(ps+1)+lsz+12);X.restore()}
 for(let i=0;i<5;i++){const on=full||(4-i)<n,im=I[on?'ui_qi_full':'ui_qi_empty'],yy=py+i*(ps+1);X.save();if(full)X.globalAlpha=.75+.25*Math.sin(now/180+i);if(im?.naturalWidth)X.drawImage(im,gx+(gw-ps)/2,yy,ps,ps);else{X.fillStyle=on?'#9fe':'#345';X.beginPath();X.arc(gx+gw/2,yy+ps/2,ps/2-2,0,7);X.fill()}X.restore()}
 H.push({x:gx,y:gy,w:gw+ti+8,h:gh,fn:()=>setTip(B,TIDE_TIP[td]+'。',performance.now())});
 H.push({x:gx,y:py,w:gw,h:5*(ps+1),fn:()=>setTip(B,'渡氣 '+q+'／'+CFG.hebo.qiMax+'：擋浪、破符、狐火干擾、防禦、引潮都會累積；滿了法術裡會出現「雲渡一擊」。',performance.now())})}
function talismanPlacement(B,L){const i=B.en.findIndex(e=>e.e==='hebo'),q=L.en(B.en.length,true)[Math.max(0,i)],u=L.U;
 return{x:q[0]+135*u,y:q[1]-135*u,r:21*u}}
function drawTalisman(B,L,now,fs,H){if(!B.talisman)return;const t=B.talisman,P=talismanPlacement(B,L),active=t.hp>0,elapsed=now-(B.talismanBrokenAt||0);
 if(!active&&elapsed>650)return;
 X.save();X.translate(P.x,P.y);if(active){const pulse=B.hebo?.state===HEBO_STATE.CHARGING?1+Math.sin(now/110)*.08:1;X.scale(pulse,pulse);
  X.shadowColor='#b97ccf';X.shadowBlur=12;X.fillStyle='#f1d892';X.strokeStyle='#623c57';X.lineWidth=2;X.beginPath();X.moveTo(0,-P.r);X.lineTo(P.r*.7,0);X.lineTo(0,P.r);X.lineTo(-P.r*.7,0);X.closePath();X.fill();X.stroke();X.shadowBlur=0;
  txt('符',0,fs*.32,Math.max(12,fs),'#563341','center');
 }else{X.globalAlpha=Math.max(0,1-elapsed/650);X.strokeStyle='#e6c6f2';X.lineWidth=3;X.beginPath();X.arc(0,0,P.r+elapsed*.07,0,Math.PI*2);X.stroke()}
 X.restore();if(!active)return;
 const bw=Math.max(58,68*L.U),barY=P.y+P.r+fs+5;txt('控妖符',P.x,P.y+P.r+fs,fs-2,'#ffe1ec','center');X.fillStyle='#392133';X.fillRect(P.x-bw/2,barY,bw,6);X.fillStyle='#e8a9dd';X.fillRect(P.x-bw/2,barY,bw*t.hp/t.mhp,6);
 if(B.ph==='target'&&B.tk==='E'){if(B.sel===B.en.length)txt('▼',P.x,P.y-P.r-6+Math.sin(now/130)*3,fs+6,'#ff0','center');
  H.push({x:P.x-27,y:P.y-27,w:54,h:54,fn:()=>{B.sel=B.en.length;press('ok')}})}}
function drawBattle(now){const B=G.B,t=now/1000;UI();let SX=0,SY=0;if(B.shk){const a=(now-B.shk.at)/B.shk.d;if(a<1){const k=B.shk.a*(1-a);SX=(Math.random()*2-1)*k;SY=(Math.random()*2-1)*k}else B.shk=null}X.translate(SX,SY);X.fillStyle='#000';X.fillRect(-20,-20,SW+40,SH+40);drawBattleBackground(B);
 const fs=FS(),n=B.en.length,np=G.party.length,ent=Math.min(1,(now-G.bT)/400),H=B.hit=[],L=B.L=bLayout(),u=L.U,s=L.s;B.u=u;
 const u2=G.party[B.ai]||G.party[0];
 // 訊息裡的特效在這一格就啟動（不等到上方訊息框畫出來），受擊／倒下 pose 才不會早一格
 {const c0=B.ph==='msg'&&B.msgs[0];if(Array.isArray(c0)&&c0[1].at==null)startFx(c0[1],now)}
 // ---- 幾何：敵人（左上）與我方（下方左中右橫排）
 const boss=B.en.some(e=>e.boss),ES=L.en(n,boss&&n===1);
 const eScale=e=>(e.boss?(e.e==='laolu'?.68:.57):e.e=='lu'?.59:.58)*L.eu;  // 老蘆葦精較蘆葦精更高大
 B.po=o=>{if(o===B.talisman){const p=talismanPlacement(B,L);return[p.x,p.y-p.r,p.r*2,p.r*2]}const ei=B.en.indexOf(o);if(ei>=0){const im=I[o.e],s2=eScale(o),q=ES[Math.min(ei,ES.length-1)];return[q[0],q[1]-im.height*s2/2,im.width*s2,im.height*s2]}
  const pi=G.party.indexOf(o),F=L.feet[bSlot(o,Math.max(0,pi))];return[F[0],F[1]-135*s,95*s,270*s]};
 B.feetOf=p=>L.feet[bSlot(p,Math.max(0,G.party.indexOf(p)))];
 X.font=(fs-2)+'px '+FONT;
 // ---- 敵人（後方，依序由左上畫到右下）
 const lab=[];B.en.map((e,i)=>({e,i})).sort((a,b)=>ES[a.i][1]-ES[b.i][1]).forEach(({e,i})=>{let da=0;if(e.hp<=0&&e.dieAt){if(now>e.dieAt+650)return;if(now>e.dieAt){da=(now-e.dieAt)/650;if(!e.dz){e.dz=1;playSfx('down');const q=B.po&&B.po(e);if(q)for(let k=0;k<26;k++)vp({x:q[0]+(Math.random()-.5)*q[2]*.7,y:q[1]+(Math.random()-.5)*q[3]*.7,vx:(Math.random()-.5)*1.2,vy:-1-Math.random()*2.2,col:k%2?'#bfe8ff':'#fff',sz:2+Math.random()*3,life:500+Math.random()*400})}}}
  const im=I[e.e],s2=eScale(e),w=im.width*s2,h=im.height*s2,q=ES[Math.min(i,ES.length-1)],recoil=bRecoil(e,now),x=q[0]+recoil.dx,y=q[1]+recoil.dy,bob=Math.sin(t*2.2+e.ph)*3*u;
  const fx=B.fx.find(f=>f.t==e&&!f.heal&&now>=f.at&&now-f.at<500);X.fillStyle='rgba(0,0,0,.38)';X.beginPath();X.ellipse(x,y-2*u,w*.4,Math.max(4,6*u),0,0,7);X.fill();
  X.save();X.globalAlpha=ent*(1-da);if(fx&&Math.floor((now-fx.at)/70)%2)X.globalAlpha*=.4;if(da){X.translate(x,y);X.scale(1+da*.25,1-da*.5);X.translate(-x,-y)}const art=enemyImage(e,now,x+(fx?Math.sin(now/20)*3:0),y+(fx?0:bob)-da*20*u,s2);X.drawImage(art.im,art.x,art.y,art.w,art.h);if(da>0){X.globalCompositeOperation='lighter';X.globalAlpha=(1-da)*.6;X.drawImage(art.im,art.x,art.y,art.w,art.h)}X.restore();
  if(e.e==='hebo'&&B.hebo&&B.hebo.state===HEBO_STATE.CHARGING&&I.fx_charge_ring?.naturalWidth&&!da){const ph=(now%900)/900,rs=w*1.05*(1.2-.3*ph);X.save();X.globalCompositeOperation='lighter';X.globalAlpha=.25+.4*Math.sin(ph*Math.PI);X.drawImage(I.fx_charge_ring,x-rs/2,y-h*.42-rs/2,rs,rs);X.restore()}
  if(da)return;
  const bw=Math.min(90,Math.max(w*.9,60));lab.push(()=>{X.font=(fs-2)+'px '+FONT;txt(e.n,x,y+fs+4,fs-2,'#fff','center');X.fillStyle='#400';X.fillRect(x-bw/2,y+fs+10,bw,6);X.fillStyle='#e44';X.fillRect(x-bw/2,y+fs+10,bw*e.hp/e.mhp,6);
   if(e.e==='hebo'&&B.hebo){const h=B.hebo,label=h.state===HEBO_STATE.CHARGING?'蓄力中・下次濁浪':h.state===HEBO_STATE.STAGGERED?'失衡・跳過行動':h.interfered?'狐火干擾':B.talisman?.hp>0?'控妖符強化':'';
    if(label)txt(label,x,y+fs+32,Math.max(11,fs-2),h.state===HEBO_STATE.CHARGING?'#ffe3a6':'#e8bde9','center');if(h.state===HEBO_STATE.CHARGING&&h.interfered)txt('狐火干擾・傷害降低',x,y+fs+49,Math.max(10,fs-3),'#9bdfff','center')}
   drawIntent(B,x+art.w*.32+6,y-h+fs+4,fs,H,now);drawTideGauge(B,fs,H,now)});
  if(B.ph=='target'&&B.tk=='E'){if(B.sel==i)txt('▼',x,y-h-6+Math.sin(t*8)*3,fs+6,'#ff0','center');H.push({x:x-Math.max(w,60)/2,y:y-h-10,w:Math.max(w,60),h:h+fs+30,fn:()=>{B.sel=i;press('ok')}})}});
 lab.forEach(f=>f());
 drawTalisman(B,L,now,fs,H);
 // ---- 我方（左中右橫排，中間略低；依腳底 y 由上往下畫）
 B.pose={};const order=G.party.map((p,i)=>i).sort((a,b)=>B.feetOf(G.party[a])[1]-B.feetOf(G.party[b])[1]);
 order.forEach(i=>{const p=G.party[i],F=B.feetOf(p),sl=bSlot(p,i),act=i==B.ai&&B.ph!='msg'&&!B.won,ps=bPose(p,sl,now,F,s,L);B.pose[i]=ps.name;
  const im=I[ps.pre+'_'+ps.name]?.naturalWidth?I[ps.pre+'_'+ps.name]:I[ps.pre+'_idle0'];const hx=ps.hit?Math.sin(now/20)*4*u:0,x=F[0]+ps.dx+hx,y=F[1]+ps.dy,al=ent*(p.hp>0||ps.name==='down'?1:.35);
  X.fillStyle='rgba(0,0,0,.38)';X.beginPath();X.ellipse(x,y-2*u,58*s,Math.max(5,15*s),0,0,7);X.fill();
  if(B.hebo&&B.hebo.mark===p&&p.hp>0){const k=(now%900)/900;X.save();X.strokeStyle='rgba(255,138,92,'+(.95-.45*k)+')';X.lineWidth=Math.max(2,3*u);for(let r=0;r<2;r++){const kk=(k+r*.5)%1;X.beginPath();X.ellipse(x,y-2*u,(34+kk*46)*s*1.4,(10+kk*14)*s*1.4,0,0,7);X.stroke()}X.restore();txt('水紋',x,y+fs+2,Math.max(11,fs-3),'#ffb08a','center')}
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
 else if(B.ph=='skill'||B.ph=='item'){let LL,SKL=null;
  if(B.ph=='skill'){SKL=bSkills(u2,B);LL=SKL.map(sk=>sk+(SK[sk].mp?' '+SK[sk].mp+'MP':'・渡氣'));info=SK[SKL[B.sel]]?SK[SKL[B.sel]].d:''}
  else{const ks=Object.keys(G.inv).filter(i=>G.inv[i]>0);LL=ks.map(k=>k+'×'+G.inv[k]);info=ks[B.sel]?ITEMS[ks[B.sel]].d:''}
  const lh=fs+16,pw=Math.min(L.aw-24,Math.max(190,fs*11)),ph=(LL.length+1)*lh+12,px=SW-SA.r-12-pw,py=Math.max(SA.t+80,Math.min(L.cy-8-ph,L.by-24));box(px,py,pw,ph,.95);
  [...LL,'◀ 返回'].forEach((l,i)=>{const isB=i==LL.length,sel=!isB&&i==B.sel,iy=py+6+i*lh;
   if(sel){X.fillStyle='rgba(255,230,120,.16)';rr(px+5,iy,pw-10,lh-2,5);X.fill()}
   const off=SKL&&!isB&&!skillUsable(u2,SKL[i],B);txt((sel?'▶ ':'')+l,px+16,iy+lh/2+fs*.36,fs,isB?'#9cf':off?'#7f8e94':sel?'#ffe9a8':'#fff');
   H.push({x:px,y:iy,w:pw,h:lh,fn:isB?()=>press('cancel'):()=>{B.sel=i;press('ok')}})})}
 else if(B.ph=='target'){info=B.tk=='E'?'點選敵人':'點選隊友';octBtn(L.bx,L.by,L.bd,'返',false,fs);push(L.bx,L.by,()=>press('cancel'))}
 // ---- 傷害數字
 for(const f of B.fx){if(now<f.at)continue;const a=(now-f.at)/1000,q=B.po(f.t);const x=q[0],y=q[1]-q[3]*.3;const sc=a<.12?.4+a/.12*(f.crit?1.4:1):(f.crit?1.8:1.4)-Math.min(f.crit?.6:.4,(a-.12)*2.2);
  const s0=f.heal?'+'+f.d:''+f.d,col=f.heal?'#7f7':f.crit?'#ffe14a':B.en.includes(f.t)||f.t===B.talisman?'#fff':'#f88';X.save();X.globalAlpha=Math.min(1,(1-a)*2.2);X.translate(x,y-a*34*u);X.scale(sc,sc);X.font='bold '+(fs+8)+'px '+FONT;X.textAlign='center';X.lineWidth=4;X.strokeStyle=f.heal?'#031':'#000';X.strokeText(s0,0,0);X.fillStyle=col;X.fillText(s0,0,0);
  if(f.crit){X.font='bold '+(fs-1)+'px '+FONT;X.strokeText('會心！',0,-fs-4);X.fillStyle='#ffb02e';X.fillText('會心！',0,-fs-4)}X.restore()}
 if(B.fl){const a=(now-B.fl.at)/B.fl.d;if(a<1){X.fillStyle='rgba('+B.fl.c+','+(B.fl.k*(1-a))+')';X.fillRect(0,0,SW,SH)}else B.fl=null}
 // ---- 撐篙擋浪光環
 if(B.ph=='parry'&&B.parry){const P=CFG.hebo.parry,tt=now-B.parry.t0;if(tt>P.dur+P.good){parryResolve('miss');return}
  const q=G.party.find(p=>p.e==='qz'&&p.hp>0)||G.party[0],F=B.feetOf(q),cx=F[0],cy=F[1]-120*s,Rt=30*u+8,R0=Rt*3.6,k=Math.max(0,Math.min(1,tt/P.dur)),r=tt<=P.dur?R0-(R0-Rt)*k:Rt*(1-(tt-P.dur)/P.good*.6),near=Math.abs(tt-P.dur)<=P.perfect;
  X.save();X.fillStyle='rgba(0,10,20,.28)';X.fillRect(-20,-20,SW+40,SH+40);X.lineWidth=Math.max(3,4*u);X.strokeStyle='rgba(255,255,255,.9)';X.beginPath();X.arc(cx,cy,Rt,0,7);X.stroke();
  X.strokeStyle=near?'#7dffa0':'#ffd86b';X.shadowColor=X.strokeStyle;X.shadowBlur=12;X.beginPath();X.arc(cx,cy,Math.max(2,r),0,7);X.stroke();X.restore();H.length=0;H.push({x:-20,y:-20,w:SW+40,h:SH+40,fn:()=>parryTap(performance.now())})}
 // ---- 上方訊息框（指令選單時讓出左上角的逃跑鈕）
 const left=B.ph=='cmd'?SA.l+14+L.bd+8:SA.l+8,mw=Math.min(SW-SA.r-CFG.battleUi.soundSafeWidth-left,CFG.battleUi.messageMaxWidth),mx=left,my=SA.t+8;
 if(B.ph=='msg'){const M0=B.msgs[0],T0=Array.isArray(M0)?M0[0]:(M0||''),mk=B.msgs.length+T0;if(Array.isArray(M0)&&M0[1].at==null)startFx(M0[1],now);if(B.mk!==mk){B.mk=mk;B.mT=now;if(T0.includes('升到了'))playSfx('level')}else if(now-B.mT>1500){B.mk=null;press('ok')}X.font=fs+'px '+FONT;const maxW=Math.max(CFG.battleUi.messageMinWidth,Math.min(CFG.battleUi.messageMaxWidth,SW-SA.l-SA.r-CFG.battleUi.soundSafeWidth-16)),ls=wrap(T0,maxW-CFG.battleUi.messagePadding),textW=Math.max(0,...ls.map(line=>X.measureText(line).width)),boxW=Math.min(maxW,Math.max(CFG.battleUi.messageMinWidth,Math.ceil(textW+CFG.battleUi.messagePadding))),boxX=Math.max(SA.l+8,Math.min((SW-boxW)/2,SW-SA.r-CFG.battleUi.soundSafeWidth-boxW));box(boxX,my,boxW,ls.length*(fs+8)+22,.93);ls.forEach((l,j)=>txt(l,boxX+14,my+fs+10+j*(fs+8),fs));txt('▼',boxX+boxW-20,my+ls.length*(fs+8)+14,fs-5,'#c9b26b')}
 else{X.font=fs+'px '+FONT;const ls=wrap(B.ph==='parry'?(G.flags.parrySeen?'撐篙擋浪！':'看準光環縮到白圈的瞬間，點一下畫面！'):B.tipTxt&&now-B.tipT<4000?B.tipTxt:u2.n+' 的行動'+(info?'：'+info:''),mw-28).slice(0,2);box(mx,my,mw,ls.length*(fs+8)+16,.93);ls.forEach((l,j)=>txt(l,mx+14,my+fs+8+j*(fs+8),fs,'#ffd'))}}
function bTap(x,y){const B=G.B;if(!B||G.mode!='battle')return;if(B.ph=='parry'){parryTap(performance.now());return}if(B.ph=='msg'){B.mk=null;press('ok');return}
 const h=(B.hit||[]).slice().reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);if(h)h.fn()}
{const tp=(x,y)=>{if(G.mode=='battle')bTap(x,y)};cv.addEventListener('touchstart',e=>{if(G.mode!='battle')return;e.preventDefault();const r=cv.getBoundingClientRect();for(const t of e.changedTouches)tp(t.clientX-r.left,t.clientY-r.top)},{passive:false});
 cv.addEventListener('mousedown',e=>{const r=cv.getBoundingClientRect();tp(e.clientX-r.left,e.clientY-r.top)});}
