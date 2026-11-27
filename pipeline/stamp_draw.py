"""Line drawings of buildings for LAYRS stamps: a small vector pen and a set of architectural parts.

Coordinates are architectural: x to the right, y up, ground at y = 0, metres-ish units. Everything is a frontal
elevation (no perspective), drawn with three line weights:

  'b' bold   silhouette and main outlines
  'm' medium storeys, gables, large openings
  'f' fine   windows, tiles, hatching, ornament

Pen.svg(w, h) fits the drawing into a w x h pixel box (centred, standing on the bottom edge) and keeps line weights
in pixels whatever the building's size, so a tower and a farm print with the same stroke. rasterize() turns the SVG
into an ink mask with librsvg (rsvg-convert).

Used by stamp_landmarks.py (hand-composed drawings of the best-known buildings) and stamp_types.py (parametric
drawings by building type for the rest).
"""
import math
import subprocess

import numpy as np
from shapely.geometry import LineString, Polygon

WEIGHTS = {"b": 2.6, "m": 1.7, "f": 1.0}       # px at a 512 px stamp; scaled with the box


class Pen:
    def __init__(self):
        self.items = []                          # (kind, data, weight)

    # ---------- primitives ----------
    def line(self, x1, y1, x2, y2, w="f"):
        self.items.append(("pl", [(x1, y1), (x2, y2)], w, False)); return self

    def poly(self, pts, w="m", closed=True):
        self.items.append(("pl", [tuple(p) for p in pts], w, closed)); return self

    def fill(self, pts):
        self.items.append(("fill", [tuple(p) for p in pts], "f", True)); return self

    def circle(self, cx, cy, r, w="f", fill=False):
        self.items.append(("c", (cx, cy, r), w, fill)); return self

    def rect(self, x, y, w, h, wt="m"):
        return self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], wt)

    def hatch(self, pts, step=1.2, angle=0, w="f"):
        """Parallel lines clipped to a polygon: roof tiles, slate, shadow."""
        poly = Polygon(pts)
        if not poly.is_valid or poly.area <= 0:
            return self
        x0, y0, x1, y1 = poly.bounds
        r = math.hypot(x1 - x0, y1 - y0)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        a = math.radians(angle)
        dx, dy = math.cos(a), math.sin(a)
        nx, ny = -dy, dx
        k = -r
        while k <= r:
            ln = LineString([(cx + nx * k - dx * r, cy + ny * k - dy * r), (cx + nx * k + dx * r, cy + ny * k + dy * r)])
            seg = poly.intersection(ln)
            for g in getattr(seg, "geoms", [seg]):
                if g.geom_type == "LineString" and g.length > 0.2:
                    self.items.append(("pl", list(g.coords), w, False))
            k += step
        return self

    def occlude(self, pts):
        """Hide what is already drawn behind a solid shape (hidden-line removal for parts drawn in front)."""
        poly = Polygon(pts).buffer(0)
        kept = []
        for kind, d, w, flag in self.items:
            if kind != "pl":
                kept.append((kind, d, w, flag)); continue
            line = LineString(d + [d[0]] if flag else d)
            if not line.intersects(poly):
                kept.append((kind, d, w, flag)); continue
            rest = line.difference(poly)
            for g in getattr(rest, "geoms", [rest]):
                if g.geom_type == "LineString" and g.length > 0.05:
                    kept.append(("pl", list(g.coords), w, False))
        self.items = kept
        return self

    # ---------- bbox and output ----------
    def bbox(self):
        xs, ys = [], []
        for kind, d, _, _ in self.items:
            if kind == "c":
                cx, cy, r = d; xs += [cx - r, cx + r]; ys += [cy - r, cy + r]
            else:
                xs += [p[0] for p in d]; ys += [p[1] for p in d]
        return min(xs), min(ys), max(xs), max(ys)

    def svg(self, W, H, pad=0.02, weight_scale=1.0):
        x0, y0, x1, y1 = self.bbox()
        bw, bh = x1 - x0, y1 - y0
        s = min(W * (1 - 2 * pad) / bw, H * (1 - pad) / bh)
        ox = (W - bw * s) / 2 - x0 * s                     # centred
        oy = H - (H * pad * 0.2)                           # standing on the bottom edge (y = 0 -> bottom)
        oy = oy + y0 * s                                   # lowest point on the bottom
        px = lambda p: f"{ox + p[0] * s:.2f},{oy - p[1] * s:.2f}"
        unit = W / 360 * weight_scale                      # stroke widths relative to the box
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
               '<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">']
        for kind, d, w, flag in self.items:
            sw = WEIGHTS[w] * unit
            if kind == "pl":
                pts = " ".join(px(p) for p in d)
                tag = "polygon" if flag else "polyline"
                out.append(f'<{tag} points="{pts}" stroke-width="{sw:.2f}"/>')
            elif kind == "fill":
                pts = " ".join(px(p) for p in d)
                out.append(f'<polygon points="{pts}" fill="#000" stroke-width="{WEIGHTS["f"] * unit:.2f}"/>')
            elif kind == "c":
                cx, cy, r = d
                f = ' fill="#000"' if flag else ""
                out.append(f'<circle cx="{ox + cx * s:.2f}" cy="{oy - cy * s:.2f}" r="{r * s:.2f}" stroke-width="{sw:.2f}"{f}/>')
        out.append("</g></svg>")
        return "\n".join(out)


