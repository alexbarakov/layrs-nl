"""Parametric line drawings by building type, for every stamp without a hand-composed drawing.

The type comes from Wikidata (P31, cached in data/raw/wd_stamp_types.json) and the name; the era from the year;
the proportions from the building itself where we have them (3D BAG height). A seed from the Wikidata id varies
the parts (spire or lantern, gable shape, sail angle, number of bays) so two churches in one town differ.

kind_of(types, name) -> one of KINDS; draw(qid, kind, year, height) -> Pen.
"""
import math
import random

from stamp_draw import (Pen, arc_pts, balustrade, clock, cone, cornice, crenels, dome, gable, ground, octagon, onion,
                        opening, roof, sails, spire, water, window_grid)
from stamp_landmarks import pinnacle, stage

KINDS = ["church", "chapel", "synagogue", "mill_stage", "mill_ground", "mill_post", "mill_small", "mill_tower",
         "watermill", "house", "farm", "manor", "castle", "fort", "water_tower", "lighthouse", "station", "townhall",
         "gate", "pumping", "public", "industrial", "warehouse", "bridge"]

# Wikidata type label -> kind (first match in the item's types wins, in this order)
TYPE_MAP = [
    ("stellingmill", "mill_stage"), ("smock mill on a small hill", "mill_ground"), ("grondzeiler", "mill_ground"),
    ("post mill", "mill_post"), ("spider's head mill", "mill_small"), ("pyramid pump", "mill_small"),
    ("wip mill", "mill_small"), ("tower mill", "mill_tower"), ("watermill", "watermill"), ("windmill", "mill_ground"),
    ("water tower", "water_tower"), ("lighthouse", "lighthouse"),
    ("railway station", "station"), ("station building", "station"),
    ("city gate", "gate"), ("gate building", "gate"), ("city hall", "townhall"), ("weigh house", "townhall"),
    ("pumping station", "pumping"), ("steamdriven pumping station", "pumping"),
    ("synagogue", "synagogue"), ("chapel", "chapel"), ("cathedral", "church"), ("basilica", "church"),
    ("church", "church"), ("steeple", "church"), ("bell tower", "church"),
    ("castle", "castle"), ("fort", "fort"), ("fortification", "fort"),
    ("château", "manor"), ("manor", "manor"), ("estate", "manor"), ("mansion", "manor"), ("buitenplaats", "manor"),
    ("palace", "manor"), ("villa", "manor"),
    ("farm", "farm"), ("barn", "farm"), ("shed", "farm"),
    ("lock", "bridge"), ("bridge", "bridge"), ("sluice", "bridge"),
    ("warehouse", "warehouse"), ("factory", "industrial"), ("industrial", "industrial"), ("distribution substation", "industrial"),
    ("house", "house"), ("gable", "house"), ("cornice", "house"), ("hofje", "house"), ("clergy house", "house"),
    ("service residence", "house"), ("restaurant", "house"), ("hotel", "house"), ("shop", "house"),
    ("museum", "public"), ("theatre", "public"), ("theater", "public"), ("school", "public"), ("office", "public"),
    ("concert", "public"), ("library", "public"), ("hospital", "public"), ("monastery", "church"),
    ("religious community", "church"),
]
NAME_MAP = [("molen", "mill_ground"), ("watertoren", "water_tower"), ("vuurtoren", "lighthouse"), ("kapel", "chapel"),
            ("kerk", "church"), ("kathedraal", "church"), ("basiliek", "church"), ("synagoge", "synagogue"),
            ("kasteel", "castle"), ("slot ", "castle"), ("burcht", "castle"), ("fort ", "fort"), ("huis ", "manor"),
            ("station", "station"), ("stadhuis", "townhall"), ("raadhuis", "townhall"), ("waag", "townhall"),
            ("poort", "gate"), ("gemaal", "pumping"), ("boerderij", "farm"), ("hoeve", "farm"), ("brug", "bridge"),
            ("sluis", "bridge"), ("pakhuis", "warehouse"), ("fabriek", "industrial"), ("museum", "public"),
            ("theater", "public"), ("school", "public"), ("toren", "church")]


def kind_of(types, name):
    n = " " + (name or "").lower() + " "
    # the Wikidata type first; the name only when the type says nothing ("Molen De Hoop" typed as 'building')
    ts = [(t or "").lower() for t in types or []]
    for key, k in TYPE_MAP:                         # the most specific type wins: TYPE_MAP is ordered by priority
        if any(key in t for t in ts):
            return k
    for key, k in NAME_MAP:
        if key in n:
            return k
    return None


def era_kind(year):
    return "house" if year < 1800 else "public"


