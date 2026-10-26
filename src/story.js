'use strict';
// 劇情/對話腳本與事件旗標
// ---------- story ----------
function newGame(){G={mode:'map',party:[mk('陳青舟','qz',60,12,10,3,4,['橫掃'])],inv:{魚乾:1,清心草:0},flags:{},opened:{},dlg:null,B:null};
 loadMap('village',5*T,7.6*T,'down');say(S.open.concat(S.openHint()))}
function saveCP(o){G.cp=JSON.stringify({o,party:G.party,inv:G.inv,flags:G.flags,opened:G.opened});autoSave(o)}
function heal(){G.party.forEach(p=>{p.hp=p.mhp;p.mp=p.mmp;p.st=''})}
function retry(){const s=JSON.parse(G.cp);Object.assign(G,{party:s.party,inv:s.inv,flags:s.flags,opened:s.opened,B:null,dlg:null});
 if(s.o.boat){startNight()}else{loadMap(s.o.map,s.o.x,s.o.y,s.o.dir);heal();say(S.retry)}}
function say(lines,cb,scene){G.dlg={l:lines,i:0,cb};G.scene=null;if(scene)startScene(scene,G.dlg)}
// 劇情階段：1=出發前 2=接下委託後 3=黎明歸來
function phase(){const f=G.flags;return f.dawn?3:f.quest?2:1}
function openChest(k){if(G.opened[k])return say([['','寶箱是空的。']]);G.opened[k]=1;const[it,c]=CHESTS[k];G.inv[it]+=c;
 let l=[['系統','打開寶箱，獲得「'+it+'」×'+c+'！']];if(it=='魚乾'&&!G.flags.fish&&G.party.length>1){G.flags.fish=1;l=l.concat(S.fish)}say(l)}
function talisman(){if(G.flags.tal)return;G.flags.tal=1;say(S.tal.concat(G.flags.camp?[]:S.talHint))}
function campfire(){const f=G.flags;if(!f.tal)return say([['白苓','這裡生過火……是一片空地。不過，先找找那股妖氣的源頭吧。']]);
 if(!f.reedSolved)return say(S.campNoTrial);
 heal();saveCP({map:'reeds',x:G.x,y:G.y+20,dir:'down'});if(f.camp)return say(S.campR,null,'camp');f.camp=1;say(S.camp.concat(S.campSys),null,'camp')}
function loreStone(){if(G.flags.lore)return say(S.loreR);G.flags.lore=1;say(S.lore)}
function exitReeds(){const f=G.flags;if(!f.tal){G.y-=14;return say(S.exitNo)}if(!f.camp){G.y-=14;return say(S.exitNoCamp)}
 if(!f.reedSolved){G.y-=14;return say(S.exitNoTrial)}
 loadMap('temple',12.5*T2,13.8*T2,'up');heal();saveCP({map:'temple',x:12.5*T2,y:13.8*T2,dir:'up'});say(S.temple.concat(S.templeHint))}
function plaque(){if(G.flags.plaque)return say(S.plaqueR);G.flags.plaque=1;say(S.plaque)}
function stele(){G.flags.steleSeen=1;say(S.stele)}
function templeSeal(){const f=G.flags;if(!f.steleSeen)return say(S.sealNoClue);if(f.templeSeal)return say(S.sealRepeat);f.templeSeal=1;say(S.seal)}
function reedTrial(){const f=G.flags;if(!f.tal)return say(S.trialNoTalisman);if(G.party.length<2)return say(S.trialNoPartner);
 if(!f.reedSeen){f.reedSeen=1;say(S.trialLook);return}
 if(!f.reedPole){f.reedPole=1;say(S.trialPole);return}
 if(!f.reedSolved){f.reedSolved=1;say(S.trialFox);return}
 say(S.trialRepeat)}
function boardBoat(){const f=G.flags;if(f.dawn)return;if(!f.chief||!f.quest){G.y=Math.min(G.y,19.5*T);return say(S.boardNo)}
 if(!f.flood){f.flood=1;return say(S.flood,()=>boardBoat())}
 say(S.board,startNight)}
function startNight(){G.mode='boat';G.boatT=performance.now();G.party=G.party.filter(p=>p.n=='陳青舟');saveCP({boat:1});
 say(S.night,()=>startBattle(['小水妖','小水妖'],{noEsc:1,bg:'bg_river',intro:['教學：選「攻擊」後用方向鍵選目標。「技能」橫掃會消耗MP攻擊全體敵人！'],onWin:()=>{
  G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));loadMap('reeds',1.5*T2,1.85*T2,'down');say(S.wake.concat(S.wakeSys))}}),'night')}
function bossTalk(){if(!G.flags.templeSeal)return say(S.bossNoSeal);say(S.boss,()=>startBattle(['河伯'],{noEsc:1,bg:'bg_temple',onWin:()=>{G.flags.boss=1;G.flags.pearl=1;M.npcs=M.npcs.filter(n=>!n.boss);
 say(S.bossWin.concat(S.bossSys),dawn,'hebo')}}))}
function dawn(){G.flags.dawn=1;loadMap('village',15*T,19.2*T,'up');G.dawnT=performance.now();heal();say(S.dawn.concat(S.dawnHint))}
function cure(){const f=G.flags;f.cure=1;f.pearl=0;say(S.cure,()=>{loadMap('village',15*T,19.2*T,'up');say(S.yx.concat(S.teaser),()=>{G.mode='end';G.endT=performance.now()},'yx')})}
function status(){say([['狀態',G.party.map(p=>p.n+' Lv'+p.lv+'  HP '+p.hp+'/'+p.mhp+'  MP '+p.mp+'/'+p.mmp+(p.st?' 【'+p.st+'】':'')).join('\n')+'\n道具：魚乾×'+G.inv.魚乾+'  清心草×'+G.inv.清心草+(G.party[0].arm?'  裝備：護身符':'')]])}
