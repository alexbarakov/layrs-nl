"""Download 3D BAG tiles listed in a CSV, keep only pand attrs + LoD1.3 2D parts.

Each tile -> data/tiles/<tile>.parquet (WGS84). The gpkg is deleted right after,
so the whole country never has to sit on disk.
usage: python p01_fetch_3dbag.py data/raw/tiles_zh.csv [workers]
"""
import gzip, os, shutil, sys, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
import geopandas as gpd
import pandas as pd
import pyogrio

OUT = "data/tiles"
PAND = ["identificatie", "oorspronkelijkbouwjaar", "status", "b3_h_maaiveld"]


def one(tile_id, url):
    name = tile_id.replace("/", "-")
    dst = f"{OUT}/{name}.parquet"
    if os.path.exists(dst):
        return name, -1
    with tempfile.TemporaryDirectory() as tmp:
        gz, gp = f"{tmp}/t.gpkg.gz", f"{tmp}/t.gpkg"
        for attempt in range(3):
            try:
                urllib.request.urlretrieve(url, gz)
                break
            except Exception:
                if attempt == 2:
                    raise
        with gzip.open(gz) as fi, open(gp, "wb") as fo:
            shutil.copyfileobj(fi, fo)
        p = pyogrio.read_dataframe(gp, layer="pand", columns=PAND, read_geometry=False)
        q = pyogrio.read_dataframe(gp, layer="lod13_2d")
    q = q.merge(p, on="identificatie", how="inner")
    q["h"] = (q.b3_h_70p - q.b3_h_maaiveld).clip(lower=0).round(1)
    q["year"] = q.oorspronkelijkbouwjaar.fillna(0).astype("int16")
    q = q[["identificatie", "b3_pand_deel_id", "b3_dd_id", "year", "h", "status", "geometry"]]
    q = gpd.GeoDataFrame(q, geometry="geometry", crs=28992)
    q["tile"] = name
    q.to_parquet(dst)
    return name, len(q)


def main():
    os.makedirs(OUT, exist_ok=True)
    tiles = pd.read_csv(sys.argv[1])
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    done = 0
    with ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(one, r.tile_id, r.gpkg_download): r.tile_id for r in tiles.itertuples()}
        for f in as_completed(futs):
            done += 1
            try:
                name, n = f.result()
            except Exception as e:
                print("FAIL", futs[f], e, flush=True)
                continue
            if done % 50 == 0:
                print(done, "/", len(tiles), flush=True)
    print("finished", done)


if __name__ == "__main__":
    main()
