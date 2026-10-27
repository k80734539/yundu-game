import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {serve,launch,newPage} from './lib.mjs';

// 村莊探索：每個查看點、拾取物都走得到；三個委託從接取到交付；拾取物只撿一次；委託道具不進戰鬥選單。
export async function villageExplore(browser,url){
 const {ctx,pg,jsErrors}=await newPage(browser,390,664,{seed:true});
 try{
  await pg.goto(url);await pg.waitForTimeout(1200);
  const q=await pg.evaluate(()=>{
   newGame();G_().dlg=null;
   const m=M_(),step=8,cols=Math.ceil(m.W/step),rows=Math.ceil(m.H/step),ok=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows&&!blocked((i+.5)*step,(j+.5)*step);
   const sx=Math.floor(G_().x/step),sy=Math.floor(G_().y/step),qu=[[sx,sy]],seen=new Set([sy*cols+sx]);
   for(let p=0;p<qu.length;p++){const[i,j]=qu[p];for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const A=i+a,B=j+b,id=B*cols+A;if(ok(A,B)&&!seen.has(id)){seen.add(id);qu.push([A,B])}}}
   // 能互動＝站在某個可達格子上，用 interact() 實際選得到這個點。
   const canUse=it=>qu.some(([i,j])=>{const x=(i+.5)*step,y=(j+.5)*step;if(Math.hypot(it.x-x,it.y-(y-12))+8>=it.r)return false;G_().x=x;G_().y=y;let hit=null;const all=m.inter;for(const d of['up','down','left','right']){G_().dir=d;const v=DV[d],fx=x+v[0]*24,fy=y-12+v[1]*22;let best=null,bd=1e9;for(const o of all){const d1=Math.hypot(o.x-fx,o.y-fy),d2=Math.hypot(o.x-x,o.y-(y-12));const dd=Math.min(d1,d2+8);if(dd<o.r&&dd<bd){bd=dd;best=o}}if(best===it){hit=1;break}}return!!hit});
   const spots=m.inter.filter(it=>it.vxSpot).map(it=>[it.vxSpot,canUse(it)]);
   const picks=m.inter.filter(it=>it.vxPickup).map(it=>[it.vxPickup,canUse(it)]);
   const run=it=>{G_().dlg=null;it.act();const l=G_().dlg?G_().dlg.l:[];G_().dlg=null;return l};
   const npcTalk=n=>run(m.inter.find(it=>Math.abs(it.x-m.npcs.find(p=>p.k==n).x)<1&&Math.abs(it.y-(m.npcs.find(p=>p.k==n).y-14))<1));
   const f=G_().flags;f.chief=1;f.quest=1;f.ferry=1;
   const out={};
   // 林嬸：接取 → 井邊撈到水藻 → 交付
   npcTalk('lin');out.linAccepted=f.vx_q_lin===1;out.linMarkBefore=m.npcs.find(n=>n.k=='lin').mark();
   const well=run(m.inter.find(it=>it.vxSpot=='well'));out.wellQuestLine=well.some(l=>/黑色的水藻/.test(l[1]));out.linMarkAfter=m.npcs.find(n=>n.k=='lin').mark();
   const herbs=G_().inv.清心草||0;npcTalk('lin');out.linDone=f.vx_q_lin===2&&(G_().inv.清心草||0)===herbs+1;
   // 老周：接取 → 撿網墜 → 交付，網墜被收走
   npcTalk('zhou');const fish=G_().inv.魚乾||0;run(m.inter.find(it=>it.vxPickup=='sinker'));out.sinker=G_().inv.網墜===1;
   npcTalk('zhou');out.zhouDone=f.vx_q_zhou===2&&G_().inv.網墜===0&&G_().inv.魚乾===fish+2;
   // 王大叔：先撿竹籃再接委託，接了直接能交
   run(m.inter.find(it=>it.vxPickup=='basket'));npcTalk('wang');out.wangAccepted=f.vx_q_wang===1;npcTalk('wang');out.wangDone=f.vx_q_wang===2&&G_().inv.竹籃===0;
   // 拾取物只撿一次，重建地圖後也不再出現
   run(m.inter.find(it=>it.vxPickup=='fish'));const before=G_().inv.魚乾;loadMap('village',G_().x,G_().y,'down');G_().dlg=null;
   out.noRespawn=!M_().inter.some(it=>it.vxPickup=='fish')&&!M_().pickups.some(p=>p.id=='fish')&&G_().inv.魚乾===before;
   // 委託道具不進戰鬥道具選單
   G_().inv.網墜=1;out.questItemHidden=!Object.keys(G_().inv).filter(i=>G_().inv[i]>0&&ITEMS[i]).includes('網墜');G_().inv.網墜=0;
   // 三段時間的查看台詞都存在
   out.phases=[1,2,3].map(ph=>{G_().flags.dawn=ph==3?1:0;G_().flags.quest=ph>=2?1:0;const l=run(M_().inter.find(it=>it.vxSpot=='tree'));return l.length>0});
   return{spots,picks,...out};
  });
  assert(q.spots.length>=8&&q.spots.every(([,ok])=>ok),`unreachable look spots: ${JSON.stringify(q.spots)}`);
  assert(q.picks.length>=4&&q.picks.every(([,ok])=>ok),`unreachable pickups: ${JSON.stringify(q.picks)}`);
  assert(q.linAccepted&&!q.linMarkBefore&&q.wellQuestLine&&q.linMarkAfter&&q.linDone,`lin quest flow: ${JSON.stringify(q)}`);
  assert(q.sinker&&q.zhouDone,`zhou quest flow: ${JSON.stringify(q)}`);
  assert(q.wangAccepted&&q.wangDone,`wang quest flow: ${JSON.stringify(q)}`);
  assert(q.noRespawn,'pickups must not respawn after reload');
  assert(q.questItemHidden,'quest items must stay out of the battle item menu');
  assert(q.phases.every(Boolean),'look spots need lines for every phase');
  assert.deepEqual(await jsErrors(),[]);
  console.log(`[village-explore] ${q.spots.length} look spots, ${q.picks.length} pickups reachable, three side quests, no respawn PASS`);
 }finally{await ctx.close()}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const s=await serve(),b=await launch();try{await villageExplore(b,s.url)}finally{await b.close();s.close()}}
