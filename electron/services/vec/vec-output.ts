/**
 * vec-output.ts — Fitur output ala Vectorizer.AI (opsi ekspor di panduan).
 *
 * Bukan mesin tracing — ini transformasi pasca-trace yang bisa dilakukan di
 * level SVG (tanpa training / tanpa ML):
 *
 *   Parameterized shapes — deteksi path yang "hampir" lingkaran/elips/
 *      persegi, lalu ganti dengan <circle>/<ellipse>/<rect> geometri sempurna.
 *      Dipakai HANYA jika fit error sangat kecil (konservatif — tidak
 *      memaksa bentuk yang sebenarnya bukan).
 *   Draw style — Fill / Stroke Shapes / Stroke Edges (goresan, untuk
 *      laser cutting & engraving).
 *   Gap filler — goresan tipis berwarna di bawah batas antar bentuk yang
 *      bersentuhan, untuk menutup celah putih (antialiasing seam) umum.
 *
 * Konvensi:
 *   - Semua transformasi hanya menyentuh elemen bentuk self-closing
 *     (<path .../>, <circle .../>, <rect .../>, <ellipse .../>).
 *   - Gap filler hanya untuk drawStyle "fill" (strokes butuh fill).
 */

import { parseSvgPath, samplePathPoints, Point } from "../svg-path-parser";

export interface VecOutputOptions {
  gapFiller?: boolean;
  gapFillerWidth?: number;      // px, default 2 (rekomendasi panduan 1.5–2)
  parameterizedShapes?: boolean;
  drawStyle?: "fill" | "stroke" | "edges";
  strokeWidth?: number;         // px, default 1
  strokeReplacement?: string;   // hex; kosong = pakai warna bentuk sendiri
  nonScaleStroke?: boolean;     // vector-effect="non-scaling-stroke"
}

type ShapeTag = "path" | "circle" | "ellipse" | "rect" | "line" | "polygon";

interface ShapeEl {
  tag: ShapeTag;
  attrs: Record<string, string>;
  fill?: string;
}

// ── Parsing / rebuild element ────────────────────────────────────────────────

const SHAPE_RE = /<(path|circle|ellipse|rect|line|polygon)\b([^>]*?)\/>/gi;

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z:_-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out[m[1]] = m[2];
  return out;
}

