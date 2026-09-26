import { useEffect, useState } from "react";

export interface KeyframeProperty {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

export interface KeyframePanelProps {
  title?: string;
  properties: KeyframeProperty[];
  embedded?: boolean;
}

export default function KeyframePanel({
  title = "KEYFRAME PROPERTIES",
  properties,
  embedded = false,
}: KeyframePanelProps) {
  return (
    <aside className={`${embedded ? "w-full max-h-44 rounded-xl border" : "w-80 border-l h-full"} bg-[var(--color-bg-card)] border-[var(--color-border-color)] flex flex-col shrink-0`}>
      <div className="sticky top-0 bg-[var(--color-bg-card)] p-4 border-b border-[var(--color-border-color)]">
        <span className="font-mono text-[11px] font-bold tracking-widest text-[var(--color-text-secondary)] uppercase">
          {title}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {properties.map((p) => (
          <NumericInput key={p.id} {...p} />
        ))}
        {!properties.length && <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">Select a keyframed layer to edit values.</p>}
      </div>
    </aside>
  );
}

function NumericInput({ id, label, value, suffix = "px", min, max, step = 1, onChange }: KeyframeProperty) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div>
      <label
        htmlFor={`kf-${id}`}
        className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-1.5 block"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={`kf-${id}`}
          type="number"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            setLocal(Number.isNaN(v) ? 0 : v);
            onChange(Number.isNaN(v) ? 0 : v);
          }}
          className="w-full bg-[var(--color-bg-element)] border border-[var(--color-border-color)] rounded-md px-3 py-2 pr-10 text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-mod-an-vivid)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)] pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}
