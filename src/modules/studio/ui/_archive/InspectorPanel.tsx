// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eraser,
  FileImage,
  Layers,
  Maximize2,
  PanelRightOpen,
  PenTool,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Wand2,
  X,
} from 'lucide-react';
import { AssetPreviewImage } from './AssetPreviewImage';
import { STATUS_CONFIG } from '../../registry/constants';
import { megapixelsOf } from '../../utils';
import { getComplianceResultsForAssetDB, getFeedbackForAssetDB, getHistoryDB, getQaResultsForAssetDB } from '../../engines/storage';

export interface InspectorPanelProps {
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
  historyLogs?: any[];
  assets?: any[];
  onSelectAsset?: (asset: any) => void;
  inspectorCollapsed?: boolean;
  onToggleInspectorCollapsed?: (collapsed: boolean) => void;
}

const pretty = (value: any) => String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function InspectorPanel({
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
  historyLogs = [],
  assets = [],
  onSelectAsset,
  inspectorCollapsed: controlledCollapsed,
  onToggleInspectorCollapsed,
}: InspectorPanelProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [localInspectorCollapsed, setLocalInspectorCollapsed] = useState(false);
  const [lineageLogs, setLineageLogs] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>(historyLogs);

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
  const [qaResult, setQaResult] = useState<any>(null);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const statusCfg = STATUS_CONFIG[asset?.status] || STATUS_CONFIG.draft;
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

  const copyAllKeywords = () => {
    const kw = (metadata.keywords || []).join(', ');
    if (!kw) return;
    navigator.clipboard?.writeText(kw);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const recentHistoryAssets = assets.slice(0, 8);

  if (inspectorCollapsed) {
    return (
      <aside
        className="w-9.5 shrink-0 border-l border-[var(--border-structural)] bg-[var(--bg-panel)] flex flex-col items-center py-2.5 gap-3 h-full max-h-screen select-none relative transition-all duration-150 ease-out"
        aria-label="Studio inspector rail"
      >
        <button
          type="button"
          onClick={() => setInspectorCollapsed(false)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          title="Tampilkan inspector"
          aria-label="Tampilkan inspector"
          aria-expanded={false}
        >
          <PanelRightOpen className="w-3.5 h-3.5" />
        </button>

        <span
          className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase select-none font-bold pt-1"
          style={{ writingMode: 'vertical-rl' }}
        >
          INSPECTOR
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="w-[320px] xl:w-[340px] shrink-0 border-l border-[var(--border-structural)] bg-[var(--bg-panel)] flex flex-col h-full max-h-screen select-none relative overflow-hidden transition-all duration-150 ease-out"
      aria-label="Studio inspector"
    >
      {/* ── HEADER TABS ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-structural)] bg-[var(--bg-panel)] px-3 py-2 z-10 shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-structural)]">
          {(['inspector', 'metadata', 'history'] as const).map((item) => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={`px-3 py-1 rounded-md text-[11px] font-mono font-semibold transition-all capitalize ${
                tab === item
                  ? 'bg-[var(--bg-panel)] text-[var(--accent-cobalt)] shadow-xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-selected={tab === item}
              role="tab"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              title="Close Inspector"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setInspectorCollapsed(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Sembunyikan inspector"
            aria-label="Sembunyikan inspector"
            aria-expanded={true}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main tab scroll body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar min-w-0">
          {tab === 'history' ? (
            /* ── HISTORY TAB ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-structural)]">
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Asset Lineage</span>
              </div>
              {lineageLogs.length > 0 && <div className="space-y-2">{lineageLogs.map((log, idx) => <div key={log.id || idx} className="p-2.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono"><span className="font-bold text-[var(--text-primary)] uppercase">{log.action || log.type || 'Revision'}</span><p className="text-[10px] text-[var(--text-secondary)] mt-1">{log.detail || log.message || log.prompt || log.generationModel || 'Lineage record'}</p></div>)}</div>}
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-structural)]">
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Global Activity</span>
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Activity Timeline</span>
                <button
                  onClick={onOpenHistory}
                  className="font-mono text-[10px] font-bold text-[var(--accent-cobalt)] hover:underline"
                >
                  View All
                </button>
              </div>

              {globalLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
                  <Clock className="w-8 h-8 opacity-40 mb-2" />
                  <p className="font-mono text-xs">No activity logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {globalLogs.slice(0, 15).map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-2.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--text-primary)] uppercase">{log.action || log.type || 'Event'}</span>
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-sans line-clamp-2">
                        {log.detail || log.message || log.prompt || 'Action completed'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !asset ? (
            /* ── EMPTY STATE ── */
            <div className="flex flex-col items-center justify-center py-24 text-center text-[var(--text-muted)] px-4">
              <div className="w-12 h-12 rounded-xl border border-dashed border-[var(--border-structural)] bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
                <FileImage className="w-6 h-6 opacity-40 text-[var(--text-primary)]" />
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">No Asset Selected</p>
              <p className="text-[11px] leading-relaxed">
                Click any asset card or thumbnail in the center stage to inspect its prompt, model, and metadata.
              </p>
            </div>
          ) : tab === 'metadata' ? (
            /* ── METADATA TAB ── */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-structural)]">
                <span className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Stock Metadata</span>
                <button
                  onClick={onOpenDetails}
                  className="font-mono text-[10px] font-bold text-[var(--accent-cobalt)] hover:underline"
                >
                  Edit in Preflight
                </button>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase">Title</span>
                <div className="p-2.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-void)] text-xs text-[var(--text-primary)] font-medium leading-relaxed select-text">
                  {metadata.title || asset.title || 'Untitled Asset'}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase">Category</span>
                <div className="p-2 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono text-[var(--text-secondary)]">
                  {asset.internalCategory || asset.adobeCategory || 'Graphic Resources'}
                </div>
              </div>

              {/* Description */}
              {metadata.description && (
                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase">Description</span>
                  <div className="p-2.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-void)] text-[11px] text-[var(--text-secondary)] leading-relaxed select-text">
                    {metadata.description}
                  </div>
                </div>
              )}

              {/* Keywords */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase">
                    Keywords ({metadata.keywords?.length || 0})
                  </span>
                  {metadata.keywords?.length > 0 && (
                    <button
                      onClick={copyAllKeywords}
                      className="font-mono text-[10px] text-[var(--accent-cobalt)] hover:underline flex items-center gap-1"
                    >
                      {copiedKeywords ? <Check className="w-3 h-3 text-[var(--accent-success)]" /> : <Copy className="w-3 h-3" />}
                      {copiedKeywords ? 'Copied' : 'Copy All'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {(metadata.keywords || []).map((kw: string, i: number) => (
                    <span
                      key={`${kw}-${i}`}
                      className="px-2 py-0.5 rounded-md border border-[var(--border-structural)] bg-[var(--bg-elevated)] font-mono text-[10px] text-[var(--text-secondary)]"
                    >
                      {kw}
                    </span>
                  ))}
                  {(!metadata.keywords || metadata.keywords.length === 0) && (
                    <span className="text-xs text-[var(--text-muted)] italic">No keywords generated yet.</span>
                  )}
                </div>
              </div>

              <button
                onClick={onOpenDetails}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-structural)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--accent-cobalt)] transition shadow-xs"
              >
                Open Full Metadata Preflight
              </button>
            </div>
          ) : (
            /* ── INSPECTOR TAB ── */
            <div className="space-y-3.5">
              {/* Selected Asset Banner */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] shadow-xs">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--border-structural)] bg-[var(--bg-void)] shrink-0">
                  <AssetPreviewImage
                    src={asset.url}
                    alt={metadata.title || asset.title || 'asset'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-[var(--text-primary)] truncate" title={metadata.title || asset.title || 'Untitled Asset'}>
                    {metadata.title || asset.title || 'Untitled Asset'}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                    {dimensions} • {fmt}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Quick card action buttons */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => setIsFav(!isFav)}
                    className={`p-1 rounded transition-colors ${
                      isFav ? 'text-[var(--accent-warning)]' : 'text-[var(--text-muted)] hover:text-[var(--accent-warning)]'
                    }`}
                    title="Favorite"
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => onDownload?.(asset)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* File Meta Chip Row */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-center">
                <div className="p-1.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)]">
                  <div className="text-[var(--text-muted)] text-[8px] uppercase">Format</div>
                  <div className="font-bold text-[var(--text-primary)]">{fmt}</div>
                </div>
                <div className="p-1.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)]">
                  <div className="text-[var(--text-muted)] text-[8px] uppercase">Res</div>
                  <div className="font-bold text-[var(--text-primary)]">{mpLabel}</div>
                </div>
                <div className="p-1.5 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-elevated)]">
                  <div className="text-[var(--text-muted)] text-[8px] uppercase">Type</div>
                  <div className="font-bold text-[var(--text-primary)] truncate">{pretty(asset.assetType || 'Image')}</div>
                </div>
              </div>

              {/* Prompt Readout */}
              {(asset.baseTheme || asset.prompt) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[var(--accent-cobalt)]" /> Prompt
                    </span>
                    <button
                      onClick={copyPrompt}
                      className="font-mono text-[10px] text-[var(--accent-cobalt)] hover:underline flex items-center gap-1"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-[var(--accent-success)]" /> : <Copy className="w-3 h-3" />}
                      {copiedPrompt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-void)] font-mono text-[11px] text-[var(--text-primary)] leading-relaxed select-text">
                    {asset.prompt}
                  </div>
                </div>
              )}

              {/* Model Card */}
              <div className="space-y-1.5">
                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3 text-[var(--mod-st-text)]" /> Synthesis Model
                </span>
                <div className="p-2 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--module-studio)]" />
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{model}</span>
                  </div>
                  <span className="font-mono text-[9px] text-[var(--text-muted)] bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-structural)]">
                    {asset.lineage?.provider || 'AI Engine'}
                  </span>
                </div>
              </div>

              {/* Generation Settings Grid */}
              <div className="space-y-1.5">
                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Generation Parameters
                </span>
                <div className="p-2.5 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-sans">Aspect Ratio</span>
                    <span className="font-bold text-[var(--text-primary)]">{asset.aspectRatio || '1:1'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-sans">Style Preset</span>
                    <span className="font-bold text-[var(--text-primary)]">{pretty(asset.style || 'Flat Commercial')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-sans">Background</span>
                    <span className="font-bold text-[var(--text-primary)]">{pretty(asset.background || 'Auto')}</span>
                  </div>
                  {asset.generationMode && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] font-sans">Mode</span>
                      <span className="font-bold text-[var(--text-primary)]">{pretty(asset.generationMode)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Style & DNA Tags */}
              {(asset.style || metadata.keywords?.length) && (
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-[var(--accent-cyan)]" /> Style & DNA Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {asset.style && (
                      <span className="px-2 py-0.5 rounded-md bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30 font-mono text-[10px] font-semibold">
                        {asset.style}
                      </span>
                    )}
                    {(metadata.keywords || []).slice(0, 6).map((tag: string, i: number) => (
                      <span
                        key={`${tag}-${i}`}
                        className="px-2 py-0.5 rounded-md border border-[var(--border-structural)] bg-[var(--bg-elevated)] font-mono text-[10px] text-[var(--text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality & Compliance Checklist */}
              {(
                <div className="p-2.5 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] space-y-2">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-[var(--accent-success)]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Quality & Compliance
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Visual QA</span>
                      <span className="text-[var(--accent-success)] font-bold">{qaResult ? (qaResult.decision || qaResult.status || 'Dinilai') : 'Belum dinilai'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Brand Safety</span>
                      <span className="text-[var(--accent-success)] font-bold">{complianceResult ? (complianceResult.decision || complianceResult.status || 'Dinilai') : 'Belum ada data'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Platform Metadata</span>
                      <span className="text-[var(--accent-success)] font-bold">{asset?.status || 'Belum ada data'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={onOpenDetails} className="flex-1 py-2 rounded-lg border border-[var(--border-structural)] text-[10px] font-mono font-bold hover:border-[var(--accent-cobalt)]">Full Review</button>
                    <button type="button" onClick={onOpenDetails} className="flex-1 py-2 rounded-lg border border-[var(--border-structural)] text-[10px] font-mono font-bold hover:border-[var(--accent-cobalt)]">Edit Metadata</button>
                  </div>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  disabled={!asset.url}
                  onClick={() => onDownload?.(asset)}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent-cobalt-solid)] text-white text-xs font-mono font-bold hover:brightness-110 shadow-sm transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" /> Download Asset
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!asset.libraryAssetId}
                    onClick={() => onUpscale?.(id)}
                    className="py-2 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono font-semibold text-[var(--text-primary)] hover:border-[var(--accent-cobalt)] hover:text-[var(--accent-cobalt)] transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                    title={!asset.libraryAssetId ? "Sync to library first" : "Stage to Upscale module"}
                  >
                    <Maximize2 className="w-3 h-3" /> Upscale
                  </button>

                  <button
                    disabled={!asset.libraryAssetId}
                    onClick={() => onVectorize?.(id)}
                    className="py-2 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono font-semibold text-[var(--text-primary)] hover:border-[var(--module-studio)] hover:text-[var(--mod-st-text)] transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                    title={!asset.libraryAssetId ? "Sync to library first" : "Stage to Vectorize module"}
                  >
                    <PenTool className="w-3 h-3" /> Vectorize
                  </button>
                  {asset.url && asset.outputFormat !== 'JPEG' && (
                    <button
                      onClick={() => onRemoveBgSingle?.(asset)}
                      className="col-span-2 py-2 rounded-xl border border-[var(--border-structural)] bg-[var(--bg-elevated)] text-xs font-mono font-semibold text-[var(--text-primary)] hover:border-[var(--accent-success)]/40 hover:text-[var(--accent-success)] transition flex items-center justify-center gap-1.5"
                      title="Remove background (alpha 3-layer lokal, pratinjau dulu)"
                    >
                      <Eraser className="w-3 h-3" /> Remove Background
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── THIN VERTICAL GENERATION HISTORY COLUMN ── */}
        {recentHistoryAssets.length > 0 && (
          <div className="w-12 shrink-0 border-l border-[var(--border-structural)] bg-[var(--bg-elevated)]/50 flex flex-col items-center py-2 gap-2 overflow-y-auto custom-scrollbar">
            <span className="font-mono text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              REC
            </span>
            {recentHistoryAssets.map((item, idx) => {
              const isSelected = item.id === asset?.id;
              return (
                <button
                  key={item.id || idx}
                  onClick={() => onSelectAsset?.(item)}
                  className={`w-9 h-9 rounded-md overflow-hidden border transition-all shrink-0 ${
                    isSelected
                      ? 'border-[var(--accent-cobalt)] ring-2 ring-[var(--accent-cobalt)] scale-105'
                      : 'border-[var(--border-structural)] opacity-60 hover:opacity-100 hover:border-[var(--border-strong)]'
                  }`}
                  title={item.stockMetadata?.title || item.title || `Asset ${idx + 1}`}
                >
                  <AssetPreviewImage
                    src={item.url}
                    alt="history thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
