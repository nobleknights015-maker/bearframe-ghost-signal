BEARFRAME CHARACTER GENERATOR — SHAREABLE EDITION
Snapshot: 17 November 2026
Source branch: ghost-signal-engine (Bearerframe Labs project)
Original repository: https://github.com/nobleknights015-maker/bearframe-ghost-signal

WHAT IS INCLUDED
- frontend/public/studio/ : the real Bearframe Sprite Studio with the upgraded
  humanoid and machine generators, reference-to-sprite workflow, four-direction
  exploration and battle sprite sets, editing, sample projects, image references,
  PNG/metadata exports, and editable .bfsprite projects.
- frontend/character-tools/ : optional programmatic character generator API,
  CLI, sample request, and tests for advanced users / engine integration.

EASIEST WAY TO OPEN ON A WINDOWS COMPUTER
1. Unzip this whole archive to a folder.
2. If Python 3 is installed, double-click START_CHARACTER_GENERATOR_WINDOWS.bat.
3. Your browser will open the studio at a local address.
4. Keep the small server window open while you work.
5. When finished, use "Save project" inside the Studio, then close the server window.

If Python is not installed:
- Install Python 3 from https://www.python.org/downloads/
- Or use an existing Node.js installation: in a terminal from this folder run
  "node launch_studio_node.cjs" (Node.js 18+).
- The studio itself does not need internet access, accounts, or API keys.

MAC / LINUX
Run "python3 launch_studio.py" from the unzipped folder.
Alternatively run "node launch_studio_node.cjs" if Node.js is installed.

IMPORTANT
Do NOT double-click frontend/public/studio/index.html directly; the browser
blocks local ES module imports from file://. Launch one of the local servers.
The server listens on 127.0.0.1 only and does not publish your files online.
No game engine or Android APK is required.

Studio help: frontend/public/studio/README.md
Optional command-line tools (advanced): cd frontend/character-tools
  npm install
  npm run generate:test
  npm run verify:test
This optional API requires Node.js and installs @napi-rs/canvas.

This is a source snapshot. Existing sprites and projects will not be overwritten.
