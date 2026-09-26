// Studio state store — diekstrak dari imagin_studio.tsx baris 8653–8819.
// useImaginStateStore: HANYA state declarations (no business logic, no engine
// calls, no JSX). Default state factories + BATCH_RESUME_KEY constant.

import { useEffect, useRef, useState } from 'react';
import type {
  Asset,
  SystemSettings,
  VectorState,
} from './types';
import { SYSTEM_DEFAULT_SETTINGS } from './registry/defaults';
import type { ImaginProject } from './engines/project-engine';
import type { PromptDifferentiationResult } from './flows/dnaData';

// ── AI config hydration ────────────────────────────────────────────────────
export function hydrateAiConfigFromConfig(
  config: any,
  currentAiConfig: any
): any {
  const currentProvider = currentAiConfig.provider === "gemini" || currentAiConfig.provider === "9router"
    ? currentAiConfig.provider
    : "9router";
  const provider = config.provider === "gemini" || config.provider === "9router"
    ? config.provider
    : currentProvider;
  const textModel =
    typeof config.textModel === "string" &&
    config.textModel.length <= 256 &&
    config.textModel.trim() === config.textModel &&
    config.textModel
      ? config.textModel
      : currentAiConfig.textModel;
  const imageModel =
    typeof config.imageModel === "string" &&
    config.imageModel.length <= 256 &&
    config.imageModel.trim() === config.imageModel &&
    config.imageModel
      ? config.imageModel
      : currentAiConfig.imageModel;

  return {
    ...currentAiConfig,
    provider,
    textModel,
    imageModel,
    hasGeminiKey: Boolean(config.hasGeminiKey),
    hasNineRouterKey: Boolean(config.hasNineRouterKey),
  };
}

// ── INITIAL_VECTOR_STATE (line 2596) ─────────────────────────────────────
export const INITIAL_VECTOR_STATE: VectorState = {
  assetType: 'vector',
  generationMode: 'single',
  quantity: 1,
  platform: 'adobe_stock',
  platformCategoryId: null,
  internalCategory: '',
  adobeCategory: '',
  subcategory: '',
  visualSettings: {
    aspectRatio: '4:3',
    background: 'auto',
    style: 'Flat Commercial',
    customDirective: '',
    customAvoid: '',
    highDpiSharpness: true,
    outputFormat: 'PNG',
    faceless: false,
    negativeSpace: true,
  },
  _visualDirty: {},
  singlePromptInput: '',
  iconMode: false,
  iconStyle: null,
  iconQuantity: 1,
  iconGenerationMode: 'per_canvas',
  useAIComposition: false,
  selectedSubject: null,
  selectedScene: null,
  skipAIExpansion: false,
  dnaPanelCollapsed: true,
  _assetTypeDirty: false,
  _generationModeDirty: false,
  _outputFormatDirty: false,
  svgComplexity: 'medium',
  svgTraceOptions: {
    preset: 'general',
    drawStyle: 'filled',
    lineQuality: 'medium',
    groupBy: 'color',
    gapFiller: true,
    gapFillerWidth: 2.0,
    smoothEdges: true,
  },
  collectionMode: false,
  collectionName: '',
};

// ── Default state factories (line 6579+) ─────────────────────────────────
export function createInitialVectorState(): VectorState {
  return {
    ...INITIAL_VECTOR_STATE,
    visualSettings: { ...INITIAL_VECTOR_STATE.visualSettings },
    _visualDirty: {},
  };
}

export function createIdleBatchQueue() {
  return {
    isRunning: false,
    isPaused: false,
    currentIndex: 0,
    total: 0,
    completed: 0,
    failed: 0,
    phase: 'idle' as 'idle' | 'generating',
    sessionId: null as string | null,
    batchId: null as string | null,
  };
}

export const BATCH_RESUME_KEY = 'imagin_batch_resume_v1';

