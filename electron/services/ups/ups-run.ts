/**
 * ups-run.ts — Orchestrator Upscaler (rebuild-plan.md F2.2).
 *
 * Perubahan kunci dari Clarity Upscaler:
 *   - Multi-step upscaling (calcSteps): 2x→[2], 4x→[4], 3x→[3], 5x→[2,3]
 *   - Output format picker (PNG/JPEG/WebP)
 *   - White background flatten
 *   - Content-based model selection (real-esrgan-x4plus vs -anime)
 *   - 4K/6K/8K target-resolution modes
 *
 * Yang dibuang: pilUpscale (nearest-neighbor), deteksi dimensi duplikat,
 * non-integer step support (langsung exact resize via ffmpeg).
 */

import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { UpscaleJobItem } from "../../types";
import { runRealesrgan } from "../../binaries/realesrgan";
import { runWaifu2x, getWaifu2xBin } from "../../binaries/waifu2x";
import { dirs, importsRoot, tempRoot } from "../../binaries/paths";
import { JobQueue, TaskStore, makeTask } from "../job_queue";
import { addLibraryAsset, getLibrary, persistLibrary } from "../library";
import { flattenAlphaToWhite, convertFormat, resizeLongEdge } from "./ups-format";
import { categorizeImage } from "./ups-analyze";

interface StoredPreview {
  originalName: string;
  filePath: string;
  width: number;
  height: number;
  mimeType: string;
}

const previews = new Map<string, StoredPreview>();
const jobs = new Map<string, UpscaleJobItem>();
const abortSignals = new Map<string, { aborted: boolean }>();

function imageDimensionsFromBuffer(buf: Buffer): { width: number; height: number } {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      }
      const segLen = buf.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }
  return { width: 0, height: 0 };
}

