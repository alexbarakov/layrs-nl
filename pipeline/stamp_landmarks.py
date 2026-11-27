"""Hand-composed line drawings of the best-known stamp buildings, one function per Wikidata item.

Each drawing is a frontal elevation in metres-ish units, composed from the parts in stamp_draw.py against reference
photos (Commons) and published elevations. Proportions follow the real building (tower heights, number of bays,
gable types); details are simplified to what survives on a 30 mm rubber stamp.

DRAWINGS maps qid -> function(Pen). Everything not here is drawn by stamp_types.py from its building type.
"""
import math

from stamp_draw import (Pen, arc_pts, balustrade, clock, cone, cornice, crenels, dome, gable, ground, octagon, onion,
                        opening, roof, sails, spire, water, window_grid)


def pinnacle(p, cx, y, w, h):
    p.poly([(cx - w / 2, y), (cx - w / 2, y + h * 0.45), (cx, y + h), (cx + w / 2, y + h * 0.45), (cx + w / 2, y)], "f", closed=False)


def stage(p, cx, y, w, h, n=2, top="round", oct_=False, wt="m", ow=None, oh=None, sill=None):
    """A tower stage with n openings."""
    (octagon if oct_ else (lambda p, cx, y, w, h, wt: p.rect(cx - w / 2, y, w, h, wt)))(p, cx, y, w, h, wt)
    ow = ow or w / (n * 2.2)
    oh = oh or h * 0.6
    sill = y + (sill if sill is not None else (h - oh) / 2)
    pitch = w / n
    for i in range(n):
        opening(p, cx - w / 2 + pitch * (i + 0.5) - ow / 2, sill, ow, oh, top, "f")


# ---------- Amsterdam ----------
def westerkerk(p: Pen):
    ground(p, -14, 74)
    # nave seen from the side, two transept gables
    p.rect(8, 0, 64, 17, "b")
    roof(p, 8, 17, 64, 12)
    for gx in (20, 44):
        g = [(gx, 17), (gx, 24), (gx + 3, 24), (gx + 3, 28), (gx + 6, 28), (gx + 6, 33), (gx + 10, 33), (gx + 10, 28),
             (gx + 13, 28), (gx + 13, 24), (gx + 16, 24), (gx + 16, 17)]
        p.poly(g, "m", closed=False)
        p.rect(gx, 0, 16, 17, "m")
        opening(p, gx + 4.5, 4, 7, 15, "round", mullion=True, transom=True)
        opening(p, gx + 6.5, 25, 3, 5, "round")
        for px in (gx, gx + 16, gx + 8):
            p.line(px, 33 if px == gx + 8 else 24, px, (36 if px == gx + 8 else 26), "f")
    for wx in (11, 38, 62):
        opening(p, wx, 4, 5, 11, "round", mullion=True)
    # Westertoren: brick shaft, three stone stages, the imperial crown
    cx = 0
    p.rect(cx - 6, 0, 12, 34, "b")
    opening(p, cx - 2, 0, 4, 6, "round")
    for yy in (10, 18):
        opening(p, cx - 3.4, yy, 2.2, 5, "round", "f"); opening(p, cx + 1.2, yy, 2.2, 5, "round", "f")
    clock(p, cx, 29, 2.6)
    balustrade(p, cx - 6.5, 34, 13, 1.4)
    stage(p, cx, 35.4, 10.5, 11, n=2, top="round")
    cornice(p, cx - 5.25, 46.4, 10.5, 0.6, 0.8)
    balustrade(p, cx - 5, 47.2, 10, 1.2)
    stage(p, cx, 48.4, 8.4, 8.5, n=2, top="round", oct_=True)
    cornice(p, cx - 4.2, 56.9, 8.4, 0.5, 0.7)
    stage(p, cx, 57.6, 6.4, 6.5, n=2, top="round", oct_=True)
    cornice(p, cx - 3.2, 64.1, 6.4, 0.4, 0.6)
    stage(p, cx, 64.7, 4.6, 4.2, n=1, top="round", oct_=True)
    # crown: band, arches meeting at an orb, cross
    p.rect(cx - 3.2, 68.9, 6.4, 1.1, "m")
    p.poly(arc_pts(cx, 70, 3.2, 5.0, 180, 0, 16), "m", closed=False)
    p.poly(arc_pts(cx, 70, 1.4, 5.0, 180, 0, 12), "f", closed=False)
    p.line(cx, 70, cx, 75, "f")
    for k in range(-2, 3):
        p.circle(cx + k * 1.4, 70.5, 0.35, "f", fill=True)
    p.circle(cx, 75.6, 0.7, "m")
    p.line(cx, 76.3, cx, 85, "m"); p.line(cx - 1.1, 82, cx + 1.1, 82, "f")


def oude_kerk_amsterdam(p: Pen):
    ground(p, -14, 52)
    # chapels and three gothic gables of the Lady Chapel side
    p.rect(8, 0, 42, 13, "b")
    roof(p, 8, 13, 42, 10)
    for gx in (12, 25, 38):
        g = [(gx, 13), (gx + 5.5, 26), (gx + 11, 13)]
        p.poly(g, "m", closed=False)
        p.hatch(g, step=0.9, angle=0)
        opening(p, gx + 2.5, 3, 6, 15, "pointed", mullion=True)
        pinnacle(p, gx, 13, 1, 3)
    pinnacle(p, 49, 13, 1, 3)
    # west tower: brick base, octagonal stages, lantern spire
    cx = 0
    p.rect(cx - 6, 0, 12, 26, "b")
    opening(p, cx - 2.2, 0, 4.4, 7, "pointed")
    opening(p, cx - 2, 12, 4, 9, "pointed", mullion=True)
    balustrade(p, cx - 6.2, 26, 12.4, 1.2)
    stage(p, cx, 27.2, 8.5, 9, n=2, top="round", oct_=True)
    clock(p, cx, 33.5, 1.8)
    cornice(p, cx - 4.25, 36.2, 8.5, 0.5, 0.7)
    stage(p, cx, 36.9, 6.6, 7.5, n=2, top="round", oct_=True)
    cornice(p, cx - 3.3, 44.4, 6.6, 0.4, 0.6)
    stage(p, cx, 45, 5, 5.5, n=1, top="round", oct_=True)
    onion(p, cx, 50.5, 5.5, 5)
    stage(p, cx, 55.6, 2.4, 3, n=1, oct_=True)
    spire(p, cx, 58.6, 2.4, 8, tiles=False)


