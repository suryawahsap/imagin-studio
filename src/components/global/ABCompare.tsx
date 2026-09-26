import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";

export interface ABCompareProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  accent?: string;
  splitPos?: number;
  onSplitChange?: (splitPos: number) => void;
}

export default function ABCompare({
  left,
  right,
  leftLabel = "LEFT",
  rightLabel = "RIGHT",
  accent = "var(--color-mod-ve-vivid)",
  splitPos: controlledSplitPos,
  onSplitChange,
}: ABCompareProps) {
  const [internalSplitPos, setInternalSplitPos] = useState(50);
  const splitPos = controlledSplitPos ?? internalSplitPos;
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setSplitPosClamped = (next: number) => {
    const clamped = Math.max(5, Math.min(95, next));
    setInternalSplitPos(clamped);
    onSplitChange?.(clamped);
  };

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPosClamped(pct);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientX(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; setDragging(false); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const innerLeftWidth = splitPos > 0 ? 100 / (splitPos / 100) : 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white select-none"
    >
      {/* Right (full) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {right}
      </div>

      {/* Left (clipped) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${splitPos}%` }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ width: `${innerLeftWidth}%` }}
        >
          {left}
        </div>
      </div>

      {/* Handle */}
      <div
        className="absolute top-0 bottom-0 cursor-ew-resize z-10"
        style={{ left: `${splitPos}%`, transform: "translateX(-50%)" }}
        onMouseDown={() => { draggingRef.current = true; setDragging(true); }}
        onDoubleClick={() => setSplitPosClamped(50)}
      >
        <div className="w-0.5 h-full" style={{ backgroundColor: accent }} />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-bg-card)] border-2"
          style={{ borderColor: accent }}
          animate={{ scale: dragging ? 1.15 : 1 }}
          transition={{ duration: 0.15 }}
        >
          <MoveHorizontal className="w-3.5 h-3.5" style={{ color: accent }} />
        </motion.div>
      </div>

      {/* Labels */}
      <motion.span
        className="absolute top-3 left-3 bg-[var(--color-bg-card)]/90 px-2.5 py-1 rounded-md border border-[var(--color-border-color)] uppercase text-[10px] font-mono font-bold text-[var(--color-text-primary)]"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {leftLabel}
      </motion.span>
      <motion.span
        className="absolute top-3 right-3 px-2.5 py-1 rounded-md uppercase text-[10px] font-mono font-bold text-black"
        style={{ backgroundColor: accent }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {rightLabel}
      </motion.span>
    </div>
  );
}