import { spawn, ChildProcess } from "child_process";
import { which } from "./paths";

export interface InkscapeResult {
  ok: boolean;
  output?: string;
  error?: string;
  exitCode?: number | null;
}

export function getInkscapeBin(): string | null {
  return which("inkscape");
}

export function svgToEps(svgPath: string, epsPath: string): Promise<InkscapeResult> {
  return new Promise((resolve) => {
    const bin = getInkscapeBin();
    if (!bin) {
      resolve({ ok: false, error: "binary_missing", exitCode: null });
      return;
    }
    const args = [svgPath, "--export-type=eps", `--export-filename=${epsPath}`];
    let stderr = "";
    let stdout = "";
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });
    child.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      const ok = code === 0;
      resolve({ ok, output: ok ? epsPath : undefined, error: ok ? undefined : (stderr || stdout).slice(0, 500), exitCode: code });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null });
    });
  });
}

export function svgToPng(svgPath: string, pngPath: string, width: number, height: number): Promise<InkscapeResult> {
  return new Promise((resolve) => {
    const bin = getInkscapeBin();
    if (!bin) {
      resolve({ ok: false, error: "binary_missing", exitCode: null });
      return;
    }
    const args = [
      svgPath,
      "--export-type=png",
      `--export-filename=${pngPath}`,
      "-w",
      String(width),
      "-h",
      String(height),
    ];
    let stderr = "";
    let stdout = "";
    const child: ChildProcess = spawn(bin, args, { windowsHide: true });
    child.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => {
      const ok = code === 0;
      resolve({ ok, output: ok ? pngPath : undefined, error: ok ? undefined : (stderr || stdout).slice(0, 500), exitCode: code });
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message, exitCode: null });
    });
  });
}