# ================= generators =================
def _church(p, r, year, h, chapel=False):
    gothic = year < 1550 or 1840 <= year < 1930
    top = "pointed" if gothic else "round"
    side = r.random() < 0.65                       # side view (tower left of the nave) or front view
    tw = r.uniform(6.5, 9.5) if not chapel else 0
    th = max(14.0, min(45.0, (h or r.uniform(22, 38)) * 0.62)) if not chapel else 0
    nave_l = r.uniform(22, 36) if not chapel else r.uniform(12, 16)
    eaves = r.uniform(7, 11) if not chapel else r.uniform(4.5, 6)
    rh = eaves * r.uniform(0.8, 1.1)
    if side and not chapel:
        x0 = tw / 2
        ground(p, -tw / 2 - 4, x0 + nave_l + 4)
        p.rect(x0, 0, nave_l, eaves, "b")
        roof(p, x0, eaves, nave_l, rh)
        n = max(3, int(nave_l / 6))
        window_grid(p, x0, eaves * 0.2, nave_l, n, 1, min(3.0, nave_l / n * 0.45), eaves * 0.62, 0, top=top, mullion=gothic)
        if gothic:
            for k in range(n + 1):
                xx = x0 + nave_l * k / n
                p.poly([(xx - 0.5, 0), (xx - 0.5, eaves * 0.7), (xx, eaves * 0.85), (xx + 0.5, eaves * 0.7), (xx + 0.5, 0)], "f", closed=False)
        if r.random() < 0.5:                       # lower choir at the far end
            cl = r.uniform(6, 9)
            p.rect(x0 + nave_l, 0, cl, eaves * 0.85, "m")
            roof(p, x0 + nave_l, eaves * 0.85, cl, rh * 0.8, "hip", ridge_w=cl * 0.4)
            opening(p, x0 + nave_l + cl / 2 - 1.2, eaves * 0.2, 2.4, eaves * 0.5, top)
        cx = 0
    elif chapel:
        cx = None
    else:                                          # front: tower before a wide nave gable
        ground(p, -nave_l / 2 - 4, nave_l / 2 + 4)
        w = min(nave_l, 22)
        p.rect(-w / 2, 0, w, eaves, "b")
        g = [(-w / 2, eaves), (0, eaves + rh * 1.3), (w / 2, eaves)]
        p.poly(g, "m", closed=False); p.hatch(g, step=max(0.6, rh / 10))
        for sx in (-1, 1):
            opening(p, sx * w * 0.32 - 1.3, eaves * 0.2, 2.6, eaves * 0.6, top, mullion=gothic)
        cx = 0
    if chapel:
        ground(p, -nave_l / 2 - 3, nave_l / 2 + 3)
        p.rect(-nave_l / 2, 0, nave_l, eaves, "b")
        roof(p, -nave_l / 2, eaves, nave_l, rh)
        window_grid(p, -nave_l / 2, eaves * 0.25, nave_l, 3, 1, 1.8, eaves * 0.55, 0, top=top)
        opening(p, -1, 0, 2, eaves * 0.6, top, "m")
        # roof turret (dakruiter)
        tx = -nave_l * 0.3 if r.random() < 0.5 else 0
        stage(p, tx, eaves + rh * 0.8, 1.8, 2.4, n=1, oct_=True, top=top)
        spire(p, tx, eaves + rh * 0.8 + 2.4, 2.2, r.uniform(4, 7), tiles=False)
        return
    # tower, in front of the nave
    p.occlude([(cx - tw / 2, 0), (cx + tw / 2, 0), (cx + tw / 2, th), (cx - tw / 2, th)])
    p.rect(cx - tw / 2, 0, tw, th, "b")
    opening(p, cx - 1.4, 0, 2.8, min(5.5, th * 0.2), top, "m")
    opening(p, cx - 0.9, th * 0.42, 1.8, th * 0.18, top)
    sh = min(5.5, th * 0.2)
    stages = 1 if th < 22 else 2
    y = th - sh * stages
    for k in range(stages):
        p.line(cx - tw / 2, y + k * sh, cx + tw / 2, y + k * sh, "f")
        for sx in (-1, 1):
            opening(p, cx + sx * tw * 0.22 - 0.7, y + k * sh + sh * 0.18, 1.4, sh * 0.62, top)
    if r.random() < 0.45:
        clock(p, cx, y - 2.2, min(1.8, tw * 0.22))
    kinds = (["needle"] * 4 + ["saddle"] * 2 + ["pyramid"]) if gothic else (["lantern"] * 3 + ["needle", "onion", "pyramid"])
    if year >= 1930:
        kinds = ["flat", "needle", "pyramid"]
    tk = r.choice(kinds)
    if tk == "needle":
        if gothic and r.random() < 0.6:
            for sx in (-1, 1):
                pinnacle(p, cx + sx * tw / 2, th, 1, 3)
        spire(p, cx, th, tw, th * r.uniform(0.7, 1.1))
    elif tk == "saddle":
        g = [(cx - tw / 2, th), (cx, th + tw * 0.9), (cx + tw / 2, th)]
        p.poly(g, "m", closed=False)
        p.line(cx, th + tw * 0.9, cx, th + tw * 0.9 + 2, "f")
    elif tk == "pyramid":
        cone(p, cx, th, tw + 0.6, tw * 1.2)
    elif tk == "onion":
        onion(p, cx, th, tw * 0.9, tw * 0.9)
    elif tk == "flat":
        p.rect(cx - tw / 2 - 0.4, th, tw + 0.8, 0.6, "m")
        p.line(cx, th + 0.6, cx, th + 5, "m"); p.line(cx - 1.4, th + 3.6, cx + 1.4, th + 3.6, "m")
    else:  # lantern
        cornice(p, cx - tw / 2, th, tw, 0.4, 0.6)
        stage(p, cx, th + 0.6, tw * 0.72, tw * 0.6, n=2, oct_=True, top="round")
        y2 = th + 0.6 + tw * 0.6
        onion(p, cx, y2, tw * 0.78, tw * 0.6)
        stage(p, cx, y2 + tw * 0.6, tw * 0.3, tw * 0.35, n=1, oct_=True)
        spire(p, cx, y2 + tw * 0.95, tw * 0.3, tw * 0.9, tiles=False)


