"""Five rubber-stamp designs for LAYRS stamps, rendered as one black-ink PNG each.

1 postmark      double ring, name on the top arc, place and year on the bottom arc, two stars
2 postage       perforated edge like a postage stamp, sketch above, name and year on a bottom band
3 oval seal     double oval, the name knocked out of a solid ribbon
4 octagon       double octagon badge, name on two lines under the sketch
5 cancellation  round postmark with wavy cancellation lines to the right

The sketch (architectural pen drawing from the photo) is clipped to each frame. Then the whole impression gets an
ink texture: uneven pressure, grain and missing ink, slightly bled edges, a few flecks, so it reads as pressed by hand.
Fonts: Oswald (OFL) and Special Elite (Apache 2.0), downloaded to data/raw/fonts by p15_stamps.py.
"""
import hashlib, io, math

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

S = 512          # working size
OUT = 512        # published size
FONTS = "data/raw/fonts"
STYLES = 5


def style_of(qid: str) -> int:
    return int(hashlib.md5(qid.encode()).hexdigest()[:8], 16) % STYLES


def _font(name, size, bold=True):
    f = ImageFont.truetype(f"{FONTS}/{name}", size)
    if name.startswith("Oswald"):
        try:
            f.set_variation_by_name("Bold" if bold else "Regular")
        except Exception:
            pass
    return f


# ---------- sketch ----------
def _blur(a, r):
    return np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0


