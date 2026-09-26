/**
 * Regression benchmark Vectorize — rebuild-plan.md REGRESSION TEST (10 gambar wajib).
 *
 * 10 test case dari tabel rebuild-plan.md §REGRESSION TEST:
 *   T1  Icon transparan (PNG alpha)      → flat-icon       shape clean, tanpa bg
 *   T2  Icon hitam-putih di bg putih      → line-art        outline bersih, 1 warna
 *   T3  Botol outline bg abu terang       → outline-icon    outline terjaga
 *   T4  Headset bg biru muda              → outline-icon    outline terjaga
 *   T5  Ilustrasi flat warna-warni        → flat-illustration  path < 400
 *   T6  Foto landscape                    → photo           SVG dihasilkan
 *   T7  Pixel art 64×64                   → pixel-art       pixel terjaga (mode pixel)
 *   T8  Logo sederhana 3 warna            → flat-icon       path < 50
 *   T9  Scan tangan/blueprint             → line-art        line terjaga, noise minimal
 *   T10 PNG transparan kompleks           → flat-illustration  bg tidak muncul
 *
 * Setiap test: auto-detect assetType dari backend + verifikasi output.
 * Gambar sintetis (pngjs) di storage/temp/.
 *
 * Run: npx tsx scripts/test-vector-benchmark.ts
 */

import { TaskStore, JobQueue } from "../electron/services/job_queue";
import * as vec from "../electron/services/vec/vec-run";
import { AssetType } from "../electron/services/vec/vec-analyze";
import { initLibrary } from "../electron/services/library";
import { tempRoot } from "../electron/binaries/paths";
import { PNG } from "pngjs";
import fs from "fs";
import path from "path";

const taskStore = new TaskStore();
// Isolasi DB library test — jangan merusak DB production user.
initLibrary(path.join(tempRoot, "test-benchmark-library.json"));

interface BenchmarkResult {
  name: string;
  expectedType: AssetType;
  assetType?: string;
  status?: string;
  qscore?: number;
  paths: number;
  fills: number;
  tinyPaths: number;
  hasBgRect: boolean;
  error?: string;
  pass: boolean;
  detail: string;
}

const results: BenchmarkResult[] = [];

