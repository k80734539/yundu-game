# tests/ — 無頭瀏覽器測試（Playwright）

遊戲本身**不需要 build**；`package.json` 只是給測試用。

## 安裝
```bash
npm install
npx playwright install chromium      # 或改用系統 Chrome：export CHROME_PATH=/usr/bin/google-chrome
```

## 執行
| 指令 | 內容 |
|---|---|
| `npm test` | 全部：完整通關（直式 390x664、橫式 844x390）+ 5 尺寸觸控戰鬥 + 5 尺寸截圖 + VFX 定格 |
| `npm run test:play [-- W H touch]` | 第一章完整通關（村莊→夜渡戰→蘆葦蕩→河神廟 Boss→結局） |
| `npm run test:touch` | 用 `touchscreen.tap` 點八角指令鈕與敵人；確認戰鬥中搖桿隱藏、戰後恢復 |
| `npm run test:screens` | 5 尺寸截圖：title / dialog / village / dock / battle_menu |
| `node tests/audio-library.mjs` | 使用者音檔解碼與實際輸出、場景切歌、環境音、獨立靜音保存、快取上限、暫停恢復、音效觸發及回退 |
| `node tests/villagers.mjs` | 五位村民：原圖身份對應、透明半身像、192px 地圖角色縮放與腳底、互動碰撞不變、橫直對話截圖 |
| `node tests/night-rescue.mjs` | 五種手機尺寸＋1894×870 桌機：船艙腳底、水面裁切、竹篙接點、上船連續動作、對話避讓與跳過 |
| `node tests/village-layout.mjs` | 蘆花渡村 42×28 地圖：碰撞格可達村民、住家、渡口，並驗證退水與黎明水位變化 |
| `node tests/exploration-ui.mjs` | 四尺寸探索 HUD、選單真實資料、移動暫停、設定保存與鍵盤焦點 |
| `node tests/temple-walk.mjs` | 河神廟遮罩、左右支路與互動點可達、阻擋及隨機移動 |
| `node tests/reeds-maze.mjs` | 蘆葦蕩迷宮：實際控制器走完岔路與三寶箱、妖根前後通路、水岸與斜向搖桿碰撞、營火回復與安全存檔、河神廟出口；直式與橫式截圖 |
| `node tests/reeds-debug.mjs` | `?debug=col` 蘆葦蕩道路聯集碰撞紅色除錯圖層，逐點對照 `blocked()` 並保存直式／橫式截圖 |
| `node tests/chapter1-mechanics.mjs` | 渡水一擊習得、舊存檔遷移、重打不重複、三寶箱效用、河伯半血階段訊息與濁浪回合間隔 |
| `node tests/battle-feedback.mjs` | 實際音訊、手勢解鎖、靜音保存、無音訊 API、命中定格與受擊回位，不重算傷害 |
| `node tests/portrait-ui.mjs` | 六尺寸：透明半身圖、戰鬥／對話共用素材、頭像點選隊友、畫面與觸控範圍 |
| `node tests/hero-assets.mjs` | 30 張原色角色圖載入、透明邊緣、裁切、腳底範圍、紅色細節與受擊／倒下姿勢區分 |
| `node tests/battle-backgrounds.mjs` | 三個戰鬥背景 × 六尺寸：高解析素材、裁切、腳底落地與避開欄杆／水面／場景邊緣；保存實機截圖 |
| `node tests/enemy-layout.mjs` | 六尺寸單敵／雙敵／三敵／河伯的中央留白、左右對陣、向右上斜排、裁切與血條避開底部頭像檢查；保存站位截圖 |
| `npm run test:diag` | v25 左右斜排：30 張影格素材、版面（不重疊、觸控目標 ≥44px、共用縮放 BFR.scale＝.39、我方身高≈SH/8、站位間距 ≥70、敵我與指令鈕不重疊、衝刺停在敵人旁）、待機 600ms 交替、青舟／白苓／雲纖各招式 pose 時間軸（青舟 340ms 命中、滑步回位）、受擊／倒下／勝利、快速略過、旋轉、缺圖（5 尺寸＋390×844） |
| `npm run test:fx [-- --all]` | 11 種戰鬥特效定格截圖（預設直+橫，`--all` = 5 尺寸） |
| `npm run test:polish` | 390x664／844x390：新 NPC、營火、救人、河伯消散、雲纖降下、黎明漸亮與回退檢查 |
| `npm run test:save` | 存檔：選單→存檔→重新整理→繼續遊戲，比對位置/道具/旗標；壞檔、戰鬥中不能存（直+橫） |
| `npm run compare -- <baselineDir>` | 逐像素比對 `fx/`、`screens/` 與 baseline |
| `npm run serve` | 本機預覽 http://127.0.0.1:8080/ |

尺寸：直式 390x664、375x553、430x750；橫式 664x390、844x390（皆 `isMobile + hasTouch`）。

輸出在 `tests/out/`（已 gitignore）。任何 `pageerror`、`console.error`、或遊戲 `frame()` 捕捉到的 `window.__err` 都會讓測試 FAIL（exit 1）。

`npm test` 包含上述演出檢查。`tests/out/polish/<尺寸>/` 會保存 `camp`、`yunxian`、`lin`、`zhou` 等截圖；測試同時確認演出不修改台詞資料、戰鬥數值、玩家與 NPC 碰撞座標，且快速跳過對話能正常進入戰鬥。

## 注意
- 測試內建 http 伺服器；**不要用 file://** 開遊戲（`maps.js` 對碰撞遮罩 `getImageData`，file:// 會讓 canvas 被污染）。
- `fx` 與 `screens` 用 `page.clock`（install → pauseAt → runFor）＋固定 `Math.random` 種子，所以可逐像素比對；`play`/`touch` 是即時執行，有隨機性，不做像素比對。
- 視覺回歸流程：改動前 `OUT_DIR=/tmp/base npm run test:screens && OUT_DIR=/tmp/base npm run test:fx -- --all`，改完再跑一次（不設 OUT_DIR），然後 `npm run compare -- /tmp/base`。若改動本來就會改畫面（例如版本號），差異只應出現在預期位置。
- 也可對線上或其他版本測試：`URL=https://k80734539.github.io/yundu-game/ npm run test:screens`（play/touch/fx/screens 皆支援 `URL`）。
- 測試掛勾（在 `src/main.js`）：`G_()`、`press(k)`、`TP(x,y,dir)`、`M_()`、`__sb(enemies,opt)` 開戰、`__ex(pend,target)` 執行指令、`__ep()` 敵方行動、`mk(...)` 建角色。請保留。

`npm test` 同時執行 `sprite-size.mjs`（v20 回歸，地圖上的角色 sprite；戰鬥角色影格另由 diag-battle.mjs 檢查縮放；監聽所有 drawImage，角色 sprite 不得超大；含長時間走路、被物件遮住的剪影、舊快取圖片＋新 JS；`npm run test:spritesize`）與 `qz-sprite.mjs`（v19 青舟／白苓／雲纖 192×192／4 幀 sprite：48 張載入、走路循環、腳底錨點與身高、王大叔舊 72×66 不變；`npm run test:qzsprite`）與 `attack-motion.mjs`，定格截圖放 `tests/out/attack-motion/<尺寸>/`。青舟普攻使用手繪竹篙與三張攻擊姿勢；測試額外驗證握點、拖尾尖端一致、缺圖回退與粒子上限。傷害與回合規則不變。
