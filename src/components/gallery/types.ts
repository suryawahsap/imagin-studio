import type { LibraryAsset } from '../../types';

export type CollectionId =
  | 'all'
  | 'images'
  | 'vectors'
  | 'upscaled'
  | 'animations'
  | 'videos'
  | 'audio'
  | 'html'
  | 'downloads'
  | 'recents'
  | 'favorites';

export type AssetTypeFilter = 'IMAGE' | 'VIDEO' | 'VECTOR' | 'ANIMATION' | 'AUDIO' | 'HTML';

export type ResolutionFilter = 'all' | '1k' | '4k' | 'vector' | 'ready';

export type TimelineFilter = 'all' | '7d' | '30d' | 'today';

export type SortOption = 'newest' | 'oldest' | 'name' | 'size';

export type ViewMode = 'grid' | 'compact' | 'list';

export interface StorageStats {
  used: number;
  total: number;
  free: number;
  percent: number;
}