def munttoren(p: Pen):
    ground(p, -16, 16)
    # the low guardhouse with a stepped gable beside the tower
    p.rect(4, 0, 10, 9, "b")
    p.poly(gable(4, 9, 10, 7, "stepped", 3), "m", closed=False)
    window_grid(p, 4, 1.5, 10, 2, 2, 2, 2.8, 4, top="flat", transom=True)
    p.rect(-14, 0, 9, 7, "m"); roof(p, -14, 7, 9, 4, "hip")
    window_grid(p, -14, 1.5, 9, 2, 1, 2, 3, 4, top="flat")
    cx = 0
    p.rect(cx - 4.5, 0, 9, 19, "b")
    opening(p, cx - 1.6, 0, 3.2, 5.5, "round")
    opening(p, cx - 1, 9, 2, 4, "round")
    cornice(p, cx - 4.5, 19, 9, 0.5, 0.8)
    stage(p, cx, 19.8, 7, 7.5, n=1, oct_=True, ow=1.6, oh=2.4, sill=0.7)
    clock(p, cx, 24.5, 2.1)
    cornice(p, cx - 3.5, 27.3, 7, 0.4, 0.6)
    balustrade(p, cx - 3.6, 27.9, 7.2, 1)
    stage(p, cx, 28.9, 5.2, 5.2, n=2, top="round", oct_=True)
    cornice(p, cx - 2.6, 34.1, 5.2, 0.3, 0.5)
    stage(p, cx, 34.6, 3.6, 3.6, n=1, top="round", oct_=True)
    onion(p, cx, 38.2, 4, 3.4)
    stage(p, cx, 41.6, 1.6, 2, n=1, oct_=True, ow=0.6)
    spire(p, cx, 43.6, 1.6, 4, tiles=False, cross=False)


def waag_amsterdam(p: Pen):
    ground(p, -20, 20)
    p.rect(-9, 0, 18, 13, "b")
    roof(p, -9, 13, 18, 6, "hip", ridge_w=4)
    window_grid(p, -9, 2, 18, 3, 2, 1.8, 3.6, 5.5, top="seg")
    opening(p, -1.6, 0, 3.2, 4.5, "round", "m")
    # four round towers with cones (two front, a taller stair tower behind)
    for cx, h, w in ((0, 18, 6), (-13, 15, 8), (13, 15, 8)):
        if cx == 0:
            p.occlude([(cx - w / 2, 13), (cx + w / 2, 13), (cx + w / 2, h + 3), (cx - w / 2, h + 3)])
            octagon(p, cx, 13, w, h - 13 + 3)
            window_grid(p, cx - w / 2, 15, w, 2, 1, 1, 2, 2, top="round")
            cone(p, cx, h + 3, w + 1, 9)
        else:
            p.rect(cx - w / 2, 0, w, h, "b")
            p.line(cx - w * 0.3, 0, cx - w * 0.3, h, "f"); p.line(cx + w * 0.3, 0, cx + w * 0.3, h, "f")
            for yy in (2.5, 8.5):
                opening(p, cx - 0.9, yy, 1.8, 3.4, "seg")
            crenels(p, cx - w / 2, h, w, 4, 0.9)
            cone(p, cx, h + 0.9, w + 0.6, 9)
    for cx in (-6, 6):
        cone(p, cx, 13, 2.6, 6)


def concertgebouw(p: Pen):
    ground(p, -48, 48)
    # wings
    for sgn in (-1, 1):
        x0 = 14 if sgn > 0 else -34
        p.rect(x0, 0, 20, 15, "b")
        roof(p, x0, 15, 20, 5)
        window_grid(p, x0, 2, 20, 4, 1, 2.2, 5, 6, top="round")
        window_grid(p, x0, 9, 20, 4, 1, 2.2, 3.8, 6, top="flat")
        # corner pavilions with curved caps and lanterns
        px = 34 if sgn > 0 else -46
        p.rect(px, 0, 12, 19, "b")
        window_grid(p, px, 2, 12, 2, 2, 2.2, 5, 8, top="round")
        cornice(p, px, 19, 12, 0.6, 0.8)
        p.poly(gable(px, 19.8, 12, 7, "bell"), "m", closed=False)
        p.hatch(gable(px, 19.8, 12, 7, "bell"), step=0.8)
        p.rect(px + 4.5, 26.4, 3, 2.2, "f"); p.poly(arc_pts(px + 6, 28.6, 1.9, 1.6, 180, 0, 10), "f", closed=False)
        p.line(px + 6, 30.2, px + 6, 32, "f")
    # central block with columns, three big arched windows, pediment, lyre
    p.rect(-14, 0, 28, 22, "b")
    for k in range(5):
        x = -12 + k * 6
        p.rect(x - 0.6, 8, 1.2, 13, "f")
    window_grid(p, -12, 9, 24, 3, 1, 4.5, 11, 0, top="round", mullion=True, transom=True)
    window_grid(p, -14, 0, 28, 3, 1, 3.6, 6, 0, top="round", wt="m")
    cornice(p, -14, 21, 28, 0.8, 1)
    ped = [(-15, 22), (0, 30), (15, 22)]
    p.poly(ped, "m")
    p.circle(0, 25, 1.8, "f")
    p.poly([(-12, 22.6), (0, 29), (12, 22.6)], "f")
    # golden lyre on top
    p.poly(arc_pts(0, 33, 1.8, 2.6, 200, 340, 10), "m", closed=False)
    p.line(-1.7, 32, -1.4, 35, "m"); p.line(1.7, 32, 1.4, 35, "m"); p.line(-1.5, 35, 1.5, 35, "f")
    for k in (-0.6, 0, 0.6):
        p.line(k, 31, k, 35, "f")


def amsterdam_centraal(p: Pen):
    ground(p, -56, 56)
    # train shed behind
    p.poly(arc_pts(0, 14, 46, 20, 160, 20, 40), "f", closed=False)
    p.poly(arc_pts(0, 14, 43, 17.5, 158, 22, 40), "f", closed=False)
    for sgn in (-1, 1):
        x0 = 16 if sgn > 0 else -40
        p.rect(x0, 0, 24, 15, "b")
        roof(p, x0, 15, 24, 5)
        window_grid(p, x0, 1.5, 24, 5, 2, 2, 4, 6.5, top="round")
        for k in range(2):                                     # dormers
            dx = x0 + 6 + k * 12
            p.poly([(dx - 1.2, 15), (dx - 1.2, 18.5), (dx, 20), (dx + 1.2, 18.5), (dx + 1.2, 15)], "f", closed=False)
        # end pavilions with stepped gables
        px = 40 if sgn > 0 else -54
        p.rect(px, 0, 14, 19, "b")
        p.poly(gable(px, 19, 14, 9, "stepped", 3), "m", closed=False)
        window_grid(p, px, 1.5, 14, 3, 2, 2, 4.5, 7.5, top="round")
        opening(p, px + 5.5, 21, 3, 3.5, "round")
    # central gate building with a big gable and three arches
    p.rect(-16, 0, 32, 22, "b")
    for k in range(3):
        opening(p, -11 + k * 8 - 0.5, 0, 5, 9, "round", "m")
    window_grid(p, -16, 11, 32, 5, 1, 2.6, 6.5, 0, top="round", transom=True)
    p.poly(gable(-11, 22, 22, 12, "stepped", 4), "m", closed=False)
    opening(p, -2.5, 23, 5, 7, "round", mullion=True)
    # two towers: clock on the west, wind dial on the east
    for cx, kind in ((-20, "clock"), (20, "wind")):
        p.rect(cx - 4, 0, 8, 34, "b")
        window_grid(p, cx - 4, 3, 8, 2, 3, 1.6, 4, 8, top="round")
        clock(p, cx, 30, 2.6)
        if kind == "wind":
            p.line(cx, 30, cx - 1.5, 31.5, "m")
        cornice(p, cx - 4, 34, 8, 0.6, 0.8)
        stage(p, cx, 34.8, 6, 5, n=2, top="round", oct_=True)
        onion(p, cx, 39.8, 6.4, 6)
        p.line(cx, 46, cx, 50, "f")


