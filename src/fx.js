'use strict';
// 戰鬥 VFX：粒子、刀光、狐火、水浪、閃光、震動
// ---------- battle VFX (canvas particles) ----------
const VPT=[],VMAX=160;
function vp(o){if(VPT.length>=VMAX)VPT.shift();VPT.push(Object.assign({vx:0,vy:0,g:0,life:500,sz:3,col:'#fff',dr:.97,b:performance.now()},o))}
function burst(x,y,n,col,sp,o){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=sp*(.35+Math.random()*.9);vp(Object.assign({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,col:Array.isArray(col)?col[i%col.length]:col,sz:1.5+Math.random()*3,life:280+Math.random()*320},o||{}))}}
function shake(a,d){if(G.B)G.B.shk={at:performance.now(),a,d:d||300}}
function flash(d,c,k){if(G.B)G.B.fl={at:performance.now(),d:d||160,c:c||'255,255,255',k:k||.45}}
const VIMP={slash:110,claw:150,sweep:200,foxfire:330,rain:320,item:160,guard:60,splash:170,leaf:220,tail:190,wave:520,poison:120,drink:300,whirl:260},VDUR={slash:380,claw:420,sweep:520,foxfire:620,rain:850,item:600,guard:500,splash:500,leaf:520,tail:480,wave:900,poison:500,drink:800,whirl:640};
function startFx(sp,now){const B=G.B;if(!B||sp.at!=null)return;sp.at=now;const pl=G.party.includes(sp.src)?bPlan(sp.src.e,sp.k):null;if(pl){sp.plan=pl;sp.delay=pl.delay;(B.an=B.an||[]).push({p:sp.src,sp,plan:pl,at:now})}if(!sp.tg.length)sp.tg=[...new Set(sp.hits.map(h=>h.t))];(B.vx=B.vx||[]).push(sp);const im=VIMP[sp.k]||150;
 sp.hits.forEach((h,i)=>{const at=now+(sp.delay||0)+im+(sp.k=='sweep'?i*70:sp.k=='wave'?i*90:0);B.fx.push({t:h.t,d:h.d,crit:h.crit,heal:h.heal,big:h.big,at,sp});if(h.t.hp<=0&&B.en.includes(h.t))h.t.dieAt=at})}
