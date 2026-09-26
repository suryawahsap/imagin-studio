/**
 * Regression test — Fitur output vectorize (vec-output.ts).
 *
 * Unit test deterministik (tanpa vtracer/binary):
 *   Parameterized shapes → path yg "hampir" circle/ellipse/rect diganti
 *      primitive sempurna; blob & multi-subpath TIDAK diganti.
 *   Draw style → stroke edges (fill=none + stroke, replacement, non-scale).
 *   Gap filler → copy stroke hanya untuk bentuk yang bersentuhan.
 *
 * Run: npx tsx scripts/test-vector-output.ts
 */

import { applyOutputOptions, applyParameterizedShapes } from "../electron/services/vec/vec-output";

const K = 0.5522847498; // factor cubic quarter circle (SVG)

function qArc(x: number, y: number, r: number, from: number, to: number): string {
  // quarter-arc cubic dari pusat (x,y) radius r, sudut from→to (0 = +x, searah jarum y-down)
  const p0x = x + r * Math.cos(from), p0y = y + r * Math.sin(from);
  const p3x = x + r * Math.cos(to), p3y = y + r * Math.sin(to);
  const arm = r * K;
  const p1 = { x: p0x - arm * Math.sin(from), y: p0y + arm * Math.cos(from) };
  const p2 = { x: p3x + arm * Math.sin(to), y: p3y - arm * Math.cos(to) };
  const p3 = { x: p3x, y: p3y };
  return `C${f(p1.x)},${f(p1.y)} ${f(p2.x)},${f(p2.y)} ${f(p3.x)},${f(p3.y)}`;
}
function f(n: number): string { return String(Math.round(n * 100) / 100); }

function circlePath(cx: number, cy: number, r: number): string {
  return `M${f(cx + r)},${f(cy)}${qArc(cx, cy, r, 0, Math.PI / 2)}${qArc(cx, cy, r, Math.PI / 2, Math.PI)}${qArc(cx, cy, r, Math.PI, Math.PI * 1.5)}${qArc(cx, cy, r, Math.PI * 1.5, Math.PI * 2)}Z`;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const sx = (a: number) => Math.sin(a);
  return `M${f(cx + rx)},${f(cy)}` +
    `C${f(cx + rx)},${f(cy - ry * K)} ${f(cx + rx * K)},${f(cy - ry)} ${f(cx)},${f(cy - ry)}` +
    `C${f(cx - rx * K)},${f(cy - ry)} ${f(cx - rx)},${f(cy - ry * K)} ${f(cx - rx)},${f(cy)}` +
    `C${f(cx - rx)},${f(cy + ry * K)} ${f(cx - rx * K)},${f(cy + ry)} ${f(cx)},${f(cy + ry)}` +
    `C${f(cx + rx * K)},${f(cy + ry)} ${f(cx + rx)},${f(cy + ry * K)} ${f(cx + rx)},${f(cy)}Z`;
}

function cubicLine(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `C${f(mx)},${f(y1)} ${f(mx)},${f(y2)} ${f(x2)},${f(y2)}`;
}

function rectPathCubic(x: number, y: number, w: number, h: number): string {
  // persegi gaya tracе polygon (cubic per sisi) — meniru output spline vtracer
  return `M${x},${y}${cubicLine(x, y, x + w, y)}${cubicLine(x + w, y, x + w, y + h)}${cubicLine(x + w, y + h, x, y + h)}${cubicLine(x, y + h, x, y)}Z`;
}

function rectPath(x: number, y: number, w: number, h: number, r = 0): string {
  if (r <= 0) return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
  // rounded rect via 8 cubic quarter arcs (cukup presisi untuk deteksi)
  return (
    `M${f(x + r)},${y}` +
    `L${f(x + w - r)},${y}` + qArc(x + w - r, y + r, r, -Math.PI / 2, 0) +
    `L${x + w},${f(y + h - r)}` + qArc(x + w - r, y + h - r, r, 0, Math.PI / 2) +
    `L${f(x + r)},${y + h}` + qArc(x + r, y + h - r, r, Math.PI / 2, Math.PI) +
    `L${x},${f(y + r)}` + qArc(x + r, y + r, r, Math.PI, Math.PI * 1.5) +
    `Z`
  );
}

