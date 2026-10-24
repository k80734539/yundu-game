# v22 斜角站位戰鬥（仙劍式）

取代 v17–v21 的「底部面板＋竹篙」戰鬥。v21 側視戰鬥（PR #9、`qzb_*`）已擱置，本版不以它為基底。

## 角色影格
- 每格 **480×420 透明 PNG**，腳底基準線 **y=355**、水平置中 **x=240**；角色面向左上、背對鏡頭，只露出左半身。
- 三人共用縮放 **`BFR.scale = 0.62`**（畫面係數 `U`＝min(寬/390, 高/844)；直式 390×844 時青舟待機約 140px 高）。
- 檔名：`qzd_*`（青舟）、`bld_*`（白苓）、`yxd_*`（雲纖），皆為 `assets/img/*.webp`，註冊在 `src/assets.js`。

| 角色 | 影格 |
|---|---|
| 青舟 qzd | idle0 idle1 charge thrust recover sweepwind sweep hit down win |
| 白苓 bld | idle0 idle1 cast0 cast1 recover spring guard hit down win |
| 雲纖 yxd | idle0 idle1 charge slash0 slash1 recover skill hit down win |

- `win` 影格面向鏡頭，只在勝利畫面使用；`down` 倒下後保持到戰鬥結束。
- 待機兩幀每 600ms 交替（三人錯開一拍）。

## 站位（直式 390×844 設計座標）
- 我方腳底（左上→右下）：雲纖 (185,505)、青舟 (262,585)、白苓 (335,665)。
- 敵人：左上，1 隻 (110,360)；2 隻 (80,318)(142,392)；3 隻 (36,250)(84,314)(132,378)；Boss (108,390)。
- 全部人物與敵人腳下畫柔和橢圓影子。座標依 `U` 等比縮放；橫式另有一組座標（我方在右、敵人在左）。
- 繪製順序：敵人 → 敵人名字／血條 → 我方（依腳底 y 由上往下）→ VFX → 角色卡／指令鈕 → 傷害數字。

## 動作（`src/battle_motion.js` 的 `BPLAN`）
| 動作 | 影格序列（ms 從特效啟動算起） | 命中 |
|---|---|---|
| 青舟普攻 | charge(0–200) → thrust(–440) → recover(–650) → idle，向敵人滑步再回位 | 340ms（delay 230＋VIMP.slash 110，與 v20 相同） |
| 青舟橫掃 | sweepwind → sweep → recover | VIMP.sweep |
| 白苓普攻 | cast0 → cast1 → recover（爪擊特效不變） | |
| 白苓狐火 | cast0 → cast1 → recover（狐火特效不變） | |
| 白苓春霖 | spring | |
| 白苓防禦 | guard（保持到下回合） | |
| 雲纖普攻 | charge → slash0 → slash1 → recover，衝出再回位 | 340ms |
| 雲纖技能 | skill | |
| 受擊 | hit（約 450ms） | |
| 倒下／勝利 | down（保持）／win | |

滑步只改畫面座標；傷害、命中時間、AI、勝負流程都由原本的 `battle.js`／`fx.js` 決定。點擊跳過訊息時，衝刺類動作直接拉到命中瞬間（`finishBattleMotion`）。

## UI
- 指令是八角小圖示鈕（深藍底、金邊、遊戲字型）：攻、技、道、**防**（右下往上，每 50px 一顆），**逃**在左上；點擊範圍 ≥46px。
  使用者清單只列 攻／技／道／逃，但戰鬥邏輯另有「防禦」（驅動白苓 guard 影格），所以多放一顆「防」。
- 底部三張角色卡：頭像、名字、Lv、HP/MP；行動中的角色卡金框高亮；倒下變暗。
- 頭像：`pt_bl_battle.webp`／`pt_yx_battle.webp` 由角色設計稿裁切（見下）；**青舟沒有設計稿，沿用 `pt_qz.jpg`（像素風，與另外兩張水彩風不一致）**。原本對話用的 `pt_*.jpg` 沒有改動。

## 已知待辦（TODO）
1. **青舟 `hit` 影格需重畫**：使用者提供的 hit 圖臉朝右，不可用；目前 `qzd_hit.webp` 是 `qzd_down.webp` 的複本（待重畫），重畫後只要覆蓋該檔並 `ASSET_V` +1。
2. **怪物需重畫**：`shui`／`lu`／`hebo` 仍是舊圖（只調整位置並加影子），風格與新角色不一致。
3. **白苓 `recover` 看起來像 idle**，收招不明顯。
4. 青舟戰鬥頭像（見上）需用設計稿重做。
5. 雲纖在第一章不入隊，只有在測試裡才會進入戰鬥；其技能沒有資料，`sweep`／`foxfire`／`rain` 類技能都映射成 `skill` 影格。
6. 指令鈕在直式 390 寬時會壓到白苓（站位與使用者指定座標 x≈350 重疊）；目前不影響操作，因為選隊友時鈕會隱藏。

## 素材處理
使用者提供的 AI 生成圖（`/workspace/yundu/art/{qzd,bld,yxd}/out/`），以箱內腳本轉成 webp。授權說明見 `CREDITS.txt`。
