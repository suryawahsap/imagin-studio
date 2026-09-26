// HistoryModal — extracted dari imagin_studio.tsx line 27160–27214.
// Activity log viewer dengan rejection insights + export log ke JSON.

import { Clock, Download, X } from "lucide-react";
import React from "react";
import { useEscapeClose } from '../useEscapeClose';

export interface HistoryLog {
  id: string;
  action: string;
  timestamp: number;
  [key: string]: any;
}

export interface RejectionInsights {
  sampleSize: number;
  topRejectionTypes: Array<{ type: string; count: number }>;
  suggestedActions: string[];
}

export interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  historyLogs: HistoryLog[];
  rejectionInsights?: RejectionInsights | null;
}

export default function HistoryModal({ open, onClose, historyLogs, rejectionInsights }: HistoryModalProps) {
  useEscapeClose(open, onClose);
  if (!open) return null;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(historyLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imagin_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
       <div role="dialog" aria-modal="true" aria-labelledby="history-title" tabIndex={-1}
      className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
           <h3 id="history-title" className="font-black text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent-gold)]" /> Activity Log
          </h3>
          <button onClick={onClose} aria-label="Tutup history">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-3 space-y-2">
          {rejectionInsights && rejectionInsights.sampleSize > 0 && (
            <div className="p-3 rounded-xl bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-red)] mb-2">
                Pola Penolakan (dari {rejectionInsights.sampleSize} reject)
              </div>
              {rejectionInsights.topRejectionTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {rejectionInsights.topRejectionTypes.map((t) => (
                    <span
                      key={t.type}
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20"
                    >
                      {t.type} ×{t.count}
                    </span>
                  ))}
                </div>
              )}
              {rejectionInsights.suggestedActions.length > 0 && (
                <ul className="space-y-1">
                  {rejectionInsights.suggestedActions.map((s, i) => (
                    <li key={i} className="text-[10px] text-[var(--text-secondary)] leading-snug flex items-start gap-1.5">
                      <span className="text-[var(--accent-gold)]">◆</span> {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {historyLogs.length === 0 ? (
            <div className="text-xs text-[var(--text-secondary)] text-center py-8">No activity logged yet.</div>
          ) : (
            historyLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[var(--bg-element)] border border-[var(--border-color)] text-xs">
                <div className="font-medium text-[var(--text-primary)]">{log.action}</div>
                <div className="text-[9px] text-[var(--text-secondary)] mt-1">{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-card)] text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> Export Log
          </button>
        </div>
      </div>
    </div>
  );
}
