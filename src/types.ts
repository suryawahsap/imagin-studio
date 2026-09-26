export type ModuleType = 'STUDIO' | 'VECTOR' | 'UPSCALE' | 'ANIMATION' | 'METADATA' | 'GALERY';

export interface Task {
  id: string;
  type: 'VECTOR_GENERATION' | 'IMAGE_UPSCALE' | 'ANIMATION';
  name: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  speed?: string;
  size?: string;
  processedSize?: string;
  error?: string;
  fileUrl?: string;
  createdAt: string;
  completedAt?: string;
  module: 'VECTOR' | 'ANIMATION' | 'STUDIO' | 'GALERY';
}

export type AssetTypeId = 'vector' | 'illustration' | '3d';
export type GenMode = 'single' | 'batch' | 'collection';
export type IconGenMode = 'per_canvas' | 'sheet';
export type IconStyleKey = 'black_outline' | 'black_filled' | 'gradient' | 'hand_drawn' | 'lineal_color' | 'flat';
export type SubmissionStatus = 'draft' | 'preflight' | 'ready' | 'submitted';

export interface StockMetadata {
  title: string;
  description: string;
  keywords: string[];
  stockCategory: string;
  subcategory: string;
  contentType: string;
  backgroundMode: 'white' | 'transparent';
  generativeAIDeclaration: boolean;
  aiTool: string;
  peopleRelease: string;
  propertyRelease: string;
  submissionStatus: SubmissionStatus;
  preflightChecks: Record<string, boolean>;
  preflightPassedAt: number | null;
  submittedAt: number | null;
  backgroundVerified: boolean;
  resolutionVerified: boolean;
  // Fase 2: optional studio-only fields for export gate/CSV (LibraryAsset runtime carries them)
  preflightDecision?: string | null;
  preflightScore?: number | null;
  preflightIssues?: unknown[];
  qualityScore?: { overall?: number } | null;
  preflightIssueCategories?: { image?: string[]; metadata?: string[]; content?: string[] };
  acceptancePrediction?: string | null;
  suggestions?: string[];
  ipRisk?: { score: number; elements?: unknown[]; recommendation: string } | null;
  differentiation?: { genericityScore: number; matchedCommonPattern: string | null; differentiationSuggestions: string[]; recommendation: string } | null;
  confidence?: { title: number; category: number; keywords: number } | null;
  evidence?: { titleBasis: string[]; keywordBasis: string[]; categoryBasis: string[] } | null;
  peopleAnalysis?: unknown | null;
  peopleAndPropertyFictional?: boolean;
  megapixels?: number | null;
  fileSizeKB?: number | null;
  fileSizeOk?: boolean | null;
  semanticQA?: unknown | null;
  metadataSource: "ai" | "fallback" | "import" | null;
  analysisAvailable?: boolean | null;
  visualAnalysis?: unknown | null;
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
    fps?: number | string;
    formatList?: string[];
    code?: string;
    pairedWith?: string;
  };
  assetType?: AssetTypeId;
  generationMode?: string;
  adobeCategory?: string;
  subcategory?: string;
  stockMetadata?: StockMetadata;
  exportHistory?: { exportedAt: number; format: string; platform: string | null }[];
  baseTheme?: string;
  assembledPrompt?: string;
  background?: string;
  favorite?: boolean;
  status?: "Raw" | "Vectorized" | "Upscaled" | "Ready";
  iconStyle?: IconStyleKey;
  studioAssetId?: string;
  studioSyncVersion?: 1;
  studioContentHash?: string;
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
