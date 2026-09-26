/**
 * Ambil screenshot aplikasi untuk satu halaman + tema, lalu bandingkan dengan
 * screenshot mockup design reference.
 *
 * Pakai:
 *   node scripts/visual-capture.mjs <page> [dark|light]
 *   page: studio | gallery | metadata | remotion | upscale | vectorize
 *
 * Hasil ada di .visual/ : <page>-<theme>.app.png dan <page>-<theme>.compare.png
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOCKUP_ROOT = path.join(ROOT, "Imagin Studio", "stitch_electron_desktop_app_design");
const OUT_DIR = path.join(ROOT, ".visual");
const PORT = 9401;
const WINDOW = "1440x900";

const PAGES = {
  studio: { dir: "imagin_studio_desktop_electron_app", nav: "Studio" },
  gallery: { dir: "imagin_studio_gallery_module", nav: "Gallery" },
  metadata: { dir: "imagin_studio_metadata_workspace", nav: "Metadata" },
  remotion: { dir: "imagin_studio_remotion_module", nav: "Remotion" },
  upscale: { dir: "imagin_studio_upscale_module", nav: "Upscale" },
  vectorize: { dir: "imagin_studio_vectorize_module", nav: "Vectorize" },
};

const page = process.argv[2];
const theme = process.argv[3] === "light" ? "light" : "dark";

if (!page || !PAGES[page]) {
  console.log(`pakai: node scripts/visual-capture.mjs <${Object.keys(PAGES).join("|")}> [dark|light]`);
  process.exit(1);
}

const mockupDir = PAGES[page].dir + (theme === "light" ? "_light" : "");
const mockupPng = path.join(MOCKUP_ROOT, mockupDir, "screen.png");
if (!fs.existsSync(mockupPng)) {
  console.log(`mockup tidak ada: ${mockupPng}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cdp(wsUrl, calls) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const results = {};
    let i = 0;
    const timer = setTimeout(() => reject(new Error("cdp timeout")), 40000);
    const send = () => {
      if (i >= calls.length) {
        clearTimeout(timer);
        ws.close();
        return resolve(results);
      }
      const [name, params] = calls[i];
      ws.send(JSON.stringify({ id: i + 1, method: name, params: params || {} }));
    };
    ws.onopen = send;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (!msg.id) return;
      results[msg.id] = msg.result;
      i = msg.id;
      setTimeout(send, 900);
    };
    ws.onerror = () => reject(new Error("cdp error"));
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const appPath = path.join(OUT_DIR, `${page}-${theme}.app.png`);
const comparePath = path.join(OUT_DIR, `${page}-${theme}.compare.png`);

const child = spawn("npx", ["electron", ".", `--remote-debugging-port=${PORT}`, "--headless", "--disable-gpu", "--no-sandbox", `--window-size=${WINDOW}`], {
  cwd: ROOT,
  env: { ...process.env, IMAGIN_PROD: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let appLog = "";
child.stdout.on("data", (d) => (appLog += d));
child.stderr.on("data", (d) => (appLog += d));

const kill = () => {
  try { child.kill("SIGKILL"); } catch {}
};

(async () => {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find((t) => t.type === "page" && t.url.startsWith("imagin://"));
    } catch {}
  }
  if (!target) {
    console.log("renderer tidak ditemukan\n" + appLog.split("\n").filter((l) => l.includes("[electron]")).join("\n"));
    kill();
    process.exit(1);
  }

  await sleep(7000);
  const res = await cdp(target.webSocketDebuggerUrl, [
    ["Runtime.evaluate", { expression: `document.documentElement.setAttribute('data-theme','${theme}'); 'ok'`, returnByValue: true }],
    ["Runtime.evaluate", {
      expression: `(() => { const b = [...document.querySelectorAll('nav button')].find(x => (x.innerText||'').trim() === ${JSON.stringify(PAGES[page].nav)}); if (!b) return 'nav-tidak-ada'; b.click(); return 'ok'; })()`,
      returnByValue: true,
    }],
    ["Page.captureScreenshot", { format: "png" }],
  ]);

  const shot = Object.values(res).find((r) => r && r.data)?.data;
  if (!shot) {
    console.log("screenshot gagal");
    kill();
    process.exit(1);
  }
  fs.writeFileSync(appPath, Buffer.from(shot, "base64"));
  console.log(`app shot  : ${appPath}`);
  kill();

  // Render mockup di viewport yang sama supaya perbandingan setara; fallback ke screen.png
  const mockupHtml = path.join(MOCKUP_ROOT, mockupDir, "code.html");
  const mockupRenderPath = path.join(OUT_DIR, `${page}-${theme}.mock.png`);
  let mockupForDiff = mockupPng;
  if (fs.existsSync(mockupHtml)) {
    const render = spawn("npx", ["electron", "scripts/visual-mockup.cjs", mockupHtml, mockupRenderPath, "1440", "900"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let renderOut = "";
    render.stdout.on("data", (d) => (renderOut += d));
    render.stderr.on("data", (d) => (renderOut += d));
    const code = await new Promise((r) => render.on("exit", r));
    if (code === 0 && fs.existsSync(mockupRenderPath)) {
      mockupForDiff = mockupRenderPath;
      console.log(`mockup shot: ${mockupRenderPath}`);
    } else {
      console.log(`render mockup gagal, pakai screen.png (${renderOut.split("\n")[0] || "tanpa pesan"})`);
    }
  }

  const diff = spawn("npx", ["electron", "scripts/visual-diff.cjs", appPath, mockupForDiff, comparePath], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diffOut = "";
  diff.stdout.on("data", (d) => (diffOut += d));
  diff.stderr.on("data", (d) => (diffOut += d));
  await new Promise((r) => diff.on("exit", r));
  console.log(diffOut.trim() || "(tidak ada output diff)");
  process.exit(0);
})().catch((err) => {
  console.log("ERROR:", err.message);
  kill();
  process.exit(1);
});
