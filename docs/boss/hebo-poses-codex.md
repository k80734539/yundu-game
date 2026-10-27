請在新分支 `codex/hebo-poses` 工作，**從 `claude/temple-v52-design` 建立**（不是 main）。
開工前先讀 `AGENTS.md`、`docs/art/style-guide.md`、`docs/boss/hebo-fun-v1.md`。

## 目標
河伯 Boss 戰要變好玩（設計見 `docs/boss/hebo-fun-v1.md`），需要河伯多幾個**新動作圖**。請生成並放進專案。
**只做圖片與登記，不要改任何戰鬥邏輯、數值、UI 程式**（我這邊同時在改 `src/battle.js`、`src/battle_ui.js`、`src/data.js`，改到會衝突）。

## 現有素材（先看，新圖必須跟它們一致）
`assets/img/hebo_idle0.webp`、`hebo_idle1.webp`、`hebo_cast.webp`、`hebo_attack.webp`、`hebo_hit.webp`、`hebo_down.webp`
- 每張 **512×512 透明背景 webp**；河伯盤繞，身體底部貼在 y≈476，水平置中；可見範圍約 x 91–420。
- 畫風：水彩手繪＋淡墨線，青綠鱗片、金色鬃角、額頭貼一張黃色控妖符。畫面朝右下（面向我方）。
- 新圖要放在同一個尺寸、同一個腳底線與置中位置，疊在舊圖上不會跳位或忽大忽小。

## 要生成的新動作（共 8 張）
一次請 GPT 畫「同一張圖並排多格」，再切開，動作一致性才好（見 AGENTS／CLAUDE 的走路循環教訓）。
1. `hebo_charge0.webp`、`hebo_charge1.webp`　**蓄力**（2 格循環）：身體微微升高、河水在周身螺旋上升、鱗片發亮、眼睛微亮、額頭符紙發光。兩格差在水流與光暈位置，可循環。
2. `hebo_stagger.webp`　**失衡**：符紙裂開掉落，頭低垂、身體搖晃、眼神渙散。
3. `hebo_drink.webp`　**吞水**：頭抬高，水柱從下方流入口中，像在回復。
4. `hebo_whirl.webp`　**漩渦**：一隻爪向前橫掃，爪下水面捲出漩渦。
5. `hebo_rage0.webp`、`hebo_rage1.webp`　**階段二待機**（2 格）：眼睛赤紅微亮、符紙顯得更鮮豔且帶紫光、身形更緊繃；用來取代階段二的 idle。
6. `hebo_wave.webp`　**濁浪釋放**：張口怒吼、身體後仰，前方一道大浪（浪留在畫面內、不超出 512×512）。

另外一張特效圖：
7. `fx_whirl.webp`　**漩渦特效**（512×512 透明，無角色）：俯視偏斜的水漩渦，中心偏下，可疊在角色腳下。

## 去背與處理
- 優先請 GPT 直接輸出**原生透明背景**；若是色鍵（洋紅底），用 `tools/chroma_key.py` 類流程去背（參考 `tools/` 內既有匯入工具與 `docs/art/laolu-v49/` 的做法）。
- 以舊圖 `hebo_idle0.webp` 當基準對齊：同樣的腳底線（y≈476）與水平中心；可見寬度與舊圖相近（±10%）。
- 生成原圖、提示詞、處理方式存到 `docs/art/hebo-poses/`（含 README）。

## 登記
- 把新檔加進 `src/assets.js` 的 `ASSETS`（只加條目）。
- **不要改 `ASSET_V` 與 index.html 的 `?v=`，也不要動版本號**（我整合時統一升）。新檔名是新的，不會有舊快取問題。
- 不要改 `EART`、`battle_ui.js`、`battle.js`。

## 驗證
- 新增 `tests/hebo-poses.mjs`：檢查每張 512×512、有 alpha、可見範圍底邊 y 在 476±6、水平中心在 256±20、可見寬度在 `hebo_idle0` 的 0.8–1.25 倍。把它加進 `tests/run-all.mjs`。
- 另外做一張對照圖 `docs/art/hebo-poses/contact.png`：舊 6 張＋新 8 張排在同一腳底線上，目視確認大小一致。
- 跑 `npm test`（或相關分組）全部要過，JS errors 要空。

## 規則
- 完成後直接 commit 到 `codex/hebo-poses` 並 push，**不要開 PR、不要合併**。
- 回報：列出新檔、對照圖路徑、測試結果；哪一張不滿意要明說，不要硬塞。
- 不要抄《仙劍奇俠傳》等既有作品；沿用河伯原設定（水龍、控妖符）。
