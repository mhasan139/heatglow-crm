#!/bin/bash
# Turbopack crashes when the project path contains a trailing space.
# Workaround: rsync to a clean /tmp path and run from there.
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
SRC="/Users/mahbubulalom/Heatglow CRM /"
DST="/tmp/heatglow-crm"
rsync -a --exclude='.git' --exclude='.next' "$SRC" "$DST/"
cd "$DST"
exec /usr/local/bin/node node_modules/next/dist/bin/next dev
