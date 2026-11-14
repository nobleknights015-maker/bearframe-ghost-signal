#!/usr/bin/env bash
set -euo pipefail
APK="$(find android/app/build/outputs/apk/debug -name '*.apk' -print -quit)"
if [[ -z "$APK" ]]; then echo "No assembled APK found" >&2; exit 1; fi
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"
AAPT="$(find "$SDK_ROOT/build-tools" -maxdepth 2 -type f -name aapt | sort -V | tail -n 1)"
if [[ -z "$AAPT" ]]; then echo "Android aapt not found under $SDK_ROOT/build-tools" >&2; exit 1; fi
PACKAGE="$("$AAPT" dump badging "$APK" | awk -F "'" '/^package: name=/ && !found {package=$2; found=1} END {if (found) print package}')"
if [[ -z "$PACKAGE" ]]; then echo "Cannot read APK package" >&2; exit 1; fi
echo "Installing $APK ($PACKAGE)"
adb install -r "$APK"
adb shell am force-stop "$PACKAGE" || true
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1
sleep 15
adb shell pidof "$PACKAGE" | tee /tmp/ghost-signal-emulator-pid
test -s /tmp/ghost-signal-emulator-pid
adb shell dumpsys activity activities > /tmp/ghost-signal-activities.txt
grep -F "$PACKAGE" /tmp/ghost-signal-activities.txt
adb shell screencap -p /sdcard/ghost-signal-launch.png
adb pull /sdcard/ghost-signal-launch.png ghost-signal-emulator-launch.png
echo "Emulator installed and process launched: $PACKAGE"
