"""Merge per-tile parquet -> clip to a province -> GeoJSONSeq -> tippecanoe -> PMTiles.

usage: python p02_build_pmtiles.py <province code, e.g. 28> <out name>
Feature props kept tiny on purpose: id (BAG number as int), y (year), h (height, m).
"""
import glob, json, subprocess, sys, time
import geopandas as gpd
import pandas as pd


def main():
    code, name = sys.argv[1], sys.argv[2]
    t0 = time.time()
    prov = gpd.read_file("data/raw/provinces_rd.gpkg")
    area = prov[prov.code == code].union_all()
    q = pd.concat([gpd.read_parquet(f) for f in glob.glob("data/tiles/*.parquet")])
    q = gpd.GeoDataFrame(q, geometry="geometry", crs=28992)
    q = q.drop_duplicates(["identificatie", "b3_pand_deel_id", "b3_dd_id"])
    q = q[~q.status.isin(["Pand gesloopt", "Niet gerealiseerd pand"])]
    # a pand belongs to the province where its first part's interior point lies
    rp = q.drop_duplicates("identificatie").set_index("identificatie").representative_point()
    keep = rp[rp.within(area)].index
    q = q[q.identificatie.isin(keep)]
    print(f"{q.identificatie.nunique():,} panden, {len(q):,} parts  ({time.time()-t0:.0f}s)")

    q["id"] = q.identificatie.str.extract(r"(\d{16})$")[0].astype("int64")
    q = q.to_crs(4326)
    seq = f"out/{name}.geojsonl"
    with open(seq, "w") as fo:
        for gid, y, h, g in zip(q.id, q.year, q.h, q.geometry):
            fo.write(json.dumps({"type": "Feature",
                                 "properties": {"id": int(gid), "y": int(y), "h": float(h)},
                                 "geometry": g.__geo_interface__},
                                separators=(",", ":")) + "\n")
    print(f"geojsonl written ({time.time()-t0:.0f}s)")

    cmd = ["tippecanoe", "-o", f"out/{name}.pmtiles", "--force", "-l", "b",
           "-Z12", "-z15", "-P",
           "--drop-densest-as-needed", "--extend-zooms-if-still-dropping",
           "--no-tile-stats", "--detect-shared-borders", seq]
    subprocess.run(cmd, check=True)
    print(f"pmtiles done ({time.time()-t0:.0f}s)")


if __name__ == "__main__":
    main()
