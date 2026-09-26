export type ModuleType = 'STUDIO' | 'VECTOR' | 'UPSCALE' | 'ANIMATION' | 'GALERY';

export type TaskType = 'VECTOR_GENERATION' | 'IMAGE_UPSCALE' | 'ANIMATION';
export type TaskStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Task {
  id: string;
  type: TaskType;
  name: string;
  status: TaskStatus;
  progress: number;
  speed?: string;
  size?: string;
  processedSize?: string;
  error?: string;
  fileUrl?: string;
  createdAt: string;
  completedAt?: string;
  module: 'VECTOR' | 'ANIMATION' | 'STUDIO' | 'GALERY';
  downloadJobId?: string;
  tempId?: string;
}

export interface LibraryAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VECTOR' | 'ANIMATION' | 'HTML';
  name: string;
  url: string;
  thumbnailUrl?: string;
  folder: string;
  sourceModule: 'VECTOR' | 'SYSTEM' | 'ANIMATION' | 'UPSCALE' | 'IMPORT' | 'STUDIO';
  sourceJobId?: string;
  mimeType: string;
  fileSize: string;
  duration?: string;
  resolution?: string;
  tags: string[];
  createdAt: string;
  prompt?: string;
  parentAssetId?: string;
  version?: number;
  versionGroup?: string;
  versioned?: boolean;
  settings?: {
    style?: string;
    ratio?: string;
    upscale?: string;
    clipMode?: string;
    subtitleOption?: string;
    subtitleStyle?: string;
    duration?: number | string;
    camera?: string;
    loop?: boolean;
    facelessMode?: boolean;
    fps?: number | string;
    formatList?: string[];
    code?: string;
    pairedWith?: string;
    autoEmoji?: boolean;
    trackSubject?: boolean;
  };
  favorite?: boolean;
  status?: "Raw" | "Vectorized" | "Upscaled" | "Ready";
  studioAssetId?: string;
  studioSyncVersion?: 1;
  studioContentHash?: string;
  stockMetadata?: Record<string, unknown>;
  /** Fase 1: export history mirror from Studio lineage. */
  exportHistory?: { exportedAt: number; format: string; platform: string | null }[];
}

export type MetadataJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface MetadataJob {
  id: string;
  assetId: string;
  status: MetadataJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  error?: string;
}

export interface StorageInfo {
  used: number;
  total: number;
  free: number;
  percent: number;
}

export interface SystemSettings {
  outputFolder: string;
}

export interface VectorJobItem {
  tempId: string;
  originalName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  artboard?: string;
  padding?: number;
  removeBackground?: boolean;
  exportEps?: boolean;
  assetType?: string; // flat-icon / outline-icon / flat-illustration / line-art / photo / pixel-art / cut-engrave
  vtracerArgs?: Partial<import("./binaries/vtracer").VtracerOptions>; // granular override from VTracer-style controls
  postprocess?: import("./services/vec/vec-output").VecOutputOptions; // output features (parameterized shapes / draw style / gap filler)
  autoRetried?: boolean;
  analysis?: {
    estimatedColors: number;
    background: string;
    edgeDensity: number;
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
  status?: string;
  error?: string;
  outputSvgUrl?: string;
  outputEpsUrl?: string;
  originalUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  elapsedMs?: number;
  qcWarnings?: string[];
  qcPassed?: boolean;
}

export interface UpscaleJobItem {
  tempId: string;
  originalName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  engine?: string; // "auto" | "realesrgan" | "waifu2x"
scale?: string; // "2x" | "4x" | "custom" | "4k" | "6k" | "8k"
  customScale?: number;
  tileSize?: number;
  whiteBackground?: boolean;
  outputFormat?: "png" | "jpeg" | "webp";
  status?: string;
  error?: string;
  outputUrl?: string;
  originalUrl?: string;
  outputWidth?: number;
  outputHeight?: number;
  elapsedMs?: number;
  fallbackUsed?: boolean;
}

export interface ImportItem {
  tempId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  assetType: "vector" | "illustration" | "3d" | "unknown";
  metadata: Record<string, unknown> | null;
  codeType?: "html" | "css";
  pairedWith?: string;
}

export interface AnimationJobItem {
  tempId: string;
  originalName?: string;
  sourceSvgUrl?: string;
  status?: string;
  error?: string;
  fps?: number;
  durationMs?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  loop?: boolean;
  outputUrls?: Record<string, string>;
  outputWidth?: number;
  outputHeight?: number;
  frameCount?: number;
  progress?: number;
  elapsedMs?: number;
  animationV2?: boolean;
  provenance?: { sha256?: string; source?: string };
}
