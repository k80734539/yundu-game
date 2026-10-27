from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "assets" / "img"
POSES = [
    "hebo_charge0", "hebo_charge1", "hebo_stagger", "hebo_drink",
    "hebo_whirl", "hebo_rage0", "hebo_rage1", "hebo_wave",
]
ALPHA_CUTOFF = 8
POSE_SCALE = 0.85
ANCHOR_X = 256
ANCHOR_BOTTOM = 476


def alpha_bounds(image):
    alpha = image.getchannel("A").point(lambda value: 255 if value > ALPHA_CUTOFF else 0)
    return alpha.getbbox()


sheet = Image.open(HERE / "hebo_pose_sheet_original.png").convert("RGBA")
cell_w, cell_h = sheet.width // 3, sheet.height // 3
assert sheet.width % 3 == sheet.height % 3 == 0

for index, name in enumerate(POSES):
    if name == "hebo_stagger":
        cell = Image.open(HERE / "hebo_stagger_original.png").convert("RGBA")
        cell.putalpha(cell.getchannel("A").point(lambda value: value if value > ALPHA_CUTOFF else 0))
        cell = cell.crop(alpha_bounds(cell))
        ref = Image.open(OUT / "hebo_idle0.webp").convert("RGBA")
        ref_width = alpha_bounds(ref)[2] - alpha_bounds(ref)[0]
        size = round(ref_width / cell.width * cell.height)
        cell = cell.resize((ref_width, size), Image.Resampling.LANCZOS)
    else:
        col, row = index % 3, index // 3
        cell = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        cell.putalpha(cell.getchannel("A").point(lambda value: value if value > ALPHA_CUTOFF else 0))
        size = round(cell_w * POSE_SCALE)
        cell = cell.resize((size, size), Image.Resampling.LANCZOS)
    bounds = alpha_bounds(cell)
    assert bounds, f"{name}: empty alpha"
    x0, y0, x1, y1 = bounds
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    dx = round(ANCHOR_X - (x0 + x1) / 2)
    dy = ANCHOR_BOTTOM - y1
    canvas.alpha_composite(cell, (dx, dy))
    canvas.save(OUT / f"{name}.webp", "WEBP", lossless=True, method=6)

fx = Image.open(HERE / "fx_whirl_original.png").convert("RGBA")
fx.putalpha(fx.getchannel("A").point(lambda value: value if value > ALPHA_CUTOFF else 0))
fx = fx.crop(alpha_bounds(fx))
fx_width = 430
fx_height = round(fx.height * fx_width / fx.width)
fx = fx.resize((fx_width, fx_height), Image.Resampling.LANCZOS)
fx_canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
fx_canvas.alpha_composite(fx, ((512 - fx_width) // 2, 324 - fx_height // 2))
fx_canvas.save(OUT / "fx_whirl.webp", "WEBP", lossless=True, method=6)

contact_names = [
    "hebo_idle0", "hebo_idle1", "hebo_cast", "hebo_attack",
    "hebo_hit", "hebo_down", *POSES,
]
cell_h = 550
contact = Image.new("RGB", (4 * 512, 4 * cell_h), (30, 39, 48))
from PIL import ImageDraw
draw = ImageDraw.Draw(contact)
for index, name in enumerate(contact_names):
    col, row = index % 4, index // 4
    x, y = col * 512, row * cell_h
    sprite = Image.open(OUT / f"{name}.webp").convert("RGBA")
    contact.paste(sprite, (x, y + 30), sprite)
    draw.text((x + 8, y + 7), name, fill=(238, 226, 196))
    draw.line((x + 12, y + 30 + ANCHOR_BOTTOM, x + 500, y + 30 + ANCHOR_BOTTOM), fill=(211, 178, 107), width=1)
contact.save(HERE / "contact.png", optimize=True)
