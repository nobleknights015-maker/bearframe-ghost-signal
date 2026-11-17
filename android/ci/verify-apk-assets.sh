#!/usr/bin/env bash
set -euo pipefail
APK="${1:-}"
if [[ -z "$APK" ]]; then APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)"; fi
test -s "$APK" || { echo "Missing built APK"; exit 1; }
for src in index.html css/game.css js/game.js js/main.js js/ui.js js/engine/input.js js/engine/save.js js/missions/index.js js/missions/mission1.js js/missions/mission2.js js/missions/mission3.js js/missions/mission4.js js/art/tiles.js assets/characters/gs_mira_exp_draft.png assets/characters/gs_nova_exp_draft.png assets/characters/gs_kai_exp_draft.png assets/characters/gs_survivor_exp_draft.png assets/characters/ghost-signal-expedition.json studio/studio.js; do
  test -f "frontend/public/$src" || { echo "Missing source $src"; exit 1; }
  unzip -p "$APK" "assets/$src" | cmp - "frontend/public/$src" || { echo "Stale APK asset $src"; exit 1; }
done
unzip -Z -1 "$APK" | grep -q '^assets/js/missions/mission3.js$'
# Never package owner-only private screenplay or licensed art in public workflow.
if unzip -Z -1 "$APK" | grep -Eq '^assets/assets/aeon/(story|portraits|assets/(world|battlers))(/|$)'; then
  echo "Private Aeon asset leakage!" >&2; exit 1;
fi
if unzip -Z -1 "$APK" | grep -Ei '(^|/)(Bearframe[_ -]?Revision|quiet.directive|Director.s.Cut|private.*campaign)' ; then
  echo "Unexpected private campaign material!" >&2; exit 1;
fi
echo "PASSED: APK contains Ghost Signal M01–M04 and exact generated upgraded Studio NPC sprites."
