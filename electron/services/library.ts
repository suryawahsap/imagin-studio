import fs from "fs";
import path from "path";
import crypto from "crypto";
import { LibraryAsset, StorageInfo } from "../types";
import { dirs, ensureDirs, metadataRoot, storageRoot } from "../binaries/paths";

const DB_PATH = process.env.IMAGIN_LIBRARY_DB || path.join(metadataRoot, "library-db.json");

let libraryDbPath = DB_PATH;

let libraryAssets: LibraryAsset[] = [];
let tasksState: unknown[] = [];
type QuarantinedAsset = { reason: string; original: unknown; url?: string };
let quarantinedAssets: QuarantinedAsset[] = [];
let quarantinedAssetUrls: string[] = [];
let deletedStudioAssetIds: string[] = [];
// Durable denylist of Studio asset ids whose canonical Library record was
// deleted.  Independent from the renderer notification queue (deletedStudioAssetIds):
// acking a notification must NEVER remove a denied id, so a stale upsert cannot
// resurrect a deleted Studio asset.  Every deleted Studio id is persisted
// indefinitely — reusing an old Studio ID must never recreate a canonical asset.
let deniedStudioAssetIds: string[] = [];
let outputFolder = "storage/assets";
let storageUsed = 0.0;
const storageLimit = 100.0;

export function initLibrary(dbPath?: string): void {
  if (dbPath) libraryDbPath = dbPath;
  ensureDirs();
  loadLibrary();
  const scanned = scanExistingFiles(libraryAssets);
  if (scanned.length !== libraryAssets.length) {
    persistCandidate({ assets: scanned });
    libraryAssets = scanned;
  }
}

export function getLibraryDbPath(): string {
  return libraryDbPath;
}

export function persistLibrary(): void {
  persistCandidate({ assets: libraryAssets });
}

