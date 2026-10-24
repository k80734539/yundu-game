'use strict';
// 地圖與渡船場景繪製
// ---------- render ----------
function drawWorld(now){const t=now/1000;
 let cx=M.W>VW?Math.max(0,Math.min(M.W-VW,G.x-VW/2)):(M.W-VW)/2,cy=(()=>{const ex=JOY.touch?(SA.b+(SH>SW?190:60))/WS:0;return M.H+ex>VH?Math.max(0,Math.min(M.H+ex-VH,G.y-20-VH*(SH>SW&&JOY.touch?.4:.5))):(M.H+ex-VH)/2})();
 const camera=sceneCamera(cx,cy,now);cx=camera.cx;cy=camera.cy;const ws=WS*camera.z;
 X.setTransform(K*ws,0,0,K*ws,-cx*K*ws,-cy*K*ws);
 X.fillStyle=M.id=='village'?'#3a5f63':M.id=='reeds'?'#12180e':'#120e14';X.fillRect(cx-2,cy-2,VW+4,VH+4);
 if(activeScene()&&M.id==='village'){X.fillStyle=X.createPattern(I.t_water,'repeat');X.fillRect(cx,Math.max(cy,M.H),VW,VH)}
 X.drawImage(M.ground,0,0);
 // water
 if(M.id=='village'){X.save();X.beginPath();X.moveTo(0,M.H);for(let x=0;x<=M.W;x+=8)X.lineTo(x,waterY(x));X.lineTo(M.W,M.H);X.clip();X.fillStyle=X.createPattern(I.t_water,'repeat');X.translate(t*9%128,Math.sin(t)*3);X.fillRect(-128,17*T-128,M.W+256,M.H);X.restore();
  X.strokeStyle='rgba(255,255,255,.35)';X.lineWidth=2;X.beginPath();for(let x=0;x<=M.W;x+=8){const y=waterY(x)+2+Math.sin(t*3+x/30)*1.5;x?X.lineTo(x,y):X.moveTo(x,y)}X.stroke()}
 else{const wk=M.id=='reeds'?'t_marsh':'t_water';X.save();X.beginPath();M.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c=='~')X.rect(x*M.T,y*M.T,M.T,M.T)}));X.clip();X.fillStyle=X.createPattern(I[wk],'repeat');X.translate(t*6%128,Math.sin(t*.8)*3);X.fillRect(-128,-128,M.W+256,M.H+256);X.restore();
  if(M.id=='temple'){X.fillStyle='rgba(5,20,40,.35)';X.fillRect(M.T,M.T,18*M.T,3*M.T);X.fillStyle='#4a4038';for(let x=1;x<19;x++)if(M.rows[3][x]=='~')X.fillRect(x*M.T,4*M.T-6,M.T,7);X.fillRect(9*M.T,3*M.T,3*M.T,M.T);X.fillStyle='rgba(255,255,255,.08)';X.fillRect(9*M.T,3*M.T,3*M.T,4)}
  else{X.strokeStyle='rgba(200,220,255,.25)';X.lineWidth=2;X.beginPath();for(let x=0;x<=M.W;x+=8){const y=13*M.T+3+Math.sin(t*2.5+x/25)*1.5;x?X.lineTo(x,y):X.moveTo(x,y)}X.stroke()}}
 // depth-sorted layer
 const L=[];for(const o of M.obj){if(o.x<cx-150||o.x>cx+VW+150||o.y<cy-30||o.y>cy+VH+260)continue;L.push({y:o.flat?-1e4+o.flat*10+o.y*.001:o.y,f:()=>drawObj(o,t)})}
 for(const n of M.npcs){L.push({y:n.y,f:()=>{if(drawSceneNPC(n,now))return;if(n.boss){const im=I.hebo,s=.52,w=im.width*s,h=im.height*s,b=Math.sin(t*1.6)*4;X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(n.x,n.y-4,60,12,0,0,7);X.fill();X.drawImage(im,n.x-w/2,n.y-h+8+b,w,h)}else chr(spriteKey(n.k,n.dir,0),n.x,n.y);
  if(n.mark&&n.mark()){const yy=n.y-(n.boss?170:72)+Math.sin(t*5)*3;X.font='bold 20px sans-serif';X.textAlign='center';X.lineWidth=4;X.strokeStyle='#120a10';X.strokeText('!',n.x,yy);X.fillStyle='#ffd84a';X.fillText('!',n.x,yy);X.textAlign='left'}}})}
 const scene=activeScene(),two=G.party.length>1&&(G.hist.length>=14||!!scene);
 if(scene?.id==='hebo')L.push({y:4.1*T2,f:()=>drawHeboFarewell(now)});
 const qp=sceneParty('qz',now),bp=two?sceneParty('bl',now):null;
 if(two&&!sceneStagesParty())L.push({y:bp.y-.1,f:()=>drawStoryCharacter('bl',bp)});
 const pk=spriteKey('qz',G.dir,G.f);if(!sceneStagesParty())L.push({y:qp.y,f:()=>drawStoryCharacter('qz',qp)});
 L.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
 const hid=o=>{if(o.flat||o.ghost===0)return 0;const im=I[o.k],w=im.width*o.s,h=im.height*o.s;return o.y>G.y&&Math.abs(o.x-G.x)<w/2-4&&G.y>o.y-h+24};
 if(!scene&&M.obj.some(hid)){X.globalAlpha=.5;sprDraw(pk,G.x,G.y,1,1);X.globalAlpha=1}  // 被物件遮住時的半透明剪影：必須走 sprDraw（v19 漏改過，192px 新圖被原尺寸畫出）
 // interact hint
 if(!G.dlg&&G.mode=='map'){const v=DV[G.dir],fx=G.x+v[0]*24,fy=G.y-12+v[1]*22;for(const it of M.inter){const d=Math.min(Math.hypot(it.x-fx,it.y-fy),Math.hypot(it.x-G.x,it.y-G.y+12)+8);if(d<it.r){const yy=G.y-74+Math.sin(t*6)*2;X.fillStyle='rgba(12,16,34,.8)';X.beginPath();X.arc(G.x,yy,10,0,7);X.fill();txt('A',G.x,yy+5,13,'#ffe9a8','center');break}}}
 // atmosphere
 if(M.night){X.fillStyle='rgba(8,14,52,.5)';X.fillRect(cx,cy,VW,VH);drawSceneVeil(cx,cy,now);X.globalCompositeOperation='lighter';
  for(const l of M.lights)light(l[0],l[1],l[2],l[3]);light(G.x,G.y-20,110,'rgba(255,210,140,.16)');
  if(!G.flags.tal&&M.id=='reeds')for(const o of M.obj)if(o.tal)light(o.x,o.y-16,60+Math.sin(t*3)*8,'rgba(190,90,255,.55)');
  if(M.flies)for(const f of M.flies){const x=f.x+Math.sin(t*f.v+f.p)*30,y=f.y+Math.cos(t*f.v*1.3+f.p)*20,a=.5+.5*Math.sin(t*3+f.p);light(x,y,9,'rgba(220,255,140,'+(.6*a)+')');X.fillStyle='rgba(255,255,200,'+a+')';X.fillRect(x-1,y-1,2,2)}
  for(const o of M.obj)if(o.fire)drawCampfire(o,now);
  X.globalCompositeOperation='source-over';
  drawDriftingMist(now,cx,cy,VW,VH,.04)}
 else{X.fillStyle=G.flags.dawn?'rgba(255,140,70,.16)':'rgba(255,150,80,.08)';X.fillRect(cx,cy,VW,VH);drawSceneVeil(cx,cy,now);X.globalCompositeOperation='lighter';for(const l of M.lights)light(l[0],l[1],l[2],l[3]);X.globalCompositeOperation='source-over'}
 drawTempleCandles(now);drawSceneWorldFX(now);drawSceneForeground(now);drawSceneOverlay(now);
 // HUD
 UI();const fs=FS();X.font=fs+'px '+FONT;const nm=M.name,nw=X.measureText(nm).width+28;box(SA.l+8,SA.t+8,nw,fs+16,.9);txt(nm,SA.l+22,SA.t+8+fs+4,fs,'#f3dfa0');
 const f=G.flags;let goal='';if(M.id=='village'&&!f.dawn)goal=!f.chief||!f.quest?'目標：和村長、阿婆談話':'目標：到渡口搭船';if(M.id=='village'&&f.dawn&&!f.cure)goal='目標：把河珠交給阿婆';if(M.id=='reeds')goal=!f.tal?'目標：調查妖氣來源':!f.camp?'目標：到中央空地的營火歇息':'目標：前往出口（牌坊）';if(M.id=='temple')goal='目標：查看神龕';
 if(goal&&!(G.dlg&&dlgTop())){const gs=fs-2;X.font=gs+'px '+FONT;const gw=X.measureText(goal).width+24;let gx=SW-SA.r-8-gw,gy=SA.t+8;if(gx<SA.l+16+nw){gx=SA.l+8;gy=SA.t+fs+30}box(gx,gy,gw,gs+16,.9);txt(goal,gx+12,gy+gs+4,gs,'#cfe')}
 {const bo=M.obj.find(o=>o.boat);if(M.id=='village'&&!f.dawn&&bo&&!G.dlg){const im=I.boat,sx=(bo.x-cx)*WS,sy=(bo.y-im.height*bo.s*.8-cy)*WS,bob=Math.sin(t*5)*4;
  const L=SA.l+30,R=SW-SA.r-30,Tp=SA.t+fs*2+40,Bt=SH-SA.b-(JOY.touch?190:30);
  if(sx>L&&sx<R&&sy>Tp&&sy<Bt){txt('▼ 渡船',sx,sy-6+bob,fs+2,'#ffe9a8','center')}
  else{const ax=Math.max(L+20,Math.min(R-20,sx)),ay=Math.max(Tp,Math.min(Bt,sy)),an=Math.atan2(sy-ay,sx-ax);X.save();X.translate(ax,ay);X.fillStyle='rgba(0,0,0,.55)';X.beginPath();X.arc(0,0,fs*1.7,0,7);X.fill();X.rotate(an);X.fillStyle='#ffe9a8';X.beginPath();X.moveTo(fs*1.5+bob/2,0);X.lineTo(fs*.6,-fs*.7);X.lineTo(fs*.6,fs*.7);X.fill();X.restore();txt('渡船',ax,ay+fs*.4,fs-2,'#fff','center')}}}
 txt('v20',SW-SA.r-6,SH-SA.b-4,Math.max(10,fs-6),'rgba(255,255,255,.6)','right');
 const at=now-G.lt;if(M.id=='temple'&&at<2600){X.globalAlpha=Math.min(1,Math.max(0,1-(at-1600)/1000));X.fillStyle='#000';X.fillRect(0,0,SW,SH);cover(I.ext);const fs2=fs+6;box(SW/2-80,SH*.7,160,fs2+22);txt('河神廟',SW/2,SH*.7+fs2+6,fs2,'#f3dfa0','center');X.globalAlpha=1}}
function dlgTop(){return JOY.touch&&SW>SH}
function drawBoat(now){drawNightScene(now)}
