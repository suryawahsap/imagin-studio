import { useState } from "react";
import { UploadCloud } from "lucide-react";

export interface DropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function Dropzone({
  label,
  hint,
  accept = ".png,.jpg,.jpeg,.webp",
  multiple = true,
  onFiles,
  compact = false,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  if (compact) {
    return (
      <label className="w-12 h-12 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-mod-ve-vivid)]/20 transition-colors group">
        <UploadCloud className="w-5 h-5 text-[var(--color-mod-ve-vivid)]" />
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </label>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`cursor-pointer border-2 border-dashed rounded-lg py-6 px-4 text-center transition-colors block ${
        dragOver
          ? "border-solid border-[var(--color-mod-ve-vivid)] bg-[var(--color-mod-ve-vivid)]/10"
          : "border-[var(--color-border-color)] hover:border-[var(--color-mod-ve-vivid)] hover:bg-[var(--color-mod-ve-vivid)]/5"
      }`}
    >
      <UploadCloud className="w-8 h-8 mx-auto mb-2 text-[var(--color-mod-ve-vivid)]" />
      <p className="text-xs font-bold text-[var(--color-text-primary)]">{label}</p>
      {hint && (
        <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">{hint}</p>
      )}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </label>
  );
}