type LibraryCandidate = { assets?: LibraryAsset[]; storageUsed?: number; outputFolder?: string; deletedStudioAssetIds?: string[]; deniedStudioAssetIds?: string[] };
function persistCandidate(candidate: LibraryCandidate): void {
  fs.mkdirSync(path.dirname(libraryDbPath), { recursive: true });
  const temp = `${libraryDbPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify({
      assets: candidate.assets ?? libraryAssets,
      tasks: tasksState,
      quarantinedAssets,
      quarantinedAssetUrls,
      deletedStudioAssetIds: candidate.deletedStudioAssetIds ?? deletedStudioAssetIds,
      deniedStudioAssetIds: candidate.deniedStudioAssetIds ?? deniedStudioAssetIds,
      storageUsed: candidate.storageUsed ?? storageUsed,
      outputFolder: candidate.outputFolder ?? outputFolder,
    }, null, 2), "utf-8");
    fs.renameSync(temp, libraryDbPath);
  } catch (err) {
    try { fs.unlinkSync(temp); } catch {}
    throw err;
  }
}

// Deterministic deduped append: register the Studio id so a stale upsert can
// never recreate a deleted canonical Library asset.  Unbounded — every deleted
// Studio id is persisted forever (reusing an old id must never resurrect).
function denyStudioAssetId(id: string): string[] {
  const s = new Set(deniedStudioAssetIds);
  s.add(id);
  return [...s];
}

const TYPES = new Set<LibraryAsset["type"]>(["IMAGE", "VIDEO", "AUDIO", "VECTOR", "ANIMATION", "HTML"]);
const MODULES = new Set<LibraryAsset["sourceModule"]>(["VECTOR", "SYSTEM", "ANIMATION", "UPSCALE", "IMPORT", "STUDIO"]);
const STATUSES = new Set<LibraryAsset["status"]>(["Raw", "Vectorized", "Upscaled", "Ready"]);
const safeString = (value: unknown, max = 4096): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const safeOptionalString = (value: unknown, max = 4096): value is string | undefined => value === undefined || (typeof value === "string" && value.length <= max);
const validStudioAssetId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value);
const safeDecode = (value: string): string | null => { try { return decodeURIComponent(value); } catch { return null; } };
type ExtensionInfo = { type: LibraryAsset["type"]; mimeType: string; compatibleTypes: LibraryAsset["type"][] };
const extensionInfo = (url: string): ExtensionInfo | null => {
  const ext = path.extname(url.split(/[?#]/)[0]).toLowerCase();
  const map: Record<string, ExtensionInfo> = {
    ".png": { type: "IMAGE", mimeType: "image/png", compatibleTypes: ["IMAGE"] },
    ".jpg": { type: "IMAGE", mimeType: "image/jpeg", compatibleTypes: ["IMAGE"] },
    ".jpeg": { type: "IMAGE", mimeType: "image/jpeg", compatibleTypes: ["IMAGE"] },
    ".gif": { type: "IMAGE", mimeType: "image/gif", compatibleTypes: ["IMAGE", "ANIMATION"] },
    ".webp": { type: "IMAGE", mimeType: "image/webp", compatibleTypes: ["IMAGE"] },
    ".svg": { type: "VECTOR", mimeType: "image/svg+xml", compatibleTypes: ["VECTOR"] },
    ".mp4": { type: "VIDEO", mimeType: "video/mp4", compatibleTypes: ["VIDEO", "ANIMATION"] },
    ".webm": { type: "VIDEO", mimeType: "video/webm", compatibleTypes: ["VIDEO", "ANIMATION"] },
    ".mov": { type: "VIDEO", mimeType: "video/quicktime", compatibleTypes: ["VIDEO", "ANIMATION"] },
    ".mp3": { type: "AUDIO", mimeType: "audio/mpeg", compatibleTypes: ["AUDIO"] },
    ".wav": { type: "AUDIO", mimeType: "audio/wav", compatibleTypes: ["AUDIO"] },
    ".m4a": { type: "AUDIO", mimeType: "audio/mp4", compatibleTypes: ["AUDIO"] },
    ".html": { type: "HTML", mimeType: "text/html", compatibleTypes: ["HTML"] },
  };
  return map[ext] || null;
};
const safeSnapshot = (value: unknown): unknown => {
  try {
    const json = JSON.stringify(value);
    return json.length <= 16384 ? JSON.parse(json) : { truncated: true };
  } catch { return null; }
};
const quarantine = (reason: string, original: unknown): QuarantinedAsset => {
  const url = original && typeof original === "object" && safeString((original as Record<string, unknown>).url) && storageUrlToPath((original as Record<string, unknown>).url as string)
    ? (original as Record<string, unknown>).url as string : undefined;
  return { reason: reason.slice(0, 256), original: safeSnapshot(original), ...(url ? { url } : {}) };
};
const normalizeAsset = (value: unknown): LibraryAsset | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const a = value as Record<string, unknown>;
  if (!safeString(a.id, 256) || !safeString(a.url) || !storageUrlToPath(a.url)) return null;
  const ext = extensionInfo(a.url);
  if (!ext) return null;
  if (a.type !== undefined && !TYPES.has(a.type as LibraryAsset["type"])) return null;
  if (a.sourceModule !== undefined && !MODULES.has(a.sourceModule as LibraryAsset["sourceModule"])) return null;
  const type = TYPES.has(a.type as LibraryAsset["type"]) ? a.type as LibraryAsset["type"] : ext.type;
  if (!ext.compatibleTypes.includes(type)) return null;
  const sourceModule = MODULES.has(a.sourceModule as LibraryAsset["sourceModule"]) ? a.sourceModule as LibraryAsset["sourceModule"] : "SYSTEM";
  const filePath = storageUrlToPath(a.url);
  let createdAt = typeof a.createdAt === "string" && Number.isFinite(Date.parse(a.createdAt)) ? new Date(a.createdAt).toISOString() : "";
  if (!createdAt && filePath) try { const stat = fs.statSync(filePath); createdAt = (stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime).toISOString(); } catch {}
  const fallbackName = safeDecode(a.url.split(/[/?#]/).pop() || "asset");
  if (!safeString(a.name, 512) && !fallbackName) return null;
  const name = safeString(a.name, 512) ? a.name : fallbackName!;
  const tags = Array.isArray(a.tags) && a.tags.length <= 100 && a.tags.every(tag => safeString(tag, 256)) ? [...new Set(a.tags as string[])] : [];
  const normalized: LibraryAsset = {
    id: a.id, type, name, url: a.url, folder: safeString(a.folder, 1024) ? a.folder : outputFolder,
    sourceModule, mimeType: ext.mimeType,
    fileSize: safeString(a.fileSize, 64) ? a.fileSize : "0.0 MB", tags, createdAt: createdAt || new Date(0).toISOString(),
  };
  for (const key of ["thumbnailUrl", "sourceJobId", "duration", "resolution", "prompt", "parentAssetId", "versionGroup", "adobeCategory", "subcategory"] as const) {
    if (safeOptionalString(a[key]) && a[key] !== undefined) (normalized as any)[key] = a[key];
  }
  if (typeof a.version === "number" && Number.isFinite(a.version)) normalized.version = a.version;
  if (typeof a.versioned === "boolean") normalized.versioned = a.versioned;
  if (typeof a.favorite === "boolean") normalized.favorite = a.favorite;
  if (STATUSES.has(a.status as LibraryAsset["status"])) normalized.status = a.status as LibraryAsset["status"];
  else normalized.status = "Raw";
  if (a.settings && typeof a.settings === "object" && !Array.isArray(a.settings) && JSON.stringify(a.settings).length <= 16384) normalized.settings = a.settings as LibraryAsset["settings"];
  if (a.stockMetadata && typeof a.stockMetadata === "object" && !Array.isArray(a.stockMetadata) && JSON.stringify(a.stockMetadata).length <= 16384) normalized.stockMetadata = a.stockMetadata as LibraryAsset["stockMetadata"];
  // Fase 1: exportHistory — cap at 200 most recent entries, validate shape.
  if (Array.isArray(a.exportHistory)) {
    const valid = a.exportHistory.filter((e: unknown) =>
      e && typeof e === "object" && typeof (e as Record<string, unknown>).exportedAt === "number" &&
      Number.isFinite((e as Record<string, unknown>).exportedAt) &&
      typeof (e as Record<string, unknown>).format === "string" && ((e as Record<string, unknown>).format as string).length <= 64 &&
      ((e as Record<string, unknown>).platform === null || typeof (e as Record<string, unknown>).platform === "string")
    ) as { exportedAt: number; format: string; platform: string | null }[];
    if (valid.length > 0) {
      valid.sort((a, b) => b.exportedAt - a.exportedAt);
      normalized.exportHistory = valid.slice(0, 200);
    }
  }
  if (validStudioAssetId(a.studioAssetId) && a.studioSyncVersion === 1 && (a.studioContentHash === undefined || (typeof a.studioContentHash === "string" && /^[a-f0-9]{64}$/i.test(a.studioContentHash)))) {
    normalized.studioAssetId = a.studioAssetId;
    normalized.studioSyncVersion = 1;
    if (typeof a.studioContentHash === "string") normalized.studioContentHash = a.studioContentHash;
  }
  return normalized;
};

function loadLibrary(): void {
  libraryAssets = [];
  tasksState = [];
  quarantinedAssets = [];
  quarantinedAssetUrls = [];
  deletedStudioAssetIds = [];
  deniedStudioAssetIds = [];
  try {
    if (fs.existsSync(libraryDbPath)) {
      const data = JSON.parse(fs.readFileSync(libraryDbPath, "utf-8"));
      if (Array.isArray(data.assets)) {
        for (const candidate of data.assets) {
          try {
            const normalized = normalizeAsset(candidate);
            if (normalized) libraryAssets.push(normalized);
            else {
              const q = quarantine("invalid library asset", candidate);
              if (q.url) quarantinedAssetUrls.push(q.url);
              if (quarantinedAssets.length < 200) quarantinedAssets.push(q);
            }
          } catch { if (quarantinedAssets.length < 200) quarantinedAssets.push(quarantine("invalid library asset", candidate)); }
        }
      }
      if (Array.isArray(data.tasks)) tasksState = data.tasks;
      if (Array.isArray(data.quarantinedAssets)) {
        for (const q of data.quarantinedAssets.slice(0, 200 - quarantinedAssets.length)) {
          if (q && typeof q === "object" && safeString(q.reason, 256)) quarantinedAssets.push({ reason: q.reason, original: safeSnapshot(q.original), ...(safeString(q.url) && storageUrlToPath(q.url) ? { url: q.url } : {}) });
        }
      }
      if (Array.isArray(data.quarantinedAssetUrls)) quarantinedAssetUrls.push(...data.quarantinedAssetUrls.filter((url: unknown) => safeString(url) && storageUrlToPath(url)).slice(0, 5000));
      quarantinedAssetUrls = [...new Set([...quarantinedAssetUrls, ...quarantinedAssets.map(q => q.url).filter((url): url is string => !!url)])].slice(0, 5000);
      if (Array.isArray(data.deletedStudioAssetIds)) deletedStudioAssetIds = [...new Set(data.deletedStudioAssetIds.filter((id: unknown) => validStudioAssetId(id)))].slice(0, 10_000) as string[];
      if (Array.isArray(data.deniedStudioAssetIds)) deniedStudioAssetIds = [...new Set(data.deniedStudioAssetIds.filter((id: unknown) => validStudioAssetId(id)))] as string[];
      if (typeof data.storageUsed === "number") storageUsed = data.storageUsed;
      if (data.outputFolder) outputFolder = data.outputFolder;
      console.log(`[DB] Loaded ${libraryAssets.length} assets`);
    }
  } catch (err) {
    console.error("[DB] Failed to load:", err);
  }
}

export function storageUrlToPath(url?: string): string | null {
  if (!url || !url.startsWith("/storage/")) return null;
  const decoded = safeDecode(url.split("?")[0]);
  if (!decoded) return null;
  const rel = decoded.slice("/storage".length).replace(/^\/+/, "");
  const fullPath = path.resolve(storageRoot, rel);
  return fullPath.startsWith(storageRoot + path.sep) ? fullPath : null;
}

export function pruneMissingLibraryAssets(): void {
  const candidate = libraryAssets.filter((asset) => {
    const mainPath = storageUrlToPath(asset.url);
    const thumbPath = storageUrlToPath(asset.thumbnailUrl);
    return (mainPath && fs.existsSync(mainPath)) || (thumbPath && fs.existsSync(thumbPath));
  });
  if (candidate.length !== libraryAssets.length) {
    persistCandidate({ assets: candidate });
    libraryAssets = candidate;
  }
}

function deleteAssetFiles(asset: LibraryAsset): void {
  for (const filePath of new Set([storageUrlToPath(asset.url), storageUrlToPath(asset.thumbnailUrl)])) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
}

function scanExistingFiles(assets: LibraryAsset[]): LibraryAsset[] {
  const candidate = [...assets];
  const map = [
    { dir: dirs.images, module: "VECTOR" as const, type: "IMAGE" as const },
    { dir: dirs.videos, module: "VECTOR" as const, type: "VIDEO" as const },
    { dir: dirs.audio, module: "VECTOR" as const, type: "AUDIO" as const },
    { dir: dirs.vectors, module: "VECTOR" as const, type: "VECTOR" as const },
    // EPS tidak bisa di-preview di <img> — jangan scan sebagai aset library.
    { dir: dirs.upscaled, module: "UPSCALE" as const, type: "IMAGE" as const },
    { dir: dirs.html, module: "SYSTEM" as const, type: "HTML" as const },
    { dir: dirs.studio, module: "STUDIO" as const, type: "IMAGE" as const },
  ];

  const existingUrls = new Set([...candidate.map((a) => a.url), ...quarantinedAssetUrls]);

  for (const { dir, module, type } of map) {
    if (!fs.existsSync(dir)) continue;
    let files: string[];
    try { files = fs.readdirSync(dir); } catch { continue; }

    for (const file of files) {
      if (!file.match(/\.(mp4|mp3|wav|m4a|webm|png|jpg|jpeg|gif|webp|svg)$/i)) continue;
      const fullPath = path.join(dir, file);
      let stats: fs.Stats;
      try { stats = fs.statSync(fullPath); } catch { continue; }
      if (!stats.isFile()) continue;

      const dirName = path.basename(dir);
      const urlPath = `/storage/assets/${dirName}/${encodeURIComponent(file)}`;
      if (existingUrls.has(urlPath)) continue;

      const ext = path.extname(file).toLowerCase();
      const info = extensionInfo(file);
      if (!info) continue;
      const isAudio = info.type === "AUDIO";
      const isVideo = info.type === "VIDEO";
      // Pakai type dari map kecuali untuk video/audio (extensi menentukan),
      // dan map upscaled/images yang tipenya IMAGE untuk semua ekstensi gambar.
      const assetType = isAudio ? "AUDIO" : isVideo ? "VIDEO" : type;
      const mime = info.mimeType;
      const sizeMb = stats.size / (1024 * 1024);

      candidate.unshift({
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: assetType,
        name: file,
        url: urlPath,
        thumbnailUrl: "",
        folder: outputFolder,
        sourceModule: module,
        mimeType: mime,
        fileSize: `${sizeMb.toFixed(1)} MB`,
        tags: [dirName, "Imported"],
        status: "Raw",
        createdAt: stats.birthtime.toISOString(),
      });
      existingUrls.add(urlPath);
    }
  }
  return candidate;
}

// ─── Public API ─────────────────────────────────────────────

export function getLibrary(): LibraryAsset[] {
  pruneMissingLibraryAssets();
  return libraryAssets;
}

export function findLibraryAssetByName(name: string): LibraryAsset | undefined {
  return libraryAssets.find((a) => a.name === name);
}

export function findLibraryAssetById(id: string): LibraryAsset | undefined {
  return libraryAssets.find((a) => a.id === id);
}

export function getChildrenOf(parentId: string): LibraryAsset[] {
  return libraryAssets.filter((a) => a.parentAssetId === parentId);
}

/**
 * Jika `versioned:true` dan sudah ada aset dengan nama sama,
 * beri suffix `_vN` (source asli tidak pernah ditimpa — plan §10.7).
 */
function applyVersioning(
  asset: Partial<LibraryAsset> & { id?: string }
): Partial<LibraryAsset> & { id?: string } {
  if (!asset.versioned || !asset.name) return asset;
  const existing = findLibraryAssetByName(asset.name);
  if (!existing) {
    return { ...asset, version: 1, versionGroup: asset.versionGroup || asset.name };
  }
  const group = existing.versionGroup || existing.name;
  const nextVersion = (existing.version || 1) + 1;
  const ext = path.extname(asset.name);
  const base = path.basename(asset.name, ext);
  const newName = `${base}_v${nextVersion}${ext}`;
  return { ...asset, name: newName, version: nextVersion, versionGroup: group };
}

export function addLibraryAsset(asset: Partial<LibraryAsset> & { id?: string }): LibraryAsset {
  const { studioAssetId: _studioAssetId, studioSyncVersion: _studioSyncVersion, studioContentHash: _studioContentHash, ...safeAsset } = asset;
  const versioned = applyVersioning(safeAsset);
  const newAsset = normalizeAsset({
    id: asset.id || "lib-" + Date.now() + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
    folder: outputFolder,
    tags: [],
    ...versioned,
  });
  if (!newAsset) throw new Error("Invalid library asset");
  const candidate = [newAsset, ...libraryAssets];
  const nextStorageUsed = calculateStorage(newAsset.fileSize, true);
  persistCandidate({ assets: candidate, storageUsed: nextStorageUsed });
  libraryAssets = candidate;
  storageUsed = nextStorageUsed;
  return newAsset;
}

export function updateLibraryAsset(id: string, patch: Partial<LibraryAsset>): { success: boolean; asset?: LibraryAsset; detail?: string } {
  const index = libraryAssets.findIndex((a) => a.id === id);
  if (index === -1) return { success: false, detail: "Asset not found" };
  const { studioAssetId: _studioAssetId, studioSyncVersion: _studioSyncVersion, studioContentHash: _studioContentHash, ...safePatch } = patch;
  const updated = normalizeAsset({
    ...libraryAssets[index],
    ...safePatch,
    id: libraryAssets[index].id,
    createdAt: libraryAssets[index].createdAt,
  });
  if (!updated) return { success: false, detail: "Invalid library asset patch" };
  const candidate = libraryAssets.map((asset, i) => i === index ? updated : asset);
  persistCandidate({ assets: candidate });
  libraryAssets = candidate;
  return { success: true, asset: updated };
}

export function deleteLibraryAsset(id: string): { success: boolean; studioAssetId?: string; detail?: string } {
  const index = libraryAssets.findIndex((a) => a.id === id);
  if (index === -1) return { success: false, detail: "Asset not found" };
  const removed = libraryAssets[index];
  const candidate = libraryAssets.filter((_, i) => i !== index);
  const nextStorageUsed = calculateStorage(removed.fileSize, false);
  const nextDeletedIds = removed.studioAssetId
    ? [...new Set([...deletedStudioAssetIds, removed.studioAssetId])].slice(-10_000)
    : deletedStudioAssetIds;
  // Durable denylist: record the canonical Studio id after the delete commits so
  // a stale upsert can never resurrect it, even after the renderer acks the
  // notification (ack only touches deletedStudioAssetIds, never the denylist).
  const nextDeniedIds = removed.studioAssetId ? denyStudioAssetId(removed.studioAssetId) : deniedStudioAssetIds;
  persistCandidate({ assets: candidate, storageUsed: nextStorageUsed, deletedStudioAssetIds: nextDeletedIds, deniedStudioAssetIds: nextDeniedIds });
  libraryAssets = candidate;
  storageUsed = nextStorageUsed;
  deletedStudioAssetIds = nextDeletedIds;
  deniedStudioAssetIds = nextDeniedIds;
  deleteAssetFiles(removed);
  return { success: true, ...(removed.studioAssetId ? { studioAssetId: removed.studioAssetId } : {}) };
}

export type StudioLibraryAssetInput = {
  studioAssetId: string;
  dataUrl?: string;
  name: string;
  prompt?: string;
  tags?: string[];
  width?: number;
  height?: number;
  mimeType?: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
  outputFormat?: "png" | "jpeg" | "webp" | "svg";
  /** Fase 1: metadata fields synced from Studio asset. */
  stockMetadata?: unknown;
  adobeCategory?: string;
  subcategory?: string;
};

const STUDIO_BINARY_LIMIT = 25 * 1024 * 1024;
const studioFormat = (mimeType: string): { ext: string; type: LibraryAsset["type"] } | null => ({
  "image/png": { ext: "png", type: "IMAGE" },
  "image/jpeg": { ext: "jpg", type: "IMAGE" },
  "image/webp": { ext: "webp", type: "IMAGE" },
  "image/svg+xml": { ext: "svg", type: "VECTOR" },
} as Record<string, { ext: string; type: LibraryAsset["type"] }>)[mimeType] || null;

function decodeStudioDataUrl(dataUrl: string): { bytes: Buffer; mimeType: StudioLibraryAssetInput["mimeType"] } {
  if (dataUrl.length > Math.ceil(STUDIO_BINARY_LIMIT * 4 / 3) + 128) throw new Error("Studio asset is too large");
  const match = /^data:(image\/(?:png|jpeg|webp)|image\/svg\+xml);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Studio asset must be a supported base64 data URL");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > STUDIO_BINARY_LIMIT || bytes.toString("base64").replace(/=+$/, "") !== match[2].replace(/=+$/, "")) throw new Error("Invalid Studio asset data");
  const mimeType = match[1] as StudioLibraryAssetInput["mimeType"];
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  const webp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/svg+xml") {
    const text = bytes.toString("utf8").trim();
    const references = [...text.matchAll(/\b(?:xlink:href|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)];
    if (!/^<svg(?:\s|>)/i.test(text.replace(/^<\?xml[^>]*>\s*/i, "")) || !/<\/svg>\s*$/i.test(text) ||
        /<(?:script|style|foreignObject|iframe|object|embed)\b|\bstyle\s*=|\bon\w+\s*=|\burl\s*\(|@import\b|<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text) ||
        references.some(match => { const value = match[1] ?? match[2] ?? match[3] ?? ""; return value.length > 0 && !value.startsWith("#"); })) throw new Error("Invalid or unsafe SVG");
  } else if ((mimeType === "image/png" && !png) || (mimeType === "image/jpeg" && !jpeg) || (mimeType === "image/webp" && !webp)) throw new Error("Studio asset signature does not match MIME type");
  return { bytes, mimeType };
}

export function upsertStudioLibraryAsset(input: StudioLibraryAssetInput): LibraryAsset {
  if (!input || !validStudioAssetId(input.studioAssetId) || !safeString(input.name, 512) ||
      !safeOptionalString(input.prompt, 8192) || (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 100 || input.tags.some(tag => !safeString(tag, 128)))) ||
      (input.width !== undefined && (!Number.isInteger(input.width) || input.width < 1 || input.width > 16384)) ||
      (input.height !== undefined && (!Number.isInteger(input.height) || input.height < 1 || input.height > 16384)) ||
      // Fase 1: validate metadata fields
      (input.stockMetadata !== undefined && (typeof input.stockMetadata !== "object" || Array.isArray(input.stockMetadata) || JSON.stringify(input.stockMetadata).length > 16384)) ||
      !safeOptionalString(input.adobeCategory, 256) || !safeOptionalString(input.subcategory, 256)) throw new Error("Invalid Studio asset metadata");
  const existing = libraryAssets.find(asset => asset.studioAssetId === input.studioAssetId);
  // A valid canonical re-save of an existing record (e.g. retry, metadata update)
  // must not be rejected solely due to a prior Studio deletion tombstone.  Only
  // block genuine resurrection (brand-new record for a denied id) — the durable
  // denylist is independent from the renderer notification queue, so acking a
  // notification NEVER weakens this guard.
  if (!existing && deniedStudioAssetIds.includes(input.studioAssetId)) throw new Error("Studio asset was deleted");
  if (!input.dataUrl && !existing) throw new Error("dataUrl is required for a new Studio asset");
  const decoded = input.dataUrl ? decodeStudioDataUrl(input.dataUrl) : null;
  const mimeType = decoded?.mimeType || existing?.mimeType;
  const format = mimeType && studioFormat(mimeType);
  if (!format || (input.mimeType && input.mimeType !== mimeType) || (input.outputFormat && input.outputFormat !== format.ext.replace("jpg", "jpeg"))) throw new Error("Studio asset format mismatch");
  const hash = decoded ? crypto.createHash("sha256").update(decoded.bytes).digest("hex") : existing!.studioContentHash;
  if (!hash) throw new Error("Linked Studio asset has no content hash");
  const id = existing?.id || `studio-${crypto.createHash("sha256").update(input.studioAssetId).digest("hex").slice(0, 32)}`;
  let url = existing?.url;
  let finalPath: string | null = null;
  let createdFinal = false;
  if (decoded && hash !== existing?.studioContentHash) {
    fs.mkdirSync(dirs.studio, { recursive: true });
    const filename = `${id}-${hash.slice(0, 20)}.${format.ext}`;
    finalPath = path.join(dirs.studio, filename);
    const tempPath = `${finalPath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    try {
      fs.writeFileSync(tempPath, decoded.bytes, { flag: "wx" });
      if (fs.existsSync(finalPath)) fs.unlinkSync(tempPath);
      else { fs.renameSync(tempPath, finalPath); createdFinal = true; }
      url = `/storage/assets/studio/${encodeURIComponent(filename)}`;
    } catch (error) {
      try { fs.unlinkSync(tempPath); } catch {}
      throw error;
    }
  }
  const bytesLength = decoded?.bytes.length ?? (() => { try { return fs.statSync(storageUrlToPath(url)!).size; } catch { return 0; } })();
  const linked = normalizeAsset({
    ...(existing || {}), id, type: format.type, name: input.name, url, folder: existing?.folder || outputFolder,
    sourceModule: "STUDIO", mimeType, fileSize: `${(bytesLength / (1024 * 1024)).toFixed(3)} MB`,
    tags: [...new Set(["Studio", ...(input.tags || [])])], createdAt: existing?.createdAt || new Date().toISOString(),
    prompt: input.prompt, settings: input.width || input.height ? { code: `${input.width || 0}x${input.height || 0}` } : existing?.settings,
    studioAssetId: input.studioAssetId, studioSyncVersion: 1, studioContentHash: hash,
    stockMetadata: input.stockMetadata, adobeCategory: input.adobeCategory, subcategory: input.subcategory,
  });
  if (!linked) throw new Error("Invalid linked Studio asset");
  const candidate = existing
    ? libraryAssets.flatMap(asset => asset === existing ? [linked] : asset.studioAssetId === input.studioAssetId ? [] : [asset])
    : [linked, ...libraryAssets];
  try { persistCandidate({ assets: candidate }); }
  catch (error) { if (createdFinal && finalPath) try { fs.unlinkSync(finalPath); } catch {} throw error; }
  libraryAssets = candidate;
  if (existing && existing.url !== linked.url) deleteAssetFiles(existing);
  return linked;
}

