# AGENTS.md — 《雲渡仙緣》開發指南（給 Codex / 其他 coding agent）

## 1. 專案概覽
- 古風仙俠 2D RPG，HTML5 `<canvas>` 單頁遊戲，目前內容：**第一章〈夜渡〉**。
- 主要玩家在 **iPhone Safari**（直式＋橫式都要能玩），桌機鍵盤也支援。
- **無 build step**：`index.html` 用一般 `<script src>`（classic scripts，非 ES module）依序載入 `src/*.js`；所有檔案共用全域作用域（top-level `const/let/function` 互相可見）。直接 push 到 `main` 即由 GitHub Pages 上線。
- 線上：https://k80734539.github.io/yundu-game/
- 語言：介面與對白皆為**繁體中文**。

## 2. 故事與角色（第一章〈夜渡〉，v14 擴寫版）
- **主角**：陳青舟（qz），蘆花渡船夫。父親 **陳溯** 七年前霧夜出船失蹤，只留下刻「溯」字的舊竹篙。
- **白苓**（bl）：白狐少女，被九霄宗打上「**墨刑**」——仙門印在妖身上的墨色刑印，會慢慢侵蝕法力、記憶與生命，且會順河水沾染到人身上。
- **雲纖**（yx）：九霄宗女劍客，立場曖昧（劍無殺氣、暗中提醒）。**操控河伯的控妖符是九霄宗另一人所下，不是雲纖。**
- **河伯**（hebo）：守河三百年的水龍，被控妖符操控；死前吐出「河珠」，能洗去初生的墨。
- 村民：村長（chief）、阿婆（granny）、王大叔（wang）；v14 新增 **林嬸**（井邊）、**老周**（攤子旁），五位村民均使用 v32 使用者原圖，小石頭只出現在對白（無立繪）。
- **流程**：開場 → 王大叔（可選渡河）→ 村長(!) + 阿婆(!)（小石頭黑紋＝墨刑，求藥）→ 夜裡登船 → 河心救白苓 → 小水妖戰 → 蘆葦蕩甦醒（寶箱、古碑可選）→ 控妖符（雲紋）→ **營火夜談（必經，回復＋重來點，`flags.camp`）** → 出口 → 河神廟（還願牌、石碑可選）→ 河伯戰 → 河珠 → 黎明回村（自由行動，可聊村民）→ 把河珠交給阿婆（`flags.cure`）→ 渡口雲纖對峙 → 第二章〈雲梯〉預告 → end。
- **對白全部在 `src/script.js` 的 `S` 物件**；觸發在 story.js / maps.js。村民台詞分 3 階段：`phase()` 1=出發前、2=接委託後、3=黎明。
- `'提示'`/`'系統'` 說話者會以藍色系統樣式顯示，和角色台詞分開；不要把操作說明寫進角色台詞。
- 第二章伏筆：下符者身分、「九霄奉令，暫借河權」、河水倒流、白苓墨刑過腕、陳溯下落、雲纖三日後再來。
- 完整劇本：repo 外的 ch1_script_v14.md（由 script.js 產生）。