def sketch(img_bytes) -> np.ndarray:
    """Architectural pen sketch, ink in [0, 1], S x S.

    Clean the photo first (edge-preserving medians), draw bold XDoG contours, drop lines where they pile up
    (foliage, gravel, brick texture) so the building's outline stays, hatch the shadows and fill the deepest ones solid,
    like a linocut. Works best from a 960 px photo."""
    im = Image.open(io.BytesIO(img_bytes)).convert("L")
    w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2)).resize((2 * S, 2 * S), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=1.5)
    for _ in range(2):
        im = im.filter(ImageFilter.MedianFilter(7))                      # flatten texture, keep edges
    a8 = np.asarray(im)
    g1, g2 = _blur(a8, 2.0), _blur(a8, 2.0 * 1.6)
    d = g1 - 0.985 * g2
    lines = 1.0 - np.where(d >= -0.006, 1.0, 1.0 + np.tanh(45.0 * (d + 0.006)))
    lines = np.clip(lines * 1.6, 0, 1)
    # where lines pile up (trees, gravel), keep only the strongest
    density = _blur((lines * 255).astype(np.uint8), 9)
    lines = np.where(density > 0.32, np.where(lines > 0.85, lines, 0.0), lines)
    lum = _blur(a8, 4.0)
    n = 2 * S
    yy, xx = np.mgrid[0:n, 0:n]
    h1 = ((xx + yy) % 14 < 2.2).astype(np.float32)
    h2 = ((xx - yy) % 14 < 2.2).astype(np.float32)
    t1, t2, t3 = np.percentile(lum, 22), np.percentile(lum, 9), np.percentile(lum, 3)
    shade = np.where(lum < t1, h1, 0) + np.where(lum < t2, h2, 0)
    solid = (lum < t3).astype(np.float32)
    ink = np.clip(np.maximum.reduce([lines, shade * 0.85, solid]), 0, 1)
    small = Image.fromarray((ink * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    small = small.filter(ImageFilter.MaxFilter(3))                       # rubber stamps print bold
    out = np.asarray(small, dtype=np.float32) / 255
    return np.clip((out - 0.15) / 0.6, 0, 1)                             # crisp: push greys to ink or paper


def lineart(img_bytes):
    """Clean thin contour drawing from a photo, centred on the building, and a quality score.

    GrabCut separates the building from a centred box, Canny on a twice bilateral-filtered image gives the contours,
    short fragments are dropped. Score: share of the drawing made of long near-vertical or near-horizontal segments
    (architecture), penalised when the drawing is nearly empty, overfull or fragmented. Returns (ink S x S in [0, 1], score)."""
    import cv2
    buf = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        return None, 0.0
    h, w = img.shape[:2]
    k = 1000 / max(h, w)
    img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_CUBIC)
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(img, mask, (int(w * 0.08), int(h * 0.05), int(w * 0.84), int(h * 0.9)), bg, fg, 4, cv2.GC_INIT_WITH_RECT)
    except cv2.error:
        return None, 0.0
    obj = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    smooth = cv2.bilateralFilter(cv2.bilateralFilter(gray, 9, 60, 9), 9, 60, 9)
    v = float(np.median(smooth))
    edges = cv2.Canny(smooth, int(max(0, 0.66 * v)), int(min(255, 1.33 * v)), L2gradient=True)
    edges = cv2.bitwise_and(edges, cv2.dilate(obj, np.ones((9, 9), np.uint8)))
    n, lab, st, _ = cv2.connectedComponentsWithStats((edges > 0).astype(np.uint8), 8)
    keep = np.zeros_like(edges)
    long_ = 0
    for i in range(1, n):
        if max(st[i, 2], st[i, 3]) >= 28:
            keep[lab == i] = 255; long_ += 1
    ys, xs = np.nonzero(keep)
    if len(xs) < 300:
        return None, 0.0
    x0, x1 = np.percentile(xs, [0.5, 99.5]).astype(int); y0, y1 = np.percentile(ys, [0.5, 99.5]).astype(int)
    crop = keep[y0:y1 + 1, x0:x1 + 1]
    # architecture score: long straight segments near vertical or horizontal, as a share of all ink
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD)
    segs = lsd.detect(crop)[0]
    straight = 0.0
    if segs is not None:
        for a0, b0, a1, b1 in segs.reshape(-1, 4):
            L = math.hypot(a1 - a0, b1 - b0)
            ang = abs(math.degrees(math.atan2(b1 - b0, a1 - a0))) % 180
            if L >= 25 and (min(ang, 180 - ang) < 12 or abs(ang - 90) < 12):
                straight += L
    ink_px = float((crop > 0).sum())
    straight_share = min(1.0, straight / max(1.0, ink_px))
    hh, ww = crop.shape
    sc = (S * 0.8) / max(hh, ww)
    small = cv2.resize(crop, (max(1, int(ww * sc)), max(1, int(hh * sc))), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((S, S), np.uint8)
    yy, xx = (S - small.shape[0]) // 2, (S - small.shape[1]) // 2
    canvas[yy:yy + small.shape[0], xx:xx + small.shape[1]] = small
    canvas = cv2.threshold(canvas, 40, 255, cv2.THRESH_BINARY)[1]
    canvas = cv2.dilate(canvas, np.ones((2, 2), np.uint8))
    cov = float((canvas > 0).mean())
    frag = long_ / max(1.0, ink_px / 400.0)                    # pieces per 400 px of line: high means noisy
    score = straight_share
    if cov < 0.015 or cov > 0.16:
        score *= 0.3
    score /= (1.0 + max(0.0, frag - 1.2))
    return canvas.astype(np.float32) / 255.0, float(score)


LINEART_MIN = 0.30   # set from a reviewed sample of 60; below it the stamp gets a monogram


def monogram(name: str, year: int) -> np.ndarray:
    """No photo: big initials and the year, as a stamp would carry them."""
    words = [w for w in name.replace("-", " ").split() if len(w) > 2 and w.lower() not in ("de", "het", "van", "the", "of", "en")]
    ini = "".join(w[0] for w in words[:2]).upper() or name[:1].upper()
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    f = _font("Oswald.ttf", 210)
    d.text((S / 2, S / 2), ini, font=f, fill=255, anchor="mm")   # the frame carries the year
    return np.asarray(c, dtype=np.float32) / 255


# ---------- lettering ----------
def _fit(text, fontname, max_w, start, minimum=18, bold=True):
    size = start
    while size > minimum:
        f = _font(fontname, size, bold)
        if f.getlength(text) <= max_w:
            return f, text
        size -= 2
    f = _font(fontname, minimum, bold)
    while text and f.getlength(text + "…") > max_w:
        text = text[:-1]
    return f, text.rstrip() + "…"


def _arc_text(canvas: Image.Image, text, cx, cy, r, center_deg, font, bottom=False, value=255):
    """Letters along a circle; top arcs read clockwise, bottom arcs counter-clockwise (upright)."""
    widths = [font.getlength(ch) for ch in text]
    total = sum(widths) / r                                    # radians
    a = math.radians(center_deg) + (total / 2 if bottom else -total / 2)
    for ch, w in zip(text, widths):
        step = w / r
        mid = a + (-step / 2 if bottom else step / 2)
        x, y = cx + r * math.cos(mid), cy + r * math.sin(mid)
        tile = Image.new("L", (int(w) + 24, font.size + 24), 0)
        ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), ch, font=font, fill=value, anchor="mm")
        rot = -(math.degrees(mid) - 90) if bottom else -(math.degrees(mid) + 90)
        tile = tile.rotate(rot, resample=Image.BICUBIC, expand=True)
        box = (int(x - tile.width / 2), int(y - tile.height / 2))
        if value:
            canvas.paste(ImageChops.lighter(canvas.crop((*box, box[0] + tile.width, box[1] + tile.height)), tile), box)
        else:
            canvas.paste(0, box, tile)
        a += -step if bottom else step


