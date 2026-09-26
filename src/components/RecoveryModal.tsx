import React from "react";
import { AlertTriangle, RotateCcw, X, Trash2 } from "lucide-react";
import { Task } from "../types";

interface RecoveryModalProps {
  tasks: Task[];
  savedAt: string;
  onResume: (ids: string[]) => void;
  onDismiss: (ids: string[]) => void;
  onClose: () => void;
}

export default function RecoveryModal({
  tasks,
  savedAt,
  onResume,
  onDismiss,
  onClose,
}: RecoveryModalProps) {
  const allIds = tasks.map((t) => t.id);
  const resume = () => onResume(allIds);
  const dismiss = () => onDismiss(allIds);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-vintage-border bg-vintage-ivory shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-vintage-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-wa-text" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-vintage-coffee">
              Recover Unfinished Tasks
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-vintage-navy hover:text-vintage-coffee hover:bg-vintage-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-vintage-navy leading-relaxed">
            App ditutup saat {tasks.length} task masih berjalan (tersimpan{" "}
            {new Date(savedAt).toLocaleTimeString()}). Task berikut di-set ulang
            ke antrian dan siap dijalankan lagi.
          </p>

          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-vintage-paper border border-vintage-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-vintage-coffee">
                    {t.name}
                  </div>
                  <div className="font-mono text-[10px] text-vintage-navy uppercase">
                    {t.type}
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full bg-wa-base text-wa-text px-2 py-0.5 text-[10px] font-bold">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-vintage-border bg-vintage-paper/30">
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 rounded-full bg-vintage-paper border border-vintage-border px-3.5 py-2 text-xs font-bold text-vintage-coffee transition-all hover:bg-vintage-ivory"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Cancel All
          </button>
          <button
            onClick={onClose}
            className="rounded-full px-3.5 py-2 text-xs font-bold text-vintage-navy hover:text-vintage-coffee transition-colors"
          >
            Later
          </button>
          <button
            onClick={resume}
            className="flex items-center gap-1.5 rounded-full bg-mod-ve-base px-4 py-2 text-xs font-bold text-mod-ve-text transition-all hover:brightness-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
