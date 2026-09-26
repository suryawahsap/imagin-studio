// Studio batch engine — diekstrak dari imagin_studio.tsx baris 8345–8517,
// 16153–16209. MURNI helper: validasi JSON batch import, prompt defaults, deriveSidebarStage.
// Dispatcher generate (executeGenerateNormalAssets / Icon / JSON) HIDUP di
// flows/generationFlow.ts — sengaja bukan di file ini.

import {
  ADOBE_CATEGORY_TAXONOMY,
  ASSET_TYPE_PRESETS,
  DEFAULT_PLATFORM,
  DNA_TO_OFFICIAL_MAP,
  STYLES_BY_ASSET_TYPE,
} from "../registry/presets";
import { ICON_STYLE_PRESETS } from "../registry/icon-dna";
import { ICON_GENERATION_MODES, ICON_GRID_OPTIONS } from "../registry/constants";
import { resolveDNAFromOfficial } from "../resolvers";
import { findStylePreset } from "./prompt";
import { checkBrandSafety } from "./compliance";

// Valid iconGenerationMode values (shared with validateImportedJSON + resolvePromptDefaults).
export const VALID_ICON_GENERATION_MODES = ICON_GENERATION_MODES.map(m => m.id);
// Valid iconQuantity for sheet mode — single source of truth (matches ICON_GRID_OPTIONS).
export const VALID_SHEET_QUANTITIES = ICON_GRID_OPTIONS.map(g => g.qty);
// Fallback sheet qty when an invalid value is supplied (mirrors generationFlow clamp).
export const DEFAULT_SHEET_QUANTITY = 6;

// ── validateImportedJSON (line 8349) ──────────────────────────────────────
export interface JSONBatchImport {
  batch_name?: string;
  prompts?: any[];
  defaults?: any;
}