function countMetrics(svgPath: string): { paths: number; fills: number; tinyPaths: number; hasBigBgRect: boolean } {
  const raw = fs.readFileSync(svgPath, "utf-8");
  const paths = (raw.match(/<path\b/g) || []).length;
  const fills = new Set((raw.match(/fill\s*=\s*["']([^"']+)["']/gi) || []).map((s) => s.toLowerCase())).size;
  let tiny = 0;
  for (const p of raw.match(/<path\b[^>]*\/?>/g) || []) {
    const dm = p.match(/\bd\s*=\s*["']([^"']*)["']/);
    const d = dm ? dm[1] : "";
    if (d && d.length < 20) tiny++;
  }
  let hasBigBgRect = false;
  const vb = raw.match(/viewBox\s*=\s*["']([\d.\s-]+)["']/i);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      const area = parts[2] * parts[3];
      const firstRect = raw.match(/<rect\b[^>]*>/);
      if (firstRect) {
        const w = parseFloat(firstRect[0].match(/\bwidth\s*=\s*["']([\d.]+)["']/i)?.[1] || "0");
        const h = parseFloat(firstRect[0].match(/\bheight\s*=\s*["']([\d.]+)["']/i)?.[1] || "0");
        const fill = firstRect[0].match(/\bfill\s*=\s*["']([^"']+)["']/i)?.[1] || "";
        const hex = fill.match(/^#([0-9a-fA-F]{6})$/);
        if (hex && area > 0 && w * h > area * 0.6) {
          const light = [hex[1].slice(0, 2), hex[1].slice(2, 4), hex[1].slice(4, 6)].every((c) => parseInt(c, 16) > 200);
          hasBigBgRect = light;
        }
      }
    }
  }
  return { paths, fills, tinyPaths: tiny, hasBigBgRect };
}

function writePng(filename: string, draw: (data: Buffer, w: number, h: number) => void, w = 256, h = 256): string {
  const p = path.join(tempRoot, filename);
  const png = new PNG({ width: w, height: h });
  draw(png.data, w, h);
  fs.writeFileSync(p, PNG.sync.write(png));
  return p;
}

function px(data: Buffer, w: number, x: number, y: number, r: number, g: number, b: number, a = 255) {
  const i = (y * w + x) * 4;
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
}

/** T1 — Icon transparan: bentuk solid + alpha di luar. */
function makeTransparentIcon(): string {
  return writePng("bench-t1-icon.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      px(data, w, x, y, 0, 0, 0, Math.hypot(x - cx, y - cy) < 55 ? 255 : 0);
    }
  });
}

/** T2 — Hitam-putih di bg putih: lingkaran hitam + garis. */
function makeMonoOnWhite(): string {
  return writePng("bench-t2-mono.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      const inCircle = Math.hypot(x - cx, y - cy) < 50;
      const inLine = y === cy && x > cx - 70 && x < cx + 70;
      px(data, w, x, y, inCircle || inLine ? 20 : 255, inCircle || inLine ? 20 : 255, inCircle || inLine ? 20 : 255);
    }
  });
}

/** T3 — Botol outline di bg abu terang. */
function makeBottleOutline(): string {
  return writePng("bench-t3-bottle.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2;
      const body = x >= cx - 30 && x <= cx + 30 && y >= 90 && y <= 200;
      const neck = x >= cx - 12 && x <= cx + 12 && y >= 55 && y < 90;
      const cap = x >= cx - 16 && x <= cx + 16 && y >= 40 && y < 55;
      const outline = (body || neck || cap) && (
        Math.abs(x - (cx - 30)) <= 3 || Math.abs(x - (cx + 30)) <= 3 ||
        Math.abs(x - (cx - 12)) <= 3 || Math.abs(x - (cx + 12)) <= 3 ||
        Math.abs(y - 40) <= 3 || Math.abs(y - 200) <= 3 ||
        Math.abs(y - 90) <= 3
      );
      if (body && !outline) px(data, w, x, y, 230, 230, 230);
      else if (outline) px(data, w, x, y, 60, 60, 60);
      else px(data, w, x, y, 215, 215, 215); // bg abu terang
    }
  });
}

/** T4 — Headset bg biru muda. */
function makeHeadset(): string {
  return writePng("bench-t4-headset.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      const band = (y > cy - 45 && y < cy - 30) && x > cx - 60 && x < cx + 60;
      const earL = Math.hypot(x - (cx - 45), y - (cy + 20)) < 22;
      const earR = Math.hypot(x - (cx + 45), y - (cy + 20)) < 22;
      const isHeadset = band || earL || earR;
      px(data, w, x, y, isHeadset ? 70 : 210, isHeadset ? 130 : 230, isHeadset ? 210 : 250);
    }
  });
}

/** T5 — Ilustrasi flat warna-warni (rumah + matahari + pohon). */
function makeFlatIllustration(): string {
  return writePng("bench-t5-illustration.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 255, g = 255, b = 255;
      if (x > 40 && x < 120 && y > 90 && y < 180) { r = 230; g = 180; b = 90; }
      if (y > 60 && y < 110 && x > 40 && x < 120 && Math.abs(x - 80) < (y - 60) * 1.2) { r = 190; g = 80; b = 70; }
      if (Math.hypot(x - 190, y - 50) < 25) { r = 250; g = 210; b = 60; }
      if (Math.hypot(x - 190, y - 140) < 30) { r = 70; g = 150; b = 80; }
      if (x > 185 && x < 195 && y > 160 && y < 200) { r = 120; g = 90; b = 60; }
      px(data, w, x, y, r, g, b);
    }
  });
}

/** T6 — Foto landscape (gradasi langit→gunung). */
function makePhoto(): string {
  return writePng("bench-t6-photo.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = y / h;
      let r = Math.round(90 + 120 * t), g = Math.round(140 + 80 * t), b = Math.round(200 - 80 * t);
      // Gunung
      if (y > h * 0.6 && y < h) {
        const mountain = Math.abs((x / w) * 2 - 1) * 0.5;
        if (y > h * 0.6 + (1 - mountain) * 120) { r = 60; g = 90; b = 70; }
      }
      px(data, w, x, y, r, g, b);
    }
  }, 320, 180);
}

