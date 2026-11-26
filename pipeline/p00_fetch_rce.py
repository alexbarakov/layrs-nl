"""Rijksmonumenten point locations (RCE via PDOK OGC API, CC BY 4.0) -> data/raw/rce_points.parquet."""
import json, urllib.request
import pandas as pd

URL = ("https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1/collections/"
       "rce_inspire_points/items?f=json&limit=1000&crs=http://www.opengis.net/def/crs/EPSG/0/28992")


def main():
    rows, url = [], URL
    while url:
        d = json.load(urllib.request.urlopen(url, timeout=120))
        for f in d["features"]:
            p = f["properties"]
            x, y = f["geometry"]["coordinates"][:2]
            rows.append((p.get("namespace"), p.get("localid"), p.get("ci_citation"), x, y))
        url = next((l["href"] for l in d.get("links", []) if l["rel"] == "next"), None)
        print(len(rows), flush=True)
    df = pd.DataFrame(rows, columns=["ns", "localid", "url", "x", "y"])
    df.to_parquet("data/raw/rce_points.parquet")
    print(df.ns.value_counts())


if __name__ == "__main__":
    main()
