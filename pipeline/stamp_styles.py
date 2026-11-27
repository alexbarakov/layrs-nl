"""Five rubber-stamp impressions for LAYRS stamps, one black-ink PNG each (requirements: docs/stamps/requirements.md).

1 postmark      double ring; name on the top arc, place and year on the bottom arc, two stars
2 postage       perforated stamp; place on top, the year as the denomination, name in the bottom band
3 oval          double oval; name on the top arc, place and year on the bottom arc
4 octagon       double octagon; name on the top arc, place and year on the bottom arc
5 cancellation  postmark ring with wavy cancellation lines to the right

The centre carries only the drawing of the building (stamp_landmarks.py by hand for the best-known buildings,
stamp_types.py by type for the rest): no letters, no monograms. The lettering runs along the edge.
Then the impression gets an ink texture: uneven pressure, paper grain, starved patches, slightly bled edges,
so it reads as pressed by hand.

Fonts: Oswald (OFL), downloaded to data/raw/fonts by p15_stamps.py.
"""
import hashlib, io, math

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from stamp_draw import rasterize

S = 1024         # working size
OUT = 600        # published size: 180 pt on a 3x screen
FONTS = "data/raw/fonts"
STYLES = 5
STYLE_NAMES = ["postmark", "postage", "oval", "octagon", "cancellation"]
K = S / 512      # the layouts below are written for 512
LINE = 2.1 * K / 2   # px per weight unit at S (bold = 2.6 units)


def style_of(qid: str) -> int:
    return int(hashlib.md5(qid.encode()).hexdigest()[:8], 16) % STYLES


def _font(size, bold=True):
    f = ImageFont.truetype(f"{FONTS}/Oswald.ttf", int(size))
    try:
        f.set_variation_by_name("SemiBold" if bold else "Regular")
    except Exception:
        try:
            f.set_variation_by_name("Bold" if bold else "Regular")
        except Exception:
            pass
    return f


# ---------- lettering ----------
CUTS = (" met ", " waarvan ", " waarvoor ", " bestaande ", " onder ", " behorend ", " samen ", " voorzien ", " gedekt ",
        " gedateerd ", " tussen ", " van het ", " in de ", " in het ", " en inventaris")


STOP = {"van", "de", "het", "der", "en", "voor", "met", "in", "op", "aan", "bij", "of", "te"}


def short_name(name: str, limit: int = 34) -> str:
    """Wikidata labels of minor monuments are often descriptions ("Pand met eenvoudige lijstgevel, gedateerd ...").
    Keep the naming part for the stamp's edge: before ;.: then before a comma, then before a describing clause,
    then whole words up to the limit. A single long word stays whole (the lettering shrinks to fit)."""
    n = name.strip()
    if len(n) > 2 and n[0] in "'\"‘“" and n[-1] in "'\"’”":       # quoted label, not 't or 's
        n = n[1:-1]
    if len(n) <= limit:
        return n
    for sep in (";", ". ", ": "):
        head = n.split(sep)[0]
        if len(head) >= 4 and not (sep == ". " and len(head.split()[-1]) <= 2):   # not "C. en A." or "R.K."
            n = head
    if len(n) > limit and "," in n and len(n.split(",")[0]) >= 8:
        n = n.split(",")[0]
    if len(n) > limit:
        low = n.lower()
        cut = min([low.find(c) for c in CUTS if low.find(c) >= 8] or [len(n)])
        n = n[:cut]
    words = n.split()
    if len(n) > limit and len(words) > 1:
        out = []
        for w in words:
            if len(" ".join(out + [w])) > limit:
                break
            out.append(w)
        words = out or words[:1]
    while len(words) > 1 and words[-1].lower() in STOP:
        words = words[:-1]
    n = " ".join(words).rstrip(" ,")
    if n.count("(") > n.count(")"):                       # a cut inside brackets: drop the open bracket
        n = n[:n.rindex("(")].rstrip(" ,")
    return n


