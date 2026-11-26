# LAYRS NL

Every building in the Netherlands, 10.7 million of them, by construction year and historical context, built for a phone.
The national follow-up to the city sites ([Amsterdam](https://github.com/alexbarakov/amsterdam-by-building) and others):
the same idea, the whole country, used on the street rather than at a desk.

This repository holds the data pipeline, a mobile test stand (MapLibre GL JS in the browser) and the app design.
The native app (Expo + MapLibre Native) comes next.

- Test stand on a phone: https://alexbarakov.github.io/layrs-nl/viewer/m.html
- Design: https://alexbarakov.github.io/layrs-nl/docs/design/ (structure, screens, open decisions)

The page is served by GitHub Pages; tiles, walk stops and pedestrian graphs come from a Cloudflare R2 bucket
(`viewer/m.html`, constant `R2`). Served from anywhere else, the stand reads data from its own origin; `?data=<url>` overrides.

## How it works

```
open data ──► pipeline/ (Python) ──► out/*.pmtiles + viewer/poi, viewer/graph ──► viewer/ (MapLibre, no build step)
```

| Step | What it does | Output |
|---|---|---|
| `p00_fetch_rce` | Rijksmonument points from PDOK (RCE) | `data/raw/rce_points.parquet` |
| `p01_fetch_3dbag` | 3D BAG tiles: footprints, construction year, height | `data/tiles/*.parquet` |
| `p03_build_nl` | Dedupes buildings across tiles, matches monuments, builds z14–15 buildings and the 100 m overview grid | `nl-buildings.pmtiles`, `nl-overview.pmtiles` |
| `p04_build_base` | Basemap from Top10NL: water, green, roads with names, rail, place names | `nl-base.pmtiles` |
| `p05_build_lowzoom` | Buildings for z12–13 | `nl-buildings-lo.pmtiles` |
| `p06_build_context` | Neighbouring countries (Natural Earth) and the exact national border (PDOK) | `nl-context.pmtiles` |
| `p07_overview_raster` | z5–10 overview: one pixel = median year of the buildings under it | `nl-overview-r.pmtiles` |
| `p08_walk_poi` | Walk stop candidates per municipality: monuments and buildings before 1850 | `viewer/poi/<GM>.json` |
| `p09_walk_graph` | Pedestrian graph per municipality from Top10NL road centrelines | `viewer/graph/<GM>.json` |

| `p10_split_buildings` | Splits the z14–15 buildings into three west-to-east parts under the 300 MB upload limit; the stand routes each tile to its part | `nl-buildings-{0,1,2}.pmtiles` |

`p02_build_pmtiles` is the earlier one-province trial build.

Upload to R2 (bucket `layrs-nl`, prefix `v1/`): `npx wrangler r2 object put layrs-nl/v1/<file> --file <file> --remote`.

Sizes for the whole country: buildings 670 MB (z14–15) + 176 MB (z12–13), basemap 256 MB, overview 34 + 6 MB.
A municipality pack is a few MB: Delft buildings 3.4 MB, walk stops 57 KB, pedestrian graph 1.3 MB.

## Run it

```bash
uv sync
uv run python pipeline/p00_fetch_rce.py
uv run python pipeline/p01_fetch_3dbag.py data/raw/tiles_nl.csv 16   # tile list from the 3D BAG tile index
uv run python pipeline/p03_build_nl.py
# Top10NL GeoPackage (11 GB) into data/raw/top10nl.gpkg, then
for s in p04_build_base p05_build_lowzoom p06_build_context p07_overview_raster p08_walk_poi p09_walk_graph; do uv run python pipeline/$s.py; done
uv run python pipeline/p10_split_buildings.py
ln -s ../out/*.pmtiles viewer/
python3 viewer/serve.py 8660 viewer           # http://localhost:8660/m.html
```

`serve.py` adds HTTP Range support, which PMTiles needs. `lan` binds to the local network;
`https` serves with a certificate from `.cert/` (phones only give geolocation to https pages):

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout .cert/key.pem -out .cert/cert.pem \
  -subj "/CN=layrs-nl dev" -addext "subjectAltName=IP:<your LAN IP>,DNS:localhost"
python3 viewer/serve.py 8661 viewer lan https
```

## Test stand

- Cells by median age when zoomed out, buildings from z12 once 10,000 cells or fewer are in view
- Periods and monuments modes, year slider, 3D, pixel-ratio switch to compare heat, 20 s fly-through benchmark
- Chips follow the municipality under the map centre
- Geolocation (https only) and a walk planner: start, interests, length, loop or one way;
  stops are chosen on the phone, then routed along streets on the municipality graph;
  guided mode, Google Maps export and a shareable link

## Data decisions

- **Height** is `b3_h_70p − b3_h_maaiveld` (roof 70th percentile above ground), not above the lowest roof point.
- **Duplicates** across 3D BAG tiles: a building belongs to the tile that contains the representative point of its first part.
- **Monument number** is the last segment of the RCE register URL (`ci_citation`), not `localid`.
  Matching: point inside a footprint, else the nearest building within 15 m (55,893 of 63,119 matched).
- **Walking**: every road except motor-only, bus lanes, airfields, slip roads and interchanges.

## Licence

Code: MIT (see [LICENSE](LICENSE)). Data keeps the licence of its source: 3D BAG CC BY 4.0; BAG CC0;
RCE rijksmonumenten CC BY 4.0; Kadaster BRT Top10NL and BRK boundaries CC BY 4.0; Natural Earth public domain.
