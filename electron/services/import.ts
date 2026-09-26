import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { ImportItem } from "../types";
import { dirs, importsRoot } from "../binaries/paths";

export function parseImportZip(zipPath: string): ImportItem[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  let manifest: any = null;
  const fileEntries: { entry: AdmZip.IZipEntry; ext: string }[] = [];

  for (const entry of entries) {
    const name = entry.entryName;
    if (name === "manifest.json") {
      manifest = JSON.parse(entry.getData().toString("utf-8"));
    } else if (name.startsWith("assets/") && !name.endsWith("/")) {
      const ext = path.extname(name).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".html", ".css"].includes(ext)) {
        fileEntries.push({ entry, ext });
      }
    }
  }

  // Index nama file gambar untuk pairing .html/.css
  const imageBaseNames = new Set(
    fileEntries
      .filter(({ ext }) => [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext))
      .map(({ entry }) => path.basename(entry.entryName, path.extname(entry.entryName)).toLowerCase())
  );

  const items: ImportItem[] = [];

  for (const { entry, ext } of fileEntries) {
    const buf = entry.getData();
    const mimeType = detectMimeType(buf, ext);
    const dims = imageDimensionsFromBuffer(buf);
    const baseName = path.basename(entry.entryName, ext);
    const tempId = assignImportId();
    const tmpPath = path.join(importsRoot, `${tempId}${ext}`);
    fs.writeFileSync(tmpPath, buf);

    let metadata: Record<string, unknown> | null = null;
    if (manifest?.assets) {
      const match = manifest.assets.find((a: any) => a.id === baseName || a.file === entry.entryName);
      if (match) metadata = match;
    }
    const jsonEntry = entries.find((e) => e.entryName === `assets/${baseName}.json`);
    if (jsonEntry) {
      try {
        const jsonMeta = JSON.parse(jsonEntry.getData().toString("utf-8"));
        metadata = { ...(metadata || {}), ...jsonMeta };
      } catch {}
    }
    if (!metadata && manifest?.defaultMetadata) {
      metadata = { ...manifest.defaultMetadata };
    }

    const isCode = ext === ".html" || ext === ".css";
    // Pairing: base name code cocok dengan gambar di ZIP
    const paired = isCode && imageBaseNames.has(baseName.toLowerCase())
      ? `${baseName}${findImageExt(baseName, fileEntries) || ".png"}`
      : undefined;

    items.push({
      tempId,
      originalName: entry.entryName.split("/").pop() || baseName + ext,
      fileName: `${tempId}${ext}`,
      filePath: tmpPath,
      mimeType,
      fileSize: buf.length,
      width: isCode ? 0 : dims.width,
      height: isCode ? 0 : dims.height,
      assetType: isCode ? "unknown" : detectAssetType(mimeType, metadata),
      metadata,
      codeType: isCode ? (ext === ".html" ? "html" : "css") : undefined,
      pairedWith: paired,
    });
  }

  return items;
}

function findImageExt(baseName: string, entries: { entry: AdmZip.IZipEntry; ext: string }[]): string | null {
  const found = entries.find(
    ({ entry, ext }) =>
      [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext) &&
      path.basename(entry.entryName, ext).toLowerCase() === baseName.toLowerCase()
  );
  return found ? found.ext : null;
}

export function analyzeSingleFile(filePath: string, originalName: string): ImportItem {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = detectMimeType(buf, ext);
  const dims = imageDimensionsFromBuffer(buf);
  const tempId = assignImportId();
  const tmpName = `${tempId}${ext || ".png"}`;
  const tmpPath = path.join(importsRoot, tmpName);
  fs.copyFileSync(filePath, tmpPath);

  return {
    tempId,
    originalName,
    fileName: tmpName,
    filePath: tmpPath,
    mimeType,
    fileSize: buf.length,
    width: dims.width,
    height: dims.height,
    assetType: detectAssetType(mimeType, null),
    metadata: null,
  };
}

export function buildSummary(items: ImportItem[]): { total: number; vector: number; illustration: number; "3d": number; unknown: number } {
  return {
    total: items.length,
    vector: items.filter((i) => i.assetType === "vector").length,
    illustration: items.filter((i) => i.assetType === "illustration").length,
    "3d": items.filter((i) => i.assetType === "3d").length,
    unknown: items.filter((i) => i.assetType === "unknown").length,
  };
}

