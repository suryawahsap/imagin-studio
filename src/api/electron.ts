import type { LibraryAsset, StorageInfo, Task } from "../types";
import type { ImportedAnimV2Package } from "../types/animation-v2";

declare global {
  interface Window {
    api: {
      libraryList: () => Promise<LibraryAsset[]>;
      libraryAdd: (asset: unknown) => Promise<{ success: boolean; asset?: LibraryAsset }>;
      libraryUpdate: (id: string, patch: unknown) => Promise<{ success: boolean; asset?: LibraryAsset; detail?: string }>;
      libraryDelete: (id: string) => Promise<{ success: boolean; studioAssetId?: string; detail?: string }>;
      libraryCopy: (id: string, folder?: string) => Promise<{ success: boolean; asset?: LibraryAsset; detail?: string }>;
      libraryRescan: () => Promise<{ success: boolean; count?: number }>;
      libraryPrune: () => Promise<{ success: boolean }>;
      backupExport: () => Promise<{ success: boolean; path?: string; detail?: string }>;
      backupImport: () => Promise<{ success: boolean; canceled?: boolean; imported?: number; detail?: string }>;
      storageInfo: () => Promise<StorageInfo>;
      settingsGet: () => Promise<{ outputFolder: string }>;
      settingsSet: (folder: string) => Promise<{ success: boolean; outputFolder: string }>;
      settingsGetAll: () => Promise<{ success: boolean; settings: any }>;
      settingsSetBinary: (tool: string, path: string) => Promise<{ success: boolean; detail?: string }>;
      settingsSetConcurrent: (count: number) => Promise<{ success: boolean; concurrentTasks?: number }>;
      settingsSetModuleDefault: (key: string, value: string) => Promise<{ success: boolean; detail?: string }>;
      tasksList: () => Promise<Task[]>;
      tasksClear: () => Promise<{ success: boolean; count?: number }>;
      tasksCancel: (id: string) => Promise<{ success: boolean; task?: Task; detail?: string }>;
      tasksRetry: (id: string) => Promise<{ success: boolean; task?: Task; detail?: string }>;
      recoveryGet: () => Promise<{ success: boolean; savedAt?: string; tasks?: Task[] }>;
      recoveryDismiss: (ids: string[]) => Promise<{ success: boolean }>;
      recoveryClear: () => Promise<{ success: boolean }>;
      importUpload: (files: Array<{ path: string; name: string }>) => Promise<any>;
      importConfirm: (body: unknown) => Promise<any>;
      animationV2Analyze: (path: string) => Promise<{ valid: boolean; errors: string[]; baseName?: string }>;
      animationV2Import: (path: string) => Promise<{ success: boolean; package?: ImportedAnimV2Package; detail?: string }>;
      animationV2Logs: (limit?: number) => Promise<{ success: boolean; entries: any[] }>;
      animationV2LogsClear: () => Promise<{ success: boolean }>;
      vectorUpload: (files: Array<{ path: string; name: string }>) => Promise<{ success: boolean; total: number; items: any[] }>;
      vectorQueue: (items: unknown[]) => Promise<{ success: boolean; jobId: string; queued: number; jobs: any[]; detail?: string }>;
      vectorQueueGet: () => Promise<{ total: number; items: any[] }>;
      vectorQueueClear: () => Promise<{ success: boolean; removed: number; message: string }>;
      vectorCancel: (tempId: string) => Promise<{ success: boolean; detail?: string }>;
      vectorPrepUpscale: (body: unknown) => Promise<{ success: boolean; upscaleTempId?: string; queued?: number; detail?: string }>;
      vectorQueueLibrary: (items: Array<{ assetId: string; assetType?: string; exportEps?: boolean; padding?: number }>) => Promise<{ success: boolean; jobId: string; queued: number; jobs: any[]; detail?: string }>;
      vectorStageLibrary: (items: Array<{ assetId: string }>) => Promise<{ success: boolean; total: number; items: any[]; errors?: string[]; detail?: string }>;
      upscaleUpload: (files: Array<{ path: string; name: string }>) => Promise<{ success: boolean; total: number; items: any[] }>;
      upscaleQueue: (items: unknown[]) => Promise<{ success: boolean; jobId: string; queued: number; jobs: any[]; detail?: string }>;
      upscaleQueueGet: () => Promise<{ total: number; items: any[] }>;
      upscaleQueueClear: () => Promise<{ success: boolean; removed: number; message: string }>;
      upscaleCancel: (tempId: string) => Promise<{ success: boolean; detail?: string }>;
      upscaleStoredPreviews: () => Promise<{ items: Array<{ tempId: string; originalName: string; filePath: string; width: number; height: number; mimeType: string }> }>;
      upscaleQueueLibrary: (items: Array<{ assetId: string; engine?: string; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: string }>) => Promise<{ success: boolean; jobId: string; queued: number; jobs: any[]; detail?: string }>;
      upscaleStageLibrary: (items: Array<{ assetId: string }>) => Promise<{ success: boolean; total: number; items: any[]; errors?: string[]; detail?: string }>;
      upscaleWaifu2xAvailable: () => Promise<{ available: boolean }>;
      animationAnalyze: (body: unknown) => Promise<{ success: boolean; tempId?: string; layers?: any[]; svgContent?: string; mode?: string; detail?: string }>;
      animationQueue: (body: unknown) => Promise<{ success: boolean; jobId?: string; queued?: number; detail?: string }>;
      animationV2Queue: (packageId: string, formatList?: string[]) => Promise<{ success: boolean; jobId?: string; detail?: string }>;
      animationV2QueueGet: () => Promise<{ total: number; items: any[] }>;
      animationV2QueueClear: () => Promise<{ success: boolean; removed?: number }>;
      animationV2Cancel: (tempId: string) => Promise<{ success: boolean }>;
      animationQueueGet: () => Promise<{ total: number; items: any[] }>;
      animationQueueClear: () => Promise<{ success: boolean; removed: number }>;
      animationCancel: (tempId: string) => Promise<{ success: boolean }>;
      vectorSendToUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => Promise<{ success: boolean; tempId?: string; queued?: number; detail?: string }>;
      vectorOpenInUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => Promise<{ success: boolean; tempId?: string; detail?: string }>;
      studioGetConfig: () => Promise<{ success: boolean; config: { provider: "gemini" | "9router"; textModel: string; imageModel: string; availableTextModels: string[]; availableImageModels: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; hasGeminiKey: boolean; hasNineRouterKey: boolean; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> } }>;
      studioSaveConfig: (patch: { geminiApiKey?: string; nineRouterApiKey?: string; textModel?: string; imageModel?: string; availableTextModels?: string[]; availableImageModels?: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; provider?: "gemini" | "9router"; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> }) => Promise<{ success: boolean; detail?: string }>;
      studioGenerate: (body: { endpoint: "image" | "text"; model: string; payload: unknown; requiresKey?: boolean }) => Promise<{ success: boolean; response?: any; status?: number; detail?: string }>;
      studioPing: (input?: { apiKey?: string; baseUrl: string }) => Promise<{ success: boolean; textModels: string[]; imageModels: string[]; models: Array<{ id: string; classified: "text" | "image" }>; imageSource?: "kind-endpoint" | "heuristic"; detail?: string; latencyMs?: number }>;
      studioFetchModels: (input?: { apiKey?: string; baseUrl: string }) => Promise<{ success: boolean; textModels: string[]; imageModels: string[]; models: Array<{ id: string; classified: "text" | "image" }>; imageSource?: "kind-endpoint" | "heuristic"; detail?: string }>;
      studioSaveAsset: (body: { pngBase64: string; name: string; folder?: string; prompt?: string; tags?: string[]; width?: number; height?: number; mimeType?: string }) => Promise<{ success: boolean; asset?: LibraryAsset; detail?: string }>;
      studioAssetUpsert: (body: StudioLibraryAssetInput) => Promise<{ success: boolean; asset?: LibraryAsset; detail?: string }>;
      studioAssetDeleteLinked: (studioAssetId: string) => Promise<{ success: boolean; detail?: string }>;
      studioSyncGetDeletions: () => Promise<{ success: boolean; ids: string[] }>;
      studioSyncAckDeletions: (ids: string[]) => Promise<{ success: boolean; detail?: string }>;
      studioStoreGet: (collection: string) => Promise<{ success: boolean; items?: unknown[]; detail?: string }>;
      studioStoreCommit: (body: { collection: string; ops: Array<{ type: "upsert"; id: string; record: unknown } | { type: "update"; id: string; patch: Record<string, unknown> } | { type: "delete"; id: string } | { type: "replaceAll"; records: unknown[] }> }) => Promise<{ success: boolean; items?: unknown[]; detail?: string }>;
      studioBatchResumeGet: () => Promise<{ success: boolean; data?: Record<string, unknown> | null; detail?: string }>;
      studioBatchResumeSet: (data: Record<string, unknown> | null) => Promise<{ success: boolean; detail?: string }>;
      exportAsset: (body: { url: string; name?: string }) => Promise<{ success: boolean; path?: string; detail?: string; canceled?: boolean }>;
      exportZip: (body: { items: Array<{ url: string; name: string }> }) => Promise<{ success: boolean; path?: string; detail?: string; canceled?: boolean }>;
      exportShowInFolder: (body: { url: string }) => Promise<{ success: boolean; path?: string; detail?: string }>;
      getPathForFile: (file: File) => string | null;
      pickFiles: () => Promise<{ success: boolean; canceled: boolean; files: Array<{ path: string; name: string }> }>;
      onTaskProgress: (cb: (payload: any) => void) => () => void;
      onVectorJobUpdate: (cb: (payload: any) => void) => () => void;
      onUpscaleJobUpdate: (cb: (payload: any) => void) => () => void;
      onAnimationJobUpdate: (cb: (payload: any) => void) => () => void;
      onLibraryUpdated: (cb: () => void) => () => void;
      onStudioAssetDeleted: (cb: (studioAssetId: string) => void) => () => void;
      onImportsChanged: (cb: () => void) => () => void;
      // Metadata queue
      metadataQueueLibrary: (assetIds: string[]) => Promise<{ success: boolean; results: Array<{ assetId: string; jobId?: string; error?: string }> }>;
      metadataQueueGet: () => Promise<{ success: boolean; jobs: any[] }>;
      metadataQueueClear: () => Promise<{ success: boolean; removed: number }>;
      metadataCancel: (jobId: string) => Promise<{ success: boolean; detail?: string }>;
      metadataListPending: () => Promise<{ success: boolean; pending: Array<{ id: string; name: string; url: string }> }>;
      onMetadataJobUpdate: (cb: (payload: any) => void) => () => void;
    };
  }
}