export function deleteStudioLibraryAsset(studioAssetId: string): { success: boolean } {
  if (!validStudioAssetId(studioAssetId)) throw new Error("Invalid Studio asset ID");
  const removed = libraryAssets.filter(asset => asset.studioAssetId === studioAssetId);
  if (!removed.length) return { success: true };
  const candidate = libraryAssets.filter(asset => asset.studioAssetId !== studioAssetId);
  const removedGb = removed.reduce((total, asset) => total + fileSizeGb(asset.fileSize), 0);
  const nextStorageUsed = Math.max(0, storageUsed - removedGb);
  // Durable denylist: the dedicated Studio delete must also record the id so a
  // stale upsert can never resurrect it.  The notification queue is NOT touched
  // (the renderer initiated the delete and already knows).
  const nextDeniedIds = denyStudioAssetId(studioAssetId);
  persistCandidate({ assets: candidate, storageUsed: nextStorageUsed, deniedStudioAssetIds: nextDeniedIds });
  libraryAssets = candidate;
  storageUsed = nextStorageUsed;
  deniedStudioAssetIds = nextDeniedIds;
  const paths = new Set(removed.flatMap(asset => [storageUrlToPath(asset.url), storageUrlToPath(asset.thumbnailUrl)]).filter((filePath): filePath is string => !!filePath));
  for (const filePath of paths) try { fs.unlinkSync(filePath); } catch {}
  return { success: true };
}