def _fit(text, max_w, start, minimum=16, bold=True, tracking=0.0):
    size = start
    while size > minimum:
        f = _font(size * K, bold)
        if _width(text, f, tracking) <= max_w:
            return f, text
        size -= 1
    f = _font(minimum * K, bold)
    while text and _width(text + "…", f, tracking) > max_w:
        text = text[:-1]
    return f, text.rstrip() + "…"


def _width(text, font, tracking):
    return sum(font.getlength(ch) for ch in text) + tracking * font.size * max(0, len(text) - 1)


def _ellipse_text(canvas, text, cx, cy, rx, ry, center_deg, font, bottom=False, tracking=0.08):
    """Letters along an ellipse (a circle when rx == ry), upright: top arcs read clockwise, bottom ones counter-clockwise."""
    # arc length table along the ellipse
    n = 2048
    th = np.linspace(-math.pi, math.pi, n + 1)
    xs, ys = rx * np.cos(th), ry * np.sin(th)
    seg = np.hypot(np.diff(xs), np.diff(ys))
    L = np.concatenate([[0], np.cumsum(seg)])

    def at(theta):
        return float(np.interp(theta, th, L))

    def theta_at(l):
        return float(np.interp(l % L[-1], L, th))

    widths = [font.getlength(ch) for ch in text]
    gap = tracking * font.size
    total = sum(widths) + gap * (len(text) - 1)
    c = at(math.radians(center_deg))
    pos = c + total / 2 if bottom else c - total / 2
    for ch, w in zip(text, widths):
        mid_l = pos - w / 2 if bottom else pos + w / 2
        t = theta_at(mid_l)
        x, y = cx + rx * math.cos(t), cy + ry * math.sin(t)
        # tangent direction
        tx, ty = -rx * math.sin(t), ry * math.cos(t)
        ang = math.degrees(math.atan2(ty, tx))
        tile = Image.new("L", (int(w) + int(font.size), int(font.size * 1.6)), 0)
        cap = font.getbbox("H", anchor="ls")[1]            # negative: cap height above the baseline
        ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2 - cap / 2), ch, font=font, fill=255, anchor="ms")
        rot = -ang if not bottom else -(ang + 180)
        tile = tile.rotate(rot, resample=Image.BICUBIC, expand=True)
        box = (int(x - tile.width / 2), int(y - tile.height / 2))
        canvas.paste(ImageChops.lighter(canvas.crop((*box, box[0] + tile.width, box[1] + tile.height)), tile), box)
        pos += -(w + gap) if bottom else (w + gap)


def _star(d, cx, cy, r, value=255):
    pts = [(cx + (r if i % 2 == 0 else r * 0.42) * math.cos(math.radians(-90 + 36 * i)),
            cy + (r if i % 2 == 0 else r * 0.42) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)]
    d.polygon(pts, fill=value)


def _octagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(22.5 + 45 * i)), cy + r * math.sin(math.radians(22.5 + 45 * i))) for i in range(8)]


def _ring(d, cx, cy, rx, ry, width):
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=255, width=max(1, int(width)))


# ---------- placing the drawing ----------
def _place(canvas, pen, box, clip=None, weight=1.0):
    """Rasterize the drawing into box (x0, y0, x1, y1), standing on its bottom edge, clipped to a mask."""
    x0, y0, x1, y1 = [int(v) for v in box]
    W, H = x1 - x0, y1 - y0
    ink = rasterize(pen.svg(W, H, weight_scale=LINE * weight * 360 / W), W, H)   # same stroke in every frame
    layer = Image.new("L", (S, S), 0)
    layer.paste(Image.fromarray((ink * 255).astype(np.uint8)), (x0, y0))
    if clip is not None:
        layer = ImageChops.multiply(layer, clip)
    return ImageChops.lighter(canvas, layer)


def _mask(shape):
    m = Image.new("L", (S, S), 0)
    shape(ImageDraw.Draw(m))
    return m


# ---------- the five designs ----------
# Each design draws the frame and the lettering on separate layers, so compose() can check that no letter comes
# closer than MARGIN to a line (requirements, section 2) and shrink the lettering until it does not.
# Returns frame, text, forbid (the lines text must keep clear of), knock (text printed as paper, or None),
# clip (where the drawing may go) and box (where the drawing stands).
MARGIN = int(5 * K / 2 * 1.0) + 2          # ~3 px at 600 px


