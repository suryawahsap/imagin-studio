import { FileImage } from "lucide-react";

export interface RecentStripProps {
  items: Array<{ id: string; name: string; thumbnailUrl?: string; onClick?: () => void }>;
  emptyLabel?: string;
  count?: number;
}

export default function RecentStrip({ items, emptyLabel = "No conversions yet", count }: RecentStripProps) {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between h-4 mb-2">
        <span className="text-xs font-bold text-[var(--color-text-primary)]">Recent</span>
        {count !== undefined && (
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">{count}</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-center text-xs font-mono text-[var(--color-text-secondary)] py-4 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-color)]">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className="w-64 flex-shrink-0 bg-[var(--color-bg-element)] rounded-xl overflow-hidden p-2 flex flex-col border border-[var(--color-border-color)] transition-all cursor-pointer hover:border-[var(--color-mod-ve-vivid)]"
            >
              <div className="h-32 bg-white rounded-lg overflow-hidden flex items-center justify-center p-1 border border-[var(--color-border-color)]">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <FileImage className="w-6 h-6 text-[var(--color-text-secondary)]" />
                )}
              </div>
              <span className="text-xs font-bold truncate mt-2 text-[var(--color-text-primary)]" title={item.name}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}