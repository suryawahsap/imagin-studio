const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const isValid9RouterModel = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 256 && value.trim() === value;

export const sanitize9RouterModelCatalog = (value: unknown): string[] =>
  [...new Set((Array.isArray(value) ? value : []).filter(isValid9RouterModel))].sort().slice(0, 200);

export const isValid9RouterModelCatalog = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 200 && value.every(isValid9RouterModel);

export const parse9RouterImageResponse = (contentType: string | null, bodyText: string): unknown | null => {
  if (!contentType?.toLowerCase().includes("text/event-stream")) {
    try { return JSON.parse(bodyText); } catch { return null; }
  }
  // ponytail: progress events are intentionally ignored; add renderer progress plumbing only when demanded.
  let lastValid: Record<string, unknown> | null = null;
  for (const line of bodyText.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    try {
      const payload = JSON.parse(line.slice(5).trim());
      if (!isRecord(payload)) continue;
      if (payload.error !== undefined) {
        lastValid = payload;
        continue;
      }
      if (Array.isArray(payload.data)) {
        const item = payload.data[0];
        if (item && (item.b64_json || item.url)) lastValid = payload;
        else if (!lastValid) lastValid = payload;
      }
    } catch { /* skip malformed SSE lines */ }
  }
  return lastValid;
};

export const normalize9RouterBaseUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/v1(?:\/models)?$/i, "");
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
};

export const normalize9RouterImageEndpoint = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    url.pathname = url.pathname.replace(/\/+$/, "");
    if (!url.pathname.endsWith("/v1/images/generations")) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

export type Classified9RouterModel = { id: string; classified: "text" | "image" };

const values = (model: Record<string, unknown>, keys: string[]): string[] =>
  keys.flatMap((key) => Array.isArray(model[key]) ? model[key].filter((value): value is string => typeof value === "string") : []);

const saysImage = (model: Record<string, unknown>): boolean => {
  const modalities = values(model, ["modalities", "input_modalities", "output_modalities"]).map((value) => value.toLowerCase());
  const namedImageType = ["type", "model_type", "kind", "arch"].some((key) =>
    typeof model[key] === "string" && /image|vision|diffusion|text.to.image|image.generation/i.test(model[key] as string));
  const imageOperation = values(model, ["supported_operations", "capabilities"]).some((value) =>
    /image|text.to.image|image.generation|generate.images/i.test(value));
  const capabilities = isRecord(model.capabilities) ? model.capabilities : null;
  const flags = ["image_generation", "generate_images", "text_to_image"].some((key) => model[key] === true) ||
    !!capabilities && ["image_generation", "generate_images", "text_to_image"].some((key) => capabilities[key] === true);
  return modalities.includes("image") || namedImageType || imageOperation || flags || capabilities?.imageOutput === true;
};

export const classify9RouterModels = (data: unknown, imageData: unknown = []): { textModels: string[]; imageModels: string[]; models: Classified9RouterModel[] } => {
  const text = new Set<string>();
  const image = new Set<string>();
  const models: Classified9RouterModel[] = [];
  for (const model of Array.isArray(data) ? data : []) {
    if (!isRecord(model) || !isValid9RouterModel(model.id)) continue;
    const id = model.id;
    const imageGeneration = saysImage(model) || /(?:image|imagen|flux|dall-?e|dall|recraft|seedream|sd3|sdxl|stable|midjourney)/i.test(id);
    if (imageGeneration) image.add(id);
    else text.add(id);
    models.push({ id, classified: imageGeneration ? "image" : "text" });
  }
  for (const model of Array.isArray(imageData) ? imageData : []) {
    if (!isRecord(model) || !isValid9RouterModel(model.id)) continue;
    image.add(model.id);
    text.delete(model.id);
    const existing = models.find((entry) => entry.id === model.id);
    if (existing) existing.classified = "image";
    else models.push({ id: model.id, classified: "image" });
  }
  return { textModels: sanitize9RouterModelCatalog([...text]), imageModels: sanitize9RouterModelCatalog([...image]), models };
};