# ---------- Delft, Utrecht, Haarlem, Gouda ----------
def nieuwe_kerk_delft(p: Pen):
    ground(p, -34, 34)
    # nave and choir behind the tower
    p.rect(-30, 0, 60, 16, "b")
    roof(p, -30, 16, 60, 13)
    for x in (-27, -20, 15, 22):
        opening(p, x, 3, 4.4, 11, "pointed", mullion=True)
        p.line(x - 1.3, 0, x - 1.3, 16, "f")
    cx = 0
    # square base with tall blind arcading, in front of the nave
    p.occlude([(cx - 7, 0), (cx + 7, 0), (cx + 7, 40), (cx - 7, 40)])
    p.rect(cx - 7, 0, 14, 40, "b")
    opening(p, cx - 2.6, 0, 5.2, 9, "pointed", "m")
    for yy in (12, 26):
        opening(p, cx - 4.8, yy, 3.6, 11, "pointed", mullion=True)
        opening(p, cx + 1.2, yy, 3.6, 11, "pointed", mullion=True)
    for sx in (-7, 7):
        pinnacle(p, cx + sx, 40, 1.4, 5)
    p.line(cx - 7.6, 40, cx + 7.6, 40, "m")
    # first octagon
    stage(p, cx, 40, 11.5, 20, n=2, top="pointed", oct_=True, ow=2.6, oh=13)
    for sx in (-5.75, 5.75):
        pinnacle(p, cx + sx, 60, 1.2, 4.5)
    p.line(cx - 6.2, 60, cx + 6.2, 60, "m")
    # second octagon, open
    stage(p, cx, 60, 8.6, 14, n=2, top="pointed", oct_=True, ow=2, oh=9.5)
    for sx in (-4.3, 4.3):
        pinnacle(p, cx + sx, 74, 1, 4)
    # needle spire with crockets
    spire(p, cx, 74, 8.6, 33, tiles=False)
    for k in range(1, 7):
        y = 74 + k * 4.4
        half = 4.3 * (1 - (y - 74) / 33)
        p.line(cx - half, y, cx - half - 0.7, y + 0.6, "f"); p.line(cx + half, y, cx + half + 0.7, y + 0.6, "f")
    p.line(cx - 2.1, 74, cx, 107, "f"); p.line(cx + 2.1, 74, cx, 107, "f")


def domtoren(p: Pen):
    ground(p, -16, 16)
    cx = 0
    # base: passage arch, blind panels, corner buttresses
    p.rect(cx - 10, 0, 20, 40, "b")
    opening(p, cx - 4, 0, 8, 17, "pointed", "m")
    opening(p, cx - 3.2, 0, 6.4, 15.5, "pointed", "f")
    for sx in (-10, 8.6):
        p.rect(cx + sx, 0, 1.4, 40, "f")
    for yy in (21, 30):
        for k in (-7, -3, 1, 5):
            opening(p, cx + k - 0.1, yy, 2.2, 7, "pointed", "f")
    p.line(cx - 10.6, 40, cx + 10.6, 40, "m")
    # second square stage with two tall double openings
    p.rect(cx - 9, 40, 18, 30, "b")
    for sx in (-9, 7.8):
        p.rect(cx + sx, 40, 1.2, 30, "f")
    for k in (-5.5, 1.5):
        opening(p, cx + k, 44, 4, 20, "pointed", mullion=True, transom=True)
    for sx in (-9, 9):
        pinnacle(p, cx + sx, 70, 1.6, 7)
    for sx in (-6.5, 6.5):
        pinnacle(p, cx + sx, 70, 1.0, 4)
    p.line(cx - 9.6, 70, cx + 9.6, 70, "m")
    # octagonal lantern
    stage(p, cx, 70, 13, 30, n=2, top="pointed", oct_=True, ow=3, oh=22)
    for sx in (-6.5, 6.5):
        pinnacle(p, cx + sx, 100, 1.2, 5)
    p.line(cx - 7, 100, cx + 7, 100, "m")
    # openwork crown
    stage(p, cx, 100, 7, 6, n=2, top="pointed", oct_=True)
    p.poly([(cx - 3.5, 106), (cx - 1.4, 110), (cx + 1.4, 110), (cx + 3.5, 106)], "m", closed=False)
    p.line(cx, 110, cx, 113, "f"); p.circle(cx, 113.4, 0.4, "f", fill=True)


def bavokerk_haarlem(p: Pen):
    ground(p, -46, 46)
    # long nave with buttresses, transept gable in the middle
    p.rect(-44, 0, 88, 18, "b")
    roof(p, -44, 18, 88, 14)
    for k in range(-5, 6):
        if abs(k) <= 1:
            continue
        x = k * 7.6
        p.rect(x - 0.6, 0, 1.2, 15, "f")
        opening(p, x + 1.6, 3, 4, 11, "pointed", mullion=True)
    g = [(-9, 18), (0, 34), (9, 18)]
    p.occlude([(-9, 0), (9, 0), (9, 18), (0, 34), (-9, 18)])
    p.rect(-9, 0, 18, 18, "m")
    opening(p, -4, 3, 8, 19, "pointed", mullion=True, transom=True)
    p.poly(g, "m", closed=False)
    pinnacle(p, -9, 18, 1.2, 4); pinnacle(p, 9, 18, 1.2, 4)
    # crossing tower: square base above the roof, wooden lantern stages
    cx = 0
    p.rect(cx - 5, 32, 10, 8, "m")
    clock(p, cx, 36, 2)
    cornice(p, cx - 5, 40, 10, 0.5, 0.7)
    stage(p, cx, 40.7, 8, 10, n=2, top="round", oct_=True)
    balustrade(p, cx - 4.1, 50.7, 8.2, 1)
    stage(p, cx, 51.7, 6, 8, n=2, top="round", oct_=True)
    cornice(p, cx - 3, 59.7, 6, 0.4, 0.6)
    stage(p, cx, 60.3, 4.2, 5, n=1, top="round", oct_=True)
    onion(p, cx, 65.3, 4.6, 4)
    spire(p, cx, 69.3, 1.6, 9, tiles=False)


