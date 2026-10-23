'use strict';
// 純視覺動作：與 startFx 共用時鐘，不影響指令、傷害或回合。
const BM={attack:560,hurt:560,step:12,lean:.12,castLean:.06,
 // 原圖 72×66：只轉動原有衣袖，保持角色服裝與立繪一致。
 arms:{qz:{up:[[23,26,7,21],[41,26,7,21]],left:[[30,27,7,21]]},
       bl:{up:[[22,28,7,21],[42,28,7,21]],left:[[31,28,7,21]]}}};
function startBattleMotion(sp,now){
 const B=G.B;if(!B)return;
 B.motion=B.motion||[];
 if(G.party.includes(sp.src)&&['slash','claw','sweep','foxfire','rain'].includes(sp.k))
  B.motion.push({p:sp.src,k:sp.k,at:now,impact:VIMP[sp.k],dur:Math.max(BM.attack,VDUR[sp.k])});
 sp.hits.forEach((h,i)=>{if(!h.heal&&G.party.includes(h.t)&&sp.k!=='poison')
  B.motion.push({p:h.t,k:'hurt',at:now+VIMP[sp.k]+(sp.k==='wave'?i*90:0),impact:0,dur:BM.hurt});});
}
function battlePose(p,now){
 const events=(G.B.motion||[]).filter(a=>a.p===p&&now>=a.at&&now<a.at+a.dur),a=events[events.length-1];
 if(!a)return null;
 const t=now-a.at,cast=['sweep','foxfire','rain'].includes(a.k);
 // 命中前踏出／蓄力，命中後收勢；受擊從特效命中瞬間才開始。
 const power=a.k==='hurt'?Math.sin(Math.PI*Math.min(1,t/180)/2)*(1-Math.max(0,(t-180)/(a.dur-180))):
  t<a.impact?Math.sin(t/a.impact*Math.PI/2):Math.cos((t-a.impact)/(a.dur-a.impact)*Math.PI/2);
 return {k:a.k,cast,power,frame:a.k==='hurt'?0:t<a.impact?1:2,
  angle:(a.k==='hurt'?-BM.lean:cast?BM.castLean:BM.lean)*power,
  swing:a.k==='hurt'?0:t<a.impact?-1+2*t/a.impact:1-(t-a.impact)/(a.dur-a.impact)};
}
function drawBattleMotion(p,im,x,y,w,h,pose,port,u){
 const a=pose.power,forward=pose.k==='hurt'?-1:1;
 const dx=port?0:-BM.step*u*a*forward,dy=port&&pose.k!=='hurt'?-BM.step*u*a:0;
 X.save();X.translate(x+dx,y+dy);
 // 收起身形留出前踏與後仰空間，整個動作仍在原本站位區內。
 const scale=1-.24*a;X.scale(scale,scale);X.rotate(pose.angle*(port?1:-1));
 const arms=pose.k==='hurt'?[]:(BM.arms[p.e]||{})[port?'up':'left']||[],s=w/im.width;
 X.save();X.beginPath();X.rect(-w/2,-h,w,h);
 for(const [ax,ay,aw,ah] of arms)X.rect(-w/2+ax*s,-h+ay*s,aw*s,ah*s);
 X.clip('evenodd');X.drawImage(im,-w/2,-h,w,h);X.restore();
 // 側身衣袖底下以同一張圖的衣料補足，不露出挖空的身體。
 if(!port&&arms.length){const [ax,ay,aw,ah]=arms[0];X.drawImage(im,ax-4,ay,4,ah,-w/2+ax*s,-h+ay*s,aw*s,ah*s);}
 arms.forEach(([ax,ay,aw,ah],i)=>{
  const pivot=port?(i===0?aw:0):aw/2;
  X.save();X.translate(-w/2+(ax+pivot)*s,-h+(ay+2)*s);
  const angle=pose.cast?(i===1?-1:1)*2.2*a:(port?(i===1?-1:1):1)*(1.1+pose.swing*.7)*a;
  X.rotate(angle);X.drawImage(im,ax,ay,aw,ah,-pivot*s,-2*s,aw*s,ah*s);
  if(!pose.cast&&i===0){
   X.lineCap='round';X.strokeStyle=p.e==='qz'?'#b7a075':'#f8dafa';X.lineWidth=(p.e==='qz'?1.6:1)*u;
   if(p.e==='qz'){X.beginPath();X.moveTo(-h*.17,ah*s-4*s);X.lineTo(h*.17,ah*s-4*s);X.stroke();}
   else for(let j=0;j<3;j++){X.beginPath();X.moveTo((j-1)*2*u,ah*s-4*s);X.lineTo((j-1)*2*u,ah*s+4*s);X.stroke();}
  }
  X.restore();
 });
 X.restore();
}
