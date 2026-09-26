import { contextBridge, ipcRenderer, webUtils } from "electron";

const api = {
  // Library
  libraryList: () => ipcRenderer.invoke("library:list"),
  libraryAdd: (asset: unknown) => ipcRenderer.invoke("library:add", asset),
  libraryUpdate: (id: string, patch: unknown) => ipcRenderer.invoke("library:update", id, patch),
  libraryDelete: (id: string) => ipcRenderer.invoke("library:delete", id),
  libraryCopy: (id: string, folder?: string) => ipcRenderer.invoke("library:copy", id, folder),
  libraryRescan: () => ipcRenderer.invoke("library:rescan"),
  libraryPrune: () => ipcRenderer.invoke("library:prune"),

  // Backup / Restore
  backupExport: () => ipcRenderer.invoke("backup:export"),
  backupImport: () => ipcRenderer.invoke("backup:import"),

  // Storage / Settings
  storageInfo: () => ipcRenderer.invoke("storage:info"),
  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSet: (folder: string) => ipcRenderer.invoke("settings:set", { folder }),
  settingsGetAll: () => ipcRenderer.invoke("settings:get-all"),
  settingsSetBinary: (tool: string, path: string) => ipcRenderer.invoke("settings:set-binary", { tool, path }),
  settingsSetConcurrent: (count: number) => ipcRenderer.invoke("settings:set-concurrent", { count }),
  settingsSetModuleDefault: (key: string, value: string) => ipcRenderer.invoke("settings:set-module-default", { key, value }),

  // Tasks
  tasksList: () => ipcRenderer.invoke("tasks:list"),
  tasksClear: () => ipcRenderer.invoke("tasks:clear"),
  tasksCancel: (id: string) => ipcRenderer.invoke("tasks:cancel", id),
  tasksRetry: (id: string) => ipcRenderer.invoke("tasks:retry", id),

  // Recovery
  recoveryGet: () => ipcRenderer.invoke("recovery:get"),
  recoveryDismiss: (ids: string[]) => ipcRenderer.invoke("recovery:dismiss", { ids }),
  recoveryClear: () => ipcRenderer.invoke("recovery:clear"),

  // Import
  importUpload: (files: Array<{ path: string; name: string }>) => ipcRenderer.invoke("import:upload", files),
  importConfirm: (body: unknown) => ipcRenderer.invoke("import:confirm", body),
  animationV2Analyze: (filePath: string) => ipcRenderer.invoke("animation-v2:analyze", filePath),
  animationV2Import: (filePath: string) => ipcRenderer.invoke("animation-v2:import", filePath),

  // Vectorize
  vectorUpload: (files: Array<{ path: string; name: string }>) => ipcRenderer.invoke("vector:upload", files),
  vectorQueue: (items: unknown[]) => ipcRenderer.invoke("vector:queue", { items }),
  vectorQueueGet: () => ipcRenderer.invoke("vector:queue-get"),
  vectorQueueClear: () => ipcRenderer.invoke("vector:queue-clear"),
  vectorCancel: (tempId: string) => ipcRenderer.invoke("vector:cancel", tempId),
  vectorPrepUpscale: (body: unknown) => ipcRenderer.invoke("vector:prep-upscale", body),
  vectorQueueLibrary: (items: Array<{ assetId: string; assetType?: string; exportEps?: boolean; padding?: number }>) => ipcRenderer.invoke("vector:queue-library", { items }),
  vectorStageLibrary: (items: Array<{ assetId: string }>) => ipcRenderer.invoke("vector:stage-library", { items }),

  // Upscale
  upscaleUpload: (files: Array<{ path: string; name: string }>) => ipcRenderer.invoke("upscale:upload", files),
  upscaleQueue: (items: unknown[]) => ipcRenderer.invoke("upscale:queue", { items }),
  upscaleQueueGet: () => ipcRenderer.invoke("upscale:queue-get"),
  upscaleQueueClear: () => ipcRenderer.invoke("upscale:queue-clear"),
  upscaleCancel: (tempId: string) => ipcRenderer.invoke("upscale:cancel", tempId),
  upscaleStoredPreviews: () => ipcRenderer.invoke("upscale:stored-previews"),
  upscaleQueueLibrary: (items: Array<{ assetId: string; engine?: string; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: string }>) => ipcRenderer.invoke("upscale:queue-library", { items }),
  upscaleStageLibrary: (items: Array<{ assetId: string }>) => ipcRenderer.invoke("upscale:stage-library", { items }),
  upscaleWaifu2xAvailable: () => ipcRenderer.invoke("upscale:waifu2x-available"),

  // Animation
  animationAnalyze: (body: unknown) => ipcRenderer.invoke("animation:analyze", body),
  animationQueue: (body: unknown) => ipcRenderer.invoke("animation:queue", body),
  animationV2Queue: (packageId: string, formatList?: string[]) => ipcRenderer.invoke("animation-v2:queue", { packageId, formatList }),
  animationV2QueueGet: () => ipcRenderer.invoke("animation-v2:queue-get"),
  animationV2QueueClear: () => ipcRenderer.invoke("animation-v2:queue-clear"),
  animationV2Cancel: (tempId: string) => ipcRenderer.invoke("animation-v2:cancel", tempId),
  animationV2Logs: (limit?: number) => ipcRenderer.invoke("animation-v2:logs", limit),
  animationV2LogsClear: () => ipcRenderer.invoke("animation-v2:logs-clear"),
  animationQueueGet: () => ipcRenderer.invoke("animation:queue-get"),
  animationQueueClear: () => ipcRenderer.invoke("animation:queue-clear"),
  animationCancel: (tempId: string) => ipcRenderer.invoke("animation:cancel", tempId),

  // Vector → Upscale bridge
  vectorSendToUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => ipcRenderer.invoke("vector:send-to-upscale", params),
  vectorOpenInUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => ipcRenderer.invoke("vector:open-in-upscale", params),

  // Studio (AI image generation via Gemini)
  studioGetConfig: () => ipcRenderer.invoke("studio:get-config") as Promise<{ success: boolean; config: { provider: "gemini" | "9router"; textModel: string; imageModel: string; availableTextModels: string[]; availableImageModels: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; hasGeminiKey: boolean; hasNineRouterKey: boolean; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> } }>,
  studioSaveConfig: (patch: { geminiApiKey?: string; nineRouterApiKey?: string; textModel?: string; imageModel?: string; availableTextModels?: string[]; availableImageModels?: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; provider?: "gemini" | "9router"; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> }) =>
    ipcRenderer.invoke("studio:save-config", patch),
  studioGenerate: (body: { endpoint: "image" | "text"; model: string; payload: unknown; requiresKey?: boolean }) =>
    ipcRenderer.invoke("studio:generate", body),
  studioPing: (input?: { apiKey?: string; baseUrl: string }) => ipcRenderer.invoke("studio:ping", input) as Promise<{ success: boolean; textModels: string[]; imageModels: string[]; models: Array<{ id: string; classified: "text" | "image" }>; imageSource?: "kind-endpoint" | "heuristic"; detail?: string; latencyMs?: number }>,
  studioFetchModels: (input?: { apiKey?: string; baseUrl: string }) => ipcRenderer.invoke("studio:fetch-models", input) as Promise<{ success: boolean; textModels: string[]; imageModels: string[]; models: Array<{ id: string; classified: "text" | "image" }>; imageSource?: "kind-endpoint" | "heuristic"; detail?: string }>,
  studioSaveAsset: (body: { pngBase64: string; name: string; folder?: string; prompt?: string; tags?: string[]; width?: number; height?: number; mimeType?: string }) =>
    ipcRenderer.invoke("studio:save-asset", body),
  studioAssetUpsert: (body: { studioAssetId: string; dataUrl?: string; name: string; prompt?: string; tags?: string[]; width?: number; height?: number; mimeType?: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml"; outputFormat?: "png" | "jpeg" | "webp" | "svg"; stockMetadata?: unknown; adobeCategory?: string; subcategory?: string }) =>
    ipcRenderer.invoke("studio:asset:upsert", body),
  studioAssetDeleteLinked: (studioAssetId: string) => ipcRenderer.invoke("studio:asset:delete-linked", studioAssetId),
  studioSyncGetDeletions: () => ipcRenderer.invoke("studio:sync:get-deletions"),
  studioSyncAckDeletions: (ids: string[]) => ipcRenderer.invoke("studio:sync:ack-deletions", ids),

  // Studio metadata store (Phase 1A)
  studioStoreGet: (collection: string) => ipcRenderer.invoke("studio:store:get", { collection }),
  studioStoreCommit: (body: { collection: string; ops: Array<{ type: "upsert"; id: string; record: unknown } | { type: "update"; id: string; patch: Record<string, unknown> } | { type: "delete"; id: string } | { type: "replaceAll"; records: unknown[] }> }) =>
    ipcRenderer.invoke("studio:store:commit", body),

  // Studio batch resume
  studioBatchResumeGet: () => ipcRenderer.invoke("studio:batch-resume-get") as Promise<{ success: boolean; data?: Record<string, unknown> | null; detail?: string }>,
  studioBatchResumeSet: (data: Record<string, unknown> | null) => ipcRenderer.invoke("studio:batch-resume-set", data) as Promise<{ success: boolean; detail?: string }>,

  // Export
  exportAsset: (body: { url: string; name?: string }) => ipcRenderer.invoke("export:asset", body),
  exportZip: (body: { items: Array<{ url: string; name: string }> }) => ipcRenderer.invoke("export:zip", body),
  exportShowInFolder: (body: { url: string }) => ipcRenderer.invoke("export:show-in-folder", body),

  // File helpers
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },
  pickFiles: () => ipcRenderer.invoke("dialog:pickFiles"),

  // Events
  onTaskProgress: (cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("task:progress", listener);
    return () => ipcRenderer.removeListener("task:progress", listener);
  },
  onVectorJobUpdate: (cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("vector:job-update", listener);
    return () => ipcRenderer.removeListener("vector:job-update", listener);
  },
  onUpscaleJobUpdate: (cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("upscale:job-update", listener);
    return () => ipcRenderer.removeListener("upscale:job-update", listener);
  },
  onAnimationJobUpdate: (cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("animation:job-update", listener);
    return () => ipcRenderer.removeListener("animation:job-update", listener);
  },
  onLibraryUpdated: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on("library:updated", listener);
    return () => ipcRenderer.removeListener("library:updated", listener);
  },
  onStudioAssetDeleted: (cb: (studioAssetId: string) => void) => {
    const listener = (_e: unknown, studioAssetId: string) => cb(studioAssetId);
    ipcRenderer.on("studio:asset-deleted", listener);
    return () => ipcRenderer.removeListener("studio:asset-deleted", listener);
  },
  onImportsChanged: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on("imports:changed", listener);
    return () => ipcRenderer.removeListener("imports:changed", listener);
  },

  // Metadata queue
  metadataQueueLibrary: (assetIds: string[]) => ipcRenderer.invoke("metadata:queue-library", { assetIds }),
  metadataQueueGet: () => ipcRenderer.invoke("metadata:queue-get"),
  metadataQueueClear: () => ipcRenderer.invoke("metadata:queue-clear"),
  metadataCancel: (jobId: string) => ipcRenderer.invoke("metadata:cancel", { jobId }),
  metadataListPending: () => ipcRenderer.invoke("metadata:list-pending"),
  onMetadataJobUpdate: (cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("metadata:job-update", listener);
    return () => ipcRenderer.removeListener("metadata:job-update", listener);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
