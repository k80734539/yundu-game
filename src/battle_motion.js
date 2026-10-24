'use strict';
// v21：陳青舟戰鬥彩繪姿勢與普攻／橫掃演出。
// 圖片 qzb_*：480×360 透明、側視（面向右）、腳底 y=292、身體中心 x=240、竹篙已畫進圖內（不再有獨立旋轉竹篙）。
// 只改顯示；傷害、回合、命中時間（普攻 340ms）不變。
const QZB={W:480,H:360,cx:240,fy:292,ks:.36,figH:185,bodyL:-126,bodyR:86,pivot:[-100,0],shoulder:-80,
 // 竹篙尖端（frame px，相對腳底中心，右＋、上−），由 alpha 量測：thrust 約 +220、離地 130
 tip:{charge:[140,-96],dash0:[151,-112],dash1:[141,-102],thrust:[220,-130],sweepwind:[97,27],sweep:[199,-111]},
 names:['idle0','idle1','charge','dash0','dash1','thrust','recover','sweepwind','sweep','hit','down','win']};
// 普攻 650ms：蓄力 → 衝刺 → 刺擊（delay 後 110ms 命中＝340ms）→ 收招 → 跑回。橫掃：起手 → 揮擊（delay 後 200ms 命中）
const QZ_MOT={qzAttack:{duration:650,chargeEnd:100,dashEnd:230,thrustEnd:390,recoverEnd:470,delay:230,trailMs:90,trailFade:70},
 qzSweep:{duration:660,windEnd:260,delay:260,trailMs:110,trailFade:90}};
const QZ_ATTACK=QZ_MOT.qzAttack;
const QZ_TILT_MAX=.25;   // 約 14°；以竹篙尾端附近（腳底高度）為軸上抬，尾端不會下沉到指令面板
const motionEase=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
const qzReady=()=>!!(I.qzb_idle0?.naturalWidth>100&&I.qzb_thrust?.naturalWidth>100);
const qzK=()=>QZB.ks*((G.B&&G.B.ps)||1.5);
const qzFace0=()=>SH>SW?1:-1;   // 待機朝向：直式面向右；橫式敵人在左 → 面向左
// 竹篙尖端相對腳底中心（含繞髖部旋轉 tilt，已乘 k、未鏡射）
function qzTipOff(name,k,tilt){const t=QZB.tip[name]||QZB.tip.thrust,pv=QZB.pivot,vx=t[0]-pv[0],vy=t[1]-pv[1],a=-tilt,c=Math.cos(a),s=Math.sin(a);
 return[(pv[0]+vx*c-vy*s)*k,(pv[1]+vx*s+vy*c)*k]}
const qzRect=(cx,cy,w,h)=>({l:cx-w/2,r:cx+w/2,t:cy-h/2,b:cy+h/2});
const qzOv=(a,b)=>Math.max(0,Math.min(a.r,b.r)-Math.max(a.l,b.l))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.t,b.t));
// 畫面上看得到的敵人（含這一擊正在倒下的）
function qzEnemyBoxes(now){const B=G.B;return B.en.filter(e=>!(e.hp<=0&&e.dieAt&&now>e.dieAt+650)).map(e=>({e,b:qzRect(...B.po(e))}))}
// 落點：身體站在敵列「前方」（靠我方這側）的空路上，絕不與任何敵人的圖框重疊；
// 竹篙略為上抬（tilt）讓尖端碰到目標前緣（底緣內側）。回傳 {x,y,fd,tilt,tip,pen}
function qzLanding(now,origin,tg,stage,k){
 const B=G.B,T=B.po(tg),tbox=qzRect(...T),want=tbox.b-.15*T[3],boxes=qzEnemyBoxes(now);
 const lo=Math.max(stage.top+QZB.figH*k,tbox.t),hi=stage.bottom-2;let best=null;
 for(const fd of[1,-1])for(let fx=-.3;fx<=.301;fx+=.1)for(let f=hi;f>=lo;f-=3){
  let th=0;while(th<QZ_TILT_MAX&&f+qzTipOff('thrust',k,th)[1]>want)th+=.01;
  const off=qzTipOff('thrust',k,th),bx=T[0]+fx*T[2]-fd*off[0],ty=f+off[1];
  const L=bx+fd*QZB.bodyL*k,R=bx+fd*QZB.bodyR*k,body={l:Math.min(L,R)-4,r:Math.max(L,R)+4,t:f-QZB.figH*k,b:f};
  let pen=0;for(const o of boxes)pen+=qzOv(body,o.b)*(o.e===tg?1:8);
  pen*=1000;
  pen+=Math.max(0,stage.left+2-body.l)*1e5+Math.max(0,body.r-(stage.right-2))*1e5+Math.max(0,stage.top-body.t)*1e5;
  const tx=bx+fd*off[0];pen+=Math.max(0,stage.left-tx)*1e5+Math.max(0,tx-stage.right)*1e5;
  pen+=th*th*600+Math.max(0,ty-tbox.b-6)*30+Math.max(0,tbox.t-ty)*30+Math.hypot(bx-origin[0],f-origin[1])*.15;
  if(!best||pen<best.cost)best={cost:pen,x:bx,y:f,fd,tilt:th,tip:[tx,ty],pen:Math.round(pen/1000)}}
 return best}