export function getDeletedStudioAssetIds(): string[] {
  return [...deletedStudioAssetIds];
}

export function ackDeletedStudioAssetIds(ids: string[]): { success: boolean } {
  if (!Array.isArray(ids) || ids.length > 10_000 || ids.some(id => !validStudioAssetId(id))) throw new Error("Invalid Studio deletion IDs");
  const acknowledged = new Set(ids);
  const candidate = deletedStudioAssetIds.filter(id => !acknowledged.has(id));
  persistCandidate({ deletedStudioAssetIds: candidate });
  deletedStudioAssetIds = candidate;
  return { success: true };
}

export function copyLibraryAsset(id: string, folder?: string): { success: boolean; asset?: LibraryAsset; detail?: string } {
  const original = libraryAssets.find((a) => a.id === id);
  if (!original) return { success: false, detail: "Asset not found" };

  const copyFileToDisk = (url?: string): { url?: string; ok: boolean } => {
    if (!url) return { url, ok: true };
    const srcPath = storageUrlToPath(url);
    if (!srcPath || !fs.existsSync(srcPath)) return { url, ok: false };
    const ext = path.extname(srcPath);
    const base = path.basename(srcPath, ext);
    const dir = path.dirname(srcPath);
    const newFileName = `${base}_copy_${Date.now()}${ext}`;
    try { fs.copyFileSync(srcPath, path.join(dir, newFileName)); } catch { return { url, ok: false }; }
    const urlDir = url.slice(0, url.lastIndexOf("/") + 1);
    return { url: `${urlDir}${encodeURIComponent(newFileName)}`, ok: true };
  };

  const mainCopy = copyFileToDisk(original.url);
  if (!mainCopy.ok) {
    return { success: false, detail: "Source file for this asset was not found on disk — run a rescan before copying." };
  }
  const thumbCopy = original.thumbnailUrl ? copyFileToDisk(original.thumbnailUrl) : { url: original.thumbnailUrl, ok: true };

  const newAsset: LibraryAsset = {
    ...original,
    id: "lib-" + Date.now() + Math.floor(Math.random() * 1000),
    name: `${original.name} (copy)`,
    url: mainCopy.url || original.url,
    thumbnailUrl: thumbCopy.url,
    createdAt: new Date().toISOString(),
    folder: folder || original.folder,
  };
  delete newAsset.studioAssetId;
  delete newAsset.studioSyncVersion;
  delete newAsset.studioContentHash;
  const candidate = [newAsset, ...libraryAssets];
  const nextStorageUsed = calculateStorage(newAsset.fileSize, true);
  persistCandidate({ assets: candidate, storageUsed: nextStorageUsed });
  libraryAssets = candidate;
  storageUsed = nextStorageUsed;
  return { success: true, asset: newAsset };
}

