import { spawn, ChildProcess } from "child_process";
import { resolveBinary } from "./paths";

export interface WhisperOptions {
  input: string;       // path audio (wav/mp3/ogg/flac)
  model?: string;      // nama file model (default ggml-small.bin)
  language?: "auto" | string; // "auto", "en", "id", etc.
  outputFormat?: "srt" | "vtt" | "txt" | "json";
  outputDir?: string;
  outputFileBase?: string; // path lengkap tanpa ekstensi (utk -of)
  translate?: boolean;
  maxLen?: number;     // max segment length in characters
  onProgress?: (percent: number) => void;
  abortSignal?: { aborted: boolean };
}

export interface WhisperResult {
  ok: boolean;
  outputPath?: string;
  error?: string;
  exitCode?: number | null;
  aborted?: boolean;
}

export function getWhisperBin(): string | null {
  return resolveBinary("whisper", "whisper-cli");
}

export function getWhisperModel(): string | null {
  return resolveBinary("whisper", "models", "ggml-small.bin");
}

export function runWhisper(options: WhisperOptions): Promise<WhisperResult> {
  const bin = getWhisperBin();
  if (!bin) {
    return Promise.resolve({ ok: false, error: "binary_missing", exitCode: null });
  }
  if (options.abortSignal?.aborted) {
    return Promise.resolve({ ok: false, error: "aborted", exitCode: null, aborted: true });
  }

  const model = options.model || "ggml-small.bin";
  const modelPath = resolveBinary("whisper", "models", model);
  const name = options.input.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "audio";
  let finalExt = options.outputFormat ? "." + options.outputFormat : ".srt";

  const args: string[] = ["-m", modelPath || model, "-f", options.input, "-l", options.language || "auto"];
  const fmtExt: Record<string, string> = { srt: ".srt", vtt: ".vtt", txt: ".txt", json: ".json" };
  if (options.outputFormat) {
    const fmtFlag: Record<string, string> = {
      srt: "-osrt", vtt: "-ovtt", txt: "-otxt", json: "-oj",
    };
    const flag = fmtFlag[options.outputFormat];
    if (flag) args.push(flag);
    finalExt = fmtExt[options.outputFormat];
    // Tempat output: eksplisit (outputFileBase) atau turunan dari input.
    const base = options.outputFileBase;
    if (base) args.push("-of", base);
    else if (options.outputDir) {
      const name = options.input.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "audio";
      args.push("-of", `${options.outputDir}/${name}`);
    }
  }
  if (options.translate) args.push("-tr");
  if (options.maxLen) args.push("-ml", String(options.maxLen));
  // -pp (print-progress) bukan -np: supaya output `[mm:ss / mm:ss]` di stderr
  // muncul dan `onProgress` di runWhisper bisa di-parse. -np menonaktifkannya
  // → progress bar task macet di 2% selama transkripsi.
  args.push("-pp");

  return new Promise((resolve) => {
    let stderr = "";
    let lastPercent = -1;
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });

    child.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      // whisper.cpp progress, dua format:
      //  - baru: "whisper_print_progress_callback: progress =  25%"
      //  - lama: "[00:07 / 00:30]" atau "[00:07]"
      const mPct = text.match(/progress\s*=\s*(\d{1,3})\s*%/i);
      if (mPct) {
        const pct = Math.min(100, parseInt(mPct[1], 10));
        if (pct !== lastPercent) {
          lastPercent = pct;
          options.onProgress?.(pct);
        }
      }
      const m = text.match(/\[(\d+):(\d+)(?:\s*\/\s*(\d+):(\d+))?\]/);
      if (m) {
        const cur = parseInt(m[1]) * 60 + parseInt(m[2]);
        if (m[3] && m[4]) {
          const total = parseInt(m[3]) * 60 + parseInt(m[4]);
          const pct = total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
          if (pct !== lastPercent) {
            lastPercent = pct;
            options.onProgress?.(pct);
          }
        }
      }
    });
    child.stdout?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      const aborted = options.abortSignal?.aborted === true;
      if (aborted) {
        resolve({ ok: false, error: "aborted", exitCode: code, aborted: true });
        return;
      }
      const ok = code === 0;
      const outPath = options.outputFileBase
        ? `${options.outputFileBase}${finalExt}`
        : options.outputDir
          ? `${options.outputDir}/${name}${finalExt}`
          : undefined;
      resolve({ ok, outputPath: ok ? outPath : undefined, error: ok ? undefined : stderr.slice(-800), exitCode: code });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null });
    });
  });
}