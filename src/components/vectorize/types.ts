// Shared types & constants for the Vectorize module (iterasi 2 rewrite).

export type PipelineStatus = "imported" | "ready" | "queued" | "processing" | "completed" | "exported" | "failed";
export type AssetTypeOption = "auto" | "flat-icon" | "outline-icon" | "flat-illustration" | "line-art" | "photo" | "pixel-art" | "cut-engrave";
export type TracerMode = "spline" | "polygon" | "pixel";
export type TracerClustering = "color-cluster" | "bw" | "watershed";
export type TracerHierarchical = "stacked" | "cutout";
export type DrawStyle = "fill" | "stroke" | "edges";

export interface VecPostprocess {
  gapFiller?: boolean;
  gapFillerWidth?: number;
  parameterizedShapes?: boolean;
  drawStyle?: DrawStyle;
  strokeWidth?: number;
  strokeReplacement?: string;
  nonScaleStroke?: boolean;
}

export const DEFAULT_POSTPROCESS: VecPostprocess = {
  gapFiller: false,
  gapFillerWidth: 2,
  parameterizedShapes: false,
  drawStyle: "fill",
  strokeWidth: 1,
  strokeReplacement: "",
  nonScaleStroke: false,
};

export interface TracingArgs {
  mode: TracerMode;
  clustering: TracerClustering;
  hierarchical: TracerHierarchical;
  filterSpeckle: number;
  colorPrecision: number;
  gradientStep: number;
  simplify: number;
  maxColors: number;
  pathPrecision: number;
  optimize: number;
  adaptive: boolean;
  threshold: number;
  adaptiveT: number;
  watershedDetail: number;
  palette: string;
}

export const ASSET_TYPE_OPTIONS: Array<{ id: AssetTypeOption; label: string; desc: string }> = [
  { id: "auto",             label: "Auto",        desc: "Auto-detect profile" },
  { id: "flat-icon",        label: "Flat Icon",   desc: "Solid color icon" },
  { id: "outline-icon",     label: "Outline",     desc: "Sharp outline" },
  { id: "flat-illustration",label: "Illustration",desc: "Flat illustration" },
  { id: "line-art",         label: "Line Art",    desc: "Black and white line art" },
  { id: "photo",            label: "Photo",       desc: "Photo or gradient" },
  { id: "pixel-art",        label: "Pixel Art",   desc: "Pixel graphics" },
  { id: "cut-engrave",      label: "Cut&Engrave", desc: "Thin vector stroke lines" },
];

export const TRACING_DEFAULTS: Record<AssetTypeOption, TracingArgs> = {
  auto: {
    mode: "spline", clustering: "color-cluster", hierarchical: "stacked",
    filterSpeckle: 4, colorPrecision: 6, gradientStep: 16,
    simplify: 1.5, maxColors: 16, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 128, palette: "",
  },
  "flat-icon": {
    mode: "spline", clustering: "color-cluster", hierarchical: "stacked",
    filterSpeckle: 8, colorPrecision: 6, gradientStep: 16,
    simplify: 1.5, maxColors: 16, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 128, palette: "",
  },
  "outline-icon": {
    mode: "spline", clustering: "watershed", hierarchical: "cutout",
    filterSpeckle: 16, colorPrecision: 6, gradientStep: 16,
    simplify: 2.0, maxColors: 12, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 160, palette: "",
  },
  "flat-illustration": {
    mode: "spline", clustering: "color-cluster", hierarchical: "stacked",
    filterSpeckle: 6, colorPrecision: 8, gradientStep: 16,
    simplify: 1.0, maxColors: 24, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 128, palette: "",
  },
  "line-art": {
    mode: "spline", clustering: "bw", hierarchical: "stacked",
    filterSpeckle: 10, colorPrecision: 6, gradientStep: 16,
    simplify: 1.5, maxColors: 2, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 128, palette: "",
  },
  photo: {
    mode: "spline", clustering: "watershed", hierarchical: "cutout",
    filterSpeckle: 4, colorPrecision: 6, gradientStep: 16,
    simplify: 0.5, maxColors: 24, pathPrecision: 2, optimize: 1,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 192, palette: "",
  },
  "pixel-art": {
    mode: "pixel", clustering: "color-cluster", hierarchical: "stacked",
    filterSpeckle: 1, colorPrecision: 8, gradientStep: 16,
    simplify: 1.0, maxColors: 32, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 128, palette: "",
  },
  "cut-engrave": {
    mode: "spline", clustering: "watershed", hierarchical: "cutout",
    filterSpeckle: 8, colorPrecision: 6, gradientStep: 16,
    simplify: 1.5, maxColors: 16, pathPrecision: 1, optimize: 2,
    adaptive: false, threshold: 128, adaptiveT: 15, watershedDetail: 160, palette: "",
  },
};

export function tracingToPayload(t: TracingArgs): Record<string, number | string | boolean | undefined> {
  const p: Record<string, number | string | boolean | undefined> = {
    mode: t.mode,
    clustering: t.clustering,
    hierarchical: t.hierarchical,
    filterSpeckle: t.filterSpeckle,
    colorPrecision: t.colorPrecision,
    gradientStep: t.gradientStep,
    simplify: t.simplify,
    maxColors: t.maxColors,
    pathPrecision: t.pathPrecision,
    optimize: t.optimize,
  };
  if (t.clustering === "bw") {
    if (t.adaptive) {
      p.adaptive = true;
      p.adaptiveT = t.adaptiveT;
    } else {
      p.threshold = t.threshold;
    }
  }
  if (t.clustering === "watershed") {
    p.watershedDetail = t.watershedDetail;
  }
  if (t.palette.trim()) {
    p.palette = t.palette.trim();
  }
  return p;
}

export interface Asset {
  tempId: string;
  originalName: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  previewUrl?: string;
  status: PipelineStatus;
  assetType: AssetTypeOption;
  /** Studio metadata retained only for bulk icon preset selection. */
  iconStyle?: string | null;
  tracing: TracingArgs;
  artboard: string;
  padding: number;
  exportEps: boolean;
  removeBackground: boolean;
  postprocess: VecPostprocess;
  analysis?: {
    estimatedColors: number;
    background: string;
    alphaRatio: number;
    recommendedProfile: string;
    confidence: string;
  };
  validation?: {
    qualityScore: number;
    recommendation: string;
    metrics: { pathCount: number; nodeCount: number; colorCount: number; tinyPathCount: number };
    issues: Array<{ severity: string; code: string; message: string }>;
  };
  priority: number;
  selected: boolean;
  error?: string;
  outputSvgUrl?: string;
  outputEpsUrl?: string;
  originalUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  elapsedMs?: number;
  qcWarnings?: string[];
  qcPassed?: boolean;
  exportedAt?: number;
}
