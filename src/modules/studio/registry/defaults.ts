// ── SYSTEM_DEFAULT_SETTINGS (line 2005) ──
export const SYSTEM_DEFAULT_SETTINGS = {
  commercialRules: {
    defaultNegativePrompt:
      "white box, frame, border, square card, margin, bounding box, watermark, text, typography, letters, numbers, logo, brand name, signature, blurry, distorted, low quality, extra limbs, jpeg artifacts, poorly drawn, readable signage, split screen, before and after layout, diagram labels, titles, stock watermarks, website watermarks, freepik watermark",
    // EU-10: Marketplace Differentiation — knowledge-based genericity check
    // sebelum generate. Default ON meski (a) menambah 1 API call text per prompt,
    // dan (b) butuh API key karena memanggil generateContent text model yang
    // menolak caller tanpa identity (unregistered callers → 403), agar cek saturasi aktif.
    enableDifferentiationCheck: true,
  },
  aiConfig: {
    provider: "9router",
    textModel: "ag/gemini-2.5-flash",
    imageModel: "ag/gemini-3.1-flash-image",
    hasGeminiKey: false,
    hasNineRouterKey: false,
  },
  imaginVideoUrl: "https://labs.google/fx/tools/flow/shared/tool/6ab19380-04db-4e56-a285-1ee31d8f5c1e",
};
