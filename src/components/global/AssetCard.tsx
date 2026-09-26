import { useState } from "react";
import { Check, Download, FolderOpen, Pencil, Star, Trash2, FileArchive, Image as ImageIcon, Video, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

export type AssetCardType = "IMAGE" | "VECTOR" | "VIDEO" | "AUDIO";

export interface AssetCardProps {
  id: string;
  type: AssetCardType;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  selected?: boolean;
  favorite?: boolean;
  status?: string;
  onSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReveal?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

const TYPE_BADGE: Record<AssetCardType, string> = {
  VIDEO: "bg-[var(--module-animation-vivid)] text-[var(--text-on-vivid)]",
  VECTOR: "bg-[var(--module-library-vivid)] text-[var(--text-on-vivid)]",
  IMAGE: "bg-[var(--module-upscale-vivid)] text-[var(--text-on-vivid)]",
  AUDIO: "bg-[var(--bg-element)] text-[var(--text-primary)]",
};

const STATUS_BADGE: Record<string, string> = {
  Ready: "bg-[var(--module-vectorize-vivid)] text-[var(--text-on-vivid)]",
  Vectorized: "bg-[var(--module-library-vivid)] text-[var(--text-on-vivid)]",
  Upscaled: "bg-[var(--module-upscale-vivid)] text-[var(--text-on-vivid)]",
  Raw: "bg-[var(--bg-element)] text-[var(--text-primary)]",
};

const TYPE_ICON: Record<AssetCardType, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VECTOR: FileArchive,
  VIDEO: Video,
  AUDIO: Volume2,
};

export default function AssetCard({
  id,
  type,
  name,
  description,
  thumbnailUrl,
  selected = false,
  favorite = false,
  status,
  onSelect,
  onOpen,
  onRename,
  onDownload,
  onDelete,
  onReveal,
  onToggleFavorite,
}: AssetCardProps) {
  const Icon = TYPE_ICON[type] ?? ImageIcon;
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);

  const saveRename = () => {
    const next = draft.trim();
    if (next && next !== name) onRename?.(id, next);
    setRenaming(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => (onOpen ? onOpen(id) : onSelect?.(id))}
      className={`group relative flex flex-col bg-[var(--color-bg-card)] border rounded-xl overflow-hidden cursor-pointer transition-all ${
        selected
          ? "border-[var(--accent-action)] ring-1 ring-[var(--accent-action)]"
          : "border-[var(--border-color)] hover:border-[var(--text-secondary)]"
      }`}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-square w-full bg-[var(--color-bg-page)] flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Icon className="w-10 h-10 text-[var(--color-text-secondary)]" />
        )}

        {/* Type badge */}
        <span
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
            TYPE_BADGE[type] ?? TYPE_BADGE.IMAGE
          }`}
        >
          {type}
        </span>

        {/* Status badge */}
        {status && (
          <span
            className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
              STATUS_BADGE[status] ?? "bg-[var(--color-bg-element)] text-[var(--color-text-primary)]"
            }`}
          >
            {status}
          </span>
        )}

        {/* Select checkbox (hover / selected) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(id);
          }}
          aria-label={selected ? "Deselect asset" : "Select asset"}
          className={`absolute top-2.5 right-11 w-5 h-5 rounded border flex items-center justify-center transition-opacity ${
            selected
              ? "bg-[var(--accent-action)] border-[var(--accent-action)] text-white opacity-100"
              : "bg-black/40 border-[var(--border-strong)] text-transparent hover:text-white opacity-0 group-hover:opacity-100"
          }`}
        >
          <Check className="w-3.5 h-3.5" />
        </button>

        {/* Favorite toggle (hover / active) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(id);
          }}
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          className={`absolute top-2.5 right-2.5 w-6 h-6 rounded flex items-center justify-center bg-black/40 transition-opacity ${
            favorite
              ? "text-[var(--module-library-vivid)] opacity-100"
              : "text-zinc-300 hover:text-[var(--module-library-vivid)] opacity-0 group-hover:opacity-100"
          }`}
        >
          <Star className={`w-4 h-4 ${favorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Info footer */}
      <div className="p-3 bg-[var(--color-bg-element)] border-t border-[var(--color-border-color)] flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1.5">
          {renaming ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Nama asset baru"
              className="flex-1 min-w-0 bg-[var(--color-bg-card)] border border-[var(--color-border-color)] rounded-md px-2 py-0.5 text-xs font-bold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-secondary)]"
            />
          ) : (
            <span className="text-xs font-bold text-[var(--color-text-primary)] truncate" title={name}>
              {name}
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(id);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Download"
                aria-label="Download asset"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {onReveal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReveal(id);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Tampilkan di folder"
                aria-label="Tampilkan di folder"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            )}
            {onRename && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft(name);
                  setRenaming(true);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Edit"
                aria-label="Rename asset"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-er-text)] transition-colors"
                title="Hapus"
                aria-label="Delete asset"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {description && (
          <div
            className="text-[11px] font-mono text-[var(--color-text-secondary)] truncate"
            title={description}
          >
            {description}
          </div>
        )}
      </div>
    </motion.div>
  );
}
