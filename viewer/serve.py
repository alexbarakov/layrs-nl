"""Static server with HTTP Range support (PMTiles needs byte ranges)."""
import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class H(SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r"bytes=(\d+)-(\d*)", rng)
        size = os.path.getsize(path)
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else size - 1
        b = min(b, size - 1)
        f = open(path, "rb"); f.seek(a)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {a}-{b}/{size}")
        self.send_header("Content-Length", str(b - a + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._left = b - a + 1
        return f

    def copyfile(self, src, dst):
        left = getattr(self, "_left", None)
        if left is None:
            return super().copyfile(src, dst)
        while left > 0:
            chunk = src.read(min(65536, left))
            if not chunk:
                break
            dst.write(chunk); left -= len(chunk)


if __name__ == "__main__":
    port, root = int(sys.argv[1]), sys.argv[2]
    host = "0.0.0.0" if "lan" in sys.argv[3:] else "127.0.0.1"
    cert = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".cert")
    os.chdir(root)
    srv = ThreadingHTTPServer((host, port), H)
    if "https" in sys.argv[3:]:
        # geolocation on a phone needs a secure context; self-signed cert from .cert/ (see README)
        import ssl
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(os.path.join(cert, "cert.pem"), os.path.join(cert, "key.pem"))
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
    srv.serve_forever()
