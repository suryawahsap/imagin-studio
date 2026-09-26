// @ts-nocheck
// Active inspector retained: it alone includes the complete action surface, including Animate; alternate is archived.
/**
 * Studio Inspector — markup mengikuti design reference
 * (imagin_studio_desktop_electron_app/code.html → aside[data-purpose="inspector-panel"]).
 * Struktur & kelas dipertahankan agar identik dengan mockup; seluruh perilaku
 * lama (tab Metadata/History, compliance DB, rail collapse, kolom REC) tetap ada.
 */
import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, Clock, FileImage, PanelRightOpen, X } from 'lucide-react';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { STATUS_CONFIG } from '../../registry/constants';
import { megapixelsOf } from '../../utils';
import { getComplianceResultsForAssetDB, getFeedbackForAssetDB, getHistoryDB, getQaResultsForAssetDB } from '../../engines/storage';
import { emitOpenStudioModal } from '../../../../components/global/studio-bridge';

export interface StudioInspectorProps {
  asset: any | null;
  tab: 'inspector' | 'metadata' | 'history';
  onTabChange: (tab: 'inspector' | 'metadata' | 'history') => void;
  onClose?: () => void;
  onOpenDetails: () => void;
  onOpenHistory: () => void;
  onDownload?: (asset: any) => void;
  onUpscale?: (ids: string[]) => void;
  onVectorize?: (ids: string[]) => void;
  onRemoveBgSingle?: (asset: any) => void;
  onAnimate?: (asset: any) => void;
  historyLogs?: any[];
  assets?: any[];
  onSelectAsset?: (asset: any) => void;
  inspectorCollapsed?: boolean;
  onToggleInspectorCollapsed?: (collapsed: boolean) => void;
}

const pretty = (value: any) => String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Nada warna badge status, mengikuti makna status di STATUS_CONFIG */
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'err' | 'idle'> = {
  ready: 'ok',
  metadata_ready: 'ok',
  exported: 'ok',
  needs_review: 'warn',
  submitted: 'warn',
  rejected: 'err',
  draft: 'idle',
  processing: 'idle',
};

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  err: 'bg-red-500/10 text-red-400 border border-red-500/30',
  idle: 'bg-slate-500/10 text-slate-300 border border-slate-500/30',
};

const TONE_DOT: Record<string, string> = {
  ok: 'bg-emerald-400',
  warn: 'bg-amber-400',
  err: 'bg-red-400',
  idle: 'bg-slate-400',
};

/** Baris label↔nilai di dalam kartu settings mockup */
function SettingsRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 font-sans">{label}</span>
      <span className="text-slate-200 font-bold">{value}</span>
    </div>
  );
}

