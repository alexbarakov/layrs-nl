"""Stamps: 5-20 landmarks per municipality, from different eras, with a stamp drawing each.

Candidates: Wikidata items with a BAG building id (P5208) or a rijksmonument number (P359), and at least one
Wikipedia article. Prominence = number of sitelinks. Location and era come from our buildings (out/panden.parquet),
the year from Wikidata inception (P571) when it has one.

Per municipality: N = 5..20 on a log scale of its building count (10k -> 5, 200k+ -> 20). Picks go round-robin over
eras (<1500, 1500-1650, 1650-1800, 1800-1900, 1900-1945, 1945+), most sitelinks first, at least 100 m apart.
Municipalities with fewer than 3 candidates get none.

Stamp art: the Commons photo (P18) as a 400 px thumbnail, turned into a black-and-white architectural sketch (
XDoG pen lines plus hatching), black on transparent, 256 px PNG. The drawing is a derivative of the
photo and keeps its licence; author and licence come from the Commons API. Without a photo the app draws a monogram.

writes viewer/stamps/<GM>.json, viewer/stamps/index.json, viewer/stamps/img/<qid>.png
usage: python pipeline/p15_stamps.py [--no-art]
"""
import csv, io, json, math, os, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geopandas as gpd
import numpy as np
import pandas as pd
from pyproj import Transformer

UA = "layrs-nl-pipeline/0.1 (https://github.com/alexbarakov/layrs-nl)"
WDQS = "https://query.wikidata.org/sparql"
COMMONS = "https://commons.wikimedia.org/w/api.php"
OUT = "viewer/stamps"
RAW = "data/raw"
ERAS = [(0, 1500, "до 1500"), (1500, 1650, "1500–1649"), (1650, 1800, "1650–1799"),
        (1800, 1900, "1800–1899"), (1900, 1945, "1900–1944"), (1945, 3000, "с 1945")]
MIN_GAP = 100
# one ink per era, like a stamp pad (same order in app/src/data/stamps.ts)
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
def commons_meta(files):
    """file title -> (thumb url, author, licence, licence url, page url)"""
    out = {}
    for i in range(0, len(files), 50):
        chunk = files[i:i + 50]
        q = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata",
                                    "iiurlwidth": 400, "titles": "|".join("File:" + f for f in chunk)})
        j = json.loads(get(f"{COMMONS}?{q}"))
        norm = {n["to"]: n["from"] for n in j["query"].get("normalized", [])}
        for pg in j["query"]["pages"].values():
            if "imageinfo" not in pg:
                continue
            ii = pg["imageinfo"][0]; md = ii.get("extmetadata", {})
            clean = lambda k: re.sub(r"<[^>]+>", "", md.get(k, {}).get("value", "")).strip()
            title = norm.get(pg["title"], pg["title"])[5:]
            out[title] = (ii.get("thumburl"), clean("Artist")[:120], clean("LicenseShortName"), clean("LicenseUrl"), ii.get("descriptionurl"))
        time.sleep(0.5)
    return out


def drawing(img_bytes):
    """Photo -> black-and-white architectural sketch on a transparent 256 px square.

    Lines: XDoG (difference of Gaussians with a soft threshold), which reads like a pen drawing of edges.
    Shade: 45-degree hatching in dark areas, cross-hatching in the darkest, like an elevation rendering.
    Black ink only; the stamp frame is drawn by the app."""
    from PIL import Image, ImageFilter, ImageOps
    im = Image.open(io.BytesIO(img_bytes)).convert("L")
    w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2)).resize((512, 512), Image.LANCZOS)
    im = ImageOps.autocontrast(im.filter(ImageFilter.MedianFilter(5)), cutoff=1)
    g = lambda r: np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0
    g1, g2 = g(1.2), g(1.2 * 1.6)
    d = g1 - 0.98 * g2                                        # XDoG
    lines = 1.0 - np.where(d >= -0.004, 1.0, 1.0 + np.tanh(60.0 * (d + 0.004)))
    lines = np.clip(lines * 1.4, 0, 1)
    lum = g(3.0)
    yy, xx = np.mgrid[0:512, 0:512]
    hatch1 = ((xx + yy) % 9 < 1.4).astype(np.float32)        # 45 degrees
    hatch2 = ((xx - yy) % 9 < 1.4).astype(np.float32)        # -45 degrees
    # thresholds relative to the photo, so a dark photo is not hatched all over
    t1, t2 = np.percentile(lum, 28), np.percentile(lum, 10)
    shade = np.where(lum < t1, hatch1, 0) + np.where(lum < t2, hatch2, 0)
    ink = np.clip(np.maximum(lines, shade * 0.6), 0, 1)
    r = np.hypot(xx - 255.5, yy - 255.5) / 256
    ink *= np.clip((0.97 - r) / 0.04, 0, 1)                  # crisp round edge
    a = Image.fromarray((ink * 255).astype(np.uint8), "L").resize((256, 256), Image.LANCZOS)
    out = Image.new("RGBA", (256, 256), (20, 19, 17, 0)); out.putalpha(a)
    buf = io.BytesIO(); out.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def photo_path(stamp):
    for d in ("commons960", "commons"):
        p = f"{RAW}/{d}/{stamp['id']}.jpg"
        if os.path.exists(p):
            return p
    return None


