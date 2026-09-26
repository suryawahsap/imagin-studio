import React from 'react';
import {
  Folder,
  LayoutGrid,
  Image as ImageIcon,
  Video,
  FileCode,
  Sparkles,
  Film,
  Volume2,
  Code,
  FolderDown,
  Clock,
  Star,
  ChevronRight,
  HardDrive,
  SlidersHorizontal,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import type { LibraryAsset } from '../../types';
import ProgressTrack from '../global/ProgressTrack';

export interface GallerySidebarProps {
  onCreateMetadata: () => void;
  activeCollection: string;
  setActiveCollection: (id: string) => void;
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
  timeline: string;
  setTimeline: (t: string) => void;
  resolutionTier: string;
  setResolutionTier: (tier: string) => void;
  onResetFilters: () => void;
  storage?: { used: number; total: number; free: number; percent: number } | null;
  selectedCount?: number;
  totalCount?: number;
  assets: LibraryAsset[];
  onRescanLibrary?: () => void;
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb < 1) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  }
  return `${gb.toFixed(1)} GB`;
}

export default function GallerySidebar({
  onCreateMetadata,
  activeCollection,
  setActiveCollection,
  selectedTypes,
  onToggleType,
  timeline,
  setTimeline,
  resolutionTier,
  setResolutionTier,
  onResetFilters,
  storage,
  totalCount = 0,
  assets,
  onRescanLibrary,
}: GallerySidebarProps) {
  // Real counts for collections
  const imagesCount = assets.filter(a => a.type === 'IMAGE').length;
  const vectorsCount = assets.filter(a => a.type === 'VECTOR').length;
  const videosCount = assets.filter(a => a.type === 'VIDEO').length;
  const animationsCount = assets.filter(a => a.type === 'ANIMATION').length;
  const audioCount = assets.filter(a => a.type === 'AUDIO').length;
  const htmlCount = assets.filter(a => a.type === 'HTML').length;
  const upscaledCount = assets.filter(
    a => a.status === 'Upscaled' || a.sourceModule === 'UPSCALE' || (a.resolution && (a.resolution.includes('4K') || a.resolution.includes('3840')))
  ).length;
  const downloadsCount = assets.filter(a => a.sourceModule === 'IMPORT' || a.folder?.includes('download') || a.folder?.includes('import')).length;
  const favoritesCount = assets.filter(a => Boolean(a.favorite)).length;
  const recentsCount = assets.filter(a => {
    if (!a.createdAt) return false;
    const diff = Date.now() - new Date(a.createdAt).getTime();
    return !Number.isNaN(diff) && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const collections = [
    { id: 'all', label: 'All Assets', icon: LayoutGrid, count: assets.length },
    { id: 'images', label: 'Images', icon: ImageIcon, count: imagesCount },
    { id: 'vectors', label: 'Vectors / EPS', icon: FileCode, count: vectorsCount },
    { id: 'upscaled', label: '4K Upscaled', icon: Sparkles, count: upscaledCount },
    { id: 'animations', label: 'Animations', icon: Film, count: animationsCount },
    { id: 'videos', label: 'Videos', icon: Video, count: videosCount },
    { id: 'audio', label: 'Audio', icon: Volume2, count: audioCount },
    { id: 'html', label: 'HTML5', icon: Code, count: htmlCount },
    { id: 'downloads', label: 'Downloads / Imports', icon: FolderDown, count: downloadsCount },
  ];

  // Pipeline Filter Asset Types
  const assetTypes = [
    { id: 'IMAGE', label: 'Image (.png, .jpg)', count: imagesCount },
    { id: 'VIDEO', label: 'Video (.mp4, .mov)', count: videosCount },
    { id: 'VECTOR', label: 'Vector (.svg, .eps)', count: vectorsCount },
    { id: 'ANIMATION', label: 'Animation (.json, .lottie)', count: animationsCount },
    { id: 'AUDIO', label: 'Audio (.mp3, .wav)', count: audioCount },
  ];

  // Calculated storage
  const storageUsedGB = storage ? (storage.used / 1024 / 1024 / 1024).toFixed(1) : '38.4';
  const storageTotalGB = storage ? (storage.total / 1024 / 1024 / 1024).toFixed(0) : '100';
  const storagePercent = storage ? Math.min(Math.max(storage.percent, 0), 100) : 38.4;

  const hasActiveFilters =
    activeCollection !== 'all' ||
    selectedTypes.size > 0 ||
    timeline !== 'all' ||
    resolutionTier !== 'all';

  return (
    <aside
      className="w-[280px] lg:w-[300px] bg-[var(--bg-panel)] border-r border-[var(--border-structural)] flex flex-col justify-between shrink-0 select-none h-full overflow-hidden"
      data-purpose="library-navigation"
    >
      {/* Scrollable Navigation & Filter Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {/* Collections Header */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] px-2 mb-2">
            <span className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
              <span>COLLECTIONS | MY LIBRARY</span>
            </span>
            <span className="font-mono text-[10px] text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded border border-[var(--accent-cyan)]/30 font-bold">
              {totalCount} items
            </span>
          </div>

          {/* Primary Collections List */}
          <ul className="space-y-0.5 text-xs font-medium font-sans">
            {collections.map((item) => {
              const Icon = item.icon;
              const active = activeCollection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCollection(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
                      active
                        ? 'bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30 font-semibold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--accent-cobalt)]' : 'text-[var(--text-muted)]'}`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span
                        className={`text-[11px] font-mono ${
                          active ? 'text-[var(--accent-cobalt)] font-bold' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {item.count}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 opacity-40 ${active ? 'text-[var(--accent-cobalt)]' : 'text-[var(--text-muted)]'}`} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Recents & Favorites Sub-section */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] space-y-0.5">
            {/* Recent Renders */}
            <button
              type="button"
              onClick={() => setActiveCollection('recents')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-all ${
                activeCollection === 'recents'
                  ? 'bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30 font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="truncate">Recent Renders</span>
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">{recentsCount}</span>
            </button>

            {/* Favorites */}
            <button
              type="button"
              onClick={() => setActiveCollection('favorites')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-all ${
                activeCollection === 'favorites'
                  ? 'bg-[var(--accent-warning-solid)]/10 text-[var(--accent-warning)] border border-[var(--accent-warning)]/40 font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--accent-warning)] hover:bg-[var(--bg-hover)] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Star className="w-4 h-4 text-[var(--accent-warning)] fill-[var(--accent-warning)]/20 shrink-0" />
                <span className="truncate">Favorites</span>
              </span>
              <span className="text-[11px] font-mono text-[var(--accent-warning)] font-bold">{favoritesCount}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Filter Controls */}
        <div className="pt-3 border-t border-[var(--border-structural)] space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 font-mono">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>PIPELINE FILTER</span>
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[var(--accent-cyan)] hover:underline lowercase text-[10px] tracking-normal font-sans font-medium"
              >
                Reset
              </button>
            )}
          </div>

          {/* Asset Type Checkboxes */}
          <div className="space-y-1.5 px-2 text-xs">
            <label className="text-[var(--text-secondary)] text-[11px] font-semibold block font-sans">
              Asset Type
            </label>
            <div className="space-y-1">
              {assetTypes.map((type) => {
                const checked = selectedTypes.has(type.id);
                return (
                  <label
                    key={type.id}
                    className="flex items-center justify-between group cursor-pointer py-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleType(type.id)}
                        className="w-3.5 h-3.5 rounded bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--accent-cobalt)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className={`text-xs ${checked ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                        {type.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {type.count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Render Timeline Pills */}
          <div className="px-2 space-y-1.5">
            <label className="text-[var(--text-secondary)] text-[11px] font-semibold block font-sans">
              Render Timeline
            </label>
            <div className="space-y-1 font-sans">
              {[
                { id: 'all', label: 'All Time' },
                { id: '7d', label: 'Last 7 days' },
                { id: '30d', label: 'Last 30 days' },
                { id: 'today', label: 'Today' },
              ].map((pill) => {
                const active = timeline === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setTimeline(pill.id)}
                    className={`w-full text-left px-2.5 py-1 rounded text-[11px] transition-all ${
                      active
                        ? 'bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-semibold border border-[var(--accent-cobalt)]/40 shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Tier / Status Segmented Bar */}
          <div className="px-2 space-y-1.5">
            <label className="text-[var(--text-secondary)] text-[11px] font-semibold block font-sans">
              Resolution Tier
            </label>
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-[var(--bg-base)] rounded-md border border-[var(--border-structural)] text-[10px] text-center font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: '1k', label: '1K Nat' },
                { id: '4k', label: '4K Sup' },
                { id: 'vector', label: 'Vec Inf' },
              ].map((tier) => {
                const active = resolutionTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setResolutionTier(tier.id)}
                    className={`py-1 px-0.5 rounded transition-all truncate ${
                      active
                        ? 'bg-[var(--bg-elevated)] text-[var(--accent-cyan)] font-bold shadow-xs border border-[var(--border-strong)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Docked Storage Pool Gauge & Quick Action at Bottom */}
      <div className="p-3 border-t border-[var(--border-structural)] bg-[var(--bg-base)] shrink-0 space-y-2.5">
        {/* Storage status readout */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <span>Storage Pool</span>
          </span>
          <span className="text-[var(--accent-cyan)] font-semibold">
            {storageUsedGB} / {storageTotalGB} GB
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-structural)]">
          <div
            className="h-full bg-[var(--accent-cyan)] rounded-full transition-all duration-300 shadow-[0_0_8px_var(--accent-action-soft)]"
            style={{ width: `${storagePercent}%` }}
          />
        </div>

        {/* Storage subtext */}
        <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between font-mono">
          <span>Auto-purge unflagged runs in 14d</span>
          {onRescanLibrary && (
            <button
              type="button"
              onClick={onRescanLibrary}
              title="Rescan Library"
              className="text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Create Metadata Button */}
        <button
          type="button"
          onClick={onCreateMetadata}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-structural)] hover:border-[var(--accent-cobalt)] text-xs font-semibold text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
          <span>Create Stock Metadata</span>
        </button>
      </div>
    </aside>
  );
}
