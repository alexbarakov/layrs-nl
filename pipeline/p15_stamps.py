"""Stamps: 5-20 landmarks per municipality, from different eras, with a stamp drawing each.

Candidates: Wikidata items with a BAG building id (P5208) or a rijksmonument number (P359), and at least one
Wikipedia article. Prominence = number of sitelinks. Location and era come from our buildings (out/panden.parquet),
the year from Wikidata inception (P571) when it has one.

Per municipality: N = 5..20 on a log scale of its building count (10k -> 5, 200k+ -> 20). Picks go round-robin over
eras (<1500, 1500-1650, 1650-1800, 1800-1900, 1900-1945, 1945+), most sitelinks first, at least 100 m apart.
Municipalities with fewer than 3 candidates get none.

Stamp art (docs/stamps/approach.md): a line elevation of the building, hand-composed for the best-known
(stamp_landmarks.py), otherwise drawn from its Wikidata type, era and 3D BAG height (stamp_types.py). No letters in the
centre. Rendered into one of five rubber-stamp frames with an ink texture (stamp_styles.py), 600 px PNG.
Needs rsvg-convert (librsvg) on the PATH.

writes viewer/stamps/<GM>.json, viewer/stamps/index.json, viewer/stamps/img/<qid>.png
usage: python pipeline/p15_stamps.py [--no-art | --restyle]   (--restyle redraws the published selection only)
"""
import csv, io, json, math, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer

UA = "layrs-nl-pipeline/0.1 (https://github.com/alexbarakov/layrs-nl)"
WDQS = "https://query.wikidata.org/sparql"
OUT = "viewer/stamps"
RAW = "data/raw"
ERAS = [(0, 1500, "до 1500"), (1500, 1650, "1500–1649"), (1650, 1800, "1650–1799"),
        (1800, 1900, "1800–1899"), (1900, 1945, "1900–1944"), (1945, 3000, "с 1945")]
MIN_GAP = 100
# one ink per era, like a stamp pad: the stamp PNGs are printed in it (same order in app/src/data/stamps.ts)
ERA_INK = ["#4a1410", "#8c1c13", "#a8481f", "#8a6410", "#2f6b4a", "#2c5a91"]


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def get(url, data=None, accept="application/json", tries=5):
    for t in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": accept})
            return urllib.request.urlopen(req, timeout=120).read()
        except Exception as e:
            log("  retry", t + 1, str(e)[:120])
            time.sleep(5 * (t + 1))
    raise RuntimeError(url)


# ---------- Wikidata candidates ----------
def sparql_csv(q):
    body = urllib.parse.urlencode({"query": q}).encode()
    return list(csv.DictReader(io.StringIO(get(WDQS, body, "text/csv").decode())))


def fetch_candidates():
    path = f"{RAW}/wd_stamps.csv"
    if os.path.exists(path):
        return pd.read_csv(path, dtype=str).fillna("")
    rows = []
    for prop, col in (("P359", "rm"), ("P5208", "bag")):
        q = f"""SELECT ?i ?v ?sl ?nl ?en ?inc ?img ?nlwiki ?enwiki WHERE {{
  ?i wdt:{prop} ?v ; wikibase:sitelinks ?sl . FILTER(?sl >= 1)
  OPTIONAL {{ ?i rdfs:label ?nl FILTER(LANG(?nl) = "nl") }}
  OPTIONAL {{ ?i rdfs:label ?en FILTER(LANG(?en) = "en") }}
  OPTIONAL {{ ?i wdt:P571 ?inc }}
  OPTIONAL {{ ?i wdt:P18 ?img }}
  OPTIONAL {{ ?nlwiki schema:about ?i ; schema:isPartOf <https://nl.wikipedia.org/> }}
  OPTIONAL {{ ?enwiki schema:about ?i ; schema:isPartOf <https://en.wikipedia.org/> }}
}}"""
        got = sparql_csv(q)
        log(prop, len(got), "rows")
        for r in got:
            rows.append({"qid": r["i"].rsplit("/", 1)[-1], "kind": col, "v": r["v"], "sl": r["sl"], "nl": r["nl"], "en": r["en"],
                         "inc": r["inc"][:5].lstrip("+") if r["inc"] else "", "img": r["img"], "nlwiki": r["nlwiki"], "enwiki": r["enwiki"]})
    d = pd.DataFrame(rows)
    d.to_csv(path, index=False)
    return d.astype(str).replace("nan", "")


# ---------- selection ----------
def era_of(y):
    for i, (a, b, _) in enumerate(ERAS):
        if a <= y < b:
            return i
    return len(ERAS) - 1


def quota(n_buildings):
    t = (math.log10(max(n_buildings, 1)) - 4) / (math.log10(200_000) - 4)
    return int(min(20, max(5, round(5 + 15 * t))))


