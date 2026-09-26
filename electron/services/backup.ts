import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { getLibrary, addLibraryAsset, storageUrlToPath, persistLibrary } from "./library";
import { assetsRoot, exportsRoot, storageRoot, metadataRoot } from "../binaries/paths";

/**
 * Backup & Restore library (plan §10.6):
 * - exportLibrary() → ZIP di storage/exports/ berisi library-db.json + semua file aset
 * - importLibrary(zip) → unzip aset ke storage/, merge metadata (tidak menimpa id sama)
 */

const DB_FILE = "metadata/library-db.json";

export function exportLibraryBackup(): { ok: boolean; path?: string; detail?: string } {
  try {
    fs.mkdirSync(exportsRoot, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const zipPath = path.join(exportsRoot, `imagin-backup-${stamp}.zip`);
    const zip = new AdmZip();

    // Metadata
    const dbPath = path.join(metadataRoot, "library-db.json");
    if (fs.existsSync(dbPath)) {
      zip.addLocalFile(dbPath, "metadata");
    }

    // Semua file aset (storage/assets/**)
    const assetsDirs = [
      "images",
      "vectors",
      "eps",
      "upscaled",
      "animations",
      "videos",
      "audio",
    ];
    for (const dir of assetsDirs) {
      const srcDir = path.join(assetsRoot, dir);
      if (!fs.existsSync(srcDir)) continue;
      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const full = path.join(srcDir, file);
        if (!fs.statSync(full).isFile()) continue;
        zip.addLocalFile(full, `assets/${dir}`);
      }
    }

    zip.writeZip(zipPath);
    return { ok: true, path: zipPath };
  } catch (err: any) {
    return { ok: false, detail: err.message || "Backup gagal" };
  }
}

export function importLibraryBackup(zipPath: string): { ok: boolean; imported?: number; detail?: string } {
  try {
    if (!fs.existsSync(zipPath)) {
      return { ok: false, detail: "File ZIP tidak ditemukan" };
    }
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Ekstrak aset ke storage/assets/
    let extracted = 0;
    for (const entry of entries) {
      if (!entry.entryName.startsWith("assets/") || entry.isDirectory) continue;
      const rel = entry.entryName.replace(/^assets\//, "");
      // Cegah path traversal
      const safeRel = rel.replace(/^\/+/, "");
      const dest = path.resolve(assetsRoot, safeRel);
      if (!dest.startsWith(assetsRoot + path.sep)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, entry.getData());
      extracted++;
    }

    // Merge metadata dari library-db.json di dalam ZIP
    let importedCount = 0;
    const dbEntry = entries.find(
      (e) => e.entryName === "metadata/library-db.json"
    );
    if (dbEntry) {
      const data = JSON.parse(dbEntry.getData().toString("utf-8"));
      const existing = getLibrary();
      const existingIds = new Set(existing.map((a) => a.id));
      for (const asset of data.assets || []) {
        if (existingIds.has(asset.id)) continue;
        // Verifikasi file aset masih ada setelah ekstrak
        const filePath = storageUrlToPath(asset.url);
        if (!filePath || !fs.existsSync(filePath)) continue;
        addLibraryAsset(asset);
        existingIds.add(asset.id);
        importedCount++;
      }
    }

    persistLibrary();
    return { ok: true, imported: importedCount, detail: `${extracted} file aset diekstrak, ${importedCount} aset baru diimpor` };
  } catch (err: any) {
    return { ok: false, detail: err.message || "Import gagal" };
  }
}

export function getExportsDir(): string {
  return exportsRoot;
}

export function getStorageRoot(): string {
  return storageRoot;
}
