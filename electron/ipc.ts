import { ipcMain, BrowserWindow, webUtils, dialog } from "electron";
import fs from "fs";
import path from "path";
import { TaskStore, JobQueue } from "./services/job_queue";
import { MetadataQueue } from "./services/metadata_queue";
import { createMetadataEngine } from "./services/metadata_engine";
import { VectorJobItem, UpscaleJobItem, Task, LibraryAsset, ImportItem } from "./types";
import * as libraryService from "./services/library";
import * as vectorizeService from "./services/vec/vec-run";
import { AssetType } from "./services/vec/vec-analyze";
import * as upscaleService from "./services/ups/ups-run";
import { isValidUpscaleQueueItem, isValidUpscaleTileSize } from "./services/ups/ups-validate";
import * as animationService from "./services/animation-renderer";
import * as backupService from "./services/backup";
import * as jobStateService from "./services/job_state";
import * as settingsService from "./services/settings";
import { getDecryptedNineRouterKey, getStudioConfig } from "./services/settings";
import * as importService from "./services/import";
import * as studioStore from "./services/studio-store";
import * as batchResume from "./services/batch-resume";
import * as exportService from "./services/export";
import * as animationV2Import from "./services/animation-v2-import";
import { importsRoot, dirs } from "./binaries/paths";
import { classify9RouterModels, isValid9RouterModel, isValid9RouterModelCatalog, normalize9RouterBaseUrl, normalize9RouterImageEndpoint, parse9RouterImageResponse, sanitize9RouterModelCatalog } from "./services/9router-models";

const MAX_DIMENSION = 16384;
const MAX_SCALE = 8;
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finiteNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const validDimension = (value: unknown): value is number => finiteNumber(value, 1, MAX_DIMENSION) && Number.isInteger(value);
const validString = (value: unknown, max = 4096): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const validFile = (value: unknown): value is { path: string; name: string } =>
  isRecord(value) && validString(value.path, 4096) && path.isAbsolute(value.path) && validString(value.name, 512);
