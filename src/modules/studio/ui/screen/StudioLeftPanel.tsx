// @ts-nocheck
/**
 * Studio Left Panel — Desktop Cockpit Sidebar
 * Matches reference in docs/imagin_vector_studio.tsx lines 23943-25330
 * Preserves all logic, state wiring, prop signatures, and event handlers.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Archive,
  Blend,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardPaste,
  Clock,
  Component,
  Contrast,
  Download,
  FileJson,
  Hand,
  Hexagon,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  LockKeyhole,
  Moon,
  PackageOpen,
  PenTool,
  RefreshCw,
  ScanSearch,
  Settings,
  Shapes,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Unlock,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { ADOBE_CATEGORY_TAXONOMY, PLATFORM_ADAPTERS, STYLES_BY_ASSET_TYPE } from '../../registry/presets';
import { ICON_STYLE_PRESETS } from '../../registry/icon-dna';
import { ICON_GRID_OPTIONS } from '../../registry/constants';
import { estimateCostUsd } from '../../utils';
import { deriveSidebarStage } from '../../engines/batch';

const QUANTITY_TIERS = [1, 3, 5, 10];

/** Distinct icons per asset type */
const ASSET_TYPES = [
  { key: 'vector', label: 'Vector', Icon: PenTool },
  { key: 'illustration', label: 'Illust', Icon: Shapes },
  { key: '3d', label: '3D', Icon: Box },
  { key: 'photo', label: 'Photo', Icon: ImageIcon },
];

const ASPECT_RATIOS = ['1:1', '4:3', '3:2', '16:9', '2:3', '3:4', '9:16'];

const BACKGROUNDS = [
  { key: 'auto', label: 'Auto' },
  { key: 'white', label: 'White' },
  { key: 'transparent', label: 'Transp' },
  { key: 'greenscreen', label: 'Greenscreen' },
  { key: 'scene', label: 'Scene' },
];

const ICON_STYLE_META: Record<string, { Icon: any; fill: boolean }> = {
  black_outline: { Icon: Square, fill: false },
  black_filled: { Icon: Square, fill: true },
  gradient: { Icon: Blend, fill: false },
  hand_drawn: { Icon: Hand, fill: false },
  lineal_color: { Icon: PenTool, fill: false },
  threed: { Icon: Box, fill: false },
  flat: { Icon: Shapes, fill: false },
  glyph: { Icon: Component, fill: true },
  outline: { Icon: Circle, fill: false },
  duotone: { Icon: Contrast, fill: false },
  filled: { Icon: Hexagon, fill: true },
};

function Toggle({ on, onToggle, label, tone = 'blue' }: { on: boolean; onToggle: () => void; label: string; tone?: 'blue' | 'green' | 'gold' }) {
  const activeColor = tone === 'green' ? 'bg-[#10B981]' : tone === 'gold' ? 'bg-[#38BDF8]' : 'bg-[#3B82F6]';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="w-8 h-5 rounded-full relative p-0.5 inline-flex items-center shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F17]"
    >
      <span className={`w-full h-full rounded-full transition-colors ${on ? activeColor : 'bg-[#374151]'}`}>
        <span
          className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

/** Micro uppercase label with high contrast and readable tracking */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider block select-none">{children}</label>;
}

function SelectBox({ value, onChange, disabled, children, ariaLabel }: any) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full appearance-none bg-[#111827] border border-[#1F2937] px-2.5 py-1.5 pr-7 rounded-lg text-[11px] text-[#F9FAFB] focus:outline-none focus:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#6B7280]" aria-hidden="true">
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}

/**
 * Generation eligibility calculation — pure function exported for test suite.
 */
export function deriveGenerationEligibility({
  masterPromptMode,
  importedBatch,
  vectorState,
  promptSafety,
  hasProviderKey,
  isRenderingAssets,
}: any) {
  const batchActive = masterPromptMode === 'json';
  const prompts = importedBatch?.prompts;
  const batchGeneratable =
    batchActive &&
    Array.isArray(prompts) &&
    prompts.length > 0 &&
    (importedBatch?.status === 'ready' || importedBatch?.status === 'paused');

  const singlePromptReady = Boolean(vectorState?.singlePromptInput?.trim());
  const singleSafetyReady = Boolean(promptSafety?.safe);
  const singleCategoryReady = Boolean(vectorState?.platformCategoryId);

  const promptReady = batchGeneratable || (!batchActive && singlePromptReady);
  const safetyReady = batchGeneratable || (!batchActive && singleSafetyReady);
  const categoryReady = batchGeneratable || (!batchActive && singleCategoryReady);
  const canGenerate =
    !isRenderingAssets && Boolean(hasProviderKey) && promptReady && safetyReady && categoryReady;

  return { batchActive, batchGeneratable, singleCategoryReady, singleSafetyReady, promptReady, safetyReady, categoryReady, canGenerate };
}

/** Interactive elements that participate in the dialog focus cycle. */
export const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Index of the next focusable element for Tab / Shift+Tab, wrapping around.
 */
export function nextFocusIndex(currentIndex: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= count) return shift ? count - 1 : 0;
  return shift ? (currentIndex - 1 + count) % count : (currentIndex + 1) % count;
}

