/**
 * vec-run.ts — Orchestrator utama Vectorize (rebuild-plan.md F1.6).
 *
 * Pipeline baru (9 step, jauh lebih sederhana dari 15+ step sebelumnya):
 *   analyze → prepare → config → vtracer → validate → retry sekali →
 *   postprocess → EPS (non-fatal) → completed + library
 *
 * Tidak ada: color clustering manual, flood fill, shape fitting, symmetry,
 * multi-pass SVGO.
 */

import fs from "fs";
import path from "path";
import { VectorJobItem } from "../../types";
import { runVtracer, VtracerOptions } from "../../binaries/vtracer";
import { svgToEps } from "../../binaries/inkscape";
import { dirs, importsRoot, tempRoot } from "../../binaries/paths";
import { JobQueue, TaskStore, makeTask } from "../job_queue";
import { addLibraryAsset, getLibrary, persistLibrary } from "../library";
import { analyzeImage, analyzeImageWithGemini, AssetType, ImageAnalysis } from "./vec-analyze";
import { prepareForTrace, preparePath } from "./vec-prepare";
import { getConfigForAsset } from "./vec-config";
import { postprocessSvg } from "./vec-postprocess";
import { VecOutputOptions } from "./vec-output";
import { validateSvg, VecValidation } from "./vec-validate";
import { stripBackground } from "./vec-bg";

interface StoredPreview {
  originalName: string;
  filePath: string;
  width: number;
  height: number;
  mimeType: string;
}

const previews = new Map<string, StoredPreview>();
const jobs = new Map<string, VectorJobItem>();
const abortSignals = new Map<string, { aborted: boolean }>();
const analyses = new Map<string, ImageAnalysis>();

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

function detectMime(buf: Buffer): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/png";
}