def _star(d, cx, cy, r, value=255):
    pts = [(cx + (r if i % 2 == 0 else r * 0.42) * math.cos(math.radians(-90 + 36 * i)),
            cy + (r if i % 2 == 0 else r * 0.42) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)]
    d.polygon(pts, fill=value)


def _clip(art: np.ndarray, mask: Image.Image) -> Image.Image:
    return Image.fromarray((art * np.asarray(mask, dtype=np.float32)).astype(np.uint8))


def _octagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(22.5 + 45 * i)), cy + r * math.sin(math.radians(22.5 + 45 * i))) for i in range(8)]


# ---------- the five designs ----------
def _postmark(art, name, place, year):
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    cx = cy = S / 2
    d.ellipse((cx - 240, cy - 240, cx + 240, cy + 240), outline=255, width=10)
    d.ellipse((cx - 192, cy - 192, cx + 192, cy + 192), outline=255, width=4)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).ellipse((cx - 182, cy - 182, cx + 182, cy + 182), fill=1)
    c = ImageChops.lighter(c, _clip(art * 255, m))
    f, t = _fit(name.upper(), "Oswald.ttf", math.radians(140) * 216, 38)
    _arc_text(c, t, cx, cy, 216, -90, f)
    f2, t2 = _fit(f"{place.upper()} · {year}", "Oswald.ttf", math.radians(110) * 216, 32, bold=False)
    _arc_text(c, t2, cx, cy, 216, 90, f2, bottom=True)
    d = ImageDraw.Draw(c); _star(d, cx - 216, cy, 11); _star(d, cx + 216, cy, 11)
    return c


def _postage(art, name, place, year):
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    x0, y0, x1, y1 = 28, 28, S - 28, S - 28
    d.rectangle((x0, y0, x1, y1), fill=255)
    d.rectangle((x0 + 16, y0 + 16, x1 - 16, y1 - 16), fill=0)
    for t in np.arange(x0, x1 + 1, 26):                     # perforation
        for (px, py) in ((t, y0), (t, y1)):
            d.ellipse((px - 8, py - 8, px + 8, py + 8), fill=0)
    for t in np.arange(y0, y1 + 1, 26):
        for (px, py) in ((x0, t), (x1, t)):
            d.ellipse((px - 8, py - 8, px + 8, py + 8), fill=0)
    d.rectangle((x0 + 34, y0 + 34, x1 - 34, y1 - 34), outline=255, width=3)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rectangle((x0 + 42, y0 + 42, x1 - 42, 372), fill=1)
    c = ImageChops.lighter(c, _clip(art * 255, m))
    d = ImageDraw.Draw(c)
    d.line((x0 + 42, 382, x1 - 42, 382), fill=255, width=3)
    f, t = _fit(name, "SpecialElite.ttf", x1 - x0 - 100, 34)
    d.text((S / 2, 404), t, font=f, fill=255, anchor="mm")
    d.text((x1 - 48, 432), str(year), font=_font("Oswald.ttf", 26), fill=255, anchor="rm")
    d.text((x0 + 48, 432), place.upper()[:18], font=_font("Oswald.ttf", 22, bold=False), fill=255, anchor="lm")
    return c


def _oval(art, name, place, year):
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    d.ellipse((22, 62, S - 22, S - 62), outline=255, width=10)
    d.ellipse((44, 84, S - 44, S - 84), outline=255, width=3)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).ellipse((52, 92, S - 52, S - 92), fill=1)
    c = ImageChops.lighter(c, _clip(art * 255, m))
    d = ImageDraw.Draw(c)
    d.rectangle((6, 300, S - 6, 362), fill=255)                # ribbon
    d.polygon([(6, 300), (-20, 331), (6, 362)], fill=255); d.polygon([(S - 6, 300), (S + 20, 331), (S - 6, 362)], fill=255)
    f, t = _fit(name.upper(), "Oswald.ttf", S - 60, 40)
    d.text((S / 2, 331), t, font=f, fill=0, anchor="mm")       # knocked out of the ribbon
    d.text((S / 2, 120), f"· {year} ·", font=_font("Oswald.ttf", 30), fill=255, anchor="mm")
    d.text((S / 2, 392), place.upper()[:22], font=_font("Oswald.ttf", 24, bold=False), fill=255, anchor="mm")
    return c


