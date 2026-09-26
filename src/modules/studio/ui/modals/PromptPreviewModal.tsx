// PromptPreviewModal — extracted dari imagin_studio.tsx line 25728–25820.
// Menampilkan preview prompt (positive + negative) yang akan dikirim ke Gemini.

import { Copy, Eye, X } from "lucide-react";
import React from "react";
import { useEscapeClose } from '../useEscapeClose';

export interface PromptPreviewModalProps {
  open: boolean;
  onClose: () => void;
  prompt: string | null;
  vectorState?: any;
  onCopy?: (text: string) => void;
}

export default function PromptPreviewModal({
  open,
  onClose,
  prompt,
  vectorState,
  onCopy,
}: PromptPreviewModalProps) {
  useEscapeClose(Boolean(open && prompt), onClose);
  if (!open || !prompt) return null;

  const config = vectorState || {};
  const wordCount = prompt.trim().split(/\s+/).length;
  const charCount = prompt.length;
  const negSplit = prompt.indexOf("\nNegative:");
  const positivePart = negSplit > -1 ? prompt.slice(0, negSplit).trim() : prompt;
  const negativePart = negSplit > -1 ? prompt.slice(negSplit + 1).trim() : null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="prompt-preview-title" tabIndex={-1} className="max-w-2xl w-full bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--accent-blue)]" />
            <h3 id="prompt-preview-title" className="font-black text-base">
              {config.iconMode ? "Icon Prompt Preview" : "Final Prompt Preview"}
            </h3>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-element)] px-2 py-0.5 rounded-full">
              {wordCount} kata · {charCount} karakter
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all"
            aria-label="Tutup preview prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {config.iconMode ? (
              <>
                <span className="px-2 py-1 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-lg">
                  Icon Style: {config.iconStyle || "—"}
                </span>
                <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                  Category: {config.adobeCategory || "—"}
                </span>
                <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                  {config.iconGenerationMode === "sheet"
                    ? "Icon Sheet"
                    : `${config.iconQuantity || 1} Icons`}
                </span>
              </>
            ) : (
              <>
                <span className="px-2 py-1 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-lg">
                  {config.adobeCategory || "No Category"}
                </span>
                {config.subcategory && (
                  <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                    {config.subcategory}
                  </span>
                )}
                <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                  {config.visualSettings?.style || config.style || "—"}
                </span>
                <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                  {config.visualSettings?.aspectRatio || config.aspectRatio || "—"}
                </span>
                <span className="px-2 py-1 bg-[var(--bg-element)] text-[var(--text-secondary)] rounded-lg">
                  {config.assetType || "vector"}
                </span>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-green)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] inline-block" />
              Positive Prompt
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap font-medium">
              {positivePart}
            </div>
          </div>

          {negativePart && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] inline-block" />
                Negative Prompt
              </div>
              <div className="p-4 rounded-xl bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 text-[13px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap font-medium">
                {negativePart}
              </div>
            </div>
          )}

          {!config.skipAIExpansion && (
            <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-element)] rounded-lg px-3 py-2 leading-relaxed">
               AI Expansion aktif — prompt ini akan diperluas Gemini sebelum generate. Preview ini menampilkan base prompt sebelum ekspansi.
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => {
                const text = `${positivePart}${negativePart ? "\n" + negativePart : ""}`;
                onCopy
                  ? onCopy(text)
                  : navigator.clipboard?.writeText(text).catch(() => {});
              }}
              className="px-3 py-2 rounded-xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[11px] font-bold hover:bg-[var(--accent-blue-solid)] hover:text-white transition-all flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Prompt
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[var(--text-primary)] text-[var(--bg-card)] hover:opacity-90 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
}