def photo(stamp, thumb_url):
    """The Commons photo (500 px thumbnail, a pre-rendered size), cached in data/raw/commons/ so restyling
    never downloads again. A 960 px copy is used when one is cached; on the stamp it looks the same."""
    p = photo_path(stamp)
    if p:
        return open(p, "rb").read()
    os.makedirs(f"{RAW}/commons", exist_ok=True)
    p = f"{RAW}/commons/{stamp['id']}.jpg"
    open(p, "wb").write(get(thumb_url, accept="image/*"))
    return open(p, "rb").read()


def _render_one(args):
    import stamp_styles as SS
    sid, name, place, year, photo_path, out = args
    ph = open(photo_path, "rb").read() if photo_path and os.path.exists(photo_path) else None
    open(out, "wb").write(SS.render(sid, name, place, year, ph))
    return sid


def make_art(stamps):
    """Fetch (and cache) the Commons photos, then render every stamp in one of five rubber-stamp designs."""
    from concurrent.futures import ProcessPoolExecutor
    import stamp_styles as SS
    os.makedirs(f"{OUT}/img", exist_ok=True)
    files = sorted({s["file"] for s in stamps if s.get("file")})
    cache = f"{RAW}/commons_meta.json"
    meta = {k: tuple(v) for k, v in json.load(open(cache)).items()} if os.path.exists(cache) else {}
    missing = [f for f in files if f not in meta]
    if missing:
        meta.update(commons_meta(missing))
        json.dump(meta, open(cache, "w"), ensure_ascii=False)
    log(f"commons metadata: {len(meta)} files known, {len(files)} wanted")

    def fetch(s):
        m = meta.get(s.get("file") or "")
        if not m or not m[0]:
            return s["id"], None
        try:
            photo(s, m[0]); return s["id"], m
        except Exception as e:
            log("  photo failed", s["id"], str(e)[:80]); return s["id"], None
    with ThreadPoolExecutor(6) as ex:
        got = dict(ex.map(fetch, stamps))
    log(f"photos: {sum(1 for v in got.values() if v)} of {len(stamps)}")

    jobs = [(s["id"], s["name_nl"], s["place"], s["year"], photo_path(s) if got.get(s["id"]) else None,
             f"{OUT}/img/{s['id']}.png") for s in stamps]
    with ProcessPoolExecutor(8) as ex:
        for i, _ in enumerate(ex.map(_render_one, jobs, chunksize=16)):
            if i % 500 == 0:
                log("rendered", i)
    for s in stamps:
        m = got.get(s["id"])
        s["img"] = f"stamps/img/{s['id']}.png"
        s["style"] = SS.style_of(s["id"])
        if m:
            s["credit"] = {"author": m[1], "license": m[2], "license_url": m[3], "source": m[4]}
        s.pop("file", None)
    return stamps


def recolor(stamps):
    """Give each drawing its era ink (the app also tints it; this keeps the PNGs right everywhere)."""
    from PIL import Image
    for s in stamps:
        path = f"{OUT}/img/{s['id']}.png"
        if not s.get("img") or not os.path.exists(path):
            continue
        im = np.array(Image.open(path).convert("RGBA"))
        ink_hex = ERA_INK[s["era"]]
        im[..., :3] = [int(ink_hex[i:i + 2], 16) for i in (1, 3, 5)]
        Image.fromarray(im, "RGBA").save(path, "PNG", optimize=True)


def main():
    picks = select()
    tr = Transformer.from_crs(28992, 4326, always_xy=True)
    stamps, per = [], {}
    for code, (name, n, chosen) in picks.items():
        for r in chosen:
            lon, lat = tr.transform(r.x, r.yy)
            f = urllib.parse.unquote(r.img.rsplit("/", 1)[-1]) if r.img else ""
            s = {"id": r.qid, "gm": code, "place": name, "bags": r.bags, "ll": [round(lon, 6), round(lat, 6)],
                 "name": r.en or r.nl, "name_nl": r.nl or r.en, "year": int(r.year), "era": int(r.era), "sl": int(r.sl),
                 "wiki": r.nlwiki or r.enwiki or "", "wiki_en": r.enwiki or "", "file": f}
            stamps.append(s)
            per.setdefault(code, {"name": name, "quota": n, "stamps": []})["stamps"].append(s)
    if "--no-art" not in sys.argv:
        make_art(stamps)
    else:
        for s in stamps: s.pop("file", None)
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for code, v in per.items():
        json.dump({"gm": code, "name": v["name"], "eras": [e[2] for e in ERAS], "stamps": v["stamps"]},
                  open(f"{OUT}/{code}.json", "w"), ensure_ascii=False, separators=(",", ":"))
        xs = [s["ll"] for s in v["stamps"]]
        index[code] = {"name": v["name"], "n": len(v["stamps"]), "ll": [round(sum(a for a, _ in xs) / len(xs), 5), round(sum(b for _, b in xs) / len(xs), 5)]}
    json.dump(index, open(f"{OUT}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
    with_photo = sum(1 for s in stamps if s.get("credit"))
    log(f"written: {len(per)} municipalities, {len(stamps)} stamps, {with_photo} sketched from a photo, {len(stamps) - with_photo} monogram")


if __name__ == "__main__":
    main()