export type StudioLibraryAssetInput = { studioAssetId: string; dataUrl?: string; name: string; prompt?: string; tags?: string[]; width?: number; height?: number; mimeType?: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml"; outputFormat?: "png" | "jpeg" | "webp" | "svg"; stockMetadata?: unknown; adobeCategory?: string; subcategory?: string };

function getWindowApi() {
  return window.api;
}

export function filePayload(files: File[]): Array<{ path: string; name: string }> {
  const api = getWindowApi();
  const out: Array<{ path: string; name: string }> = [];
  for (const f of files) {
    const p = api.getPathForFile(f);
    if (p) out.push({ path: p, name: f.name });
  }
  return out;
}

export const api = {
  // Library
  fetchLibrary: () => getWindowApi().libraryList(),
  addLibraryAsset: (asset: unknown) => getWindowApi().libraryAdd(asset),
  renameAsset: (id: string, name: string) => getWindowApi().libraryUpdate(id, { name }),
  moveAsset: (id: string, folder: string) => getWindowApi().libraryUpdate(id, { folder }),
  libraryUpdate: (id: string, patch: unknown) => getWindowApi().libraryUpdate(id, patch),
  deleteAsset: (id: string) => getWindowApi().libraryDelete(id),
  copyAsset: (id: string, folder?: string) => getWindowApi().libraryCopy(id, folder),
  rescanLibrary: () => getWindowApi().libraryRescan(),

  // Backup / Restore
  backupExport: () => getWindowApi().backupExport(),
  backupImport: () => getWindowApi().backupImport(),

  // Storage / Settings
  fetchStorage: () => getWindowApi().storageInfo(),
  fetchSettings: () => getWindowApi().settingsGet(),
  updateFolder: (folder: string) => getWindowApi().settingsSet(folder),
  fetchAllSettings: () => getWindowApi().settingsGetAll(),
  setBinaryPath: (tool: string, path: string) => getWindowApi().settingsSetBinary(tool, path),
  setConcurrentTasks: (count: number) => getWindowApi().settingsSetConcurrent(count),
  setModuleDefault: (key: string, value: string) => getWindowApi().settingsSetModuleDefault(key, value),

  // Tasks
  fetchTasks: () => getWindowApi().tasksList(),
  clearTasks: () => getWindowApi().tasksClear(),
  cancelTask: (id: string) => getWindowApi().tasksCancel(id),
  retryTask: (id: string) => getWindowApi().tasksRetry(id),

  // Recovery
  recoveryGet: () => getWindowApi().recoveryGet(),
  recoveryDismiss: (ids: string[]) => getWindowApi().recoveryDismiss(ids),
  recoveryClear: () => getWindowApi().recoveryClear(),

  // Vectorize
  vectorUpload: (files: File[]) => getWindowApi().vectorUpload(filePayload(files)),
  vectorQueue: (items: unknown[]) => getWindowApi().vectorQueue(items),
  vectorQueueGet: () => getWindowApi().vectorQueueGet(),
  vectorQueueClear: () => getWindowApi().vectorQueueClear(),
  vectorCancel: (tempId: string) => getWindowApi().vectorCancel(tempId),
  vectorPrepUpscale: (body: unknown) => getWindowApi().vectorPrepUpscale(body),
  vectorQueueLibrary: (items: Array<{ assetId: string; assetType?: string; exportEps?: boolean; padding?: number }>) => getWindowApi().vectorQueueLibrary(items),
  vectorStageLibrary: (items: Array<{ assetId: string }>) => getWindowApi().vectorStageLibrary(items),

  // Upscale
  upscaleUpload: (files: File[]) => getWindowApi().upscaleUpload(filePayload(files)),
  upscaleQueue: (items: unknown[]) => getWindowApi().upscaleQueue(items),
  upscaleQueueGet: () => getWindowApi().upscaleQueueGet(),
  upscaleQueueClear: () => getWindowApi().upscaleQueueClear(),
  upscaleCancel: (tempId: string) => getWindowApi().upscaleCancel(tempId),
  upscaleStoredPreviews: () => getWindowApi().upscaleStoredPreviews(),
  upscaleQueueLibrary: (items: Array<{ assetId: string; engine?: string; scale?: string; customScale?: number; tileSize?: number; whiteBackground?: boolean; outputFormat?: string }>) => getWindowApi().upscaleQueueLibrary(items),
  upscaleStageLibrary: (items: Array<{ assetId: string }>) => getWindowApi().upscaleStageLibrary(items),
  upscaleWaifu2xAvailable: () => getWindowApi().upscaleWaifu2xAvailable(),

  // Animation
  animationAnalyze: (body: unknown) => getWindowApi().animationAnalyze(body),
  animationQueue: (body: unknown) => getWindowApi().animationQueue(body),
  animationV2Queue: (packageId: string, formatList?: string[]) => getWindowApi().animationV2Queue(packageId, formatList),
  animationV2QueueGet: () => getWindowApi().animationV2QueueGet(),
  animationV2QueueClear: () => getWindowApi().animationV2QueueClear(),
  animationV2Cancel: (tempId: string) => getWindowApi().animationV2Cancel(tempId),
  animationQueueGet: () => getWindowApi().animationQueueGet(),
  animationQueueClear: () => getWindowApi().animationQueueClear(),
  animationCancel: (tempId: string) => getWindowApi().animationCancel(tempId),

  // Vector → Upscale bridge
  vectorSendToUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => getWindowApi().vectorSendToUpscale(params),
  vectorOpenInUpscale: (params: { svgUrl: string; originalName: string; width: number; height: number }) => getWindowApi().vectorOpenInUpscale(params),

  // Studio (AI image generation via Gemini)
  studioGetConfig: () => getWindowApi().studioGetConfig(),
  studioSaveConfig: (patch: { geminiApiKey?: string; nineRouterApiKey?: string; textModel?: string; imageModel?: string; availableTextModels?: string[]; availableImageModels?: string[]; nineRouterBaseUrl?: string; nineRouterImageEndpoint?: string; provider?: "gemini" | "9router"; theme?: string; negativePrompt?: string; diffCheck?: boolean; videoUrl?: string; activeProjectId?: string; apiCallsDate?: string; apiCallsCount?: number; idbMigrated?: boolean; customStyles?: Array<{ id: string; name: string; directive: string; avoid: string }> }) => getWindowApi().studioSaveConfig(patch),
  studioGenerate: (body: { endpoint: "image" | "text"; model: string; payload: unknown; requiresKey?: boolean }) => getWindowApi().studioGenerate(body),
  studioPing: (input?: { apiKey?: string; baseUrl: string }) => getWindowApi().studioPing(input),
  studioFetchModels: (input?: { apiKey?: string; baseUrl: string }) => getWindowApi().studioFetchModels(input),
  studioSaveAsset: (body: { pngBase64: string; name: string; folder?: string; prompt?: string; tags?: string[]; width?: number; height?: number; mimeType?: string }) => getWindowApi().studioSaveAsset(body),
  studioAssetUpsert: (body: StudioLibraryAssetInput) => getWindowApi().studioAssetUpsert(body),
  studioAssetDeleteLinked: (studioAssetId: string) => getWindowApi().studioAssetDeleteLinked(studioAssetId),
  studioSyncGetDeletions: () => getWindowApi().studioSyncGetDeletions(),
  studioSyncAckDeletions: (ids: string[]) => getWindowApi().studioSyncAckDeletions(ids),

  // Studio metadata store (Phase 1A)
  studioStoreGet: (collection: string) => getWindowApi().studioStoreGet(collection),
  studioStoreCommit: (body: { collection: string; ops: Array<{ type: "upsert"; id: string; record: unknown } | { type: "update"; id: string; patch: Record<string, unknown> } | { type: "delete"; id: string } | { type: "replaceAll"; records: unknown[] }> }) => getWindowApi().studioStoreCommit(body),
  studioBatchResumeGet: () => getWindowApi().studioBatchResumeGet(),
  studioBatchResumeSet: (data: Record<string, unknown> | null) => getWindowApi().studioBatchResumeSet(data),

  // Export
  exportAsset: (body: { url: string; name?: string }) => getWindowApi().exportAsset(body),
  exportZip: (body: { items: Array<{ url: string; name: string }> }) => getWindowApi().exportZip(body),
  exportShowInFolder: (body: { url: string }) => getWindowApi().exportShowInFolder(body),

  // Import
  importUpload: (files: Array<{ path: string; name: string }>) => getWindowApi().importUpload(files),
  importConfirm: (body: unknown) => getWindowApi().importConfirm(body),
  animationV2Analyze: (filePath: string) => getWindowApi().animationV2Analyze(filePath),
  animationV2Import: (filePath: string) => getWindowApi().animationV2Import(filePath),
  animationV2Logs: (limit?: number) => getWindowApi().animationV2Logs(limit),
  animationV2LogsClear: () => getWindowApi().animationV2LogsClear(),
  pickFiles: () => getWindowApi().pickFiles(),

  // Events
  onTaskProgress: (cb: (payload: any) => void) => getWindowApi().onTaskProgress(cb),
  onVectorJobUpdate: (cb: (payload: any) => void) => getWindowApi().onVectorJobUpdate(cb),
  onUpscaleJobUpdate: (cb: (payload: any) => void) => getWindowApi().onUpscaleJobUpdate(cb),
  onAnimationJobUpdate: (cb: (payload: any) => void) => getWindowApi().onAnimationJobUpdate(cb),
  onLibraryUpdated: (cb: () => void) => getWindowApi().onLibraryUpdated(cb),
  onStudioAssetDeleted: (cb: (studioAssetId: string) => void) => getWindowApi().onStudioAssetDeleted(cb),
  onImportsChanged: (cb: () => void) => getWindowApi().onImportsChanged(cb),

  // Metadata
  metadataQueueLibrary: (assetIds: string[]) => getWindowApi().metadataQueueLibrary(assetIds),
  metadataQueueGet: () => getWindowApi().metadataQueueGet(),
  metadataQueueClear: () => getWindowApi().metadataQueueClear(),
  metadataCancel: (jobId: string) => getWindowApi().metadataCancel(jobId),
  metadataListPending: () => getWindowApi().metadataListPending(),
  onMetadataJobUpdate: (cb: (payload: any) => void) => getWindowApi().onMetadataJobUpdate(cb),
};
