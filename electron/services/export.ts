/**
 * Unified export service (perbaikan.md §19, §47–48).
 * Native save dialog + copy file + ZIP batch + Show in Folder.
 * Frontend tidak boleh tahu path filesystem — semua via IPC.
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { dialog, shell, BrowserWindow } from "electron";
import { storageUrlToPath } from "./library";
import { exportsRoot } from "../binaries/paths";

export interface ExportResult {
  success: boolean;
  path?: string;
  detail?: string;
  canceled?: boolean;
}

/** Resolve asset URL → path lokal (dari storage). */
function resolveAssetPath(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/storage/")) return storageUrlToPath(url);
  return null;
}

/** Nama file aman (tanpa path traversal). */
function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").slice(0, 120);
}

/** Buka save dialog native dan salin file dari internal storage ke tujuan. */
export async function exportAsset(
  win: BrowserWindow | null,
  url: string,
  suggestedName?: string
): Promise<ExportResult> {
  const srcPath = resolveAssetPath(url);
  if (!srcPath || !fs.existsSync(srcPath)) {
    return { success: false, detail: "File aset tidak ditemukan di storage" };
  }

  const ext = path.extname(srcPath);
  const defaultName = safeFileName(suggestedName || path.basename(srcPath));

  const result = win
    ? await dialog.showSaveDialog(win, {
        title: "Export aset",
        defaultPath: path.join(exportsRoot, defaultName),
        filters: [{ name: "File", extensions: [ext.replace(".", "") || "png"] }],
      })
    : await dialog.showSaveDialog({
        title: "Export aset",
        defaultPath: path.join(exportsRoot, defaultName),
      });

  if (result.canceled || !result.filePath) {
    return { success: true, canceled: true };
  }

  try {
    fs.mkdirSync(path.dirname(result.filePath), { recursive: true });
    fs.copyFileSync(srcPath, result.filePath);
    return { success: true, path: result.filePath };
  } catch (err: any) {
    return { success: false, detail: err?.message || "Gagal menyalin file" };
  }
}

/** Export batch ke ZIP (semua aset terpilih). */
export async function exportZip(
  win: BrowserWindow | null,
  items: Array<{ url: string; name: string }>
): Promise<ExportResult> {
  if (!items || items.length === 0) return { success: false, detail: "Tidak ada aset untuk diexport" };

  const result = win
    ? await dialog.showSaveDialog(win, {
        title: "Export batch (ZIP)",
        defaultPath: path.join(exportsRoot, `imagin-export-${Date.now()}.zip`),
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      })
    : await dialog.showSaveDialog({
        title: "Export batch (ZIP)",
        defaultPath: path.join(exportsRoot, `imagin-export-${Date.now()}.zip`),
      });

  if (result.canceled || !result.filePath) return { success: true, canceled: true };

  try {
    const zip = new AdmZip();
    for (const item of items) {
      const src = resolveAssetPath(item.url);
      if (src && fs.existsSync(src)) {
        zip.addLocalFile(src, "", safeFileName(item.name || path.basename(src)));
      }
    }
    const files = zip.getEntries().length;
    if (files === 0) return { success: false, detail: "Tidak ada file valid di dalam batch" };
    zip.writeZip(result.filePath);
    return { success: true, path: result.filePath, detail: `${files} file` };
  } catch (err: any) {
    return { success: false, detail: err?.message || "Gagal membuat ZIP" };
  }
}

/** Show in Folder — reveal file di file manager (explorer/finder/nautilus). */
export async function showInFolder(win: BrowserWindow | null, url: string): Promise<ExportResult> {
  const srcPath = resolveAssetPath(url);
  if (!srcPath || !fs.existsSync(srcPath)) {
    return { success: false, detail: "File aset tidak ditemukan" };
  }
  shell.showItemInFolder(srcPath);
  return { success: true, path: srcPath };
}
