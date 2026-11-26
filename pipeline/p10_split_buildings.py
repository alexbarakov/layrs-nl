"""Split out/nl-buildings.pmtiles into west-to-east parts under the upload limit (wrangler: ~300 MB per object).

Parts are cut on z14 tile columns (z15 follows its parent), so a tile lives in exactly one part.
The viewer routes each tile request to its part (see viewer/m.html, protocol "nlb").
Writes out/nl-buildings-<i>.pmtiles and prints the column cut points for the viewer.
usage: python pipeline/p10_split_buildings.py [max_mb]
"""
import sys
from pmtiles.reader import Reader, MmapSource, all_tiles
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid

SRC = "out/nl-buildings.pmtiles"


def main():
    limit = float(sys.argv[1]) * 1e6 if len(sys.argv) > 1 else 280e6
    with open(SRC, "rb") as f:
        r = Reader(MmapSource(f))
        header, meta = r.header(), r.metadata()
        tiles = sorted(((z, x, y), d) for (z, x, y), d in all_tiles(r.get_bytes))
    col = {}
    for (z, x, y), d in tiles:
        c = x >> (z - 14)
        col[c] = col.get(c, 0) + len(d)
    cuts, acc = [], 0
    for c in sorted(col):
        if acc + col[c] > limit:
            cuts.append(c); acc = 0
        acc += col[c]
    bounds = [-1] + cuts + [1 << 30]
    for i in range(len(bounds) - 1):
        lo, hi = bounds[i], bounds[i + 1]
        part = {zxy_to_tileid(z, x, y): d for (z, x, y), d in tiles if lo <= (x >> (z - 14)) < hi}
        out = f"out/nl-buildings-{i}.pmtiles"
        with open(out, "wb") as f:
            w = Writer(f)
            for tid in sorted(part):
                w.write_tile(tid, part[tid])
            w.finalize(dict(header), meta)
        print(out, f"{sum(map(len, part.values()))/1e6:.0f} MB", f"z14 columns [{lo}, {hi})")
    print("cuts (z14 x):", cuts)


if __name__ == "__main__":
    main()
