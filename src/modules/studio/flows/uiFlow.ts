import type { MutableRefObject } from 'react';
import { saveHistoryLog } from '../engines/storage';

export function installGlobalErrorLogging() {
  if (typeof window === 'undefined' || (window as any).__imaginErrorHookInstalled) return;
  (window as any).__imaginErrorHookInstalled = true;
  window.addEventListener('unhandledrejection', (e) => {
    const err = e?.reason || e;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Imagin] Unhandled rejection:', err);
    saveHistoryLog({ id: `err_${Date.now()}`, type: 'error', action: 'unhandled_rejection', detail: msg.slice(0, 300), timestamp: Date.now() }).catch(() => {});
  });
  window.addEventListener('error', (e) => {
    const msg = e?.message || 'Unknown window error';
    console.error('[Imagin] Window error:', e?.error || e);
    saveHistoryLog({ id: `err_${Date.now()}`, type: 'error', action: 'window_error', detail: msg.slice(0, 300), timestamp: Date.now() }).catch(() => {});
  });
}

export type ToastType = 'info' | 'success' | 'error';
export type ShowToast = (message: string, type?: ToastType) => void;

export type UiActionsContext = {
  setToasts: (update: (previous: any[]) => any[]) => void;
  setBlockingDialog: (dialog: any) => void;
  setPreflightEditDirty: (dirty: boolean) => void;
  setPreflightEdit: (edit: any) => void;
  setPreflightState: (state: any) => void;
};

export type UiEffectsContext = {
  bulkMenuOpen: boolean;
  setBulkMenuOpen: (open: boolean) => void;
  sidebarMenuOpen: boolean;
  setSidebarMenuOpen: (open: boolean) => void;
  animateFromPngState: any;
  setAnimateFromPngState: (update: any) => void;
  animationV2Modal: any;
  setAnimationV2Modal: (asset: any) => void;
  preflightState: any;
  closePreflightModal: () => void;
  selectedAssetDetail: any;
  setSelectedAssetDetail: (asset: any) => void;
  gridModalAsset: any;
  setPreviewZoom: (zoom: number) => void;
  setGridModalAsset: (asset: any) => void;
  promptPreview: any;
  setPromptPreview: (preview: any) => void;
  revisionState: any;
  setRevisionState: (update: any) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  jsonFormatModalOpen: boolean;
  setJsonFormatModalOpen: (open: boolean) => void;
  importPasteModalOpen: boolean;
  setImportPasteModalOpen: (open: boolean) => void;
};

export type UiPersistenceContext = {
  studioPrefsHydrated: boolean;
  systemSettings: any;
  videoUrlWriteReadyRef: MutableRefObject<boolean>;
  negativePromptWriteReadyRef: MutableRefObject<boolean>;
  diffCheckWriteReadyRef: MutableRefObject<boolean>;
};

export function showToast(ctx: UiActionsContext, msg: string, type: ToastType = 'info') {
  const id = Date.now() + Math.random();
  ctx.setToasts(p => [...p, { id, message: msg, type }]);
  setTimeout(() => ctx.setToasts(p => p.filter(t => t.id !== id)), 4000);
}

export function confirmBlocking(ctx: UiActionsContext, { title, message, confirmLabel = 'Ya, Lanjutkan', cancelLabel = 'Batal', onConfirm, onCancel }: any) {
  if (typeof onConfirm !== 'function') {
    console.warn('[uiFlow] confirmBlocking called without onConfirm — button will only close dialog.');
  }
  ctx.setBlockingDialog({
    title,
    message,
    confirmLabel,
    cancelLabel,
    onCancel: typeof onCancel === 'function' ? onCancel : () => ctx.setBlockingDialog(null),
    onClose: () => { ctx.setBlockingDialog(null); onConfirm?.(); }
  });
}

export function closePreflightModal(ctx: UiActionsContext) {
  ctx.setPreflightEditDirty(false);
  ctx.setPreflightEdit({ assetId: null, title: '', description: '', keywords: '' });
  ctx.setPreflightState({ isOpen: false, asset: null });
}

export function installUiEffects(ctx: UiEffectsContext) {
  const cleanups: Array<() => void> = [];
  const installClickAway = (open: boolean, close: () => void) => {
    if (!open) return;
    window.addEventListener('click', close);
    cleanups.push(() => window.removeEventListener('click', close));
  };

  installClickAway(ctx.bulkMenuOpen, () => ctx.setBulkMenuOpen(false));
  installClickAway(ctx.sidebarMenuOpen, () => ctx.setSidebarMenuOpen(false));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (ctx.animateFromPngState.isOpen) { ctx.setAnimateFromPngState((p: any) => ({ ...p, isOpen: false })); return; }
    if (ctx.animationV2Modal) { ctx.setAnimationV2Modal(null); return; }
    if (ctx.preflightState.isOpen) { ctx.closePreflightModal(); return; }
    if (ctx.selectedAssetDetail) { ctx.setSelectedAssetDetail(null); return; }
    if (ctx.gridModalAsset) { ctx.setPreviewZoom(1); ctx.setGridModalAsset(null); return; }
    if (ctx.promptPreview) { ctx.setPromptPreview(null); return; }
    if (ctx.revisionState.isOpen) { if (!ctx.revisionState.isRevising) ctx.setRevisionState((p: any) => ({ ...p, isOpen: false })); return; }
    if (ctx.isHistoryOpen) { ctx.setIsHistoryOpen(false); return; }
    if (ctx.isHelpOpen) { ctx.setIsHelpOpen(false); return; }
    if (ctx.isSettingsOpen) { ctx.setIsSettingsOpen(false); return; }
    if (ctx.jsonFormatModalOpen) { ctx.setJsonFormatModalOpen(false); return; }
    if (ctx.importPasteModalOpen) { ctx.setImportPasteModalOpen(false); return; }
    if (ctx.bulkMenuOpen) { ctx.setBulkMenuOpen(false); return; }
  };
  window.addEventListener('keydown', onKeyDown);
  cleanups.push(() => window.removeEventListener('keydown', onKeyDown));

  return () => cleanups.forEach(cleanup => cleanup());
}

export function persistVideoUrl(ctx: UiPersistenceContext) {
  if (!ctx.studioPrefsHydrated) return;
  if (!ctx.videoUrlWriteReadyRef.current) { ctx.videoUrlWriteReadyRef.current = true; return; }
  void window.api?.studioSaveConfig?.({ videoUrl: ctx.systemSettings.imaginVideoUrl }).catch(() => {});
}

export function persistNegativePrompt(ctx: UiPersistenceContext) {
  if (!ctx.studioPrefsHydrated) return;
  if (!ctx.negativePromptWriteReadyRef.current) { ctx.negativePromptWriteReadyRef.current = true; return; }
  void window.api?.studioSaveConfig?.({ negativePrompt: ctx.systemSettings.commercialRules?.defaultNegativePrompt || '' }).catch(() => {});
}

export function persistDiffCheck(ctx: UiPersistenceContext) {
  if (!ctx.studioPrefsHydrated) return;
  if (!ctx.diffCheckWriteReadyRef.current) { ctx.diffCheckWriteReadyRef.current = true; return; }
  void window.api?.studioSaveConfig?.({ diffCheck: !!ctx.systemSettings.commercialRules?.enableDifferentiationCheck }).catch(() => {});
}
