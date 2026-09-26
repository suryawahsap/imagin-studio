type StudioApi = {
  studioGenerate: (body: {
    endpoint: "image" | "text";
    model: string;
    payload: unknown;
    requiresKey?: boolean;
  }) => Promise<{ success: boolean; response?: any; status?: number; detail?: string }>;
};

let _api: StudioApi | null = null;

export function setAiBridgeApi(api: StudioApi | null): void {
  _api = api;
}

function getApi(): StudioApi | null {
  if (_api) return _api;
  if (typeof window !== "undefined" && (window as any).api?.studioGenerate) return (window as any).api;
  return null;
}

export function hasAiBridgeApi(): boolean {
  return getApi() !== null;
}

async function request(endpoint: "image" | "text", model: string, payload: unknown, requiresKey?: boolean): Promise<any> {
  const api = getApi();
  if (!api) throw new Error("Studio API not available — pastikan preload sudah diinisialisasi");
  const result = await api.studioGenerate({ endpoint, model, payload, requiresKey });
  if (!result.success) {
    const error: any = new Error(`Studio generate failed: ${result.status || result.detail || "unknown"}`);
    error.kind = "request";
    error.status = result.status;
    error.retryable = result.status === 408 || result.status === 429 || (result.status >= 500 && result.status < 600);
    error.retryHint = result.status === 401 || result.status === 403 ? "provider_auth_or_fallback" : error.retryable ? "retry_or_provider_fallback" : undefined;
    error.detail = result.detail;
    error.response = result.response;
    throw error;
  }
  return result.response;
}

export async function generateText(model: string, payload: unknown, requiresKey?: boolean): Promise<string> {
  const response = await request("text", model, payload, requiresKey);
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  if (!text) {
    const error: any = new Error("Studio generate empty response");
    error.kind = "empty";
    error.response = response;
    throw error;
  }
  return text;
}

export async function generateJSON(model: string, payload: unknown, requiresKey?: boolean): Promise<any> {
  const text = await generateText(model, payload, requiresKey);
  // ponytail: generation.ts's extractJSONFromText stays canonical until Fase 4 dedups.
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    for (const match of [stripped.match(/\{[\s\S]*\}/), stripped.match(/\[[\s\S]*\]/)]) {
      if (match) try { return JSON.parse(match[0]); } catch { /* try next shape */ }
    }
    const error: any = new Error("Studio generate invalid JSON response");
    error.kind = "invalid_json";
    error.text = text;
    throw error;
  }
}

export async function generateImage(model: string, payload: unknown, requiresKey?: boolean): Promise<string | null> {
  const response = await request("image", model, payload, requiresKey);
  const candidate = response?.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
    }
  }
  if (Array.isArray(response?.images) && response.images[0]) {
    const image = response.images[0];
    if (image.b64Json) return `data:image/png;base64,${image.b64Json}`;
    if (image.data) return `data:image/png;base64,${image.data}`;
  }
  return null;
}
