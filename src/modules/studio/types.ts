// Studio types — diekstrak dari imagin_studio.tsx baris 2027–2632.
// Semua interface/type di-export. File ini pure types (no functions, no JSX).

type AssetStatus = 'draft' | 'processing' | 'metadata_ready' | 'ready' | 'needs_review' | 'rejected' | 'exported' | 'submitted' | 'FAILED';
type AssetType = 'vector' | 'illustration' | '3d' | 'photo';

export type { AssetStatus, AssetType };

export interface NormalizedRequest {
    prompt: string; assetType: string; category: string; subcategory: string;
    style: string; background: string; aspectRatio: string; platform: string; source: string;
}

export interface PeopleAnalysis {
  detected: boolean;
  count: number;
  recognizable: boolean;
  fictional: boolean;
  releaseRequired: boolean;
  releaseAvailable: boolean;
}

export interface StockMetadata {
  metadataVersion?: string;
  title: string;
  description: string;
  keywords: string[];
  stockCategory: string;
  subcategory: string;
  contentType: string;
  outputFormat: string;
  backgroundMode: string;
  generativeAIDeclaration: boolean;
  aiDeclared?: boolean; // mirrors generativeAIDeclaration for PREFLIGHT_ITEMS autoRule
  aiTool: string;
  peopleRelease: string;
  propertyRelease: string;
  preflightChecks: Record<string, unknown>;
  preflightPassedAt: number | null;
  submittedAt: number | null;
  backgroundVerified: boolean;
  resolutionVerified: boolean;
  preflightDecision: string | null;
  preflightScore: number | null;
  preflightIssues: unknown[];
  qualityScore: { overall?: number } | null;
  preflightIssueCategories?: {
    image: string[];
    metadata: string[];
    content: string[];
  };
  acceptancePrediction: string | null;
  suggestions: string[];
  ipRisk?: {
    score: number;
    elements: unknown[];
    recommendation: string;
  } | null;
  differentiation?: {
    genericityScore: number;
    matchedCommonPattern: string | null;
    differentiationSuggestions: string[];
    recommendation: string;
  } | null;
  confidence?: {
    title: number;
    category: number;
    keywords: number;
  } | null;
  evidence?: {
    titleBasis: string[];
    keywordBasis: string[];
    categoryBasis: string[];
  } | null;
  peopleAnalysis?: PeopleAnalysis | null;
  peopleAndPropertyFictional?: boolean;
  megapixels?: number | null;
  fileSizeKB?: number | null;
  fileSizeOk?: boolean | null;
  semanticQA?: any | null;
  metadataSource: "ai" | "fallback" | "import" | null;
  analysisAvailable?: boolean | null;
  visualAnalysis?: any | null;
}

export interface AnimV2Keyframe {
  t: number;
  [prop: string]: any;
}

export interface AnimV2Track {
  targetId: string;
  keyframes: AnimV2Keyframe[];
  [prop: string]: any;
}

export interface AnimV2Emitter {
  id: string;
  targetId?: string;
  [prop: string]: any;
}

export interface AnimV2Package {
  schemaVersion: number;
  label: string;
  canvas: { width: number; height: number; viewBox?: string };
  totalDuration: number;
  loop: boolean;
  tracks: AnimV2Track[];
  emitters?: AnimV2Emitter[];
}

export interface AnimV2LabeledElement {
  id: string;
  type: string;
  name: string;
  bbox?: number[];
}

export interface AnimV2LabelResult {
  svg: string;
  elements: AnimV2LabeledElement[];
  viewBox?: string;
}