def rasterize(svg: str, W: int, H: int) -> np.ndarray:
    """SVG -> ink in [0, 1] (H x W) via librsvg."""
    from io import BytesIO
    from PIL import Image
    png = subprocess.run(["rsvg-convert", "-w", str(W), "-h", str(H), "-f", "png"], input=svg.encode(),
                         capture_output=True, check=True).stdout
    im = Image.open(BytesIO(png)).convert("RGBA")
    return np.asarray(im, dtype=np.float32)[..., 3] / 255.0


# ================= architectural parts =================
def arc_pts(cx, cy, rx, ry, a0, a1, n=16):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def opening(p, x, y, w, h, top="round", wt="f", fill=False, mullion=False, transom=False):
    """Window or door: x left, y sill. top: flat | round | pointed | seg (segmental)."""
    if top == "flat":
        pts = [(x, y), (x, y + h), (x + w, y + h), (x + w, y)]
    elif top == "round":
        r = w / 2; hs = max(0.0, h - r)
        pts = [(x, y), (x, y + hs)] + arc_pts(x + r, y + hs, r, r, 180, 0)[1:-1] + [(x + w, y + hs), (x + w, y)]
    elif top == "seg":
        rise = w * 0.18; hs = h - rise
        pts = [(x, y), (x, y + hs)] + [(x + w / 2 - (w / 2) * math.cos(math.pi * i / 8), y + hs + rise * math.sin(math.pi * i / 8))
                                       for i in range(1, 8)] + [(x + w, y + hs), (x + w, y)]
    else:  # pointed (gothic): two arcs of radius w, each centred on the opposite jamb
        rise = w * math.sin(math.radians(60)); hs = max(0.0, h - rise)
        left = [(x + w - w * math.cos(math.radians(a)), y + hs + w * math.sin(math.radians(a))) for a in range(0, 61, 10)]
        right = [(x + w * math.cos(math.radians(a)), y + hs + w * math.sin(math.radians(a))) for a in range(60, -1, -10)]
        pts = [(x, y)] + left + right[1:] + [(x + w, y)]
    if fill:
        p.fill(pts)
    else:
        p.poly(pts, wt, closed=True)
    if mullion and not fill:
        top_y = max(q[1] for q in pts)
        p.line(x + w / 2, y, x + w / 2, top_y - (w * 0.3 if top != "flat" else 0), "f")
    if transom and not fill:
        p.line(x, y + h * 0.62, x + w, y + h * 0.62, "f")
    return p


def window_grid(p, x, y, w, cols, rows, ww, wh, gy, top="flat", fill=False, **kw):
    """Evenly spaced bays across [x, x + w], rows starting at sill y with vertical pitch gy."""
    pitch = w / cols
    for r in range(rows):
        for c in range(cols):
            opening(p, x + pitch * (c + 0.5) - ww / 2, y + r * gy, ww, wh, top, fill=fill, **kw)
    return p


