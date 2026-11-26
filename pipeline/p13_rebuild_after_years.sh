#!/bin/sh
# Rebuild every derived output after p12_clean_years.py, without p03's first pass
# (which recomputes out/panden.parquet from the 3D BAG tiles and would drop the cleaned years).
set -e
GEO=${GEO_PY:-/Users/aabarakov/projects/amsterdam-by-building/.venv/bin/python}
RAS=${RAS_PY:-.venv/bin/python}
$GEO -c "import sys; sys.path.insert(0,'pipeline'); import pandas as pd, p03_build_nl as p3
p3.pass2(None)
import subprocess
subprocess.run(['tippecanoe','-o','out/nl-buildings.pmtiles','--force','-l','b','-Z14','-z15','-P','-q','--drop-densest-as-needed','--no-tile-stats','--detect-shared-borders','out/nl.geojsonl'],check=True)
p3.log('buildings z14-15 done')
p3.overview(pd.read_parquet('out/panden.parquet'))"
$GEO pipeline/p05_build_lowzoom.py
rm -f out/nl.geojsonl out/overview_*.geojsonl
$RAS pipeline/p10_split_buildings.py
$RAS pipeline/p07_overview_raster.py
$GEO pipeline/p08_walk_poi.py
echo "rebuild done"
