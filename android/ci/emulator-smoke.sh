#!/usr/bin/env bash
set -euo pipefail
APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)"
test -s "$APK"
PKG='labs.bearframe.ghostsignal.expanded'
adb wait-for-device
for attempt in 1 2 3 4; do
  if adb install -r "$APK"; then break; fi
  if [[ "$attempt" == 4 ]]; then exit 1; fi
  sleep 10
done
adb shell am force-stop "$PKG" || true
adb shell am start -W -n "$PKG/.MainActivity"
sleep 12
adb shell pidof "$PKG" >/dev/null
adb exec-out screencap -p > ghost-signal-expanded-launch.png
python3 - <<'PY'
import struct
data = open('ghost-signal-expanded-launch.png','rb').read(24)
assert data[:8] == b'\x89PNG\r\n\x1a\n'
width, height = struct.unpack('>II', data[16:24])
print('Screenshot width/height:', width, height)
assert width > height, 'Landscape viewport expected'
PY
adb shell input tap 48 48
sleep 2
adb shell pidof "$PKG" >/dev/null
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell am start -W -n "$PKG/.MainActivity"
sleep 4
adb shell pidof "$PKG" >/dev/null
adb exec-out screencap -p > ghost-signal-expanded-resume.png
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity"
sleep 7
adb shell pidof "$PKG" >/dev/null
echo "PASS: APK installed, launched in landscape and survived touch, HOME/resume and process restart."