export interface Asset {
  id: string;
  type: string;
  assetType: AssetType;
  generationMode: string;
  adobeCategory: string;
  subcategory: string;
  title: string;
  baseTheme: string;
  archetypeRole: string | null;
  prompt: string;
  assembledPrompt: string;
  negativePrompt: string;
  aspectRatio: string;
  style: string;
  highDpiSharpness: boolean;
  outputFormat: string;
  background: string;
  createdAt: number;
  status: AssetStatus;
  favorite: boolean;
  batchId: string;
  isLoading: boolean;
  isUpscaling?: boolean;
  isMetaLoading: boolean;
  url: string | null;
  stockMetadata: StockMetadata;
  platform?: string | null;
  platformCategoryId?: number | null;
  resolution?: {
    width: number;
    height: number;
    wasUpscaled: boolean;
    scaleFactor: number;
    upscaleAttempts?: number;
  };
  resolutionTarget?: string;
  batchIndex?: number;
  batchSessionId?: string;
  resolvedConfig?: ResolvedProductionConfig;
  lineage?: AssetLineage;
  isTracing?: boolean;
  svgUrls?: Partial<Record<"low" | "medium" | "high" | "very_high", string>>;
  svgStats?: Partial<Record<"low" | "medium" | "high" | "very_high", SVGStats>>;
  imaginLocalFragment?: string | null;
  imaginLocalCss?: string | null;
  imaginLocalMetadata?: {
    canvas?: { width: number; height: number };
    animatable?: string[];
    suggestedGrouping?: Record<string, string[]>;
  } | null;
  imaginLocalPreviewHtml?: string | null;
  imaginLocalBaseName?: string | null;
  imaginLocalPaket?: {
    fragment: string;
    css: string;
    metadata: object;
    baseName: string;
  } | null;
  animationHtml?: string | null;
  animationCss?: string | null;
  animationPreset?: string | null;
  seriesId?: string;
  soldAt?: number;
  stageLog?: { stage: string; at: number }[];
  animV2LabeledSvg?: string;
  animV2Package?: AnimV2Package;
  animV2LabelResult?: AnimV2LabelResult;
  animV2PreviewHtml?: string;
  animV2BaseName?: string;
  // Phase 5C: Library reciprocal linkage
  libraryAssetId?: string;
  libraryUrl?: string;
  librarySyncState?: "synced" | "pending" | "error";
  librarySyncVersion?: number;
}

export interface VectorState {
  assetType: AssetType;
  generationMode: string;
  quantity: number;
  platform: string;
  platformCategoryId: number | null;
  internalCategory: string;
  adobeCategory: string;
  subcategory: string;
  visualSettings: {
    aspectRatio: string;
    background: string;
    style: string;
    customDirective?: string;
    customAvoid?: string;
    highDpiSharpness: boolean;
    outputFormat: string;
    faceless: boolean;
    negativeSpace: boolean;
    resolutionTarget?: string;
  };
  _visualDirty: Record<string, unknown>;
  singlePromptInput: string;
  iconMode: boolean;
  iconStyle: string | null;
  iconQuantity: number;
  iconGenerationMode: string;
  useAIComposition: boolean;
  selectedSubject: string | null;
  selectedScene: string | null;
  skipAIExpansion: boolean;
  dnaPanelCollapsed: boolean;
  _assetTypeDirty: boolean;
  _generationModeDirty: boolean;
  _outputFormatDirty: boolean;
  svgComplexity: "low" | "medium" | "high" | "very_high";
  svgTraceOptions: {
    preset: string;
    drawStyle: string;
    lineQuality: string;
    groupBy: string;
    gapFiller: boolean;
    gapFillerWidth: number;
    smoothEdges?: boolean;
    ignoreWhiteBg?: boolean;
  };
  collectionMode: boolean;
  collectionName: string;
}

export interface SystemSettings {
  commercialRules: {
    defaultNegativePrompt: string;
    enableDifferentiationCheck: boolean;
  };
  aiConfig: {
    provider: "gemini" | "9router";
    textModel: string;
    imageModel: string;
    hasGeminiKey: boolean;
    hasNineRouterKey: boolean;
  };
  imaginVideoUrl: string;
}

export interface ComplianceResult {
  decision: "pass" | "review" | "fail";
  score: number;
  issues: string[];
  warnings: string[];
  brandHits: string[];
  ipRisk: {
    score: number;
    elements: string[];
    recommendation: "pass" | "review" | "regenerate" | "block";
  };
  newsEvent: { detected: boolean; confidence: number; reference: string | null };
  sensitiveContent: { detected: boolean; category: string | null; reason: string | null };
  checks: {
    noText: boolean;
    noLogo: boolean;
    noWatermark: boolean;
    noArtifacts: boolean;
    peopleRelease: boolean;
    propRelease: boolean;
    generativeAIDeclared: boolean;
    newsEventSafe: boolean;
  };
  checkedAt: number;
}

