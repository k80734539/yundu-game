'use strict';
// 存檔系統：localStorage（只存在本機）。自動存檔欄 + 3 個手動欄位；DOM 選單（觸控/滑鼠/鍵盤皆可）
const SAVE_VER=1,SAVE_KEY='yundu_save_',SLOTS=['auto','1','2','3'];
const SLOT_NAME={auto:'自動存檔','1':'存檔一','2':'存檔二','3':'存檔三'};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
// 驗證/遷移：壞掉或格式不符回傳 null（不會讓遊戲當掉）
function migrateSave(d){if(!d||typeof d!='object')return null;if(d.ver==null)return null;if(d.ver>SAVE_VER)return null;
 // 未來改格式時在這裡逐版升級：if(d.ver==1){...;d.ver=2}
 if(!Array.isArray(d.party)||!d.party.length||!d.party.every(p=>p&&typeof p.n=='string'&&typeof p.hp=='number'))return null;
 if(!d.boat&&(!NAMES[d.map]||!isFinite(d.x)||!isFinite(d.y)))return null;
 d.inv=Object.assign({魚乾:0,清心草:0},d.inv||{});d.flags=d.flags||{};d.opened=d.opened||{};
 // v48：技能仍存於角色資料；舊存檔若已完成河伯戰，補上章末領悟且避免重複。
 if(d.flags.boss){const qz=d.party.find(p=>p.e=='qz'||p.n=='陳青舟');if(qz){qz.skills=Array.isArray(qz.skills)?qz.skills:[];learnSkill(qz,'渡水一擊')}}
 d.dir=DV[d.dir]?d.dir:'down';return d}
function readSlot(s){const raw=lsGet(SAVE_KEY+s);if(raw==null)return null;let d=null;try{d=migrateSave(JSON.parse(raw))}catch(e){d=null}return d||{bad:1}}
function snapshot(o){o=o||{};const boat=!!o.boat;return{ver:SAVE_VER,t:Date.now(),boat:boat?1:0,map:boat?'river':(o.map||G.map),x:o.x!=null?o.x:G.x,y:o.y!=null?o.y:G.y,dir:o.dir||G.dir,
 party:JSON.parse(JSON.stringify(G.party)),inv:Object.assign({},G.inv),flags:Object.assign({},G.flags),opened:Object.assign({},G.opened)}}
function writeSlot(s,o){return lsSet(SAVE_KEY+s,JSON.stringify(snapshot(o)))}
function autoSave(o){if(G.party)writeSlot('auto',o)}
function allSaves(){return SLOTS.map(s=>({s,d:readSlot(s)}))}
function latestSave(){let b=null;for(const e of allSaves())if(e.d&&!e.d.bad&&(!b||e.d.t>b.d.t))b=e;return b}
function hasSave(){return !!latestSave()}
// 手動存檔條件：在地圖自由行動中（非戰鬥、非對話、非演出）
function canSave(){return ready&&G.mode=='map'&&!G.dlg&&!G.B&&!G.cut&&!G.lock}
function loadSave(d){G={mode:'map',party:d.party,inv:d.inv,flags:d.flags,opened:d.opened,dlg:null,B:null};
 if(d.boat){startNight();return}loadMap(d.map,d.x,d.y,d.dir);say([['系統','讀取存檔完成：'+(NAMES[d.map]||'')+'。']])}