// ── Reducers (line 1472+) ─────────────────────────────────────────────────
export const selectionReducer = (prev: Set<string>, action: { type: 'toggle' | 'add' | 'remove' | 'clear' | 'set'; id?: string; ids?: string[] }) => {
  const next = new Set(prev);
  switch (action.type) {
    case 'toggle':
      if (action.id) { if (next.has(action.id)) next.delete(action.id); else next.add(action.id); }
      break;
    case 'add':
      if (action.id) next.add(action.id);
      break;
    case 'remove':
      if (action.id) next.delete(action.id);
      break;
    case 'clear':
      next.clear();
      break;
    case 'set':
      next.clear();
      (action.ids || []).forEach(id => next.add(id));
      break;
  }
  return next;
};

// Asset list updates: upsert (by id), remove, patchMany.
export const assetsReducer = (prev: any[], action: { type: 'upsert' | 'remove' | 'patchMany' | 'patch'; asset?: any; id?: string; patch?: any; ids?: string[] }) => {
  switch (action.type) {
    case 'upsert':
      if (!action.asset) return prev;
      return prev.some(a => a.id === action.asset.id)
        ? prev.map(a => a.id === action.asset.id ? action.asset : a)
        : [action.asset, ...prev];
    case 'patch':
      return prev.map(a => a.id === action.id ? { ...a, ...(action.patch || {}) } : a);
    case 'patchMany':
      return prev.map(a => action.ids?.includes(a.id) ? { ...a, ...(action.patch || {}) } : a);
    case 'remove':
      if (action.ids) return prev.filter(a => !action.ids.includes(a.id));
      return prev.filter(a => a.id !== action.id);
    default:
      return prev;
  }
};

// Batch queue progress updates: bumpCompleted / bumpFailed / reset.
export const batchQueueReducer = (prev: any, action: { type: 'completed' | 'failed' | 'reset' | 'patch'; count?: number; patch?: any }) => {
  switch (action.type) {
    case 'completed':
      return { ...prev, completed: prev.completed + (action.count || 1) };
    case 'failed':
      return { ...prev, failed: prev.failed + (action.count || 1) };
    case 'reset':
      return createIdleBatchQueue();
    case 'patch':
      return { ...prev, ...(action.patch || {}) };
    default:
      return prev;
  }
};

