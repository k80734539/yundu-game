# AGENTS.md — 《雲渡仙緣》開發指南（給 Codex / 其他 coding agent）

## 1. 專案概覽
- 古風仙俠 2D RPG，HTML5 `<canvas>` 單頁遊戲，目前內容：**第一章〈夜渡〉**。
- 主要玩家在 **iPhone Safari**（直式＋橫式都要能玩），桌機鍵盤也支援。
- **無 build step**：`index.html` 用一般 `<script src>`（classic scripts，非 ES module）依序載入 `src/*.js`；所有檔案共用全域作用域（top-level `const/let/function` 互相可見）。直接 push 到 `main` 即由 GitHub Pages 上線。
- 線上：https://k80734539.github.io/yundu-game/
- 語言：介面與對白皆為**繁體中文**。

## 2. 故事與角色（第一章）
- 舞台：渡雲河畔的漁村「蘆花渡」→ 夜河 →「蘆葦蕩」→「河神廟」。
- **陳青舟**（`qz`）：主角，年輕船夫。技能「橫掃」（全體物理）。
- **白苓**（`bl`）：狐妖少女，被青舟從河上救起；會遮住狐耳。技能「狐火」（單體法術）、「春霖」（全隊回復）。
- **村長**（`chief`）、**阿婆**（`granny`）、**王大叔**（`wang`）：村民 NPC。
- **河伯**（`hebo`）：守河三百年的青鱗水龍，被「控妖符」操控 → 第一章 Boss。
- **雲纖**（`yx`）：九霄宗白衣劍客，結局登場，要帶走白苓（第二章伏筆）。
- 流程：村莊與村長、阿婆談話 → 夜裡偷偷出船 → 小水妖襲擊（戰鬥）→ 船撞進蘆葦蕩、救起白苓入隊 → 蘆葦蕩（隨機遇敵、3 個寶箱、找到燒一半的控妖符）→ 河神廟泉水回滿 → Boss 河伯 → 河伯臨終：「白衣……雲上來的人」「河水要倒流了」→ 天亮回村 → 雲纖現身 →「第一章 完」。
- 敵人：小水妖（`shui`）、蘆葦精（`lu`，會中毒）、河伯（Boss；每第 3 回合放大招「濁浪滔天」）。

## 3. 檔案地圖
```
index.html            入口：CSS + 依序載入 src/*.js（順序很重要，見下）
src/joystick.js       觸控覆蓋層：虛擬搖桿 + A/B 鈕（JOY；JOY.hide(bool)）
src/assets.js         ASSETS = { key: 'assets/img/<key>.<ext>' } 圖片清單
src/engine.js         canvas、fit()（visualViewport 尺寸、safe-area SA）、圖片載入 I[key]、亂數工具
src/data.js           CHESTS、EN（敵人）、SK（技能）、ITEMS、PORT（立繪 key）、NAMES、G（遊戲狀態）、mk()
src/maps.js           地圖/場景：手繪斜視背景、碰撞遮罩（getImageData）、物件、出入口、loadMap()
src/story.js          劇情事件與對白（newGame、say、boat、talisman、boss、ending…）、存檔點 saveCP/retry
src/battle.js         戰鬥邏輯：startBattle、exec（玩家指令）、enemyPhase、dmg/hit/heal、wr（訊息+特效規格）
src/input.js          鍵盤與 press(k)（'up/down/left/right/ok/cancel'）
src/update.js         地圖模式更新：自由移動（非格子）、同伴跟隨、互動判定
src/ui.js             UI 繪圖工具：UI()（重設 transform 為 CSS px）、FS() 字級、txt/box/rr/wrap、對話框 drawDlg（半身立繪）
src/render.js         drawWorld（地圖、y-sort 物件、角色）、drawBoat（夜渡場景）
src/fx.js             戰鬥 VFX：粒子池 VPT（上限 VMAX=160）、startFx、drawVFX、shake/flash
src/battle_ui.js      drawBattle：敵我站位、KO 溶解、傷害數字、底部面板；觸控 bTap / B.hit 點擊區
src/screens.js        標題、CREDITS、全滅、結局畫面
src/main.js           frame() 主迴圈（try/catch → window.__err）、測試掛勾
assets/img/           所有圖片（webp/png/jpg），由舊版 base64 抽出
legacy/village.html   早期村莊原型（獨立單檔，僅保存）
chapter1.html, village.html   舊網址轉址頁
CREDITS.txt           素材來源（必須保留）
tests/                Playwright 測試，見 tests/README.md
package.json          只給測試用（npm test）
```
**載入順序**（index.html）：joystick → assets → engine → data → maps → story → battle → input → update → ui → render → fx → battle_ui → screens → main。
classic script 的 function 宣告只在該檔執行時才建立，所以**載入時（top-level）立即執行的程式碼只能呼叫前面檔案的東西**；在 frame()/事件中呼叫則不受限。新增檔案時放在正確位置。

## 4. 美術 / UX 規則（務必遵守）
- **地圖**：手繪、斜視（oblique / 3/4 俯視）風格的整張背景圖 + 獨立物件做 y-sort 遮擋；不是方塊 tilemap。
- **自由移動**（free movement，非格子），碰撞用遮罩圖；同伴跟隨走過的路徑。
- **角色 sprite 必須與立繪（portrait）一致**（髮型、服裝、配色）。新增角色時兩者一起做。
- **對話立繪 = 半身 bust**：要看得到**下巴與肩膀**，不可只裁到臉。
- **觸控**：覆蓋式虛擬搖桿（左下）+ A/B（右下），只在觸控裝置顯示；**戰鬥中隱藏搖桿**（`JOY.hide(true)`），戰鬥改用直接點擊。
- **戰鬥版面**：**底部面板，左邊隊伍狀態（立繪、HP/MP）、右邊指令**；敵人在上方，訊息列在頂部；點擊區登記在 `B.hit`。
- **尺寸**：canvas 依 `visualViewport` 計算（`fit()`），UI 讓開 safe area（`SA.t/r/b/l`，`viewport-fit=cover`），字級用 `FS()`。直式 375x553 ~ 430x750、橫式 664x390 ~ 844x390 都要不跑版。
- **戰鬥特效**：全部 canvas 繪製；每個動作約 0.5–0.9 秒；粒子上限 160（iPhone 效能）；會心/大傷害才震動+白閃。
- 戰鬥訊息可為 `[text, fxSpec]`，訊息出現（或被跳過）時 `startFx` 啟動，傷害數字在特效命中時間（`VIMP`）才跳出。

## 5. 版本號規則
- 目前 **v13**。每次上線改動都要 +1（下一版 **v14**），三處一起改：
  1. `index.html` `<title>雲渡仙緣 第一章 vN</title>`
  2. `src/screens.js` 標題畫面 `'版本 vN'`
  3. `src/render.js` 地圖右下角 `'vN'`
- `grep -rn "v13" index.html src` 確認全換。上線前可對前一版打 git tag（如 `v13`）以便回滾。

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
- 不要讓搖桿在戰鬥中出現、不要把戰鬥指令移離底部面板右側、不要把立繪裁到看不到下巴與肩膀。
- 不要忘記 bump 版本號；不要 push 沒跑過 `npm test` 的改動。
