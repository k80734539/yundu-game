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
| `npm run test:touch` | 用 `touchscreen.tap` 操作底部戰鬥面板；確認戰鬥中搖桿隱藏、戰後恢復 |
| `npm run test:screens` | 5 尺寸截圖：title / dialog / village / dock / battle_menu |
| `npm run test:fx [-- --all]` | 11 種戰鬥特效定格截圖（預設直+橫，`--all` = 5 尺寸） |
| `npm run test:polish` | 390x664／844x390：新 NPC、營火、救人、河伯消散、雲纖降下、黎明漸亮與回退檢查 |
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
