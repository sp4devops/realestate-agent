#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import http.server
import socket
import socketserver
import threading
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


def serve(smoke: bool = False) -> int:
    if not (WEB_ROOT / "index.html").is_file():
        raise SystemExit("Property Assistant desktop package is incomplete: web/index.html is missing")
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(WEB_ROOT), **kwargs)
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
        port = server.server_address[1]
        url = f"http://127.0.0.1:{port}/#/splash"
        if smoke:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=5) as response:
                    body = response.read().decode("utf-8")
                    if response.status != 200 or "Property Assistant" not in body:
                        raise SystemExit("Desktop RC smoke check failed")
                print("Desktop RC smoke check: PASS")
                return 0
            finally:
                server.shutdown()
                thread.join(timeout=2)
        print(f"Property Assistant desktop RC running at {url}")
        webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Property Assistant local desktop launcher")
    parser.add_argument("--smoke", action="store_true", help="start locally, verify index.html, then exit")
    args = parser.parse_args()
    return serve(args.smoke)

if __name__ == "__main__":
    raise SystemExit(main())
