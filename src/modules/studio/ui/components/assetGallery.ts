export const CANONICAL_STATUSES = ['draft', 'processing', 'review', 'ready', 'rejected', 'exported', 'submitted'] as const;
export function normalizeGalleryStatus(asset: any): string {
  const raw = String(asset?.overallStatus || asset?.status || 'draft').toLowerCase().replace(/[-\s]/g, '_');
  if (raw === 'failed' || raw === 'error') return 'rejected';
  if (raw === 'metadata_ready' || raw === 'approved' || raw === 'complete' || raw === 'completed') return 'ready';
  if (raw === 'needs_review' || raw === 'pending_review') return 'review';
  if (raw === 'generating' || raw === 'queued' || raw === 'pending') return 'processing';
  return CANONICAL_STATUSES.includes(raw as any) ? raw : 'draft';
}
export function isReadyForSubmit(asset: any): boolean {
  return normalizeGalleryStatus(asset) === 'ready' && Boolean(asset?.url) && !asset?.isLoading && !asset?.isUpscaling;
}
export function isIconAsset(asset: any): boolean {
  return Boolean(asset?.iconMode) || String(asset?.assetType || asset?.type || '').toLowerCase() === 'icon';
}
