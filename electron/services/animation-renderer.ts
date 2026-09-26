import fs from "fs";
import path from "path";
import { BrowserWindow } from "electron";
import { spawn, ChildProcess } from "child_process";
import { AnimationJobItem } from "../types";
import { AnimationDefinition, AnimLayer } from "./animation-types";
import { dirs, importsRoot, storageRoot, tempRoot, which } from "../binaries/paths";
import { JobQueue, TaskStore, makeTask } from "./job_queue";
import { addLibraryAsset, getLibrary, persistLibrary } from "./library";
import type { AnimV2Package } from "./animation-v2-types";
import { getImportedAnimationV2 } from "./animation-v2-import";
import { appendV2Log } from "./animation-v2-log";

/**
 * Animation render engine (sesuai plan §7 / §2.3):
 * BrowserWindow offscreen + capturePage() per frame → FFmpeg encode.
 *
 * - Frame sequence disimpan ke storage/temp/animation_frames/{jobId}/
 * - Kontrol waktu animasi via WAAPI `animation.currentTime = t` (deterministik)
 * - Output: MP4 / WebM / GIF via ffmpeg, Lottie JSON in-process
 */

interface StoredSvg {
  originalName: string;
  filePath: string;
  layers: AnimLayer[];
}

const previews = new Map<string, StoredSvg>();
const jobs = new Map<string, AnimationJobItem>();
const runningWindows = new Map<string, BrowserWindow>();
const runningFfmpeg = new Map<string, ChildProcess>();
const v2Defs = new Map<string, { packageDir: string; svg: string; animation: AnimV2Package; manifest: any; taskId: string; sha256: string }>();
const v2Cancelled = new Set<string>();
const v2TaskIds = new Map<string, string>();