## 3. 檔案地圖
```
index.html            入口：CSS + 依序載入 src/*.js（順序很重要，見下）
src/joystick.js       觸控覆蓋層：虛擬搖桿 + A/B 鈕（JOY；JOY.hide(bool)）
src/assets.js         ASSETS = { key: 'assets/img/<key>.<ext>' } 圖片清單
src/engine.js         canvas、fit()（visualViewport 尺寸、safe-area SA）、圖片載入 I[key]、亂數工具
src/data.js           CHESTS、EN（敵人）、SK（技能）、ITEMS、PORT（立繪 key）、NAMES、G（遊戲狀態）、mk()
src/maps.js           地圖/場景：手繪斜視背景、碰撞遮罩（getImageData）、物件、出入口、loadMap()
src/script.js         第一章全部對白資料（S 物件），只放文字
src/village_explore.js 村莊探索：VX_SPOTS 查看點、VX_PICKUPS 拾取物、VX_QUESTS 村民委託（資料表＋互動，對白在 S.vx*）
src/temple_layout.js  河神廟三張圖的路線資料（由 tools/build-temple-layout.py 從 docs/maps/temple-v52/layout-*.json 產生，不要手改）
src/temple_map.js     河神廟三張圖：通用建圖 buildTempleMap、路徑線段／空地橢圓碰撞、條件邊（TEMPLE_OPEN）、轉場 templeTravel、舊存檔搬家 templeLegacyTarget
src/story.js          劇情事件（newGame、say、boat、talisman、boss、ending…）、存檔點 saveCP/retry
src/battle.js         戰鬥邏輯：startBattle、exec（玩家指令）、enemyPhase、dmg/hit/heal、wr（訊息+特效規格）
src/input.js          鍵盤與 press(k)（'up/down/left/right/ok/cancel'）
src/update.js         地圖模式更新：自由移動（非格子）、同伴跟隨、互動判定
src/ui.js             UI 繪圖工具：UI()（重設 transform 為 CSS px）、FS() 字級、txt/box/rr/wrap、對話框 drawDlg（半身立繪）
src/render.js         drawWorld（地圖、y-sort 物件、角色）、drawBoat（夜渡場景）
src/audio.js          Web Audio 合成音效、手勢解鎖、靜音與持久化開關
src/fx.js             戰鬥 VFX：粒子池 VPT（上限 VMAX=160）、startFx、drawVFX、shake/flash
src/battle_motion.js  v22 斜角站位動作：BFR（480×420 影格、腳底 y=355、縮放 .39，v22b 縮小）、BSLOT 站位、BPLAN 動作表（青舟／白苓／雲纖各招式的影格序列與滑步）、bPose 選影格（只改畫面座標，不改數值）
src/battle_ui.js      drawBattle：全螢幕背景、敵左上／我方下方左中右橫排＋橢圓影子、八角指令鈕、底部三張角色卡、KO 溶解、傷害數字；觸控 bTap / B.hit 點擊區
src/screens.js        標題、CREDITS、全滅、結局畫面
src/save.js           存檔系統：localStorage（yundu_save_auto/1/2/3，SAVE_VER 版本號＋migrateSave）、右上「選單」DOM 按鈕與存讀檔面板、標題「繼續遊戲／讀取存檔」
src/exploration_ui.js 探索 HUD 與旅途手札；樣式 exploration_ui.css
src/main.js           frame() 主迴圈（try/catch → window.__err）、測試掛勾
docs/art/             美術規範 style-guide.md、現況審核 audit.md、各素材製作文件與 audit/ contact sheets
assets/img/           所有圖片（webp/png/jpg），由舊版 base64 抽出
legacy/village.html   早期村莊原型（獨立單檔，僅保存）
chapter1.html, village.html   舊網址轉址頁
CREDITS.txt           素材來源（必須保留）
tests/                Playwright 測試，見 tests/README.md
package.json          只給測試用（npm test）
```
**載入順序**（index.html）：joystick → assets → engine → data → reeds_layout → reeds_map → temple_layout → temple_map → maps → story → village_explore → battle → input → update → ui → cinematics → render → audio_assets → audio → audio_playback → fx → battle_motion → battle_ui → screens → save → exploration_ui → main。
- 存檔：saveCP() 會同時寫入自動存檔；改 G 的存檔欄位或格式時，把 SAVE_VER +1 並在 migrateSave() 補升級。存檔只在 canSave()（地圖自由行動、無對話/戰鬥/演出 G.cut）時允許。
classic script 的 function 宣告只在該檔執行時才建立，所以**載入時（top-level）立即執行的程式碼只能呼叫前面檔案的東西**；在 frame()/事件中呼叫則不受限。新增檔案時放在正確位置。