export interface SimilarityResult {
  kind: "pre_generation" | "post_generation" | "batch" | "library";
  method: "text" | "visual" | "hybrid";
  score: number;
  threshold: number;
  verdict: "pass" | "similar" | "duplicate";
  matchedWith: { id: string | null; title: string }[];
  fingerprint: string | null;
  computedAt: number;
}

export interface ResolvedProductionConfig {
  platform: string;
  platformCategoryId: number | null;
  category: string;
  subcategory: string;
  dnaCategory: string;
  assetType: AssetType;
  assetProfile: string;
  style: string;
  background: string;
  color: string | null;
  aspectRatio: string;
  outputFormat: "PNG" | "JPEG";
  highDpiSharpness: boolean;
  workflow: string;
  resolvedFrom: "user" | "auto" | "preset" | "default";
  resolvedAt: number;
}

export interface SVGStats {
  nodes: number;
  bytes: number;
  elapsedMs: number;
  engine: "imagetracer" | "legacyBlock";
  width: number;
  height: number;
}

export interface AssetLineage {
  originalPrompt: string;
  normalizedPrompt: string;
  finalPrompt: string;
  platform: string;
  category: string;
  subcategory: string;
  dnaCategory: string;
  assetType: AssetType;
  assetProfile: string;
  style: string;
  background: string;
  generationModel: string;
  generationTimestamp: number;
  parentAssetId: string | null;
  batchId: string | null;
  batchSessionId: string | null;
  variations: string[];
  regeneratedFrom: string | null;
  compliance: ComplianceResult | null;
  similarity: SimilarityResult | null;
  qualityScore: { overall: number } | null;
  exportHistory: { exportedAt: number; format: string; platform: string }[];
  promptGraph?: any | null;
  canonicalIntent?: any | null;
  constraints?: any | null;
  intentValidation?: any | null;
  productionTrace?: any | null;
  qaRef?: any | null;
  complianceRef?: any | null;
  jobRef?: any | null;
  storage?: any | null;
  styleInterpretation?: any | null;
  styleCompatibility?: any | null;
  conceptFingerprint?: any | null;
  autoRegeneration?: any | null;
  traceComplexity?: string | null;
  sourceAssetId?: string | null;
}

export type ProductionItemStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "rejected";

export type ProductionJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface GenerationRequest {
  requestId: string;
  jobId: string;
  platform: string;
  prompt: string;
  category: string;
  subcategory: string;
  assetType: AssetType;
  generationMode: string;
  quantity: number;
  visualSettings: {
    aspectRatio: string;
    background: string;
    style: string;
    highDpiSharpness: boolean;
    outputFormat: string;
    faceless: boolean;
    negativeSpace: boolean;
  };
  iconStyle?: string | null;
  selectedSubject?: string | null;
  selectedScene?: string | null;
  skipAIExpansion: boolean;
  createdAt: number;
}

export type IntentLockLevel = "required" | "preferred" | "suggested";
export type IntentResolutionStatus = "resolved" | "custom" | "unresolved";

export interface SemanticRequirement {
  value: string;
  lock: IntentLockLevel;
  source: "user" | "json" | "sidebar" | "dna" | "platform" | "system";
}

export interface SubjectIntent {
  primary: string;
  secondary: string[];
  domain: string | null;
  requirements: SemanticRequirement[];
}

export interface AssetIntent {
  assetType: AssetType;
  profile: string | null;
  composition: string | null;
  requirements: SemanticRequirement[];
}

export interface StyleIntent {
  requested: string | null;
  resolvedName: string | null;
  directive: string | null;
  status: IntentResolutionStatus;
  confidence: number;
}

export interface BackgroundIntent {
  mode: string;
  directive: string;
}

export interface ColorIntent {
  requested: string | null;
  palette: string[];
  directive: string | null;
}

export interface ProductionConstraints {
  required: string[];
  forbidden: string[];
}

export interface ConstraintConflict {
  type: "subject_style" | "subject_asset" | "asset_background" | "platform" | "compliance";
  severity: "warning" | "error";
  message: string;
}

export interface ConstraintResult {
  valid: boolean;
  conflicts: ConstraintConflict[];
  required: string[];
  forbidden: string[];
}

