import type { NormalizedRequest } from "../types";
import { DEFAULT_PLATFORM } from "../registry/presets";
import { resolvePromptDefaults } from "./batch";
import { createIdleBatchQueue, createInitialVectorState } from "../state";

export function validateRequestIntake({ prompt, assetType, category, platform }: any) {
  const errors: string[] = [];
  const value = String(prompt || "").trim();
  if (!value) errors.push("PROMPT_EMPTY");
  else if (value.length < 3) errors.push("PROMPT_TOO_SHORT");
  if (!assetType) errors.push("ASSET_TYPE_MISSING");
  if (!category) errors.push("CATEGORY_MISSING");
  if (!platform) errors.push("PLATFORM_MISSING");
  return { valid: errors.length === 0, errors };
}

export function normalizeRequest(input: any): NormalizedRequest {
  const visualSettings = input?.visualSettings || {};
  return {
    prompt: String(input?.prompt || input?.singlePromptInput || "").trim(),
    assetType: input?.assetType || "vector",
    category: input?.category || input?.adobeCategory || input?.internalCategory || "",
    subcategory: input?.subcategory || "",
    style: input?.style || visualSettings.style || "",
    background: input?.background || visualSettings.background || "white",
    aspectRatio: input?.aspectRatio || visualSettings.aspectRatio || "4:3",
    platform: input?.platform || DEFAULT_PLATFORM,
    source: input?.source || "sidebar",
  };
}

export { validateImportedJSON } from "./batch";
import { validateImportedJSON } from "./batch";

export const processImportedJSON = (text: string, actions: any) => {
  const { setPasteJsonErrors, showToast, setImportedBatch, setBatchQueue, setVectorState, setImportPasteModalOpen, setPasteJsonInput, clearBatchProgress } = actions;
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch (err: any) {
    setPasteJsonErrors(["Invalid JSON format: " + err.message]);
    return;
  }
  try {
    const validation = validateImportedJSON(raw);

    if (!validation.valid) {
      setPasteJsonErrors(validation.errors);
      return;
    }

    // Tampilkan warnings sebagai info (tidak memblokir import)
    if (validation.warnings?.length > 0) {
      validation.warnings.forEach((w: string) => showToast(` ${w}`, "info"));
    }

    const resolvedPrompts = raw.prompts.map((p: any) => resolvePromptDefaults(p, raw.defaults || {}));

    setImportedBatch({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: raw.batch_name,
      description: raw.description || "",
      prompts: resolvedPrompts,
      totalPrompts: resolvedPrompts.length,
      currentIndex: 0,
      status: "ready",
      importedAt: Date.now(),
    });
    setBatchQueue(createIdleBatchQueue());
    setVectorState(createInitialVectorState());
    clearBatchProgress?.();

    setImportPasteModalOpen(false);
    setPasteJsonInput("");
    setPasteJsonErrors([]);
    showToast(`Batch "${raw.batch_name}" loaded (${resolvedPrompts.length} prompts) `, "success");
  } catch (err: any) {
    setPasteJsonErrors(["Import gagal: " + err.message]);
  }
};

