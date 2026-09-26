import fs from "fs";
import path from "path";
import { metadataRoot } from "../binaries/paths";

/**
 * Batch-resume persistence — single JSON file, atomic write, 24h TTL.
 * Not part of studio-store.ts's whitelist (batches are explicitly out of
 * scope there); this is its own tiny file since the shape (one blob + TTL,
 * not an item array) doesn't fit that envelope.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

let storeRoot = path.join(metadataRoot, "studio");

/** Test-only hook: point the store at an isolated directory. */
export function setBatchResumeRoot(dir: string): void {
  storeRoot = dir;
}

export function getBatchResumeRoot(): string {
  return storeRoot;
}

function filePath(): string {
  return path.join(storeRoot, "batch-resume.json");
}

function atomicWrite(file: string, data: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  try {
    fs.writeFileSync(tmp, data, "utf-8");
    fs.renameSync(tmp, file);
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

export function getBatchResume(): Record<string, unknown> | null {
  const file = filePath();
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`Failed to read batch resume: ${(err as Error).message || "unknown error"}`);
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const savedAt = typeof data.savedAt === "number" ? data.savedAt : 0;
  if (Date.now() - savedAt > TTL_MS) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
    return null;
  }
  return data;
}

export function setBatchResume(data: Record<string, unknown> | null): void {
  const file = filePath();
  if (data === null) {
    try {
      fs.unlinkSync(file);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return;
  }
  atomicWrite(file, JSON.stringify({ ...data, savedAt: Date.now() }));
}
