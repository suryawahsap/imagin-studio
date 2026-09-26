export type ModuleKey = "studio" | "vectorize" | "upscale" | "remotion" | "metadata" | "gallery";

export const MODULE_ACCENT: Record<ModuleKey, string> = {
  studio: "var(--color-mod-st-vivid, #b6a8d8)",
  upscale: "var(--color-mod-up-vivid, #9dbede)",
  vectorize: "var(--color-mod-ve-vivid, #9cc6a5)",
  remotion: "var(--color-mod-an-vivid, #eab094)",
  metadata: "var(--color-mod-li-vivid, #d9c483)",
  gallery: "var(--color-mod-li-vivid, #d9c483)",
};

export const MODULE_LABEL: Record<ModuleKey, string> = {
  studio: "Studio",
  upscale: "Upscale",
  vectorize: "Vectorize",
  remotion: "Remotion",
  metadata: "Metadata",
  gallery: "Gallery",
};

export const MODULE_WORKSPACE_TITLE: Record<ModuleKey, string> = {
  studio: "AI Generation",
  upscale: "Upscale Workspace",
  vectorize: "Vectorize Workspace",
  remotion: "Remotion Animation",
  metadata: "Metadata Workspace",
  gallery: "Gallery - Assets",
};
