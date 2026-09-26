import { spawn, ChildProcess } from "child_process";
import path from "path";
import { resolveBinary } from "./paths";

export interface Waifu2xOptions {
  input: string;
  output: string;
  scale?: 1 | 2 | 4; // 1 = denoise only, 2 = 2x, 4 = 4x
  noise?: 0 | 1 | 2 | 3; // noise reduction level (0–3)
  model?: "cunet" | "upconv";
  onProgress?: (percent: number) => void;
  /** Saat true, child process di-kill (BUG-005 cancel per item). */
  abortSignal?: { aborted: boolean };
}

export interface Waifu2xResult {
  ok: boolean;
  output?: string;
  error?: string;
  exitCode?: number | null;
  aborted?: boolean;
}

export function getWaifu2xBin(): string | null {
  return resolveBinary("waifu2x", "waifu2x-ncnn-vulkan");
}

export function getWaifu2xModelDir(model: "cunet" | "upconv" = "cunet"): string | null {
  const bin = getWaifu2xBin();
  if (!bin) return null;
  return path.join(path.dirname(bin), `models-${model}`);
}

export function runWaifu2x(options: Waifu2xOptions): Promise<Waifu2xResult> {
  return new Promise((resolve) => {
    const bin = getWaifu2xBin();
    if (!bin) {
      resolve({ ok: false, error: "binary_missing", exitCode: null });
      return;
    }

    const modelDir = getWaifu2xModelDir(options.model || "cunet");
    const args: string[] = [
      "-i", options.input,
      "-o", options.output,
      "-s", String(options.scale ?? 2),
      "-n", String(options.noise ?? 1),
    ];
    if (modelDir) args.push("-m", modelDir);

    let stderr = "";
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });

    // Cek abort: kill child bila flag aborted di-set (BUG-005)
    const checkAbort = setInterval(() => {
      if (options.abortSignal?.aborted && !child.killed) {
        try { child.kill("SIGKILL"); } catch {}
      }
    }, 100);
    child.on("close", () => clearInterval(checkAbort));

    child.stdout?.on("data", (d: Buffer) => {
      const text = d.toString();
      const m = text.match(/(\d+(?:\.\d+)?)%/);
      if (m && options.onProgress) options.onProgress(parseFloat(m[1]));
    });
    child.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      const m = text.match(/(\d+(?:\.\d+)?)%/);
      if (m && options.onProgress) options.onProgress(parseFloat(m[1]));
    });
    child.on("close", (code) => {
      const aborted = options.abortSignal?.aborted === true;
      const ok = code === 0;
      resolve({
        ok,
        output: ok ? options.output : undefined,
        error: ok ? undefined : (stderr || "").slice(0, 500),
        exitCode: code,
        aborted,
      });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null, aborted: options.abortSignal?.aborted });
    });
  });
}