def gable(x, y, w, h, kind="triangle", steps=4):
    """Outline points of a gable on [x, x + w] at eaves height y, rising h. Returns the polygon (open bottom)."""
    cx = x + w / 2
    if kind == "triangle":
        return [(x, y), (cx, y + h), (x + w, y)]
    if kind == "stepped":
        pts = [(x, y)]
        sw, sh = (w / 2) / (steps + 0.5), h / (steps + 1)
        for i in range(steps):
            pts += [(x + i * sw, y + (i + 1) * sh), (x + (i + 1) * sw, y + (i + 1) * sh)]
        pts += [(cx - sw / 2, y + h), (cx + sw / 2, y + h)]
        for i in range(steps - 1, -1, -1):
            pts += [(x + w - (i + 1) * sw, y + (i + 1) * sh), (x + w - i * sw, y + (i + 1) * sh)]
        pts += [(x + w, y)]
        return pts
    if kind == "neck":                                # Amsterdam neck gable: shoulders, scrolls, neck, small pediment
        nx = w * 0.3; sh = h * 0.34
        scroll = [(x + nx * (1 - math.cos(math.radians(a))), y + sh + (h * 0.2) * math.sin(math.radians(a))) for a in range(0, 91, 15)]
        left = [(x, y), (x, y + sh)] + scroll[1:] + [(x + nx, y + h * 0.82), (x + nx - w * 0.04, y + h * 0.82)]
        top = [(cx, y + h)]
        right = [(2 * cx - px, py) for px, py in reversed(left)]
        return left + top + right
    if kind == "bell":
        pts = [(x, y)]
        for i in range(1, 20):
            t = i / 20
            xx = x + w * t
            yy = y + h * (math.sin(math.pi * t) ** 0.7) * (0.9 + 0.1 * math.cos(2 * math.pi * t * 2))
            pts.append((xx, yy))
        return pts[:10] + [(cx, y + h)] + pts[10:] + [(x + w, y)]
    if kind == "spout":
        sw = w * 0.36
        return [(x, y), (cx - sw / 2, y + h * 0.7), (cx - sw / 2, y + h * 0.88), (cx, y + h), (cx + sw / 2, y + h * 0.88),
                (cx + sw / 2, y + h * 0.7), (x + w, y)]
    if kind == "cornice":
        return [(x - w * 0.03, y), (x - w * 0.03, y + h * 0.18), (x + w * 1.03, y + h * 0.18), (x + w * 1.03, y)]
    raise ValueError(kind)


def spire(p, cx, y, w, h, wt="m", tiles=True, cross=True, ball=True):
    pts = [(cx - w / 2, y), (cx, y + h), (cx + w / 2, y)]
    p.poly(pts, wt, closed=True)
    if tiles:
        p.line(cx, y, cx, y + h, "f")
        p.hatch(pts, step=max(0.6, h / 22), angle=0)
    if ball:
        p.circle(cx, y + h + w * 0.08, w * 0.08, "f", fill=True)
    if cross:
        top = y + h + w * 0.16
        p.line(cx, y + h, cx, top + w * 0.5, "f")
        p.line(cx - w * 0.14, top + w * 0.32, cx + w * 0.14, top + w * 0.32, "f")
    return p


def octagon(p, cx, y, w, h, wt="m"):
    """Front view of an octagonal prism: three visible faces."""
    p.rect(cx - w / 2, y, w, h, wt)
    e = w * 0.29
    p.line(cx - w / 2 + e, y, cx - w / 2 + e, y + h, "f"); p.line(cx + w / 2 - e, y, cx + w / 2 - e, y + h, "f")
    return p


def cornice(p, x, y, w, over=0.6, h=0.6, wt="m"):
    p.rect(x - over, y, w + 2 * over, h, wt)
    return p


def balustrade(p, x, y, w, h=1.2, n=None):
    n = n or max(3, int(w / 0.8))
    p.line(x, y + h, x + w, y + h, "m")
    for i in range(n + 1):
        xx = x + w * i / n
        p.line(xx, y, xx, y + h, "f")
    return p


def clock(p, cx, cy, r):
    p.circle(cx, cy, r, "m")
    p.circle(cx, cy, r * 0.78, "f")
    p.line(cx, cy, cx, cy + r * 0.62, "f"); p.line(cx, cy, cx + r * 0.45, cy - r * 0.1, "f")
    return p


def dome(p, cx, y, w, h, ribs=4, wt="m", lantern=True):
    pts = arc_pts(cx, y, w / 2, h, 180, 0, 24)
    p.poly(pts, wt, closed=False); p.line(cx - w / 2, y, cx + w / 2, y, wt)
    for i in range(1, ribs):                       # meridians: half-ellipses narrowing towards the edge
        rx = (w / 2) * math.cos(math.pi * i / ribs)
        p.poly([(cx + rx * math.cos(math.radians(b)), y + h * math.sin(math.radians(b))) for b in range(0, 91, 10)], "f", closed=False)
    if lantern:
        lw = w * 0.18
        p.rect(cx - lw / 2, y + h * 0.96, lw, h * 0.35, "f")
        p.poly(arc_pts(cx, y + h * 1.31, lw / 2 * 1.2, lw * 0.5, 180, 0, 8), "f", closed=False)
    return p


