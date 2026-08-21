#!/bin/sh
# Assembles src/* into two outputs:
#   index.html: standalone page, deploy this anywhere
#   artifact.html: same content as a fragment, for Claude Artifacts
set -e
cd "$(dirname "$0")"

# fragment: page content + the four question banks + the materials + app logic,
# all in one <script>
{
  cat src/page.html
  echo '<script>'
  echo 'var BANKS = {};'
  cat src/bank-cil-pq.js src/bank-bus-pq.js src/bank-cil-new.js src/bank-bus-new.js \
      src/materials.js src/math.js src/app.js
  echo '</script>'
} > artifact.html

# standalone: proper <head>, with the <title> lifted out of the body
{
  cat <<'HEAD'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shade The Appropriate Answer</title>
<meta name="description" content="418 worked multiple-choice questions for CIL 524 Law of Engineering Contracts and BUS 440 Management for Engineers: both past papers plus fresh questions from the 2025/26 course materials.">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#EDEFEB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#101315" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='none' stroke='%232F3E7E' stroke-width='4'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%232F3E7E'/%3E%3C/svg%3E">
</head>
<body>
HEAD
  # strip the fragment's own <title>; it now lives in <head>
  grep -v '^<title>Shade The Appropriate Answer</title>$' artifact.html
  echo '</body>'
  echo '</html>'
} > index.html

echo "built:"
echo "  index.html    $(wc -c < index.html | tr -d ' ') bytes: deploy this"
echo "  artifact.html $(wc -c < artifact.html | tr -d ' ') bytes: Claude Artifacts fragment"
