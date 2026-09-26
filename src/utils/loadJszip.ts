// Load JSZip from CDN — shared utility for ZIP operations.
// Moved from Studio assetActionsFlow.ts (Fase 2).

export const loadJSZip = async (): Promise<any> => {
  if ((window as any).JSZip) return (window as any).JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve((window as any).JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};