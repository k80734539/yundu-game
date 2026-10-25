'use strict';
// 第一章純視覺演出。台詞、輸入、碰撞與劇情旗標均由原本的系統管理。
const CIN={pan:1000,walk:950,hold:320,fade:650,dawn:2400,descent:1100,dissolve:2200,
 zoom:{camp:1.28,hebo:1.12,yx:1.18,lin:1.12,zhou:1.12},fire:{fps:9,frames:6,cell:256,size:78,sparks:14},mist:7,waterLights:64};
const cinClamp=v=>Math.max(0,Math.min(1,v)),cinEase=v=>{v=cinClamp(v);return v*v*(3-2*v)},cinLerp=(a,b,p)=>a+(b-a)*p;
function startScene(id,dlg){G.scene={id,dlg,at:performance.now(),beat:-1,beatAt:performance.now(),cam:null,from:null}}
function activeScene(){if(G.scene&&(G.dlg!==G.scene.dlg||!['map','boat'].includes(G.mode)))G.scene=null;return G.scene||null}
function tickScene(now){const s=activeScene();if(!s)return null;if(s.beat!==G.dlg.i){s.beat=G.dlg.i;s.beatAt=now;s.from=s.cam?{...s.cam}:null;
 if(s.id==='hebo'&&s.beat>=14&&s.dissolveAt==null)s.dissolveAt=now;}return s}
function scenePortrait(n,pk){const s=activeScene();if(!s)return 'pt_'+pk;
 if(s.id==='night'&&n==='陳青舟'&&s.beat>=4&&s.beat<=9)return 'pt_qz_startled';
 if(s.id==='camp'&&n==='白苓'&&s.beat>=4&&s.beat<30)return 'pt_bl_quiet';return 'pt_'+pk}
function scenePortraitAlpha(now){const s=activeScene();return s?.72+.28*cinEase((now-s.beatAt)/CIN.hold):1}
function sceneHeboAnchor(){return{x:10.5*T2,y:4.1*T2+(SW>SH?85:0)}}
function sceneCamera(cx,cy,now){const s=tickScene(now);if(!s||s.id==='night')return{cx,cy,z:1};
 const fire=M.obj.find(o=>o.fire);let x=G.x,y=G.y-30;
 if(s.id==='camp'&&fire){x=fire.x+(G.dlg.l[s.beat]?.[0]==='白苓'?10:-10);y=fire.y-28;}
 if(s.id==='yx'){x=15*T;y=17*T;}
 if(s.id==='lin'||s.id==='zhou'){const npc=M.npcs.find(n=>n.k===s.id);if(npc){x=npc.x;y=npc.y-24;}}
 if(s.id==='hebo'){const h=sceneHeboAnchor();x=h.x;y=h.y-55;}
 const z=s.id==='hebo'&&SW>SH?.92:CIN.zoom[s.id]||1,stage=SH>SW?.28:s.id==='hebo'?.56:.65;
 const target={cx:x-SW/(WS*z)*.5,cy:y-SH*stage/(WS*z),z};
 const visibleW=SW/(WS*z);target.cx=visibleW<M.W?Math.max(0,Math.min(M.W-visibleW,target.cx)):(M.W-visibleW)/2;
 if(s.id==='hebo'&&SW>SH)target.cy=Math.max(0,target.cy);
 const from=s.from||{cx,cy,z:1},p=cinEase((now-s.beatAt)/CIN.pan);
 s.cam={cx:cinLerp(from.cx,target.cx,p),cy:cinLerp(from.cy,target.cy,p),z:cinLerp(from.z,z,p)};
 const j=sceneShake(now);return{cx:s.cam.cx+j[0]/WS,cy:s.cam.cy+j[1]/WS,z:s.cam.z};
}
function sceneShake(now){const s=activeScene();if(!s)return[0,0];const hit=(s.id==='night'&&s.beat===10)||(s.id==='yx'&&s.beat===3);
 const p=(now-s.beatAt)/450,a=hit?3*(1-cinClamp(p)):0;return[Math.sin(p*51)*a,Math.cos(p*43)*a*.6]}
