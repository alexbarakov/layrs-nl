"""Walk stop candidates per municipality -> viewer/poi/<GMcode>.json (+ index.json).

Candidates: rijksmonumenten and buildings dated before 1850. One file per municipality is the unit
the app downloads with a city pack. Row: [lon, lat, bag16, year, height, monument].
usage: python pipeline/p08_walk_poi.py
"""
import json, os
import geopandas as gpd
import pandas as pd

OUT = "viewer/poi"


def main():
    p = pd.read_parquet("out/panden.parquet")
    p = p[(p.m > 0) | ((p.year > 0) & (p.year < 1850))].copy()
    g = gpd.GeoDataFrame(p, geometry=gpd.points_from_xy(p.x, p.yy), crs=28992)
    gem = gpd.read_file("data/raw/gemeenten.json").to_crs(28992)[["identificatie", "geometry"]].rename(columns={"identificatie": "gm"})
    g = gpd.sjoin(g, gem, predicate="within", how="inner")
    ll = g.geometry.to_crs(4326)
    g["lon"], g["lat"] = ll.x.round(6), ll.y.round(6)
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for code, d in g.groupby("gm"):
        rows = [[float(a), float(b), i[-16:], int(y), float(h), int(m)]
                for a, b, i, y, h, m in zip(d.lon, d.lat, d.index, d.year, d.h, d.m)]
        with open(f"{OUT}/{code}.json", "w") as f:
            json.dump(rows, f, separators=(",", ":"))
        index[code] = len(rows)
    json.dump(index, open(f"{OUT}/index.json", "w"))
    print(f"{len(g):,} candidates in {len(index)} municipalities; "
          f"Delft {index.get('GM0503')}, Amsterdam {index.get('GM0363')}")


if __name__ == "__main__":
    main()
