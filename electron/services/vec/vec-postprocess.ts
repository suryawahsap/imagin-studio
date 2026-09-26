/**
 * vec-postprocess.ts — Artboard + center + single-pass SVGO (rebuild-plan.md F1.4).
 *
 * Yang dibuang: shape fitting (circle/rect), multi-pass SVGO, layer-by-color.
 * Yang dipertahankan: artboard sizing, center artwork, single-pass SVGO cleanup.
 *
 * BBOX dihitung dengan path parser yang benar (bukan regex angka berpasangan) —
 * menangani command absolut & relatif (M/L/H/V/C/S/Q/T/A/Z) dan control point,
 * sehingga viewBox selalu menutupi seluruh artwork (tidak terpotong).
 */

import fs from "fs";
import { applyOutputOptions, VecOutputOptions } from "./vec-output";

export interface PostprocessOptions {
  artboard: boolean;
  padding: number;
  centerArtwork: boolean;
  targetAspectRatio?: "1:1" | "4:5" | "4:3" | "3:2" | "2:3" | "16:9" | "source";
  /** Fitur output ala Vectorizer.AI: parameterized shapes, draw style, gap filler. */
  output?: VecOutputOptions;
}

const RATIOS: Record<string, number> = {
  "1:1": 1,
  "4:5": 0.8,
  "4:3": 1.3333,
  "3:2": 1.5,
  "2:3": 0.6667,
  "16:9": 1.7778,
};

interface ViewBox { x: number; y: number; w: number; h: number; }

