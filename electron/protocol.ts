import { protocol, net, session } from "electron";
import path from "path";
import fs from "fs";
import { URL, pathToFileURL } from "url";

/**
 * Custom protocol `imagin://` untuk production:
 * - `imagin://app/` → static files dari folder `dist/` (frontend build)
 * - `imagin://storage/...` → file aset dari folder `storage/`
 *
 * Path traversal dicegah: setiap request di-resolve dan divalidasi masih
 * berada di dalam root masing-masing.
 */

const APP_ROOT = path.join(__dirname, "..");

const CORS_HEADERS = {
  // Renderer fetch()`: renderer origin bisa `http://127.0.0.1:5173` (dev) atau
  // `imagin://app` (prod) — keduanya cross-origin ke `imagin://storage/...`,
  // jadi wajib `Access-Control-Allow-Origin` supaya `fetch` → blob URL bekerja.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
};

function secureResolve(root: string, relPath: string): string | null {
  const decoded = decodeURIComponent(relPath);
  const full = path.resolve(root, decoded);
  const rootResolved = path.resolve(root);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) {
    return null;
  }
  return full;
}

/**
 * Serve file frontend dari `dist/` dengan cache policy eksplisit.
 *
 * `index.html` adalah penunjuk ke asset ber-hash (`assets/index-<hash>.js`).
 * Kalau Chromium menyajikan index.html lama dari cache, renderer memuat bundle
 * lama — perubahan UI tidak pernah terlihat walau `dist/` sudah di-rebuild.
 * Karena itu HTML selalu `no-store`; asset ber-hash aman di-cache selamanya.
 */
async function serveFrontendFile(filePath: string): Promise<Response> {
  const res = await net.fetch(pathToFileURL(filePath).toString());
  const body = await res.arrayBuffer();
  const headers = new Headers(res.headers);
  headers.set(
    "Cache-Control",
    filePath.endsWith(".html") ? "no-store, must-revalidate" : "public, max-age=31536000, immutable"
  );
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

export function registerProtocol(): void {
  protocol.handle("imagin", (request) => {
    try {
      const url = new URL(request.url);
      // Non-special scheme: `imagin://storage/assets/...` → hostname="storage", pathname="/assets/..."
      // `imagin://app/...` atau relative `/storage/...` dari renderer → hostname="app"
      let pathname = url.pathname;
      if (url.hostname && url.hostname !== "app") {
        pathname = `/${url.hostname}${pathname}`;
      }
      if (pathname.startsWith("/app")) {
        pathname = pathname.slice("/app".length);
      }
      const rel = pathname === "" ? "index.html" : pathname.replace(/^\/+/, "");

      // Storage assets selalu diprioritaskan (dari URL `imagin://storage/...`
      // maupun relative `/storage/...` yang resolve jadi `imagin://app/storage/...`)
      if (rel.startsWith("storage/")) {
        const filePath = secureResolve(APP_ROOT, rel);
        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return new Response("Not found", { status: 404 });
        }
        // Baca file + set content-type benar. Dukung HTTP Range untuk video
        // (seek/metadata <video> butuh range request).
        const stat = fs.statSync(filePath);
        const lower = rel.toLowerCase();
        let contentType = "application/octet-stream";
        if (lower.endsWith(".svg")) contentType = "image/svg+xml; charset=utf-8";
        else if (lower.endsWith(".png")) contentType = "image/png";
        else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (lower.endsWith(".webp")) contentType = "image/webp";
        else if (lower.endsWith(".gif")) contentType = "image/gif";
        else if (lower.endsWith(".mp4")) contentType = "video/mp4";
        else if (lower.endsWith(".webm")) contentType = "video/webm";
        else if (lower.endsWith(".mp3")) contentType = "audio/mpeg";
        else if (lower.endsWith(".wav")) contentType = "audio/wav";
        else if (lower.endsWith(".json")) contentType = "application/json";

        // HTTP Range — diperlukan <video>/<audio> untuk seek & metadata
        const range = request.headers.get("range");
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range);
          const start = m && m[1] ? parseInt(m[1], 10) : 0;
          const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
          const chunkSize = end - start + 1;
          if (start < stat.size && end >= start) {
            const fd = fs.openSync(filePath, "r");
            const buf = Buffer.alloc(chunkSize);
            fs.readSync(fd, buf, 0, chunkSize, start);
            fs.closeSync(fd);
            return new Response(buf, {
              status: 206,
              headers: {
                ...CORS_HEADERS,
                "Content-Type": contentType,
                "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": String(chunkSize),
              },
            });
          }
          return new Response(null, { status: 416 });
        }

        const body = fs.readFileSync(filePath);
        return new Response(body, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Content-Length": String(stat.size),
          },
        });
      }

      // Fallback: static frontend from dist/
      const distRoot = path.join(APP_ROOT, "dist");
      const requested = secureResolve(distRoot, rel) || path.join(distRoot, "index.html");
      if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
        return serveFrontendFile(requested);
      }
      // SPA fallback
      const indexHtml = path.join(distRoot, "index.html");
      if (fs.existsSync(indexHtml)) {
        return serveFrontendFile(indexHtml);
      }
      return new Response("Not found", { status: 404 });
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });
}

export function registerSchemesAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "imagin",
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
    },
  ]);
}

export function resetSessionProtocol(): void {
  try {
    session.defaultSession.protocol.unhandle("imagin");
  } catch {
    // belum pernah di-handle — tidak masalah
  }
}