export interface JSONValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateImportedJSON(raw: any): JSONValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Invalid JSON — not an object"], warnings: [] };
  }
  if (!raw.batch_name || typeof raw.batch_name !== "string") errors.push('Missing required field: "batch_name"');
  if (!Array.isArray(raw.prompts) || raw.prompts.length === 0) errors.push('Missing or empty "prompts" array');
  if (raw.prompts?.length > 200) errors.push("Too many prompts — maximum 200 per import");

  // Validasi defaults-level category + subcategory
  const defaultCategory: string | undefined = raw.defaults?.adobeCategory;
  const defaultSubcategory: string | undefined = raw.defaults?.subcategory;
  if (defaultCategory && !ADOBE_CATEGORY_TAXONOMY[defaultCategory]) {
    errors.push(
      `defaults.adobeCategory "${defaultCategory}" tidak valid. Gunakan salah satu dari: ${Object.keys(ADOBE_CATEGORY_TAXONOMY).join(", ")}`
    );
  }
  if (defaultCategory && defaultSubcategory && ADOBE_CATEGORY_TAXONOMY[defaultCategory]) {
    const validSubs = ADOBE_CATEGORY_TAXONOMY[defaultCategory];
    if (!validSubs.includes(defaultSubcategory)) {
      errors.push(
        `defaults.subcategory "${defaultSubcategory}" tidak termasuk dalam category "${defaultCategory}". Valid: ${validSubs.join(", ")}`
      );
    }
  }

  raw.prompts?.forEach((p: any, i: number) => {
    const prefix = `Prompt #${i + 1}`;

    if (!p.prompt || typeof p.prompt !== "string" || !p.prompt.trim()) {
      errors.push(`${prefix}: missing or empty "prompt" field`);
    }

    if (p.adobeCategory && !ADOBE_CATEGORY_TAXONOMY[p.adobeCategory]) {
      errors.push(
        `${prefix}: adobeCategory "${p.adobeCategory}" tidak valid. Gunakan salah satu dari: ${Object.keys(ADOBE_CATEGORY_TAXONOMY).join(", ")}`
      );
    }

    // Style di luar registry = CUSTOM STYLE (fitur, bukan error)
    if (p.style) {
      const resolvedAssetType = p.assetType ?? raw.defaults?.assetType ?? "vector";
      const known =
        (STYLES_BY_ASSET_TYPE[resolvedAssetType] ?? []).includes(p.style) || !!findStylePreset(p.style);
      if (!known) {
        warnings.push(
          `${prefix}: custom style "${p.style}" terdeteksi — akan dipertahankan & diinterpretasi (bukan fallback ke preset).`
        );
      }
    }

    // iconMode + iconStyle harus selalu berpasangan
    const resolvedIconMode = p.iconMode ?? raw.defaults?.iconMode;
    const resolvedIconStyle = p.iconStyle ?? raw.defaults?.iconStyle;

    if (resolvedIconMode && !resolvedIconStyle) {
      errors.push(
        `${prefix}: "iconMode: true" memerlukan "iconStyle". Pilih salah satu: ${Object.keys(ICON_STYLE_PRESETS).join(", ")}`
      );
    }
    if (!resolvedIconMode && resolvedIconStyle) {
      warnings.push(
        `${prefix}: "iconStyle" di-set tapi "iconMode" tidak aktif — iconStyle akan diabaikan. Tambahkan "iconMode: true" jika ingin generate icon.`
      );
    }
    if (resolvedIconMode && resolvedIconStyle && !ICON_STYLE_PRESETS[resolvedIconStyle]) {
      errors.push(
        `${prefix}: iconStyle "${resolvedIconStyle}" tidak valid. Pilih salah satu: ${Object.keys(ICON_STYLE_PRESETS).join(", ")}`
      );
    }

    // iconGenerationMode — hanya valid saat iconMode aktif; jika di-set tanpa
    // iconMode, diabaikan dengan warning (pola sama seperti iconStyle).
    const resolvedIconGenerationMode = p.iconGenerationMode ?? raw.defaults?.iconGenerationMode;
    if (resolvedIconMode && resolvedIconGenerationMode && !VALID_ICON_GENERATION_MODES.includes(resolvedIconGenerationMode)) {
      errors.push(
        `${prefix}: iconGenerationMode "${resolvedIconGenerationMode}" tidak valid. Nilai yang valid: ${VALID_ICON_GENERATION_MODES.join(", ")}`
      );
    }
    if (!resolvedIconMode && resolvedIconGenerationMode) {
      warnings.push(
        `${prefix}: "iconGenerationMode" di-set tapi "iconMode" tidak aktif — akan diabaikan. Tambahkan "iconMode: true" jika ingin generate icon.`
      );
    }

    // iconQuantity — sheet mode hanya menerima qty dari ICON_GRID_OPTIONS.
    const effectiveGenerationMode = resolvedIconMode
      ? (resolvedIconGenerationMode ?? "per_canvas")
      : "per_canvas";
    if (resolvedIconMode && effectiveGenerationMode === "sheet") {
      const resolvedIconQuantity = p.iconQuantity ?? raw.defaults?.iconQuantity;
      if (resolvedIconQuantity == null) {
        errors.push(`${prefix}: "iconQuantity" wajib diisi saat iconGenerationMode "sheet". Valid: ${VALID_SHEET_QUANTITIES.join(", ")}`);
      } else if (!VALID_SHEET_QUANTITIES.includes(resolvedIconQuantity)) {
        errors.push(
          `${prefix}: iconQuantity "${resolvedIconQuantity}" tidak valid untuk sheet mode. Gunakan salah satu: ${VALID_SHEET_QUANTITIES.join(", ")}`
        );
      }
    }

    // Cross-validation assetType 'photo'
    const resolvedAssetTypeForPhoto = p.assetType ?? raw.defaults?.assetType;
    if (resolvedAssetTypeForPhoto === "photo") {
      if (resolvedIconMode) {
        errors.push(`${prefix}: "assetType: photo" tidak bisa dikombinasi dengan "iconMode" (full-frame foto vs icon set).`);
      }
      const resolvedBackgroundForPhoto = p.background ?? raw.defaults?.background;
      if (resolvedBackgroundForPhoto === "white" || resolvedBackgroundForPhoto === "transparent") {
        warnings.push(
          `${prefix}: "assetType: photo" dengan background "${resolvedBackgroundForPhoto}" tidak masuk akal untuk full-frame lifestyle — akan dipaksa ke "scene".`
        );
      }
    }

    // Brand safety check
    if (p.prompt) {
      const brandHits = checkBrandSafety(p.prompt);
      if (brandHits.length > 0) errors.push(`${prefix}: mengandung brand/IP terlarang: "${brandHits.join(", ")}"`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

// ── resolvePromptDefaults (line 8438) ─────────────────────────────────────
export interface ResolvedPromptDefaults {
  id: string;
  prompt: string;
  assetType: string;
  adobeCategory: string;
  internalCategory: string;
  platform: string;
  platformCategoryId: number | null;
  subcategory: string;
  style: string;
  aspectRatio: string;
  background: string;
  outputFormat: string;
  _formatExplicit: boolean;
  highDpiSharpness: boolean;
  faceless: boolean;
  negativeSpace: boolean;
  iconMode: boolean;
  iconStyle: string | null;
  iconGenerationMode: string;
  iconQuantity: number;
  _tags: string[];
  resolutionTarget: string;
  compositionPreset: string;
}

export function resolvePromptDefaults(prompt: any, defaults: any = {}): ResolvedPromptDefaults {
  const assetType = prompt.assetType ?? defaults.assetType ?? "vector";
  const preset = ASSET_TYPE_PRESETS[assetType as keyof typeof ASSET_TYPE_PRESETS] ?? ASSET_TYPE_PRESETS.vector;

  let style = prompt.style ?? defaults.style ?? preset.style;

  const platform = prompt.platform ?? defaults.platform ?? DEFAULT_PLATFORM;
  const rawPlatformCategoryId = prompt.platformCategoryId ?? defaults.platformCategoryId ?? null;

  const rawSubcategoryHint = prompt.subcategory ?? defaults.subcategory ?? "";
  const resolvedFromPlatform =
    rawPlatformCategoryId != null ? resolveDNAFromOfficial(platform, rawPlatformCategoryId, rawSubcategoryHint) : "";
  const rawCategory =
    prompt.adobeCategory ?? defaults.adobeCategory ?? resolvedFromPlatform ?? "Business";
  const adobeCategory = ADOBE_CATEGORY_TAXONOMY[rawCategory] ? rawCategory : "Business";
  const internalCategory = adobeCategory;
  const platformCategoryId =
    rawPlatformCategoryId ?? DNA_TO_OFFICIAL_MAP[platform]?.[adobeCategory] ?? null;

  const rawSubcategory = prompt.subcategory ?? defaults.subcategory ?? "";
  const validSubcategories = ADOBE_CATEGORY_TAXONOMY[adobeCategory] ?? [];
  const subcategory = validSubcategories.includes(rawSubcategory)
    ? rawSubcategory
    : (validSubcategories[0] ?? "");

  const iconMode = assetType === "photo" ? false : (prompt.iconMode ?? defaults.iconMode ?? false);
  const rawIconStyle = prompt.iconStyle ?? defaults.iconStyle ?? null;
  const iconStyle =
    iconMode && rawIconStyle && ICON_STYLE_PRESETS[rawIconStyle] ? rawIconStyle : null;

  const rawBackground = prompt.background ?? defaults.background ?? preset.background;
  const background =
    assetType === "photo" && (rawBackground === "white" || rawBackground === "transparent")
      ? "scene"
      : rawBackground;

  // Safe icon resolution: invalid iconGenerationMode defaults to "per_canvas";
  // sheet mode clamps invalid iconQuantity to the default (mirrors generationFlow).
  const finalIconMode = iconMode && !!iconStyle;
  let iconGenerationMode = prompt.iconGenerationMode ?? defaults.iconGenerationMode ?? "per_canvas";
  if (!VALID_ICON_GENERATION_MODES.includes(iconGenerationMode)) {
    iconGenerationMode = "per_canvas";
  }
  let iconQuantity = prompt.iconQuantity ?? defaults.iconQuantity ?? 1;
  if (finalIconMode && iconGenerationMode === "sheet" && !VALID_SHEET_QUANTITIES.includes(iconQuantity)) {
    iconQuantity = DEFAULT_SHEET_QUANTITY;
  }

  return {
    id: prompt.id ?? `json_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prompt: prompt.prompt.trim(),
    assetType,
    adobeCategory,
    internalCategory,
    platform,
    platformCategoryId,
    subcategory,
    style,
    aspectRatio: prompt.aspectRatio ?? defaults.aspectRatio ?? preset.aspectRatio,
    resolutionTarget: prompt.resolutionTarget ?? defaults.resolutionTarget ?? "4k",
    compositionPreset: prompt.compositionPreset ?? defaults.compositionPreset ?? "auto",
    background,
    outputFormat: prompt.outputFormat ?? defaults.outputFormat ?? preset.outputFormat ?? "PNG",
    _formatExplicit: Boolean(prompt.outputFormat != null || defaults.outputFormat != null),
    highDpiSharpness: prompt.highDpiSharpness ?? defaults.highDpiSharpness ?? true,
    faceless: prompt.faceless ?? defaults.faceless ?? preset.faceless ?? false,
    negativeSpace: prompt.negativeSpace ?? defaults.negativeSpace ?? preset.negativeSpace ?? true,
    iconMode: finalIconMode,
    iconStyle,
    iconGenerationMode,
    iconQuantity,
    _tags: Array.isArray(prompt.tags) ? prompt.tags : [],
  };
}

// ── deriveSidebarStage (line 8526) ────────────────────────────────────────
export type SidebarStage = "generating" | "batch_paused" | "idle_json" | "idle";

export function deriveSidebarStage({
  importedBatch,
  isRenderingAssets,
  batchQueue,
}: {
  importedBatch: any;
  isRenderingAssets: boolean;
  batchQueue: any;
}): SidebarStage {
  if (isRenderingAssets) return batchQueue?.isPaused ? "batch_paused" : "generating";
  // FIX #17 (audit): cleanup batch bisa mengosongkan importedBatch saat
  // batchQueue masih berjalan — tanpa cek isRunning, UI salah tampil "idle".
  if (batchQueue?.isRunning) return batchQueue?.isPaused ? "batch_paused" : "generating";
  if (importedBatch) {
    if (importedBatch.status === "paused") return "batch_paused";
    if (importedBatch.status === "ready") return "idle_json";
    if (importedBatch.status === "generating") return "generating";
  }
  return "idle";
}
