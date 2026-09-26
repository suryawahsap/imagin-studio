import { spawn, ChildProcess } from "child_process";
import { resolveBinary } from "./paths";

export interface VtracerOptions {
  input: string;
  output: string;
  mode?: "spline" | "polygon" | "pixel";
  preset?: "bw" | "poster" | "photo";
  clustering?: "color-cluster" | "bw" | "watershed";
  hierarchical?: "stacked" | "cutout";
  filterSpeckle?: number;
  colorPrecision?: number;
  gradientStep?: number;
  optimize?: number;
  maxColors?: number;
  simplify?: number;         // curve simplification tolerance — v1.0
  pathPrecision?: number;
  threshold?: number;
  adaptive?: boolean;        // Bradley-Roth adaptive thresholding — v1.0
  adaptiveWindow?: number;
  adaptiveT?: number;        // adaptive sensitivity (% below local mean, default 15)
  watershedDetail?: number;  // watershed hierarchy cut level (0–255)
  palette?: string;          // fixed palette: "#hex1,#hex2,..." — v1.0
  onProgress?: (percent: number) => void;
  abortSignal?: { aborted: boolean };
}

export interface VtracerResult {
  ok: boolean;
  output?: string;
  error?: string;
  exitCode?: number | null;
  aborted?: boolean;
}

export function getVtracerBin(): string | null {
  return resolveBinary("vtracer", "vtracer");
}

export function runVtracer(options: VtracerOptions): Promise<VtracerResult> {
  return new Promise((resolve) => {
    const bin = getVtracerBin();
    if (!bin) {
      resolve({ ok: false, error: "binary_missing", exitCode: null });
      return;
    }

    const args: string[] = [
      "-i", options.input,
      "-o", options.output,
      "-m", options.mode || "spline",
    ];

    if (options.preset)                  args.push("--preset", options.preset);
    if (options.clustering)              args.push("--clustering", options.clustering);
    if (options.hierarchical)            args.push("--hierarchical", options.hierarchical);
    if (options.filterSpeckle !== undefined) args.push("-f", String(options.filterSpeckle));
    if (options.colorPrecision !== undefined) args.push("-p", String(options.colorPrecision));
    if (options.gradientStep !== undefined) args.push("-g", String(options.gradientStep));
    if (options.optimize !== undefined)  args.push("--optimize", String(options.optimize));
    if (options.maxColors !== undefined) args.push("--max-colors", String(options.maxColors));
    if (options.simplify !== undefined)  args.push("--simplify", String(options.simplify));
    if (options.pathPrecision !== undefined) args.push("--path-precision", String(options.pathPrecision));
    if (options.threshold !== undefined) args.push("--threshold", String(options.threshold));
    if (options.adaptive)                args.push("--adaptive");
    if (options.adaptiveWindow !== undefined) args.push("--adaptive-window", String(options.adaptiveWindow));
    if (options.adaptiveT !== undefined) args.push("--adaptive-t", String(options.adaptiveT));
    if (options.watershedDetail !== undefined) args.push("--watershed-detail", String(options.watershedDetail));

    // Palette — v1.0: snap warna ke palette tetap
    if (options.palette && options.palette.trim()) {
      args.push("--palette", options.palette.trim());
    }

    let stdout = "";
    let stderr = "";
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });

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
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      const aborted = options.abortSignal?.aborted === true;
      const ok = code === 0;
      resolve({
        ok,
        output: ok ? options.output : undefined,
        error: ok ? undefined : (stderr || stdout).slice(0, 500),
        exitCode: code,
        aborted,
      });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null, aborted: options.abortSignal?.aborted });
    });
  });
}
