'use strict';
// 劇情/對話腳本與事件旗標
// ---------- story ----------
function newGame(){G={mode:'map',party:[mk('陳青舟','qz',60,12,10,3,4,['橫掃'])],inv:{魚乾:1,清心草:0},flags:{},opened:{},dlg:null,B:null};
 loadMap('village',5*T,7.6*T,'down');
 say([['','清晨，蘆花渡籠罩在薄霧中。'],['陳青舟','又是撐船的一天！先去渡口看看有沒有客人吧。'],['提示',JOY.touch?'用左下搖桿移動，靠近人物按 A 對話／調查，按 B 查看狀態。':'用方向鍵/WASD 移動，靠近人物按空白鍵/Enter（A）對話，Esc/X（B）查看狀態。']])}
function saveCP(o){G.cp=JSON.stringify({o,party:G.party,inv:G.inv,flags:G.flags,opened:G.opened})}
function retry(){const s=JSON.parse(G.cp);Object.assign(G,{party:s.party,inv:s.inv,flags:s.flags,opened:s.opened,B:null,dlg:null});
 if(s.o.boat){startNight()}else{loadMap(s.o.map,s.o.x,s.o.y,s.o.dir);G.party.forEach(p=>{p.hp=p.mhp;p.mp=p.mmp;p.st=''});say([['','重新振作，再試一次吧！']])}}
function say(lines,cb){G.dlg={l:lines,i:0,cb}}
function openChest(k){if(G.opened[k])return say([['','寶箱是空的。']]);G.opened[k]=1;const[it,c]=CHESTS[k];G.inv[it]+=c;say([['','打開寶箱，獲得「'+it+'」×'+c+'！']])}
function talisman(){if(G.flags.tal)return;G.flags.tal=1;say([['','草叢裡有一張燒了一半的黃色符咒，散發著陰冷的妖氣。'],['白苓','這是……「控妖符」！有人用它操控水妖。'],['陳青舟','難怪最近河上不太平，原來是有人在搞鬼。'],['白苓','符咒的氣息往東南邊延伸……那邊好像有座廟。']])}
function exitReeds(){if(!G.flags.tal){G.y-=14;return say([['白苓','等等，這附近有股奇怪的妖氣……先四處找找看吧。']])}
 loadMap('temple',12.5*T2,13.8*T2,'up');G.party.forEach(p=>{p.hp=p.mhp;p.mp=p.mmp;p.st=''});
 say([['','穿出蘆葦蕩，眼前是一座破舊的河神廟。'],['','廟前石泉清冽，兩人喝了泉水，傷勢與法力完全恢復。'],['白苓','裡面的妖氣好重……小心。']])}
function boardBoat(){const f=G.flags;if(f.dawn)return;if(!f.chief||!f.quest){G.y=Math.min(G.y,19.5*T);return say([['陳青舟','先別急著出船，村裡好像還有事。（找村長和阿婆談談）']])}
 say([['','……入夜後，青舟避開村長，悄悄解開了小船的纜繩。']],startNight)}
function startNight(){G.mode='boat';G.boatT=performance.now();G.party=G.party.filter(p=>p.n=='陳青舟');saveCP({boat:1});
 say([['','小船駛入河心，四周忽然湧起濃霧，連月光都看不見了。'],['陳青舟','好濃的霧……咦？水裡有東西！'],['','一名白衣少女昏迷著漂在水面上，長髮間隱約露出一對雪白的狐耳。'],['陳青舟','喂！姑娘！撐著點！'],['','青舟奮力把少女拉上船。就在這時，水面冒出咕嘟咕嘟的氣泡——'],['小水妖','嘰嘰！把那個女的交出來！']],()=>startBattle(['小水妖','小水妖'],{noEsc:1,bg:'bg_river',intro:['教學：選「攻擊」後用方向鍵選目標。「技能」橫掃會消耗MP攻擊全體敵人！'],onWin:()=>{
  G.party.push(mk('白苓','bl',45,24,6,2,11,['狐火','春霖']));loadMap('reeds',1.5*T2,1.85*T2,'down');
  say([['','水妖退去，但小船被暗流捲走，一頭撞進岸邊的蘆葦蕩……'],['','……'],['白苓','嗚……這裡是……？你是誰？'],['陳青舟','我叫陳青舟，是個船夫。你漂在河上，我就把你撈起來了。'],['白苓','……謝謝你。我叫白苓。（她下意識地遮住了狐耳）'],['陳青舟','船撞壞了，得先走出這片蘆葦蕩。你能走嗎？'],['白苓','嗯。我會一點治癒的法術，可以幫你。'],['','白苓加入隊伍！'],['提示','白苓的「狐火」攻擊單體，「春霖」回復全隊。戰鬥中的「道具」可使用魚乾回血、清心草解毒。'],['提示','蘆葦蕩中的草叢會遇到妖怪，記得開寶箱。按 B（Esc/X）可查看狀態。']])}}))}
function bossTalk(){say([['','神龕前盤踞著一條巨大的青鱗水龍，額頭上貼著一張發著黑光的符咒。'],['河伯','吼……入侵者……殺……'],['白苓','是河伯！他被控妖符操控了！'],['陳青舟','把那張符打掉，就能讓他清醒吧？上了！']],()=>startBattle(['河伯'],{noEsc:1,bg:'bg_temple',onWin:()=>{G.flags.boss=1;M.npcs=M.npcs.filter(n=>!n.boss);
 say([['','河伯額上的符咒化成灰燼，他巨大的身軀緩緩倒下。'],['河伯','我……守護這條河三百年……竟被人類的符咒……'],['陳青舟','是誰做的？'],['河伯','白衣……雲上來的人……孩子們，聽好……'],['河伯','河水……要倒流了。'],['','河伯化作點點水光，消散在夜色中。'],['白苓','倒流……難道是……'],['','……天亮了。青舟與白苓找到一艘舊船，回到了蘆花渡。']],dawn)}}))}
function dawn(){G.flags.dawn=1;loadMap('village',15*T,19.2*T,'up');
 say([['陳青舟','終於回來了！藥的事……得再想辦法了。'],['','岸邊站著一名白衣劍客，衣袂上繡著九朵祥雲。'],['雲纖','……'],['','劍光一閃，冰冷的劍尖已指向白苓。'],['雲纖','妖孽，跟我回九霄宗。'],['陳青舟','你、你想幹什麼！'],['白苓','（白苓握緊了青舟的衣袖，微微發抖。）']],()=>{G.mode='end';G.endT=performance.now()})}
function status(){say([['狀態',G.party.map(p=>p.n+' Lv'+p.lv+'  HP '+p.hp+'/'+p.mhp+'  MP '+p.mp+'/'+p.mmp+(p.st?' 【'+p.st+'】':'')).join('\n')+'\n道具：魚乾×'+G.inv.魚乾+'  清心草×'+G.inv.清心草+(G.party[0].arm?'  裝備：護身符':'')]])}
