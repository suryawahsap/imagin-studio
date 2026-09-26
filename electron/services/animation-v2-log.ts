import fs from "fs";
import path from "path";
import { storageRoot } from "../binaries/paths";

const LOG_DIR = path.join(storageRoot, "logs");
const LOG_FILE = path.join(LOG_DIR, "animation-v2.log");
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LINES = 800;

export interface V2LogEntry {
  ts: string;
  tempId?: string;
  taskId?: string;
  packageId?: string;
  phase: "enqueue" | "render_start" | "frame" | "encode" | "completed" | "failed" | "cancelled" | "guard_reject" | "clear";
  sha256?: string;
  formats?: string[];
  canvas?: string;
  frames?: number;
  durationMs?: number;
  totalMatches?: number;
  emitterWork?: number;
  progress?: number;
  error?: string;
  detail?: string;
}

function ensureDir(): void {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

function rotateIfNeeded(): void {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > MAX_BYTES) {
      const bak = `${LOG_FILE}.1`;
      try { fs.rmSync(bak, { force: true }); } catch {}
      try { fs.renameSync(LOG_FILE, bak); } catch {}
    }
  } catch {}
}

export function appendV2Log(entry: Omit<V2LogEntry, "ts"> & { ts?: string }): void {
  ensureDir();
  rotateIfNeeded();
  const payload: V2LogEntry = { ts: entry.ts || new Date().toISOString(), ...entry } as V2LogEntry;
  const line = JSON.stringify(payload);
  try { fs.appendFileSync(LOG_FILE, `${line}\n`, "utf-8"); } catch {}
}

export function readV2Logs(limit = 120): V2LogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, "utf-8").trim();
    if (!raw) return [];
    const lines = raw.split("\n").slice(-Math.min(limit, MAX_LINES));
    const out: V2LogEntry[] = [];
    for (const l of lines) {
      try { out.push(JSON.parse(l) as V2LogEntry); } catch {}
    }
    return out;
  } catch { return []; }
}

export function clearV2Logs(): void {
  try { fs.rmSync(LOG_FILE, { force: true }); } catch {}
  try { fs.rmSync(`${LOG_FILE}.1`, { force: true }); } catch {}
}