const resolveStoredFilename = (root: string, url: unknown, extension?: RegExp): string | null => {
  if (!validString(url, 4096)) return null;
  let filename: string;
  try { filename = decodeURIComponent(url.split(/[/?#]/).pop() || ""); } catch { return null; }
  if (!filename || filename !== path.basename(filename) || filename.includes("\\") || (extension && !extension.test(filename))) return null;
  const resolved = path.resolve(root, filename);
  return resolved.startsWith(`${path.resolve(root)}${path.sep}`) ? resolved : null;
};
const validScale = (value: unknown): value is string => typeof value === "string" && ["2x", "3x", "4x", "custom", "4k", "6k", "8k"].includes(value);
const validEngine = (value: unknown): value is "auto" | "realesrgan" | "waifu2x" => value === undefined || ["auto", "realesrgan", "waifu2x"].includes(value as string);
const validOutputFormat = (value: unknown): value is "png" | "jpeg" | "webp" => value === undefined || ["png", "jpeg", "webp"].includes(value as string);
const unlinkOwnedTemp = (filePath: string): void => {
  const root = path.resolve(importsRoot);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${root}${path.sep}`)) return;
  try { fs.unlinkSync(resolved); } catch {}
};

// ── Studio provider helpers (dipanggil dari handler studio:generate) ──────────

/**
 * Ekstrak teks prompt dari Gemini payload format.
 * Mengabaikan baris yang dimulai dengan "Negative:".
 */
function extractPromptText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const p = payload as any;
  const parts: any[] = p?.contents?.[0]?.parts ?? [];
  return parts
    .filter((part: any) => typeof part.text === "string" && !part.text.startsWith("Negative:"))
    .map((part: any) => part.text)
    .join(" ")
    .trim();
}

const DEFAULT_9ROUTER_BASE_URL = "https://9router.rahmatur.dev";
const DEFAULT_9ROUTER_IMAGE_ENDPOINT = "https://9router.rahmatur.dev/v1/images/generations";
const get9RouterBaseUrl = (): string =>
  normalize9RouterBaseUrl(getStudioConfig().nineRouterBaseUrl || DEFAULT_9ROUTER_BASE_URL) || DEFAULT_9ROUTER_BASE_URL;

type StudioConnectionInput = { apiKey?: string; baseUrl: string };
type StudioModelsResult = { success: boolean; textModels: string[]; imageModels: string[]; models: Array<{ id: string; classified: "text" | "image" }>; imageSource?: "kind-endpoint" | "heuristic"; detail?: string };

const getStudioConnection = (input?: StudioConnectionInput): { key: string; modelsUrl: string } | { detail: string } => {
  if (input !== undefined && (!isRecord(input) || !validString(input.baseUrl, 2048) ||
      (input.apiKey !== undefined && (typeof input.apiKey !== "string" || input.apiKey.length > 8000)))) {
    return { detail: "Invalid 9Router connection settings" };
  }
  const baseUrl = normalize9RouterBaseUrl(input?.baseUrl ?? getStudioConfig().nineRouterBaseUrl ?? DEFAULT_9ROUTER_BASE_URL);
  if (!baseUrl) return { detail: "Base URL must be a valid HTTP(S) URL" };
  const key = input?.apiKey?.trim() || getDecryptedNineRouterKey();
  if (!key) return { detail: "9Router API key required" };
  return { key, modelsUrl: `${baseUrl}/v1/models` };
};

const fetch9RouterModels = async (input?: StudioConnectionInput): Promise<StudioModelsResult> => {
  const connection = getStudioConnection(input);
  if ("detail" in connection) return { success: false, textModels: [], imageModels: [], models: [], detail: connection.detail };
  try {
    const res = await fetch(connection.modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${connection.key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { success: false, textModels: [], imageModels: [], models: [], detail: `9Router returned HTTP ${res.status}` };
    const json: unknown = await res.json();
    if (!isRecord(json) || !Array.isArray(json.data)) {
      return { success: false, textModels: [], imageModels: [], models: [], detail: "9Router returned an invalid models response" };
    }
    let imageData: unknown[] = [];
    let imageSource: "kind-endpoint" | "heuristic" = "heuristic";
    try {
      const imageRes = await fetch(`${connection.modelsUrl}/image`, {
        method: "GET",
        headers: { Authorization: `Bearer ${connection.key}` },
        signal: AbortSignal.timeout(15000),
      });
      if (imageRes.ok) {
        const imageJson: unknown = await imageRes.json();
        if (isRecord(imageJson) && Array.isArray(imageJson.data)) {
          imageData = imageJson.data;
          imageSource = "kind-endpoint";
        }
      }
    } catch {
      // Older gateways may not implement the kind endpoint; heuristic discovery remains usable.
    }
    return { success: true, ...classify9RouterModels(json.data, imageData), imageSource };
  } catch {
    return { success: false, textModels: [], imageModels: [], models: [], detail: "Unable to connect to 9Router" };
  }
};

// Quota headers LiteLLM (pola server.ts) — budget/spend/ratelimit tampil di Test Koneksi
type QuotaMeta = { maxBudget: number | null; spend: number | null; remainingBudget: number | null; rateLimitLimit: string | null; rateLimitRemaining: string | null; lastCost: number | null };
const extractQuotaHeaders = (headersObj: Headers): QuotaMeta => {
  const getH = (name: string) => headersObj.get(name) || headersObj.get(`llm_provider-${name}`) || null;
  const maxBudgetStr = getH('x-litellm-key-max-budget') || getH('x-key-max-budget');
  const spendStr = getH('x-litellm-key-spend') || getH('x-key-spend');
  const rateLimitStr = getH('x-ratelimit-limit-requests') || getH('x-ratelimit-limit');
  const rateRemainingStr = getH('x-ratelimit-remaining-requests') || getH('x-ratelimit-remaining');
  const costStr = getH('x-litellm-response-cost');
  const maxBudget = maxBudgetStr ? parseFloat(maxBudgetStr) : null;
  const spend = spendStr ? parseFloat(spendStr) : null;
  return {
    maxBudget, spend,
    remainingBudget: (maxBudget !== null && spend !== null) ? Math.max(0, maxBudget - spend) : null,
    rateLimitLimit: rateLimitStr, rateLimitRemaining: rateRemainingStr,
    lastCost: costStr ? parseFloat(costStr) : null,
  };
};
const formatQuota = (q: QuotaMeta | null): string => {
  if (!q) return "";
  const parts: string[] = [];
  if (q.remainingBudget !== null && q.maxBudget !== null) parts.push(`budget $${q.remainingBudget.toFixed(2)}/$${q.maxBudget.toFixed(2)}`);
  else if (q.spend !== null) parts.push(`spend $${q.spend.toFixed(3)}`);
  if (q.rateLimitRemaining) parts.push(`ratelimit ${q.rateLimitRemaining}${q.rateLimitLimit ? `/${q.rateLimitLimit}` : ""}`);
  if (q.lastCost !== null) parts.push(`cost $${q.lastCost.toFixed(4)}`);
  return parts.join(" · ");
};

/**
 * Panggil 9Router API (OpenAI-compatible image generation).
 * API key diambil dari main process — tidak pernah dikirim ke renderer.
 * Response dikonversi ke format Gemini agar generation.ts tidak perlu diubah.
 */
// Ladder retry paritas canvas fetchWithRetry: maks 3 percobaan; wait 1s→2s hanya bila
// masih ada sisa retry; retry utk HTTP >=500 dan throw/timeout; 4xx (termasuk 429 yang
// punya jalur sendiri) return cepat. onApiCall terjadi di renderer per-request, jadi
// retry di sini tidak menggandakan hitungan API.
async function with5xxLadder<T extends { success: boolean; status?: number }>(req: () => Promise<T>): Promise<T> {
  const waits = [1000, 2000];
  let attempt = 0;
  for (;;) {
    let r: T;
    try {
      r = await req();
    } catch (err) {
      if (attempt >= waits.length) throw err;
      await new Promise((res) => setTimeout(res, waits[attempt++]));
      continue;
    }
    if (r.success || !(r.status && r.status >= 500)) return r;
    if (attempt >= waits.length) return r;
    await new Promise((res) => setTimeout(res, waits[attempt++]));
  }
}

async function studioGenerate9Router(
  payload: unknown,
  imageModel?: string,
  timeoutMs?: number
): Promise<{ success: boolean; response?: unknown; status?: number; detail?: string; quota?: QuotaMeta }> {
  const key = getDecryptedNineRouterKey();
  if (!key) {
    return { success: false, detail: "9Router API key required (atur di Settings Studio)" };
  }

  const prompt = extractPromptText(payload);
  if (!prompt) {
    return { success: false, detail: "Prompt tidak dapat diekstrak dari payload" };
  }

  // Request tunggal — {success:true,b64} | {success:false,status?,detail}
  const doRequest = async (): Promise<{ success: true; b64: string; quota?: QuotaMeta } | { success: false; status?: number; detail: string; quota?: QuotaMeta }> => {
    const ac = timeoutMs ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), timeoutMs) : null;
    const imageEndpoint = normalize9RouterImageEndpoint(getStudioConfig().nineRouterImageEndpoint) || DEFAULT_9ROUTER_IMAGE_ENDPOINT;
    const res = await fetch(imageEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: isValid9RouterModel(imageModel) ? imageModel : "ag/gemini-3.1-flash-image",
        prompt,
        n: 1,
        size: "auto",
        quality: "auto",
        background: "auto",
        image_detail: "high",
        output_format: "png",
      }),
      signal: ac?.signal,
    }).finally(() => { if (timer) clearTimeout(timer); });

    const quota = extractQuotaHeaders(res.headers);
    const text = await res.text();
    if (!res.ok) return { success: false, status: res.status, detail: text.slice(0, 800), quota };

    const json: any = parse9RouterImageResponse(res.headers.get("content-type"), text);
    if (!json) {
      return { success: false, detail: "9Router: response bukan JSON valid", quota };
    }
    // Gateway bisa balas error JSON (mis. 429 quota upstream) — surface pesan aslinya
    if (json?.error) {
      return { success: false, status: json.error.code ?? res.status, detail: `9Router: ${String(json.error.message || JSON.stringify(json.error)).slice(0, 400)}`, quota };
    }

    const item = json?.data?.[0];
    if (!item) return { success: false, detail: "9Router: data kosong dalam response" };

    let b64: string | null = item.b64_json || null;
    if (!b64 && item.url) {
      try {
        const imgRes = await fetch(item.url);
        if (!imgRes.ok) throw new Error(`fetch image URL failed: ${imgRes.status}`);
        const buffer = await imgRes.arrayBuffer();
        b64 = Buffer.from(buffer).toString("base64");
      } catch (err: any) {
        return { success: false, detail: `9Router: gagal fetch image URL — ${err.message}` };
      }
    }
    if (!b64) return { success: false, detail: "9Router: tidak ada b64_json maupun url dalam response", quota };
    return { success: true, b64, quota };
  };

  try {
    let r = await with5xxLadder(doRequest);
    // 429 = rate limit upstream window pendek (pesan gateway: "retry in ~10s, reset after 16s")
    // — tunggu lalu retry SEKALI agar 1x generate tidak langsung gagal.
    if (!r.success && r.status === 429) {
      await new Promise((res) => setTimeout(res, 12000));
      r = await doRequest();
    }
    if (!r.success) return { success: false, status: r.status, detail: r.detail, quota: r.quota };

    return {
      success: true,
      quota: r.quota,
      response: {
        candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: r.b64 } }] } }],
        _provider: "9router",
      },
    };
  } catch (err: any) {
    return { success: false, detail: err?.message || "9Router network error" };
  }
}

/**
 * Panggil 9Router text/vision (OpenAI-compatible /v1/chat/completions).
 * Payload renderer masih format Gemini (generateContent) — dikonversi bolak-balik
 * di sini agar engines/ renderer tidak perlu diubah. Vision: inlineData → image_url
 * data URL (diverifikasi gateway, 2026-08-31).
 */
async function studioGenerate9RouterText(
  payload: unknown,
  textModel?: string,
  timeoutMs?: number
): Promise<{ success: boolean; response?: unknown; status?: number; detail?: string; quota?: QuotaMeta }> {
  const key = getDecryptedNineRouterKey();
  if (!key) {
    return { success: false, detail: "9Router API key required (atur di Settings Studio)" };
  }

  const p = payload as any;
  const messages: unknown[] = [];
  const sys = p?.systemInstruction;
  const sysText = typeof sys === "string" ? sys : Array.isArray(sys?.parts) ? sys.parts.map((x: any) => x?.text || "").filter(Boolean).join("\n") : "";
  if (sysText) messages.push({ role: "system", content: sysText });

  const toContent = (parts: any[]): any => {
    type ConvPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
    const conv = (parts || []).map((part: any): ConvPart | null => {
      if (typeof part?.text === "string") return { type: "text", text: part.text };
      if (part?.inlineData?.data) return { type: "image_url", image_url: { url: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}` } };
      return null;
    }).filter((x): x is ConvPart => x !== null);
    return conv.length === 1 && conv[0].type === "text" ? conv[0].text : conv;
  };

  for (const c of Array.isArray(p?.contents) ? p.contents : []) {
    const role = c?.role === "model" ? "assistant" : "user";
    if (c?.parts) messages.push({ role, content: toContent(c.parts) });
    else if (typeof c?.text === "string") messages.push({ role, content: c.text });
  }

  const model = isValid9RouterModel(textModel) ? textModel : "ag/gemini-2.5-flash";
  const reqBody: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };
  const gen = p?.generationConfig;
  if (gen?.temperature !== undefined) reqBody.temperature = gen.temperature;
  if (gen?.maxOutputTokens !== undefined) reqBody.max_tokens = gen.maxOutputTokens;

  const attemptText = async (): Promise<{ success: boolean; response?: unknown; status?: number; detail?: string; quota?: QuotaMeta }> => {
    const ac = timeoutMs ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), timeoutMs) : null;
    const res = await fetch(`${get9RouterBaseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(reqBody),
      signal: ac?.signal,
    }).finally(() => { if (timer) clearTimeout(timer); });

    const quota = extractQuotaHeaders(res.headers);
    const text = await res.text();
    if (!res.ok) return { success: false, status: res.status, detail: text.slice(0, 800), quota };

    let json: any;
    try { json = JSON.parse(text); } catch {
      return { success: false, detail: "9Router: response bukan JSON valid", quota };
    }
    if (json?.error) {
      return { success: false, status: json.error.code ?? res.status, detail: `9Router: ${String(json.error.message || JSON.stringify(json.error)).slice(0, 400)}`, quota };
    }

    // OpenAI → Gemini-compat (renderer membaca candidates[0].content.parts[0].text)
    const msg = json?.choices?.[0]?.message;
    const raw = msg?.content;
    const outText = typeof raw === "string" ? raw
      : Array.isArray(raw) ? raw.map((c: any) => c?.text || "").filter(Boolean).join("\n")
      : "";
    if (!outText) return { success: false, detail: "9Router: konten kosong dalam response" };

    return { success: true, quota, response: { candidates: [{ content: { parts: [{ text: outText }] } }], _provider: "9router" } };
  };

  try {
    return await with5xxLadder(attemptText);
  } catch (err: any) {
    return { success: false, detail: err?.message || "9Router network error" };
  }
}

export function registerIpc(getWindow: () => BrowserWindow | null, taskStore: TaskStore): void {
  const broadcast = (channel: string, payload: unknown): void => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  // ── Job queues ─────────────────────────────────────────────
  const vectorQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
    vectorizeService.runVectorizeJob(data.tempId, taskId, taskStore, (job) => {
      broadcast("vector:job-update", job);
      broadcast("task:progress", { taskId, status: job.status, error: job.error });
      if (job.status === "completed" || job.status === "failed") {
        broadcast("library:updated", true);
      }
    }),
    { concurrency: 1 } // vtracer CPU-intensive — tetap sequential
  );

  const upscaleQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
    upscaleService.runUpscaleJob(data.tempId, taskId, taskStore, (job) => {
      broadcast("upscale:job-update", job);
      broadcast("task:progress", { taskId, status: job.status, error: job.error });
      if (job.status === "completed" || job.status === "failed") {
        broadcast("library:updated", true);
      }
    }),
    { concurrency: 1 } // GPU-bound — intentionally serial
  );

  const animationQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
    animationService.runAnimationJob(data.tempId, taskId, taskStore, (job) => {
      broadcast("animation:job-update", job);
      broadcast("task:progress", { taskId, status: job.status, error: job.error });
      if (job.status === "completed" || job.status === "failed") {
        broadcast("library:updated", true);
      }
    })
  );
  const animationV2Queue = new JobQueue<{ tempId: string }>((data, taskId) =>
    animationService.runAnimationJob(data.tempId, taskId, taskStore, (job) => { broadcast("animation:job-update", job); broadcast("task:progress", { taskId, status: job.status, error: job.error }); if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") broadcast("library:updated", true); }), { concurrency: 1 }
  );

  const runMetadataJob = createMetadataEngine({
    findAsset: libraryService.findLibraryAssetById,
    storageUrlToPath: libraryService.storageUrlToPath,
    updateAsset: libraryService.updateLibraryAsset,
    // Semua AI call via 9Router — satu jalur dengan studio:generate (jalur direct
    // Gemini dihapus; key Gemini terpisah tidak pernah dikonfigurasi sehingga
    // provider lama selalu gagal metadata_gemini_key_required).
    // Cancel antar-step tetap berlaku via aborted(signal) di dalam engine.
    provider: async ({ prompt, image }) => {
      const result = await studioGenerate9RouterText(
        {
          contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: image }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        },
        getStudioConfig().textModel,
        30000
      );
      if (!result.success) throw new Error(result.detail || "metadata_provider_failed");
      const text = (result.response as any)?.candidates?.[0]?.content?.parts
        ?.find((part: any) => typeof part?.text === "string")?.text;
      if (typeof text !== "string") throw new Error("metadata_invalid_response");
      return text;
    },
  });

  // Metadata queue
  const metadataQueue = new MetadataQueue(
    async (jobId, assetId, signal) => {
      await runMetadataJob(jobId, assetId, signal);
      broadcast("library:updated", true);
    },
    (job) => broadcast('metadata:job-update', job)
  );

  // ── Library ────────────────────────────────────────────────
  ipcMain.handle("library:list", () => libraryService.getLibrary());
  ipcMain.handle("library:add", (_e, asset: Partial<LibraryAsset>) => {
    const created = libraryService.addLibraryAsset(asset);
    broadcast("library:updated", true);
    return { success: true, asset: created };
  });
  ipcMain.handle("library:update", (_e, id: string, patch: Partial<LibraryAsset>) => {
    const result = libraryService.updateLibraryAsset(id, patch);
    if (result.success) broadcast("library:updated", true);
    return result;
  });
  ipcMain.handle("library:delete", (_e, id: string) => {
    if (!validString(id, 256)) return { success: false, detail: "Invalid library asset ID" };
    const result = libraryService.deleteLibraryAsset(id);
    if (result.success) {
      broadcast("library:updated", true);
      if (result.studioAssetId) broadcast("studio:asset-deleted", result.studioAssetId);
    }
    return result;
  });
  ipcMain.handle("library:copy", (_e, id: string, folder?: string) => {
    const result = libraryService.copyLibraryAsset(id, folder);
    if (result.success) broadcast("library:updated", true);
    return result;
  });
  ipcMain.handle("library:rescan", () => ({ success: true, count: libraryService.rescanLibrary() }));
  ipcMain.handle("library:prune", () => {
    libraryService.pruneMissingLibraryAssets();
    return { success: true };
  });

  // ── Backup / Restore ───────────────────────────────────────
  ipcMain.handle("backup:export", () => {
    const res = backupService.exportLibraryBackup();
    return { success: res.ok, path: res.path, detail: res.detail };
  });
  ipcMain.handle("backup:import", async () => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: "Pilih file backup IMAGIN (.zip)",
          properties: ["openFile"],
          filters: [{ name: "IMAGIN Backup", extensions: ["zip"] }],
        })
      : await dialog.showOpenDialog({
          title: "Pilih file backup IMAGIN (.zip)",
          properties: ["openFile"],
        });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, canceled: true };
    }
    const res = backupService.importLibraryBackup(result.filePaths[0]);
    if (res.ok) broadcast("library:updated", true);
    return { success: res.ok, imported: res.imported, detail: res.detail };
  });

  ipcMain.handle("storage:info", () => libraryService.getStorage());
  ipcMain.handle("settings:get", () => ({ outputFolder: libraryService.getOutputFolder() }));
  ipcMain.handle("settings:set", (_e, body: { folder?: string }) => {
    if (body?.folder) libraryService.setOutputFolder(body.folder);
    return { success: true, outputFolder: libraryService.getOutputFolder() };
  });

  // ── Settings lengkap (settings.json) ───────────────────────
  ipcMain.handle("settings:get-all", () => {
    const s = settingsService.getSettings();
    // Gabung outputFolder dari library (source of truth lama) agar konsisten
    const merged = {
      ...s,
      studio: settingsService.getStudioConfig(),
      outputFolder: libraryService.getOutputFolder() || s.outputFolder,
    };
    return { success: true, settings: merged };
  });
  ipcMain.handle("settings:set-binary", (_e, body: { tool: string; path: string }) => {
    const tool = body?.tool as keyof ReturnType<typeof settingsService.getSettings>["binaries"];
    if (!tool || !["vtracer", "ffmpeg", "inkscape", "realesrgan"].includes(tool)) {
      return { success: false, detail: "Tool tidak valid" };
    }
    settingsService.setBinaryPath(tool, body.path || "");
    return { success: true };
  });
  ipcMain.handle("settings:set-concurrent", (_e, body: { count: number }) => {
    settingsService.setConcurrentTasks(body?.count || 1);
    return { success: true, concurrentTasks: settingsService.getConcurrentTasks() };
  });
  ipcMain.handle("settings:set-module-default", (_e, body: { key: string; value: string }) => {
    const key = body?.key as keyof ReturnType<typeof settingsService.getSettings>["moduleDefaults"];
    if (!key) return { success: false, detail: "Key tidak valid" };
    settingsService.setModuleDefault(key, body.value || "");
    return { success: true };
  });

  // ── Tasks ──────────────────────────────────────────────────
  ipcMain.handle("tasks:list", () => taskStore.all());
  ipcMain.handle("tasks:clear", () => {
    taskStore.removeCompleted();
    return { success: true, count: taskStore.all().length };
  });
  ipcMain.handle("recovery:get", () => {
    const state = jobStateService.getPendingJobState();
    return state ? { success: true, ...state } : { success: false };
  });
  ipcMain.handle("recovery:dismiss", (_e, body: { ids: string[] }) => {
    jobStateService.dismissPendingJobs(body?.ids || []);
    // Hapus task yang dibatalkan dari store
    for (const id of body?.ids || []) {
      const t = taskStore.get(id);
      if (t && (t.status === "QUEUED")) taskStore.update(id, { status: "CANCELLED" });
    }
    return { success: true };
  });
  ipcMain.handle("recovery:clear", () => {
    jobStateService.clearJobState();
    return { success: true };
  });
  ipcMain.handle("tasks:cancel", (_e, id: string) => {
    const task = taskStore.get(id);
    if (!task) return { success: false, detail: "Task not found" };
    if (animationService.cancelAnimationV2Task(id, animationV2Queue, taskStore, (job) => broadcast("animation:job-update", job))) return { success: true, task: taskStore.get(id) };
    if (task.type === "VECTOR_GENERATION" && task.tempId) {
      const ok = vectorizeService.cancelVectorizeJob(task.tempId, taskStore, vectorQueue);
      const job = vectorizeService.getVectorizeQueue().find((j) => j.tempId === task.tempId);
      if (ok && job) broadcast("vector:job-update", job);
      return { success: ok, task: taskStore.get(id) };
    }
    if (task.type === "IMAGE_UPSCALE" && task.tempId) {
      const ok = upscaleService.cancelUpscaleJob(task.tempId, taskStore, upscaleQueue);
      const job = upscaleService.getUpscaleQueue().find((j) => j.tempId === task.tempId);
      if (ok && job) broadcast("upscale:job-update", job);
      return { success: ok, task: taskStore.get(id) };
    }
    taskStore.update(id, { status: "CANCELLED" });
    return { success: true, task: taskStore.get(id) };
  });

  // Retry job gagal (vectorize / upscale) — re-enqueue ke queue masing-masing
  ipcMain.handle("tasks:retry", (_e, id: string) => {
    const task = taskStore.get(id);
    if (!task) return { success: false, detail: "Task not found" };
    if (task.status !== "FAILED") return { success: false, detail: "Hanya task FAILED yang bisa di-retry" };
    const tempId = task.tempId;

    if (task.type === "VECTOR_GENERATION" && tempId) {
      if (!vectorizeService.getVectorizePreview(tempId)?.filePath || !fs.existsSync(vectorizeService.getVectorizePreview(tempId)!.filePath)) {
        return { success: false, detail: "Preview vectorize tidak ditemukan atau sudah kedaluwarsa" };
      }
      vectorizeService.enqueueVectorize([{ tempId }], taskStore, (job) => broadcast("vector:job-update", job), vectorQueue);
      taskStore.update(id, { status: "CANCELLED", error: "replaced by retry", completedAt: new Date().toISOString() });
      return { success: true, task: taskStore.all().find((t) => t.tempId === tempId && t.id !== id) };
    }
    if (task.type === "IMAGE_UPSCALE" && tempId) {
      if (!upscaleService.getUpscalePreview(tempId)?.filePath || !fs.existsSync(upscaleService.getUpscalePreview(tempId)!.filePath)) {
        return { success: false, detail: "Preview upscale tidak ditemukan atau sudah kedaluwarsa" };
      }
      upscaleService.enqueueUpscale([{ tempId }], taskStore, (job) => broadcast("upscale:job-update", job), upscaleQueue);
      taskStore.update(id, { status: "CANCELLED", error: "replaced by retry", completedAt: new Date().toISOString() });
      return { success: true, task: taskStore.all().find((t) => t.tempId === tempId && t.id !== id) };
    }
    return { success: false, detail: `Retry belum didukung untuk tipe ${task.type}` };
  });

  // ── Import (ZIP/PNG) ───────────────────────────────────────
  ipcMain.handle("import:upload", (_e, files: Array<{ path: string; name: string }>) => {
    const allItems: ImportItem[] = [];
    const errors: string[] = [];
    for (const file of files || []) {
      try {
        if (!validFile(file)) throw new Error("Invalid file path or name");
        if (file.path.endsWith(".zip")) {
          allItems.push(...importService.parseImportZip(file.path));
        } else {
          const item = importService.analyzeSingleFile(file.path, file.name);
          allItems.push(item);
        }
        unlinkOwnedTemp(file.path);
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
        unlinkOwnedTemp(file.path);
      }
    }
    const summary = importService.buildSummary(allItems);
    return {
      success: errors.length === 0,
      total: allItems.length,
      summary,
      errors: errors.length > 0 ? errors : undefined,
      items: allItems.map((i) => ({
        tempId: i.tempId,
        originalName: i.originalName,
        fileName: i.fileName,
        mimeType: i.mimeType,
        width: i.width,
        height: i.height,
        fileSize: i.fileSize,
        assetType: i.assetType,
        codeType: i.codeType,
        pairedWith: i.pairedWith,
        metadata: i.metadata,
      })),
    };
  });

  ipcMain.handle("import:confirm", (_e, body: { selectedIds?: string[]; pending?: ImportItem[] }) => {
    let toImport = body.pending || [];
    if (Array.isArray(body.selectedIds) && body.selectedIds.length > 0) {
      toImport = toImport.filter((i) => body.selectedIds!.includes(i.tempId));
    }
    if (toImport.length === 0) {
      return { success: false, detail: "No assets to import" };
    }
    const jobId = `import-${Date.now()}`;
    const imported = importService.commitImportedAssets(toImport, jobId);
    for (const asset of imported) {
      libraryService.addLibraryAsset(asset as Partial<LibraryAsset>);
    }
    broadcast("library:updated", true);
    return { success: true, jobId, imported: imported.length, summary: importService.buildSummary(toImport), assets: imported };
  });
  ipcMain.handle("animation-v2:analyze", (_e, filePath: string) => animationV2Import.analyzeAnimationV2Zip(filePath));
  ipcMain.handle("animation-v2:import", (_e, filePath: string) => {
    try { const pkg = animationV2Import.importAnimationV2Zip(filePath); return pkg ? { success: true, package: pkg } : { success: false, detail: "Animation V2 package validation failed" }; }
    catch (err: any) { return { success: false, detail: err?.message || "Animation V2 import failed" }; }
  });
  ipcMain.handle("animation-v2:logs", (_e, limit?: number) => {
    const { readV2Logs } = require("./services/animation-v2-log") as typeof import("./services/animation-v2-log");
    return { success: true, entries: readV2Logs(typeof limit === "number" ? limit : 120) };
  });
  ipcMain.handle("animation-v2:logs-clear", () => {
    const { clearV2Logs } = require("./services/animation-v2-log") as typeof import("./services/animation-v2-log");
    clearV2Logs();
    return { success: true };
  });

  // ── Vectorize ──────────────────────────────────────────────
  ipcMain.handle("vector:upload", (_e, files: Array<{ path: string; name: string }>) => {
    const previews: VectorJobItem[] = [];
    const errors: string[] = [];
    const nineRouterKey = getDecryptedNineRouterKey();
    for (const file of files || []) {
      try {
        if (!validFile(file)) throw new Error("Invalid file path or name");
        const preview = vectorizeService.analyzeVectorizeUpload(file.path, file.name, nineRouterKey);
        vectorizeService.storeVectorizePreview(preview.tempId, {
          originalName: preview.originalName!,
          filePath: preview.filePath!,
          width: preview.width!,
          height: preview.height!,
          mimeType: preview.mimeType!,
        });
        previews.push(preview);
        // Add to library
        const sizeBytes = fs.statSync(preview.filePath!).size;
        const fileSize = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
        libraryService.addLibraryAsset({
          id: `lib-upload-${preview.tempId}`,
          type: "IMAGE",
          name: preview.originalName!,
          url: `/storage/imports/${encodeURIComponent(path.basename(preview.filePath!))}`,
          folder: "storage/imports",
          sourceModule: "VECTOR",
          mimeType: preview.mimeType!,
          fileSize,
          resolution: `${preview.width}x${preview.height}`,
          tags: ["Uploaded", "Vectorize"],
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) { errors.push(`${file?.name || "file"}: ${err?.message || "upload failed"}`); }
    }
    if (previews.length > 0) broadcast("library:updated", true);
    return { success: errors.length === 0, total: previews.length, items: previews, errors: errors.length ? errors : undefined };
  });

  ipcMain.handle("vector:queue", (_e, body: { items: Array<{ tempId: string; assetType?: AssetType; exportEps?: boolean; artboard?: string; padding?: number; vtracerArgs?: Partial<import("./binaries/vtracer").VtracerOptions>; postprocess?: import("./services/vec/vec-output").VecOutputOptions }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, detail: "items array required" };
    }
    const invalid = items.filter((item) => {
      if (!isRecord(item) || !validString(item.tempId, 256)) return true;
      if ((item as any).removeBackground !== undefined && typeof (item as any).removeBackground !== "boolean") return true;
      return false;
    });
    if (invalid.length) return { success: false, detail: "Invalid vector queue item" };
    if (items.some((item) => {
      const preview = vectorizeService.getVectorizePreview(item.tempId);
      return !preview?.filePath || !fs.existsSync(preview.filePath);
    })) return { success: false, detail: "Preview vectorize tidak ditemukan atau sudah kedaluwarsa" };
    try {
      const result = vectorizeService.enqueueVectorize(items, taskStore, (job) => broadcast("vector:job-update", job), vectorQueue);
      return { success: true, jobId: result.jobId, queued: result.jobs.length, jobs: result.jobs.map((j) => ({ tempId: j.tempId, status: j.status })) };
    } catch (err: any) { return { success: false, detail: err?.message || "Vector queue failed" }; }
  });

  // Vectorize Prep — upscale kecil dengan waifu2x lalu auto-feed ke vectorize queue
  ipcMain.handle("vector:prep-upscale", (_e, body: { tempId: string; scale?: string }) => {
    const { tempId } = body || {};
    if (!validString(tempId, 256)) return { success: false, detail: "tempId required" };
    const preview = vectorizeService.getVectorizePreview(tempId);
    if (!preview || !preview.filePath) return { success: false, detail: "Preview vectorize tidak ditemukan" };

    try {
      // Analisis sebagai input upscale (salin ke importsRoot)
      const uItem = upscaleService.analyzeUpscaleUpload(preview.filePath, preview.originalName || "prep.png");
      upscaleService.storePreview(uItem.tempId, {
        originalName: uItem.originalName!,
        filePath: uItem.filePath!,
        width: uItem.width!,
        height: uItem.height!,
        mimeType: uItem.mimeType!,
      });

      // Enqueue upscale dengan engine waifu2x
      const scale = body.scale || "2x";
      if (!validScale(scale)) return { success: false, detail: "Invalid scale" };
      const enq = upscaleService.enqueueUpscale(
        [{ tempId: uItem.tempId, engine: "waifu2x", scale }],
        taskStore,
        (job) => {
          broadcast("upscale:job-update", job);
          // Saat selesai, feed hasil ke vectorize queue
          if (job.status === "completed" && job.outputUrl) {
            const outPath = upscaleService.resolveOutputPath(job.outputUrl);
            if (outPath && fs.existsSync(outPath)) {
              try {
                const vItem = vectorizeService.analyzeVectorizeUpload(outPath, path.basename(outPath));
                vectorizeService.storeVectorizePreview(vItem.tempId!, {
                  originalName: vItem.originalName!,
                  filePath: vItem.filePath!,
                  width: vItem.width!,
                  height: vItem.height!,
                  mimeType: vItem.mimeType!,
                });
                vectorizeService.enqueueVectorize(
                  [{ tempId: vItem.tempId! }],
                  taskStore,
                  (vjob) => broadcast("vector:job-update", vjob),
                  vectorQueue
                );
              } catch (err: any) {
                console.error("[PREP] feed vectorize gagal:", err?.message);
              }
            }
          }
        },
        upscaleQueue
      );
      return { success: true, upscaleTempId: uItem.tempId, queued: enq.jobs.length };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Prep upscale gagal" };
    }
  });

  ipcMain.handle("vector:queue-get", () => ({ total: vectorizeService.getVectorizeQueue().length, items: vectorizeService.getVectorizeQueue() }));
  ipcMain.handle("vector:queue-clear", () => {
    const removed = vectorizeService.clearVectorizeCompleted();
    return { success: true, removed: removed.length, message: "Completed/failed jobs cleared" };
  });
  ipcMain.handle("vector:cancel", (_e, tempId: string) => {
    if (!tempId) return { success: false, detail: "tempId required" };
    const ok = vectorizeService.cancelVectorizeJob(tempId, taskStore, vectorQueue);
    const job = vectorizeService.getVectorizeQueue().find((j) => j.tempId === tempId);
    if (job) broadcast("vector:job-update", job);
    return { success: ok };
  });

  // ── Upscale ────────────────────────────────────────────────
  ipcMain.handle("upscale:upload", (_e, files: Array<{ path: string; name: string }>) => {
    const previews: UpscaleJobItem[] = [];
    const errors: string[] = [];
    for (const file of files || []) {
      try {
        if (!validFile(file)) throw new Error("Invalid file path or name");
        const preview = upscaleService.analyzeUpscaleUpload(file.path, file.name);
        upscaleService.storePreview(preview.tempId, {
          originalName: preview.originalName!,
          filePath: preview.filePath!,
          width: preview.width!,
          height: preview.height!,
          mimeType: preview.mimeType!,
        });
        previews.push(preview);
        // Add to library
        const sizeBytes = fs.statSync(preview.filePath!).size;
        const fileSize = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
        libraryService.addLibraryAsset({
          id: `lib-upload-${preview.tempId}`,
          type: "IMAGE",
          name: preview.originalName!,
          url: `/storage/imports/${encodeURIComponent(path.basename(preview.filePath!))}`,
          folder: "storage/imports",
          sourceModule: "UPSCALE",
          mimeType: preview.mimeType!,
          fileSize,
          resolution: `${preview.width}x${preview.height}`,
          tags: ["Uploaded", "Upscale"],
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) { errors.push(`${file?.name || "file"}: ${err?.message || "upload failed"}`); }
    }
    if (previews.length > 0) broadcast("library:updated", true);
    return { success: errors.length === 0, total: previews.length, items: previews, errors: errors.length ? errors : undefined };
  });

  ipcMain.handle("upscale:queue", (_e, body: { items: Array<{ tempId: string; engine?: "auto" | "realesrgan" | "waifu2x"; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: "png" | "jpeg" | "webp" }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, detail: "items array required" };
    }
    if (items.some((item) => !isValidUpscaleQueueItem(item, MAX_SCALE))) {
      return { success: false, detail: "Invalid upscale queue item" };
    }
    if (items.some((item) => {
      const preview = upscaleService.getUpscalePreview(item.tempId);
      return !preview?.filePath || !fs.existsSync(preview.filePath);
    })) return { success: false, detail: "Preview upscale tidak ditemukan atau sudah kedaluwarsa" };
    try {
      const result = upscaleService.enqueueUpscale(items, taskStore, (job) => broadcast("upscale:job-update", job), upscaleQueue);
      return { success: true, jobId: result.jobId, queued: result.jobs.length, jobs: result.jobs.map((j) => ({ tempId: j.tempId, status: j.status })) };
    } catch (err: any) { return { success: false, detail: err?.message || "Upscale queue failed" }; }
  });

  // ── Queue from Library assets ────────────────────────────────
  ipcMain.handle("vector:queue-library", (_e, body: { items: Array<{ assetId: string; assetType?: import("./services/vec/vec-analyze").AssetType; exportEps?: boolean; padding?: number }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, detail: "items array required" };
    }
    const queueItems: Array<{ tempId: string; assetType?: import("./services/vec/vec-analyze").AssetType; exportEps?: boolean; padding?: number }> = [];
    for (const item of items) {
      if (!isRecord(item) || !validString(item.assetId, 256)) {
        return { success: false, detail: "Invalid assetId" };
      }
      const asset = libraryService.findLibraryAssetById(item.assetId);
      if (!asset) {
        return { success: false, detail: `Asset not found: ${item.assetId}` };
      }
      // Validate mimeType: must be raster image
      let mime = asset.mimeType;
      if (!mime) {
        const ext = path.extname(asset.url).toLowerCase();
        if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
          mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
        } else {
          return { success: false, detail: `Asset ${item.assetId} is not a raster image (${asset.url})` };
        }
      } else {
        if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
          return { success: false, detail: `Asset ${item.assetId} has unsupported mime type ${mime}` };
        }
      }
      const absPath = libraryService.storageUrlToPath(asset.url);
      if (!absPath || !fs.existsSync(absPath)) {
        return { success: false, detail: `Asset file not found: ${asset.url}` };
      }
      const preview = vectorizeService.analyzeVectorizeUpload(absPath, asset.name);
      vectorizeService.storeVectorizePreview(preview.tempId, {
        originalName: preview.originalName!,
        filePath: preview.filePath!,
        width: preview.width!,
        height: preview.height!,
        mimeType: preview.mimeType!,
      });
      queueItems.push({
        tempId: preview.tempId,
        assetType: item.assetType,
        exportEps: item.exportEps,
        padding: item.padding,
      });
    }
    try {
      const result = vectorizeService.enqueueVectorize(queueItems, taskStore, (job) => broadcast("vector:job-update", job), vectorQueue);
      return { success: true, jobId: result.jobId, queued: result.jobs.length, jobs: result.jobs.map((j) => ({ tempId: j.tempId, status: j.status })) };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Vector queue failed" };
    }
  });

  ipcMain.handle("upscale:queue-library", (_e, body: { items: Array<{ assetId: string; engine?: "auto" | "realesrgan" | "waifu2x"; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: "png" | "jpeg" | "webp" }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, detail: "items array required" };
    }
    const queueItems: Array<{ tempId: string; engine?: "auto" | "realesrgan" | "waifu2x"; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: "png" | "jpeg" | "webp" }> = [];
    for (const item of items) {
      if (!isRecord(item) || !validString(item.assetId, 256)) {
        return { success: false, detail: "Invalid assetId" };
      }
      // Validate optional params
      if (item.engine !== undefined && !validEngine(item.engine)) {
        return { success: false, detail: "Invalid engine" };
      }
      if (item.scale !== undefined && !validScale(item.scale)) {
        return { success: false, detail: "Invalid scale" };
      }
      if (item.scale === "custom" && !finiteNumber(item.customScale, 2, MAX_SCALE)) {
        return { success: false, detail: "Invalid customScale" };
      }
      if (item.customScale !== undefined && !finiteNumber(item.customScale, 2, MAX_SCALE)) {
        return { success: false, detail: "Invalid customScale" };
      }
      if (!isValidUpscaleTileSize(item.tileSize)) {
        return { success: false, detail: "Invalid tileSize" };
      }
      if (item.outputFormat !== undefined && !validOutputFormat(item.outputFormat)) {
        return { success: false, detail: "Invalid outputFormat" };
      }
      const asset = libraryService.findLibraryAssetById(item.assetId);
      if (!asset) {
        return { success: false, detail: `Asset not found: ${item.assetId}` };
      }
      let mime = asset.mimeType;
      if (!mime) {
        const ext = path.extname(asset.url).toLowerCase();
        if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
          mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
        } else {
          return { success: false, detail: `Asset ${item.assetId} is not a raster image (${asset.url})` };
        }
      } else {
        if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
          return { success: false, detail: `Asset ${item.assetId} has unsupported mime type ${mime}` };
        }
      }
      const absPath = libraryService.storageUrlToPath(asset.url);
      if (!absPath || !fs.existsSync(absPath)) {
        return { success: false, detail: `Asset file not found: ${asset.url}` };
      }
      const preview = upscaleService.analyzeUpscaleUpload(absPath, asset.name);
      upscaleService.storePreview(preview.tempId, {
        originalName: preview.originalName!,
        filePath: preview.filePath!,
        width: preview.width!,
        height: preview.height!,
        mimeType: preview.mimeType!,
      });
      queueItems.push({
        tempId: preview.tempId,
        engine: item.engine,
        scale: item.scale,
        customScale: item.customScale,
        tileSize: item.tileSize,
        whiteBackground: item.whiteBackground,
        outputFormat: item.outputFormat,
      });
    }
    try {
      const result = upscaleService.enqueueUpscale(queueItems, taskStore, (job) => broadcast("upscale:job-update", job), upscaleQueue);
      return { success: true, jobId: result.jobId, queued: result.jobs.length, jobs: result.jobs.map((j) => ({ tempId: j.tempId, status: j.status })) };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Upscale queue failed" };
    }
  });

  // ── Stage from Library (no enqueue — handoff) ──────────────────
  ipcMain.handle("vector:stage-library", (_e, body: { items: Array<{ assetId: string }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) return { success: false, detail: "items array required" };
    const previews: VectorJobItem[] = [];
    const errors: string[] = [];
    for (const item of items) {
      try {
        if (!isRecord(item) || !validString(item.assetId, 256)) throw new Error("Invalid assetId");
        const asset = libraryService.findLibraryAssetById(item.assetId);
        if (!asset) throw new Error(`Asset not found: ${item.assetId}`);
        let mime = asset.mimeType;
        if (!mime) {
          const ext = path.extname(asset.url).toLowerCase();
          if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
            mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
          } else {
            throw new Error(`Asset ${item.assetId} is not a raster image (${asset.url})`);
          }
        } else {
          if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
            throw new Error(`Asset ${item.assetId} has unsupported mime type ${mime}`);
          }
        }
        const absPath = libraryService.storageUrlToPath(asset.url);
        if (!absPath || !fs.existsSync(absPath)) throw new Error(`Asset file not found: ${asset.url}`);
        const preview = vectorizeService.analyzeVectorizeUpload(absPath, asset.name);
        vectorizeService.storeVectorizePreview(preview.tempId, {
          originalName: preview.originalName!,
          filePath: preview.filePath!,
          width: preview.width!,
          height: preview.height!,
          mimeType: preview.mimeType!,
        });
        previews.push(preview);
      } catch (err: any) {
        errors.push(`${(item && typeof item === "object" && (item as any).assetId) || "item"}: ${err?.message || "stage failed"}`);
      }
    }
    if (previews.length === 0) return { success: false, detail: errors.join("; ") };
    return { success: errors.length === 0, total: previews.length, items: previews, errors: errors.length ? errors : undefined };
  });

  ipcMain.handle("upscale:stage-library", (_e, body: { items: Array<{ assetId: string }> }) => {
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) return { success: false, detail: "items array required" };
    const previews: UpscaleJobItem[] = [];
    const errors: string[] = [];
    for (const item of items) {
      try {
        if (!isRecord(item) || !validString(item.assetId, 256)) throw new Error("Invalid assetId");
        const asset = libraryService.findLibraryAssetById(item.assetId);
        if (!asset) throw new Error(`Asset not found: ${item.assetId}`);
        let mime = asset.mimeType;
        if (!mime) {
          const ext = path.extname(asset.url).toLowerCase();
          if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
            mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
          } else {
            throw new Error(`Asset ${item.assetId} is not a raster image (${asset.url})`);
          }
        } else {
          if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
            throw new Error(`Asset ${item.assetId} has unsupported mime type ${mime}`);
          }
        }
        const absPath = libraryService.storageUrlToPath(asset.url);
        if (!absPath || !fs.existsSync(absPath)) throw new Error(`Asset file not found: ${asset.url}`);
        const preview = upscaleService.analyzeUpscaleUpload(absPath, asset.name);
        upscaleService.storePreview(preview.tempId, {
          originalName: preview.originalName!,
          filePath: preview.filePath!,
          width: preview.width!,
          height: preview.height!,
          mimeType: preview.mimeType!,
        });
        previews.push(preview);
      } catch (err: any) {
        errors.push(`${(item && typeof item === "object" && (item as any).assetId) || "item"}: ${err?.message || "stage failed"}`);
      }
    }
    if (previews.length === 0) return { success: false, detail: errors.join("; ") };
    return { success: errors.length === 0, total: previews.length, items: previews, errors: errors.length ? errors : undefined };
  });

  ipcMain.handle("upscale:waifu2x-available", () => {
    return { available: !!upscaleService.getWaifu2xAvailable() };
  });

  ipcMain.handle("upscale:queue-get", () => ({ total: upscaleService.getUpscaleQueue().length, items: upscaleService.getUpscaleQueue() }));
  ipcMain.handle("upscale:queue-clear", () => {
    const removed = upscaleService.clearUpscaleCompleted();
    return { success: true, removed: removed.length, message: "Completed/failed jobs cleared" };
  });
  ipcMain.handle("upscale:cancel", (_e, tempId: string) => {
    if (!tempId) return { success: false, detail: "tempId required" };
    const ok = upscaleService.cancelUpscaleJob(tempId, taskStore, upscaleQueue);
    const job = upscaleService.getUpscaleQueue().find((j) => j.tempId === tempId);
    if (job) broadcast("upscale:job-update", job);
    return { success: ok };
  });
  ipcMain.handle("upscale:stored-previews", () => {
    return { items: upscaleService.getStoredPreviews() };
  });

  // ── Animation ──────────────────────────────────────────────
  ipcMain.handle("animation:analyze", (_e, body: { svgUrl?: string; name: string; html?: string; css?: string }) => {
    const { svgUrl, name, html, css } = body || {};
    if (!isRecord(body) || (html !== undefined && !validString(html, 2_000_000)) || (css !== undefined && typeof css !== "string") ||
      (name !== undefined && !validString(name, 512))) return { success: false, detail: "Invalid animation input" };
    if (html) {
      // Mode HTML+CSS — source langsung dari renderer
      const result = animationService.analyzeAnimationSource({ html, css, originalName: name || "html-source" }, 800, 800);
      if (result.error) return { success: false, detail: result.error };
      return { success: true, tempId: result.tempId, layers: result.layers, mode: "html" };
    }
    if (!svgUrl) return { success: false, detail: "svgUrl atau html required" };
    const svgPath = resolveStoredFilename(dirs.vectors, svgUrl, /\.svg$/i);
    if (!svgPath) return { success: false, detail: "Invalid SVG path" };
    if (!fs.existsSync(svgPath)) {
      return { success: false, detail: `SVG not found: ${svgPath}` };
    }
    const result = animationService.analyzeSvgUpload(svgPath, name || path.basename(svgPath), 800, 800);
    if (result.error) return { success: false, detail: result.error };
    return { success: true, tempId: result.tempId, layers: result.layers, svgContent: fs.readFileSync(svgPath, "utf-8"), mode: "svg" };
  });

  ipcMain.handle("animation:queue", (_e, body: { def: import("./services/animation-types").AnimationDefinition }) => {
    const { def } = body;
    if (!def) {
      return { success: false, detail: "Animation definition required" };
    }
    const hasSource = def.sourceMode === "html"
      ? !!def.sourceHtml
      : !!def.sourceSvg;
    if (!hasSource) {
      return { success: false, detail: "Source animasi kosong (html/css atau svg)" };
    }
    // Validasi formatList — hanya format yang didukung engine
    const VALID_FORMATS = ["MP4", "WEBM", "GIF", "Lottie"];
    const formatList = Array.isArray(def.formatList) && def.formatList.length > 0
      ? def.formatList.filter((f) => VALID_FORMATS.includes(f))
      : ["MP4"];
    if (formatList.length === 0) {
      return { success: false, detail: "Format export tidak valid (pilih MP4/WebM/GIF/Lottie)" };
    }
    const result = animationService.enqueueAnimation({ ...def, formatList }, taskStore, (job) => broadcast("animation:job-update", job), animationQueue);
    if (result.error) return { success: false, detail: result.error };
    return { success: true, jobId: result.jobId, queued: result.jobs.length };
  });
  ipcMain.handle("animation-v2:queue", (_e, body: { packageId: string; formatList?: string[] }) => {
    const packageId = body?.packageId || "";
    const formats = Array.isArray(body?.formatList) ? body.formatList : ["MP4"];
    if (formats.includes("Lottie")) return { success: false, detail: "Lottie export is not supported for Animation V2" };
    if (!/^[A-Za-z0-9_-]+$/.test(packageId)) return { success: false, detail: "Invalid Animation V2 package id" };
    const result = animationService.enqueueAnimationV2(packageId, taskStore, (job) => broadcast("animation:job-update", job), animationV2Queue, formats);
    return result.error ? { success: false, detail: result.error } : { success: true, jobId: result.jobId };
  });
  ipcMain.handle("animation-v2:queue-get", () => ({ total: animationService.getAnimationV2Queue().length, items: animationService.getAnimationV2Queue() }));
  ipcMain.handle("animation-v2:queue-clear", () => ({ success: true, removed: animationService.clearAnimationV2Completed().length }));
  ipcMain.handle("animation-v2:cancel", (_e, tempId: string) => ({ success: animationService.cancelAnimationV2(tempId, animationV2Queue, taskStore, (job) => broadcast("animation:job-update", job)) }));

  ipcMain.handle("animation:queue-get", () => ({ total: animationService.getAnimationQueue().length, items: animationService.getAnimationQueue() }));
  ipcMain.handle("animation:queue-clear", () => {
    const removed = animationService.clearAnimationCompleted();
    return { success: true, removed: removed.length };
  });
  ipcMain.handle("animation:cancel", (_e, tempId: string) => {
    const ok = animationService.cancelAnimation(tempId);
    return { success: ok };
  });

  // ── Metadata Queue ───────────────────────────────────────────
  ipcMain.handle("metadata:queue-library", (_e, body: { assetIds: string[] }) => {
    const { assetIds } = body || {};
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return { success: false, detail: "assetIds array required" };
    }
    const results: Array<{ assetId: string; jobId?: string; error?: string }> = [];
    for (const assetId of assetIds) {
      if (typeof assetId !== "string" || !assetId) {
        results.push({ assetId, error: "Invalid assetId" });
        continue;
      }
      try {
        const jobId = metadataQueue.enqueue(assetId);
        results.push({ assetId, jobId });
      } catch (err: any) {
        results.push({ assetId, error: err?.message || "Queue error" });
      }
    }
    return { success: true, results };
  });

  ipcMain.handle("metadata:queue-get", () => {
    return { success: true, jobs: metadataQueue.list() };
  });

  ipcMain.handle("metadata:queue-clear", () => {
    const removed = metadataQueue.clearTerminal();
    return { success: true, removed: removed.length };
  });

  ipcMain.handle("metadata:cancel", (_e, body: { jobId: string }) => {
    const { jobId } = body || {};
    if (!jobId || typeof jobId !== "string") {
      return { success: false, detail: "jobId required" };
    }
    const ok = metadataQueue.cancel(jobId);
    return { success: ok, detail: ok ? undefined : "Job not found or already terminal" };
  });

  ipcMain.handle("metadata:list-pending", () => {
    // Select eligible raster assets that need stock metadata.
    // Eligible: type === 'IMAGE' and stockMetadata is empty/undefined.
    // Do not filter by sourceModule (includes STUDIO).
    const assets = libraryService.getLibrary();
    const pending = assets
      .filter(a => a.type === 'IMAGE' && (!a.stockMetadata || Object.keys(a.stockMetadata).length === 0))
      .map(a => ({ id: a.id, name: a.name, url: a.url }));
    return { success: true, pending };
  });

  // ── Vector → Upscale bridge ────────────────────────────────
  ipcMain.handle("vector:send-to-upscale", async (_e, body: { svgUrl: string; originalName: string; width: number; height: number }) => {
    const { svgUrl, originalName, width, height } = body || {};
    if (!isRecord(body) || !validString(svgUrl, 4096) || !validString(originalName, 512) || !validDimension(width) || !validDimension(height)) return { success: false, detail: "Invalid vector upscale input" };
    try {
      // Resolve SVG filesystem path from URL
      const svgPath = resolveStoredFilename(dirs.vectors, svgUrl, /\.svg$/i);
      if (!svgPath) return { success: false, detail: "Invalid SVG path" };
      if (!fs.existsSync(svgPath)) {
        return { success: false, detail: `SVG not found: ${svgPath}` };
      }

      // Rasterize SVG → PNG using Inkscape
      const tempId = `v2u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const pngFilename = `${tempId}.png`;
      const pngPath = path.join(importsRoot, pngFilename);

      const { svgToPng } = await import("./binaries/inkscape");
      const result = await svgToPng(svgPath, pngPath, width, height);
      if (!result.ok) {
        return { success: false, detail: result.error || "Rasterize failed" };
      }

      // Store preview for upscale pipeline
      const upscaleName = originalName.replace(/\.svg$/i, "") + "_upscaled.png";
      upscaleService.storePreview(tempId, {
        originalName: upscaleName,
        filePath: pngPath,
        width,
        height,
        mimeType: "image/png",
      });

      // Auto-enqueue to upscale pipeline with default settings
      const enqueueResult = upscaleService.enqueueUpscale(
        [{ tempId, engine: "realesrgan", scale: "4x", whiteBackground: false }],
        taskStore,
        (job) => broadcast("upscale:job-update", job),
        upscaleQueue,
      );

      broadcast("library:updated", true);
      return { success: true, tempId, queued: enqueueResult.jobs.length };
    } catch (err) {
      return { success: false, detail: (err as Error).message || "Unknown error" };
    }
  });

  ipcMain.handle("vector:open-in-upscale", async (_e, body: { svgUrl: string; originalName: string; width: number; height: number }) => {
    const { svgUrl, originalName, width, height } = body || {};
    if (!isRecord(body) || !validString(svgUrl, 4096) || !validString(originalName, 512) || !validDimension(width) || !validDimension(height)) return { success: false, detail: "Invalid vector upscale input" };
    try {
      // Resolve SVG filesystem path from URL
      const svgPath = resolveStoredFilename(dirs.vectors, svgUrl, /\.svg$/i);
      if (!svgPath) return { success: false, detail: "Invalid SVG path" };
      if (!fs.existsSync(svgPath)) {
        return { success: false, detail: `SVG not found: ${svgPath}` };
      }

      // Rasterize SVG → PNG using Inkscape
      const tempId = `v2u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const pngFilename = `${tempId}.png`;
      const pngPath = path.join(importsRoot, pngFilename);

      const { svgToPng } = await import("./binaries/inkscape");
      const result = await svgToPng(svgPath, pngPath, width, height);
      if (!result.ok) {
        return { success: false, detail: result.error || "Rasterize failed" };
      }

      // Store preview for upscale pipeline (without enqueueing)
      const upscaleName = originalName.replace(/\.svg$/i, "") + "_upscaled.png";
      upscaleService.storePreview(tempId, {
        originalName: upscaleName,
        filePath: pngPath,
        width,
        height,
        mimeType: "image/png",
      });

      return { success: true, tempId };
    } catch (err) {
      return { success: false, detail: (err as Error).message || "Unknown error" };
    }
  });


  // ── Native file picker (Import dari Studio / assets) ───────
  ipcMain.handle("dialog:pickFiles", async () => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: "Pilih file untuk diimpor (ZIP Studio / PNG)",
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "IMAGIN Studio (ZIP/PNG)", extensions: ["zip", "png"] },
            { name: "Semua file", extensions: ["*"] },
          ],
        })
      : await dialog.showOpenDialog({
          title: "Pilih file untuk diimpor (ZIP Studio / PNG)",
          properties: ["openFile", "multiSelections"],
        });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, canceled: true, files: [] };
    }
    return {
      success: true,
      canceled: false,
      files: result.filePaths.map((p) => ({ path: p, name: path.basename(p) })),
    };
  });

  // ── Unified Export (native save dialog) ──────────────────
  ipcMain.handle("export:asset", (_e, body: { url: string; name?: string }) => {
    if (!body?.url) return { success: false, detail: "url required" };
    return exportService.exportAsset(getWindow(), body.url, body.name);
  });
  ipcMain.handle("export:zip", (_e, body: { items: Array<{ url: string; name: string }> }) => {
    if (!body?.items || body.items.length === 0) return { success: false, detail: "items required" };
    return exportService.exportZip(getWindow(), body.items);
  });
  ipcMain.handle("export:show-in-folder", (_e, body: { url: string }) => {
    if (!body?.url) return { success: false, detail: "url required" };
    return exportService.showInFolder(getWindow(), body.url);
  });

  // ── Studio (AI image generation via Gemini) ────────────────
  ipcMain.handle("studio:get-config", () => {
    const cfg = getStudioConfig();
    return { success: true, config: cfg };
  });

  ipcMain.handle("studio:save-config", (_e, patch: { geminiApiKey?: string; nineRouterApiKey?: string; textModel?: string; imageModel?: string; availableTextModels?: string[]; availableImageModels?: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; provider?: "gemini" | "9router"; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> }) => {
    if (!patch || typeof patch !== "object") {
      return { success: false, detail: "patch required" };
    }
    const allowed = new Set(["provider", "textModel", "imageModel", "availableTextModels", "availableImageModels", "nineRouterBaseUrl", "nineRouterImageEndpoint", "geminiApiKey", "nineRouterApiKey", "theme", "negativePrompt", "diffCheck", "videoUrl", "activeProjectId", "apiCallsDate", "apiCallsCount", "idbMigrated", "customStyles"]);
    const boundedStrings: Array<[keyof typeof patch, number]> = [["geminiApiKey", 8000], ["nineRouterApiKey", 8000], ["textModel", 256], ["imageModel", 256], ["nineRouterBaseUrl", 256], ["nineRouterImageEndpoint", 2048], ["theme", 256], ["negativePrompt", 8000], ["videoUrl", 256], ["activeProjectId", 256], ["apiCallsDate", 256]];
    if (Object.keys(patch).some((key) => !allowed.has(key)) ||
        boundedStrings.some(([key, max]) => patch[key] !== undefined && (typeof patch[key] !== "string" || (patch[key] as string).length > max)) ||
        (patch.provider !== undefined && patch.provider !== "gemini" && patch.provider !== "9router") ||
        (patch.textModel !== undefined && !isValid9RouterModel(patch.textModel)) ||
        (patch.imageModel !== undefined && !isValid9RouterModel(patch.imageModel)) ||
        (patch.availableTextModels !== undefined && !isValid9RouterModelCatalog(patch.availableTextModels)) ||
        (patch.availableImageModels !== undefined && !isValid9RouterModelCatalog(patch.availableImageModels)) ||
        (patch.nineRouterBaseUrl !== undefined && !normalize9RouterBaseUrl(patch.nineRouterBaseUrl)) ||
        (patch.nineRouterImageEndpoint !== undefined && !normalize9RouterImageEndpoint(patch.nineRouterImageEndpoint)) ||
        (patch.diffCheck !== undefined && typeof patch.diffCheck !== "boolean") ||
        (patch.idbMigrated !== undefined && typeof patch.idbMigrated !== "boolean") ||
        (patch.apiCallsCount !== undefined && (typeof patch.apiCallsCount !== "number" || !Number.isFinite(patch.apiCallsCount) || !Number.isInteger(patch.apiCallsCount) || patch.apiCallsCount < 0)) ||
        (patch.customStyles !== undefined && (!Array.isArray(patch.customStyles) || patch.customStyles.length > 30 || patch.customStyles.some((s: any) => !s || typeof s.id !== "string" || s.id.length > 64 || typeof s.name !== "string" || s.name.length > 200 || typeof s.directive !== "string" || s.directive.length > 4000 || typeof s.avoid !== "string" || s.avoid.length > 2000)))) {
      return { success: false, detail: "invalid config patch" };
    }
    try {
      settingsService.setStudioConfig({
        ...patch,
        availableTextModels: patch.availableTextModels === undefined ? undefined : sanitize9RouterModelCatalog(patch.availableTextModels),
        availableImageModels: patch.availableImageModels === undefined ? undefined : sanitize9RouterModelCatalog(patch.availableImageModels),
        nineRouterImageEndpoint: patch.nineRouterImageEndpoint === undefined ? undefined : normalize9RouterImageEndpoint(patch.nineRouterImageEndpoint)!,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Failed to save config" };
    }
  });

  ipcMain.handle(
    "studio:generate",
    async (_e, body: { endpoint: "image" | "text"; model: string; payload: unknown; requiresKey?: boolean }) => {
      // ── Validasi input dari renderer ───────────────────────
      if (
        !isRecord(body) ||
        !validString(body.model, 256) ||
        (body.endpoint !== "text" && body.endpoint !== "image") ||
        (!isRecord(body.payload) && !Array.isArray(body.payload)) ||
        (body.requiresKey !== undefined && typeof body.requiresKey !== "boolean")
      ) {
        return { success: false, detail: "Invalid Studio request" };
      }

      const cfg = getStudioConfig();

      // ── Semua call via 9Router (pool Antigravity) — jalur direct Gemini dihapus ──
      if (body.endpoint === "image") return await studioGenerate9Router(body.payload, cfg.imageModel);
      return await studioGenerate9RouterText(body.payload, cfg.textModel);
    }
  );

  ipcMain.handle("studio:ping", async (_e, input?: StudioConnectionInput) => {
    const started = Date.now();
    const result = await fetch9RouterModels(input);
    return result.success
      ? { ...result, latencyMs: Date.now() - started }
      : { success: false, detail: result.detail, latencyMs: Date.now() - started };
  });

  ipcMain.handle("studio:fetch-models", (_e, input?: StudioConnectionInput) => fetch9RouterModels(input));

  ipcMain.handle("studio:asset:upsert", (_e, body: unknown) => {
    if (!isRecord(body) || !validString(body.studioAssetId, 256) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(body.studioAssetId) ||
      !validString(body.name, 512) || (body.dataUrl !== undefined && !validString(body.dataUrl, 35_000_000)) ||
      (body.prompt !== undefined && (typeof body.prompt !== "string" || body.prompt.length > 8192)) ||
      (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 100 || body.tags.some(tag => !validString(tag, 128)))) ||
      (body.width !== undefined && !validDimension(body.width)) || (body.height !== undefined && !validDimension(body.height)) ||
      (body.mimeType !== undefined && !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(body.mimeType as string)) ||
      (body.outputFormat !== undefined && !["png", "jpeg", "webp", "svg"].includes(body.outputFormat as string))) {
      return { success: false, detail: "Invalid Studio asset" };
    }
    try {
      const asset = libraryService.upsertStudioLibraryAsset(body as libraryService.StudioLibraryAssetInput);
      broadcast("library:updated", true);
      return { success: true, asset };
    } catch (error: any) { return { success: false, detail: error?.message || "Studio asset upsert failed" }; }
  });

  ipcMain.handle("studio:asset:delete-linked", (_e, studioAssetId: unknown) => {
    if (!validString(studioAssetId, 256) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(studioAssetId)) return { success: false, detail: "Invalid Studio asset ID" };
    try {
      const result = libraryService.deleteStudioLibraryAsset(studioAssetId);
      broadcast("library:updated", true);
      return result;
    } catch (error: any) { return { success: false, detail: error?.message || "Studio linked delete failed" }; }
  });

  ipcMain.handle("studio:sync:get-deletions", () => ({ success: true, ids: libraryService.getDeletedStudioAssetIds() }));
  ipcMain.handle("studio:sync:ack-deletions", (_e, ids: unknown) => {
    if (!Array.isArray(ids) || ids.length > 10_000 || ids.some(id => !validString(id, 256) || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(id))) return { success: false, detail: "Invalid Studio deletion IDs" };
    try { return libraryService.ackDeletedStudioAssetIds(ids); }
    catch (error: any) { return { success: false, detail: error?.message || "Studio deletion acknowledgement failed" }; }
  });

  ipcMain.handle(
    "studio:save-asset",
    (
      _e,
      body: {
        pngBase64: string;
        name: string;
        folder?: string;
        prompt?: string;
        tags?: string[];
        width?: number;
        height?: number;
        mimeType?: string;
      }
    ) => {
      if (!isRecord(body) || !validString(body.pngBase64, 50_000_000) || !validString(body.name, 512) ||
        (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some((tag) => !validString(tag, 128)))) ||
        (body.width !== undefined && !validDimension(body.width)) || (body.height !== undefined && !validDimension(body.height)) ||
        (body.mimeType !== undefined && !["image/png", "image/jpeg", "image/webp"].includes(body.mimeType as string))) {
        return { success: false, detail: "pngBase64 & name required" };
      }
      try {
        const id = `studio-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const ext = body.mimeType?.includes("jpeg") ? "jpg" : body.mimeType?.includes("webp") ? "webp" : "png";
        const safeName = (body.name || id).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || id;
        const filename = `${id}-${safeName}.${ext}`;
        const targetDir = dirs.studio;
        fs.mkdirSync(targetDir, { recursive: true });
        const fullPath = path.join(targetDir, filename);
        const bytes = Buffer.from(body.pngBase64, "base64");
        fs.writeFileSync(fullPath, bytes);
        const sizeMb = bytes.length / (1024 * 1024);
        const fileSize = sizeMb >= 1 ? `${sizeMb.toFixed(2)} MB` : `${(bytes.length / 1024).toFixed(1)} KB`;
        const url = `/storage/assets/studio/${encodeURIComponent(filename)}`;
        const tags: string[] = ["Studio", "AI-generated", ...(body.tags || [])];
        const asset: Partial<LibraryAsset> = {
          type: "IMAGE",
          name: body.name,
          url,
          sourceModule: "STUDIO",
          mimeType: body.mimeType || "image/png",
          fileSize,
          tags,
          prompt: body.prompt,
          settings: body.width || body.height
            ? { code: `${body.width || 0}x${body.height || 0}` }
            : undefined,
        };
        const created = libraryService.addLibraryAsset(asset);
        broadcast("library:updated", true);
        return { success: true, asset: created };
      } catch (err: any) {
        return { success: false, detail: err?.message || "save failed" };
      }
    }
  );

  // ── Studio metadata store (Phase 1A) ────────────────────────────────────
  // Whitelisted collections, atomic file writes in main process. No IndexedDB.
  ipcMain.handle("studio:store:get", (_e, body: unknown) => {
    if (!isRecord(body) || !validString(body.collection, 64)) {
      return { success: false, detail: "collection (string) required" };
    }
    try {
      const result = studioStore.get(body.collection as string);
      return { success: true, items: result.items };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Unknown store error" };
    }
  });

  ipcMain.handle("studio:store:commit", async (_e, body: unknown) => {
    if (!isRecord(body) || !validString(body.collection, 64) || !Array.isArray(body.ops)) {
      return { success: false, detail: "collection and ops (array) required" };
    }
    try {
      const result = await studioStore.commit(body.collection as string, body.ops as any);
      return { success: true, items: result.items };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Unknown store error" };
    }
  });

  // ── Batch resume (single-blob, 24h TTL — not part of the studio-store whitelist) ──
  ipcMain.handle("studio:batch-resume-get", () => {
    try {
      return { success: true, data: batchResume.getBatchResume() };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Unknown error" };
    }
  });

  ipcMain.handle("studio:batch-resume-set", (_e, body: unknown) => {
    if (body !== null && !isRecord(body)) {
      return { success: false, detail: "body must be a record or null" };
    }
    try {
      batchResume.setBatchResume(body as Record<string, unknown> | null);
      return { success: true };
    } catch (err: any) {
      return { success: false, detail: err?.message || "Unknown error" };
    }
  });
}