export function enqueueAnimationV2(packageId: string, taskStore: TaskStore, onUpdate: (job: AnimationJobItem) => void, queue: JobQueue<{ tempId: string }>, formats: string[] = ["MP4"]): { jobId?: string; error?: string } {
  try {
    const imported = getImportedAnimationV2(packageId); if (!imported) return { error: "Animation V2 package was not imported" };
    if (!formats.length || formats.some(f => !["MP4", "WEBM", "GIF"].includes(f))) return { error: "Animation V2 supports MP4, WEBM, and GIF only" };
    const svg = imported.sceneSvg, animation = imported.animation, manifest = imported.manifest;
    const fps = 30, pixels = animation.canvas.width * animation.canvas.height, frames = Math.ceil(animation.totalDuration / 1000 * fps);
    const emitterWork = animation.emitters.reduce((sum, emitter) => sum + emitter.count * (emitter.loop ? Math.ceil(animation.totalDuration / Math.max(1, Math.max(emitter.particleSpec.duration, emitter.count * emitter.staggerMs))) : 1), 0) * frames;
    if (animation.canvas.width > 4096 || animation.canvas.height > 4096 || pixels > 16000000 || frames > 3600 || emitterWork > 2000000 || animation.tracks.length > 200 || animation.emitters.length > 50) return { error: "Animation V2 package exceeds render limits" };
    const id = `anim-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task = makeTask(taskStore, "ANIMATION", `Animating V2: ${manifest?.asset?.title || id}`, "ANIMATION");
    const job: AnimationJobItem = { tempId: id, originalName: manifest?.asset?.title || id, status: "queued", progress: 0, fps, durationMs: animation.totalDuration, canvasWidth: animation.canvas.width, canvasHeight: animation.canvas.height, loop: animation.loop, animationV2: true, provenance: { source: "IMAGIN Studio Animation V2", sha256: imported.sha256 } };
    jobs.set(id, job); v2Defs.set(id, { packageDir: imported.packageDir, svg, animation, manifest: { ...manifest, requestedFormats: formats }, taskId: task.id, sha256: imported.sha256 }); v2TaskIds.set(task.id, id);
    appendV2Log({ tempId: id, taskId: task.id, packageId, phase: "enqueue", sha256: imported.sha256, formats, canvas: `${animation.canvas.width}x${animation.canvas.height}`, frames, durationMs: animation.totalDuration, emitterWork, detail: manifest?.asset?.title || id });
    queue.enqueue({ id, taskId: task.id, data: { tempId: id } }); return { jobId: id };
  } catch (err: any) { return { error: "Animation V2 package storage is invalid" }; }
}

export function getAnimationV2Queue() { return Array.from(jobs.values()).filter(j => j.animationV2); }
export function cancelAnimationV2(tempId: string, queue: JobQueue<{ tempId: string }>, taskStore: TaskStore, onUpdate: (job: AnimationJobItem) => void): boolean {
  const job = jobs.get(tempId); if (!job?.animationV2) return false;
  const taskId = v2Defs.get(tempId)?.taskId || ""; const dequeued = queue.cancelQueued(tempId); v2Cancelled.add(tempId); const win = runningWindows.get(tempId); if (win && !win.isDestroyed()) win.destroy(); const proc = runningFfmpeg.get(tempId); if (proc) proc.kill("SIGTERM"); job.status = "cancelled"; job.error = "cancelled"; taskStore.update(taskId, { status: "CANCELLED", error: "cancelled", completedAt: new Date().toISOString() }); onUpdate(job);
  appendV2Log({ tempId, taskId, phase: "cancelled", sha256: job.provenance?.sha256, detail: dequeued ? "cancelled_queued" : "cancelled_running" });
  v2Defs.delete(tempId); v2TaskIds.delete(taskId); if (dequeued) v2Cancelled.delete(tempId); return true;
}
export function cancelAnimationV2Task(taskId: string, queue: JobQueue<{ tempId: string }>, taskStore: TaskStore, onUpdate: (job: AnimationJobItem) => void) { const id = v2TaskIds.get(taskId); return id ? cancelAnimationV2(id, queue, taskStore, onUpdate) : false; }
export function isAnimationV2(tempId: string) { return !!v2Defs.get(tempId); }
export function clearAnimationV2Completed() {
  const removed = getAnimationV2Queue().filter(j => j.status === "completed" || j.status === "failed" || j.status === "cancelled");
  removed.forEach(j => {
    jobs.delete(j.tempId);
    const taskId = v2Defs.get(j.tempId)?.taskId;
    if (taskId) v2TaskIds.delete(taskId);
    // juga bersihkan reverse lookup jika sudah terhapus dari v2Defs
    for (const [tid, vid] of Array.from(v2TaskIds.entries())) if (vid === j.tempId) v2TaskIds.delete(tid);
    v2Defs.delete(j.tempId);
    v2Cancelled.delete(j.tempId);
  });
  return removed;
}

export function getAnimationQueue(): AnimationJobItem[] {
  return Array.from(jobs.values()).filter(job => !job.animationV2);
}

export function clearAnimationCompleted(): AnimationJobItem[] {
  const removed: AnimationJobItem[] = [];
  for (const [id, job] of jobs) {
    if (!job.animationV2 && (job.status === "completed" || job.status === "failed")) {
      removed.push(job);
      jobs.delete(id);
    }
  }
  return removed;
}

export function cancelAnimation(tempId: string): boolean {
  if (isAnimationV2(tempId)) return false;
  const win = runningWindows.get(tempId);
  if (win && !win.isDestroyed()) {
    try { win.destroy(); } catch {}
    runningWindows.delete(tempId);
  }
  const proc = runningFfmpeg.get(tempId);
  if (proc) {
    try { proc.kill("SIGTERM"); } catch {}
    runningFfmpeg.delete(tempId);
  }
  const job = jobs.get(tempId);
  if (job) {
    job.status = "failed";
    job.error = "cancelled";
  }
  try {
    const frameDir = path.join(tempRoot, "animation_frames", tempId);
    if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
  } catch {}
  return true;
}

/* ── Layer extraction (regex — main process tanpa DOM) ── */

export function extractLayers(svgContent: string): AnimLayer[] {
  const layers: AnimLayer[] = [];
  // Cocokkan <g id="..."> — simpan nama & posisi untuk nested (dipakai selector pertama)
  const re = /<g\b([^>]*\bid\s*=\s*["']([^"']+)["'])[^>]*>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(svgContent)) !== null) {
    const id = m[2].trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = id
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    layers.push({
      id,
      name,
      sourceSelector: `#${id}`,
      enabled: true,
      keyframes: [
        { timeMs: 0 },
        { timeMs: 1000 },
      ],
      easing: "ease-in-out",
    });
  }
  if (layers.length === 0) {
    // Fallback: satu layer "artwork" (seluruh svg) — agar tetap bisa dianimasikan
    layers.push({
      id: "artwork",
      name: "Artwork",
      sourceSelector: "svg > *",
      enabled: true,
      keyframes: [{ timeMs: 0 }, { timeMs: 1000 }],
      easing: "ease-in-out",
    });
  }
  return layers;
}

/* ── Analyze: simpan source + extract layers ── */

/** Ekstrak elemen ber-id dari HTML (div/section/img/dst.) → AnimLayer. */
export function extractHtmlLayers(html: string): AnimLayer[] {
  const layers: AnimLayer[] = [];
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const id = m[1].trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = id
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    layers.push({
      id,
      name,
      sourceSelector: `#${id}`,
      enabled: true,
      keyframes: [{ timeMs: 0 }, { timeMs: 1000 }],
      easing: "ease-in-out",
    });
  }
  if (layers.length === 0) {
    layers.push({
      id: "artwork",
      name: "Artwork",
      sourceSelector: "body > *",
      enabled: true,
      keyframes: [{ timeMs: 0 }, { timeMs: 1000 }],
      easing: "ease-in-out",
    });
  }
  return layers;
}