const fmtT=t=>{try{return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(t))}catch(e){return new Date(t).toLocaleString()}};
function slotDesc(d){if(!d)return'（空）';if(d.bad)return'（存檔損壞，無法讀取）';return(d.boat?'夜渡・渡雲河':NAMES[d.map])+'　陳青舟 Lv'+(d.party[0].lv||1)+'　'+fmtT(d.t)}
// ---------- DOM 選單 ----------
const SV={p:null,sel:0,items:[],btn:null,el:null};
(function(){const st=document.createElement('style');st.textContent=
 '#svBtn{position:fixed;z-index:60;top:calc(54px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right));display:none;font:15px "PingFang TC","Noto Sans TC",sans-serif;color:#f3dfa0;background:rgba(12,16,34,.6);border:1.5px solid rgba(201,178,107,.8);border-radius:8px;padding:8px 14px;min-height:40px;touch-action:manipulation}'+
 '#svPanel{position:fixed;z-index:61;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35);padding:calc(10px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left));box-sizing:border-box}'+
 '#svPanel.title{background:none;align-items:flex-end;padding-bottom:calc(16vh + env(safe-area-inset-bottom))}.touch #svPanel.title{padding-bottom:calc(205px + env(safe-area-inset-bottom))}'+
 '#svBox{width:min(92vw,420px);max-height:100%;overflow:auto;background:rgba(12,16,34,.92);border:1.5px solid #c9b26b;border-radius:8px;padding:12px;box-sizing:border-box;font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;color:#fff}'+
 '#svBox h3{margin:2px 4px 10px;font-size:17px;font-weight:normal;color:#f3dfa0}#svBox p{margin:4px 4px 10px;font-size:14px;color:#cfe8ff;line-height:1.5}'+
 '.svI{display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(201,178,107,.45);border-radius:7px;color:#fff;font:16px "PingFang TC","Noto Sans TC",sans-serif;touch-action:manipulation}'+
 '.svI small{display:block;margin-top:3px;font-size:12.5px;color:#cde}.svI.on{border-color:#f3dfa0;background:rgba(201,178,107,.22)}.svI:disabled{opacity:.45}'+
 '@media (max-height:520px){.touch #svPanel.title,#svPanel.title{padding-bottom:calc(8px + env(safe-area-inset-bottom))}#svPanel.title #svBox{width:min(60vw,420px)}#svPanel.title .svL{display:block}#svBox{width:min(94vw,640px);padding:8px 10px}#svBox h3{margin:0 4px 4px}#svBox p{margin:2px 4px 4px}.svL{display:grid;grid-template-columns:1fr 1fr;column-gap:8px}.svI{margin:4px 0;padding:6px 10px}}';
 document.head.appendChild(st);
 const b=document.createElement('button');b.id='svBtn';b.textContent='選單';b.onclick=e=>{e.preventDefault();soundUi('ok');openMenu()};document.body.appendChild(b);
 const p=document.createElement('div');p.id='svPanel';p.innerHTML='<div id="svBox"></div>';p.addEventListener('click',e=>{if(e.target===p&&SV.p!='title'){soundUi('cancel');closePanel()}});document.body.appendChild(p);
 for(const el of[b,p]){el.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});el.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true})}
 SV.btn=b;SV.el=p})();
function showPanel(kind,title,msg,items,sel){clearK();SV.p=kind;SV.items=items;SV.sel=sel||0;while(SV.items[SV.sel]&&SV.items[SV.sel].off)SV.sel++;
 const bx=document.getElementById('svBox');bx.innerHTML=(title?'<h3>'+title+'</h3>':'')+(msg?'<p>'+msg+'</p>':'')+'<div class="svL"></div>';const ls=bx.lastChild;
 items.forEach((it,i)=>{const e=document.createElement('button');e.className='svI';e.dataset.i=i;e.disabled=!!it.off;e.innerHTML=it.l+(it.sub?'<small>'+it.sub+'</small>':'');e.onclick=ev=>{ev.preventDefault();if(!it.off){soundUi(['返回','關閉','取消'].includes(it.l)?'cancel':'ok');it.fn()}};ls.appendChild(e)});
 SV.el.className=kind;SV.el.setAttribute('role','dialog');SV.el.setAttribute('aria-modal','true');SV.el.setAttribute('aria-label',title||'遊戲選單');SV.el.style.display='flex';hl();const selected=bx.querySelectorAll('.svI')[SV.sel];if(selected)selected.focus({preventScroll:true})}
