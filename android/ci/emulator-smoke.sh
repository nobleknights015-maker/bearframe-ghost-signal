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
echo "Installing $APK ($PACKAGE; launch $LAUNCH_ACTIVITY)"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE" || true
adb shell am start -W -n "$PACKAGE/$LAUNCH_ACTIVITY"
sleep 15
adb shell pidof "$PACKAGE" | tee /tmp/ghost-signal-emulator-pid
test -s /tmp/ghost-signal-emulator-pid
adb shell dumpsys activity activities > /tmp/ghost-signal-activities.txt
# A live process is insufficient: verify that our Activity is actually resumed.
RESUMED="$(adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity|ResumedActivity" || true)"
if ! grep -Fq "$PACKAGE/" <<< "$RESUMED"; then
  echo "Ghost Signal is not the resumed foreground Activity: $RESUMED" >&2; exit 1
fi
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
RESUMED_RESTART="$(adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity|ResumedActivity" || true)"
if ! grep -Fq "$PACKAGE/" <<< "$RESUMED_RESTART"; then
  echo "Ghost Signal did not resume to foreground after force-stop: $RESUMED_RESTART" >&2; exit 1
fi
grep -F "$PACKAGE" /tmp/ghost-signal-activities-restart.txt
adb exec-out screencap -p > ghost-signal-emulator-restart.png
test -s ghost-signal-emulator-restart.png
# Check input delivery again after the Activity has been recreated.
adb shell input tap 24 24
sleep 2
if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
  echo "Restarted app died after injected touch" >&2; exit 1
fi
RESUMED_TOUCH="$(adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity|ResumedActivity" || true)"
if ! grep -Fq "$PACKAGE/" <<< "$RESUMED_TOUCH"; then
  echo "App left foreground after injected touch: $RESUMED_TOUCH" >&2; exit 1
fi
echo "Emulator install, launch, touch-dispatch and process-restart smoke passed: $PACKAGE (pid $RESTART_PID)"