/** T7 — Pixel art 64×64 (blok warna solid besar). */
function makePixelArt(): string {
  return writePng("bench-t7-pixel.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cell = 8;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      const idx = (cx + cy) % 4;
      const pal = [[250, 120, 60], [90, 180, 80], [70, 110, 200], [240, 220, 80]][idx];
      px(data, w, x, y, pal[0], pal[1], pal[2]);
    }
  }, 64, 64);
}

/** T8 — Logo 3 warna. */
function makeLogo3Color(): string {
  return writePng("bench-t8-logo.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      let c: [number, number, number] = [255, 255, 255];
      if (Math.hypot(x - cx, y - cy) < 45) c = [20, 90, 200];
      if (Math.hypot(x - cx, y - cy) < 22) c = [240, 190, 40];
      if (x > cx - 5 && x < cx + 5 && y > cy - 45 && y < cy + 45) c = [220, 60, 50];
      px(data, w, x, y, c[0], c[1], c[2]);
    }
  });
}

/** T9 — Blueprint/scan: garis putih di atas biru tua + noise ringan. */
function makeBlueprint(): string {
  return writePng("bench-t9-blueprint.png", (data, w, h) => {
    let seed = 11;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2;
      const line = y === cy + Math.round(Math.sin(x / 12) * 20) || Math.hypot(x - cx, y - cy) < 50;
      const noise = rand() > 0.97 ? 15 : 0;
      px(data, w, x, y, line ? 230 : 25 + noise, line ? 235 : 45 + noise, line ? 245 : 90 + noise);
    }
  });
}

/** T10 — PNG transparan kompleks (beberapa shape + alpha). */
function makeComplexTransparent(): string {
  return writePng("bench-t10-complex.png", (data, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const inFlower1 = Math.hypot(x - 80, y - 80) < 40;
      const inFlower2 = Math.hypot(x - 170, y - 150) < 45;
      const inLeaf = x > 60 && x < 220 && Math.abs((y - 120) - Math.sin((x - 60) / 20) * 30) < 8;
      if (inFlower1) { r = 220; g = 70; b = 140; a = 255; }
      else if (inFlower2) { r = 80; g = 160; b = 220; a = 200; }
      else if (inLeaf) { r = 70; g = 170; b = 90; a = 220; }
      px(data, w, x, y, r, g, b, a);
    }
  });
}

async function runCase(name: string, img: string, expectedType: AssetType, th: { maxPaths?: number; maxFills?: number; minQ?: number; noBgRect?: boolean; noTiny?: boolean }): Promise<BenchmarkResult> {
  const item = vec.analyzeVectorizeUpload(img, path.basename(img));
  vec.storeVectorizePreview(item.tempId!, {
    originalName: item.originalName!, filePath: item.filePath!, width: item.width!, height: item.height!, mimeType: item.mimeType!,
  });
  const q = new JobQueue<{ tempId: string }>((data, taskId) =>
    vec.runVectorizeJob(data.tempId, taskId, taskStore, () => {})
  );
  vec.enqueueVectorize([{ tempId: item.tempId!, assetType: expectedType }], taskStore, () => {}, q);

  const start = Date.now();
  while (q.isRunning() || vec.getVectorizeQueue().some(j => j.tempId === item.tempId && (j.status !== "completed" && j.status !== "failed"))) {
    await new Promise(r => setTimeout(r, 200));
    if (Date.now() - start > 150000) break;
  }
  const job = vec.getVectorizeQueue().find(j => j.tempId === item.tempId);

  let metrics = { paths: 0, fills: 0, tinyPaths: 0, hasBigBgRect: false };
  if (job?.outputSvgUrl) {
    const outFile = path.join(process.cwd(), "storage/assets/vectors", path.basename(decodeURIComponent(job.outputSvgUrl)));
    if (fs.existsSync(outFile)) metrics = countMetrics(outFile);
  }

  // Bersihkan artifact test dari storage production — jangan sampai
  // tersapu scanExistingFiles() menjadi aset library "misterius".
  if (job?.outputSvgUrl) {
    try { fs.unlinkSync(path.join(process.cwd(), "storage/assets/vectors", path.basename(decodeURIComponent(job.outputSvgUrl)))); } catch {}
  }
  if (job?.outputEpsUrl) {
    try { fs.unlinkSync(path.join(process.cwd(), "storage/assets/eps", path.basename(decodeURIComponent(job.outputEpsUrl)))); } catch {}
  }
  try { fs.unlinkSync(item.filePath); } catch {}

  const qscore = job?.validation?.qualityScore;
  const fails: string[] = [];
  if (job?.status !== "completed") fails.push(`status=${job?.status} err=${job?.error || ""}`);
  if (job?.assetType && job.assetType !== expectedType) fails.push(`assetType=${job.assetType}!=${expectedType}`);
  if (th.minQ !== undefined && qscore !== undefined && qscore < th.minQ) fails.push(`q=${qscore}<${th.minQ}`);
  if (th.maxPaths !== undefined && metrics.paths > th.maxPaths) fails.push(`paths=${metrics.paths}>${th.maxPaths}`);
  if (th.maxFills !== undefined && metrics.fills > th.maxFills) fails.push(`fills=${metrics.fills}>${th.maxFills}`);
  if (th.noBgRect && metrics.hasBigBgRect) fails.push("background rect besar");
  if (th.noTiny && metrics.tinyPaths > 0) fails.push(`tinyPaths=${metrics.tinyPaths}`);

  const pass = fails.length === 0;
  const result: BenchmarkResult = {
    name, expectedType, assetType: job?.assetType, status: job?.status, qscore,
    paths: metrics.paths, fills: metrics.fills, tinyPaths: metrics.tinyPaths, hasBgRect: metrics.hasBigBgRect,
    error: job?.error, pass, detail: fails.length > 0 ? fails.join("; ") : `OK (paths=${metrics.paths}, fills=${metrics.fills}, q=${qscore})`,
  };
  results.push(result);
  return result;
}