function sceneParty(which,now){const s=activeScene();const orig=which==='qz'?{x:G.x,y:G.y,dir:G.dir,f:G.f}:{...G.bl,f:G.moving?G.bl.f:0};if(!s||s.id==='night')return orig;
 const fire=M.obj.find(o=>o.fire);let x=orig.x,y=orig.y,dir=orig.dir,rot=0;
 if(s.id==='camp'&&fire){x=fire.x+(which==='qz'?-44:44);y=fire.y+18;dir=which==='qz'?'right':'left';rot=which==='bl'&&s.beat>=12?.035:0;}
 if(s.id==='yx'){x=15*T+(which==='qz'?-20:20);y=18.2*T+(which==='bl'?8:s.beat>=6?-12*(s.beat===6?cinEase((now-s.beatAt)/CIN.walk):1):0);dir='up';}
 if(s.id==='hebo'){x=10.5*T2+(which==='qz'?-44:44);y=4.1*T2+(SW>SH?156:112);dir='up';}
 const p=cinEase((now-s.at)/CIN.walk),pause=now-s.beatAt<CIN.hold;
 return{x:cinLerp(orig.x,x,p),y:cinLerp(orig.y,y,p)+(pause?0:Math.sin(now/750+(which==='qz'?0:1))*.7),dir,f:p<1?(now-s.at)/170:0,rot};
}
function drawStoryCharacter(k,pose){const key=spriteKey(k,pose.dir,pose.f||0);if(!activeScene())return chr(key,pose.x,pose.y);X.save();X.translate(pose.x,pose.y);X.rotate(pose.rot||0);chr(key,0,0);X.restore()}
function sceneStagesParty(){return ['camp','hebo','yx'].includes(activeScene()?.id)}
function drawSceneForeground(now){if(!sceneStagesParty())return;drawStoryCharacter('qz',sceneParty('qz',now));if(G.party.length>1)drawStoryCharacter('bl',sceneParty('bl',now))}
function drawSceneNPC(n,now){const s=activeScene();if(!s||s.id!=='yx'||n.k!=='yx')return false;
 if(s.beat===0||s.beat>=23)return true;
 const p=s.beat===1?cinEase((now-s.beatAt)/CIN.descent):1,leave=s.beat===22?cinEase((now-s.beatAt)/CIN.descent):0;
 const drop=-160*(1-p)-180*leave;X.save();X.globalAlpha=(1-leave)*Math.min(1,p*2);
 // 踏劍降下：劍光與衣袂在同一個地圖座標系裡，不移動碰撞物件。
 X.strokeStyle='rgba(200,235,255,.65)';X.lineWidth=2;X.beginPath();X.moveTo(n.x-20,n.y+drop-3);X.lineTo(n.x+24,n.y+drop-6);X.stroke();
 if(p<1||leave){X.strokeStyle='rgba(200,235,255,.24)';for(let j=0;j<4;j++){X.beginPath();X.moveTo(n.x+(j-1.5)*7,n.y+drop-12);X.lineTo(n.x+(j-1.5)*9,n.y+drop-92);X.stroke();}}
 chr(spriteKey('yx','down',0),n.x,n.y+drop);X.restore();
 if(p>.65&&p<1){X.save();X.globalAlpha=(1-p)*2;X.strokeStyle='#d8efff';X.lineWidth=1.5;X.beginPath();X.ellipse(n.x,n.y-1,15+(p-.65)*110,4+(p-.65)*20,0,0,7);X.stroke();X.restore();}return true;
}
function drawHeboFarewell(now){const s=activeScene();if(!s||s.id!=='hebo')return;const p=s.dissolveAt==null?0:cinClamp((now-s.dissolveAt)/CIN.dissolve),im=I.hebo;
 if(im?.naturalWidth&&p<1){const w=im.width*.52,h=im.height*.52,a=sceneHeboAnchor();X.save();X.translate(a.x,a.y);X.globalAlpha=1-p;X.rotate(.05*(1-p));X.drawImage(im,-w/2,-h+8-p*24,w,h*(1-p*.2));X.restore();}
}
function drawSceneWorldFX(now){const s=activeScene();if(!s)return;
 if(s.id==='hebo'){
  const {x,y}=sceneHeboAnchor();if(s.dissolveAt!=null){const age=(now-s.dissolveAt)/1000;X.save();X.globalCompositeOperation='lighter';
   for(let i=0;i<CIN.waterLights;i++){const p=cinClamp((age-i*.014)/1.65);if(p<=0||p>=1)continue;const a=i*2.399,px=x+Math.cos(a)*(20+i%11*5)*(1+p*.5),py=y-20-i%9*15-p*(50+i%5*12);
    X.globalAlpha=(1-p)*.85;X.fillStyle=i%3?'#a2e6ff':'#fff9df';X.beginPath();X.arc(px,py,1.2+(i%3)*.6,0,7);X.fill();}X.restore();}
  if(s.beat>=9&&s.beat<=11){const p=cinEase((now-s.beatAt)/1200),q=sceneParty('qz',now);X.save();X.globalCompositeOperation='lighter';light(cinLerp(x,q.x+8,p),cinLerp(y-70,q.y-30,p)-Math.sin(p*Math.PI)*22,16,'rgba(130,215,255,.8)');X.restore();}
 }
 if(s.id==='yx'&&s.beat<=1){const p=cinEase((now-s.at)/1500);X.save();X.strokeStyle='rgba(220,235,255,'+(.4*(1-p))+')';X.lineWidth=1.6;
  for(let i=0;i<9;i++){X.beginPath();X.moveTo(15*T+(i-4)*10,16.4*T-70);X.bezierCurveTo(15*T+(i-4)*25,16.4*T-130,15*T+(i-4)*35,16.4*T-170,15*T+(i-4)*50,16.4*T-250);X.stroke();}X.restore();}
}
function drawDriftingMist(now,x,y,w,h,alpha){const t=now/1000;X.save();for(let i=0;i<CIN.mist;i++){
 const px=x+((i*173+t*(11+i%3*5))%(w+420))-210,py=y+h*(i+.5)/CIN.mist+Math.sin(t*.2+i)*12;
 const g=X.createRadialGradient(px,py,0,px,py,210);g.addColorStop(0,'rgba(200,217,237,'+(alpha*(.7+.3*Math.sin(t*.4+i)))+')');g.addColorStop(1,'rgba(180,205,230,0)');X.fillStyle=g;
 X.save();X.translate(px,py);X.scale(1,.18);X.beginPath();X.arc(0,0,210,0,7);X.fill();X.restore();}X.restore()}