def _synagogue(p, r, year, h):
    w = r.uniform(14, 20); e = r.uniform(9, 12)
    ground(p, -w / 2 - 3, w / 2 + 3)
    p.rect(-w / 2, 0, w, e, "b")
    cornice(p, -w / 2, e, w, 0.6, 0.8)
    p.poly([(-w / 2 - 0.6, e + 0.8), (0, e + 0.8 + w * 0.22), (w / 2 + 0.6, e + 0.8)], "m")
    p.circle(0, e + 0.8 + w * 0.09, 1.2, "f")
    window_grid(p, -w / 2, 1.2, w, 3, 2, 2.2, e * 0.32, e * 0.45, top="round")
    for sx in (-1, 1):
        x = sx * (w / 2 - 1.5)
        p.rect(x - 1.5, e, 3, 4, "m")
        dome(p, x, e + 4, 3.4, 2.4, ribs=2)


def _mill_body(p, base_y, bw, tw, mh, thatch=True):
    pts = [(-bw / 2, base_y), (-tw / 2, base_y + mh), (tw / 2, base_y + mh), (bw / 2, base_y)]
    p.poly(pts, "b")
    for k in (-0.33, 0.33):                        # octagon edges
        p.line(k * bw, base_y, k * tw, base_y + mh, "f")
    if thatch:
        p.hatch(pts, step=0.75, angle=90)
    return base_y + mh


def _cap(p, y, w):
    p.poly(arc_pts(0, y, w / 2 + 0.5, w * 0.55, 180, 0, 16), "m")
    p.line(-w / 2 - 0.5, y, w / 2 + 0.5, y, "m")
    return y + w * 0.3


def _mill(p, r, kind):
    ang = r.choice([8, 20, 32, 45])
    if kind == "mill_post":
        ground(p, -12, 12)
        p.poly([(-5, 0), (0, 5.5), (5, 0)], "m", closed=False)     # trestle
        p.line(0, 0, 0, 7.5, "b"); p.line(-3, 2.2, 3, 2.2, "m")
        p.rect(-3.6, 7.5, 7.2, 8.5, "b")
        p.poly(arc_pts(0, 16, 3.9, 1.6, 180, 0, 10), "m", closed=False)
        p.hatch([(-3.6, 7.5), (3.6, 7.5), (3.6, 16), (-3.6, 16)], step=0.7, angle=90)
        p.line(3.6, 8, 8.5, 0, "m"); p.line(4.4, 8.2, 9.3, 0.2, "f")  # stair
        for k in range(1, 8):
            t = k / 8
            p.line(3.6 + 4.9 * t, 8 - 8 * t, 4.4 + 4.9 * t, 8.2 - 8 * t, "f")
        sails(p, 0, 14, 11.5, ang)
        return
    if kind == "mill_small":
        ground(p, -9, 9)
        p.poly([(-3.4, 0), (-1.2, 6.5), (1.2, 6.5), (3.4, 0)], "b")
        p.hatch([(-3.4, 0), (-1.2, 6.5), (1.2, 6.5), (3.4, 0)], step=0.6, angle=90)
        p.rect(-1.5, 6.5, 3, 2.2, "m")
        sails(p, 0, 7.8, 6.5, ang)
        water(p, -9, 9, -0.7, 2)
        return
    if kind == "mill_tower":
        ground(p, -14, 14)
        y = 0
        pts = [(-4.6, 0), (-3.2, 16), (3.2, 16), (4.6, 0)]
        p.poly(pts, "b")
        for yy in range(2, 16, 2):
            hw = 4.6 - 1.4 * yy / 16
            p.line(-hw, yy, hw, yy, "f")
        opening(p, -0.9, 0, 1.8, 3, "round", "m"); opening(p, -0.6, 8, 1.2, 2, "round", fill=True)
        cy = _cap(p, 16, 6.4)
        sails(p, 0, cy + 0.6, 13, ang)
        return
    stage_ = kind == "mill_stage"
    ground(p, -16, 16)
    if stage_:
        # brick base, gallery, thatched body
        p.poly([(-5.6, 0), (-5.2, 7), (5.2, 7), (5.6, 0)], "b")
        opening(p, -1.1, 0, 2.2, 3.6, "seg", "m")
        opening(p, -3.8, 3.6, 1.4, 1.8, "flat"); opening(p, 2.4, 3.6, 1.4, 1.8, "flat")
        p.rect(-9, 7, 18, 0.6, "m")                                # stelling
        balustrade(p, -9, 7.6, 18, 1.2, 12)
        for sx in (-1, 1):
            p.line(sx * 8.6, 7, sx * 5.4, 4, "f")
        top = _mill_body(p, 7.6, 9.6, 5.8, 10)
    else:
        if r.random() < 0.3:                                       # on a mound (beltmolen)
            p.poly(arc_pts(0, 0, 13, 3, 180, 0, 20), "m", closed=False)
            base = 3
        else:
            base = 0
        p.poly([(-5.2, base), (-5.2, base + 3), (5.2, base + 3), (5.2, base)], "m", closed=False)
        opening(p, -1.1, base, 2.2, 2.8, "seg", "m")
        top = _mill_body(p, base + 3, 9.4, 5.6, 9)
    opening(p, -0.6, top - 4.5, 1.2, 1.6, "flat", fill=True)
    cy = _cap(p, top, 5.8)
    sails(p, 0, cy + 0.4, 14 if stage_ else 12, ang)


