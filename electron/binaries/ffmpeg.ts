import { spawn, ChildProcess } from "child_process";
import { which } from "./paths";

export interface ClipSpec {
  input: string;
  output: string;
  start?: number;
  end?: number;
  width?: number;
  height?: number;
  fps?: number;
  subtitles?: { srtPath: string; style?: string };
  crop?: {
    mode: "original" | "blurred" | "smart" | "manual";
    sourceWidth?: number; // dimensi video sumber (dari probe)
    sourceHeight?: number;
    panX?: number; // 0–1, posisi tengah window (manual)
    panY?: number;
    /** Path tracking (AI): pusat crop (px sumber) per detik — crop dinamis 1-pass. */
    dynPoints?: { t: number; cx: number; cy: number }[];
    segmentStart?: number;
  };
  onProgress?: (percent: number) => void;
}

export interface FfmpegResult {
  ok: boolean;
  output?: string;
  error?: string;
  exitCode?: number | null;
}

export interface SilenceInterval {
  start: number;
  end: number;
}

/**
 * Deteksi interval hening via filter ffmpeg `silencedetect`.
 * Mengembalikan daftar jendela hening (detik) di dalam file.
 */
export function detectSilence(
  input: string,
  opts: { noiseDb?: number; minSilenceSec?: number } = {}
): Promise<{ silence: SilenceInterval[]; duration: number }> {
  const noiseDb = opts.noiseDb ?? -30;
  const minSilenceSec = opts.minSilenceSec ?? 0.5;
  return new Promise((resolve) => {
    const bin = which("ffmpeg");
    if (!bin) {
      resolve({ silence: [], duration: 0 });
      return;
    }
    const child = spawn(
      bin,
      ["-i", input, "-af", `silencedetect=noise=${noiseDb}dB:d=${minSilenceSec}`, "-f", "null", "-"],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", () => {
      const silence: SilenceInterval[] = [];
      let duration = 0;
      const lines = stderr.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const startM = lines[i].match(/silence_start:\s*([\d.]+)/);
        if (startM) {
          const next = lines[i + 1]?.match(/silence_end:\s*([\d.]+)/);
          const s = parseFloat(startM[1]);
          const e = next ? parseFloat(next[1]) : s + minSilenceSec;
          silence.push({ start: s, end: e });
        }
        const durM = lines[i].match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (durM) {
          duration = parseInt(durM[1]) * 3600 + parseInt(durM[2]) * 60 + parseFloat(durM[3]);
        }
      }
      resolve({ silence, duration });
    });
    child.on("error", () => resolve({ silence: [], duration: 0 }));
  });
}

export function getFfmpegBin(): string | null {
  return which("ffmpeg");
}

