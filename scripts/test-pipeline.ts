import { TaskStore, JobQueue } from "../electron/services/job_queue";
import * as vectorize from "../electron/services/vec/vec-run";
import * as upscale from "../electron/services/ups/ups-run";
import * as clipper from "../electron/services/clipper";
import { initLibrary, addLibraryAsset, getLibrary } from "../electron/services/library";
import { dirs, tempRoot } from "../electron/binaries/paths";
import fs from "fs";
import path from "path";

const taskStore = new TaskStore();
// Isolasi DB library test — jangan merusak DB production user.
initLibrary(path.join(tempRoot, "test-pipeline-library.json"));

// Validasi magic bytes + dimensi — pastikan beneran gambar, bukan file sampah/1x1
function isImageFile(p: string): boolean {
  try {
    const buf = fs.readFileSync(p);
    if (buf.length < 16) return false;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      return w >= 8 && h >= 8; // PNG — skip 1x1 test placeholder
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) return true; // JPEG
    return false;
  } catch {
    return false;
  }
}

function findTestImage(): string {
  const fixture = process.env.IMAGIN_TEST_IMAGE || process.argv[2];
  if (!fixture) {
    throw new Error("Missing required image fixture. Set IMAGIN_TEST_IMAGE=/path/to/image or pass the image path as the first argument.");
  }
  const resolved = path.resolve(fixture);
  if (!fs.existsSync(resolved)) throw new Error(`Required image fixture not found: ${resolved}`);
  if (!isImageFile(resolved)) throw new Error(`Required image fixture is not a supported image (PNG/JPEG): ${resolved}`);
  return resolved;
}

async function main() {
  const testImg = findTestImage();
  console.log(`=== OPTIONAL INTEGRATION PIPELINE (fixture: ${testImg}) ===`);

  console.log("=== INTEGRATION VECTORIZE ===");
  const vQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
    vectorize.runVectorizeJob(data.tempId, taskId, taskStore, (j) => {
      console.log(`  [vec] ${j.tempId} status=${j.status} svg=${j.outputSvgUrl} eps=${j.outputEpsUrl} err=${j.error || ""}`);
    })
  );
  const item = vectorize.analyzeVectorizeUpload(testImg, "test-vector.png");
  vectorize.storeVectorizePreview(item.tempId, {
    originalName: item.originalName!,
    filePath: item.filePath!,
    width: item.width!,
    height: item.height!,
    mimeType: item.mimeType!,
  });
  vectorize.enqueueVectorize([{ tempId: item.tempId!, assetType: "flat-illustration" }], taskStore, () => {}, vQueue);
  await waitFor(() => !vQueue.isRunning() && vectorize.getVectorizeQueue().some(j => j.status === "completed" || j.status === "failed"));

  console.log("=== INTEGRATION UPSCALE ===");
  const uQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
    upscale.runUpscaleJob(data.tempId, taskId, taskStore, (j) => {
      console.log(`  [ups] ${j.tempId} status=${j.status} out=${j.outputUrl} err=${j.error || ""}`);
    })
  );
  const uItem = upscale.analyzeUpscaleUpload(testImg, "test-upscale.png");
  upscale.storePreview(uItem.tempId, {
    originalName: uItem.originalName!,
    filePath: uItem.filePath!,
    width: uItem.width!,
    height: uItem.height!,
    mimeType: uItem.mimeType!,
  });
  upscale.enqueueUpscale([{ tempId: uItem.tempId, engine: "realesrgan", scale: "2x" }], taskStore, () => {}, uQueue);
  await waitFor(() => !uQueue.isRunning() && upscale.getUpscaleQueue().some(j => j.status === "completed" || j.status === "failed"));

  // Bersihkan output upscale dari storage production supaya tidak tersapu
  // scanExistingFiles() menjadi aset library.
  const uJob = upscale.getUpscaleQueue().find(j => j.tempId === uItem.tempId);
  if (uJob?.outputUrl) {
    try {
      const p = path.join(process.cwd(), "storage", uJob.outputUrl.replace(/^\/storage\//, ""));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }
  try { fs.unlinkSync(uItem.filePath); } catch {}

  console.log("=== OPTIONAL INTEGRATION CLIPPER (ffmpeg) ===");
  const videos = fs.readdirSync(dirs.downloads).filter(f => f.endsWith(".mp4"));
  if (videos.length > 0) {
    const url = `/storage/assets/downloads/${encodeURIComponent(videos[0])}`;
    const lib = getLibrary();
    let asset = lib.find(a => a.url === url);
    if (!asset) {
      asset = { id: "lib-test-video", type: "VIDEO", name: videos[0], url, folder: "downloads", sourceModule: "DOWNLOAD", mimeType: "video/mp4", fileSize: "1 MB", tags: [], createdAt: new Date().toISOString() };
      addLibraryAsset(asset);
    }
    const r = clipper.startClipProcessing(
      { assetId: asset.id, clipMode: "Manual", ratio: "9:16", segments: [{ label: "Test_Clip", start: 0, end: 2 }] },
      taskStore,
      () => console.log("  [clip] onDone fired")
    );
    console.log(`  [clip] start -> success=${r.success} jobId=${r.jobId} message=${r.message || r.detail || ""}`);
    await waitFor(() => taskStore.all().some(t => t.type === "CLIP_PROCESSING" && (t.status === "COMPLETED" || t.status === "FAILED")), 30000);
    const clipTask = taskStore.all().find(t => t.type === "CLIP_PROCESSING");
    console.log(`  [clip] final status=${clipTask?.status} error=${clipTask?.error || ""}`);
  } else {
    console.log("  [clip] no downloaded video present; optional integration skipped");
  }

  console.log("=== TASKS ===");
  for (const t of taskStore.all()) {
    console.log(`  ${t.id} ${t.type} ${t.status} ${t.error || ""}`);
  }
  console.log("OPTIONAL INTEGRATION PIPELINE OK");
}

function waitFor(pred: () => boolean, timeout = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("timeout"));
      setTimeout(tick, 200);
    };
    tick();
  });
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
