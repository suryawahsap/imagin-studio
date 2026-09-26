import fs from "fs";
import path from "path";
import { sanitize9RouterModelCatalog } from "./9router-models";
import * as electron from "electron";
import { metadataRoot } from "../binaries/paths";

const safeStorage = (electron as typeof import("electron")).safeStorage ?? {
  isEncryptionAvailable: () => false,
  encryptString: (_plain: string): Buffer => { throw new Error("OS encryption not available (safeStorage)"); },
  decryptString: (_encrypted: Buffer): string => { throw new Error("OS encryption not available (safeStorage)"); },
};

/**
 * App settings terpusat (plan §12 / fase 4):
 * - Persist ke storage/metadata/settings.json (bukan localStorage)
 * - Binary path override (vtracer/ffmpeg/inkscape/realesrgan)
 * - Concurrent task limit (1–4) — dipakai task non-GPU
 * - Default per-modul (scale, format, fps, dst.)
 * - API keys disimpan terenkripsi via Electron safeStorage (base64 di JSON)
 */

export interface AppSettings {
  outputFolder: string;
  concurrentTasks: number;
  openInLibraryAfter: boolean;
  binaries: {
    vtracer: string;
    ffmpeg: string;
    inkscape: string;
    realesrgan: string;
  };
  moduleDefaults: {
    upscaleScale: string;
    upscaleFormat: string;
    vectorType: string;
    vectorQuality: string;
    animationFps: string;
    animationDuration: string;
  };
  studio: {
    // encrypted keys (base64)
    encryptedGeminiKey?: string;
    encryptedNineRouterKey?: string;
    textModel: string;
    imageModel: string;
    availableTextModels?: string[];
    availableImageModels?: string[];
    nineRouterBaseUrl?: string;
    nineRouterImageEndpoint?: string;
    provider: "gemini" | "9router";
    theme?: string;
    negativePrompt?: string;
    diffCheck?: boolean;
    videoUrl?: string;
    activeProjectId?: string;
    apiCallsDate?: string;
    apiCallsCount?: number;
    idbMigrated?: boolean;
  };
}

let settingsPath = path.join(metadataRoot, "settings.json");

const DEFAULTS: AppSettings = {
  outputFolder: "storage/assets",
  concurrentTasks: 1,
  openInLibraryAfter: true,
  binaries: {
    vtracer: "",
    ffmpeg: "",
    inkscape: "",
    realesrgan: "",
  },
  moduleDefaults: {
    upscaleScale: "2x",
    upscaleFormat: "PNG",
    vectorType: "Illustration",
    vectorQuality: "Balanced",
    animationFps: "30 fps",
    animationDuration: "2000",
  },
  studio: {
    encryptedGeminiKey: undefined,
    encryptedNineRouterKey: undefined,
    textModel: "ag/gemini-2.5-flash",
    imageModel: "ag/gemini-3.1-flash-image",
    availableTextModels: ["ag/gemini-2.5-flash"],
    availableImageModels: ["ag/gemini-3.1-flash-image"],
    nineRouterBaseUrl: "https://9router.rahmatur.dev",
    nineRouterImageEndpoint: "https://9router.rahmatur.dev/v1/images/generations",
    provider: "9router",
  },
};

let settings: AppSettings = loadSettings();

// ── Encryption helpers (main only) ──────────────────────────────────────────

function encryptText(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption not available (safeStorage)");
  }
  const encrypted = safeStorage.encryptString(plain);
  return encrypted.toString("base64");
}

function decryptText(encryptedBase64: string): string {
  const buffer = Buffer.from(encryptedBase64, "base64");
  return safeStorage.decryptString(buffer);
}