def select():
    cand = fetch_candidates()
    p = pd.read_parquet("out/panden.parquet", columns=["x", "yy", "year", "h", "m"])
    p.index = p.index.str[-16:]
    gem = gpd.read_file(f"{RAW}/gemeenten.json").to_crs(28992)[["identificatie", "naam", "geometry"]].rename(columns={"identificatie": "gm"})
    by_m = p[p.m > 0].reset_index().groupby("m")["identificatie"].apply(list)

    rows = []
    for r in cand.itertuples():
        if r.kind == "rm":
            m = re.sub(r"\D", "", r.v)
            bags = by_m.get(int(m), []) if m else []
        else:
            b = re.sub(r"\D", "", r.v).zfill(16)
            bags = [b] if b in p.index else []
        if not bags:
            continue
        rows.append((r.qid, bags, int(r.sl or 0), r.nl, r.en, r.inc, r.img, r.nlwiki, r.enwiki))
    c = pd.DataFrame(rows, columns=["qid", "bags", "sl", "nl", "en", "inc", "img", "nlwiki", "enwiki"])
    # one row per item: union of buildings, first non-empty of the rest
    c = c.groupby("qid").agg({"bags": lambda s: sorted({b for x in s for b in x}), "sl": "max", "nl": "first", "en": "first",
                              "inc": lambda s: min([int(v) for v in s if str(v).lstrip("-").isdigit()] or [0]),
                              "img": "first", "nlwiki": "first", "enwiki": "first"}).reset_index()
    c = c[(c.nl != "") | (c.en != "")]
    # location: the tallest of its buildings; year: inception, else the oldest building year
    sub = p.loc[[b for bs in c.bags for b in bs]]
    tall = {q: sub.loc[bs].h.idxmax() for q, bs in zip(c.qid, c.bags)}
    c["bag"] = c.qid.map(tall)
    c["x"] = c.bag.map(p.x); c["yy"] = c.bag.map(p.yy)
    c["byear"] = [int(sub.loc[bs].year.replace(0, 9999).min()) for bs in c.bags]
    c["year"] = np.where((c.inc > 1000) & (c.inc <= 2026), c.inc, c.byear)
    c = c[(c.year > 0) & (c.year < 9999)]
    pts = gpd.GeoDataFrame(c, geometry=gpd.points_from_xy(c.x, c.yy), crs=28992)
    c = gpd.sjoin(pts, gem, predicate="within", how="inner").drop(columns="index_right")
    log(f"candidates located: {len(c):,} in {c.gm.nunique()} municipalities")

    # buildings per municipality for the quota
    pg = gpd.GeoDataFrame(index=p.index.rename("bag"), geometry=gpd.points_from_xy(p.x, p.yy), crs=28992)
    nb = gpd.sjoin(pg, gem, predicate="within", how="inner").gm.value_counts()

    picks = {}
    for code, g in c.groupby("gm"):
        if len(g) < 3:
            continue
        n = quota(int(nb.get(code, 0)))
        g = g.assign(era=g.year.map(era_of)).sort_values("sl", ascending=False)
        queues = {e: list(rows.itertuples()) for e, rows in g.groupby("era")}
        chosen = []
        while len(chosen) < n and any(queues.values()):
            for e in sorted(queues, key=lambda e: -queues[e][0].sl if queues[e] else 0):
                while queues[e]:
                    r = queues[e].pop(0)
                    if all(math.hypot(r.x - s.x, r.yy - s.yy) >= MIN_GAP for s in chosen):
                        chosen.append(r); break
                if len(chosen) >= n:
                    break
        picks[code] = (g.naam.iloc[0], n, chosen)
    log(f"municipalities with stamps: {len(picks)}, stamps: {sum(len(v[2]) for v in picks.values()):,}")
    return picks


# ---------- art ----------
def fetch_types(qids):
    """Wikidata P31 labels (en) per item, cached in data/raw/wd_stamp_types.json."""
    path = f"{RAW}/wd_stamp_types.json"
    have = json.load(open(path)) if os.path.exists(path) else {}
    missing = [q for q in qids if q not in have]
    for i in range(0, len(missing), 400):
        vals = " ".join("wd:" + q for q in missing[i:i + 400])
        rows = sparql_csv(f'SELECT ?i ?tl WHERE {{ VALUES ?i {{ {vals} }} OPTIONAL {{ ?i wdt:P31 ?t . '
                          f'?t rdfs:label ?tl FILTER(LANG(?tl) = "en") }} }}')
        for r in rows:
            have.setdefault(r["i"].rsplit("/", 1)[-1], [])
            if r["tl"]:
                have[r["i"].rsplit("/", 1)[-1]].append(r["tl"])
    if missing:
        json.dump(have, open(path, "w"), ensure_ascii=False)
    return have


def heights(stamps):
    """Tallest 3D BAG height among each stamp's buildings (m), for the drawing's proportions."""
    p = pd.read_parquet("out/panden.parquet", columns=["h"])
    p.index = p.index.str[-16:]
    out = {}
    for s in stamps:
        hs = [float(p.h.get(b, 0) or 0) for b in s.get("bags", [])]
        out[s["id"]] = max(hs) if hs and max(hs) > 0 else None
    return out