## 4. 美術 / UX 規則（務必遵守）
- **所有新增美術（圖片、特效色、立繪、sprite、武器）必須遵守 [`docs/art/style-guide.md`](docs/art/style-guide.md)**（水彩手繪、統一斜視、章節色盤、光源左上、立繪 6.5～7 頭身、手繪武器、手機直式驗收＋在 `docs/art/` 留文件）。現有素材與規範的落差見 [`docs/art/audit.md`](docs/art/audit.md)。
- **地圖**：新地圖沿用 `docs/art/style-guide.md`「新地圖場景基準」：完整全景式手繪水彩、淡墨線、斜視／3/4 俯視，清楚呈現地標、相連道路與可行走地面；村莊基準 42×28 格、32px/格、1344×896，不能拉伸 16:9 參考圖。背景不含人物/UI；固定場景美術不重複疊畫，玩家/NPC 依腳底 y-sort，前景遮擋分層處理；房屋、牆、植栽及岸線碰撞需貼合底圖並保留可繞行主路。直式 390×664 與橫式 844×390 都要預覽，並驗證重要互動點可達。細節見上述美術規範。
- **自由移動**（free movement，非格子），碰撞用遮罩圖；同伴跟隨走過的路徑。
- **sprite 規格依角色而異**：預設 72×66、3 幀（0 站、1/2 步）、腳底 y=66；**青舟／白苓／雲纖（v19 起）為 192×192、4 幀**（0 左腳前、1 站、2 右腳前、3 站，走路 0→1→2→3，站立＝第 1 幀）、腳底邊緣 y=180、顯示縮放 0.353。規格登記在 `src/ui.js` 的 `SPR`，**一律用 `sprDraw` / `chr` / `spriteKey` / `sprIdle` 取圖與繪製，不要直接 `drawImage(I['qz_…0'])`**（v19 漏改 `render.js` 的「被物件遮住」半透明剪影，導致 iPhone 上青舟躲到樹後出現 3 倍大的鬼影；`tests/sprite-size.mjs` 會攔截所有 drawImage 檢查）。**換圖或改 sprite 規格時必須同時 +1 `ASSET_V` 與 index.html 的 `?v=`**。細節見 [`docs/art/char-sprites-v19.md`](docs/art/char-sprites-v19.md)。
- **角色 sprite 必須與立繪（portrait）一致**（髮型、服裝、配色）。新增角色時兩者一起做。
- **對話立繪 = 半身 bust**：要看得到**下巴與肩膀**，不可只裁到臉。
- **觸控**：覆蓋式虛擬搖桿（左下）+ A/B（右下），只在觸控裝置顯示；**戰鬥中隱藏搖桿**（`JOY.hide(true)`），戰鬥改用直接點擊。
- **戰鬥版面（v25 橫向斜排）**：依使用者指定的橫式參考，敵人在左、我方在右，兩隊都從左下前排向右上後排站開；不要恢復成敵人由左上到右下、我方中間下凹的舊排列。橫式以可用寬度配置兩側陣形；直式維持左右對陣並增加縱深。單敵、雙敵、三敵、河伯的站位在 `src/battle_ui.js` 的 `bLayout`／`BP_EN`；敵人按腳底 y 從後往前畫。所有姿勢、陰影、生命列、點擊範圍、特效與衝刺終點共用站位。指令鈕保持右緣中段、逃跑左上、觸控目標 ≥44px；底部三張人物卡。角色共用 BFR.scale；敵人使用 EART 共用倍率與腳底錨點。參見 `docs/art/horizontal-battle-v25.md`；檢查 `tests/enemy-layout.mjs` 與 `tests/diag-battle.mjs`。
- **尺寸**：canvas 依 `visualViewport` 計算（`fit()`），UI 讓開 safe area（`SA.t/r/b/l`，`viewport-fit=cover`），字級用 `FS()`。直式 375x553 ~ 430x750、橫式 664x390 ~ 844x390 都要不跑版。
- **戰鬥特效**：全部 canvas 繪製；每個動作約 0.5–0.9 秒；粒子上限 160（iPhone 效能）；會心/大傷害才震動+白閃。
- 戰鬥訊息可為 `[text, fxSpec]`，訊息出現（或被跳過）時 `startFx` 啟動，傷害數字在特效命中時間（`VIMP`）才跳出。

- **戰鬥背景（v26）**：bg_reeds／bg_river／bg_temple 指向 1672×941 的 _v26.webp；中央及前景需為能站人的泥地／船板／石板，勿恢復成有水平線的正面遠景。drawBattleBackground 使用中央 cover 並記錄 B.bgFit，圖片已有夜景調色，勿再加原版 22% 黑藍濾層。以 tests/battle-backgrounds.mjs 檢查六尺寸實際腳底落在標記地面內；參見 docs/art/battle-backgrounds-v26.md。

- **主角戰鬥素材（v27）**：使用者提供的原始三張 2×5 姿勢圖保存在 docs/art/heroes-v27/；保留原色，不加夜景去飽和／暗化。30 張影格仍為 480×420、腳底 (240,355)，BFR.scale 保持 .39。qzd_hit 現在是原圖後仰受擊姿勢，不能再複製 qzd_down。製作記錄見 docs/art/heroes-v27.md，重匯入工具 tools/import-hero-sources.py；tests/hero-assets.mjs 驗證原色、切圖與受擊圖。版本提升時只改 ASSET_V 與腳本快取，不要改已存在背景素材的 _v26.webp 檔名。

- **頭像（v28）**：三位主角以使用者提供四視角原圖的三分之四正面裁成 512×512 透明半身像，戰鬥與對話共用同一張，勿改回舊像素頭像或有底色的方塊。卡片頭像在左、紅／藍數字在右；直式壓縮為兩行且臉部不被資訊列覆蓋。cards 的觸控區包含浮出資訊列的頭像。情境鍵 pt_qz_startled／pt_bl_quiet 目前使用同一原圖的正面視角，不自行生成表情。參見 docs/art/portraits-v28.md 與 tests/portrait-ui.mjs。原色裁切工具為 tools/import-portraits.py。

## 5. 版本號規則
- 目前 **v61**（水位條／渡氣加文字標示、開場提示與首次閃爍；v60 預告改小圖示；v59 河伯戰可讀性與難度：預告氣泡、水位條、渡氣珠、白話台詞、變招、攻擊特效；v58 河伯戰 UI 圖示與水系特效圖入庫；v57 河伯姿勢圖清掉頂端殘影；v56 河伯新姿勢接進戰鬥；v55 擋浪、引潮、渡氣與合擊；v54 潮位與預告）。每次上線改動都要 +1（下一版 **v61**），三處一起改：
  1. `index.html` `<title>雲渡仙緣 第一章 vN</title>`
  2. `src/screens.js` 標題畫面 `'版本 vN'`
  3. `src/render.js` 地圖右下角 `'vN'`