// ── Load / persist ──────────────────────────────────────────────────────────

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      const merged = {
        ...DEFAULTS,
        ...raw,
        binaries: { ...DEFAULTS.binaries, ...(raw.binaries || {}) },
        moduleDefaults: { ...DEFAULTS.moduleDefaults, ...(raw.moduleDefaults || {}) },
        studio: { ...DEFAULTS.studio, ...(raw.studio || {}) },
      } as AppSettings;
      merged.studio.availableTextModels = sanitize9RouterModelCatalog(merged.studio.availableTextModels).slice(0, 200);
      merged.studio.availableImageModels = sanitize9RouterModelCatalog(merged.studio.availableImageModels).slice(0, 200);

      // Migrasi plaintext keys → encrypted (jika safeStorage tersedia)
      let migrated = false;
      const studio = merged.studio as any;
      if (safeStorage.isEncryptionAvailable()) {
        if (typeof studio.geminiApiKey === "string" && studio.geminiApiKey.length > 0) {
          try {
            merged.studio.encryptedGeminiKey = encryptText(studio.geminiApiKey);
            delete studio.geminiApiKey;
            migrated = true;
          } catch (e) {
            console.error("[SETTINGS] gagal encrypt geminiApiKey:", e);
          }
        }
        if (typeof studio.nineRouterApiKey === "string" && studio.nineRouterApiKey.length > 0) {
          try {
            merged.studio.encryptedNineRouterKey = encryptText(studio.nineRouterApiKey);
            delete studio.nineRouterApiKey;
            migrated = true;
          } catch (e) {
            console.error("[SETTINGS] gagal encrypt nineRouterApiKey:", e);
          }
        }
        if (migrated) {
          // Hapus field plaintext dari raw agar tidak muncul lagi
          if (raw.studio) {
            delete raw.studio.geminiApiKey;
            delete raw.studio.nineRouterApiKey;
          }
          // Simpan hasil migrasi
          persist(merged);
          return merged;
        }
      } else {
        // Jika safeStorage tidak tersedia, hapus plaintext agar tidak disimpan (tidak boleh fallback)
        if (studio.geminiApiKey !== undefined || studio.nineRouterApiKey !== undefined) {
          console.warn("[SETTINGS] safeStorage unavailable, removing plaintext keys from loaded data");
          delete studio.geminiApiKey;
          delete studio.nineRouterApiKey;
          // Simpan perubahan agar plaintext tidak tertulis
          persist(merged);
          return merged;
        }
      }

      return merged;
    }
  } catch (err) {
    console.error("[SETTINGS] load failed:", err);
  }
  return { ...DEFAULTS };
}

function persist(value: AppSettings = settings): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const studio = { ...value.studio } as AppSettings["studio"] & { geminiApiKey?: string; nineRouterApiKey?: string };
  delete studio.geminiApiKey;
  delete studio.nineRouterApiKey;
  fs.writeFileSync(settingsPath, JSON.stringify({ ...value, studio }, null, 2), "utf-8");
}

// ── Public getters / setters ──────────────────────────────────────────────

export function getSettings(): AppSettings {
  return settings;
}

export function getBinaryOverride(tool: keyof AppSettings["binaries"]): string {
  return settings.binaries[tool] || "";
}

export function setBinaryPath(tool: keyof AppSettings["binaries"], value: string): void {
  settings.binaries[tool] = (value || "").trim();
  persist();
}

export function getConcurrentTasks(): number {
  const n = Math.max(1, Math.min(4, settings.concurrentTasks || 1));
  return n;
}

export function setConcurrentTasks(n: number): void {
  settings.concurrentTasks = Math.max(1, Math.min(4, n || 1));
  persist();
}

export function setOutputFolder(folder: string): void {
  settings.outputFolder = (folder || "").trim();
  persist();
}

export function setOpenInLibraryAfter(v: boolean): void {
  settings.openInLibraryAfter = v;
  persist();
}

export function setModuleDefault<K extends keyof AppSettings["moduleDefaults"]>(
  key: K,
  value: string
): void {
  settings.moduleDefaults[key] = value;
  persist();
}

// ── Studio config: non-secret only ──────────────────────────────────────────

export interface StudioNonSecretConfig {
  provider: "gemini" | "9router";
  textModel: string;
  imageModel: string;
  availableTextModels: string[];
  availableImageModels: string[];
  nineRouterBaseUrl: string;
  nineRouterImageEndpoint: string;
  hasGeminiKey: boolean;
  hasNineRouterKey: boolean;
  theme?: string;
  negativePrompt?: string;
  diffCheck?: boolean;
  videoUrl?: string;
  activeProjectId?: string;
  apiCallsDate?: string;
  apiCallsCount?: number;
  idbMigrated?: boolean;
}

export function getStudioConfig(): StudioNonSecretConfig {
  const s = settings.studio;
  return {
    provider: s.provider,
    textModel: s.textModel,
    imageModel: s.imageModel,
    availableTextModels: sanitize9RouterModelCatalog(s.availableTextModels).slice(0, 200),
    availableImageModels: sanitize9RouterModelCatalog(s.availableImageModels).slice(0, 200),
    nineRouterBaseUrl: s.nineRouterBaseUrl || "https://9router.rahmatur.dev",
    nineRouterImageEndpoint: s.nineRouterImageEndpoint || "https://9router.rahmatur.dev/v1/images/generations",
    hasGeminiKey: safeStorage.isEncryptionAvailable() && getDecryptedGeminiKey().length > 0,
    hasNineRouterKey: safeStorage.isEncryptionAvailable() && getDecryptedNineRouterKey().length > 0,
    theme: s.theme,
    negativePrompt: s.negativePrompt,
    diffCheck: s.diffCheck,
    videoUrl: s.videoUrl,
    activeProjectId: s.activeProjectId,
    apiCallsDate: s.apiCallsDate,
    apiCallsCount: s.apiCallsCount,
    idbMigrated: s.idbMigrated,
  };
}

