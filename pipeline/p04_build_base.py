"""Basemap from Top10NL (Kadaster BRT, CC BY 4.0) -> out/nl-base.pmtiles (z6-14).

layers: water (fill), green (fill), waterline (line, z13+), road (line, class c, name n),
        rail (line), place (point, name n, population p, kind k)
Each feature carries its own minzoom so low zooms stay light.
usage: python p04_build_base.py
"""
import json, os, subprocess, time
import numpy as np
import pyogrio
import geopandas as gpd
import pandas as pd
import shapely

F = "data/raw/top10nl.gpkg"
OUT = "out/base"
T0 = time.time()


def log(*a):
    print(f"[{time.time()-T0:5.0f}s]", *a, flush=True)


def read(layer, cols, where=None):
    sql = f"select {', '.join(cols)}, geom from {layer}" + (f" where {where}" if where else "")
    try:
        return pyogrio.read_dataframe(F, sql=sql)
    except Exception:
        sql = sql.replace(", geom from", ", geometry from")
        return pyogrio.read_dataframe(F, sql=sql)


def write(name, g, props, minzoom):
    g = g.set_crs(28992, allow_override=True).to_crs(4326)
    geoms = shapely.force_2d(g.geometry.values)
    path = f"{OUT}/{name}.geojsonl"
    with open(path, "w") as fo:
        for i, geom in enumerate(geoms):
            if geom is None or geom.is_empty:
                continue
            pr = {k: (v.item() if hasattr(v, "item") else v) for k, v in
                  ((k, props[k][i]) for k in props) if v is not None and v == v and v != ""}
            fo.write(json.dumps({"type": "Feature", "properties": pr,
                                 "tippecanoe": {"minzoom": int(minzoom[i])},
                                 "geometry": geom.__geo_interface__}, separators=(",", ":")) + "\n")
    log(f"{name}: {len(g):,}")
    return path


def by_area(a, tiers):
    z = np.full(len(a), tiers[-1][1])
    for lim, zz in reversed(tiers[:-1]):
        z[a >= lim] = zz
    return z


def water():
    g = read("top10nl_waterdeel_vlak", ["typewater"])
    a = g.geometry.area.values
    k = np.where(g.typewater.str.startswith(("zee", "droog")), "sea", "w")
    z = by_area(a, [(5e6, 6), (5e5, 8), (5e4, 10), (5e3, 12), (0, 13)])
    return write("water", g, {"k": k}, z)


def waterline():
    g = read("top10nl_waterdeel_lijn", ["breedteklasse"])
    z = np.where(g.breedteklasse.fillna("").str.contains("3"), 12, 13)
    return write("waterline", g, {}, z)


def green():
    t = read("top10nl_terrein_vlak", ["typelandgebruik"],
             "typelandgebruik like 'bos%' or typelandgebruik in ('heide','duin','zand','dodenakker','dodenakker met bos','populieren')")
    t["k"] = np.select([t.typelandgebruik.str.startswith("bos") | (t.typelandgebruik == "populieren"),
                        t.typelandgebruik == "heide",
                        t.typelandgebruik.isin(["duin", "zand"])],
                       ["forest", "heath", "sand"], "cemetery")
    f = read("top10nl_functioneel_gebied_vlak", ["typefunctioneelgebied"],
             "typefunctioneelgebied in ('park','begraafplaats','volkstuinen','sportterrein, sportcomplex','recreatiegebied','landgoed')")
    f["k"] = np.where(f.typefunctioneelgebied == "begraafplaats", "cemetery", "park")
    g = pd.concat([t[["k", "geometry"]], f[["k", "geometry"]]], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    z = by_area(g.geometry.area.values, [(5e6, 7), (5e5, 9), (5e4, 11), (0, 12)])
    return write("green", g, {"k": g.k.values}, z)


ROAD = {"autosnelweg": ("motorway", 6), "hoofdweg": ("trunk", 7), "regionale weg": ("primary", 9),
        "lokale weg": ("secondary", 11), "straat": ("street", 13), "overig": ("minor", 14),
        "rolbaan, platform": ("aero", 12), "startbaan, landingsbaan": ("aero", 11)}


def roads():
    g = read("top10nl_wegdeel_hartlijn", ["typeweg", "naam", "hoogteniveau", "hoofdverkeersgebruik"],
             "typeweg <> 'veerverbinding'")
    c = g.typeweg.map(lambda v: ROAD.get(v, ("minor", 14))[0]).values
    z = g.typeweg.map(lambda v: ROAD.get(v, ("minor", 14))[1]).values
    # cycle/foot-only paths: class path
    use = g.hoofdverkeersgebruik.fillna("")
    path = (c == "minor") & use.str.contains("fiets|voetg|ruiter", regex=True).values
    c = np.where(path, "path", c)
    tun = (g.hoogteniveau.fillna(0).astype(int) < 0).values.astype(int)
    n = g.naam.where(np.isin(c, ["street", "secondary", "primary", "trunk", "minor"])).values
    return write("road", g, {"c": c, "n": n, "t": np.where(tun == 1, 1, None)}, z)


def rail():
    g = read("top10nl_spoorbaandeel_lijn", ["typespoorbaan", "hoogteniveau"])
    c = np.where(g.typespoorbaan == "trein", "rail", "tram")
    z = np.where(c == "rail", 7, 12)
    tun = (g.hoogteniveau.fillna(0).astype(int) < 0).values
    return write("rail", g, {"c": c, "t": np.where(tun, 1, None)}, z)


def places():
    cols = ["typegebied", "naamnl", "naamofficieel", "aantalinwoners"]
    g = pd.concat([read("top10nl_plaats_vlak", cols), read("top10nl_plaats_multivlak", cols)], ignore_index=True)
    g = gpd.GeoDataFrame(g, geometry="geometry")
    g = g[g.typegebied.isin(["woonkern", "stadsdeel", "wijk", "buurt", "deelkern", "buurtschap", "gehucht"])].copy()
    g["n"] = g.naamnl.fillna(g.naamofficieel)
    g = g[g.n.notna()]
    p = g.aantalinwoners.fillna(0).astype(int).values
    k = g.typegebied.map({"woonkern": "town", "deelkern": "village", "buurtschap": "hamlet", "gehucht": "hamlet",
                          "stadsdeel": "district", "wijk": "district", "buurt": "quarter"}).values
    z = np.select([(k == "town") & (p >= 100000), (k == "town") & (p >= 20000), (k == "town") & (p >= 5000),
                   k == "town", k == "village", k == "district", k == "hamlet"],
                  [6, 8, 10, 11, 12, 13, 13], 14)
    g["geometry"] = g.geometry.representative_point()
    return write("place", g, {"n": g.n.values, "p": np.where(p > 0, p, None), "k": k}, z)


def main():
    os.makedirs(OUT, exist_ok=True)
    paths = [water(), green(), rail(), places(), roads(), waterline()]
    args = sum([["-L", f"{os.path.basename(p)[:-9]}:{p}"] for p in paths], [])
    subprocess.run(["tippecanoe", "-o", "out/nl-base.pmtiles", "--force", "-Z6", "-z14",
                    "--drop-densest-as-needed", "--no-tile-stats", "--detect-shared-borders",
                    "--simplification=2", "-q", "-P", *args], check=True)
    log("nl-base.pmtiles done", os.path.getsize("out/nl-base.pmtiles") / 1e6, "MB")


if __name__ == "__main__":
    main()