function glowLine(pts,w,col,a){X.save();X.globalCompositeOperation='lighter';X.lineCap='round';X.lineJoin='round';for(const[k,c]of[[3,col],[1.6,col],[.6,'#fff']]){X.globalAlpha=a*(k==3?.25:k>1?.55:1);X.strokeStyle=c;X.lineWidth=w*k;X.beginPath();pts.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.stroke()}X.restore()}
function arcPts(cx,cy,r,a0,a1,n,sq){const o=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*(sq||1)])}return o}
function orb(x,y,r,c1,c2,a){X.save();X.globalCompositeOperation='lighter';X.globalAlpha=a==null?1:a;const g=X.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.3,c1);g.addColorStop(1,c2);X.fillStyle=g;X.beginPath();X.arc(x,y,r,0,7);X.fill();X.restore()}
function shield(x,y,rw,rh,a){X.save();X.globalCompositeOperation='lighter';X.globalAlpha=a;const g=X.createRadialGradient(x,y,rw*.2,x,y,rw);g.addColorStop(0,'rgba(255,220,120,0)');g.addColorStop(.75,'rgba(255,210,110,.25)');g.addColorStop(1,'rgba(255,240,170,.9)');X.fillStyle=g;X.beginPath();X.ellipse(x,y,rw,rh,0,0,7);X.fill();X.strokeStyle='rgba(255,236,160,.9)';X.lineWidth=2;X.beginPath();for(let i=0;i<=6;i++){const an=i/6*6.283+Math.PI/6;i?X.lineTo(x+Math.cos(an)*rw*.8,y+Math.sin(an)*rh*.8):X.moveTo(x+Math.cos(an)*rw*.8,y+Math.sin(an)*rh*.8)}X.stroke();X.restore()}
function drawVFX(now){const B=G.B,u=B.u||1,dt=Math.min(50,now-(B.vlt||now))/16.7;B.vlt=now;
 B.vx=(B.vx||[]).filter(sp=>now-sp.at<(sp.delay||0)+(VDUR[sp.k]||500));
 for(const sp of B.vx){const t=now-sp.at-(sp.delay||0);if(t<0)continue;if(!sp.sounded){sp.sounded=1;battleSound(sp.k,'start',false,sp.src)}const imp=VIMP[sp.k]||150,P=sp.tg.map(o=>B.po(o)),S=B.po(sp.src),fire=!sp.fired&&t>=imp;if(fire){sp.fired=1;battleSound(sp.k,'impact',sp.hits.some(h=>h.crit||h.big),sp.src,sp.hits.some(h=>h.crit))}
  const big=sp.hits.some(h=>h.crit||h.big);
  switch(sp.k){
  case'slash':P.forEach(q=>{const p=Math.min(1,t/260),R=Math.max(42*u,q[2]*.55);if(!sp.plan&&t<340)glowLine(arcPts(q[0],q[1],R,-2.6,-2.6+p*2.9,18,.55).slice(Math.floor(p*8)),7*u,'#7fe0ff',1-Math.max(0,(t-200)/140));
    if(sp.plan&&t>=imp&&t<imp+90)orb(q[0],q[1]-q[3]*.3,(10+(t-imp)*.15)*u,'#fff3c6','rgba(224,161,61,0)',1-(t-imp)/90);
    if(fire){burst(sp.plan?q[0]:q[0]+R*.3,sp.plan?q[1]-q[3]*.3:q[1],16,sp.plan?['#fff5ce','#f1ca78','#c49043']:['#fff','#9ef','#5cf'],6*u);if(big){shake(9,320);flash(170)}else shake(3,160)}});break;
  case'claw':P.forEach(q=>{for(let k=0;k<3;k++){const p=Math.min(1,Math.max(0,(t-k*40)/160)),ox=(k-1)*14*u,L=q[3]*.55;if(p>0&&t<380)glowLine([[q[0]+ox+L*.35,q[1]-L*.5],[q[0]+ox+L*.35-L*.7*p,q[1]-L*.5+L*p]],5*u,'#ff7ad9',1-Math.max(0,(t-260)/120))}
    if(fire){burst(q[0],q[1],16,['#fff','#ffa6ec','#c58bff'],5.5*u);if(big){shake(9,320);flash(170)}else shake(3,160)}});break;
  case'sweep':{if(P.length){const xs=P.map(q=>q[0]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=P[0][1]+P[0][3]*.1,R=Math.max(80*u,(Math.max(...xs)-Math.min(...xs))/2+60*u),p=Math.min(1,t/320);
    if(t<460)glowLine(arcPts(cx,cy,R,Math.PI*1.05,Math.PI*1.05-p*Math.PI*1.1,26,.32),9*u,'#8fd8ff',1-Math.max(0,(t-320)/140));
    P.forEach((q,i)=>{if(Math.abs(t-imp-i*70)<dt*17){for(let k=0;k<12;k++)vp({x:q[0]+(Math.random()-.5)*q[2]*.5,y:q[1]+q[3]*.3,vx:(Math.random()-.5)*5*u,vy:-(2+Math.random()*4)*u,g:.25*u,col:k%3?'#9fd6ff':'#fff',sz:2+Math.random()*2.5,life:500});burst(q[0],q[1],8,'#fff',5*u);shake(big?8:4,200)}})}break}
  case'foxfire':{if(!S||!P[0])break;const q=P[0],p=Math.min(1,t/imp),x=S[0]+(q[0]-S[0])*p,y=S[1]-S[3]*.2+(q[1]-S[1]+S[3]*.2)*p-Math.sin(p*Math.PI)*60*u;
    if(t<imp){orb(x,y,(13+Math.sin(t/30)*2)*u,'#7cf','rgba(40,90,255,0)');vp({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,vy:-.6,col:Math.random()<.5?'#6af':'#bdf',sz:3+Math.random()*3,life:280})}
    else{const a=1-(t-imp)/(VDUR.foxfire-imp);orb(q[0],q[1],(30+(1-a)*40)*u,'#5af','rgba(60,60,255,0)',a)}
    if(fire){burst(q[0],q[1],26,['#fff','#8cf','#47f','#b9f'],5*u,{g:-.12*u,life:520});flash(120,'90,140,255',.22);shake(big?9:5,260)}break}
  case'rain':{const xs=P.map(q=>q[0]),x0=Math.min(...xs)-60*u,x1=Math.max(...xs)+60*u,yT=Math.min(...P.map(q=>q[1]))-110*u;
    if(t<560)for(let k=0;k<3;k++)vp({x:x0+Math.random()*(x1-x0),y:yT+Math.random()*30*u,vy:7*u,vx:-1*u,col:'#bff5d0',sz:1.6,life:260,ln:9*u});
    X.save();X.globalCompositeOperation='lighter';X.globalAlpha=.18*Math.sin(Math.min(1,t/VDUR.rain)*Math.PI);X.fillStyle='#7fffb0';X.fillRect(x0,yT,x1-x0,P[0][1]+P[0][3]*.6-yT);X.restore();
    P.forEach(q=>{if(t>imp&&t<imp+380&&Math.random()<.7*dt)vp({x:q[0]+(Math.random()-.5)*q[2]*1.3,y:q[1]+q[3]*.4,vy:-(1+Math.random()*1.6)*u,col:Math.random()<.5?'#8f8':'#efffd0',sz:2+Math.random()*2,life:600,star:1})});break}
  case'item':P.forEach(q=>{if(t>imp-60&&t<imp+320&&Math.random()<.8*dt)vp({x:q[0]+(Math.random()-.5)*q[2]*1.2,y:q[1]+q[3]*.4,vy:-(1+Math.random()*1.5)*u,col:Math.random()<.5?'#bf8':'#ffe9a0',sz:2+Math.random()*2,life:600,star:1});if(t<VDUR.item)orb(q[0],q[1],46*u,'rgba(150,255,150,.5)','rgba(80,255,120,0)',.4*Math.sin(t/VDUR.item*Math.PI))});break;
  case'guard':P.forEach(q=>{const p=Math.min(1,t/200);shield(q[0],q[1],q[2]*.62*(1.4-.4*p),q[3]*.58*(1.4-.4*p),.9*(1-t/VDUR.guard)+.3);if(fire)burst(q[0],q[1],10,'#ffe7a0',3.5*u)});break;
  case'splash':P.forEach(q=>{if(S&&t<imp)orb(S[0]+(q[0]-S[0])*t/imp,S[1]+(q[1]-S[1])*t/imp,10*u,'#6cf','rgba(40,120,255,0)',.8);
    if(fire){for(let k=0;k<18;k++)vp({x:q[0],y:q[1],vx:(Math.random()-.5)*7*u,vy:-(2+Math.random()*5)*u,g:.3*u,col:k%3?'#7cc8ff':'#e8f6ff',sz:2+Math.random()*3,life:520});shake(big?8:4,200);if(big)flash(140)}
    if(t>imp){const a=(t-imp)/(VDUR.splash-imp);X.save();X.globalAlpha=1-a;X.strokeStyle='#bfe6ff';X.lineWidth=3;X.beginPath();X.ellipse(q[0],q[1]+q[3]*.4,(10+a*50)*u,(4+a*14)*u,0,0,7);X.stroke();X.restore()}});break;
  case'leaf':P.forEach(q=>{if(S&&t<imp&&Math.random()<dt)vp({x:S[0],y:S[1],vx:(q[0]-S[0])/14,vy:(q[1]-S[1])/14,col:Math.random()<.5?'#9c6':'#cf8',sz:3,life:240,leaf:1});
    if(t>imp-40&&t<imp+200)glowLine([[q[0]-30*u,q[1]-25*u],[q[0]+30*u,q[1]+25*u]],4*u,'#bfff8a',.8);
    if(fire){burst(q[0],q[1],14,['#9c6','#dfa','#fff'],5*u,{leaf:1});shake(big?7:3,180)}});break;
  case'tail':P.forEach(q=>{const p=Math.min(1,t/260),R=Math.max(70*u,q[2]);if(t<420)glowLine(arcPts(q[0]-R*.2,q[1]-R*.3,R,-.4,-.4+p*2.4,22,.6),12*u,'#2fd0b0',1-Math.max(0,(t-280)/140));
    const TI=I.fx_tail_sweep;if(TI?.naturalWidth&&t<520){const a=Math.min(1,t/120)*(1-Math.max(0,(t-340)/180)),w=Math.max(170*u,q[2]*1.7),hh=w*TI.naturalHeight/TI.naturalWidth;X.save();X.globalAlpha=a;X.drawImage(TI,q[0]-w*.6,q[1]-q[3]*.4-hh/2,w,hh);X.restore()}
    if(fire){burst(q[0],q[1],18,['#cff','#3fc9b0','#fff'],7*u);shake(10,320);if(big)flash(160)}});break;
  case'wave':{if(!P.length)break;const xs=P.map(q=>q[0]),cx=SW/2,cy=P[0][1]-P[0][3]*.1;
    if(t<560){const a=Math.min(1,t/200)*(1-Math.max(0,(t-420)/140)),wx=S?S[0]:cx,wy=S?S[1]:cy-100*u;X.save();X.globalCompositeOperation='lighter';for(let k=0;k<5;k++){X.globalAlpha=a*(.5-k*.08);X.strokeStyle=k%2?'#58c8ff':'#bff';X.lineWidth=(6-k)*u;X.beginPath();X.arc(wx,wy,(18+k*14)*u,t/90+k,t/90+k+3.6);X.stroke()}X.restore();orb(wx,wy,26*u,'#5af','rgba(30,90,200,0)',a*.8)}
    const WB=I.fx_wave_big;
    if(t>260&&WB?.naturalWidth){const p=Math.min(1,(t-260)/520),ww=Math.max(SW*1.3,300),hh=ww*WB.naturalHeight/WB.naturalWidth,a=Math.min(1,(t-260)/90)*(1-Math.max(0,(t-720)/180));X.save();X.globalAlpha=.32*a;X.fillStyle='#0a1a24';X.fillRect(-20,-20,SW+40,SH+40);X.globalAlpha=a;X.drawImage(WB,-ww+p*(SW+ww*1.05),cy-hh*.62,ww,hh);X.restore();
     if(Math.random()<dt)vp({x:-ww*.1+p*(SW+ww*1.05)-ww*.1,y:cy-hh*.3+Math.random()*hh*.4,vx:2*u,vy:-(1+Math.random()*3)*u,g:.25*u,col:'#e8f8ff',sz:2+Math.random()*2.5,life:450})}
    else if(t>300){const p=Math.min(1,(t-300)/420),fx0=-SW*.3+p*SW*1.5,hgt=Math.min(Math.max(P[0][3]*1.7,130*u),SH*.32),a=1-Math.max(0,(t-680)/220);X.save();X.globalAlpha=.78*a;const g=X.createLinearGradient(0,cy-hgt,0,cy+hgt*.5);g.addColorStop(0,'rgba(220,250,255,.9)');g.addColorStop(.3,'rgba(70,160,230,.8)');g.addColorStop(1,'rgba(10,40,90,.2)');X.fillStyle=g;X.beginPath();X.moveTo(fx0-SW*.9,cy+hgt*.5);X.lineTo(fx0-SW*.9,cy-hgt*.35);
      for(let k=0;k<=20;k++){const xx=fx0-SW*.9+k*SW*.9/20;X.lineTo(xx,cy-hgt*.35-Math.sin(k*.6+t/60)*10*u-(k>16?(k-16)*hgt*.12:0))}X.lineTo(fx0+20*u,cy+hgt*.5);X.fill();X.globalCompositeOperation='lighter';X.strokeStyle='rgba(230,250,255,.8)';X.lineWidth=3*u;X.stroke();X.restore();
      if(Math.random()<dt)vp({x:fx0,y:cy-hgt*.4+Math.random()*hgt*.4,vx:2*u,vy:-(1+Math.random()*3)*u,g:.25*u,col:'#e8f8ff',sz:2+Math.random()*2.5,life:450})}
    const SPI=I.fx_splash;if(SPI?.naturalWidth&&t>imp&&t<imp+450){const a=1-(t-imp)/450;P.forEach(q=>{const w=(110+(t-imp)*.25)*u;X.save();X.globalAlpha=a;X.drawImage(SPI,q[0]-w/2,q[1]-q[3]*.15-w/2,w,w);X.restore()})}
    if(fire){shake(13,500);flash(200,'200,235,255')}break}
  case'drink':P.forEach(q=>{if(t<640&&Math.random()<.9*dt)vp({x:q[0]+(Math.random()-.5)*q[2]*.6,y:q[1]-q[3]*.1+Math.random()*q[3]*.4,vy:-(1+Math.random()*1.8)*u,col:Math.random()<.5?'#9fe6ff':'#d6ffe9',sz:2+Math.random()*2.5,life:600,star:1});if(t<VDUR.drink)orb(q[0],q[1]-q[3]*.2,50*u,'rgba(140,230,255,.5)','rgba(60,160,255,0)',.35*Math.sin(t/VDUR.drink*Math.PI))});break;
  case'whirl':P.forEach(q=>{const WI=I.fx_whirl,a=Math.sin(Math.min(1,t/VDUR.whirl)*Math.PI);if(WI?.naturalWidth){const w=(90+t*.12)*u;X.save();X.globalAlpha=.9*a;X.drawImage(WI,q[0]-w/2,q[1]+q[3]*.1-w*.62,w,w);X.restore()}if(fire){burst(q[0],q[1],14,['#9ef','#fff','#58c8ff'],5*u);shake(6,220)}});break;
  case'poison':P.forEach(q=>{if(t<380&&Math.random()<.8*dt)vp({x:q[0]+(Math.random()-.5)*q[2],y:q[1]+q[3]*.3,vy:-(.6+Math.random())*u,col:Math.random()<.5?'#b46cff':'#e0a0ff',sz:3+Math.random()*3,life:500,ring:1})});break}}
 // particles
 X.save();X.globalCompositeOperation='lighter';for(let i=VPT.length-1;i>=0;i--){const p=VPT[i],a=1-(now-p.b)/p.life;if(a<=0){VPT.splice(i,1);continue}
  p.vy+=p.g*dt;p.vx*=Math.pow(p.dr,dt);p.vy*=Math.pow(p.dr,dt);p.x+=p.vx*dt;p.y+=p.vy*dt;X.globalAlpha=Math.min(1,a*1.4);X.fillStyle=p.col;X.strokeStyle=p.col;
  if(p.ln){X.lineWidth=p.sz;X.beginPath();X.moveTo(p.x,p.y);X.lineTo(p.x-p.vx*1.5,p.y-p.ln);X.stroke()}
  else if(p.star){const r=p.sz*(1+a);X.fillRect(p.x-r*1.6,p.y-.6,r*3.2,1.2);X.fillRect(p.x-.6,p.y-r*1.6,1.2,r*3.2);X.beginPath();X.arc(p.x,p.y,r*.5,0,7);X.fill()}
  else if(p.ring){X.lineWidth=1.5;X.beginPath();X.arc(p.x,p.y,p.sz,0,7);X.stroke()}
  else if(p.leaf){X.save();X.translate(p.x,p.y);X.rotate(now/90+i);X.fillRect(-p.sz,-p.sz*.35,p.sz*2,p.sz*.7);X.restore()}
  else{X.beginPath();X.arc(p.x,p.y,p.sz*(.5+a*.5),0,7);X.fill()}}X.restore()}
