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
# Android's activity manager may report a timeout even after delivering the
# launch intent. Treat am output as diagnostic; the resumed-activity and PID
# assertions below are the actual acceptance gates.
start_activity() {
  local output
  if output="$(adb shell am start -W -n "$PACKAGE/$LAUNCH_ACTIVITY" 2>&1)"; then
    echo "$output"
  else
    echo "Activity manager returned nonzero; verifying actual foreground state: $output" >&2
  fi
}
echo "Installing $APK ($PACKAGE; launch $LAUNCH_ACTIVITY)"
# A boot-completed signal may precede package-manager readiness on CI emulators.
# Wait for the package service, then retry transient transport failures. A failed
# install must never be mistaken for successful app lifecycle verification.
install_apk() {
  local attempt output
  for attempt in 1 2 3 4; do
    adb wait-for-device
    if ! adb shell service check package 2>/dev/null | grep -q 'found'; then
      echo "Package service not ready (attempt $attempt)" >&2
      sleep 12
      continue
    fi
    if output="$(adb install -r "$APK" 2>&1)"; then
      echo "$output"
      return 0
    fi
    echo "APK install attempt $attempt failed: $output" >&2
    # Streaming install can fail with a transient broken package-service pipe
    # during cold boot; use the non-streaming transport for subsequent attempts.
    if [[ "$attempt" -lt 4 ]]; then
      sleep 12
      if output="$(adb install --no-streaming -r "$APK" 2>&1)"; then
        echo "$output"
        return 0
      fi
      echo "Non-streaming install attempt $attempt failed: $output" >&2
    fi
  done
  echo "APK install failed after package-service readiness and retries" >&2
  return 1
}
install_apk
adb shell am force-stop "$PACKAGE" || true
start_activity
sleep 15
adb shell pidof "$PACKAGE" | tee /tmp/ghost-signal-emulator-pid
test -s /tmp/ghost-signal-emulator-pid
adb shell dumpsys activity activities > /tmp/ghost-signal-activities.txt
# A live process is insufficient: verify that our Activity is actually resumed.
assert_foreground "Initial launch"
# Game is landscape-only; confirm emulator rotation at the window manager level.
EMULATOR_DISPLAY="$(adb shell wm size | tr -d '\\r')"
echo "Emulator display: $EMULATOR_DISPLAY"
grep -F "$PACKAGE" /tmp/ghost-signal-activities.txt
# OS touch-dispatch smoke only; this does not prove RPG touch controls.
adb shell input tap 24 24
sleep 2
if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "App died after injected touch" >&2; exit 1
fi
adb exec-out screencap -p > ghost-signal-emulator-launch.png
test -s ghost-signal-emulator-launch.png
# Exercise actual background/resume without force-stop first. This is a native
# lifecycle gate only: browser integration separately verifies journal contents.
BACKGROUND_PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
adb shell input keyevent KEYCODE_HOME
sleep 2
start_activity
assert_foreground "Background resume"
RESUMED_PID="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
if [[ "$RESUMED_PID" != "$BACKGROUND_PID" ]]; then
  echo "Background resume unexpectedly recreated process ($BACKGROUND_PID -> $RESUMED_PID)" >&2
  exit 1
fi
adb exec-out screencap -p > ghost-signal-emulator-resume.png
test -s ghost-signal-emulator-resume.png
# Verify a fresh Activity launch after a process kill. This checks Android lifecycle
# restart wiring, not RPG journal persistence or a physical-device resume.
adb shell am force-stop "$PACKAGE"
if adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "App process survived force-stop" >&2; exit 1
fi
start_activity
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
for filename in ("ghost-signal-emulator-launch.png", "ghost-signal-emulator-resume.png", "ghost-signal-emulator-restart.png"):
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
echo "Emulator install, launch, touch-dispatch, background-resume and process-restart smoke passed: $PACKAGE (pid $RESTART_PID)"
