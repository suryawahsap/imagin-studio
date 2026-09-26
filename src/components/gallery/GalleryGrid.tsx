import React, { useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowDownUp,
  LayoutGrid,
  Grid3X3,
  List,
  Upload,
  Download,
  Trash2,
  X,
  Plus,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Inbox,
} from 'lucide-react';
import type { LibraryAsset } from '../../types';
import type { ViewMode, SortOption } from './types';
import { assetUrl } from '../../utils/assetUrl';
import GalleryCard from './GalleryCard';
import GalleryListView from './GalleryListView';
import Button from '../global/Button';
import Chip from '../global/Chip';

export interface GalleryGridProps {
  assets: LibraryAsset[];
  totalUnfilteredCount: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onDeleteAsset: (id: string) => void;
  onOpen: (id: string) => void;
  onDownload: (asset: LibraryAsset) => void;
  onReveal: (asset: LibraryAsset) => void;
  onToggleFavorite: (asset: LibraryAsset) => void;
  onExportZip: (ids: string[]) => void;
  onAnimate?: (assetId: string) => void;
  onVectorize?: (assetId: string) => void;
  onUpscale?: (assetId: string) => void;
  onEditMetadata?: (assetId: string) => void;
  onImportClick?: () => void;
  search: string;
  onSearch: (value: string) => void;
  sort: SortOption;
  onSort: (value: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeCollection: string;
  onClearCollection: () => void;
  selectedTypes: Set<string>;
  onRemoveType: (type: string) => void;
  timeline: string;
  onClearTimeline: () => void;
  resolutionTier: string;
  onClearResolutionTier: () => void;
  onClearAllFilters: () => void;
  lastSynced?: string | null;
}

export default function GalleryGrid({
  assets,
  totalUnfilteredCount,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onDeleteAsset,
  onOpen,
  onDownload,
  onReveal,
  onToggleFavorite,
  onExportZip,
  onAnimate,
  onVectorize,
  onUpscale,
  onEditMetadata,
  onImportClick,
  search,
  onSearch,
  sort,
  onSort,
  viewMode,
  onViewModeChange,
  activeCollection,
  onClearCollection,
  selectedTypes,
  onRemoveType,
  timeline,
  onClearTimeline,
  resolutionTier,
  onClearResolutionTier,
  onClearAllFilters,
  lastSynced,
}: GalleryGridProps) {
  const allSelected = assets.length > 0 && assets.every((a) => selectedIds.has(a.id));
  const hasSelection = selectedIds.size > 0;

  const hasActiveFilters =
    activeCollection !== 'all' ||
    selectedTypes.size > 0 ||
    timeline !== 'all' ||
    resolutionTier !== 'all' ||
    search.trim().length > 0;

  // Collection name mapper for chips
  const collectionNames: Record<string, string> = {
    images: 'Images',
    vectors: 'Vectors',
    upscaled: '4K Upscaled',
    animations: 'Animations',
    videos: 'Videos',
    audio: 'Audio',
    html: 'HTML5',
    downloads: 'Downloads',
    recents: 'Recent Renders',
    favorites: 'Favorites',
  };

  const timelineNames: Record<string, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    today: 'Today',
  };

  const resolutionNames: Record<string, string> = {
    '1k': '1K Native',
    '4k': '4K Super',
    vector: 'Vector Inf',
  };

