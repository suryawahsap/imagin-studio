/**
 * Repro test: re-vectorize (live re-trace / re-run job yang sama tanpa upload ulang).
 * BUG: preview & analyses dihapus saat job pertama selesai → re-queue tempId yang
 * sama langsung return tanpa proses → job stuck QUEUED selamanya.
 *
 * Run: npx tsx scripts/test-revectorize.ts
 */
import { TaskStore, JobQueue } from "../electron/services/job_queue";
import * as vec from "../electron/services/vec/vec-run";
import { PNG } from "pngjs";
import { initLibrary } from "../electron/services/library";
import { tempRoot } from "../electron/binaries/paths";
import fs from "fs";
import path from "path";

initLibrary(path.join(tempRoot, "test-revectorize-library.json"));

function makeTestImage(): string {
  const w = 96, h = 96;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (w * y + x) * 4;
    const cx = Math.abs(x - w / 2), cy = Math.abs(y - h / 2);
    if (Math.max(cx, cy) < 24) {
      png.data[i] = 0xe0; png.data[i + 1] = 0xc0; png.data[i + 2] = 0x88; png.data[i + 3] = 255;
    } else {
      png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255; png.data[i + 3] = 255;
    }
  }
  const p = path.join(tempRoot, "revec-input.png");
  fs.writeFileSync(p, PNG.sync.write(png));
  return p;
}

async function runJob(tempId: string, taskStore: TaskStore, q: JobQueue<{ tempId: string }>, label: string): Promise<string> {
  const start = Date.now();
  const timeout = 60000;
  while (vec.getVectorizeQueue().some(j => j.tempId === tempId && (j.status !== "completed" && j.status !== "failed"))) {
    await new Promise(r => setTimeout(r, 200));
    if (Date.now() - start > timeout) return "TIMEOUT";
  }
  const job = vec.getVectorizeQueue().find(j => j.tempId === tempId);
  const elapsed = Date.now() - start;
  return `${label}: status=${job?.status} elapsed=${(elapsed / 1000).toFixed(1)}s err=${job?.error || ""}`;
}

async function main() {
  const taskStore = new TaskStore();
  const q = new JobQueue<{ tempId: string }>((data, taskId) => vec.runVectorizeJob(data.tempId, taskId, taskStore, () => {}));

  const img = makeTestImage();
  const item = vec.analyzeVectorizeUpload(img, "revec.png");
  vec.storeVectorizePreview(item.tempId!, {
    originalName: item.originalName!, filePath: item.filePath!, width: item.width!, height: item.height!, mimeType: item.mimeType!,
  });

  // Run #1 — normal vectorize
  vec.enqueueVectorize([{ tempId: item.tempId! }], taskStore, () => {}, q);
  console.log("  " + await runJob(item.tempId!, taskStore, q, "RUN #1"));

  // Source harus MASIH ada setelah completed (fix)
  const srcExistsAfter = fs.existsSync(item.filePath!);
  console.log(`  source retain setelah completed = ${srcExistsAfter} ${srcExistsAfter ? "OK" : "FAIL"}`);

  // Run #2 — re-vectorize tempId yang sama (simulasi live re-trace/re-run
  // tanpa upload ulang). Sebelum fix: stuck QUEUED selamanya.
  vec.enqueueVectorize([{ tempId: item.tempId!, assetType: "flat-icon" }], taskStore, () => {}, q);
  console.log("  " + await runJob(item.tempId!, taskStore, q, "RUN #2 (re-vectorize)"));

  const job2 = vec.getVectorizeQueue().find(j => j.tempId === item.tempId!);
  const pass = srcExistsAfter && job2?.status === "completed";
  console.log(pass ? "\nPASS: re-vectorize selesai" : "\nFAIL: re-vectorize tidak selesai");

  // Bersihkan artifact test dari storage production — jangan tersapu scan.
  const out = job2?.outputSvgUrl;
  if (out) {
    try { fs.unlinkSync(path.join(process.cwd(), "storage", out.replace(/^\/storage\//, ""))); } catch {}
  }
  const ep = job2?.outputEpsUrl;
  if (ep) {
    try { fs.unlinkSync(path.join(process.cwd(), "storage", ep.replace(/^\/storage\//, ""))); } catch {}
  }
  try { fs.unlinkSync(item.filePath!); } catch {}
  try { fs.unlinkSync(img); } catch {}
  vec.clearVectorizeCompleted();

  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error("ERROR:", e); process.exit(1); });