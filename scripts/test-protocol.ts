import { app, protocol, net } from "electron";
import path from "path";
import fs from "fs";
import { URL, fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.whenReady().then(async () => {
  protocol.handle("imagin", (request) => {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (url.hostname && url.hostname !== "app") {
      pathname = `/${url.hostname}${pathname}`;
    }
    if (pathname.startsWith("/app")) pathname = pathname.slice("/app".length);
    const rel = pathname === "" ? "index.html" : pathname.replace(/^\/+/, "");
    if (rel.startsWith("storage/")) {
      const full = path.resolve(ROOT, decodeURIComponent(rel));
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return net.fetch(pathToFileURL(full).toString());
      }
      return new Response("Not found", { status: 404 });
    }
    const distRoot = path.join(ROOT, "dist");
    const requested = path.resolve(distRoot, rel);
    if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      return net.fetch(pathToFileURL(requested).toString());
    }
    return new Response("Not found", { status: 404 });
  });

  const tests = [
    ["imagin://app/index.html", 200],
    ["imagin://app/does-not-exist", 404],
  ] as const;
  for (const [t, expectedStatus] of tests) {
    const res = await net.fetch(t);
    const text = await res.text();
    console.log(`[test] ${t.slice(0, 50)} -> ${res.status} ${res.headers.get("content-type")} bytes=${text.length}`);
    if (res.status !== expectedStatus) throw new Error(`${t}: expected ${expectedStatus}, got ${res.status}`);
  }
  console.log("[test] protocol OK");
  app.exit(0);
});
