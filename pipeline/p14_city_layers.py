"""City lenses from the per-city sites (amsterdam-by-building, delft-by-building) -> viewer/layers/<GMcode>.json

Each site has a lens catalogue (web/data/layers.json: section, title, text, caveat, source, groups, stories in EN/NL)
and a bitmask per building (data/layers.parquet: lay0, lay1 = group bits 0-31, 32-63).
Output per municipality:
  {"city", "layers": [{id, section, title, era, text, caveat, source, groups: [{key, label, bit, count}],
                       notes: {bag16: {name, story, source, address, people}}}],  (EN + *_nl fields)
   "b": {bag16: [bit, ...]}}
The app colours a lens through feature-state on the national building tiles, so they need no rebuild.
usage: python pipeline/p14_city_layers.py
"""
import json, os
import pandas as pd
from pyproj import Transformer

CITIES = [("GM0363", "Amsterdam", "/Users/aabarakov/projects/amsterdam-by-building"),
          ("GM0503", "Delft", "/Users/aabarakov/projects/delft-by-building")]
OUT = "viewer/layers"
KEEP_LAYER = ["id", "section", "section_nl", "title", "title_nl", "era", "era_nl", "text", "text_nl", "caveat", "caveat_nl", "source", "count"]
KEEP_NOTE = ["name", "name_nl", "story", "story_nl", "source", "address", "people"]


def main():
    os.makedirs(OUT, exist_ok=True)
    # story buildings get a location so a story can fly the map to its building
    pan = pd.read_parquet("out/panden.parquet", columns=["x", "yy"])
    pan.index = pan.index.str[-16:]
    tr = Transformer.from_crs(28992, 4326, always_xy=True)
    for code, city, repo in CITIES:
        cat = json.load(open(f"{repo}/web/data/layers.json"))
        layers = []
        for l in cat:
            out = {k: l[k] for k in KEEP_LAYER if k in l}
            out["groups"] = [{k: g[k] for k in ("key", "label", "label_nl", "bit", "count") if k in g} for g in l["groups"]]
            out["notes"] = {}
            for bag, n in (l.get("notes") or {}).items():
                note = {k: n[k] for k in KEEP_NOTE if k in n}
                if bag[-16:] in pan.index:
                    lon, lat = tr.transform(*pan.loc[bag[-16:], ["x", "yy"]].values)
                    note["ll"] = [round(lon, 6), round(lat, 6)]
                out["notes"][bag[-16:]] = note
            layers.append(out)
        bits = pd.read_parquet(f"{repo}/data/layers.parquet")
        cols = sorted(c for c in bits.columns if c.startswith("lay"))
        members = {}
        for row in bits.itertuples(index=False):
            got = []
            for j, c in enumerate(cols):
                v = int(getattr(row, c)) & 0xFFFFFFFF
                while v:
                    low = v & -v
                    got.append(32 * j + low.bit_length() - 1)
                    v ^= low
            if got:
                members[row.identificatie[-16:]] = got
        path = f"{OUT}/{code}.json"
        with open(path, "w") as f:
            json.dump({"city": city, "layers": layers, "b": members}, f, ensure_ascii=False, separators=(",", ":"))
        print(f"{city}: {len(layers)} lenses, {sum(len(l['notes']) for l in layers)} stories, "
              f"{len(members):,} buildings in lenses, {os.path.getsize(path)/1e6:.1f} MB")


if __name__ == "__main__":
    main()