def stadhuis_gouda(p: Pen):
    ground(p, -16, 16)
    p.rect(-9, 2.2, 18, 15, "b")
    # the stair (bordes) in front
    p.poly([(-6, 0), (-6, 2.2), (6, 2.2), (6, 0)], "m")
    for k in range(1, 4):
        p.line(-6 + k * 0.6, 2.2 - k * 0.55, 6 - k * 0.6, 2.2 - k * 0.55, "f")
    opening(p, -1.6, 2.2, 3.2, 5, "pointed", "m")
    window_grid(p, -9, 4, 18, 4, 1, 2.2, 4.5, 0, top="pointed", mullion=True)
    window_grid(p, -9, 10.5, 18, 4, 1, 2.2, 5, 0, top="pointed", mullion=True)
    # steep stepped front gable with pinnacles
    g = gable(-9, 17.2, 18, 15, "stepped", 4)
    p.poly(g, "m", closed=False)
    for x, y in g[1:-1:2]:
        pinnacle(p, x, y, 0.8, 2.4)
    opening(p, -2.6, 20, 2.2, 5, "pointed"); opening(p, 0.4, 20, 2.2, 5, "pointed")
    opening(p, -1, 26, 2, 3.5, "pointed")
    # corner turrets
    for sx in (-10.2, 10.2):
        octagon(p, sx, 13, 2.6, 10)
        spire(p, sx, 23, 2.8, 8, tiles=False, cross=False)
    # roof turret on the gable top
    stage(p, 0, 32.2, 2.6, 4.5, n=1, oct_=True, top="pointed")
    spire(p, 0, 36.7, 3, 9, tiles=False)


def ridderzaal(p: Pen):
    ground(p, -24, 24)
    for sx in (-1, 1):                                         # lower side buildings
        x0 = 13 if sx > 0 else -23
        p.rect(x0, 0, 10, 12, "m"); roof(p, x0, 12, 10, 5, "hip")
        window_grid(p, x0, 2, 10, 2, 2, 1.8, 3, 5, top="seg")
    p.rect(-9, 0, 18, 16, "b")
    g = [(-9, 16), (0, 34), (9, 16)]
    p.poly(g, "m", closed=False)
    p.poly([(-7.6, 16.3), (0, 31.6), (7.6, 16.3)], "f")
    # rose window, portal, small lights
    p.circle(0, 21.5, 3.4, "m"); p.circle(0, 21.5, 2.4, "f"); p.circle(0, 21.5, 0.7, "f")
    for k in range(8):
        a = math.radians(k * 45)
        p.line(math.cos(a) * 0.7, 21.5 + math.sin(a) * 0.7, math.cos(a) * 2.4, 21.5 + math.sin(a) * 2.4, "f")
    opening(p, -2.4, 0, 4.8, 8.5, "pointed", "m"); opening(p, -1.8, 0, 3.6, 7.5, "pointed", "f")
    for x in (-6.5, 4.5):
        opening(p, x, 9.5, 2, 4.5, "pointed")
    opening(p, -0.7, 27, 1.4, 2.6, "pointed")
    # two slender octagonal towers with spires
    for sx in (-10.5, 10.5):
        p.occlude([(sx - 1.8, 0), (sx + 1.8, 0), (sx + 1.8, 26), (sx - 1.8, 26)])
        octagon(p, sx, 0, 3.6, 26, "b")
        for yy in (6, 13, 20):
            opening(p, sx - 0.5, yy, 1, 2.4, "pointed")
        crenels(p, sx - 1.8, 26, 3.6, 3, 0.7)
        spire(p, sx, 26.7, 4.2, 10, cross=False)


# ---------- Den Haag, Rotterdam, Utrecht, castles ----------
def vredespaleis(p: Pen):
    ground(p, -42, 42)
    p.rect(-28, 0, 60, 17, "b")
    # arcade ground floor, windows above
    for k in range(10):
        opening(p, -26 + k * 5.8, 0, 3.6, 7.5, "round", "m")
    window_grid(p, -28, 9.5, 60, 10, 1, 2.4, 5, 0, top="flat", mullion=True, transom=True)
    roof(p, -28, 17, 60, 10, "hip", ridge_w=46)
    for k in range(5):                                         # dormers
        dx = -18 + k * 9
        p.poly([(dx - 1.5, 18.5), (dx - 1.5, 22), (dx, 24.5), (dx + 1.5, 22), (dx + 1.5, 18.5)], "m")
        opening(p, dx - 0.8, 19, 1.6, 2.6, "round")
    # centre gable
    p.poly(gable(-5, 17, 10, 10, "stepped", 3), "m", closed=False)
    opening(p, -1.5, 18.5, 3, 5, "round", mullion=True)
    # tall clock tower on the left
    cx = -33
    p.rect(cx - 5, 0, 10, 44, "b")
    for yy in (4, 14, 24):
        opening(p, cx - 1.2, yy, 2.4, 5.5, "round")
    for sx in (-5, 3.8):
        p.rect(cx + sx, 0, 1.2, 44, "f")
    cornice(p, cx - 5, 44, 10, 0.6, 0.8)
    stage(p, cx, 44.8, 8.6, 9, n=2, top="round")
    clock(p, cx, 39, 2.6)
    for sx in (-4.3, 4.3):
        spire(p, cx + sx, 53.8, 1.6, 5, tiles=False, cross=False, ball=False)
    stage(p, cx, 53.8, 6, 5, n=2, oct_=True, top="round")
    spire(p, cx, 58.8, 6.4, 20)
    # small tower on the right corner
    cx = 35
    octagon(p, cx, 0, 6, 26, "b")
    window_grid(p, cx - 3, 3, 6, 1, 3, 1.6, 3.6, 7, top="round")
    spire(p, cx, 26, 6.6, 12)


def euromast(p: Pen):
    ground(p, -22, 22)
    # trees at the foot
    for tx, tw, th in ((-15, 8, 11), (-8, 6, 8), (13, 9, 12)):
        p.poly(arc_pts(tx, th * 0.55, tw / 2, th * 0.45, -90, 270, 24), "f")
        p.line(tx, 0, tx, th * 0.15, "f")
    # concrete shaft
    p.poly([(-4.5, 0), (-4.5, 96), (4.5, 96), (4.5, 0)], "b", closed=False)
    for k in range(1, 12):
        p.line(-4.5, k * 8, 4.5, k * 8, "f")
    # crow's nest
    p.poly([(-4.5, 93), (-15, 96), (-16, 98.5), (-15, 101), (15, 101), (16, 98.5), (15, 96), (4.5, 93)], "b")
    p.line(-15.5, 98.5, 15.5, 98.5, "f")
    window_grid(p, -15, 99, 30, 10, 1, 1.6, 1.6, 0, top="flat")
    p.rect(-7, 101, 14, 4, "m")
    window_grid(p, -7, 101.8, 14, 5, 1, 1.4, 2, 0, top="flat")
    # space tower with the Euroscoop cabin
    p.poly([(-1.6, 105), (-1.6, 178), (1.6, 178), (1.6, 105)], "b", closed=False)
    p.poly([(-6, 118), (-6.8, 120), (-6.8, 124), (-6, 126), (6, 126), (6.8, 124), (6.8, 120), (6, 118)], "m")
    window_grid(p, -6, 120.4, 12, 6, 1, 1.2, 3.2, 0, top="flat")
    p.rect(-2.4, 172, 4.8, 3, "m")
    p.line(0, 178, 0, 185, "m")
    for k in range(1, 9):
        p.line(-1.6, 105 + k * 8, 1.6, 105 + k * 8, "f")