- 上線前確認三處版本標籤、index.html 所有 `?v=` 與 `src/assets.js` 的 `ASSET_V` 同步；歷史美術文件與程式歷史註解可保留舊版號。上線前可對前一版打 git tag 以便回滾。

## 6. 測試流程
```bash
npm install && npx playwright install chromium   # 或 export CHROME_PATH=/usr/bin/google-chrome
npm test                                          # 必須 ALL PASS，且無 JS errors
```
- 改了畫面相關的東西：用 `tests/README.md` 的 baseline/compare 流程確認只有預期的差異，並親自看 `tests/out/` 截圖（直式與橫式）。
- 本機預覽：`npm run serve` → http://127.0.0.1:8080/（勿用 file://）。

## 7. 部署
- `main` 分支根目錄 = GitHub Pages。**push 到 main 就上線**（約 1 分鐘）。
- 確認：`curl -s "https://k80734539.github.io/yundu-game/?v=N" | grep "第一章 vN"`。
- iPhone 快取：index.html 有 no-cache meta；若玩家看到舊版，請他加 `?v=N` 或重新整理。
- 回滾：`git tag` 有 `v12`（最後一個單檔版）等；`git revert` 或從 tag checkout 後 push。

## 8. 禁止事項（Do NOT）
- **不要抄**《仙劍奇俠傳》《古劍奇譚》的人物、地名、門派、劇情、招式名或美術；氛圍可參考，內容必須原創。
- **不要刪除或縮減 CREDITS.txt** 與遊戲內 CREDITS 畫面；新增素材要補登來源。
- **不要把圖片重新 base64 內嵌**回 JS/HTML；圖片一律放 `assets/img/` 並在 `src/assets.js` 登記。
- 不要加 build step / bundler / framework（必須能直接被 GitHub Pages 服務）；不要改成 ES modules 除非同步處理全域依賴並跑完整測試。
- 不要移除測試掛勾（`G_`、`press`、`TP`、`__sb`、`__ex`、`__ep`、`mk`）或 `frame()` 的 try/catch。
- 不要讓搖桿在戰鬥中出現、不要讓戰鬥指令鈕遮住角色（放在右緣中段，逃跑除外，在左上）、不要讓指令鈕觸控目標小於 44px、不要讓戰鬥角色影格脫離共用縮放 `BFR.scale`、不要把立繪裁到看不到下巴與肩膀。
- 不要忘記 bump 版本號；不要 push 沒跑過 `npm test` 的改動。

- **戰鬥回饋（v30）**：bImpactTime 只定格攻擊者繪圖時鐘 55ms／會心 80ms，不改傷害時間；bRecoil 在命中後位移並於 260ms 內回位。soundBtn 需保留 44px 觸控區、上方訊息框讓出右緣。音效於可信手勢才建立 AudioContext，靜音獨立存於 yundu_sound，不改存檔格式。tests/battle-feedback.mjs 測試實際音訊輸出與命中排程。

- **夜渡（v31）**：nightActors 以夜景原圖座標定義船內腳底和救人路徑，nightHull 重繪近側船舷遮擋。白苓使用現有 bld_down 蜷坐圖與水面裁切，不旋轉站立圖。nightFrame 依 dialogLayout 預留文字空間，角色不可被對話遮住。船與人物不得各自上下漂移。參見 docs/art/night-rescue-v31.md、tests/night-rescue.mjs。

- **村民（v32）**：林嬸 lin、老周 zhou、阿婆 granny、村長 chief、王大叔 wang 使用使用者提供的圖片，NPC 靜態畫布 192×192、腳底 (96,180)、顯示倍率 .353，規格在 NPCSPR，spriteKey 優先回傳靜態角色鍵。對話為 512×512 透明半身像。只有林嬸原圖有多視角，目前統一使用所提供正面偏側站姿；其餘不自行生成人物視角或走路。舊王大叔方向影格保留供舊圖回退，不作新素材的動畫。來源與重匯入工具見 docs/art/villagers-v32.md、tools/import-villagers.py。

- **音樂／音效（v33）**：src/audio_assets.js 為 22 份使用者音檔清單，audio.js 保留 Web Audio 解鎖及合成回退，audio_playback.js 管理錄音播放、背景音樂、環境音與聲音設定。音樂和音效分開儲存於 yundu_music／yundu_sound。音樂僅在可信手勢後載入，解碼快取最多兩首；不要預載所有音樂。MP4 僅抽取音軌。src/fx.js 以原有出手／命中時間播放，死亡和升級各播一次。來源、裁切、音量及循環製作見 docs/audio/audio-v33.md、manifest-v33.json、tools/import-audio.py。tests/audio-library.mjs 量測實際音樂與音效取樣及切歌競態。


