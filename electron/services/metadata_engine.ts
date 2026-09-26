import fs from "fs";
import { LibraryAsset } from "../types";

export const METADATA_ENGINE_ERRORS = {
  ASSET_NOT_FOUND: "metadata_asset_not_found",
  UNSUPPORTED_MIME: "metadata_unsupported_mime",
  FILE_NOT_FOUND: "metadata_file_not_found",
  INVALID_RESPONSE: "metadata_invalid_response",
  GEMINI_KEY_REQUIRED: "metadata_gemini_key_required",
  PERSIST_FAILED: "metadata_persist_failed",
  ABORTED: "metadata_aborted",
} as const;

const SUPPORTED_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;
const MAX_KEYWORDS = 20;

export type MetadataProvider = (input: {
  prompt: string;
  image: { mimeType: string; data: string };
  signal: AbortSignal;
}) => Promise<string>;

export interface MetadataEngineDeps {
  findAsset: (assetId: string) => LibraryAsset | undefined;
  storageUrlToPath: (url?: string) => string | null;
  updateAsset: (assetId: string, patch: Partial<LibraryAsset>) => { success: boolean };
  provider: MetadataProvider;
  now?: () => string;
}

const aborted = (signal: AbortSignal) => {
  if (signal.aborted) throw new Error(METADATA_ENGINE_ERRORS.ABORTED);
};

export function extractMetadataJson(text: string): unknown {
  const value = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(value); } catch {}
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(value.slice(start, end + 1)); } catch {}
  }
  throw new Error(METADATA_ENGINE_ERRORS.INVALID_RESPONSE);
}

export function normalizeMetadataKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const keyword = item.trim().replace(/\s+/g, " ").toLowerCase();
    if (keyword) seen.add(keyword);
    if (seen.size === MAX_KEYWORDS) break;
  }
  return [...seen];
}

function metadataFromResponse(text: string) {
  const value = extractMetadataJson(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(METADATA_ENGINE_ERRORS.INVALID_RESPONSE);
  const { title, description, keywords } = value as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim() || title.trim().length > MAX_TITLE ||
      typeof description !== "string" || !description.trim() || description.trim().length > MAX_DESCRIPTION ||
      !Array.isArray(keywords)) throw new Error(METADATA_ENGINE_ERRORS.INVALID_RESPONSE);
  const normalized = normalizeMetadataKeywords(keywords);
  if (!normalized.length) throw new Error(METADATA_ENGINE_ERRORS.INVALID_RESPONSE);
  return { title: title.trim(), description: description.trim(), keywords: normalized };
}

export function createMetadataEngine(deps: MetadataEngineDeps) {
  return async function runMetadataJob(_jobId: string, assetId: string, signal: AbortSignal): Promise<void> {
    aborted(signal);
    const asset = deps.findAsset(assetId);
    if (!asset) throw new Error(METADATA_ENGINE_ERRORS.ASSET_NOT_FOUND);
    if (!SUPPORTED_MIMES.has(asset.mimeType)) throw new Error(METADATA_ENGINE_ERRORS.UNSUPPORTED_MIME);
    const filePath = deps.storageUrlToPath(asset.url);
    if (!filePath) throw new Error(METADATA_ENGINE_ERRORS.FILE_NOT_FOUND);
    let stat: fs.Stats;
    try { stat = fs.statSync(filePath); } catch { throw new Error(METADATA_ENGINE_ERRORS.FILE_NOT_FOUND); }
    if (!stat.isFile()) throw new Error(METADATA_ENGINE_ERRORS.FILE_NOT_FOUND);
    aborted(signal);
    const image = { mimeType: asset.mimeType, data: fs.readFileSync(filePath).toString("base64") };
    aborted(signal);
    const analysis = await deps.provider({
      prompt: "Describe the image's subject, composition, style, colors, mood, and visible text or logos in at most 150 words.", image, signal,
    });
    aborted(signal);
    const metadataText = await deps.provider({
      prompt: `Using this visual analysis: ${analysis}\nReturn JSON only: {"title":"...","description":"...","keywords":["..."]}. Title max 200 characters, description max 500 characters, at most 20 relevant stock keywords.`, image, signal,
    });
    aborted(signal);
    const metadata = metadataFromResponse(metadataText);
    const result = deps.updateAsset(assetId, {
      stockMetadata: {
        ...(asset.stockMetadata || {}),
        ...metadata,
        metadataSource: "ai",
        preflightDecision: "needs_review",
        generatedAt: (deps.now || (() => new Date().toISOString()))(),
      },
    });
    if (!result.success) throw new Error(METADATA_ENGINE_ERRORS.PERSIST_FAILED);
  };
}