def _watermill(p, r, year, h):
    ground(p, -14, 14)
    water(p, -14, 14, -0.7, 3)
    p.rect(-8, 0, 12, 6, "b")
    roof(p, -8, 6, 12, 6, "hip", ridge_w=3)
    window_grid(p, -8, 1.2, 12, 3, 1, 1.4, 2.4, 0, top="flat")
    cx, cy, R = 8.6, 3.6, 4.6
    p.circle(cx, cy, R, "b"); p.circle(cx, cy, R * 0.82, "f"); p.circle(cx, cy, 0.6, "m", fill=True)
    for k in range(12):
        a = math.radians(k * 30)
        p.line(cx + math.cos(a) * 0.6, cy + math.sin(a) * 0.6, cx + math.cos(a) * R, cy + math.sin(a) * R, "f")


def _house(p, r, year, h):
    if year < 1600:
        kinds = ["stepped", "stepped", "spout", "triangle"]
    elif year < 1700:
        kinds = ["stepped", "neck", "neck", "spout"]
    elif year < 1800:
        kinds = ["bell", "neck", "cornice", "bell"]
    else:
        kinds = ["cornice", "cornice", "triangle"]
    floors = max(2, min(5, int((h or r.uniform(9, 15)) / 3.2)))
    w = r.uniform(6.5, 8.5)
    fh = 3.2
    x = -w / 2
    tops = "flat" if year >= 1650 else r.choice(["flat", "seg"])
    widths = [r.uniform(5, 6.5), w, r.uniform(5, 6.5)]
    xs = [x - widths[0], x, x + w]
    ground(p, xs[0] - 1, xs[2] + widths[2] + 1)
    for i, (xx, ww) in enumerate(zip(xs, widths)):
        main = i == 1
        fl = floors if main else max(2, floors + r.choice([-1, 0]))
        hh = fl * fh + 1
        p.rect(xx, 0, ww, hh, "b" if main else "m")
        g = r.choice(kinds) if not main else kinds[0] if r.random() < 0.3 else r.choice(kinds)
        gh = ww * (0.9 if g in ("stepped", "neck", "bell", "spout") else 0.45)
        if g == "cornice":
            cornice(p, xx, hh, ww, 0.3, 0.7, "m")
            if main:
                balustrade(p, xx, hh + 0.7, ww, 0.8, 6)
        else:
            gp = gable(xx, hh, ww, gh, g, 3)
            p.poly(gp, "m", closed=False)
            opening(p, xx + ww / 2 - 0.7, hh + gh * 0.25, 1.4, gh * 0.3, "flat" if g != "stepped" else "seg")
        cols = 3 if ww > 6 else 2
        window_grid(p, xx, 1.4 + fh, ww, cols, fl - 1, ww / cols * 0.5, fh * 0.6, fh, top=tops, transom=True)
        if main:
            opening(p, xx + ww / 2 - 0.8, 0.6, 1.6, 2.6, "round" if year < 1800 else "flat", "m")
            p.poly([(xx + ww / 2 - 1.6, 0), (xx + ww / 2 - 1.6, 0.6), (xx + ww / 2 + 1.6, 0.6), (xx + ww / 2 + 1.6, 0)], "f")
            if cols == 3:
                window_grid(p, xx, 1.1, ww, 2, 1, 1.2, 2.2, 0, top=tops)
        else:
            window_grid(p, xx, 1.1, ww, cols, 1, ww / cols * 0.5, 2.2, 0, top=tops)


def _farm(p, r, year, h):
    # head house with a high gable end, barn behind under one long roof
    L = r.uniform(26, 34)
    ground(p, -10, L - 6)
    hw = r.uniform(8, 10)
    e = r.uniform(3.2, 4.2)
    rh = r.uniform(8, 10)
    x0 = -hw / 2
    p.rect(x0, 0, hw, e, "b")
    g = [(x0 - 0.3, e), (0, e + rh), (x0 + hw + 0.3, e)]
    p.poly(g, "m", closed=False)
    if r.random() < 0.4:
        p.hatch(g, step=0.8, angle=0)
    # uilenbord (owl board) at the top
    p.poly([(-0.8, e + rh - 1.6), (0, e + rh - 0.4), (0.8, e + rh - 1.6)], "f")
    opening(p, -0.5, e + rh * 0.45, 1, 1.4, "flat")
    window_grid(p, x0, 0.8, hw, 3, 1, 1.4, 2.2, 0, top="flat", transom=True)
    # barn: long roof seen from the side, low eaves
    bx = x0 + hw
    bl = L - hw
    be = e * 0.8
    p.poly([(bx, be), (bx, e + rh), (bx + bl * 0.88, e + rh), (bx + bl, be)], "m", closed=True)
    p.hatch([(bx, be), (bx, e + rh), (bx + bl * 0.88, e + rh), (bx + bl, be)], step=0.75, angle=0)
    p.rect(bx, 0, bl, be, "m")
    p.rect(bx + bl * 0.55, 0, 4.2, be * 0.95, "m"); p.line(bx + bl * 0.55 + 2.1, 0, bx + bl * 0.55 + 2.1, be * 0.95, "f")
    window_grid(p, bx, 0.8, bl * 0.5, 3, 1, 0.9, 1.2, 0, top="flat")
    if r.random() < 0.6:                            # a tree beside the farm
        tx = x0 - 4
        p.line(tx, 0, tx, 3, "f")
        p.poly(arc_pts(tx, 7.2, 3.2, 4.6, -90, 270, 24), "f")