- **第一章擴寫（v34）**：登船前呈現退水對村民的影響；蘆葦蕩倒伏路障需先互動察看，再由青舟竹篙撐路、白苓狐火清除妖根，完成後才可營火休息與離開；河神廟先讀碑，再於神龕前削弱控妖封印才可挑戰河伯。地圖目標列出目前步驟。章節順序及結局維持不變，新增旗標用既有 `G.flags`，不改存檔格式、戰鬥數值。流程驗收見 `tests/playthrough.mjs`，內容記錄 `docs/chapter1-v34.md`。

- **蘆花渡村地圖（v35）**：村莊為 42×28 個 32px 世界單位，四區由主路、廣場環道與住宅支巷串接；渡口落在南側河岸。主線與支線世界座標在 `src/maps.js`，中央道路不得被井、攤位或大型物件碰撞封死。河岸水位依 `flags.flood` 退低、`flags.dawn` 回升。沿用既有物件與地面材質，不新增圖片素材。`tests/village-layout.mjs` 以碰撞網格驗證所有村民、住宅互動點、渡口可達與河岸水位差。
- **蘆花渡村完整場景（v37）**：`assets/img/village_map_v37.webp` 是 42×28 世界的完整 3:2 水彩底圖，原圖與提示詞記錄在 `docs/art/village-v37/`。村民與玩家仍即時繪製；`mapPlate` 場景物件不重複繪製，碰撞使用 `buildVillage()` 中的資料矩形；水紋低透明疊加，岸線仍依 flood/dawn 更新。地圖與碰撞配置見 `docs/maps/village-v37.md`。

- **村莊 NPC 站位（v38）**：村長靠村長廳、阿婆靠右側住宅、林嬸靠井、老周靠市集、王大叔靠渡口；右側住宅碰撞框依完整場景圖修正。站位由 `buildVillage()` 定義，維持空地可達。

- **村莊碰撞修正（v39）**：市集南側的灌木帶與院牆增加碰撞，避免角色穿過背景植栽；行走路徑需保留兩側繞行並可到達村民與渡口。

- **蘆葦蕩／河神廟全景底圖（v40）**：使用 `assets/img/reeds_map_v40.webp`、`temple_map_v40.webp` 取代程式拼接地面；探索範圍維持 20×15 格、每格 48px，碰撞格、出口、任務觸發仍由資料控制。碑文與泉池阻擋依新構圖定位。生成原圖、提示詞和地標記錄見 `docs/art/map-scenes-v40/`、`docs/maps/map-scenes-v40.md`。戰鬥底圖維持 v26 專用 16:9 圖.
- **市集西南側灌木島碰撞（v41）**：補上舊市集南側障礙矩形西北角的缺口，阻止角色踏入畫面中樹叢；保留西側與南側通路。`tests/village-layout.mjs` 驗證該區受阻及鄰近路徑可行。
- **市集樹叢精確碰撞（v42）**：v39/v41 的碰撞位置未對齊截圖中的主樹；已以底圖像素重現腳底 (906,446) 的穿越，按樹叢及院牆分段阻擋，移除偏到道路上的舊矩形。碰撞必須以實際 update 移動驗證，不能只測新加的矩形中心。loadMap 會把位於新障礙內的舊存檔位置移到鄰近空地。
- **蘆葦蕩迷宮（v43）**：1344×896、48px 可行走道路寬，主資料 `docs/maps/reeds-v43/layout.json`，由 `tools/build-reeds-map.py` 產生 `src/reeds_layout.js` 與開／鎖橋 map bundle。`src/reeds_map.js` 使用道路聯集判定腳底，不使用舊 GRID.reeds；兩座妖根橋都由 flags.reedSolved 控制。保留原三個寶箱 key。`healParty()` 專管劇情全隊回復，勿改回與 battle.js 的 heal(t,h) 同名。測試 `tests/reeds-maze.mjs` 使用實際 update 走岔路、開橋、水岸、營火與出口；所有新地圖都應先有路線及碰撞再生成美術，並在圖上目視比對。