// ── useImaginStateStore (line 8947) ───────────────────────────────────────
export function useImaginStateStore() {
  const [theme, setTheme] = useState<string>(() => { const global = document.documentElement.getAttribute('data-theme'); if (global === 'light' || global === 'dark') return global; return localStorage.getItem('imagin-theme') === 'light' ? 'light' : 'dark'; });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => ({
    ...SYSTEM_DEFAULT_SETTINGS,
    aiConfig: { ...SYSTEM_DEFAULT_SETTINGS.aiConfig },
    commercialRules: {
      ...SYSTEM_DEFAULT_SETTINGS.commercialRules,
      defaultNegativePrompt: SYSTEM_DEFAULT_SETTINGS.commercialRules.defaultNegativePrompt,
      enableDifferentiationCheck: SYSTEM_DEFAULT_SETTINGS.commercialRules.enableDifferentiationCheck,
    },
    imaginVideoUrl: SYSTEM_DEFAULT_SETTINGS.imaginVideoUrl,
  }) as SystemSettings);
  const [studioPrefsHydrated, setStudioPrefsHydrated] = useState(false);
  const [studioIdbMigrationNeeded, setStudioIdbMigrationNeeded] = useState(false);
  const [customStyles, setCustomStyles] = useState<Array<{ id: string; name: string; directive: string; avoid: string }>>([]);
  const prefsHydratedRef = useRef(false);
  const pendingApiCallsRef = useRef(0);

  useEffect(() => {
    window.api?.studioGetConfig?.().then(res => {
      if (!res?.success) return;
      const config = res.config;
      if (Array.isArray(config.customStyles)) setCustomStyles(config.customStyles.slice(0, 30));
      setStudioIdbMigrationNeeded(!config.idbMigrated);

      if (res.config.activeProjectId !== undefined) setActiveProjectId(res.config.activeProjectId || null);
      const today = new Date().toISOString().slice(0, 10);
      const pending = pendingApiCallsRef.current;
      const count = (res.config.apiCallsDate === today ? res.config.apiCallsCount ?? 0 : 0) + pending;
      todayKeyRef.current = today;
      pendingApiCallsRef.current = 0;
      prefsHydratedRef.current = true;
      setApiCallsToday(count);
      if (pending > 0) void window.api?.studioSaveConfig?.({ apiCallsDate: today, apiCallsCount: count }).catch(() => {});
      setSystemSettings(prev => ({
        ...prev,
        imaginVideoUrl: res.config.videoUrl ?? prev.imaginVideoUrl,
        commercialRules: {
          ...prev.commercialRules,
          defaultNegativePrompt: res.config.negativePrompt ?? prev.commercialRules.defaultNegativePrompt,
          enableDifferentiationCheck: res.config.diffCheck ?? prev.commercialRules.enableDifferentiationCheck,
        },
        aiConfig: hydrateAiConfigFromConfig(res.config, prev.aiConfig),
      }));
    }).catch(() => {
      const pending = pendingApiCallsRef.current;
      const today = new Date().toISOString().slice(0, 10);
      todayKeyRef.current = today;
      pendingApiCallsRef.current = 0;
      prefsHydratedRef.current = true;
      setApiCallsToday(pending);
      if (pending > 0) void window.api?.studioSaveConfig?.({ apiCallsDate: today, apiCallsCount: pending }).catch(() => {});
    }).finally(() => setStudioPrefsHydrated(true));
  }, []);

  // Keep Studio's theme in sync when the global attribute changes from outside
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme');
      if (t === 'light' || t === 'dark') setTheme(prev => (prev === t ? prev : t));
      else setTheme(t as string);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [blockingDialog, setBlockingDialog] = useState<any>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [workspaceView, setWorkspaceView] = useState<'create' | 'production' | 'review' | 'submit' | 'insights'>('create');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [gridModalAsset, setGridModalAsset] = useState<any>(null);

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  const [preflightState, setPreflightState] = useState<{ isOpen: boolean; asset: any }>({ isOpen: false, asset: null });
  const [animationV2Modal, setAnimationV2Modal] = useState<Asset | null>(null);

  const [animateFromPngState, setAnimateFromPngState] = useState<{
    isOpen: boolean;
    sourceAsset: any;
    isProcessing: boolean;
    statusText: string;
    errorText: string;
  }>({ isOpen: false, sourceAsset: null, isProcessing: false, statusText: '', errorText: '' });

  const [metadataGenerating, setMetadataGenerating] = useState(false);
  const [metadataStep, setMetadataStep] = useState(0);
  const [metadataProgress, setMetadataProgress] = useState({ current: 0, total: 0 });

  // Sidebar V2 & JSON batch
  const [importedBatch, setImportedBatch] = useState<any>(null);
  const [batchQueue, setBatchQueue] = useState<any>(createIdleBatchQueue());
  const [isBatchPauseRequested, setIsBatchPauseRequested] = useState(false);
  const pauseBatchRef = useRef(false);
  const discardBatchRef = useRef(false);
  const [importPasteModalOpen, setImportPasteModalOpen] = useState(false);
  const [pasteJsonInput, setPasteJsonInput] = useState('');
  const [pasteJsonErrors, setPasteJsonErrors] = useState<string[]>([]);
  const [researchResults, setResearchResults] = useState<PromptDifferentiationResult[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [jsonModalTab, setJsonModalTab] = useState('paste');
  const [jsonFormatModalOpen, setJsonFormatModalOpen] = useState(false);
  const [jsonFormatCopied, setJsonFormatCopied] = useState(false);
  const [promptSafety, setPromptSafety] = useState<{
    safe: boolean;
    warnings: string[];
    brandHits: string[];
    safetyRules?: { id: string; label: string }[];
  }>({ safe: true, warnings: [], brandHits: [] });

  const [revisionState, setRevisionState] = useState<{
    isOpen: boolean;
    asset: any;
    instruction: string;
    editMode: 'repaint' | 'modify_objects';
    isRevising: boolean;
    revisedImageUrl: string | null;
  }>({ isOpen: false, asset: null, instruction: '', editMode: 'repaint', isRevising: false, revisedImageUrl: null });

  const [vectorState, setVectorState] = useState<VectorState>(createInitialVectorState);
  const [isRenderingAssets, setIsRenderingAssets] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const cancelGenerationRef = useRef(false);
  const generationLockRef = useRef(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const cleanupRef = useRef<any[]>([]);

  const [promptPreview, setPromptPreview] = useState<any>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  // ponytail: session-only collapse; persist width/state only when cross-session preferences are requested.
  const [tasksCollapsed, setTasksCollapsed] = useState(false);
  const [preflightEdit, setPreflightEdit] = useState({
    assetId: null as string | null,
    title: '',
    description: '',
    keywords: '',
  });
  const [preflightEditDirty, setPreflightEditDirty] = useState(false);
  const [regenField, setRegenField] = useState<'title' | 'description' | 'keywords' | null>(null);
  const regenFieldRef = useRef(false);

  const todayKeyRef = useRef(new Date().toISOString().slice(0, 10));
  const [apiCallsToday, setApiCallsToday] = useState(0);
  const incrementApiCallCounter = (n: number = 1) => {
    const expectedKey = new Date().toISOString().slice(0, 10);
    if (!prefsHydratedRef.current) {
      if (expectedKey !== todayKeyRef.current) {
        todayKeyRef.current = expectedKey;
        pendingApiCallsRef.current = n;
        setApiCallsToday(n);
      } else {
        pendingApiCallsRef.current += n;
        setApiCallsToday((prev) => prev + n);
      }
      return;
    }
    if (expectedKey !== todayKeyRef.current) {
      todayKeyRef.current = expectedKey;
      setApiCallsToday((prev) => {
        void window.api?.studioSaveConfig?.({ apiCallsDate: expectedKey, apiCallsCount: n }).catch(() => {});
        return n;
      });
      return;
    }
    setApiCallsToday((prev) => {
      const next = prev + n;
      void window.api?.studioSaveConfig?.({ apiCallsDate: todayKeyRef.current, apiCallsCount: next }).catch(() => {});
      return next;
    });
  };

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState('mulai');
  const [rejectionInsights, setRejectionInsights] = useState<any>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const importImageInputRef = useRef<HTMLInputElement>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  const objectModInputRef = useRef<HTMLInputElement>(null);

  const [importHubOpen, setImportHubOpen] = useState(false);

  const [objectModState, setObjectModState] = useState<{
    isOpen: boolean;
    asset: any;
    step: 'replicate' | 'modify';
    isReplicating: boolean;
    replicatedUrl: string | null;
    editMode: 'repaint' | 'modify_objects';
    instruction: string;
    isGenerating: boolean;
    variants: string[];
    selectedVariantIdx: number;
    saveMode: 'new' | 'overwrite';
  }>({
    isOpen: false,
    asset: null,
    step: 'replicate',
    isReplicating: false,
    replicatedUrl: null,
    editMode: 'modify_objects',
    instruction: '',
    isGenerating: false,
    variants: [],
    selectedVariantIdx: -1,
    saveMode: 'new',
  });

  const [removeBgState, setRemoveBgState] = useState<{
    isOpen: boolean;
    mode: 'single' | 'bulk';
    asset: any;
    processing: boolean;
    progress: { current: number; total: number };
    result: string | null;
    bulkDone: number;
    bulkFailed: number;
  }>({ isOpen: false, mode: 'single', asset: null, processing: false, progress: { current: 0, total: 0 }, result: null, bulkDone: 0, bulkFailed: 0 });

  const [editBgState, setEditBgState] = useState({
    isOpen: false,
    asset: null as any,
    bgMode: 'white' as 'transparent' | 'white' | 'custom',
    bgColor: '#ffffff',
    processing: false,
    previewUrl: null as string | null,
  });

  const [projects, setProjects] = useState<ImaginProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [lockSettings, setLockSettings] = useState(false);
  const [sidebarProjectOpen, setSidebarProjectOpen] = useState(false);

  return {
    // theme & settings
    theme,
    setTheme,
    systemSettings,
    setSystemSettings,
    studioPrefsHydrated,
    studioIdbMigrationNeeded,
    setStudioIdbMigrationNeeded,
    customStyles,
    setCustomStyles,
    isSettingsOpen,
    setIsSettingsOpen,
    blockingDialog,
    setBlockingDialog,
    // assets
    assets,
    setAssets,
    isAssetsLoading,
    setIsAssetsLoading,
    historyLogs,
    setHistoryLogs,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    workspaceView,
    setWorkspaceView,
    selectedAssetDetail,
    setSelectedAssetDetail,
    previewZoom,
    setPreviewZoom,
    gridModalAsset,
    setGridModalAsset,
    selectedAssetIds,
    setSelectedAssetIds,
    // modals
    preflightState,
    setPreflightState,
    animationV2Modal,
    setAnimationV2Modal,
    animateFromPngState,
    setAnimateFromPngState,
    preflightEdit,
    setPreflightEdit,
    preflightEditDirty,
    setPreflightEditDirty,
    regenField,
    setRegenField,
    regenFieldRef,
    metadataGenerating,
    setMetadataGenerating,
    metadataStep,
    setMetadataStep,
    metadataProgress,
    setMetadataProgress,
    // batch
    importedBatch,
    setImportedBatch,
    batchQueue,
    setBatchQueue,
    isBatchPauseRequested,
    setIsBatchPauseRequested,
    pauseBatchRef,
    discardBatchRef,
    importPasteModalOpen,
    setImportPasteModalOpen,
    pasteJsonInput,
    setPasteJsonInput,
    pasteJsonErrors,
    setPasteJsonErrors,
    researchOpen,
    setResearchOpen,
    researchResults,
    setResearchResults,
    isResearching,
    setIsResearching,
    jsonModalTab,
    setJsonModalTab,
    jsonFormatModalOpen,
    setJsonFormatModalOpen,
    jsonFormatCopied,
    setJsonFormatCopied,
    promptSafety,
    setPromptSafety,
    // revision
    revisionState,
    setRevisionState,
    // vector & generation
    vectorState,
    setVectorState,
    isRenderingAssets,
    setIsRenderingAssets,
    generationProgress,
    setGenerationProgress,
    cancelGenerationRef,
    generationLockRef,
    toasts,
    setToasts,
    cleanupRef,
    promptPreview,
    setPromptPreview,
    bulkMenuOpen,
    setBulkMenuOpen,
    tasksOpen,
    setTasksOpen,
    tasksCollapsed,
    setTasksCollapsed,
    // api counter
    todayKeyRef,
    apiCallsToday,
    setApiCallsToday,
    incrementApiCallCounter,
    // history & help
    isHistoryOpen,
    setIsHistoryOpen,
    isHelpOpen,
    setIsHelpOpen,
    helpActiveTab,
    setHelpActiveTab,
    rejectionInsights,
    setRejectionInsights,
    // file refs
    importFileInputRef,
    importImageInputRef,
    referenceImageInputRef,
    objectModInputRef,
    importHubOpen,
    setImportHubOpen,
    // object modifier
    objectModState,
    setObjectModState,
    editBgState,
    setEditBgState,
    // remove bg
    removeBgState,
    setRemoveBgState,
    // projects
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    // sidebar
    sidebarMenuOpen,
    setSidebarMenuOpen,
    lockSettings,
    setLockSettings,
    sidebarProjectOpen,
    setSidebarProjectOpen,
  };
}
