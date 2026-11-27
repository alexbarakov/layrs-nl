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
