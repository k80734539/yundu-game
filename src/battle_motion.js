'use strict';
// Feet registration, hand sockets and pole use one display-only geometry.
const QZ_ATTACK={duration:650,windupEnd:90,dashEnd:230,swingEnd:390,recoverEnd:450,
 step:4,sideGap:.26,portraitScale:1.35,landscapeScale:1.18,
 portraitPole:138,landscapePole:112,grip:.69,trailMs:80,trailFade:60};
const QZ_POSES={windup:{key:'qz_atk_windup',hand:[176.26, 52.07]},strike:{key:'qz_atk_strike',hand:[43.37, 125.66]},recover:{key:'qz_atk_recover',hand:[132.08, 156.48]}};
const motionEase=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
function qzWeaponAngle(t){const c=QZ_ATTACK;
 if(t<c.windupEnd)return .35+.8*motionEase(t/c.windupEnd);
 if(t<c.dashEnd)return 1.15;
 if(t<c.swingEnd)return 1.15-3.65*motionEase((t-c.dashEnd)/(c.swingEnd-c.dashEnd));
 if(t<c.recoverEnd)return -2.5+.25*motionEase((t-c.swingEnd)/(c.recoverEnd-c.swingEnd));
 return -2.25+1.5*motionEase((t-c.recoverEnd)/(c.duration-c.recoverEnd));
}
function qzAttackPose(now,origin,target,w,h,stage){
 const sp=G.B.qzMotion;if(!sp||sp.motionSkipped)return null;
 const t=Math.max(0,now-sp.at),c=QZ_ATTACK;
 if(t>=c.duration){G.B.qzMotion=null;return null}
 const portrait=SH>SW,scale=portrait?c.portraitScale:c.landscapeScale,artH=h*scale;
 const dir=origin[0]>=target[0]?1:-1,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Solve the landing position from the actual pole tip at impact, not an arbitrary offset.
 const pole=(portrait?c.portraitPole:c.landscapePole)*(G.B.u||1),socket=QZ_POSES.strike.hand,s=artH/256,angle=qzWeaponAngle(c.dashEnd+VIMP.slash)*dir;
 const tipOffset=[(socket[0]-128)*s*dir+Math.sin(angle)*pole*c.grip,(socket[1]-248)*s-Math.cos(angle)*pole*c.grip];
 const end=[clamp(target[0]-tipOffset[0],stage.left+artH*.42,stage.right-artH*.42),clamp(target[1]-target[3]*.3-tipOffset[1],stage.top+artH*.9,stage.bottom-8)];
 let p=0,phase='windup';
 if(t>=c.windupEnd&&t<c.dashEnd){phase='dash';p=motionEase((t-c.windupEnd)/(c.dashEnd-c.windupEnd))}
 else if(t>=c.dashEnd&&t<c.swingEnd){phase='swing';p=1}
 else if(t>=c.swingEnd&&t<c.recoverEnd){phase='recover';p=1}
 else if(t>=c.recoverEnd){phase='return';p=1-motionEase((t-c.recoverEnd)/(c.duration-c.recoverEnd))}
 const x=p===1?end[0]:p===0?origin[0]:origin[0]+(end[0]-origin[0])*p,y=p===1?end[1]:p===0?origin[1]:origin[1]+(end[1]-origin[1])*p;
 const art=phase==='swing'?'strike':phase==='recover'||phase==='return'?'recover':'windup';
 return {x,y,origin:origin.slice(),end,target:sp.tg[0],phase,art,elapsed:t,artH,dir,pole,staff:qzWeaponAngle(t)*dir,frame:phase==='dash'||phase==='return'?1+Math.floor(t/60)%2:0,bob:phase==='dash'||phase==='return'?-Math.abs(Math.sin(t/28))*c.step:0};
}
function qzGripGeometry(pose,t=pose.elapsed){
 const art=t<QZ_ATTACK.dashEnd?'windup':t<QZ_ATTACK.swingEnd?'strike':'recover',a=QZ_POSES[art],s=pose.artH/256;
 const hand=[pose.x+(a.hand[0]-128)*s*pose.dir,pose.y+pose.bob+(a.hand[1]-248)*s];
 const angle=qzWeaponAngle(t)*pose.dir,r=pose.pole*QZ_ATTACK.grip;
 return {hand,angle,tip:[hand[0]+Math.sin(angle)*r,hand[1]-Math.cos(angle)*r]};
}
function clipQzStage(stage){
 X.beginPath();X.rect(stage.left,stage.top,stage.right-stage.left,stage.bottom-stage.top);X.clip();
 for(const r of stage.labels){X.beginPath();X.rect(stage.left,stage.top,stage.right-stage.left,stage.bottom-stage.top);X.rect(r.x,r.y,r.w,r.h);X.clip('evenodd')}
}
function qzTrailPoints(pose){
 const c=QZ_ATTACK,t=pose.elapsed;if(t<=c.dashEnd||t>=c.swingEnd+c.trailFade)return [];
 const end=Math.min(t,c.swingEnd-.001),start=Math.max(c.dashEnd,end-c.trailMs),pts=[];
 for(let i=0;i<=16;i++)pts.push(qzGripGeometry(pose,start+(end-start)*i/16).tip);
 return pts;
}
function drawQzAttack(im,pose,w,h,u,alpha,stage){
 X.save();clipQzStage(stage);X.globalAlpha=alpha;
 const grip=qzGripGeometry(pose),trail=qzTrailPoints(pose);pose.hand=grip.hand;pose.tip=grip.tip;pose.trail=trail;
 if(trail.length){const fade=1-Math.max(0,(pose.elapsed-QZ_ATTACK.swingEnd)/QZ_ATTACK.trailFade);
  X.save();X.globalCompositeOperation='lighter';X.lineCap='round';X.lineJoin='round';
  // Continuous tapered ribbons, following sampled pole-tip positions (no extra particles).
  const smooth=(points,move=false)=>{if(move)X.moveTo(...points[0]);else X.lineTo(...points[0]);for(let i=1;i<points.length-1;i++)X.quadraticCurveTo(...points[i],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);X.lineTo(...points.at(-1))};
  const gradient=X.createLinearGradient(...trail[0],...trail.at(-1));gradient.addColorStop(0,'rgba(206,150,61,0)');gradient.addColorStop(.4,'#d5a554');gradient.addColorStop(.8,'#ffe4a0');gradient.addColorStop(1,'#fff8dd');
  for(const [band,opacity] of [[1.7,.2],[1,.65],[.3,1]]){const left=[],right=[];
   trail.forEach((p,i)=>{const a=trail[Math.max(0,i-1)],b=trail[Math.min(trail.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,k=(Math.sin(i/(trail.length-1)*Math.PI)*8+1)*u*band;left.push([p[0]-dy/n*k,p[1]+dx/n*k]);right.push([p[0]+dy/n*k,p[1]-dx/n*k])});
   X.globalAlpha=alpha*fade*opacity;X.fillStyle=gradient;X.beginPath();smooth(left,true);smooth(right.reverse());X.closePath();X.fill();
  }X.restore();
 }
 X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(pose.x,pose.y-3,w*.32,6*u,0,0,7);X.fill();
 // Pole is behind the closed hands and rotates around the authored grip socket.
 X.save();X.translate(...grip.hand);X.rotate(grip.angle);const pole=I.qz_pole;
 if(pole?.naturalWidth){const pw=pose.pole*pole.width/pole.height;X.drawImage(pole,-pw/2,-pose.pole*QZ_ATTACK.grip,pw,pose.pole)}
 else{X.fillStyle='#b99b59';X.fillRect(-3*u,-pose.pole*QZ_ATTACK.grip,6*u,pose.pole)}X.restore();
 const body=I[QZ_POSES[pose.art].key];X.save();X.translate(pose.x,pose.y+pose.bob);X.scale(pose.dir,1);
 if(body?.naturalWidth)X.drawImage(body,-pose.artH/2,-pose.artH*248/256,pose.artH,pose.artH);else X.drawImage(im,-w/2,-h,w,h);
 X.restore();X.restore();
}
// Keep message skipping and turn progression unchanged; settle the visual once.
function finishQzAttack(now){
 const B=G.B,sp=B&&B.qzMotion;if(!sp)return;
 const impact=(sp.delay||0)+VIMP.slash;
 if(now-sp.at<impact){sp.at=now-impact;for(const f of B.fx)if(f.sp===sp&&f.at>now){f.at=now;if(f.t.hp<=0&&B.en.includes(f.t))f.t.dieAt=now}}
 sp.motionSkipped=true;B.qzMotion=null;B.qzPose=null;
}
