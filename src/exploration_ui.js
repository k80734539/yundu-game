'use strict';
// 探索 HUD 與旅途手札：沿用角色／旗標／存檔資料，不新增存檔欄位。
function journeyGoal(){const f=G.flags||{};
 if(G.map==='village')return f.cure?'在渡口與雲纖會面':f.dawn?'把河珠交給阿婆':!f.chief||!f.quest?'和村長、阿婆談話':f.flood&&!f.ferryFight?'處理渡口的小水妖':'到渡口搭船';
 if(G.map==='reeds')return !f.tal?'調查妖氣來源':!f.reedSolved?'與白苓合力清除妖根':!f.camp?'到南側營火歇息':'前往出口牌坊';
 return !f.steleSeen?'讀取廟中碑文':!f.templeSeal?(f.templeLamps!==templeLanternMask()?'點亮三座燈籠（'+CFG.templeLanterns.filter((_,i)=>(f.templeLamps||0)&(1<<i)).length+'/'+CFG.templeLanterns.length+'）':'在神龕前削弱封印'):'與河伯交談'}
function journeyHint(){const f=G.flags||{};
 if(G.map==='village')return f.cure?'沿村莊主路回到南側渡口。':f.dawn?'阿婆在村莊東側住宅旁等候。':!f.chief||!f.quest?'到北側村長廳前與村長交談，再到東側住宅旁尋找阿婆。':f.flood&&!f.ferryFight?'退水的河邊有小水妖作亂，先擊退或逃離，再登船。':'沿廣場向南，走到木棧橋登船。';
 if(G.map==='reeds')return !f.tal?'沿蘆葦間的道路探索，留意路中的異樣符紙。':!f.reedSolved?'在倒伏妖根前調查，與白苓合作打通橋上的道路。':!f.camp?'過橋後前往南側營火，稍作休息。':'從營火向東探索，再沿道路向南尋找牌坊。';
 return !f.steleSeen?'到庭院西側尋找石碑。':!f.templeSeal?(f.templeLamps!==templeLanternMask()?'沿庭院三處石燈逐一靠近並互動，點亮所有燈籠。':'回到庭院中央，在神龕前調查封印。'):'沿中央石階向北，與河伯交談。'}
function nearbyInteraction(){if(!M||G.mode!=='map'||G.dlg)return null;const v=DV[G.dir],fx=G.x+v[0]*24,fy=G.y-12+v[1]*22;let best=null,bd=Infinity;
 for(const it of M.inter){const d=Math.min(Math.hypot(it.x-fx,it.y-fy),Math.hypot(it.x-G.x,it.y-G.y+12)+8);if(d<it.r&&d<bd){bd=d;best=it}}return best}
