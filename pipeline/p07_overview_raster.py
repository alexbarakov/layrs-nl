"""Overview raster for z5-10 -> out/nl-overview-r.pmtiles (PNG tiles).

Each screen pixel gets the footprint-weighted median construction year of the buildings under it,
and an opacity from built-up coverage. Zooming out therefore shrinks the detail into pixels
instead of switching to coarser grid squares; from z10 the vector 100 m grid (p03 overview) takes over.
Also rebuilds the vector overview (100 m, z10-13).
usage: python pipeline/p07_overview_raster.py
"""
import io, math, os, sys, time
import numpy as np
import pandas as pd
from PIL import Image
from pyproj import Transformer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from pmtiles.writer import Writer

ZMIN, ZMAX = 5, 10
O = 20037508.342789244
LAT = 52.2
BREAKS = [1600, 1666, 1800, 1870, 1914, 1941, 1965, 1985, 2000]
COLORS = ["#4a1410", "#8c1c13", "#c0462b", "#d97a2b", "#e5b13a", "#8e9f3c", "#3f8f6b", "#2c7391", "#3a4f9a", "#6a3f8f"]
RGB = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in COLORS], dtype=np.uint8)
T0 = time.time()


def log(*a):
    print(f"[{time.time()-T0:5.0f}s]", *a, flush=True)


def weighted_median(key, year, w):
    order = np.lexsort((year, key))
    k, y, a = key[order], year[order], w[order]
    start = np.r_[True, k[1:] != k[:-1]]
    gid = np.cumsum(start) - 1
    cum = np.cumsum(a)
    base = np.r_[0, cum[:-1]][start][gid]
    tot = np.bincount(gid, weights=a)
    within = cum - base
    hit = within >= tot[gid] / 2
    # first row per group where the running share passes one half
    idx = np.flatnonzero(hit)
    g_of = gid[idx]
    keep = np.r_[True, g_of[1:] != g_of[:-1]]
    med = y[idx[keep]]
    return k[start], med, tot


def main():
    p = pd.read_parquet("out/panden.parquet", columns=["x", "yy", "year", "area"])
    p = p[(p.year > 0) & (p.area > 0)]
    X, Y = Transformer.from_crs(28992, 3857, always_xy=True).transform(p.x.values, p.yy.values)
    year, area = p.year.values.astype(np.int32), p.area.values.astype(np.float64)
    log(f"{len(p):,} buildings projected")
    tiles = {}
    k = 1 / math.cos(math.radians(LAT))  # mercator metres per ground metre
    for z in range(ZMIN, ZMAX + 1):
        res = 2 * O / (256 * 2 ** z)
        px = ((X + O) // res).astype(np.int64)
        py = ((O - Y) // res).astype(np.int64)
        key = px * (1 << 24) + py
        keys, med, tot = weighted_median(key, year, area)
        gx, gy = keys >> 24, keys & ((1 << 24) - 1)
        cov = np.clip(tot / (res / k) ** 2, 0, 1)
        alpha = (np.interp(cov, [0, 0.3], [0.2, 0.95]) * 255).astype(np.uint8)
        rgb = RGB[np.searchsorted(BREAKS, med, side="right")]
        tx, ty = gx // 256, gy // 256
        n = 0
        for (x, y), grp in pd.DataFrame({"tx": tx, "ty": ty}).groupby(["tx", "ty"]).indices.items():
            img = np.zeros((256, 256, 4), dtype=np.uint8)
            img[gy[grp] - y * 256, gx[grp] - x * 256, :3] = rgb[grp]
            img[gy[grp] - y * 256, gx[grp] - x * 256, 3] = alpha[grp]
            buf = io.BytesIO()
            Image.fromarray(img, "RGBA").save(buf, "PNG", optimize=True)
            tiles[zxy_to_tileid(z, int(x), int(y))] = buf.getvalue()
            n += 1
        log(f"z{z}: {len(keys):,} pixels, {n} tiles")
    with open("out/nl-overview-r.pmtiles", "wb") as f:
        w = Writer(f)
        for tid in sorted(tiles):
            w.write_tile(tid, tiles[tid])
        w.finalize({"tile_type": TileType.PNG, "tile_compression": Compression.NONE,
                    "min_zoom": ZMIN, "max_zoom": ZMAX,
                    "min_lon_e7": int(3.2e7), "min_lat_e7": int(50.7e7), "max_lon_e7": int(7.3e7), "max_lat_e7": int(53.6e7),
                    "center_zoom": 7, "center_lon_e7": int(5.3e7), "center_lat_e7": int(52.15e7)},
                   {"attribution": "3D BAG (CC BY 4.0)", "description": "median construction year per pixel"})
    log("raster", os.path.getsize("out/nl-overview-r.pmtiles") / 1e6, "MB")


if __name__ == "__main__":
    main()
