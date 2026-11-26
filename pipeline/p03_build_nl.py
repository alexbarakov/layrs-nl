"""Country build, streaming over per-tile parquet (data/tiles).

pass 1: dedupe parts, collect pand table (id, x, y, year, h, area), match RCE points to parts
pass 2: write GeoJSONSeq with props id, y, h, m (monument number, only when set)
then : tippecanoe -> out/nl-buildings.pmtiles (z14-15)
       grid overview (median year by footprint area) -> out/nl-overview.pmtiles (z6-13)
usage: python p03_build_nl.py [--skip-tiles]
"""
import glob, json, subprocess, sys, time
import numpy as np
import shapely
import pandas as pd
import geopandas as gpd
from scipy.spatial import cKDTree
from shapely.geometry import box

T0 = time.time()
DEAD = {"Pand gesloopt", "Niet gerealiseerd pand"}


def log(*a):
    print(f"[{time.time()-T0:5.0f}s]", *a, flush=True)


def files():
    return sorted(glob.glob("data/tiles/*.parquet"))


TILES = None
RCE = None


def _init():
    global TILES, RCE
    t = gpd.read_file("data/raw/tile_index.fgb")
    t["name"] = t.tile_id.str.replace("/", "-")
    TILES = dict(zip(t.name, t.geometry))
    RCE = pd.read_parquet("data/raw/rce_m.parquet")


def stage_a(f):
    """Keep only panden owned by this tile (interior point inside the tile polygon)."""
    name = f.split("/")[-1][:-8]
    q = gpd.read_parquet(f)
    q = q[~q.status.isin(DEAD)].drop_duplicates(["identificatie", "b3_pand_deel_id", "b3_dd_id"])
    if q.empty:
        return None, None
    rp = q.geometry.representative_point()
    first = ~q.identificatie.duplicated()
    own = gpd.GeoSeries(rp[first.values].values, crs=28992).within(TILES[name]).values
    owned = set(q.identificatie[first.values][own])
    q = q[q.identificatie.isin(owned)]
    if q.empty:
        return None, None
    q["area"] = q.geometry.area
    rp = q.geometry.representative_point()
    g = q.assign(x=rp.x.values, y_=rp.y.values).groupby("identificatie").agg(
        x=("x", "first"), yy=("y_", "first"), year=("year", "first"),
        h=("h", "max"), area=("area", "sum"))
    q[["identificatie", "year", "h", "geometry"]].to_parquet(f"out/owned/{name}.parquet")
    x0, y0, x1, y1 = q.total_bounds
    pts = RCE[(RCE.x >= x0) & (RCE.x <= x1) & (RCE.y >= y0) & (RCE.y <= y1)]
    hits = None
    if len(pts):
        pg = gpd.GeoDataFrame(pts, geometry=gpd.points_from_xy(pts.x, pts.y), crs=28992)
        hits = gpd.sjoin(pg, q[["identificatie", "geometry"]], predicate="within")[["m", "identificatie"]]
    return g, hits


def pass1(rce):
    import os
    from concurrent.futures import ProcessPoolExecutor
    os.makedirs("out/owned", exist_ok=True)
    rce.to_parquet("data/raw/rce_m.parquet")
    panden, hits = [], []
    with ProcessPoolExecutor(10, initializer=_init) as ex:
        for i, (g, h) in enumerate(ex.map(stage_a, files(), chunksize=8)):
            if g is not None:
                panden.append(g)
            if h is not None:
                hits.append(h)
            if i % 1000 == 0:
                log("pass1", i)
    p = pd.concat(panden)
    p = p[~p.index.duplicated()]
    h = pd.concat(hits).drop_duplicates()
    miss = rce[~rce.m.isin(h.m)]
    tree = cKDTree(p[["x", "yy"]].values)
    d, ix = tree.query(miss[["x", "y"]].values, distance_upper_bound=15)
    ok = np.isfinite(d)
    near = pd.DataFrame({"m": miss.m.values[ok], "identificatie": p.index.values[ix[ok]]})
    h = pd.concat([h, near])
    mon = h.groupby("identificatie").m.min()
    log(f"panden {len(p):,}; monuments matched {h.m.nunique():,}/{len(rce):,} "
        f"(in footprint {len(h)-len(near):,}, nearest {len(near):,}); panden with m {len(mon):,}")
    p["m"] = mon.reindex(p.index).fillna(0).astype("int32")
    p.to_parquet("out/panden.parquet")
    return p


