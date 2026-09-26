/**
 * ups-format.ts — Konversi output format + flatten alpha (rebuild-plan.md F2.3).
 *
 * Konversi PNG → JPEG/WebP pakai ffmpeg (sudah ada di PATH). Fallback: pngjs
 * (hanya untuk white-background flatten, karena pngjs tidak punya encoder
 * JPEG/WebP — kalau ffmpeg tidak ada, tetap output PNG).
 *
 * resizeLongEdge — exact aspect-preserving resize via ffmpeg lanczos.
 */

import fs from "fs";
import { PNG } from "pngjs";
import { spawn } from "child_process";
import { which } from "../../binaries/paths";

/** Flatten alpha ke putih (whiteBackground). */
export function flattenAlphaToWhite(pngPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(pngPath)
      .pipe(new PNG())
      .on("parsed", function (this: any) {
        const png = this;
        for (let i = 0; i < png.data.length; i += 4) {
          const a = png.data[i + 3];
          if (a < 255) {
            const alpha = a / 255;
            png.data[i] = Math.round(png.data[i] * alpha + 255 * (1 - alpha));
            png.data[i + 1] = Math.round(png.data[i + 1] * alpha + 255 * (1 - alpha));
            png.data[i + 2] = Math.round(png.data[i + 2] * alpha + 255 * (1 - alpha));
            png.data[i + 3] = 255;
          }
        }
        fs.writeFileSync(pngPath, PNG.sync.write(png));
        resolve();
      })
      .on("error", reject);
  });
}

/**
 * Konversi PNG ke JPEG/WebP via ffmpeg.
 * Return true jika berhasil, false jika ffmpeg tidak tersedia (caller fallback ke PNG).
 */
export function convertFormat(
  inputPng: string,
  outputPath: string,
  format: "jpeg" | "webp",
  options: { quality?: number } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = which("ffmpeg");
    if (!ffmpeg) {
      resolve(false);
      return;
    }
    const quality = options.quality ?? 92;
    const args: string[] = ["-y", "-i", inputPng];
    if (format === "jpeg") {
      args.push("-q:v", String(Math.round(quality / 2)), outputPath);
    } else {
      args.push("-q:v", String(Math.round(quality / 2)), "-pix_fmt", "yuv420p", outputPath);
    }
    const child = spawn(ffmpeg, args, { windowsHide: true });
    child.on("close", (code) => {
      resolve(code === 0 && fs.existsSync(outputPath));
    });
    child.on("error", () => resolve(false));
  });
}

/**
 * Exact aspect-preserving resize of the long edge to targetLongEdge pixels.
 * Uses ffmpeg lanczos scale filter. Returns true on success, false if ffmpeg
 * unavailable (caller should append warning, not fail the job).
 */
export function resizeLongEdge(
  inputPath: string,
  outputPath: string,
  targetLongEdge: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = which("ffmpeg");
    if (!ffmpeg) {
      resolve(false);
      return;
    }
    const args = [
      "-y", "-i", inputPath,
      "-vf", `scale='if(gt(iw,ih),${targetLongEdge},-2)':'if(gt(iw,ih),-2,${targetLongEdge})':flags=lanczos`,
      outputPath,
    ];
    const child = spawn(ffmpeg, args, { windowsHide: true });
    child.on("close", (code) => {
      resolve(code === 0 && fs.existsSync(outputPath));
    });
    child.on("error", () => resolve(false));
  });
}
