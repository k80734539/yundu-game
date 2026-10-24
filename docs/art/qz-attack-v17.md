> **v21 註記**：`qz_pole`／`qz_atk_*` 已移除，改為 `qzb_*` 12 張戰鬥姿勢（見 `docs/art/qz-battle-v21.md`）。以下為 v17 歷史記錄。

# v17 青舟武器與攻擊姿勢

來源：內建 OpenAI `image_gen`，`art_source: host_image`。身份與畫風參考只使用本專案 `qz_left0.webp`、`pt_qz.jpg`。四張原創圖片，不含第三方素材包；原 CREDITS 保留。未使用影片生成，三張為獨立繪製的靜態關鍵姿勢，由 Canvas 時間軸搭配武器旋轉和位移。

| 素材 | 規格與用途 |
| --- | --- |
| `assets/img/qz_pole.webp` | 64×512、RGBA，金褐舊竹篙、竹節與褐紅纏繩；握點在長度 69%，軸心 x=32 |
| `assets/img/qz_atk_windup.webp` | 256×256，雙手後拉舉高、後腿蓄力 |
| `assets/img/qz_atk_strike.webp` | 256×256，前腿踏出、肩臂向前送出斜劈 |
| `assets/img/qz_atk_recover.webp` | 256×256，手臂下壓、重心落穩收招 |

姿勢保留真透明 alpha（0–255），保留完整頭髮、手腳。以 alpha>128 的身形範圍裁切，Lanczos 等比縮至身高224 px，放入256方形畫布，腳底248 px。三個手部握點分別為 (176.26,52.07)、(43.37,125.66)、(132.08,156.48)。武器繪製在閉合手掌後面；手掌與武器共用握點，角色本體不旋轉。

## 最終提示詞組

**竹篙**：One original game prop: Chen Qingzhou's weathered bamboo punting pole. Match the supplied miniature hand-painted Chinese fantasy RPG character. Sturdy straight old bamboo shaft, thick visible bamboo nodes, warm ochre-gold textured skin, darker worn ends and short dark red-brown cord at the grip. Entire pole vertical, straight center axis, substantial readable thickness. Real transparent alpha, generous margins, no hand, character, background, shadow, text, blade, guard or disconnected decorations.

**三姿勢共用**：A SINGLE full-body action key-pose still of the exact supplied Chen Qingzhou, facing LEFT in side/three-quarter oblique miniature RPG view. Black tied hair and trailing dark-red headband, navy split tunic with pale trim and cloth sash, gray trousers and black boots. Match painterly project style and portrait identity. Full head, hands and feet on true transparent alpha. Both closed gripping hands together around ONE common point for a separately rendered pole. No weapon, scene, shadow, text or particles.

**蓄力**：Staggered bent legs, weight pulled onto rear RIGHT leg, torso twisting back while head looks LEFT. Both gripping hands raised and pulled back to RIGHT side of the head, elbows bent, preparing a powerful diagonal overhead strike.

**揮出**：Decisive forward LEFT lunge, front knee bent and rear leg pushing off, shoulders driving LEFT. Both hands together in front of the chest toward LEFT, extending into a heavy diagonal down-left strike; coat tails flare backward RIGHT. Different arm and leg silhouette from windup and idle.

**收招**：Low completed follow-through after diagonal down-left strike, front foot planted wide, knees flexed, torso settled forward. Both hands together low at the left hip/knee, arms diagonally down-left; hair and coat tails settle backward RIGHT.

## 匯出 QA

四張 runtime WebP 均已檢視，三姿勢的掌心握點已以標記圖與遊戲截圖核對。沒有宣稱執行影片／Forge clips 的完整 QA；本次是靜態圖片註冊與 Playwright 動作驗證。

Runtime SHA-256：

```json
{
  "qz_pole": {
    "sha256": "83f50f137017ee02b6bea3d4552d36a30880d5c868e0d9a6aca31c4aff89a42e"
  },
  "qz_atk_windup": {
    "sha256": "05354e1219b3dd0b1b21a4ef2f9cdd1a881d4932768ae58c2882f6476f93bb9c"
  },
  "qz_atk_strike": {
    "sha256": "2d851e7b15896b0b5aa9febc873e845a56603bedee800d784a481cbf51c9ba07"
  },
  "qz_atk_recover": {
    "sha256": "1deabc721f0da4c60b9cefd3a66318333232f5fb24b96997d9a9ca02b23baace"
  }
}
```
