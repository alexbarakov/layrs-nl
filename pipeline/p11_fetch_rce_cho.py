"""Rijksmonument knowledge from the RCE linked data (dataset rce/cho, CC BY) -> data/raw/rce_*.csv

rce_bag.csv    monument number, BAG pand id (direct BAG relations kept by RCE)
rce_dates.csv  monument number, begin year, end year of its earliest construction event ("vervaardiging")
rce_text.csv   monument number, register description (also the fallback date source and the story text)
usage: python pipeline/p11_fetch_rce_cho.py
"""
import csv, io, sys, time, urllib.parse, urllib.request

EP = "https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql"
PFX = """PREFIX ceo:<https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
PREFIX xsd:<http://www.w3.org/2001/XMLSchema#>
"""
PAGE = 10000

# raw rows per number range; the server times out on whole-dataset sorts and aggregates,
# so we page by monument number and aggregate here
RANGE = 20000
MAX_NR = 540000
NR = """?m a ceo:Rijksmonument ; ceo:rijksmonumentnummer ?nr .
  FILTER(isLiteral(?nr) && !STRSTARTS(STR(?nr), "http"))
  BIND(xsd:integer(STR(?nr)) AS ?n) FILTER(?n >= {lo} && ?n < {hi})"""
QUERIES = {
    "rce_bag": "SELECT DISTINCT ?n ?pand WHERE { " + NR + " ?m ceo:heeftBasisregistratieRelatie/ceo:heeftBAGRelatie/ceo:pandIdentificatie ?pand . }",
    "rce_dates": "SELECT DISTINCT ?n ?bd ?ed WHERE { " + NR + """ ?m ceo:heeftGebeurtenis ?g .
  ?g ceo:heeftGebeurtenisNaam|ceo:heeftType ?t . ?t skos:prefLabel "vervaardiging" .
  ?g ceo:heeftDatering ?d . ?d ceo:heeftBeginDatering/ceo:datum ?bd . OPTIONAL { ?d ceo:heeftEindDatering/ceo:datum ?ed } }""",
    "rce_text": "SELECT DISTINCT ?n ?txt WHERE { " + NR + " ?m ceo:heeftOmschrijving/ceo:omschrijving ?txt . }",
}


def run(q):
    body = urllib.parse.urlencode({"query": PFX + q}).encode()
    req = urllib.request.Request(EP, data=body, headers={"Accept": "text/csv", "Content-Type": "application/x-www-form-urlencoded"})
    for attempt in range(5):
        try:
            return urllib.request.urlopen(req, timeout=300).read().decode()
        except Exception as e:
            print("  retry", attempt + 1, e, flush=True)
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("SPARQL failed")


def main():
    names = sys.argv[1:] or list(QUERIES)
    for name in names:
        rows, header = [], None
        todo = [(lo, lo + RANGE) for lo in range(0, MAX_NR, RANGE)]
        while todo:
            lo, hi = todo.pop(0)
            r = list(csv.reader(io.StringIO(run(QUERIES[name].replace("{lo}", str(lo)).replace("{hi}", str(hi))))))
            if len(r) - 1 >= PAGE and hi - lo > 1:      # the server caps a result at PAGE rows: split the range
                mid = (lo + hi) // 2
                todo[:0] = [(lo, mid), (mid, hi)]
                continue
            header = r[0]; rows += r[1:]
            print(name, lo, hi, len(r) - 1, flush=True)
        if name == "rce_dates":
            # earliest construction event per monument: begin year and its end year
            best = {}
            for n, bd, ed in rows:
                b, e = int(bd[:4]), int((ed or bd)[:4])
                if n not in best or b < best[n][0]:
                    best[n] = (b, e)
            header, rows = ["nr", "begin", "end"], [[n, b, e] for n, (b, e) in sorted(best.items(), key=lambda x: int(x[0]))]
        with open(f"data/raw/{name}.csv", "w", newline="") as f:
            w = csv.writer(f); w.writerow(header); w.writerows(rows)
        print(name, len(rows), "rows")


if __name__ == "__main__":
    main()