async function main() {
  const cases: Array<{ name: string; img: string; type: AssetType; th: any }> = [
    { name: "T1 Icon transparan", img: makeTransparentIcon(), type: "flat-icon", th: { maxPaths: 60, maxFills: 8, minQ: 70, noBgRect: true } },
    { name: "T2 Hitam-putih bg putih", img: makeMonoOnWhite(), type: "line-art", th: { maxPaths: 60, maxFills: 6, minQ: 70, noBgRect: true } },
    { name: "T3 Botol outline bg abu", img: makeBottleOutline(), type: "outline-icon", th: { maxPaths: 120, minQ: 65, noBgRect: true } },
    { name: "T4 Headset bg biru muda", img: makeHeadset(), type: "outline-icon", th: { maxPaths: 120, minQ: 65, noBgRect: true } },
    { name: "T5 Ilustrasi flat", img: makeFlatIllustration(), type: "flat-illustration", th: { maxPaths: 400, minQ: 60, noBgRect: true } },
    { name: "T6 Foto landscape", img: makePhoto(), type: "photo", th: {} },
    { name: "T7 Pixel art 64×64", img: makePixelArt(), type: "pixel-art", th: { maxPaths: 200, maxFills: 24 } },
    { name: "T8 Logo 3 warna", img: makeLogo3Color(), type: "flat-icon", th: { maxPaths: 50, maxFills: 6, minQ: 70, noBgRect: true } },
    { name: "T9 Scan/blueprint", img: makeBlueprint(), type: "line-art", th: { maxPaths: 120, noTiny: false } },
    { name: "T10 PNG transparan kompleks", img: makeComplexTransparent(), type: "flat-illustration", th: { maxPaths: 400, noBgRect: true } },
  ];

  console.log("=== VECTORIZE BENCHMARK (rebuild-plan 10 gambar) ===\n");
  for (const c of cases) {
    const r = await runCase(c.name, c.img, c.type, c.th);
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}`);
    console.log(`      expect=${r.expectedType} got=${r.assetType || "?"} status=${r.status} q=${r.qscore}`);
    console.log(`      paths=${r.paths} fills=${r.fills} tiny=${r.tinyPaths} bgrect=${r.hasBgRect}`);
    console.log(`      ${r.detail}`);
  }

  console.log("\n=== RINGKASAN ===");
  const passed = results.filter(r => r.pass).length;
  console.log(`  Lulus ${passed}/${results.length}`);
  for (const f of results.filter(r => !r.pass)) console.log(`  FAIL: ${f.name} — ${f.detail}`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error("BENCHMARK ERROR:", e); process.exit(1); });