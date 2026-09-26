/**
 * vec-config.ts — Mapping AssetType → VTracer args (rebuild-plan.md F1.3).
 *
 * Pendekatan baru: map LANGSUNG dari AssetType ke VTracer CLI args.
 * Tidak ada abstraksi profile yang kompleks.
 */

import { VtracerOptions } from "../../binaries/vtracer";
import { AssetType, ImageAnalysis } from "./vec-analyze";
import { VecOutputOptions } from "./vec-output";

export interface VecConfig {
  vtracerArgs: Partial<VtracerOptions>;
  postprocess: {
    artboard: boolean;
    padding: number;        // px padding di sekitar artwork
    centerArtwork: boolean;
  };
  /** Fitur output ala Vectorizer.AI (default per asset type). */
  output?: VecOutputOptions;
  retryWithArgs?: Partial<VtracerOptions>; // fallback jika hasil buruk
}

export type IconTraceStyle =
  | "black_outline" | "black_filled" | "glyph" | "outline" | "lineal_color"
  | "flat" | "filled" | "duotone" | "hand_drawn" | "gradient" | "threed";

export interface IconPresetResolution {
  assetType: AssetType;
  complexity: "low" | "medium" | "high";
  removeBackground: boolean;
  vtracerArgs: Partial<VtracerOptions>;
}

/** The former Studio bulk trace table, expressed in VTracer's native knobs. */
const ICON_PRESETS: Record<IconTraceStyle, IconPresetResolution> = {
  black_outline: { assetType: "outline-icon", complexity: "low", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "watershed", hierarchical: "cutout", watershedDetail: 160, filterSpeckle: 12, simplify: 1.5, pathPrecision: 0.35, maxColors: 2, optimize: 2 } },
  outline:      { assetType: "outline-icon", complexity: "low", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "watershed", hierarchical: "cutout", watershedDetail: 176, filterSpeckle: 10, simplify: 1.2, pathPrecision: 0.1, maxColors: 2, optimize: 2 } },
  black_filled: { assetType: "flat-icon", complexity: "low", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 8, simplify: 1.5, pathPrecision: 1, colorPrecision: 6, maxColors: 8, optimize: 2 } },
  glyph:        { assetType: "flat-icon", complexity: "low", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 10, simplify: 1.5, pathPrecision: 1, colorPrecision: 6, maxColors: 8, optimize: 2 } },
  duotone:      { assetType: "flat-icon", complexity: "low", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 8, simplify: 1.25, pathPrecision: 0.75, colorPrecision: 6, maxColors: 4, optimize: 2 } },
  filled:       { assetType: "flat-icon", complexity: "medium", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 8, simplify: 1.25, pathPrecision: 0.75, colorPrecision: 6, maxColors: 12, optimize: 2 } },
  lineal_color: { assetType: "flat-icon", complexity: "medium", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 8, simplify: 1.25, pathPrecision: 0.75, colorPrecision: 6, maxColors: 16, optimize: 2 } },
  flat:         { assetType: "flat-icon", complexity: "medium", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 8, simplify: 1.25, pathPrecision: 0.75, colorPrecision: 6, maxColors: 16, optimize: 2 } },
  hand_drawn:   { assetType: "flat-illustration", complexity: "medium", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 6, simplify: 0.8, pathPrecision: 0.35, colorPrecision: 8, maxColors: 16, optimize: 2 } },
  gradient:     { assetType: "flat-illustration", complexity: "high", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 4, simplify: 0.5, pathPrecision: 0.5, colorPrecision: 8, maxColors: 32, gradientStep: 8, optimize: 1 } },
  threed:       { assetType: "flat-illustration", complexity: "high", removeBackground: true, vtracerArgs: { mode: "spline", clustering: "color-cluster", hierarchical: "stacked", filterSpeckle: 4, simplify: 0.5, pathPrecision: 0.5, colorPrecision: 8, maxColors: 32, gradientStep: 8, optimize: 1 } },
};

export function resolveIconPreset(style: string | null | undefined, fallback: AssetType): IconPresetResolution | null {
  return style && Object.prototype.hasOwnProperty.call(ICON_PRESETS, style)
    ? { ...ICON_PRESETS[style as IconTraceStyle], vtracerArgs: { ...ICON_PRESETS[style as IconTraceStyle].vtracerArgs } }
    : null;
}

export { ICON_PRESETS };

