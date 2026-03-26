#!/usr/bin/env python3
"""Run a local web server for this project."""

import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("DRAW_FLOW_PORT", "8000"))


class NoCacheRequestHandler(SimpleHTTPRequestHandler):
    """Simple file handler that disables browser caching for local dev."""

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        clean_path = parsed.path

        # Keep a canonical, extensionless URL style.
        if clean_path.endswith(".html"):
            target = "/" if clean_path == "/index.html" else clean_path[:-5]
            if parsed.query:
                target = f"{target}?{parsed.query}"
            self.send_response(301)
            self.send_header("Location", target)
            self.end_headers()
            return

        # Map extensionless requests to existing .html files.
        if clean_path not in ("", "/") and not Path(clean_path).suffix:
            candidate = (Path(self.directory or os.getcwd()) / clean_path.lstrip("/")).with_suffix(".html")
            if candidate.exists() and candidate.is_file():
                query_parts = parse_qs(parsed.query, keep_blank_values=True)
                query_parts["_ext"] = ["html"]
                encoded_query = urlencode(query_parts, doseq=True)
                self.path = f"{clean_path}.html?{encoded_query}"

        super().do_GET()

    def send_head(self):
        parsed = urlparse(self.path)
        query_parts = parse_qs(parsed.query, keep_blank_values=True)
        if query_parts.get("_ext") == ["html"]:
            query_parts.pop("_ext", None)
            clean_query = urlencode(query_parts, doseq=True)
            self.path = parsed.path + (f"?{clean_query}" if clean_query else "")
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    project_root = Path(__file__).resolve().parent.parent
    handler = partial(NoCacheRequestHandler, directory=str(project_root))

    # Serve files from the project root so index.html and folders work together.
    with ThreadingHTTPServer((HOST, PORT), handler) as server:
        print(f"Serving {project_root} at http://{HOST}:{PORT}")
        print("Press Ctrl+C to stop the server.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
