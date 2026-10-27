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
**載入順序**（index.html）：joystick → assets → engine → data → maps → story → battle → input → update → ui → cinematics → render → audio_assets → audio → audio_playback → fx → battle_motion → battle_ui → screens → save → exploration_ui → main。
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
- 目前 **v48**（第一章收尾：渡水一擊、蘆葦蕩寶箱用途、河伯二階段；保留 v46 遮罩碰撞與河神廟左右支路修正）。每次上線改動都要 +1（下一版 **v49**），三處一起改：
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