def onion(p, cx, y, w, h, wt="m"):
    """Bulbous cap: narrow neck, widest at a third of its height, drawn-out tip."""
    ts = np.linspace(0, 1, 30)
    rs = np.interp(ts, [0, 0.12, 0.32, 0.55, 0.8, 1.0], [0.32, 0.44, 0.5, 0.36, 0.1, 0.0]) * w
    left = [(cx - r, y + h * t) for t, r in zip(ts, rs)]
    right = [(cx + r, y + h * t) for t, r in zip(ts[::-1], rs[::-1])]
    p.poly(left + right[1:], wt, closed=False)
    p.line(cx - rs[0], y, cx + rs[0], y, "f")
    p.line(cx, y + h, cx, y + h + w * 0.4, "f")
    return p


def cone(p, cx, y, w, h, wt="m", tiles=True):
    pts = [(cx - w / 2, y), (cx, y + h), (cx + w / 2, y)]
    p.poly(pts, wt, closed=True)
    if tiles:
        p.hatch(pts, step=max(0.5, h / 14), angle=0)
    p.line(cx, y + h, cx, y + h + w * 0.35, "f")
    return p


def crenels(p, x, y, w, n=None, h=None):
    """Battlement along [x, x + w] at height y: n merlons with n - 1 gaps."""
    n = n or max(3, int(w / 1.6))
    step = w / (2 * n - 1)
    h = h or step * 0.9
    pts = [(x, y), (x, y + h)]
    for i in range(2 * n - 1):
        x1 = x + (i + 1) * step
        up = i % 2 == 0
        pts += [(x1, y + h), (x1, y)] if up else [(x1, y), (x1, y + h)]
    p.poly(pts, "m", closed=False)
    return p


def roof(p, x, y, w, h, kind="gable", hatch=True, ridge_w=None):
    """Side view of a roof over [x, x + w] at eaves y: gable (ridge line, no front face) or hip / mansard."""
    if kind == "hip":
        rw = ridge_w if ridge_w is not None else w * 0.35
        pts = [(x, y), (x + (w - rw) / 2, y + h), (x + (w + rw) / 2, y + h), (x + w, y)]
    elif kind == "mansard":
        pts = [(x, y), (x + w * 0.08, y + h * 0.65), (x + w * 0.3, y + h), (x + w * 0.7, y + h), (x + w * 0.92, y + h * 0.65), (x + w, y)]
    else:  # long roof seen from the side, ridge parallel to the facade
        pts = [(x, y), (x + w * 0.04, y + h), (x + w * 0.96, y + h), (x + w, y)]
    p.poly(pts, "m", closed=True)
    if hatch:
        p.hatch(pts, step=max(0.55, h / 12), angle=0)
    return pts


def sails(p, cx, cy, R, angle=20, width=None):
    """Four windmill sails as lattices."""
    w = width or R * 0.16
    for k in range(4):
        a = math.radians(angle + 90 * k)
        ux, uy = math.cos(a), math.sin(a)
        nx, ny = -uy, ux
        r0 = R * 0.12
        p.line(cx, cy, cx + ux * R, cy + uy * R, "m")
        # lattice on one side of the stock
        a0 = (cx + ux * R * 0.22, cy + uy * R * 0.22)
        a1 = (cx + ux * R, cy + uy * R)
        b0 = (a0[0] + nx * w, a0[1] + ny * w); b1 = (a1[0] + nx * w, a1[1] + ny * w)
        p.poly([a0, b0, b1, a1], "f", closed=False)
        n = 9
        for i in range(n + 1):
            t = 0.22 + 0.78 * i / n
            q = (cx + ux * R * t, cy + uy * R * t)
            p.line(q[0], q[1], q[0] + nx * w, q[1] + ny * w, "f")
        p.line(a0[0] + nx * w * 0.5, a0[1] + ny * w * 0.5, a1[0] + nx * w * 0.5, a1[1] + ny * w * 0.5, "f")
    p.circle(cx, cy, R * 0.045, "m", fill=True)
    return p


def ground(p, x0, x1, y=0):
    p.line(x0, y, x1, y, "b")
    return p


def water(p, x0, x1, y=-0.6, n=3, gap=0.9):
    for i in range(n):
        yy = y - i * gap
        pts = [(x, yy + 0.18 * math.sin(x * 2.2 + i)) for x in np.linspace(x0 + i * 0.8, x1 - i * 0.8, 40)]
        p.poly(pts, "f", closed=False)
    return p


def tree(p, cx, w, h):
    """A small round tree, only as a frame for low buildings."""
    p.line(cx, 0, cx, h * 0.4, "f")
    p.poly(arc_pts(cx, h * 0.62, w / 2, h * 0.38, -90, 270, 24), "f")
    return p