function buildAttrs(a: Record<string, string>): string {
  return Object.entries(a)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

function normalizeColor(c: string | undefined): string | undefined {
  if (!c) return undefined;
  const v = c.trim().toLowerCase();
  if (v === "none" || v === "currentcolor" || v === "inherit" || v === "transparent" || v === "") {
    return undefined;
  }
  return v;
}

function parseElement(full: string): ShapeEl | null {
  const m = full.match(/<(path|circle|ellipse|rect|line|polygon)\b([^>]*?)\/>/i);
  if (!m) return null;
  const tag = m[1] as ShapeTag;
  const attrs = parseAttrs(m[2]);
  return { tag, attrs, fill: normalizeColor(attrs.fill) };
}

// ── Bounding box (untuk adjacency gap filler) ───────────────────────────────

function primitiveBBox(el: ShapeEl): { x: number; y: number; w: number; h: number } | null {
  const a = el.attrs;
  if (el.tag === "circle") {
    const cx = parseFloat(a.cx), cy = parseFloat(a.cy), r = parseFloat(a.r);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) return null;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }
  if (el.tag === "ellipse") {
    const cx = parseFloat(a.cx), cy = parseFloat(a.cy);
    const rx = parseFloat(a.rx), ry = parseFloat(a.ry);
    if (![cx, cy, rx, ry].every(Number.isFinite)) return null;
    let theta = 0;
    const t = a.transform;
    if (t) {
      const rm = t.match(/rotate\(\s*(-?[\d.]+)/);
      if (rm) theta = (parseFloat(rm[1]) * Math.PI) / 180;
    }
    const hw = Math.sqrt(rx * rx * Math.cos(theta) ** 2 + ry * ry * Math.sin(theta) ** 2);
    const hh = Math.sqrt(rx * rx * Math.sin(theta) ** 2 + ry * ry * Math.cos(theta) ** 2);
    return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 };
  }
  if (el.tag === "rect") {
    const x = parseFloat(a.x) || 0, y = parseFloat(a.y) || 0;
    const w = parseFloat(a.width), h = parseFloat(a.height);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    return { x, y, w, h };
  }
  if (el.tag === "path" && a.d) {
    // Path dengan command yang tak diparse (A/S/T/H/V) → sampel tidak valid, skip.
    if (/[AaSsTtHhVv]/.test(a.d)) return null;
    const pts = samplePathPoints(a.d, 16);
    if (pts.length < 4) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return null;
}

function boxesOverlapExpanded(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad: number
): boolean {
  return (
    a.x - pad < b.x + b.w + pad &&
    a.x + a.w + pad > b.x - pad &&
    a.y - pad < b.y + b.h + pad &&
    a.y + a.h + pad > b.y - pad
  );
}

// ── 1. Parameterized shapes ─────────────────────────────────────────────────

interface ShapeFit {
  tag: string;
  attrs: Record<string, string>;
  error: number;
}

function distToRectBoundary(p: Point, x: number, y: number, w: number, h: number): number {
  const dx = Math.max(x - p.x, 0, p.x - (x + w));
  const dy = Math.max(y - p.y, 0, p.y - (y + h));
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  return Math.min(p.x - x, x + w - p.x, p.y - y, y + h - p.y);
}

function sampleRoundedRect(x: number, y: number, w: number, h: number, r: number): Point[] {
  const pts: Point[] = [];
  const gap = 0.75; // spasi target antar titik (px) — cukup rapat untuk hausdorff akurat
  const seg = (p1: Point, p2: Point) => {
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const c = Math.max(1, Math.ceil(len / gap));
    for (let i = 0; i <= c; i++) {
      const t = i / c;
      pts.push({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
    }
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const sweep = Math.abs(a1 - a0) * r;
    const c = Math.max(1, Math.ceil(sweep / gap));
    for (let i = 0; i <= c; i++) {
      const a = a0 + ((a1 - a0) * i) / c;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  seg({ x: x + r, y }, { x: x + w - r, y });
  arc(x + w - r, y + r, -Math.PI / 2, 0);
  seg({ x: x + w, y: y + r }, { x: x + w, y: y + h - r });
  arc(x + w - r, y + h - r, 0, Math.PI / 2);
  seg({ x: x + w - r, y: y + h }, { x: x + r, y: y + h });
  arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  seg({ x, y: y + h - r }, { x, y: y + r });
  arc(x + r, y + r, Math.PI, (3 * Math.PI) / 2);
  return pts;
}

/** max-min distance: setiap titik A → jarak ke titik B terdekat. */
function hausdorffMax(A: Point[], B: Point[]): number {
  let worst = 0;
  for (const p of A) {
    let best = Infinity;
    for (const q of B) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < best) best = d;
    }
    if (best > worst) worst = best;
  }
  return worst;
}

function fitCircle(pts: Point[]): ShapeFit | null {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  let radius = 0;
  for (const p of pts) radius += Math.hypot(p.x - cx, p.y - cy);
  radius /= pts.length;
  if (!Number.isFinite(radius) || radius <= 0.5) return null;
  let maxErr = 0;
  for (const p of pts) {
    const d = Math.abs(Math.hypot(p.x - cx, p.y - cy) - radius);
    if (d > maxErr) maxErr = d;
  }
  if (maxErr > Math.max(0.5, radius * 0.02)) return null;
  return {
    tag: "circle",
    attrs: { cx: r2(cx), cy: r2(cy), r: r2(radius) },
    error: maxErr / radius,
  };
}

function fitEllipse(pts: Point[]): ShapeFit | null {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  let c11 = 0, c22 = 0, c12 = 0;
  for (const p of pts) {
    const dx = p.x - cx, dy = p.y - cy;
    c11 += dx * dx; c22 += dy * dy; c12 += dx * dy;
  }
  c11 /= pts.length; c22 /= pts.length; c12 /= pts.length;
  const tr = c11 + c22;
  const det = c11 * c22 - c12 * c12;
  const disc = Math.sqrt(Math.max(0, (tr / 2) ** 2 - det));
  const l1 = tr / 2 + disc;   // eigenvalue terbesar
  const l2 = Math.max(tr / 2 - disc, 1e-9);
  const a = Math.sqrt(2 * l1); // semisumbu mayor
  const b = Math.sqrt(2 * l2); // semisumbu minor
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0.5 || a <= 0.5) return null;
  const theta = 0.5 * Math.atan2(2 * c12, c11 - c22); // radian
  let maxErr = 0;
  for (const p of pts) {
    const dx = p.x - cx, dy = p.y - cy;
    const rx = Math.cos(-theta) * dx - Math.sin(-theta) * dy;
    const ry = Math.sin(-theta) * dx + Math.cos(-theta) * dy;
    const n = (rx * rx) / (a * a) + (ry * ry) / (b * b);
    const err = Math.abs(n - 1);
    if (err > maxErr) maxErr = err;
  }
  if (maxErr > 0.04) return null;
  const deg = (theta * 180) / Math.PI;
  const attrs: Record<string, string> = { cx: r2(cx), cy: r2(cy), rx: r2(a), ry: r2(b) };
  if (Math.abs(deg) > 0.5) attrs.transform = `rotate(${r2(deg)} ${r2(cx)} ${r2(cy)})`;
  return { tag: "ellipse", attrs, error: maxErr };
}

function fitRect(pts: Point[]): ShapeFit | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX, h = maxY - minY;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 1 || h <= 1) return null;
  const tol = Math.max(0.5, Math.min(w, h) * 0.012);

  // Cek persegi tajam dulu
  let sharpErr = 0;
  let sides = { top: 0, bottom: 0, left: 0, right: 0 };
  for (const p of pts) {
    const d = distToRectBoundary(p, minX, minY, w, h);
    if (d > sharpErr) sharpErr = d;
    if (Math.abs(p.y - minY) <= tol) sides.top++;
    if (Math.abs(p.y - maxY) <= tol) sides.bottom++;
    if (Math.abs(p.x - minX) <= tol) sides.left++;
    if (Math.abs(p.x - maxX) <= tol) sides.right++;
  }
  if (sharpErr <= tol && sides.top > 0 && sides.bottom > 0 && sides.left > 0 && sides.right > 0) {
    return {
      tag: "rect",
      attrs: { x: r2(minX), y: r2(minY), width: r2(w), height: r2(h) },
      error: sharpErr / Math.min(w, h),
    };
  }

  // Coba persegi dengan sudut membulat — cari radius terbaik.
  const minDim = Math.min(w, h);
  const steps = 14;
  let best: { r: number; err: number } | null = null;
  for (let i = 1; i <= steps; i++) {
    const r = (minDim * i * 0.3) / steps;
    if (r <= 0) continue;
    const ideal = sampleRoundedRect(minX, minY, w, h, r);
    const err = hausdorffMax(pts, ideal);
    if (!best || err < best.err) best = { r, err };
  }
  if (best && best.err <= Math.max(0.75, minDim * 0.02)) {
    const attrs: Record<string, string> = {
      x: r2(minX), y: r2(minY), width: r2(w), height: r2(h),
    };
    if (best.r > Math.max(0.5, minDim * 0.01)) attrs.rx = r2(best.r);
    return { tag: "rect", attrs, error: best.err / minDim };
  }
  return null;
}