def _hcentered(d, text, x, y, font, fill=255):
    """Text centred on (x, y) by its cap height, so upper-case lettering sits in the middle of a band."""
    cap = font.getbbox("H", anchor="ls")[1]
    d.text((x, y - cap / 2), text, font=font, fill=fill, anchor="ms")


def _split2(text):
    """Two balanced lines, broken at a space or after a hyphen; None for one word."""
    cuts = [i for i, ch in enumerate(text) if ch == " "] + [i + 1 for i, ch in enumerate(text) if ch == "-"]
    if not cuts:
        return None
    i = min(cuts, key=lambda i: abs(len(text[:i]) - len(text[i:])))
    return text[:i].strip(), text[i:].strip()


def _fit_lines(text, widths, start, minimum=12, bold=True):
    """Largest common size (in 512-grid points) at which each line fits its width; 0 when none does."""
    size = start
    while size >= minimum:
        f = _font(size * K, bold)
        if all(f.getlength(t) <= w for t, w in zip(text, widths)):
            return size
        size -= 1
    return 0


def _band_text(dt, text, cx, cy, width_of, start, band_h, bold=True, fill=255):
    """One line in a straight band, or two when that prints the name clearly larger.
    width_of(dy, cap) -> usable width for a line centred dy below the band centre."""
    f1 = _font(start * K, bold)
    cap = lambda size: -_font(size * K, bold).getbbox("H", anchor="ls")[1]
    one = _fit_lines([text], [width_of(0, cap(start))], start, bold=bold)
    halves = _split2(text)
    two = 0
    if halves:
        for size in range(int(start * 0.8), 11, -1):
            gap = cap(size) * 1.45
            if 2 * cap(size) + gap * 0.45 > band_h:
                continue
            if _fit_lines(list(halves), [width_of(-gap / 2, cap(size)), width_of(gap / 2, cap(size))], size, size, bold):
                two = size; break
    if halves and two >= max(one * 1.2, 14):
        f = _font(two * K, bold); gap = cap(two) * 1.45
        _hcentered(dt, halves[0], cx, cy - gap / 2, f, fill); _hcentered(dt, halves[1], cx, cy + gap / 2, f, fill)
        return
    if one:
        _hcentered(dt, text, cx, cy, _font(one * K, bold), fill); return
    f, t = _fit(text, width_of(0, cap(12)), 12, minimum=12, bold=bold)
    _hcentered(dt, t, cx, cy, f, fill)


def _layers():
    return Image.new("L", (S, S), 0), Image.new("L", (S, S), 0)


def _postmark(name, place, year, fs):
    c, t = _layers(); d = ImageDraw.Draw(c)
    cx = cy = S / 2
    R, r = 244 * K, 190 * K
    _ring(d, cx, cy, R, R, 11 * K)
    _ring(d, cx, cy, r, r, 4 * K)
    tr = (R - 11 * K + r) / 2
    f, tx = _fit(name.upper(), math.radians(150) * tr, 34 * fs, minimum=12, tracking=0.08)
    _ellipse_text(t, tx, cx, cy, tr, tr, -90, f)
    f2, t2 = _fit(f"{place.upper()} · {year}", math.radians(120) * tr, 28 * fs, minimum=12, bold=False, tracking=0.1)
    _ellipse_text(t, t2, cx, cy, tr, tr, 90, f2, bottom=True)
    _star(d, cx - tr, cy, 10 * K); _star(d, cx + tr, cy, 10 * K)
    clip = _mask(lambda m: m.ellipse((cx - r + 8 * K, cy - r + 8 * K, cx + r - 8 * K, cy + r - 8 * K), fill=255))
    return c, t, c, None, clip, (cx - r * 0.84, cy - r * 0.84, cx + r * 0.84, cy + r * 0.6)


