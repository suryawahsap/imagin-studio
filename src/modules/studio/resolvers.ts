// Studio resolvers — diekstrak dari imagin_studio.tsx baris 625–664, 6754–6923.
// Resolution layer: platform, category, style, background, format, profile, all-in-one.
// Style preset lookup/guidance LIVE di flows/dnaData.ts (findStylePreset +
// buildStyleGuidance) — resolveStyle di sini cuma pass-through name (paritas canvas).

import type { VectorState, ResolvedProductionConfig } from "./types";
import {
  DEFAULT_PLATFORM,
  OFFICIAL_TO_DNA_MAP,
  DNA_TO_OFFICIAL_MAP,
  PLATFORM_ADAPTERS,
  MICROSTOCK_PLATFORMS,
  type PlatformAdapter,
} from "./registry/presets";
import {
  BACKGROUND_STRATEGY,
  CATEGORY_BACKGROUND_STRATEGY,
  SUBCATEGORY_BACKGROUND_OVERRIDE,
  ASSET_TYPE_DEFAULT_BACKGROUND,
  type BackgroundStrategyKey,
  type ResolvedBackground,
} from "./registry/presets";

// ── resolveDNAFromOfficial (line 658) ─────────────────────────────────────
export function resolveDNAFromOfficial(platform: string, categoryId: number | null, subcategoryHint: string = ""): string {
  const adapter: PlatformAdapter | undefined = PLATFORM_ADAPTERS[platform];
  if (adapter && adapter.resolveCategory) return adapter.resolveCategory(categoryId, subcategoryHint);
  if (!categoryId) return "";
  const entry = OFFICIAL_TO_DNA_MAP[platform]?.[categoryId];
  return entry?.default || "";
}

// ── ASSET_PROFILE_SUBKEYWORD_MAP & resolveAssetProfile (line 6785) ───────
const ASSET_PROFILE_SUBKEYWORD_MAP: Array<{ profile: string; match: string[] }> = [
  { profile: "pattern", match: ["pattern", "texture", "decorative pattern", "seamless"] },
  { profile: "background", match: ["background", "texture & pattern", "urban skyline", "landscape"] },
  { profile: "icon", match: ["icon", "icon set", "social media icons", "arrows & shapes", "badges & labels"] },
  { profile: "infographic", match: ["infographic", "charts", "diagram", "maps", "navigation"] },
  { profile: "character", match: ["character", "mascot", "people"] },
  { profile: "scene", match: ["scene", "cityscape", "interior", "landscape", "travel"] },
  { profile: "object", match: ["object", "equipment", "device", "tools", "vehicles", "food", "flower"] },
];

export function resolveAssetProfile({
  assetType,
  category,
  subcategory,
  iconMode,
}: {
  assetType: string;
  category: string;
  subcategory: string;
  iconMode: boolean;
}): string {
  if (iconMode) return "icon";
  const sub = (subcategory || "").toLowerCase();
  for (const rule of ASSET_PROFILE_SUBKEYWORD_MAP) {
    if (rule.match.some((m) => sub.includes(m))) return rule.profile;
  }
  if (assetType === "3d") return "object";
  if (assetType === "illustration") return "scene";
  return "illustration";
}

// ── resolveExportFormat (line 6765) ───────────────────────────────────────
export function resolveExportFormat({
  assetType,
  background,
  iconMode,
  outputFormat,
  explicit,
}: {
  assetType: string;
  background: string;
  iconMode: boolean;
  outputFormat: string;
  explicit: boolean;
}): "PNG" | "JPEG" {
  const bg = (background || "white").toLowerCase();
  if (iconMode || bg === "transparent" || bg === "greenscreen") return "PNG";
  if (bg === "scene") return "JPEG";
  if (explicit && (outputFormat === "PNG" || outputFormat === "JPEG")) return outputFormat;
  if (assetType === "illustration" || assetType === "3d" || assetType === "photo") return "JPEG";
  return "PNG";
}

// ── resolveBackground (line 6505) ─────────────────────────────────────────
export function resolveBackground(
  userBackground: string,
  assetType: string,
  categoryKey: string,
  subcategoryKey: string,
  isExplicitUserChoice: boolean = false
): ResolvedBackground {
  const defaultForType = ASSET_TYPE_DEFAULT_BACKGROUND[assetType] ?? "white";
  const isAutoRequest = !userBackground || userBackground === "auto";

  // Priority 1: user explicit (non-auto)
  if (!isAutoRequest && isExplicitUserChoice) {
    const strat = BACKGROUND_STRATEGY[userBackground as BackgroundStrategyKey] ?? BACKGROUND_STRATEGY.white;
    return { mode: strat.mode, promptHint: strat.promptHint, wasOverridden: false };
  }
  // Legacy: hormati non-default values
  if (!isAutoRequest && userBackground !== defaultForType) {
    const strat = BACKGROUND_STRATEGY[userBackground as BackgroundStrategyKey] ?? BACKGROUND_STRATEGY.white;
    return { mode: strat.mode, promptHint: strat.promptHint, wasOverridden: false };
  }
  // Priority 2: 3D always white
  if (assetType === "3d") {
    return { mode: "white", promptHint: BACKGROUND_STRATEGY.white.promptHint, wasOverridden: false };
  }
  // Priority 2b: photo always scene
  if (assetType === "photo") {
    return { mode: "scene", promptHint: BACKGROUND_STRATEGY.scene.promptHint, wasOverridden: false };
  }
  // Priority 3: subcategory override
  const subKey = SUBCATEGORY_BACKGROUND_OVERRIDE[categoryKey]?.[subcategoryKey];
  if (subKey) {
    const strat = BACKGROUND_STRATEGY[subKey];
    return { mode: strat.mode, promptHint: strat.promptHint, wasOverridden: strat.mode !== userBackground };
  }
  // Priority 4: category-level
  const catKey = CATEGORY_BACKGROUND_STRATEGY[categoryKey];
  if (catKey) {
    const strat = BACKGROUND_STRATEGY[catKey];
    return { mode: strat.mode, promptHint: strat.promptHint, wasOverridden: strat.mode !== userBackground };
  }
  // Priority 5: fallback
  return { mode: "white", promptHint: BACKGROUND_STRATEGY.white.promptHint, wasOverridden: false };
}