def rietveld_schroderhuis(p: Pen):
    ground(p, -10, 16)
    # the neighbouring brick house it leans on
    p.rect(9, 0, 6, 11.5, "m"); p.hatch([(9, 0), (15, 0), (15, 11.5), (9, 11.5)], step=0.55)
    # planes: ground floor box, first floor slab, roof slab
    p.rect(-6, 0, 15, 6.6, "b")
    p.rect(-8, 6.4, 17.5, 0.5, "b")                           # balcony slab
    p.rect(-6.5, 6.9, 15.5, 4.6, "m")
    p.rect(-7, 11.5, 17, 0.5, "b")                            # roof slab
    # large windows with steel frames
    for x0, w0, y0, h0, n in ((-5.5, 6, 0.6, 5.2, 3), (1.5, 6.5, 2.2, 3.6, 2), (-6, 7, 7.3, 3.6, 3), (2.2, 5.8, 7.3, 3.8, 2)):
        p.rect(x0, y0, w0, h0, "f")
        for k in range(1, n):
            p.line(x0 + w0 * k / n, y0, x0 + w0 * k / n, y0 + h0, "f")
    # the coloured I-beams and the long vertical line, printed solid
    p.fill([(-8.2, 0), (-7.7, 0), (-7.7, 6.4), (-8.2, 6.4)])
    p.fill([(-6.9, 6.9), (-6.5, 6.9), (-6.5, 12.6), (-6.9, 12.6)])
    p.fill([(0.2, 0), (0.7, 0), (0.7, 2), (0.2, 2)])
    p.fill([(-4, 3.9), (1.4, 3.9), (1.4, 4.3), (-4, 4.3)])
    p.fill([(-10, 6.5), (-8.2, 6.5), (-8.2, 6.85), (-10, 6.85)])
    p.line(-6, 3.4, -10, 3.4, "m")
    p.rect(-1.1, 0, 2, 3.8, "m")                              # door


def muiderslot(p: Pen):
    ground(p, -24, 24, 0)
    water(p, -24, 24, -0.8)
    # walls with crenels
    p.rect(-16, 0, 32, 13, "b")
    crenels(p, -16, 13, 32, 12, 1)
    window_grid(p, -16, 6, 32, 6, 1, 1.4, 2.6, 0, top="round")
    # round corner towers with tent roofs
    for sx in (-18, 18):
        p.occlude([(sx - 4.5, 0), (sx + 4.5, 0), (sx + 4.5, 18), (sx - 4.5, 18)])
        p.rect(sx - 4.5, 0, 9, 17, "b")
        p.line(sx - 2.7, 0, sx - 2.7, 17, "f"); p.line(sx + 2.7, 0, sx + 2.7, 17, "f")
        for yy in (4, 10):
            opening(p, sx - 0.7, yy, 1.4, 2.6, "round")
        crenels(p, sx - 4.5, 17, 9, 4, 1)
        cone(p, sx, 18, 9.6, 9)
    # gatehouse with a spire and the bridge
    p.occlude([(-4, 0), (4, 0), (4, 22), (-4, 22)])
    p.rect(-4, 0, 8, 22, "b")
    opening(p, -1.8, 0, 3.6, 6, "round", "m")
    opening(p, -0.9, 10, 1.8, 3.4, "round"); opening(p, -0.9, 15, 1.8, 3.4, "round")
    p.poly(gable(-4, 22, 8, 5, "stepped", 2), "m", closed=False)
    stage(p, 0, 26, 2.4, 3, n=1, oct_=True)
    spire(p, 0, 29, 2.8, 10, tiles=False)
    p.poly([(-2.2, 0), (-2.6, -2.2), (2.6, -2.2), (2.2, 0)], "m", closed=False)


DRAWINGS = {
    "Q1130722": westerkerk,
    "Q623558": oude_kerk_amsterdam,
    "Q1429748": munttoren,
    "Q2466999": waag_amsterdam,
    "Q849957": concertgebouw,
    "Q50719": amsterdam_centraal,
    "Q678611": nieuwe_kerk_delft,
    "Q3368242": domtoren,
    "Q1545193": bavokerk_haarlem,
    "Q3527239": stadhuis_gouda,
    "Q1894519": ridderzaal,
    "Q834448": vredespaleis,
    "Q969215": euromast,
    "Q914231": rietveld_schroderhuis,
    "Q2426916": muiderslot,
}


# ================= second batch: top by sitelinks =================
def lean(p, start, k, pivot_y=0.0):
    """Shear what was drawn since item `start`: a leaning tower (x += k * height)."""
    out = []
    for kind, d, w, flag in p.items[start:]:
        if kind == "c":
            cx, cy, r = d; out.append((kind, (cx + k * (cy - pivot_y), cy, r), w, flag))
        else:
            out.append((kind, [(x + k * (y - pivot_y), y) for x, y in d], w, flag))
    p.items[start:] = out


def shutters(p, x, y, w, h):
    opening(p, x, y, w, h, "flat", transom=True)
    p.rect(x - w * 0.42, y, w * 0.38, h, "f"); p.rect(x + w * 1.04, y, w * 0.38, h, "f")


def woudagemaal(p: Pen):
    ground(p, -30, 30)
    water(p, -30, 30, -0.8, 3)
    # long engine hall
    p.rect(-14, 0, 38, 9, "b")
    roof(p, -14, 9, 38, 6, "hip", ridge_w=28)
    window_grid(p, -14, 2, 38, 7, 1, 2.6, 5.5, 0, top="round", mullion=True)
    # tall boiler house at the end, with its chimney
    p.occlude([(-26, 0), (-12, 0), (-12, 16), (-26, 16)])
    p.rect(-26, 0, 14, 16, "b")
    p.poly([(-26.6, 16), (-26.6, 17), (-11.4, 17), (-11.4, 16)], "m")
    window_grid(p, -26, 2, 14, 3, 2, 2, 5, 7, top="round", mullion=True)
    p.poly([(20, 15), (20.6, 30), (22.4, 30), (23, 15)], "b", closed=False)
    p.rect(20.2, 30, 2.6, 0.8, "m")
    # outlet arches into the canal
    for k in range(6):
        p.poly(arc_pts(-8 + k * 5.6, -0.2, 2.2, 1.6, 180, 0, 10), "f", closed=False)