function drawCampfire(o,now){const t=now/1000,f=CIN.fire,im=I.campfire;X.save();X.globalCompositeOperation='lighter';
 X.save();X.translate(o.x,o.y+1);X.scale(1,.38);light(0,0,100+Math.sin(t*6)*5,'rgba(255,137,45,.32)');X.restore();
 X.globalCompositeOperation='source-over';
 if(im?.naturalWidth){const fr=Math.floor(t*f.fps)%f.frames;X.drawImage(im,fr%3*f.cell,Math.floor(fr/3)*f.cell,f.cell,f.cell,o.x-f.size/2,o.y-f.size+6,f.size,f.size);}
 else{X.strokeStyle='#513329';X.lineWidth=7;X.beginPath();X.moveTo(o.x-13,o.y+1);X.lineTo(o.x+12,o.y-4);X.moveTo(o.x+13,o.y+1);X.lineTo(o.x-12,o.y-4);X.stroke();
  for(let i=0;i<3;i++){const sway=Math.sin(t*7+i)*5;X.fillStyle=['#ec682b','#ffb142','#ffefb3'][i];X.beginPath();X.moveTo(o.x-12+i*3,o.y-2);X.bezierCurveTo(o.x-15,o.y-18,o.x+sway,o.y-25-i*5,o.x+sway,o.y-42+i*6);X.bezierCurveTo(o.x+15,o.y-18,o.x+14-i*3,o.y-6,o.x-12+i*3,o.y-2);X.fill();}}
 X.globalCompositeOperation='lighter';for(let i=0;i<f.sparks;i++){const p=(t*.35+i*.137)%1,px=o.x+Math.sin(i*8.3+p*4)*(4+p*18),py=o.y-20-p*(32+i%4*12);X.globalAlpha=(1-p)*.8;X.fillStyle=i%3?'#ffc56a':'#fff1bf';X.fillRect(px,py,1.1,2.3);}
 X.globalAlpha=1;light(o.x,o.y-23,45,'rgba(255,156,70,.16)');X.restore();
}
function drawSceneVeil(cx,cy,now){const s=activeScene();if(s?.id!=='camp')return;const fire=M.obj.find(o=>o.fire);if(!fire)return;
 X.save();const p=cinEase((now-s.at)/CIN.fade),g=X.createRadialGradient(fire.x,fire.y-25,28,fire.x,fire.y-25,205);
 g.addColorStop(0,'rgba(5,8,25,0)');g.addColorStop(.55,'rgba(5,8,25,'+(.2*p)+')');g.addColorStop(1,'rgba(3,6,19,'+(.65*p)+')');X.fillStyle=g;X.fillRect(cx,cy,VW,VH);X.restore();
}
function drawTempleCandles(now){if(M.id!=='temple')return;const t=now/1000;X.save();X.globalCompositeOperation='lighter';
 M.lights.forEach((l,i)=>{const f=.65+.15*Math.sin(t*8+i*2)+.12*Math.sin(t*13+i),x=l[0],y=l[1];light(x,y,l[2]*(.85+f*.16),'rgba(255,164,80,'+(.15*f)+')');
 X.fillStyle='rgba(255,226,162,.85)';X.beginPath();X.ellipse(x+Math.sin(t*7+i)*1.5,y-2,2.5,6+Math.sin(t*11+i),-.1,0,7);X.fill();});X.restore();
 X.save();M.lights.forEach((l,i)=>{X.fillStyle='rgba(2,5,17,'+(.045+.015*Math.sin(t*5+i))+')';X.beginPath();X.moveTo(l[0]-5,l[1]+10);X.lineTo(l[0]+35+Math.sin(t*4+i)*8,l[1]+115);X.lineTo(l[0]+63,l[1]+115);X.lineTo(l[0]+5,l[1]+10);X.fill();});X.restore();
}
function drawSceneOverlay(now){const s=activeScene();UI();X.save();
 if(s){const a=(now-s.at)/CIN.fade;if(a<1){X.fillStyle='rgba(3,8,22,'+(.65*(1-cinEase(a)))+')';X.fillRect(0,0,SW,SH);}
  const flash=(s.id==='yx'&&s.beat===3)||(s.id==='hebo'&&s.beat===14);if(flash){const p=(now-s.beatAt)/600;if(p<1){X.fillStyle='rgba(220,241,255,'+(.32*(1-p))+')';X.fillRect(0,0,SW,SH);}}
 }
 if(G.flags?.dawn&&G.dawnT!=null){const p=cinEase((now-G.dawnT)/CIN.dawn);if(p<1){X.fillStyle='rgba(9,18,43,'+(.88*(1-p))+')';X.fillRect(0,0,SW,SH);const g=X.createLinearGradient(0,0,0,SH);g.addColorStop(0,'rgba(255,195,133,'+(.2*p)+')');g.addColorStop(1,'rgba(255,159,107,0)');X.fillStyle=g;X.fillRect(0,0,SW,SH);}}
 X.restore();
}
// v31: anchors are in the painted 1024x576 plate. Feet stay inside the near gunwale.
function nightActors(st,age){
 const p=st===9?cinEase(age/2200):st>=10?1:0;
 return{p,qz:{x:st>=8?535-25*p:515,y:386-8*p,rot:st===8?.16:st===9?.16*(1-p):0},
  bl:st>=5?{x:680-110*p,y:437-51*p-Math.sin(p*Math.PI)*14,rot:-.14*(1-p),waterY:415}:null};
}
function nightFrame(st,s,now){
 const port=SH>SW,dlg=G.dlg?dialogLayout():null,key=[SW,SH,JOY.touch].join(':');
 if(s&&G.dlg&&s.dialogKey!==key){s.dialogKey=key;s.dialogHeight=Math.max(...G.dlg.l.map(line=>dialogLayout({l:[line],i:0}).h))}
 const dialogHeight=s?.dialogHeight||dlg?.h||0;
 let top=SA.t+38,bottom=SH-SA.b-(port&&JOY.touch?200:12);
 if(dlg){if(dlgTop())top=SA.t+8+dialogHeight+12;else bottom=SH-SA.b-(JOY.touch?200:12)-dialogHeight-12}
 const height=Math.max(100,bottom-top),scale=Math.min((SW-SA.l-SA.r-20)/(port?300:800),height/190);
 const focus=st>=5?(port?575:550):(port?525:515),from=s?.from?.x??focus,p=s?cinEase((now-s.beatAt)/CIN.pan):1;
 const cx=cinLerp(from,focus,p),cy=365,ox=SW/2-cx*scale,oy=(top+bottom)/2-cy*scale;
 if(s)s.cam={x:cx,y:cy,z:1};return{scale,ox,oy,top,bottom};
}
function nightBamboo(a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 X.save();X.lineCap='round';X.lineWidth=3.6;X.strokeStyle='#715a36';X.beginPath();X.moveTo(a[0]-dx*.12,a[1]-dy*.12);X.lineTo(...b);X.stroke();
 X.lineWidth=1.5;X.strokeStyle='#bba473';X.beginPath();X.moveTo(a[0]-dx*.12+nx*.6,a[1]-dy*.12+ny*.6);X.lineTo(b[0]+nx*.6,b[1]+ny*.6);X.stroke();
 X.lineWidth=1.6;X.strokeStyle='#65563c';for(let d=14;d<len;d+=24){const x=a[0]+dx*d/len,y=a[1]+dy*d/len;X.beginPath();X.moveTo(x-nx*2,y-ny*2);X.lineTo(x+nx*2,y+ny*2);X.stroke()}
 X.lineWidth=2;X.beginPath();X.moveTo(...b);X.quadraticCurveTo(b[0]+4,b[1]+5,b[0]+7,b[1]+1);X.stroke();X.restore();
}
function nightHull(im){
 // Redraw the painted near side over the occupants, rather than letting feet float over the rail.
 const rim=[[360,345],[390,371],[440,389],[500,399],[565,405],[620,397],[653,384],[667,379],[651,416],[631,440],[601,448],[527,447],[467,433],[410,412],[376,380]];
 X.save();X.beginPath();rim.forEach((q,i)=>i?X.lineTo(...q):X.moveTo(...q));X.closePath();X.clip();X.drawImage(im,0,0);X.restore();
}
function drawNightScene(now){UI();X.fillStyle='#081321';X.fillRect(0,0,SW,SH);
 const s=tickScene(now),st=s?s.beat:G.dlg?.i||0,im=I.night,t=now/1000;if(!im?.naturalWidth)return;
 const actors=nightActors(st,s?now-s.beatAt:0),f=nightFrame(st,s,now),q=actors.qz,j=sceneShake(now);
 if(s)s.night={frame:f,actors};
 X.save();X.translate(f.ox-j[0],f.oy-j[1]);X.scale(f.scale,f.scale);X.drawImage(im,0,0);
 const girl=actors.bl,bob=Math.sin(t*1.6)*1.4*(1-actors.p);
 if(girl){
  if(actors.p>.7){X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.ellipse(girl.x,girl.y-1,27,5,0,0,7);X.fill()}
  X.save();if(actors.p<.7){X.beginPath();X.rect(0,0,1024,girl.waterY+bob);X.clip()}
  X.translate(girl.x,girl.y+bob);X.rotate(girl.rot);
  const pose=I.bld_down;if(pose?.naturalWidth)X.drawImage(pose,-240*.38,-355*.38,480*.38,420*.38);else sprDraw(sprIdle('bl','down'),0,0,1.4);
  X.restore();
  if(actors.p<.85){X.save();X.globalAlpha=(1-actors.p)*.6;X.strokeStyle='#a7d3e1';X.lineWidth=1;
   for(let i=0;i<2;i++){X.beginPath();X.ellipse(girl.x+12,girl.waterY+bob+i*3,32+i*9+Math.sin(t*2+i)*2,4+i*2,0,0,7);X.stroke()}X.restore();}
 }
 X.fillStyle='rgba(0,0,0,.32)';X.beginPath();X.ellipse(q.x,q.y-1,13,3.5,0,0,7);X.fill();
 X.save();X.translate(q.x,q.y);X.rotate(q.rot);sprDraw(sprIdle('qz','right'),0,0,1.45);X.restore();nightHull(im);
 if((st===8||st===9)&&girl){const a=[q.x+6*Math.cos(q.rot)+27*Math.sin(q.rot),q.y+6*Math.sin(q.rot)-27*Math.cos(q.rot)],b=[girl.x+18,girl.y-22+bob];nightBamboo(a,b);if(s)s.night.pole={hand:a,hook:b};}
 drawDriftingMist(now,300,310,460,140,.065);X.restore();
 // A portrait cinematic has a dedicated stage above its dialogue, so the boat is not hidden by text.
 if(SH>SW){const g=X.createLinearGradient(0,f.bottom,0,Math.min(SH,f.bottom+70));g.addColorStop(0,'rgba(8,19,33,0)');g.addColorStop(1,'rgba(8,19,33,.95)');X.fillStyle=g;X.fillRect(0,f.bottom,SW,SH-f.bottom)}
 drawSceneOverlay(now);const fs=FS();box(SA.l+8,SA.t+8,fs*3+20,fs+16,.9);txt('夜河',SA.l+22,SA.t+fs+12,fs,'#f3dfa0');
}