// ── resolvePlatform (line 6830) ───────────────────────────────────────────
export function resolvePlatform(platformKey: string | null | undefined): {
  key: string;
  adapter: PlatformAdapter | undefined;
  config: ReturnType<PlatformAdapter["config"]> | undefined;
  active: boolean;
} {
  const key = platformKey || DEFAULT_PLATFORM;
  const adapter = PLATFORM_ADAPTERS[key];
  if (!adapter || adapter.status !== "active") {
    const fallback = PLATFORM_ADAPTERS[DEFAULT_PLATFORM];
    return { key: DEFAULT_PLATFORM, adapter: fallback, config: fallback?.config(), active: false };
  }
  return { key, adapter, config: adapter.config(), active: true };
}

// ── resolveCategory (line 6841) ───────────────────────────────────────────
export function resolveCategory({
  platform,
  platformCategoryId,
  adobeCategory,
  internalCategory,
  subcategory,
}: {
  platform: string;
  platformCategoryId: number | null;
  adobeCategory?: string;
  internalCategory?: string;
  subcategory?: string;
}): { platformCategoryId: number | null; category: string; subcategory: string; dnaCategory: string } {
  const platformKey = platform || DEFAULT_PLATFORM;
  const official = adobeCategory || "";
  const dnaCategory =
    internalCategory || (official ? resolveDNAFromOfficial(platformKey, platformCategoryId, subcategory) : "") || official;
  return {
    platformCategoryId: platformCategoryId ?? null,
    category: official,
    subcategory: subcategory || "",
    dnaCategory,
  };
}

// ── resolveStyle (line 6857) — pass-through tervalidasi, paritas canvas 7332-7336 ──
export function resolveStyle(styleName: string | null | undefined): string {
  // Sengaja pass-through (known & custom string dipertahankan utuh). Style DNA prompt
  // TIDAK diresolusi di sini — dibangun belakangan oleh buildStyleGuidance
  // (flows/dnaData.ts) dan buildStyleInterpretation (generationFlow).
  return styleName || "";
}

// ── resolveCompatibility (line 6864) ──────────────────────────────────────
export function resolveCompatibility({
  assetType,
  iconMode,
}: {
  assetType: string;
  iconMode: boolean;
}): string {
  if (iconMode) return "stock-icon";
  if (assetType === "illustration") return "stock-illustration";
  if (assetType === "3d") return "stock-3d";
  if (assetType === "photo") return "stock-photo";
  return "stock-vector";
}

// ── resolveAll (line 6875) — single source of truth ───────────────────────
export function resolveAll({
  vectorState,
  resolvedBg,
}: {
  vectorState: VectorState;
  resolvedBg?: ResolvedBackground;
}): ResolvedProductionConfig {
  const assetType = vectorState.assetType || "vector";
  const iconMode = vectorState.iconMode || false;
  const plat = resolvePlatform(vectorState.platform);
  const cat = resolveCategory({ ...vectorState, platform: plat.key });
  const profile = resolveAssetProfile({
    assetType,
    category: cat.category,
    subcategory: cat.subcategory,
    iconMode,
  });
  const style = resolveStyle(vectorState.visualSettings?.style);
  const bg =
    resolvedBg ||
    resolveBackground(
      vectorState.visualSettings?.background || "white",
      assetType,
      cat.dnaCategory || cat.category,
      cat.subcategory,
      Boolean(vectorState._visualDirty?.background)
    );
  const format = resolveExportFormat({
    assetType,
    background: bg.mode,
    iconMode,
    outputFormat: vectorState.visualSettings?.outputFormat || "PNG",
    explicit: Boolean(vectorState._visualDirty?.outputFormat),
  });
  const workflow = resolveCompatibility({ assetType, iconMode });

  return {
    platform: plat.key,
    platformCategoryId: cat.platformCategoryId,
    category: cat.category,
    subcategory: cat.subcategory,
    dnaCategory: cat.dnaCategory,
    assetType: assetType as ResolvedProductionConfig["assetType"],
    assetProfile: profile,
    style,
    background: bg.mode,
    color: null,
    aspectRatio: vectorState.visualSettings?.aspectRatio || "4:3",
    outputFormat: format,
    highDpiSharpness: Boolean(vectorState.visualSettings?.highDpiSharpness),
    workflow,
    resolvedFrom: resolvedBg ? "auto" : "default",
    resolvedAt: Date.now(),
  };
}

// ── buildResolvedConfig (line 6811) — back-compat wrapper ────────────────
export function buildResolvedConfig({
  vectorState,
  resolvedBg,
}: {
  vectorState: VectorState;
  resolvedBg?: ResolvedBackground;
}): ResolvedProductionConfig {
  return resolveAll({ vectorState, resolvedBg });
}

// ── assetFileExt, resolveReleasesValue, getCsvMetadataEligibility (Fase 2) ──
// Re-exported from app-level metadata module (single source of truth).
export { assetFileExt, resolveReleasesValue, getCsvMetadataEligibility } from "../../components/metadata/export/csv";
