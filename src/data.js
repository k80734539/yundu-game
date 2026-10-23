'use strict';
// 資料：角色、敵人、道具、技能數值
// ---------- data (ported from v5) ----------
const CHESTS={'reeds:18,1':['魚乾',2],'reeds:1,7':['清心草',2],'reeds:5,11':['魚乾',3]};
const EN={小水妖:{e:'shui',hp:18,atk:8,def:1,exp:6},蘆葦精:{e:'lu',hp:26,atk:9,def:2,exp:9,poison:.3},河伯:{e:'hebo',hp:180,atk:14,def:4,exp:60,boss:1}};
const SK={橫掃:{mp:4,tgt:'allE',d:'打全體敵人'},狐火:{mp:4,tgt:'oneE',d:'法術打單體'},春霖:{mp:6,tgt:'allA',d:'全隊回復'}};
const ITEMS={魚乾:{tgt:'oneA',d:'回復40HP'},清心草:{tgt:'oneA',d:'解除中毒並回復15HP'}};
const PORT={林嬸:'lin',老周:'zhou',陳青舟:'qz',白苓:'bl',雲纖:'yx',村長:'chief',阿婆:'granny',王大叔:'wang',河伯:'hebo'};
const NAMES={village:'蘆花渡',reeds:'蘆葦蕩',temple:'河神廟'};
let G={mode:'title',cred:0};
function mk(n,e,hp,mp,atk,def,mag,skills){return{n,e,hp,mhp:hp,mp,mmp:mp,atk,def,mag,lv:1,exp:0,skills,st:'',arm:0}}
