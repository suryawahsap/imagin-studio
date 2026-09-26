// BatchImportPreviewModal — extracted dari App.tsx (renderBatchImportPreviewModal).
// Preview file JSON yang di-drag/drop sebelum digabung jadi 1 importedBatch.

import { CheckSquare, FileText, FolderUp, Info, Square, X, XCircle, Zap } from "lucide-react";
import React from "react";
import { processImportedJSONFiles } from "../../engines/import-engine";
import { useEscapeClose } from '../useEscapeClose';

export interface BatchImportPreviewModalProps {
  batchImportPreview: { files: any[] } | null;
  onClose: () => void;
  setBatchImportPreview: React.Dispatch<React.SetStateAction<{ files: any[] } | null>>;
  setPasteJsonInput: (text: string) => void;
  setPasteJsonErrors: (errors: string[]) => void;
  setJsonModalTab: (tab: string) => void;
  setImportPasteModalOpen: (open: boolean) => void;
  showToast: (msg: string, type?: string) => void;
  setImportedBatch: (batch: any) => void;
  setBatchQueue: (queue: any) => void;
  setVectorState: (state: any) => void;
  clearBatchProgress: () => void;
}

export default function BatchImportPreviewModal({
  batchImportPreview,
  onClose,
  setBatchImportPreview,
  setPasteJsonInput,
  setPasteJsonErrors,
  setJsonModalTab,
  setImportPasteModalOpen,
  showToast,
  setImportedBatch,
  setBatchQueue,
  setVectorState,
  clearBatchProgress,
}: BatchImportPreviewModalProps) {
  useEscapeClose(Boolean(batchImportPreview), onClose);
  if (!batchImportPreview) return null;
  const items = batchImportPreview.files || [];
  const validSelected = items.filter((i) => i.selected && !i.error);
  const errorCount = items.filter((i) => i.error).length;
  const validCount = items.length - errorCount;

  const toggleItem = (idx: number) => {
    setBatchImportPreview((prev) => {
      if (!prev) return prev;
      const next = { ...prev, files: prev.files.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)) };
      return next;
    });
  };

  const toggleAll = () => {
    setBatchImportPreview((prev) => {
      if (!prev) return prev;
      const allSelected = prev.files.every((i) => i.selected || i.error);
      return { ...prev, files: prev.files.map((i) => (i.error ? i : { ...i, selected: !allSelected })) };
    });
  };

  const handleImport = () => {
    // Ambil semua file yang dicentang + valid. Urutan sesuai urutan picker.
    const picked = items.filter((i) => i.selected && !i.error);
    if (picked.length === 0) return;

    if (picked.length === 1) {
      // Single file → flow lama: populate paste editor (user bisa review dulu)
      setPasteJsonInput(picked[0].text);
      setPasteJsonErrors([]);
      setJsonModalTab("paste");
      setImportPasteModalOpen(true);
      showToast(`File ${picked[0].fileName} dimuat — klik Validate & Import`, "success");
      setBatchImportPreview(null);
      return;
    }

    // Multi-file → gabung flat jadi 1 importedBatch.
    // Tiap file dapat metadata (startIndex, endIndex, promptCount).
    // Queue aggregate = total prompts; engine loop dari currentIndex tanpa peduli boundary file.
    // Pause/resume tetap dari currentIndex.
    processImportedJSONFiles(
      picked.map((i) => ({ fileName: i.fileName, batchName: i.batchName, raw: i._raw })),
      { setPasteJsonErrors, showToast, setImportedBatch, setBatchQueue, setVectorState, setImportPasteModalOpen, clearBatchProgress }
    );
    setBatchImportPreview(null);
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="batch-import-title" tabIndex={-1} className="max-w-2xl w-full bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div>
            <h3 id="batch-import-title" className="font-black text-base flex items-center gap-2">
              <FolderUp className="w-4 h-4 text-[var(--accent-gold)]" />
              Import Files ({items.length})
            </h3>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {validCount} valid · {errorCount} error · {validSelected.length} dipilih
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-element)] rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SELECT ALL */}
        {validCount > 1 && (
          <div className="px-6 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-element)] flex-shrink-0">
            <button
              onClick={toggleAll}
              className="text-[11px] font-bold text-[var(--accent-blue)] hover:underline flex items-center gap-1.5"
            >
              {items.every((i) => i.selected || i.error) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              Toggle Semua
            </button>
            <span className="text-[9px] text-[var(--text-secondary)]">Centang file yang ingin di-import</span>
          </div>
        )}

        {/* LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-0">
          {items.map((it, idx) => {
            const isErr = !!it.error;
            return (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${isErr ? "border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5" : it.selected ? "border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/5" : "border-[var(--border-color)] bg-[var(--bg-element)]"}`}>
                <button
                  onClick={() => !isErr && toggleItem(idx)}
                  disabled={isErr}
                  className="mt-0.5 flex-shrink-0 disabled:cursor-not-allowed"
                >
                  {isErr ? (
                    <XCircle className="w-4 h-4 text-[var(--accent-red)]" />
                  ) : it.selected ? (
                    <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                  ) : (
                    <Square className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <FileText className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                    <span className="text-[12px] font-black text-[var(--text-primary)] truncate">{it.fileName}</span>
                    {isErr ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex-shrink-0">ERROR</span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex-shrink-0">VALID</span>
                    )}
                  </div>
                  {isErr ? (
                    <div className="text-[10px] text-[var(--accent-red)] leading-relaxed">{it.error}</div>
                  ) : (
                    <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-bold text-[var(--text-primary)]">{it.batchName}</span> · {it.promptCount} prompt{it.promptCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* INFO + FOOTER */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-element)] flex-shrink-0 space-y-2.5">
          <div className="text-[10px] text-[var(--text-secondary)] leading-relaxed flex gap-1.5 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--accent-blue)] flex-shrink-0 mt-px" />
            <span>Semua file yang dicentang akan <b>digabung jadi 1 batch</b> dan di-generate berurutan dari atas (file 1 → file 2 → ...). Pause/resume jalan normal lewat currentIndex.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-bold hover:bg-[var(--bg-card)] transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleImport}
              disabled={validSelected.length === 0}
              className="flex-[2] py-2.5 rounded-xl bg-[var(--accent-gold-solid)] text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" /> Import Selected ({validSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
