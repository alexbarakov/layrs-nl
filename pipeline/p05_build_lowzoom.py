"""Buildings for z12-13 -> out/nl-buildings-lo.pmtiles (flat preview before the z14+ set).

Reuses p03 pass 2 (out/owned/*.parquet + out/panden.parquet must exist).
usage: python pipeline/p05_build_lowzoom.py
"""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import p03_build_nl as p3


def main():
    if not os.path.exists("out/nl.geojsonl"):
        p3.pass2(None)
    subprocess.run(["tippecanoe", "-o", "out/nl-buildings-lo.pmtiles", "--force", "-l", "b",
                    "-Z12", "-z13", "-P", "-q", "--drop-smallest-as-needed", "--simplification=4",
                    "--no-tile-stats", "-y", "y", "-y", "h", "-y", "m", "-y", "id", "-y", "q",
                    "out/nl.geojsonl"], check=True)
    p3.log("lo pmtiles", os.path.getsize("out/nl-buildings-lo.pmtiles") / 1e6, "MB")


if __name__ == "__main__":
    main()
