import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

function isPackaged(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require("electron") as typeof import("electron");
    return !!app?.isPackaged;
  } catch {
    return false;
  }
}

function resolveRoot(): string {
  // Packaged app: storage/data di userData (app.asar read-only)
  if (isPackaged()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require("electron") as typeof import("electron");
      return app.getPath("userData");
    } catch {}
  }
  // Walk up to nearest package.json: bundled CJS (__dirname=dist-electron)
  // and un-bundled tsx runs (__dirname=electron/binaries) both land on the app root.
  try {
    if (typeof __dirname !== "undefined") {
      let dir = __dirname; // ponytail: 6 levels max; add IMAGIN_ROOT env override if layouts ever diverge
      for (let i = 0; i < 6 && !fs.existsSync(path.join(dir, "package.json")); i++) {
        dir = path.dirname(dir);
      }
      return dir;
    }
  } catch {}
  try {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  } catch {}
  return process.cwd();
}

const ROOT = resolveRoot();

export const storageRoot = path.join(ROOT, "storage");
export const assetsRoot = path.join(storageRoot, "assets");
export const metadataRoot = path.join(storageRoot, "metadata");
export const tempRoot = path.join(storageRoot, "temp");
export const thumbnailsRoot = path.join(storageRoot, "thumbnails");
export const importsRoot = path.join(storageRoot, "imports");
export const exportsRoot = path.join(storageRoot, "exports");
export const modelsRoot = path.join(storageRoot, "models");

export const dirs = {
  images: path.join(assetsRoot, "images"),
  vectors: path.join(assetsRoot, "vectors"),
  eps: path.join(assetsRoot, "eps"),
  upscaled: path.join(assetsRoot, "upscaled"),
  animations: path.join(assetsRoot, "animations"),
  html: path.join(assetsRoot, "html"),
  videos: path.join(assetsRoot, "videos"),
  audio: path.join(assetsRoot, "audio"),
  studio: path.join(assetsRoot, "studio"),
};

export function ensureDirs(): void {
  for (const d of [
    storageRoot,
    assetsRoot,
    metadataRoot,
    tempRoot,
    thumbnailsRoot,
    importsRoot,
    exportsRoot,
    ...Object.values(dirs),
    path.join(tempRoot, "jobs"),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

const PLATFORM_DIR = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";

function exeName(name: string): string {
  return process.platform === "win32" ? `${name}.exe` : name;
}

export function binariesRoot(): string {
  const candidates = [
    // Packaged: resources/bin/<platform> (extraResources per-platform)
    process.resourcesPath && path.join(process.resourcesPath, "bin", PLATFORM_DIR),
    // Dev: electron/bin/<platform>
    path.join(ROOT, "electron", "bin", PLATFORM_DIR),
    // Fallback: legacy flat layout (electron/bin/<tool>)
    process.resourcesPath && path.join(process.resourcesPath, "bin"),
    path.join(ROOT, "electron", "bin"),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return path.join(ROOT, "electron", "bin", PLATFORM_DIR);
}

export function resolveBinary(...segments: string[]): string | null {
  // Windows: cari versi .exe bila ada (e.g. upscayl-bin.exe), else nama apa adanya
  const last = segments[segments.length - 1];
  const search = [segments];
  if (process.platform === "win32") {
    search.push([...segments.slice(0, -1), exeName(last)]);
  }
  for (const seg of search) {
    const p = path.join(binariesRoot(), ...seg);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function exePath(name: string, subdir?: string): string | null {
  const segments = subdir ? [subdir, name] : [name];
  return resolveBinary(...segments);
}

export function which(cmd: string): string | null {
  // Override path dari settings (jika di-set user)
  try {
    const settings = require("../services/settings") as typeof import("../services/settings");
    const toolKey = cmd === "vtracer" ? "vtracer" : cmd === "ffmpeg" ? "ffmpeg" : cmd === "inkscape" ? "inkscape" : null;
    if (toolKey) {
      const override = settings.getBinaryOverride(toolKey);
      if (override && fs.existsSync(override)) {
        try {
          fs.accessSync(override, fs.constants.X_OK);
          return override;
        } catch {}
      }
    }
  } catch {
    // settings service belum siap — lanjut PATH normal
  }
  const PATH = (process.env.PATH || "").split(path.delimiter);
  for (const dir of PATH) {
    const candidate = path.join(dir, cmd);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}