export function analyzeAnimationSource(
  params: {
    svgPath?: string;
    html?: string;
    css?: string;
    originalName: string;
  },
  canvasWidth: number,
  canvasHeight: number
): { tempId: string; layers: AnimLayer[]; error?: string } {
  try {
    const isHtml = !!params.html;
    const tempId = `anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let layers: AnimLayer[];

    if (isHtml) {
      const tmpPath = path.join(importsRoot, `${tempId}.html`);
      fs.writeFileSync(tmpPath, params.html!, "utf-8");
      layers = extractHtmlLayers(params.html!);
      previews.set(tempId, {
        originalName: params.originalName,
        filePath: tmpPath,
        layers,
      });
    } else {
      if (!params.svgPath) return { tempId: "", layers: [], error: "svgPath required" };
      const raw = fs.readFileSync(params.svgPath, "utf-8");
      const tmpPath = path.join(importsRoot, `${tempId}.svg`);
      fs.copyFileSync(params.svgPath, tmpPath);
      layers = extractLayers(raw);
      previews.set(tempId, {
        originalName: params.originalName,
        filePath: tmpPath,
        layers,
      });
    }
    return { tempId, layers };
  } catch (err: any) {
    return { tempId: "", layers: [], error: err.message || "Gagal menganalisis source" };
  }
}

// Backward-compat alias
export function analyzeSvgUpload(
  svgPath: string,
  originalName: string,
  canvasWidth: number,
  canvasHeight: number
): { tempId: string; layers: AnimLayer[]; error?: string } {
  return analyzeAnimationSource({ svgPath, originalName }, canvasWidth, canvasHeight);
}

export function getAnalyzedLayers(tempId: string): AnimLayer[] | undefined {
  return previews.get(tempId)?.layers;
}

/* ── Enqueue ── */

export function enqueueAnimation(
  def: AnimationDefinition,
  taskStore: TaskStore,
  onUpdate: (job: AnimationJobItem) => void,
  queue: JobQueue<{ tempId: string }>
): { jobs: AnimationJobItem[]; jobId: string; error?: string } {
  const preview = previews.get(def.sourceTempId || "") || {
    originalName: "animation",
  };

  const tempId = `anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const job: AnimationJobItem = {
    tempId,
    originalName: preview?.originalName || "animation",
    fps: def.fps,
    durationMs: def.durationMs,
    canvasWidth: def.width,
    canvasHeight: def.height,
    loop: def.loop,
    status: "queued",
    progress: 0,
  };
  jobs.set(tempId, job);

  const task = makeTask(
    taskStore,
    "ANIMATION",
    `Animating: ${job.originalName} (${def.fps}fps, ${def.durationMs}ms)`,
    "ANIMATION"
  );

  // Simpan definisi SEBELUM enqueue — drain() langsung memanggil runAnimationJob
  jobDefs.set(tempId, { def, taskId: task.id });

  queue.enqueue({ id: tempId, taskId: task.id, data: { tempId } });
  console.log(`[ANIM] enqueued ${tempId} → queue len=${queue.length} running=${queue.isRunning()}`);

  return { jobs: [job], jobId: tempId };
}

const jobDefs = new Map<
  string,
  { def: AnimationDefinition; taskId: string }
>();

/* ── WAAPI frame HTML builder ── */

function buildFrameHtml(def: AnimationDefinition): string {
  const layersJson = JSON.stringify(def.layers).replace(/</g, "\\u003c");
  const bg =
    def.background === "transparent"
      ? "transparent"
      : def.background === "white"
      ? "#ffffff"
      : def.background || "transparent";

  const isHtml = def.sourceMode === "html";
  const bodyContent = isHtml
    ? def.sourceHtml || ""
    : def.sourceSvg || "";
  const userCss = isHtml && def.sourceCss ? def.sourceCss : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin:0; padding:0; background:${bg}; overflow:hidden; }
  ${isHtml ? "" : "svg { position:absolute; top:0; left:0; width:" + def.width + "px; height:" + def.height + "px; }"}
  .anim-layer { will-change: transform, opacity; }
  ${userCss}
</style>
</head>
<body>
${bodyContent}
<script>
  const layers = ${layersJson};
  const ANIM_LAYERS = layers;
  const DURATION = ${def.durationMs};
  const LOOP = ${def.loop};

  // WAAPI — bangun animasi per layer dari keyframes
  const anims = [];
  for (const layer of ANIM_LAYERS) {
    const el = document.querySelector(layer.sourceSelector);
    if (!el || !layer.enabled) continue;
    el.classList.add('anim-layer');
    const frames = layer.keyframes
      .slice()
      .sort((a, b) => a.timeMs - b.timeMs);
    if (frames.length === 0) continue;

    const kfs = [];
    for (const f of frames) {
      const offset = Math.max(0, Math.min(1, f.timeMs / DURATION));
      const transform = [
        f.x !== undefined ? 'translateX(' + f.x + 'px)' : '',
        f.y !== undefined ? 'translateY(' + f.y + 'px)' : '',
        f.scaleX !== undefined || f.scaleY !== undefined
          ? 'scale(' + (f.scaleX ?? 1) + ',' + (f.scaleY ?? 1) + ')'
          : '',
        f.rotation !== undefined ? 'rotate(' + f.rotation + 'deg)' : '',
      ].filter(Boolean).join(' ');
      kfs.push({
        offset,
        transform: transform || 'none',
        opacity: f.opacity !== undefined ? String(f.opacity) : undefined,
      });
    }

    const anim = el.animate(kfs, {
      duration: DURATION,
      easing: layer.easing || 'ease-in-out',
      fill: 'both',
      iterations: LOOP ? Infinity : 1,
    });
    anim.pause();
    anims.push({ anim, layer });
  }
  window.__anims = anims;

  // Kontrol manual dari main process via executeJavaScript
  window.__setFrame = function (tMs) {
    for (const { anim } of window.__anims) {
      try { anim.currentTime = tMs; } catch {}
    }
  };
</script>
</body>
</html>`;
}

/* ── Lottie JSON serialization (in-process) ── */

function buildLottie(def: AnimationDefinition): string {
  const w = def.width;
  const h = def.height;
  const fps = def.fps;
  const durFrames = Math.round((def.durationMs / 1000) * fps);
  const layers: unknown[] = [];

  // Map easing WAAPI → bezier Lottie (i/o tangents)
  const EASING_BEZIER: Record<string, { i: number[]; o: number[] }> = {
    linear: { i: [0, 0], o: [1, 1] },
    ease: { i: [0.25, 0.1], o: [0.25, 1] },
    "ease-in": { i: [0.42, 0], o: [1, 1] },
    "ease-out": { i: [0, 0], o: [0.58, 1] },
    "ease-in-out": { i: [0.42, 0], o: [0.58, 1] },
  };

  def.layers.forEach((layer, idx) => {
    if (!layer.enabled) return;
    const kfs = layer.keyframes.slice().sort((a, b) => a.timeMs - b.timeMs);
    if (kfs.length === 0) return;

    const easing = EASING_BEZIER[layer.easing || "ease-in-out"] || EASING_BEZIER["ease-in-out"];
    const easeKf = () => ({ i: { x: [easing.i[0]], y: [easing.i[1]] }, o: { x: [easing.o[0]], y: [easing.o[1]] } });

    // Position (x,y) keyframes
    const posKfs = kfs.map((f) => ({
      ...easeKf(),
      t: Math.round((f.timeMs / 1000) * fps),
      s: [(f.x ?? 0) + w / 2, (f.y ?? 0) + h / 2, 0],
    }));
    const scaleKfs = kfs.map((f) => ({
      ...easeKf(),
      t: Math.round((f.timeMs / 1000) * fps),
      s: [(f.scaleX ?? 1) * 100, (f.scaleY ?? 1) * 100, 100],
    }));
    const rotKfs = kfs.map((f) => ({
      ...easeKf(),
      t: Math.round((f.timeMs / 1000) * fps),
      s: [f.rotation ?? 0],
    }));
    const opKfs = kfs.map((f) => ({
      ...easeKf(),
      t: Math.round((f.timeMs / 1000) * fps),
      s: [(f.opacity ?? 1) * 100],
    }));

    layers.push({
      ddd: 0,
      ind: idx,
      ty: 3,
      nm: layer.name || layer.id,
      ks: {
        o: { a: opKfs.length > 1, k: opKfs.length > 1 ? opKfs : [(f: any) => 100], ix: 11 },
        r: { a: rotKfs.length > 1, k: rotKfs.length > 1 ? rotKfs : [0], ix: 10 },
        p: { a: posKfs.length > 1, k: posKfs.length > 1 ? posKfs : [w / 2, h / 2, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: { a: scaleKfs.length > 1, k: scaleKfs.length > 1 ? scaleKfs : [100, 100, 100], ix: 6 },
      },
      ao: 0,
      ip: 0,
      op: durFrames,
      st: 0,
    });
  });

  return JSON.stringify(
    {
      v: "5.7.0",
      fr: fps,
      ip: 0,
      op: durFrames,
      w,
      h,
      nm: "IMAGIN Animation",
      ddd: 0,
      assets: [],
      layers,
    },
    null,
    0
  );
}

/* ── FFmpeg encode ── */

function runFfmpegEncode(
  args: string[],
  tempId: string,
  onDone: (ok: boolean, err?: string) => void
): void {
  const bin = which("ffmpeg");
  if (!bin) {
    onDone(false, "ffmpeg tidak ditemukan di PATH");
    return;
  }
  const child: ChildProcess = spawn(bin, args, { windowsHide: true });
  runningFfmpeg.set(tempId, child);
  let stderr = "";
  child.stderr?.on("data", (d: Buffer) => {
    stderr += d.toString();
  });
  child.on("close", (code) => {
    runningFfmpeg.delete(tempId);
    onDone(code === 0, code === 0 ? undefined : stderr.slice(-400));
  });
  child.on("error", (err) => {
    runningFfmpeg.delete(tempId);
    onDone(false, err.message);
  });
}

function encodeAll(
  frameDir: string,
  outBase: string,
  fps: number,
  formats: string[],
  tempId: string,
  onProgress: (step: number, total: number) => void
): Promise<{ urls: Record<string, string>; error?: string }> {
  const framePattern = path.join(frameDir, "frame_%04d.png");
  // GIF = 2 langkah (palettegen + paletteuse), sisanya 1 langkah
  const steps = formats.reduce(
    (acc, f) => acc + (f === "GIF" ? 2 : 1),
    0
  );
  let done = 0;
  const urls: Record<string, string> = {};

  const next = () => {
    done++;
    onProgress(done, steps);
  };

  return new Promise((resolve) => {
    const runFormat = (idx: number): void => {
      if (idx >= formats.length) {
        resolve({ urls });
        return;
      }
      const fmt = formats[idx];
      if (fmt === "GIF") {
        const palettePath = path.join(frameDir, "palette.png");
        runFfmpegEncode(
          ["-y", "-framerate", String(fps), "-i", framePattern, "-vf", "palettegen", palettePath],
          tempId,
          (ok) => {
            if (!ok) { resolve({ urls, error: "GIF palettegen gagal" }); return; }
            next();
            runFfmpegEncode(
              ["-y", "-framerate", String(fps), "-i", framePattern, "-i", palettePath, "-lavfi", "paletteuse", `${outBase}.gif`],
              tempId,
              (ok2, err) => {
                if (ok2) urls.gif = `/storage/assets/animations/${path.basename(outBase)}.gif`;
                next();
                if (!ok2) { resolve({ urls, error: err }); return; }
                runFormat(idx + 1);
              }
            );
          }
        );
        return;
      }
      if (fmt === "MP4") {
        runFfmpegEncode(
          ["-y", "-framerate", String(fps), "-i", framePattern, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${outBase}.mp4`],
          tempId,
          (ok, err) => {
            if (ok) urls.mp4 = `/storage/assets/animations/${path.basename(outBase)}.mp4`;
            next();
            if (!ok) { resolve({ urls, error: err }); return; }
            runFormat(idx + 1);
          }
        );
      } else if (fmt === "WEBM") {
        runFfmpegEncode(
          ["-y", "-framerate", String(fps), "-i", framePattern, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", `${outBase}.webm`],
          tempId,
          (ok, err) => {
            if (ok) urls.webm = `/storage/assets/animations/${path.basename(outBase)}.webm`;
            next();
            if (!ok) { resolve({ urls, error: err }); return; }
            runFormat(idx + 1);
          }
        );
      } else {
        // Lottie — di-generate setelah encode
        next();
        runFormat(idx + 1);
      }
    };
    runFormat(0);
  });
}