def _manor(p, r, year, h, palace=False):
    w = r.uniform(20, 28) if not palace else r.uniform(34, 44)
    floors = 2 if r.random() < 0.6 else 3
    e = floors * 3.6 + 1
    ground(p, -w / 2 - 4, w / 2 + 4)
    p.rect(-w / 2, 0, w, e, "b")
    cornice(p, -w / 2, e, w, 0.4, 0.6)
    rk = "mansard" if 1800 <= year < 1900 and r.random() < 0.5 else "hip"
    roof(p, -w / 2, e + 0.6, w, e * 0.55, rk, ridge_w=w * 0.45)
    for sx in (-0.3, 0.3):                         # chimneys
        cx = sx * w
        p.rect(cx - 0.6, e + e * 0.4, 1.2, e * 0.3, "m")
    bays = max(5, int(w / 3.2)) | 1
    window_grid(p, -w / 2, 1.2, w, bays, floors, 1.5, 2.6, 3.6, top="flat" if year >= 1650 else "seg", transom=True)
    # centre: pediment or tower
    cw = w / bays * 3
    p.rect(-cw / 2, 0, cw, e, "m")
    if year >= 1650 and r.random() < 0.7:
        p.poly([(-cw / 2 - 0.4, e + 0.6), (0, e + 0.6 + cw * 0.3), (cw / 2 + 0.4, e + 0.6)], "m")
        p.circle(0, e + 0.6 + cw * 0.11, 0.8, "f")
    else:
        stage(p, 0, e + 0.6, 2.6, 3, n=1, oct_=True)
        onion(p, 0, e + 3.6, 3, 2.6)
    p.poly([(-2.4, 0), (-2.4, 0.6), (-1.6, 0.6), (-1.6, 1.0), (1.6, 1.0), (1.6, 0.6), (2.4, 0.6), (2.4, 0)], "m", closed=False)
    if r.random() < 0.4:                            # moat
        water(p, -w / 2 - 4, w / 2 + 4, -0.7, 2)


def _castle(p, r, year, h):
    w = r.uniform(18, 26)
    e = r.uniform(10, 14)
    ground(p, -w / 2 - 6, w / 2 + 6)
    water(p, -w / 2 - 6, w / 2 + 6, -0.8, 3)
    p.rect(-w / 2, 0, w, e, "b")
    crenels(p, -w / 2, e, w, max(5, int(w / 2.2)), 0.9)
    window_grid(p, -w / 2, e * 0.45, w, 4, 1, 1.3, 2.4, 0, top="round")
    for sx in (-1, 1):
        x = sx * w / 2
        tw = r.uniform(6, 8); th = e + r.uniform(3, 6)
        p.rect(x - tw / 2, 0, tw, th, "b")
        p.line(x - tw * 0.3, 0, x - tw * 0.3, th, "f"); p.line(x + tw * 0.3, 0, x + tw * 0.3, th, "f")
        opening(p, x - 0.6, th * 0.55, 1.2, 2.2, "round")
        if r.random() < 0.5:
            crenels(p, x - tw / 2, th, tw, 4, 0.8)
            cone(p, x, th + 0.8, tw + 0.6, tw * 1.1)
        else:
            cone(p, x, th, tw + 0.8, tw * 1.25)
    # keep or gatehouse
    kw = r.uniform(6, 8); kh = e + r.uniform(6, 12)
    p.rect(-kw / 2, 0, kw, kh, "b")
    opening(p, -1.8, 0, 3.6, 5.5, "round", "m")
    for yy in (e * 0.6, e * 0.6 + 4):
        opening(p, -0.7, yy, 1.4, 2.6, "round")
    if r.random() < 0.5:
        crenels(p, -kw / 2, kh, kw, 4, 0.9)
    else:
        p.poly(gable(-kw / 2, kh, kw, kw * 0.7, "stepped", 2), "m", closed=False)
        spire(p, 0, kh + kw * 0.7, 2.2, 6, tiles=False)


def _fort(p, r, year, h):
    w = r.uniform(26, 34)
    ground(p, -w / 2 - 4, w / 2 + 4)
    water(p, -w / 2 - 4, w / 2 + 4, -0.8, 3)
    p.poly([(-w / 2, 0), (-w / 2 + 2, 6), (w / 2 - 2, 6), (w / 2, 0)], "b")
    p.hatch([(-w / 2, 0), (-w / 2 + 2, 6), (w / 2 - 2, 6), (w / 2, 0)], step=0.8, angle=0)
    p.rect(-5, 0, 10, 9, "b")
    opening(p, -2, 0, 4, 5.5, "round", "m")
    p.poly([(-5.6, 9), (0, 12.5), (5.6, 9)], "m")
    p.line(0, 12.5, 0, 16, "f"); p.poly([(0, 16), (2.6, 15.3), (0, 14.6)], "f")