function journeyAction(){if(G.dlg)return'繼續';if(SV.p)return'確定';if(G.mode==='title')return G.cred?'返回':'啟程';if(G.mode==='over')return'重來';if(G.mode==='end')return'標題';const it=nearbyInteraction();return !it?'互動':(it.id?.startsWith('talk-')||M.npcs.some(n=>n.talk&&it.x===n.x&&Math.abs(it.y-(n.y-14))<.01))?'交談':(it.id==='boarding'||it.act===boardBoat)?'登船':'調查'}
const EXPLORE_UI={el:null,last:''};
(function(){const link=document.createElement('link');link.rel='stylesheet';link.href='src/exploration_ui.css?v='+ASSET_V;document.head.appendChild(link);
 const el=document.createElement('aside');el.id='exploreHud';el.hidden=true;el.innerHTML='<div class="place-plaque"><span class="place-mark" aria-hidden="true">◇</span><div><small>第一章 · 夜渡</small><strong id="placeName"></strong></div></div><button id="questBtn" type="button"><span class="quest-dot" aria-hidden="true"></span><span id="questSummary"></span><span class="quest-arrow" aria-hidden="true">›</span></button>';
 document.body.appendChild(el);EXPLORE_UI.el=el;document.getElementById('questBtn').onclick=()=>{soundUi('ok');journeyQuest()};
 for(const event of ['touchstart','touchmove'])el.addEventListener(event,e=>e.stopPropagation(),{passive:true});
 for(const button of [document.getElementById('questBtn'),SV.btn])button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();button.click()}});
})();
function explorationSync(){const visible=canSave()&&!SV.p;EXPLORE_UI.el.hidden=!visible;if(!visible)return;const signature=G.map+'|'+journeyGoal();if(EXPLORE_UI.last!==signature){EXPLORE_UI.last=signature;document.getElementById('placeName').textContent=NAMES[G.map];document.getElementById('questSummary').textContent=journeyGoal()}}
function journeyCards(){return '<div class="journey-party">'+G.party.map(p=>{const src=ASSETS['pt_'+p.e];return'<article class="journey-hero">'+(src?'<img alt="" src="'+src+'?v='+ASSET_V+'">':'')+'<div><small>同行者 · Lv '+p.lv+'</small><h4>'+p.n+'</h4><label>氣血 <span>'+p.hp+' / '+p.mhp+'</span></label><div class="journey-bar hp"><i style="width:'+Math.max(0,Math.min(100,p.hp/p.mhp*100))+'%"></i></div><label>靈力 <span>'+p.mp+' / '+p.mmp+'</span></label><div class="journey-bar mp"><i style="width:'+Math.max(0,Math.min(100,p.mp/Math.max(1,p.mmp)*100))+'%"></i></div>'+(p.st?'<small class="journey-status">'+p.st+'</small>':'')+'</div></article>'}).join('')+'</div>'}
function journeyBack(){return{l:'返回',fn:openMenu}}
function journeyDecorate(html){document.querySelector('#svBox .svL').insertAdjacentHTML('beforebegin',html)}
function journeyParty(){showPanel('party','同行之人','此刻的隊伍狀態',[journeyBack()]);journeyDecorate(journeyCards()+'<div class="journey-details">'+G.party.map(p=>'<p><strong>'+p.n+'</strong>　攻擊 '+p.atk+' · 防禦 '+p.def+' · 靈術 '+p.mag+'<br><span>招式：'+(p.skills.join('、')||'尚未習得')+'</span></p>').join('')+'</div>')}
function journeyBag(){showPanel('bag','隨身行囊','旅途中收集的補給與道具',[journeyBack()]);journeyDecorate('<div class="journey-inventory">'+Object.keys(ITEMS).map(k=>'<article><span class="inventory-seal" aria-hidden="true">'+(k==='魚乾'?'食':k==='清心草'?'藥':'物')+'</span><div><strong>'+k+'</strong><p>'+ITEMS[k].d+'</p><small>'+(ITEMS[k].tgt?'戰鬥時可由「物品」使用':G.inv[k]?'已取得，效果已記錄':'尚未取得')+'</small></div><b>× '+(G.inv[k]||0)+'</b></article>').join('')+'</div>')}
function journeyQuest(){if(!canSave())return;showPanel('quest','夜渡 · 行程','第一章',[journeyBack()]);const f=G.flags;const stages=[['村中委託',!!(f.chief&&f.quest)],['夜河異變',!!f.flood],['蘆葦妖根',!!f.reedSolved],['河神廟',!!f.boss],['回村交付',!!f.cure]];journeyDecorate('<article class="journey-current"><small>當前目標 · '+NAMES[G.map]+'</small><h4>'+journeyGoal()+'</h4><p>'+journeyHint()+'</p></article><ol class="journey-progress">'+stages.filter((s,i)=>s[1]||i===stages.findIndex(t=>!t[1])).map(([label,done])=>'<li class="'+(done?'done':'current')+'"><span>'+(done?'✓':'◇')+'</span>'+label+'<small>'+(done?'已完成':'進行中')+'</small></li>').join('')+'</ol>'+vxJourneyHtml())}
function journeySettings(sel=0){showPanel('settings','旅途設定','聲音偏好會自動保存在此裝置',[{l:'音樂：'+(MUSIC.muted?'關':'開'),sub:'背景旋律',fn:()=>{musicToggle();journeySettings(0)}},{l:'音效：'+(SFX.muted?'關':'開'),sub:'環境、操作與戰鬥聲音',fn:()=>{soundToggle();journeySettings(1)}},journeyBack()],sel)}
function journeySaves(){showPanel('records','記錄旅程','存檔只保存在目前的瀏覽器',[{l:'存檔',sub:'記錄目前進度',fn:saveMenu},{l:'讀檔',sub:'讀取先前的進度',fn:()=>loadMenu('menu')},journeyBack()])}