def _octagon_badge(art, name, place, year):
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    cx = cy = S / 2
    d.polygon(_octagon(cx, cy, 246), outline=255, width=10)
    d.polygon(_octagon(cx, cy, 216), outline=255, width=3)
    m = Image.new("L", (S, S), 0); md = ImageDraw.Draw(m)
    md.polygon(_octagon(cx, cy, 206), fill=1); md.rectangle((0, 330, S, S), fill=0)
    c = ImageChops.lighter(c, _clip(art * 255, m))
    d = ImageDraw.Draw(c)
    d.line((90, 336, S - 90, 336), fill=255, width=3)
    words, lines = name.upper().split(), ["", ""]
    for w in words:
        k = 0 if _font("Oswald.ttf", 34).getlength((lines[0] + " " + w).strip()) <= 300 or not lines[0] else 1
        lines[k] = (lines[k] + " " + w).strip()
    for i, ln in enumerate([l for l in lines if l]):
        f, t = _fit(ln, "Oswald.ttf", 320, 34)
        d.text((cx, 366 + i * 38), t, font=f, fill=255, anchor="mm")
    d.text((cx, 88), str(year), font=_font("Oswald.ttf", 26), fill=255, anchor="mm")
    return c


def _cancel(art, name, place, year):
    c = Image.new("L", (S, S), 0); d = ImageDraw.Draw(c)
    cx, cy = 210, S / 2
    d.ellipse((cx - 186, cy - 186, cx + 186, cy + 186), outline=255, width=8)
    d.ellipse((cx - 146, cy - 146, cx + 146, cy + 146), outline=255, width=3)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).ellipse((cx - 138, cy - 138, cx + 138, cy + 138), fill=1)
    c = ImageChops.lighter(c, _clip(art * 255, m))
    f, t = _fit(name.upper(), "Oswald.ttf", math.radians(150) * 166, 32)
    _arc_text(c, t, cx, cy, 166, -90, f)
    f2, t2 = _fit(str(year), "Oswald.ttf", 200, 30)
    _arc_text(c, t2, cx, cy, 166, 90, f2, bottom=True)
    d = ImageDraw.Draw(c)
    for k in range(6):                                          # wavy cancellation lines
        y = cy - 125 + k * 50
        pts = [(x, y + 9 * math.sin((x - 380) / 18.0)) for x in range(378, S - 4, 3)]
        d.line(pts, fill=255, width=6)
    return c


DESIGNS = [_postmark, _postage, _oval, _octagon_badge, _cancel]


# ---------- ink ----------
def _ink_texture(a: np.ndarray, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
    low = Image.fromarray((rng.random((12, 12)) * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC)
    pressure = 0.85 + 0.15 * np.asarray(low, dtype=np.float32) / 255                 # uneven pressure
    ang = rng.random() * 2 * math.pi
    yy, xx = np.mgrid[0:S, 0:S] / S
    pressure *= 0.82 + 0.18 * (0.5 + 0.5 * np.cos(ang) * (xx - 0.5) * 2 + 0.5 * np.sin(ang) * (yy - 0.5) * 2)
    grain = np.asarray(Image.fromarray((rng.random((S, S)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255
    v = a * pressure - (grain - 0.5) * 0.25
    v = np.clip((v - 0.18) / 0.30, 0, 1)                                              # soft threshold: ragged edges
    holes = np.asarray(Image.fromarray((rng.random((S // 4, S // 4)) * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC), dtype=np.float32) / 255
    v *= np.where(holes > 0.95, 0.5, 1.0)                                            # missing ink
    flecks = (rng.random((S, S)) > 0.99985).astype(np.float32)
    flecks = np.asarray(Image.fromarray((flecks * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.float32) / 255
    return np.clip(np.maximum(v, flecks * 0.8), 0, 1)


def render(qid: str, name: str, place: str, year: int, photo_bytes: bytes | None, style: int | None = None,
           min_score: float | None = None):
    """-> (png bytes, kind) where kind is 'lineart' or 'monogram'."""
    art, score = lineart(photo_bytes) if photo_bytes else (None, 0.0)
    kind = "lineart"
    if art is None or score < (LINEART_MIN if min_score is None else min_score):
        art, kind = monogram(name, year), "monogram"
    st = style_of(qid) if style is None else style
    c = DESIGNS[st](art, name, place, year)
    a = _ink_texture(np.asarray(c, dtype=np.float32) / 255, int(hashlib.md5(qid.encode()).hexdigest()[8:16], 16))
    alpha = Image.fromarray((a * 255).astype(np.uint8)).resize((OUT, OUT), Image.LANCZOS)
    out = Image.new("RGBA", (OUT, OUT), (22, 21, 19, 0)); out.putalpha(alpha)
    buf = io.BytesIO(); out.save(buf, "PNG", optimize=True)
    return buf.getvalue(), kind
