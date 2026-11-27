"""Pilot: three ways to draw a stamp, side by side on the same buildings (docs/stamps/approach.md).

  current   the published stamp (OpenCV line art from the photo, or a monogram)
  vector    improved vectorization: building mask (GrabCut) as a bold silhouette plus long straight segments
            (LSD) snapped to vertical/horizontal, redrawn with the stamp pen
  hand      hand-composed elevation (stamp_landmarks.py)
  type      parametric drawing by building type (stamp_types.py)

A generative model (photo -> line drawing) is the fourth option; it needs an API key and is not run here.

usage: STAMPS_BEFORE=<dir with the old PNGs> python pipeline/stamp_pilot.py OUT.png [qid ...]
"""
import io, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import stamp_styles as SS
from stamp_draw import Pen, rasterize
from stamp_landmarks import DRAWINGS
from stamp_types import draw, kind_of

PILOT = ["Q1130722", "Q623558", "Q678611", "Q849957", "Q50719", "Q1429748", "Q834448", "Q969215", "Q914231",
         "Q1894519", "Q2466999", "Q3368242", "Q2426916", "Q3527239", "Q1545193"]


def vectorize(img_bytes) -> Pen | None:
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return None
    h, w = img.shape[:2]
    k = 900 / max(h, w)
    img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA)
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(img, mask, (int(w * 0.06), int(h * 0.04), int(w * 0.88), int(h * 0.92)), bg, fg, 5, cv2.GC_INIT_WITH_RECT)
    obj = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    obj = cv2.morphologyEx(obj, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
    cs, _ = cv2.findContours(obj, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    p = Pen()
    poly = cv2.approxPolyDP(c, 2.5, True).reshape(-1, 2)
    flip = lambda x, y: (x / 10.0, (h - y) / 10.0)
    p.poly([flip(x, y) for x, y in poly], "b")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 50, 9)
    segs = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD).detect(gray)[0]
    inside = cv2.erode(obj, np.ones((7, 7), np.uint8))
    if segs is not None:
        for x0, y0, x1, y1 in segs.reshape(-1, 4):
            L = math.hypot(x1 - x0, y1 - y0)
            if L < 18:
                continue
            mx, my = int((x0 + x1) / 2), int((y0 + y1) / 2)
            if not (0 <= mx < w and 0 <= my < h) or not inside[my, mx]:
                continue
            ang = abs(math.degrees(math.atan2(y1 - y0, x1 - x0))) % 180
            if min(ang, 180 - ang) < 7:
                y0 = y1 = (y0 + y1) / 2
            elif abs(ang - 90) < 7:
                x0 = x1 = (x0 + x1) / 2
            p.line(*flip(x0, y0), *flip(x1, y1), "f")
    ys = [pt[1] for pt in poly]
    p.line(*flip(min(pt[0] for pt in poly) - 10, max(ys)), *flip(max(pt[0] for pt in poly) + 10, max(ys)), "b")
    return p


def main():
    out = sys.argv[1]
    qids = sys.argv[2:] or PILOT
    stamps = {}
    for f in sorted(os.listdir("viewer/stamps")):
        if f.startswith("GM"):
            for s in json.load(open(f"viewer/stamps/{f}"))["stamps"]:
                stamps[s["id"]] = s
    types = json.load(open("data/raw/wd_stamp_types.json"))
    cell, cols = 300, 5
    font = ImageFont.truetype(f"{SS.FONTS}/Oswald.ttf", 22)
    sheet = Image.new("RGB", (cell * cols, (cell + 30) * len(qids) + 40), (250, 246, 236))
    d = ImageDraw.Draw(sheet)
    for j, h in enumerate(["фото Commons", "сейчас", "векторизация", "вручную", "по типу"]):
        d.text((j * cell + 10, 8), h, font=font, fill=(40, 40, 40))
    for i, q in enumerate(qids):
        s = stamps[q]
        y = 40 + i * (cell + 30)
        name, place, year = s["name_nl"], s["place"], s["year"]
        cells = []
        ph = None
        for dd in ("commons960", "commons"):
            pp = f"data/raw/{dd}/{q}.jpg"
            if os.path.exists(pp):
                ph = open(pp, "rb").read(); break
        if ph:
            im = Image.open(io.BytesIO(ph)).convert("RGB"); im.thumbnail((cell - 20, cell - 20)); cells.append(im)
        else:
            cells.append(None)
        cur = f"{os.environ.get('STAMPS_BEFORE', 'viewer/stamps/img')}/{q}.png"   # the published set to compare with
        cells.append(Image.open(cur).convert("RGBA").resize((cell - 20, cell - 20)) if os.path.exists(cur) else None)
        vp = vectorize(ph) if ph else None
        for pen in (vp, (lambda p: (DRAWINGS[q](p), p)[1])(Pen()) if q in DRAWINGS else None,
                    draw(q, kind_of(types.get(q, []), name), year)):
            if pen is None:
                cells.append(None); continue
            png = SS.render(q, name, place, year, pen, style=0, out=cell - 20)
            cells.append(Image.open(io.BytesIO(png)).convert("RGBA"))
        for j, im in enumerate(cells):
            if im is None:
                d.text((j * cell + 20, y + cell / 2), "—", font=font, fill=(120, 120, 120)); continue
            x0, y0 = j * cell + 10 + (cell - 20 - im.width) // 2, y + (cell - 20 - im.height) // 2
            sheet.paste(im, (x0, y0), im if im.mode == "RGBA" else None)
        d.text((10, y + cell - 14), f"{name} · {place} · {kind_of(types.get(q, []), name)}", font=ImageFont.truetype(f"{SS.FONTS}/Oswald.ttf", 16), fill=(90, 90, 90))
    sheet.save(out)


if __name__ == "__main__":
    main()
