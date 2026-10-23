# 第一章演出美術來源與提示詞

本次圖片使用內建 **OpenAI image_gen** 製作（`art_source: host_image`），參考圖只來自本專案現有角色，沒有新增第三方素材包。原有 CREDITS 保留，並在 CREDITS.txt 補登。本文件亦為可重做素材的提示詞組；生成不保證逐像素相同。

## 角色定稿與規格

| 素材 | 外觀與用途 | 匯出 |
| --- | --- | --- |
| `assets/img/lin.webp` | 林嬸：中年洗衣婦、青綠頭巾、灰黑髮髻、藍色交領上衣、米色圍裙、赭色裙、木洗衣盆 | RGBA、72×66，身高 60 px，腳底基線 64 px |
| `assets/img/zhou.webp` | 老周：瘦削老船夫、灰白髮髻、短鬍、補丁灰綠衣、繩腰帶、草鞋、漁網與補網針 | RGBA、72×66，同一腳底基線 |
| `assets/img/pt_lin.webp` | 與林嬸地圖造型一致，完整下巴與雙肩 | 256×256 胸像 |
| `assets/img/pt_zhou.webp` | 與老周地圖造型一致，完整下巴與雙肩 | 256×256 胸像 |
| `assets/img/campfire.webp` | 交錯焦木、紅炭、金橙火焰，六幀循環 | RGBA、768×512，3×2 格，每格 256×256，9 fps |
| `assets/img/pt_qz_startled.webp` | 青舟救人時驚訝／擔心的表情，維持服裝與構圖 | 192×192 |
| `assets/img/pt_bl_quiet.webp` | 白苓夜談時低垂目光、柔和帶憂慮的表情 | 192×192 |

NPC 原圖具有真正的 alpha 透明度，沒有將黑底當透明；縮放採 Lanczos。兩位 NPC 地圖圖均為完整身形，按相同身高與腳底基線放入固定畫布。火焰以同一格大小與焦木基線校正，火星及暖光由 canvas 依時間繪製，失去圖集時退回簡單火焰與木柴。

## 最終提示詞組

### 林嬸地圖角色

Create a NEW original NPC map sprite. Existing granny and fisherman are STYLE, proportion and oblique camera references only. Aunt Lin is a lively middle-aged Chinese riverside village washerwoman about 48: kind face, dark hair with gray strands in a low bun and muted jade headscarf, teal-blue cross-collar rolled-sleeve blouse, russet long skirt, faded beige apron, cloth shoes, small wooden wash tub at her hip. She must be distinct from the elderly purple grandmother and orange-robed man. Hand-painted detailed miniature Chinese fantasy RPG, slightly stylized proportions, oblique 3/4 overhead view facing toward the viewer, full body and feet, generous real alpha transparency, no text, border, separate props or cast shadow. Readable at 72×66 with 60px body height.

### 老周地圖角色

Create a NEW original elderly fisherman NPC, using the existing fisherman only as style/proportion/camera reference. Old Zhou is lean and weathered, about 68: angular tanned face, silver eyebrows, short silver mustache and pointed beard, salt-and-pepper topknot, faded moss-gray patched cross-collar tunic, charcoal calf trousers, ochre rope sash, straw sandals, folded fishing net and wooden net-mending needle. Watchful and dryly kind. He is not the round dark-bearded orange-robed man. Hand-painted miniature RPG, oblique 3/4 overhead camera, full body, real alpha, no scene, text, border, disconnected props or ground shadow.

### 林嬸／老周胸像

Use the accepted new map character as the identity reference, preserving face, age, hair, garments and personal tools. The original granny / Wang portrait supplies only the portrait style and framing; never copy their identity or clothing. Square hand-painted Chinese fantasy RPG bust, warm dimensional skin and cloth, dark indigo softly shaded background, full chin, neck, both shoulders and upper chest, slight three-quarter view. Lin has a friendly knowing smile and washing tub at the lower edge; Zhou is elderly, lean and rugged with a restrained kind gaze and fishing net. No text, border, watermark or unrelated accessories.

### 營火圖集

Exactly six animation frames in a 3-column by 2-row equal-cell grid with transparent gutters, no grid lines or labels. The same hand-painted rustic campfire from a slightly elevated oblique RPG view: crossed charred logs, red embers, amber/orange flames and pale yellow core. Animate left sway, rise, right sway, split, contraction and return; keep log shape, camera, scale and ground contact consistent. All silhouettes fit within cells with generous margin. Real alpha, no scene, disconnected sparks, text or watermark.

### 青舟／白苓表情

Edit only the facial expression of the existing project portrait. Preserve exact character identity, hair, clothing, painted/pixel-textured style, square framing, full chin, shoulders and indigo background. Qingzhou is briefly startled and concerned during rescue: slightly widened eyes, lifted brows and softly parted mouth. Bailing is vulnerable and reflective by the fire: slightly lowered gaze, soft worried brows and restrained bittersweet smile. No new accessories, props, streaming tears or text.

## 演出範圍

`src/script.js` 與 `docs/ch1_script_v14.md` 保持原樣。`src/cinematics.js` 只讀取段落索引，鏡頭／角色走位是顯示座標，不寫回碰撞座標。停頓、表情、淡入淡出、震動、閃白均不會鎖住 A／B 或替玩家跳台詞。所有戰鬥參數、隨機遇敵與戰鬥 VFX 都保留原程式。