def rembrandthuis(p: Pen):
    ground(p, -14, 14)
    w, fl = 10, 3
    p.rect(-w / 2, 0, w, 15, "b")
    p.line(-w / 2, 1.2, w / 2, 1.2, "f")
    for k in (-w / 2 + 0.4, w / 2 - 1.2):                     # pilaster strips
        p.rect(k, 1.2, 0.8, 13.8, "f")
    for r_ in range(fl):
        for c_ in range(3):
            if r_ == 0 and c_ == 1:
                continue
            shutters(p, -w / 2 + 1.9 + c_ * 2.9, 1.8 + r_ * 4.4, 1.4, 3.2)
    opening(p, -0.8, 1.2, 1.6, 3.2, "round", "m")
    p.poly([(-2, 0), (-2, 1.2), (2, 1.2), (2, 0)], "f")
    cornice(p, -w / 2, 15, w, 0.4, 0.8)
    ped = [(-w / 2 - 0.4, 15.8), (0, 19.2), (w / 2 + 0.4, 15.8)]
    p.poly(ped, "m"); opening(p, -0.6, 16.2, 1.2, 1.8, "flat")
    for sx in (-1, 1):                                       # neighbours
        x0 = 5 if sx > 0 else -13
        p.rect(x0, 0, 8, 13, "m")
        p.poly(gable(x0, 13, 8, 5 if sx > 0 else 7, "neck" if sx > 0 else "stepped", 3), "m", closed=False)
        window_grid(p, x0, 1.2, 8, 2, 3, 1.4, 2.6, 4, top="flat")


def nieuwe_kerk_amsterdam(p: Pen):
    ground(p, -24, 24)
    for sx in (-1, 1):                                       # low buildings either side
        x0 = 10 if sx > 0 else -22
        p.rect(x0, 0, 12, 9, "m"); roof(p, x0, 9, 12, 5)
        window_grid(p, x0, 1.5, 12, 3, 1, 1.6, 4, 0, top="pointed")
    roof(p, -18, 18, 36, 8)
    p.line(0, 26, 0, 34, "m"); spire(p, 0, 26, 2.2, 8, tiles=False)          # crossing turret
    p.occlude([(-9, 0), (9, 0), (9, 20), (0, 36), (-9, 20)])
    p.rect(-9, 0, 18, 20, "b")
    g = [(-9, 20), (0, 36), (9, 20)]
    p.poly(g, "m", closed=False); p.poly([(-7.4, 20.6), (0, 33.4), (7.4, 20.6)], "f")
    opening(p, -5, 6, 10, 20, "pointed", "m", mullion=True, transom=True)
    p.line(-2.5, 6, -2.5, 20, "f"); p.line(2.5, 6, 2.5, 20, "f")
    opening(p, -2, 0, 4, 5, "pointed", "m")
    for sx in (-10, 10):                                     # stair turrets
        octagon(p, sx, 0, 2.6, 26, "b")
        spire(p, sx, 26, 3, 7, tiles=False, cross=False)


def huis_ten_bosch(p: Pen):
    ground(p, -26, 26)
    for sx in (-1, 1):
        x0 = 8 if sx > 0 else -24
        p.rect(x0, 0, 16, 9, "m"); roof(p, x0, 9, 16, 4, "hip", ridge_w=10)
        window_grid(p, x0, 1.2, 16, 5, 2, 1.4, 2.8, 4, top="flat", transom=True)
    p.rect(-8, 0, 16, 13, "b")
    cornice(p, -8, 13, 16, 0.5, 0.7)
    window_grid(p, -8, 1.2, 16, 5, 2, 1.6, 3.4, 5.5, top="flat", transom=True)
    p.poly([(-4, 13.7), (0, 16.5), (4, 13.7)], "m")
    # the Oranjezaal: octagonal drum and dome
    octagon(p, 0, 16.5, 9, 4, "m")
    window_grid(p, -4.5, 17.2, 9, 3, 1, 1.2, 2.4, 0, top="round")
    dome(p, 0, 20.5, 9.6, 5.5, ribs=4)
    p.line(0, 27.8, 0, 30, "f")


def paleis_soestdijk(p: Pen):
    ground(p, -34, 34)
    for sx in (-1, 1):                                       # long wings
        x0 = 9 if sx > 0 else -31
        p.rect(x0, 0, 22, 7, "m"); roof(p, x0, 7, 22, 2.5, "hip", ridge_w=18)
        window_grid(p, x0, 1.2, 22, 8, 1, 1.4, 3.4, 0, top="flat", transom=True)
    p.rect(-9, 0, 18, 12, "b")
    cornice(p, -9, 12, 18, 0.5, 0.7)
    window_grid(p, -9, 1.2, 18, 7, 2, 1.4, 3.6, 5.5, top="flat", transom=True)
    # portico of four columns and a pediment
    p.occlude([(-5, 0), (5, 0), (5, 12.7), (-5, 12.7)])
    for k in range(4):
        x = -4.2 + k * 2.8
        p.rect(x - 0.45, 1, 0.9, 10.2, "m")
    p.line(-5, 11.2, 5, 11.2, "m"); p.line(-5, 1, 5, 1, "m")
    p.poly([(-5.4, 12.7), (0, 15.4), (5.4, 12.7)], "m")
    # belvedere
    p.rect(-3, 15.4, 6, 3, "m"); window_grid(p, -3, 15.9, 6, 3, 1, 1, 2, 0, top="round")
    balustrade(p, -3.2, 18.4, 6.4, 0.9, 6)
    p.line(0, 19.3, 0, 23, "f"); p.poly([(0, 23), (2.4, 22.3), (0, 21.6)], "f")


def paleis_het_loo(p: Pen):
    ground(p, -30, 30)
    for sx in (-1, 1):
        x0 = 9 if sx > 0 else -27
        p.rect(x0, 0, 18, 11, "m")
        roof(p, x0, 11, 18, 5, "hip", ridge_w=8)
        window_grid(p, x0, 1.2, 18, 5, 2, 1.4, 3.4, 5, top="flat", transom=True)
        for cx in (x0 + 3, x0 + 15):
            p.rect(cx - 0.6, 14.5, 1.2, 3, "m")
    p.rect(-9, 0, 18, 13, "b")
    cornice(p, -9, 13, 18, 0.5, 0.7)
    roof(p, -9, 13.7, 18, 6, "hip", ridge_w=6)
    window_grid(p, -9, 1.2, 18, 5, 2, 1.5, 3.8, 5.6, top="flat", transom=True)
    p.occlude([(-4, 0), (4, 0), (4, 13.7), (5, 13.7), (0, 17), (-5, 13.7), (-4, 13.7)])
    p.rect(-4, 0, 8, 13.7, "m")
    window_grid(p, -4, 1.2, 8, 2, 2, 1.5, 3.8, 5.6, top="flat", transom=True)
    opening(p, -0.9, 0.6, 1.8, 3.6, "round", "m")
    p.poly([(-5, 13.7), (0, 17), (5, 13.7)], "m"); p.circle(0, 15, 0.8, "f")
    p.line(0, 17, 0, 22, "f"); p.poly([(0, 22), (2.6, 21.2), (0, 20.4)], "f")


