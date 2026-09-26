import fs from "fs";
import path from "path";
import { importsRoot } from "../binaries/paths";

/**
 * Import watcher (plan §10.5):
 * fs.watch(importsRoot) → file PNG/JPG/WEBP/SVG baru otomatis masuk antrian import.
 * Debounce 500ms; emit via callback onChanged.
 */

const SUPPORTED = /\.(png|jpe?g|webp|svg)$/i;

let watcher: fs.FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let lastEmit = 0;

export function startImportWatcher(onChanged: () => void): void {
  stopImportWatcher();
  if (!fs.existsSync(importsRoot)) {
    try { fs.mkdirSync(importsRoot, { recursive: true }); } catch {}
  }
  try {
    watcher = fs.watch(importsRoot, (_event, filename) => {
      if (!filename) return;
      const name = String(filename);
      if (!SUPPORTED.test(name)) return;
      // Debounce — beberapa file masuk sekaligus
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // Jangan emit jika tidak ada perubahan nyata (file mungkin partial)
        const now = Date.now();
        if (now - lastEmit < 400) return;
        lastEmit = now;
        onChanged();
      }, 500);
    });
    watcher.on("error", (err) => {
      console.error("[IMPORT-WATCHER] error:", err);
    });
  } catch (err) {
    console.error("[IMPORT-WATCHER] cannot watch:", err);
  }
}

export function stopImportWatcher(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  if (watcher) {
    try { watcher.close(); } catch {}
    watcher = null;
  }
}