const BLOB = "M43,119.7C18,45.8,129.7,5.9,158,81.3c25.5,68.2-81.7,118.3-115,38.4Z";
const RING = "M100,50a50,50 0 1 0 0.0001,0zM120,50a30,30 0 1 0 0.0001,0z";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail: string) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — ${detail}`); }
}

const SVG = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

console.log("=== TEST VEC-OUTPUT ===\n");

// ── 1. Parameterized shapes ──────────────────────────────────────────────
console.log("1. Parameterized shapes");
{
  const svg = SVG(
    `<path d="${circlePath(140, 80, 40)}" fill="#111"/>` +
    `<path d="${ellipsePath(100, 100, 60, 30)}" fill="#222"/>` +
    `<path d="${rectPathCubic(50, 50, 100, 100)}" fill="#333"/>` +
    `<path d="${rectPath(50, 50, 100, 100, 20)}" fill="#444"/>` +
    `<path d="${BLOB}" fill="#555"/>` +
    `<path d="${RING}" fill="#666"/>`
  );
  const out = applyParameterizedShapes(svg);
  check("circle diganti", /<circle[^>]*cx="140[^"]*"[^>]*r="40"/.test(out), out);
  check("ellipse diganti", /<ellipse[^>]*cx="100[^"]*"[^>]*rx="60[^"]*"[^>]*ry="29[^"]*"/.test(out), out);
  check("rect tajam diganti", /<rect[^>]*x="50"[^>]*width="100"[^>]*height="100"/.test(out), out);
  check("rect bulat diganti", /<rect[^>]*x="50"[^>]*rx="[^"]+"/.test(out), out);
  check("blob tetap path", (out.match(/<path\b/g) || []).length === 2, out);
  check("ring (multi-subpath) tetap path", out.includes(RING), out);
  check("attribute fill dipertahankan", /<circle[^>]*fill="#111"/.test(out), out);
}

// ── 2. Draw style ─────────────────────────────────────────────────────────
console.log("\n2. Draw style (stroke edges)");
{
  const svg = SVG(`<path d="${BLOB}" fill="#ff0000"/>`);
  const out = applyOutputOptions(svg, { drawStyle: "edges", strokeWidth: 1.5, strokeReplacement: "#000000", nonScaleStroke: true });
  check("fill menjadi none", /fill="none"/.test(out), out);
  check("stroke warna replacement", /stroke="#000000"/.test(out), out);
  check("stroke-width 1.5", /stroke-width="1\.5"/.test(out), out);
  check("non-scale", /vector-effect="non-scaling-stroke"/.test(out), out);
  check("d tidak berubah", out.includes(BLOB), out);
}

// Stroke shapes (tanpa replacement → warna sendiri)
{
  const svg = SVG(`<path d="${BLOB}" fill="#ff0000"/>`);
  const out = applyOutputOptions(svg, { drawStyle: "stroke", strokeWidth: 1 });
  check("stroke warna sendiri saat tanpa replacement", /stroke="#ff0000"/.test(out), out);
}

// ── 3. Gap filler ─────────────────────────────────────────────────────────
console.log("\n3. Gap filler");
{
  // dua persegi bersentuhan (edge sama) + satu terpisah jauh
  const svg = SVG(
    `<path d="${rectPath(20, 20, 80, 80)}" fill="#a00"/>` +
    `<path d="${rectPath(100, 20, 80, 80)}" fill="#0a0"/>` +
    `<path d="${rectPath(400, 400, 40, 40)}" fill="#00a"/>`
  );
  const out = applyOutputOptions(svg, { gapFiller: true, gapFillerWidth: 2 });
  const under = out.match(/<g>([\s\S]*?)<\/g>/);
  check("under-group dibuat", under !== null, out);
  const underCount = under ? (under[1].match(/<path\b/g) || []).length : 0;
  check("hanya 2 bentuk bersentuhan yang di-stroke", underCount === 2, `underCount=${underCount}`);
  check("bentuk terpisah tidak ikut", !out.match(/stroke="#00a"/), out);
  check("stroke pakai warna bentuk sendiri", /stroke="#a00"/.test(out), out);
}

// Gap filler + parameterized bersamaan → primitif ikut di-stroke
{
  const svg = SVG(`<path d="${circlePath(90, 60, 30)}" fill="#a00"/><path d="${rectPath(120, 60, 40, 40)}" fill="#0a0"/>`);
  const out = applyOutputOptions(svg, { gapFiller: true, gapFillerWidth: 2, parameterizedShapes: true });
  check("circle di-stroke di under-group", /<circle[^>]*stroke="#a00"/.test(out), out);
  check("circle tetap ada (top)", /<circle[^>]*fill="#a00"/.test(out) || /<circle[^\>]*fill="#a00"/.test(out), out);
}

console.log(`\n=== HASIL: ${pass} lulus, ${fail} gagal ===`);
process.exit(fail === 0 ? 0 : 1);