export default function StudioInspector({
  asset,
  tab = 'inspector',
  onTabChange,
  onClose,
  onOpenDetails,
  onOpenHistory,
  onDownload,
  onUpscale,
  onVectorize,
  onRemoveBgSingle,
  onAnimate,
  historyLogs = [],
  assets = [],
  onSelectAsset,
  inspectorCollapsed: controlledCollapsed,
  onToggleInspectorCollapsed,
}: StudioInspectorProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [localInspectorCollapsed, setLocalInspectorCollapsed] = useState(false);
  const [lineageLogs, setLineageLogs] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>(historyLogs);
  const [qaResult, setQaResult] = useState<any>(null);
  const [complianceResult, setComplianceResult] = useState<any>(null);

  const inspectorCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : localInspectorCollapsed;
  const setInspectorCollapsed = (val: boolean) => {
    setLocalInspectorCollapsed(val);
    onToggleInspectorCollapsed?.(val);
  };

  const metadata = asset?.stockMetadata || {};
  const dimensions = asset?.resolution?.width && asset?.resolution?.height
    ? `${asset.resolution.width} × ${asset.resolution.height}`
    : '1024 × 1024';
  const model = asset?.lineage?.generationModel || asset?.resolvedConfig?.model || asset?.generationModel || 'Flux 1.1 Pro';
  const statusCfg = STATUS_CONFIG[asset?.status] || STATUS_CONFIG.draft;
  const statusTone = STATUS_TONE[asset?.status] || 'idle';
  const id = asset ? [asset.id] : [];
  const isSvg = asset?.outputFormat === 'SVG' || String(asset?.url || '').startsWith('data:image/svg+xml');
  const fmt = isSvg ? 'SVG' : (asset?.outputFormat === 'JPEG' ? 'JPG' : 'PNG');
  const mp = asset?.resolution?.width && asset?.resolution?.height
    ? megapixelsOf(asset.resolution.width, asset.resolution.height)
    : asset?.stockMetadata?.megapixels ?? null;
  const mpLabel = mp != null ? (mp >= 10 ? `${Math.round(mp)} MP` : `${mp.toFixed(1)} MP`) : '1.0 MP';

  useEffect(() => {
    setGlobalLogs(historyLogs);
    if (!asset?.id) return;
    Promise.all([getQaResultsForAssetDB(asset.id), getComplianceResultsForAssetDB(asset.id)]).then(([qa, compliance]) => {
      setQaResult(qa);
      setComplianceResult(compliance);
    }).catch(() => { setQaResult(null); setComplianceResult(null); });
    if (tab !== 'history') return;
    Promise.all([getHistoryDB(), getFeedbackForAssetDB(asset.id)]).then(([logs, feedback]) => {
      setGlobalLogs(logs);
      setLineageLogs([asset.lineage, ...(asset.revisions || []), ...(asset.lineage?.events || []), ...feedback].filter(Boolean));
    }).catch(() => setLineageLogs([]));
  }, [asset?.id, tab, historyLogs]);

  const copyPrompt = () => {
    if (!asset?.prompt) return;
    navigator.clipboard?.writeText(asset.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const decision = (result: any, fallback: string) => {
    const value = result?.decision || result?.status;
    if (!value) return fallback;
    const text = String(value);
    return /pass|ready|approv|ok|valid|dinilai/i.test(text) ? 'PASS' : text.toUpperCase();
  };

  const isPass = (text: string) => text === 'PASS';

  const recentHistoryAssets = assets.slice(0, 8);

  if (inspectorCollapsed) {
    return (
      <aside
        className="w-9.5 shrink-0 border-l border-slate-800/80 bg-[#0c101a] flex flex-col items-center py-2.5 gap-3 h-full max-h-screen select-none relative transition-all duration-150 ease-out"
        aria-label="Studio inspector rail"
      >
        <button
          type="button"
          onClick={() => setInspectorCollapsed(false)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1a2336] transition-colors cursor-pointer"
          title="Tampilkan inspector"
          aria-label="Tampilkan inspector"
          aria-expanded={false}
        >
          <PanelRightOpen className="w-3.5 h-3.5" />
        </button>
        <span
          className="text-[9px] font-mono tracking-widest text-slate-500 uppercase select-none font-bold pt-1"
          style={{ writingMode: 'vertical-rl' }}
        >
          INSPECTOR
        </span>
      </aside>
    );
  }

  const steps = asset?.settings?.steps ?? asset?.steps ?? null;
  const cfgScale = asset?.settings?.cfgScale ?? asset?.cfgScale ?? null;
  const seed = asset?.settings?.seed ?? asset?.seed ?? null;

  return (
    <aside
      className="w-[300px] shrink-0 bg-[#0c101a] border-l border-slate-800/80 flex flex-col justify-between overflow-hidden select-none relative"
      aria-label="Studio inspector"
      data-purpose="inspector-panel"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3.5 space-y-4">
          {/* Inspector Tabs Header */}
          <div className="flex items-center border-b border-slate-800 pb-2">
            {(['inspector', 'metadata', 'history'] as const).map((item) => (
              <button
                key={item}
                onClick={() => onTabChange(item)}
                role="tab"
                aria-selected={tab === item}
                className={`flex-1 text-center capitalize pb-1 ${
                  tab === item
                    ? 'font-bold text-xs text-blue-400 border-b-2 border-blue-500'
                    : 'font-medium text-xs text-slate-400 hover:text-slate-200'
                }`}
              >
                {item}
              </button>
            ))}
            <div className="flex items-center gap-0.5 pl-1 shrink-0">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  title="Clear selection"
                  aria-label="Clear selection"
                  className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectorCollapsed(true)}
                title="Sembunyikan inspector"
                aria-label="Sembunyikan inspector"
                aria-expanded
                className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {tab === 'history' ? (
            /* ── HISTORY TAB ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider">Asset Lineage</span>
              </div>
              {lineageLogs.length > 0 && (
                <div className="space-y-2">
                  {lineageLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-2.5 rounded-lg border border-slate-800 bg-[#111724] text-xs font-mono">
                      <span className="font-bold text-slate-200 uppercase">{log.action || log.type || 'Revision'}</span>
                      <p className="text-[10px] text-slate-400 mt-1">{log.detail || log.message || log.prompt || log.generationModel || 'Lineage record'}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider">Global Activity</span>
                <button onClick={onOpenHistory} className="text-[10px] font-bold text-blue-400 hover:underline">View All</button>
              </div>
              {globalLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <Clock className="w-8 h-8 opacity-40 mb-2" />
                  <p className="font-mono text-xs">No activity logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {globalLogs.slice(0, 15).map((log, idx) => (
                    <div key={log.id || idx} className="p-2.5 rounded-lg border border-slate-800 bg-[#111724] text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span className="font-bold text-slate-200 uppercase">{log.action || log.type || 'Event'}</span>
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans line-clamp-2">
                        {log.detail || log.message || log.prompt || 'Action completed'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !asset ? (
            /* ── EMPTY STATE ── */
            <div className="flex flex-col items-center justify-center py-24 text-center text-slate-500 px-4">
              <div className="w-12 h-12 rounded-xl border border-dashed border-slate-700 bg-[#111724] flex items-center justify-center mb-3">
                <FileImage className="w-6 h-6 opacity-40 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-200 mb-1">No Asset Selected</p>
              <p className="text-[11px] leading-relaxed">
                Click any asset card or thumbnail in the center stage to inspect its prompt, model, and metadata.
              </p>
            </div>
          ) : tab === 'metadata' ? (
            /* ── METADATA TAB ── */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider">Stock Metadata</span>
                <button onClick={onOpenDetails} className="text-[10px] font-bold text-blue-400 hover:underline">Edit in Preflight</button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Title</span>
                <div className="p-2.5 rounded-lg border border-slate-800 bg-[#0b0f18] text-xs text-slate-200 font-medium leading-relaxed select-text">
                  {metadata.title || asset.title || 'Untitled Asset'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                <div className="p-2 rounded-lg border border-slate-800 bg-[#111724] text-xs font-mono text-slate-400">
                  {asset.internalCategory || asset.adobeCategory || 'Graphic Resources'}
                </div>
              </div>

              {metadata.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Description</span>
                  <div className="p-2.5 rounded-lg border border-slate-800 bg-[#0b0f18] text-[11px] text-slate-400 leading-relaxed select-text">
                    {metadata.description}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Keywords ({metadata.keywords?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1">
                  {(metadata.keywords || []).map((kw: string, i: number) => (
                    <span key={`${kw}-${i}`} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{kw}</span>
                  ))}
                  {(!metadata.keywords || metadata.keywords.length === 0) && (
                    <span className="text-xs text-slate-500 italic">No keywords generated yet.</span>
                  )}
                </div>
              </div>

              <button
                onClick={onOpenDetails}
                className="w-full py-2.5 rounded-lg bg-[#161d2d] border border-slate-700/60 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
              >
                Open Full Metadata Preflight
              </button>
            </div>
          ) : (
            /* ── INSPECTOR TAB ── */
            <>
              {/* Selected Asset Banner */}
              <div className="flex items-center space-x-3 bg-[#111726] border border-slate-800 p-2 rounded-lg">
                <div className="w-11 h-11 rounded-md overflow-hidden border border-slate-700 shrink-0">
                  <AssetPreviewImage
                    src={asset.url}
                    alt={metadata.title || asset.title || 'Active Item'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-[11px] truncate" title={metadata.title || asset.title || 'Untitled Asset'}>
                      {metadata.title || asset.title || 'Untitled Asset'}
                    </span>
                    <button
                      onClick={() => onDownload?.(asset)}
                      title="Download"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">{dimensions} • {fmt}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${TONE_CLASS[statusTone]}`}>
                      <span className={`w-1 h-1 rounded-full mr-1 ${TONE_DOT[statusTone]}`} />
                      {statusCfg?.label || 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prompt Readout */}
              <div className="space-y-1">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Prompt
                </span>
                <div
                  onClick={copyPrompt}
                  title="Klik untuk salin prompt"
                  className="bg-[#111724] border border-slate-800/90 rounded-lg p-2.5 text-[11px] text-slate-300 leading-relaxed font-sans cursor-pointer hover:border-slate-700 select-text"
                >
                  {asset.prompt || asset.baseTheme || 'Belum ada prompt tercatat untuk aset ini.'}
                  {copiedPrompt && <span className="ml-1 text-emerald-400 font-bold">· tersalin</span>}
                </div>
              </div>

              {/* Model Telemetry Card */}
              <div className="space-y-1.5">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  Model
                </span>
                <div className="bg-[#111724] border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="font-bold text-slate-200 text-xs truncate">{model}</span>
                  </div>
                  <button
                    onClick={() => emitOpenStudioModal('settings')}
                    className="bg-[#1c2438] hover:bg-blue-600 hover:text-white px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium transition shrink-0"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Generation Settings Table */}
              <div className="space-y-1.5">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Generation Settings
                </span>
                <div className="bg-[#111724] border border-slate-800 rounded-lg p-2.5 text-xs font-mono space-y-1.5">
                  <SettingsRow label="Steps" value={steps ?? '—'} />
                  <SettingsRow label="CFG Scale" value={cfgScale ?? '—'} />
                  <SettingsRow label="Seed" value={seed ?? '—'} />
                  <SettingsRow label="Aspect Ratio" value={asset.aspectRatio || '1:1'} />
                  <SettingsRow label="Style" value={pretty(asset.style || 'Flat Commercial')} />
                  <SettingsRow label="Background" value={pretty(asset.background || 'Auto')} />
                  <SettingsRow label="Resolution" value={mpLabel} />
                </div>
              </div>

              {/* Style & DNA Tags */}
              <div className="space-y-1.5">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" x2="7.01" y1="7" y2="7" />
                  </svg>
                  Style & DNA
                </span>
                <div className="flex flex-wrap gap-1">
                  {asset.style && (
                    <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                      {pretty(asset.style)}
                    </span>
                  )}
                  {(asset.generationMode || asset.assetType) && (
                    <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 text-[10px] font-bold">
                      {pretty(asset.generationMode || asset.assetType)}
                    </span>
                  )}
                  {(metadata.keywords || []).slice(0, 6).map((tag: string, i: number) => (
                    <span key={`${tag}-${i}`} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{tag}</span>
                  ))}
                  {(metadata.keywords || []).length > 6 && (
                    <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 text-[10px] font-bold">
                      +{(metadata.keywords || []).length - 6}
                    </span>
                  )}
                  {!asset.style && !(metadata.keywords || []).length && (
                    <span className="text-[10px] text-slate-500 italic">Belum ada tag DNA.</span>
                  )}
                </div>
              </div>

              {/* Quality & Compliance Checklist */}
              <div className="bg-[#101524] border border-slate-800 rounded-lg p-2.5 space-y-2">
                <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Quality &amp; Compliance
                </span>
                <div className="space-y-1 text-[11px]">
                  {[
                    { label: 'Visual Quality', value: decision(qaResult, 'Belum dinilai') },
                    { label: 'Content Safety', value: decision(complianceResult, 'Belum ada data') },
                    { label: 'Technical QA', value: decision({ status: asset.status }, 'Belum ada data') },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <svg className={`w-3.5 h-3.5 ${isPass(value) ? 'text-emerald-400' : 'text-amber-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
                        </svg>
                        {label}
                      </span>
                      <span className={`font-bold text-[10px] ${isPass(value) ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onOpenDetails}
                  className="w-full mt-1 py-1 bg-[#161d2d] hover:bg-slate-800 border border-slate-700/60 rounded text-[10px] text-slate-300"
                >
                  View Full Metadata
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inspector Bottom Quick Actions Drawer */}
      {tab === 'inspector' && asset && (
        <div className="p-3 bg-[#0a0e17] border-t border-slate-800/90 space-y-2 shrink-0">
          <span className="panel-header text-[10px] font-bold text-slate-400 tracking-wider">Quick Actions</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              disabled={!asset.url}
              onClick={() => onDownload?.(asset)}
              className="py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span>Download</span>
            </button>
            <button
              onClick={onOpenDetails}
              className="py-2 px-2.5 bg-[#172033] hover:bg-[#1f2b45] text-slate-200 border border-slate-700/70 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Open in Editor</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              disabled={!asset.libraryAssetId}
              onClick={() => onUpscale?.(id)}
              title={!asset.libraryAssetId ? 'Sync to library first' : 'Stage to Upscale module'}
              className="py-1.5 px-2 bg-[#121824] hover:bg-[#1a2336] text-slate-300 border border-slate-800 rounded text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <span>Send to Upscale</span>
            </button>
            <button
              disabled={!asset.libraryAssetId}
              onClick={() => onVectorize?.(id)}
              title={!asset.libraryAssetId ? 'Sync to library first' : 'Stage to Vectorize module'}
              className="py-1.5 px-2 bg-[#121824] hover:bg-[#1a2336] text-slate-300 border border-slate-800 rounded text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m12 19 7-7 3 3-7 7-3-3z" />
              </svg>
              <span>Send to Vectorize</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              disabled={!asset.url}
              onClick={() => onAnimate?.(asset)}
              title="Kirim ke Remotion"
              className="py-1.5 px-2 bg-[#121824] hover:bg-[#1a2336] text-slate-300 border border-slate-800 rounded text-[10px] flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <svg className="w-3 h-3 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Send to Remotion</span>
            </button>
            {asset.url && asset.outputFormat !== 'JPEG' && (
              <button
                onClick={() => onRemoveBgSingle?.(asset)}
                title="Remove background (alpha 3-layer lokal, pratinjau dulu)"
                className="py-1.5 px-2 bg-[#121824] hover:bg-[#1a2336] text-slate-300 border border-slate-800 rounded text-[10px] flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect height="18" rx="2" width="18" x="3" y="3" />
                </svg>
                <span>Remove BG</span>
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