def _water_tower(p, r, year, h):
    th = max(26.0, min(48.0, h or r.uniform(30, 42)))
    ground(p, -10, 10)
    if year >= 1940 and r.random() < 0.6:          # concrete: stem and tank
        p.rect(-2.4, 0, 4.8, th * 0.72, "b")
        for yy in range(3, int(th * 0.72), 4):
            p.line(-2.4, yy, 2.4, yy, "f")
        y = th * 0.72
        p.poly([(-2.4, y), (-8, y + 4), (-8, y + 9), (8, y + 9), (8, y + 4), (2.4, y)], "b")
        window_grid(p, -8, y + 5, 16, 8, 1, 0.9, 3, 0, top="flat")
        p.rect(-8.4, y + 9, 16.8, 0.6, "m")
        return
    sw = r.uniform(7, 9)
    octagon(p, 0, 0, sw, th * 0.7, "b")
    opening(p, -1, 0, 2, 3.4, "round", "m")
    for yy in (th * 0.2, th * 0.38, th * 0.56):
        opening(p, -0.6, yy, 1.2, 2.6, "round")
    y = th * 0.7
    cornice(p, -sw / 2, y, sw, 0.6, 0.8)
    tw = sw * 1.35
    p.rect(-tw / 2, y + 0.8, tw, th * 0.18, "b")
    window_grid(p, -tw / 2, y + 2, tw, 6, 1, 0.9, th * 0.1, 0, top="round")
    y2 = y + 0.8 + th * 0.18
    cornice(p, -tw / 2, y2, tw, 0.5, 0.6)
    if r.random() < 0.5:
        cone(p, 0, y2 + 0.6, tw + 0.4, tw * 0.5)
    else:
        dome(p, 0, y2 + 0.6, tw, tw * 0.35, ribs=4)


def _lighthouse(p, r, year, h):
    th = max(18.0, min(40.0, h or r.uniform(22, 34)))
    ground(p, -10, 10)
    bw, tw = r.uniform(6.5, 8), r.uniform(4, 5)
    pts = [(-bw / 2, 0), (-tw / 2, th), (tw / 2, th), (bw / 2, 0)]
    p.poly(pts, "b")
    if r.random() < 0.5:                            # painted bands
        for k in range(1, 4, 2):
            y0, y1 = th * k / 4, th * (k + 1) / 4
            hw0, hw1 = bw / 2 - (bw - tw) / 2 * k / 4, bw / 2 - (bw - tw) / 2 * (k + 1) / 4
            p.hatch([(-hw0, y0), (-hw1, y1), (hw1, y1), (hw0, y0)], step=0.45, angle=0)
    opening(p, -0.8, 0, 1.6, 2.8, "round", "m")
    for yy in (th * 0.3, th * 0.55, th * 0.78):
        opening(p, -0.4, yy, 0.8, 1.6, "round", fill=True)
    p.rect(-tw / 2 - 1.2, th, tw + 2.4, 0.6, "m")
    balustrade(p, -tw / 2 - 1.2, th + 0.6, tw + 2.4, 1.0, 6)
    p.rect(-tw * 0.35, th + 0.6, tw * 0.7, 3, "m")
    p.line(-tw * 0.35, th + 0.6, tw * 0.35, th + 3.6, "f"); p.line(tw * 0.35, th + 0.6, -tw * 0.35, th + 3.6, "f")
    dome(p, 0, th + 3.6, tw * 0.85, 1.6, ribs=2, lantern=False)
    p.line(0, th + 5.2, 0, th + 6.8, "f")


def _station(p, r, year, h):
    if year >= 1940:
        ground(p, -24, 24)
        p.rect(-20, 0, 40, 7, "b")
        p.rect(-23, 7, 46, 0.8, "b")
        for k in range(11):
            x = -20 + k * 4
            p.line(x, 0, x, 7, "f")
        p.line(-20, 4.6, 20, 4.6, "f")
        p.rect(10, 0, 5, 16, "b")
        clock(p, 12.5, 13.5, 1.6)
        return
    ground(p, -24, 24)
    for sx in (-1, 1):
        x0 = 6 if sx > 0 else -21
        p.rect(x0, 0, 15, 9, "b")
        roof(p, x0, 9, 15, 4)
        window_grid(p, x0, 1.2, 15, 4, 2, 1.6, 2.8, 4, top="round")
    p.rect(-6, 0, 12, 12, "b")
    opening(p, -2, 0, 4, 6.5, "round", "m")
    window_grid(p, -6, 7.4, 12, 3, 1, 1.8, 3, 0, top="round")
    p.poly(gable(-6, 12, 12, 7, r.choice(["stepped", "triangle"]), 3), "m", closed=False)
    tx = r.choice([-1, 1]) * 8
    p.rect(tx - 2.4, 9, 4.8, 13, "m")
    clock(p, tx, 18.5, 1.6)
    cone(p, tx, 22, 5.4, 6)


