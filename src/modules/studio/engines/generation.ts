// Semua fetch via api.studioGenerate IPC (ai-bridge). Caller meng-extend via registry/dna.ts canonical.

import type { SystemSettings } from "../types";
import { generateImage, generateJSON, generateText, hasAiBridgeApi, setAiBridgeApi } from "./ai-bridge";

export function setStudioApi(api: Parameters<typeof setAiBridgeApi>[0]): void {
  setAiBridgeApi(api);
}

export function hasApi(): boolean {
  return hasAiBridgeApi();
}

export async function generateImageWithFallback(
  primaryModel: string,
  fallbackModel: string,
  payloads: Array<{ label: string; body: unknown }>,
  onApiCall: () => void
): Promise<{ imageUrl: string; model: string }> {
  // ponytail: renderer fallback chain is key-free retry logic; move to main process if server-side rate-limit telemetry or multi-key rotation is needed.
  let lastError: any;
  for (const model of new Set([primaryModel, fallbackModel])) {
    for (const variant of payloads) {
      try {
        onApiCall();
        const imageUrl = await generateImage(model, variant.body, true);
        if (imageUrl) return { imageUrl, model };
        lastError = new Error(`Model ${model} (${variant.label}) returned no inline image data`);
      } catch (error: any) {
        lastError = error;
        if ([401, 403, 429].includes(error?.status)) break;
      }
    }
  }
  throw lastError || new Error("All image generation variants failed");
}

// ── callGeminiText (line 19607) ────────────────────────────────────────────
export async function callGeminiText(
  { system, user }: { system: string; user: string },
  aiConfig: SystemSettings["aiConfig"],
  onApiCall: () => void
): Promise<string> {
  const textModel = aiConfig?.textModel || "gemini-2.5-flash";
  onApiCall();
  if (!hasAiBridgeApi()) {
    throw new Error("Studio API not available — pastikan preload sudah diinisialisasi");
  }
  try {
    return await generateText(textModel, {
      contents: [{ parts: [{ text: system + "\n\n" + user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    }, true);
  } catch (error: any) {
    if (error?.kind === "empty") throw new Error("callGeminiText empty response");
    throw new Error(`callGeminiText failed: ${error?.status || error?.detail || "unknown"}`);
  }
}

// ── callGeminiForJSON (line 19622) — simplified ────────────────────────────
// Returns { data, reason }. Reason values: 'auth_error', 'rate_limited', 'timeout',
// 'safety_block', 'truncated_output', 'empty_response', 'invalid_json',
// 'model_not_found', 'server_error', 'bad_request', 'network_error', null.
export async function callGeminiForJSON({
  payload,
  aiConfig,
  onApiCall,
  label = "unnamed",
}: {
  payload: any;
  aiConfig: SystemSettings["aiConfig"];
  onApiCall?: () => void;
  label?: string;
}): Promise<{ data: any; reason: string | null }> {
  const textModel = aiConfig?.textModel || "gemini-2.5-flash";
  if (!hasAiBridgeApi()) {
    return { data: null, reason: "no_api" };
  }

  // FIX #3 (audit): inject generationConfig default — payload caller tidak
  // membawa config, sehingga di model thinking output JSON bisa terpotong
  // MAX_TOKENS. responseMimeType + thinkingBudget:0 menstabilkan output JSON.
  const jsonPayload = {
    ...payload,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 },
      ...(payload?.generationConfig || {}),
    },
  };

  const attempt = async (): Promise<{ data: any; reason: string | null }> => {
    onApiCall?.();
    try {
      const data = await generateJSON(textModel, jsonPayload, true);
      if (!data) return { data: null, reason: "invalid_json" };
      return { data, reason: null };
    } catch (error: any) {
      if (error?.kind === "request") {
        const status = error.status || 0;
        console.error(`[Imagin AI] "${label}" call failed — HTTP ${status}. Model: ${textModel}.`, error.detail?.slice(0, 400));
        const reason =
          status === 429
            ? "rate_limited"
            : status === 401 || status === 403
            ? "auth_error"
            : status === 404
            ? "model_not_found"
            : status >= 500
            ? "server_error"
            : "bad_request";
        return { data: null, reason };
      }
      const candidate = error?.response?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const text = error?.text || candidate?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        console.error(`[Imagin AI] "${label}" call returned no text — finishReason: ${finishReason || "unknown"}.`);
        const reason =
          finishReason === "SAFETY"
            ? "safety_block"
            : finishReason === "MAX_TOKENS"
            ? "truncated_output"
            : "empty_response";
        return { data: null, reason };
      }

      if (error?.kind === "invalid_json") {
        console.error(`[Imagin AI] "${label}" call returned text that isn't valid JSON. Raw text:`, text.slice(0, 500));
        return { data: null, reason: finishReason === "MAX_TOKENS" ? "truncated_output" : "invalid_json" };
      }
      throw error;
    }
  };

  try {
    return await attempt();
  } catch (err: any) {
    const reason = err?.name === "AbortError" ? "timeout" : "network_error";
    console.error(`[Imagin AI] "${label}" call threw — reason: ${reason}.`, err);
    return { data: null, reason };
  }
}

// Helper: extract JSON from text (handles ```json ... ``` wrappers).
export function extractJSONFromText(text: string): any {
  if (!text) return null;
  // Strip markdown JSON code blocks
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Try to find JSON object/array in the text
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

// ── generateImageWithGemini
export async function generateImageWithGemini(
  prompt: string,
  ratio: string,
  negativePromptText: string,
  aiConfig: SystemSettings["aiConfig"],
  onApiCall: () => void
): Promise<string | null> {
  const primaryModel = aiConfig?.imageModel || "gemini-3.1-flash-image";
  const fallbackModel = primaryModel === "gemini-3-pro-image" ? "gemini-3.1-flash-image" : "gemini-3-pro-image";
  const fullPrompt = `${prompt}\n\nAvoid: ${negativePromptText || "watermark, text, typography, logo, brand name, signature, stamp, copyright, jpeg artifacts, messy lines"}.`;
  const contents = [{ role: "user", parts: [{ text: fullPrompt }] }];
  try {
    return (await generateImageWithFallback(primaryModel, fallbackModel, [
      { label: "v1beta-imageConfig", body: { contents, generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio || "4:3" } } } },
      { label: "v1beta-basic-image", body: { contents, generationConfig: { responseModalities: ["IMAGE"] } } },
    ], onApiCall)).imageUrl;
  } catch (err: any) {
    const detail = err?.detail || err?.message || "unknown provider error";
    console.error("[Imagin AI] generateImageWithGemini gagal:", err?.status || "", detail);
    throw new Error(`Image generation failed: ${detail}`);
  }
}

export async function generateNativeSVGWithGemini(prompt: string, aiConfig: SystemSettings["aiConfig"], onApiCall: () => void): Promise<string> {
  onApiCall();
  const text = await generateText(aiConfig?.textModel || "gemini-2.5-flash", { contents: [{ role: "user", parts: [{ text: `Return ONLY one self-contained SVG XML document. No markdown or explanation. Use only svg, g, path, rect, circle, ellipse, polygon and line. No text, image, script, filter, mask, clipPath or external references. Set width and height to at least 1200 and include a matching viewBox. Keep all geometry inside the artboard.\n\n${prompt}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 18000 } }, false);
  const svg = text.replace(/^```(?:xml|svg)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!/^<svg\b[\s\S]*<\/svg>$/i.test(svg) || /<\s*(?:text|image|script|foreignObject|filter|mask|clipPath)\b/i.test(svg)) throw new Error("Native SVG response was invalid or used a forbidden element.");
  return svg;
}
