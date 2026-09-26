import { generateImage } from "./ai-bridge";
import { generateImageWithGemini } from "./generation";
import { saveAssetDB } from "./storage";

export function buildRegeneratedPrompt(originalPrompt: string, regenerationPlan: any): string {
  const parts = [originalPrompt];
  if (regenerationPlan?.reinforce?.length) parts.push("REINFORCED CONSTRAINT: " + regenerationPlan.reinforce.join("; "));
  if (regenerationPlan?.remove?.length) parts.push("EXPLICITLY FORBIDDEN: " + regenerationPlan.remove.join(", "));
  return parts.filter(Boolean).join(" | ");
}

export async function autoRegenerateAsset(asset: any, plan: any, ctx: any): Promise<any> {
  const { systemSettings, setAssets, incrementApiCallCounter, finalizeAsset } = ctx;
  if (!asset?.url) return { ok: false, reason: "NO_URL" };
  const reinforcedPrompt = buildRegeneratedPrompt(asset.baseTheme || asset.prompt || "", plan);
  const raw = await generateImageWithGemini(reinforcedPrompt, asset.aspectRatio || "4:3", asset.negativePrompt, systemSettings.aiConfig, incrementApiCallCounter);
  if (!raw) return { ok: false, reason: "rate_limit" };
  const finalized = await finalizeAsset(raw, asset.background, asset.assetType, "none", asset.aspectRatio || "4:3", asset.outputFormat || "PNG", asset.style || "");
  const attempt = (asset.lineage?.autoRegeneration?.attempt || 0) + 1;
  const regenerated = {
    ...asset, url: finalized.dataUrl, isLoading: false, status: "draft", assembledPrompt: reinforcedPrompt, resolutionTarget: undefined,
    svgUrls: undefined, svgStats: undefined,
    resolution: { width: finalized.width, height: finalized.height, wasUpscaled: false, scaleFactor: 1 },
    lineage: { ...asset.lineage, regeneratedFrom: asset.id, autoRegeneration: { attempt, reinforcedPrompt, reason: plan?.reinforce?.join("; ") || "" } },
  };
  const saveResult = await saveAssetDB(regenerated);
  if (!saveResult.success) {
    console.warn(`[Imagin] Auto-regeneration save failed for asset ${asset.id}`);
    return { ok: false, reason: "save_failed" };
  }
  setAssets((prev: any[]) => prev.map(a => a.id === asset.id ? regenerated : a));
  console.warn(`[Imagin] Auto-regeneration attempt ${attempt} untuk asset ${asset.id} (${reinforcedPrompt.slice(0, 80)}…)`);
  return { ok: true, asset: regenerated };
}

async function generateVariant(modelChain: string[], payloads: Array<{ label: string; body: unknown }>, onApiCall: () => void, label: string): Promise<string | null> {
  for (const model of modelChain) {
    for (const variant of payloads) {
      try {
        onApiCall();
        const image = await generateImage(model, variant.body, true);
        if (image) return image;
        console.warn(`[${label}] Model ${model} (${variant.label}) returned no inline image data.`);
      } catch (error: any) {
        console.warn(`[${label}] Model ${model} (${variant.label}) failed:`, error);
      }
    }
  }
  return null;
}

export const generateRevisionVariant = (modelChain: string[], payloads: Array<{ label: string; body: unknown }>, onApiCall: () => void) =>
  generateVariant(modelChain, payloads, onApiCall, "Revision");

export const generateObjectModVariant = (modelChain: string[], payloads: Array<{ label: string; body: unknown }>, onApiCall: () => void) =>
  generateVariant(modelChain, payloads, onApiCall, "ObjectMod");
