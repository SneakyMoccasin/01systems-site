#!/usr/bin/env python3
"""Local, read-only transport demo. Python standard library only."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from data import load_payload

WEB = Path(__file__).resolve().parent / "dist"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/results":
            try:
                content = json.dumps(load_payload(), ensure_ascii=False).encode("utf-8")
                self.respond(200, "application/json; charset=utf-8", content)
            except (ValueError, KeyError, OSError) as error:
                self.respond(503, "application/json; charset=utf-8",
                             json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8"))
            return
        assets = {"/": ("index.html", "text/html; charset=utf-8"),
                  "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                  "/styles.css": ("styles.css", "text/css; charset=utf-8")}
        if path not in assets:
            self.respond(404, "text/plain; charset=utf-8", b"Not found")
            return
        name, mime = assets[path]
        self.respond(200, mime, (WEB / name).read_bytes())

    def respond(self, status, mime, content):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'")
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Transportdemo: http://127.0.0.1:{args.port}/", flush=True)
    print("Endast lokalt. Sparade resultat läses; inga simuleringar körs. Avsluta med Ctrl+C.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
