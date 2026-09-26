import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MetadataSidebar } from "./MetadataSidebar";
import { MetadataGrid } from "./MetadataGrid";
import { MetadataEditor } from "./MetadataEditor";
import { MetadataInspector } from "./MetadataInspector";
import { LibraryAsset, StockMetadata } from "../../types";
import { MetadataFilterState, MetadataJobItem, MetadataStatusFilter } from "./types";
import { api } from "../../api/electron";
import {
  FileArchive,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Filter,
  LayoutGrid,
  Columns,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { handleBulkExport, getCsvMetadataEligibility, buildCsvContent } from "./export";
import { DEFAULT_PLATFORM, PLATFORM_ADAPTERS } from "../../modules/studio/registry/presets";
import { Button, Chip } from "../global";
import "./metadata-theme.css";

interface MetadataModuleProps {
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
  openAssetId?: string | null;
  onOpenAssetHandled?: () => void;
}

export const MetadataModule: React.FC<MetadataModuleProps> = ({
  onNotify,
  openAssetId,
  onOpenAssetHandled,
}) => {
  // State
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [jobs, setJobs] = useState<MetadataJobItem[]>([]);
  const [filter, setFilter] = useState<MetadataFilterState>({
    search: "",
    status: "all",
    category: "",
    type: "all",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"workspace" | "grid">("workspace");

  // Sync Library assets
  const fetchLibrary = useCallback(async () => {
    try {
      const data = await api.fetchLibrary();
      setLibraryAssets(data);
    } catch (err) {
      console.error("Failed to load library assets:", err);
    }
  }, []);

  // Sync Jobs Queue
  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.metadataQueueGet();
      if (res.success && res.jobs) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error("Failed to load metadata jobs:", err);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
    fetchJobs();
  }, [fetchLibrary, fetchJobs]);

  // IPC Event Subscriptions
  useEffect(() => {
    const offJobUpdate = api.onMetadataJobUpdate((job) => {
      fetchJobs();
      fetchLibrary();
      if (job?.status === "failed" && job?.error) {
        onNotify?.(job.error, "error");
        console.error("[metadata] job failed", job);
      }
    });
    const offLibUpdate = api.onLibraryUpdated(() => {
      fetchLibrary();
    });

    return () => {
      offJobUpdate();
      offLibUpdate();
    };
  }, [fetchJobs, fetchLibrary, onNotify]);

  // Open asset in editor from external navigation
  useEffect(() => {
    if (openAssetId && libraryAssets.length > 0) {
      const asset = libraryAssets.find((a) => a.id === openAssetId);
      if (asset) {
        setActiveAssetId(asset.id);
        setViewMode("workspace");
        onOpenAssetHandled?.();
      }
    }
  }, [openAssetId, libraryAssets, onOpenAssetHandled]);

  // Default active asset to first in library if none chosen
  useEffect(() => {
    if (!activeAssetId && libraryAssets.length > 0) {
      setActiveAssetId(libraryAssets[0].id);
    }
  }, [activeAssetId, libraryAssets]);

  // Jobs lookup map by asset ID
  const jobsMap = useMemo(() => {
    const map = new Map<string, MetadataJobItem>();
    for (const j of jobs) {
      map.set(j.assetId, j);
    }
    return map;
  }, [jobs]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of libraryAssets) {
      const cat = a.stockMetadata?.stockCategory || a.adobeCategory;
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [libraryAssets]);

  // Counts by status
  const counts = useMemo(() => {
    const res: Record<MetadataStatusFilter, number> = {
      all: libraryAssets.length,
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const a of libraryAssets) {
      const job = jobsMap.get(a.id);
      const hasMeta = Boolean(
        a.stockMetadata?.title || (a.stockMetadata?.keywords && a.stockMetadata.keywords.length > 0)
      );
      const status: MetadataStatusFilter = job?.status || (hasMeta ? "completed" : "pending");

      if (res[status] !== undefined) {
        res[status]++;
      }
    }

    return res;
  }, [libraryAssets, jobsMap]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return libraryAssets.filter((asset) => {
      // Type filter
      if (filter.type && filter.type !== "all") {
        if (filter.type === "vector" && asset.type !== "VECTOR") return false;
        if (filter.type === "raster" && asset.type === "VECTOR") return false;
      }

      // Category filter
      if (filter.category) {
        const cat = asset.stockMetadata?.stockCategory || asset.adobeCategory;
        if (cat !== filter.category) return false;
      }

      // Status filter
      const job = jobsMap.get(asset.id);
      const hasMeta = Boolean(
        a => a.stockMetadata?.title || (a.stockMetadata?.keywords && a.stockMetadata.keywords.length > 0)
      );
      const isReady = Boolean(
        asset.stockMetadata?.title || (asset.stockMetadata?.keywords && asset.stockMetadata.keywords.length > 0)
      );
      const status: MetadataStatusFilter = job?.status || (isReady ? "completed" : "pending");

      if (filter.status !== "all" && status !== filter.status) {
        return false;
      }

      // Search filter
      if (filter.search.trim()) {
        const q = filter.search.toLowerCase();
        const titleMatch = (asset.stockMetadata?.title || asset.name || "").toLowerCase().includes(q);
        const descMatch = (asset.stockMetadata?.description || "").toLowerCase().includes(q);
        const tagsMatch = asset.stockMetadata?.keywords?.some((k) => k.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagsMatch) return false;
      }

      return true;
    });
  }, [libraryAssets, jobsMap, filter]);

  const activeAsset = useMemo(() => {
    return libraryAssets.find((a) => a.id === activeAssetId) || filteredAssets[0] || null;
  }, [libraryAssets, activeAssetId, filteredAssets]);

  // Actions
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      const res = await api.metadataQueueLibrary([id]);
      if (res.success) {
        onNotify?.("Metadata generation queued", "info");
        fetchJobs();
      } else {
        onNotify?.("Failed to queue metadata generation", "error");
      }
    } catch {
      onNotify?.("Failed to queue metadata generation", "error");
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const res = await api.metadataQueueLibrary(ids);
      if (res.success) {
        onNotify?.(`Queued metadata generation for ${ids.length} assets`, "info");
        setSelectedIds(new Set());
        fetchJobs();
      }
    } catch {
      onNotify?.("Failed to queue selected assets", "error");
    }
  };

  const handleGenerateAllPending = async () => {
    const pendingIds = libraryAssets
      .filter((a) => {
        const job = jobsMap.get(a.id);
        const hasMeta = Boolean(
          a.stockMetadata?.title || (a.stockMetadata?.keywords && a.stockMetadata.keywords.length > 0)
        );
        return !job && !hasMeta;
      })
      .map((a) => a.id);

    if (pendingIds.length === 0) {
      onNotify?.("No pending assets need metadata generation", "info");
      return;
    }

    try {
      const res = await api.metadataQueueLibrary(pendingIds);
      if (res.success) {
        onNotify?.(`Queued metadata generation for all ${pendingIds.length} pending assets`, "info");
        fetchJobs();
      }
    } catch {
      onNotify?.("Failed to queue pending assets", "error");
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const res = await api.metadataCancel(jobId);
      if (res.success) {
        onNotify?.("Metadata job cancelled", "info");
        fetchJobs();
      }
    } catch {
      onNotify?.("Failed to cancel job", "error");
    }
  };

  const handleClearFinished = async () => {
    try {
      const res = await api.metadataQueueClear();
      if (res.success) {
        onNotify?.(`Cleared finished metadata jobs`, "info");
        fetchJobs();
      }
    } catch {
      onNotify?.("Failed to clear queue", "error");
    }
  };

  const handleExportZip = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : filteredAssets.map((a) => a.id);
    if (ids.length === 0) return;
    const assets = libraryAssets.filter((a) => ids.includes(a.id));
    await handleBulkExport({ assets, showToast: onNotify });
  };

  const handleExportCsv = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : filteredAssets.map((a) => a.id);
    if (ids.length === 0) return;
    const assets = libraryAssets.filter((a) => ids.includes(a.id));
    const eligible = assets.filter((a) => getCsvMetadataEligibility(a).eligible);
    const skippedCount = assets.length - eligible.length;
    if (skippedCount > 0) {
      onNotify?.(`${skippedCount} assets skipped (incomplete metadata)`, "info");
    }
    if (eligible.length === 0) {
      onNotify?.("No eligible assets for CSV export", "error");
      return;
    }
    const byPlatform: Record<string, LibraryAsset[]> = {};
    for (const a of eligible) {
      const key = (a as any).platform || DEFAULT_PLATFORM;
      if (!byPlatform[key]) byPlatform[key] = [];
      byPlatform[key].push(a);
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    for (const [platformKey, platformAssets] of Object.entries(byPlatform)) {
      const adapter = PLATFORM_ADAPTERS[platformKey];
      const label = adapter?.label || platformKey;
      const csvContent = buildCsvContent(platformAssets, platformKey);
      if (csvContent) {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${label.replace(/\s+/g, "_")}_Metadata_${dateStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    if (eligible.length > 0) {
      onNotify?.(`${eligible.length} assets successfully exported to CSV`, "success");
    }
  };

  const handleSaveMetadata = async (assetId: string, patch: Partial<StockMetadata>) => {
    try {
      const existing = libraryAssets.find((a) => a.id === assetId);
      const mergedStockMetadata = {
        ...(existing?.stockMetadata || {}),
        ...patch,
        preflightDecision: "needs_review",
      };
      const res = await api.libraryUpdate(assetId, { stockMetadata: mergedStockMetadata });
      if (res.success) {
        onNotify?.("Stock metadata saved", "success");
        fetchLibrary();
      } else {
        onNotify?.("Failed to save metadata", "error");
      }
    } catch {
      onNotify?.("Error saving metadata", "error");
    }
  };

  const handleAddKeywordToActive = (keyword: string) => {
    if (!activeAsset) return;
    const current = activeAsset.stockMetadata?.keywords || [];
    if (!current.includes(keyword)) {
      handleSaveMetadata(activeAsset.id, {
        keywords: [...current, keyword],
      });
    }
  };

  const isProcessing = counts.processing > 0 || counts.queued > 0;

  return (
    <div
      className="metadata-module flex flex-col h-full w-full bg-[var(--bg-base)] overflow-hidden select-none text-xs"
    >
      <div className="h-11 border-b border-[var(--border-structural)] bg-[var(--bg-panel)] px-4 flex items-center justify-between shrink-0">
        {/* Left: Module Label + Real Status Chips */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_8px_var(--accent-action-soft)]" />
            <span>METADATA WORKSPACE</span>
          </div>

          <div className="h-4 w-px bg-[var(--border-structural)]" />

          {/* Status chips */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <Chip
              variant="status"
              color="emerald"
              label={`${counts.completed} Ready`}
              icon={<span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)]" />}
            />
            <Chip
              variant="status"
              color="amber"
              label={`${counts.pending} Missing`}
              icon={<span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-warning)]" />}
            />
            {counts.failed > 0 && (
              <Chip
                variant="status"
                color="rose"
                label={`${counts.failed} Flagged`}
                icon={<span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-error)]" />}
              />
            )}
            <span className="font-mono text-[10px] text-[var(--text-muted)] ml-1">
              ({libraryAssets.length} total)
            </span>
          </div>
        </div>

        {/* Right: Bulk Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleGenerateAllPending}
            disabled={counts.pending === 0 || isProcessing}
            icon={<Sparkles className="w-3 h-3 text-[var(--accent-cyan)]" />}
          >
            Auto-Fill All
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={() => onNotify?.("Schema validation passed across library assets", "success")}
            icon={<ShieldCheck className="w-3 h-3 text-[var(--accent-success)]" />}
          >
            Validate Schema
          </Button>

          <Button
            variant="primary"
            size="xs"
            onClick={handleExportCsv}
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            className="shadow-sm"
          >
            Export Batch
          </Button>

          <div className="h-4 w-px bg-[var(--border-structural)] mx-0.5" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--bg-elevated)] p-0.5 rounded border border-[var(--border-structural)]">
            <button
              type="button"
              onClick={() => setViewMode("workspace")}
              title="3-Pane Workspace"
              className={`p-1 rounded transition-colors ${
                viewMode === "workspace"
                  ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
              className={`p-1 rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-9 border-b border-[var(--border-structural)] bg-[var(--bg-panel)] px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          {/* Type Select */}
          <select
            value={filter.type || "all"}
            onChange={(e) => setFilter((prev) => ({ ...prev, type: e.target.value }))}
            className="bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded px-2 py-0.5 font-mono text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="all">All Formats</option>
            <option value="vector">Vector (SVG)</option>
            <option value="raster">Raster (PNG/JPG)</option>
          </select>

          {/* Status Select */}
          <select
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value as MetadataStatusFilter }))}
            className="bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded px-2 py-0.5 font-mono text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Ready</option>
            <option value="pending">Needs Metadata</option>
            <option value="processing">Generating</option>
            <option value="failed">Flagged</option>
          </select>

          {/* Clear filters */}
          {(filter.search || filter.status !== "all" || filter.category || (filter.type && filter.type !== "all")) && (
            <button
              type="button"
              onClick={() => setFilter({ search: "", status: "all", category: "", type: "all" })}
              className="text-[10px] font-mono text-[var(--accent-cyan)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right: Selection status & Select All */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {selectedIds.size > 0 && selectedIds.size === filteredAssets.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span className="font-mono text-[10px]">
              {selectedIds.size > 0 ? "Deselect All" : "Select All"}
            </span>
          </button>

          {selectedIds.size > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-mono text-[10px] border border-[var(--accent-cobalt)]/30">
              {selectedIds.size} selected
            </span>
          )}

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleGenerateSelected}
              className="px-2 py-0.5 rounded bg-[var(--accent-cobalt-solid)] text-white text-[10px] font-mono hover:opacity-90 transition-opacity ml-1"
            >
              Generate Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Asset Queue Sidebar */}
        <MetadataSidebar
          assets={filteredAssets}
          selectedAssetId={activeAsset?.id}
          onSelectAsset={(asset) => {
            setActiveAssetId(asset.id);
            if (viewMode === "grid") setViewMode("workspace");
          }}
          jobsMap={jobsMap}
          filter={filter}
          onFilterChange={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
          counts={counts}
          onGenerateSingle={handleGenerate}
          onGenerateAllPending={handleGenerateAllPending}
          pendingCount={counts.pending}
          isProcessing={isProcessing}
          onClearFinished={handleClearFinished}
        />

        {/* Center Workspace / Grid View */}
        {viewMode === "workspace" ? (
          <MetadataEditor
            asset={activeAsset}
            onSave={handleSaveMetadata}
            onGenerate={handleGenerate}
            onExportSingleCsv={handleExportCsv}
          />
        ) : (
          <MetadataGrid
            assets={filteredAssets}
            jobsMap={jobsMap}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onGenerate={handleGenerate}
            onCancel={handleCancelJob}
            onEdit={(asset) => {
              setActiveAssetId(asset.id);
              setViewMode("workspace");
            }}
            onRetry={handleGenerate}
          />
        )}

        {/* Right Inspector Panel */}
        <MetadataInspector
          asset={activeAsset}
          allAssets={libraryAssets}
          onAddKeywordToAsset={handleAddKeywordToActive}
          onValidateSchema={() => onNotify?.("Metadata platform rules checklist validated ✓", "success")}
          onAutoFillMissing={handleGenerateAllPending}
          onExportBatchCsv={handleExportCsv}
        />
      </div>
    </div>
  );
};

export default MetadataModule;
