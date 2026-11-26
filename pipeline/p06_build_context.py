"""Neighbouring countries and the national border -> out/nl-context.pmtiles (z0-14).

NL outline: PDOK brk-bestuurlijke-gebieden/landgebied (Kadaster, CC BY 4.0), exact.
Neighbours: Natural Earth 10m admin-0 (public domain), with NL cut out so the coarse
NE edge never shows on the Dutch side.
layers: land (k = nl | iso3), border (k = nl | x), country (label point, n = Russian name, ne = local name)
"""
import json, os, subprocess
import geopandas as gpd
import shapely
from shapely.geometry import box

NE = "zip://data/raw/ne/"
BBOX = box(-1.5, 48.8, 11.5, 55.8)
NEAR = ["BEL", "DEU", "LUX", "FRA", "GBR", "DNK"]
# label anchors inside the frame (lon, lat), chosen by hand so they sit near NL
ANCHOR = {"BEL": (4.45, 50.65), "DEU": (7.6, 51.9), "LUX": (6.1, 49.75),
          "FRA": (3.0, 50.1), "GBR": (1.0, 52.4), "DNK": (9.2, 55.4)}


def feat(geom, props, minzoom=0):
    return json.dumps({"type": "Feature", "properties": props, "tippecanoe": {"minzoom": minzoom},
                       "geometry": geom.__geo_interface__}, separators=(",", ":"))


def main():
    os.makedirs("out/ctx", exist_ok=True)
    nl = gpd.read_file("data/raw/landgebied.json").to_crs(4326).geometry.union_all()
    c = gpd.read_file(NE + "ne_10m_admin_0_countries.zip")
    c = c[c.ADM0_A3.isin(NEAR)].to_crs(4326)
    nl_buf = nl.buffer(0.0005)
    land, borders, labels = [], [], []
    land.append(feat(nl, {"k": "nl"}))
    for _, r in c.iterrows():
        g = r.geometry.intersection(BBOX).difference(nl_buf)
        if g.is_empty:
            continue
        land.append(feat(g, {"k": r.ADM0_A3}))
        labels.append(feat(shapely.Point(ANCHOR[r.ADM0_A3]),
                           {"n": r.NAME_RU, "ne": r.NAME_NL if r.ADM0_A3 == "BEL" else r.NAME_DE if r.ADM0_A3 in ("DEU", "LUX") else r.NAME_EN, "k": r.ADM0_A3}, 5))
    # national border: the part of the NL outline that touches a neighbour (not the coast)
    foreign = c.geometry.union_all().buffer(0.02)
    edge = shapely.boundary(nl).intersection(foreign)
    borders.append(feat(edge, {"k": "nl"}))
    # borders between neighbours (NE land boundary lines), outside NL
    bl = gpd.read_file(NE + "ne_10m_admin_0_boundary_lines_land.zip").to_crs(4326)
    bl = bl[bl.intersects(BBOX)]
    for g in bl.geometry:
        g = g.intersection(BBOX).difference(nl.buffer(0.03))
        if not g.is_empty:
            borders.append(feat(g, {"k": "x"}))
    paths = {}
    for name, rows in [("land", land), ("border", borders), ("country", labels)]:
        p = f"out/ctx/{name}.geojsonl"
        open(p, "w").write("\n".join(rows) + "\n")
        paths[name] = p
    subprocess.run(["tippecanoe", "-o", "out/nl-context.pmtiles", "--force", "-Z0", "-z14",
                    "--no-tile-stats", "-q", "--no-feature-limit", "--no-tile-size-limit",
                    *sum([["-L", f"{k}:{v}"] for k, v in paths.items()], [])], check=True)
    print("nl-context.pmtiles", os.path.getsize("out/nl-context.pmtiles") / 1e6, "MB")


if __name__ == "__main__":
    main()
