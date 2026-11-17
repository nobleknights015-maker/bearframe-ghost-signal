#!/usr/bin/env bash
# Fresh Android emulator with explicit framework service readiness.
# Upstream emulator-runner@v2 can call "input keyevent 82" as soon as
# sys.boot_completed=1, before the input service is available. This runner
# waits for input, package and activity services and never hides app smoke failures.
set -euo pipefail
SDK_ROOT="$(printenv ANDROID_SDK_ROOT || printenv ANDROID_HOME || echo /usr/local/lib/android/sdk)"
export ANDROID_HOME="$SDK_ROOT" ANDROID_SDK_ROOT="$SDK_ROOT"
export PATH="$SDK_ROOT/platform-tools:$PATH"
SDKMANAGER="$(find "$SDK_ROOT/cmdline-tools" -maxdepth 4 -type f -name sdkmanager | sort -V | tail -n 1)"
AVDMANAGER="$(find "$SDK_ROOT/cmdline-tools" -maxdepth 4 -type f -name avdmanager | sort -V | tail -n 1)"
if [[ -z "$SDKMANAGER" || -z "$AVDMANAGER" ]]; then
  echo "Android command-line tools unavailable on GitHub runner" >&2
  exit 1
fi
IMAGE="system-images;android-35;google_apis;x86_64"
AVD_NAME="bearframe-ci-api35"
echo "Installing API 35 emulator and x86_64 image; APK was assembled in the prior job."
yes | "$SDKMANAGER" --sdk_root="$SDK_ROOT" --licenses >/dev/null || true
"$SDKMANAGER" --sdk_root="$SDK_ROOT" "emulator" "platform-tools" "platforms;android-35" "build-tools;35.0.0" "$IMAGE"
printf 'no\n' | "$AVDMANAGER" create avd --force -n "$AVD_NAME" -k "$IMAGE"
if [[ -e /dev/kvm ]]; then
  sudo chmod a+rw /dev/kvm
else
  echo "WARNING: /dev/kvm not exposed; emulator may be slow" >&2
fi
EMU_PID=""
cleanup(){
  local result=$?
  if ((result != 0)); then
    echo "Android framework or app smoke failed; collecting emulator diagnostics" >&2
    tail -n 160 /tmp/bearframe-ci-emulator.log >&2 || true
    timeout 12 adb -s emulator-5554 logcat -d -t 180 2>/dev/null |
      grep -E 'FATAL EXCEPTION|ANR in|ghostsignal|init:|servicemanager' | tail -n 70 >&2 || true
  fi
  adb -s emulator-5554 emu kill >/dev/null 2>&1 || true
  if [[ -n "$EMU_PID" ]]; then
    kill "$EMU_PID" 2>/dev/null || true
    wait "$EMU_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
"$SDK_ROOT/emulator/emulator" -avd "$AVD_NAME" -port 5554 -no-window \
  -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim \
  -camera-back none -camera-front none -memory 2048 \
  > /tmp/bearframe-ci-emulator.log 2>&1 &
EMU_PID=$!
timeout 300 adb -s emulator-5554 wait-for-device

ready=0
for attempt in $(seq 1 240); do
  boot="$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  input="$(adb -s emulator-5554 shell service check input 2>/dev/null || true)"
  package="$(adb -s emulator-5554 shell service check package 2>/dev/null || true)"
  activity="$(adb -s emulator-5554 shell service check activity 2>/dev/null || true)"
  if [[ "$boot" == "1" && "$input" == *found* && "$package" == *found* && "$activity" == *found* ]]; then
    ready=$((ready+1))
    if (( ready>=3 )); then break; fi
  else
    ready=0
  fi
  if ((attempt%20==0)); then
    echo "Framework readiness attempt $attempt: boot=$boot input=$input package=$package activity=$activity"
  fi
  sleep 3
done
if ((ready<3)); then
  echo "Framework services never became stable; cannot attribute failure to the APK" >&2
  exit 1
fi
# A successful boot property is insufficient. Only inject a key after input
# service readiness, and allow bounded post-boot transitions.
accepted=0
for attempt in $(seq 1 8); do
  if adb -s emulator-5554 shell input keyevent 82; then accepted=1;break;fi
  sleep 3
done
if ((accepted!=1)); then
  echo "Framework input service failed after readiness checks" >&2
  exit 1
fi
echo "Framework ready; beginning the actual unmodified APK install/lifecycle test"
export ANDROID_SERIAL=emulator-5554
bash android/ci/emulator-smoke.sh