def oude_kerk_delft(p: Pen):
    ground(p, -14, 40)
    p.rect(6, 0, 32, 12, "b")
    roof(p, 6, 12, 32, 10)
    for x in (9, 16, 23, 30):
        opening(p, x, 2.5, 3.6, 8, "pointed", mullion=True)
    start = len(p.items)
    p.rect(-6, 0, 12, 38, "b")
    opening(p, -2, 0, 4, 7, "pointed", "m")
    for yy in (12, 22):
        opening(p, -4.4, yy, 3, 7, "pointed"); opening(p, 1.4, yy, 3, 7, "pointed")
    clock(p, 0, 32, 2.2)
    p.line(-6.4, 38, 6.4, 38, "m")
    for sx in (-5.2, 5.2):                                   # four corner turrets
        octagon(p, sx, 38, 1.8, 4)
        spire(p, sx, 42, 2, 6, tiles=False, cross=False)
    octagon(p, 0, 38, 4, 5)
    spire(p, 0, 43, 5.4, 18)
    lean(p, start, 0.035)                                    # the scheve Jan leans east


def kunstmuseum_den_haag(p: Pen):
    ground(p, -34, 34)
    water(p, -34, 34, -0.8, 3)
    # long low gallery, the stepped central block, the entrance hall
    p.rect(-32, 0, 18, 4.5, "m"); p.rect(-32.4, 4.5, 18.8, 0.5, "m")
    for k in range(9):
        p.line(-31 + k * 2, 0.6, -31 + k * 2, 4, "f")
    p.rect(-14, 0, 30, 10, "b"); p.rect(-14.4, 10, 30.8, 0.6, "m")
    p.rect(-6, 10.6, 16, 5, "b"); p.rect(-6.4, 15.6, 16.8, 0.6, "m")
    p.rect(-2, 16.2, 8, 3, "m"); p.rect(-2.3, 19.2, 8.6, 0.5, "m")
    for k in range(7):
        x = -12 + k * 4
        p.rect(x, 2, 1, 6.5, "f")
    for k in range(4):
        p.rect(-4.5 + k * 3.6, 11.6, 0.8, 3, "f")
    p.rect(16, 0, 16, 7, "m"); p.rect(15.6, 7, 16.8, 0.5, "m")
    window_grid(p, 16, 1, 16, 5, 1, 1.6, 4.6, 0, top="flat")
    p.hatch([(-14, 0), (16, 0), (16, 10), (-14, 10)], step=0.9, angle=0)


def teylers_museum(p: Pen):
    ground(p, -16, 16)
    water(p, -16, 16, -0.8, 2)
    for sx in (-1, 1):                                       # neighbours
        x0 = 9 if sx > 0 else -15
        p.rect(x0, 0, 6, 11, "m"); p.poly(gable(x0, 11, 6, 4.5, "bell"), "m", closed=False)
        window_grid(p, x0, 1.2, 6, 2, 3, 1.2, 2.2, 3.4, top="flat")
    p.rect(-9, 0, 18, 13, "b")
    p.line(-9, 6, 9, 6, "m")
    for k in range(4):                                       # columns on two floors
        x = -6.6 + k * 4.4
        p.rect(x - 0.4, 0.6, 0.8, 5.2, "f"); p.rect(x - 0.4, 6.4, 0.8, 5.8, "f")
    for k in range(3):
        opening(p, -5.5 + k * 4.4, 0.8, 2.2, 4.4, "round")
        opening(p, -5.5 + k * 4.4, 7, 2.2, 4.6, "round", mullion=True)
    cornice(p, -9, 13, 18, 0.6, 0.9)
    balustrade(p, -9, 13.9, 18, 1.2, 14)
    # attic and the statue group on top
    p.rect(-4, 13.9, 8, 3.4, "m")
    p.poly([(-1.8, 17.3), (-1.2, 19.5), (-0.4, 21.2), (0.4, 22.6), (1.2, 21), (1.6, 19), (2.2, 17.3)], "m")
    p.poly([(0.4, 22.6), (2.6, 23.8), (1.4, 21.4)], "f")
    p.circle(0.2, 23, 0.5, "f")


def portugese_synagoge(p: Pen):
    ground(p, -24, 24)
    for sx in (-1, 1):                                       # the low annexes round the court
        x0 = 13 if sx > 0 else -23
        p.rect(x0, 0, 10, 5.5, "m"); roof(p, x0, 5.5, 10, 3)
        window_grid(p, x0, 1, 10, 4, 1, 1.2, 2.6, 0, top="flat", transom=True)
    p.rect(-13, 0, 26, 17, "b")
    roof(p, -13, 17, 26, 8, "hip", ridge_w=14)
    for sx in (-13, 12):
        p.rect(sx, 0, 1, 17, "f")                            # corner pilasters
    window_grid(p, -12, 2, 24, 4, 2, 2.6, 6.4, 8, top="round", mullion=True, transom=True)
    cornice(p, -13, 16.4, 26, 0.6, 0.6)


def slot_loevestein(p: Pen):
    ground(p, -22, 22)
    water(p, -22, 22, -0.8, 3)
    p.rect(-11, 0, 18, 14, "b")
    roof(p, -11, 14, 18, 10, "hip", ridge_w=5)
    p.line(-11, 0, -11, 14, "m")
    for yy, n in ((3, 2), (8.5, 3)):
        window_grid(p, -11, yy, 18, n, 1, 1.4, 2.6, 0, top="seg")
    opening(p, -3, 0, 2.4, 4, "round", "m")
    for sx in (-12.4, 8.4):
        p.rect(sx, 0, 1.4, 14, "f")                          # buttresses
    # small round tower
    p.rect(9, 0, 5, 9, "b"); p.line(10.3, 0, 10.3, 9, "f"); p.line(12.7, 0, 12.7, 9, "f")
    cone(p, 11.5, 9, 5.8, 5)
    p.poly([(-6, 0), (-6.6, -2.4), (-1.4, -2.4), (-2, 0)], "m", closed=False)


def sint_servaas(p: Pen):
    ground(p, -26, 26)
    # nave behind
    p.rect(-24, 0, 48, 13, "m"); roof(p, -24, 13, 48, 8)
    window_grid(p, -24, 4, 12, 2, 1, 2.4, 6, 0, top="round")
    window_grid(p, 12, 4, 12, 2, 1, 2.4, 6, 0, top="round")
    # apse with a dwarf gallery between the two east towers
    p.occlude([(-8, 0), (8, 0), (8, 16), (-8, 16)])
    p.rect(-8, 0, 16, 16, "b")
    opening(p, -1.8, 0, 3.6, 6, "round", "m")
    window_grid(p, -8, 7.5, 16, 3, 1, 2, 4.6, 0, top="round")
    for k in range(9):
        opening(p, -7.4 + k * 1.65, 13, 1.1, 2.4, "round")
    p.poly(arc_pts(0, 16, 8, 4, 180, 0, 16), "m", closed=False)
    p.hatch(arc_pts(0, 16, 8, 4, 180, 0, 16), step=0.7)
    for sx in (-12, 12):
        p.occlude([(sx - 4, 0), (sx + 4, 0), (sx + 4, 34), (sx - 4, 34)])
        p.rect(sx - 4, 0, 8, 34, "b")
        for k, yy in enumerate((6, 13, 20, 27)):
            n = 1 if k < 2 else 2
            for j in range(n):
                xo = sx - (0.9 if n == 1 else 2.4) + j * 3.4
                opening(p, xo, yy, 1.8, 4.2, "round", mullion=(k == 3))
            p.line(sx - 4, yy - 1, sx + 4, yy - 1, "f")
        p.poly([(sx - 4.4, 34), (sx, 42), (sx + 4.4, 34)], "m")
        p.hatch([(sx - 4.4, 34), (sx, 42), (sx + 4.4, 34)], step=0.7)
        p.line(sx, 42, sx, 44.5, "f"); p.line(sx - 0.8, 43.6, sx + 0.8, 43.6, "f")


