'use strict';
// 資料：角色、敵人、道具、技能數值
// ---------- data (ported from v5) ----------
const CHESTS={'reeds:18,1':['魚乾',2],'reeds:1,7':['護身符',1],'reeds:5,11':['刻字布條',1]};
const CFG={hebo:{phaseHp:.5,waveInterval:3,phaseWaveInterval:2},reedBoss:{enemy:{hp:78,atk:11,def:2,exp:27},checkpoint:[100,122],trigger:[878,517,88,72]},templeLanterns:[{lamp:[9.2,7.9],stand:[9.2,7.1]},{lamp:[12.1,7.9],stand:[12.1,7.1]},{lamp:[12.1,5.9],stand:[11.8,5.2]}],charmDefense:2,ferryFight:{count:2,reward:1},battleUi:{landscapeScale:1.12,messageMaxWidth:640,soundSafeWidth:94,messagePadding:28,messageMinWidth:132},skills:{渡水一擊:{power:1.8}}};
const templeLanternMask=()=>((1<<CFG.templeLanterns.length)-1);
const EN={小水妖:{e:'shui',hp:18,atk:8,def:1,exp:6},蘆葦精:{e:'lu',hp:26,atk:9,def:2,exp:9,poison:.3},老蘆葦精:{e:'laolu',...CFG.reedBoss.enemy,boss:1},河伯:{e:'hebo',hp:180,atk:14,def:4,exp:60,boss:1}};
const SK={橫掃:{mp:4,tgt:'allE',d:'打全體敵人'},渡水一擊:{mp:5,tgt:'oneE',d:'水靈單體重擊'},狐火:{mp:4,tgt:'oneE',d:'法術打單體'},春霖:{mp:6,tgt:'allA',d:'全隊回復'}};
const ITEMS={魚乾:{tgt:'oneA',d:'回復40HP'},清心草:{tgt:'oneA',d:'解除中毒並回復15HP'},護身符:{d:'永久提升陳青舟防禦 2 點'},刻字布條:{d:'陳溯留下的舊物，青舟認得上面的字跡'}};
const PORT={林嬸:'lin',老周:'zhou',陳青舟:'qz',白苓:'bl',雲纖:'yx',村長:'chief',阿婆:'granny',王大叔:'wang',河伯:'hebo'};
const NAMES={village:'蘆花渡',reeds:'蘆葦蕩',temple:'河神廟'};
let G={mode:'title',cred:0};
function mk(n,e,hp,mp,atk,def,mag,skills){return{n,e,hp,mhp:hp,mp,mmp:mp,atk,def,mag,lv:1,exp:0,skills,st:'',arm:0}}