function r2(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function analyzePath(d: string): ShapeFit | null {
  if (/[AaSsTtHhVv]/.test(d)) return null; // command yang tidak diparse — lewati
  const commands = parseSvgPath(d);
  let realSubpaths = 0;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].type === "M" && (i === 0 || commands[i - 1].type !== "M")) realSubpaths++;
  }
  if (realSubpaths !== 1) return null; // lubang / multi-outline — jangan diganti
  const pts = samplePathPoints(d, 24);
  if (pts.length < 16) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(first.x - last.x, first.y - last.y) > 1) return null; // tidak tertutup

  // Prioritaskan: lingkaran → elips → persegi (sharp/rounded). Pakai yang fit-error terkecil.
  const cands = [fitCircle(pts), fitEllipse(pts), fitRect(pts)]
    .filter((f): f is ShapeFit => f !== null);
  if (cands.length === 0) return null;
  cands.sort((a, b) => a.error - b.error);
  return cands[0];
}

export function applyParameterizedShapes(svg: string): string {
  return svg.replace(SHAPE_RE, (full) => {
    const el = parseElement(full);
    if (!el || el.tag !== "path" || !el.attrs.d) return full;
    const fit = analyzePath(el.attrs.d);
    if (!fit) return full;
    const attrs = { ...fit.attrs };
    for (const k of Object.keys(el.attrs)) {
      if (k === "d" || k === "class" || k === "id" || k === "style") continue;
      if (k === "fill") continue;
      attrs[k] = el.attrs[k];
    }
    if (el.attrs.fill) attrs.fill = el.attrs.fill;
    return `<${fit.tag} ${buildAttrs(attrs)}/>`;
  });
}