async function runAnimationV2Job(tempId: string, taskId: string, taskStore: TaskStore, onUpdate: (job: AnimationJobItem) => void): Promise<void> {
  const job = jobs.get(tempId), rec = v2Defs.get(tempId); if (!job || !rec) return;
  const formats = rec.manifest?.requestedFormats || ["MP4"];
  const frameDir = path.join(tempRoot, "animation_frames", tempId); fs.mkdirSync(frameDir, { recursive: true });
  let win: BrowserWindow | null = null; const fps = job.fps || 30, totalFrames = Math.max(1, Math.round((rec.animation.totalDuration / 1000) * fps));
  try {
    if (v2Cancelled.has(tempId)) throw new Error("cancelled"); job.status = "processing"; taskStore.update(taskId, { status: "PROCESSING", progress: 2 }); onUpdate(job);
    appendV2Log({ tempId, taskId, phase: "render_start", sha256: rec.sha256, formats, canvas: `${rec.animation.canvas.width}x${rec.animation.canvas.height}`, frames: totalFrames, durationMs: rec.animation.totalDuration });
    win = new BrowserWindow({ show: false, width: rec.animation.canvas.width, height: rec.animation.canvas.height, webPreferences: { offscreen: true } }); runningWindows.set(tempId, win);
    const runtimeSource = `class LocalAnimationV2Runtime{constructor(root,data){this.root=root;this.data=data;this.anims=[];this.particles=[];this.time=0}seek(t){this.time=Math.max(0,Math.min(this.data.totalDuration,t||0));this.anims.forEach(a=>a.currentTime=this.time);this.particles.forEach(p=>p.a.cancel());this.particles=[];this.data.emitters.forEach(e=>{let period=Math.max(e.particleSpec.duration,e.count*e.staggerMs), rounds=e.loop?Math.ceil(this.time/period)+1:1;for(let r=0;r<rounds;r++)for(let i=0;i<e.count;i++){let start=r*period+i*e.staggerMs,age=this.time-start;if(age<0||age>=e.particleSpec.duration)continue;let s=e.particleSpec,el=this.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg',s.shape),x=e.origin.x,y=e.origin.y;if(s.shape==='circle'){el.setAttribute('cx',x);el.setAttribute('cy',y);el.setAttribute('r',s.radius)}else{el.setAttribute('x1',x);el.setAttribute('y1',y);el.setAttribute('x2',x+s.length);el.setAttribute('y2',y)}el.setAttribute('fill',s.shape==='circle'?s.color:'none');el.setAttribute('stroke',s.shape==='line'?s.color:'none');el.setAttribute('opacity',s.opacity);this.root.appendChild(el);let a=el.animate([{transform:'translate(0,0)',opacity:s.opacity},{transform:'translate('+s.trajectory.dx+'px,'+s.trajectory.dy+'px)',opacity:s.fadeOut?0:s.opacity}],{duration:s.duration,easing:s.easing,fill:'forwards'});a.pause();a.currentTime=age;this.particles.push({a:a,el:el})}})}play(){if(!this.anims.length){let totalMatches=0; for(const t of this.data.tracks){let cnt=0; try{cnt=this.root.querySelectorAll(t.target).length}catch{cnt=0} totalMatches+=cnt; if(totalMatches>5000) throw Error('Animation V2 selector match limit exceeded');} this.data.tracks.forEach(t=>{try{this.root.querySelectorAll(t.target).forEach(e=>{let a=e.animate(t.keyframes.map(k=>({[t.property]:k.value,offset:k.time/this.data.totalDuration,easing:k.easing||t.easing||'ease-in-out'})),{duration:this.data.totalDuration,iterations:this.data.loop?Infinity:1,fill:'forwards'});a.pause();this.anims.push(a)})}catch{}});}this.anims.forEach(a=>a.pause())}destroy(){this.anims.forEach(a=>a.cancel());this.particles.forEach(p=>{p.a.cancel();p.el.remove()});this.particles=[];this.anims=[]}}`;
    const payload = JSON.stringify({ svg: rec.svg, animation: rec.animation }).replace(/</g, "\\u003c");
    const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:transparent}svg{width:100%;height:100%}</style><div id="stage"></div><script>const P=${payload}; const Runtime=${runtimeSource}; let runtime; window.__setFrame=async(t)=>{runtime?.destroy(); document.getElementById('stage').innerHTML=P.svg; const root=document.querySelector('#stage svg'); if(!root)throw Error('SVG missing'); if(root.querySelectorAll('*').length>20000)throw Error('Animation V2 selector match limit exceeded'); runtime=new Runtime(root,P.animation); runtime.play(); runtime.seek(t); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}; window.__setFrame(0);</script>`;
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    for (let f = 0; f < totalFrames; f++) {
      if (v2Cancelled.has(tempId)) throw new Error("cancelled");
      const t = f * 1000 / fps;
      try {
        await win.webContents.executeJavaScript(`window.__setFrame(${t})`);
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (/selector match limit exceeded|SVG missing/i.test(msg)) {
          appendV2Log({ tempId, taskId, phase: "guard_reject", sha256: rec.sha256, error: msg, detail: `frame ${f} t=${t}` });
        }
        throw e;
      }
      fs.writeFileSync(path.join(frameDir, `frame_${String(f + 1).padStart(4, "0")}.png`), (await win.webContents.capturePage()).toPNG());
      job.progress = Math.round(5 + f / totalFrames * 75);
      if (f % 25 === 0 || f === totalFrames - 1) appendV2Log({ tempId, taskId, phase: "frame", sha256: rec.sha256, progress: job.progress, detail: `frame ${f + 1}/${totalFrames}` });
      onUpdate(job);
    }
    appendV2Log({ tempId, taskId, phase: "encode", sha256: rec.sha256, formats, detail: `encode ${formats.join("+")}` });
    win.destroy(); win = null; const outBase = path.join(dirs.animations, `${(job.originalName || "animation").replace(/[^a-z0-9]+/gi, "_").slice(0, 30)}_${tempId}`); const encoded = await encodeAll(frameDir, outBase, fps, formats, tempId, () => {}); if (encoded.error) throw new Error(encoded.error);
    job.status = "completed"; job.progress = 100; job.outputUrls = encoded.urls; job.frameCount = totalFrames; job.provenance = { source: "IMAGIN Studio Animation V2", sha256: rec.sha256 }; onUpdate(job); taskStore.update(taskId, { status: "COMPLETED", progress: 100, completedAt: new Date().toISOString() });
    appendV2Log({ tempId, taskId, phase: "completed", sha256: rec.sha256, formats, frames: totalFrames, canvas: `${rec.animation.canvas.width}x${rec.animation.canvas.height}`, detail: Object.keys(encoded.urls).join(",") });
    for (const [format, url] of Object.entries(encoded.urls)) { const local = storageUrlToLocal(url); addLibraryAsset({ id: `lib-anim-v2-${tempId}-${format}`, type: "ANIMATION", name: path.basename(url), url, folder: "storage/assets/animations", sourceModule: "ANIMATION", sourceJobId: taskId, mimeType: format === "mp4" ? "video/mp4" : format === "webm" ? "video/webm" : "image/gif", fileSize: `${(fs.statSync(local).size / 1048576).toFixed(2)} MB`, resolution: `${rec.animation.canvas.width}x${rec.animation.canvas.height}`, duration: `${(rec.animation.totalDuration / 1000).toFixed(2)}s`, tags: ["Animation", "V2", format.toUpperCase()], createdAt: new Date().toISOString(), prompt: job.originalName, settings: { animationV2: true, packageId: tempId, provenance: job.provenance, formatList: formats } } as any); }
    if (Object.keys(encoded.urls).length) persistLibrary();
  } catch (err: any) {
    const cancelled = v2Cancelled.has(tempId) || err?.message === "cancelled";
    job.status = cancelled ? "cancelled" : "failed";
    job.error = cancelled ? "cancelled" : err?.message || "Animation V2 render failed";
    onUpdate(job);
    taskStore.update(taskId, { status: cancelled ? "CANCELLED" : "FAILED", error: job.error });
    appendV2Log({ tempId, taskId, phase: cancelled ? "cancelled" : "failed", sha256: rec.sha256, error: job.error, detail: err?.stack?.slice(0, 400) || String(err?.message || err).slice(0, 200) });
  }
  finally {
    if (win && !win.isDestroyed()) win.destroy();
    runningWindows.delete(tempId);
    try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {}
    // Bersihkan mapping untuk semua terminal state — cegah bocor v2TaskIds
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      v2Defs.delete(tempId);
      v2Cancelled.delete(tempId);
      v2TaskIds.delete(taskId);
      for (const [tid, vid] of Array.from(v2TaskIds.entries())) if (vid === tempId) v2TaskIds.delete(tid);
    }
  }
}

/* ── Run job ── */

export async function runAnimationJob(
  tempId: string,
  taskId: string,
  taskStore: TaskStore,
  onUpdate: (job: AnimationJobItem) => void
): Promise<void> {
  if (v2Defs.has(tempId)) return runAnimationV2Job(tempId, taskId, taskStore, onUpdate);
  const job = jobs.get(tempId);
  const defRec = jobDefs.get(tempId);
  if (!job || !defRec) return;
  const { def } = defRec;

  const start = Date.now();
  console.log(`[ANIM] job ${tempId} start: ${def.fps}fps, ${def.durationMs}ms, ${def.width}x${def.height}, formats=${JSON.stringify((def as AnimationDefinition & { formatList?: string[] }).formatList || ["MP4"])}`);
  taskStore.update(taskId, { status: "PROCESSING", progress: 2 });
  job.status = "processing";
  job.progress = 2;
  onUpdate(job);

  const frameDir = path.join(tempRoot, "animation_frames", tempId);
  fs.mkdirSync(frameDir, { recursive: true });

  const fps = def.fps;
  const totalFrames = Math.max(1, Math.round((def.durationMs / 1000) * fps));

  let win: BrowserWindow | null = null;
  try {
    taskStore.update(taskId, { progress: 5, name: `Animating: ${job.originalName} — render frames` });

    // Offscreen window
    win = new BrowserWindow({
      show: false,
      width: def.width,
      height: def.height,
      webPreferences: { offscreen: true },
    });
    runningWindows.set(tempId, win);

    const html = buildFrameHtml(def);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await win.loadURL(dataUrl);
    await new Promise((r) => setTimeout(r, 250)); // biarkan script siap

    // Capture per frame — kontrol manual currentTime
    for (let f = 0; f < totalFrames; f++) {
      if (job.status === "failed" && job.error === "cancelled") {
        throw new Error("cancelled");
      }
      const tMs = (f / totalFrames) * def.durationMs;
      try {
        await win.webContents.executeJavaScript(`window.__setFrame ? window.__setFrame(${tMs}) : null`);
      } catch {}
      const image = await win.webContents.capturePage();
      const png = image.toPNG();
      fs.writeFileSync(path.join(frameDir, `frame_${String(f + 1).padStart(4, "0")}.png`), png);
      const pct = Math.round(5 + (f / totalFrames) * 75);
      job.progress = pct;
      taskStore.update(taskId, { progress: pct, name: `Animating: ${job.originalName} — frame ${f + 1}/${totalFrames}` });
      onUpdate(job);
    }

    // Tutup window
    runningWindows.delete(tempId);
    try { win.destroy(); } catch {}
    win = null;

    // Encode via FFmpeg
    taskStore.update(taskId, { progress: 82, name: `Animating: ${job.originalName} — encoding` });
    const animDir = dirs.animations;
    fs.mkdirSync(animDir, { recursive: true });
    const baseSlug = (job.originalName || "animation")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 30);
    const outBase = path.join(animDir, `${baseSlug}_${tempId}`);

    const wantedFormats: string[] =
      (def as AnimationDefinition & { formatList?: string[] }).formatList?.length
        ? (def as AnimationDefinition & { formatList?: string[] }).formatList!
        : ["MP4"];

    const encodeRes = await encodeAll(frameDir, outBase, fps, wantedFormats, tempId, (step, total) => {
      const pct = Math.round(82 + (step / total) * 14);
      job.progress = pct;
      taskStore.update(taskId, { progress: pct, name: `Animating: ${job.originalName} — encode ${step}/${total}` });
      onUpdate(job);
    });

    // Lottie: selalu generate jika diminta
    if (wantedFormats.includes("Lottie")) {
      const lottiePath = path.join(animDir, `${baseSlug}_${tempId}.json`);
      fs.writeFileSync(lottiePath, buildLottie(def), "utf-8");
      encodeRes.urls.json = `/storage/assets/animations/${path.basename(lottiePath)}`;
    }

    if (encodeRes.error && Object.keys(encodeRes.urls).length === 0) {
      throw new Error(encodeRes.error);
    }

    job.status = "completed";
    job.progress = 100;
    job.outputUrls = encodeRes.urls;
    job.frameCount = totalFrames;
    job.elapsedMs = Date.now() - start;
    onUpdate(job);

    // Register ke Library
    const firstUrl = Object.values(encodeRes.urls)[0];
    if (firstUrl) {
      const sizeBytes = fs.statSync(storageUrlToLocal(firstUrl)).size;
      const dims = `${def.width}x${def.height}`;
      const parentVector = getLibrary().find(
        (a) => a.type === "VECTOR" && a.name === job.originalName
      );
      addLibraryAsset({
        id: `lib-anim-${tempId}`,
        type: "ANIMATION",
        name: path.basename(firstUrl),
        url: firstUrl,
        thumbnailUrl: undefined,
        folder: "storage/assets/animations",
        sourceModule: "ANIMATION",
        sourceJobId: taskId,
        mimeType: path.extname(firstUrl).toLowerCase() === ".mp4" ? "video/mp4" : "application/octet-stream",
        fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        resolution: dims,
        duration: `${(def.durationMs / 1000).toFixed(2)}s`,
        tags: ["Animation", `${fps}fps`, wantedFormats.join("+")],
        createdAt: new Date().toISOString(),
        prompt: job.originalName,
        parentAssetId: parentVector?.id,
        versioned: true,
        settings: { fps, duration: def.durationMs, loop: def.loop, formatList: wantedFormats },
      });
      persistLibrary();
    }

    taskStore.update(taskId, {
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date().toISOString(),
      name: `${job.originalName} — ${wantedFormats.join(" + ")}`,
    });
  } catch (err: any) {
    const cancelled = err?.message === "cancelled";
    job.status = cancelled ? "failed" : "failed";
    job.error = cancelled ? "cancelled" : err?.message || "Animation render gagal";
    job.elapsedMs = Date.now() - start;
    console.error("[ANIM] render failed:", err);
    onUpdate(job);
    taskStore.update(taskId, {
      status: cancelled ? "CANCELLED" : "FAILED",
      error: job.error,
      completedAt: new Date().toISOString(),
    });
  } finally {
    if (win && !win.isDestroyed()) { try { win.destroy(); } catch {} }
    runningWindows.delete(tempId);
    // Cleanup temp frames
    try {
      if (fs.existsSync(frameDir)) fs.rmSync(frameDir, { recursive: true, force: true });
    } catch {}
    jobDefs.delete(tempId);
    try {
      const preview = previews.get(tempId);
      if (preview) { try { fs.unlinkSync(preview.filePath); } catch {} }
      previews.delete(tempId);
    } catch {}
  }
}

function storageUrlToLocal(url: string): string {
  const decoded = decodeURIComponent(url.split("?")[0]);
  const rel = decoded.slice("/storage".length).replace(/^\/+/, "");
  return path.join(storageRoot, rel);
}