def _postage(name, place, year, fs):
    c, t = _layers(); d = ImageDraw.Draw(c)
    x0, y0, x1, y1 = 62 * K, 22 * K, S - 62 * K, S - 22 * K
    d.rectangle((x0, y0, x1, y1), fill=255)
    d.rectangle((x0 + 15 * K, y0 + 15 * K, x1 - 15 * K, y1 - 15 * K), fill=0)
    step = 24 * K
    for v in np.arange(x0, x1 + 1, step):                 # perforation
        for py in (y0, y1):
            d.ellipse((v - 7 * K, py - 7 * K, v + 7 * K, py + 7 * K), fill=0)
    for v in np.arange(y0, y1 + 1, step):
        for px in (x0, x1):
            d.ellipse((px - 7 * K, v - 7 * K, px + 7 * K, v + 7 * K), fill=0)
    ix0, iy0, ix1, iy1 = x0 + 32 * K, y0 + 32 * K, x1 - 32 * K, y1 - 32 * K
    d.rectangle((ix0, iy0, ix1, iy1), outline=255, width=int(3 * K))
    d.line((ix0, iy0 + 52 * K, ix1, iy0 + 52 * K), fill=255, width=int(2 * K))
    by = iy1 - 66 * K
    d.rectangle((ix0, by, ix1, iy1), fill=255)
    # lettering: place top left, the year as the denomination top right, the name knocked out of the band
    dt = ImageDraw.Draw(t)
    fy = _font(36 * K * fs)
    yw = fy.getlength(str(year))
    fp, tp = _fit(place.upper(), (ix1 - ix0) - yw - 48 * K, 24 * fs, minimum=12, bold=False)
    _hcentered(dt, tp, ix0 + 12 * K + fp.getlength(tp) / 2, iy0 + 26 * K, fp)
    _hcentered(dt, str(year), ix1 - 12 * K - yw / 2, iy0 + 26 * K, fy)
    _band_text(dt, name.upper(), (ix0 + ix1) / 2, (by + iy1) / 2, lambda dy, cap: (ix1 - ix0) - 30 * K, 34 * fs,
               band_h=(iy1 - by) - 14 * K)
    forbid = c.copy(); fd = ImageDraw.Draw(forbid)
    fd.rectangle((ix0, by, ix1, iy1), fill=0)
    fd.rectangle((ix0, by, ix1, iy1), outline=255, width=int(2 * K))
    band = _mask(lambda m: m.rectangle((ix0, by, ix1, iy1), fill=255))
    knock = ImageChops.multiply(t, band)
    t_print = ImageChops.subtract(t, knock)
    clip = _mask(lambda m: m.rectangle((ix0 + 4 * K, iy0 + 56 * K, ix1 - 4 * K, by - 4 * K), fill=255))
    return c, t_print, forbid, knock, clip, (ix0 + 16 * K, iy0 + 64 * K, ix1 - 16 * K, by - 6 * K), t


def _oval(name, place, year, fs):
    c, t = _layers(); d = ImageDraw.Draw(c)
    cx, cy = S / 2, S / 2
    RX, RY = 248 * K, 200 * K
    rx, ry = 194 * K, 148 * K
    _ring(d, cx, cy, RX, RY, 10 * K)
    _ring(d, cx, cy, rx, ry, 3.5 * K)
    tx, ty = (RX - 10 * K + rx) / 2, (RY - 10 * K + ry) / 2
    f, tn = _fit(name.upper(), 1.0 * (tx + ty), 32 * fs, minimum=12, tracking=0.08)
    _ellipse_text(t, tn, cx, cy, tx, ty, -90, f)
    f2, t2 = _fit(f"{place.upper()} · {year}", 0.85 * (tx + ty), 26 * fs, minimum=12, bold=False, tracking=0.1)
    _ellipse_text(t, t2, cx, cy, tx, ty, 90, f2, bottom=True)
    _star(d, cx - tx, cy, 9 * K); _star(d, cx + tx, cy, 9 * K)
    clip = _mask(lambda m: m.ellipse((cx - rx + 7 * K, cy - ry + 7 * K, cx + rx - 7 * K, cy + ry - 7 * K), fill=255))
    return c, t, c, None, clip, (cx - rx * 0.8, cy - ry * 0.86, cx + rx * 0.8, cy + ry * 0.6)