- **目前碰撞（v44～v48）**：村莊及河神廟使用 assets/img/village_walk_v44.png 與 temple_walk_v44.png 白色可走遮罩，透過 walkMask/getImageData 取樣腳底六點，?debug=col 顯示紅色擋人區。蘆葦蕩使用 REEDS_LAYOUT 道路聯集，?debug=col 依道路聯集、腳底取樣、妖根門與地標實體繪製紅色擋人區。保留 tests/temple-walk.mjs 左右支路與盡頭驗證、tests/reeds-debug.mjs；UI 改版不得覆蓋碰撞更新。
- **探索 UI（v47）**：探索右上只留選單，聲音開關收在設定；標題及戰鬥保留原 soundBtn。旅途手札顯示真實隊伍／物品、任務、存讀檔與設定。面板開啟時 clearK 並暫停 update 移動；方向鍵／Enter／Esc／M／Tab 支援操作與焦點限制。見 docs/art/exploration-ui-v45/README.md（原設計 v45，整合發佈 v47）及 tests/exploration-ui.mjs。
- **第一章收尾（v48）**：河伯勝利時青舟學會渡水一擊（MP／目標／倍率在 `src/data.js` 的 SK／CFG），讀取已通關舊存檔會補技能且不重複；河伯 HP 低於一半後只觸發一次訊息、濁浪間隔由 CFG 控制的 3 回合改為 2 回合。蘆葦蕩 `reeds:18,1` 保持魚乾×2，`reeds:1,7` 護身符使青舟防禦永久+2，`reeds:5,11` 刻字布條記錄 `flags.foundCloth` 並呈現父親字跡對白。第一章不套用五行相剋。檢查 `tests/chapter1-mechanics.mjs` 與 `tests/reeds-debug.mjs`。

- **第一章節奏（v49）**：蘆葦蕩 `REEDS_LAYOUT` 的南岔路加入固定老蘆葦精頭目事件；頭目 HP／攻擊資料在 `CFG.reedBoss.enemy`，捷徑根門會等頭目勝利才開，出蘆葦蕩也受勝利旗標限制。舊存檔若已記錄營火、廟封印或河伯勝利，自動補 `flags.reedBoss`，不改 SAVE_VER。戰敗重來點回蘆葦蕩入口。河神廟石碑後需點亮 `CFG.templeLanterns` 中三個可達互動點，才能削弱封印；狀態用 `flags.templeLamps` 位元旗標，光源顏色由既有 `M.lights` 更新。老蘆葦精圖為 `laolu_idle0/idle1/cast/attack/hit/down.webp` 和小圖 `laolu.webp`，錨點／倍率在 `src/battle_ui.js` 的 EART；來源、提示詞、處理方式與戰鬥截圖見 `docs/art/laolu-v49/`。未新增開場小戰；河伯戰後只補白苓墨刑短暫發作的對白。驗收測試 `tests/ch1-pacing.mjs`。

- **村莊探索（v50）**：`src/village_explore.js` 以資料表定義村莊互動。`VX_SPOTS` 8 個查看點（井、攤位、繫船柱、廳前石燈、大樹、桃樹、北邊小路、西側院落），台詞 `S.vx_<id>` 可給三段（依 `phase()`）。`VX_PICKUPS` 4 個拾取物，已撿記在 `G.opened['village:<id>']`，不會重生。`VX_QUESTS` 三個委託（林嬸「井水發苦」、老周「找回網墜」、王大叔「河邊的竹籃」），狀態 `flags.vx_q_<id>`（0 未接／1 進行中／2 完成），可交付時村民頭上顯示「！」，旅途手札行程頁列出「村中小事」。委託道具（網墜、竹籃）不在 `ITEMS`，不進戰鬥選單。拾取物圖由 `VX_PICKUP_ART` 指定（`vx_sinker`、`vx_basket`、`vx_fish`、`vx_herb`），圖未登記或未載入時畫閃光作 fallback。不改存檔格式。驗收測試 `tests/village-explore.mjs`（每個點以實際 interact 判定可用、委託流程、不重生、委託道具不進選單）。

- **第一章收尾（v51）**：村長與阿婆委託完成、退水事件發生後，第一次走到渡口先遇 2 隻小水妖；勝利獲得魚乾，逃跑也記為完成，戰敗重來點留在村莊。舊存檔若已有 `flood` 或後續進度會遷移成完成。夜渡改留進階提示。戰鬥訊息列依文字寬度置中、長句換行並為右上聲音鈕留空；橫式角色倍率在 `CFG.battleUi.landscapeScale`，仍經 `BFR.scale` 共用。`tests/ch1-pacing.mjs` 的截圖輸出至忽略的 `tests/out/`；收尾驗收見 `tests/ch1-wrapup.mjs`。