def _townhall(p, r, year, h):
    w = r.uniform(12, 16)
    e = r.uniform(9, 12)
    ground(p, -w / 2 - 3, w / 2 + 3)
    p.rect(-w / 2, 1.2, w, e, "b")
    p.poly([(-3.5, 0), (-3.5, 1.2), (3.5, 1.2), (3.5, 0)], "m")
    for k in (1, 2):
        p.line(-3.5 + k * 0.5, 1.2 - k * 0.4, 3.5 - k * 0.5, 1.2 - k * 0.4, "f")
    top = "pointed" if year < 1550 else "flat"
    opening(p, -1.4, 1.2, 2.8, 4, "round", "m")
    for sx in (-1, 1):
        opening(p, sx * w * 0.3 - 0.9, 2.4, 1.8, 3.2, top, transom=True)
    window_grid(p, -w / 2, 6.8, w, 4, 1, 1.6, 3.4, 0, top=top, transom=True)
    if year < 1650:
        g = gable(-w / 2, e + 1.2, w, w * 0.75, "stepped", 4)
        p.poly(g, "m", closed=False)
        opening(p, -0.8, e + 2.6, 1.6, 3, top)
        tw = 2.4; ty = e + 1.2 + w * 0.75
    else:
        cornice(p, -w / 2, e + 1.2, w, 0.5, 0.7)
        p.poly([(-w / 2 - 0.5, e + 1.9), (0, e + 1.9 + w * 0.25), (w / 2 + 0.5, e + 1.9)], "m")
        p.circle(0, e + 1.9 + w * 0.09, 0.8, "f")
        tw = 2.6; ty = e + 1.9 + w * 0.25 - 0.6
    stage(p, 0, ty, tw, 3, n=1, oct_=True, top="round")
    if r.random() < 0.5:
        onion(p, 0, ty + 3, tw * 1.1, 2.4); spire(p, 0, ty + 5.4, 1, 3, tiles=False, cross=False)
    else:
        spire(p, 0, ty + 3, tw + 0.4, 6, tiles=False, cross=False)


def _gate(p, r, year, h):
    ground(p, -14, 14)
    w = r.uniform(9, 12); e = r.uniform(10, 14)
    p.rect(-w / 2, 0, w, e, "b")
    opening(p, -2.4, 0, 4.8, 7, "round" if year >= 1550 else "pointed", "m")
    opening(p, -0.8, e * 0.7, 1.6, 2.4, "round")
    if r.random() < 0.5:
        for sx in (-1, 1):
            x = sx * (w / 2 + 2.6)
            p.rect(x - 2.6, 0, 5.2, e * 0.85, "b")
            p.line(x - 1.6, 0, x - 1.6, e * 0.85, "f"); p.line(x + 1.6, 0, x + 1.6, e * 0.85, "f")
            cone(p, x, e * 0.85, 5.8, 6)
        crenels(p, -w / 2, e, w, 4, 0.9)
        cone(p, 0, e + 0.9, w * 0.7, 5)
    else:
        cornice(p, -w / 2, e, w, 0.4, 0.6)
        stage(p, 0, e + 0.6, w * 0.55, 3.4, n=2, oct_=True, top="round")
        onion(p, 0, e + 4, w * 0.6, 3.4)
        spire(p, 0, e + 7.4, 1, 3, tiles=False, cross=False)


def _pumping(p, r, year, h):
    ground(p, -16, 16)
    water(p, -16, 16, -0.7, 2)
    w = r.uniform(16, 20); e = r.uniform(7, 9)
    p.rect(-w / 2, 0, w, e, "b")
    window_grid(p, -w / 2, 1.2, w, 4, 1, 2.2, e * 0.65, 0, top="round", mullion=True)
    if year < 1900:
        roof(p, -w / 2, e, w, e * 0.5, "hip", ridge_w=w * 0.5)
    else:
        p.poly(gable(-w / 2, e, w, e * 0.6, "triangle"), "m", closed=False)
    cx = w / 2 - 2.5
    p.poly([(cx - 1.4, e), (cx - 0.8, e + 16), (cx + 0.8, e + 16), (cx + 1.4, e)], "b", closed=False)
    p.rect(cx - 1.1, e + 16, 2.2, 0.8, "m")


def _public(p, r, year, h):
    if year < 1800:
        w = r.uniform(16, 22); e = r.uniform(10, 13)
        ground(p, -w / 2 - 3, w / 2 + 3)
        p.rect(-w / 2, 0, w, e, "b")
        cornice(p, -w / 2, e, w, 0.5, 0.7)
        window_grid(p, -w / 2, 1.4, w, 7, 2, 1.4, e * 0.28, e * 0.45, top="flat", transom=True)
        roof(p, -w / 2, e + 0.7, w, e * 0.35, "hip", ridge_w=w * 0.5)
        p.occlude([(-w * 0.24, e + 0.7), (0, e + 0.7 + w * 0.16), (w * 0.24, e + 0.7)])
        p.poly([(-w * 0.24, e + 0.7), (0, e + 0.7 + w * 0.16), (w * 0.24, e + 0.7)], "m")
        p.circle(0, e + 0.7 + w * 0.06, 0.7, "f")
        return
    if year < 1900:                                 # eclectic: centre tower or dome, mansard wings
        w = r.uniform(22, 30); e = r.uniform(10, 13)
        ground(p, -w / 2 - 3, w / 2 + 3)
        p.rect(-w / 2, 0, w, e, "b")
        roof(p, -w / 2, e, w, e * 0.4, "mansard")
        window_grid(p, -w / 2, 1.2, w, 7, 2, 1.6, e * 0.3, e * 0.45, top="round")
        p.rect(-4, 0, 8, e + 4, "b")
        opening(p, -1.8, 0, 3.6, 5, "round", "m")
        opening(p, -1.4, 6, 2.8, 4.5, "round", mullion=True)
        if r.random() < 0.5:
            dome(p, 0, e + 4, 8, 4.5)
        else:
            p.poly([(-4.4, e + 4), (0, e + 7.5), (4.4, e + 4)], "m")
            clock(p, 0, e + 5.4, 1.1)
        return
    if year < 1945:                                 # brick block with a tower (Amsterdam School, Dudok)
        w = r.uniform(22, 30); e = r.uniform(8, 11)
        ground(p, -w / 2 - 3, w / 2 + 3)
        p.rect(-w / 2, 0, w, e, "b")
        p.rect(-w / 2 - 0.4, e, w + 0.8, 0.6, "m")
        for k in range(9):
            x = -w / 2 + w * (k + 0.5) / 9
            p.rect(x - 0.6, 1.2, 1.2, e - 2.4, "f")
            p.line(x - 0.6, e * 0.5, x + 0.6, e * 0.5, "f")
        tx = r.choice([-1, 1]) * w * 0.28
        th = e + r.uniform(8, 14)
        p.rect(tx - 2.6, 0, 5.2, th, "b")
        for yy in range(int(e) + 1, int(th) - 2, 2):
            p.line(tx - 1.4, yy, tx + 1.4, yy, "f")
        p.rect(tx - 3, th, 6, 0.7, "m"); p.rect(tx - 2, th + 0.7, 4, 1.4, "m")
        clock(p, tx, th - 2, 1.3)
        return
    # modernist: slab on pilotis, window grid
    w = r.uniform(22, 30); e = r.uniform(9, 14)
    ground(p, -w / 2 - 3, w / 2 + 3)
    p.rect(-w / 2, 2.6, w, e - 2.6, "b")
    for k in range(6):
        x = -w / 2 + 1 + k * (w - 2) / 5
        p.line(x, 0, x, 2.6, "m")
    p.rect(-w * 0.2, 0, w * 0.4, 2.6, "f")
    rows = int((e - 2.6) / 2.2)
    for j in range(rows):
        y = 2.6 + 0.6 + j * 2.2
        p.line(-w / 2, y + 1.4, w / 2, y + 1.4, "f")
        for k in range(int(w / 1.6)):
            x = -w / 2 + k * 1.6
            p.line(x, y, x, y + 1.4, "f")
    p.rect(-w / 2 - 0.4, e, w + 0.8, 0.5, "m")