// 回傳目前演出姿勢；沒有演出回 null。普攻 pose.phase：charge/dash/thrust/recover/return；橫掃：wind/swing
function qzAttackPose(now,origin,stage){
 const B=G.B,sp=B&&B.qzMotion;if(!sp||sp.motionSkipped)return null;
 const c=QZ_MOT[sp.motion]||QZ_ATTACK,t=Math.max(0,now-sp.at);
 if(t>=c.duration){B.qzMotion=null;return null}
 const k=qzK(),u=B.u||1,fd0=qzFace0(),sweep=sp.motion==='qzSweep';
 if(sweep){
  const swing=t>=c.windEnd,fd=fd0,py=QZB.shoulder,ws=QZB.tip.sweepwind,ss=QZB.tip.sweep;
  const a0=Math.atan2(ws[1]-py,ws[0]),a1=Math.atan2(ss[1]-py,ss[0]),r0=Math.hypot(ws[0],ws[1]-py),r1=Math.hypot(ss[0],ss[1]-py);
  const tipAt=tt=>{const p=motionEase((tt-c.windEnd)/300),a=a0+(a1-a0)*p,r=r0+(r1-r0)*p;return[origin[0]+fd*Math.cos(a)*r*k,origin[1]+(py+Math.sin(a)*r)*k]};
  const tn=Math.min(t,c.windEnd+300),pose={x:origin[0],y:origin[1],origin:origin.slice(),end:origin.slice(),fd,tilt:0,bob:0,k,elapsed:t,motion:'qzSweep',phase:swing?'swing':'wind',name:swing?'sweep':'sweepwind',target:sp.tg[0],tip:tipAt(tn)};
  const pts=[];if(swing&&t<c.windEnd+300+c.trailFade){const s0=Math.max(c.windEnd,tn-c.trailMs);for(let i=0;i<=16;i++)pts.push(tipAt(s0+(tn-s0)*i/16))}
  pose.trail=pts;pose.trailFade=1-Math.max(0,(t-c.windEnd-300)/c.trailFade);return pose}
 if(!sp.land||sp.landKey!==SW+'x'+SH)sp.land=qzLanding(sp.at,origin,sp.tg[0],stage,k),sp.landKey=SW+'x'+SH;
 const L=sp.land,fd=L.fd;sp.hitPt=L.tip;let phase='charge',name='charge',x=origin[0],y=origin[1],tilt=0,face=fd,bob=0;
 const run=()=>-Math.abs(Math.sin(t/30))*3*u,dn='dash'+Math.floor(t/65)%2;
 if(t<c.chargeEnd){}
 else if(t<c.dashEnd){phase='dash';name=dn;const p=motionEase((t-c.chargeEnd)/(c.dashEnd-c.chargeEnd));x=origin[0]+(L.x-origin[0])*p;y=origin[1]+(L.y-origin[1])*p;tilt=L.tilt*p;bob=run()}
 else if(t<c.thrustEnd){phase='thrust';name='thrust';x=L.x;y=L.y;tilt=L.tilt}
 else if(t<c.recoverEnd){phase='recover';name='recover';x=L.x;y=L.y;tilt=L.tilt*.5}
 else{phase='return';name=dn;face=fd0;const p=1-motionEase((t-c.recoverEnd)/(c.duration-c.recoverEnd));x=origin[0]+(L.x-origin[0])*p;y=origin[1]+(L.y-origin[1])*p;bob=run()}
 const pose={x,y,origin:origin.slice(),end:[L.x,L.y],fd:face,landFd:fd,tilt,bob,k,elapsed:t,motion:'qzAttack',phase,name,target:sp.tg[0],land:L};
 // 尖端：刺擊／收招＝落點尖端；其餘依姿勢量測值
 const off=qzTipOff(QZB.tip[name]?name:'thrust',k,tilt);pose.tip=phase==='thrust'?L.tip.slice():[x+face*off[0],y+bob+off[1]];
 // 刺擊拖尾：沿竹篙方向從身前拉到尖端（終點＝尖端）
 const ts=c.dashEnd,pts=[];
 if(t>=ts&&t<c.thrustEnd+c.trailFade){const tt=Math.min(t,c.thrustEnd),len=130*k*Math.min(1,(tt-ts)/50),ang=-L.tilt,dx=Math.cos(ang)*L.fd,dy=Math.sin(ang);
  for(let i=0;i<=16;i++){const s=i/16;pts.push([L.tip[0]-dx*len*(1-s),L.tip[1]-dy*len*(1-s)])}}
 pose.trail=pts;pose.trailFade=t<c.thrustEnd?1:1-(t-c.thrustEnd)/c.trailFade;
 return pose}
