#!/bin/sh
# Downloads the source data for tools/geo into tools/geo/dl (not committed). Needs curl, pip and unzip.
set -e
cd "$(dirname "$0")"
mkdir -p dl/osm dl/ne dl/en dl/gn dl/pip
# OpenStreetMap country boundaries (relations: Lithuania, Latvia, Belarus, Poland, Kaliningrad oblast)
for id in 72596 72594 59065 49715 103906; do
  p=$(printf '%09d' "$id"); curl -fsSL -o "dl/osm/$id.geojson" \
    "https://raw.githubusercontent.com/missinglink/osm-boundaries/master/data/$(echo "$p" | cut -c1-3)/$(echo "$p" | cut -c4-6)/$(echo "$p" | cut -c7-9)/$p.geojson"
done
# Natural Earth 1:10m land, lakes and rivers
for n in ne_10m_land ne_10m_lakes ne_10m_lakes_europe ne_10m_rivers_europe ne_10m_rivers_lake_centerlines; do
  curl -fsSL -o "dl/ne/$n.geojson" "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/$n.geojson"
done
# Euronym place names for Lithuania at 1:20 000 detail
curl -fsSL -o dl/en/LT_20.csv https://raw.githubusercontent.com/eurostat/euronym/main/pub/v2/UTF/20/LT.csv
# GeoNames populations (from the geonamescache package), Lithuanian places only
pip download --no-deps -q -d dl/pip geonamescache==3.0.2
unzip -o -q dl/pip/geonamescache-3.0.2-py3-none-any.whl 'geonamescache/data/cities500.json' -d dl/pip
python3 -I -c "import json,sys;d=json.load(open('dl/pip/geonamescache/data/cities500.json'));json.dump([v for v in d.values() if v['countrycode']=='LT'],open('dl/gn/lt500.json','w'),ensure_ascii=False)"
echo done
