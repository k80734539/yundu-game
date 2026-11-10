#!/usr/bin/env python3
"""把「8 方向轉身圖」（PixelLab 匯出的 8 格 GIF，順序：下、右下、右、右上、上、左上、左、左下）轉成遊戲用的 8 列精靈圖：
   192×192 一格、10 格一列（0~1 站立、2~5 走路、6~9 攻擊）、共 8 列，列的順序為 下、左下、左、左上、上、右上、右、右下。
   轉身圖只有靜態姿勢，所以動作先用程式「晃動」烘進去；之後拿到真正的走路／攻擊動畫，再用 --walk / --attack 取代對應格。
用法：python3 tools/make_sheet8.py 輸入.gif 輸出.png [--scale 2]
"""
import sys
from PIL import Image, ImageSequence
FRAME_ORDER = [0, 7, 6, 5, 4, 3, 2, 1]                      # 列 → 轉身圖的第幾格
FWD = [(0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1)]  # 各列「往前」的畫面方向（攻擊衝刺用）
# 真正的跑步動畫：方向 → (檔案, 是否鏡像)。列：S=0 NW=3 N=4 NE=5（NE 由 NW 鏡像）
RUN = {2: ('assets/sprites/src/novice_run_W.gif', False), 6: ('assets/sprites/src/novice_run_E.gif', False), 1: ('assets/sprites/src/novice_run_SW.gif', False), 7: ('assets/sprites/src/novice_run_SE.gif', False), 0: ('assets/sprites/src/novice_run_S.gif', False), 3: ('assets/sprites/src/novice_run_NW.gif', False),
       4: ('assets/sprites/src/novice_run_N.gif', False), 5: ('assets/sprites/src/novice_run_NW.gif', True)}
# 真正的攻擊動畫（13 格、84×84）：列 → 檔案；挑 4 格放在 6~9 格（起手、出手、揮擊、收招）
ATK = {0: 'assets/sprites/src/novice_atk_S.gif', 4: 'assets/sprites/src/novice_atk_N.gif'}
ATK_PICK = [1, 2, 3, 12]
def atk_frames(path, scale):
    im = Image.open(path); fr = [f.convert('RGBA').copy() for f in ImageSequence.Iterator(im)]
    out = []
    for i in ATK_PICK:
        f = fr[i]; b = f.split()[3].getbbox()
        out.append((f.resize((f.width * scale, f.height * scale), Image.NEAREST), b[3] * scale))   # 整張畫布放大，腳底 y = bbox 底
    return out
def run_frames(path, mirror, scale):
    """跑步 GIF → 挑 4 格（平均取樣），裁切後放大；回傳 [(影像, 腳底相對偏移)]，水平中心固定、腳底以最低點為基準"""
    fr = [f.convert('RGBA').copy() for f in ImageSequence.Iterator(Image.open(path))]
    n = len(fr); pick = [fr[int(i * n / 4)] for i in range(4)]
    if mirror: pick = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in pick]
    bbs = [f.split()[3].getbbox() for f in pick]
    cx = sum((b[0] + b[2]) / 2 for b in bbs) / 4; base = max(b[3] for b in bbs)
    out = []
    for f, b in zip(pick, bbs):
        c = f.crop(b).resize(((b[2] - b[0]) * scale, (b[3] - b[1]) * scale), Image.NEAREST)
        out.append((c, round(((b[0] + b[2]) / 2 - cx) * scale), (b[3] - base) * scale))
    return out
def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; scale = 2
    if '--scale' in sys.argv: scale = int(sys.argv[sys.argv.index('--scale') + 1])
    src, dst = a[0], a[1]
    frames = [f.convert('RGBA').copy() for f in ImageSequence.Iterator(Image.open(src))]
    assert len(frames) == 8, '需要 8 格轉身圖'
    runs = {r: run_frames(p, m, scale) for r, (p, m) in RUN.items()}
    atks = {r: atk_frames(p, scale) for r, p in ATK.items()}
    sheet = Image.new('RGBA', (192 * 10, 192 * 8), (0, 0, 0, 0))
    for row, fi in enumerate(FRAME_ORDER):
        fr = frames[fi]; fr = fr.crop(fr.split()[3].getbbox()); fr = fr.resize((fr.width * scale, fr.height * scale), Image.NEAREST)
        fx, fy = FWD[row]
        for f in range(10):
            dx = dy = 0
            if f < 2: dy = -(f % 2)
            elif f < 6: ph = f - 2; dy = [0, -2, 0, -2][ph]; dx = [-1, 0, 1, 0][ph]
            else: k = [-2, 6, 4, 0][f - 6]; dx = fx * k; dy = fy * k // 2
            cell = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
            if row in RUN and 2 <= f < 6:
                c, ox, oy = runs[row][f - 2]
                cell.alpha_composite(c, (96 - c.width // 2 + ox, 186 - c.height + oy))
            elif row in ATK and f >= 6:
                c, foot = atks[row][f - 6]
                cell.alpha_composite(c, (96 - c.width // 2, 186 - foot))
            else:
                cell.alpha_composite(fr, ((192 - fr.width) // 2 + dx, 186 - fr.height + dy))
            sheet.alpha_composite(cell, (f * 192, row * 192))
    sheet.save(dst); print('已輸出', dst, sheet.size)
main()