function hl(){document.querySelectorAll('#svBox .svI').forEach((e,i)=>e.classList.toggle('on',i==SV.sel))}
function closePanel(){clearK();SV.p=null;SV.el.style.display='none';if(canSave())SV.btn.focus({preventScroll:true})}
function openMenu(){if(!canSave())return;showPanel('menu','旅途手札','第一章 · 夜渡　／　'+NAMES[G.map],[{l:'隊伍',sub:'同行之人的狀態',fn:journeyParty},{l:'行囊',sub:'查看隨身補給',fn:journeyBag},{l:'任務',sub:'此行的線索與方向',fn:journeyQuest},{l:'存讀檔',sub:'記錄與重拾旅程',fn:journeySaves},{l:'設定',sub:'音樂與音效',fn:journeySettings},{l:'返回旅途',fn:closePanel}]);journeyDecorate(journeyCards())}
function saveMenu(){showPanel('save','存檔','選擇要存入的欄位：',['1','2','3'].map(s=>({l:SLOT_NAME[s],sub:slotDesc(readSlot(s)),fn:()=>doSave(s)})).concat([{l:'返回',fn:openMenu}]))}
function doSave(s){if(!canSave())return closePanel();const ok=writeSlot(s);closePanel();say([['系統',ok?'已存入「'+SLOT_NAME[s]+'」。':'存檔失敗：瀏覽器不允許儲存（可能是私密瀏覽模式）。']])}
function loadMenu(from){const back=from=='title'?titleMenu:openMenu;showPanel('load','讀檔','選擇要讀取的存檔：',allSaves().map(({s,d})=>({l:SLOT_NAME[s],sub:slotDesc(d),off:!d||d.bad,fn:()=>{closePanel();loadSave(readSlot(s))}})).concat([{l:'返回',fn:back}]))}
function titleMenu(){const L=latestSave();if(!L){closePanel();return}showPanel('title','','',[{l:'繼續遊戲',sub:slotDesc(L.d),fn:()=>{closePanel();loadSave(readSlot(L.s))}},{l:'讀取存檔',fn:()=>loadMenu('title')},{l:'新遊戲',fn:confirmNew}])}
function confirmNew(){showPanel('confirm','開始新遊戲？','手動存檔會保留，但「自動存檔」會被新進度覆蓋。',[{l:'確定，開始新遊戲',fn:()=>{closePanel();newGame()}},{l:'取消',fn:titleMenu}],1)}
// 鍵盤／搖桿／A B 鈕操作面板（由 press() 轉來）
function svKey(k){const n=SV.items.length;if(!n)return;
 if(k=='up'||k=='down'){let i=SV.sel;for(let c=0;c<n;c++){i=(i+(k=='up'?n-1:1))%n;if(!SV.items[i].off)break}SV.sel=i;hl();const e=document.querySelectorAll('#svBox .svI')[i];if(e){e.focus({preventScroll:true});e.scrollIntoView({block:'nearest'})}}
 else if(k=='ok'){const it=SV.items[SV.sel];it&&!it.off&&it.fn()}
 else if(k=='cancel'||k=='menu'){if(SV.p=='menu')closePanel();else if(SV.p=='save'||SV.p=='load')SV.items[n-1].fn();else if(['party','bag','quest','records','settings'].includes(SV.p))openMenu();else if(SV.p=='confirm')titleMenu();else if(SV.p=='title'){closePanel();G.cred=1}}
 else if(k=='cred'&&SV.p=='title'){closePanel();G.cred=1}}
// 每格同步：選單按鈕顯示、標題選單
function svSync(){explorationSync();const tt=ready&&G.mode=='title'&&!G.cred;
 if(tt&&!SV.p&&hasSave())titleMenu();if(!tt&&(SV.p=='title'||SV.p=='confirm'||(SV.p=='load'&&G.mode=='title')))closePanel();
 if(SV.p&&!['title','confirm','load'].includes(SV.p)&&!canSave())closePanel();if(SV.p=='load'&&G.mode!='title'&&!canSave())closePanel();
 const sb=canSave()&&!SV.p;if(SV.btn.style.display!=(sb?'block':'none'))SV.btn.style.display=sb?'block':'none'}

SV.el.addEventListener('focusin',e=>{const i=e.target.dataset.i;if(i!=null){SV.sel=+i;hl()}});
SV.el.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...document.querySelectorAll('#svBox .svI:not(:disabled)')];const i=items.indexOf(document.activeElement),next=(i+(e.shiftKey?-1:1)+items.length)%items.length;if(items.length){e.preventDefault();items[next].focus()}});