export function rescanLibrary(): number {
  const candidate = scanExistingFiles(libraryAssets);
  persistCandidate({ assets: candidate });
  libraryAssets = candidate;
  return libraryAssets.length;
}

// ─── Storage / Settings ─────────────────────────────────────

function fileSizeGb(sizeStr: string): number {
  const match = sizeStr.match(/^([0-9.]+)\s*(MB|GB)/i);
  if (match) {
    const val = parseFloat(match[1]);
    const isMB = match[2].toUpperCase() === "MB";
    return isMB ? val / 1024 : val;
  }
  return 0;
}

function calculateStorage(sizeStr: string, isAdd: boolean): number {
  const gbVal = fileSizeGb(sizeStr);
  return isAdd ? Math.min(storageLimit, storageUsed + gbVal) : Math.max(0, storageUsed - gbVal);
}

function changeStorage(sizeStr: string, isAdd: boolean): void {
  storageUsed = calculateStorage(sizeStr, isAdd);
}

export function getStorage(): StorageInfo {
  const free = storageLimit - storageUsed;
  return {
    used: parseFloat(storageUsed.toFixed(1)),
    total: storageLimit,
    free: parseFloat(free.toFixed(1)),
    percent: parseFloat(((storageUsed / storageLimit) * 100).toFixed(1)),
  };
}

export function getOutputFolder(): string {
  return outputFolder;
}

export function setOutputFolder(folder: string): string {
  persistCandidate({ outputFolder: folder });
  outputFolder = folder;
  return outputFolder;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
