#!/usr/bin/env bash
# Phase 2 acceptance gate (implementation brief §7): normalized diff between the
# live page (repo root) and the built page (_site/). Entities are decoded on
# both sides (the live HTML uses &uuml;-style entities, templates emit UTF-8),
# then both are formatted with prettier so only real DOM/content differences
# remain. Empty output = page passes.
#
# Usage: scripts/normdiff.sh index.html
set -euo pipefail
page="$1"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

normalize() { # $1 = source file, $2 = output name
  python3 -c 'import sys,html; sys.stdout.write(html.unescape(sys.stdin.read()))' \
    < "$1" > "$tmp/$2.raw.html"
  npx prettier --parser html "$tmp/$2.raw.html" > "$tmp/$2.html"
}

normalize "$page" live
normalize "_site/$page" built
diff -u --label "live/$page" --label "built/$page" "$tmp/live.html" "$tmp/built.html"