def _octagon_badge(name, place, year, fs):
    """Straight lettering on the flat top and bottom faces: an octagon has no arc to follow."""
    c, t = _layers(); d = ImageDraw.Draw(c)
    cx = cy = S / 2
    R, r = 250 * K, 172 * K
    W = 11 * K
    d.polygon(_octagon(cx, cy, R), outline=255, width=int(W))
    d.polygon(_octagon(cx, cy, r), outline=255, width=int(3.5 * K))
    t8 = math.tan(math.radians(22.5))
    a_out = R * math.cos(math.radians(22.5)) - W            # inner face of the outer frame
    a_in = r * math.cos(math.radians(22.5))                 # outer face of the inner frame
    mid = (a_out + a_in) / 2
    dt = ImageDraw.Draw(t)

    def width_at(dy, cap, top=True):
        h = mid + (-dy if top else dy) + cap / 2            # the far edge of the letters, where the band is narrowest
        return 2 * (a_out * t8 + (a_out - h)) - 2 * 12 * K

    band = a_out - a_in - 10 * K
    _band_text(dt, name.upper(), cx, cy - mid, lambda dy, cap: width_at(dy, cap, True), 32 * fs, band)
    _band_text(dt, f"{place.upper()} · {year}", cx, cy + mid, lambda dy, cap: width_at(dy, cap, False), 26 * fs, band,
               bold=False)
    for sx in (-1, 1):
        _star(d, cx + sx * mid, cy, 9 * K)
    clip = _mask(lambda m: m.polygon(_octagon(cx, cy, r - 8 * K), fill=255))
    return c, t, c, None, clip, (cx - a_in * 0.88, cy - a_in * 0.88, cx + a_in * 0.88, cy + a_in * 0.62)


def _cancel(name, place, year, fs):
    c, t = _layers(); d = ImageDraw.Draw(c)
    cx, cy = 214 * K, S / 2
    R, r = 196 * K, 150 * K
    _ring(d, cx, cy, R, R, 9 * K)
    _ring(d, cx, cy, r, r, 3.5 * K)
    tr = (R - 9 * K + r) / 2
    f, tn = _fit(name.upper(), math.radians(160) * tr, 28 * fs, minimum=12, tracking=0.06)
    _ellipse_text(t, tn, cx, cy, tr, tr, -90, f)
    f2, t2 = _fit(f"{place.upper()} · {year}", math.radians(140) * tr, 24 * fs, minimum=12, bold=False, tracking=0.08)
    _ellipse_text(t, t2, cx, cy, tr, tr, 90, f2, bottom=True)
    for k in range(6):                                    # wavy cancellation lines
        y = cy - 125 * K + k * 50 * K
        pts = [(x, y + 9 * K * math.sin((x - 400 * K) / (18 * K))) for x in np.arange(400 * K, S - 6 * K, 3)]
        d.line(pts, fill=255, width=int(6 * K))
    clip = _mask(lambda m: m.ellipse((cx - r + 7 * K, cy - r + 7 * K, cx + r - 7 * K, cy + r - 7 * K), fill=255))
    return c, t, c, None, clip, (cx - r * 0.84, cy - r * 0.84, cx + r * 0.84, cy + r * 0.6)


DESIGNS = [_postmark, _postage, _oval, _octagon_badge, _cancel]
SCALES = [1.0, 0.92, 0.85, 0.78, 0.72, 0.66, 0.6]


def collisions(text: Image.Image, forbid: Image.Image) -> int:
    """Pixels of lettering (grown by MARGIN) that touch a line of the frame."""
    grown = text.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(2 * MARGIN + 1))
    lines = forbid.point(lambda v: 255 if v > 60 else 0)
    return int((np.asarray(ImageChops.multiply(grown, lines)) > 0).sum())


