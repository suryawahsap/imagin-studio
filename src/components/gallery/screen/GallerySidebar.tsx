// @ts-nocheck
/**
 * Gallery Sidebar — markup mengikuti design reference
 * (imagin_studio_gallery_module/code.html → data-purpose="library-navigation"),
 * palet dinormalisasi ke token Studio (surface #0c101a/#0e131f, border #1e293b).
 * Aksen aksi memakai biru (konsisten dengan Studio); cyan hanya untuk readout angka.
 */
import React from 'react';
import type { LibraryAsset } from '../../../types';

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

const NAV_ICON = {
  grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  vector: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

function NavIcon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
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
  selectedCount = 0,
  totalCount = 0,
  assets = [],
  onRescanLibrary,
}: GallerySidebarProps) {
  const countByType = (type: string) => assets.filter(a => a.type === type).length;
  const counts = {
    all: assets.length,
    images: countByType('IMAGE'),
    videos: countByType('VIDEO'),
    vectors: countByType('VECTOR'),
    favorites: assets.filter(a => a.favorite).length,
  };

  const NAV_ITEMS = [
    { id: 'all', label: 'All Assets', icon: NAV_ICON.grid, count: counts.all },
    { id: 'images', label: 'Images', icon: NAV_ICON.image, count: counts.images },
    { id: 'videos', label: 'Videos', icon: NAV_ICON.video, count: counts.videos },
    { id: 'vectors', label: 'Vectors', icon: NAV_ICON.vector, count: counts.vectors },
  ];

  const TYPE_FILTERS = [
    { type: 'IMAGE', label: 'Image (.png, .jpg)', count: counts.images },
    { type: 'VIDEO', label: 'Video (.mp4, .mov)', count: counts.videos },
    { type: 'VECTOR', label: 'Vector (.svg)', count: counts.vectors },
  ];

  const TIMELINES = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
  ];

  const TIERS = [
    { key: '1k', label: '1K Native' },
    { key: '4k', label: '4K Super' },
    { key: 'vector', label: 'Vector Inf' },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[var(--bg-panel)] border-r border-[var(--border-structural)] flex flex-col justify-between overflow-hidden" aria-label="Library navigation">
      <div className="p-3 overflow-y-auto space-y-5">
        {/* Library Navigation */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">
            <span>Library Navigation</span>
            <span className="flex items-center gap-1">
              {onRescanLibrary && (
                <button
                  onClick={onRescanLibrary}
                  title="Rescan library"
                  aria-label="Rescan library"
                  className="text-slate-500 hover:text-slate-200 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {onCreateMetadata && (
                <button
                  onClick={onCreateMetadata}
                  title="Buat metadata dari aset"
                  aria-label="Buat metadata"
                  className="text-slate-500 hover:text-slate-200 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <span className="font-mono text-cyan-400 bg-cyan-500/10 px-1.5 rounded border border-cyan-500/30">
                {totalCount} items
              </span>
            </span>
          </div>

          <ul className="space-y-0.5 text-xs font-medium">
            {NAV_ITEMS.map(item => {
              const active = activeCollection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveCollection(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <NavIcon d={item.icon} active={active} />
                      <span className={active ? 'text-white font-semibold' : ''}>{item.label}</span>
                    </span>
                    <span className={`text-[11px] font-mono ${active ? 'text-blue-300 font-bold' : 'text-slate-500'}`}>{item.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 pt-3 border-t border-[#1e293b] space-y-0.5">
            <button
              onClick={() => setTimeline('7d')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#0e131f] transition-colors text-xs cursor-pointer"
            >
              <span className="flex items-center space-x-2.5">
                <NavIcon d={NAV_ICON.clock} active={false} />
                <span>Recent Renders</span>
              </span>
            </button>
            <button
              onClick={() => setActiveCollection('favorites')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-xs cursor-pointer ${
                activeCollection === 'favorites' ? 'bg-[#141b2b] text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e131f]'
              }`}
            >
              <span className="flex items-center space-x-2.5">
                <svg className={`w-4 h-4 ${activeCollection === 'favorites' ? 'text-blue-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={NAV_ICON.star} />
                </svg>
                <span>Favorites</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">{counts.favorites}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Filter Controls */}
        <div className="pt-2 border-t border-[#1e293b]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2.5">
            <span>Pipeline Filter</span>
            <button onClick={onResetFilters} className="text-blue-400 hover:underline lowercase text-[10px] tracking-normal font-medium cursor-pointer">
              Reset
            </button>
          </div>

          {/* Asset Type */}
          <div className="space-y-2 px-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium block">Asset Type</span>
            <div className="space-y-1.5">
              {TYPE_FILTERS.map(f => {
                const checked = selectedTypes.has(f.type);
                return (
                  <label key={f.type} className="flex items-center justify-between group cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleType(f.type)}
                        className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-slate-300 group-hover:text-white">{f.label}</span>
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">{f.count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Render Timeline */}
          <div className="mt-4 px-2">
            <span className="text-slate-400 text-[11px] font-medium block mb-2">Render Timeline</span>
            <div className="space-y-1">
              {TIMELINES.map(t => {
                const active = timeline === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTimeline(active ? 'all' : t.key)}
                    aria-pressed={active}
                    className={`w-full text-left px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      active ? 'bg-[#162132] text-blue-300 border border-blue-500/40' : 'hover:bg-[#0e131f] text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Tier */}
          <div className="mt-4 px-2">
            <span className="text-slate-400 text-[11px] font-medium block mb-2">Resolution Tier</span>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#07090e] rounded-md border border-[#1e293b] text-[10px] text-center font-mono">
              {TIERS.map(t => {
                const active = resolutionTier === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setResolutionTier(active ? 'all' : t.key)}
                    aria-pressed={active}
                    className={`py-1 rounded transition cursor-pointer ${
                      active ? 'bg-[#1e2738] text-blue-300 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Storage gauge (docked) */}
      <div className="p-3 border-t border-[var(--border-structural)] bg-[var(--bg-base)]">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
          <span className="text-slate-400">Storage Pool</span>
          <span className="text-cyan-400 font-semibold">
            {storage ? `${storage.used} / ${storage.total} GB` : '— / — GB'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, storage?.percent ?? 0))}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between font-mono">
          <span>{selectedCount > 0 ? `${selectedCount} aset dipilih` : 'Belum ada aset dipilih'}</span>
        </div>
      </div>
    </aside>
  );
}
