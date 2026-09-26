import React, { useState, useCallback, useMemo, useRef } from 'react';
import GalleryGrid from './GalleryGrid';
import GallerySidebar from './screen/GallerySidebar';
import GalleryInspectorPanel from './screen/GalleryInspectorPanel';
import type { LibraryAsset } from '../../types';
import type { SortOption, ViewMode } from './types';
import { api, filePayload } from '../../api/electron';
import { assetUrl } from '../../utils/assetUrl';
import './gallery-theme.css';

export interface GalleryModuleProps {
  assets: LibraryAsset[];
  onDeleteAsset: (id: string) => void;
  onDeleteAssets: (ids: string[]) => void;
  onRenameAsset: (id: string, name: string) => void;
  onAnimate?: (id: string) => void;
  /** Hand off asset IDs to the Upscale module (navigate + stage). */
  onSendToUpscale: (assetIds: string[]) => void;
  /** Hand off asset IDs to the Vectorize module (navigate + stage). */
  onSendToVectorize: (assetIds: string[]) => void;
  onCreateMetadata: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
  storage?: { used: number; total: number; free: number; percent: number } | null;
  onEditMetadata?: (assetId: string) => void;
}

function parseFileSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const num = parseFloat(sizeStr);
  if (Number.isNaN(num)) return 0;
  if (sizeStr.includes('GB')) return num * 1024 * 1024 * 1024;
  if (sizeStr.includes('MB')) return num * 1024 * 1024;
  if (sizeStr.includes('KB')) return num * 1024;
  return num;
}