def layout(name, place, year, style):
    """Frame and lettering at the largest size that keeps MARGIN clear of every line. -> (parts, scale, overlap)"""
    for fs in SCALES:
        parts = DESIGNS[style](name, place, year, fs)
        check = parts[6] if len(parts) > 6 else parts[1]   # postage: check the knocked-out name too
        hit = collisions(check, parts[2])
        if hit == 0:
            return parts, fs, 0
    return parts, fs, hit


# ---------- ink ----------
def _noise(rng, n, size):
    g = rng.random((n, n)).astype(np.float32)
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), dtype=np.float32) / 255


def ink_texture(a: np.ndarray, seed: int, strength: float = 1.0) -> np.ndarray:
    """Black-on-transparent mask -> a hand-pressed impression (alpha in [0, 1])."""
    rng = np.random.default_rng(seed)
    n = a.shape[0]
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9 * n / 1024)), dtype=np.float32) / 255
    # pressure: a tilt across the stamp plus soft blotches
    ang = rng.random() * 2 * math.pi
    yy, xx = np.mgrid[0:n, 0:n] / n - 0.5
    tilt = 0.5 + (np.cos(ang) * xx + np.sin(ang) * yy)
    pressure = 0.78 + 0.22 * (0.55 * _noise(rng, 7, n) + 0.45 * tilt)
    # starved ink: mid-frequency patches where little ink transfers
    starve = _noise(rng, 40, n)
    grain = np.asarray(Image.fromarray((rng.random((n, n)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8 * n / 1024)),
                       dtype=np.float32) / 255
    v = a * pressure - (grain - 0.5) * 0.28 * strength - np.clip(starve - 0.72, 0, 1) * 1.1 * strength
    v = np.clip((v - 0.2) / 0.32, 0, 1)                    # soft threshold: ragged edges
    # ink pools at the edges of solid shapes a little
    edge = np.clip(a - np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3 * n / 1024)),
                                  dtype=np.float32) / 255, 0, 1)
    v = np.clip(v * (0.86 + 0.14 * pressure) + edge * 0.25, 0, 1)
    flecks = (rng.random((n, n)) > 0.999985).astype(np.float32)
    flecks = np.asarray(Image.fromarray((flecks * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)), dtype=np.float32) / 255
    return np.clip(np.maximum(v, flecks * 0.7), 0, 1)


LAST_CHECK = {}


def compose(pen, name: str, place: str, year: int, style: int) -> np.ndarray:
    """The clean impression (before ink), S x S in [0, 1]. LAST_CHECK keeps the lettering scale and any overlap."""
    parts, fs, hit = layout(name, place, year, style)
    frame, text, _, knock, clip, box = parts[:6]
    LAST_CHECK.update(scale=fs, overlap=hit)
    img = ImageChops.lighter(frame, text)
    img = _place(img, pen, box, clip)
    if knock is not None:
        img = ImageChops.subtract(img, knock)
    return np.asarray(img, dtype=np.float32) / 255


def render(qid: str, name: str, place: str, year: int, pen, style: int | None = None, out: int = OUT, ink=True,
           color: str = "#161513") -> bytes:
    """-> PNG bytes: one ink colour (the era's, see p15_stamps.ERA_INK) on transparent, out x out."""
    st = style_of(qid) if style is None else style
    a = compose(pen, short_name(name), place, year, st)
    if ink:
        a = ink_texture(a, int(hashlib.md5(qid.encode()).hexdigest()[8:16], 16))
    alpha = Image.fromarray((a * 255).astype(np.uint8)).resize((out, out), Image.LANCZOS)
    # one colour, so a palette PNG with 16 ink strengths: a quarter of the size of RGBA, the same to the eye
    levels = 16
    idx = np.round(np.asarray(alpha, dtype=np.float32) / 255 * (levels - 1)).astype(np.uint8)
    im = Image.fromarray(idx, "P")
    im.putpalette(list(int(color[i:i + 2], 16) for i in (1, 3, 5)) * levels)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True, transparency=bytes(round(k * 255 / (levels - 1)) for k in range(levels)))
    return buf.getvalue()