  return (
    <section className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-hidden h-full" data-purpose="gallery-catalog">
      <div className="h-14 border-b border-[var(--border-structural)] px-4 flex items-center justify-between gap-3 shrink-0 bg-[var(--bg-panel)] z-10">
        {/* Left: Gallery Workspace title & selection bar */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              GALLERY WORKSPACE
            </span>
            {lastSynced && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-structural)] hidden sm:inline-block">
                Last synced: {lastSynced}
              </span>
            )}
          </div>

          {/* Batch Selection Controls */}
          {assets.length > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-[var(--border-structural)]">
              {hasSelection && (
                <span className="text-xs font-mono font-bold text-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/10 px-2 py-0.5 rounded border border-[var(--accent-cobalt)]/30">
                  {selectedIds.size} Selected
                </span>
              )}

              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline px-1.5 py-0.5 cursor-pointer"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                onClick={onClearSelection}
                disabled={!hasSelection}
                className={`text-xs px-1.5 py-0.5 transition-colors ${
                  hasSelection
                    ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline cursor-pointer'
                    : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                }`}
              >
                Clear
              </button>

              <span title={!hasSelection ? 'Pilih aset dulu' : undefined} className="inline-flex">
                <Button
                  variant="secondary"
                  size="xs"
                  icon={<Download className="w-3 h-3" />}
                  disabled={!hasSelection}
                  title={hasSelection ? `Download ${selectedIds.size} assets as ZIP` : 'Pilih aset dulu'}
                  onClick={() => onExportZip(Array.from(selectedIds))}
                >
                  {hasSelection ? `Download ZIP · ${selectedIds.size}` : 'Download ZIP'}
                </Button>
              </span>

              {hasSelection && (
                <Button
                  variant="destructive"
                  size="xs"
                  icon={<Trash2 className="w-3 h-3" />}
                  onClick={onDeleteSelected}
                >
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right: Sort, View Switcher & Primary Import Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border-structural)] hover:border-[var(--border-strong)] rounded text-xs text-[var(--text-secondary)] font-sans transition-colors">
            <ArrowDownUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[11px] font-mono text-[var(--text-muted)] hidden md:inline">Sort:</span>
            <select
              aria-label="Sort assets"
              value={sort}
              onChange={(e) => onSort(e.target.value as SortOption)}
              className="bg-transparent text-[var(--text-primary)] font-medium text-xs outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-[var(--bg-panel)] text-[var(--text-primary)]">Newest</option>
              <option value="oldest" className="bg-[var(--bg-panel)] text-[var(--text-primary)]">Oldest</option>
              <option value="name" className="bg-[var(--bg-panel)] text-[var(--text-primary)]">Name (A-Z)</option>
              <option value="size" className="bg-[var(--bg-panel)] text-[var(--text-primary)]">File Size</option>
            </select>
          </div>

          <div className="h-4 w-px bg-[var(--border-structural)]" />

          {/* View Switcher (Grid / Compact / List) */}
          <div className="flex items-center bg-[var(--bg-base)] p-0.5 rounded border border-[var(--border-structural)]">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--bg-elevated)] text-[var(--accent-cyan)] shadow-xs border border-[var(--border-strong)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Standard Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'compact'
                  ? 'bg-[var(--bg-elevated)] text-[var(--accent-cyan)] shadow-xs border border-[var(--border-strong)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Dense Grid View"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--bg-elevated)] text-[var(--accent-cyan)] shadow-xs border border-[var(--border-strong)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Import Button */}
          {onImportClick && (
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={onImportClick}
              className="font-semibold"
            >
              Import
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-[var(--border-structural)] bg-[var(--bg-panel)] px-4 py-2.5 space-y-2 shrink-0">
        {/* Rounded Search Pill Input */}
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            aria-label="Search assets"
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search assets by prompt, seed, or filename..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md pl-9 pr-9 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]/50 transition-all font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips Row */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[26px]">
          {/* Base "All Assets" Chip */}
          <Chip
            label="All Assets"
            count={totalUnfilteredCount}
            active={!hasActiveFilters}
            variant="filter"
            color="default"
            onClick={onClearAllFilters}
          />

          {/* Active Collection Chip */}
          {activeCollection !== 'all' && collectionNames[activeCollection] && (
            <Chip
              label={collectionNames[activeCollection]}
              active={true}
              variant="filter"
              color="cobalt"
              count={assets.length}
              onRemove={onClearCollection}
            />
          )}

          {/* Active Asset Types Chips */}
          {Array.from(selectedTypes).map((t) => (
            <Chip
              key={t}
              label={t}
              active={true}
              variant="filter"
              color="cyan"
              onRemove={() => onRemoveType(t)}
            />
          ))}

          {/* Active Timeline Chip */}
          {timeline !== 'all' && timelineNames[timeline] && (
            <Chip
              label={timelineNames[timeline]}
              active={true}
              variant="filter"
              color="indigo"
              onRemove={onClearTimeline}
            />
          )}

          {/* Active Resolution Tier Chip */}
          {resolutionTier !== 'all' && resolutionNames[resolutionTier] && (
            <Chip
              label={resolutionNames[resolutionTier]}
              active={true}
              variant="filter"
              color="emerald"
              onRemove={onClearResolutionTier}
            />
          )}

          {/* Active Search Query Chip */}
          {search.trim().length > 0 && (
            <Chip
              label={`"${search}"`}
              active={true}
              variant="filter"
              color="amber"
              onRemove={() => onSearch('')}
            />
          )}

          {/* Clear All Text Trigger */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="text-[11px] text-[var(--accent-cyan)] hover:underline ml-1 font-sans cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {assets.length === 0 ? (
          /* Honest, Polished Empty State */
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-structural)] flex items-center justify-center text-[var(--text-muted)] shadow-sm">
              <Inbox className="w-8 h-8 opacity-70" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="font-sans font-bold text-sm text-[var(--text-primary)]">
                {hasActiveFilters ? 'No matching assets found' : 'Your library is empty'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {hasActiveFilters
                  ? 'No library items match your active filters or search term. Try resetting filters or searching for something else.'
                  : 'Import images, vectors, videos, or generate new assets in Studio to build your creative collection.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={onClearAllFilters}>
                  Clear All Filters
                </Button>
              )}
              {onImportClick && (
                <Button variant="primary" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={onImportClick}>
                  Import Assets
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* Table List View */
          <GalleryListView
            assets={assets}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onDownload={onDownload}
            onReveal={onReveal}
            onDeleteAsset={onDeleteAsset}
            onAnimate={onAnimate}
            onVectorize={onVectorize}
            onUpscale={onUpscale}
            onEditMetadata={onEditMetadata}
          />
        ) : (
          /* Grid View & Compact Grid View */
          <div
            className={`grid gap-4 auto-rows-max ${
              viewMode === 'compact'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            }`}
          >
            {assets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              const favorite = asset.favorite ?? false;
              const resolved = assetUrl(asset.thumbnailUrl || asset.url);

              return (
                <GalleryCard
                  key={asset.id}
                  asset={asset}
                  resolvedUrl={resolved}
                  selected={isSelected}
                  favorite={favorite}
                  compact={viewMode === 'compact'}
                  onSelect={onToggleSelect}
                  onOpen={onOpen}
                  onToggleFavorite={onToggleFavorite}
                  onDownload={onDownload}
                  onReveal={onReveal}
                  onDelete={onDeleteAsset}
                  onAnimate={onAnimate}
                  onVectorize={onVectorize}
                  onUpscale={onUpscale}
                  onEditMetadata={onEditMetadata}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
