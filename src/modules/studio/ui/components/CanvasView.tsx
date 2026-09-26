// @ts-nocheck
import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Box,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Download,
  Eye,
  LayoutGrid,
  List,
  ListChecks,
  Loader2,
  Maximize2,
  MoreHorizontal,
  PenTool,
  Search,
  Sparkles,
  Square,
  Star,
  Trash2,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GENERATE_METADATA_STEPS, STATUS_CONFIG } from '../../registry/constants';
import { RESOLUTION_POLICY, aspectRatioToCss, megapixelsOf } from '../../utils';
import { AssetPreviewImage } from './AssetPreviewImage';
import { PAGE_SIZE } from '../../registry/constants';
import { isIconAsset, isReadyForSubmit, normalizeGalleryStatus } from './assetGallery';
import { downloadCsvForAssets, handleBulkExport } from '../../../../components/metadata/export';

export interface CanvasViewProps { [key: string]: any }

const typeLabel = (type: string) => type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1);

function TaskButton({
  activeGeneration,
  activeMetadata,
  batchQueue,
  cancelGeneration,
  genCtx,
  generationProgress,
  metaStepLabel,
  metadataGenerating,
  metadataProgress,
  metadataStep,
  setTasksOpen,
  tasksOpen,
  setTasksCollapsed,
  tasksCollapsed,
}: any) {
  const hasTasks = activeGeneration || activeMetadata;
  const activeJobCount = Number(Boolean(activeGeneration)) + Number(Boolean(activeMetadata));
  return (
    <div className={`flex shrink-0 ${tasksCollapsed ? 'w-11' : 'items-start gap-2'}`}>
      {tasksCollapsed ? (
        <button
          type="button"
          onClick={() => setTasksCollapsed(false)}
          className="w-11 min-h-20 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-panel)] text-[var(--studio-primary)] flex flex-col items-center justify-center gap-1 relative"
          title="Show tasks"
          aria-label="Show tasks"
          aria-expanded={false}
        >
          <ListChecks className="w-4 h-4" />
          {activeJobCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--studio-accent)] text-white text-[9px] font-bold">{activeJobCount}</span>}
          <span className="text-[8px] font-mono" style={{ writingMode: 'vertical-rl' }}>TASKS</span>
        </button>
      ) : (
      <div className="flex flex-col items-end">
      <button
        onClick={(e) => { e.stopPropagation(); setTasksOpen(prev => !prev); }}
        aria-expanded={!tasksCollapsed && tasksOpen}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
          hasTasks
            ? 'bg-[var(--bg-panel)] border-[var(--accent-cobalt)]/40 text-[var(--accent-cobalt)] shadow-xs'
            : 'bg-[var(--bg-elevated)] border-[var(--border-structural)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
        }`}
        title="Generation & Metadata Task Progress"
      >
        {hasTasks ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-cobalt)]" />
        ) : (
          <ListChecks className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        )}
        <span className="font-mono text-[11px] tracking-wide">Tasks</span>
        {hasTasks && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cobalt)] animate-pulse" />
        )}
      </button>

      {tasksOpen && (
        <div
          className="mt-2 w-[320px] rounded-xl border border-[var(--studio-border)] bg-[var(--studio-panel)] shadow-xl overflow-hidden animate-[slideInRight_150ms_ease]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-[var(--border-structural)] bg-[var(--bg-elevated)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)]">Generation Tasks</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">Pipeline Telemetry</span>
            </div>
            <button
              onClick={() => setTasksOpen(false)}
              className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* GENERATE GAMBAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase">
                <span className="flex items-center gap-1.5 text-[var(--accent-cobalt)]">
                  {activeGeneration ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-[var(--accent-success)]" />}
                  Image Synthesis
                </span>
                {generationProgress.total > 0 && (
                  <span className="text-[var(--text-primary)]">{generationProgress.current} / {generationProgress.total}</span>
                )}
              </div>
              {activeGeneration && generationProgress.total > 0 && (
                <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-structural)]">
                  <div
                    className="h-full bg-[var(--accent-cobalt)] rounded-full transition-all duration-500"
                     style={{ width: `${generationProgress.total > 0 ? Math.min(100, (generationProgress.current / generationProgress.total) * 100) : 0}%` }}
                  />
                </div>
              )}
              {activeGeneration && (
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono font-semibold text-center">
                  <div className="p-1.5 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-structural)]">
                    <div className="text-[var(--accent-cobalt)] font-bold">{generationProgress.current}</div>
                    <div className="text-[var(--text-muted)] text-[8px] uppercase">Active</div>
                  </div>
                  <div className="p-1.5 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-structural)]">
                    <div className="text-[var(--accent-success)] font-bold">{batchQueue.total > 0 ? batchQueue.completed : generationProgress.current}</div>
                    <div className="text-[var(--text-muted)] text-[8px] uppercase">Done</div>
                  </div>
                  <div className="p-1.5 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-structural)]">
                    <div className="text-[var(--text-secondary)] font-bold">{batchQueue.total > 0 ? Math.max(0, batchQueue.total - batchQueue.completed - batchQueue.failed) : Math.max(0, generationProgress.total - generationProgress.current)}</div>
                    <div className="text-[var(--text-muted)] text-[8px] uppercase">Queue</div>
                  </div>
                </div>
              )}
              {!activeGeneration && !activeMetadata && (
                <div className="text-[11px] text-[var(--text-muted)] font-mono py-1 text-center">No active background jobs.</div>
              )}
              {activeGeneration && (
                <button
                  onClick={() => cancelGeneration(genCtx)}
                  className="w-full py-1.5 rounded-lg bg-[var(--accent-error)]/10 text-[var(--accent-error)] border border-[var(--accent-error)]/30 text-[10px] font-mono font-bold hover:bg-[var(--accent-error-solid)] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3 h-3" /> Stop Queue
                </button>
              )}
            </div>

            {/* GENERATE METADATA */}
            {activeMetadata && (
              <div className="space-y-2 pt-3 border-t border-[var(--border-structural)]">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase">
                  <span className="flex items-center gap-1.5 text-[var(--accent-cyan)]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Metadata Generation
                  </span>
                  {metadataProgress.total > 1 && (
                    <span className="text-[var(--text-primary)]">{metadataProgress.current} / {metadataProgress.total}</span>
                  )}
                </div>
                {metadataGenerating && (
                  <div className="text-[9px] font-mono font-semibold text-[var(--accent-cyan)] flex items-center gap-1.5">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> {metaStepLabel(metadataStep)}
                  </div>
                )}
                <div className="space-y-1">
                  {GENERATE_METADATA_STEPS.map((stepName, idx) => {
                    const isPast = idx < metadataStep;
                    const isCurrent = idx === metadataStep;
                    return (
                         <div
                        key={idx}
                        className={`flex items-center gap-2 text-[9px] font-mono transition-all ${
                          isPast
                            ? 'text-[var(--accent-success)]'
                            : isCurrent
                            ? 'text-[var(--text-primary)] font-bold'
                            : 'text-[var(--text-muted)] opacity-50'
                        }`}
                      >
                        {isPast ? <CheckCircle2 className="w-3 h-3" /> : isCurrent ? <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-cyan)]" /> : <CircleDot className="w-3 h-3" />}
                        <span>{stepName}</span>
                       </div>
                    );
                  })}
                </div>
                {metadataProgress.total > 1 && (
                  <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-structural)]">
                         <button
                           type="button"
                      className="h-full bg-[var(--accent-cyan)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (metadataProgress.current / metadataProgress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <button type="button" onClick={() => { setTasksCollapsed(true); setTasksOpen(false); }} className="mt-1 p-1 rounded text-[var(--studio-faint)] hover:text-[var(--studio-primary)]" title="Collapse tasks" aria-label="Collapse tasks" aria-expanded={true}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      </div>
      )}
    </div>
  );
}

export default function CanvasView({
  activeGeneration,
  activeMetadata,
  assets = [],
  batchQueue,
  bulkMenuOpen,
  cancelGeneration,
  confirmBlocking,
  deleteAsset,
  deleteOldDrafts,
  filterStatus,
  formatFileSize,
  galleryPage,
  genCtx,
  generationProgress,
  getAssetFileSizeKB,
  handleBulkDelete,
  handleBulkGenerateMetadata,
  handleOpenRemoveBgBulk,
  handleDownloadSingle,
  isAssetsLoading,
  metaStepLabel,
  metadataGenerating,
  metadataProgress,
  metadataStep,
  metaCtx,
  searchQuery,
  selectedAssetIds,
  setAssets,
  setBulkMenuOpen,
  setFilterStatus,
  setGalleryPage,
  setGridModalAsset,
  setSearchQuery,
  setSelectedAssetDetail,
  setSelectedAssetIds,
  setTasksOpen,
  showToast,
  storageCtx,
  tasksOpen,
  tasksCollapsed,
  toggleSelection,
  onVectorize,
  onUpscale,
  onAssetSelect,
  selectedAsset,
  activeProjectId,
  handleImportImageSelected,
}: CanvasViewProps) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridCols, setGridCols] = useState<3 | 4 | 5 | 6>(5);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  useEffect(() => {
    if (!bulkMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setBulkMenuOpen?.(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [bulkMenuOpen, setBulkMenuOpen]);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(assets.filter((a: any) => a.favorite).map((a: any) => a.id)));
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const filmstripScrollRef = useRef<HTMLDivElement>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filterStatus, typeFilter, searchQuery, sortBy, activeProjectId]);
  useEffect(() => { setFavorites(new Set(assets.filter((a: any) => a.favorite).map((a: any) => a.id))); }, [assets]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setAssets?.((current: any[]) => current.map(a => a.id === id ? { ...a, favorite: next.has(id) } : a));
      return next;
    });
  };

  // Filter & Search
  const filteredAssets = useMemo(() => {
    let list = Array.isArray(assets) ? [...assets] : [];
    if (activeProjectId) list = list.filter(a => (a.projectId || null) === activeProjectId);

    if (filterStatus && filterStatus !== 'all') {
      list = list.filter(a => normalizeGalleryStatus(a) === filterStatus);
    }

    if (typeFilter && typeFilter !== 'all') {
      list = list.filter(a => typeFilter === 'icon' ? isIconAsset(a) : (!isIconAsset(a) && (a.assetType || a.type || 'image') === typeFilter));
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.title || 'Untitled').toLowerCase().includes(q) ||
        (a.baseTheme || '').toLowerCase().includes(q) ||
        (a.prompt || '').toLowerCase().includes(q) ||
        (a.manifest?.elements || []).some((e: any) => (e.label || '').toLowerCase().includes(q) || (e.id || '').includes(q)) ||
        (a.stockMetadata?.keywords || []).some((k: string) => k.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const timeA = a.createdAt || a.timestamp || 0;
        const timeB = b.createdAt || b.timestamp || 0;
        return timeB - timeA;
      }
      if (sortBy === 'date_asc') {
        const timeA = a.createdAt || a.timestamp || 0;
        const timeB = b.createdAt || b.timestamp || 0;
        return timeA - timeB;
      }
      if (sortBy === 'name_asc') {
        const nameA = a.stockMetadata?.title || a.title || a.name || '';
        const nameB = b.stockMetadata?.title || b.title || b.name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = a.stockMetadata?.title || a.title || a.name || '';
        const nameB = b.stockMetadata?.title || b.title || b.name || '';
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'dim_desc') {
        const dimA = (a.resolution?.width || 1024) * (a.resolution?.height || 1024);
        const dimB = (b.resolution?.width || 1024) * (b.resolution?.height || 1024);
        return dimB - dimA;
      }
      if (sortBy === 'dim_asc') {
        const dimA = (a.resolution?.width || 1024) * (a.resolution?.height || 1024);
        const dimB = (b.resolution?.width || 1024) * (b.resolution?.height || 1024);
        return dimA - dimB;
      }
      return 0;
    });

    return list;
  }, [assets, activeProjectId, filterStatus, typeFilter, searchQuery, sortBy]);

  const totalFiltered = filteredAssets.length;
  const paginatedAssets = filteredAssets.slice(0, visibleCount);
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;
  const itemsPerPage = PAGE_SIZE;

  // Current active preview asset
  const heroAsset = selectedAsset || (filteredAssets.length > 0 ? filteredAssets[0] : null);
  const heroIndex = filteredAssets.findIndex(a => a.id === heroAsset?.id);

  const handlePrevHero = () => {
    if (filteredAssets.length === 0) return;
    const prevIdx = (heroIndex - 1 + filteredAssets.length) % filteredAssets.length;
    onAssetSelect?.(filteredAssets[prevIdx]);
  };

  const handleNextHero = () => {
    if (filteredAssets.length === 0) return;
    const nextIdx = (heroIndex + 1) % filteredAssets.length;
    onAssetSelect?.(filteredAssets[nextIdx]);
  };

  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (!filmstripScrollRef.current) return;
    const amount = direction === 'left' ? -200 : 200;
    filmstripScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const toggleSelectAll = () => {
    const selectedInScope = filteredAssets.filter(a => selectedAssetIds.has(a.id));
    if (selectedInScope.length === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedAssetIds(prev => new Set([...prev].filter(id => !filteredAssets.some(a => a.id === id))));
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const displayedMegapixels = (asset: any) => asset?.resolution?.width && asset?.resolution?.height
    ? megapixelsOf(asset.resolution.width, asset.resolution.height)
    : asset?.stockMetadata?.megapixels ?? null;

  return (
    <section
      className="relative flex-1 flex flex-col min-w-0 bg-[#07090e] overflow-hidden"
      data-purpose="stage-view"
      onDragOver={e => { e.preventDefault(); setIsDropActive(true); }}
      onDragLeave={() => setIsDropActive(false)}
      onDrop={e => { e.preventDefault(); setIsDropActive(false); if (e.dataTransfer.files.length) { const input = document.createElement('input'); input.type = 'file'; input.files = e.dataTransfer.files; handleImportImageSelected?.({ target: input }); } }}
    >
      {isDropActive && (
        <div className="absolute inset-3 z-40 pointer-events-none rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10 flex items-center justify-center">
          <span className="rounded-lg bg-[#0e131f] border border-slate-800 px-4 py-3 font-mono text-xs font-bold text-blue-300 shadow-lg">Drop images to import</span>
        </div>
      )}

      {/* Top Action Search and View Filters Bar */}
       <div className="min-h-10 bg-[#0b0f18] border-b border-slate-800/80 px-4 py-1 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Search Assets Box */}
          <div className="relative w-72 max-[700px]:w-9 shrink-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search assets, tags, or keywords..."
              className="w-full max-[700px]:pl-9 max-[700px]:pr-1 max-[700px]:text-transparent max-[700px]:placeholder-transparent bg-[#121824] border border-slate-800 rounded-md pl-8 pr-8 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* View and Sort Controls */}
        <div className="flex items-center gap-3 text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>View</span>
            <div className="relative">
              <button
                onClick={() => setViewMenuOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={viewMenuOpen}
                className="bg-[#121824] border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium flex items-center gap-1 hover:text-white transition cursor-pointer"
                title="Ubah tampilan & kerapatan grid"
              >
                <span>{viewMode === 'list' ? 'List' : `Grid ${gridCols}×${gridCols}`}</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </button>
              {viewMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setViewMenuOpen(false)} aria-hidden="true" />
                  <div role="menu" className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-slate-700 bg-[#0e131f] p-1 shadow-2xl">
                    {([3, 4, 5, 6] as const).map(cols => (
                      <button
                        key={cols}
                        role="menuitemradio"
                        aria-checked={viewMode === 'grid' && gridCols === cols}
                        onClick={() => { setGridCols(cols); setViewMode('grid'); setViewMenuOpen(false); }}
                        className={`w-full px-2.5 py-1.5 text-left text-[11px] rounded hover:bg-[#1a2336] ${
                          viewMode === 'grid' && gridCols === cols ? 'text-blue-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        Grid {cols}×{cols}
                      </button>
                    ))}
                    <button
                      role="menuitemradio"
                      aria-checked={viewMode === 'list'}
                      onClick={() => { setViewMode('list'); setViewMenuOpen(false); }}
                      className={`w-full px-2.5 py-1.5 text-left text-[11px] rounded hover:bg-[#1a2336] ${
                        viewMode === 'list' ? 'text-blue-300 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Gallery menu (bulk actions) */}
          <div className="relative">
            <button
              onClick={() => setBulkMenuOpen?.(!bulkMenuOpen)}
              className="flex items-center gap-1 bg-[#121824] border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white transition"
              title="Aksi galeri"
              aria-label="Aksi galeri"
            >
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
               <span>Bulk actions</span>
            </button>
            {bulkMenuOpen && (
               <>
               <div className="fixed inset-0 z-40" onClick={() => setBulkMenuOpen?.(false)} aria-hidden="true" />
               <div role="menu" className="absolute right-0 top-8 z-50 w-56 rounded-lg border border-slate-700 bg-[#0e131f] p-1 shadow-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={toggleSelectAll} className="w-full px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-[#1a2336] rounded">Select all / clear</button>
                <button onClick={() => setSelectedAssetIds(new Set(filteredAssets.filter(isReadyForSubmit).map(a => a.id)))} className="w-full px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-[#1a2336] rounded">Select ready</button>
                <button onClick={() => handleBulkGenerateMetadata?.(filteredAssets.filter(a => selectedAssetIds.has(a.id)), metaCtx)} className="w-full px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-[#1a2336] rounded">Generate metadata bulk</button>
                 <button onClick={() => downloadCsvForAssets(selectedAssetIds?.size ? filteredAssets.filter(a => selectedAssetIds.has(a.id)) : filteredAssets, { showToast })} className="w-full px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-[#1a2336] rounded">Export CSV (selected, else all filtered)</button>
                 <button onClick={() => { const scope = selectedAssetIds?.size ? filteredAssets.filter(a => selectedAssetIds.has(a.id)) : filteredAssets; void handleBulkExport({ assets: scope, showToast }); }} className="w-full px-2.5 py-2 text-left text-[11px] text-slate-300 hover:bg-[#1a2336] rounded">Export ZIP (selected, else all filtered)</button>
                 <button onClick={() => { if (window.confirm('Hapus draft lama (30d)?')) deleteOldDrafts?.(30); }} className="w-full px-2.5 py-2 text-left text-[11px] text-red-400 hover:bg-[#1a2336] rounded">Hapus draft lama (30d)</button>
               </div>
               </>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-[#121824] border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="dim_desc">Size High</option>
              <option value="dim_asc">Size Low</option>
            </select>
          </div>

          <TaskButton
            activeGeneration={activeGeneration}
            activeMetadata={activeMetadata}
            batchQueue={batchQueue}
            cancelGeneration={cancelGeneration}
            genCtx={genCtx}
            generationProgress={generationProgress}
            metaStepLabel={metaStepLabel}
            metadataGenerating={metadataGenerating}
            metadataProgress={metadataProgress}
            metadataStep={metadataStep}
            setTasksOpen={setTasksOpen}
            tasksOpen={tasksOpen}
          />
        </div>
      </div>

      {/* Main Canvas & Gallery Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isAssetsLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="font-mono text-xs font-semibold">Loading assets from Library...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-14 h-14 rounded-2xl border border-dashed border-slate-700 bg-[#0e131f] flex items-center justify-center mb-4">
              <Box className="w-7 h-7 text-slate-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-200 mb-1">No Assets Found</h2>
            <p className="text-xs text-slate-500 font-mono max-w-sm text-center">
              Generate a new asset from the sidebar or clear your search filters.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Active Canvas / Generation Viewer */}
            {viewMode !== 'list' && heroAsset && (
              <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3 shadow-2xl relative">
                {/* Top Bar inside Canvas */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${heroAsset.status === 'FAILED' ? 'bg-red-500' : 'bg-emerald-500 animate-ping'}`} />
                    <span className={`text-[11px] font-medium ${heroAsset.status === 'FAILED' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {heroAsset.status === 'FAILED' ? 'Failed' : (heroAsset.status ? heroAsset.status[0].toUpperCase() + heroAsset.status.slice(1) : 'Generated')}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {heroAsset.resolution?.width || 1024} × {heroAsset.resolution?.height || 1024}
                    </span>
                    {heroAsset.outputFormat && (
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-1 rounded font-mono">{heroAsset.outputFormat}</span>
                    )}
                  </div>

                  {/* Canvas Quick Actions */}
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <button
                      onClick={(e) => toggleFavorite(heroAsset.id, e)}
                      className={`p-1 transition ${favorites.has(heroAsset.id) ? 'text-pink-400' : 'hover:text-pink-400'}`}
                      title={favorites.has(heroAsset.id) ? 'Remove favorite' : 'Add to favorites'}
                    >
                      <svg className="w-4 h-4" fill={favorites.has(heroAsset.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDownloadSingle?.(heroAsset, e, showToast)}
                      className="p-1 hover:text-white transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { onAssetSelect?.(heroAsset); setGridModalAsset?.(heroAsset); }}
                      className="p-1 hover:text-white transition"
                      title="Fullscreen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                        <line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* High Resolution Canvas */}
                <div className="studio-preview-container relative w-full h-[380px] rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center group">
                  <div className={`w-full h-full flex items-center justify-center ${heroAsset.background === 'transparent' ? 'bg-checkered' : ''}`}>
                    {heroAsset.isLoading || heroAsset.isUpscaling ? (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
                        <span className="font-mono text-[10px] text-slate-400">
                          {heroAsset.isUpscaling ? 'Upscaling...' : 'Synthesizing...'}
                        </span>
                      </div>
                    ) : heroAsset.status === 'FAILED' ? (
                      <div className="flex flex-col items-center justify-center text-red-400">
                        <AlertTriangle className="w-8 h-8 mb-2" />
                        <span className="font-mono text-xs font-bold uppercase">Generation Failed</span>
                      </div>
                    ) : (
                      <AssetPreviewImage
                        src={heroAsset.url}
                        alt={heroAsset.title || 'Studio asset hero view'}
                        className="w-full h-full object-contain transform group-hover:scale-[1.01] transition-transform duration-300"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      />
                    )}
                  </div>

                  {/* Canvas Overlay Controls (Prev/Next) */}
                  {filteredAssets.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevHero}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center border border-white/10 opacity-75 hover:opacity-100 transition"
                        title="Previous asset"
                        aria-label="Previous asset"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextHero}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white flex items-center justify-center border border-white/10 opacity-75 hover:opacity-100 transition"
                        title="Next asset"
                        aria-label="Next asset"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Bottom Floating Tag Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 flex items-center space-x-2 max-w-[70%]">
                    <span className="text-[10px] text-indigo-300 font-mono truncate">
                      {heroAsset.stockMetadata?.title || heroAsset.title || 'Untitled Asset'}
                    </span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded font-sans shrink-0">
                      {heroAsset.lineage?.generationModel || heroAsset.generationModel || 'Flux 1.1 Pro'}
                    </span>
                  </div>

                  {/* Zoom control (mockup tidak mendefinisikan; dipertahankan agar fitur zoom tidak hilang) */}
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-white">
                    <button onClick={() => setZoomLevel(z => Math.max(50, z - 25))} className="p-0.5 hover:text-blue-300 transition" title="Zoom Out">
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    <span>{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(200, z + 25))} className="p-0.5 hover:text-blue-300 transition" title="Zoom In">
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Bottom Filmstrip Sequence Preview Under Canvas */}
                <div className="flex items-center justify-center space-x-2 mt-3 pt-2 border-t border-slate-800/80">
                  <button onClick={() => scrollFilmstrip('left')} className="text-slate-500 hover:text-slate-300 p-1" title="Scroll filmstrip left">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div ref={filmstripScrollRef} className="flex space-x-2 overflow-x-auto py-1 px-1 scroll-smooth">
                    {filteredAssets.slice(0, 30).map((asset, idx) => {
                      const isActive = heroAsset?.id === asset.id;
                      return (
                        <button
                          type="button"
                           key={asset.id || idx}
                          onClick={() => onAssetSelect?.(asset)}
                           className={`w-12 h-12 rounded overflow-hidden shrink-0 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] ${
                            isActive
                              ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                              : 'border border-slate-800 opacity-70 hover:opacity-100'
                          }`}
                          title={asset.title || `Asset ${idx + 1}`}
                        >
                          <AssetPreviewImage src={asset.url} alt={asset.title || 'thumbnail'} className="w-full h-full object-cover" />
                         </button>
                      );
                    })}
                  </div>
                  <button onClick={() => scrollFilmstrip('right')} className="text-slate-500 hover:text-slate-300 p-1" title="Scroll filmstrip right">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Asset Library Gallery Section */}
            <div className="bg-[#0b0f18] border border-slate-800 rounded-xl p-3 space-y-3">
              {/* Gallery Section Header & Filter Pills */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect height="18" rx="2" width="18" x="3" y="3" /><circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span>Gallery</span>
                    <span className="font-normal text-slate-400 text-[11px] ml-1">{totalFiltered} assets</span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1 bg-[#121824] p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    {['all', 'photo', 'vector', 'illustration', 'icon', '3d'].map((type) => (
                      <button
                        key={type}
                        onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                        className={`px-2 py-0.5 rounded transition ${
                          typeFilter === type ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {typeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selection controls */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <select
                    value={filterStatus || 'all'}
                    onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="bg-[#121824] border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    title="Filter status aset"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="processing">Processing</option>
                    <option value="review">Needs Review</option>
                    <option value="ready">Ready</option>
                    <option value="exported">Exported</option>
                    <option value="submitted">Submitted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={() => setSelectedAssetIds(new Set(filteredAssets.filter(isReadyForSubmit).map(a => a.id)))}
                    className="px-2 py-0.5 rounded bg-[#121824] border border-slate-800 text-slate-300 hover:text-white transition"
                  >
                    Select Ready
                  </button>
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121824] border border-slate-800 text-slate-300 hover:text-white transition"
                    title={selectedAssetIds?.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect all' : 'Select all'}
                  >
                    {selectedAssetIds?.size === filteredAssets.length && filteredAssets.length > 0
                      ? <CheckSquare className="w-3 h-3 text-blue-400" />
                      : <Square className="w-3 h-3 text-slate-500" />}
                    <span>Select All</span>
                  </button>
                </div>
              </div>

              {/* Multi-selection action chips */}
              {selectedAssetIds?.size > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
                    {selectedAssetIds.size} selected
                  </span>
                  {filteredAssets.some(a => selectedAssetIds.has(a.id) && a.libraryAssetId) && (
                    <>
                      <button
                        onClick={() => onUpscale?.(Array.from(selectedAssetIds))}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#121824] border border-slate-800 text-slate-300 hover:text-white transition"
                        title="Send selected assets to Upscale"
                      >
                        Send to Upscale
                      </button>
                      <button
                        onClick={() => onVectorize?.(Array.from(selectedAssetIds))}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#121824] border border-slate-800 text-slate-300 hover:text-white transition"
                        title="Send selected assets to Vectorize"
                      >
                        Send to Vectorize
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleOpenRemoveBgBulk?.(filteredAssets.filter(a => selectedAssetIds.has(a.id)))}
                    className="px-2 py-0.5 rounded text-[10px] bg-[#121824] border border-slate-800 text-slate-300 hover:text-white transition"
                  >
                    Remove Background
                  </button>
                  <button
                    onClick={async () => { await handleBulkDelete?.(); }}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete selected assets"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* ── CARDS GRID VIEW ── */}
              {viewMode === 'grid' ? (
                <div className={`grid gap-2.5 ${
                  gridCols === 3 ? 'grid-cols-2 sm:grid-cols-3'
                  : gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  : gridCols === 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                }`}>
                  {paginatedAssets.map((asset) => {
                    const isSelected = selectedAssetIds?.has(asset.id);
                    const isHero = heroAsset?.id === asset.id;
                    const sm = asset.stockMetadata || {};
                    const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG.draft;
                    const isEligible = Boolean(asset.libraryAssetId);

                    const isSvg = asset.outputFormat === 'SVG' || String(asset.url || '').startsWith('data:image/svg+xml');
                    const fmt = isSvg ? 'SVG' : (asset.outputFormat === 'JPEG' ? 'JPG' : 'PNG');
                    const mp = displayedMegapixels(asset);
                    const mpLabel = mp != null ? (mp >= 10 ? `${Math.round(mp)} MP` : `${mp.toFixed(1)} MP`) : null;
                    const kb = getAssetFileSizeKB?.(asset);
                    const sizeLabel = formatFileSize ? formatFileSize(kb) : `${Math.round(kb || 0)} KB`;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => onAssetSelect?.(asset)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onAssetSelect?.(asset);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${sm.title || asset.title || 'Untitled Asset'} (${statusCfg.label})`}
                        className={`bg-[#121826] border rounded-lg overflow-hidden group transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] ${
                          isHero || isSelected ? 'border-blue-500' : 'border-slate-800 hover:border-blue-500/50'
                        }`}
                      >
                        <div
                          className="relative aspect-square overflow-hidden bg-slate-950"
                          style={{ aspectRatio: aspectRatioToCss(asset.aspectRatio || '1:1') }}
                        >
                          <div className={`w-full h-full flex items-center justify-center ${asset.background === 'transparent' ? 'bg-checkered' : ''}`}>
                            <AssetPreviewImage
                              src={asset.url}
                              alt={sm.title || asset.title || 'asset'}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                          </div>

                          {/* Format badge top-left */}
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-bold border border-white/10">{fmt}</span>
                            {mpLabel && (
                              <span className="px-1.5 py-0.5 rounded bg-black/70 text-white/80 font-mono text-[9px] border border-white/10">{mpLabel}</span>
                            )}
                          </div>

                          {/* Favorite & selection top-right */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                            <button
                              onClick={(e) => toggleFavorite(asset.id, e)}
                              className={`w-5 h-5 rounded flex items-center justify-center bg-black/50 transition-opacity ${
                                 favorites.has(asset.id) ? 'text-pink-400 opacity-100' : 'text-white/70 hover:text-pink-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                              }`}
                              title={favorites.has(asset.id) ? 'Remove favorite' : 'Favorite'}
                            >
                              <svg className="w-3 h-3" fill={favorites.has(asset.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelection?.(asset.id); }}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-500 text-white opacity-100'
                                   : 'bg-black/40 border-white/40 text-transparent group-hover:opacity-100 group-focus-within:opacity-100 opacity-0'
                              }`}
                              title={isSelected ? 'Deselect' : 'Select'}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-sm border border-white/60" />}
                            </button>
                          </div>

                          {/* Status pill bottom-left */}
                          <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border border-white/15 ${statusCfg.bg} ${statusCfg.color}`}>
                              <span className="w-1 h-1 rounded-full bg-current" />
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Card metadata shelf */}
                        <div className="p-1.5">
                          <p className="font-medium text-[10px] text-slate-200 truncate" title={sm.title || asset.title || 'Untitled'}>
                            {sm.title || asset.title || 'Untitled Asset'}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {asset.resolution?.width || 1024} × {asset.resolution?.height || 1024} • {fmt} • {sizeLabel}
                          </p>

                          {/* Quick staging (mockup: hover overlay kirim-ke) */}
                           <div className="grid grid-cols-2 gap-1 mt-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); onVectorize?.([asset.id]); }}
                              disabled={!isEligible || asset.isLoading || asset.isUpscaling}
                              className="py-0.5 rounded text-[9px] font-bold text-purple-300 bg-[#121824] border border-slate-800 hover:border-purple-500/50 transition disabled:opacity-30 disabled:pointer-events-none"
                              title="Send to Vectorize"
                            >
                              Vector
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUpscale?.([asset.id]); }}
                              disabled={!isEligible || asset.isLoading || asset.isUpscaling}
                              className="py-0.5 rounded text-[9px] font-bold text-cyan-300 bg-[#121824] border border-slate-800 hover:border-cyan-500/50 transition disabled:opacity-30 disabled:pointer-events-none"
                              title="Send to Upscale"
                            >
                              Upscale
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── LIST VIEW ── */
                <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800 overflow-hidden bg-[#121826] font-mono text-xs">
                  {paginatedAssets.map((asset) => {
                    const isSelected = selectedAssetIds?.has(asset.id);
                    const sm = asset.stockMetadata || {};
                    const statusCfg = STATUS_CONFIG[asset.status] || STATUS_CONFIG.draft;
                    const isEligible = Boolean(asset.libraryAssetId);

                    return (
                      <div
                        key={asset.id}
                        onClick={() => onAssetSelect?.(asset)}
                        className={`flex items-center gap-3 p-2.5 hover:bg-slate-900/40 transition cursor-pointer ${
                          heroAsset?.id === asset.id ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelection?.(asset.id); }}
                          className="text-slate-500 hover:text-slate-200"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                        </button>

                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                          <AssetPreviewImage src={asset.url} alt={sm.title || asset.title || 'thumb'} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0 font-sans">
                          <p className="text-xs font-semibold text-slate-200 truncate">{sm.title || asset.title || 'Untitled Asset'}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">{asset.prompt || 'No prompt recorded'}</p>
                        </div>

                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {asset.resolution?.width || 1024} × {asset.resolution?.height || 1024}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${statusCfg.bg} ${statusCfg.color} shrink-0`}>
                          {statusCfg.label}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadSingle?.(asset, e, showToast); }}
                            className="p-1.5 rounded hover:bg-slate-900 text-slate-500 hover:text-slate-200"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpscale?.([asset.id]); }}
                            disabled={!isEligible}
                            className="p-1.5 rounded hover:bg-slate-900 text-slate-500 hover:text-cyan-300 disabled:opacity-30"
                            title="Upscale"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Bar */}
              <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 border-t border-slate-800/60">
                <span>{selectedAssetIds?.size || 0} selected</span>

                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="w-6 h-6 rounded hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>

                  {(() => {
                    const total = Math.max(1, totalPages);
                    const cur = currentPage;
                    const pages = [...new Set([1, total, cur, cur - 1, cur + 1])]
                      .filter(p => p >= 1 && p <= total)
                      .sort((a, b) => a - b);
                    return pages.map((p, i) => (
                      <span key={p} className="flex items-center space-x-1">
                        {i > 0 && p - pages[i - 1] > 1 && <span>...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-6 h-6 rounded font-bold transition ${
                            p === cur ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ));
                  })()}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="w-6 h-6 rounded hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                    title="Next page"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span>{paginatedAssets.length} / page</span>
                  {visibleCount < totalFiltered && (
                    <button
                      onClick={() => setVisibleCount(n => n + PAGE_SIZE)}
                      className="px-2 py-0.5 rounded bg-[#121824] border border-slate-800 hover:text-white transition"
                    >
                      Show more ({totalFiltered - visibleCount} tersisa)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