- **河神廟三張圖（v52 階段一）**：設計見 `docs/maps/temple-v52.md`（草案 2），路線草圖與資料在 `docs/maps/temple-v52/`（`layout-*.json` 為資料來源，`python3 tools/build-temple-guides.py` 重畫草圖，`python3 tools/build-temple-layout.py` 產生 `src/temple_layout.js`）。三張圖 `temple_shore`／`temple_court`／`temple_hall`（各 1344×896）；`G.map` 與 `NAMES` 用這三個 id，舊 id `temple` 只留給舊存檔／重來點，`loadMap('temple',…)` 會依旗標搬到新圖（`templeLegacyTarget`）。碰撞：腳底六點需落在路徑線段（寬 `pathWidth`＝48）或空地橢圓內，有條件的邊（`gap`/`flooded`/`barrier`）用 `TEMPLE_OPEN` 判斷，疊水區與鎮水門在條件未滿足時擋人；`?debug=col` 在三張圖都畫紅框。**階段一的底圖是路線草圖**（`assets/img/temple_guide_*.png`），階段三才換成生好的圖；三燈：`flags.templeLamps` 位元（A＝1、B＝2、C 右＝4），點亮後互動移除；三燈全亮鎮水門開、中央水道捷徑可走。舊的單張 `temple_map_v40.webp`、`temple_walk_v44.png` 與 maps.js 的 `GRID.temple` 暫留，階段三穩定後再移除。河伯告別演出的位置由 `sceneHeboBase()` 決定。驗收測試 `tests/temple-v52.mjs`（取代已移除的 `temple-walk.mjs`）。

- **河神廟階段二（v53）**：機關與戰鬥已做。`TEMPLE_OPEN.pole`＝`flags.templeShorePole`（淺灘棧橋缺口，在缺口西端互動，青舟撐出踏板）、`sluice`＝`flags.templeSluice`（中庭上層東側水閘，扳動後東側下層淹水區退水）、`lamps`＝三燈全亮、`seal`＝`flags.templeSeal`。燈 A 要先看封符對白、白苓燒符才亮（`templeLampA`）；燈 B 要先排水；燈 C 右（東，「日出之側」）才是正燈，左邊那盞（`templeLampWrong`）點了會打 2 隻小水妖、不亮、可重試。固定戰鬥資料在 layout JSON 的 `encounters`（敵人、旗標、重來點、戰鬥背景），由 `templeFight(id)` 觸發：走進區域才開戰、每場只一次、逃跑也算完成、戰敗回該場的重來點。神龕 `templeShrine`：先劇情，再打「河伯水影」（`EN['河伯水影']`，數字在 `CFG.templeShadow`，圖沿用河伯並由 `templeEnsureShadowSprites` 預先疊成偏藍暗的快取，`e:'hebos'`），贏了才設 `templeHallShadow`、`templeSeal`。水影用 `e:'hebos'` 所以不會觸發河伯本人的階段變化。疊水、踏板、鎖門由 `drawTempleOverlays` 在底圖上動態畫（底圖要畫成乾的）。**階段一與二的底圖都是路線草圖，`temple_guide_*.png` 為遊玩版（不含水與鎖門），`docs/maps/temple-v52/guide-*.png` 為標註版**，由 `python3 tools/build-temple-guides.py` 一次產生。棧橋拓樸：棧橋東端接匯合點，所以從淺灘繞過去也到得了棧橋與寶箱，撐篙是「不用打那場戰鬥」的另一條路。試玩入口：網址 `#temple-shore`／`#temple-court`／`#temple-hall`（`templeJump`）。測試 `tests/temple-v52.mjs`。
- **河伯戰（v52）**：河伯專屬行動狀態為 NORMAL／CHARGING／RELEASE／STAGGERED；蓄力會佔用一次敵方行動，讓我方有完整回合應對。HP ≤90 時控妖符顯形，符被破壞會取消蓄力並使河伯跳過下一次行動；白苓狐火命中蓄力中的河伯可降低當次濁浪傷害。防禦回復 MP，數值在 `CFG.hebo`／`CFG.guardMp`；不變更存檔格式。驗收見 `tests/hebo-boss-v3.mjs`。

- **河伯戰潮位與預告（v54，趣味化第一包，設計見 `docs/boss/hebo-fun-v1.md`）**：潮位每回合依 `CFG.hebo.tide.order`（平→漲→退循環）決定，`tideAt(turn)`／`tideNow(B)`；退潮玩家物理傷害 ×`physEbb` 且河伯攻擊 ×`atkEbb`，漲潮狐火（`dmg` 的 `ign` 旗標＝法術）×`magicRise` 且河伯攻擊 ×`atkRise`；`heboForecast(B,n)` 依狀態推演接下來 n 次河伯行動，戰鬥畫面河伯下方 `drawTidePanel` 顯示潮位與預告。回合末訊息提示下一回合潮位。數字暫定，需實戰調整。測試 `tests/hebo-tide.mjs`（與 `tests/hebo-boss-v3.mjs`）。