// ── Decrypted keys (internal use only, never exposed to renderer) ──────────

export function getDecryptedGeminiKey(): string {
  const encrypted = settings.studio.encryptedGeminiKey;
  if (!encrypted) return "";
  try {
    return decryptText(encrypted);
  } catch (e) {
    console.error("[SETTINGS] decrypt geminiKey failed:", e);
    return "";
  }
}

export function getDecryptedNineRouterKey(): string {
  const encrypted = settings.studio.encryptedNineRouterKey;
  if (!encrypted) return "";
  try {
    return decryptText(encrypted);
  } catch (e) {
    console.error("[SETTINGS] decrypt nineRouterKey failed:", e);
    return "";
  }
}

export function setStudioConfig(patch: Partial<{
  geminiApiKey?: string;
  nineRouterApiKey?: string;
  provider?: "gemini" | "9router";
  textModel?: string;
  imageModel?: string;
  availableTextModels?: string[];
  availableImageModels?: string[];
  nineRouterBaseUrl?: string;
  nineRouterImageEndpoint?: string;
  theme?: string;
  negativePrompt?: string;
  diffCheck?: boolean;
  videoUrl?: string;
  activeProjectId?: string;
  apiCallsDate?: string;
  apiCallsCount?: number;
  idbMigrated?: boolean;
}>): void {
  const candidate: AppSettings = {
    ...settings,
    binaries: { ...settings.binaries },
    moduleDefaults: { ...settings.moduleDefaults },
    studio: {
      ...settings.studio,
      availableTextModels: [...(settings.studio.availableTextModels || [])],
      availableImageModels: [...(settings.studio.availableImageModels || [])],
    },
  };
  const s = candidate.studio;

  // Non-secret fields
  if (patch.provider !== undefined) s.provider = patch.provider;
  if (patch.textModel !== undefined) s.textModel = patch.textModel;
  if (patch.imageModel !== undefined) s.imageModel = patch.imageModel;
  if (patch.availableTextModels !== undefined) s.availableTextModels = sanitize9RouterModelCatalog(patch.availableTextModels).slice(0, 200);
  if (patch.availableImageModels !== undefined) s.availableImageModels = sanitize9RouterModelCatalog(patch.availableImageModels).slice(0, 200);
  if (patch.nineRouterBaseUrl !== undefined) s.nineRouterBaseUrl = patch.nineRouterBaseUrl;
  if (patch.nineRouterImageEndpoint !== undefined) s.nineRouterImageEndpoint = patch.nineRouterImageEndpoint;
  if (patch.theme !== undefined) s.theme = patch.theme;
  if (patch.negativePrompt !== undefined) s.negativePrompt = patch.negativePrompt;
  if (patch.diffCheck !== undefined) s.diffCheck = patch.diffCheck;
  if (patch.videoUrl !== undefined) s.videoUrl = patch.videoUrl;
  if (patch.activeProjectId !== undefined) s.activeProjectId = patch.activeProjectId;
  if (patch.apiCallsDate !== undefined) s.apiCallsDate = patch.apiCallsDate;
  if (patch.apiCallsCount !== undefined) s.apiCallsCount = patch.apiCallsCount;
  if (patch.idbMigrated !== undefined) s.idbMigrated = patch.idbMigrated;

  // Secret fields: encrypt & store, or remove if empty
  if (patch.geminiApiKey !== undefined) {
    const key = (patch.geminiApiKey || "").trim();
    if (key === "") {
      delete s.encryptedGeminiKey;
    } else {
      try {
        s.encryptedGeminiKey = encryptText(key);
      } catch (e) {
        throw new Error(`Gagal menyimpan Gemini API key: ${(e as Error).message}`);
      }
    }
  }

  if (patch.nineRouterApiKey !== undefined) {
    const key = (patch.nineRouterApiKey || "").trim();
    if (key === "") {
      delete s.encryptedNineRouterKey;
    } else {
      try {
        s.encryptedNineRouterKey = encryptText(key);
      } catch (e) {
        throw new Error(`Gagal menyimpan 9Router API key: ${(e as Error).message}`);
      }
    }
  }

  persist(candidate);
  settings = candidate;
}

export function setSettingsPathForTest(filePath: string): void {
  settingsPath = filePath;
  settings = loadSettings();
}

export function resetSettings(): void {
  settings = {
    ...DEFAULTS,
    binaries: { ...DEFAULTS.binaries },
    moduleDefaults: { ...DEFAULTS.moduleDefaults },
    studio: { ...DEFAULTS.studio },
  };
  persist();
}