def _render_one(args):
    import stamp_styles as SS
    from stamp_draw import Pen
    from stamp_landmarks import DRAWINGS
    from stamp_types import draw
    sid, name, place, year, kind, h, era, out = args
    if sid in DRAWINGS:
        pen = Pen(); DRAWINGS[sid](pen); art = "hand"
    else:
        pen = draw(sid, kind, year, h); art = "type"
    open(out, "wb").write(SS.render(sid, name, place, year, pen, color=ERA_INK[era]))
    return sid, art, SS.LAST_CHECK.get("scale"), SS.LAST_CHECK.get("overlap")


def make_art(stamps):
    """Draw every stamp: by hand for the best-known buildings, by building type for the rest; one of five frames."""
    from concurrent.futures import ProcessPoolExecutor
    from collections import Counter
    import stamp_styles as SS
    from stamp_types import era_kind, kind_of
    os.makedirs(f"{OUT}/img", exist_ok=True)
    types = fetch_types([s["id"] for s in stamps])
    hs = heights(stamps)
    jobs = []
    for s in stamps:
        s["kind"] = kind_of(types.get(s["id"], []), s["name_nl"]) or era_kind(s["year"])
        jobs.append((s["id"], s["name_nl"], s["place"], s["year"], s["kind"], hs.get(s["id"]), s["era"], f"{OUT}/img/{s['id']}.png"))
    arts = {}
    with ProcessPoolExecutor(8) as ex:
        checks = {}
        for i, (sid, art, scale, overlap) in enumerate(ex.map(_render_one, jobs, chunksize=16)):
            arts[sid] = art
            checks[sid] = (scale, overlap)
            if i % 500 == 0:
                log("rendered", i)
    for s in stamps:
        s["img"] = f"stamps/img/{s['id']}.png"
        s["style"] = SS.style_of(s["id"])
        s["art"] = arts[s["id"]]
        s.pop("credit", None)               # hand and type drawings are our own, not derived from one photo
        s.pop("file", None)
    log("kinds:", dict(Counter(s["kind"] for s in stamps).most_common()))
    log("styles:", dict(Counter(s["style"] for s in stamps)))
    # lettering check (docs/stamps/requirements.md, criterion 3): no letter within ~3 px of a frame line
    bad = [s for s in stamps if checks[s["id"]][1]]
    log(f"lettering: {sum(1 for s in stamps if checks[s['id']][0] < 1)} shrunk to fit, {len(bad)} still touching a line")
    with open(f"{OUT}/lettering_check.tsv", "w") as fh:
        fh.write("id\tstyle\tscale\toverlap_px\tname\n")
        for s in stamps:
            sc, ov = checks[s["id"]]
            if sc < 1 or ov:
                fh.write(f"{s['id']}\t{s['style']}\t{sc}\t{ov}\t{s['name_nl']}\n")
    return stamps


def write(per):
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for code, v in per.items():
        json.dump({"gm": code, "name": v["name"], "eras": [e[2] for e in ERAS], "stamps": v["stamps"]},
                  open(f"{OUT}/{code}.json", "w"), ensure_ascii=False, separators=(",", ":"))
        xs = [s["ll"] for s in v["stamps"]]
        index[code] = {"name": v["name"], "n": len(v["stamps"]), "ll": [round(sum(a for a, _ in xs) / len(xs), 5), round(sum(b for _, b in xs) / len(xs), 5)]}
    json.dump(index, open(f"{OUT}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
    stamps = [s for v in per.values() for s in v["stamps"]]
    hand = sum(1 for s in stamps if s.get("art") == "hand")
    log(f"written: {len(per)} municipalities, {len(stamps)} stamps, {hand} drawn by hand, {len(stamps) - hand} by type")


def restyle():
    """Redraw the published selection (viewer/stamps/GM*.json) without selecting again."""
    per = {}
    for f in sorted(os.listdir(OUT)):
        if f.startswith("GM") and f.endswith(".json"):
            j = json.load(open(f"{OUT}/{f}"))
            per[j["gm"]] = {"name": j["name"], "stamps": j["stamps"]}
    make_art([s for v in per.values() for s in v["stamps"]])
    write(per)


def main():
    if "--restyle" in sys.argv:
        return restyle()
    picks = select()
    tr = Transformer.from_crs(28992, 4326, always_xy=True)
    stamps, per = [], {}
    for code, (name, n, chosen) in picks.items():
        for r in chosen:
            lon, lat = tr.transform(r.x, r.yy)
            s = {"id": r.qid, "gm": code, "place": name, "bags": r.bags, "ll": [round(lon, 6), round(lat, 6)],
                 "name": r.en or r.nl, "name_nl": r.nl or r.en, "year": int(r.year), "era": int(r.era), "sl": int(r.sl),
                 "wiki": r.nlwiki or r.enwiki or "", "wiki_en": r.enwiki or ""}
            stamps.append(s)
            per.setdefault(code, {"name": name, "quota": n, "stamps": []})["stamps"].append(s)
    if "--no-art" not in sys.argv:
        make_art(stamps)
    write(per)


if __name__ == "__main__":
    main()
