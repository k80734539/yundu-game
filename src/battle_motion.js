'use strict';
// Feet registration, hand sockets and pole use one display-only geometry.
const QZ_ATTACK={duration:650,windupEnd:90,dashEnd:230,swingEnd:390,recoverEnd:450,
 step:4,clearGap:2,bodyHalf:.405,bodyTop:224/256,landingStep:3,landingYWeight:.72,portraitScale:1.35,landscapeScale:1.18,
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
function qzAngleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function qzClearLanding(base,target,artH,dir,pole,stage,targetIndex,hitContact,handOffset,baseAngle){
 if(targetIndex<=0)return {...base,aimAngle:baseAngle};
 const B=G.B,u=B.u||1,r=pole*QZ_ATTACK.grip,half=artH*QZ_ATTACK.bodyHalf,minX=stage.left+half,maxX=stage.right-half;
 const other=B.en.filter(e=>e!==B.qzMotion.tg[0]&&e.hp>0).map(e=>B.po(e)),step=Math.max(2,u*QZ_ATTACK.landingStep);let best=null;
 for(let x=minX;x<=maxX;x+=step){const dx=hitContact[0]-(x+handOffset[0]);if(Math.abs(dx)>=r)continue;
  const dyAbs=Math.sqrt(r*r-dx*dx);
  for(const dy of [-dyAbs,dyAbs]){const y=hitContact[1]-dy-handOffset[1],top=y-artH*QZ_ATTACK.bodyTop,bottom=y;
   if(top<stage.top||bottom>stage.bottom-8)continue;
   const overlaps=other.some(q=>{const ey0=q[1]-q[3]/2,ey2=q[1]+q[3]/2;return top<ey2&&bottom>ey0&&Math.abs(x-q[0])<half+q[2]/2+QZ_ATTACK.clearGap*u});if(overlaps)continue;
   const aimAngle=Math.atan2(dx,-dy),score=Math.hypot(x-base.x,(y-base.y)*QZ_ATTACK.landingYWeight);
   if(!best||score<best.score)best={x,y,aimAngle,score};
  }
 }
 return best||{...base,aimAngle:baseAngle};
}
function qzAttackPose(now,origin,target,w,h,stage){
 const sp=G.B.qzMotion;if(!sp||sp.motionSkipped)return null;
 const t=Math.max(0,now-sp.at),c=QZ_ATTACK;
 if(t>=c.duration){G.B.qzMotion=null;return null}
 const portrait=SH>SW,scale=portrait?c.portraitScale:c.landscapeScale,artH=h*scale;
 const dir=origin[0]>=target[0]?1:-1,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Solve the landing position from the actual pole tip at impact, not an arbitrary offset.
 const pole=(portrait?c.portraitPole:c.landscapePole)*(G.B.u||1),socket=QZ_POSES.strike.hand,s=artH/256,angle=qzWeaponAngle(c.dashEnd+VIMP.slash)*dir;
 const hitContact=[target[0],target[1]-target[3]*.3],handOffset=[(socket[0]-128)*s*dir,(socket[1]-248)*s];
 const tipOffset=[handOffset[0]+Math.sin(angle)*pole*c.grip,handOffset[1]-Math.cos(angle)*pole*c.grip];
 const base={x:clamp(hitContact[0]-tipOffset[0],stage.left+artH*.42,stage.right-artH*.42),y:clamp(hitContact[1]-tipOffset[1],stage.top+artH*.9,stage.bottom-8)};
 const targetIndex=G.B.en.indexOf(G.B.qzMotion.tg[0]);
 const layoutKey=[SW,SH,...origin,...target,stage.left,stage.right,stage.top,stage.bottom,...G.B.en.flatMap(e=>{const q=G.B.po(e);return[q[0],q[1],q[2],q[3],e.hp>0?1:0]})].join(',');
 const landing=sp.landingKey===layoutKey?sp.landing:(sp.landing=qzClearLanding(base,target,artH,dir,pole,stage,targetIndex,hitContact,handOffset,angle),sp.landingKey=layoutKey,sp.landing);
 const end=[landing.x,landing.y];
 let p=0,phase='windup';
 if(t>=c.windupEnd&&t<c.dashEnd){phase='dash';p=motionEase((t-c.windupEnd)/(c.dashEnd-c.windupEnd))}
 else if(t>=c.dashEnd&&t<c.swingEnd){phase='swing';p=1}
 else if(t>=c.swingEnd&&t<c.recoverEnd){phase='recover';p=1}
 else if(t>=c.recoverEnd){phase='return';p=1-motionEase((t-c.recoverEnd)/(c.duration-c.recoverEnd))}
 const x=p===1?end[0]:p===0?origin[0]:origin[0]+(end[0]-origin[0])*p,y=p===1?end[1]:p===0?origin[1]:origin[1]+(end[1]-origin[1])*p;
 const art=phase==='swing'?'strike':phase==='recover'||phase==='return'?'recover':'windup';
 return {x,y,origin:origin.slice(),end,target:sp.tg[0],phase,art,elapsed:t,artH,dir,pole,aimAngle:landing.aimAngle,frame:phase==='dash'||phase==='return'?1+Math.floor(t/60)%2:0,bob:phase==='dash'||phase==='return'?-Math.abs(Math.sin(t/28))*c.step:0};
}
function qzGripGeometry(pose,t=pose.elapsed){
 const art=t<QZ_ATTACK.dashEnd?'windup':t<QZ_ATTACK.swingEnd?'strike':'recover',a=QZ_POSES[art],s=pose.artH/256;
 const hand=[pose.x+(a.hand[0]-128)*s*pose.dir,pose.y+pose.bob+(a.hand[1]-248)*s];
 const raw=qzWeaponAngle(t)*pose.dir,progress=motionEase((t-QZ_ATTACK.dashEnd)/VIMP.slash),angle=raw+qzAngleDiff(pose.aimAngle,raw)*progress,r=pose.pole*QZ_ATTACK.grip;
 return {hand,angle,tip:[hand[0]+Math.sin(angle)*r,hand[1]-Math.cos(angle)*r]};
}
function clipQzStage(stage,ctx=X){
 ctx.beginPath();ctx.rect(stage.left,stage.top,stage.right-stage.left,stage.bottom-stage.top);ctx.clip();
}
function qzTrailPoints(pose){
 const c=QZ_ATTACK,t=pose.elapsed;if(t<=c.dashEnd||t>=c.swingEnd+c.trailFade)return [];
 const end=Math.min(t,c.swingEnd-.001),start=Math.max(c.dashEnd,end-c.trailMs),pts=[];
 for(let i=0;i<=16;i++)pts.push(qzGripGeometry(pose,start+(end-start)*i/16).tip);
 return pts;
}
function drawQzAttack(im,pose,w,h,u,alpha,stage,ctx=X){
 ctx.save();clipQzStage(stage,ctx);ctx.globalAlpha=alpha;
 const grip=qzGripGeometry(pose),trail=qzTrailPoints(pose);pose.hand=grip.hand;pose.tip=grip.tip;pose.trail=trail;
 if(trail.length){const fade=1-Math.max(0,(pose.elapsed-QZ_ATTACK.swingEnd)/QZ_ATTACK.trailFade);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
  // Continuous tapered ribbons, following sampled pole-tip positions (no extra particles).
  const smooth=(points,move=false)=>{if(move)ctx.moveTo(...points[0]);else ctx.lineTo(...points[0]);for(let i=1;i<points.length-1;i++)ctx.quadraticCurveTo(...points[i],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);ctx.lineTo(...points.at(-1))};
  const gradient=ctx.createLinearGradient(...trail[0],...trail.at(-1));gradient.addColorStop(0,'rgba(206,150,61,0)');gradient.addColorStop(.4,'#d5a554');gradient.addColorStop(.8,'#ffe4a0');gradient.addColorStop(1,'#fff8dd');
  for(const [band,opacity] of [[1.7,.2],[1,.65],[.3,1]]){const left=[],right=[];
   trail.forEach((p,i)=>{const a=trail[Math.max(0,i-1)],b=trail[Math.min(trail.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,k=(Math.sin(i/(trail.length-1)*Math.PI)*8+1)*u*band;left.push([p[0]-dy/n*k,p[1]+dx/n*k]);right.push([p[0]+dy/n*k,p[1]-dx/n*k])});
   ctx.globalAlpha=alpha*fade*opacity;ctx.fillStyle=gradient;ctx.beginPath();smooth(left,true);smooth(right.reverse());ctx.closePath();ctx.fill();
  }ctx.restore();
 }
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(pose.x,pose.y-3,w*.32,6*u,0,0,7);ctx.fill();
 // Pole is behind the closed hands and rotates around the authored grip socket.
 ctx.save();ctx.translate(...grip.hand);ctx.rotate(grip.angle);const pole=I.qz_pole;
 if(pole?.naturalWidth){const pw=pose.pole*pole.width/pole.height;ctx.drawImage(pole,-pw/2,-pose.pole*QZ_ATTACK.grip,pw,pose.pole)}
 else{ctx.fillStyle='#b99b59';ctx.fillRect(-3*u,-pose.pole*QZ_ATTACK.grip,6*u,pose.pole)}ctx.restore();
 const body=I[QZ_POSES[pose.art].key];ctx.save();ctx.translate(pose.x,pose.y+pose.bob);ctx.scale(pose.dir,1);
 if(body?.naturalWidth)ctx.drawImage(body,-pose.artH/2,-pose.artH*248/256,pose.artH,pose.artH);else ctx.drawImage(im,-w/2,-h,w,h);
 ctx.restore();ctx.restore();
}
// Keep message skipping and turn progression unchanged; settle the visual once.
function finishQzAttack(now){
 const B=G.B,sp=B&&B.qzMotion;if(!sp)return;
 const impact=(sp.delay||0)+VIMP.slash;
 if(now-sp.at<impact){sp.at=now-impact;for(const f of B.fx)if(f.sp===sp&&f.at>now){f.at=now;if(f.t.hp<=0&&B.en.includes(f.t))f.t.dieAt=now}}
 sp.motionSkipped=true;B.qzMotion=null;B.qzPose=null;
}
