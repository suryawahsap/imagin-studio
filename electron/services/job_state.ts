import fs from "fs";
import path from "path";
import { tempRoot } from "../binaries/paths";
import { Task } from "../types";
import { TaskStore } from "./job_queue";

/**
 * Job state persistence (plan §14.5 / §14.6):
 * - saveJobState() → serialize task store + info tambahan ke storage/temp/jobs/jobs.json
 * - restorePendingJobs() → baca file saat startup, tandai task PROCESSING sebagai QUEUED
 * - clearJobState() → hapus file setelah user memutuskan Resume/Retry/Cancel
 */

const STATE_DIR = path.join(tempRoot, "jobs");
const STATE_FILE = path.join(STATE_DIR, "jobs.json");

interface PersistedState {
  savedAt: string;
  tasks: Task[];
}

export function saveJobState(taskStore: TaskStore): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const active = taskStore
      .all()
      .filter(
        (t) => t.status === "QUEUED" || t.status === "PROCESSING"
      );
    if (active.length === 0) {
      // Tidak ada job aktif — hapus state lama agar tidak menimbulkan false recovery
      if (fs.existsSync(STATE_FILE)) {
        try { fs.unlinkSync(STATE_FILE); } catch {}
      }
      return;
    }
    const state: PersistedState = {
      savedAt: new Date().toISOString(),
      tasks: active,
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[JOB-STATE] save failed:", err);
  }
}

export function hasPendingJobState(): boolean {
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(raw) as PersistedState;
    return Array.isArray(state.tasks) && state.tasks.length > 0;
  } catch {
    return false;
  }
}

export function getPendingJobState(): { savedAt: string; tasks: Task[] } | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as PersistedState;
    return { savedAt: state.savedAt, tasks: state.tasks || [] };
  } catch {
    return null;
  }
}

/**
 * Saat startup: task PROCESSING yang tersimpan diubah statusnya menjadi QUEUED
 * (job nyata tidak di-resume otomatis — user memilih Resume/Retry/Cancel).
 */
export function restorePendingJobs(taskStore: TaskStore): Task[] {
  const state = getPendingJobState();
  if (!state) return [];
  const restored: Task[] = [];
  for (const t of state.tasks) {
    const existing = taskStore.get(t.id);
    if (existing) {
      taskStore.update(t.id, { status: "QUEUED", progress: 0, error: undefined });
      restored.push(taskStore.get(t.id)!);
    } else {
      const queued: Task = { ...t, status: "QUEUED", progress: 0, error: undefined };
      taskStore.add(queued);
      restored.push(queued);
    }
  }
  return restored;
}

/** Hapus task yang dibatalkan / diselesaikan dari state file. */
export function dismissPendingJobs(ids: string[]): void {
  try {
    const state = getPendingJobState();
    if (!state) return;
    state.tasks = state.tasks.filter((t) => !ids.includes(t.id));
    if (state.tasks.length === 0) {
      try { fs.unlinkSync(STATE_FILE); } catch {}
    } else {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    }
  } catch {}
}

export function clearJobState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch {}
}
