#!/usr/bin/env bash
set -euo pipefail
APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)"
if [[ -z "$APK" ]]; then echo "No assembled APK found" >&2; exit 1; fi
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"
AAPT="$(find "$SDK_ROOT/build-tools" -maxdepth 2 -type f -name aapt | sort -V | tail -n 1)"
if [[ -z "$AAPT" ]]; then echo "Android aapt not found under $SDK_ROOT/build-tools" >&2; exit 1; fi
PACKAGE="$("$AAPT" dump badging "$APK" | awk -F "'" '/^package: name=/ && !found {package=$2; found=1} END {if (found) print package}')"
if [[ -z "$PACKAGE" ]]; then echo "Cannot read APK package" >&2; exit 1; fi
LAUNCH_ACTIVITY="$("$AAPT" dump badging "$APK" | awk -F "\x27" '/^launchable-activity: name=/ {print $2; exit}')"
if [[ -z "$LAUNCH_ACTIVITY" ]]; then echo "No launchable Activity declared in APK" >&2; exit 1; fi
# Emulator ADB and activity-manager reporting can lag after cold starts. Poll the
# actual resumed Activity instead of treating a single empty dumpsys as failure.
assert_foreground() {
  local phase="$1" resumed="" attempt
  for attempt in $(seq 1 12); do
    resumed="$(adb shell dumpsys activity activities 2>/dev/null | grep -E 'mResumedActivity|topResumedActivity|ResumedActivity' || true)"
    if grep -Fq "$PACKAGE/" <<< "$resumed"; then
      echo "$phase foreground confirmed on attempt $attempt: $resumed"
      return 0
    fi
    sleep 5
  done
  echo "$phase: no foreground Activity after 60s; last resumed: $resumed" >&2
  adb shell dumpsys activity activities | tail -100 >&2 || true
  adb logcat -d -t 250 | grep -E 'FATAL EXCEPTION|ANR in|ghostsignal' | tail -60 >&2 || true
  return 1
}
echo "Installing $APK ($PACKAGE; launch $LAUNCH_ACTIVITY)"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE" || true
adb shell am start -W -n "$PACKAGE/$LAUNCH_ACTIVITY"
sleep 15
adb shell pidof "$PACKAGE" | tee /tmp/ghost-signal-emulator-pid
test -s /tmp/ghost-signal-emulator-pid
adb shell dumpsys activity activities > /tmp/ghost-signal-activities.txt
# A live process is insufficient: verify that our Activity is actually resumed.
assert_foreground "Initial launch"
# Game is landscape-only; confirm emulator rotation at the window manager level.
DISPLAY="$(adb shell wm size | tr -d '\\r')"
echo "Emulator display: $DISPLAY"
grep -F "$PACKAGE" /tmp/ghost-signal-activities.txt
# OS touch-dispatch smoke only; this does not prove RPG touch controls.
adb shell input tap 24 24
sleep 2
if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "App died after injected touch" >&2; exit 1
fi
adb exec-out screencap -p > ghost-signal-emulator-launch.png
test -s ghost-signal-emulator-launch.png
# Verify a fresh Activity launch after a process kill. This checks Android lifecycle
# restart wiring, not RPG journal persistence or a physical-device resume.
adb shell am force-stop "$PACKAGE"
if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "App process survived force-stop" >&2; exit 1
fi
adb shell am start -W -n "$PACKAGE/$LAUNCH_ACTIVITY"
sleep 10
RESTART_PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
if [[ -z "$RESTART_PID" ]]; then
  echo "App failed to relaunch after force-stop" >&2; exit 1
fi
adb shell dumpsys activity activities > /tmp/ghost-signal-activities-restart.txt
assert_foreground "Process restart"
grep -F "$PACKAGE" /tmp/ghost-signal-activities-restart.txt
adb exec-out screencap -p > ghost-signal-emulator-restart.png
test -s ghost-signal-emulator-restart.png
# Inspect actual screenshot geometry rather than merely printing wm size.
# This catches a portrait Android host despite a landscape-only manifest.
python3 - <<'PY'
import struct
for filename in ("ghost-signal-emulator-launch.png", "ghost-signal-emulator-restart.png"):
    with open(filename, "rb") as image:
        header = image.read(24)
    if header[:8] != bytes((137, 80, 78, 71, 13, 10, 26, 10)) or header[12:16] != b"IHDR":
        raise SystemExit(f"{filename}: invalid PNG screenshot")
    width, height = struct.unpack(">II", header[16:24])
    print(f"{filename}: captured display {width}x{height}")
    if width <= height:
        raise SystemExit(f"{filename}: portrait display; landscape Android acceptance failed")
PY
# Check input delivery again after the Activity has been recreated.
adb shell input tap 24 24
sleep 2
if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "Restarted app died after injected touch" >&2; exit 1
fi
assert_foreground "Post-restart touch"
echo "Emulator install, launch, touch-dispatch and process-restart smoke passed: $PACKAGE (pid $RESTART_PID)"