def _industrial(p, r, year, h):
    ground(p, -18, 18)
    n = r.randint(3, 5)
    bw = 26 / n
    for k in range(n):                              # sawtooth
        x = -13 + k * bw
        p.poly([(x, 7), (x, 10.5), (x + bw, 7)], "m", closed=False)
        p.line(x, 7, x, 10.5, "f")
    p.rect(-13, 0, 26, 7, "b")
    window_grid(p, -13, 1.2, 26, 6, 1, 2.2, 4, 0, top="seg", mullion=True)
    p.poly([(9, 7), (9.6, 24), (11.4, 24), (12, 7)], "b", closed=False)
    p.rect(9.2, 24, 2.6, 0.8, "m")


def _warehouse(p, r, year, h):
    ground(p, -12, 12)
    for k, xx in enumerate((-10, -3.5, 3)):
        w = 6.5; fl = 5
        p.rect(xx, 0, w, fl * 3, "b" if k == 1 else "m")
        g = gable(xx, fl * 3, w, w * 0.6, "spout" if k != 2 else "triangle")
        p.poly(g, "m", closed=False)
        p.line(xx + w / 2, fl * 3 + w * 0.3, xx + w / 2 + 1.6, fl * 3 + w * 0.3, "m")    # hoist beam
        for f in range(fl):
            y = 0.8 + f * 3
            p.rect(xx + w / 2 - 1, y, 2, 2.2, "f")
            p.line(xx + w / 2, y, xx + w / 2, y + 2.2, "f")
            for sx in (-1, 1):
                p.rect(xx + w / 2 + sx * 2.1 - 0.5, y + 0.3, 1, 1.6, "f")


def _bridge(p, r, year, h):
    ground(p, -20, -12); ground(p, 12, 20)
    water(p, -14, 14, -1.0, 3)
    p.line(-20, 4, 20, 4, "b")
    arches = [(-6, 11), (6, 11)] if r.random() < 0.5 else [(0, 18)]
    for cx, span in arches:
        p.poly(arc_pts(cx, 0, span / 2, 3.4, 180, 0, 16), "m", closed=False)
    balustrade(p, -20, 4, 40, 1.2, 24)
    for sx in (-1, 1):                              # lamp posts
        x = sx * 12
        p.line(x, 5.2, x, 9, "m"); p.circle(x, 9.4, 0.5, "f")


GEN = {
    "church": lambda p, r, y, h: _church(p, r, y, h), "chapel": lambda p, r, y, h: _church(p, r, y, h, chapel=True),
    "synagogue": _synagogue,
    "mill_stage": lambda p, r, y, h: _mill(p, r, "mill_stage"), "mill_ground": lambda p, r, y, h: _mill(p, r, "mill_ground"),
    "mill_post": lambda p, r, y, h: _mill(p, r, "mill_post"), "mill_small": lambda p, r, y, h: _mill(p, r, "mill_small"),
    "mill_tower": lambda p, r, y, h: _mill(p, r, "mill_tower"), "watermill": _watermill,
    "house": _house, "farm": _farm, "manor": _manor, "castle": _castle, "fort": _fort, "water_tower": _water_tower,
    "lighthouse": _lighthouse, "station": _station, "townhall": _townhall, "gate": _gate, "pumping": _pumping,
    "public": _public, "industrial": _industrial, "warehouse": _warehouse, "bridge": _bridge,
}


def draw(qid: str, kind: str, year: int, height: float | None = None) -> Pen:
    r = random.Random(qid)
    p = Pen()
    GEN[kind or era_kind(year)](p, r, year, height)
    return p