const CONFIGS: Record<AssetType, VecConfig> = {
  "flat-icon": {
    vtracerArgs: {
      mode: "spline",
      clustering: "color-cluster",
      hierarchical: "stacked",
      filterSpeckle: 8,
      colorPrecision: 8,
      maxColors: 16,
      simplify: 1.5,
      pathPrecision: 1,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 20, centerArtwork: true },
    retryWithArgs: { simplify: 2.5, filterSpeckle: 16, maxColors: 8 },
  },

  "outline-icon": {
    // Kunci: watershed + cutout untuk outline tegas
    // watershed: region-forming berdasarkan kontur visual (bukan proximity warna)
    // cutout: shapes share boundary → tidak ada overlap di outline
    vtracerArgs: {
      mode: "spline",
      clustering: "watershed",
      hierarchical: "cutout",
      watershedDetail: 160,   // lebih tinggi dari default 128
      filterSpeckle: 16,      // agresif buang fragment kecil
      simplify: 2.0,          // smooth outline yang melengkung
      pathPrecision: 1,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 20, centerArtwork: true },
    retryWithArgs: {
      // fallback: color-cluster jika watershed gagal
      clustering: "color-cluster",
      hierarchical: "stacked",
      filterSpeckle: 12,
      maxColors: 12,
    },
  },

  "flat-illustration": {
    vtracerArgs: {
      mode: "spline",
      clustering: "color-cluster",
      hierarchical: "stacked",
      filterSpeckle: 6,
      colorPrecision: 8,
      maxColors: 24,
      simplify: 1.0,
      pathPrecision: 1,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 10, centerArtwork: true },
    retryWithArgs: { simplify: 1.5, filterSpeckle: 10 },
  },

  "line-art": {
    // Preset bw: binary thresholding, jauh lebih bersih untuk line art
    // adaptive: Bradley-Roth thresholding untuk gambar dengan pencahayaan tidak merata
    vtracerArgs: {
      preset: "bw",
      mode: "spline",
      filterSpeckle: 10,
      simplify: 1.5,
      pathPrecision: 1,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 20, centerArtwork: true },
    retryWithArgs: {
      // fallback dengan adaptive threshold
      clustering: "bw",
      adaptive: true,
    },
  },

  photo: {
    vtracerArgs: {
      preset: "photo",
      mode: "spline",
      clustering: "watershed",
      hierarchical: "cutout",
      watershedDetail: 192,
      filterSpeckle: 4,
      simplify: 0.5,
      pathPrecision: 2,
      optimize: 1,
    },
    postprocess: { artboard: false, padding: 0, centerArtwork: false },
  },

  "pixel-art": {
    vtracerArgs: {
      mode: "pixel",
      clustering: "color-cluster",
      filterSpeckle: 1,
      colorPrecision: 8,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 10, centerArtwork: true },
  },

  "cut-engrave": {
    // Preset "Pemotongan & ukiran" (panduan Vectorizer.AI): hanya garis besar,
    // digambar sebagai goresan tipis — siap untuk pemotong laser/vinil.
    // Watershed + cutout → outline tegas, lalu postprocess drawStyle=edges.
    vtracerArgs: {
      mode: "spline",
      clustering: "watershed",
      hierarchical: "cutout",
      watershedDetail: 160,
      filterSpeckle: 8,
      simplify: 1.5,
      pathPrecision: 1,
      optimize: 2,
    },
    postprocess: { artboard: true, padding: 20, centerArtwork: true },
    output: { drawStyle: "edges", strokeWidth: 1, strokeReplacement: "#000000", nonScaleStroke: true },
    retryWithArgs: {
      clustering: "bw",
      filterSpeckle: 12,
      simplify: 2.0,
    },
  },
};

/**
 * Ambil config untuk asset, dengan override user (assetType manual).
 */
export function getConfigForAsset(
  analysis: ImageAnalysis,
  userOverride?: Partial<VtracerOptions>
): VecConfig {
  // User bisa override assetType via userOverride?.preset? Tidak — userOverride
  // adalah vtracer args langsung. assetType override ditangani di vec-run via
  // parameter terpisah (job.assetType).
  const base = CONFIGS[analysis.assetType] || CONFIGS["flat-illustration"];
  if (!userOverride) return base;

  return {
    ...base,
    vtracerArgs: { ...base.vtracerArgs, ...userOverride },
    retryWithArgs: base.retryWithArgs ? { ...base.retryWithArgs } : undefined,
  };
}

export { CONFIGS };