def oldehove(p: Pen):
    ground(p, -14, 14)
    start = len(p.items)
    p.rect(-7, 0, 14, 36, "b")
    for sx in (-7, 5.8):
        p.rect(sx, 0, 1.2, 36, "f")
    opening(p, -1.6, 0, 3.2, 5, "round", "m")
    for yy in (10, 20):
        for k in (-4, -1, 2):
            opening(p, k, yy, 2, 6, "round", "f")
    opening(p, -1.4, 28, 2.8, 5, "round", mullion=True)
    clock(p, 0, 25.5, 1.4)
    crenels(p, -7, 36, 14, 6, 0.9)
    # the small domed lantern on the unfinished top
    octagon(p, 0, 36.9, 3.4, 3.2)
    onion(p, 0, 40.1, 3.6, 3)
    p.line(0, 43.1, 0, 45, "f")
    lean(p, start, -0.05)


def sint_janskathedraal(p: Pen):
    ground(p, -10, 52)
    # long church with flying buttresses and pinnacles
    p.rect(6, 0, 30, 14, "b")
    roof(p, 6, 14, 30, 11)
    for k in range(5):
        x = 8 + k * 6
        opening(p, x + 1.4, 3, 3, 9, "pointed", mullion=True)
        p.poly([(x, 0), (x, 8), (x + 0.6, 9)], "f", closed=False)
        p.line(x, 8, x - 1.2, 14.5, "f")
        pinnacle(p, x, 14, 1, 4)
    # transept front with pinnacled gable
    p.occlude([(36, 0), (46, 0), (46, 18), (41, 30), (36, 18)])
    p.rect(36, 0, 10, 18, "b")
    p.poly([(36, 18), (41, 30), (46, 18)], "m", closed=False)
    opening(p, 38, 4, 6, 15, "pointed", mullion=True, transom=True)
    for sx in (36, 46):
        pinnacle(p, sx, 18, 1.2, 6)
    for k in range(1, 4):
        pinnacle(p, 36 + k * 1.25, 18 + k * 3, 0.6, 2); pinnacle(p, 46 - k * 1.25, 18 + k * 3, 0.6, 2)
    # choir, lower
    p.rect(46, 0, 6, 12, "m"); roof(p, 46, 12, 6, 6, "hip", ridge_w=1.5)
    # west tower: brick base, stone stage, lantern and spire
    p.rect(-6, 0, 12, 30, "b")
    opening(p, -2, 0, 4, 7, "pointed", "m")
    for yy in (10, 19):
        opening(p, -4, yy, 2.6, 6.5, "pointed"); opening(p, 1.4, yy, 2.6, 6.5, "pointed")
    clock(p, 0, 27, 2)
    balustrade(p, -6.2, 30, 12.4, 1)
    stage(p, 0, 31, 8.5, 8, n=2, top="pointed", oct_=True)
    cornice(p, -4.25, 39, 8.5, 0.4, 0.6)
    stage(p, 0, 39.6, 5.4, 5, n=1, top="round", oct_=True)
    onion(p, 0, 44.6, 5.6, 4.4)
    spire(p, 0, 49, 1.6, 6, tiles=False)


def sint_nicolaaskerk(p: Pen):
    ground(p, -18, 18)
    # crossing dome behind
    octagon(p, 0, 20, 9, 5)
    dome(p, 0, 25, 9.6, 6, ribs=4)
    p.line(0, 33.3, 0, 36, "f"); p.line(-0.9, 35, 0.9, 35, "f")
    # west front between two towers
    p.occlude([(-8, 0), (8, 0), (8, 20), (0, 25), (-8, 20)])
    p.rect(-8, 0, 16, 20, "b")
    p.poly([(-8, 20), (0, 25), (8, 20)], "m", closed=False)
    p.circle(0, 14, 3.2, "m"); p.circle(0, 14, 2.2, "f")
    opening(p, -2.4, 0, 4.8, 8, "round", "m")
    opening(p, -6.6, 1, 2, 5, "round"); opening(p, 4.6, 1, 2, 5, "round")
    for sx in (-11, 11):
        p.occlude([(sx - 4, 0), (sx + 4, 0), (sx + 4, 29), (sx - 4, 29)])
        p.rect(sx - 4, 0, 8, 26, "b")
        for yy in (4, 12):
            opening(p, sx - 1, yy, 2, 5, "round")
        clock(p, sx, 21.5, 1.8)
        cornice(p, sx - 4, 26, 8, 0.4, 0.6)
        stage(p, sx, 26.6, 6, 5, n=2, top="round", oct_=True)
        dome(p, sx, 31.6, 6.4, 3.4, ribs=2, lantern=False)
        stage(p, sx, 34.6, 2, 2.4, n=1, oct_=True)
        p.line(sx, 37, sx, 39.6, "f"); p.line(sx - 0.7, 38.8, sx + 0.7, 38.8, "f")


def maastoren(p: Pen):
    ground(p, -26, 26)
    # the tall tower with its stepped top and the lower one beside it
    for x0, w, h in ((-10, 13, 164), (3.5, 9, 120)):
        p.rect(x0, 0, w, h, "b")
        for k in range(1, int(w / 1.6)):
            p.line(x0 + k * 1.6, 3, x0 + k * 1.6, h - 2, "f")
        for yy in range(8, int(h) - 4, 12):
            p.line(x0, yy, x0 + w, yy, "f")
    p.rect(-9, 164, 11, 6, "m"); p.rect(-8, 170, 9, 5, "m")
    p.line(-3.5, 175, -3.5, 182, "m")
    p.rect(-22, 0, 12, 7, "m")                                # the low podium
    window_grid(p, -22, 1, 12, 5, 1, 1.6, 4.6, 0, top="flat")


DRAWINGS.update({
    "Q1121835": woudagemaal,
    "Q277316": rembrandthuis,
    "Q1419675": nieuwe_kerk_amsterdam,
    "Q1072284": huis_ten_bosch,
    "Q234048": paleis_soestdijk,
    "Q692381": paleis_het_loo,
    "Q612065": oude_kerk_delft,
    "Q1499958": kunstmuseum_den_haag,
    "Q474563": teylers_museum,
    "Q1853707": portugese_synagoge,
    "Q2177577": slot_loevestein,
    "Q253935": sint_servaas,
    "Q2018608": oldehove,
    "Q2050553": sint_janskathedraal,
    "Q1350750": sint_nicolaaskerk,
    "Q2143957": maastoren,
})
