"""Construction years for the whole country: placeholders, rounded years, monument dates.

Order of trust (flag q in out/years.parquet):
  0 exact      BAG year as recorded
  1 approx     a round year (step >= 10, before 1945) in excess of what the municipality's neighbouring
               non-round years predict; the excess is spread across its rounding step
  2 estimated  BAG placeholder 1005: median year of the 12 nearest dated buildings within 1 km
  3 monument   RCE construction date earlier than BAG (BAG often records a rebuilding);
               when BAG is not later than the RCE date + 10 years, BAG stays
  4 monument~  as 3, RCE gives a span (century or part of one): spread within it
RCE dates: structured construction events first, else the first date in the register description.
Monument to building: point-in-footprint / nearest match (p03, column m) plus RCE's own BAG relations.
writes out/years.parquet (identificatie -> year, q, y_bag) and updates out/panden.parquet in place
usage: python pipeline/p12_clean_years.py
"""
import csv, hashlib, os, sys, time
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.dirname(__file__))
from rce_text_dates import first_date

csv.field_size_limit(10 ** 8)
PLACEHOLDER = 1005
EXACT, APPROX, ESTIMATED, MONUMENT, MONUMENT_SPAN = 0, 1, 2, 3, 4
LATER_MARGIN = 10
ROUND_BEFORE = 1945
T0 = time.time()


def log(*a):
    print(f"[{time.time()-T0:5.0f}s]", *a, flush=True)


def unit(ids, salt):
    """Deterministic uniform [0,1) per building id, so reruns give the same map."""
    return np.array([int(hashlib.md5((salt + i).encode()).hexdigest()[:8], 16) / 2 ** 32 for i in ids])


def step_of(y):
    for s in (100, 50, 25, 10):
        if y % s == 0:
            return s
    return 1


def rce_spans():
    """monument number -> (lo, hi)"""
    spans = {}
    for r in csv.DictReader(open("data/raw/rce_text.csv")):
        d = first_date(r["txt"])
        n = int(r["n"])
        if d and (n not in spans or d[0] < spans[n][0]):
            spans[n] = d
    n_text = len(spans)
    for r in csv.DictReader(open("data/raw/rce_dates.csv")):
        b, e = int(r["begin"]), int(r["end"])
        if 1000 <= b <= 2026:
            spans[int(r["nr"])] = (b, max(b, min(e, 2026)))      # structured date wins over the text
    log(f"RCE dates: {len(spans):,} monuments ({n_text:,} from descriptions, structured override)")
    return spans


def main():
    p = pd.read_parquet("out/panden.parquet")
    p["y_bag"] = p.year.astype(int)
    if "q" in p:                         # rerun: start again from BAG
        p["year"] = p.y_bag
    p["year"] = p.year.astype(int)
    p["q"] = np.where(p.year == PLACEHOLDER, ESTIMATED, EXACT).astype(np.uint8)
    ids = p.index.values.astype(str)

    # ---- monuments ----
    spans = rce_spans()
    mon = pd.Series(p.m.values, index=p.index)
    mon = mon[mon > 0]
    extra = pd.read_csv("data/raw/rce_bag.csv", dtype=str)
    extra = extra[extra.pand.str.len() == 16]
    extra.index = "NL.IMBAG.Pand." + extra.pand
    extra = extra[extra.index.isin(p.index) & ~extra.index.isin(mon.index)]
    mon = pd.concat([mon, extra.n.astype(int).groupby(level=0).min()])
    u = unit(mon.index.values.astype(str), "monument")
    pos = p.index.get_indexer(mon.index)
    kept = moved = 0
    for k, (row, nr) in enumerate(zip(pos, mon.values)):
        if nr not in spans:
            continue
        lo, hi = spans[nr]
        y, q = p.year.iat[row], p.q.iat[row]
        if q == EXACT and y <= hi + LATER_MARGIN:
            kept += 1
            continue
        moved += 1
        p.iat[row, p.columns.get_loc("year")] = lo if lo == hi else int(round(lo + u[k] * (hi - lo)))
        p.iat[row, p.columns.get_loc("q")] = MONUMENT if lo == hi else MONUMENT_SPAN
    p.loc[mon.index, "m"] = np.where(p.loc[mon.index, "m"] > 0, p.loc[mon.index, "m"], mon.values).astype("int32")
    log(f"monument buildings: {len(mon):,}; BAG kept {kept:,}, redated by RCE {moved:,}")

    # ---- rounded years, per municipality ----
    gem = gpd.read_file("data/raw/gemeenten.json").to_crs(28992)[["identificatie", "geometry"]].rename(columns={"identificatie": "gm"})
    pts = gpd.GeoDataFrame(index=p.index, geometry=gpd.points_from_xy(p.x, p.yy), crs=28992)
    p["gm"] = gpd.sjoin(pts, gem, predicate="within", how="left").gm.groupby(level=0).first().reindex(p.index).fillna("")
    log("municipalities assigned")
    u1, u2 = unit(ids, "round"), unit(ids, "spread")
    n_approx = 0
    exact = p.q.values == EXACT
    years = p.year.values
    for gm, idx in p.groupby("gm").indices.items():
        sel = idx[exact[idx] & (years[idx] < ROUND_BEFORE)]
        if not len(sel):
            continue
        counts = pd.Series(years[sel]).value_counts()
        for year, n in counts.items():
            step = step_of(year)
            if step == 1:
                continue
            near = [counts.get(year + d, 0) for d in range(-4, 5) if d and step_of(year + d) == 1]
            expected = max(1.0, float(np.mean(near))) if near else 1.0
            if n <= expected:
                continue
            on = sel[years[sel] == year]
            excess = on[np.argsort(u1[on])][int(round(expected)):]
            half = step / 2
            p.iloc[excess, p.columns.get_loc("year")] = np.round(year - half + u2[excess] * step).astype(int)
            p.iloc[excess, p.columns.get_loc("q")] = APPROX
            n_approx += len(excess)
    log(f"rounded years spread: {n_approx:,}")

    # ---- placeholders ----
    est = p.q.values == ESTIMATED
    if est.any():
        known = ~est
        xy = np.c_[p.x.values, p.yy.values]
        tree = cKDTree(xy[known])
        d, nn = tree.query(xy[est], k=12, distance_upper_bound=1000)
        ky = p.year.values[known]
        fill = [int(np.median(ky[n[np.isfinite(dd)]])) if np.isfinite(dd).any() else 1900 for dd, n in zip(d, nn)]
        p.loc[est, "year"] = fill
    log(f"placeholders estimated: {int(est.sum()):,}")

    p["year"] = p.year.astype("int16")
    p = p.drop(columns=["gm"])
    p.to_parquet("out/panden.parquet")
    changed = p[(p.year != p.y_bag) | (p.q != EXACT)]
    changed[["year", "q"]].to_parquet("out/years.parquet")
    log(f"changed: {len(changed):,} of {len(p):,}; by flag {p.q.value_counts().sort_index().to_dict()}")


if __name__ == "__main__":
    main()