function parseViewBox(svg: string): ViewBox | null {
  const m = svg.match(/viewBox\s*=\s*["']([\d.\s-]+)["']/i);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
}

function parseWidthHeight(svg: string): { w: number; h: number } | null {
  const m = svg.match(/<svg\b[^>]*\bwidth\s*=\s*["']([\d.]+)["'][^>]*\bheight\s*=\s*["']([\d.]+)["']/i);
  const m2 = svg.match(/<svg\b[^>]*\bheight\s*=\s*["']([\d.]+)["'][^>]*\bwidth\s*=\s*["']([\d.]+)["']/i);
  const mm = m || m2;
  if (!mm) return null;
  const w = parseFloat(mm[1]);
  const h = parseFloat(mm[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

interface Point { x: number; y: number; }

/**
 * Hitung bounding box path `d` dengan parser SVG path yang benar.
 * Amankan dari terpotong: ambil min/max SEMUA titik (endpoint + control point).
 * Kurva selalu berada dalam convex hull control point-nya, jadi hasilnya
 * dijamin menutupi artwork tanpa clipping.
 */
export function pathDataBBox(d: string): ViewBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0, startX = 0, startY = 0;
  let cmd = "M";
  let args: number[] = [];
  let prevC2: Point | null = null;
  let prevQ1: Point | null = null;

  const add = (px: number, py: number) => {
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  };

  const flush = () => {
    if (args.length === 0) return;
    const rel = cmd === cmd.toLowerCase();
    const u = cmd.toUpperCase();

    if (u === "M") {
      for (let i = 0; i + 1 < args.length; i += 2) {
        const ax = rel ? x + args[i] : args[i];
        const ay = rel ? y + args[i + 1] : args[i + 1];
        if (i === 0) { x = ax; y = ay; startX = ax; startY = ay; add(ax, ay); }
        else { x = ax; y = ay; add(ax, ay); }
      }
    } else if (u === "L") {
      for (let i = 0; i + 1 < args.length; i += 2) {
        x = rel ? x + args[i] : args[i];
        y = rel ? y + args[i + 1] : args[i + 1];
        add(x, y);
      }
    } else if (u === "H") {
      for (const v of args) { x = rel ? x + v : v; add(x, y); }
    } else if (u === "V") {
      for (const v of args) { y = rel ? y + v : v; add(x, y); }
    } else if (u === "C") {
      for (let i = 0; i + 5 < args.length; i += 6) {
        const p1 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
        const p2 = { x: rel ? x + args[i + 2] : args[i + 2], y: rel ? y + args[i + 3] : args[i + 3] };
        const p3 = { x: rel ? x + args[i + 4] : args[i + 4], y: rel ? y + args[i + 5] : args[i + 5] };
        add(x, y); add(p1.x, p1.y); add(p2.x, p2.y); add(p3.x, p3.y);
        x = p3.x; y = p3.y;
        prevC2 = p2;
      }
    } else if (u === "S") {
      for (let i = 0; i + 3 < args.length; i += 4) {
        const c1 = prevC2 ? { x: 2 * x - prevC2.x, y: 2 * y - prevC2.y } : { x, y };
        const c2 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
        const p3 = { x: rel ? x + args[i + 2] : args[i + 2], y: rel ? y + args[i + 3] : args[i + 3] };
        add(x, y); add(c1.x, c1.y); add(c2.x, c2.y); add(p3.x, p3.y);
        x = p3.x; y = p3.y;
        prevC2 = c2;
      }
    } else if (u === "Q") {
      for (let i = 0; i + 3 < args.length; i += 4) {
        const p1 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
        const p2 = { x: rel ? x + args[i + 2] : args[i + 2], y: rel ? y + args[i + 3] : args[i + 3] };
        add(x, y); add(p1.x, p1.y); add(p2.x, p2.y);
        x = p2.x; y = p2.y;
        prevQ1 = p1;
      }
    } else if (u === "T") {
      for (let i = 0; i + 1 < args.length; i += 2) {
        const p1 = prevQ1 ? { x: 2 * x - prevQ1.x, y: 2 * y - prevQ1.y } : { x, y };
        const p2 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
        add(x, y); add(p1.x, p1.y); add(p2.x, p2.y);
        x = p2.x; y = p2.y;
        prevQ1 = p1;
      }
    } else if (u === "A") {
      // rx ry x-rot large-arc sweep x y — endpoint penting; perluas dengan rx/ry
      // sebagai over-approximation agar tidak pernah terpotong.
      for (let i = 0; i + 6 < args.length; i += 7) {
        const rx = Math.abs(args[i]);
        const ry = Math.abs(args[i + 1]);
        const ax = rel ? x + args[i + 5] : args[i + 5];
        const ay = rel ? y + args[i + 6] : args[i + 6];
        add(x, y); add(ax, ay);
        add(x + rx, y + ry); add(x - rx, y - ry);
        add(ax + rx, ay + ry); add(ax - rx, ay - ry);
        x = ax; y = ay;
      }
    } else if (u === "Z") {
      x = startX; y = startY;
    }
    args = [];
  };

  const tokenRe = /([a-zA-Z])|(-?\d*\.?\d+(?:e[+-]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(d)) !== null) {
    if (m[1]) { flush(); cmd = m[1]; }
    else args.push(parseFloat(m[2]));
  }
  flush();

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Hitung bbox seluruh konten SVG (path + primitif) — aman no-clip. */
function computePathBBox(svg: string): ViewBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const re = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const bb = pathDataBBox(m[1]);
    if (!bb) continue;
    if (bb.x < minX) minX = bb.x;
    if (bb.y < minY) minY = bb.y;
    if (bb.x + bb.w > maxX) maxX = bb.x + bb.w;
    if (bb.y + bb.h > maxY) maxY = bb.y + bb.h;
  }
  // Primitif (circle/ellipse/rect) — termasuk yang dihasilkan parameterized shapes
  const reP = /<(circle|ellipse|rect)\b[^>]*\/?>/gi;
  let pm: RegExpExecArray | null;
  const prim: Array<[number, number, number, number]> = [];
  while ((pm = reP.exec(svg)) !== null) {
    const tag = pm[1];
    const a = pm[0];
    const num = (n: string): number => {
      const v = a.match(new RegExp(`\\b${n}\\s*=\\s*["']([^"']+)["']`, "i"));
      return v ? parseFloat(v[1]) : NaN;
    };
    let bx = 0, by = 0, bw = 0, bh = 0;
    if (tag === "circle") {
      const cx = num("cx"), cy = num("cy"), r = num("r");
      if ([cx, cy, r].every(Number.isFinite)) { bx = cx - r; by = cy - r; bw = r * 2; bh = r * 2; }
    } else if (tag === "ellipse") {
      const cx = num("cx"), cy = num("cy"), rx = num("rx"), ry = num("ry");
      let theta = 0;
      const tm = a.match(/transform\s*=\s*["'][^"']*rotate\(\s*(-?[\d.]+)/i);
      if (tm) theta = (parseFloat(tm[1]) * Math.PI) / 180;
      if ([cx, cy, rx, ry].every(Number.isFinite)) {
        const hw = Math.sqrt(rx * rx * Math.cos(theta) ** 2 + ry * ry * Math.sin(theta) ** 2);
        const hh = Math.sqrt(rx * rx * Math.sin(theta) ** 2 + ry * ry * Math.cos(theta) ** 2);
        bx = cx - hw; by = cy - hh; bw = hw * 2; bh = hh * 2;
      }
    } else {
      const x = num("x") || 0, y = num("y") || 0, w = num("width"), h = num("height");
      if (Number.isFinite(w) && Number.isFinite(h)) { bx = x; by = y; bw = w; bh = h; }
    }
    prim.push([bx, by, bw, bh]);
  }
  for (const [bx, by, bw, bh] of prim) {
    if (!(bw > 0 && bh > 0)) continue;
    if (bx < minX) minX = bx;
    if (by < minY) minY = by;
    if (bx + bw > maxX) maxX = bx + bw;
    if (by + bh > maxY) maxY = by + bh;
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Postprocess SVG:
 * Hitung bbox artwork (path parser benar)
 * Tambah padding
 * Center artwork di artboard (optional)
 * Fit ke target aspect ratio (optional)
 * Jamin viewBox menutupi seluruh konten (tidak terpotong)
 * Single-pass SVGO (hanya cleanup ringan)
 */
export async function postprocessSvg(
  svgPath: string,
  outputPath: string,
  options: PostprocessOptions
): Promise<void> {
  let svg = fs.readFileSync(svgPath, "utf-8");

  // Fitur output (parameterized shapes / draw style / gap filler) — diterapkan
  // SEBELUM bbox, agar bbox & artboard menutupi elemen hasil transformasi.
  if (options.output) {
    svg = applyOutputOptions(svg, options.output);
  }

  const vb = parseViewBox(svg);
  const bbox = computePathBBox(svg) || vb;
  const hasContent = bbox && bbox.w > 0 && bbox.h > 0;

  if (hasContent) {
    if (options.artboard) {
      const pad = options.padding || 0;
      let artW = bbox!.w + pad * 2;
      let artH = bbox!.h + pad * 2;

      // Target aspect ratio
      let ratio: number | null = null;
      if (options.targetAspectRatio && options.targetAspectRatio !== "source") {
        ratio = RATIOS[options.targetAspectRatio] || null;
      }
      if (ratio) {
        const cur = artW / artH;
        if (cur > ratio) artH = artW / ratio;
        else artW = artH * ratio;
      }

      // Center artwork: viewBox origin mundur setengah dari total slack
      // artW = bbox.w + pad*2 (+ extra jika aspect ratio diperbesar)
      // slack horizontal = artW - bbox.w → dibagi 2 = margin kiri = margin kanan
      let offsetX = bbox!.x - (artW - bbox!.w) / 2;
      let offsetY = bbox!.y - (artH - bbox!.h) / 2;

      // Jika TIDAK center: artwork rata kiri-atas dengan padding saja
      if (!options.centerArtwork) {
        offsetX = bbox!.x - pad;
        offsetY = bbox!.y - pad;
      }

      const newVb = `${offsetX.toFixed(2)} ${offsetY.toFixed(2)} ${artW.toFixed(2)} ${artH.toFixed(2)}`;
      svg = svg.replace(/viewBox\s*=\s*["'][^"']*["']/i, `viewBox="${newVb}"`);
      if (!/viewBox\s*=\s*["']/i.test(svg)) {
        svg = svg.replace(/<svg\b/, `<svg viewBox="${newVb}"`);
      }
      // Sinkronkan width/height = ukuran artboard
      svg = svg.replace(/<svg\b([^>]*)\bwidth\s*=\s*["'][^"']*["']/i, `<svg$1 width="${Math.round(artW)}"`);
      svg = svg.replace(/<svg\b([^>]*)\bheight\s*=\s*["'][^"']*["']/i, `<svg$1 height="${Math.round(artH)}"`);
    } else {
      // Tidak ada artboard (mis. photo) — jamin viewBox menutupi artwork agar
      // tidak terpotong, gabungkan dengan viewport source (0 0 W H).
      const wh = parseWidthHeight(svg);
      const vx = Math.min(bbox!.x, 0);
      const vy = Math.min(bbox!.y, 0);
      const vx2 = Math.max(bbox!.x + bbox!.w, wh ? wh.w : 0);
      const vy2 = Math.max(bbox!.y + bbox!.h, wh ? wh.h : 0);
      const newVb = `${vx.toFixed(2)} ${vy.toFixed(2)} ${(vx2 - vx).toFixed(2)} ${(vy2 - vy).toFixed(2)}`;
      svg = svg.replace(/viewBox\s*=\s*["'][^"']*["']/i, `viewBox="${newVb}"`);
      if (!/viewBox\s*=\s*["']/i.test(svg)) {
        svg = svg.replace(/<svg\b/, `<svg viewBox="${newVb}"`);
      }
    }
  } else if (vb && !/viewBox\s*=\s*["']/i.test(svg)) {
    svg = svg.replace(/<svg\b/, `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"`);
  }

  // Single-pass SVGO — hanya cleanup ringan (bukan multi-pass preset-default)
  try {
    const { optimize } = await import("svgo");
    const res = optimize(svg, {
      multipass: false,
      plugins: [
        { name: "removeComments" },
        { name: "removeMetadata" },
        { name: "cleanupIds" },
        { name: "collapseGroups" },
        { name: "removeUselessDefs" },
        // JANGAN mergePaths — path beda warna bisa ter-merge
        { name: "convertPathData", params: { floatPrecision: 2 } },
      ],
    });
    svg = res.data;
  } catch {
    // SVGO gagal — pakai SVG apa adanya
  }

  fs.writeFileSync(outputPath, svg, "utf-8");
}