// ── 2. Draw style (Fill / Stroke Shapes / Stroke Edges) ─────────────────────

function applyDrawStyle(svg: string, o: VecOutputOptions): string {
  const color = o.strokeReplacement?.trim() || null;
  const width = o.strokeWidth || 1;
  const nonScale = o.nonScaleStroke ? ' vector-effect="non-scaling-stroke"' : "";
  return svg.replace(SHAPE_RE, (full) => {
    const el = parseElement(full);
    if (!el) return full;
    const isShape =
      el.tag === "circle" || el.tag === "ellipse" || el.tag === "rect" ||
      (el.tag === "path" && !!el.attrs.d);
    if (!isShape) return full;
    const a: Record<string, string> = {};
    for (const [k, v] of Object.entries(el.attrs)) {
      if (k === "fill") continue;
      if (k === "stroke" || k === "stroke-width" || k === "stroke-linejoin" || k === "vector-effect") continue;
      a[k] = v;
    }
    const fill = el.fill || "#000000";
    a.fill = "none";
    a.stroke = color || fill;
    a["stroke-width"] = String(width);
    a["stroke-linejoin"] = "round";
    return `<${el.tag} ${buildAttrs(a)}${nonScale}/>`;
  });
}

// ── 3. Gap filler ───────────────────────────────────────────────────────────

function applyGapFiller(svg: string, width: number): string {
  const els: ShapeEl[] = [];
  const src: string[] = [];
  svg.replace(SHAPE_RE, (full) => {
    const el = parseElement(full);
    if (el) { els.push(el); src.push(full); }
    return full;
  });
  if (els.length === 0) return svg;

  const pad = Math.max(0.5, width * 2);
  const boxes = els.map((el) => primitiveBBox(el));
  const adjacent = new Array<boolean>(els.length).fill(false);
  for (let i = 0; i < els.length; i++) {
    const bi = boxes[i];
    if (!bi) continue;
    for (let j = i + 1; j < els.length; j++) {
      const bj = boxes[j];
      if (!bj) continue;
      if (boxesOverlapExpanded(bi, bj, pad)) { adjacent[i] = true; adjacent[j] = true; }
    }
  }

  const under: string[] = [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!adjacent[i] || !el.fill) continue;
    const a: Record<string, string> = {};
    for (const [k, v] of Object.entries(el.attrs)) {
      if (k === "fill") continue;
      if (k === "stroke" || k === "stroke-width" || k === "stroke-linejoin") continue;
      a[k] = v;
    }
    a.fill = el.fill;
    a.stroke = el.fill;
    a["stroke-width"] = String(width);
    a["stroke-linejoin"] = "round";
    under.push(`<${el.tag} ${buildAttrs(a)}/>`);
  }
  if (under.length === 0) return svg;

  const group = `<g>${under.join("")}</g>`;
  return svg.replace(/<svg\b[^>]*>/, (m) => m + group);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function applyOutputOptions(svg: string, o: VecOutputOptions): string {
  if (!o) return svg;
  if (o.parameterizedShapes) svg = applyParameterizedShapes(svg);
  if (o.drawStyle && o.drawStyle !== "fill") {
    svg = applyDrawStyle(svg, o);
  } else if (o.gapFiller) {
    svg = applyGapFiller(svg, o.gapFillerWidth || 2);
  }
  return svg;
}
