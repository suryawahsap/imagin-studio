import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { dirs } from "../binaries/paths";
import type { AnimV2Package, ImportedAnimV2Package } from "./animation-v2-types";

const REQUIRED = ["scene.svg", "animation.json", "runtime.js", "index.html", "manifest.json"] as const;
const MAX_ARCHIVE = 25 * 1024 * 1024, MAX_ENTRY = 12 * 1024 * 1024, MAX_TOTAL = 30 * 1024 * 1024, MAX_ENTRIES = 8, MAX_RATIO = 100;
const PROPERTIES = new Set(["transform", "opacity", "fill", "stroke-width"]);
const EASINGS = new Set(["linear", "ease", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"]);
const MAX_ERRORS = 12, MAX_TRACKS = 200, MAX_EMITTERS = 50, MAX_KEYFRAMES = 60;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const push = (errors: string[], message: string) => { if (errors.length < MAX_ERRORS) errors.push(message); };
const importedPackages = new Map<string, { packageDir: string; sceneSvg: string; animation: AnimV2Package; manifest: any; sha256: string }>();

function safeSvg(svg: string): string[] {
  const errors: string[] = [];
  if (svg.length > MAX_ENTRY) return ["scene.svg is too large"];
  // Validasi root SVG tanpa import internal svgo (exports tidak izinkan ./lib/parser.js di svgo 4.x)
  const trimmed = svg.trim();
  const openCount = (svg.match(/<svg\b[^>]*>/gi) || []).length;
  const closeCount = (svg.match(/<\/svg\s*>/gi) || []).length;
  if (openCount !== 1 || closeCount !== 1 || !/^<svg[\s>]/i.test(trimmed) || !/<\/svg\s*>\s*$/i.test(trimmed)) {
    errors.push("scene.svg must have one SVG root");
  } else if (/<svg\b[^>]*>[\s\S]*?<svg\b/i.test(svg)) {
    errors.push("scene.svg is malformed");
  }
  if (/<!doctype|<!\[cdata|<!entity/i.test(svg)) errors.push("scene.svg contains a declaration");
  const allowedTags = /^(svg|g|path|circle|rect|ellipse|polygon|polyline|line|defs)$/i;
  for (const match of svg.matchAll(/<\/?\s*([A-Za-z][\w:-]*)\b([^>]*)>/g)) {
    if (!allowedTags.test(match[1])) { errors.push("scene.svg contains an unsupported element"); break; }
    const attrs = match[2];
    // Izinkan xmlns="http://www.w3.org/2000/svg" (value http) — jangan flag sebagai external
    const attrsForExternalCheck = attrs.replace(/\sxmlns\s*=\s*["'][^"']*["']/gi, "");
    if (/\bon[a-z]+\s*=|\b(?:href|xlink:href)\s*=|url\s*\(|@import|expression\s*\(|behavior\s*:|javascript:|data:/i.test(attrsForExternalCheck)) { errors.push("scene.svg contains an active or external attribute"); break; }
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(attrs)) { errors.push("scene.svg contains control characters"); break; }
    const names = [...attrs.matchAll(/\s([A-Za-z_:][\w:.-]*)\s*=/g)].map(a => a[1].toLowerCase());
    const allowedExact = new Set(["id", "data-role", "data-animatable", "data-label", "d", "cx", "cy", "r", "x", "y", "width", "height", "rx", "ry", "x1", "x2", "y1", "y2", "points", "viewbox", "fill", "stroke", "stroke-width", "opacity", "transform", "style", "xmlns", "version", "desc", "stroke-linejoin", "stroke-linecap", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "fill-opacity"]);
    if (names.some(name => !(allowedExact.has(name) || name.startsWith("data-") || name.startsWith("aria-")))) { errors.push("scene.svg contains an unsupported attribute"); break; }
  }
  if (/<\s*(animate|set|animateMotion|animateTransform|filter|mask|pattern|clipPath|use|image|foreignObject|script|iframe|object|embed)\b/i.test(svg)) errors.push("scene.svg contains active content");
  if (!/<g\b[^>]*(?:id|data-role)\s*=/i.test(svg)) errors.push("scene.svg has no animatable groups");
  return errors;
}

function sanitizeSvg(svg: string): string { return svg.replace(/^\uFEFF?\s*<\?xml[^>]*>\s*/i, "").replace(/<!--[\s\S]*?-->/g, "").trim(); }

function selectorSafe(selector: unknown): boolean {
  return typeof selector === "string" && selector.length > 0 && selector.length <= 240 && !/[<>`\n\r]/.test(selector) && /^(?:#[A-Za-z_][\w:.-]*|\[data-role\s*=\s*['"][A-Za-z0-9_-]{1,64}['"]\])$/.test(selector);
}

function cssValue(property: string, value: unknown): boolean {
  if (typeof value !== "string" || value.length > 160 || /[\x00-\x1f;{}]|\b(?:url|var|expression)\s*\(/i.test(value)) return false;
  if (property === "opacity" || property === "stroke-width") return /^(?:0|0?\.\d+|1|\d+(?:\.\d+)?)$/.test(value) && Number(value) >= 0 && (property !== "opacity" || Number(value) <= 1);
  if (property === "fill") return /^(?:#[0-9a-f]{3,8}|none|transparent|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|0?\.\d+|1)\s*\))$/i.test(value);
  return /^(?:(?:translate[XYZ]?\(-?\d+(?:\.\d+)?(?:px)?\)|scale(?:X|Y)?\(-?\d+(?:\.\d+)?\)|rotate\(-?\d+(?:\.\d+)?deg\))\s*)+$/.test(value);
}

export function validateAnimationV2(sceneSvg: string, animation: unknown, manifest: unknown): string[] {
  const errors = safeSvg(sceneSvg); if (!object(animation)) return [...errors, "animation.json must be an object"];
  if (animation.schemaVersion !== "2.0" || typeof animation.label !== "string") errors.push("invalid animation identity");
  const duration = animation.totalDuration, canvas = animation.canvas, tracks = animation.tracks, emitters = animation.emitters;
  if (!finite(duration) || duration < 1 || duration > 60000) errors.push("invalid totalDuration");
  if (!object(canvas) || !finite(canvas.width) || !finite(canvas.height) || canvas.width <= 0 || canvas.width > 100000 || canvas.height <= 0 || canvas.height > 100000 || typeof canvas.viewBox !== "string" || canvas.viewBox.length > 200) errors.push("invalid canvas");
  if (typeof animation.loop !== "boolean" || !Array.isArray(tracks) || !Array.isArray(emitters) || tracks.length > MAX_TRACKS || emitters.length > MAX_EMITTERS) { errors.push("invalid animation arrays"); return errors.slice(0, MAX_ERRORS); }
  for (let i = 0; i < tracks.length; i++) { const track: unknown = tracks[i];
    if (!object(track) || !selectorSafe(track.target) || typeof track.property !== "string" || !PROPERTIES.has(track.property) || (track.easing !== undefined && (typeof track.easing !== "string" || !EASINGS.has(track.easing))) || !Array.isArray(track.keyframes) || track.keyframes.length < 2 || track.keyframes.length > MAX_KEYFRAMES) { push(errors, `track ${i} is invalid`); continue; }
    let previous = -1; for (let j = 0; j < track.keyframes.length; j++) { const keyframe: unknown = track.keyframes[j]; if (!object(keyframe) || !finite(keyframe.time) || keyframe.time < 0 || keyframe.time > (finite(duration) ? duration : 0) || keyframe.time <= previous || !cssValue(track.property, keyframe.value) || (keyframe.easing !== undefined && (typeof keyframe.easing !== "string" || !EASINGS.has(keyframe.easing)))) push(errors, `track ${i} keyframe invalid`); previous = object(keyframe) && finite(keyframe.time) ? keyframe.time : previous; }
  }
  for (let i = 0; i < emitters.length; i++) { const emitter: unknown = emitters[i];
    if (!object(emitter) || typeof emitter.id !== "string" || emitter.id.length > 80 || emitter.type !== "particle" || !object(emitter.origin) || !finite(emitter.origin.x) || !finite(emitter.origin.y) || !finite(emitter.count) || emitter.count < 0 || emitter.count > 1000 || !finite(emitter.staggerMs) || emitter.staggerMs < 0 || emitter.staggerMs > 60000 || typeof emitter.loop !== "boolean" || !object(emitter.particleSpec)) { push(errors, `emitter ${i} invalid`); continue; }
    const s = emitter.particleSpec, trajectory = s.trajectory;
    if (!((s.shape === "circle" && finite(s.radius) && s.radius > 0 && s.radius <= 1000) || (s.shape === "line" && finite(s.length) && s.length > 0 && s.length <= 1000)) || typeof s.color !== "string" || !/^#[0-9a-f]{3,8}$/i.test(s.color) || !finite(s.opacity) || s.opacity < 0 || s.opacity > 1 || !object(trajectory) || !finite(trajectory.dx) || !finite(trajectory.dy) || Math.abs(trajectory.dx) > 100000 || Math.abs(trajectory.dy) > 100000 || !finite(s.duration) || s.duration < 1 || s.duration > 60000 || typeof s.fadeOut !== "boolean" || typeof s.easing !== "string" || !EASINGS.has(s.easing)) push(errors, `emitter ${i} particleSpec invalid`);
  }
  if (!object(manifest) || manifest.schemaVersion !== "2.0") errors.push("manifest.json schemaVersion must be 2.0");
  return errors;
}

function entry(zip: AdmZip, name: string): AdmZip.IZipEntry | undefined {
  // Dukung ZIP dengan wrapper folder tunggal (mis. asset/scene.svg)
  const direct = zip.getEntries().find(e => e.entryName === name && !e.isDirectory);
  if (direct) return direct;
  return zip.getEntries().find(e => !e.isDirectory && (e.entryName.endsWith(`/${name}`) || e.entryName === name));
}
function inspect(zipPath: string): { zip?: AdmZip; buffer?: Buffer; errors: string[]; baseName?: string } {
  try {
    const stat = fs.statSync(zipPath); if (!stat.isFile() || stat.size > MAX_ARCHIVE) return { errors: ["Archive is too large"] };
    const buffer = fs.readFileSync(zipPath); if (buffer.length > MAX_ARCHIVE) return { errors: ["Archive is too large"] };
    const zip = new AdmZip(buffer), entries = zip.getEntries();
    const fileEntries = entries.filter(e => !e.isDirectory);
    const rawNames = fileEntries.map(e => e.entryName);
    // Deteksi wrapper folder tunggal (contoh: asset/scene.svg) — izinkan 1 folder entry
    let names = rawNames;
    const hasWrapper = rawNames.length > 0 && rawNames.every(n => n.includes("/"));
    if (hasWrapper) {
      const prefixes = new Set(rawNames.map(n => n.split("/")[0]));
      if (prefixes.size === 1) {
        const prefix = [...prefixes][0];
        const stripped = rawNames.map(n => n.slice(prefix.length + 1));
        // Pastikan tidak ada file di luar wrapper & semua stripped valid
        if (stripped.every(n => n && !n.includes("/"))) names = stripped;
      }
    }
    const dirCount = entries.filter(e => e.isDirectory).length;
    const wrapperOk = dirCount <= 1 && hasWrapper;
    if (fileEntries.length > MAX_ENTRIES || (!wrapperOk && dirCount > 0) || names.some(n => !REQUIRED.includes(n as any)) || new Set(names).size !== names.length) return { errors: ["Archive contains unsupported or excessive entries"] };
    let total = 0; for (const e of entries) { const size = e.header.size, compressed = e.header.compressedSize; total += size; if (size > MAX_ENTRY || total > MAX_TOTAL || (compressed > 0 && size / compressed > MAX_RATIO)) return { errors: ["Archive entry exceeds resource limits"] }; }
    const missing = REQUIRED.filter(n => !names.includes(n)); if (missing.length) return { errors: missing.map(n => `Missing ${n}`) };
    return { zip, buffer, errors: [], baseName: path.basename(zipPath, path.extname(zipPath)) };
  } catch { return { errors: ["Malformed archive"] }; }
}

export function analyzeAnimationV2Zip(zipPath: string): { valid: boolean; errors: string[]; baseName?: string } {
  const checked = inspect(zipPath); if (!checked.zip) return { valid: false, errors: checked.errors };
  try { const scene = sanitizeSvg(entry(checked.zip, "scene.svg")!.getData().toString("utf8")), animation = JSON.parse(entry(checked.zip, "animation.json")!.getData().toString("utf8")), manifest = JSON.parse(entry(checked.zip, "manifest.json")!.getData().toString("utf8")); const errors = validateAnimationV2(scene, animation, manifest); return { valid: errors.length === 0, errors, baseName: checked.baseName }; } catch { return { valid: false, errors: ["Malformed package payload"] }; }
}

export function importAnimationV2Zip(zipPath: string): ImportedAnimV2Package | null {
  const checked = inspect(zipPath); if (!checked.zip) return null;
  try {
    const scene = sanitizeSvg(entry(checked.zip, "scene.svg")!.getData().toString("utf8")), animation = JSON.parse(entry(checked.zip, "animation.json")!.getData().toString("utf8")), manifest = JSON.parse(entry(checked.zip, "manifest.json")!.getData().toString("utf8"));
    const errors = validateAnimationV2(scene, animation, manifest); if (errors.length) return null;
    const id = `anim-v2-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`, temp = path.join(dirs.animations, `.tmp-${id}`), final = path.join(dirs.animations, id); fs.mkdirSync(temp, { recursive: true });
    try { const archive = checked.buffer!; const sha256 = crypto.createHash("sha256").update(archive).digest("hex"); fs.writeFileSync(path.join(temp, "scene.svg"), scene); fs.writeFileSync(path.join(temp, "animation.json"), JSON.stringify(animation)); fs.writeFileSync(path.join(temp, "manifest.json"), JSON.stringify(manifest)); fs.writeFileSync(path.join(temp, "package.zip"), archive); fs.writeFileSync(path.join(temp, "provenance.json"), JSON.stringify({ sha256, source: "IMAGIN Studio Animation V2", importedAt: new Date().toISOString(), archive: "package.zip" })); fs.renameSync(temp, final); } catch { fs.rmSync(temp, { recursive: true, force: true }); return null; }
      const record = { packageDir: final, sceneSvg: scene, animation: animation as AnimV2Package, manifest, sha256: crypto.createHash("sha256").update(checked.buffer!).digest("hex") };
     importedPackages.set(id, record);
     return { id, baseName: checked.baseName!, sceneSvg: scene, animation: animation as AnimV2Package, manifest, runtimeIgnored: true };
  } catch { return null; }
}

export function getImportedAnimationV2(packageId: string) { return importedPackages.get(packageId); }

if (process.env.NODE_ENV === "test") { const valid = { schemaVersion: "2.0", label: "x", totalDuration: 1000, loop: true, canvas: { width: 1, height: 1, viewBox: "0 0 1 1" }, tracks: [], emitters: [] }; console.assert(validateAnimationV2("<svg><g id=\"x\"/></svg>", valid, { schemaVersion: "2.0" }).length === 0); console.assert(validateAnimationV2("<svg><script/></svg>", valid, { schemaVersion: "2.0" }).length > 0); }