export function analyzeUpscaleUpload(filePath: string, originalName: string): UpscaleJobItem {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(originalName).toLowerCase() || ".png";
  const dims = imageDimensionsFromBuffer(buf);
  const tempId = `ups-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tmpPath = path.join(importsRoot, `${tempId}${ext}`);
  fs.copyFileSync(filePath, tmpPath);
  return {
    tempId,
    originalName,
    filePath: tmpPath,
    mimeType: "image/png",
    fileSize: buf.length,
    width: dims.width,
    height: dims.height,
    status: "imported",
  };
}

export function storePreview(tempId: string, preview: StoredPreview): void {
  previews.set(tempId, preview);
}

export function getUpscalePreview(tempId: string): StoredPreview | undefined {
  return previews.get(tempId);
}

export function getUpscaleQueue(): UpscaleJobItem[] {
  return Array.from(jobs.values());
}

export function getStoredPreviews(): Array<{ tempId: string } & StoredPreview> {
  const result: Array<{ tempId: string } & StoredPreview> = [];
  for (const [tempId, preview] of previews) {
    if (!jobs.has(tempId)) {
      result.push({ tempId, ...preview });
    }
  }
  return result;
}

export function getWaifu2xAvailable(): boolean {
  return !!getWaifu2xBin();
}

/** Resolve /storage/assets/upscaled/xxx.png → path lokal (untuk orchestration). */
export function resolveOutputPath(outputUrl: string): string | null {
  try {
    const p = path.join(dirs.upscaled, decodeURIComponent(outputUrl.split("/").pop() || ""));
    return fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

export function clearUpscaleCompleted(): UpscaleJobItem[] {
  const removed: UpscaleJobItem[] = [];
  for (const [id, job] of jobs) {
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      removed.push(job);
      jobs.delete(id);
      abortSignals.delete(id);
    }
  }
  return removed;
}

export function cancelUpscaleJob(
  tempId: string,
  taskStore: TaskStore,
  queue: JobQueue<{ tempId: string }>
): boolean {
  const job = jobs.get(tempId);
  if (!job) return false;
  const removedFromQueue = queue.cancelQueued(tempId);
  const signal = abortSignals.get(tempId);
  if (signal) signal.aborted = true;
  if (job.status === "queued" && removedFromQueue) {
    job.status = "cancelled";
    job.error = "cancelled";
    const task = taskStore.all().find((t) => t.tempId === tempId);
    if (task) taskStore.update(task.id, { status: "CANCELLED", error: "cancelled", completedAt: new Date().toISOString() });
  }
  return true;
}

export interface UpscaleQueueItem {
  tempId: string;
  engine?: "auto" | "realesrgan" | "waifu2x";
  scale?: string;
  customScale?: number;
  tileSize?: number;
  whiteBackground?: boolean;
  outputFormat?: "png" | "jpeg" | "webp";
}

export function enqueueUpscale(
  items: UpscaleQueueItem[],
  taskStore: TaskStore,
  onUpdate: (job: UpscaleJobItem) => void,
  queue: JobQueue<{ tempId: string }>
): { jobs: UpscaleJobItem[]; jobId: string } {
  const jobId = `upscale-batch-${Date.now()}`;
  const work: Array<{ tempId: string; taskId: string }> = [];

  for (const item of items) {
    const preview = previews.get(item.tempId);
    const job: UpscaleJobItem = {
      tempId: item.tempId,
      engine: item.engine || "auto",
      scale: item.scale || "2x",
      customScale: item.customScale,
      tileSize: item.tileSize,
      whiteBackground: item.whiteBackground ?? false,
      outputFormat: item.outputFormat ?? "png",
      status: "queued",
    };
    jobs.set(item.tempId, job);

    const task = makeTask(taskStore, "IMAGE_UPSCALE", `Upscale: ${preview?.originalName || item.tempId} (${job.scale})`, "UPSCALE" as never);
    task.tempId = item.tempId;
    work.push({ tempId: item.tempId, taskId: task.id });
  }

  queue.enqueueMany(
    work.map(({ tempId, taskId }) => ({ id: tempId, taskId, data: { tempId } }))
  );

  return { jobs: work.map((w) => jobs.get(w.tempId)!), jobId };
}

/** Multi-step planner: find minimal product ≥ targetScale from factors {2,3,4} (max 4 passes). */
export interface UpscalePlan { steps: number[]; finalRatio: number; }
export function calcSteps(targetScale: number): UpscalePlan {
  const factors = [2, 3, 4];
  const candidates: { steps: number[]; product: number }[] = [];

  function backtrack(current: number[], product: number, depth: number): void {
    if (depth > 4) return;
    if (product >= targetScale) {
      candidates.push({ steps: [...current], product });
      return;
    }
    for (const f of factors) {
      current.push(f);
      backtrack(current, product * f, depth + 1);
      current.pop();
    }
  }

  backtrack([], 1, 0);
  let best: { steps: number[]; product: number } | undefined;
  for (const c of candidates) {
    if (!best || c.product < best.product || (c.product === best.product && c.steps.length < best.steps.length)) {
      best = c;
    }
  }
  if (!best) {
    // Fallback: single step at clamped scale (shouldn't occur for range 2-8)
    const s = Math.min(4, Math.max(2, Math.round(targetScale)));
    return { steps: [s], finalRatio: targetScale / s };
  }
  return { steps: best.steps, finalRatio: targetScale / best.product };
}

/** Content-based model selection for Real-ESRGAN. */
export function pickModel(category: "photo" | "illustration" | "anime" | "icon"): string {
  return category === "photo" ? "realesrgan-x4plus" : "realesrgan-x4plus-anime";
}

function getPngDimensions(pngPath: string): { width: number; height: number } {
  try {
    const buf = fs.readFileSync(pngPath);
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
  } catch {}
  return { width: 0, height: 0 };
}

export function runUpscaleJob(
  tempId: string,
  taskId: string,
  taskStore: TaskStore,
  onUpdate: (job: UpscaleJobItem) => void
): Promise<void> {
  const job = jobs.get(tempId);
  const preview = previews.get(tempId);
  if (!job || !preview) return Promise.resolve();

  const abort = { aborted: false };
  abortSignals.set(tempId, abort);

  return (async () => {
    const start = Date.now();
    taskStore.update(taskId, { status: "PROCESSING", progress: 5 });
    job.status = "processing";
    job.originalUrl = `/storage/imports/${encodeURIComponent(path.basename(preview.filePath))}`;
    onUpdate(job);

    const upscaledDir = dirs.upscaled;
    fs.mkdirSync(upscaledDir, { recursive: true });
    const baseSlug = (preview.originalName.replace(/\.[^.]+$/, "") || "upscaled").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    const fmt = job.outputFormat === "jpeg" ? ".jpg" : job.outputFormat === "webp" ? ".webp" : ".png";
    let outPath = path.join(upscaledDir, `${baseSlug}_${tempId}_upscaled_${job.scale}${fmt}`);
    const stepDir = path.join(tempRoot, `ups_steps_${tempId}`);
    fs.mkdirSync(stepDir, { recursive: true });

    try {
      taskStore.update(taskId, { progress: 10 });

      // Analyze image once at start (cheap 96px sample)
      const analysis = categorizeImage(preview.filePath);

      // Determine scale plan
      let plan: UpscalePlan;
      let resolutionMode = false;
      let targetLongEdge: number | undefined;

      if (job.scale === "4k" || job.scale === "6k" || job.scale === "8k") {
        resolutionMode = true;
        targetLongEdge = job.scale === "4k" ? 3840 : job.scale === "6k" ? 6144 : 7680;
        const currentLongEdge = Math.max(analysis.width, analysis.height);
        const targetFactor = targetLongEdge / currentLongEdge;
        if (targetFactor <= 1.01) {
          // Source already meets/exceeds target — skip model passes, copy forward
          plan = { steps: [], finalRatio: 1 };
        } else {
          plan = calcSteps(targetFactor);
        }
      } else if (job.scale === "custom") {
        const customScale = job.customScale;
        if (typeof customScale !== "number" || !Number.isFinite(customScale) || customScale < 2 || customScale > 8) {
          throw new Error("custom scale must be a finite number from 2 to 8");
        }
        plan = calcSteps(customScale);
      } else {
        plan = calcSteps(job.scale === "4x" ? 4 : 2);
      }

      // Engine: auto explicitly resolves to the Real-ESRGAN default.
      const engine: string = job.engine === "auto" || !job.engine ? "realesrgan" : job.engine;

      // Content-based model selection: photo → x4plus, illustration/anime/icon → x4plus-anime
      const model = pickModel(analysis.category);

      let currentPath = preview.filePath;

      // Multi-step loop (empty steps = skip model passes, e.g. source already ≥ target resolution)
      for (let i = 0; i < plan.steps.length; i++) {
        if (abort.aborted) throw new Error("cancelled");
        const stepScale = plan.steps[i];
        const stepOut = path.join(stepDir, `step_${i}.png`);
        const progressBase = 10 + (i / plan.steps.length) * 80;
        taskStore.update(taskId, {
          progress: Math.round(progressBase),
          name: `Upscale: ${preview.originalName} — step ${i + 1}/${plan.steps.length} (${stepScale}x)`,
        });

        if (engine === "waifu2x") {
          const res = await runWaifu2x({
            input: currentPath,
            output: stepOut,
            scale: stepScale === 4 ? 4 : 2,
            noise: 1,
            model: "cunet",
            abortSignal: abort,
            onProgress: (pct) => taskStore.update(taskId, { progress: Math.round(progressBase + pct * (80 / plan.steps.length)) }),
          });
          if (res.aborted) throw new Error("cancelled");
          if (!res.ok) {
            throw new Error(res.error === "binary_missing" ? "waifu2x binary tidak ditemukan — pilih engine Real-ESRGAN" : (res.error || "waifu2x gagal"));
          }
        } else {
          const res = await runRealesrgan({
            input: currentPath,
            output: stepOut,
            scale: stepScale as 2 | 3 | 4,
            model,
            tileSize: job.tileSize,
            abortSignal: abort,
            onProgress: (pct) => taskStore.update(taskId, { progress: Math.round(progressBase + pct * (80 / plan.steps.length)) }),
          });
          if (res.aborted) throw new Error("cancelled");
          if (!res.ok) {
            throw new Error(res.error === "binary_missing" ? "Real-ESRGAN binary tidak ditemukan" : (res.error || "realesrgan gagal"));
          }
        }
        currentPath = stepOut;
      }

      // Exact resize when planner couldn't reach targetScale exactly
      if (plan.finalRatio !== 1) {
        taskStore.update(taskId, { progress: 92, name: `Upscale: ${preview.originalName} — exact resize` });
        const dims = getPngDimensions(currentPath);
        const currentLongEdge = Math.max(dims.width, dims.height);
        const exactTarget = Math.round(currentLongEdge * plan.finalRatio);
        const resizedPath = path.join(stepDir, "final_resize.png");
        const ok = await resizeLongEdge(currentPath, resizedPath, exactTarget);
        if (ok) {
          currentPath = resizedPath;
        } else {
          job.error = (job.error || "") + "Exact resize skipped (ffmpeg required) — output slightly oversized. ";
        }
      }

      // White background flatten
      if (job.whiteBackground) {
        taskStore.update(taskId, { progress: 96, name: `Upscale: ${preview.originalName} — white bg` });
        await flattenAlphaToWhite(currentPath);
      }

      // Format conversion (jika bukan PNG)
      if (job.outputFormat && job.outputFormat !== "png") {
        taskStore.update(taskId, { progress: 98, name: `Upscale: ${preview.originalName} — convert ${job.outputFormat}` });
        const ok = await convertFormat(currentPath, outPath, job.outputFormat, { quality: 92 });
        if (!ok) {
          // ffmpeg tidak ada — fallback PNG
          job.outputFormat = "png";
          try { fs.unlinkSync(outPath); } catch {}
          outPath = path.join(upscaledDir, `${baseSlug}_${tempId}_upscaled_${job.scale}.png`);
          fs.copyFileSync(currentPath, outPath);
          job.error = (job.error || "") + "Konversi format gagal (ffmpeg tidak tersedia) — output PNG.";
        }
      } else {
        fs.copyFileSync(currentPath, outPath);
      }

      const dims = getPngDimensions(outPath);
      job.status = "completed";
      job.outputUrl = `/storage/assets/upscaled/${encodeURIComponent(path.basename(outPath))}`;
      job.outputWidth = dims.width;
      job.outputHeight = dims.height;
      job.elapsedMs = Date.now() - start;
      onUpdate(job);

      const sizeBytes = fs.statSync(outPath).size;
      const parentImage = getLibrary().find((a) => a.type === "IMAGE" && a.name === preview.originalName);
      addLibraryAsset({
        id: `lib-ups-${tempId}`,
        type: "IMAGE",
        name: path.basename(outPath),
        url: job.outputUrl,
        thumbnailUrl: job.outputUrl,
        folder: "storage/assets/upscaled",
        sourceModule: "UPSCALE",
        sourceJobId: taskId,
        mimeType: job.outputFormat === "jpeg" ? "image/jpeg" : job.outputFormat === "webp" ? "image/webp" : "image/png",
        fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        resolution: `${dims.width}x${dims.height}`,
        tags: ["Upscale", job.scale || "2x", engine],
        status: "Upscaled",
        createdAt: new Date().toISOString(),
        prompt: preview.originalName,
        parentAssetId: parentImage?.id,
        versioned: true,
        settings: { style: engine === "waifu2x" ? "waifu2x" : "realesrgan", ratio: undefined, upscale: job.scale },
      });
      persistLibrary();

      taskStore.update(taskId, { status: "COMPLETED", progress: 100, completedAt: new Date().toISOString() });

      // Cleanup temp steps + input (input dihapus setelah selesai; original
      // compare tidak lagi butuh file import karena output sudah final)
      try { fs.rmSync(stepDir, { recursive: true, force: true }); } catch {}
      try { fs.unlinkSync(preview.filePath); } catch {}
      previews.delete(tempId);
      abortSignals.delete(tempId);
    } catch (err: any) {
      const isCancelled = err?.message === "cancelled" || abort.aborted;
      const error = isCancelled ? "cancelled" : err instanceof Error ? err.message : String(err || "Unknown error");
      job.status = isCancelled ? "cancelled" : "failed";
      job.error = error;
      job.elapsedMs = Date.now() - start;
      onUpdate(job);
      taskStore.update(taskId, { status: isCancelled ? "CANCELLED" : "FAILED", error: job.error, completedAt: new Date().toISOString() });
      try { fs.rmSync(stepDir, { recursive: true, force: true }); } catch {}
      abortSignals.delete(tempId);
    }
  })();
}
