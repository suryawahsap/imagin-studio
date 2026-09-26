export type StudioModalType = 'settings' | 'help' | 'history';

const STUDIO_MODAL_EVENT = 'imagin:open-studio-modal';

export function emitOpenStudioModal(modal: StudioModalType): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDIO_MODAL_EVENT, { detail: { modal } }));
  }
}

export function subscribeOpenStudioModal(handler: (modal: StudioModalType) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<{ modal: StudioModalType }>;
    if (customEvent.detail?.modal) {
      handler(customEvent.detail.modal);
    }
  };
  window.addEventListener(STUDIO_MODAL_EVENT, listener);
  return () => window.removeEventListener(STUDIO_MODAL_EVENT, listener);
}