- **河伯戰第二包（v55）**：①撐篙擋浪：河伯 CHARGING 後的敵方回合，`enemyPhase` 先進入 `B.ph='parry'`（`B.parry.t0`），光環縮到圈上的瞬間點螢幕／按確定（`parryTap`），誤差 ≤`perfect` ms 完美（傷害×`perfectMul` 並反彈）、≤`good` ms 普通、其餘或逾時失誤，之後 `parryResolve` 重新呼叫 `enemyPhase`，由 `heboTurn` 的釋放段套用 `B.parryGrade`；測試或青舟倒下用 `opt.noParry` 略過。②引潮（白苓，`SK.引潮`，tgt `self`）：`B.hebo.shift++`，潮位整個循環往前一格，`tideAt` 與預告同步。③渡氣 `B.qi`（0–`CFG.hebo.qiMax`）：完美／普通擋浪、狐火干擾、破符、防禦、引潮累積；滿了青舟的法術選單出現「雲渡一擊」（`bSkills`），打掉河伯最大血量 `combo.hpFrac`、使其失衡、潮位改退潮、清空渡氣。潮位倍率已拉大（`physEbb`/`magicRise` 1.6）。數字都在 `CFG.hebo`，暫定。測試 `tests/hebo-tide.mjs`。

- **河伯新姿勢（v56）**：Codex 生成的 `hebo_charge0/1`（蓄力循環）、`hebo_stagger`（失衡）、`hebo_rage0/1`（階段二待機）、`hebo_wave`（濁浪釋放）已接進 `enemyPose`（只限 `e.e==='hebo'`，圖缺時退回 idle0）；`hebo_drink`（吞水）、`hebo_whirl`（漩渦）與 `fx_whirl.webp` 已登記但還沒用，留給「變招」。素材製作見 `docs/art/hebo-poses/`，驗收 `tests/hebo-poses.mjs`。已知小瑕疵：`hebo_wave` 右緣、`hebo_drink` 上緣被圖框切成直線。v56b 已用程式刪掉 `hebo_rage0`、`hebo_whirl`、`hebo_drink` 頂端漂浮的細碎條紋（來自圖集上一格的殘影，戰鬥畫面上會像角色頭上的殘影）。

- **河伯戰 UI 圖示與特效圖（v58，只入庫，尚未接進畫面）**：`ui_intent_*`（龍尾／蓄力／濁浪／失衡／吞水／漩渦，128×128）、`ui_tide_ebb/mid/rise`（128）、`ui_qi_empty/full`（96）、`ui_tide_gauge`（64×320）、`ui_tide_marker`（48）、`fx_tail_sweep`（768×384）、`fx_wave_big`（1536×512，由左向右）、`fx_splash`、`fx_charge_ring`（512），已登記在 `ASSETS`；`hebo_wave.webp` 已重畫覆蓋（右緣不再被切）。外框由程式畫。已知：`ui_intent_wave` 與 `ui_tide_rise` 都是金褐色浪花，容易混，接 UI 時請用不同外框顏色區分；`fx_wave_big` 是被橫向拉長的。製作紀錄 `docs/art/hebo-ui-fx/`，驗收 `tests/hebo-ui-fx.mjs`（需要 python3＋Pillow＋NumPy＋SciPy）。

- **河伯戰 v59（看得懂＋認真玩才會過）**：①畫面：河伯右側 `drawIntent` 只畫兩個小圖示（危險色框）加第一個招式的兩個字，沒有底板、不擋畫面，點圖示在上方訊息框顯示說明；左緣 `drawTideGauge` 水位條＋當前潮位圖示＋5 顆渡氣珠（點一下顯示說明）；提示文字在上方訊息框（`B.tipTxt`，4 秒）。②變招：`B.hebo.moves` 預先擲好的普通招式佇列（龍尾／吞水回復 `drinkHeal`／漩渦打一人並封下一回合法術 `p.sealed`），`heboRefill`／`rollMove`／`heboForecast`（回傳 `{k,a,tide}`，`k`＝tail/drink/whirl/charge/wave/stagger）；`opt.noMoves` 讓測試固定只出龍尾。③台詞：開場與第一次蓄力（`flags.heboChargeSeen`）、擋浪結果、失衡、引潮（`heboPullSeen`）、渡氣滿、階段二都有白苓／青舟的訊息；擋浪教學只第一次顯示完整（`flags.parrySeen`）。④特效：`fx_tail_sweep`、`fx_wave_big`（橫掃全畫面＋變暗）、`fx_splash`、`fx_charge_ring`（蓄力時繞河伯）、`fx_whirl`，`fx.js` 新增 `drink`／`whirl` 兩種；姿勢 `drink`／`whirl` 已用。⑤難度：以「實際到河伯時的隊伍」（青舟 Lv3、白苓 Lv2，見 playthrough）用機器人模擬調整，河伯 HP 380、攻擊 20、控妖符 50；只會按攻擊／狐火的人幾乎打不贏（約 10%），會看預告、擋浪、引潮、合擊的人約 9 成能過、平均約 11–12 回合。調整時請重新模擬（舊的模擬工具已刪，邏輯：以 `__sb(['河伯'],{noParry:1})` 開戰，迴圈呼叫 `exec`／`enemyPhase`，擋浪結果以 `B.parryGrade` 預先指定）。
