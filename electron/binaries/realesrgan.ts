import { spawn, ChildProcess } from "child_process";
import path from "path";
import { resolveBinary } from "./paths";

export interface RealesrganOptions {
  input: string;
  output: string;
  model?: string;
  modelDir?: string;
  scale?: 2 | 3 | 4;
  tileSize?: number;
  onProgress?: (percent: number) => void;
  /** Saat true, child process di-kill (BUG-005 cancel per item). */
  abortSignal?: { aborted: boolean };
}

export interface RealesrganResult {
  ok: boolean;
  output?: string;
  error?: string;
  exitCode?: number | null;
  aborted?: boolean;
}

export function getRealesrganBin(): string | null {
  return resolveBinary("realesrgan-ncnn", "upscayl-bin");
}

export function getModelDir(): string | null {
  const bin = getRealesrganBin();
  if (!bin) return null;
  const dir = path.join(path.dirname(bin), "models");
  return dir;
}

export function runRealesrgan(options: RealesrganOptions): Promise<RealesrganResult> {
  return new Promise((resolve) => {
    const bin = getRealesrganBin();
    if (!bin) {
      resolve({ ok: false, error: "binary_missing", exitCode: null });
      return;
    }

    const modelDir = options.modelDir || getModelDir() || "";
    const args: string[] = [
      "-i", options.input,
      "-o", options.output,
      "-m", modelDir,
      "-n", options.model || "realesrgan-x4plus",
      "-s", String(options.scale || 4),
    ];
    if (options.tileSize && options.tileSize > 0) {
      args.push("-t", String(options.tileSize));
    }

    let stdout = "";
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
      stdout += text;
      const m = text.match(/(\d+(?:\.\d+)?)%/);
      if (m && options.onProgress) options.onProgress(parseFloat(m[1]));
    });
    child.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      // realesrgan-ncnn report progress di stderr: "processing 12/100 ..."
      const m = text.match(/(\d+(?:\.\d+)?)\s*\/\s*100/) || text.match(/(\d+(?:\.\d+)?)%/);
      if (m && options.onProgress) options.onProgress(parseFloat(m[1]));
    });
    child.on("close", (code) => {
      const aborted = options.abortSignal?.aborted === true;
      const ok = code === 0;
      resolve({ ok, output: ok ? options.output : undefined, error: ok ? undefined : (stderr || stdout).slice(0, 500), exitCode: code, aborted });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null, aborted: options.abortSignal?.aborted });
    });
  });
}
