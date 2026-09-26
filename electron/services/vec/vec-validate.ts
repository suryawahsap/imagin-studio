/**
 * vec-validate.ts — Validator jujur (rebuild-plan.md F1.5).
 *
 * Yang dibuang: auto-fix, quality score 0-100 yang kompleks, breakdown 5
 * kategori, gap detection yang rawan false-positive.
 *
 * Yang dipertahankan: hanya metric yang actionable → score 3-tier.
 */

import fs from "fs";
import { samplePathPoints } from "../svg-path-parser";

export interface VecValidation {
  pathCount: number;
  tinyPathCount: number;    // path < 0.1% canvas
  selfIntersections: number;
  isEmpty: boolean;
  score: "good" | "warn" | "bad";
  summary: string;          // satu kalimat untuk user
}

function segmentsIntersect(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
  const d1 = cross(b.x1 - a.x1, b.y1 - a.y1, a.x2 - a.x1, a.y2 - a.y1);
  const d2 = cross(b.x2 - a.x1, b.y2 - a.y1, a.x2 - a.x1, a.y2 - a.y1);
  const d3 = cross(a.x1 - b.x1, a.y1 - b.y1, b.x2 - b.x1, b.y2 - b.y1);
  const d4 = cross(a.x2 - b.x1, a.y2 - b.y1, b.x2 - b.x1, b.y2 - b.y1);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function validateSvg(svgPath: string): VecValidation {
  let raw = "";
  try {
    raw = fs.readFileSync(svgPath, "utf-8");
  } catch {
    return { pathCount: 0, tinyPathCount: 0, selfIntersections: 0, isEmpty: true, score: "bad", summary: "File SVG tidak bisa dibaca." };
  }

  // Path di-dedupe berdasarkan d — gap-filler / under-stroke menggandakan node
  // geometri identik; hanya hitung geometri unik agar score jujur.
  const dSet = new Set<string>();
  const pathRe = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(raw)) !== null) dSet.add(m[1]);

  const pathCount = dSet.size;
  const hasShapes = pathCount > 0 || /<circle\b|<rect\b|<ellipse\b|<polygon\b|<line\b/.test(raw);
  const isEmpty = !hasShapes;

  // Tiny paths — d pendek (< 20 char) = noise (dedupe juga)
  let tinyPathCount = 0;
  for (const d of dSet) {
    if (!d.trim()) continue;
    if (d.length < 20) tinyPathCount++;
  }

  // Self-intersection — sampling titik DI KURVA (bukan control point), per-geometri unik
  let selfIntersections = 0;
  for (const d of dSet) {
    const pts = samplePathPoints(d);
    if (pts.length < 8) continue;
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y });
    }
    const capped = segs.slice(0, 200);
    for (let a = 0; a < capped.length && selfIntersections < 60; a++) {
      for (let b = a + 2; b < capped.length; b++) {
        if (b === a + 1) continue;
        if (segmentsIntersect(capped[a], capped[b])) {
          selfIntersections++;
          if (selfIntersections >= 60) break;
        }
      }
    }
  }

  // Scoring 3-tier
  let score: VecValidation["score"];
  let summary: string;

  if (isEmpty) {
    score = "bad";
    summary = "Hasil kosong — tidak ada path yang dihasilkan.";
  } else if (pathCount > 1000 || tinyPathCount > 50) {
    score = "bad";
    summary = `Terlalu banyak path (${pathCount}) / noise (${tinyPathCount} tiny) — coba assetType lain.`;
  } else if (pathCount < 500 && tinyPathCount < 20 && selfIntersections < 5) {
    score = "good";
    summary = `${pathCount} path, bersih.`;
  } else {
    score = "warn";
    summary = `${pathCount} path, ${tinyPathCount} tiny, ${selfIntersections} self-intersection — perlu dicek.`;
  }

  return { pathCount, tinyPathCount, selfIntersections, isEmpty, score, summary };
}