function getDurationSec(input: string): Promise<number> {
  return new Promise((resolve) => {
    const bin = which("ffprobe");
    if (!bin) { resolve(0); return; }
    const child = spawn(bin, ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", input], { windowsHide: true });
    let out = "";
    child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
    child.on("close", () => {
      const n = parseFloat(out.trim());
      resolve(Number.isFinite(n) ? n : 0);
    });
    child.on("error", () => resolve(0));
  });
}

/**
 * Bangun ekspresi piecewise-linear utk sumbu crop (x atau y) dari path points.
 * ffmpeg filter `crop` mengevaluasi x/y per-frame dgn variabel `t` (detik).
 * Points harus sudah dijaga urut & dalam ruang output (t - segmentStart).
 */
function buildAxisExpression(
  points: { t: number; cx: number; cy: number }[],
  axis: "x" | "y",
  min: number,
  max: number
): string {
  const isX = axis === "x";
  const vals = points.map((p) => (isX ? p.cx : p.cy));
  if (vals.length === 0) return String((min + max) / 2);
  if (vals.length === 1) return String(Math.min(max, Math.max(min, vals[0])));

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const first = clamp(vals[0]);
  // Interpolasi linier antar titik + clamp. Fallback: titik terakhir saat t melewati.
  let expr = `clip(${clamp(vals[vals.length - 1])} + ${(0).toFixed(0)}, ${min.toFixed(2)}, ${max.toFixed(2)})`;
  for (let i = points.length - 2; i >= 0; i--) {
    const t0 = points[i].t;
    const t1 = points[i + 1].t;
    const v0 = clamp(vals[i]);
    const v1 = clamp(vals[i + 1]);
    const dt = Math.max(1e-4, t1 - t0);
    // x(t) = v0 + (v1-v0)*(t-t0)/dt
    const interp = `(${v0.toFixed(3)} + (${v1.toFixed(3)} - ${v0.toFixed(3)}) * (t - ${t0.toFixed(3)}) / ${dt.toFixed(3)})`;
    expr = `if(lt(t, ${t1.toFixed(3)}), clip(${interp}, ${min.toFixed(2)}, ${max.toFixed(2)}), ${expr})`;
  }
  // Sebelum titik pertama → tahan di nilai awal.
  const tFirst = points[0].t;
  expr = `if(lt(t, ${tFirst.toFixed(3)}), clip(${first.toFixed(3)}, ${min.toFixed(2)}, ${max.toFixed(2)}), ${expr})`;
  return expr;
}

/**
 * Bangun chain filter untuk crop sesuai mode. Mengembalikan string -vf
 * (tanpa subtitles — ditambahkan pemanggil) atau null jika tidak perlu.
 */
function buildCropFilters(spec: ClipSpec): string | null {
  const { width: W, height: H, crop } = spec;
  if (!W || !H) return null;
  if (!crop) {
    // Default lama: fit + pad center
    return `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
  }

  const sw = crop.sourceWidth || W;
  const sh = crop.sourceHeight || H;
  const targetAspect = W / H;
  const sourceAspect = sw / sh;

  // Hitung crop window (w,h) yg mengikuti rasio target.
  let cropW = sw;
  let cropH = sh;
  if (sourceAspect > targetAspect) {
    cropW = sh * targetAspect;
    cropH = sh;
  } else {
    cropW = sw;
    cropH = sw / targetAspect;
  }
  // Clamp agar tidak melebihi source
  cropW = Math.min(cropW, sw);
  cropH = Math.min(cropH, sh);
  if (cropW <= 0 || cropH <= 0) return null;

  const cx = crop.mode === "manual" && crop.panX !== undefined ? crop.panX * sw : sw / 2;
  const cy = crop.mode === "manual" && crop.panY !== undefined ? crop.panY * sh : sh / 2;
  const x = Math.max(0, Math.min(sw - cropW, cx - cropW / 2));
  const y = Math.max(0, Math.min(sh - cropH, cy - cropH / 2));

  switch (crop.mode) {
    case "original":
      // Fit penuh tanpa crop: scale mengecil + pad
      return `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`;
    case "blurred": {
      // Background = blur penuh target; foreground = fit original di tengah.
      // Butuh graph split + overlay.
      const bg = `[bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=luma_radius=20:luma_power=2[bg2]`;
      const fg = `[fg]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg2]`;
      const ov = `[bg2][fg2]overlay=(W-w)/2:(H-h)/2`;
      return `split[bg][fg];${bg};${fg};${ov}`;
    }
    case "smart": {
      // Crop dinamis (AI tracking): x/y dari path interpolation per-frame.
      const pts = crop.dynPoints || [];
      if (pts.length > 0) {
        const shift = crop.segmentStart ?? 0;
        // Filter points utk jendela segmen ini, relatif ke start segmen.
        const segEnd = (spec.end ?? Infinity) + (spec.start || 0);
        const rel = pts
          .map((p) => ({ ...p, t: p.t - shift }))
          .filter((p) => p.t >= -0.5 && p.t <= (spec.end !== undefined ? segEnd - shift + 0.5 : Infinity))
          .sort((a, b) => a.t - b.t);
        // Tambahkan anchor di tepi jendela agar interpolasi tidak melompat jauh.
        if (rel.length > 0) {
          // Escape koma di dalam expression agar filtergraph ffmpeg tidak
          // memecahnya jadi filter terpisah (`,` = pemisah filter).
          const esc = (s: string) => s.replace(/,/g, "\\,");
          const ex = esc(buildAxisExpression(rel, "x", 0, sw - cropW));
          const ey = esc(buildAxisExpression(rel, "y", 0, sh - cropH));
          return `crop=${cropW}:${cropH}:${ex}:${ey},scale=${W}:${H}`;
        }
      }
      // Fallback: center statis
      return `crop=${cropW}:${cropH}:${x}:${y},scale=${W}:${H}`;
    }
    case "manual": {
      // Crop ke rasio target lalu scale penuh (tanpa bar).
      return `crop=${cropW}:${cropH}:${x}:${y},scale=${W}:${H}`;
    }
    default:
      return null;
  }
}

export async function runFfmpeg(spec: ClipSpec): Promise<FfmpegResult> {
  const bin = getFfmpegBin();
  if (!bin) {
    return { ok: false, error: "binary_missing", exitCode: null };
  }

  const duration = await getDurationSec(spec.input);
  const args: string[] = ["-y"];
  if (spec.start !== undefined) {
    args.push("-ss", String(spec.start));
  }
  args.push("-i", spec.input);
  if (spec.end !== undefined) {
    args.push("-t", String(Math.max(0.1, spec.end - (spec.start || 0))));
  }
  const vfFilters: string[] = [];
  const cropFilter = buildCropFilters(spec);
  if (cropFilter) vfFilters.push(cropFilter);
  if (spec.subtitles?.srtPath) {
    // Escape path untuk filter ffmpeg: ' : \ ,
    const escaped = spec.subtitles.srtPath
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .replace(/,/g, "\\,");
    const style = spec.subtitles.style || "Fontsize=16,PrimaryColour=&HFFFFFF&OutlineColour=&H000000&BorderStyle=1&Outline=1";
    vfFilters.push(`subtitles='${escaped}':force_style='${style}'`);
  }
  if (vfFilters.length > 0) {
    args.push("-vf", vfFilters.join(","));
  }
  if (spec.fps) {
    args.push("-r", String(spec.fps));
  }
  args.push("-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "-movflags", "+faststart");
  args.push(spec.output);

  return new Promise((resolve) => {
    let stderr = "";
    let lastPercent = -1;
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });

    child.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      if (duration > 0) {
        const m = text.match(/time=(\d+):(\d+):([\d.]+)/);
        if (m) {
          const secs = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
          const pct = Math.min(100, Math.round((secs / duration) * 100));
          if (pct !== lastPercent) {
            lastPercent = pct;
            spec.onProgress?.(pct);
          }
        }
      }
    });
    child.on("close", (code) => {
      const ok = code === 0;
      resolve({ ok, output: ok ? spec.output : undefined, error: ok ? undefined : stderr.slice(-600), exitCode: code });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null });
    });
  });
}

export async function probeVideo(input: string): Promise<{ duration: number; width: number; height: number }> {
  const bin = which("ffprobe");
  if (!bin) return { duration: 0, width: 0, height: 0 };
  return new Promise((resolve) => {
    const child = spawn(bin, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format", "-show_streams",
      input,
    ], { windowsHide: true });
    let out = "";
    child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
    child.on("close", () => {
      try {
        const data = JSON.parse(out);
        const stream = data.streams?.find((s: any) => s.codec_type === "video");
        resolve({
          duration: parseFloat(data.format?.duration || "0") || 0,
          width: stream?.width || 0,
          height: stream?.height || 0,
        });
      } catch {
        resolve({ duration: 0, width: 0, height: 0 });
      }
    });
    child.on("error", () => resolve({ duration: 0, width: 0, height: 0 }));
  });
}

/** Ekstrak audio mono 16kHz WAV — format optimal untuk whisper.cpp. */
export function extractAudio(input: string, output: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const bin = which("ffmpeg");
    if (!bin) {
      resolve({ ok: false, error: "binary_missing" });
      return;
    }
    const child = spawn(
      bin,
      ["-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      resolve(code === 0 ? { ok: true } : { ok: false, error: stderr.slice(-400) });
    });
    child.on("error", (err) => resolve({ ok: false, error: err.message }));
  });
}