// processImportedJSONFiles: gabung N file JSON valid jadi 1 importedBatch.
// Tiap item: { fileName, raw, batchName } (raw sudah di-JSON.parse + validate di caller).
// importedBatch.files = [{ fileName, batchName, promptCount, startIndex, endIndex, status: 'queued' }]
// importedBatch.prompts = flat gabungan file1 ++ file2 ++ ... (preserve order).
// importedBatch.name = nama file pertama (atau gabung singkat kalau nama beda-beda).
export const processImportedJSONFiles = (items: any[], actions: any) => {
  const { setImportPasteModalOpen, setPasteJsonErrors, showToast, setImportedBatch, setBatchQueue, setVectorState, clearBatchProgress } = actions;
  if (!items || items.length === 0) return;

  // Resolve semua prompts (tiap file sudah punya default-nya sendiri)
  const resolvedItems = items.map((it) => ({
    fileName: it.fileName,
    batchName: it.batchName,
    prompts: it.raw.prompts.map((p: any) => resolvePromptDefaults(p, it.raw.defaults || {})),
  }));

  // Flat prompts + track file boundaries
  let cursor = 0;
  const filesMeta: any[] = [];
  const flatPrompts: any[] = [];
  for (const it of resolvedItems) {
    const start = cursor;
    const end = cursor + it.prompts.length - 1;
    filesMeta.push({
      fileName: it.fileName,
      batchName: it.batchName,
      promptCount: it.prompts.length,
      startIndex: start,
      endIndex: end,
      status: "queued",
    });
    for (const p of it.prompts) flatPrompts.push(p);
    cursor = end + 1;
  }

  // Naming: pakai nama file pertama + suffix kalau ada duplikat batchName
  const nameCounts: Record<string, number> = {};
  for (const f of filesMeta) nameCounts[f.batchName] = (nameCounts[f.batchName] || 0) + 1;
  const seen: Record<string, number> = {};
  for (const f of filesMeta) {
    seen[f.batchName] = (seen[f.batchName] || 0) + 1;
    if (nameCounts[f.batchName] > 1) {
      f.displayBatchName = `${f.batchName} (${seen[f.batchName]})`;
    } else {
      f.displayBatchName = f.batchName;
    }
  }
  const displayName =
    resolvedItems.length === 1
      ? resolvedItems[0].batchName
      : resolvedItems.length <= 3
        ? resolvedItems.map((it) => it.batchName).join(" + ")
        : `${resolvedItems.slice(0, 2).map((it) => it.batchName).join(" + ")} + ${resolvedItems.length - 2} more`;

  setImportedBatch({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name: displayName,
    description: "",
    files: filesMeta,
    prompts: flatPrompts,
    totalPrompts: flatPrompts.length,
    currentIndex: 0,
    status: "ready",
    importedAt: Date.now(),
  });
  setBatchQueue(createIdleBatchQueue());
  setVectorState(createInitialVectorState());
  clearBatchProgress();
  setImportPasteModalOpen(false);
  setPasteJsonErrors([]);

  const totalFiles = filesMeta.length;
  const totalPrompts = flatPrompts.length;
  if (totalFiles === 1) {
    showToast(`Batch "${displayName}" loaded (${totalPrompts} prompts) `, "success");
  } else {
    showToast(`${totalFiles} file digabung → "${displayName}" (${totalPrompts} prompts) `, "success");
  }
};

// Template JSON for downloadCustomTemplate + format reference (v2.2).
// Sinkron dengan validateImportedJSON/resolvePromptDefaults (engines/batch.ts):
// iconQuantity hanya berlaku untuk sheet mode dan harus nilai ICON_GRID_OPTIONS
// (4/6/8/9/12/16/20/25) — contoh memakai sheet 6 (grid 3×2, ratio 4:3).
export const CUSTOM_TEMPLATE_JSON = {
  batch_name: "My Custom Batch",
  description: "Deskripsi batch opsional",
  platform: "adobe_stock",
  defaults: {
    background: "auto",
    outputFormat: "PNG",
    highDpiSharpness: true,
    negativeSpace: true,
    faceless: false,
    iconMode: false,
  },
  prompts: [
    {
      prompt: "Minimalist white retro surf van with a yellow surfboard on the roof",
      assetType: "vector",
      platformCategoryId: 20,
      subcategory: "Cars & Vehicles",
      style: "Flat Commercial",
      aspectRatio: "4:3",
    },
    {
      prompt: "Isometric home office setup with desk, monitor, plant and coffee mug",
      assetType: "3d",
      platformCategoryId: 19,
      subcategory: "Mobile & Devices",
      style: "Isometric 3D",
      aspectRatio: "1:1",
    },
    {
      prompt: "Christmas icon set with simple festive holiday symbols",
      assetType: "vector",
      platformCategoryId: 9,
      subcategory: "Christmas & Winter",
      style: "Flat Commercial",
      aspectRatio: "4:3",
      iconMode: true,
      iconStyle: "flat",
      iconGenerationMode: "sheet",
      iconQuantity: 6,
    },
  ],
};

export const downloadCustomTemplate = (showToast: (msg: string, type?: string) => void) => {
  const template = CUSTOM_TEMPLATE_JSON;
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "imagin_batch_template.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Template JSON didownload!", "success");
};