export interface CanonicalProductionIntent {
  userPrompt: string;
  subject: SubjectIntent;
  asset: AssetIntent;
  style: StyleIntent;
  background: BackgroundIntent;
  color: ColorIntent;
  platformId: string;
  platformCategoryId: number | string | null;
  platformCategoryName: string | null;
  aspectRatio: string;
  constraints: ProductionConstraints;
  semanticLocks: string[];
  source: "sidebar" | "json" | "batch" | "regeneration" | "api";
}

export interface ProductionItem {
  itemId: string;
  jobId: string;
  index: number;
  prompt: string;
  subject: string | null;
  macroConcept: string | null;
  motif: string | null;
  clusterPlan: { subject: string | null; macro: string | null; motif: string | null } | null;
  status: ProductionItemStatus;
  assetId: string | null;
  error: string | null;
  createdAt: number;
  stageLog?: { stage: string; at: number }[];
  apiCalls?: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface ProductionJob {
  jobId: string;
  request: GenerationRequest;
  status: ProductionJobStatus;
  items: ProductionItem[];
  total: number;
  completed: number;
  failed: number;
  batchId: string | null;
  batchSessionId: string | null;
  concurrency: number;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  lastResumeState: { itemId: string; progress: number } | null;
}

export interface QAIssue {
  id: string;
  type: string;
  severity: "info" | "warning" | "major" | "critical";
  confidence: number;
  score: number;
  threshold: number;
  evidence: string;
  message: string;
}

export interface RegenerationRecommendation {
  strategy:
    | "regenerate_new_concept"
    | "upscale"
    | "change_style"
    | "modify_prompt"
    | "change_metadata"
    | "recompress"
    | null;
  preserve: string[];
  change: string[];
  negativeAdditions: string[];
  regeneratePrompt: string;
}

export interface QAItemVerdict {
  passed: boolean;
  score: number;
  confidence: number;
  detail: string;
}

export interface QAResult {
  assetId: string;
  decision: "pass" | "pass_with_warning" | "needs_review" | "regenerate" | "reject";
  score: number;
  qaVersion: string;
  layers: {
    technical: QAItemVerdict;
    visual: QAItemVerdict;
    assetProfile: QAItemVerdict;
    commercial: QAItemVerdict;
  };
  issues: QAIssue[];
  gate: {
    reasonCode: string;
    severity: "info" | "warning" | "critical";
    failedRule: string;
    recommendation: string;
    regenerationStrategy: string;
  } | null;
  regeneration: RegenerationRecommendation | null;
  checkedAt: number;
}

export interface Feedback {
  feedbackId: string;
  assetId: string;
  qaDecision: "pass" | "pass_with_warning" | "needs_review" | "regenerate" | "reject";
  reasonCode: string;
  action: "accept" | "reject" | "override_pass" | "regenerate" | "edit_metadata";
  note: string;
  appliedAt: number;
  qaSnapshot: { score: number; severity: string; failedRule: string } | null;
  platform: string;
}

export interface Metadata {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  subcategory: string;
  assetType: AssetType;
  contentType: string;
  outputFormat: string;
  generativeAIDeclaration: boolean;
  aiTool: string;
  peopleRelease: string;
  propertyRelease: string;
  validatedAt: number;
  platformRulesMet: {
    platform: string;
    titleOk: boolean;
    keywordsOk: boolean;
    categoryIdOk: boolean;
  };
}

export interface ExportPackage {
  assetId: string;
  platform: string;
  filename: string;
  title: string;
  keywords: string[];
  categoryId: string | null;
  category: string;
  releases: { people: string; property: string };
  aiLabel: { generativeAI: boolean; tool: string };
  format: string;
  dataUrl: string;
  packagedAt: number;
}

export interface GenerationResult {
  assetId: string;
  requestId: string;
  dataUrl: string;
  width: number;
  height: number;
  megapixels: number;
  fileSizeKB: number;
  fileSizeOk: boolean;
  resolutionVerified: boolean;
  backgroundVerified: boolean;
  resolvedConfig: ResolvedProductionConfig;
  metadata: Metadata | null;
  qa: QAResult | null;
  compliance: ComplianceResult | null;
  lineage: AssetLineage | null;
  completedAt: number;
}
