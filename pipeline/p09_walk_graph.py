"""Pedestrian graph per municipality from Top10NL road centrelines -> viewer/graph/<GMcode>.json

Walkable: every wegdeel except motor-only (snelverkeer), bus lanes, airfields, slip roads and interchanges.
Nodes are line endpoints snapped to 0.5 m (RD); edges keep their shape for drawing.
Each file covers the municipality bbox plus 1 km, so walks near a border still route.
JSON: {"n": [lon*1e5, lat*1e5, ...], "e": [u, v, len_dm, g_start, g_count, ...], "g": [lon*1e5, lat*1e5, ...]}
usage: python pipeline/p09_walk_graph.py [GM0503 ...]
"""
import json, os, sys, time
import numpy as np
import pyogrio
import geopandas as gpd
import shapely
from pyproj import Transformer

F = "data/raw/top10nl.gpkg"
OUT = "viewer/graph"
PAD = 1000
T0 = time.time()


def log(*a):
    print(f"[{time.time()-T0:5.0f}s]", *a, flush=True)


def main():
    only = set(sys.argv[1:])
    where = ("hoofdverkeersgebruik not in ('snelverkeer','busverkeer','vliegverkeer') "
             "and (fysiekvoorkomen is null or (fysiekvoorkomen not like '%oprit%' and fysiekvoorkomen not like '%knooppunt%'))")
    g = pyogrio.read_dataframe(F, sql=f"select geom from top10nl_wegdeel_hartlijn where {where}")
    g = g.set_crs(28992, allow_override=True)
    g["geometry"] = shapely.force_2d(g.geometry.values)
    g = g.explode(index_parts=False).reset_index(drop=True)
    log(f"{len(g):,} walkable segments")
    gem = gpd.read_file("data/raw/gemeenten.json").to_crs(28992)
    if only:
        gem = gem[gem.identificatie.isin(only)]
    tr = Transformer.from_crs(28992, 4326, always_xy=True)
    os.makedirs(OUT, exist_ok=True)
    sidx = g.sindex
    sizes = {}
    for code, poly in zip(gem.identificatie, gem.geometry):
        x0, y0, x1, y1 = poly.bounds
        idx = sidx.query(shapely.box(x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD))
        lines = g.geometry.values[idx]
        coords = [np.asarray(l.coords) for l in lines]
        ends = np.array([[c[0][0], c[0][1], c[-1][0], c[-1][1]] for c in coords])
        keys = np.round(np.vstack([ends[:, :2], ends[:, 2:]]) * 2).astype(np.int64)
        uniq, inv = np.unique(keys, axis=0, return_inverse=True)
        u, v = inv[:len(coords)], inv[len(coords):]
        lon, lat = tr.transform(uniq[:, 0] / 2, uniq[:, 1] / 2)
        nodes = np.column_stack([np.round(np.asarray(lon) * 1e5), np.round(np.asarray(lat) * 1e5)]).astype(np.int64)
        e, gflat = [], []
        for i, c in enumerate(coords):
            if u[i] == v[i] and len(c) < 3:
                continue
            ln = int(round(shapely.length(lines[i]) * 10))
            mid = c[1:-1]
            gs = len(gflat) // 2
            if len(mid):
                mx, my = tr.transform(mid[:, 0], mid[:, 1])
                gflat.extend(np.column_stack([np.round(np.asarray(mx) * 1e5), np.round(np.asarray(my) * 1e5)]).astype(np.int64).ravel().tolist())
            e.extend([int(u[i]), int(v[i]), ln, gs, len(mid)])
        with open(f"{OUT}/{code}.json", "w") as f:
            json.dump({"n": nodes.ravel().tolist(), "e": e, "g": gflat}, f, separators=(",", ":"))
        sizes[code] = os.path.getsize(f"{OUT}/{code}.json")
        if only or len(sizes) % 50 == 0:
            log(code, f"{len(uniq):,} nodes, {len(e)//5:,} edges, {sizes[code]/1e6:.2f} MB")
    log(f"{len(sizes)} graphs, total {sum(sizes.values())/1e6:.0f} MB")


if __name__ == "__main__":
    main()
