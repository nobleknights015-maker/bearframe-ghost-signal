#!/usr/bin/env python3
"""Start the standalone Bearframe Sprite Studio on this computer."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading
import webbrowser

root = Path(__file__).resolve().parent / "frontend" / "public"
if not (root / "studio" / "index.html").exists():
    raise SystemExit("Studio files missing. Unzip the whole package first.")
os.chdir(root)

class Handler(SimpleHTTPRequestHandler):
    pass

with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
    url = f"http://127.0.0.1:{server.server_port}/studio/"
    print(f"Bearframe Character Generator is ready: {url}")
    print("Keep this window open while editing; Ctrl+C closes the server.")
    threading.Timer(0.7, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
