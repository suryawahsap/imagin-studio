import { useEffect, useRef } from "react";
import { api } from "./electron";

export type SyncJob = {
  tempId?: string;
  status?: string;
  error?: string | null;
  outputSvgUrl?: string | null;
  outputEpsUrl?: string | null;
  outputUrl?: string | null;
  originalUrl?: string | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
  elapsedMs?: number | null;
  outputUrls?: Record<string, string> | null;
  progress?: number | null;
  fps?: number | null;
  durationMs?: number | null;
  frameCount?: number | null;
};

export type SyncEventName = "vector" | "upscale" | "animation";

export type HistoryEntry = {
  id: string;
  source: string;
  output?: string | null;
  mode?: string;
  engine?: string;
  scale?: number;
  preset?: string;
  timestamp: number;
  elapsedMs?: number | null;
};

type Handler<T> = (jobs: T[]) => void;

/**
 * Syncs per-asset pipeline state with the main-process job queue.
 * Fetches the full queue once on mount, then relies on incremental
 * "vector:job-update"/"upscale:job-update" events instead of polling.
 * `handler` receives each batch (initial full list, then single-job
 * updates) and is responsible for merging into component state.
 */
export function useJobSync<T extends SyncJob>(
  kind: SyncEventName,
  handler: Handler<T>
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let mounted = true;
    const deliver = (jobs: T[]) => {
      if (mounted) handlerRef.current(jobs);
    };

    const fetchAll = async () => {
      try {
        const data =
          kind === "vector"
            ? await api.vectorQueueGet()
            : kind === "upscale"
            ? await api.upscaleQueueGet()
            : await api.animationQueueGet();
        deliver((data.items as T[]) || []);
      } catch {
        /* transient */
      }
    };
    fetchAll();

    const unsubscribe =
      kind === "vector"
        ? api.onVectorJobUpdate((job) => deliver([job as T]))
        : kind === "upscale"
        ? api.onUpscaleJobUpdate((job) => deliver([job as T]))
        : api.onAnimationJobUpdate((job) => deliver([job as T]));

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [kind]);
}