export function commitImportedAssets(items: ImportItem[], sourceJobId: string): Array<Record<string, unknown>> {
  const assets: Array<Record<string, unknown>> = [];

  // filePath mungkin tidak dikirim via IPC (hanya tempId/fileName) — resolve dari importsRoot
  const resolvePath = (item: ImportItem): string => {
    if (item.filePath && fs.existsSync(item.filePath)) return item.filePath;
    const fallback = path.join(importsRoot, item.fileName || `${item.tempId}`);
    return fs.existsSync(fallback) ? fallback : item.filePath || "";
  };

  for (const item of items) {
    const srcPath = resolvePath(item);
    if (!srcPath) {
      console.error("[IMPORT] path tidak ditemukan untuk", item.originalName);
      continue;
    }
    const isCode = item.codeType === "html" || item.codeType === "css";

    if (isCode) {
      // Aset code HTML/CSS — simpan ke storage/assets/html/
      const ext = item.codeType === "html" ? ".html" : ".css";
      const slug = (item.originalName || "code").replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
      const finalName = `${slug}_${item.tempId}${ext}`;
      const storedName = safeCopyFile(srcPath, dirs.html, finalName);
      const url = `/storage/assets/html/${storedName}`;
      const code = fs.readFileSync(path.join(dirs.html, storedName), "utf-8");
      assets.push({
        id: `import-${item.tempId}`,
        type: "HTML",
        name: finalName,
        url,
        folder: "storage/assets/html",
        sourceModule: "SYSTEM",
        sourceJobId,
        mimeType: item.codeType === "html" ? "text/html" : "text/css",
        fileSize: `${(item.fileSize / 1024).toFixed(1)} KB`,
        tags: [item.codeType === "html" ? "HTML" : "CSS", "Studio"],
        createdAt: new Date().toISOString(),
        prompt: item.originalName,
        settings: {
          code,
          pairedWith: item.pairedWith,
          importedAt: new Date().toISOString(),
        },
      });
      try { fs.unlinkSync(item.filePath); } catch {}
      continue;
    }

    const isSvg = item.mimeType === "image/svg+xml";
    const assetType = isSvg ? "VECTOR" : "IMAGE";
    const destDir = isSvg ? dirs.vectors : dirs.images;
    const ext = isSvg ? ".svg" : ".png";
    const baseSlug = (item.metadata?.prompt as string) || item.originalName;
    const slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
    const finalName = `${slug}_${item.tempId}${ext}`;
    const storedName = safeCopyFile(srcPath, destDir, finalName);
    const url = `/${isSvg ? "storage/assets/vectors" : "storage/assets/images"}/${storedName}`;
    const sizeMb = (item.fileSize / (1024 * 1024)).toFixed(2);

    const meta = item.metadata || {};
    const tags: string[] = [item.assetType === "unknown" ? "Imported" : item.assetType.charAt(0).toUpperCase() + item.assetType.slice(1)];
    if (meta.engine) tags.push(String(meta.engine));
    if (meta.style) tags.push(String(meta.style));

    assets.push({
      id: `import-${item.tempId}`,
      type: assetType,
      name: finalName,
      url,
      thumbnailUrl: isSvg ? null : url,
      folder: isSvg ? "storage/assets/vectors" : "storage/assets/images",
      sourceModule: "VECTOR",
      sourceJobId,
      mimeType: item.mimeType,
      fileSize: `${sizeMb} MB`,
      resolution: item.width && item.height ? `${item.width}x${item.height}` : undefined,
      tags,
      createdAt: new Date().toISOString(),
      prompt: meta.prompt || item.originalName,
      settings: {
        style: meta.style,
        category: meta.category,
        subcategory: meta.subcategory,
        background: meta.background,
        aspectRatio: meta.aspectRatio,
        engine: meta.engine,
        generationMode: meta.generationMode,
        importedAt: new Date().toISOString(),
      },
    });

    try { fs.unlinkSync(item.filePath); } catch {}
  }

  return assets;
}

function assignImportId(): string {
  return `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function safeCopyFile(src: string, destDir: string, filename: string): string {
  fs.mkdirSync(destDir, { recursive: true });
  let finalName = filename;
  const destPath = path.join(destDir, finalName);
  if (fs.existsSync(destPath)) {
    const ext = path.extname(finalName);
    const base = path.basename(finalName, ext);
    finalName = `${base}_${Date.now()}${ext}`;
  }
  fs.copyFileSync(src, path.join(destDir, finalName));
  return finalName;
}

function imageDimensionsFromBuffer(buf: Buffer): { width: number; height: number } {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      }
      const segLen = buf.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }
  if (buf[0] === 0x3c) {
    const str = buf.toString("utf8", 0, Math.min(buf.length, 4096));
    const vm = str.match(/viewBox\s*=\s*["']\d+\s+\d+\s+(\d+)\s+(\d+)["']/i);
    if (vm) return { width: parseInt(vm[1]), height: parseInt(vm[2]) };
  }
  return { width: 0, height: 0 };
}

function detectMimeType(buf: Buffer, ext: string): string {
  if (ext === ".html") return "text/html";
  if (ext === ".css") return "text/css";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  if (buf[0] === 0x3c || ext === ".svg") return "image/svg+xml";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return "application/zip";
  return "application/octet-stream";
}

function detectAssetType(mimeType: string, metadata: Record<string, unknown> | null): "vector" | "illustration" | "3d" | "unknown" {
  if (metadata?.assetType === "vector" || metadata?.assetType === "illustration" || metadata?.assetType === "3d") {
    return metadata.assetType as "vector" | "illustration" | "3d";
  }
  if (mimeType === "image/svg+xml") return "vector";
  const style = typeof metadata?.style === "string" ? metadata.style.toLowerCase() : "";
  if (style.includes("3d") || style.includes("clay") || style.includes("render")) return "3d";
  return "illustration";
}
