/**
 * vec-bg.ts — background removal via edge flood-fill using pngjs.
 * Stdlib only (pngjs already in deps). No new deps.
 */

import fs from 'fs';
import { PNG } from 'pngjs';

type RGB = { r: number; g: number; b: number };

function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Strip solid background from a PNG using edge flood-fill.
 * Reads inputPath, writes to outputPath.
 * Returns { stripped: true } if background was removed, false if skipped (mixed border).
 * Tolerance in RGB Euclidean distance (default 30).
 */
export function stripBackground(
  inputPath: string,
  outputPath: string,
  tolerance: number = 30
): { stripped: boolean } {
  const buf = fs.readFileSync(inputPath);
  const png = PNG.sync.read(buf);
  const { width, height } = png;

  // Collect all border pixels
  const borderPixels: RGB[] = [];
  for (let x = 0; x < width; x++) {
    borderPixels.push({ r: png.data[(0 * width + x) * 4], g: png.data[(0 * width + x) * 4 + 1], b: png.data[(0 * width + x) * 4 + 2] });
    borderPixels.push({ r: png.data[((height - 1) * width + x) * 4], g: png.data[((height - 1) * width + x) * 4 + 1], b: png.data[((height - 1) * width + x) * 4 + 2] });
  }
  for (let y = 1; y < height - 1; y++) {
    borderPixels.push({ r: png.data[(y * width + 0) * 4], g: png.data[(y * width + 0) * 4 + 1], b: png.data[(y * width + 0) * 4 + 2] });
    borderPixels.push({ r: png.data[(y * width + width - 1) * 4], g: png.data[(y * width + width - 1) * 4 + 1], b: png.data[(y * width + width - 1) * 4 + 2] });
  }

  // Histogram quantized to 8 levels per channel (32-step)
  const hist: Record<string, number> = {};
  for (const c of borderPixels) {
    const key = `${Math.round(c.r / 32) * 32},${Math.round(c.g / 32) * 32},${Math.round(c.b / 32) * 32}`;
    hist[key] = (hist[key] || 0) + 1;
  }
  let maxCount = 0;
  let dominantKey = '';
  for (const [key, count] of Object.entries(hist)) {
    if (count > maxCount) {
      maxCount = count;
      dominantKey = key;
    }
  }

  const dominanceRatio = maxCount / borderPixels.length;
  // If no clear dominant background (>60% of border pixels) → skip
  if (dominanceRatio < 0.6) {
    fs.copyFileSync(inputPath, outputPath);
    return { stripped: false };
  }

  const [r, g, b] = dominantKey.split(',').map(Number);
  const seedColor: RGB = { r, g, b };

  // BFS from border pixels that match seedColor within tolerance
  const visited = new Uint8Array(width * height);
  const queue: { x: number; y: number }[] = [];

  const enqueueBorder = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const pi = idx * 4;
    const pc = { r: png.data[pi], g: png.data[pi + 1], b: png.data[pi + 2] };
    if (colorDistance(pc, seedColor) <= tolerance) {
      visited[idx] = 1;
      queue.push({ x, y });
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueBorder(x, 0);
    enqueueBorder(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueBorder(0, y);
    enqueueBorder(width - 1, y);
  }

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const idx = y * width + x;
    // Set alpha to 0
    png.data[idx * 4 + 3] = 0;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      const pi = nIdx * 4;
      const pc = { r: png.data[pi], g: png.data[pi + 1], b: png.data[pi + 2] };
      if (colorDistance(pc, seedColor) <= tolerance) {
        visited[nIdx] = 1;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  fs.writeFileSync(outputPath, PNG.sync.write(png));
  return { stripped: true };
}