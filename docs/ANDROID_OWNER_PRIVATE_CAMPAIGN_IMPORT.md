# Android debug: install owner-private Aeon content without publishing it

The PUBLIC Ghost Signal debug APK intentionally contains **no** owner-only
Director's Cut dialogue, proprietary 42-character art, portraits or source
map geometry. On an updated development build, the existing Ghost Signal
**ENGINE TEST BAY** includes **IMPORT OWNER-PRIVATE AEON ZIP (ANDROID DEBUG)**.

## Owner-only installation

1. Keep a downloaded copy of the private recovery package somewhere you
   control, outside the Android app. One verified Library package is
   `/Bearframe/EngineDevelopment/Aeon_Circuit_Private_Integrated_Recovery_QA_2026-11-16.zip`.
   Do not upload it to the public repository, a public GitHub issue, or
   public CI artifacts.
2. Install the new Android **debug** APK from a successful build containing
   this importer. On first launch, open the Ghost Signal Engine Test Bay.
3. Tap **IMPORT OWNER-PRIVATE AEON ZIP**. Android's system document picker
   opens. Select the trusted private ZIP (works with packages that store
   the content under `frontend/public/assets/aeon/`).
4. The native host reads and validates the archive *locally*. It accepts
   only `asset-manifest.json`, the two approved story-layout JSONs,
   42 world PNGs, 42 battle PNGs and four Sleeper portraits. The importer also verifies each of the 84 sprite PNG SHA-256 hashes against its approved manifest entry, rejects reused placeholder image paths, and checks the recovered source story digest when provided. It ignores
   all other source code, scripts, executable, HTML, and files in the ZIP.
   No arbitrary JavaScript from the archive is installed or executed.
5. Once validation succeeds, the test bay reloads and the Aeon unified
   engine and campaign review links appear. The installed data remains
   in a dedicated private Android data directory through compatible
   same-signature APK upgrades. Uninstalling the APK **can** delete it,
   so retain the source ZIP.

The original Ghost Signal missions, saves, UI, Sprite Studio and public
gameplay modes are not replaced. The production/release APK still launches
the original Ghost Signal unless explicitly changed in a later reviewed
release. Private content is loaded only through the debug build's
app-local `https://appassets.androidplatform.net/assets/aeon/` path.

## Archive and security checks

The installer verifies safe ZIP paths, per-file and total decompressed-size
limits, duplicate asset names, an exact 42-entry v5 catalog, four required
starter identities, 9×4 world and 6×9 battle sheet geometry (with native
sizes for different character classes), action frame timing, all referenced
PNG dimensions, required portraits, the story/layout revision, and the
staged starting map. It uses an atomic staging-directory replacement:
a failed import leaves the previously installed package available. Only
a user-triggered Android document picker can initiate it.

This does not cryptographically authenticate the archive. Import only
the owner-authorized package; never import ZIPs received from strangers.
The original Director's Cut source, third-party licenses and full art
ownership remain the owner's responsibility.

## What success does and does not mean

The recovered private package has 42 character records, four portraits,
29 source-defined locations, and five connected opening REVIEW blockouts.
The corrected private preflight passes `--review`, not `--release`.
Actual full campaign completion still needs 24 more verified area maps,
source-staged later narrative, choice binding, approved encounter stats/art,
balancing and in-game playthrough testing. Do not infer missing scene
identities or replace art with placeholders.

CI verifies the Android APK assembles and the test launcher exists; native
file picker + ZIP extraction + private gameplay still require explicit
physical Moto G (2025) testing. Save records should be backed up with
the campaign's **SAVE BACKUP / RESTORE** menu before reinstalling a
differently signed debug APK.