function qzDrawFrame(name,x,y,k,fd,tilt,alpha){
 const im=I['qzb_'+name];if(!im?.naturalWidth)return false;
 X.save();X.globalAlpha=alpha;X.translate(x,y);X.scale(fd,1);
 if(tilt){const pv=QZB.pivot;X.translate(pv[0]*k,pv[1]*k);X.rotate(-tilt);X.translate(-pv[0]*k,-pv[1]*k)}
 X.drawImage(im,-QZB.cx*k,-QZB.fy*k,QZB.W*k,QZB.H*k);X.restore();return true}
function qzShadow(x,y,k,u,alpha){X.save();X.globalAlpha=alpha;X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(x,y-3,92*k,6*u,0,0,7);X.fill();X.restore()}
function qzTrail(pose,u,alpha){
 const tr=pose.trail;if(!tr||tr.length<3)return;
 X.save();X.globalCompositeOperation='lighter';X.lineCap='round';X.lineJoin='round';
 const smooth=(pts,move)=>{if(move)X.moveTo(...pts[0]);else X.lineTo(...pts[0]);for(let i=1;i<pts.length-1;i++)X.quadraticCurveTo(...pts[i],(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2);X.lineTo(...pts.at(-1))};
 const g=X.createLinearGradient(...tr[0],...tr.at(-1));g.addColorStop(0,'rgba(206,150,61,0)');g.addColorStop(.4,'#d5a554');g.addColorStop(.8,'#ffe4a0');g.addColorStop(1,'#fff8dd');
 for(const[band,op]of[[1.7,.2],[1,.65],[.3,1]]){const l=[],r=[];
  tr.forEach((p,i)=>{const a=tr[Math.max(0,i-1)],b=tr[Math.min(tr.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,w=(Math.sin(i/(tr.length-1)*Math.PI*.5)*7+1)*u*band;l.push([p[0]-dy/n*w,p[1]+dx/n*w]);r.push([p[0]+dy/n*w,p[1]-dx/n*w])});
  X.globalAlpha=alpha*pose.trailFade*op;X.fillStyle=g;X.beginPath();smooth(l,true);smooth(r.reverse());X.closePath();X.fill()}
 X.restore()}
// 演出中的青舟（拖尾在身體後面）
function drawQzMotion(pose,u,alpha){
 qzTrail(pose,u,alpha);qzShadow(pose.x,pose.y,pose.k,u,alpha);
 qzDrawFrame(pose.name,pose.x,pose.y+pose.bob,pose.k,pose.fd,pose.tilt,alpha)}
// 非演出時的姿勢：受擊 → 倒下 → 勝利 → 待機（idle0/idle1 每 600ms 輪替）
function qzStance(now,p){
 const B=G.B,pend=B.fx.some(f=>f.t===p&&!f.heal&&now<f.at),hf=B.fx.some(f=>f.t===p&&!f.heal&&now>=f.at&&now-f.at<500);
 if(pend)return 'idle'+Math.floor(now/600)%2;
 if(hf)return 'hit';
 if(p.hp<=0)return 'down';
 if(B.en.length&&B.en.every(e=>e.hp<=0)&&!B.qzMotion&&!B.fx.some(f=>now<f.at))return 'win';
 return 'idle'+Math.floor(now/600)%2}
// 略過訊息時：直接結算（命中時間提前到現在），演出收掉
function finishQzAttack(now){
 const B=G.B,sp=B&&B.qzMotion;if(!sp)return;
 const impact=(sp.delay||0)+(VIMP[sp.k]||110);
 if(now-sp.at<impact){sp.at=now-impact;for(const f of B.fx)if(f.sp===sp&&f.at>now){f.at=now;if(f.t.hp<=0&&B.en.includes(f.t))f.t.dieAt=now}}
 sp.motionSkipped=true;B.qzMotion=null;B.qzPose=null}