export default function GalleryModule({
  assets,
  onDeleteAsset,
  onDeleteAssets,
  onRenameAsset,
  onAnimate,
  onSendToUpscale,
  onSendToVectorize,
  onCreateMetadata,
  onNotify,
  storage,
  onEditMetadata,
}: GalleryModuleProps) {
  // Multi-selection & Modal
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);

  // Favorite overrides (optimistic local state)
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  // Filter States
  const [activeCollection, setActiveCollection] = useState<string>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [timeline, setTimeline] = useState<string>('all');
  const [resolutionTier, setResolutionTier] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Hidden file input fallback
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Last synced timestamp
  const lastSynced = useMemo(() => {
    return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }, [assets.length]);

  // Merge favorites onto assets
  const assetsWithFavorites = useMemo(() => {
    return assets.map((a) => ({
      ...a,
      favorite: favoriteOverrides[a.id] ?? a.favorite ?? false,
    }));
  }, [assets, favoriteOverrides]);

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    let result = assetsWithFavorites;

    // Collection Filter
    if (activeCollection === 'images') {
      result = result.filter((a) => a.type === 'IMAGE');
    } else if (activeCollection === 'vectors') {
      result = result.filter((a) => a.type === 'VECTOR');
    } else if (activeCollection === 'upscaled') {
      result = result.filter(
        (a) =>
          a.status === 'Upscaled' ||
          a.sourceModule === 'UPSCALE' ||
          (a.resolution && (a.resolution.includes('4K') || a.resolution.includes('3840')))
      );
    } else if (activeCollection === 'animations') {
      result = result.filter((a) => a.type === 'ANIMATION');
    } else if (activeCollection === 'videos') {
      result = result.filter((a) => a.type === 'VIDEO');
    } else if (activeCollection === 'audio') {
      result = result.filter((a) => a.type === 'AUDIO');
    } else if (activeCollection === 'html') {
      result = result.filter((a) => a.type === 'HTML');
    } else if (activeCollection === 'downloads') {
      result = result.filter(
        (a) => a.sourceModule === 'IMPORT' || a.folder?.includes('download') || a.folder?.includes('import')
      );
    } else if (activeCollection === 'recents') {
      const now = Date.now();
      result = result.filter((a) => {
        if (!a.createdAt) return false;
        const diff = now - new Date(a.createdAt).getTime();
        return !Number.isNaN(diff) && diff < 7 * 24 * 60 * 60 * 1000;
      });
    } else if (activeCollection === 'favorites') {
      result = result.filter((a) => Boolean(a.favorite));
    }

    // Pipeline Asset Type Filter
    if (selectedTypes.size > 0) {
      result = result.filter((a) => selectedTypes.has(a.type));
    }

    // Timeline Filter
    if (timeline !== 'all') {
      const now = Date.now();
      result = result.filter((a) => {
        if (!a.createdAt) return false;
        const diff = now - new Date(a.createdAt).getTime();
        if (Number.isNaN(diff)) return true;
        if (timeline === 'today') return diff < 24 * 60 * 60 * 1000;
        if (timeline === '7d') return diff < 7 * 24 * 60 * 60 * 1000;
        if (timeline === '30d') return diff < 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    // Resolution Tier Filter
    if (resolutionTier !== 'all') {
      result = result.filter((a) => {
        const isUpscaled =
          a.status === 'Upscaled' ||
          a.sourceModule === 'UPSCALE' ||
          (a.resolution && (a.resolution.includes('4K') || a.resolution.includes('3840')));
        if (resolutionTier === '1k') return !isUpscaled && a.type !== 'VECTOR';
        if (resolutionTier === '4k') return isUpscaled;
        if (resolutionTier === 'vector') return a.type === 'VECTOR';
        return true;
      });
    }

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        [
          a.name,
          a.prompt,
          a.adobeCategory,
          a.subcategory,
          a.id,
          a.type,
          a.resolution,
          ...(a.tags || []),
          a.stockMetadata?.title,
          a.stockMetadata?.description,
          ...(a.stockMetadata?.keywords || []),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '');
      if (sort === 'size') return parseFileSizeToBytes(b.fileSize) - parseFileSizeToBytes(a.fileSize);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [assetsWithFavorites, activeCollection, selectedTypes, timeline, resolutionTier, search, sort]);

  const detailAsset = useMemo(() => {
    return assetsWithFavorites.find((a) => a.id === detailAssetId) || null;
  }, [assetsWithFavorites, detailAssetId]);

  const handleToggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setActiveCollection('all');
    setSelectedTypes(new Set());
    setTimeline('all');
    setResolutionTier('all');
    setSearch('');
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allIds = filteredAssets.map((a) => a.id);
      const isAll = allIds.length > 0 && allIds.every((id) => prev.has(id));
      return isAll ? new Set<string>() : new Set(allIds);
    });
  }, [filteredAssets]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleOpenDetail = useCallback((id: string) => {
    setDetailAssetId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailAssetId(null);
  }, []);

  const handleImportClick = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.api?.pickFiles) {
        const pickRes = await api.pickFiles();
        if (pickRes.canceled || !pickRes.files || pickRes.files.length === 0) {
          return;
        }
        onNotify?.(`Mengunggah ${pickRes.files.length} file...`, 'info');
        const uploadRes = await api.importUpload(pickRes.files);
        if (uploadRes.success && uploadRes.items) {
          const confirmRes = await api.importConfirm({ pending: uploadRes.items });
          if (confirmRes.success) {
            onNotify?.(`${confirmRes.imported ?? pickRes.files.length} asset berhasil di-import`, 'success');
            api.rescanLibrary?.();
          } else {
            onNotify?.(confirmRes.detail || 'Gagal menyimpan asset yang di-import', 'error');
          }
        } else {
          onNotify?.(uploadRes.errors?.join(', ') || 'Gagal memproses file import', 'error');
        }
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Gagal melakukan import', 'error');
    }
  }, [onNotify]);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      try {
        const list = Array.from(files);
        const payload = filePayload(list);
        if (payload.length > 0) {
          onNotify?.(`Mengunggah ${payload.length} file...`, 'info');
          const uploadRes = await api.importUpload(payload);
          if (uploadRes.success && uploadRes.items) {
            const confirmRes = await api.importConfirm({ pending: uploadRes.items });
            if (confirmRes.success) {
              onNotify?.(`${confirmRes.imported ?? payload.length} asset berhasil di-import`, 'success');
              api.rescanLibrary?.();
            }
          }
        }
      } catch (err: any) {
        onNotify?.(err.message || 'Gagal import file', 'error');
      } finally {
        e.target.value = '';
      }
    },
    [onNotify]
  );

  const handleSendToUpscale = useCallback(
    (assetId: string) => {
      // Navigate to Upscale and let its handoff effect stage + surface the
      // asset, so the user actually lands in the module (Studio parity).
      onSendToUpscale([assetId]);
    },
    [onSendToUpscale]
  );

  const handleSendToVectorize = useCallback(
    (assetId: string) => {
      // Navigate to Vectorize and let its handoff effect stage + surface the
      // asset, so the user actually lands in the module.
      onSendToVectorize([assetId]);
    },
    [onSendToVectorize]
  );

  const handleSendToAnimation = useCallback(
    (assetId: string) => {
      if (onAnimate) {
        onAnimate(assetId);
        onNotify?.('Asset dibuka di Animation Module', 'info');
      }
    },
    [onAnimate, onNotify]
  );

  const handleRescanLibrary = useCallback(async () => {
    try {
      const res = await api.rescanLibrary();
      if (res.success) {
        onNotify?.(`Library berhasil dipindai ulang (${res.count ?? assets.length} asset)`, 'success');
      }
    } catch (err: any) {
      onNotify?.(err.message || 'Gagal memindai ulang library', 'error');
    }
  }, [assets.length, onNotify]);

  const handleExportAsset = useCallback(
    async (asset: LibraryAsset) => {
      try {
        const url = asset.url || asset.thumbnailUrl;
        if (!url) {
          onNotify?.('Tidak ada URL file untuk di-export', 'error');
          return;
        }
        const result = await api.exportAsset({ url, name: asset.name });
        if (result.success) {
          onNotify?.(`${asset.name} berhasil di-export`, 'success');
        } else if (!result.canceled) {
          onNotify?.(result.detail || 'Gagal export file', 'error');
        }
      } catch (err: any) {
        onNotify?.(err.message || 'Gagal export asset', 'error');
      }
    },
    [onNotify]
  );

  const handleExportZip = useCallback(
    async (ids: string[]) => {
      const items = assetsWithFavorites
        .filter((a) => ids.includes(a.id))
        .map((a) => ({ url: a.url || a.thumbnailUrl || '', name: a.name }))
        .filter((item) => item.url);

      if (items.length === 0) {
        onNotify?.('Tidak ada asset valid untuk di-export', 'error');
        return;
      }

      try {
        const result = await api.exportZip({ items });
        if (result.success) {
          onNotify?.(`${items.length} asset berhasil di-export sebagai ZIP`, 'success');
          setSelectedIds(new Set());
        } else if (!result.canceled) {
          onNotify?.(result.detail || 'Gagal export ZIP', 'error');
        }
      } catch (err: any) {
        onNotify?.(err.message || 'Gagal export ZIP', 'error');
      }
    },
    [assetsWithFavorites, onNotify]
  );

  const handleShowInFolder = useCallback(
    async (asset: LibraryAsset) => {
      try {
        const url = asset.url || asset.thumbnailUrl;
        if (!url) {
          onNotify?.('Tidak ada URL untuk dibuka', 'error');
          return;
        }
        const result = await api.exportShowInFolder({ url });
        if (result.success) {
          onNotify?.(`Folder dibuka: ${result.path}`, 'info');
        } else {
          onNotify?.(result.detail || 'Gagal membuka folder', 'error');
        }
      } catch (err: any) {
        onNotify?.(err.message || 'Gagal membuka folder', 'error');
      }
    },
    [onNotify]
  );

  const handleToggleFavorite = useCallback(
    async (asset: LibraryAsset) => {
      const current = favoriteOverrides[asset.id] ?? asset.favorite ?? false;
      const next = !current;

      setFavoriteOverrides((prev) => ({ ...prev, [asset.id]: next }));

      try {
        await api.libraryUpdate(asset.id, { favorite: next });
        onNotify?.(next ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit', 'info');
      } catch (err: any) {
        setFavoriteOverrides((prev) => ({ ...prev, [asset.id]: current }));
        onNotify?.(err.message || 'Gagal update favorit', 'error');
      }
    },
    [favoriteOverrides, onNotify]
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      onRenameAsset(id, name);
    },
    [onRenameAsset]
  );

  const handleDelete = useCallback(
    (id: string) => {
      onDeleteAsset(id);
      setFavoriteOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (detailAssetId === id) setDetailAssetId(null);
    },
    [onDeleteAsset, detailAssetId]
  );

  const handleDeleteSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onDeleteAssets(ids);
    setFavoriteOverrides((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    if (detailAssetId && ids.includes(detailAssetId)) setDetailAssetId(null);
    setSelectedIds(new Set());
  }, [selectedIds, onDeleteAssets, detailAssetId]);

  return (
    <div className="gallery-module flex h-full bg-[var(--bg-base)] text-[var(--text-secondary)] overflow-hidden font-sans text-xs">
      {/* Hidden File Input for fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.svg,.eps,.json,.lottie,.zip"
      />

      {/* Left Navigation & Pipeline Filter Sidebar */}
      <GallerySidebar
        onCreateMetadata={onCreateMetadata}
        activeCollection={activeCollection}
        setActiveCollection={setActiveCollection}
        selectedTypes={selectedTypes}
        onToggleType={handleToggleType}
        timeline={timeline}
        setTimeline={setTimeline}
        resolutionTier={resolutionTier}
        setResolutionTier={setResolutionTier}
        onResetFilters={handleClearAllFilters}
        storage={storage}
        selectedCount={selectedIds.size}
        totalCount={assets.length}
        assets={assetsWithFavorites}
        onRescanLibrary={handleRescanLibrary}
      />

      {/* Center Content Workspace & Asset Matrix */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <GalleryGrid
          assets={filteredAssets}
          totalUnfilteredCount={assets.length}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onDeleteSelected={handleDeleteSelected}
          onDeleteAsset={handleDelete}
          onOpen={handleOpenDetail}
          onDownload={handleExportAsset}
          onReveal={handleShowInFolder}
          onToggleFavorite={handleToggleFavorite}
          onExportZip={handleExportZip}
          onAnimate={handleSendToAnimation}
          onVectorize={handleSendToVectorize}
          onUpscale={handleSendToUpscale}
          onEditMetadata={onEditMetadata}
          onImportClick={handleImportClick}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeCollection={activeCollection}
          onClearCollection={() => setActiveCollection('all')}
          selectedTypes={selectedTypes}
          onRemoveType={(t) => handleToggleType(t)}
          timeline={timeline}
          onClearTimeline={() => setTimeline('all')}
          resolutionTier={resolutionTier}
          onClearResolutionTier={() => setResolutionTier('all')}
          onClearAllFilters={handleClearAllFilters}
          lastSynced={lastSynced}
        />
      </div>

      {/* Right Inspector Panel (docked, sesuai mockup) */}
      <GalleryInspectorPanel
        asset={detailAsset || null}
        resolvedUrl={detailAsset ? assetUrl(detailAsset.url || detailAsset.thumbnailUrl) : undefined}
        favorite={detailAsset ? (favoriteOverrides[detailAsset.id] ?? detailAsset.favorite ?? false) : false}
        onClose={handleCloseDetail}
        onDownload={handleExportAsset}
        onReveal={handleShowInFolder}
        onToggleFavorite={handleToggleFavorite}
        onRename={handleRename}
        onDelete={handleDelete}
        onAnimate={detailAsset?.type === 'VECTOR' ? handleSendToAnimation : undefined}
        onVectorize={handleSendToVectorize}
        onUpscale={handleSendToUpscale}
        onEditMetadata={onEditMetadata}
      />
    </div>
  );
}
