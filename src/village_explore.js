'use strict';
// 村莊探索：可查看的地點、藏起來的拾取物、村民小委託。
// 座標都是村莊世界像素（= village_map_v37.webp 底圖像素）；對白在 script.js 的 S.vx*。
// 拾取物的圖由 VX_PICKUP_ART 指定，圖還沒載入時改畫閃光（fallback），不會沒有畫面。
const VX_SPOTS=[
 {id:'well',x:418,y:398,r:40},     // 井邊
 {id:'stall',x:955,y:404,r:40},    // 市集攤位
 {id:'post',x:628,y:652,r:30},     // 渡口繫船柱
 {id:'hallLamp',x:762,y:240,r:34}, // 村長廳前石燈
 {id:'tree',x:560,y:404,r:40},     // 廣場大樹
 {id:'blossom',x:1262,y:368,r:36}, // 東側桃樹
 {id:'lane',x:524,y:96,r:34},      // 北邊小路口
 {id:'westYard',x:214,y:312,r:36}  // 西側院落
];
// item：放進 G.inv 的名稱；quest：屬於哪個委託（委託道具，不進戰鬥選單）。
const VX_PICKUPS=[
 {id:'sinker',x:520,y:58,item:'網墜',n:1,quest:'zhou'},
 {id:'basket',x:872,y:626,item:'竹籃',n:1,quest:'wang'},
 {id:'fish',x:204,y:300,item:'魚乾',n:1},
 {id:'herb',x:1070,y:500,item:'清心草',n:1}
];
// 拾取物圖（Codex 生成後放 assets/img/ 並登記在 assets.js）；高度以世界像素計。
const VX_PICKUP_ART={網墜:{k:'vx_sinker',h:18},竹籃:{k:'vx_basket',h:22},魚乾:{k:'vx_fish',h:18},清心草:{k:'vx_herb',h:20}};
// 委託：state 0 未接、1 已接、2 完成。need：完成條件；reward：[物品,數量]。
const VX_QUESTS={
 lin:{name:'井水發苦',need:()=>!!G.flags.vx_wellAlgae,reward:['清心草',1]},
 zhou:{name:'找回網墜',need:()=>(G.inv.網墜||0)>0,take:'網墜',reward:['魚乾',2]},
 wang:{name:'河邊的竹籃',need:()=>(G.inv.竹籃||0)>0,take:'竹籃',reward:['魚乾',1]}
};
const vxState=id=>G.flags['vx_q_'+id]||0;
const vxKey=p=>'village:'+p.id;

function addVillageExplore(){
 const P=a=>Array.isArray(a)&&a.length==3&&Array.isArray(a[0])&&Array.isArray(a[0][0])?a[phase()-1]:a;
 for(const s of VX_SPOTS)M.inter.push({x:s.x,y:s.y,r:s.r,vxSpot:s.id,act:()=>vxLook(s,P)});
 M.pickups=VX_PICKUPS.filter(p=>!G.opened[vxKey(p)]);
 for(const p of M.pickups)M.inter.push({x:p.x,y:p.y,r:30,vxPickup:p.id,act:()=>vxPick(p)});
}
function vxLook(s,P){const f=G.flags;f['vx_look_'+s.id]=1;
 if(s.id=='well'&&vxState('lin')==1&&!f.vx_wellAlgae){f.vx_wellAlgae=1;return say(S.vxWellQuest)}
 say(P(S['vx_'+s.id]))}
function vxPick(p){const k=vxKey(p);if(G.opened[k])return;G.opened[k]=1;G.inv[p.item]=(G.inv[p.item]||0)+p.n;
 M.pickups=M.pickups.filter(q=>q!==p);M.inter=M.inter.filter(it=>it.vxPickup!==p.id);
 const l=[['系統','撿到了「'+p.item+'」'+(p.n>1?'×'+p.n:'')+'！']];
 if(p.quest&&vxState(p.quest)==0)l.push(...S['vxFind_'+p.id]);say(l)}
// 村民對話：有委託要處理就接手，否則照原本的台詞。回傳 true 表示已處理。
function vxTalk(id,lines,scene){const q=VX_QUESTS[id],st=vxState(id);
 if(G.flags.cure||!q)return say(lines,null,scene);
 if(st==0){G.flags['vx_q_'+id]=1;return say(lines.concat(S['vxAsk_'+id]),null,scene)}
 if(st==1){if(!q.need())return say(S['vxWait_'+id],null,scene);
  if(q.take)G.inv[q.take]=Math.max(0,(G.inv[q.take]||0)-1);
  const[it,n]=q.reward;G.inv[it]=(G.inv[it]||0)+n;G.flags['vx_q_'+id]=2;
  return say(S['vxDone_'+id].concat([['系統','獲得「'+it+'」×'+n+'！']]),null,scene)}
 say(lines,null,scene)}
// 可以交付時頭上顯示「！」。
const vxMark=id=>()=>!G.flags.cure&&vxState(id)==1&&VX_QUESTS[id].need();
// 旅途手札「行程」頁的村中委託清單。
function vxJourneyHtml(){const l=vxQuestList();return l.length?'<ol class="journey-progress" aria-label="村中小事">'+l.map(([n,d])=>'<li class="'+(d?'done':'current')+'"><span>'+(d?'✓':'◇')+'</span>村中小事：'+n+'<small>'+(d?'已完成':'進行中')+'</small></li>').join('')+'</ol>':''}
function vxQuestList(){return Object.entries(VX_QUESTS).filter(([id])=>vxState(id)>0).map(([id,q])=>[q.name,vxState(id)==2])}
function drawVillagePickup(p,t){const a=VX_PICKUP_ART[p.item],im=a&&I[a.k];
 if(im&&im.naturalWidth){const h=a.h,w=im.naturalWidth/im.naturalHeight*h,b=Math.sin(t*2+p.x)*1.5;
  X.fillStyle='rgba(0,0,0,.25)';X.beginPath();X.ellipse(p.x,p.y,w*.45,3,0,0,7);X.fill();X.drawImage(im,p.x-w/2,p.y-h-2+b,w,h)}
 // 閃光：沒有圖時是主體；有圖時縮小、畫在物件右上角當提示。
 const art=im&&im.naturalWidth,s=.6+.4*Math.sin(t*4+p.x),k=art?.55:1,gx=art?p.x+a.h*.35:p.x,gy=art?p.y-a.h-2:p.y-10;
 X.save();X.globalAlpha=.55+.4*s;X.fillStyle='#fff3c4';X.beginPath();
 for(let i=0;i<8;i++){const r=(i%2?2:6*s+2)*k,ang=i*Math.PI/4;X.lineTo(gx+Math.cos(ang)*r,gy+Math.sin(ang)*r)}X.closePath();X.fill();X.restore()}
