'use strict';
// Display-only prototype. Keep timing/pose rendering separate so key-pose art can replace it.
const QZ_ATTACK={duration:650,windupEnd:90,dashEnd:230,swingEnd:390,recoverEnd:450,
 lean:.13,swingLean:.2,step:4,sideGap:.26,staffLength:82};
const motionEase=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
function qzAttackPose(now,origin,target,w,h,stage){
 const sp=G.B.qzMotion;if(!sp||sp.motionSkipped)return null;
 const t=Math.max(0,now-sp.at),c=QZ_ATTACK;
 if(t>=c.duration){G.B.qzMotion=null;return null}
 // Approach the selected enemy's near side, keeping the full prototype above the panel.
 const dir=origin[0]>=target[0]?1:-1;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const end=[clamp(target[0]+dir*(target[2]*c.sideGap+w*.38),stage.left+w*.55,stage.right-w*.55),
  clamp(target[1]+target[3]*.3,stage.top+h,stage.bottom-8)];
 let p=0,phase='windup',angle=-c.lean,staff=-1.9;
 if(t>=c.windupEnd&&t<c.dashEnd){phase='dash';p=motionEase((t-c.windupEnd)/(c.dashEnd-c.windupEnd));angle=c.lean;staff=-1.6}
 else if(t>=c.dashEnd&&t<c.swingEnd){phase='swing';p=1;const s=motionEase((t-c.dashEnd)/(c.swingEnd-c.dashEnd));angle=c.swingLean*Math.sin(s*Math.PI);staff=-1.6+s*2.7}
 else if(t>=c.swingEnd&&t<c.recoverEnd){phase='recover';p=1;angle=0;staff=1.1}
 else if(t>=c.recoverEnd){phase='return';p=1-motionEase((t-c.recoverEnd)/(c.duration-c.recoverEnd));angle=-c.lean;staff=1.1*(1-p)}
 const x=p===1?end[0]:p===0?origin[0]:origin[0]+(end[0]-origin[0])*p,y=p===1?end[1]:p===0?origin[1]:origin[1]+(end[1]-origin[1])*p;
 return {x,y,origin:origin.slice(),end,target:sp.tg[0],phase,angle:angle*dir,staff,dir,
  frame:phase==='dash'||phase==='return'?1+Math.floor(t/60)%2:0,
  bob:phase==='dash'||phase==='return'?-Math.abs(Math.sin(t/28))*c.step:0};
}
function drawQzAttack(im,pose,w,h,u,alpha,stage){
 X.save();X.beginPath();X.rect(stage.left,stage.top,stage.right-stage.left,stage.bottom-stage.top);X.clip();
 // Cut labels/HP strips out of the moving layer; their layout and hit targets stay unchanged.
 for(const r of stage.labels){X.beginPath();X.rect(stage.left,stage.top,stage.right-stage.left,stage.bottom-stage.top);X.rect(r.x,r.y,r.w,r.h);X.clip('evenodd')}
 X.globalAlpha=alpha;X.fillStyle='rgba(0,0,0,.35)';X.beginPath();X.ellipse(pose.x,pose.y-3,w*.28,6*u,0,0,7);X.fill();
 X.translate(pose.x,pose.y+pose.bob);X.rotate(pose.angle);X.drawImage(im,-w/2,-h,w,h);
 // Existing sprites are the prototype body; the bamboo pole has its own pivot.
 X.translate(-pose.dir*w*.12,-h*.57);X.rotate(pose.dir*pose.staff);
 X.strokeStyle='#58432b';X.lineWidth=5*u;X.lineCap='round';X.beginPath();X.moveTo(0,-QZ_ATTACK.staffLength*u*.32);X.lineTo(0,QZ_ATTACK.staffLength*u*.68);X.stroke();
 X.strokeStyle='#cbb479';X.lineWidth=2.5*u;X.stroke();
 X.strokeStyle='#806d43';X.lineWidth=1.5*u;for(let k=-1;k<=2;k++){const y=k*17*u;X.beginPath();X.moveTo(-2*u,y);X.lineTo(2*u,y);X.stroke()}X.restore();
}
// A message skip keeps the old input/turn rules. Settle a pending visual impact once,
// return the actor immediately, and let the existing VFX renderer draw the slash.
function finishQzAttack(now){
 const B=G.B,sp=B&&B.qzMotion;if(!sp)return;
 const impact=(sp.delay||0)+VIMP.slash;
 if(now-sp.at<impact){sp.at=now-impact;for(const f of B.fx)if(f.sp===sp&&f.at>now){f.at=now;if(f.t.hp<=0&&B.en.includes(f.t))f.t.dieAt=now}}
 sp.motionSkipped=true;B.qzMotion=null;B.qzPose=null;
}