MON = None


def _init_b():
    global MON
    p = pd.read_parquet("out/panden.parquet", columns=["m"])
    MON = p.m[p.m > 0]


def stage_b(f):
    q = gpd.read_parquet(f)
    ms = MON.reindex(q.identificatie).fillna(0).astype(int).values
    ids = q.identificatie.str[-16:].astype("int64").values
    q = q.to_crs(4326)
    q["geometry"] = shapely.force_2d(q.geometry.values)
    out = []
    for gid, y, h, m, g in zip(ids, q.year.values, q.h.values, ms, q.geometry.values):
        pr = {"id": int(gid), "y": int(y), "h": float(h)}
        if m:
            pr["m"] = int(m)
        out.append(json.dumps({"type": "Feature", "properties": pr,
                               "geometry": g.__geo_interface__}, separators=(",", ":")))
    return "\n".join(out) + "\n", len(out)


def pass2(p):
    from concurrent.futures import ProcessPoolExecutor
    n = 0
    with open("out/nl.geojsonl", "w") as fo, ProcessPoolExecutor(10, initializer=_init_b) as ex:
        for i, (txt, k) in enumerate(ex.map(stage_b, sorted(glob.glob("out/owned/*.parquet")), chunksize=8)):
            fo.write(txt); n += k
            if i % 1000 == 0:
                log("pass2", i)
    log(f"parts written {n:,}")


def overview(p, tiers=((100, 10, 13),)):
    """Square grid cells coloured by footprint-weighted median year.
    Only the 100 m grid is kept as vectors (z10-13); coarser zooms use the raster from p07,
    so cells never grow into big squares when zooming out."""
    out = []
    for cell, zmin, zmax in tiers:
        d = p[(p.year > 0) & (p.area > 0)].copy()
        d["cx"] = (d.x // cell).astype(int); d["cy"] = (d.yy // cell).astype(int)
        d = d.sort_values("year")
        d["cum"] = d.groupby(["cx", "cy"]).area.cumsum()
        tot = d.groupby(["cx", "cy"]).area.transform("sum")
        med = d[d.cum >= tot / 2].groupby(["cx", "cy"]).year.first()
        cov = d.groupby(["cx", "cy"]).area.sum() / cell ** 2
        g = pd.DataFrame({"y": med, "c": cov.clip(upper=1).round(2)}).reset_index()
        geom = [box(x * cell, y * cell, (x + 1) * cell, (y + 1) * cell) for x, y in zip(g.cx, g.cy)]
        g = gpd.GeoDataFrame(g[["y", "c"]], geometry=geom, crs=28992).to_crs(4326)
        g["y"] = g.y.astype(int)
        path = f"out/overview_{cell}.geojsonl"
        with open(path, "w") as fo:
            for y, c, geom in zip(g.y, g.c, g.geometry):
                fo.write(json.dumps({"type": "Feature", "properties": {"y": int(y), "c": float(c)},
                                     "tippecanoe": {"minzoom": zmin, "maxzoom": zmax},
                                     "geometry": geom.__geo_interface__}, separators=(",", ":")) + "\n")
        log(f"overview {cell} m: {len(g):,} cells")
        out.append(path)
    subprocess.run(["tippecanoe", "-o", "out/nl-overview.pmtiles", "--force", "-l", "o",
                    f"-Z{min(t[1] for t in tiers)}", "-z13", "--no-tile-stats", "--no-feature-limit", "--no-tile-size-limit",
                    "--detect-shared-borders", "-q", *out], check=True)
    log("overview pmtiles done")


def main():
    rce = pd.read_parquet("data/raw/rce_points.parquet")
    rce = rce[rce.ns == "nlps-rijksmonumenten"].copy()
    # monument number = last segment of the monumentenregister URL (localid is an internal RCE id)
    rce["m"] = rce.url.str.extract(r"/(\d+)$")[0].astype(int)
    p = pass1(rce)
    overview(p)
    if "--skip-tiles" in sys.argv:
        return
    pass2(p)
    log("geojsonl written")
    subprocess.run(["tippecanoe", "-o", "out/nl-buildings.pmtiles", "--force", "-l", "b",
                    "-Z14", "-z15", "-P", "-q", "--drop-densest-as-needed",
                    "--no-tile-stats", "--detect-shared-borders", "out/nl.geojsonl"], check=True)
    log("buildings pmtiles done")


if __name__ == "__main__":
    main()
