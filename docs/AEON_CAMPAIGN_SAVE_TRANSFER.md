# Aeon Circuit: The Silent Wake — portable campaign saves

The Android development APK uses app-local WebView storage. Debug APKs signed
by different builders may not install over one another; uninstalling an APK
can erase that app's local records. A successful CI emulator test cannot
prevent this on the physical Moto G. **Do not uninstall a build containing a
save you want to keep until you have copied and checked its backup.**

## Manual workflow

On an owner-installed campaign test build, return to the game's title
screen using **SAVE & EXIT TO TITLE**. Select **SAVE BACKUP / RESTORE**, then
**BACK UP SLEEPER A/B/C/D** for each character you want to preserve.

A formatted text backup is displayed and selected. If browser clipboard
access is permitted, it also copies automatically; otherwise use the
device's text selection **Copy** command. Save the text privately in a
file/note not stored solely inside the app being uninstalled. The text
contains **campaign progression and game state**; do not post it in public
chats, issues or GitHub. It does *not* contain the copyrighted art or
campaign screenplay package.

To restore on a new authorized build with the **same approved source/story
revision and private layout digest**, open the same title menu, paste the
complete backup into the box, and press **RESTORE PASTED RECORD**. A valid
record is independently checked with the same corruption-checked journal
loader used by Continue. The title's Continue action then resumes the
restored area—or an interrupted battle.

When a valid save already exists for the same Sleeper, the existing
Ghost Signal-style **KEEP RECORD / REPLACE RECORD** confirmation is required.
KEEP changes nothing. Unreadable/corrupted existing slots are **not
overwritten** merely because they cannot load; preserve them for recovery.

## Technical boundary

- The transfer format is `aeon-silent-wake-campaign-save` version 1,
  carrying the current starter identity, narrative revision, map-layout
  digest, complete journal and an accidental-corruption checksum.
- Imports validate in an **isolated in-memory dual-slot journal** before
  writing any persistent data. Validation includes starter identity,
  map references, saved coordinates, narrative state, battle resume data
  and revision compatibility. New/old starters cannot collide.
- The checksum is not a cryptographic signature; never import
  untrusted third-party saves. No network endpoint or automatic cloud
  synchronization is involved. Clipboard access is user-initiated.
- The existing dual-slot save store commits one record at a time. A
  storage-quota failure or rejected import does not intentionally erase
  the previous validated save.
- This is a **text backup fallback**, not an Android Storage Access
  Framework file exporter or a stable APK signing replacement.

Public browser and Node CI validate the import/export and accidental
corruption path on synthetic content. The owner's physical Moto G test
must still check copy/paste, keyboard usability, background/resume,
large save records, Android signing and actual reinstall behavior.