export function analyzeVectorizeUpload(filePath: string, originalName: string, nineRouterKey?: string): VectorJobItem {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(originalName).toLowerCase() || ".png";
  const dims = imageDimensionsFromBuffer(buf);
  const tempId = `vec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tmpPath = path.join(importsRoot, `${tempId}${ext}`);
  fs.copyFileSync(filePath, tmpPath);
  let pixelAnalysis: ImageAnalysis | undefined;
  try {
    pixelAnalysis = analyzeImage(tmpPath);
    analyses.set(tempId, pixelAnalysis);
  } catch {}

  // Gemini Vision (async, fire-and-forget) — bukan blocker.
  if (nineRouterKey) {
    void analyzeImageWithGemini(tmpPath, nineRouterKey, { tempId }).then((gemini) => {
      if (!gemini) return;
      const merged = { ...pixelAnalysis, ...gemini };
      // Hanya overwrite cache jika job masih "imported" (belum diqueue/diproses).
      const job = jobs.get(tempId);
      if (!job || job.status === "imported") {
        analyses.set(tempId, merged as ImageAnalysis);
        console.log("[vec-analyze] Gemini overwrite:", tempId.slice(0, 12), gemini.assetType || "");
      }
    });
  }

  return {
    tempId,
    originalName,
    filePath: tmpPath,
    mimeType: detectMime(buf),
    fileSize: buf.length,
    width: dims.width,
    height: dims.height,
    status: "imported",
  };
}

export function analyzeVectorizeUploadBuffer(filePath: string, originalName: string): VectorJobItem {
  return analyzeVectorizeUpload(filePath, originalName);
}

export function getVectorAnalysis(tempId: string): ImageAnalysis | undefined {
  return analyses.get(tempId);
}

export function storeVectorizePreview(tempId: string, preview: StoredPreview): void {
  previews.set(tempId, preview);
}

export function getVectorizePreview(tempId: string): StoredPreview | undefined {
  return previews.get(tempId);
}

export function getVectorizeQueue(): VectorJobItem[] {
  return Array.from(jobs.values());
}

export function clearVectorizeCompleted(): VectorJobItem[] {
  const removed: VectorJobItem[] = [];
  for (const [id, job] of jobs) {
    if (job.status === "completed" || job.status === "failed") {
      removed.push(job);
      jobs.delete(id);
      abortSignals.delete(id);
      // Bersihkan source & analysis yang selama ini di-retain untuk re-trace.
      const preview = previews.get(id);
      if (preview) {
        try { fs.unlinkSync(preview.filePath); } catch {}
        previews.delete(id);
      }
      analyses.delete(id);
    }
  }
  return removed;
}

export function cancelVectorizeJob(
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
    job.status = "failed";
    job.error = "cancelled";
    const task = taskStore.all().find((t) => t.tempId === tempId);
    if (task) taskStore.update(task.id, { status: "CANCELLED", error: "cancelled", completedAt: new Date().toISOString() });
  }
  return true;
}

export interface VectorQueueItem {
  tempId: string;
  assetType?: AssetType; // override user (opsional)
  exportEps?: boolean;
  artboard?: string;
  padding?: number;
  removeBackground?: boolean;
  /** VTracer granular override (mode, clustering, hier, sliders) — VTracer-style granular control. */
  vtracerArgs?: Partial<VtracerOptions>;
  /** Fitur output (parameterized shapes, draw style, gap filler). */
  postprocess?: VecOutputOptions;
}

export function enqueueVectorize(
  items: VectorQueueItem[],
  taskStore: TaskStore,
  onUpdate: (job: VectorJobItem) => void,
  queue: JobQueue<{ tempId: string }>
): { jobs: VectorJobItem[]; jobId: string } {
  const jobId = `vector-batch-${Date.now()}`;
  const work: Array<{ tempId: string; taskId: string }> = [];

  for (const item of items) {
    const preview = previews.get(item.tempId);
    const analysis = analyses.get(item.tempId);
    const job: VectorJobItem = {
      tempId: item.tempId,
      assetType: item.assetType || analysis?.assetType || "flat-illustration",
      exportEps: item.exportEps ?? true,
      artboard: item.artboard || "source",
      padding: item.padding ?? 0,
      removeBackground: item.removeBackground,
      vtracerArgs: item.vtracerArgs,
      postprocess: item.postprocess,
      status: "queued",
      analysis: analysis
        ? {
            estimatedColors: analysis.estimatedColors,
            background: analysis.bgColor || "unknown",
            edgeDensity: 0,
            alphaRatio: analysis.hasAlpha ? 1 : 0,
            recommendedProfile: analysis.assetType,
            confidence: analysis.confidence,
          }
        : undefined,
    };
    jobs.set(item.tempId, job);

    const task = makeTask(taskStore, "VECTOR_GENERATION", `Vectorize: ${preview?.originalName || item.tempId} (${job.assetType})`, "VECTOR");
    task.tempId = item.tempId;
    work.push({ tempId: item.tempId, taskId: task.id });
  }

  queue.enqueueMany(
    work.map(({ tempId, taskId }) => ({ id: tempId, taskId, data: { tempId } }))
  );

  return { jobs: work.map((w) => jobs.get(w.tempId)!), jobId };
}

function svgDimensions(svgPath: string): { width: number; height: number } {
  try {
    const raw = fs.readFileSync(svgPath, "utf-8");
    const vb = raw.match(/viewBox="\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)"/);
    if (vb) return { width: Math.round(parseFloat(vb[3])), height: Math.round(parseFloat(vb[4])) };
  } catch {}
  return { width: 0, height: 0 };
}

export function runVectorizeJob(
  tempId: string,
  taskId: string,
  taskStore: TaskStore,
  onUpdate: (job: VectorJobItem) => void
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

    const vectorDir = dirs.vectors;
    fs.mkdirSync(vectorDir, { recursive: true });
    const baseSlug = (preview.originalName.replace(/\.[^.]+$/, "") || "vector").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    const outSvg = path.join(vectorDir, `${baseSlug}_${tempId}.svg`);
    const outEps = path.join(dirs.eps, `${baseSlug}_${tempId}.eps`);
    const tmpSvg = path.join(tempRoot, `${tempId}_raw.svg`);
    const prepPath = preparePath(tempRoot, tempId);
    let prepUsed = false;

    try {
      taskStore.update(taskId, { progress: 10 });

      // Analyze
      const analysis = analyses.get(tempId) || analyzeImage(preview.filePath);
      job.assetType = job.assetType || analysis.assetType;
      job.analysis = {
        estimatedColors: analysis.estimatedColors,
        background: analysis.bgColor || "unknown",
        edgeDensity: 0,
        alphaRatio: analysis.hasAlpha ? 1 : 0,
        recommendedProfile: analysis.assetType,
        confidence: analysis.confidence,
      };

      // Prepare (resize + convert saja)
      taskStore.update(taskId, { progress: 20, name: `Vectorize: ${preview.originalName} — prepare` });
      const prepResult = prepareForTrace(preview.filePath, prepPath, { maxDimension: 1500 });
      let traceInput = prepResult.outputPath;
      prepUsed = true;

      // Remove background (optional)
      if (job.removeBackground) {
        const bgPath = path.join(tempRoot, `${tempId}_bg.png`);
        const { stripped } = stripBackground(traceInput, bgPath);
        if (stripped) {
          traceInput = bgPath;
          prepUsed = true; // ensure cleanup
        }
      }

      // Config VTracer — base dari analysis.assetType (atau
      // override user job.assetType), lalu merge granular vtracerArgs.
      // Gemini vtracerHints TIDAK dipakai override lagi: hints LLM bisa
      // menurunkan colorPrecision/mengubah clustering → warna wash-out.
      // Parameter trace deterministik dari CONFIGS[assetType] + user args.
      const analysisForConfig: ImageAnalysis =
        job.assetType && job.assetType !== analysis.assetType
          ? { ...analysis, assetType: job.assetType as AssetType }
          : analysis;
      const config = getConfigForAsset(analysisForConfig, job.vtracerArgs);

      // Run VTracer
      taskStore.update(taskId, { progress: 25, name: `Vectorize: ${preview.originalName} — trace (${job.assetType})` });
      const vtResult = await runVtracer({
        input: traceInput,
        output: tmpSvg,
        ...config.vtracerArgs,
        abortSignal: abort,
        onProgress: (pct) => taskStore.update(taskId, { progress: 25 + Math.round(pct * 0.45) }),
      });
      if (vtResult.aborted) throw new Error("cancelled");
      if (!vtResult.ok) throw new Error(vtResult.error || "vtracer gagal");

      // Postprocess (artboard + SVGO single-pass)
      taskStore.update(taskId, { progress: 80, name: `Vectorize: ${preview.originalName} — postprocess` });
      await postprocessSvg(tmpSvg, outSvg, {
        artboard: config.postprocess.artboard,
        padding: job.padding && job.padding > 0 ? job.padding : config.postprocess.padding,
        centerArtwork: config.postprocess.centerArtwork,
        targetAspectRatio: job.artboard && job.artboard !== "source" ? job.artboard as any : undefined,
        output: { ...config.output, ...(job.postprocess || {}) },
      });

      // Validate HASIL AKHIR (postprocess) — jujur, bukan raw trace.
      taskStore.update(taskId, { progress: 85, name: `Vectorize: ${preview.originalName} — validate` });
      let validation = validateSvg(outSvg);

      // Auto-retry SEKALI jika hasil buruk
      if (validation.score === "bad" && !job.autoRetried && config.retryWithArgs) {
        job.autoRetried = true;
        taskStore.update(taskId, { progress: 60, name: `Vectorize: ${preview.originalName} — retry` });
        const retryResult = await runVtracer({
          input: traceInput,
          output: tmpSvg,
          ...config.vtracerArgs,
          ...config.retryWithArgs,
          abortSignal: abort,
        });
        if (retryResult.aborted) throw new Error("cancelled");
        if (retryResult.ok) {
          await postprocessSvg(tmpSvg, outSvg, {
            artboard: config.postprocess.artboard,
            padding: job.padding && job.padding > 0 ? job.padding : config.postprocess.padding,
            centerArtwork: config.postprocess.centerArtwork,
            targetAspectRatio: job.artboard && job.artboard !== "source" ? job.artboard as any : undefined,
            output: { ...config.output, ...(job.postprocess || {}) },
          });
          validation = validateSvg(outSvg);
        }
      }

      // EPS — non-fatal
      let epsWarning: string | undefined;
      if (job.exportEps !== false) {
        fs.mkdirSync(dirs.eps, { recursive: true });
        taskStore.update(taskId, { progress: 95 });
        const epsResult = await svgToEps(outSvg, outEps);
        if (!epsResult.ok) {
          epsWarning = epsResult.error === "binary_missing" ? "EPS skipped — Inkscape tidak tersedia" : (epsResult.error || "EPS gagal");
        }
      }

      // Done
      const dims = svgDimensions(outSvg);
      job.status = "completed";
      job.outputSvgUrl = `/storage/assets/vectors/${encodeURIComponent(path.basename(outSvg))}`;
      job.outputEpsUrl = job.exportEps !== false && fs.existsSync(outEps) ? `/storage/assets/eps/${encodeURIComponent(path.basename(outEps))}` : undefined;
      job.outputWidth = dims.width;
      job.outputHeight = dims.height;
      job.elapsedMs = Date.now() - start;
      job.validation = {
        qualityScore: validation.score === "good" ? 90 : validation.score === "warn" ? 60 : 30,
        recommendation: validation.score,
        metrics: {
          pathCount: validation.pathCount,
          nodeCount: 0,
          colorCount: 0,
          tinyPathCount: validation.tinyPathCount,
        },
        issues: validation.isEmpty
          ? [{ severity: "error", code: "empty", message: validation.summary }]
          : validation.score !== "good"
          ? [{ severity: "warning", code: validation.score, message: validation.summary }]
          : [],
      };
      job.qcWarnings = validation.score !== "good" ? [validation.summary] : [];
      job.qcPassed = validation.score !== "bad";
      if (epsWarning) job.error = epsWarning;
      onUpdate(job);

      // Add to library
      const sizeBytes = fs.statSync(outSvg).size;
      const parentImage = getLibrary().find((a) => a.type === "IMAGE" && a.name === preview.originalName);
      addLibraryAsset({
        id: `lib-vec-${tempId}`,
        type: "VECTOR",
        name: path.basename(outSvg),
        url: job.outputSvgUrl,
        thumbnailUrl: job.outputSvgUrl,
        folder: "storage/assets/vectors",
        sourceModule: "VECTOR",
        sourceJobId: taskId,
        mimeType: "image/svg+xml",
        fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        resolution: `${dims.width}x${dims.height}`,
        tags: ["Vectorize", job.assetType || "auto"],
        status: "Vectorized",
        createdAt: new Date().toISOString(),
        prompt: preview.originalName,
        parentAssetId: parentImage?.id,
        versioned: true,
        settings: { style: job.assetType, ratio: job.artboard, upscale: undefined },
      });
      persistLibrary();

      taskStore.update(taskId, { status: "COMPLETED", progress: 100, completedAt: new Date().toISOString() });

      // Cleanup temp (raw trace + prep), TAPI jangan hapus preview/analyses:
      // re-vectorize / live re-trace memakai tempId yang sama tanpa upload ulang,
      // jadi source & analysis harus tetap ada sampai queue di-clear
      // (lihat clearVectorizeCompleted()).
      try { fs.unlinkSync(tmpSvg); } catch {}
      if (prepUsed) { try { fs.unlinkSync(prepPath); } catch {} }
      // JANGAN delete previews/analyses/filePath di sini — BUG re-vectorize lama.
      abortSignals.delete(tempId);
    } catch (err: any) {
      const isCancelled = err?.message === "cancelled" || abort.aborted;
      job.status = "failed";
      job.error = isCancelled ? "cancelled" : err.message || "Unknown error";
      job.elapsedMs = Date.now() - start;
      onUpdate(job);
      taskStore.update(taskId, { status: isCancelled ? "CANCELLED" : "FAILED", error: job.error, completedAt: new Date().toISOString() });
      try { fs.unlinkSync(tmpSvg); } catch {}
      if (prepUsed) { try { fs.unlinkSync(prepPath); } catch {} }
      abortSignals.delete(tempId);
    }
  })();
}