export default function StudioLeftPanel({
  vectorState,
  setVectorState,
  apiCallsToday,
  estimateApiCalls,
  buildPreviewPrompt,
  setPromptPreview,
  handleAssetTypeChange,
  handleVisualSettingChange,
  handleResetToPreset,
  handleMasterPromptBlur,
  checkPromptSafety,
  promptSafety,
  setPromptSafety,
  masterPromptMode,
  setMasterPromptMode,
  lockSettings,
  setLockSettings,
  referenceImageInputRef,
  importImageInputRef,
  objectModInputRef,
  importFileInputRef,
  handleReferenceImageSelected,
  handleImportImageSelected,
  handleObjectModImportSelected,
  handleImportFileSelected,
  isReferenceAnalyzing,
  isRenderingAssets,
  generationProgress,
  metadataGenerating,
  metadataProgress,
  batchQueue,
  importedBatch,
  genCtx,
  batchEngine,
  hasProviderKey,
  systemSettings,
  resolveDNAFromOfficial,
  setJsonFormatModalOpen,
  setImportPasteModalOpen,
  jsonBatchFileInputRef,
  handleJsonBatchFileSelected,
  resetSidebarToManual,
  setIsHistoryOpen,
  setIsSettingsOpen,
  setIsHelpOpen,
  theme,
  setTheme,
  sidebarMenuOpen,
  setSidebarMenuOpen,
  exportAllData,
  storageCtx,
  cancelGeneration,
  isBatchPauseRequested,
  setIsBatchPauseRequested,
  pauseBatchRef,
  cancelGenerationRef,
  generationLockRef,
  confirmBlocking,
  showToast,
}: any) {
  const vs = vectorState || {};
  const visual = vs.visualSettings || {};

  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Dialog state
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const modeDialogRef = useRef<HTMLDivElement>(null);
  const modeTriggerRef = useRef<HTMLButtonElement>(null);
  const closingModeDialogRef = useRef(false);

  const providerLabel = systemSettings?.aiConfig?.provider === '9router' ? '9Router' : 'Gemini';
  const { categoryReady, promptReady, safetyReady, canGenerate } =
    deriveGenerationEligibility({ masterPromptMode, importedBatch, vectorState: vs, promptSafety, hasProviderKey, isRenderingAssets });

  const currentStage = metadataGenerating ? 'metadata' : deriveSidebarStage({ importedBatch, isRenderingAssets, batchQueue });
  const jsonControlled = importedBatch !== null;

  const availableSubcategories = ADOBE_CATEGORY_TAXONOMY[vs.internalCategory] || [];
  const availableStyles = STYLES_BY_ASSET_TYPE[vs.assetType] || STYLES_BY_ASSET_TYPE.vector;
  const activeQuantity = vs.iconMode ? vs.iconQuantity : (vs.quantity || 1);
  const isIcon = vs.iconMode || vs.assetType === 'icon';
  const quantityChoices = isIcon && vs.iconGenerationMode === 'sheet'
    ? ICON_GRID_OPTIONS.map(option => option.qty)
    : QUANTITY_TIERS;
  const formatChoices = isIcon ? ['PNG'] : ['PNG', 'JPEG'];
  const backgroundChoices = vs.assetType === 'photo'
    ? BACKGROUNDS.filter(background => background.key === 'scene')
    : isIcon
    ? BACKGROUNDS.filter(background => ['transparent', 'greenscreen'].includes(background.key))
    : BACKGROUNDS.filter(background => background.key !== 'scene');
  const promptLength = vs.singlePromptInput?.length || 0;

  const blockedReason = !hasProviderKey
    ? `Set ${providerLabel} API key di Settings untuk mulai generate`
    : !promptReady
    ? 'Ketik prompt deskripsi aset di atas'
    : !safetyReady
    ? 'Perbaiki prompt: terdeteksi konten tidak aman'
    : !categoryReady
    ? 'Pilih Category terlebih dahulu'
    : '';

  const setIcon = (patch: any) => setVectorState((prev: any) => ({ ...prev, ...patch }));

  const runGenerate = () => {
    if (!canGenerate) return;
    batchEngine?.run?.(genCtx);
  };

  const onPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runGenerate();
    }
  };

  const hasBatchPrompts = Array.isArray(importedBatch?.prompts) && importedBatch.prompts.length > 0;
  const requestPromptMode = (mode: 'single' | 'json') => {
    if (mode === 'single' && masterPromptMode === 'json' && hasBatchPrompts) {
      setModeDialogOpen(true);
      return;
    }
    setMasterPromptMode(mode);
  };

  // Close sidebarMenu on window click
  useEffect(() => {
    if (!sidebarMenuOpen) return;
    const handleOutsideClick = () => setSidebarMenuOpen?.(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [sidebarMenuOpen, setSidebarMenuOpen]);

  useEffect(() => {
    if (!modeDialogOpen) return;
    const dialog = modeDialogRef.current;
    const getFocusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) || []).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      );
    getFocusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closingModeDialogRef.current = true;
        setModeDialogOpen(false);
        modeTriggerRef.current?.focus();
        window.setTimeout(() => { closingModeDialogRef.current = false; }, 0);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const target = focusable[nextFocusIndex(currentIndex, focusable.length, event.shiftKey)];
      event.preventDefault();
      target?.focus();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (closingModeDialogRef.current) return;
      if (dialog && !dialog.contains(event.target as Node)) getFocusable()[0]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [modeDialogOpen]);

  const closeModeDialog = () => {
    closingModeDialogRef.current = true;
    setModeDialogOpen(false);
    modeTriggerRef.current?.focus();
    window.setTimeout(() => { closingModeDialogRef.current = false; }, 0);
  };
  const saveBatchAndSwitch = () => { setMasterPromptMode('single'); closeModeDialog(); };
  const deleteBatchAndSwitch = () => { resetSidebarToManual?.(); setMasterPromptMode('single'); closeModeDialog(); };

  return (
    <aside
      className="imagin-sidebar-root w-[300px] shrink-0 flex flex-col h-full bg-[#0B0F17] border-r border-[#1F2937] select-none relative"
      data-purpose="generation-controls"
      aria-label="Generation setup"
    >
      {/* ========================================================================= */}
      {/* PHASE 2: A & B - BRAND ROW & UTILITY ICON RAIL (Header total: 44px)        */}
      {/* ========================================================================= */}
      <div className="h-[44px] px-3.5 border-b border-[#1F2937] flex items-center justify-between bg-[#0B0F17] z-20 shrink-0">
        {/* Brand row: Glyph ✦ + IMAGIN STUDIO + API counter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#38BDF8] leading-none select-none">✦</span>
          <span className="font-black text-xs tracking-widest text-[#F9FAFB] font-['Space_Grotesk',sans-serif] select-none">
            IMAGIN STUDIO
          </span>
          <span
            className="text-[10px] font-mono text-[#9CA3AF] opacity-60 ml-0.5 select-none"
            title={`${apiCallsToday || 0} API calls hari ini · estimasi ~$${estimateCostUsd?.(apiCallsToday || 0) ?? '0.000'}`}
          >
            {apiCallsToday || 0}c
          </span>
        </div>

        {/* Utility icon rail (sejajar di kanan) */}
        <div className="flex items-center gap-0.5">
          {/* Archive icon dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSidebarMenuOpen?.((prev: boolean) => !prev); }}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#111827] text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors cursor-pointer"
              title="Backup data (import / export)"
              aria-label="Backup data"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            {sidebarMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[#1F2937] bg-[#0B0F17] shadow-2xl overflow-hidden z-50 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-[#1F2937]">
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Backup data</div>
                  <div className="text-[9px] text-[#9CA3AF] opacity-60 mt-0.5">{apiCallsToday || 0} API calls · ~${estimateCostUsd?.(apiCallsToday || 0) ?? '0.000'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { importFileInputRef?.current?.click(); setSidebarMenuOpen?.(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#F9FAFB] hover:bg-[#111827] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#9CA3AF]" /> Import backup
                </button>
                <button
                  type="button"
                  onClick={() => { exportAllData?.(storageCtx); setSidebarMenuOpen?.(false); }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#F9FAFB] hover:bg-[#111827] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#9CA3AF]" /> Export backup
                </button>
              </div>
            )}
          </div>

          {/* Activity log / History icon */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen?.(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#111827] text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors cursor-pointer"
            title="Activity log"
            aria-label="Activity log"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* Settings gear */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen?.(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#111827] text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors cursor-pointer"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Help circle / book */}
          <button
            type="button"
            onClick={() => setIsHelpOpen?.(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#111827] text-[#38BDF8] hover:text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors cursor-pointer"
            title="Help & Panduan"
            aria-label="Help & Panduan"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {/* Theme switch */}
          <button
            type="button"
            onClick={() => setTheme?.((t: string) => t === 'light' ? 'dark' : 'light')}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#111827] text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors cursor-pointer"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#38BDF8]" />}
          </button>
        </div>
      </div>

      {/* Hidden inputs mounted with real passed handlers */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFileSelected}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={referenceImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleReferenceImageSelected}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={importImageInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.zip"
        onChange={handleImportImageSelected}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={objectModInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleObjectModImportSelected}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={jsonBatchFileInputRef}
        type="file"
        multiple
        accept="application/json,.json"
        onChange={handleJsonBatchFileSelected}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* ========================================================================= */}
      {/* PHASE 2: C - CONDITIONAL PROGRESS STRIP (Sticky tepat di bawah header 44px) */}
      {/* ========================================================================= */}
      {(isRenderingAssets || metadataGenerating) && (
        <div className="sticky top-0 z-10 px-3.5 py-2 border-b border-[#1F2937] bg-[#0B0F17]/95 backdrop-blur-md flex flex-col gap-1.5 shadow-sm shrink-0">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-[#38BDF8]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
              <span className="truncate max-w-[180px]">
                {metadataGenerating
                  ? `Generating metadata ${metadataProgress?.current || 0}/${metadataProgress?.total || 0}`
                  : `Generating ${generationProgress?.current || 0}/${generationProgress?.total || 0}`}
              </span>
            </span>
            <span className="text-[#9CA3AF] font-mono text-[10px]">
              {(() => {
                const cur = metadataGenerating ? (metadataProgress?.current || 0) : (generationProgress?.current || 0);
                const tot = metadataGenerating ? (metadataProgress?.total || 0) : (generationProgress?.total || 0);
                return tot > 0 ? `${Math.min(100, Math.round((cur / tot) * 100))}%` : '…';
              })()}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#111827] overflow-hidden border border-[#1F2937]">
            <div
              className="h-full bg-gradient-to-r from-[#38BDF8] to-[#6366F1] transition-all duration-300 rounded-full"
              style={{
                width: (() => {
                  const cur = metadataGenerating ? (metadataProgress?.current || 0) : (generationProgress?.current || 0);
                  const tot = metadataGenerating ? (metadataProgress?.total || 0) : (generationProgress?.total || 0);
                  return `${tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 30}%`;
                })(),
              }}
            />
          </div>
          {batchQueue?.total > 1 && (
            <div className="text-[9px] text-[#9CA3AF] flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              Batch {batchQueue.currentIndex}/{batchQueue.total} · {batchQueue.completed} done
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCROLLABLE CONTENT AREA (Cards & Controls)                                */}
      {/* ========================================================================= */}
      <div className={`studio-panel-body flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-3.5 custom-scrollbar ${jsonControlled ? 'json-controls-readonly' : ''}`}>
        <div className="text-xs font-black tracking-widest uppercase text-[#38BDF8] font-['Space_Grotesk',sans-serif] flex items-center justify-between border-b border-[#1F2937] pb-2">
          <span>CREATE ASSETS {jsonControlled && <span className="ml-2 text-[#60A5FA]">(JSON)</span>}</span>
          <Sliders className="w-3.5 h-3.5 text-[#9CA3AF]" />
        </div>

        {/* 1. Prompt & Batch Mode Section */}
        <div className="studio-prompt-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2.5">
          <div className="grid grid-cols-2 p-0.5 bg-[#0B0F17] rounded-lg border border-[#1F2937] text-center font-medium text-[11px]" role="group" aria-label="Mode prompt">
            {[
              { key: 'single', label: 'Single Prompt' },
              { key: 'json', label: 'Input JSON' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={masterPromptMode === tab.key}
                ref={tab.key === 'single' ? modeTriggerRef : undefined}
                onClick={() => requestPromptMode(tab.key as 'single' | 'json')}
                className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  masterPromptMode === tab.key
                    ? 'bg-[#1F2937] text-[#F9FAFB] shadow-sm font-semibold'
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
              >
                {tab.key === 'json' && <PackageOpen className="w-3.5 h-3.5" aria-hidden="true" />}
                {tab.label}
              </button>
            ))}
          </div>

          {masterPromptMode === 'single' ? (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={vs.singlePromptInput}
                  onChange={e => {
                    const v = e.target.value;
                    setIcon({ singlePromptInput: v });
                    setPromptSafety?.(checkPromptSafety?.(v));
                  }}
                  onBlur={handleMasterPromptBlur}
                  onKeyDown={onPromptKeyDown}
                  aria-label="Prompt deskripsi aset"
                  aria-describedby="prompt-safety"
                  placeholder="Deskripsikan aset yang ingin dibuat… (Ctrl+Enter untuk generate)"
                  className="w-full bg-[#0B0F17] border border-[#1F2937] rounded-lg p-2.5 pb-6 text-xs text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6] h-24 resize-none transition-colors"
                />
                <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-[#6B7280] select-none" aria-hidden="true">
                  {promptLength} char
                </span>
              </div>

              {vs.singlePromptInput?.trim() && !vs.iconMode && (
                <div
                  id="prompt-safety"
                  aria-live="polite"
                  className={`flex items-center gap-1.5 px-1 text-[10px] ${safetyReady ? 'text-[#10B981]' : 'text-[#EF4444]'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${safetyReady ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} aria-hidden="true" />
                  <span className="font-bold uppercase tracking-wider">{safetyReady ? 'Prompt Safe' : 'Prompt Unsafe'}</span>
                  {(promptSafety?.warnings || []).map((w: string, i: number) => (
                    <span key={i} className="text-[9px] font-medium opacity-90 truncate">· {w}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => { if (isReferenceAnalyzing) return; referenceImageInputRef?.current?.click(); }}
                  disabled={isReferenceAnalyzing || isRenderingAssets}
                  aria-label="Import gambar referensi"
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 cursor-pointer transition-colors"
                  title="Import gambar referensi → prompt otomatis"
                >
                  {isReferenceAnalyzing ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : <ScanSearch className="w-3 h-3 text-cyan-400" />}
                  <span>Reference</span>
                </button>
                <button
                  type="button"
                  onClick={() => importImageInputRef?.current?.click()}
                  disabled={isRenderingAssets}
                  aria-label="Generate metadata dari gambar"
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 cursor-pointer transition-colors"
                  title="PNG/JPG → metadata Adobe Stock"
                >
                  <Upload className="w-3 h-3 text-indigo-400" />
                  <span>Metadata</span>
                </button>
                <button
                  type="button"
                  onClick={() => objectModInputRef?.current?.click()}
                  disabled={isRenderingAssets}
                  aria-label="Object Modifier"
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 cursor-pointer transition-colors"
                  title="Object Modifier — replikasi & ubah objek"
                >
                  <Wand2 className="w-3 h-3 text-pink-400" />
                  <span>Object Mod</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => jsonBatchFileInputRef?.current?.click()}
                  disabled={isRenderingAssets}
                  aria-label="Import file JSON"
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] cursor-pointer transition-colors"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <span>File JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportPasteModalOpen?.(true)}
                  disabled={isRenderingAssets}
                  aria-label="Paste JSON batch"
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] cursor-pointer transition-colors"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                  <span>Paste JSON</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => { if (!isReferenceAnalyzing) referenceImageInputRef?.current?.click(); }}
                  disabled={isReferenceAnalyzing || isRenderingAssets}
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Import gambar referensi"
                >
                  <ScanSearch className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                  <span>Reference</span>
                </button>
                <button
                  type="button"
                  onClick={() => importImageInputRef?.current?.click()}
                  disabled={isRenderingAssets}
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Generate metadata dari gambar"
                >
                  <Upload className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                  <span>Metadata</span>
                </button>
                <button
                  type="button"
                  onClick={() => objectModInputRef?.current?.click()}
                  disabled={isRenderingAssets}
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#0B0F17] hover:bg-[#1F2937] border border-[#1F2937] rounded-lg text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Object Modifier"
                >
                  <Wand2 className="w-3 h-3 text-pink-400" aria-hidden="true" />
                  <span>Object Mod</span>
                </button>
              </div>

              {importedBatch && (
                <div className="bg-[#0B0F17] border border-[#1F2937] p-2.5 rounded-lg space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between text-[#F9FAFB]">
                    <span className="font-semibold truncate max-w-[170px]">{importedBatch.fileName || importedBatch.name || 'Batch aktif'}</span>
                    <span className="font-mono text-[#9CA3AF]">
                      {batchQueue?.completed ?? 0}/{importedBatch.totalPrompts ?? importedBatch.prompts?.length ?? 0}
                    </span>
                  </div>
                  {importedBatch.status === 'generating' && (
                    <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#38BDF8] rounded-full transition-all"
                        style={{
                          width: `${(() => {
                            const tot = importedBatch.totalPrompts ?? importedBatch.prompts?.length ?? 0;
                            return tot > 0 ? Math.min(100, ((batchQueue?.completed ?? 0) / tot) * 100) : 0;
                          })()}%`,
                        }}
                      />
                    </div>
                  )}
                  {importedBatch.status === 'completed' && (
                    <div className="flex items-center gap-1 text-[#10B981] font-semibold text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Batch Selesai
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Asset Type Card */}
        <div className="studio-asset-type-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2">
          <FieldLabel>Asset Type</FieldLabel>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Tipe aset">
            {ASSET_TYPES.map(t => {
              const active = vs.assetType === t.key;
              const Icon = t.Icon;
              return (
                <button
                  key={t.key}
                  role="radio"
                  type="button"
                  aria-checked={active}
                  onClick={() => handleAssetTypeChange?.(t.key)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#38BDF8] font-semibold shadow-sm'
                      : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF] hover:text-[#F9FAFB]'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? 'text-[#38BDF8]' : 'text-[#6B7280]'}`} />
                  <span className="text-[10px] leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Icon Mode Card */}
        <div className="studio-icon-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full transition-colors ${vs.iconMode ? 'bg-[#38BDF8]' : 'bg-[#4B5563]'}`} aria-hidden="true" />
              <div>
                <div className="text-[11px] font-semibold text-[#F9FAFB]">Icon Mode</div>
                <div className="text-[9px] text-[#6B7280]">Style lock · icon set generator</div>
              </div>
            </div>
            <Toggle
              on={Boolean(vs.iconMode)}
              label="Toggle icon mode"
              onToggle={() => setIcon({
                iconMode: !vs.iconMode,
                iconStyle: !vs.iconMode ? (vs.iconStyle || 'lineal_color') : vs.iconStyle,
                assetType: !vs.iconMode ? 'vector' : vs.assetType,
              })}
            />
          </div>

          {vs.iconMode && vs.assetType !== 'photo' && (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1.5">
                <FieldLabel>
                  Icon Style {vs.iconStyle === null && <span className="text-[#EF4444] normal-case font-medium">— pilih salah satu</span>}
                </FieldLabel>
                <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Icon style">
                  {Object.entries(ICON_STYLE_PRESETS).filter(([key]) => ['lineal_color', 'flat', 'filled', 'hand_drawn'].includes(key)).map(([key, preset]: any) => {
                    const active = vs.iconStyle === key;
                    const meta = ICON_STYLE_META[key] || { Icon: Square, fill: false };
                    const Icon = meta.Icon;
                    return (
                      <button
                        key={key}
                        role="radio"
                        type="button"
                        aria-checked={active}
                        onClick={() => setIcon({ iconStyle: key })}
                        title={`${preset.label}: ${preset.hint}`}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-[10px] transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#38BDF8] font-semibold'
                            : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF] hover:text-[#F9FAFB]'
                        }`}
                      >
                        <Icon fill={meta.fill ? 'currentColor' : 'none'} className={`w-4 h-4 mb-1 ${active ? 'text-[#38BDF8]' : 'text-[#6B7280]'}`} />
                        <span className="leading-tight">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Generation Mode</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Generation mode">
                  {[
                    { key: 'per_canvas', label: 'Per Canvas' },
                    { key: 'sheet', label: 'Sheet' },
                  ].map(m => {
                    const active = (vs.iconGenerationMode || 'per_canvas') === m.key;
                    return (
                      <button
                        key={m.key}
                        role="radio"
                        type="button"
                        aria-checked={active}
                        onClick={() => setIcon({ iconGenerationMode: m.key })}
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#38BDF8] font-semibold'
                            : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF]'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!vs.iconMode && (
            <p className="text-[10px] text-[#6B7280] leading-relaxed">
              Aktifkan Icon Mode untuk mengunci satu gaya ikon dan menghasilkan satu set sekaligus.
            </p>
          )}
        </div>

        {/* 4. Category Taxonomy Card */}
        <div className="studio-category-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <FieldLabel>Category Taxonomy</FieldLabel>
          </div>

          <div className="space-y-1">
            <FieldLabel>Target Platform</FieldLabel>
            <SelectBox
              ariaLabel="Target platform"
              value={vs.platform}
              onChange={(e: any) => {
                const newPlatform = e.target.value;
                if (PLATFORM_ADAPTERS[newPlatform]?.status !== 'active') return;
                setIcon({ platform: newPlatform, platformCategoryId: null, internalCategory: '', adobeCategory: '', subcategory: '', selectedSubject: null, selectedScene: null });
              }}
            >
              {Object.entries(PLATFORM_ADAPTERS).map(([key, adapter]: any) => (
                <option key={key} value={key} disabled={adapter.status !== 'active'}>
                  {adapter.label}{adapter.status !== 'active' ? ' (Coming Soon)' : ''}
                </option>
              ))}
            </SelectBox>
          </div>

          <div className="space-y-1">
            <FieldLabel>
              Category {Boolean(vs.platformCategoryId) && <span className="text-[#10B981] normal-case">· {vs.internalCategory}</span>}
            </FieldLabel>
            <SelectBox
              ariaLabel="Category"
              value={vs.platformCategoryId ?? ''}
              onChange={(e: any) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                const derived = resolveDNAFromOfficial?.(vs.platform, newId, '') || '';
                const firstSub = ADOBE_CATEGORY_TAXONOMY[derived]?.[0] || '';
                setIcon({ platformCategoryId: newId, internalCategory: derived, adobeCategory: derived, subcategory: firstSub, selectedSubject: null, selectedScene: null });
              }}
            >
              <option value="">— Pilih Category —</option>
              {(PLATFORM_ADAPTERS[vs.platform]?.categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.id}. {c.name}</option>
              ))}
            </SelectBox>
          </div>

          <div className="space-y-1">
            <FieldLabel>Subcategory</FieldLabel>
            <SelectBox
              ariaLabel="Subcategory"
              value={vs.subcategory}
              disabled={!vs.internalCategory}
              onChange={(e: any) => setIcon({ subcategory: e.target.value })}
            >
              <option value="">— Pilih Subcategory —</option>
              {availableSubcategories.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectBox>
          </div>

          {!categoryReady && (
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/25 flex gap-2 text-[10px] leading-relaxed text-[#9CA3AF]">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span><strong className="text-[#F9FAFB]">Wajib:</strong> Adobe Stock mewajibkan category untuk setiap submission.</span>
            </div>
          )}
        </div>

        {/* 5. Output Quantity Card */}
        <div className="studio-quantity-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <FieldLabel>Jumlah Output</FieldLabel>
            <span className="text-[9px] text-[#6B7280]">
              {vs.iconMode ? `Icon set · ${ICON_STYLE_PRESETS[vs.iconStyle]?.label || 'style belum dipilih'}` : 'Per gambar'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Mode output">
            <button
              type="button"
              aria-pressed={masterPromptMode === 'single'}
              onClick={() => requestPromptMode('single')}
              className={`py-1.5 rounded-lg border text-[10px] font-medium transition-colors cursor-pointer ${
                masterPromptMode === 'single'
                  ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#38BDF8] font-semibold'
                  : 'bg-[#0B0F17] border-[#1F2937] text-[#9CA3AF]'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              aria-pressed={masterPromptMode === 'json'}
              onClick={() => requestPromptMode('json')}
              className={`py-1.5 rounded-lg border text-[10px] font-medium transition-colors cursor-pointer ${
                masterPromptMode === 'json'
                  ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[#38BDF8] font-semibold'
                  : 'bg-[#0B0F17] border-[#1F2937] text-[#9CA3AF]'
              }`}
            >
              Input JSON
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Jumlah output">
            {quantityChoices.map(tier => {
              const active = activeQuantity === tier;
              return (
                <button
                  key={tier}
                  role="radio"
                  type="button"
                  aria-checked={active}
                  onClick={() => setIcon(vs.iconMode ? { iconQuantity: tier } : { quantity: tier })}
                  className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#38BDF8] shadow-sm'
                      : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF]'
                  }`}
                >
                  ×{tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Quick Mode & Collection Card */}
        <div className="studio-quick-collection-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#F9FAFB]">Quick Mode</div>
              <div className="text-[9px] text-[#6B7280]">Tanpa AI prompt expansion</div>
            </div>
            <Toggle on={Boolean(vs.skipAIExpansion)} label="Quick mode" onToggle={() => setIcon({ skipAIExpansion: !vs.skipAIExpansion })} />
          </div>

          <div className="pt-1.5 border-t border-[#1F2937] flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#F9FAFB]">Collection</div>
              <div className="text-[9px] text-[#6B7280]">Kelompokkan hasil ke satu koleksi</div>
            </div>
            <Toggle on={Boolean(vs.collectionMode)} tone="green" label="Collection mode" onToggle={() => setIcon({ collectionMode: !vs.collectionMode })} />
          </div>

          {vs.collectionMode && (
            <input
              value={vs.collectionName || ''}
              onChange={e => setIcon({ collectionName: e.target.value })}
              placeholder="Nama collection…"
              aria-label="Nama collection"
              className="w-full bg-[#0B0F17] border border-[#1F2937] px-2.5 py-1.5 rounded-lg text-[11px] text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
            />
          )}
        </div>

        {/* 7. Visual Settings Card */}
        <div className="studio-visual-card bg-[#111827]/60 border border-[#1F2937] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <FieldLabel>Visual Settings</FieldLabel>
            <button
              type="button"
              onClick={() => handleResetToPreset?.()}
              title="Kembalikan setelan visual ke preset awal"
              aria-label="Reset visual settings ke preset"
              className="flex items-center gap-1 text-[9px] text-[#6B7280] hover:text-[#F9FAFB] cursor-pointer transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset preset</span>
            </button>
          </div>

          <div className="space-y-1">
            <FieldLabel>Aspect Ratio</FieldLabel>
            <SelectBox
              ariaLabel="Aspect ratio"
              value={visual.aspectRatio || '4:3'}
              onChange={(e: any) => handleVisualSettingChange?.('aspectRatio', e.target.value)}
            >
              {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
            </SelectBox>
          </div>

          <div className="space-y-1">
            <FieldLabel>Style Preset</FieldLabel>
            <SelectBox
              ariaLabel="Style preset"
              value={visual.style || ''}
              onChange={(e: any) => handleVisualSettingChange?.('style', e.target.value)}
            >
              {(availableStyles || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
            </SelectBox>
          </div>

          <div className="space-y-1">
            <FieldLabel>Format Output</FieldLabel>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Format output">
              {formatChoices.map(f => {
                const active = (visual.outputFormat || 'PNG') === f;
                return (
                  <button
                    key={f}
                    role="radio"
                    type="button"
                    aria-checked={active}
                    onClick={() => handleVisualSettingChange?.('outputFormat', f)}
                    className={`py-1.5 px-2 rounded-lg border text-[10px] text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#38BDF8] font-semibold'
                        : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF]'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel>Background</FieldLabel>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Background">
              {backgroundChoices.map(b => {
                const active = (visual.background || 'auto') === b.key;
                return (
                  <button
                    key={b.key}
                    role="radio"
                    type="button"
                    aria-checked={active}
                    onClick={() => handleVisualSettingChange?.('background', b.key)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#38BDF8] font-semibold'
                        : 'bg-[#0B0F17] border-[#1F2937] hover:border-[#374151] text-[#9CA3AF]'
                    }`}
                  >
                    {b.key === 'auto' && <Sparkles className={`w-3.5 h-3.5 mb-1 ${active ? 'text-[#38BDF8]' : 'text-[#6B7280]'}`} />}
                    <span className="text-[10px] leading-tight">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 8. Advanced Tuning & AI Accordion */}
        <div className="studio-advanced-card bg-[#111827]/60 border border-[#1F2937] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-expanded={advancedOpen}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-[#1F2937]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-[#F9FAFB]">Setelan Lanjutan & AI</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(Boolean(visual.highDpiSharpness) || Boolean(visual.faceless) || Boolean(visual.negativeSpace) || Boolean(vs.useAIComposition)) && (
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" aria-hidden="true" />
              )}
              {advancedOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />}
            </div>
          </button>

          {advancedOpen && (
            <div className="p-3 pt-1 border-t border-[#1F2937] space-y-2.5">
              {[
                { key: 'highDpiSharpness', label: 'High-DPI Ultra-Sharp', hint: 'Pertajam detail resolusi tinggi' },
                { key: 'faceless', label: 'Faceless Subject', hint: 'Hindari rendering wajah subjek' },
                { key: 'negativeSpace', label: 'Negative Space', hint: 'Sisakan ruang kosong untuk copy' },
              ].map(row => (
                <div key={row.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#F9FAFB]">{row.label}</div>
                    <div className="text-[9px] text-[#6B7280] truncate">{row.hint}</div>
                  </div>
                  <Toggle
                    on={Boolean(visual[row.key])}
                    label={row.label}
                    onToggle={() => handleVisualSettingChange?.(row.key, !visual[row.key])}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1F2937]">
                <div className="min-w-0">
                  <div className="text-[11px] text-[#F9FAFB]">Smart Composition (AI)</div>
                  <div className="text-[9px] text-[#6B7280]">+1 API call · ide kontekstual</div>
                </div>
                <Toggle on={Boolean(vs.useAIComposition)} label="Smart composition" onToggle={() => setIcon({ useAIComposition: !vs.useAIComposition })} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mode confirmation modal (Batch -> Single switch guard) */}
      {modeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="presentation">
          <div
            ref={modeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-mode-title"
            className="studio-mode-dialog w-full max-w-[320px] rounded-xl border border-[#1F2937] bg-[#0B0F17] p-4 shadow-2xl"
          >
            <h2 id="batch-mode-title" className="text-sm font-semibold text-[#F9FAFB]">Batch masih tersedia</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9CA3AF]">
              Simpan batch untuk digunakan lagi, atau hapus sebelum kembali ke Single Prompt.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={saveBatchAndSwitch}
                className="py-2 px-1 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-[10px] font-semibold text-[#F9FAFB] cursor-pointer transition-colors"
              >
                Save batch
              </button>
              <button
                type="button"
                onClick={deleteBatchAndSwitch}
                className="py-2 px-1 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-[10px] font-semibold text-[#EF4444] cursor-pointer transition-colors"
              >
                Delete batch
              </button>
              <button
                type="button"
                onClick={closeModeDialog}
                className="py-2 px-1 rounded-lg border border-[#1F2937] bg-[#111827] hover:bg-[#1F2937] text-[10px] font-semibold text-[#9CA3AF] cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: STICKY GENERATE FOOTER (~80-100px)                              */}
      {/* ========================================================================= */}
      <div className="studio-panel-footer p-3 bg-[#0E1420] border-t border-[#1F2937] space-y-2 shrink-0 shadow-lg select-none">
        {currentStage === 'idle' && (
          <div className="space-y-2 footer-stage">
            <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
              <span className="font-mono" title={`Terpakai hari ini: ${apiCallsToday || 0}`}>
                ~ {estimateApiCalls?.(vs) ?? 0} API calls
              </span>
              <button
                type="button"
                onClick={() => setPromptPreview?.(buildPreviewPrompt?.(vs, systemSettings, genCtx) ?? '')}
                aria-label="Lihat preview prompt yang digenerate"
                className="text-[#38BDF8] hover:text-[#60A5FA] flex items-center gap-1 text-[10px] font-medium bg-[#111827] hover:bg-[#1F2937] px-2 py-0.5 rounded border border-[#1F2937] cursor-pointer transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <span>Lihat Prompt</span>
              </button>
            </div>

            {vs.assetType !== 'photo' && visual.outputFormat === 'PNG' && (
              <div className="bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2.5 py-1.5 rounded-lg flex gap-1.5 text-[9px] text-[#9CA3AF]">
                <AlertCircle className="w-3 h-3 text-[#38BDF8] shrink-0 mt-0.5" />
                <span>PNG output must be submitted as <strong className="text-[#F9FAFB]">Illustration</strong>.</span>
              </div>
            )}

            <button
              type="button"
              onClick={runGenerate}
              disabled={!canGenerate}
              aria-describedby={blockedReason ? 'generate-blocked' : undefined}
              aria-label={isRenderingAssets ? 'Menghasilkan aset...' : 'MULAI GENERASI'}
              className={`studio-generate-button w-full text-white py-3 px-4 rounded-lg font-black tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all cursor-pointer ${
                canGenerate ? 'imagin-btn-primary' : 'bg-[#111827] text-[#4B5563] opacity-50 cursor-not-allowed'
              }`}
              title={isRenderingAssets ? 'Generasi sedang berjalan…' : blockedReason || 'Ctrl+Enter'}
            >
              <Zap className="w-4 h-4 text-[#38BDF8]" />
              <span>MULAI GENERASI</span>
            </button>

            {!isRenderingAssets && blockedReason && (
              <div id="generate-blocked" className="text-[9px] text-[#EF4444] font-bold text-center flex items-center justify-center gap-1 opacity-90">
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{blockedReason}</span>
              </div>
            )}

            <label className="studio-lock-setting flex items-center space-x-2 text-[10px] text-[#9CA3AF] hover:text-[#F9FAFB] cursor-pointer pt-0.5 transition-colors">
              <input
                type="checkbox"
                checked={Boolean(lockSettings)}
                onChange={e => setLockSettings?.(e.target.checked)}
                className="rounded bg-[#111827] border-[#1F2937] text-blue-600 focus:ring-0 w-3 h-3 cursor-pointer"
              />
              {lockSettings ? <Lock className="w-3 h-3 text-[#38BDF8] shrink-0" /> : <Unlock className="w-3 h-3 shrink-0" />}
              <span>Simpan setting setelah generate</span>
            </label>
          </div>
        )}

        {currentStage === 'idle_json' && (
          <div className="space-y-2 footer-stage">
            <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
              <div className="p-1.5 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#38BDF8] text-sm font-black">{importedBatch?.totalPrompts ?? importedBatch?.prompts?.length ?? 0}</div>
                <div className="text-[#9CA3AF]">Prompts</div>
              </div>
              <div className="p-1.5 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#10B981] text-sm font-black">{batchQueue?.completed ?? 0}</div>
                <div className="text-[#9CA3AF]">Done</div>
              </div>
              <div className="p-1.5 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#EF4444] text-sm font-black">{batchQueue?.failed ?? 0}</div>
                <div className="text-[#9CA3AF]">Failed</div>
              </div>
            </div>
            <button
              type="button"
              onClick={runGenerate}
              className="w-full py-3 rounded-lg imagin-btn-primary text-xs font-black tracking-widest flex justify-center items-center gap-2 shadow-lg hover:opacity-90 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-[#38BDF8]" /> GENERASI {importedBatch?.totalPrompts ?? importedBatch?.prompts?.length ?? 0} PROMPT
            </button>
          </div>
        )}

        {currentStage === 'metadata' && (
          <div className="space-y-2.5 footer-stage">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="text-[#38BDF8] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8]" /> Generating metadata...
              </span>
              <span className="text-[#F9FAFB] font-mono">
                {metadataProgress?.total > 1 ? `${metadataProgress.current} / ${metadataProgress.total}` : 'Running'}
              </span>
            </div>
            <div className="h-2 bg-[#111827] rounded-full overflow-hidden border border-[#1F2937]">
              <div
                className="h-full bg-gradient-to-r from-[#38BDF8] to-[#6366F1] transition-all duration-500 rounded-full"
                style={{ width: `${metadataProgress?.total > 0 ? (metadataProgress.current / metadataProgress.total) * 100 : 30}%` }}
              />
            </div>
          </div>
        )}

        {currentStage === 'generating' && (
          <div className="space-y-2.5 footer-stage">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span className="text-[#38BDF8] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[#38BDF8]" /> Menghasilkan Gambar
              </span>
              <span className="text-[#F9FAFB] font-mono">{generationProgress?.current || 0} / {generationProgress?.total || 0}</span>
            </div>
            <div className="h-2 bg-[#111827] rounded-full overflow-hidden border border-[#1F2937]">
              <div
                className="h-full bg-gradient-to-r from-[#38BDF8] to-[#6366F1] transition-all duration-500 rounded-full"
                style={{ width: `${generationProgress?.total > 0 ? ((generationProgress.current || 0) / generationProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
              <div className="p-1 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#38BDF8] font-black">{generationProgress?.current || 0}</div>
                <div className="text-[#9CA3AF] text-[9px]">Proses</div>
              </div>
              <div className="p-1 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#10B981] font-black">{batchQueue?.total > 0 ? batchQueue.completed : (generationProgress?.current || 0)}</div>
                <div className="text-[#9CA3AF] text-[9px]">Selesai</div>
              </div>
              <div className="p-1 bg-[#111827] rounded-lg border border-[#1F2937]">
                <div className="text-[#9CA3AF] font-black">{batchQueue?.total > 0 ? Math.max(0, batchQueue.total - batchQueue.completed - batchQueue.failed) : Math.max(0, (generationProgress?.total || 0) - (generationProgress?.current || 0))}</div>
                <div className="text-[#9CA3AF] text-[9px]">Tersisa</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (pauseBatchRef) pauseBatchRef.current = true;
                  setIsBatchPauseRequested?.(true);
                  showToast?.('Batch akan dijeda setelah prompt ini selesai.', 'info');
                }}
                disabled={isBatchPauseRequested}
                className="py-2 px-1 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] text-[10px] font-bold hover:bg-[#38BDF8] hover:text-black transition-all flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
              >
                {isBatchPauseRequested ? 'Pause diminta' : '⏸ Jeda setelah ini'}
              </button>
              <button
                type="button"
                onClick={() => cancelGeneration?.(genCtx)}
                className="py-2 px-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-[10px] font-bold hover:bg-[#EF4444] hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Hentikan
              </button>
            </div>
          </div>
        )}

        {currentStage === 'batch_paused' && (
          <div className="space-y-2 footer-stage">
            <div className="text-[10px] font-bold text-[#38BDF8] text-center">
              ⏸ Dijeda — {batchQueue?.completed || 0}/{batchQueue?.total || 0} selesai
            </div>
            <div className="h-1.5 bg-[#111827] rounded-full overflow-hidden border border-[#1F2937]">
              <div
                className="h-full bg-[#38BDF8]/60 rounded-full transition-all"
                style={{ width: `${batchQueue?.total > 0 ? (batchQueue.completed / batchQueue.total) * 100 : 0}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (generationLockRef?.current) return;
                if (generationLockRef) generationLockRef.current = true;
                if (pauseBatchRef) pauseBatchRef.current = false;
                if (cancelGenerationRef) cancelGenerationRef.current = false;
                setIsBatchPauseRequested?.(false);
                const resumePromise = importedBatch
                  ? batchEngine.runJSON(batchQueue.completed, genCtx)
                  : batchEngine.runNormal(genCtx);
                resumePromise?.finally?.(() => {
                  if (generationLockRef) generationLockRef.current = false;
                });
              }}
              className="w-full py-2.5 rounded-lg bg-[#10B981] text-white text-xs font-black tracking-wider flex justify-center items-center gap-1.5 shadow-lg hover:opacity-90 transition-all cursor-pointer"
            >
              ▶ LANJUTKAN BATCH ({Math.max(0, (batchQueue?.total || 0) - (batchQueue?.completed || 0))} tersisa)
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmBlocking) {
                  confirmBlocking({
                    title: 'Reset Batch?',
                    message: 'Reset batch? Progress tidak bisa dikembalikan.',
                    confirmLabel: 'Ya, Reset',
                    cancelLabel: 'Batal',
                    onConfirm: () => resetSidebarToManual?.()
                  });
                } else {
                  resetSidebarToManual?.();
                }
              }}
              className="w-full py-1 text-[10px] font-bold text-[#EF4444] hover:underline cursor-pointer"
            >
              Reset Batch
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
