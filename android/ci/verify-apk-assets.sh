#!/usr/bin/env bash
# Verify that the APK actually contains this checkout's gameplay source.
# Build success alone is insufficient if Gradle packaged an old/stale frontend.
set -euo pipefail
APK="${1:-}"
if [[ -z "$APK" ]]; then
  APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)"
fi
if [[ ! -s "$APK" ]]; then
  echo "APK payload verification: missing APK $APK" >&2
  exit 1
fi
files=(
  index.html
  engine-lab.html
  aeon.html
  campaign.html
  css/game.css
  js/main.js
  js/game.js
  js/engine/campaign-game.js
  js/engine/campaign-battle.js
  js/engine/campaign-combat-staging.js
  js/engine/campaign-journal.js
  js/engine/campaign-narrative.js
  js/engine/campaign-world.js
  js/engine/rpg-combat.js
  js/engine/rpg-sideview-scene.js
  studio/studio.js
)
for relative in "${files[@]}"; do
  source_file="frontend/public/$relative"
  asset="assets/$relative"
  if [[ ! -f "$source_file" ]]; then
    echo "Expected source missing: $source_file" >&2
    exit 1
  fi
  if ! unzip -p "$APK" "$asset" | cmp - "$source_file"; then
    echo "APK is missing or has stale contents for $asset" >&2
    exit 1
  fi
done
# Public CI must not embed owner-only screenplay, maps or art. The owner's
# offline development packaging is a separate, access-controlled process.
if unzip -Z -1 "$APK" | grep -Eq '^assets/assets/aeon/(story|portraits|assets/(world|battlers))(/|$)'; then
  echo "Owner-only campaign artwork or screenplay leaked into the PUBLIC CI APK" >&2
  exit 1
fi
echo "APK package gate passed: source-matched engine, campaign, UI and Sprite Studio files are embedded; owner-only data excluded."
