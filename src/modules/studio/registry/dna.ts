// Studio DNA registry — diekstrak dari imagin_studio.tsx.
// Berisi: GLOBAL_DNA, STYLE_PRESET_DNA, CATEGORY_DNA, MARKET_PALETTES, GLOBAL_CGA_DATABASE.
// DNA engine functions (createDNATracker, buildDNAContext, dll.) ada di engines/dna-engine.ts.

// (import engines/storage dihapus — cluster DNA engine duplikat sudah dibersihkan; canonical: engines/dna-engine.ts)
import { getBatchRules, pickWithBatchLimit } from "../engines/prompt-helpers";

export const GLOBAL_DNA = {
  adobeCompliance: {
    commercialQuality:
      'Vector & high-end flat illustration standard, sharp resolution, clean vector finish.',
    negativeSpace:
      'Minimal 30% area kosong bersih untuk kebebasan penempatan teks buyer (Web/Print layout).',
    subjectClarity:
      'Focal point tunggal atau kelompok yang tegas, tidak ambigu.',
    edgeQuality:
      'Clean edges, tidak ada pemotongan subjek yang tidak disengaja (no accidental cropping).',
    backgroundPreference:
      'White/minimal/isolated background sangat diutamakan untuk kemudahan cutout.',
    noLensSimulation:
      'Dilarang menggunakan simulasi kamera realistik (bokeh, aperture, depth of field, ISO, shutter speed) untuk aset vektor/ilustrasi.',
    thumbnailViability:
      'MICROSTOCK THUMBNAIL RULE: the final image MUST read clearly, distinctly, and compellingly at 120×80px thumbnail size — ' +
      'high contrast between subject and background, bold clearly defined focal subject, no important detail that disappears at small scale, ' +
      'avoid muted low-contrast compositions that sink in a crowded gallery — Adobe Stock buyers scan hundreds of thumbnails and this image must stop their scroll.',
  },
  // Khusus assetType 'photo' — kebalikan dari token vektor (adobeCompliance).
  // Token vektor MEMBUNUH fotorealisme (ban DOF/bokeh, minta flat & putih),
  // jadi photo memakai compliance tersendiri agar model fotografi tidak
  // disuruh memproduksi tampilan flat/gambar vektor.
  photoCompliance: {
    commercialQuality:
      'Professional photorealistic digital photography, editorially clean commercial framing, natural authentic rendering.',
    subjectClarity: 'Focal point single atau kelompok yang tegas, tidak ambigu.',
    edgeQuality:
      'Clean natural framing, tidak ada pemotongan subjek yang tidak disengaja (no accidental cropping).',
    backgroundPreference:
      'Natural full-scene environmental background (SCENE), bukan putih/isolated, sesuai konteks subjek.',
    lensDepth:
      'Inginkan kedalaman bidang sinematik yang realistis (depth of field/bokeh alami), pencahayaan sengaja, komposisi editorial.',
    negativeSpace:
      'Komposisi full-bleed, edge-to-edge, jumlah space kosong minimal (bukan untuk cutout buyer).',
  },
  // Supplier photo: universalNegativePrompt diperhalus — jangan larang bokeh/
  // depth-of-field karena itu inti fotografi. Token larangan-kamera tetap ada
  // hanya untuk vektor/ilustrasi (anti-fotorealisme).
  microstockAvoidance: [
    'Logo', 'trademark', 'brand mark', 'copyright symbol',
    'text/typography (kecuali placeholder fiktif)', 'watermark', 'QR code', 'barcode',
    'UI screenshot aplikasi/OS asli', 'produk fisik bermerek yang teridentifikasi',
    'wajah/kemiripan tokoh publik/selebriti', 'simbol politik/segel resmi negara', 'desain mata uang asli',
  ],
  universalNegativePrompt:
    'watermark, text, logo, signature, trademark, copyright, cropped subject, low quality, blurred edges, distorted anatomy, photographic bokeh, camera depth of field, noisy textures, artifacting',
};

//  DNA ENGINE V5 — STYLE PRESET DNA

export const STYLE_PRESET_DNA = {
  flatCommercial: {
    promptTrigger:
      'clean commercial flat vector illustration with bold confident shape work and solid flat color fills — ' +
      'no gradients, no textures, no shadows, no depth illusion of any kind, ' +
      'bold uniform outlines defining each shape clearly with consistent identical stroke weight throughout — stroke must be heavy enough to read clearly when image is reduced to thumbnail size, ' +
      'color palette: 3–5 harmonious colors maximum — bright and saturated but tasteful, never neon or muddy, high contrast between subject and background color, ' +
      'all shapes are geometric, clean, and simplified — no organic rough edges, no hand-drawn variation, perfect crisp vector curves, ' +
      'composition: single dominant focal subject centered with generous negative space — buyer must immediately identify the subject at a glance, ' +
      'pure 2D flat plane — every element sits on the same visual layer, no perspective, no drop shadows, no highlights, ' +
      'THUMBNAIL CRITICAL: the focal subject must be immediately recognizable at 120×80px — bold outlines + high-contrast fills guarantee scroll-stopping visibility in Adobe Stock gallery, ' +
      'quality reference: Adobe Stock bestseller flat illustration top 100, Shutterstock top contributor vector clipart, Freepik premium flat vector collection, Google Workspace product illustration',
    characteristics:
      'Sangat bersih, kontras tinggi, bold outlines + flat fills, thumbnail-safe. Preset paling aman untuk microstock, Web UI & Corporate Assets.',
    negativePrompt:
      'gradient fills, drop shadow, texture, photorealistic material, depth-of-field blur, hand-drawn rough edge, sketch quality, 3D dimension, isometric perspective, muted desaturated palette, thin hairline outline that disappears at thumbnail',
  },
  editorialScene: {
    promptTrigger:
      'sophisticated editorial vector illustration with rich narrative scene composition — multiple visual elements working together to tell a story or communicate a concept, ' +
      'linework: expressive with subtle purposeful variation in stroke quality — lines feel drawn with intention, slightly organic without being hand-drawn loose, ' +
      'color palette: rich, curated, and limited — 5–7 harmonious colors maximum, one dominant hue with neutral supporting tones, sophisticated and mature rather than bright or playful, ' +
      'deliberate compositional depth using foreground, midground, and background layers — size and overlap hierarchy creates spatial reading, ' +
      'focal hierarchy RULE: despite compositional complexity, ONE element must clearly dominate as the visual anchor — eye must land there first even at thumbnail size; background elements must be visually subordinate and less saturated than the focal subject, ' +
      'conceptual storytelling: the image communicates an idea, metaphor, or scenario beyond simple object depiction — viewer should read a "scene" or "situation", ' +
      'figures if present are stylized and proportionally confident — not photorealistic, not cartoonish — conceptual editorial human scale, ' +
      'optional subtle grain texture layer on flat color areas to give editorial print or offset printing feel, ' +
      'THUMBNAIL CRITICAL: complex scenes risk becoming unreadable at thumbnail — anchor the composition with a single high-contrast focal point that reads at 120×80px; do not distribute visual weight equally across the scene, ' +
      'quality reference: The New Yorker editorial illustration, The Economist cover art, Bloomberg Businessweek feature illustration, Penguin Books literary cover, TIME Magazine cover illustration',
    characteristics:
      'Kompleksitas naratif tinggi, suasana majalah premium, palette curated, focal hierarchy yang kuat. Cocok untuk editorial, feature story, majalah, brand premium.',
    negativePrompt:
      'bright cheerful primary colors, simple clipart flat composition, childish or playful style, photorealistic render, harsh neon palette, no storytelling context, equally-weighted busy composition with no clear focal point that disappears at thumbnail',
  },
  linealColor: {
    promptTrigger:
      'professional lineal color vector illustration — bold consistent outline as the structural backbone of every single shape, filled with harmonious flat solid colors inside, ' +
      'outline must be heavy, confident, and IDENTICAL stroke weight on every element throughout — absolutely no thin hairlines, no variation, no omitted outline on any shape whatsoever, ' +
      'color fills: flat solid only — 4–6 color palette maximum, zero gradients inside fills, zero shading, zero highlight tone variation on top of fills, ' +
      'outline color: solid black or very dark navy — not grey, not color-matched to the fill, always clearly visible against any fill color, ' +
      'accent colors placed intentionally on key focal elements to draw visual attention — distributed by compositional hierarchy, not randomly, ' +
      'shapes are clean and geometrically resolved — smooth curves, parallel straight lines, consistent corner radius treatment, ' +
      'overall character: professional, readable, systematically consistent — looks like it belongs in a premium icon system or top-tier stock collection, ' +
      'quality reference: Flaticon premium icon set, Adobe Stock top vector clipart collection, Google Material Design illustration, Noun Project illustrated icon',
    characteristics:
      'Outline konsisten + flat fills terbatas. Paling aman untuk microstock, mudah dibaca di thumbnail kecil, preset utama untuk sebagian besar aset.',
    negativePrompt:
      'hairline thin stroke, inconsistent stroke weight on different elements, gradient fill inside shape, shading or tonal variation inside colored area, omitted outline on any shape, sketchy organic linework',
  },
  threeDProduct: {
    promptTrigger:
      'photorealistic 3D product render with studio-quality presentation — the subject is a single product or small product group, clean hero shot, ' +
      'background: perfectly clean pure white OR very light neutral grey gradient — no environmental props, no lifestyle context competing with the product, ' +
      'three-point studio lighting setup: soft key light from upper-left front creating appealing highlight on primary face, gentle fill light from right eliminating harsh shadow, subtle rim light from behind separating product edge cleanly from background, ' +
      'material rendering must be accurate and appetizing: plastic shows controlled clean reflectivity, metal shows precise specular highlight, glass shows natural transparency with subtle refraction, fabric shows weave texture, wood shows grain direction, ' +
      'very clean soft drop shadow directly beneath product — not too dark, not too spread wide, perfectly centered under the object, ' +
      'camera angle: slightly elevated 3/4 front-top view simultaneously showing primary face and slight top surface — the most commercially appealing product angle, ' +
      'no text, no brand markings, no extra props — pure isolated product showcase, ' +
      'render quality reference: Apple product photography, Behance top product render, Amazon premium product image, Adobe Stock bestselling 3D clipart object',
    characteristics:
      '3D product render studio: isolasi produk di background putih/netral, pencahayaan 3 titik, material akurat. Cocok untuk catalog, e-commerce, clipart premium.',
    negativePrompt:
      'isometric angle, flat 2D vector look, environmental lifestyle background, multiple competing props, dark moody setting, cartoon cel-shading, harsh single-direction shadow, low-poly blocky geometry, photorealistic human figure in shot',
  },
  handDrawn: {
    promptTrigger:
      'authentic hand-drawn organic illustration style — linework feels genuinely drawn by a human hand: subtle natural variation in stroke thickness, pleasantly imperfect but intentional curves, warm and alive rather than mechanically precise, ' +
      'line character: confident and purposeful — not scratchy or messy, not ruler-straight — the variation is controlled and artisan-quality like a skilled illustrator working with a brush pen, fountain pen, or ink brush, ' +
      'MINIMUM LINE WEIGHT RULE: even the thinnest variation of the hand-drawn stroke must remain clearly visible at small display sizes — if a line would disappear at 120×80px thumbnail, it is too thin and must be thickened; the organic character lives in the variation, not the thinness, ' +
      'color palette: warm, natural, earthy — limited 4–6 colors maximum, often includes warm cream, terracotta, sage green, warm dusty blue, dusty rose — the palette of a handmade goods brand — ensure sufficient contrast between fill colors and background for thumbnail legibility, ' +
      'flat color fills inside shapes with optional subtle grain or texture overlay reinforcing the hand-crafted, printed quality, ' +
      'no clean perfect geometric shapes — all forms are organically shaped: leaves are not perfect ovals, circles have character, lines have life, ' +
      'composition warm and welcoming — single clear focal subject with generous negative space — the visual warmth of an independent shop, artisan brand, handmade cookbook, or boutique stationery label, ' +
      'THUMBNAIL CRITICAL: earthy muted palettes risk blending into backgrounds at small size — ensure the main subject has clearly distinct value contrast from its surrounding area, ' +
      'quality reference: Etsy bestselling hand-drawn clipart top sellers, Paper & Tea brand illustration, Rifle Paper Co illustration system, small-batch artisan product packaging, vintage nature field guide illustration',
    characteristics:
      'Organik & playful, garis dengan variasi manusiawi (min weight untuk thumbnail safety), palette hangat earthy. Cocok untuk brand artisan, buku anak, konten lifestyle hangat.',
    negativePrompt:
      'mechanically perfect geometric shapes, clean ruler-straight lines, harsh neon color palette, cold clinical aesthetic, digital gradient, photorealistic texture, flat uniform stroke weight with zero variation, strokes so thin they become invisible at small sizes',
  },
  minimalOutline: {
    promptTrigger:
      'ultra-minimal outline vector illustration — single continuous clean stroke defines every shape with absolute economy of line, ' +
      'line weight: thin and elegant, but NEVER hairline — the stroke must remain clearly visible and legible at 120×80px thumbnail: test mentally whether the line would disappear at small size; if yes, increase weight — minimum visible stroke at thumbnail, maximum elegance at full size, ' +
      'no fills of any kind — pure outline only, white interior, the negative space inside and around shapes IS the composition, ' +
      'shapes are reduced to their most essential gesture — maximum simplification while remaining recognizable, drawn with the minimum possible number of strokes, ' +
      'no texture, no shadow, no gradient, no color accent — literally just the clean outline stroke, ' +
      'color: high-contrast black on pure white for maximum thumbnail legibility — OR a single deliberate dark accent color on white — never light grey lines (grey-on-white disappears at thumbnail), ' +
      'composition breathes — subject floats in generous intentional negative space, never crowded or cramped, ' +
      'simplification rule: the fewer the lines, the more each line must carry meaning — if a line can be removed without losing subject recognition, remove it, ' +
      'THUMBNAIL CRITICAL: this style is high-risk at thumbnail because thin lines on white can vanish — compensate with: (1) bold enough stroke weight, (2) maximum simplification so few lines carry maximum impact, (3) pure black lines not grey, ' +
      'quality reference: Muji product packaging line art, Swiss International Style design system, Dieter Rams product aesthetic, high-end minimalist stationery brand, Adobe Stock minimalist outline collection',
    characteristics:
      'Garis tipis minimal tapi thumbnail-safe (tidak hairline, hitam murni), interior putih, ruang negatif dominan. Cocok untuk UI system, premium stationery, brand minimalis, icon set sophisticated.',
    negativePrompt:
      'hairline stroke that disappears at small size, light grey lines on white background (no contrast), color fills inside shapes, gradient, drop shadow, texture, multiple outline colors, decorative ornamental linework, complex busy composition, hand-drawn rough variation',
  },
  seamlessPattern: {
    promptTrigger:
      'beautifully crafted seamless repeating surface pattern design — tiles perfectly edge-to-edge with zero visible seam or repeat break in any direction, ' +
      'pattern density: well-balanced coverage — not too sparse (feels empty) and not too dense (feels claustrophobic) — motifs distributed with pleasing visual rhythm and deliberate breathing room between elements, ' +
      'motif scale: individual motifs must be large enough that their character and charm are immediately visible at thumbnail size — avoid micro-tiny motifs that become an indistinct texture at 120×80px; motifs should read as distinct recognizable shapes, ' +
      'motif style: clean, charming, and commercially versatile — flat vector, simple illustration, or decorative element — consistent visual style across ALL motif elements without exception, ' +
      'color palette: 3–6 harmonious colors maximum — one clear background color plus 2–4 high-contrast motif colors — strong contrast between background and motifs is essential for pattern to read at thumbnail; avoid similar-value palette where motifs blend into background, ' +
      'repeat structure: full drop repeat OR half-drop repeat OR brick offset repeat — whichever creates the most natural, unforced motif distribution, ' +
      'no single motif should feel isolated or stranded — motifs coordinate, echo, and connect with neighbors to create visual unity across the tiled field, ' +
      'tiling coherence: the pattern must read as one continuous fabric/surface when tiled, not as a grid of separate rectangular tiles, ' +
      'THUMBNAIL CRITICAL: patterns must look appealing at 120×80px — at that size the repeat character and color palette must be immediately beautiful; the thumbnail is the product in a pattern collection, ' +
      'quality reference: Spoonflower bestselling surface pattern, Society6 top print design, Liberty London textile print, Adobe Stock seamless pattern bestseller collection, Scandinavian design textile repeat',
    characteristics:
      'Pattern repeat sempurna tanpa seam, distribusi motif ritmis, motif scale thumbnail-readable, palette high-contrast. Cocok untuk textile, wallpaper, packaging, wrapping paper, digital background.',
    negativePrompt:
      'visible tile border or seam line, motifs cut abruptly at edge, uneven distribution with large empty gaps, inconsistent motif scale mixing tiny and huge elements, motifs so tiny they become indistinct noise at thumbnail, low-contrast palette where motifs blend into background, photorealistic render, complex gradient fills',
  },

  // ── Style yang sudah ada di UI dropdown tapi belum punya DNA ──────────────

  cuteFoodObject: {
    promptTrigger:
      'cute semi-realistic food and object illustration with soft painterly texture rendering — the premium clipart quality seen in top-selling Etsy digital download shops and Adobe Stock food illustration, ' +
      'colors are pastel but chromatic and clearly distinguishable — soft pink, lavender purple, golden yellow, sage green, warm chocolate brown — each color distinct, appealing, and high enough in chroma to read clearly at thumbnail, ' +
      'each object has clear 3D volume and roundness: bright soft highlight at the top-center of rounded surfaces, mid-tone color body, darker shadow tone at the bottom and underside — the highlight-midtone-shadow trio is mandatory on every rounded surface, ' +
      'surface texture: very subtle soft painterly brushstroke texture on the color surface — not flat vector fill, not heavy paint strokes — a gentle organic texture that gives hand-crafted premium feel, ' +
      'edge treatment: soft clean edges with minimal to no harsh outline — shape defined by color transition and subtle shadow — any visible outline must be very thin, soft, and color-matched (warm tone), never harsh black, ' +
      'lighting: gentle soft drop shadow directly beneath object on white background, creating subtle grounding, ' +
      'background: pure white or very light neutral — maximum contrast against soft pastel subject, ' +
      'THUMBNAIL CRITICAL: single isolated object on white background = naturally thumbnail-friendly; ensure the pastel colors are chromatic enough (not grey-washed) to stand out against white; highlight dot at top must be bright and visible, ' +
      'quality reference: Etsy top-selling cute food clipart, Adobe Stock food illustration bestsellers, Pinterest-viral bakery clipart, Canva premium element library, LINE sticker food character',
    characteristics:
      'Ilustrasi food/object semi-realistis dengan volume 3D subtle (highlight-midtone-shadow), warna pastel chromatic, tekstur painterly halus — bukan flat vector, bukan full watercolor. Cocok untuk sticker, clipart, bakery brand, lifestyle content.',
    negativePrompt:
      'flat no-volume illustration, harsh black heavy outline, photorealistic render, dark moody background, neon oversaturated colors, heavy chaotic painterly brushstroke, muted desaturated grey-washed palette, anime style, cartoon flat uniform fill, no highlight or shadow volume, sketchy rough unpolished linework',
  },

  cuteKidsNursery: {
    promptTrigger:
      'soft children\'s book illustration style with nursery art warmth and kawaii-adjacent commercial appeal — targeting the premium end of Adobe Stock children\'s illustration, ' +
      'all shapes are round, chubby, and softly formed — no sharp corners, no angular geometry, everything has a plush toy quality with maximum roundness on every corner and surface, ' +
      'color palette: soft dreamy pastel — dusty pink, powder blue, mint green, soft lavender, warm cream, gentle sunny yellow — all gently desaturated and warm, NEVER harsh or neon — but maintain enough chroma distinction between colors so they read clearly at thumbnail scale, ' +
      'character design: appealing simplified features with large expressive eyes that radiate warmth, small button nose, warm gentle smile, classic kawaii head-to-body proportion (large head, smaller body) — character must evoke instant emotional warmth in 2 seconds, ' +
      'linework: consistent warm medium-weight outline in soft warm brown or dusty navy — thick enough to define shapes clearly at small display size, friendly and hand-drawn in character, ' +
      'surface rendering: gentle subtle watercolor-like wash inside shapes OR clean flat fill — both acceptable, the warmth comes from color choice and shape language, not photorealism, ' +
      'overall feeling: safe, warm, loving, imaginative — a parent choosing this for a nursery must feel it is perfect before reading the description, ' +
      'THUMBNAIL CRITICAL: kawaii characters with large expressive eyes read beautifully at thumbnail — ensure character fills significant portion of the frame, pastel colors are warm enough to feel inviting (not cold-grey), background is clean white or very light to maximize character visibility, ' +
      'quality reference: children\'s picture book illustration Caldecott Honor level, Jellycat plush toy packaging art, Hallmark baby greeting card premium line, Cath Kidston kids pattern, Adobe Stock nursery art top performers',
    characteristics:
      'Nursery art hangat — bentuk chubby rounded, palette pastel warm-chromatic (thumbnail-readable), karakter kawaii dengan mata ekspresif besar. Cocok untuk buku anak, apparel, dekorasi nursery, kartu bayi, sticker.',
    negativePrompt:
      'dark moody atmosphere, sharp angular design, adult realistic proportions, harsh cold black outline (use warm brown), horror or scary element, saturated neon color, cold grey clinical palette, photorealistic skin texture, anime action dynamic pose, desaturated washed-out grey-on-grey palette',
  },

  flatRounded: {
    promptTrigger:
      'flat design illustration with pronounced soft rounded corners on every single shape — the rounding is significant and intentional, not subtle, ALL corners uniformly rounded creating a friendly approachable character throughout, ' +
      'shapes: smooth organic forms built from rounded rectangles, pill shapes, and soft ellipses — the visual language of a friendly productivity app or tech startup illustration system, ' +
      'depth: very gentle flat shadow layer beneath objects — NOT a gradient or blurred shadow, just a slightly darker offset solid shape — suggesting soft dimensional quality while remaining firmly 2D flat, ' +
      'color palette: soft, friendly, and modern — bright enough to feel energetic but comfortable rather than aggressive — often slightly desaturated or pastel-adjacent, maximum 5–6 colors per composition, high enough contrast between subject and background to read at thumbnail, ' +
      'no textures, no gradients, no realistic materials — but warmer and softer than strict flat commercial due to the rounded language and gentle implied depth, ' +
      'absolute consistency: every element in the composition follows the same rounded language — no sudden sharp corners appearing anywhere, the system must feel unified, ' +
      'THUMBNAIL CRITICAL: rounded shapes + clear color contrast = naturally readable at small size; ensure the main subject occupies significant frame area with clear visual weight, ' +
      'quality reference: Oura app illustration, Notion website illustration system, Linear app onboarding art, Intercom product design illustration, Slack marketing illustration, Adobe Stock technology flat illustration top performers',
    characteristics:
      'Flat design dengan rounding dominan, shadow flat subtle, thumbnail-safe. Cocok untuk app illustration, SaaS product page, tech startup, infographic.',
    negativePrompt:
      'sharp angular corners anywhere in composition, photorealistic texture or material, hand-drawn rough edge variation, gradient fill, complex multi-layer scene, photorealistic drop shadow with blur, muted low-contrast palette that loses subject at thumbnail',
  },

  boldFilled: {
    promptTrigger:
      'bold graphic filled illustration style with maximum visual impact — built entirely from large solid flat color fills with minimal internal detail, zero texture, zero gradients, pure high-contrast graphic strength readable from a distance, ' +
      'silhouette is everything: objects are recognizable entirely through their outline shape and color area — internal detail is stripped to near zero, the boldest simplification possible while remaining legible, ' +
      'color palette: extremely limited and high-contrast — 2–4 colors maximum, often using strong complementary pairs, bold primaries, or black-and-one-accent — every color choice has maximum visual impact, ' +
      'stroke: outlines may be present (heavy bold chunky strokes matching the weight of fill areas) or absent entirely — never thin delicate lines, never hairlines — if lines exist they are THICK and BOLD, ' +
      'scale and visual weight: shapes are large, chunky, and confident — nothing delicate, small, or intricate — every element commands space and presence in the composition, ' +
      'negative space: the white space around filled shapes is as intentional and graphic as the filled shapes themselves — both read as designed elements, ' +
      'THUMBNAIL NOTE: this style is inherently the most thumbnail-safe of all — bold fills + high contrast = impossible to miss in a gallery; use this confidence as a feature, not an accident, ' +
      'commercial viability: for Adobe Stock, anchor with broad-appeal subjects (business, holiday, lifestyle, nature) — the bold graphic language elevates any commercial subject to premium poster quality, ' +
      'quality reference: Constructivist graphic design tradition, Saul Bass film title aesthetic, bold risograph concert poster, Adobe Stock bestselling bold vector illustration, Freepik premium bold graphic collection',
    characteristics:
      'Bentuk solid tebal, kontras ekstrem, palette 2–4 warna maksimum — style paling thumbnail-safe karena inherently bold. Cocok untuk poster, merchandise, logo illustration, brand statement yang kuat.',
    negativePrompt:
      'thin delicate hairline stroke, gradient fill, detailed realistic internal texture, muted low-contrast palette, small intricate detail, complex layered scene, photorealistic render',
  },

  texturedEditorial: {
    promptTrigger:
      'editorial illustration with authentic grain and texture overlay — every color fill has a visible fine grain/noise texture on its surface, NOT a smooth digital flat fill, a physical printed quality, ' +
      'texture character: fine grain that reads like risograph printing, screen-print ink saturation, or high-quality film — mechanical and intentional, NOT random digital noise or heavy painterly brushwork, ' +
      'color palette: limited and considered — 3–5 colors maximum, often: warm paper-cream or off-white background, one or two strong saturated accent colors, warm neutral supporting tone — the palette of a well-art-directed literary magazine; ensure accent colors are saturated enough to read through grain at thumbnail, ' +
      'linework: slightly organic and expressive — lines feel drawn even if digitally created, subtle variation in quality gives hand-crafted editorial character, ' +
      'composition: strong graphic shape hierarchy, deliberate use of cream/off-white background as an active graphic element — not empty space but designed breathing room, ' +
      'ink quality: areas of color feel printed and physical — they absorb rather than glow, grain implies a mechanical printing process, ' +
      'THUMBNAIL CRITICAL: grain texture can reduce effective contrast at small size — compensate with stronger saturation on key focal elements and clear value contrast between subject and background; the grain should add warmth, not obscure the subject, ' +
      'quality reference: New York Times Op-Art section, Monocle Magazine illustration, UPPERCASE Magazine cover art, high-quality risograph zine illustration, Adobe Stock editorial illustration premium collection',
    characteristics:
      'Ilustrasi editorial dengan grain/risograph texture — warna terasa dicetak bukan digital, focal contrast diperkuat untuk thumbnail safety. Cocok untuk majalah, literary brand, packaging artisan, editorial premium.',
    negativePrompt:
      'clean smooth perfect digital fill with zero grain, photorealistic render, heavy digital gradient, overly polished glowing digital look, neon bright color, cheerful playful children style, grain so heavy it obscures subject at thumbnail size',
  },

    // ── Style BARU — Isometric 3D ────────────────────────────────────────────

  isometric3D: {
    promptTrigger:
      'precise isometric 3D illustration style — all objects rendered from a strict 45-degree isometric viewing angle with consistent parallel projection throughout the ENTIRE composition, ' +
      'absolutely no perspective distortion — all parallel lines remain parallel with zero vanishing point, pure isometric geometry applied uniformly to every element, ' +
      'clean flat color fills on each visible face of every 3D object with controlled face-brightness differentiation: top face brightest (light source above), left face mid-tone, right face darkest — ' +
      'creating isometric depth through controlled color value steps ONLY, no photorealistic lighting gradient, ' +
      'color palette: 4–8 harmonious colors maximum, each object or object family sharing a consistent palette relationship — complementary or analogous color scheme across the scene; faces of same object must have clearly distinct value steps (at least 20% brightness difference) to read as 3D, ' +
      'surface: stylized flat material — no photorealistic textures, no reflections, no specular highlights — appropriate to commercial vector illustration quality, ' +
      'outline treatment: optional thin consistent stroke on visible edges only — or completely outline-free if face color contrast is strong enough to define edges; if no outline, top/side face value contrast becomes mandatory, ' +
      'composition: coherent small scene (isometric room, environment, workspace) OR isolated isometric object cluster — clean white or transparent background, scene complexity: enough to feel rich but not so dense it becomes unreadable at thumbnail, ' +
      'THUMBNAIL CRITICAL: isometric scenes risk becoming cluttered at thumbnail — limit scene to 3–5 key objects maximum, ensure dominant color contrast between foreground objects and background, choose a viewing angle that shows the most recognizable face of the main subject, ' +
      'quality reference: isometric icon pack on Adobe Stock top sellers, Flaticon isometric premium collection, Storyset isometric scene illustration, Vecteezy isometric cityscape bestsellers',
    characteristics:
      'Ilustrasi isometrik 3D murni — 45° parallel projection, face shading tiga nilai (top/left/right), tanpa perspektif, scene density terkontrol untuk thumbnail. Cocok untuk scene, infographic, workplace/cityscape illustration.',
    negativePrompt:
      'perspective vanishing point, fisheye distortion, photorealistic lighting gradients on faces, mixed perspective angle within same scene, flat 2D top-down view, product render style studio lighting, overly dense cluttered scene that reads as noise at thumbnail',
  },

  // ── Style BARU — Watercolor ───────────────────────────────────────────────

  watercolor: {
    promptTrigger:
      'authentic vintage hand-painted watercolor illustration in the style of classic botanical and lifestyle art prints, ' +
      'color palette: muted and dusty, but NOT so desaturated that the image reads as grey — dusty sage green, warm terracotta, slate blue, muted dusty rose, antique cream — colors must retain enough chroma to distinguish clearly at thumbnail scale, ' +
      'color darker and denser at the center of each shape, becoming lighter and more transparent toward the edges, soft color blooming naturally at boundaries, ' +
      'edge treatment: no heavy black outline, but allow very subtle warm-toned implied edge or deepened color value where shapes meet — edges must be visible enough that the subject reads clearly at thumbnail size; main silhouette defined by value contrast, NOT hard outline, ' +
      'delicate fine pencil-like detail linework drawn lightly on top of the wash layer for internal texture details only, ' +
      'warm off-white or aged cream background with subtle paper tooth texture, ' +
      'very minimal soft warm grey implied shadow directly beneath object, ' +
      'loose impressionistic rendering — genuine artist hand quality, not tight photorealistic, not cartoon, ' +
      'THUMBNAIL RULE: subject must read instantly at small size — ensure sufficient value contrast between subject colors and background; no single-value muted subject that disappears into the cream background, ' +
      'style reference: vintage botanical print, shabby chic lifestyle illustration, French countryside watercolor art, Beatrix Potter botanical study',
    characteristics:
      'Watercolor vintage — palette muted tapi tetap chromatic (bukan abu semua), tepi soft via value contrast bukan hard outline, paper texture. Cocok untuk wall art, greeting card, home decor, botanical clipart. CATATAN: untuk food/floral/animal berwarna cerah gunakan "Watercolor Vibrant".',
    negativePrompt:
      'heavy black border outline, harsh geometric edges, flat vector uniform color fill, neon oversaturated colors, pure cold white background (use warm cream), cartoon cel-shading, anime style, photorealistic render, digital gradient, grey colorless monotone subject that blends invisibly into background',
  },

  // ── Style BARU 2026 — Vibrant Watercolor ─────────────────────────────────

  vibrantWatercolor: {
    promptTrigger:
      'fresh contemporary watercolor illustration with vibrant, chromatic, high-saturation colors — ' +
      'this is NOT vintage or muted watercolor: colors are bright, lively, and luminous — coral red, cobalt blue, sunshine yellow, fresh grass green, hot pink, warm orange — ' +
      'all naturally brilliant as if pigment-rich artist-grade watercolor paint was applied generously to white paper, ' +
      'watercolor medium characteristics: visible brushstroke direction on larger color areas, natural soft wet-edge blooming where colors meet, subtle granulation texture in flat wash areas, ' +
      'edges: semi-defined — subjects have enough color contrast and value difference against white background to read clearly; ' +
      'gentle soft lost edges where light colors meet light background are acceptable, but dark values must clearly define the main silhouette, ' +
      'white of the paper used as the lightest value — no opaque white added, highlights are reserved unpainted paper area, ' +
      'line work: optional fine clean ink outline in warm dark brown or indigo on key subjects only — drawing visible under transparent wash — adds charming illustrative quality, ' +
      'composition: centered focal subject with generous white paper negative space — no busy background, subject must pop against clean white, ' +
      'THUMBNAIL CRITICAL: high contrast saturated subject against white background — choose subjects and colors that read instantly at 120×80px, ' +
      'commercial categories: food illustration (macarons, coffee, fruit), floral (peony, tropical leaves, wildflowers), animals (cute birds, cats, dogs), seasonal (holiday florals, summer fruit), ' +
      'quality reference: contemporary watercolor food illustration on Adobe Stock, Society6 watercolor botanical print bestsellers, Skillshare watercolor illustration top course thumbnails',
    characteristics:
      'Watercolor cerah & chromatic modern — bukan vintage, bukan muted — untuk food, floral, animal, holiday. Warna saturated vibrant, white paper negative space, thumbnail-friendly. Pair dengan kategori: Food, Nature/Floral, Animals, Holidays.',
    negativePrompt:
      'muted desaturated vintage botanical palette, grey washed-out colors, heavy black cartoon border outline (light ink line acceptable), flat vector fill with no watercolor texture, airbrushed smooth gradient without paint quality, photorealistic render, dark background (must be white paper), neon electric colors without paint quality, anime style',
  },

  // ── Style BARU 2026 — Acrylic Painterly ──────────────────────────────────

  acrylicPainterly: {
    promptTrigger:
      'premium painterly illustration with the texture and quality of acrylic or gouache on canvas or illustration board — ' +
      'this is a high-end painted artwork aesthetic targeting premium microstock buyers: editorial magazines, book covers, brand campaigns, fine art print, ' +
      'brushwork: confident, expressive, and deliberately visible — brushstrokes are part of the aesthetic, showing directionality and variation in pressure — ' +
      'NOT photorealistic render, NOT flat vector: genuine painted mark-making quality, ' +
      'color: rich, saturated, and chromatic — deep jewel tones, warm earthy naturals, or bold primary palettes — colors have weight and presence on the surface, ' +
      'paint surface texture: slight impasto buildup on highlight areas, smoother blended surface on shadow areas, matte paint surface quality (not glossy or varnished look), ' +
      'edges: confident varied edges — sharp controlled edges at focal points and key silhouettes, softer lost edges in secondary areas to create focal hierarchy, ' +
      'form: simplified and interpreted rather than photorealistic — the best painted illustration finds the essence of a subject, not every detail, ' +
      'composition: strong graphic composition that reads immediately — bold focal subject with deliberate value structure (dark vs light) ensuring instant thumbnail legibility, ' +
      'THUMBNAIL CRITICAL: bold value contrast — subject must read at thumbnail size as confidently as a strong painting in a gallery; choose compositions with high tonal drama, ' +
      'commercial applications: editorial book cover, magazine feature illustration, brand campaign hero, fine art print, album artwork, premium greeting card, ' +
      'quality reference: Society6 premium art print bestsellers, Behance editorial illustration of the year, Adobe Stock Premium collection painted illustration, children\'s picture book front cover Caldecott Medal quality',
    characteristics:
      'Painterly premium — gaya akrilik/gouache dengan brushstroke ekspresif, warna kaya saturated, tepi bervariasi, tekstur cat nyata. Gap terbesar di style list — premium tier 2026. Cocok untuk editorial, book cover, fine art print, brand campaign.',
    negativePrompt:
      'flat no-texture vector illustration, uniform color fill without brushstroke, photorealistic hyperdetailed render, smooth airbrushed gradient without paint quality, anime or cartoon cel-shading, coloring-book line art style, watercolor transparent wash look (this is opaque paint), low-contrast muddy palette with no focal drama',
  },

  // ── Style BARU 2026 — Gradient Cartoon ───────────────────────────────────

  gradientCartoon: {
    promptTrigger:
      'vibrant contemporary cartoon illustration with rich gradient fills throughout — ' +
      'this style combines the clarity and legibility of cartoon line art with modern gradient color rendering, ' +
      'outline: bold, confident, clean cartoon outline on all subjects — consistent stroke weight, clearly visible, provides shape structure and ensures thumbnail legibility at any size, ' +
      'color fills: NOT flat solid — every major shape filled with a smooth, beautiful gradient: ' +
      'circular radial gradient (brightest at center, deeper toward edges) for rounded organic forms like characters, food, and animals; ' +
      'linear gradient (bright highlight top, richer shade bottom) for objects and environments — ' +
      'gradients are harmonious within each color family: a blue shape uses bright sky blue → rich cobalt, a green leaf uses bright lime → forest green, NEVER random unrelated hue shifts within one shape, ' +
      'color palette: vibrant and joyful — saturated, but tastefully curated, maximum 6 dominant colors across the full illustration, each color area gradient-rich and luminous, ' +
      'highlights: bright white or near-white specular highlight dots on rounded surfaces — eyes, fruits, product surfaces — gives dimensional candy-like quality, ' +
      'shadows: slightly darker more saturated gradient on shadow side of rounded forms — no heavy black drop shadow, ' +
      'overall character: modern, cheerful, commercial, highly legible — the visual language of a successful mobile game UI, children\'s educational app, contemporary greeting card, or trending sticker pack, ' +
      'THUMBNAIL CRITICAL: bold outlines + vibrant gradient fills = maximum thumbnail pop; this style is designed to WIN the scroll at 120×80px, ' +
      'commercial categories: food and beverage illustration, cute animal and character, holiday and celebration, back to school, e-commerce product illustration, ' +
      'quality reference: LINE Friends merchandise illustration, Disney+ branded content illustration, Procreate trending artwork, Adobe Stock Colorful Cartoon bestselling collection',
    characteristics:
      'Kartun colorful dengan gradient fills modern — outline bold + gradient dalam setiap shape, highlight putih glossy, palette vibrant. Sangat commercial & thumbnail-ready. Cocok untuk food, karakter, holiday, e-commerce clipart.',
    negativePrompt:
      'flat solid fill with zero gradient, muted desaturated dull palette, no outline or borderless style, heavy realistic shadow with ambient occlusion, photorealistic render, vintage muted aesthetic, rough hand-drawn sketchy linework, multi-hue chaotic rainbow gradient that clashes within one shape',
  },

  // ── Style BARU 2026 — Mixed Media Collage ────────────────────────────────

  mixedMediaCollage: {
    promptTrigger:
      'contemporary mixed media collage illustration combining the warmth of analog cut-paper craft with digital illustration precision — ' +
      'the aesthetic of a premium art school graduate or indie editorial magazine art director, ' +
      'primary visual language: layered flat paper shapes with visible torn or cut paper edges — shapes appear to be physically cut from colored or patterned paper and arranged in layers, ' +
      'paper edges: characteristic torn paper edge on some shapes (soft irregular organic edge), and clean scissor-cut straight edge on others — the contrast of both is intentional and charming, ' +
      'layering: deliberate overlapping of shape layers creating simple shadow cast between layers — a tiny soft real-world shadow where paper overlaps paper, giving genuine physical depth and dimensionality, ' +
      'color palette: warm, curated, and intentional — often warm terracotta + dusty sage + cream + warm mustard, or bold block color Matisse-like compositions — never clinical or digital-cold, ' +
      'texture: subtle paper grain or linen fabric texture visible in the paper pieces — not photorealistic, but enough to feel physical and handmade, ' +
      'additional media layer (optional): fine hand-drawn pen or pencil detail marks on top of paper shapes — botanical detail, face features, object texture — adding a human mark-making quality, ' +
      'composition: bold, graphic, and editorially confident — strong centered subject built from collage pieces, with clear focal hierarchy and generous negative space, ' +
      'THUMBNAIL CRITICAL: the layered paper aesthetic naturally creates strong value contrast between shapes — ensure the main subject has 3+ distinct color layers stacked for immediate visual interest at small size, ' +
      'commercial applications: editorial magazine cover, brand campaign with human and crafted positioning, children\'s book illustration, seasonal greeting card, premium stationery design, arts and craft brand, ' +
      'quality reference: Henri Matisse cut-out work adapted for contemporary commercial use, Rifle Paper Co brand illustration, Frankie Magazine editorial illustration, Penguin Books contemporary cover art',
    characteristics:
      'Mixed media collage — cut-paper shapes berlapis dengan torn/clean edges, subtle shadow antar layer, tekstur paper, mark-making opsional di atas. Tren "human imperfection" 2026. Cocok untuk editorial, brand artisan/handmade, greeting card, children\'s book.',
    negativePrompt:
      'clean flat no-texture digital vector, photorealistic render, cartoon cel-shading with no paper quality, harsh neon digital colors, heavy drop shadow (only subtle inter-layer shadow permitted), perfect smooth edges on all shapes (must have some torn or organic edge character), anime or manga style',
  },

    // ── PHOTO STYLES ─────────────────────────────────────────────────────────

  lifestyleScene: {
    promptTrigger:
      'authentic lifestyle photography with the warmth and spontaneity of premium editorial magazine photography — the visual language of Kinfolk, Bon Appétit, Real Simple, and modern Instagram editorial, ' +
      'light: warm natural ambient light as the primary source — window light (soft directional from one side), golden hour outdoor (warm backlight or side light), overcast diffused (soft even wrap) — light must feel real and environmental, never studio-flash cold, ' +
      'color grading: warm tones slightly lifted — golden highlights, softly lifted shadow detail so darks are charcoal not black, gentle desaturation in shadows while midtones retain warmth — the palette of a well-graded Canon or Fujifilm film simulation, ' +
      'subject: real people in genuine moments OR artfully arranged objects — the image must feel like it was caught, not constructed; even if it is constructed, the viewer must believe it was caught, ' +
      'depth of field: medium-shallow — subject sharp with environment implied but softened by lens bokeh — background recognizable enough to establish context but never competing with subject, ' +
      'composition: natural candid framing — rule of thirds, generous breathing room, scene feels cropped from real life rather than composed in a studio; negative space on one side for buyer text placement, ' +
      'setting variety: home kitchen (morning coffee), café table (laptop and latte), outdoor park (picnic, walking), beach (sunset silhouette), home living room (reading, plants) — choose the setting most commercially relevant to the category, ' +
      'people if present: genuine diverse representation — natural clothing, authentic expression, no forced smile, no direct-at-camera cliché pose — side profile, looking at object, in motion all preferred, ' +
      'THUMBNAIL CRITICAL: lifestyle scenes risk muddiness at thumbnail — ensure one clear subject element is high-contrast and brightly lit against a softer background; warm light + soft bokeh naturally creates this separation, ' +
      'quality reference: Kinfolk magazine editorial photography, Bon Appétit food lifestyle spread, Adobe Stock lifestyle photography premium collection, Unsplash editorial selection, Getty Images lifestyle editorial top performers',
    characteristics:
      'Foto lifestyle autentik — cahaya natural hangat, color grading warm lifted, bokeh environment, genuine moment quality. Cocok untuk brand lifestyle, editorial, social campaign, health & wellness, food & drink.',
    negativePrompt:
      'harsh studio strobe flash creating harsh shadows, pure white seamless studio backdrop, overly posed stiff frozen expression, clinical sterile environment, forced fake smile directly at camera, stock photo cliché pose (handshake, thumbs-up), HDR oversaturated surreal, heavy dark vignette, flat even lighting with no directional quality',
  },

  corporateEditorial: {
    promptTrigger:
      'professional corporate editorial photography with the clean authoritative quality of Bloomberg, Forbes, Harvard Business Review, and McKinsey Quarterly visual identity, ' +
      'environment: modern contemporary workspace — open-plan office with architectural glass and light wood, conference room with clean table and large windows, minimal urban exterior (glass lobby, clean steps), home office with neat desk — ' +
      'environment must feel aspirational, modern, and non-specific (no real company branding visible), ' +
      'light: controlled natural light from large windows as primary source with optional soft fill to eliminate harsh shadows — the clean bright look of a well-lit modern office, never dark or moody, never harsh direct flash, ' +
      'color palette: clean neutral foundation — white, light grey, soft warm beige, navy blue accent — professional and trustworthy; clothing and environment complement each other in the same neutral family, ' +
      'subjects: professionally dressed, confident and composed — business attire appropriate to the category (formal suit for finance, smart casual for tech startup) — ' +
      'critically: genuine diverse representation in gender, ethnicity, and age where multiple subjects appear — Adobe Stock buyers specifically need diversity for inclusive brand campaigns, ' +
      'posture and expression: confident, composed, purposeful — working, thinking, discussing, reviewing — NOT stiff frozen pose or direct forced smile at camera; semi-candid working moment preferred, ' +
      'depth of field: medium shallow — subject crisp, background architectural environment soft but recognizable, ' +
      'THUMBNAIL CRITICAL: corporate editorial often has neutral palette — ensure subject skin tones or clothing provide clear contrast against office background; one bright element (window light hit, colored clothing accent) anchors the thumbnail, ' +
      'quality reference: Bloomberg editorial photography, Harvard Business Review portrait, Getty Images business premium collection, Adobe Stock business top performers, LinkedIn hero image standard',
    characteristics:
      'Foto editorial korporat — lingkungan kantor modern aspirasional, pencahayaan natural controlled, diverse representation, semi-candid working moment. Cocok untuk bisnis, HR, annual report, B2B campaign, SaaS.',
    negativePrompt:
      'casual streetwear or inappropriate clothing for context, party or celebration setting, overly casual unprofessional pose, bright neon or aggressive color environment, messy cluttered disorganized background, harsh direct flash with heavy shadows, cheesy stock photo forced handshake or thumbs-up, homogeneous non-diverse group, dark moody low-light setting',
  },

  cinematicWideShot: {
    promptTrigger:
      'cinematic photography with the sweeping visual quality of prestige film, National Geographic, and Apple TV+ production — dramatic, purposeful, unforgettable, ' +
      'composition: strong foreground-midground-background depth layering — each layer clearly distinct in focus and tonal value, creating genuine spatial depth; the viewer\'s eye travels through the layers, ' +
      'field of view: wide anamorphic-characteristic horizontal framing — the image breathes width, landscape fills the frame edge-to-edge with no dead corners, ' +
      'light: dramatic directional light — golden hour warm side-light that rakes across surfaces revealing texture, or blue hour cool ambient that silhouettes form against glowing sky — light must be unmistakably beautiful and atmospheric, ' +
      'color grading: rich complementary cinematic palette — warm orange/gold tones in sunlit areas balanced against deep teal/blue in shadows (Hollywood complementary grading) OR desaturated film-emulsion look with retained highlight warmth — colors feel grade-corrected, not raw, ' +
      'sense of scale: epic grandeur — tiny human figure within vast environment communicates scale and awe; OR dramatic close perspective with environment visible behind for intimate cinematic feel, ' +
      'subject clarity rule: even in epic wide shot, there must be ONE clear visual hero — a silhouetted figure, a lit road, a sun star — that the eye settles on after taking in the scene, ' +
      'THUMBNAIL CRITICAL: wide cinematic shots must have dominant color contrast between sky/environment and main subject; warm-lit subject against cool blue sky, or silhouette against golden horizon — the thumbnail must convey the dramatic mood at 120×80px, ' +
      'quality reference: National Geographic photography awards, Apple ProRes cinematic demo reel, Getty Images cinematic editorial collection, Adobe Stock travel and landscape premium, 500px popular photography',
    characteristics:
      'Foto sinematik wide-angle dramatis — depth layering, color grading warm/teal, pencahayaan epik, epic scale. Cocok untuk travel, landscape, campaign besar, brand premium, emotion-driven editorial.',
    negativePrompt:
      'flat even overhead lighting with no drama, mundane setting with no atmospheric quality, vertical phone snapshot portrait crop, oversaturated tourist-snap HDR, heavy barrel distortion, busy cluttered foreground without depth separation, subject so small it is unidentifiable at thumbnail',
  },

  studioPortrait: {
    promptTrigger:
      'clean professional studio portrait photography with the quality of premium LinkedIn headshots, brand campaign portraiture, and editorial magazine cover photography, ' +
      'lighting setup: soft key light from 45° upper-left creating appealing modelling light on face with gentle gradation — fill light from right side at lower power eliminating harsh shadow while preserving facial dimension — optional thin rim light from behind creating hair and shoulder separation from background, ' +
      'background: plain clean seamless backdrop — pure white (highest commercial demand), soft mid-grey, or intentional single-color tone that complements subject skin tone; NO busy patterns, textures, or environmental context, ' +
      'focus: razor-sharp on eyes and face — eyes at peak sharpness, gradual softness through ears and shoulders, very shallow depth of field emphasizing face quality, ' +
      'retouching quality: natural and authentic — even skin tone, genuine expression maintained, subtle skin refinement preserving real texture — NOT plastic over-retouched or airbrushed to unreality, ' +
      'expression: confident, warm, approachable — a slight genuine smile or composed neutrality — never forced or fake — the expression that makes a hiring manager trust the person immediately, ' +
      'diversity: represent varied ethnicities, ages, and genders — this is the highest commercial priority for portrait stock buyers who need inclusive content for global campaigns, ' +
      'THUMBNAIL CRITICAL: portrait on clean background = naturally thumbnail-safe; ensure key light creates a bright catch-light in the eyes and warm highlight on the face — these tiny details read at thumbnail and signal quality, ' +
      'quality reference: Getty Images portrait premium collection, Adobe Stock people top performers, LinkedIn professional headshot standard, brand ambassador portrait for Fortune 500 campaign',
    characteristics:
      'Portrait studio profesional — three-point lighting, background clean, sharp focus on eyes, natural retouching, diverse representation. Cocok untuk headshot, brand ambassador, editorial cover, HR campaign.',
    negativePrompt:
      'busy distracting environmental background, outdoor harsh snapshot lighting, harsh direct flash with unflattering shadows, heavy Instagram filter effect, over-retouched plastic skin, extreme theatrical makeup, costume or cosplay (unless brief specifies), non-diverse homogeneous representation',
  },

  flatLayOverhead: {
    promptTrigger:
      'perfectly composed flat lay overhead photography with the aspirational styling quality of top Pinterest boards, Instagram editorial accounts, and Condé Nast Traveler, ' +
      'camera angle: perfectly vertical overhead — camera directly above at exactly 90 degrees, looking straight down, zero camera tilt or Dutch angle, horizon line is invisible, ' +
      'surface: clean and beautiful — white marble with subtle veining, warm light wood grain, natural linen fabric texture, textured cotton paper, or matte concrete — surface IS part of the composition and must be visually appealing, ' +
      'light: soft diffused natural window light from one side — creates gentle soft shadow from each object that grounds them naturally; never harsh overhead flash (creates ugly direct shadow); the shadows are part of the composition, ' +
      'object arrangement: curated deliberate styling — objects grouped with clear intentionality, negative space used as an active compositional element, color palette of all props pre-selected for harmony, ' +
      'prop selection: 3–7 objects maximum — too few feels sparse, too many feels cluttered; each object earns its place by contributing color, shape, or narrative to the composition, ' +
      'commercial categories where flat lay excels: food and baking (ingredients flat lay, finished dish top-down), stationery and office, cosmetics and beauty, travel and packing, coffee and café, seasonal holiday, ' +
      'THUMBNAIL CRITICAL: overhead flat lays have natural graphic quality — clear arrangement pattern reads at thumbnail; ensure dominant color contrast between surface and objects, and avoid arranging all objects in corners (center mass reads at thumbnail), ' +
      'quality reference: Bon Appétit top-down food photography, Martha Stewart styled flat lay, Adobe Stock flat lay premium collection, Unsplash top flat lay photos, Pinterest trending overhead composition',
    characteristics:
      'Foto flat lay overhead murni 90° — surface curated, cahaya natural window lembut, prop arrangement intentional, negative space aktif. Cocok untuk food, product, lifestyle, stationery, seasonal photography.',
    negativePrompt:
      'angled perspective view (must be true overhead), harsh direct overhead flash with hard shadows, randomly cluttered arrangement with no styling intention, dark moody background surface, mixed incompatible surface textures, tilted camera horizon, fish-eye lens distortion, single object with no styling context (use 3D render style instead)',
  },

  environmentalPortrait: {
    promptTrigger:
      'environmental portrait photography with the authentic storytelling quality of TIME Magazine, National Geographic portrait, and The New Yorker profile photography — ' +
      'the fundamental premise: the environment reveals WHO this person is; the setting must be chosen because it is meaningful to the subject\'s identity, occupation, or story, ' +
      'subject placement: person clearly anchors the composition — occupying 30–50% of the frame — while the environment is visible and contextually rich around them; subject must be the first thing the eye settles on, ' +
      'depth of field: medium — subject sharp with clear detail, environment recognizable and readable but softened enough (f2.8–f5.6 equivalent) to remain secondary — the goal is "subject in context" not "wide establishing shot with person in corner", ' +
      'light: natural available ambient light that matches the environment — workshop has warm tungsten practical lights, outdoor market has natural daylight, kitchen has warm window fill — never studio strobe in an authentic environmental setting, ' +
      'interaction: subject engaged with their environment — working, looking at something, in motion, interacting with tools or objects — NOT looking directly at camera in a pose; the camera witnessed this moment, ' +
      'diversity and authentic cultural representation: the subject\'s environment should match their cultural or professional identity authentically; diversity in subject demographics is essential for Adobe Stock commercial value, ' +
      'setting options: craftsperson in workshop, chef in kitchen, artist in studio, teacher in classroom, farmer in field, fisherman at sea, musician in rehearsal space, scientist in lab — choose setting most commercially relevant to the category, ' +
      'THUMBNAIL CRITICAL: environmental portrait risks the environment overwhelming the subject at thumbnail — ensure subject has bright exposure and clear separation (rim light, color contrast) from environment background; subject face or figure must read at thumbnail before the environment does, ' +
      'quality reference: National Geographic portrait photography, TIME 100 portrait series, The New Yorker profile photography, Getty Images editorial portrait premium, Adobe Stock environmental portrait top performers',
    characteristics:
      'Portrait dalam environment alami yang bermakna bagi subjek — candid/semi-candid, pencahayaan ambient authentic, subject jelas di tengah konteks. Cocok untuk editorial, brand storytelling, documentary, occupational stock.',
    negativePrompt:
      'plain seamless studio backdrop with no environmental context, completely blurred background that gives zero context about who the person is, stiff formal pose with zero environment interaction, harsh studio strobe in authentic setting, tourist snapshot composition with person tiny in landscape, forced direct-camera smile in documentary context',
  },

  // ── 3D STYLES ─────────────────────────────────────────────────────────────

  threeDObject: {
    promptTrigger:
      'beautiful 3D rendered clipart illustration, single isolated object centered on pure white background, ' +
      'semi-realistic 3D render style — not photorealistic, slightly stylized and appealing like high-end food illustration or lifestyle clipart, ' +
      'soft three-point studio lighting: bright soft key light from upper-left creating gentle highlight on top surface, soft fill light preventing harsh shadow, very thin rim light on one edge for depth, ' +
      'material quality: food items show realistic texture and moisture — glossy glaze on donuts, condensation on cold drinks, layered cream texture on cakes; non-food items show accurate material — ceramic matte finish, glass transparency, fabric weave, wood grain, wicker texture, ' +
      'very soft realistic drop shadow directly beneath object — shadow has soft penumbra edge and is not too dark, ' +
      'camera angle: slightly elevated 3/4 front view — shows top and front face of object simultaneously for maximum appeal and readability, ' +
      'color palette: warm and appetizing for food, natural and inviting for lifestyle objects — never cold clinical or oversaturated, ' +
      'render quality reference: high-end food illustration for menu design, premium sticker clipart, Etsy bestselling digital clipart style',
    characteristics:
      'Objek 3D semi-realistis terisolasi di background putih — material detail, soft lighting 3 titik, shadow lembut. Cocok untuk clipart premium, food illustration, lifestyle sticker, menu design.',
    negativePrompt:
      'flat 2D vector look, isometric angle, harsh single directional shadow, dark moody background, cartoon cel-shading, low-poly blocky geometry, photorealistic overcomplicated background, multiple objects scene, floating object with no shadow, overexposed blown-out white, clinical sterile product photo look',
  },

  threeDCharacter: {
    promptTrigger:
      'high-quality 3D character render, clean stylized character design with professional rigging-ready topology implied by visual quality, ' +
      'smooth subsurface scattering on skin or soft material surfaces, expressive facial features with appealing proportions, ' +
      'soft studio three-point lighting that brings out character volume and material quality, ' +
      'character in T-pose or natural neutral stance with clear silhouette readability, ' +
      'clean white or gradient background to showcase character clearly, ' +
      'visual quality reference: Pixar character design, high-end game cinematic character, premium animated film still, ' +
      'colors: rich saturated but harmonious character palette, consistent material quality throughout',
    characteristics:
      'Karakter 3D berkualitas tinggi — Pixar-level polish, material realistis, pencahayaan studio. Cocok untuk mascot brand, game asset, animasi, character design portfolio.',
    negativePrompt:
      'low-poly blocky mesh visible, flat cell-shaded cartoon, no lighting depth, uncanny valley photorealistic human, ugly proportions, stiff robotic pose, inconsistent material quality between body parts, cluttered busy background',
  },
};

//  DNA ENGINE V5 — 22 CATEGORY DNA DATABASE

export const CATEGORY_DNA = {
  'Abstract': {
    visualDNA: 'Non-representational visual art; pure form, color harmony, and visual rhythm.',
    commercialDNA: 'Web background asset, luxury packaging wrapper, brand visual identity graphic, wall art print.',
    compositionDNA: 'Focus Abstract Form 65%, Background/Space 35%.',
    qualityDNA: 'Mathematical geometric precision OR smooth fluid gradient blending, high visual tension, no accidental faces or real objects.',
    diversityEngine: {
      macroConcepts: [
        'Mathematical polygon geometry grid', 'organic fluid liquid motion', 'digital glitch RGB split',
        'tactile marble texture surface', 'recursive fractal spiral',
      ],
      commercialScenes: [
        'Web background hero asset', 'luxury product packaging wrapper', 'brand presentation cover', 'gallery wall art print',
      ],
      microVariations: {
        palette: ['Bold primary', 'pastel calm', 'dark cyber neon', 'monochrome minimal', 'warm earth'],
        density: ['Sparse minimal', 'balanced', 'dense rich pattern'],
      },
    },
    subcategories: {
      'Geometric Shapes': {
        subjects: ['Polygon color composition', 'circle grid arrangement', 'triangle gradient pattern', 'isometric cube array', 'mandala'],
        // EU-11: Concept DNA — field tambahan opsional, native-supported oleh
        // buildDNAContext/buildCommercialRules. Ini pilot pertama; subkategori
        // lain yang belum diisi tetap jalan normal pakai `subjects` saja.
        conceptDNA: {
          motif: ['interlocking polygon lattice', 'radial mandala symmetry', 'isometric cube stack', 'grid of rotated squares', 'concentric circle rings'],
          structure: 'Rigid geometric grid or radial symmetry — no organic curves',
          repetition: 'Seamless tileable pattern OR single centered focal composition, varies by commercial scene',
          palette: ['duotone bold contrast', 'gradient mesh spectrum', 'flat pastel geometric', 'monochrome line art'],
          background: 'Solid flat color or subtle gradient — never busy or textured',
          visualLanguage: 'Hard-edge vector geometry, precise mathematical alignment, no hand-drawn imperfection',
          commercialUse: ['Web hero background', 'app onboarding illustration', 'packaging pattern wrap', 'presentation slide backdrop'],
          promptRules: {
            mustInclude: ['clean isolated background', 'mathematically precise edges', 'consistent stroke weight throughout'],
            mustAvoid: ['hand-drawn imperfection', 'organic curves mixed with geometric forms', 'drop shadows or bevel effects'],
          },
          negativePrompt: ['hand-drawn wobble', 'organic curve mixing with hard geometry', 'drop shadow', 'bevel effect', 'gradient on stroke outlines', 'misaligned grid'],
        },
      },
      'Fluid & Organic': {
        subjects: ['Liquid pour abstract', 'aurora borealis concept', 'ink in water diffusion', 'flowing silk ribbon', 'marble swirl'],
        conceptDNA: {
          motif: ['liquid pour splash', 'aurora light ribbon', 'ink diffusion bloom', 'silk fabric wave', 'marble vein flow'],
          structure: 'Free-flowing asymmetric composition with organic curvature — no hard geometric grid',
          repetition: 'Single-focal hero composition — avoid tiling, it breaks fluid continuity',
          palette: ['iridescent gradient', 'warm sunset blend', 'cool aurora spectrum', 'monochrome ink wash'],
          background: 'Soft gradient or solid — fluid form should dominate visual weight',
          visualLanguage: 'Smooth blended gradients, soft-edge fluidity, painterly motion-blur suggestion',
          commercialUse: ['Luxury cosmetic packaging', 'music album art background', 'wellness app hero', 'gallery print'],
          promptRules: {
            mustInclude: ['smooth continuous gradient blending', 'sense of motion or flow', 'dominant fluid form as visual anchor'],
            mustAvoid: ['hard geometric edges', 'tiling pattern structure', 'flat solid color fills with no gradient'],
          },
          negativePrompt: ['hard geometric edge', 'sharp corner', 'flat solid fill', 'tiling repeat pattern', 'pixel artifact', 'banding in gradient'],
        },
      },
      'Glitch & Digital': {
        subjects: ['RGB pixel glitch', 'digital scan-line texture', 'data corruption art', 'VHS distortion', 'neon grid distortion'],
        conceptDNA: {
          motif: ['RGB pixel dispersion block', 'horizontal scan-line overlay', 'VHS color bleed separation', 'neon grid distortion wave', 'data corruption mosaic'],
          structure: 'Full-bleed texture treatment OR centered glitch artifact with decay radiating outward — no clean isolated subject',
          repetition: 'Vary glitch type per asset — RGB shift / scan-line / VHS / pixel mosaic must not repeat consecutively',
          palette: ['neon cyan-magenta-yellow RGB split', 'monochrome scan-line grey', 'lo-fi VHS warm wash', 'neon grid on dark void'],
          background: 'Dark or near-black — glitch artifacts need dark field to read correctly',
          visualLanguage: 'Controlled digital decay aesthetic — glitch is intentional and designed, not random noise; legible pattern structure within the chaos',
          commercialUse: ['Music album art', 'gaming event poster', 'tech brand background texture', 'cyberpunk editorial hero'],
          promptRules: {
            mustInclude: ['intentional controlled glitch artifact', 'dark field background', 'digital decay pattern as dominant visual element'],
            mustAvoid: ['clean crisp vector graphic', 'warm organic textures', 'bright cheerful palette', 'photorealistic subjects within glitch'],
          },
          negativePrompt: ['clean smooth vector', 'warm organic color', 'bright cheerful tone', 'photorealistic subject', 'natural texture', 'hand-drawn warmth'],
        },
      },
      'Texture & Pattern': {
        subjects: ['Marble vein pattern', 'wood grain warm pattern', 'linen fabric texture', 'concrete aggregate', 'terrazzo floor tile'],
        conceptDNA: {
          motif: ['marble vein flow diagonal', 'wood grain parallel line texture', 'linen woven weave close-up', 'concrete aggregate surface', 'terrazzo chip scatter pattern'],
          structure: 'Full-bleed seamless surface treatment — no isolated subject, texture fills entire canvas',
          repetition: 'Vary material type per asset — stone / wood / fabric / composite must not repeat consecutively in batch',
          palette: ['warm cream and grey marble', 'amber wood brown', 'neutral linen off-white', 'cool concrete slate', 'terrazzo multicolor chip'],
          background: 'IS the background — texture itself is the entire composition',
          visualLanguage: 'Photorealistic tactile surface OR clean vector interpretation — both valid but must not mix within the same set',
          commercialUse: ['Interior design mood board', 'product packaging background', 'website hero texture', 'print design background layer'],
          promptRules: {
            mustInclude: ['seamless tileable surface texture', 'natural material character (grain, vein, or weave visible)', 'consistent scale across canvas'],
            mustAvoid: ['isolated object placed on texture', 'artificial digital gradient pretending to be material', 'obvious tiling seam'],
          },
          negativePrompt: ['isolated floating object', 'obvious tiling seam', 'artificial digital gradient', 'cartoon or illustrated style', 'glitch artifact', 'text overlay'],
        },
      },
      'Fractal & Mathematical': {
        subjects: ['Mandelbrot fractal concept', 'Julia set abstract', 'Fibonacci spiral', 'fractal tree branch', 'Koch snowflake'],
        conceptDNA: {
          motif: ['Mandelbrot set boundary zoom', 'Julia set color field', 'Fibonacci golden spiral overlay', 'fractal tree recursive branch', 'Koch snowflake iteration'],
          structure: 'Centered radial composition OR full-bleed fractal field — mathematical symmetry must be evident',
          repetition: 'Vary mathematical concept per asset — organic fractal (tree/leaf) vs geometric iteration (snowflake/Mandelbrot) should alternate',
          palette: ['deep space dark with electric highlight', 'warm golden ratio amber', 'cool neon mathematical field', 'monochrome iteration study'],
          background: 'Dark or deep color field — mathematical forms need contrast to reveal their complexity',
          visualLanguage: 'Precise mathematical aesthetics — self-similarity at multiple zoom levels implied, no hand-drawn imperfection',
          commercialUse: ['Science editorial illustration', 'mathematics education visual', 'tech brand abstract background', 'luxury art print'],
          promptRules: {
            mustInclude: ['mathematical self-similarity implied', 'precise controlled linework or field', 'sense of infinite recursion or scale'],
            mustAvoid: ['random organic blobs without mathematical structure', 'cheerful cartoon styling', 'flat simple geometric without recursive complexity'],
          },
          negativePrompt: ['random organic blob', 'cartoon styling', 'flat simple non-recursive shape', 'warm friendly tone', 'hand-drawn imperfection', 'symmetry-breaking noise'],
        },
      },
    },
  },
  'Animals': {
    visualDNA: 'Flat vector illustration with clean bold outlines, commercial illustration style.',
    commercialDNA: "Children's book, nature print, pet product packaging, editorial media.",
    compositionDNA: 'Focus Subject 55%, Negative Space 35%, Environment 10%.',
    qualityDNA: 'Tactile fur/feather texture suggestion, expressive & anatomically accurate eyes, clean silhouette definition, natural organic curves.',
    diversityEngine: {
      macroConcepts: [
        'Territorial display', 'parent caring for offspring', 'predator hunting stance',
        'peaceful waterhole moment', 'migration movement', 'playfulness', 'nocturnal activity',
      ],
      commercialScenes: [
        'Pet food packaging label', 'children storybook page', 'nature conservation poster', 'veterinary app hero',
      ],
      microVariations: {
        pose: ['Portrait', 'running', 'resting', 'feeding', 'leaping', 'walking'],
        perspective: ['3/4 view', 'frontal portrait', 'side profile', 'top-down'],
        lighting: ['Warm morning sun', 'soft studio light', 'golden hour', 'overcast natural'],
      },
    },
    subcategories: {
      'Wildlife': {
        subjects: ['Lion roaring', 'elephant herd', 'wolf howling', 'giraffe feeding', 'leopard resting', 'bear fishing salmon', 'rhino grazing', 'cheetah sprint'],
        conceptDNA: {
          motif: ['apex predator power pose', 'elephant herd movement horizon', 'wolf pack alert formation', 'giraffe silhouette at acacia', 'big cat stalking grass', 'bear salmon catch action'],
          structure: 'Single dominant animal fills 55-70% of frame — environmental context supports but does not compete; herd shots allow wider composition',
          repetition: 'Vary species AND behavioral state per batch — portrait / action / social behavior must rotate; same species twice consecutively is rejected',
          palette: ['savanna golden ochre', 'cool forest shadow green', 'dramatic dusk amber-red', 'dawn mist cool blue-grey'],
          background: 'Implied natural habitat — soft bokeh grass/forest/water, never studio white for wildlife',
          visualLanguage: 'Powerful naturalistic illustration with strong silhouette readability — anatomically accurate, emotionally expressive, conservation-poster aesthetic',
          commercialUse: ['Wildlife conservation poster', 'safari tourism promo', 'nature documentary graphic', 'children nature book cover'],
          promptRules: {
            mustInclude: ['natural habitat implied', 'anatomically accurate proportions', 'powerful expressive posture'],
            mustAvoid: ['zoo cage or captivity context', 'anthropomorphized cartoon expression', 'pure white studio background', 'multiple unrelated species competing'],
          },
          negativePrompt: ['zoo cage bars', 'cartoon anthropomorphized face', 'white studio background', 'anatomical distortion', 'missing limbs', 'unnatural color'],
        },
      },
      'Pets & Domestic': {
        subjects: ['Golden retriever puppy', 'tabby cat napping', 'hamster running wheel', 'rabbit in garden', 'corgi sitting', 'parrot perching'],
        conceptDNA: {
          motif: ['direct eye contact portrait close-up', 'mid-action movement blur', 'pet interacting with human hand', 'curious head-tilt pose', 'sleeping curled form'],
          structure: 'Single subject hero — animal fills 50-65% of frame, generous negative space for text overlay (packaging use case)',
          repetition: 'Vary pose and perspective significantly across batch — portrait / action / environmental must not repeat consecutively',
          palette: ['warm cream and natural brown', 'soft pastel lifestyle', 'high-contrast clean white studio'],
          background: 'Clean solid or soft gradient preferred — pure white acceptable for studio look, lifestyle color for warmth',
          visualLanguage: 'Friendly approachable illustration, expressive eyes as emotional anchor, clean silhouette readable at thumbnail size',
          commercialUse: ['Pet food packaging', 'vet clinic poster', 'pet adoption campaign', 'pet care app icon context'],
          promptRules: {
            mustInclude: ['expressive readable eyes', 'clean readable silhouette', 'generous negative space around subject'],
            mustAvoid: ['multiple animals competing for focus', 'cluttered background', 'anatomically incorrect proportions', 'cartoonish unrealistic exaggeration'],
          },
          negativePrompt: ['cluttered background', 'multiple competing subjects', 'anatomical distortion', 'missing limbs', 'human body intruding on frame', 'overly cartoonish exaggeration'],
        },
      },
      'Farm Animals': {
        subjects: ['Dairy cow', 'rooster crowing', 'sheep in meadow', 'pig rolling in mud', 'horse galloping', 'duck family pond'],
        conceptDNA: {
          motif: ['dairy cow pastoral meadow portrait', 'rooster crowing fence-post dawn', 'sheep flock rolling meadow', 'horse full gallop profile', 'duck family on pond water'],
          structure: 'Single animal in natural farm setting — gentle pastoral composition, generous sky or meadow space',
          repetition: 'Vary species per batch; avoid repeating same farm scene twice consecutively',
          palette: ['warm pastoral green and straw', 'golden dawn farm amber', 'soft overcast country grey', 'spring meadow fresh green'],
          background: 'Open farm environment — meadow, barn wood, morning sky — never clinical white',
          visualLanguage: 'Friendly warm illustration style, approachable and gentle — commercial appeal for food, lifestyle, children content',
          commercialUse: ['Organic food brand label', 'farm-to-table restaurant promo', 'children storybook', 'rural lifestyle greeting card'],
          promptRules: {
            mustInclude: ['natural farm environment context', 'warm friendly approachable posture', 'clean readable silhouette'],
            mustAvoid: ['factory farm imagery', 'slaughter or distress context', 'anthropomorphized human expression', 'clinical white background'],
          },
          negativePrompt: ['factory farm context', 'distress or slaughter implication', 'clinical white background', 'cartoon exaggeration', 'urban setting'],
        },
      },
      'Marine Life': {
        subjects: ['Dolphin pod leaping', 'sea turtle swimming', 'clownfish with anemone', 'shark silhouette', 'octopus in coral', 'whale breaching'],
        conceptDNA: {
          motif: ['dolphin pod arc leap above waterline', 'sea turtle graceful glide', 'clownfish nestled in anemone', 'shark silhouette from below', 'octopus in coral reef', 'whale breaching dramatic splash'],
          structure: 'Underwater environment fills frame with depth — animal at center, coral/water column providing depth cues; surface shots allowed for leaping/breaching subjects',
          repetition: 'Alternate between underwater (turtle, octopus, fish) and surface/above (dolphin leap, whale breach) to vary composition type',
          palette: ['deep ocean blue-teal gradient', 'coral reef warm vivid', 'bioluminescent deep navy', 'tropical clear turquoise'],
          background: 'Water environment is required — depth gradient blue, coral reef color, or surface light rays; never pure white',
          visualLanguage: 'Clean vector with underwater light quality — god rays, caustic light patterns implied; smooth streamlined animal forms',
          commercialUse: ['Ocean conservation poster', 'dive tourism promo', 'aquarium exhibit graphic', 'marine biology educational'],
          promptRules: {
            mustInclude: ['water environment context', 'natural aquatic behavior', 'clean streamlined animal anatomy'],
            mustAvoid: ['aquarium tank bars or glass walls', 'out-of-water stranded context for aquatic species', 'anthropomorphized cartoon face', 'white background'],
          },
          negativePrompt: ['aquarium tank bars', 'stranded out of water', 'cartoon anthropomorphized face', 'white background', 'anatomical distortion', 'missing fins'],
        },
      },
      'Birds': {
        subjects: ['Toucan on branch', 'eagle soaring', 'flamingo flock', 'owl portrait', 'hummingbird hovering flower', 'peacock tail display'],
        conceptDNA: {
          motif: ['wing spread silhouette overhead', 'perched branch with nature context', 'in-flight dynamic diagonal', 'plumage detail close-up', 'flock formation aerial'],
          structure: 'Subject anchored on natural perch OR full-bleed in-flight — avoid floating bird with no environmental context',
          repetition: 'Alternate between portrait (stationary, detail-rich) and action (in-flight, dynamic) — same static perched pose repeated across batch is rejected',
          palette: ['tropical vivid plumage', 'naturalistic muted earth', 'dramatic high-contrast dark background'],
          background: 'Soft bokeh natural background OR clean minimal gradient — never pure white for wildlife birds (feels unnatural)',
          visualLanguage: 'Detailed feather texture with clean line separation, expressive alert eyes, natural organic pose — no stiff taxidermy stance',
          commercialUse: ['Nature conservation poster', 'birdwatching app hero', 'tropical travel promo', 'wildlife calendar print'],
          promptRules: {
            mustInclude: ['feather texture detail visible', 'environmental context (branch, sky, or water implied)', 'natural alert posture'],
            mustAvoid: ['stiff taxidermy-like static pose', 'pure white studio background for wildlife species', 'missing wing or tail feather detail'],
          },
          negativePrompt: ['taxidermy stiff pose', 'pure white background for wildlife bird', 'missing feather detail', 'floating with no environmental context', 'cartoonish beak exaggeration'],
        },
      },
      'Insects & Bugs': {
        subjects: ['Monarch butterfly', 'stag beetle', 'praying mantis', 'ladybug on leaf', 'dragonfly hovering', 'honeybee on pollen'],
        conceptDNA: {
          motif: ['butterfly wing spread macro portrait', 'stag beetle on bark close-up', 'praying mantis alert stance', 'ladybug on leaf drop', 'dragonfly hovering water surface', 'honeybee on pollen flower'],
          structure: 'Macro close-up composition — insect fills 60-75% of frame, natural substrate (leaf/bark/flower) provides minimal context; wings spread preferred for butterfly',
          repetition: 'Vary species AND substrate per batch — avoid same plant type or same insect family in consecutive assets',
          palette: ['monarch orange and black', 'beetle iridescent green', 'neutral botanical leaf green', 'flower pollen warm yellow'],
          background: 'Soft natural bokeh — leaf, bark, flower, or water surface; isolated white acceptable for scientific/editorial use only',
          visualLanguage: 'Detailed entomological accuracy — wing pattern, leg count, antenna correct; clean crisp edges for micro-detail legibility at large print sizes',
          commercialUse: ['Nature photography book', 'science education poster', 'botanical garden promo', 'organic brand accent illustration'],
          promptRules: {
            mustInclude: ['entomologically accurate anatomy (correct leg count, antenna, wing structure)', 'natural substrate context', 'macro-level detail visibility'],
            mustAvoid: ['anthropomorphized cartoon expression', 'missing legs or antenna', 'unnatural size scale', 'horror or disgust framing'],
          },
          negativePrompt: ['cartoon anthropomorphized face', 'missing legs', 'wrong antenna count', 'horror framing', 'unnatural scale distortion', 'muddy background competing with subject'],
        },
      },
    },
  },
  'Buildings and Architecture': {
    visualDNA: 'Clean architectural illustration with geometric precision; flat vector or isometric style.',
    commercialDNA: 'Real estate marketing, urban planning pitch deck, architecture firm portfolio, travel editorial.',
    compositionDNA: 'Focus Building 60%, Sky/Atmosphere 30%, Ground/Context 10%.',
    qualityDNA: 'Clean perspective lines, precise geometric alignment, crisp glass/steel material rendering, subtle architectural shadow depth.',
    diversityEngine: {
      macroConcepts: [
        'Active construction site', 'smart city integration', 'biophilic rooftop garden',
        'night lit urban facade', 'interior floorplan cutaway', 'historic renovation contrast',
      ],
      commercialScenes: [
        'Real estate hero banner', 'architectural slide deck', 'smart city mobile splash', 'luxury property brochure',
      ],
      microVariations: {
        angle: ['Isometric 3D', 'front elevation', 'street-level low angle', 'aerial bird-eye view'],
        time: ['Daytime clear', 'golden hour dusk', 'night with lit interior windows'],
      },
    },
    subcategories: {
      'Cityscapes': {
        subjects: ['Generic downtown skyline', 'golden hour city', 'aerial grid', 'urban intersection', 'rain-slick night city'],
        conceptDNA: {
          motif: ['downtown skyline silhouette at dusk', 'golden hour warm city glow', 'aerial grid street pattern overhead', 'rain-slick night reflection city', 'urban intersection street-level'],
          structure: 'Wide panoramic composition — skyline fills middle third, sky 40% above, implied ground or water below; aerial shots use full-bleed grid',
          repetition: 'Vary time of day strongly across batch — golden hour / blue hour / night / midday must rotate; same lighting twice is rejected',
          palette: ['golden hour warm amber and deep blue', 'blue hour cool cobalt', 'night neon wet reflection', 'midday clean cool white'],
          background: 'Sky IS the background — gradient from deep blue to warm horizon; ground reflection for night/rain scenes',
          visualLanguage: 'Commercial real-estate editorial illustration — non-specific generic architecture, no recognizable real city landmarks, no real building brand signage',
          commercialUse: ['Real estate website hero', 'urban development promo', 'travel destination generic city', 'business district backdrop'],
          promptRules: {
            mustInclude: ['generic non-specific architectural forms', 'atmospheric lighting (golden/blue/night)', 'sense of urban scale and density'],
            mustAvoid: ['recognizable real city landmark (no Eiffel Tower, Empire State, etc.)', 'visible real brand signage on buildings', 'identical buildings repeated in grid'],
          },
          negativePrompt: ['recognizable real landmark', 'visible brand signage on facade', 'identical repeating building clone', 'empty ghost city no atmosphere', 'cartoonish toy-scale buildings'],
        },
      },
      'Interior Design': {
        subjects: ['Scandinavian living room', 'modern kitchen island', 'home office setup', 'cozy reading nook', 'minimal bathroom'],
        conceptDNA: {
          motif: ['Scandinavian living room warm texture', 'modern kitchen island marble counter', 'home office natural light desk', 'cozy reading nook armchair lamp', 'minimal bathroom clean tile'],
          structure: 'Interior perspective shot — single room hero, one-point or two-point perspective, natural light from implied window source',
          repetition: 'Vary room type across batch; within same room vary styling era — Scandinavian / Japanese / Industrial / Mediterranean',
          palette: ['warm Scandi neutral cream and wood', 'cool minimal white and marble', 'warm reading nook amber', 'cool bathroom clean tile grey'],
          background: 'Interior walls/surfaces IS the background — window light source implied at frame edge',
          visualLanguage: 'Interior design magazine aesthetic — aspirational but livable, clean styled, no clutter, architectural rendering quality',
          commercialUse: ['Real estate listing hero', 'interior design brand campaign', 'home goods product context', 'lifestyle magazine editorial'],
          promptRules: {
            mustInclude: ['natural light from window implied', 'curated minimal styling (1-3 hero objects)', 'clean architectural perspective'],
            mustAvoid: ['cluttered lived-in mess', 'visible real brand product logos', 'people or pets obscuring the space', 'flat cartoon illustration style'],
          },
          negativePrompt: ['cluttered messy room', 'visible product brand logo', 'people blocking architectural view', 'flat 2D non-perspective cartoon', 'dark underlit dingy'],
        },
      },
      'Historic & Landmarks': {
        subjects: ['Ancient temple facade', 'medieval castle turrets', 'renaissance dome', 'historic lighthouse', 'roman arch'],
        conceptDNA: {
          motif: ['ancient temple column facade detail', 'medieval castle turret dramatic sky', 'renaissance dome overhead perspective', 'historic lighthouse coastal cliff', 'roman arch stone texture'],
          structure: 'Monumental architecture fills 60-75% of frame — sky and environment provide dramatic atmosphere; low angle preferred for power',
          repetition: 'Vary era strongly across batch — ancient / medieval / renaissance / modern historic must rotate; same architectural period twice is rejected',
          palette: ['warm aged stone ochre and sky blue', 'dramatic storm castle grey', 'renaissance warm terracotta', 'lighthouse coastal grey-white', 'roman marble warm white'],
          background: 'Dramatic sky is the primary background — golden hour, dramatic clouds, or clear blue all valid; environment must match architecture era',
          visualLanguage: 'Non-specific generic historic architecture — no identifiable real landmark (no Colosseum, no Notre Dame), period-accurate but fictional structure',
          commercialUse: ['History education editorial', 'travel poster generic destination', 'heritage brand background', 'architecture study visual'],
          promptRules: {
            mustInclude: ['period-accurate architectural detail (column style, arch type, stonework)', 'atmospheric dramatic sky', 'sense of age and scale'],
            mustAvoid: ['identifiable real historic landmark', 'modern signage or anachronistic elements', 'tourist crowd obscuring architecture', 'cartoon or flat style'],
          },
          negativePrompt: ['identifiable real landmark', 'modern signage anachronism', 'tourist crowd clutter', 'cartoon illustration style', 'sterile flat lighting'],
        },
      },
      'Modern Architecture': {
        subjects: ['Glass tower concept', 'curved museum', 'minimalist villa', 'cable-stayed bridge', 'biophilic green tower'],
        conceptDNA: {
          motif: ['glass curtain wall tower dramatic reflection', 'curved museum sculptural facade', 'minimalist villa clean horizontal plane', 'cable-stayed bridge tension geometry', 'biophilic green tower vertical garden'],
          structure: 'Architectural hero in dramatic environmental context — low angle or dramatic perspective; sky reflection and environmental interaction are key',
          repetition: 'Vary building typology per batch — tower / museum / residential / infrastructure / sustainable; avoid same function twice consecutively',
          palette: ['glass tower steel blue sky reflection', 'warm concrete villa natural', 'cable bridge industrial grey-white', 'biophilic tower lush green accent'],
          background: 'Clean dramatic sky or urban context — architecture must read as non-specific fictional contemporary design, not a real award-winning building',
          visualLanguage: 'Architectural visualization quality — clean technical precision, parametric or contemporary forms, not historical pastiche',
          commercialUse: ['Real estate development concept', 'architectural firm portfolio', 'smart city promo', 'sustainability campaign hero'],
          promptRules: {
            mustInclude: ['contemporary architectural language (parametric / minimalist / biophilic)', 'dramatic lighting that reads facade materiality', 'non-specific fictional structure'],
            mustAvoid: ['identifiable real architect signature building', 'historical pastiche style', 'cartoon or hand-drawn aesthetic', 'generic clipart building'],
          },
          negativePrompt: ['identifiable real building', 'historical pastiche', 'cartoon clipart style', 'generic symmetrical office block without design intent', 'flat no-shadow illustration'],
        },
      },
      'Industrial Buildings': {
        subjects: ['Factory exterior night glow', 'power plant cooling towers', 'grain silo complex', 'oil refinery silhouette', 'warehouse'],
        conceptDNA: {
          motif: ['factory exterior warm night glow against dark sky', 'power plant cooling tower steam column', 'grain silo cylindrical cluster agriculture', 'oil refinery pipe-and-flare silhouette dusk', 'warehouse large-scale exterior loading dock'],
          structure: 'Industrial facility as dramatic architectural subject — wide establishing composition, infrastructure scale emphasized against horizon or sky',
          repetition: 'Vary industry type across batch — energy / agriculture / manufacturing / logistics; dramatic lighting (night / dusk / dawn) preferred over flat midday',
          palette: ['factory warm amber night glow', 'cooling tower steam cool grey', 'grain silo rural warm straw', 'refinery dusk silhouette orange-navy', 'warehouse industrial concrete grey'],
          background: 'Dramatic sky — dusk silhouette, night glow, or dramatic cloud; industrial scale requires atmospheric context',
          visualLanguage: 'Industrial editorial aesthetic — functional infrastructure treated as dramatic subject, non-specific and non-branded, no real company livery',
          commercialUse: ['Industrial brand communication', 'energy sector promo', 'infrastructure project visual', 'heavy industry editorial'],
          promptRules: {
            mustInclude: ['dramatic atmospheric lighting (dusk / night / dawn)', 'industrial scale implied by composition', 'non-branded generic facility'],
            mustAvoid: ['recognizable real plant or facility with identifiable branding', 'pollution or environmental damage as primary focus', 'cartoonish industrial illustration'],
          },
          negativePrompt: ['real company logo on facility', 'pollution damage framing', 'cartoon industrial clip art', 'flat midday harsh shadow', 'sterile white background'],
        },
      },
    },
  },
  'Business': {
    visualDNA: 'Professional flat vector illustration; modern corporate aesthetic, clean graphic clarity.',
    commercialDNA: 'Corporate presentation, SaaS landing page, B2B marketing, annual report, HR recruitment.',
    compositionDNA: 'Focus Subject 40%, Negative Space 35%, Supporting Props 25%.',
    qualityDNA: 'Clean professional attire rendering, harmonious corporate palette, expressive approachable gestures, uncluttered layout.',
    diversityEngine: {
      macroConcepts: [
        'Strategic whiteboard session', 'data dashboard review', 'team victory celebration',
        'solitary deep-work execution', 'investor pitch presentation', 'remote video conference', 'deal closing',
      ],
      commercialScenes: [
        'SaaS web header', 'pitch deck slide graphic', 'corporate annual report cover', 'B2B social media banner',
      ],
      microVariations: {
        setting: ['Modern open office', 'home office nook', 'glass boardroom', 'abstract corporate background'],
        palette: ['Corporate navy blue', 'modern teal accent', 'energetic startup coral', 'minimalist monochrome'],
      },
    },
    subcategories: {
      'Finance & Banking': {
        subjects: ['Coin stack growth chart', 'investment portfolio visual', 'bank vault door', 'credit card transaction', 'savings jar'],
        genericObjectTags: ['device', 'softwareUI'],
        conceptDNA: {
          motif: ['rising coin stack with arrow', 'shield over building skyline', 'interlocked financial data blocks', 'vault door with key light', 'financial graph waterfall'],
          structure: 'Single dominant financial metaphor as hero — supporting elements (arrows, coins, chart lines) arranged to reinforce the narrative',
          repetition: 'Vary the core metaphor per asset — coin stack / shield / graph must not repeat consecutively across batch',
          palette: ['corporate navy and gold', 'deep green and silver', 'financial teal and white'],
          background: 'Clean solid or subtle gradient — never busy trading-floor chaos for hero assets',
          visualLanguage: 'Precise flat vector, crisp edges, confident line weights, professional corporate feel',
          commercialUse: ['Bank landing page hero', 'annual report cover', 'fintech app splash', 'financial presentation slide'],
          promptRules: {
            mustInclude: ['clean professional composition', 'fictional generic financial interface or symbol', 'clear focal point'],
            mustAvoid: ['real bank logo or brand', 'recognizable real financial software UI', 'actual currency note design', 'generic stock-photo handshake'],
          },
          negativePrompt: ['real bank brand identity', 'recognizable trading platform screenshot', 'actual banknote illustration', 'trademarked financial logo', 'cluttered desk with documents'],
        },
      },
      'Technology & Digital': {
        subjects: ['Developer coding at laptop', 'cloud infrastructure', 'data analytics dashboard', 'API connection diagram'],
        genericObjectTags: ['device', 'softwareUI'],
        conceptDNA: {
          motif: ['abstract cloud network nodes', 'code block cascade', 'data stream tunnel perspective', 'circuit path city', 'hologram screen interaction'],
          structure: 'Digital-native composition — device or interface as focal anchor with abstract data flow around it',
          repetition: 'Alternate device-centric / pure-abstract / human-technology interaction across batch',
          palette: ['tech navy and electric cyan', 'dark mode neon', 'clean SaaS light theme'],
          background: 'Clean gradient or minimal grid — suggests digital world without literal office',
          visualLanguage: 'Sharp modern flat illustration, subtle glow accents, no dated skeuomorphism',
          commercialUse: ['SaaS landing page hero', 'tech conference keynote slide', 'app store screenshot context', 'IT services brochure'],
          promptRules: {
            mustInclude: ['generic unbranded device or fictional interface', 'abstract data-flow narrative', 'clean digital aesthetic'],
            mustAvoid: ['recognizable real software layout', 'brand-specific device design', 'dated 90s computer aesthetic', 'real logos'],
          },
          negativePrompt: ['recognizable real app interface', 'branded device silhouette', 'outdated chunky hardware', 'visible trademark', 'cluttered cable mess'],
        },
      },
      'Teamwork & Meeting': {
        subjects: ['Boardroom strategy meeting', 'brainstorming whiteboard', 'video conference grid', 'team huddle', 'design sprint'],
        conceptDNA: {
          motif: ['circular team huddle overhead view', 'radial whiteboard idea map', 'staggered video conference grid', 'split-screen dual monitor collaboration', 'around-table perspective shot'],
          structure: 'Multi-person scene with clear focal anchor — one person presenting or one shared object (whiteboard/screen) as visual center',
          repetition: 'Non-repeating scene composition — each asset should show a distinct collaboration moment, not the same pose from different angles',
          palette: ['corporate navy and warm white', 'modern teal and light grey', 'energetic coral and off-white'],
          background: 'Implied environment (soft office backdrop, abstract corporate blur) — never pure white for people scenes',
          visualLanguage: 'Approachable flat illustration, natural relaxed postures, diverse ethnicity without stereotype, no forced grinning',
          commercialUse: ['HR recruitment poster', 'SaaS landing hero', 'corporate annual report', 'DEI campaign visual'],
          promptRules: {
            mustInclude: ['natural collaborative gesture', 'at least 2 people in meaningful interaction', 'implied shared focus object'],
            mustAvoid: ['forced handshake pose', 'generic high-five', 'everyone staring at camera simultaneously', 'identical clone-like characters'],
          },
          negativePrompt: ['forced handshake', 'generic high-five pose', 'everyone facing camera smiling', 'identical face clones', 'empty background with floating figures'],
        },
      },
      'Startup & Entrepreneurship': {
        subjects: ['Rocket launch growth', 'lightbulb idea moment', 'startup pitch', 'growth hacking funnel', 'seed funding concept'],
        conceptDNA: {
          motif: ['upward trajectory rocket path', 'lightbulb exploding into gears', 'growth curve breaking ceiling', 'seed sprouting into network tree', 'ladder to cloud concept'],
          structure: 'Single dominant metaphor object as hero — supporting micro-elements arranged to reinforce narrative (arrows, dots, small icons)',
          repetition: 'Avoid literal one-to-one metaphor (lightbulb = idea is too bare) — add narrative context: WHO has the idea, WHAT happens next',
          palette: ['energetic coral and navy', 'growth green and dark charcoal', 'vibrant purple and electric yellow'],
          background: 'Abstract gradient or minimal grid — suggests digital-native startup world without literal office',
          visualLanguage: 'Bold editorial flat illustration, confident line weights, dynamic diagonal composition for energy',
          commercialUse: ['Startup pitch deck slide', 'VC firm report', 'accelerator program poster', 'entrepreneur blog hero'],
          promptRules: {
            mustInclude: ['strong directional visual energy (upward or forward)', 'narrative context beyond single isolated object', 'at least one human or human-implied element for scale'],
            mustAvoid: ['single lightbulb isolated on white with nothing else', 'generic rocket clip-art', 'literal money-bag-equals-success'],
          },
          negativePrompt: ['isolated lightbulb on plain white', 'generic clip-art rocket', 'money bag literal symbol', 'flat arrow only', 'no narrative context'],
        },
      },
      'E-commerce & Retail': {
        subjects: ['Online shopping cart', 'doorstep delivery box', 'mobile shopping app', 'storefront window', 'gift wrapping station'],
        genericObjectTags: ['device', 'softwareUI', 'packaging'],
        conceptDNA: {
          motif: ['floating shopping bag with parcel', 'mobile cart checkout flow', 'storefront to doorstep journey', 'payment terminal tap', 'order tracking progress'],
          structure: 'Customer-journey narrative — one clear focal moment (checkout, delivery, unboxing) with supporting props',
          repetition: 'Vary the journey stage per asset — browsing / checkout / delivery / unboxing must rotate across batch',
          palette: ['fresh green and warm white', 'brand-neutral coral', 'clean modern e-commerce palette'],
          background: 'Clean white or soft gradient — product focus, no cluttered warehouse backdrop',
          visualLanguage: 'Friendly approachable flat illustration, rounded forms, inviting color blocking',
          commercialUse: ['E-commerce website hero', 'shopping app campaign', 'delivery service promo', 'retail banner'],
          promptRules: {
            mustInclude: ['fictional generic shopping interface', 'clear narrative moment', 'clean product focus'],
            mustAvoid: ['real retailer logo or brand', 'recognizable real shopping app', 'actual product packaging design', 'confusing multi-activity scene'],
          },
          negativePrompt: ['real brand logo', 'recognizable real marketplace interface', 'actual product trademark', 'cluttered messy checkout', 'staged generic shopping cliche'],
        },
      },
      'Charts & Infographics': {
        subjects: ['Bar chart growth', 'pie chart market breakdown', 'timeline flowchart', 'world map data overlay', 'conversion funnel'],
        genericObjectTags: ['softwareUI'],
        conceptDNA: {
          motif: ['three-dimensional bar chart rise', 'concentric pie donut', 'timeline flow arrow', 'network data map', 'funnel conversion stages'],
          structure: 'Data-as-hero — chart type is the focal point, minimal decorative distraction, label space preserved',
          repetition: 'Rotate chart archetype per asset — bar / line / pie / funnel / map must not repeat consecutively',
          palette: ['data-viz modern palette', 'corporate navy accents', 'vibrant categorical colors'],
          background: 'Pure white or very subtle gradient — data legibility first',
          visualLanguage: 'Crisp precise vector, consistent axis styling, no fake 3D distortion, readable hierarchy',
          commercialUse: ['Annual report infographic', 'data dashboard hero', 'pitch deck chart slide', 'business blog visual'],
          promptRules: {
            mustInclude: ['clear single chart type as hero', 'consistent data visualization style', 'clean label hierarchy'],
            mustAvoid: ['fictional real-company data branding', 'recognizable real dashboard layout', 'illegible text', 'misleading axis styling'],
          },
          negativePrompt: ['recognizable real analytics platform', 'illegible chart text', 'misleading or distorted data', 'real company branding', 'cluttered multiple chart types'],
        },
      },
    },
  },
  'Education': {
    visualDNA: 'Friendly and clear flat illustration; engaging educational aesthetic with high legibility.',
    commercialDNA: 'E-learning platform, children textbook, academic publisher, school district campaign.',
    compositionDNA: 'Focus Subject 50%, Learning Context 30%, Negative Space 20%.',
    qualityDNA: 'Vibrant primary color balance, clean readable graphic shapes, encouraging character expressions.',
    diversityEngine: {
      macroConcepts: [
        'Interactive science experiment', 'quiet library reading', 'digital tutoring session',
        'group project collaboration', 'graduation celebration', 'outdoor nature lesson',
      ],
      commercialScenes: [
        'EdTech splash screen', 'textbook cover visual', 'online course hero banner', 'school admissions flyer',
      ],
      microVariations: {
        setting: ['Classroom', 'home study desk', 'digital screen interface', 'school library'],
        role: ['Student (child)', 'student (teen)', 'student (adult)', 'teacher', 'tutor', 'researcher'],
      },
    },
    subcategories: {
      'School & Classroom': {
        subjects: ['Teacher at chalkboard', 'students raising hands', 'classroom supplies', 'school bus arrival', 'science experiment class'],
        conceptDNA: {
          motif: ['teacher at chalkboard engaged gesture', 'students raising hands enthusiastic', 'classroom supply flat-lay arrangement', 'yellow school bus arrival morning', 'science experiment flask color reaction'],
          structure: 'Classroom activity as primary scene — one clear educational moment with diverse student group; flat-lay composition valid for supply subjects',
          repetition: 'Vary activity type per batch — teaching moment / student activity / supplies / arrival / experiment must rotate',
          palette: ['classroom warm wood-and-chalkboard green', 'bright cheerful primary colors for supplies', 'morning golden school bus yellow', 'clean lab white and science blue'],
          background: 'Classroom environment implied — chalkboard, desks, windows; school bus exterior for arrival scene',
          visualLanguage: 'Warm inclusive educational illustration — diverse students, positive energy, no specific country uniform, globally relatable classroom context',
          commercialUse: ['EdTech app hero', 'school supply brand campaign', 'educational publisher cover', 'back-to-school promo'],
          promptRules: {
            mustInclude: ['diverse student representation', 'positive learning energy', 'clear educational context'],
            mustAvoid: ['specific country school uniform', 'single ethnicity classroom', 'test/exam stress framing', 'bullying or negative social dynamic'],
          },
          negativePrompt: ['single ethnicity classroom', 'specific country uniform', 'exam stress negative energy', 'bullying scene', 'dark dingy classroom'],
        },
      },
      'Online Learning': {
        subjects: ['Student with laptop studying', 'e-learning platform UI', 'virtual classroom video grid', 'digital certificate', 'online quiz'],
        genericObjectTags: ['device', 'softwareUI'],
        conceptDNA: {
          motif: ['student at laptop focused study home setup', 'e-learning platform UI dashboard concept', 'virtual classroom video grid multi-face', 'digital certificate badge celebration', 'online quiz progress bar completion'],
          structure: 'Person + device as primary hero — device screen shows fictional generic UI; video grid compositions show 4-9 diverse participant tiles',
          repetition: 'Vary device type and study context per batch — home desk / café / bedroom / outdoor; UI theme must be generic fictional, not recognizable real platform',
          palette: ['e-learning platform clean blue and white', 'home study warm desk amber', 'digital certificate gold and navy', 'quiz green correct and completion'],
          background: 'Home study environment with natural light — warm domestic context; UI screens show clean fictional interface',
          visualLanguage: 'Modern edtech illustration style — clean approachable, globally diverse participants, fictional platform UI (no Zoom / Teams / Google Classroom clone)',
          commercialUse: ['EdTech platform landing page', 'online course promo', 'remote learning campaign', 'digital certificate template context'],
          promptRules: {
            mustInclude: ['fictional generic learning platform interface on screen', 'diverse participant representation', 'positive focused learning energy'],
            mustAvoid: ['recognizable real platform UI (no Zoom grid clone, no Teams purple)', 'brand logo on device', 'distracted or bored student energy'],
          },
          negativePrompt: ['recognizable real platform UI', 'real brand logo on device', 'bored distracted student', 'single ethnicity group', 'dark isolated room without warmth'],
        },
      },
      'Science & Research': {
        subjects: ['Laboratory experiment setup', 'microscope inspection', 'chemistry flasks', 'DNA double helix', 'research data chart'],
        conceptDNA: {
          motif: ['laboratory flask color reaction bubbling', 'microscope inspection researcher focused', 'chemistry flask arrangement colorful liquid', 'DNA double helix floating structure', 'research data chart discovery moment'],
          structure: 'Science equipment or concept as primary hero — clean technical composition, one focal experiment or discovery moment',
          repetition: 'Vary between physical lab equipment and conceptual scientific visualization per batch',
          palette: ['lab clean white and science blue', 'chemistry vivid flask color spectrum', 'DNA molecule cool teal-blue', 'research chart data orange-blue'],
          background: 'Clean laboratory environment or pure gradient for conceptual visualization — never cluttered or dark',
          visualLanguage: 'Scientific editorial illustration — accurate generic equipment (no real brand microscope), clean professional, discovery-optimistic tone',
          commercialUse: ['Scientific journal editorial', 'pharma company communication', 'STEM education poster', 'biotech startup brand'],
          promptRules: {
            mustInclude: ['accurate generic scientific equipment', 'clean controlled environment', 'discovery/progress narrative'],
            mustAvoid: ['real instrument brand marking (no Zeiss, no Thermo Fisher logo)', 'unsafe lab practice depiction', 'horror or danger framing of chemical'],
          },
          negativePrompt: ['real instrument brand logo', 'unsafe lab practice', 'explosion or accident framing', 'dark dingy laboratory', 'cartoon non-scientific aesthetic'],
        },
      },
      'Books & Reading': {
        subjects: ['Open book with imagination cloud', 'bookshelf arrangement', 'cozy reading armchair', 'library interior', 'e-reader'],
        conceptDNA: {
          motif: ['open book with imagination cloud floating above', 'bookshelf color-organized arrangement', 'cozy armchair reading lamp warm', 'library interior tall shelves perspective', 'e-reader device hand held'],
          structure: 'Book or reading environment as primary subject — warm intimate composition, generous negative space for text overlay use cases',
          repetition: 'Vary between physical book (open/shelf/library) and digital reading (e-reader) per batch; warm cozy lighting consistent throughout',
          palette: ['warm reading lamp amber and leather', 'bookshelf color-organized pastel', 'library oak and deep green', 'e-reader modern minimal white'],
          background: 'Warm domestic reading environment — implied sofa, armchair, library, or window — never fluorescent office',
          visualLanguage: 'Warm aspirational reading culture aesthetic — intellectual but approachable, cozy and inviting, literary lifestyle tone',
          commercialUse: ['Publishing house campaign', 'library promo', 'bookstore visual', 'literacy campaign hero'],
          promptRules: {
            mustInclude: ['warm inviting lighting', 'book as primary or clearly visible subject', 'cozy aspirational reading context'],
            mustAvoid: ['real book title or cover art on spine', 'cold clinical library (hospital, office)', 'e-reader with recognizable real device brand'],
          },
          negativePrompt: ['real book title on spine', 'real brand e-reader logo', 'cold fluorescent library', 'reading as punishment framing', 'cluttered chaotic bookshelf'],
        },
      },
    },
  },
  'Food and Drink': {
    visualDNA: 'Appetizing commercial vector illustration; fresh visual quality with rich color appeal.',
    commercialDNA: 'Restaurant menu, food delivery app, product packaging label, culinary blog, recipe book.',
    compositionDNA: 'Focus Food 55%, Garnish/Context 25%, Negative Space 20%.',
    qualityDNA: 'Natural food surface moisture/sheen, fresh crisp texture definition, appetizing warm color contrast, clean natural shadows.',
    diversityEngine: {
      macroConcepts: [
        'Chef cooking action', 'fresh organic ingredient layout (mise en place)', 'plated gourmet hero dish',
        'street food preparation', 'picnic meal spread', 'baking preparation',
      ],
      commercialScenes: [
        'Food delivery app splash', 'restaurant menu header', 'product packaging label', 'culinary blog article',
      ],
      microVariations: {
        view: ['Overhead flat lay', '3/4 hero view', 'cross-section', 'ingredient explosion'],
        lighting: ['Culinary studio soft light', 'warm dining ambient light', 'sunlit kitchen'],
      },
    },
    subcategories: {
      'Healthy Food': {
        subjects: ['Rainbow salad bowl', 'fruit platter', 'smoothie bowl toppings', 'avocado toast', 'fresh vegetable basket', 'acai bowl'],
        conceptDNA: {
          motif: ['rainbow salad bowl overhead hero', 'fresh fruit platter vibrant flat-lay', 'smoothie bowl toppings arranged artfully', 'avocado toast styled side-angle', 'fresh vegetable basket harvest', 'acai bowl purple gradient toppings'],
          structure: 'Overhead (flat-lay) OR 45° hero angle — food fills 65% of frame, clean negative space or minimal props at edge',
          repetition: 'Vary shooting angle per batch — overhead / side / 3/4 hero must rotate; same composition style twice is rejected',
          palette: ['rainbow fresh green-orange-red-purple', 'smoothie bowl deep purple and cream', 'avocado toast warm green and natural wood', 'harvest basket earthy green and brown'],
          background: 'Clean white or natural wood — food colors must pop; never dark or competing backgrounds for fresh healthy content',
          visualLanguage: 'Food magazine appetizing style — abundant, vibrant, fresh, never sad or wilted; health-positive aspiration without clinical diet messaging',
          commercialUse: ['Health food brand packaging', 'meal delivery app', 'wellness nutrition blog', 'supermarket fresh produce promo'],
          promptRules: {
            mustInclude: ['abundant fresh appealing food presentation', 'vibrant natural color', 'appetizing clean styling'],
            mustAvoid: ['wilted or overripe food', 'diet culture negative messaging', 'generic food photography cliché (lone apple on white)', 'branded product packaging visible'],
          },
          negativePrompt: ['wilted spoiled food', 'sad diet plate tiny portion', 'branded product label visible', 'dark background for fresh food', 'clinical nutrition chart style'],
        },
      },
      'Fast Food': {
        subjects: ['Layered burger cross-section', 'crispy fries in cup', 'pizza slice cheese stretch', 'loaded hot dog', 'taco arrangement'],
        conceptDNA: {
          motif: ['burger cross-section layer reveal hero', 'crispy golden fries overflowing cup', 'pizza slice dramatic cheese pull stretch', 'loaded hot dog street-food angle', 'taco arrangement overhead flat-lay'],
          structure: '45° hero angle OR cross-section reveal — exaggerated food size, cheese pull and stack height emphasized; dramatic close-up preferred',
          repetition: 'Vary food type strongly per batch; within same food vary angle — cross-section / hero / aerial',
          palette: ['burger warm amber bun and red sauce', 'fries golden yellow and salt white', 'pizza red sauce and melted cheese stretch', 'hot dog mustard yellow and red'],
          background: 'Clean solid color or gradient — food-safe color (not competing); rustic wood or branded-neutral wrapper acceptable',
          visualLanguage: 'Fast food advertising-quality illustration — food looks bigger than life, maximally appetizing, indulgent celebration aesthetic',
          commercialUse: ['Quick-service restaurant menu', 'food delivery app card', 'fast food brand campaign', 'street food editorial'],
          promptRules: {
            mustInclude: ['exaggerated appetizing food height or stretch', 'warm food color rendering', 'clean isolated food hero'],
            mustAvoid: ['recognizable real chain branding or logo', 'sad deflated food', 'unappetizing grey or brown cast', 'excessive calorie or guilt messaging'],
          },
          negativePrompt: ['real fast food chain logo or brand color', 'deflated sad burger', 'grey unappetizing food', 'guilt framing', 'dirty wrapper or messy table clutter'],
        },
      },
      'Beverages': {
        subjects: ['Iced coffee layered cup', 'tropical cocktail with garnish', 'Japanese tea cup', 'fresh juice squeeze', 'boba milk tea'],
        genericObjectTags: ['packaging'],
        conceptDNA: {
          motif: ['layered iced coffee glass', 'tropical cocktail with fruit garnish', 'ceramic tea cup with steam', 'fresh juice splash squeeze', 'boba milk tea pearls'],
          structure: 'Beverage as hero — glass or cup center stage with garnish or fill-level detail, clean backdrop',
          repetition: 'Rotate beverage type per asset — coffee / cocktail / tea / juice / boba must not repeat consecutively',
          palette: ['rich coffee browns and cream', 'tropical fruit colors', 'fresh natural beverage palette'],
          background: 'Clean solid or subtle gradient — product focus, never cluttered café scene',
          visualLanguage: 'Appetizing commercial flat illustration, fresh vibrant colors, appealing texture suggestion',
          commercialUse: ['Menu design', 'beverage packaging label', 'café branding visual', 'recipe blog hero'],
          promptRules: {
            mustInclude: ['generic unbranded cup or glass', 'appetizing presentation', 'clean product focus'],
            mustAvoid: ['recognizable real beverage brand cup', 'real logo or label design', 'branded packaging silhouette'],
          },
          negativePrompt: ['real beverage brand logo', 'recognizable real product packaging', 'trademark cup design', 'unappetizing appearance'],
        },
      },
      'Cooking & Kitchen': {
        subjects: ['Chef preparing wok dish', 'kitchen tools flat lay', 'chopping vegetables', 'baking dough', 'cast iron skillet'],
        conceptDNA: {
          motif: ['chef wok flame dramatic toss action', 'kitchen tools flat-lay organized arrangement', 'vegetable chopping fresh prep close-up', 'baking dough hands knead texture', 'cast iron skillet overhead sizzle'],
          structure: 'Action moment OR flat-lay — cooking action shots use dynamic side angle with motion blur; tool/ingredient shots use overhead flat-lay',
          repetition: 'Alternate between human-in-action (chef/hands) and ingredient/tool flat-lay per batch',
          palette: ['wok flame warm amber and orange', 'kitchen tool clean steel and wood', 'vegetable prep fresh green and natural', 'baking warm cream flour and dough', 'cast iron dark and rustic'],
          background: 'Kitchen countertop or dark rustic surface — action shots use kitchen environment; flat-lay uses clean marble or wood',
          visualLanguage: 'Culinary editorial style — food process as artisanal craft, warmth and skill celebration, no sterile clinical kitchen',
          commercialUse: ['Cooking app hero', 'culinary school promo', 'kitchen brand campaign', 'food blog editorial'],
          promptRules: {
            mustInclude: ['clear cooking process or technique visible', 'warm culinary environment', 'food or tool as clear subject'],
            mustAvoid: ['real chef brand or restaurant branding visible', 'unsafe cooking practice', 'food waste or mess as hero'],
          },
          negativePrompt: ['real chef brand or restaurant logo', 'unsafe kitchen fire hazard', 'food waste mess as hero', 'sterile clinical hospital kitchen aesthetic', 'cartoonish kitchen clip art'],
        },
      },
      'Bakery & Desserts': {
        subjects: ['Celebration cake slice', 'butter croissant', 'macaron tower', 'cinnamon roll fresh', 'artisan sourdough loaf'],
        conceptDNA: {
          motif: ['celebration cake slice dramatic height reveal', 'butter croissant golden flaky layers', 'macaron tower color gradient stack', 'fresh cinnamon roll pull-apart close-up', 'artisan sourdough score-pattern overhead'],
          structure: 'Hero close-up — baked good fills 65-80% of frame; dramatic texture and interior visible (layers, crumb, glaze); overhead for pattern subjects',
          repetition: 'Vary between pastry / bread / cake / confection; vary hero angle — cross-section / overhead / 3/4 hero',
          palette: ['croissant golden amber and cream', 'macaron pastel rainbow gradient', 'cinnamon roll warm caramel glaze', 'sourdough dark crust warm crumb', 'cake layered cream and fruit'],
          background: 'Marble pastry surface, rustic wood, or parchment paper — warm artisan environment; never clinical white for dessert',
          visualLanguage: 'Artisan patisserie editorial aesthetic — textures (flakiness, crust, glaze) are the hero; warmth, craft, and indulgent pleasure',
          commercialUse: ['Bakery brand identity', 'patisserie menu card', 'café social media visual', 'dessert recipe book cover'],
          promptRules: {
            mustInclude: ['dramatic texture close-up (layers, crust, glaze, crumb visible)', 'warm artisan environment surface', 'appetizing golden or vivid color rendering'],
            mustAvoid: ['pale underbaked look', 'generic supermarket slab cake', 'branded box or packaging visible', 'clinical cold lighting'],
          },
          negativePrompt: ['pale underbaked color', 'generic mass-produced cake', 'branded bakery box visible', 'cold blue clinical lighting', 'cartoon sweet clip art style'],
        },
      },
    },
  },
  'Health and Medicine': {
    visualDNA: 'Clean professional flat illustration; clinical precision combined with human warmth.',
    commercialDNA: 'Healthcare website, medical education brochure, wellness app, pharmaceutical collateral.',
    compositionDNA: 'Focus Subject 55%, Clinical Context 30%, Negative Space 15%.',
    qualityDNA: 'Reassuring human expressions, accurate medical prop rendering, calming clinical color balance, clean non-scary aesthetic.',
    diversityEngine: {
      macroConcepts: [
        'Compassionate patient consultation', 'laboratory research testing', 'emergency response dispatch',
        'telehealth call', 'pharmacy guidance', 'mental health therapy',
      ],
      commercialScenes: [
        'Hospital website hero', 'telehealth onboarding', 'health insurance brochure', 'medical journal illustration',
      ],
      microVariations: {
        setting: ['Bright clinic room', 'modern hospital', 'home care setting', 'research laboratory'],
        role: ['Doctor', 'nurse', 'surgeon', 'paramedic', 'pharmacist', 'patient'],
      },
    },
    subcategories: {
      'Medical Equipment': {
        subjects: ['Stethoscope detail', 'blood pressure monitor', 'surgical instruments', 'MRI machine exterior', 'ECG monitor', 'IV drip'],
        genericObjectTags: ['device'],
        conceptDNA: {
          motif: ['stethoscope coiled detail clean background', 'blood pressure cuff arm measurement', 'surgical instrument tray organized arrangement', 'MRI machine exterior tube opening', 'ECG monitor heartbeat line green', 'IV drip bag and line clinical'],
          structure: 'Single medical instrument as hero — clean isolated or minimal clinical environment; no patient in distress context',
          repetition: 'Vary instrument category per batch — diagnostic / surgical / imaging / monitoring; avoid same clinical tool twice',
          palette: ['clinical clean white and steel grey', 'ECG monitor dark with neon green line', 'surgical steel cool blue-white', 'blood pressure cuff medical blue'],
          background: 'Clean white or very light grey — clinical clean environment; MRI can have facility context',
          visualLanguage: 'Medical device product illustration quality — generic unbranded equipment (no Siemens/Philips/GE identifiers), professional and trust-inspiring',
          commercialUse: ['Hospital brand communication', 'health insurance promo', 'medical device category visual', 'clinic website hero'],
          promptRules: {
            mustInclude: ['generic unbranded medical instrument', 'clean clinical context', 'professional trust-inspiring composition'],
            mustAvoid: ['real manufacturer brand marking on device', 'patient in pain or distress', 'blood or biological fluid visible', 'horror or fear medical framing'],
          },
          negativePrompt: ['real medical brand logo', 'patient in distress', 'blood or gore', 'fear or horror medical context', 'dirty or contaminated equipment'],
        },
      },
      'Wellness & Fitness': {
        subjects: ['Yoga warrior pose', 'outdoor running', 'gym weight training', 'meditation sitting', 'cycling mountain route'],
        conceptDNA: {
          motif: ['yoga warrior II pose golden light', 'outdoor runner trail motion', 'gym weight training focused lift', 'meditation seated calm morning', 'cyclist mountain route dramatic'],
          structure: 'Single athlete in peak activity moment — full body visible, environment as context; motion blur acceptable for running/cycling',
          repetition: 'Vary activity type AND environment per batch — yoga (indoor/outdoor) / running (trail/road) / gym / meditation / cycling',
          palette: ['yoga warm sunrise gold and earth', 'running trail cool morning green', 'gym industrial grey and power red', 'meditation calm blue-grey dawn', 'cycling mountain dramatic cool'],
          background: 'Natural or gym environment — yoga: sunrise outdoor or studio; running: trail path; gym: facility context; meditation: serene natural or interior',
          visualLanguage: 'Active lifestyle aspiration illustration — diverse body types and ages represented, positive energy, achievement-oriented without toxic comparison',
          commercialUse: ['Fitness app hero', 'sportswear brand campaign', 'wellness platform visual', 'gym membership promo'],
          promptRules: {
            mustInclude: ['diverse body representation', 'peak activity moment with form clearly visible', 'positive aspirational energy'],
            mustAvoid: ['single thin body type exclusivity', 'pain or injury distress', 'real brand sportswear logo visible', 'toxic fitness culture messaging'],
          },
          negativePrompt: ['real sportswear brand logo', 'pain or injury framing', 'single body type exclusion', 'toxic comparison messaging', 'dark oppressive gym environment'],
        },
      },
      'Mental Health': {
        subjects: ['Meditation practice', 'therapy conversation', 'self-care morning routine', 'support network concept', 'deep breathing'],
        conceptDNA: {
          motif: ['meditation figure calm morning light', 'therapy conversation two figures warm setting', 'self-care morning routine serene', 'support network connected figures concept', 'deep breathing nature calm expansion'],
          structure: 'Human figure in calm restorative context — generous negative space, soft light, no urgency or tension in composition',
          repetition: 'Vary between solo wellness (meditation, breathing, self-care) and social support (therapy, network) per batch',
          palette: ['meditation soft lavender and warm cream', 'therapy warm amber and sage green', 'self-care morning cool sky and clean white', 'support network warm connected gold'],
          background: 'Calm serene environment — morning light, soft interior, nature element; never dark clinical or hospital context',
          visualLanguage: 'Gentle supportive wellness illustration — no stigma, no clinical coldness, warmth and hope as primary emotional register',
          commercialUse: ['Mental health app hero', 'therapy platform campaign', 'wellness brand visual', 'self-care product context'],
          promptRules: {
            mustInclude: ['calm serene atmospheric lighting', 'warm positive emotional tone', 'human dignity and agency in the figure'],
            mustAvoid: ['clinical hospital or ward context', 'stigmatizing mental illness visualization', 'crying distress as primary focus', 'medication or pill imagery'],
          },
          negativePrompt: ['clinical hospital ward', 'stigmatizing illness visual', 'crying breakdown as hero focus', 'pill or medication imagery', 'dark oppressive isolation'],
        },
      },
      'Nutrition': {
        subjects: ['Balanced meal plate', 'food pyramid visual', 'vitamin supplement concept', 'macro nutrient breakdown', 'hydration water'],
        conceptDNA: {
          motif: ['balanced meal plate colorful portions', 'food pyramid infographic concept modern', 'vitamin capsule supplement arrangement', 'macro nutrient visual breakdown concept', 'water glass hydration clean minimal'],
          structure: 'Overhead flat-lay OR infographic-style composition — clear portion visualization; conceptual subjects (pyramid, macro breakdown) use clean diagram aesthetic',
          repetition: 'Alternate between real food (plate, water) and conceptual visualization (pyramid, macro chart) per batch',
          palette: ['balanced plate fresh green-orange-protein brown', 'food pyramid primary color segments', 'vitamin warm amber gold supplement', 'hydration clean cool blue and white'],
          background: 'Clean white or minimal surface — nutrition content must read clearly; infographic concepts use white or very light background',
          visualLanguage: 'Health-positive educational illustration — science-informed but accessible, abundance and variety not deprivation; no diet culture restriction messaging',
          commercialUse: ['Nutrition app visual', 'dietitian practice brand', 'health insurance wellness content', 'food education poster'],
          promptRules: {
            mustInclude: ['clear food variety and color diversity', 'positive abundance framing', 'clean professional presentation'],
            mustAvoid: ['diet restriction or food guilt framing', 'single "superfood" brand promotion', 'clinical medical prescription look', 'real supplement brand label visible'],
          },
          negativePrompt: ['diet guilt restriction framing', 'real supplement brand label', 'clinical prescription medical style', 'single food type exclusion narrative', 'dark background for food content'],
        },
      },
      'Healthcare Workers': {
        subjects: ['Doctor with stethoscope', 'nurse with medication', 'surgeon in scrubs', 'paramedic team', 'pharmacist at counter'],
        conceptDNA: {
          motif: ['doctor stethoscope confidence portrait', 'nurse medication preparation care', 'surgeon scrubs and cap focus pre-op', 'paramedic team rapid response action', 'pharmacist counter consultation warmth'],
          structure: 'Professional portrait OR action moment — single healthcare worker fills 60% of frame; warm confident professional posture; diverse representation mandatory',
          repetition: 'Vary role AND setting per batch — clinical / action / consultation / pharmacy must rotate',
          palette: ['doctor white coat clean blue', 'nurse scrubs medical blue and warm skin', 'surgeon green scrubs sterile', 'paramedic high-vis and action', 'pharmacist pharmacy blue-white counter'],
          background: 'Professional healthcare environment implied — clinic wall, hospital corridor, pharmacy counter; never chaotic emergency without professional calm',
          visualLanguage: 'Healthcare professional dignity and trust illustration — competent, compassionate, diverse gender and ethnicity representation, non-specific hospital (no real brand)',
          commercialUse: ['Hospital brand campaign', 'health insurance hero', 'medical staffing platform', 'healthcare app visual'],
          promptRules: {
            mustInclude: ['diverse gender and ethnicity representation', 'professional confident posture', 'appropriate uniform and equipment for role'],
            mustAvoid: ['real hospital brand or logo in background', 'single gender or ethnicity all healthcare workers', 'patient in distress in background', 'blood or gore'],
          },
          negativePrompt: ['real hospital brand signage', 'single ethnicity healthcare staff', 'patient distress in background', 'blood or gore', 'stereotyped gender role assignment'],
        },
      },
    },
  },
  'Holidays and Celebrations': {
    visualDNA: 'Festive flat illustration; celebratory energy with rich thematic iconography.',
    commercialDNA: 'Seasonal retail promotion, greeting cards, gift packaging, event invitation, social campaign.',
    compositionDNA: 'Focus Symbol 45%, Festive Atmosphere 35%, Negative Space 20%.',
    qualityDNA: 'Vibrant festive color harmony, decorative detail crispness, warm lighting ambience, joyful emotional resonance.',
    diversityEngine: {
      macroConcepts: [
        'Gift wrapping preparation', 'holiday family feast table', 'festive tree decorating',
        'midnight countdown', 'winter snow fun', 'holiday greeting writing',
      ],
      commercialScenes: [
        'E-commerce seasonal banner', 'printed greeting card', 'gift wrapping box tile', 'social media holiday campaign',
      ],
      microVariations: {
        lighting: ['Fireplace golden glow', 'sparkling fairy lights', 'midnight party glow', 'sunny holiday daylight'],
        palette: ['Traditional red/green/gold', 'modern pastel', 'elegant navy/gold'],
      },
    },
    subcategories: {
      'Christmas & Winter': {
        subjects: ['Decorated Christmas tree', 'Santa Claus figure', 'reindeer sleigh', 'snow globe', 'gift under tree', 'holiday stocking'],
        conceptDNA: {
          motif: ['decorated Christmas tree warm light glow', 'Santa Claus friendly portrait', 'reindeer sleigh silhouette against moon', 'snow globe detailed world inside', 'gift stack under tree warm', 'holiday stocking fireplace cozy'],
          structure: 'Single iconic holiday subject as hero — warm centered composition with generous negative space for greeting card/banner use',
          repetition: 'Vary subject type per batch — tree / character / scene / object; avoid two Santa or two tree subjects consecutively',
          palette: ['Christmas tree deep green and warm gold', 'Santa red and white warm', 'reindeer night navy and moon silver', 'snow globe clear and inner warm scene', 'gift tower jewel red-green-gold'],
          background: 'Warm holiday interior implied — fireplace glow, soft snow, night sky; never cold or cheerless',
          visualLanguage: 'Traditional Christmas commercial illustration — warm, cozy, inclusive (no religion-specific beyond secular Santa/tree convention), greeting-card quality',
          commercialUse: ['Holiday greeting card', 'retail Christmas campaign', 'seasonal app decoration', 'gift product context'],
          promptRules: {
            mustInclude: ['warm cozy lighting (candle, fireplace, or star glow)', 'traditional holiday icon readable at small size', 'cheerful celebratory energy'],
            mustAvoid: ['explicitly religious nativity scene', 'cold dark cheerless winter', 'real brand product as gift', 'copyright character on tree ornament'],
          },
          negativePrompt: ['explicit nativity religious scene', 'dark cold cheerless winter', 'real brand logo on gift', 'copyright character ornament', 'sad lonely holiday framing'],
        },
      },
      'New Year': {
        subjects: ['Fireworks night sky', 'countdown clock 12:00', 'champagne toast', 'resolution journal', 'confetti explosion'],
        conceptDNA: {
          motif: ['fireworks burst color night city skyline', 'countdown clock midnight 12:00 moment', 'champagne glasses clink toast celebration', 'resolution journal fresh page new year', 'confetti explosion burst celebration top'],
          structure: 'Dynamic celebratory composition — fireworks use full-bleed with burst radiating from center; toast and confetti use hero moment close-up',
          repetition: 'Vary between outdoor spectacle (fireworks, skyline) and intimate celebration (toast, confetti, journal)',
          palette: ['fireworks night black with vivid burst color', 'countdown gold and navy midnight', 'champagne gold and bubble cream', 'confetti rainbow multi-color burst', 'resolution journal clean white fresh start'],
          background: 'Night sky for fireworks; intimate warm setting for celebration subjects',
          visualLanguage: 'Universal celebration aesthetic — culturally neutral (no specific country flag), universal New Year energy, optimism and fresh start tone',
          commercialUse: ['New Year campaign', 'party venue promo', 'celebration brand visual', 'fresh start motivation content'],
          promptRules: {
            mustInclude: ['celebratory joyful energy', 'universal culturally neutral imagery', 'new year visual icon (midnight / fireworks / toast)'],
            mustAvoid: ['specific country flag on fireworks', 'alcohol in context that could suggest minors', 'resolution as weight loss / diet shame'],
          },
          negativePrompt: ['specific country flag branding', 'diet or weight loss resolution framing', 'minors near alcohol', 'dark sad lonely new year'],
        },
      },
      'Easter': {
        subjects: ['Decorated Easter eggs', 'Easter bunny', 'spring floral basket', 'hatching chick', 'egg hunt garden'],
        conceptDNA: {
          motif: ['decorated Easter eggs colorful pattern arrangement', 'Easter bunny friendly character portrait', 'spring basket pastel floral arrangement', 'hatching chick shell crack moment', 'egg hunt garden spring morning'],
          structure: 'Spring pastel flat-lay OR character portrait — eggs use overhead arrangement; bunny uses friendly portrait; garden scene uses wide establishing',
          repetition: 'Vary between character (bunny, chick) and object/scene (eggs, basket, garden) per batch',
          palette: ['Easter egg pastel rainbow pattern', 'bunny warm white and spring green', 'spring basket lavender and yellow', 'hatching chick yellow and shell cream', 'egg hunt garden morning green and color pop'],
          background: 'Spring garden environment or clean pastel background — fresh grass, flowers, morning light',
          visualLanguage: 'Spring celebration commercial illustration — secular Easter (bunny/egg/chick focus), cheerful and child-friendly, nature renewal tone',
          commercialUse: ['Easter seasonal retail campaign', 'spring greeting card', 'children activity promo', 'seasonal bakery packaging'],
          promptRules: {
            mustInclude: ['pastel spring color palette', 'cheerful child-friendly character or object', 'spring renewal energy'],
            mustAvoid: ['explicitly religious crucifixion or resurrection scene', 'dark horror Easter', 'single-color dull eggs'],
          },
          negativePrompt: ['explicit religious crucifixion scene', 'dark horror Easter imagery', 'dull monochrome palette', 'Halloween tone crossover'],
        },
      },
      'Halloween': {
        subjects: ['Glowing jack-o-lantern', 'haunted house moonlit', 'witch silhouette', 'friendly ghost', 'trick-or-treat candy bowl'],
        conceptDNA: {
          motif: ['glowing jack-o-lantern carved face orange', 'haunted house moonlit hill silhouette', 'witch silhouette broom flying moon', 'friendly ghost cartoon cute', 'trick-or-treat candy bowl overflowing'],
          structure: 'Single Halloween icon as hero — jack-o-lantern uses close-up warm glow; haunted house uses wide silhouette; ghost and witch use full-body character shot',
          repetition: 'Vary between spooky atmospheric (haunted house, witch) and friendly/fun (ghost, candy, pumpkin) per batch; avoid all-horror or all-cute without contrast',
          palette: ['jack-o-lantern orange and candlelit glow', 'haunted house navy and silver moon', 'witch purple and dark teal', 'friendly ghost white and warm glow', 'candy bowl jewel color assortment'],
          background: 'Night sky with moon, misty purple-dark, or warm candlelit — seasonal atmospheric context required',
          visualLanguage: 'Halloween commercial illustration — mix of fun/cute (ghost, candy) and atmospheric spooky (haunted house, witch); no graphic gore or real horror',
          commercialUse: ['Halloween seasonal retail', 'party invitation visual', 'children costume promo', 'seasonal social media content'],
          promptRules: {
            mustInclude: ['Halloween seasonal color (orange, purple, or black and moon)', 'clear iconic Halloween subject', 'either fun or atmospheric spooky tone (not graphic horror)'],
            mustAvoid: ['graphic gore, blood, or body horror', 'cultural stereotype witch design (specific ethnicity)', 'real horror IP character likeness'],
          },
          negativePrompt: ['graphic blood or gore', 'body horror dismemberment', 'specific ethnic stereotype in witch design', 'real horror IP character', 'jump-scare photorealistic face'],
        },
      },
      'Birthday & Party': {
        subjects: ['Birthday cake with candles', 'balloon arch', 'party hats', 'gift tower', 'confetti burst celebration'],
        conceptDNA: {
          motif: ['birthday cake candles glow celebration close-up', 'balloon arch color arrangement gateway', 'party hats flat-lay color arrangement', 'gift tower stack bow ribbon', 'confetti burst explosion overhead'],
          structure: 'Celebratory icon as hero — cake uses 3/4 hero angle showing height; balloon arch uses wide establishing; confetti uses overhead burst',
          repetition: 'Vary between food (cake) / décor (balloon, confetti) / object (hats, gifts) per batch',
          palette: ['birthday cake warm pastel and candle gold', 'balloon arch rainbow or theme color', 'party hats festive primary colors', 'gift stack jewel tones ribbon gold', 'confetti rainbow burst multi-color'],
          background: 'Party environment — soft blurred streamers, clean pastel backdrop, or outdoor garden party; never dark or gloomy',
          visualLanguage: 'Universal birthday celebration — culturally neutral, all ages representable, joy and surprise as primary emotional register',
          commercialUse: ['Birthday greeting card', 'party supply brand', 'celebration venue promo', 'event planning visual'],
          promptRules: {
            mustInclude: ['joyful celebratory color and energy', 'clear party or birthday icon', 'universal cultural neutrality'],
            mustAvoid: ['specific age number on cake (unless intentional)', 'alcohol in context suggesting minors', 'dark or sad birthday framing'],
          },
          negativePrompt: ['sad lonely party', 'alcohol near minors implied', 'dark gloomy party', 'single specific cultural celebration only', 'overly busy cluttered scene'],
        },
      },
      'Wedding': {
        subjects: ['Wedding couple silhouette', 'ring exchange concept', 'bouquet arrangement', 'tiered cake', 'ceremony flower arch'],
        conceptDNA: {
          motif: ['wedding couple silhouette sunset backlight', 'ring exchange hands close-up detail', 'bridal bouquet arrangement hero', 'tiered wedding cake elegant close-up', 'ceremony flower arch doorway framing'],
          structure: 'Romantic hero composition — couple silhouette uses wide romantic backlight; ring and bouquet use extreme close-up detail; arch uses centered symmetry',
          repetition: 'Vary between couple moment (silhouette, exchange) and decorative object (bouquet, cake, arch) per batch',
          palette: ['wedding couple golden sunset backlight', 'ring exchange warm champagne gold', 'bouquet white and blush pink', 'wedding cake ivory and gold tier', 'flower arch white bloom and greenery'],
          background: 'Romantic venue environment — golden hour outdoor, garden, elegant interior; no specific religious building',
          visualLanguage: 'Inclusive romantic wedding illustration — gender-neutral or diverse couple representation, universal love celebration, no specific religious or cultural exclusivity',
          commercialUse: ['Wedding venue promo', 'bridal brand campaign', 'wedding planning app hero', 'greeting card'],
          promptRules: {
            mustInclude: ['romantic warm lighting', 'elegant refined aesthetic', 'inclusive couple representation (not exclusively heterosexual or single ethnicity)'],
            mustAvoid: ['specific religious ceremony ritual', 'single cultural dress code only', 'real designer brand on dress visible'],
          },
          negativePrompt: ['specific religious ceremony close-up', 'single ethnicity exclusion', 'real fashion brand label on dress', 'cold harsh lighting', 'cliché stock photo pose'],
        },
      },
    },
  },
  'Illustrations and Clipart': {
    visualDNA: 'Versatile commercial illustration; high graphic clarity, clean outlines, maximum scalability.',
    commercialDNA: 'Microstock clipart asset, UI graphic element, sticker pack, surface pattern design.',
    compositionDNA: 'Focus Element 60%, Negative Space 40% (Isolated focus).',
    qualityDNA: 'Pristine vector edge isolation, perfectly balanced color fills, clean modular shapes suitable for cutout.',
    diversityEngine: {
      macroConcepts: [
        'Character emotion variations', 'mascot performing action', 'seamless pattern repetition',
        'UI icon system', 'modular infographic breakdown',
      ],
      commercialScenes: [
        'Microstock asset pack grid', 'mobile app splash hero', 'surface pattern tile', 'web design sticker',
      ],
      microVariations: {
        format: ['Isolated hero', '3-pack set', '6-pack grid system'],
        style: ['Flat color', 'line art filled', 'subtle duotone gradient'],
      },
    },
    subcategories: {
      'Character Design': {
        subjects: ['Office worker cartoon', 'fantasy adventure hero', 'cute animal person', 'robot character', 'chef mascot', 'student'],
        conceptDNA: {
          motif: ['office worker mid-task dynamic pose', 'fantasy hero dramatic stance with weapon or power', 'cute animal-person hybrid expressive full-body', 'robot character geometric form expressive panel display', 'chef mascot action cooking gesture', 'student backpack books learning pose'],
          structure: 'Full-body character portrait — character fills 70% of canvas height, generous negative space above and to sides for text overlay use cases; turnaround-style neutral background',
          repetition: 'Vary character archetype per batch — professional / fantasy / animal-person / mechanical / culinary / academic must not repeat consecutively; vary pose energy (calm portrait vs dynamic action)',
          palette: ['office worker professional navy and warm neutral', 'fantasy hero bold jewel tones and metallic', 'animal-person cute pastel and warm', 'robot character cool steel blue and neon accent', 'chef mascot white and culinary warm', 'student casual warm and energetic'],
          background: 'Solid flat color or simple gradient — character is the hero; background should not compete; transparent PNG feel even when background exists',
          visualLanguage: 'Commercial character design quality — expressive clear silhouette readable at small size, consistent proportions, on-model professional finish; no uncanny valley or extreme stylization',
          commercialUse: ['App mascot or guide character', 'explainer video character', 'children education character', 'brand ambassador illustration'],
          promptRules: {
            mustInclude: ['clear readable silhouette at small size', 'consistent character proportions throughout body', 'expressive face and posture that communicates personality'],
            mustAvoid: ['uncanny valley semi-realistic face', 'multiple characters without clear lead', 'culturally stereotyped design (tokenism)', 'existing IP character likeness'],
          },
          negativePrompt: ['uncanny valley realism', 'existing IP character likeness', 'culturally stereotyped design', 'multiple competing lead characters', 'missing hands or broken anatomy', 'heavy drop shadow on character'],
        },
      },
      'Mascot': {
        subjects: ['Animal brand mascot', 'food product mascot', 'tech robot mascot', 'sports mascot', 'educational ambassador'],
        // Style DNA: "Bold Mascot Vector" — diturunkan dari referensi 3 gambar
        // (kura-kura surfing, mangkuk seafood, babi hutan naik chopper). Cel-shaded
        // sticker-style mascot illustration, khas microstock mascot/logo asset pack.
        conceptDNA: {
          motif: [
            'animal character mid-action pose with dynamic supporting element (wave, steam, motion flame)',
            'character wearing thematic accessory that signals activity or persona',
            'single hero subject with one small orbiting action detail (splash, spark, smoke wisp)',
            'diagonal dynamic pose implying movement or momentum',
            'character direct-to-camera expressive gesture (thumbs up, shaka sign, wink, smirk)',
          ],
          structure: 'Single centered hero character/object, self-contained silhouette, generous even negative space around all edges for clean die-cut isolation',
          repetition: 'Vary activity/persona and supporting action-element per asset — do not repeat the same pose-plus-prop combination consecutively across a batch',
          palette: ['saturated primary triad with black outline', 'warm earth tone with one bright accent', 'cool marine palette with red/orange accent pop', 'limited 3-4 color flat block palette'],
          background: 'Fully transparent or flat solid isolated background — zero environment/scene, character is the entire asset',
          visualLanguage: 'Bold uniform-weight black outline (heavy contour, thin consistent inner linework), hard-edge cel/flat shading with 2-3 tones per surface (base + shadow + small glossy highlight ellipse), no smooth gradients, no painterly blending, cartoon-stylized anatomy (exaggerated but readable), crisp closed vector shapes only',
          commercialUse: ['Brand mascot logo', 'sticker pack / die-cut sticker asset', 'merchandise print (t-shirt, mug, patch)', 'app icon or avatar character', 'packaging character branding'],
          promptRules: {
            mustInclude: ['thick uniform black outline around every shape', 'flat cel-shading with hard shadow edges, no smooth gradient', 'small glossy highlight ellipse for shine', 'fully isolated on transparent or flat solid background', 'dynamic diagonal action pose', 'limited saturated color palette (3-5 colors)'],
            mustAvoid: ['smooth photographic gradient shading', 'realistic fur/skin texture rendering', 'soft or variable-width outline', 'busy detailed background scene', 'muted or desaturated color palette', 'static straight-on symmetrical pose'],
          },
          negativePrompt: ['soft gradient shading', 'photorealistic texture', 'thin or inconsistent outline', 'no outline / outline-less', 'cluttered background scene', 'washed-out muted colors', 'realistic anatomy proportions', 'blurry edges', 'painterly brush texture', 'static symmetrical frontal pose'],
        },
      },
      'Seamless Pattern': {
        subjects: ['Tileable repeat motif grid', 'edge-matched seamless tile', 'wrapping paper repeat design', 'wallpaper surface repeat', 'digital background tile'],
        // Style DNA: fokus utama tipe ini adalah KUALITAS TILE-nya sendiri (edge-match
        // sempurna), motif di dalamnya boleh apa saja — beda dari 4 tipe pattern lain
        // di bawah yang fokus pada MOTIF, bukan mekanisme repeat-nya.
        conceptDNA: {
          motif: ['half-drop brick offset repeat', 'grid-aligned block repeat', 'mirrored kaleidoscope repeat', 'scatter/toss random-fill repeat', 'diagonal ogee repeat'],
          structure: 'Perfectly edge-matched tileable unit — every element that touches one edge must continue seamlessly on the opposite edge, no visible seam line when tiled edge-to-edge',
          repetition: 'This IS the core requirement, not optional — vary the repeat mechanism (brick/grid/mirror/scatter/diagonal) per asset, not just the motif inside it',
          palette: ['two-tone contrast repeat', 'triadic harmonious repeat', 'monochrome tonal repeat', 'multi-color playful repeat (4-5 colors max)'],
          background: 'Background fill is part of the tile itself — must also repeat seamlessly, no gradient that would create visible banding across tile boundaries',
          visualLanguage: 'Flat vector surface-pattern-design technique, consistent element scale and spacing throughout the tile, no single dominant focal point (unlike hero illustration) — visual weight distributed evenly',
          commercialUse: ['Textile and fabric print', 'wallpaper and wall covering', 'gift wrap and packaging surface', 'digital wallpaper and social media background', 'stationery and notebook cover'],
          promptRules: {
            mustInclude: ['perfectly seamless tileable edges, no visible seam when repeated', 'evenly distributed visual weight across the tile, no single focal hero element', 'consistent element scale and spacing'],
            mustAvoid: ['visible seam line or edge mismatch', 'single dominant focal object breaking the repeat rhythm', 'gradient background that bands when tiled', 'inconsistent element density across the tile'],
          },
          negativePrompt: ['visible tile seam', 'edge mismatch', 'non-repeating focal composition', 'gradient banding across tile edge', 'uneven element density', 'cropped element at tile border'],
        },
      },
      'Geometric Pattern': {
        subjects: ['Interlocking polygon repeat', 'chevron zigzag repeat', 'hexagon honeycomb grid', 'concentric circle rings', 'triangle mosaic tessellation'],
        conceptDNA: {
          motif: ['isometric cube tessellation', 'radial mandala symmetry grid', 'chevron/herringbone zigzag', 'hexagon honeycomb lattice', 'overlapping circle Venn-style grid'],
          structure: 'Rigid mathematical grid or precise radial symmetry — every angle and spacing is deliberate and measurable, no organic or hand-drawn curves',
          repetition: 'Seamless tileable by default — rotate the underlying geometric system (grid / radial / tessellation / diagonal) across a batch so consecutive assets do not share the same base structure',
          palette: ['high-contrast duotone', 'flat pastel geometric', 'monochrome line-art on white', 'bold primary color-block'],
          background: 'Solid flat color or the geometric pattern itself fills the full frame — never a soft gradient or scene backdrop',
          visualLanguage: 'Hard-edge vector precision, uniform stroke or fill weight throughout, mathematically consistent spacing and alignment, no imperfection or wobble',
          commercialUse: ['Textile and surface print', 'packaging pattern wrap', 'web background and app UI backdrop', 'presentation and branding backdrop'],
          promptRules: {
            mustInclude: ['mathematically precise, consistent angles and spacing', 'clean hard-edge vector shapes', 'seamless tileable structure'],
            mustAvoid: ['hand-drawn wobble or imperfection', 'organic curves mixed into the geometric system', 'inconsistent spacing or misaligned grid', 'drop shadow or bevel effect'],
          },
          negativePrompt: ['hand-drawn wobble', 'misaligned grid', 'inconsistent spacing', 'organic curve mixed with hard geometry', 'drop shadow', 'bevel effect', 'gradient fill on shapes'],
        },
      },
      'Botanical Pattern': {
        subjects: ['Detailed leaf and fern repeat', 'monstera and tropical foliage layout', 'herbarium botanical illustration repeat', 'eucalyptus branch scatter', 'succulent and cactus arrangement'],
        conceptDNA: {
          motif: ['scientific herbarium-style leaf illustration', 'layered overlapping foliage silhouette', 'single-stem botanical study repeat', 'tropical leaf scatter with varied scale', 'branch-and-leaf trailing vine layout'],
          structure: 'Naturalistic asymmetric arrangement of leaf/plant forms — density and overlap should feel organic, not gridded, even within a seamless repeat',
          repetition: 'Seamless tileable — vary plant species/leaf shape selection and layout density (sparse botanical study vs dense foliage layering) across a batch',
          palette: ['botanical green tonal (sage, forest, olive)', 'monochrome line-art illustration on cream', 'muted earthy naturalist palette', 'high-contrast dark foliage on light background'],
          background: 'Solid neutral (cream, white, deep green) or the foliage fully fills the frame — never a photographic scene backdrop',
          visualLanguage: 'Botanical-illustration linework quality — fine detailed vein and leaf-edge accuracy, naturalist scientific-illustration influence, NOT generic clipart-simple leaf shapes',
          commercialUse: ['Textile and fabric print', 'wallpaper and home decor', 'stationery and greeting card', 'packaging for natural/wellness products'],
          promptRules: {
            mustInclude: ['botanically accurate leaf/plant silhouette with fine detail', 'naturalistic asymmetric arrangement', 'seamless tileable structure'],
            mustAvoid: ['generic oversimplified clipart leaf shapes', 'rigid grid arrangement that looks unnatural', 'cartoonish plant proportions', 'photorealistic 3D rendering'],
          },
          negativePrompt: ['generic clipart leaf', 'rigid unnatural grid arrangement', 'cartoonish proportions', 'photorealistic rendering', 'visible tile seam', 'oversimplified silhouette lacking detail'],
        },
      },
      'Floral Pattern': {
        subjects: ['Ditsy small floral repeat', 'large-scale bloom statement print', 'wildflower meadow scatter', 'rose and peony bouquet repeat', 'watercolor floral wreath layout'],
        conceptDNA: {
          motif: ['small-scale ditsy scattered bloom', 'large statement flower with bold scale contrast', 'wreath/bouquet clustered arrangement', 'trailing vine floral border', 'meadow multi-species wildflower scatter'],
          structure: 'Flower-forward composition where blossoms (not leaves) are the dominant visual element — layered petals, buds, and stems arranged for romantic/decorative appeal',
          repetition: 'Seamless tileable — vary flower scale (ditsy small vs statement large) and arrangement style (scattered vs bouquet vs trailing) across a batch',
          palette: ['soft pastel romantic', 'saturated bold statement floral', 'monochrome botanical line on solid ground', 'moody dark floral (deep jewel tones)'],
          background: 'Solid color ground (white, blush, deep navy, black) that flatters the floral palette — never busy or photographic',
          visualLanguage: 'Decorative illustrative flower rendering — can range from flat vector to soft watercolor-style fill, but stays consistently one technique throughout the whole pattern, clearly floral (not abstracted into pure shape)',
          commercialUse: ['Textile and fashion print', 'wallpaper and home decor', 'stationery, greeting card, gift wrap', 'wedding and event branding'],
          promptRules: {
            mustInclude: ['clearly recognizable flower forms as the dominant motif', 'consistent rendering technique throughout (flat vector OR watercolor-style, not mixed)', 'seamless tileable structure'],
            mustAvoid: ['leaves/foliage dominating over flowers', 'mixed rendering techniques within one pattern', 'muddy or undefined flower shapes', 'photorealistic flower photography look'],
          },
          negativePrompt: ['undefined muddy flower shapes', 'mixed rendering technique', 'foliage dominating over blooms', 'photorealistic photography look', 'visible tile seam', 'harsh unnatural color banding'],
        },
      },
      'Abstract Pattern': {
        subjects: ['Fluid organic blob repeat', 'brushstroke and ink texture repeat', 'wavy line and ripple repeat', 'freeform blotch and splatter layout', 'abstract dot and shape scatter'],
        conceptDNA: {
          motif: ['organic fluid blob cluster', 'gestural brushstroke scatter', 'wavy concentric ripple field', 'freeform ink-blot texture', 'irregular dot and confetti-shape scatter'],
          structure: 'Non-representational, free-flowing composition — no recognizable object, letter, or figure, but visual rhythm and balance must still read as intentional, not random noise',
          repetition: 'Seamless tileable — vary the abstract mechanism (blob / brushstroke / ripple / blot / scatter) across a batch rather than reusing the same freeform language repeatedly',
          palette: ['warm sunset gradient-free blend', 'cool modern minimal duotone', 'vibrant maximalist multi-color', 'monochrome ink-wash tonal'],
          background: 'Solid flat color as the ground, abstract forms as the repeating layer — no photographic texture, no realistic material simulation',
          visualLanguage: 'Painterly or flat-vector organic mark-making, intentional irregularity (not mathematical precision — that belongs to Geometric Pattern instead), confident and controlled even when loose',
          commercialUse: ['Textile and fashion print', 'digital wallpaper and app background', 'packaging and branding surface', 'art print and wall decor'],
          promptRules: {
            mustInclude: ['clearly non-representational abstract forms', 'intentional visual rhythm and balance', 'seamless tileable structure'],
            mustAvoid: ['accidental recognizable objects, faces, or letterforms', 'rigid mathematical grid (that is Geometric Pattern, not this)', 'muddy undifferentiated color mixing', 'photorealistic texture simulation'],
          },
          negativePrompt: ['accidental recognizable object or face', 'rigid geometric grid', 'muddy color mixing', 'photorealistic texture', 'visible tile seam', 'chaotic uncontrolled noise with no rhythm'],
        },
      },
      'Textile Pattern': {
        subjects: ['Woven plaid and tartan repeat', 'ikat weave-inspired print', 'batik wax-resist motif repeat', 'paisley textile print', 'houndstooth and herringbone weave'],
        conceptDNA: {
          motif: ['plaid/tartan woven grid', 'paisley teardrop repeat', 'ikat-inspired blurred-edge weave motif', 'batik wax-resist organic motif', 'houndstooth/herringbone weave simulation'],
          structure: 'Pattern references or simulates an actual textile weaving/dyeing technique (weave, resist-dye, jacquard-style motif) — the design logic should feel rooted in fabric-making tradition, not purely graphic invention',
          repetition: 'Seamless tileable — rotate which textile technique is referenced (weave / paisley / ikat / batik / houndstooth) across a batch, keep culturally-specific motifs (batik, ikat) respectfully accurate rather than generic approximation',
          palette: ['classic tartan multi-color plaid', 'earthy natural-dye tonal (indigo, rust, ochre)', 'jewel-tone paisley rich palette', 'monochrome woven texture simulation'],
          background: 'The weave/technique simulation fills the entire frame as the background itself — no separate background layer',
          visualLanguage: 'Simulated fabric-weave or dye-resist texture rendered in flat vector or subtle textured vector (visible "thread" or "wax-crackle" quality where authentic to the technique), avoids flattening every technique into identical flat-fill look',
          commercialUse: ['Apparel and fashion textile print', 'home textile (upholstery, curtains, bedding)', 'accessory print (scarves, ties, bags)', 'surface pattern licensing for fabric houses'],
          promptRules: {
            mustInclude: ['visual reference to an authentic textile technique (weave, resist-dye, jacquard)', 'culturally accurate motif rendering when referencing a named tradition (batik, ikat, tartan)', 'seamless tileable structure'],
            mustAvoid: ['generic flat graphic pattern with no textile-technique reference', 'inaccurate or stereotyped rendering of culturally-specific motifs (batik, ikat)', 'plastic-looking flat fill with no woven/dyed texture cue'],
          },
          negativePrompt: ['generic flat pattern with no textile reference', 'inaccurate culturally-specific motif rendering', 'plastic flat-fill look lacking texture cue', 'visible tile seam', 'photorealistic fabric photography look'],
        },
      },
      'Icon Set': {
        subjects: ['UI navigation icons', 'social media icons', 'business icons', 'weather icons', 'food icons', 'travel icons'],
        genericObjectTags: ['softwareUI'],
        conceptDNA: {
          motif: ['UI navigation icon set grid layout', 'social media concept icon platform-agnostic', 'business icon set professional category', 'weather icon set sun rain cloud snow', 'food icon set category symbols', 'travel icon set destination luggage map'],
          structure: 'Icon sheet grid OR single featured icon — grid uses even spacing with 4-24 icons at consistent size; single icon fills canvas with generous padding at all sides',
          repetition: 'Never repeat same icon theme twice — vary category strongly per batch; a weather and a business icon set are better than two business sets',
          palette: ['icon set monochrome single-color system', 'icon set lineal color limited 2-3 accent hues', 'icon set flat fill with consistent palette'],
          background: 'Pure white or transparent — icons must be immediately usable without background removal; zero decorative background',
          visualLanguage: 'Professional system icon design quality — optically balanced at multiple sizes (16px through 128px), consistent visual weight across all icons in set, pixel-crisp edges implied',
          commercialUse: ['UI kit icon library', 'app onboarding icon set', 'presentation template icon pack', 'website icon system'],
          promptRules: {
            mustInclude: ['consistent visual weight and stroke across entire set', 'clear immediately-recognizable concept per icon', 'clean white or transparent background'],
            mustAvoid: ['recognizable real app or platform logo clone', 'inconsistent style mix within one set (some flat, some outline)', 'complex scene masquerading as icon', 'text labels on the icons'],
          },
          negativePrompt: ['real platform logo clone', 'inconsistent style within set', 'complex scene too detailed for icon', 'text label on icon', 'drop shadow or glow effect on icon', 'colored background behind icon'],
        },
      },
      'Infographic Elements': {
        subjects: ['Timeline step element', 'process icon', 'comparison bar graphic', 'stat callout badge', 'location map pin'],
        conceptDNA: {
          motif: ['timeline step numbered sequence arrow', 'process flow icon step-to-step arrow', 'comparison bar chart element side-by-side', 'stat callout badge number highlight bubble', 'location map pin drop icon clean'],
          structure: 'Single infographic element OR small grouped set (2-5 elements) — designed as modular component for use within larger infographic layouts; clear visual hierarchy',
          repetition: 'Vary element type per batch — timeline / process / comparison / callout / map element should rotate; same element type twice is low value for buyers',
          palette: ['infographic element brand-neutral blue and white', 'process flow green progress to completion', 'stat callout bold accent color highlight', 'timeline neutral grey and accent step color'],
          background: 'White or transparent — infographic elements must be fully composable; isolated element on white for maximum versatility',
          visualLanguage: 'Professional presentation design quality — clean sharp vectors, flat 2D only, typography-compatible proportions, suitable for PowerPoint / Keynote / Figma use',
          commercialUse: ['Presentation template component', 'report infographic building block', 'explainer video graphic element', 'data visualization layout piece'],
          promptRules: {
            mustInclude: ['clean isolated composable element', 'flat 2D vector quality', 'clear function implied by visual form (arrow = direction, badge = callout, bar = comparison)'],
            mustAvoid: ['3D bevel or extrusion effect', 'photorealistic rendering', 'complex scene rather than isolated element', 'illegible text placeholder at standard preview size'],
          },
          negativePrompt: ['3D bevel extrusion', 'photorealistic rendering', 'complex scene not isolated element', 'drop shadow or glow', 'real brand color system', 'cluttered non-modular composition'],
        },
      },
    },
  },
  'Industrial': {
    visualDNA: 'Bold technical flat illustration; structural authenticity with industrial precision.',
    commercialDNA: 'B2B marketing, manufacturing website, engineering brochure, industrial safety poster.',
    compositionDNA: 'Focus Equipment/Facility 55%, Industrial Context 30%, Sky/Space 15%.',
    qualityDNA: 'Clean mechanical structural lines, safety-compliant PPE rendering, bold industrial contrast, metallic texture suggestion.',
    diversityEngine: {
      macroConcepts: [
        'Automated robotic manufacturing', 'heavy civil excavation', 'safety compliance inspection',
        'solar farm array installation', 'logistics warehouse dispatch',
      ],
      commercialScenes: [
        'B2B industrial website hero', 'safety compliance poster', 'pitch deck manufacturing slide', 'machinery product brochure',
      ],
      microVariations: {
        lighting: ['Daytime operation', 'night shift glow', 'dawn startup'],
        ppe: ['Hard hat', 'safety vest', 'protective goggles', 'full safety gear'],
      },
    },
    subcategories: {
      'Manufacturing': { subjects: ['Assembly line concept', 'robotic arm welding', 'quality control inspection', 'CNC precision machine', 'conveyor belt'] },
      'Construction': { subjects: ['Building under construction', 'tower crane lifting', 'construction worker team', 'architectural blueprint', 'excavator'] },
      'Energy & Power': { subjects: ['Solar panel farm aerial', 'wind turbine array', 'power station cooling towers', 'smart grid', 'hydroelectric dam'] },
      'Mining': { subjects: ['Underground tunnel concept', 'mining excavator', 'mineral extraction', 'open-cut mine', 'ore processing'] },
      'Logistics & Warehouse': { subjects: ['Warehouse inventory shelf', 'forklift pallet operation', 'package sorting conveyor', 'shipping dispatch dock'], genericObjectTags: ['vehicle'] },
    },
  },
  'Landscapes': {
    visualDNA: 'Atmospheric scenic flat illustration; depth through layered landscape composition.',
    commercialDNA: 'Travel marketing, outdoor brand billboard, wellness background, book cover, wall art.',
    compositionDNA: 'Sky/Atmosphere 35%, Midground Landscape 40%, Foreground 25%.',
    qualityDNA: 'Distinct color depth planes (foreground/midground/background), atmospheric mist/light effects, natural horizon balance.',
    diversityEngine: {
      macroConcepts: [
        'Mountain summit hike', 'tropical beach sunset relaxation', 'vast desert dune voyage',
        'tranquil forest path stroll', 'starry night sky contemplation',
      ],
      commercialScenes: [
        'Travel agency web banner', 'outdoor gear billboard', 'wellness app background', 'book cover art',
      ],
      microVariations: {
        time: ['Dawn sunrise', 'midday clear', 'golden hour dusk', 'night sky stars'],
        season: ['Spring bloom', 'summer lush', 'autumn foliage', 'winter snow'],
      },
    },
    subcategories: {
      'Mountains & Hiking': { subjects: ['Mountain summit panoramic', 'hiking trail through forest', 'alpine lake reflection', 'rock climbing', 'mountain hut'] },
      'Beach & Ocean': { subjects: ['Tropical beach sunset', 'ocean wave pattern', 'beach umbrella chairs', 'coastal cliff view', 'surfer on wave'] },
      'Desert': { subjects: ['Sand dune landscape', 'cactus silhouette sunset', 'desert road vanishing point', 'desert oasis', 'red rock canyon'] },
      'Forest': { subjects: ['Misty morning forest path', 'sunlight shafts through canopy', 'autumn forest color', 'waterfall stream', 'bluebell forest'] },
      'Urban Skyline': { subjects: ['Generic city night skyline', 'sunset urban panorama', 'downtown silhouette', 'urban aerial view', 'rain-slick city'] },
    },
  },
  'Lifestyle': {
    visualDNA: 'Warm relatable flat illustration; everyday human life depicted with aspirational quality.',
    commercialDNA: 'Lifestyle consumer brand, app illustration, editorial article, wellness marketing, social ad.',
    compositionDNA: 'Focus Human Figure 50%, Context/Environment 35%, Negative Space 15%.',
    qualityDNA: 'Authentic human body language, warm inclusive skin tones, cozy interior/outdoor environment details.',
    diversityEngine: {
      macroConcepts: [
        'WFH morning coffee routine', 'family park picnic', 'energetic gym workout',
        'urban fashion strolling', 'backpack travel discovery', 'dinner cooking with friends',
      ],
      commercialScenes: [
        'Consumer app splash screen', 'magazine narrative illustration', 'social ad campaign', 'e-commerce lifestyle banner',
      ],
      microVariations: {
        demographics: ['Child', 'teen', 'young adult', 'parent', 'senior (rotate skin tones & gender)'],
        setting: ['Home living room', 'outdoor park', 'cozy cafe', 'gym studio'],
      },
    },
    subcategories: {
      'Family & Parenting': {
        subjects: ['Parent reading story', 'family dinner table', 'playground afternoon', 'grandparent with child', 'homework time'],
        conceptDNA: {
          motif: ['parent and child shared storybook close moment', 'family dinner table warm gathering', 'playground child joyful afternoon activity', 'grandparent grandchild quiet bonding moment', 'parent and child homework focus table'],
          structure: 'Intimate human connection scene — two or more figures, clear emotional bond as the visual anchor; faces or body language convey warmth',
          repetition: 'Vary family structure per batch — nuclear / single parent / grandparent / multigenerational; vary activity — reading / eating / playing / learning',
          palette: ['family dinner warm amber and earth', 'playground afternoon golden green outdoor', 'reading story soft lamp warm interior', 'grandparent bond gentle cream and grey', 'homework focus natural light desk warm'],
          background: 'Warm domestic environment — living room, kitchen, garden, bedroom; natural light implied; never clinical or cold',
          visualLanguage: 'Inclusive family lifestyle illustration — diverse ethnicity, diverse family structures (single parent, same-sex parents, grandparent caregiver all valid), warm and authentic emotion not posed stock',
          commercialUse: ['Family brand campaign', 'parenting app hero', 'children\'s product context', 'health insurance family visual'],
          promptRules: {
            mustInclude: ['genuine emotional connection between figures', 'diverse and inclusive family representation', 'warm domestic environment'],
            mustAvoid: ['single ethnicity family exclusivity', 'traditional nuclear family only', 'posed stiff stock photo feel', 'absent or neglectful parenting framing'],
          },
          negativePrompt: ['single ethnicity exclusive family', 'stiff posed stock photo', 'cold clinical environment', 'absent neglect framing', 'gender stereotype role assignment'],
        },
      },
      'Fitness & Sport': {
        subjects: ['Outdoor running athlete', 'gym weight training', 'yoga flow practice', 'cyclist sprint', 'swimmer stroke'],
        conceptDNA: {
          motif: ['outdoor runner trail motion-blur dynamic', 'gym weight training peak lift focus', 'yoga flow transition graceful', 'cyclist sprint aggressive lean', 'swimmer stroke water splash close-up'],
          structure: 'Athlete in peak performance moment — full body or 3/4 body in dynamic action; motion blur or dynamic angle implies speed and effort',
          repetition: 'Vary sport type AND environment per batch — outdoor / indoor / water / studio; same sport twice in batch is rejected',
          palette: ['runner outdoor fresh cool morning blue-green', 'gym steel grey and power red-orange', 'yoga calm sunrise amber and earth', 'cyclist dramatic road or mountain cool', 'swimmer turquoise water and skin warm'],
          background: 'Sport-appropriate environment — trail for runner, gym for weights, studio for yoga, road/mountain for cyclist, pool for swimmer; no generic white',
          visualLanguage: 'Active performance lifestyle illustration — diverse body types, ages, genders represented; aspirational but realistic, achievement-positive not exclusionary',
          commercialUse: ['Fitness brand campaign', 'sportswear promo', 'health app hero', 'sports event poster'],
          promptRules: {
            mustInclude: ['dynamic peak-performance action moment', 'diverse athlete representation (body type, age, ethnicity)', 'sport-appropriate environment context'],
            mustAvoid: ['real sportswear brand logo on clothing', 'single body type or ethnicity only', 'pain or injury as primary subject', 'static standing pose with no activity implied'],
          },
          negativePrompt: ['real brand logo on clothing', 'single body type exclusive', 'injury pain framing', 'static non-active pose', 'dark oppressive gym', 'generic white studio background for outdoor sport'],
        },
      },
      'Fashion': {
        subjects: ['Street style outfit', 'designer dress showcase', 'seasonal lookbook', 'accessories flat lay', 'streetwear concept'],
        conceptDNA: {
          motif: ['street style full-body outfit editorial angle', 'designer dress flow movement editorial', 'seasonal lookbook styled layered outfit', 'accessories flat-lay organized hero', 'streetwear concept oversized bold graphic'],
          structure: 'Full-body fashion editorial OR flat-lay — figure shots use editorial angle (slight low angle, confident framing); flat-lay uses overhead organized composition',
          repetition: 'Vary fashion register per batch — street / formal / seasonal / accessories / streetwear; vary gender presentation and body type',
          palette: ['street style urban neutral and pop accent', 'designer dress clean white or jewel editorial', 'seasonal lookbook warm or cool by season', 'accessories flat-lay neutral surface and metallic', 'streetwear bold contrast graphic black and white'],
          background: 'Urban environment or clean studio — street style uses city context; editorial dress uses minimal studio; flat-lay uses marble or concrete surface',
          visualLanguage: 'Fashion editorial illustration quality — clean confident styling, no real brand logo visible on garments, diverse model representation across gender and body type',
          commercialUse: ['Fashion brand social content', 'styling app hero', 'lookbook layout', 'fashion magazine editorial'],
          promptRules: {
            mustInclude: ['clear outfit as primary subject', 'editorial confident composition', 'diverse gender and body type representation'],
            mustAvoid: ['visible real brand logo on clothing or accessories', 'single body type or gender exclusively', 'objectifying or demeaning pose', 'cultural appropriation styling'],
          },
          negativePrompt: ['real brand logo on garment', 'single thin body type only', 'objectifying pose', 'cultural appropriation styling', 'generic catalog stiff pose'],
        },
      },
      'Home & Living': {
        subjects: ['Morning living room', 'home workspace setup', 'kitchen weekend breakfast', 'cozy bedroom', 'balcony garden'],
        conceptDNA: {
          motif: ['morning living room golden light streaming in', 'home workspace natural light tidy desk', 'kitchen weekend breakfast warm preparation', 'cozy bedroom soft morning light unmade warm', 'balcony garden green plants city view'],
          structure: 'Interior environment as hero — person optional and secondary to space; one-point or wide-angle perspective showing room character; natural light from window is mandatory',
          repetition: 'Vary room type and time of day per batch — living room / workspace / kitchen / bedroom / outdoor space; morning / afternoon / evening light',
          palette: ['morning living room warm cream and golden', 'workspace natural light cool white and plant green', 'breakfast kitchen warm domestic amber', 'bedroom soft linen cream and warm pillow', 'balcony green plant and city blue beyond'],
          background: 'IS the environment — the room or space IS the composition; natural light source (window or door) always implied at frame edge',
          visualLanguage: 'Interior lifestyle magazine aesthetic — aspirational but lived-in warmth, curated but not cold; cozy domestic pleasure as primary tone',
          commercialUse: ['Real estate listing hero', 'home goods product context', 'lifestyle brand campaign', 'interior design blog visual'],
          promptRules: {
            mustInclude: ['natural window light as primary light source', 'curated but warm domestic environment', 'architectural perspective showing room scale'],
            mustAvoid: ['cluttered messy room', 'visible real brand product labels', 'dark underlit gloomy space', 'sterile showroom feel with zero warmth'],
          },
          negativePrompt: ['cluttered messy room', 'visible real brand product label', 'dark gloomy underlit', 'sterile cold showroom', 'flat cartoon no-perspective illustration'],
        },
      },
      'Travel & Adventure': {
        subjects: ['Backpacker at viewpoint', 'airport departure gate', 'travel planning map', 'outdoor camping night', 'local market'],
        conceptDNA: {
          motif: ['backpacker at viewpoint dramatic panoramic', 'airport departure gate golden hour window', 'travel planning map and journal flat-lay', 'camping night starfield tent glow', 'local market color and texture immersive'],
          structure: 'Traveler in environment OR travel object flat-lay — person subjects use wide establishing with subject small against dramatic landscape; flat-lay uses overhead organized',
          repetition: 'Vary travel mode and energy per batch — adventure outdoor / urban departure / planning / nature night / market culture',
          palette: ['viewpoint golden dramatic wide sky', 'airport departure warm window light', 'map flat-lay neutral paper and highlight', 'camping night deep navy and tent warm amber', 'local market vivid saturated color harvest'],
          background: 'Environmental context IS the composition — landscape, airport terminal, market stall; environment should evoke destination feeling without specific real location',
          visualLanguage: 'Wanderlust editorial travel illustration — discovery and curiosity as primary tone, culturally respectful generic destination, no specific real landmark identifiers',
          commercialUse: ['Travel agency hero', 'travel blog editorial', 'adventure gear brand', 'booking app campaign'],
          promptRules: {
            mustInclude: ['dramatic environmental context that evokes destination feeling', 'sense of discovery and movement', 'traveler or travel object as clear subject'],
            mustAvoid: ['identifiable real location landmark (no Eiffel Tower, Burj Khalifa)', 'cultural stereotype destination', 'real airline or hotel brand visible', 'tourist cliché generic pose'],
          },
          negativePrompt: ['identifiable real landmark', 'real airline or hotel brand', 'cultural stereotype destination imagery', 'tourist cliché forced pose', 'generic white background travel graphic'],
        },
      },
    },
  },
  'Nature': {
    visualDNA: 'Detailed botanical and natural history illustration style; scientific concept with commercial appeal.',
    commercialDNA: 'Botanical art print, eco-friendly product packaging, environmental NGO banner, education poster.',
    compositionDNA: 'Focus Natural Element 60%, Natural Context 25%, Negative Space 15%.',
    qualityDNA: 'Precise botanical petal/leaf structure, organic curves, rich natural color accuracy.',
    diversityEngine: {
      macroConcepts: [
        'Botanical flower bloom study', 'seasonal tree transformation', 'dramatic weather event',
        'recycling & ocean restoration', 'mineral crystal cross-section',
      ],
      commercialScenes: [
        'Botanical art print canvas', 'organic product packaging label', 'environmental campaign banner', 'educational diagram',
      ],
      microVariations: {
        format: ['Isolated specimen study', 'overhead flat lay', 'natural environment scene'],
        style: ['Botanical illustration', 'flat vector', 'watercolor-inspired vector'],
      },
    },
    subcategories: {
      'Flowers & Plants': {
        subjects: ['Rose bouquet', 'tropical flower collection', 'wildflower meadow', 'succulent arrangement', 'sunflower field'],
        conceptDNA: {
          motif: ['rose bouquet gathered wrapped hero', 'tropical flower collection vivid overhead', 'wildflower meadow wide golden light', 'succulent arrangement geometric overhead flat-lay', 'sunflower field perspective row leading lines'],
          structure: 'Botanical hero composition — single flower or arranged collection fills 60-70% of frame; meadow/field uses wide establishing with depth cues (leading lines into distance)',
          repetition: 'Vary between single-specimen close-up, arrangement overhead, and environmental field shot per batch; vary season and color palette',
          palette: ['rose classic deep red and stem green', 'tropical flower vivid multi-color', 'wildflower meadow warm golden and pastel', 'succulent cool sage and stone grey', 'sunflower field warm deep yellow and green'],
          background: 'Soft natural bokeh or clean white for close-up; environmental context for meadow/field; flat marble or wood for arrangements',
          visualLanguage: 'Botanical illustration quality — accurate petal and leaf structure, fresh and vibrant color, commercial floristry and nature-editorial aesthetic',
          commercialUse: ['Floristry brand visual', 'botanical print art', 'beauty and cosmetic campaign context', 'spring seasonal retail'],
          promptRules: {
            mustInclude: ['botanical accuracy (petal count, leaf form true to species)', 'fresh vibrant color rendering', 'clear species type as recognizable hero'],
            mustAvoid: ['wilted or dead flower subject', 'artificial plastic flower look', 'cartoon simplified floral', 'real florist brand label visible'],
          },
          negativePrompt: ['wilted dead flower', 'artificial plastic look', 'cartoon simplified floral icon', 'real brand florist label', 'muddy color rendering', 'cluttered competing species'],
        },
      },
      'Trees & Forest': {
        subjects: ['Ancient oak tree four seasons', 'cherry blossom bloom', 'pine forest silhouette', 'mangrove roots', 'banyan tree'],
        conceptDNA: {
          motif: ['ancient oak four-season split composition', 'cherry blossom bloom branch close-up', 'pine forest silhouette layered mountain dusk', 'mangrove root system water reflection', 'banyan tree massive root curtain wide'],
          structure: 'Single tree as hero OR forest as environment — tree subjects: low angle looking up or wide profile; forest subjects: perspective path through trees with depth layers',
          repetition: 'Vary tree species AND season per batch — deciduous / conifer / tropical / seasonal bloom must rotate; same tree type twice is rejected',
          palette: ['oak four-season split warm-cool transition', 'cherry blossom pink and sky blue', 'pine forest cool mist blue-green', 'mangrove coastal warm green-teal', 'banyan warm tropical green and root brown'],
          background: 'Natural environment IS the composition — sky through canopy, water reflection, mountain behind; never isolated on white for trees',
          visualLanguage: 'Nature conservation and editorial illustration — tree as subject of reverence and scale, atmospheric light through canopy as key visual device',
          commercialUse: ['Conservation campaign hero', 'eco brand visual', 'nature editorial', 'seasonal greeting card'],
          promptRules: {
            mustInclude: ['atmospheric natural light (dappled, golden hour, or misty)', 'sense of scale and age of tree', 'species-accurate form and canopy shape'],
            mustAvoid: ['isolated tree on white background (except pure botanical study)', 'dead or dying tree as primary subject without conservation context', 'cartoon simplified tree lollipop shape'],
          },
          negativePrompt: ['isolated white background tree (non-botanical)', 'cartoon lollipop tree shape', 'dead tree without context', 'sterile flat no-atmosphere composition', 'species-inaccurate form'],
        },
      },
      'Weather & Seasons': {
        subjects: ['Dramatic thunderstorm lightning', 'double rainbow', 'heavy snowfall', 'autumn leaf fall', 'spring rain shower'],
        conceptDNA: {
          motif: ['thunderstorm lightning bolt dramatic split sky', 'double rainbow arc after storm clearing', 'heavy snowfall peaceful street night', 'autumn leaf fall golden spiral descent', 'spring rain shower fresh puddle reflection'],
          structure: 'Atmospheric phenomenon as primary subject — sky fills 50-60% of frame; ground or landscape provides scale and context; single weather moment, not collage',
          repetition: 'Vary season and weather type strongly per batch — storm / rainbow / snow / autumn / rain must rotate; two of the same season is rejected',
          palette: ['thunderstorm dark dramatic purple-grey with electric white', 'rainbow clear post-storm blue and spectrum arc', 'snowfall quiet blue-grey and white', 'autumn warm ochre orange and deep red', 'spring rain fresh green and silver'],
          background: 'IS the sky/environment — weather phenomenon fills and defines the composition; foreground landscape provides scale',
          visualLanguage: 'Nature photography editorial quality in illustration form — weather as protagonist, emotional atmospheric mood, not clinical meteorological diagram',
          commercialUse: ['Climate awareness campaign', 'seasonal content', 'weather app hero', 'nature editorial illustration'],
          promptRules: {
            mustInclude: ['atmospheric dramatic weather as clear subject', 'emotional mood appropriate to weather (dramatic for storm, peaceful for snow)', 'sense of scale (horizon, landscape, or architecture as reference)'],
            mustAvoid: ['generic cartoon sun with sunglasses', 'flat weather icon style', 'multiple weather phenomena combined unnaturally', 'climate disaster framing without context'],
          },
          negativePrompt: ['cartoon sun with sunglasses', 'flat weather icon graphic', 'multiple seasons combined in one image', 'generic clipart cloud', 'disaster panic framing without context'],
        },
      },
      'Ecology & Environment': {
        subjects: ['Renewable energy concept', 'ocean plastic cleanup', 'tree planting', 'recycling cycle', 'carbon reduction'],
        conceptDNA: {
          motif: ['renewable energy solar-wind concept hero', 'ocean plastic cleanup volunteer action', 'tree planting hands soil moment', 'recycling cycle arrows concept clean', 'carbon reduction data visualization concept'],
          structure: 'Environmental action or concept as hero — human action subjects (planting, cleanup) use documentary close-up; conceptual subjects (carbon, recycling cycle) use clean infographic-adjacent style',
          repetition: 'Vary between positive action (planting, cleanup, renewable) and conceptual visualization (recycling, carbon) per batch',
          palette: ['renewable energy clean sky blue and solar yellow', 'cleanup ocean teal and pollution contrast', 'tree planting earth brown and leaf green', 'recycling cycle clean green loop', 'carbon reduction cool blue reduction bar'],
          background: 'Environmental context for action subjects; clean white or gradient for conceptual visualization subjects',
          visualLanguage: 'Environmental optimism aesthetic — solutions and action-forward, not apocalypse-only; hope and agency as primary emotional register, diverse global human participation',
          commercialUse: ['Sustainability campaign hero', 'ESG report visual', 'environmental NGO campaign', 'green brand communication'],
          promptRules: {
            mustInclude: ['positive action-forward or solutions framing', 'diverse global human participation (not single country)', 'clear environmental subject readable at small size'],
            mustAvoid: ['doom and gloom apocalypse-only framing without solution', 'single country or culture exclusively', 'greenwashing ambiguity (generic green leaf meaning nothing)', 'pollution as hero without cleanup context'],
          },
          negativePrompt: ['apocalypse doom framing only', 'single country flag exclusive', 'generic meaningless green leaf', 'pollution disaster as only subject without hope', 'corporate greenwash vague imagery'],
        },
      },
      'Geology': {
        subjects: ['Rock formation cross-section', 'crystal specimen cluster', 'volcano cross-section', 'tectonic plates', 'geode split'],
        conceptDNA: {
          motif: ['rock strata cross-section colorful layer diagram', 'crystal cluster specimen vivid mineral detail', 'volcano cross-section magma chamber anatomy', 'tectonic plate collision concept diagram', 'geode split reveal amethyst crystal interior'],
          structure: 'Scientific specimen close-up OR cross-section diagram — specimen subjects fill 70% of frame with texture detail; cross-section subjects use clean cut-away perspective',
          repetition: 'Vary between physical specimen (crystal, geode) and conceptual cross-section (rock strata, volcano, tectonic) per batch',
          palette: ['rock strata warm earth layer spectrum', 'crystal vivid mineral spectrum (amethyst purple, quartz clear, citrine yellow)', 'volcano magma warm orange-red interior cool grey exterior', 'geode split rich purple crystal interior'],
          background: 'Dark dramatic background for specimen close-up — mineral colors need contrast; cross-section diagrams use clean white or gradient for clarity',
          visualLanguage: 'Scientific natural history museum aesthetic — accurate geological illustration, mineral beauty celebration, educational curiosity tone',
          commercialUse: ['Science museum exhibit graphic', 'geology education poster', 'mineral jewelry brand context', 'earth science editorial'],
          promptRules: {
            mustInclude: ['geological accuracy in layer or crystal form', 'dramatic mineral color and texture as visual hero', 'scientific cross-section clarity for diagram subjects'],
            mustAvoid: ['fantasy crystal with unrealistic color combinations', 'cartoon simplified rock', 'inaccurate volcanic anatomy', 'real mining company branding context'],
          },
          negativePrompt: ['fantasy unrealistic crystal color', 'cartoon simplified rock icon', 'inaccurate volcanic anatomy', 'mining brand context', 'flat no-texture mineral illustration'],
        },
      },
    },
  },
  'Objects': {
    visualDNA: 'Clean product catalog illustration; crisp studio rendering with isolated asset focus.',
    commercialDNA: 'E-commerce asset, product catalog, brand collateral, instruction visual, design resource.',
    compositionDNA: 'Focus Object 65%, Negative Space 35% (Isolated focus).',
    qualityDNA: 'Crisp studio edge definition, clean material finish (metal, plastic, wood), soft realistic ground shadow.',
    diversityEngine: {
      macroConcepts: [
        'Product studio hero shot', 'organized flat lay toolkit', 'consumer gadget display',
        'children toy collection', 'flat garment arrangement',
      ],
      commercialScenes: [
        'E-commerce product catalog shot', 'promo banner hero item', 'tech blog flat lay grid', 'user manual diagram',
      ],
      microVariations: {
        view: ['3/4 hero angle', 'top-down flat lay', 'side profile', 'front elevation'],
        setting: ['Pure white studio isolated', 'minimal drop shadow', 'contextual surface'],
      },
    },
    subcategories: {
      'Home & Furniture': { subjects: ['Modular sofa design', 'dining table with chairs', 'wall bookshelf', 'platform bed frame', 'accent armchair'] },
      'Tools & Equipment': { subjects: ['Cordless power drill', 'wrench set', 'circular saw', 'tool belt arrangement', 'tape measure', 'spirit level'] },
      'Electronics': {
        subjects: ['Generic smartphone concept', 'slim laptop open', 'wireless earbuds', 'smartwatch', 'tablet with stylus', 'camera body'],
        genericObjectTags: ['device'],
        conceptDNA: {
          motif: ['generic smartphone with abstract screen', 'open slim laptop with ambient glow', 'wireless earbuds with charging case', 'smartwatch strap detail', 'camera body with lens reflection'],
          structure: 'Single device as hero — clean product isolation, fictional abstract screen content, consistent studio lighting',
          repetition: 'Rotate device type per asset — phone / laptop / earbuds / watch / camera must not repeat consecutively',
          palette: ['modern gadget neutral', 'sleek dark metallic', 'clean product-studio light'],
          background: 'Pure white or soft gradient — product hero convention, no cluttered desk',
          visualLanguage: 'Sleek product-style flat illustration, subtle material reflection, no brand-specific geometry',
          commercialUse: ['E-commerce product catalog shot', 'tech gadget promo banner', 'user manual diagram', 'consumer device article hero'],
          promptRules: {
            mustInclude: ['generic unbranded device silhouette', 'fictional abstract screen content', 'clean product focus'],
            mustAvoid: ['recognizable real phone/laptop design', 'real manufacturer logo', 'brand-specific button layout', 'screenshot of real app'],
          },
          negativePrompt: ['real smartphone brand silhouette', 'manufacturer logo', 'distinctive trademark geometry', 'screenshot of real interface', 'product watermark'],
        },
      },
      'Toys & Games': { subjects: ['Building block tower', 'classic teddy bear', 'toy car track', 'board game concept', 'wooden educational toy'], genericObjectTags: ['vehicle'] },
      'Clothing & Fashion Objects': { subjects: ['Button-up shirt flat', 'dress silhouette', 'structured blazer', 'sneaker shoe side view', 'denim jacket'] },
    },
  },
  'People': {
    visualDNA: 'Inclusive human-centered flat illustration; dignified visual language celebrating diversity.',
    commercialDNA: 'Corporate HR page, brand marketing hero, app onboarding, community campaign, editorial art.',
    compositionDNA: 'Focus Human Figure 60%, Context/Environment 25%, Negative Space 15%.',
    qualityDNA: 'Authentic skin tone spectrum, non-stereotypical expressions & postures, respectful visual hierarchy.',
    diversityEngine: {
      macroConcepts: [
        'Professional executive presentation', 'multigenerational family gathering', 'global community collaboration',
        'active senior recreation', 'joyful children play',
      ],
      commercialScenes: [
        'Corporate HR recruitment hero', 'app onboarding splash', 'global NGO campaign banner', 'health editorial art',
      ],
      microVariations: {
        skinTone: ['Light', 'medium-light', 'medium', 'medium-dark', 'dark (rotate strictly per batch)'],
        genderAge: ['Male', 'female', 'non-binary', 'children', 'youth', 'adult', 'senior'],
      },
    },
    subcategories: {
      'Business Person': { subjects: ['Executive presentation', 'meeting handshake', 'businesswoman leadership pose', 'entrepreneur idea', 'team leader'] },
      'Family': { subjects: ['Nuclear family portrait', 'single parent with child', 'multigenerational meal', 'same-sex parents with child', 'blended family'] },
      'Diverse & Multicultural': { subjects: ['Diverse team global concept', 'celebration circle', 'community hands', 'cultural exchange scene'] },
      'Senior & Elderly': { subjects: ['Senior doing morning yoga', 'elderly couple walking', 'grandfather reading to grandchild', 'senior with smartphone'], genericObjectTags: ['device'] },
      'Children & Youth': { subjects: ['Children playing together', 'student learning moment', 'birthday celebration child', 'youth sports activity'] },
    },
  },
  'Religion and Culture': {
    visualDNA: 'Respectful cultural flat illustration; sacred subjects treated with ethnographic dignity and historical accuracy.',
    commercialDNA: 'Cultural editorial, tourism campaign, interfaith publication, educational media, international heritage awareness.',
    compositionDNA: 'Focus Cultural/Religious Element 55%, Cultural Context 30%, Negative Space 15%.',
    qualityDNA: 'Research-accurate cultural motifs, anatomically dignified human postures, traditional color harmony, clean line work.',
    diversityEngine: {
      macroConcepts: [
        'Sacred symbol presentation', 'traditional artisanal craft', 'folk dance & musical performance',
        'epic cultural myth narrative', 'quiet mindfulness meditation', 'national/cultural commemoration day',
        'festive heritage gathering',
      ],
      commercialScenes: [
        'Cultural tourism brochure', 'interfaith poster', 'educational textbook illustration',
        'wellness app banner', 'global heritage campaign',
      ],
      microVariations: {
        treatment: ['Symbol-focused', 'ceremonial activity scene', 'traditional architecture context', 'costume study'],
        tone: ['Educational', 'celebratory', 'contemplative', 'reverent', 'dignified'],
      },
    },
    subcategories: {
      'Religious Symbols': {
        subjects: [
          'Christian Cross', 'Islamic Crescent and Star', 'Star of David', 'Buddhist Dharma Wheel',
          'Hindu Om symbol', 'Lotus symbol', 'Jewish Menorah', 'Yin-Yang balance',
        ],
      },
      'Cultural Traditions': {
        subjects: [
          'Japanese tea ceremony', 'Chinese Lunar New Year dragon dance', 'Korean Hanbok celebration',
          'Javanese batik crafting', 'Balinese temple offering', 'Thai Loy Krathong festival',
          'Indian Diwali lamp lighting', 'Holi color festival', 'classical Bharatanatyam dance',
          'Traditional Middle Eastern hospitality tea service', 'Calligraphy artisan at work', 'Sufi dervish ceremony',
          'Mexican Dia de los Muertos altar', 'Andean traditional weaving', 'Brazilian samba carnival',
          'Scottish Highland games kilt performance', 'Scandinavian Midsummer festival', 'Mid-Eastern European folk dance',
          'African drum circle performance', 'Kente cloth weaving ritual', 'Masai traditional celebration',
        ],
      },
      'Mythology': {
        subjects: [
          'Greek Olympian deity', 'Norse Yggdrasil tree', 'Hindu Ramayana epic scene',
          'Egyptian Pharaoh concept', 'Mayan sun deity', 'East Asian dragon folklore',
        ],
      },
      'Spiritual & Mindfulness': {
        subjects: [
          'Mindfulness meditation posture', 'chakra energy flow visual', 'incense reflection ritual',
          'candle meditation', 'nature contemplation',
        ],
      },
    },
  },
  'Science': {
    visualDNA: 'Technical scientific flat illustration; accurate conceptual visualization with academic clarity.',
    commercialDNA: 'STEM educational publisher, science journalism, research institute report, biotech brand.',
    compositionDNA: 'Focus Scientific Subject 60%, Supporting Diagram Elements 25%, Label Space 15%.',
    qualityDNA: 'Diagrammatic clarity, precise spatial/molecular relationships, clean vector line precision.',
    diversityEngine: {
      macroConcepts: [
        'Molecular chemical reaction bonding', 'cellular division mitosis', 'cosmic galaxy black hole lensing',
        'mathematical fractal spiral', 'AI neural network node processing',
      ],
      commercialScenes: [
        'STEM academy poster', 'research journal cover', 'science museum banner', 'EdTech digital slide',
      ],
      microVariations: {
        discipline: ['Physics', 'chemistry', 'biology', 'astronomy', 'mathematics', 'computer science'],
        format: ['Concept diagram', 'specimen study', 'process flow', '3D vector flat'],
      },
    },
    subcategories: {
      'Physics & Chemistry': { subjects: ['Atom structure Bohr model', 'chemical reaction equation', 'electromagnetic wave', 'fluid dynamics', 'periodic element'] },
      'Biology & DNA': { subjects: ['DNA double helix', 'cell membrane cross-section', 'human organ system', 'plant cell diagram', 'virus particle structure'] },
      'Astronomy & Space': { subjects: ['Solar system planets', 'spiral galaxy', 'astronaut spacewalk', 'colorful nebula', 'rocket launch', 'black hole'] },
      'Mathematics': { subjects: ['Euclidean geometry visual', 'fractal pattern', 'golden ratio spiral', 'function graph curve', 'infinity symbol'] },
      'Technology & AI': { subjects: ['Neural network node diagram', 'machine learning training', 'quantum computing circuit', 'AI brain circuit hybrid'] },
    },
  },
  'Signs and Symbols': {
    visualDNA: 'Precise symbol design; maximum visual legibility at small and large scale.',
    commercialDNA: 'Safety collateral, UI icon system, wayfinding navigation, e-commerce trust badges.',
    compositionDNA: 'Focus Symbol 75%, Field/Container 20%, Negative Space 5%.',
    qualityDNA: 'High-contrast figure-ground separation, bold geometric clarity, universally recognizable visual language.',
    diversityEngine: {
      macroConcepts: [
        'Workplace safety hazard warning', 'cartographic map navigation', 'platform-agnostic UI icons',
        'directional flow arrow system', 'commercial quality certification seals',
      ],
      commercialScenes: [
        'HSE safety poster', 'navigation app icon', 'e-commerce checkout badge', 'presentation diagram flow',
      ],
      microVariations: {
        container: ['Triangle (warning)', 'circle (prohibition/mandatory)', 'square (information)', 'shield'],
        style: ['Solid fill', 'bold graphic line', 'modern duotone'],
      },
    },
    subcategories: {
      'Safety & Warning': { subjects: ['Hazard warning triangle', 'fire extinguisher symbol', 'high voltage danger', 'biohazard', 'first aid red cross'] },
      'Navigation & Maps': { subjects: ['Location pin drop', 'treasure map illustration', 'world map graphic', 'GPS route planning', 'compass rose'] },
      'Social Media Icons (Concept)': { subjects: ['Platform-agnostic messaging icon', 'video app icon', 'photo share icon', 'podcast icon'], genericObjectTags: ['softwareUI'] },
      'Arrows & Shapes': { subjects: ['Directional arrow set', 'geometric shape collection', 'pointer cursor arrows', 'progress step arrows'] },
      'Badges & Labels': { subjects: ['Quality assurance gold badge', 'eco-friendly green label', 'sale discount sticker', 'premium badge', 'award ribbon'] },
    },
  },
  'Sports': {
    visualDNA: 'Dynamic athletic flat illustration; movement and kinetic energy captured at peak performance.',
    commercialDNA: 'Athletic wear marketing, sports event poster, fitness app, sports editorial, league promotion.',
    compositionDNA: 'Focus Athlete 60%, Sport Environment 25%, Motion Energy 15%.',
    qualityDNA: 'Dynamic diagonal action composition, anatomically correct muscle extension, team-neutral fictional gear colors.',
    diversityEngine: {
      macroConcepts: [
        'Team match-winning goal', 'individual athlete focused serve', 'aquatic surf wave tube ride',
        'mountain downhill ski slope', 'home gym workout equipment setup',
      ],
      commercialScenes: [
        'Sports event billboard', 'fitness app splash screen', 'athletic brand ad', 'sports magazine cover',
      ],
      microVariations: {
        perspective: ['Dynamic low-angle action', 'side profile motion', 'frontal peak effort'],
        colors: ['Fictional team neutral blue/orange', 'red/white', 'teal/grey'],
      },
    },
    subcategories: {
      'Team Sports': { subjects: ['Soccer striker goal shot', 'basketball dunk at rim', 'volleyball block', 'rugby tackle', 'baseball pitcher wind-up'] },
      'Individual Sports': { subjects: ['Tennis serve follow-through', 'golf driver swing', 'boxing combination stance', 'archery full draw', 'sprinter start'] },
      'Water Sports': { subjects: ['Surfer tube ride wave', 'competitive swimmer stroke', 'sea kayak paddling', 'windsurfer jump', 'standup paddleboard'] },
      'Winter Sports': { subjects: ['Downhill ski racer turn', 'snowboard halfpipe trick', 'figure skating spin', 'ice hockey slapshot', 'curling stone'] },
      'Fitness Equipment': { subjects: ['Adjustable dumbbell set', 'competition kettlebell', 'resistance bands', 'treadmill concept', 'yoga mat and blocks'] },
    },
  },
  'Technology': {
    visualDNA: 'Cutting-edge tech conceptual illustration; futuristic design language with digital glow aesthetic.',
    commercialDNA: 'SaaS website, tech enterprise collateral, cybersecurity campaign, investor pitch deck.',
    compositionDNA: 'Focus Tech Element 50%, Data/Network Background 30%, Negative Space 20%.',
    qualityDNA: 'Precise digital circuit/node geometry, vibrant neon-on-dark or sleek light-mode contrast, clean futuristic line work.',
    diversityEngine: {
      macroConcepts: [
        'AI neural network processing', 'cybersecurity shield firewall defense', 'cloud server infrastructure sync',
        'smart home IoT network', 'industrial robot arm precision', 'generic mobile device ecosystem',
      ],
      commercialScenes: [
        'SaaS website hero banner', 'cybersecurity brochure', 'tech conference background', 'app splash screenshot',
      ],
      microVariations: {
        theme: ['Dark mode cyber glow', 'light mode clean SaaS', 'isometric 3D network grid'],
        palette: ['Electric cyan', 'deep purple cyber', 'tech navy', 'neon accent'],
      },
    },
    subcategories: {
      'AI & Machine Learning': { subjects: ['Neural network topology', 'machine learning data flow', 'AI decision algorithm', 'generative AI concept'] },
      'Cybersecurity': { subjects: ['Data shield protection', 'ethical hacker', 'network firewall', 'password security lock', 'data encryption padlock'] },
      'Cloud Computing': {
        subjects: ['Cloud storage concept', 'server farm to cloud', 'multi-cloud architecture', 'data backup cloud sync'],
        genericObjectTags: ['softwareUI'],
        conceptDNA: {
          motif: ['cloud shape with server nodes', 'data upload to cloud arc', 'multi-cloud interlinking', 'server farm to cloud pathway', 'backup sync cycle'],
          structure: 'Cloud-centric metaphor as hero — infrastructure elements (servers, racks) as supporting context',
          repetition: 'Alternate abstract cloud / concrete data center / hybrid connection across batch',
          palette: ['tech navy and soft sky blue', 'cyber purple accents', 'clean SaaS light'],
          background: 'Clean gradient or minimal network grid',
          visualLanguage: 'Modern flat vector with soft edge glow, professional infrastructure feel',
          commercialUse: ['Cloud provider hero banner', 'IT infrastructure slide', 'devops blog visual', 'data center brochure'],
          promptRules: {
            mustInclude: ['fictional generic dashboard or infrastructure', 'clear cloud narrative', 'clean professional look'],
            mustAvoid: ['real cloud provider logo', 'recognizable real console interface', 'dated server room photo realism'],
          },
          negativePrompt: ['real cloud brand logo', 'recognizable real cloud console', 'cluttered server rack chaos', 'visible trademark'],
        },
      },
      'Mobile & Devices': {
        subjects: ['Generic smartphone concept', 'tablet with stylus', 'smartwatch fitness', 'smart speaker', 'wireless charging'],
        genericObjectTags: ['device'],
        conceptDNA: {
          motif: ['floating smartphone with abstract screen', 'tablet stylus drawing flow', 'smartwatch fitness ring', 'smart speaker wave audio', 'wireless charging glow'],
          structure: 'Single device as hero — abstract or fictional screen content, clean product-style isolation',
          repetition: 'Rotate device type per asset — phone / tablet / watch / speaker must not repeat consecutively',
          palette: ['modern device neutral palette', 'clean tech accents', 'product-shot light'],
          background: 'Pure white or soft gradient — product hero convention',
          visualLanguage: 'Sleek product-style flat illustration, subtle reflections, no brand-specific geometry',
          commercialUse: ['Device promo banner', 'tech gadget article hero', 'app showcase visual', 'accessory packaging'],
          promptRules: {
            mustInclude: ['generic unbranded device silhouette', 'fictional abstract screen content', 'clean product focus'],
            mustAvoid: ['recognizable real phone design', 'real manufacturer logo', 'brand-specific button layout', 'watermarked render'],
          },
          negativePrompt: ['real smartphone brand silhouette', 'manufacturer logo', 'distinctive trademark geometry', 'screenshot of real app', 'product watermark'],
        },
      },
      'Internet of Things': {
        subjects: ['Smart home ecosystem hub', 'IoT sensor network', 'connected vehicle', 'industrial IoT factory'],
        genericObjectTags: ['device', 'vehicle'],
        conceptDNA: {
          motif: ['smart home hub with connected nodes', 'IoT sensor network web', 'connected vehicle data link', 'industrial IoT factory mesh', 'smart city light grid'],
          structure: 'Hub-and-node composition — one central hub with radiating connection lines to devices',
          repetition: 'Vary the environment — smart home / factory / city / vehicle across batch',
          palette: ['IoT tech blue and green accents', 'dark mode cyber', 'clean smart-home neutral'],
          background: 'Clean gradient or subtle network grid',
          visualLanguage: 'Modern connected-system flat illustration, clear node/edge hierarchy',
          commercialUse: ['Smart home product page', 'IoT platform hero', 'automation blog visual', 'tech expo banner'],
          promptRules: {
            mustInclude: ['fictional generic device nodes', 'clear connection narrative', 'clean hierarchy'],
            mustAvoid: ['recognizable real smart device', 'real platform interface', 'branded logo'],
          },
          negativePrompt: ['real smart home brand device', 'real IoT platform UI', 'visible trademark', 'cluttered wiring'],
        },
      },
      'Robotics': { subjects: ['Humanoid robot concept', 'industrial robot arm', 'drone quadcopter', 'exploration rover', 'companion social robot'], genericObjectTags: ['device'] },
    },
  },
  'Transportation': {
    visualDNA: 'Clean vehicle and transport flat illustration; transport engineering precision with catalog quality.',
    commercialDNA: 'Logistics website, automotive editorial, travel agency marketing, transit authority campaign.',
    compositionDNA: 'Focus Vehicle 60%, Transport Environment 25%, Sky/Context 15%.',
    qualityDNA: 'Accurate automotive/aerodynamic proportions, clean body reflection lines, motion indicator lines, no real license plates.',
    diversityEngine: {
      macroConcepts: [
        'Electric vehicle charging', 'commercial airliner in flight', 'ocean container ship crossing',
        'urban transit bus route', 'last-mile courier doorstep delivery',
      ],
      commercialScenes: [
        'Logistics landing page hero', 'automotive brand promo banner', 'flight booking website', 'transit app splash',
      ],
      microVariations: {
        angle: ['3/4 hero view', 'side profile elevation', 'front view', 'aerial overhead'],
        context: ['In-motion highway', 'parked charging station', 'port departure'],
      },
    },
    subcategories: {
      'Cars & Vehicles': {
        subjects: ['Generic sedan design', 'compact SUV', 'sports coupe', 'electric vehicle concept', 'pickup truck'],
        genericObjectTags: ['vehicle'],
        conceptDNA: {
          motif: ['generic sedan side profile', 'compact SUV urban context', 'sports coupe motion blur', 'EV concept charging', 'pickup truck work scene'],
          structure: 'Vehicle as hero — 3/4 or side profile, clean ground shadow anchoring it to surface',
          repetition: 'Vary body type and angle per asset — sedan / SUV / coupe / EV must rotate, avoid same angle consecutively',
          palette: ['automotive studio neutral', 'metallic accents', 'commercial transport palette'],
          background: 'Clean gradient or implied road/environment — never floating vehicle',
          visualLanguage: 'Precise automotive flat illustration, accurate proportions, no real badge geometry',
          commercialUse: ['Automotive promo banner', 'logistics hero', 'showroom brochure', 'transit campaign'],
          promptRules: {
            mustInclude: ['generic unbranded vehicle design', 'ground shadow or surface context', 'accurate proportions'],
            mustAvoid: ['real car brand styling', 'manufacturer badge or logo', 'recognizable trademark body line', 'visible license plate'],
          },
          negativePrompt: ['real car brand silhouette', 'manufacturer logo or badge', 'distinctive trademark grill', 'license plate', 'toy-like plastic look'],
        },
      },
      'Aviation': {
        subjects: ['Wide-body airliner in flight', 'private jet concept', 'rescue helicopter', 'airport terminal', 'hot air balloon'],
        genericObjectTags: ['vehicle'],
        conceptDNA: {
          motif: ['wide-body airliner climbing', 'private jet silhouette', 'rescue helicopter hover', 'airport terminal apron', 'hot air balloon ascent'],
          structure: 'Aircraft as hero in dynamic flight — diagonal or climbing composition with implied altitude',
          repetition: 'Rotate craft type — airliner / jet / helicopter / balloon across batch',
          palette: ['aviation sky blues', 'classic airline neutral', 'warm sunset contrast'],
          background: 'Sky implied gradient — clouds or atmospheric depth, never plain white',
          visualLanguage: 'Clean aerospace flat illustration, accurate proportions, subtle motion indication',
          commercialUse: ['Flight booking hero', 'aviation company brochure', 'travel promo', 'airport campaign'],
          promptRules: {
            mustInclude: ['generic unbranded aircraft design', 'implied sky or altitude context', 'accurate proportions'],
            mustAvoid: ['real airline livery', 'real aircraft manufacturer branding', 'visible tail logo', 'commercial airline color scheme'],
          },
          negativePrompt: ['real airline livery', 'aircraft manufacturer logo', 'recognizable real plane tail design', 'commercial brand color scheme', 'cartoonish plane'],
        },
      },
      'Maritime': {
        subjects: ['Container ship ocean crossing', 'sailing yacht', 'luxury cruise ship', 'traditional fishing boat', 'submarine cutaway'],
        genericObjectTags: ['vehicle'],
        conceptDNA: {
          motif: ['container ship ocean crossing', 'sailing yacht heeled', 'cruise ship bow wave', 'fishing boat harbor', 'submarine periscope view'],
          structure: 'Vessel as hero with sea context — hull properly anchored in water with wake or reflection',
          repetition: 'Vary vessel type and scale — cargo / yacht / cruise / fishing across batch',
          palette: ['ocean blues and white', 'nautical deep palette', 'warm port sunset'],
          background: 'Implied sea and sky gradient — waterline clearly defined',
          visualLanguage: 'Clean maritime flat illustration, accurate hull proportions, no real ship line styling',
          commercialUse: ['Shipping company hero', 'port authority brochure', 'maritime trade slide', 'cruise promo'],
          promptRules: {
            mustInclude: ['generic unbranded vessel design', 'proper water context with wake or reflection', 'accurate proportions'],
            mustAvoid: ['real shipping line logo', 'recognizable real cruise ship', 'real vessel silhouette', 'trademark hull design'],
          },
          negativePrompt: ['real shipping company branding', 'recognizable real ship silhouette', 'visible funnel logo', 'branded hull design'],
        },
      },
      'Public Transport': {
        subjects: ['City double-decker bus', 'subway metro interior', 'tram on street', 'commuter rail station', 'river ferry'],
        genericObjectTags: ['vehicle'],
        conceptDNA: {
          motif: ['double-decker bus urban route', 'subway metro interior', 'tram street crossing', 'commuter rail station platform', 'river ferry dock'],
          structure: 'Vehicle in transit environment — station, street, or platform context anchors the scene',
          repetition: 'Vary transit mode — bus / metro / tram / rail across batch',
          palette: ['urban transit neutral', 'city accent colors', 'clean commuter palette'],
          background: 'Implied urban environment — street, station, or skyline, never floating',
          visualLanguage: 'Clean transport flat illustration, accurate vehicle proportions, urban context clarity',
          commercialUse: ['Transit authority campaign', 'commuter app hero', 'city mobility brochure', 'urban planning deck'],
          promptRules: {
            mustInclude: ['generic unbranded transit vehicle', 'clear station or street context', 'accurate proportions'],
            mustAvoid: ['real transit agency livery', 'recognizable real metro branding', 'visible route branding', 'branded vehicle'],
          },
          negativePrompt: ['real transit agency logo', 'recognizable real metro car', 'branded city bus design', 'visible route number branding'],
        },
      },
      'Logistics & Delivery': {
        subjects: ['Delivery van urban route', 'package doorstep arrival', 'warehouse dispatch', 'drone parcel delivery', 'bicycle courier'],
        genericObjectTags: ['vehicle', 'device'],
        conceptDNA: {
          motif: ['delivery van urban route', 'package doorstep drop', 'warehouse dispatch sorting', 'drone parcel delivery', 'bicycle courier'],
          structure: 'Last-mile delivery narrative — one clear moment (drop, sort, dispatch) with vehicle as context',
          repetition: 'Vary delivery mode — van / drone / bicycle / warehouse across batch',
          palette: ['logistics amber and grey', 'delivery brand-neutral', 'clean shipping palette'],
          background: 'Implied street or facility environment — clean, not cluttered',
          visualLanguage: 'Modern logistics flat illustration, clear package focus, professional cleanliness',
          commercialUse: ['Logistics landing page hero', 'delivery service promo', 'e-commerce shipping banner', 'supply chain slide'],
          promptRules: {
            mustInclude: ['generic unbranded delivery vehicle', 'clear delivery moment', 'clean environment'],
            mustAvoid: ['real courier brand color scheme', 'recognizable real delivery app UI', 'real logistics logo', 'cluttered depot chaos'],
          },
          negativePrompt: ['real courier brand colors', 'recognizable real delivery platform', 'visible brand logo on package', 'cluttered chaotic depot'],
        },
      },
    },
  },
  'Travel': {
    visualDNA: 'Wanderlust editorial flat illustration; global cultural awareness with discovery narrative.',
    commercialDNA: 'Travel agency hero, tourism board campaign, travel magazine cover, booking app.',
    compositionDNA: 'Focus Landmark/Cultural Element 45%, Traveler/Activity 35%, Atmosphere 20%.',
    qualityDNA: 'Travel-poster aesthetic, atmospheric light (golden/blue hour), respectful destination representation.',
    diversityEngine: {
      macroConcepts: [
        'Landmark monument sightseeing', 'cartographic route itinerary planning', 'luxury hotel lobby greeting',
        'guided cultural street market tour', 'tropical paradise coastal exploration',
      ],
      commercialScenes: [
        'Travel agency web hero banner', 'tourism app booking screen', 'hotel hospitality brochure', 'travel magazine cover',
      ],
      microVariations: {
        traveler: ['Solo backpacker', 'couple', 'family', 'group (diverse ethnicities)'],
        season: ['Spring blossom', 'golden summer', 'autumn foliage', 'winter snow'],
      },
    },
    subcategories: {
      'Landmarks & Monuments': { subjects: ['Pyramid desert monument', 'cathedral silhouette', 'ancient temple arch', 'suspension bridge', 'clock tower'] },
      'Maps & Navigation': { subjects: ['Vintage world map', 'city tourist map', 'treasure map style', 'travel route planning visual', 'globe pin drop'] },
      'Hotel & Accommodation': { subjects: ['Grand hotel lobby concept', 'luxury suite interior', 'resort infinity pool', 'boutique hotel exterior'] },
      'Tourism': { subjects: ['Sightseeing tourist with camera', 'tour guide leading group', 'local food tasting', 'souvenir market shopping', 'walking tour'], genericObjectTags: ['device'] },
      'Cultural Destinations': { subjects: ['Bali-inspired temple garden', 'Moroccan riad courtyard', 'Japanese zen garden', 'Mediterranean coastal village'] },
    },
  },
};



// 10 · RULE ENGINE — Commercial Rules
//  DNA ENGINE V5 — COMMERCIAL RULES

function buildCommercialRules(categoryKey, subcategoryKey = '', assetType = '') {
  const cat = CATEGORY_DNA[categoryKey];
  if (!cat && !categoryKey) return '';
  const adobe = GLOBAL_DNA.adobeCompliance;
  const photo = GLOBAL_DNA.photoCompliance;
  const isPhoto = assetType === 'photo';
  const sub = subcategoryKey && cat ? cat.subcategories[subcategoryKey] : null;
  const subjects = sub?.subjects;
  const subjectList = subjects ? subjects.slice(0, 4).join(', ') : '';

  // EU-8: Generic Object DNA — hanya aktif kalau subkategori ini ditandai
  // genericObjectTags (Technology/Business/Transportation/dst yang rawan
  // menghasilkan visual mirip produk/UI/kendaraan nyata).
  const objectTags = sub?.genericObjectTags;
  const genericObjectRules = Array.isArray(objectTags) && objectTags.length > 0
    ? objectTags.map(tag => GENERIC_OBJECT_DNA[tag]).filter(Boolean).join('; ')
    : '';

  // EU-11: Concept DNA — commercialUse per-subkategori, lebih spesifik
  // daripada cat.commercialDNA yang cakupannya se-kategori. No-op kalau
  // subkategori belum punya conceptDNA.
  const conceptCommercialUse = Array.isArray(sub?.conceptDNA?.commercialUse) && sub.conceptDNA.commercialUse.length > 0
    ? sub.conceptDNA.commercialUse.join(', ')
    : '';

  // Token compliance harus sesuai assetType. Photo memakai photoCompliance
  // (tanpa noLensSimulation, tanpa "isolated white", tanpa kata "Vector")
  // — kalau tidak, model foto disuruh memproduksi gambar flat/vektor.
  const complianceToken = isPhoto
    ? `PHOTO STANDARD: ${photo.commercialQuality} ${photo.negativeSpace} ${photo.subjectClarity} ${photo.edgeQuality} ${photo.backgroundPreference} ${photo.lensDepth}`
    : `ADOBE STANDARD: ${adobe.commercialQuality} ${adobe.negativeSpace} ${adobe.subjectClarity} ${adobe.edgeQuality} ${adobe.backgroundPreference} ${adobe.noLensSimulation}`;

  return [
    complianceToken,
    cat ? `CATEGORY COMMERCIAL: ${cat.commercialDNA}` : '',
    // qualityDNA dan compositionDNA menjadi quality standard dan composition
    // guide per kategori.
    cat?.qualityDNA ? `QUALITY STANDARD: ${cat.qualityDNA}` : '',
    cat?.compositionDNA ? `COMPOSITION GUIDE: ${cat.compositionDNA}` : '',
    subcategoryKey ? `SUBCATEGORY: ${subcategoryKey}${subjectList ? ` — Suggested subjects: ${subjectList}` : ''}` : '',
    conceptCommercialUse ? `SUBCATEGORY COMMERCIAL USE: ${conceptCommercialUse}` : '',
    genericObjectRules ? `IP-SAFE OBJECT RULES: ${genericObjectRules}` : '',
  ].filter(Boolean).join(' | ');
}


// 09 · ENGINES — DNA Engine (style guidance resolver)
//  DNA ENGINE V5 — STYLE DNA

export const STYLE_PRESET_MAP = {
  'flatcommercial':       'flatCommercial',
  'editorialscene':       'editorialScene',
  'linealcolor':          'linealColor',
  'seamlesspattern':      'seamlessPattern',
  'minimaloutline':       'minimalOutline',
  'handdrawnorganic':     'handDrawn',
  'handdrawn':            'handDrawn',
  '3dproductrender':      'threeDProduct',
  'isometric3d':          'isometric3D',
  // ── Mapping yang sebelumnya hilang ────────────────────────────────────────
  'cutefoodobject':       'cuteFoodObject',
  'cutefood&object':      'cuteFoodObject',
  'cutefood':             'cuteFoodObject',
  'cutekidsnursery':      'cuteKidsNursery',
  'cutekids&nursery':     'cuteKidsNursery',
  'cutekids':             'cuteKidsNursery',
  'flatrounded':          'flatRounded',
  'boldfilled':           'boldFilled',
  'texturededitorial':    'texturedEditorial',
  // ── Style baru ────────────────────────────────────────────────────────────
  'watercolor':               'watercolor',
  'watercolorvibrant':        'vibrantWatercolor',
  'vibrantwatercolor':        'vibrantWatercolor',
  'watercolorv':              'vibrantWatercolor',
  'acrylicpainterly':         'acrylicPainterly',
  'acrylic':                  'acrylicPainterly',
  'painterly':                'acrylicPainterly',
  'gradientcartoon':          'gradientCartoon',
  'gradient cartoon':         'gradientCartoon',
  'mixedmediacollage':        'mixedMediaCollage',
  'mixedmedia':               'mixedMediaCollage',
  'collage':                  'mixedMediaCollage',
  // Photo styles
  'lifestylescene':           'lifestyleScene',
  'lifestyle':                'lifestyleScene',
  'corporateeditorial':       'corporateEditorial',
  'corporate':                'corporateEditorial',
  'cinematicwideshot':        'cinematicWideShot',
  'cinematic':                'cinematicWideShot',
  'studioportrait':           'studioPortrait',
  'portrait':                 'studioPortrait',
  'flatlayphoto':             'flatLayOverhead',
  'flatlayoverhead':          'flatLayOverhead',
  'flatlay':                  'flatLayOverhead',
  'environmentalportrait':    'environmentalPortrait',
  'environmental':            'environmentalPortrait',
  // 3D styles
  '3dobject':                 'threeDObject',
  '3dcharacter':              'threeDCharacter',
};

function findStylePreset(styleName) {
  const key = (styleName || '').toLowerCase().replace(/[\s-]+/g, '');
  return STYLE_PRESET_DNA[STYLE_PRESET_MAP[key]];
}

function buildStyleGuidance(styleName) {
  const preset = findStylePreset(styleName);
  return preset ? `STYLE DNA: ${preset.promptTrigger}. ${preset.characteristics}` : '';
}


// 12 · COMPLIANCE ENGINE — Generic Object DNA (EU-8)
// -
// Sumber: analisa penolakan Adobe Stock "Intellectual Property Refusal" untuk
// "Handshake over digital tablet with financial growth chart" — prompt yang
// terlihat generik ternyata bisa menghasilkan visual yang menyerupai produk/
// UI nyata. Registry ini berisi aturan anti-IP per jenis objek generik,
// ditempel ke prompt commercial rules HANYA untuk subkategori yang ditandai
// `genericObjectTags` di bawah (Technology, Business, Transportation, dst)
// — tidak mengubah subkategori lain sama sekali.
const GENERIC_OBJECT_DNA = {
  device: 'generic unbranded consumer device, no identifiable manufacturer, no distinctive product geometry, no brand-specific button layout, no logos or model markings',
  softwareUI: 'fictional generic dashboard interface, abstract simplified data visualization, no recognizable real application layout, no branded UI patterns, no company-specific interface colors, not a screenshot of any real software',
  packaging: 'generic unbranded packaging or container, no recognizable packaging silhouette of an existing product, no brand identity, no trademark-like marks or wordmarks',
  vehicle: 'generic vehicle design, no manufacturer-specific styling or badges, no distinctive trademark elements, no visible brand logos',
};

// 10 · RULE ENGINE — Category Negative Hints
//  DNA ENGINE V5 — NEGATIVE PROMPT ENGINE

export const CATEGORY_NEGATIVE_HINTS = {
  'Abstract': 'recognizable objects, accidental faces, representational forms',
  'Animals': 'deformed animal anatomy, unrealistic proportions, missing limbs, unnatural colors',
  'Buildings and Architecture': 'people blocking facade, lens flare, heavy chromatic aberration, overly HDR tonemapping, distracting foreground clutter, visible power lines unless intentional',
  'Business': 'cheesy forced smile, overly staged handshake, generic diverse-team-high-fiving pose, cluttered messy desk, excessive lens flare on office glass',
  'Education': 'outdated textbook aesthetic, cheap plastic toys, condescending imagery, overly posed classroom stock cliche, blurry chalkboard text',
  'Food and Drink': 'unappetizing appearance, mold, spoiled, artificial neon colors, unappealing texture',
  'Health and Medicine': 'unsanitary conditions, unprofessional appearance, intimidating medical tools, blood',
  'Holidays and Celebrations': 'generic stock cliche, overly commercial look, low-effort decoration',
  'Illustrations and Clipart': 'photorealistic rendering, heavy drop shadow, bevel and emboss effect, outdated clip-art style, low-resolution pixel artifact',
  'Industrial': 'unsafe conditions, broken equipment, unprofessional workspace',
  'Landscapes': 'heavy oversaturated HDR, blown-out sky, excessive vignette, tourist-trap angle, visible trash or litter, distracting power lines',
  'Lifestyle': 'overly staged posed look, forced unnatural smile, generic stock couple gazing at laptop, cluttered background, unflattering harsh lighting',
  'Nature': 'heavy oversaturation, plastic artificial look, unrealistic neon color grading, visible human interference unless intentional, blurry out-of-focus subject',
  'Objects': 'distracting background clutter, inconsistent lighting direction, visible dust or scratches unless intentional, cheap plastic toy appearance, distorted perspective',
  'People': 'stereotypical depictions, offensive caricatures, unrealistic body proportions',
  'Religion and Culture': 'disrespectful portrayals, cultural appropriation, stereotypical imagery',
  'Science': 'inaccurate diagrams, pseudoscience imagery, nonsensical formulas',
  'Signs and Symbols': 'real trademarked logo, copyrighted brand symbol, illegible text, pixelated edge, inconsistent stroke weight, random decorative noise',
  'Sports': 'unrealistic anatomy, missing equipment detail, generic silhouette with no sport-specific context, blurry motion without intent, branded jersey or logo visible',
  'Technology': 'outdated hardware, messy cables, unrealistic interfaces, 90s aesthetic',
  'Transportation': 'visible brand logo or license plate, unrealistic scale, floating vehicle with no ground shadow, heavy lens flare on chrome, toy-like plastic appearance',
  'Travel': 'heavy tourist-trap cliche angle, extreme HDR tonemapping, visible crowds unless intentional, generic airport lounge shot, oversaturated sky',
};

function buildCategoryNegativeHints(categoryKey) {
  return CATEGORY_NEGATIVE_HINTS[categoryKey] || '';
}


// 17 · MARKET DEMAND REGISTRY (Fase A) — konsep laris & buyer vocabulary
// -
// Tujuan: menjadikan tool menghasilkan aset yang DICARI pembeli microstock,
// bukan sekadar lolos review. Dua jenis data:
//   - topConcepts: konsep dengan volume pencarian tinggi (curated manual dulu,
//     dikalibrasi dari data penjualan nyata via feedback action 'sold').
//   - buyerTerms: istilah yang pembeli microstock ketik saat mencari — dipakai
//     metadata engine (buildMetadataExpansionCandidates) sebagai sumber keyword.
// Data awal ini adalah seed yang DIVERIFIKASI MANUAL dari praktik microstock
// umum; angka penjualan nyata (Fase F) akan menggeser prioritasnya.
const MARKET_DEMAND = {
  'Abstract': {
    topConcepts: [
      'Geometric abstract shapes seamless pattern',
      'Fluid gradient abstract background',
      'Minimalist line art abstract',
      'Liquid marble texture abstract',
      'Pastel abstract shapes on white',
    ],
    buyerTerms: ['abstract background', 'geometric pattern', 'fluid gradient', 'minimal art', 'texture background', 'digital art', 'wall art', 'poster background'],
  },
  'Animals': {
    topConcepts: [
      'Cute animal cartoon character',
      'Wildlife silhouette set',
      'Pet illustration portrait',
      'Animal paw print pattern',
      'Jungle animals seamless pattern',
    ],
    buyerTerms: ['animal illustration', 'cute animal', 'wildlife art', 'pet portrait', 'animal silhouette', 'jungle pattern', 'nursery decor'],
  },
  'Business': {
    topConcepts: [
      'Team collaboration flat illustration',
      'Business growth chart concept',
      'Remote work office scene',
      'Startup pitch presentation',
      'Corporate handshake concept',
    ],
    buyerTerms: ['business illustration', 'corporate design', 'teamwork concept', 'startup', 'presentation graphic', 'office scene', 'marketing visual'],
  },
  'Food and Drink': {
    topConcepts: [
      'Healthy food flat lay',
      'Coffee cup illustration',
      'Street food vector set',
      'Fruit seamless pattern',
      'Bakery illustration set',
    ],
    buyerTerms: ['food illustration', 'food pattern', 'coffee art', 'restaurant menu', 'healthy eating', 'food packaging', 'culinary design'],
  },
  'Holidays and Celebrations': {
    topConcepts: [
      'Christmas seamless pattern',
      'Festive greeting card illustration',
      'Birthday party vector set',
      'New year celebration concept',
      'Halloween cute illustration set',
    ],
    buyerTerms: ['christmas pattern', 'greeting card', 'holiday illustration', 'party design', 'festive decoration', 'seasonal art'],
  },
  'Nature': {
    topConcepts: [
      'Tropical leaves seamless pattern',
      'Botanical line art',
      'Wildflower meadow illustration',
      'Eucalyptus branch pattern',
      'Mushroom forest illustration',
    ],
    buyerTerms: ['botanical pattern', 'nature illustration', 'leaf pattern', 'floral design', 'plant art', 'green background', 'organic pattern'],
  },
  'Technology': {
    topConcepts: [
      'AI artificial intelligence concept',
      'Cybersecurity shield illustration',
      'Cloud computing flat design',
      'Smart home technology icons',
      'Data analytics dashboard concept',
    ],
    buyerTerms: ['technology illustration', 'ai concept', 'cyber security', 'cloud computing', 'tech background', 'digital innovation', 'app design'],
  },
  'Transportation': {
    topConcepts: [
      'Electric car illustration',
      'Delivery van concept',
      'Airplane travel illustration',
      'City transport icons set',
      'Logistics truck illustration',
    ],
    buyerTerms: ['transportation illustration', 'vehicle design', 'delivery concept', 'travel art', 'logistics graphic', 'city transport'],
  },
  'Travel': {
    topConcepts: [
      'Travel destination flat illustration',
      'World map travel concept',
      'Beach vacation illustration',
      'Adventure hiking scene',
      'Passport travel icons',
    ],
    buyerTerms: ['travel illustration', 'vacation design', 'destination art', 'travel poster', 'world map', 'adventure graphic', 'tourist concept'],
  },
  'People': {
    topConcepts: [
      'Diverse team portrait illustration',
      'Family lifestyle flat scene',
      'Professional avatar set',
      'Community diversity concept',
      'Exercise fitness people illustration',
    ],
    buyerTerms: ['people illustration', 'diversity art', 'portrait design', 'lifestyle scene', 'avatar set', 'human figure', 'community concept'],
  },
};

// Helper — buyer vocabulary untuk kategori tertentu (Fase A.2).
const getBuyerTermsForCategory = (categoryKey) => {
  const entry = MARKET_DEMAND[categoryKey];
  return entry?.buyerTerms || [];
};


// 17 · MARKET PALETTES (Fase B) — palette komersial yang "menjual" per kategori
// -
// Warna terbukti laku di thumbnail microstock: kontras cukup, harmonis, tidak
// gelap semua / pastel pucat tanpa fokus. Dipakai prompt generation (dnaPrefix)
// supaya hasil visual punya palette yang menarik di ukuran kecil (200px).
// Data awal curated manual dari praktik komersial umum; dikalibrasi dari
// feedback penjualan nyata (Fase F).
export const MARKET_PALETTES = {
  'Abstract': ['Vibrant gradient duo-tone on deep navy background', 'Soft pastel shapes with bold single accent color', 'Monochrome geometric with metallic gold highlight'],
  'Animals': ['Warm earthy tones with soft cream background', 'Bright jungle greens with sunny yellow accents', 'Muted watercolor palette with warm brown focus'],
  'Buildings and Architecture': ['Clean grey and white with warm stone accent', 'Modern glass-blue with soft cream foreground', 'Warm terracotta and white with architectural blue sky'],
  'Business': ['Corporate navy blue with gold accents on white', 'Modern teal and grey with clean white space', 'Deep blue with vibrant coral accent'],
  'Education': ['Bright primary red-blue-yellow on clean white', 'Soft sky blue and sunshine yellow with cream', 'Fresh green and white with warm amber detail'],
  'Food and Drink': ['Fresh green and warm cream on light background', 'Vibrant red-orange with fresh green garnish', 'Warm bakery amber with soft cream'],
  'Health and Medicine': ['Clean clinical white and teal with soft blue', 'Calm mint green with warm cream and neutral grey', 'Warm white with healing green accent'],
  'Holidays and Celebrations': ['Classic red and green with gold accents', 'Elegant navy and gold on cream', 'Pastel celebration palette with warm white'],
  'Illustrations and Clipart': ['Bold primary red-blue-yellow with black outline', 'Soft pastel with gentle gradient on white', 'Vibrant saturated palette with clean white negative space'],
  'Industrial': ['Safety orange and dark steel grey', 'Construction yellow with clean white and dark charcoal', 'Industrial blue and warm silver with black grounding'],
  'Landscapes': ['Golden hour orange-amber with deep blue sky', 'Ocean teal with sandy cream shoreline', 'Forest green with soft morning mist blue-grey'],
  'Lifestyle': ['Warm golden morning light on cream and natural wood', 'Soft terracotta and sage green with warm linen', 'Fresh white and sky blue with warm skin tone accent'],
  'Nature': ['Sage green and cream botanical palette', 'Eucalyptus green with soft white', 'Earthy green with warm terracotta accent'],
  'Objects': ['Warm cream with natural wood brown and soft shadow', 'Clean white with minimal soft grey and metallic accent', 'Warm neutral palette with single bold color accent'],
  'People': ['Warm skin-tone palette with soft neutral background', 'Diverse vibrant palette on clean white', 'Warm earth tones with coral accent'],
  'Religion and Culture': ['Rich jewel tones — deep gold and warm red on dark', 'Ceremonial white and gold with earthy ochre', 'Peaceful calm blue and cream with gold accent'],
  'Science': ['Deep space dark with electric cyan accent', 'Clean lab white with scientific blue and green', 'Warm amber with precise dark navy and cream'],
  'Signs and Symbols': ['Bold safety red and white with black', 'Clean navigation blue and white', 'Neutral icon grey on pure white with accent color'],
  'Sports': ['Dynamic red and white with energetic black', 'Active blue and green with bold yellow', 'Performance orange and charcoal with clean white'],
  'Technology': ['Tech navy with electric cyan accents', 'Dark mode with neon blue highlights', 'Clean light theme with blue and white'],
  'Transportation': ['Clean blue and white with red accent', 'Modern grey with safety yellow', 'Navy and silver with bright orange detail'],
  'Travel': ['Warm sunset orange with teal ocean blue', 'Tropical turquoise with sand beige', 'Adventure green with mountain blue'],
};

// Helper getPaletteForCategory di-export di bawah file (line 3087).

//  GLOBAL_CGA_DATABASE (line 5809–6050)

//  CGA DATABASE V1.0 — 8 Regions, 20 Countries, 15 Religions, 50 Events

export const GLOBAL_CGA_DATABASE = (() => {
  // REGIONS (8)
  const REGIONS = {
    west_asia_mena: { id:'west_asia_mena', name:'West Asia & MENA', keywords:['middle east','arabic','levant','persian','mena','anatolia','gulf','islamic','mesopotamia','crescent'], positive_lockdown:'Authentic West Asian and Middle Eastern cultural context, regional architecture, Islamic geometric patterns', negative_exclusion:['kimono','hanbok','batik','kilt','sombrero','balinese temple','pagoda','torii gate'] },
    southeast_asia: { id:'southeast_asia', name:'Southeast Asia', keywords:['southeast asia','asean','archipelago','indochina','tropical asia'], positive_lockdown:'Authentic Southeast Asian tropical regional architecture, heritage textiles, and cultural aesthetic', negative_exclusion:['sombrero','kilt','fez','desert dunes','pagoda japanese','nordic cabin'] },
    east_asia: { id:'east_asia', name:'East Asia', keywords:['east asia','oriental','far east'], positive_lockdown:'Authentic East Asian traditional architecture, delicate brushwork aesthetic, heritage attire', negative_exclusion:['balinese temple','keffiyeh','fez','sombrero','kilt','minaret ottoman','sari','turban'] },
    south_asia: { id:'south_asia', name:'South Asia', keywords:['south asia','indian subcontinent','deshi'], positive_lockdown:'Authentic South Asian architectural motifs, vibrant textiles, festive heritage', negative_exclusion:['kimono','hanbok','sombrero','kilt','balinese temple','ottoman fez','samurai'] },
    latin_america: { id:'latin_america', name:'Latin America', keywords:['latin america','hispanic','south america','mesoamerica'], positive_lockdown:'Authentic Latin American vibrant heritage, colonial and indigenous architecture, traditional festivities', negative_exclusion:['kimono','keffiyeh','minaret','balinese temple','turban','pagoda','hanbok'] },
    western_europe: { id:'western_europe', name:'Western Europe', keywords:['western europe','european heritage','continental europe'], positive_lockdown:'Authentic Western European classic architecture, historical cobblestone aesthetic, traditional attire', negative_exclusion:['kimono','sombrero','keffiyeh','balinese temple','pagoda','sari','minaret'] },
    sub_saharan_africa: { id:'sub_saharan_africa', name:'Sub-Saharan Africa', keywords:['sub saharan africa','african heritage','west africa','east africa'], positive_lockdown:'Authentic Sub-Saharan African tribal patterns, rich organic textiles, vibrant community heritage', negative_exclusion:['kimono','sombrero','kilt','pagoda','balinese temple','samurai armor','fez'] },
    eastern_europe_nordic: { id:'eastern_europe_nordic', name:'Eastern Europe & Nordic', keywords:['eastern europe','nordic','slavic','balkan','scandinavian','baltic'], positive_lockdown:'Authentic Eastern European and Nordic folk heritage, traditional embroidery, wood architecture', negative_exclusion:['kimono','sombrero','balinese temple','keffiyeh','sari','fez'] }
  };

  // COUNTRIES (20)
  const COUNTRIES = {
    turkey: { id:'turkey', country:'Turkey', region_id:'west_asia_mena', keywords:['turkey','turkish','istanbul','ankara','ottoman','anatolia','15 temmuz','ayyildiz','turkiye','erdoğan'], identity:'Authentic Turkish cultural identity and Ottoman heritage', symbols:['Turkish flag crescent star','Anatolian floral tulip motif','Ottoman tugra calligraphic emblem','evil eye nazar','Iznik ceramic tile pattern','Crescent moon standalone icon','Whirling dervish silhouette','Ottoman star polygon geometric pattern'], architecture:['Ottoman mosque with pencil-thin minaret and central dome','Grand Bazaar vaulted stone corridors with arched ceilings','Cappadocia cave dwellings and fairy chimney rock formations','Topkapi Palace ornate gate and courtyard','Ephesus ancient marble ruins and columns','Pamukkale white travertine terraces','Anatolian village stone houses with red-tile roofs','Blue Mosque interior tiled dome ceiling','Istanbul Bosphorus wooden yali mansion waterfront','Ankara Anitkabir monumental colonnade'], overused_elements:['Bosphorus Bridge','Bosphorus bridge silhouette','Bosphorus landmark'], clothing:'Traditional Yelek vest, Salvar trousers, Ottoman caftan', colors:'Crimson red, Iznik cobalt blue, Turquoise, Antique gold', avoid:['Scottish kilt','Japanese kimono','Balinese temple','Mexican sombrero','Indian sari'] },
     indonesia: { id:'indonesia', country:'Indonesia', region_id:'southeast_asia', keywords:['indonesia','indonesian','java','bali','sunda','batik','wayang','gamelan','nusantara','jakarta'], identity:'Authentic Indonesian tropical archipelago heritage and multi-ethnic tradition', symbols:['Garuda Pancasila','Batik Parang pattern','Wayang shadow puppet','Janur coconut leaves','Songket woven fabric','Angklung bamboo instrument','Kris dagger','Tumpeng cone rice'], architecture:['Balinese candi bentar split gates','Javanese joglo wooden houses','Minangkabau rumah gadang curved roofs','Toraja tongkonan boat-shaped roofs','Borobudur stone stupa terraces','Prambanan Hindu temple spires','Dayak longhouse stilt dwellings','Jakarta colonial dutch buildings'], overused_elements:['Bali beach sunset','Kuta surf','Monas obelisk'], clothing:'Batik shirt, Kebaya dress, Songket fabric, Peci cap', colors:'Sogan brown, Deep terracotta, Emerald green, Gold accents', avoid:['Japanese kimono','Scottish kilt','Arabian keffiyeh','Mexican sombrero','Chinese qipao'] },
     japan: { id:'japan', country:'Japan', region_id:'east_asia', keywords:['japan','japanese','tokyo','kyoto','nippon','samurai','geisha','edo','sakura'], identity:'Authentic Japanese traditional visual identity and refined minimalist heritage', symbols:['Rising sun','Sakura cherry blossoms','Chrysanthemum crest','Seigaiha wave','Japanese fan sensu','Daruma doll','Maneki neko beckoning cat','Koinobori carp streamers'], architecture:['Shinto torii gates','Machiya traditional townhouses','Japanese five-story pagoda','Shoji paper sliding doors','Zen rock garden karesansui','Osaka castle stone walls','Kinkakuji golden pavilion','Ryoanji temple courtyard'], overused_elements:['Mount Fuji','Fuji mountain silhouette','Shinkansen bullet train'], clothing:'Kimono with Obi sash, Yukata robe, Hakama trousers, Geta clogs', colors:'Sakura pink, Indigo aizome, Vermilion shuro, Matcha green', avoid:['Ottoman minaret','Mexican sombrero','Indian sari','Balinese temple','Scottish kilt'] },
     south_korea: { id:'south_korea', country:'South Korea', region_id:'east_asia', keywords:['korea','korean','seoul','hanbok','joseon','hangul','k-culture','kpop'], identity:'Authentic Korean heritage and Joseon dynasty cultural aesthetic', symbols:['Taegeuk symbol','Hangul script','Mugunghwa flower','Dancheong roof painting','Korean paper hanji','Jade green celadon','Buchae fan pattern','Yeongsanjae lotus lantern'], architecture:['Hanok traditional houses with giwa tiled roofs','Gyeongbokgung palace gates','Changdeokgung secret garden','Bulguksa temple stone pagoda','Hwaseong fortress walls','Jogyesa temple courtyard','Namsan tower silhouette','Bukchon hanok village alleys'], clothing:'Hanbok with Jeogori jacket and Chima skirt, Gat horsehair hat', colors:'Obangsaek five cardinal colors, Celadon jade green', avoid:['Japanese kimono','Chinese qipao','Balinese temple','Mexican sombrero','Scottish kilt'] },
     china: { id:'china', country:'China', region_id:'east_asia', keywords:['china','chinese','beijing','shanghai','hanfu','tang dynasty','ming dynasty','forbidden city'], identity:'Authentic Chinese traditional civilization aesthetic and imperial heritage', symbols:['Oriental dragon','Fenghuang phoenix','Double happiness','Chinese knotting','Red paper lantern','Plum blossom flower','Chinese fan','Jade bi disc'], architecture:['Siheyuan courtyard houses','Forbidden City golden roofs','Chinese pavilion with curved eaves','Moon gate circular doorway','Great Wall stone battlements','Summer Palace marble bridge','Lijiang ancient canal town','Terracotta warrior columns'], overused_elements:['Great Wall of China long shot','Panda silhouette'], clothing:'Hanfu flowing robes, Qipao cheongsam, Tang suit jacket', colors:'Imperial red, Yellow gold, Jade green, Ink black', avoid:['Japanese torii gate','Balinese temple','Mexican sombrero','Scottish kilt'] },
     india: { id:'india', country:'India', region_id:'south_asia', keywords:['india','indian','delhi','mumbai','rajasthan','mughal','vedic','hindu','bollywood'], identity:'Authentic Indian heritage and rich multi-regional traditional aesthetics', symbols:['Ashoka Chakra','Lotus flower','Paisley pattern','Rangoli art','Diya lamp','Peacock feather','Henna mehndi design','Brass kalash pot'], architecture:['Mughal arches and domes','Rajasthan haveli carved balconies','Dravidian gopuram tower gateways','Stepwell baori descending stairs','Hawa Mahal honeycomb facade','Mysore palace domed roof','Kerala traditional nalukettu house','Varanasi ghat steps riverfront'], overused_elements:['Taj Mahal','Taj Mahal silhouette'], clothing:'Sari with ornate borders, Sherwani suit, Kurta Pyjama, Lehenga Choli, Turban', colors:'Saffron orange, Marigold yellow, Peacock blue, Deep magenta', avoid:['Japanese kimono','Scottish kilt','Turkish fez','Mexican sombrero'] },
     mexico: { id:'mexico', country:'Mexico', region_id:'latin_america', keywords:['mexico','mexican','mexico city','aztec','maya','oaxaca','mariachi','sombrero'], identity:'Authentic Mexican indigenous and vibrant folk culture heritage', symbols:['Eagle on nopal cactus','Calavera sugar skull','Papel picado tissue banners','Alebrijes carved creatures','Zig-zag prehispanic pattern','Marigold cempasuchil flower','Sun stone calendar disc','Quetzal feather motif'], architecture:['Colonial hacienda courtyards with arches','Mesoamerican step pyramid of Teotihuacan','Painted stucco colonial walls','Catedral Metropolitana twin towers','Maya Chichen Itza stone pyramid','Casa Luis Barragan modernist facade','Zocalo plaza arcade corridors','Oaxaca green stone church facades'], overused_elements:['Sombrero hat close-up','Tequila bottle','Cactus landscape'], clothing:'Sombrero hat, Poncho sarape, Huipil blouse, Charro suit', colors:'Rosa Mexicano pink, Marigold yellow, Cobalt blue, Lime green', avoid:['Japanese kimono','Arabian keffiyeh','Scottish kilt','Balinese temple'] },
     brazil: { id:'brazil', country:'Brazil', region_id:'latin_america', keywords:['brazil','brazilian','rio de janeiro','salvador','amazon','samba','carnival'], identity:'Authentic Brazilian tropical vitality, Afro-Brazilian heritage, festive culture', symbols:['Southern Cross constellation','Tropical macaw toucan','Copacabana wave boardwalk','Berimbau musical instrument','Samba drum pandeiro','Christ statue silhouette','Coffee bean branch','Portuguese azulejo tile pattern'], architecture:['Pelourinho colonial colorful facades','Niemeyer modernist curves of Brasilia','Sambadrome parade stadium arches','Rio colonial white churches','Amazon raised stilt houses','Salvador fort stone walls','São Paulo modernist highrises','Ouro Preto baroque church interiors'], overused_elements:['Christ the Redeemer statue','Sugarloaf mountain','Carnival feathers'], clothing:'Baiana white lace dress, Samba feather costume, Capoeira white trousers', colors:'Canary yellow, Deep Amazon green, Ocean blue, Warm terracotta', avoid:['Mexican sombrero','Japanese kimono','Arabic minaret','Scottish kilt'] },
     egypt: { id:'egypt', country:'Egypt', region_id:'west_asia_mena', keywords:['egypt','egyptian','cairo','nile','pharaoh','ancient egypt','islamic cairo'], identity:'Authentic Egyptian heritage spanning Ancient Pharaonic and Islamic Cairo traditions', symbols:['Ankh symbol of life','Eye of Horus sacred','Lotus papyrus motif','Islamic geometric star polygons','Scarab beetle','Nile felucca sail silhouette','Sphinx profile','Canopic jar shapes'], architecture:['Islamic Cairo stone domes and carved minarets','Pharaonic sandstone temple columns','Nubian vaulted mudbrick houses','Karnak hypostyle hall pillars','Abu Simbel rock-cut temple facade','Cairo Citadel of Saladin walls','Alexandria modern library sail roof','Siwa oasis mudbrick fortress'], overused_elements:['Great Pyramid of Giza','Sphinx head close-up','Cleopatra eye makeup'], clothing:'Traditional Galabeya robe, Egyptian cotton garments', colors:'Desert gold, Lapis lazuli blue, Nile turquoise, Terracotta brown', avoid:['Japanese kimono','Scottish kilt','Mexican sombrero','Balinese temple'] },
     saudi_arabia: { id:'saudi_arabia', country:'Saudi Arabia', region_id:'west_asia_mena', keywords:['saudi','saudi arabia','riyadh','jeddah','mecca','medina','najd','hejaz'], identity:'Authentic Saudi Arabian heritage, Najdi architecture, Arabian Peninsula tradition', symbols:['Two crossed swords and palm tree','Arabian falcon silhouette','Sadu geometric weaving patterns','Arabian coffee dallah pot','Incense burner mabkhara','Palm tree oasis motif','Bedouin tent stripes','Saudi green flag'], architecture:['Najdi mud-brick palaces with triangular crenellations','Jeddah rawasheen wooden lattice windows','Al-Balad merchant tower houses','Al Masmak fortress mud walls','Kingdom Centre skybridge tower','Masmak clay fortress courtyard','AlUla rock-cut tomb facades','Al-Hasa oasis irrigation canals'], clothing:'Thobe robe, Ghutra shemagh headscarf with agal cord, Abaya', colors:'Desert sand gold, Emerald green, Mahogany wood, Crisp white', avoid:['Turkish fez','Japanese kimono','Mexican sombrero','Scottish kilt'] },
     morocco: { id:'morocco', country:'Morocco', region_id:'west_asia_mena', keywords:['morocco','moroccan','marrakech','fes','chefchaouen','berber','maghreb'], identity:'Authentic Moroccan Maghrebi architecture and Moorish craftsmanship heritage', symbols:['Green five-pointed star seal','Berber Amazigh geometric symbols','Hamsa hand of Fatima','Moroccan brass lantern','Zellij mosaic tile star pattern','Leather tanneries color pools','Argan tree silhouette','Horseshoe arch motif'], architecture:['Moroccan riad courtyards with central fountain','Zellij mosaic tile walls geometric','Horseshoe Moorish arch arcades','Chefchaouen blue-washed alley walls','Hassan II mosque towering minaret','Ait Benhaddou clay ksar fortress','Marrakech medina market alleys','Fes Bou Inania madrasa carved cedar'], overused_elements:['Camel in desert','Sahara sand dunes','Marrakech Jemaa square'], clothing:'Djellaba hooded robe, Kaftan garments, Babouche slippers', colors:'Chefchaouen azure blue, Marrakech ochre red, Zellij emerald green, Saffron yellow', avoid:['Japanese kimono','Scottish kilt','Mexican sombrero','Balinese temple'] },
     united_kingdom: { id:'united_kingdom', country:'United Kingdom', region_id:'western_europe', keywords:['uk','united kingdom','britain','british','london','english','victorian'], identity:'Authentic British heritage, classic architecture, traditional iconography', symbols:['Union Jack flag motif','Tudor rose emblem','Crown jewels iconography','Royal crown silhouette','British lion passant','Guardsman bearskin hat','Double-decker bus outline','Phone box red silhouette'], architecture:['Victorian red-brick terraced townhouses','Gothic revival Parliament with clock tower','Georgian stone crescent terraces','Tudor half-timbered country cottages','Westminster Abbey Gothic arches','Edinburgh castle stone battlements','Bath Georgian crescent row','Cotswold limestone village houses'], clothing:'Tailored tweed suits, Bowler hats, Trench coats, Barbour jackets', colors:'Royal red, Navy blue, British racing green, Warm oak brown', avoid:['Japanese kimono','Arabian keffiyeh','Mexican sombrero','Balinese temple'] },
     scotland: { id:'scotland', country:'Scotland', region_id:'western_europe', keywords:['scotland','scottish','edinburgh','highlands','celtic','kilt','tartan'], identity:'Authentic Scottish Gaelic cultural heritage and Highland tradition', symbols:['Thistle flower emblem','Saltire Saint Andrew cross','Celtic interlocking knots','Tartan plaid pattern','Loch Ness silhouette','Bagpipes chanter','Heather sprig','Rampant lion crest'], architecture:['Highland stone castle battlements','Scottish baronial tower houses','Stone croft thatched cottages','Edinburgh castle rock facade','Stirling castle ramparts','Eilean Donan island castle','Glasgow Victorian sandstone tenements','Isle of Skye stone bothy'], clothing:'Kilt in authentic tartan, Sporran pouch, Ghillie brogues, Tam o Shanter', colors:'Highland heather purple, Tartan forest green, Deep navy, Granite grey', avoid:['Turkish fez','Japanese kimono','Mexican sombrero','Balinese temple'] },
     france: { id:'france', country:'France', region_id:'western_europe', keywords:['france','french','paris','provence','gallic','haute couture'], identity:'Authentic French classical elegance, Parisian architecture, provincial heritage', symbols:['Fleur-de-lis royal emblem','Gallic rooster silhouette','Tricolour stripes','French perfume bottle','Baguette long loaf','Croissant crescent shape','Moulin rouge windmill','Chanel camellia flower'], architecture:['Haussmannian Parisian apartment facades with iron balconies','Loire Valley Renaissance chateaux','Provencal limestone stone cottages','Eiffel Tower iron lattice arches','Mont Saint-Michel island abbey','Versailles Hall of Mirrors','Avignon papal palace stone walls','Carcassonne medieval fortress ramparts'], overused_elements:['Eiffel Tower close-up','Mona Lisa silhouette'], clothing:'Classic beret hat, Breton striped shirt, Haute couture fashion', colors:'French blue, Creamy white, Bordeaux red, Lavender purple', avoid:['Japanese kimono','Mexican sombrero','Scottish kilt','Balinese temple'] },
     italy: { id:'italy', country:'Italy', region_id:'western_europe', keywords:['italy','italian','rome','venice','florence','tuscany','renaissance'], identity:'Authentic Italian historical Renaissance art, coastal Mediterranean, Roman heritage', symbols:['Roman laurel wreath crown','Venetian winged lion','Italian tricolor accent','Pizza margherita round','Venetian carnival mask shape','Olive branch','Gelato swirl','Romanesque arch motif'], architecture:['Classical Roman arches and terracotta tile roofs','Venetian gothic palaces on canal','Tuscan farmhouse stone villa','Colosseum elliptical stone tiers','Duomo marble ribbed dome','Pisa leaning tower cylinder','Cinque Terre colorful cliff houses','Siena brick piazza del campo'], overused_elements:['Colosseum full shot','Leaning Tower of Pisa','Venetian gondola'], clothing:'Tailored Italian suits, Venetian carnival masks, Leather artisan wear', colors:'Terracotta orange, Tuscan cypress green, Venetian crimson, Marble beige', avoid:['Japanese kimono','Arabian keffiyeh','Mexican sombrero','Balinese temple'] },
     spain: { id:'spain', country:'Spain', region_id:'western_europe', keywords:['spain','spanish','madrid','barcelona','andalusia','flamenco','moorish'], identity:'Authentic Spanish Iberian heritage, Andalusian traditions, passionate arts', symbols:['Spanish fan abanico folding','Flamenco dancer silhouette','Iberian bull emblem','Castanet percussion pair','Paella round pan','Tiled azulejo geometric pattern','Gothic rose window star','Alhambra arabesque star pattern'], architecture:['Andalusian white pueblo villages','Mudejar brick arch arcades','Spanish tiled courtyard patio','Sagrada Familia gothic towers','Alhambra Nasrid palace arches','Mezquita striped arch columns','Plaza Mayor arcaded square','Montserrat mountain monastery'], overused_elements:['Bullfighting matador','Sagrada Familia silhouette'], clothing:'Flamenco traje de flamenca dress, Cordobes hat, Manilla shawl', colors:'Spanish red, Sunburst yellow, Olive green, Warm terracotta', avoid:['Japanese kimono','Scottish kilt','Balinese temple','Arabian keffiyeh'] },
     germany: { id:'germany', country:'Germany', region_id:'western_europe', keywords:['germany','german','bavaria','berlin','munich','black forest','alpine'], identity:'Authentic German engineering, Bavarian folklore, Central European heritage', symbols:['Federal eagle coat of arms','Oak leaves heraldry','Alpine edelweiss flower','Pretzel knot shape','Beer stein with lid','Cuckoo clock pendulums','Christmas pyramid star','Brandenburg gate quadriga'], architecture:['Fachwerk half-timbered alpine houses','Neuschwanstein romantic castle towers','Brick gothic guildhall stepped gables','Brandenburg Gate column portico','Cologne Cathedral twin spires','Reichstag glass dome','Rothenburg medieval walled street','Black Forest farmhouse wide eaves'], overused_elements:['Brandenburg Gate centered','Beer mug Oktoberfest close-up'], clothing:'Bavarian lederhosen, Dirndl dress, Alpine trachten hat', colors:'Bavarian sky blue, Forest green, Warm timber brown, Gold accents', avoid:['Japanese kimono','Mexican sombrero','Arabian keffiyeh','Balinese temple'] },
     greece: { id:'greece', country:'Greece', region_id:'western_europe', keywords:['greece','greek','athens','santorini','hellenic','aegean','olympus'], identity:'Authentic Hellenic classical heritage and Aegean island aesthetic', symbols:['Greek key meander border pattern','Olive branch crown wreath','Aegean blue sea cross','Fleur de lis antique scroll','Greek column ionic capital','Phoenix bird rebirth','Dolphin leaping wave','Amphora clay vase shape'], architecture:['Doric and Ionic marble temple colonnade','Santorini whitewashed domed houses','Cycladic blue-domed white chapel','Parthenon Doric stone columns','Meteora monastery rock peaks','Mykonos windmill white cylinder','Thessaloniki Byzantine arch','Knossos Minoan fresco columns'], overused_elements:['Parthenon full shot','Santorini blue dome postcard','Mykonos windmill'], clothing:'Classical chiton drape attire, Fustanella pleated skirt uniform', colors:'Aegean sea blue, Whitewashed alabaster, Olive green, Terracotta', avoid:['Japanese kimono','Scottish kilt','Mexican sombrero','Balinese temple'] },
     nigeria: { id:'nigeria', country:'Nigeria', region_id:'sub_saharan_africa', keywords:['nigeria','nigerian','lagos','yoruba','igbo','hausa','nollywood'], identity:'Authentic Nigerian multi-ethnic majesty, West African textiles, royal regalia', symbols:['Yoruba beaded crown conical','Eagle feather Igbo chieftaincy','Arewa northern knot geometric','Ankara wax print floral pattern','Calabash gourd vessel','Talking drum hourglass shape','Masquerade raffia costume','Bronze Ife head sculpture'], architecture:['Hausa mud-relief ornamented facades','Yoruba palace carved courtyard','Lagos modern concrete highrises','Benin moat earthwork walls','Tiv traditional round huts','Kanuri mud mosque minaret','Ibibio timber meeting houses','Zaria city gate arches'], clothing:'Gele headwrap, Agbada flowing robe, Iro and Buba, Ankara wax fabric', colors:'Emerald green, Royal purple, Burnt orange, Rich gold', avoid:['Japanese kimono','Scottish kilt','Mexican sombrero','Balinese temple'] },
     thailand: { id:'thailand', country:'Thailand', region_id:'southeast_asia', keywords:['thailand','thai','bangkok','siam','chiang mai','lanna','ayutthaya'], identity:'Authentic Thai Siamese cultural heritage, Buddhist art, ornate royal aesthetics', symbols:['Thai elephant rearing','Kanok flame ornamental pattern','Suphannahong royal barge','Gold lotus bud silhouette','Floating krathong lotus cup','Thai silk ikat pattern','Phra mae thorani earth goddess','Erawan three-headed elephant'], architecture:['Thai temple gables with chofah finials','Wooden stilt traditional houses','Lanna tiered roof temple','Grand Palace golden spires','Wat Arun prang tower','Ayutthaya brick prang ruins','Floating market wooden canoe row','Jim Thompson teak house stilts'], overused_elements:['Wat Pho reclining Buddha','Floating market longtail boat'], clothing:'Chut Thai dress, Sabai shawl, Chong kraben trousers', colors:'Thai temple gold, Crimson red, Emerald green, Royal purple', avoid:['Japanese torii gate','Arabian keffiyeh','Scottish kilt','Mexican sombrero'] },
    // TIER 2 COUNTRIES (20)
    vietnam: { id:'vietnam', country:'Vietnam', region_id:'southeast_asia', keywords:['vietnam','vietnamese','hanoi','saigon','ho chi minh city','hue','mekong'], identity:'Authentic Vietnamese heritage blending Southeast Asian and Confucian-influenced tradition', symbols:['Lotus flower national emblem','Vietnamese dragon (Long) motif','Non la conical hat silhouette','Bronze Dong Son drum pattern','Bamboo leaf motif','Vietnamese red star emblem','Water puppet figure motif','Rice stalk wreath motif','Vietnamese lantern silhouette (Hoi An style)','Areca palm and betel leaf motif'], architecture:['Hoi An ancient town lantern-lit shophouse','Hue imperial citadel gate','Mekong Delta stilt house on water','Vietnamese pagoda with curved tiled roof','Hanoi Old Quarter tube house facade','Terraced rice paddy hillside (Sapa style)','Halong Bay limestone karst silhouette','French colonial villa facade (Hanoi/Saigon)','Vietnamese communal house (Dinh) stilted hall','Cao Dai temple ornate facade'], overused_elements:['Halong Bay as default backdrop for every prompt'], clothing:'Non la conical hat, Ao dai tunic', colors:'Lotus pink, Jade green, Lacquer red, Warm bamboo gold', avoid:['Chinese hanfu','Thai temple naga','Khmer Angkor motif','Japanese torii'] },
    philippines: { id:'philippines', country:'Philippines', region_id:'southeast_asia', keywords:['philippines','filipino','manila','cebu','tagalog','luzon','visayas'], identity:'Authentic Filipino heritage blending indigenous, Spanish colonial, and Southeast Asian maritime tradition', symbols:['Philippine sun and stars emblem','Sampaguita flower motif','Jeepney decorative pattern','Banig woven mat pattern','Filipino sun rays (Araw) motif','Capiz shell window pattern','Parol Christmas star lantern motif','T\'nalak woven cloth pattern (Mindanao)','Tribal Cordillera tattoo motif','Rice terrace contour motif'], architecture:['Bahay Kubo nipa hut on stilts','Vigan Spanish colonial cobblestone street facade','Banaue rice terrace stepped hillside','Bahay na Bato colonial townhouse with capiz windows','Chocolate Hills rolling mound landscape','Filipino Catholic baroque church facade','Ifugao stilted wooden hut','Palawan limestone lagoon cliffside','Manila Intramuros stone fort wall','Mindanao mosque with layered roof (Maranao style)'], overused_elements:['Chocolate Hills as default backdrop for every prompt'], clothing:'Barong Tagalog, Filipiniana dress', colors:'Tropical sun gold, Ocean turquoise, Sampaguita white, Terracotta brown', avoid:['Chinese pagoda','Japanese torii','Balinese temple','Mexican sombrero'] },
    pakistan: { id:'pakistan', country:'Pakistan', region_id:'south_asia', keywords:['pakistan','pakistani','karachi','lahore','islamabad','punjab','sindh'], identity:'Authentic Pakistani heritage blending Mughal, Islamic, and South Asian regional tradition', symbols:['Star and crescent national emblem','Truck art floral pattern','Sindhi Ajrak block-print pattern','Mughal jali lattice pattern','Pakistani embroidery mirror-work (Sindh) motif','Peacock throne-inspired motif','Kashmiri paisley shawl pattern','Balochi embroidery geometric motif','Rickshaw decorative art motif','Wheat stalk and crescent emblem'], architecture:['Badshahi Mosque red sandstone facade','Lahore Fort Mughal gate','Mohenjo-daro ancient brick ruins','Sindhi mudbrick village dome roof','Islamabad Faisal Mosque triangular silhouette','Punjabi haveli carved wooden balcony','Hunza Valley stone terraced village','Multan blue-tiled shrine dome','Karachi colonial-era stone building facade','Khyber mountain pass stone fort'], overused_elements:['Badshahi Mosque as default backdrop for every prompt'], clothing:'Shalwar kameez, Dupatta', colors:'Mughal emerald green, Sandstone red, Lapis blue, Marigold gold', avoid:['Hindu temple deity','Japanese kimono','Latin American motif','Christian cross'] },
    iran: { id:'iran', country:'Iran', region_id:'west_asia_mena', keywords:['iran','iranian','persia','persian','tehran','isfahan','shiraz'], identity:'Authentic Persian heritage with pre-Islamic and Islamic architectural and artistic tradition', symbols:['Persian rosette (Shamsa) motif','Faravahar ancient Persian emblem','Persian carpet medallion pattern','Persepolis relief motif','Persian nightingale and rose (Gol-o-Bolbol) motif','Persian calligraphy (Nastaliq) accent','Simurgh mythical bird motif','Persian tile arabesque pattern','Miniature painting border motif','Persian lion and sun emblem (historic)'], architecture:['Isfahan turquoise-tiled mosque dome','Persepolis column ruins','Persian garden (Bagh) with central water channel','Yazd wind-catcher (Badgir) tower','Shiraz mirror-mosaic mosque interior','Persian caravanserai courtyard','Tehran Azadi Tower silhouette','Kashan traditional courtyard house','Naqsh-e Jahan Square arcade','Zoroastrian fire temple facade'], overused_elements:['Isfahan mosque dome as default backdrop for every prompt'], clothing:'Persian robe, Chador, Traditional manteau', colors:'Persian turquoise, Deep royal blue, Saffron gold, Rose pink', avoid:['Arabian Bedouin tent','Ottoman tugra','South Asian sari','East Asian pagoda'] },
    poland: { id:'poland', country:'Poland', region_id:'western_europe', keywords:['poland','polish','warsaw','krakow','gdansk','wroclaw'], identity:'Authentic Polish heritage with Central European folk and historic urban tradition', symbols:['White eagle national emblem','Polish folk paper cutout (Wycinanki) pattern','Lowicz floral folk pattern','Amber jewelry motif','Polish folk ribbon headdress motif','Krakow dragon (Wawel) motif','Polish folk embroidery floral motif','Cornflower (Chabry) motif','Highlander (Goral) geometric pattern','Christmas oplatek wafer motif'], architecture:['Krakow Main Square cloth hall facade','Warsaw Old Town colorful row houses','Malbork Castle red-brick gothic fortress','Gdansk Hanseatic merchant house facade','Wawel Castle hilltop silhouette','Polish wooden church (Zakopane style)','Zamosc Renaissance arcaded square','Wroclaw gothic town hall spire','Tatra mountain highlander wooden hut','Polish countryside thatched cottage'], overused_elements:['Krakow Main Square as default backdrop for every prompt'], clothing:'Folk floral dress, Highlander wool trousers', colors:'Polish red and white, Amber gold, Forest green, Cornflower blue', avoid:['Scandinavian rune motif','Balkan Ottoman motif','Russian onion dome','Western Mediterranean tile'] },
    russia: { id:'russia', country:'Russia', region_id:'western_europe', keywords:['russia','russian','moscow','saint petersburg','siberia','kremlin'], identity:'Authentic Russian heritage with Slavic folk, Orthodox, and imperial architectural tradition', symbols:['Matryoshka nesting doll motif','Firebird (Zhar-ptitsa) folklore motif','Khokhloma floral lacquer pattern','Russian double-headed eagle emblem','Gzhel blue-and-white porcelain pattern','Ushanka fur hat silhouette','Pavlovo Posad floral shawl pattern','Balalaika instrument silhouette','Russian folk kokoshnik headdress motif','Snowflake ornamental pattern'], architecture:['Saint Basil\'s colorful onion-domed spires','Moscow Kremlin red-brick wall and tower','Russian wooden izba cottage with carved trim','Saint Petersburg pastel baroque palace facade','Siberian log cabin village','Orthodox church golden onion dome','Suzdal white-stone monastery wall','Trans-Siberian railway station facade','Novgorod kremlin fortress tower','Russian dacha countryside wooden house'], overused_elements:['Saint Basil\'s Cathedral as default backdrop for every prompt'], clothing:'Ushanka fur hat, Kokoshnik headdress, Sarafan dress', colors:'Imperial gold, Onion-dome teal, Deep crimson, Birch white', avoid:['Western European gothic spire','Islamic minaret','East Asian pagoda','Scandinavian rune motif'] },
    netherlands: { id:'netherlands', country:'Netherlands', region_id:'western_europe', keywords:['netherlands','dutch','amsterdam','holland','rotterdam'], identity:'Authentic Dutch heritage with maritime, agrarian, and Golden Age artistic tradition', symbols:['Tulip flower motif','Delft blue pottery pattern','Dutch windmill sail motif','Wooden clog (Klompen) silhouette','Dutch lion crest motif','Bicycle silhouette motif','Cheese wheel stack motif','Dutch gable pattern accent','Orange (House of Orange) ribbon motif','Herring and canal boat motif'], architecture:['Amsterdam canal house with stepped gable','Dutch windmill on polder landscape','Zaanse Schans wooden green house cluster','Delft canal bridge and brick facade','Keukenhof tulip field rows','Dutch farmhouse thatched roof barn','Rotterdam modernist cube house silhouette','Utrecht canal-level wharf cellar (Werf)','Dutch polder dike and canal landscape','Giethoorn thatched cottage waterway village'], overused_elements:['Windmill and tulip field cliche as default backdrop for every prompt'], clothing:'Traditional Dutch cap, Klompen wooden clogs', colors:'Delft blue, Tulip orange-red, Windmill white, Canal green', avoid:['Scandinavian rune motif','German Bavarian lederhosen','French fleur-de-lis','Mediterranean tile'] },
    portugal: { id:'portugal', country:'Portugal', region_id:'western_europe', keywords:['portugal','portuguese','lisbon','porto','algarve'], identity:'Authentic Portuguese heritage with maritime exploration and Azulejo tile artistic tradition', symbols:['Azulejo blue-and-white tile pattern','Portuguese caravel ship motif','Rooster of Barcelos (Galo de Barcelos) motif','Manueline maritime rope-carving motif','Portuguese armillary sphere emblem','Fado guitar silhouette','Cork oak leaf motif','Filigree heart (Coracao Vianes) motif','Portuguese wave pavement (Calcada) pattern','Sardine and cork motif'], architecture:['Lisbon Alfama tiled facade alley','Porto riverside Ribeira colorful house row','Manueline monastery ornate portal (Belem style)','Sintra romantic palace turret','Algarve whitewashed chimney village house','Portuguese azulejo-tiled train station interior','Lisbon tram-lined cobblestone hill street','Coastal fortress (Belem Tower style)','Douro Valley terraced vineyard hillside','Portuguese windmill on coastal cliff'], overused_elements:['Azulejo tile wall as default backdrop for every single prompt'], clothing:'Traditional folk dress, Nazare fisherwoman attire', colors:'Azulejo blue, Terracotta roof red, Whitewashed white, Golden sand', avoid:['Spanish flamenco motif','Moroccan zellij','French fleur-de-lis','Dutch tulip'] },
    argentina: { id:'argentina', country:'Argentina', region_id:'latin_america', keywords:['argentina','argentine','buenos aires','patagonia','tango'], identity:'Authentic Argentine heritage with gaucho, tango, and European-immigrant-influenced tradition', symbols:['Sun of May (Sol de Mayo) national emblem','Tango dancer silhouette','Gaucho facon knife motif','Mate gourd and bombilla motif','Argentine pampas grass motif','Bandoneon accordion silhouette','Argentine polo mallet motif','Boca-style colorful house pattern (La Boca)','Gaucho boleadoras motif','Patagonian condor motif'], architecture:['Buenos Aires La Boca colorful corrugated house','Recoleta cemetery ornate mausoleum facade','Pampas estancia ranch house','Patagonia stone shepherd hut','Buenos Aires Art Nouveau building facade','Mendoza vineyard hacienda','Ushuaia end-of-world wooden port house','Cordoba colonial Jesuit block facade','Iguazu falls jungle overlook structure','Tango milonga ballroom interior'], overused_elements:['Tango dancer in Buenos Aires street as default cliche'], clothing:'Gaucho bombacha trousers, Poncho', colors:'Pampas gold, Tango crimson, Sky blue (Argentine flag), Leather brown', avoid:['Mexican sombrero','Brazilian carnival feather','Andean textile pattern (Peru-specific)','Spanish flamenco'] },
    colombia: { id:'colombia', country:'Colombia', region_id:'latin_america', keywords:['colombia','colombian','bogota','medellin','cartagena'], identity:'Authentic Colombian heritage blending Andean, Caribbean, and Spanish colonial tradition', symbols:['Colombian condor national emblem','Wayuu mochila bag pattern','Colombian emerald motif','Cumbia dancer silhouette','Coffee bean and branch motif','Colombian sombrero vueltiao pattern','Vallenato accordion motif','Flower parade (Feria de las Flores) motif','Golden Muisca raft (Balsa Muisca) motif','Colombian macaw feather motif'], architecture:['Cartagena colonial walled city colorful facade','Bogota La Candelaria colonial balcony street','Coffee region (Eje Cafetero) hillside farmhouse','Medellin cable car over hillside barrio','Colombian church colonial bell tower','Guatape colorful zocalo relief house','Caribbean coast palafito stilt house','Andean highland stone church','Salt Cathedral of Zipaquira underground hall','Amazon riverside wooden village house'], overused_elements:['Cartagena colorful colonial street as default cliche'], clothing:'Wayuu mochila bag, Sombrero vueltiao hat', colors:'Emerald green, Coffee brown, Caribbean turquoise, Vibrant flower pink', avoid:['Mexican mariachi','Peruvian Inca motif','Brazilian samba feather','Argentine gaucho'] },
    peru: { id:'peru', country:'Peru', region_id:'latin_america', keywords:['peru','peruvian','lima','cusco','machu picchu','andes','inca'], identity:'Authentic Peruvian heritage blending Andean Inca and Spanish colonial tradition', symbols:['Inca sun god (Inti) emblem','Andean textile geometric pattern','Peruvian condor motif','Chakana Andean cross motif','Quipu knotted cord motif','Llama and alpaca wool motif','Peruvian pan flute (Zampona) silhouette','Nazca lines geometric motif','Peruvian gold mask (Sican style) motif','Coca leaf motif'], architecture:['Machu Picchu terraced stone citadel','Cusco Inca stone-wall alley (Sacsayhuaman style)','Andean adobe village with thatched roof','Lima colonial balcony facade','Sacred Valley terraced hillside farm','Lake Titicaca reed island hut (Uros style)','Peruvian colonial church baroque facade','Arequipa white volcanic-stone building','Andean mountain pass stone bridge','Nazca desert plateau geoglyph terrain'], overused_elements:['Machu Picchu as default backdrop for every single prompt'], clothing:'Andean chullo hat, Poncho, Manta shawl', colors:'Andean rainbow textile hues, Inca gold, Terracotta clay, Highland turquoise', avoid:['Mexican Aztec motif','Colombian Wayuu pattern','Brazilian carnival feather','Argentine gaucho'] },
    kenya: { id:'kenya', country:'Kenya', region_id:'sub_saharan_africa', keywords:['kenya','kenyan','nairobi','maasai','mombasa','safari'], identity:'Authentic Kenyan heritage blending Maasai, Swahili coastal, and East African savanna tradition', symbols:['Maasai shield and spear emblem','Maasai beaded collar (Isikolio) motif','Kenyan flag shield motif','Kikoy woven cloth pattern','Swahili door carving motif','Acacia tree silhouette motif','Maasai shuka checkered pattern','Kenyan Rungu club motif','East African basket (Kiondo) weave pattern','Savanna wildlife silhouette motif (giraffe/zebra pattern)'], architecture:['Maasai manyatta circular mud hut','Lamu Swahili stone town carved door facade','Nairobi savanna acacia horizon skyline','Coastal Swahili coral-stone house','Kenyan highland tea plantation terrace','Mombasa Old Town Arab-Swahili balcony house','Rift Valley escarpment landscape structure','Kikuyu homestead thatched roundhouse','Fort Jesus Portuguese coastal fortress','East African market (Soko) open-air stall'], overused_elements:['safari wildlife scene as default backdrop for every cultural prompt'], clothing:'Maasai shuka checkered cloth, Kikoy garment', colors:'Savanna ochre, Maasai red, Acacia green, Coastal turquoise', avoid:['West African Kente pattern','North African Berber motif','Ethiopian cross motif','Nigerian Ankara pattern'] },
    ethiopia: { id:'ethiopia', country:'Ethiopia', region_id:'sub_saharan_africa', keywords:['ethiopia','ethiopian','addis ababa','lalibela','amhara','oromo'], identity:'Authentic Ethiopian heritage with ancient Orthodox Christian and Horn of Africa tradition', symbols:['Ethiopian Orthodox cross motif','Lion of Judah emblem','Habesha kemis embroidery border motif','Coffee ceremony jebena pot motif','Ethiopian calendar star motif','Meskel daisy flower motif','Ge\'ez script calligraphic accent','Ethiopian shield and spear motif','Injera basket (Mesob) weave pattern','Ethiopian highland cross pendant motif'], architecture:['Lalibela rock-hewn church facade','Ethiopian Orthodox round church with conical roof','Axum ancient obelisk (Stelae) silhouette','Gondar castle fortress wall (Fasil Ghebbi style)','Ethiopian highland stone terrace village','Addis Ababa hillside tin-roof house cluster','Harar walled old city gate','Ethiopian coffee ceremony straw-mat courtyard','Simien mountain stone shepherd hut','Blue Nile Falls gorge landscape structure'], overused_elements:['Lalibela rock church as default backdrop for every single prompt'], clothing:'Habesha kemis embroidery dress, Netela shawl', colors:'Ethiopian green-yellow-red, Coffee brown, Highland ochre, Orthodox gold', avoid:['West African Kente pattern','Maasai beadwork','North African Berber motif','Egyptian pharaonic motif'] },
    south_africa: { id:'south_africa', country:'South Africa', region_id:'sub_saharan_africa', keywords:['south africa','south african','cape town','johannesburg','zulu','xhosa'], identity:'Authentic South African heritage blending Zulu, Xhosa, Ndebele, and Cape Dutch colonial tradition', symbols:['South African protea flower national emblem','Ndebele geometric wall-painting pattern','Zulu beadwork geometric pattern','Xhosa beaded necklace motif','Springbok antelope emblem','Zulu shield and knobkierie motif','South African flag ribbon motif','Basotho blanket stripe pattern','Cape Malay floral tile pattern','African drum (Djembe-style) silhouette'], architecture:['Ndebele house with geometric painted facade','Cape Dutch gabled white farmhouse','Zulu beehive hut (iQukwane) cluster','Cape Town Bo-Kaap colorful row house','Johannesburg mining headframe silhouette','Table Mountain flat-top backdrop structure','Xhosa rondavel thatched roundhouse','Cape Winelands colonial estate facade','Zulu royal kraal circular enclosure','Karoo semi-desert stone farmhouse'], overused_elements:['Table Mountain as default backdrop for every single prompt'], clothing:'Ndebele beaded attire, Zulu ceremonial dress', colors:'Protea pink-cream, Ndebele primary color blocks, Karoo ochre, Cape wine burgundy', avoid:['West African Ankara pattern','East African Maasai shuka','North African Berber motif','Ethiopian cross'] },
    israel: { id:'israel', country:'Israel', region_id:'west_asia_mena', keywords:['israel','israeli','jerusalem','tel aviv','hebrew'], identity:'Authentic Israeli heritage blending ancient Jewish tradition and modern Levantine culture', symbols:['Star of David national emblem','Menorah seven-branch motif','Pomegranate fruit motif','Olive branch peace motif','Hebrew calligraphy accent','Israeli desert wildflower (Anemone) motif','Jerusalem stone texture motif','Israeli folk dance (Hora circle) motif','Dead Sea salt crystal motif','Sabra cactus fruit motif'], architecture:['Jerusalem Old City stone alley facade','Western Wall limestone block wall','Tel Aviv White City Bauhaus building facade','Galilee hillside stone village','Israeli desert kibbutz modest architecture','Jaffa ancient port stone archway','Masada cliffside fortress ruins','Dead Sea shoreline salt-crusted landscape','Negev desert stone terrace agriculture','Modern Jerusalem light rail bridge (Chords Bridge style)'], overused_elements:['Western Wall as default backdrop for every single prompt'], clothing:'Kippah, Tallit, Traditional Jewish attire', colors:'Jerusalem stone gold, Mediterranean blue, Olive green, Desert sand', avoid:['Islamic Ottoman minaret','Christian Orthodox onion dome','Arabian Bedouin tent pattern','Egyptian pharaonic motif'] },
    united_arab_emirates: { id:'united_arab_emirates', country:'United Arab Emirates', region_id:'west_asia_mena', keywords:['uae','emirati','dubai','abu dhabi','sharjah','emirates'], identity:'Authentic Emirati heritage blending Bedouin desert tradition and modern Gulf architectural innovation', symbols:['Emirati falcon national emblem','Arabian oryx motif','Sadu Bedouin weaving pattern','Emirati pearl-diving motif','Dallah coffee pot motif','Date palm frond motif','Khanjar dagger silhouette','Emirati geometric mashrabiya pattern','UAE flag ribbon motif','Desert sand dune wave motif'], architecture:['Traditional Emirati wind-tower (Barjeel) house','Dubai modern skyline silhouette','Abu Dhabi Sheikh Zayed mosque dome and minaret','Bedouin desert tent (Bayt al-Sha\'ar) camp','Al Fahidi historic mashrabiya courtyard','Emirati fort (Al Jahili style) mudbrick wall','Dubai Creek traditional dhow harbor','Liwa desert oasis palm grove','Sharjah heritage souq archway','Emirati falconry desert camp scene'], overused_elements:['Dubai modern skyscraper skyline as default backdrop for every cultural prompt'], clothing:'Emirati kandura robe, Ghutra headscarf', colors:'Desert gold, Gulf turquoise, Falcon brown, Palm green', avoid:['Turkish fez','Persian Faravahar motif','South Asian sari','East Asian pagoda'] },
    iraq: { id:'iraq', country:'Iraq', region_id:'west_asia_mena', keywords:['iraq','iraqi','baghdad','mesopotamia','babylon','basra'], identity:'Authentic Iraqi heritage rooted in ancient Mesopotamian civilization and Arab tradition', symbols:['Mesopotamian ziggurat step-pyramid motif','Ancient cuneiform script accent','Ishtar Gate lion relief motif','Iraqi palm frond motif','Babylonian winged bull (Lamassu) motif','Iraqi geometric star pattern','Tigris-Euphrates river wave motif','Iraqi oud instrument silhouette','Marsh reed boat (Mashoof) motif','Iraqi calligraphy arabesque accent'], architecture:['Babylon ziggurat step-pyramid ruins','Baghdad Abbasid-era arched gate','Iraqi marsh reed house (Mudhif)','Ur ancient ziggurat silhouette','Basra date-palm riverside courtyard house','Samarra spiral minaret (Malwiya style)','Iraqi mosque blue-tiled dome','Mesopotamian mudbrick city wall ruins','Kurdish mountain stone village (northern Iraq)','Tigris riverside traditional courtyard house'], overused_elements:['Ishtar Gate as default backdrop for every single prompt'], clothing:'Iraqi dishdasha robe, Traditional headwear', colors:'Mesopotamian clay ochre, Tigris river blue, Date palm green, Ancient gold', avoid:['Turkish Ottoman tugra','Persian Faravahar motif','Egyptian pharaonic ankh','South Asian motif'] },
    bangladesh: { id:'bangladesh', country:'Bangladesh', region_id:'south_asia', keywords:['bangladesh','bangladeshi','dhaka','bengal','chittagong'], identity:'Authentic Bangladeshi heritage rooted in Bengali river-delta and folk artistic tradition', symbols:['Bengali water lily national emblem','Nakshi kantha embroidery pattern','Bangladeshi rickshaw art motif','Royal Bengal tiger motif','Bengali terracotta temple relief motif','Jamdani weave pattern','Bangladeshi boat (Nouka) silhouette','Bengali alpona floor-art pattern','Hilsa fish motif','Bengali folk musical instrument (Ektara) silhouette'], architecture:['Sundarbans mangrove riverside stilt house','Dhaka Mughal-era pink palace (Ahsan Manzil style)','Bengali terracotta temple relief facade','Bangladeshi rural thatched-roof homestead','Sixty Dome Mosque (Bagerhat style) facade','Bengali river delta boat dock','Chittagong hill-tract bamboo house','Old Dhaka colonial-era balcony facade','Bengal rice paddy field with palm trees','Bangladeshi village pond-side courtyard house'], overused_elements:['rickshaw art as default backdrop for every single prompt'], clothing:'Jamdani saree, Bengali panjabi kurta', colors:'Bengal green, Jamdani white-gold, Terracotta red, River delta blue', avoid:['North Indian Mughal motif overload','Pakistani truck-art pattern','Sri Lankan Kandyan motif','Thai temple naga'] },
    sri_lanka: { id:'sri_lanka', country:'Sri Lanka', region_id:'south_asia', keywords:['sri lanka','sri lankan','colombo','kandy','ceylon','sinhala'], identity:'Authentic Sri Lankan heritage blending Sinhalese Buddhist and Tamil Hindu coastal-island tradition', symbols:['Sri Lankan lion national emblem','Kandyan dancer headdress motif','Sri Lankan lotus motif','Ceylon tea leaf motif','Sri Lankan mask (Raksha) motif','Batik elephant pattern','Sri Lankan moonstone (Sandakada Pahana) carving motif','Cinnamon quill motif','Sri Lankan stilt fisherman silhouette','Kandyan drum (Geta Bera) motif'], architecture:['Kandy Temple of the Tooth ornate facade','Sigiriya rock fortress silhouette','Sri Lankan stilt fisherman coastal platform','Colombo colonial Dutch-fort rampart','Buddhist stupa (Dagoba) white dome','Sri Lankan tea plantation hillside terrace','Galle Fort colonial rampart wall','Sinhalese village thatched-roof house','Ancient Anuradhapura stone pillar ruins','Kandyan royal palace courtyard'], overused_elements:['Sigiriya rock fortress as default backdrop for every single prompt'], clothing:'Kandyan sari, Traditional Lankan attire', colors:'Ceylon tea green, Kandyan gold, Coastal turquoise, Cinnamon brown', avoid:['Thai temple naga motif','Indian Mughal jali pattern','Balinese candi motif','Bangladeshi Jamdani pattern'] },
    malaysia: { id:'malaysia', country:'Malaysia', region_id:'southeast_asia', keywords:['malaysia','malaysian','kuala lumpur','penang','melaka','borneo malaysia'], identity:'Authentic Malaysian heritage blending Malay, Chinese, Indian, and Bornean indigenous tradition', symbols:['Hibiscus (Bunga Raya) national flower emblem','Songket gold-thread weave pattern','Wau bulan (moon kite) motif','Malaysian batik floral pattern','Malay keris dagger silhouette','Peranakan tile pattern','Bornean tribal beadwork motif (Iban/Kadazan)','Malaysian congkak game board motif','Malay silver filigree (Perak) motif','Orangutan and rainforest leaf motif'], architecture:['Malay kampung house on stilts with carved eaves','Melaka Peranakan shophouse facade','Penang colonial clan-jetty stilt house','Kuala Lumpur Moorish-revival railway station facade','Sarawak longhouse (Bornean indigenous) structure','Malay mosque with layered pyramidal roof','Georgetown heritage shophouse row','Cameron Highlands tea plantation terrace','Malaysian royal palace (Istana) gate','Sabah stilt village over water'], overused_elements:['Petronas Towers as default backdrop for every cultural prompt'], clothing:'Songket kain, Baju Melayu, Peranakan kebaya', colors:'Songket gold, Hibiscus red, Peranakan turquoise, Rainforest green', avoid:['Indonesian Javanese Joglo motif','Thai temple naga','Chinese pagoda overload','Indian South Asian sari'] }
  };

  // RELIGIONS (15)
  const RELIGIONS = {
    islam: { id:'islam', name:'Islam', keywords:['islam','islamic','muslim','mosque','ramadan','eid','halal','quran','crescent'], global_elements:['Minaret towers','Dome roof structure','Islamic geometric patterns','Arabesque decorations','Calligraphic panels'], architecture_motifs:'Horseshoe arches, muqarnas vaulting, courtyard fountain', attire:'Modest attire, hijab, abaya, thobe, kufi cap', forbidden_elements:['Statues idols','Crosses','Hindu deities','Alcohol bottles'], regional_variations:{ turkey:'Ottoman pencil minarets large blue domes', indonesia:'Southeast Asian multi-tiered pyramid roofs', middle_east:'Arabian sand-colored domes', morocco:'Square tile-adorned minarets' } },
    christianity: { id:'christianity', name:'Christianity', keywords:['christian','christianity','church','cathedral','gospel','bible','cross'], global_elements:['Latin cross','Stained glass arched windows','Bell tower','Altar with candles'], architecture_motifs:'Nave transept floor plan, vaulted ceilings, rose windows', attire:'Clerical collar, modest choir robes', forbidden_elements:['Islamic crescent','Hindu deities','Pagan pentagrams'], regional_variations:{ western_europe:'Gothic stone cathedrals with flying buttresses', latin_america:'Baroque colonial white churches with golden retablos' } },
    catholicism: { id:'catholicism', name:'Catholic Christianity', keywords:['catholic','catholicism','vatican','pope','mass','rosary','basilica'], global_elements:['Crucifix with corpus','Rosary beads','Votive candles','Saints statues','Virgin Mary'], architecture_motifs:'Baroque Renaissance grand basilicas, detailed side chapels', attire:'Bishop mitre vestments, sisters habit dress', forbidden_elements:['Islamic crescent','Torii gates'], regional_variations:{ italy:'Renaissance marble basilicas frescoed ceilings', mexico:'Colonial baroque with marigold flowers' } },
    orthodox: { id:'orthodox', name:'Eastern Orthodoxy', keywords:['orthodox','eastern orthodox','byzantine','iconography','patriarch'], global_elements:['Three-bar cross','Gilded icons','Iconostasis screen','Incense burners'], architecture_motifs:'Onion domes, Byzantine central domes with golden mosaics', attire:'Black cassock, Klobuk headwear', forbidden_elements:['Gothic flying buttresses','Islamic crescent'], regional_variations:{ greece:'Byzantine brick churches Aegean blue-white chapels', russia:'Multi-colored onion domes' } },
    hinduism: { id:'hinduism', name:'Hinduism', keywords:['hindu','hinduism','mandir','temple','pooja','vedic','om','diya'], global_elements:['Om symbol','Swastika sacred symbol','Diya oil lamps','Flower garlands','Rangoli art'], architecture_motifs:'Carved Shikhara towers, Mandapa pillared halls, Garbhagriha sanctum', attire:'Sari, Dhoti kurta, Tilak bindi on forehead', forbidden_elements:['Islamic crescent','Christian cross','Shoes inside sanctum'], regional_variations:{ india:'North Indian Shikhara South Indian Gopuram towers', indonesia:'Balinese Candi Bentar split gates Meru shrines' } },
    buddhism: { id:'buddhism', name:'Buddhism', keywords:['buddhism','buddhist','dharma','monk','pagoda','stupa','zen','lotus'], global_elements:['Dharmachakra wheel','Lotus flower','Buddha statue','Incense burner'], architecture_motifs:'Stupa dome, Tiered pagoda tower, Meditation courtyard', attire:'Saffron orange monastic robes, Maroon robes Tibetan', forbidden_elements:['Animal sacrifices','Islamic crescent'], regional_variations:{ thailand:'Golden pagodas ornate red-gold Thai temples', japan:'Zen rock gardens wooden minimalist pagodas', indonesia:'Borobudur stone relief stupa terraces' } },
    sikhism: { id:'sikhism', name:'Sikhism', keywords:['sikh','sikhism','gurdwara','khalsa','turban','amritsar','khanda'], global_elements:['Khanda emblem double-edged sword','Golden Temple motif','Chauri whisk'], architecture_motifs:'White marble domed gurdwara, Central pool sarovar, Fluted minarets', attire:'Sikh turban dastar, Five Ks', forbidden_elements:['Tobacco pipes','Idol worship statues'], regional_variations:{ india:'Punjabi gurdwara marble architecture' } },
    judaism: { id:'judaism', name:'Judaism', keywords:['jewish','judaism','synagogue','torah','menorah','hebrew','kosher'], global_elements:['Star of David','Seven-branched menorah','Mezuzah scroll','Torah scroll'], architecture_motifs:'Synagogue sanctuary with bimah platform and aron kodesh ark', attire:'Kippah yarmulke cap, Tallit prayer shawl, Tefillin straps', forbidden_elements:['Crucifixes','Islamic crescent'], regional_variations:{ middle_east:'Sephardic stone motifs', western_europe:'Ashkenazi classic synagogue designs' } },
    shinto: { id:'shinto', name:'Shinto Tradition', keywords:['shinto','kami','shrine','torii','jinja','miko','omikuji'], global_elements:['Vermilion torii gate','Shimenawa sacred rope','Shide paper streamers','Ema wish plaques'], architecture_motifs:'Wooden jinja shrines, raised floors, thatch bark roofs', attire:'Shinto priest white hakama robe, Miko red-white maiden attire', forbidden_elements:['Chinese dragon on torii','Minarets'], regional_variations:{ japan:'Japanese sacred forest shrines' } },
    taoism: { id:'taoism', name:'Taoism', keywords:['taoism','taoist','yin yang','bagua','immortals','feng shui'], global_elements:['Taijitu yin-yang symbol','Eight trigrams bagua','Gourd bottle','Peach immortality'], architecture_motifs:'Curved roof temples with dragon finials, Incense burners', attire:'Taoist scholar robes daopao, Black hair topknot cap', forbidden_elements:['Christian cross'], regional_variations:{ china:'Wudang mountain temple complexes' } },
    confucian: { id:'confucian', name:'Confucian Tradition', keywords:['confucian','confucianism','filial piety','scholar','academy'], global_elements:['Confucian scholar statues','Calligraphy steles','Four Books Five Classics scrolls'], architecture_motifs:'Symmetrical academy courtyards, Commemorative paifang archways', attire:'Hanfu scholar gowns wide sleeves', forbidden_elements:['Gothic elements'], regional_variations:{ china:'Beijing Confucian Temple style', south_korea:'Hanok Sungkyunkwan Academy' } },
    indigenous: { id:'indigenous', name:'Indigenous Tribal Traditions', keywords:['indigenous','tribal','shaman','ancestral','totem','native'], global_elements:['Sacred fire hearth','Ancestral totem carvings','Sun Earth water symbols'], architecture_motifs:'Organic mud wood thatch meeting houses', attire:'Handwoven tribal textiles, Natural beadwork feather ornaments', forbidden_elements:['Industrial plastic icons'], regional_variations:{ brazil:'Amazonian body paint patterns', indonesia:'Toraja Dayak ancestral wood carvings' } },
    ramadan_season: { id:'ramadan_season', name:'Ramadan Season', keywords:['ramadan','ramadan kareem','iftar','suhoor','fanous','dates fruit'], global_elements:['Crescent moon star night sky','Brass fanous lanterns','Dates and water glass','Tasbih prayer beads'], architecture_motifs:'Illuminated mosque silhouettes twilight sky', attire:'Modest festive attire', forbidden_elements:['Daytime dining scenes','Alcohol'], regional_variations:{ middle_east:'Fanous lanterns Bedouin tent seating', indonesia:'Ketupat packets Sarong wear' } },
    christmas_season: { id:'christmas_season', name:'Christmas Season', keywords:['christmas','xmas','nativity','advent','yule','festive winter'], global_elements:['Decorated pine tree','Star of Bethlehem','Garland wreaths','Nativity scene'], architecture_motifs:'Snow-dusted cozy homes chimneys, Town square markets', attire:'Warm winter festive sweaters, Santa caps', forbidden_elements:['Tropical palms unless tropical Christmas'], regional_variations:{ western_europe:'Traditional wooden Christmas market stalls', latin_america:'Las Posadas procession star pinatas' } },
    lunar_new_year: { id:'lunar_new_year', name:'Lunar New Year', keywords:['lunar new year','spring festival','chinese new year','tet','seollal'], global_elements:['Red envelopes hongbao','Red paper lanterns','Spring couplets chunlian','Plum blossom branches'], architecture_motifs:'Decorated oriental courtyards red banners', attire:'Red festive garments, Hanfu, Qipao, Hanbok', forbidden_elements:['Funeral white','Dark somber colors'], regional_variations:{ china:'Lion dance dragon dance banners', south_korea:'Hanbok family bows Tteokguk soup' } }
  };

  // EVENTS (50)
  const EVENTS = [
    // Turkey (4)
    { id:'e15_temmuz', title:'Democracy and National Unity Day', country_id:'turkey', cat:'national', keywords:['15 temmuz','july 15 turkey','democracy and national unity day','15 temmuz sehitleri'], pin:'Turkish national remembrance atmosphere with crescent-star flags, Bosphorus bridge martyrs memorial, patriotic citizens in Istanbul Ankara', nin:'Scottish kilt, Mexican mariachi, Balinese temple, Japanese kimono, Indian sari' },
    { id:'e_republic_turkey', title:'Republic Day (29 Ekim)', country_id:'turkey', cat:'national', keywords:['29 ekim','cumhuriyet bayrami','turkish republic day'], pin:'Vibrant Turkish Republic Day with crimson flags draping avenues, Anitkabir Ankara atmosphere, proud citizens', nin:'Chinese dragon, Sombrero, Balinese offerings, Kilt' },
    { id:'e_ramadan_bayram', title:'Ramazan Bayrami (Eid)', country_id:'turkey', cat:'festival', keywords:['ramazan bayrami','seker bayrami','turkish eid'], pin:'Traditional Turkish Ramazan Bayrami gathering serving lokum and baklava, tea in ince belli glasses, family hospitality', nin:'Batik pattern, Arabian desert tents, Sombrero' },
    { id:'e_victory_turkey', title:'Zafer Bayrami (Victory Day)', country_id:'turkey', cat:'national', keywords:['30 agustos','zafer bayrami','turkish victory day'], pin:'Turkish Victory Day ceremonial atmosphere, military parade flags, crisp patriotic bunting', nin:'Feathered costumes, Tropical elements, Sombrero' },
    // Indonesia (5)
    { id:'e_independence_indo', title:'Hari Kemerdekaan (17 Agustus)', country_id:'indonesia', cat:'national', keywords:['17 agustus','hari kemerdekaan indonesia','hut ri','indonesian independence'], pin:'Indonesian Independence Day with merah putih flags lining streets, Panjat Pinang bamboo pole challenge, community spirit', nin:'Turkish fez, Japanese kimono, Scottish kilt, Sombrero' },
    { id:'e_nyepi', title:'Nyepi Day of Silence', country_id:'indonesia', cat:'festival', keywords:['nyepi','bali day of silence','ogoh ogoh','balinese new year'], pin:'Balinese Nyepi eve parade with giant ogoh-ogoh demon statues, traditional udeng headwear, bamboo torches', nin:'Chinese dragon, Islamic minaret, Santa Claus, Mexican skull' },
    { id:'e_waisak', title:'Waisak at Borobudur', country_id:'indonesia', cat:'religious', keywords:['waisak','vesak borobudur','borobudur lanterns'], pin:'Magical Vesak night at Borobudur temple terrace with glowing paper lanterns floating into night sky, saffron-robed monks', nin:'Christmas tree, Sombrero, Middle eastern arches' },
    { id:'e_sekaten', title:'Sekaten Festival', country_id:'indonesia', cat:'festival', keywords:['sekaten','grebeg maulud','jogja sekaten'], pin:'Javanese royal Sekaten with Gunungan rice cone offerings, Abdi Dalem servants in Batik sarong Beskap jacket', nin:'Japanese kimono, Arab keffiyeh, Sombrero' },
    { id:'e_bali_arts', title:'Pesta Kesenian Bali', country_id:'indonesia', cat:'festival', keywords:['pesta kesenian bali','bali arts festival'], pin:'Balinese art parade with dancers in gold leaf headdresses, Gamelan musicians, frangipani flowers', nin:'Scottish kilt, Ottoman arches, Sombrero' },
    // Japan (5)
    { id:'e_hanami', title:'Hanami Cherry Blossom', country_id:'japan', cat:'seasonal', keywords:['hanami','cherry blossom festival','sakura viewing japan'], pin:'Japanese Hanami spring with blooming pink sakura, picnic mats under blossoms in Tokyo park, bento boxes', nin:'Autumn leaves, Balinese temple, Sombrero, Ottoman minaret' },
    { id:'e_obon', title:'Obon Lantern Festival', country_id:'japan', cat:'festival', keywords:['obon','bon odori','japanese lantern festival'], pin:'Japanese Obon summer evening with bon odori dance yagura tower, red lanterns, people in yukata robes', nin:'Thai floating lanterns, Mexican skull' },
    { id:'e_tanabata', title:'Tanabata Star Festival', country_id:'japan', cat:'festival', keywords:['tanabata','star festival japan','sendai tanabata'], pin:'Tanabata star festival with large paper streamers on bamboo branches, tanzaku wish papers', nin:'Balinese offerings, Turkish rugs' },
    { id:'e_gion_matsuri', title:'Gion Matsuri Kyoto', country_id:'japan', cat:'festival', keywords:['gion matsuri','kyoto festival float','yamaboko'], pin:'Grand Kyoto Gion Matsuri parade with ornate yamaboko wooden floats with tapestry, historic streets', nin:'Rio carnival feathers, Balinese ogoh-ogoh' },
    { id:'e_shogatsu', title:'Shogatsu Japanese New Year', country_id:'japan', cat:'festival', keywords:['shogatsu','japanese new year','kadomatsu','hatsumode'], pin:'Japanese New Year with kadomatsu bamboo decorations, kagami mochi rice cakes, shrine visit in kimono', nin:'Western Christmas tree, Chinese red couplets' },
    // South Korea (3)
    { id:'e_chuseok', title:'Chuseok Harvest Festival', country_id:'south_korea', cat:'festival', keywords:['chuseok','korean harvest festival','songpyeon'], pin:'Korean Chuseok family feast with songpyeon rice cakes, hanok courtyard, family in hanbok', nin:'Japanese kimono, Chinese qipao, Sombrero' },
    { id:'e_seollal', title:'Seollal Korean New Year', country_id:'south_korea', cat:'festival', keywords:['seollal','korean lunar new year','sebae'], pin:'Korean Seollal morning with family sebae bow in hanbok, serving tteokguk soup', nin:'Lion dance, Western Santa Claus' },
    { id:'e_dano', title:'Gangneung Danoje', country_id:'south_korea', cat:'festival', keywords:['dano','gangneung danoje','korean dano'], pin:'Gangneung Danoje festival with shamanic ritual dance, iris water hair washing, mask dance theater', nin:'Balinese temple, Turkish fez' },
    // China (3)
    { id:'e_mid_autumn', title:'Mid-Autumn Moon Festival', country_id:'china', cat:'festival', keywords:['mid autumn festival','mooncake festival','zhongqiu jie'], pin:'Mid-Autumn Festival with full golden moon, ornate mooncakes with tea, delicate paper lanterns', nin:'Sunflowers, Japanese torii gate' },
    { id:'e_dragon_boat', title:'Dragon Boat Festival', country_id:'china', cat:'festival', keywords:['dragon boat festival','duanwu jie','zongzi'], pin:'Dragon boat race with long wooden boats with dragon heads, oarsmen paddling, zongzi dumplings', nin:'Gondola of Venice, Outrigger canoe' },
    { id:'e_qingming', title:'Qingming Festival', country_id:'china', cat:'festival', keywords:['qingming','tomb sweeping day','spring outing china'], pin:'Serene Qingming spring landscape with green willow trees, kite flying, qingtuan rice balls', nin:'Halloween skulls, Rio carnival' },
    // India (5)
    { id:'e_diwali', title:'Diwali Festival of Lights', country_id:'india', cat:'festival', keywords:['diwali','deepavali','festival of lights india'], pin:'Diwali night with terracotta diya oil lamps illuminating courtyards, rangoli patterns, festive silk sarees', nin:'Christmas tree, Islamic minaret, Sombrero, Balinese temple' },
    { id:'e_holi', title:'Holi Festival of Colors', country_id:'india', cat:'festival', keywords:['holi','festival of colors india','gulal'], pin:'Joyful Holi with clouds of vibrant gulal powder colors, people in color-stained white kurta', nin:'Dark somber mood, Snow landscape' },
    { id:'e_navratri', title:'Navratri Garba Dance', country_id:'india', cat:'festival', keywords:['navratri','garba dance','dandiya raas'], pin:'Gujarati Navratri with dancers in flared chaniya choli, wooden dandiya sticks in circle', nin:'Flamenco dress, Samba feathers' },
    { id:'e_durga_puja', title:'Durga Puja Kolkata', country_id:'india', cat:'festival', keywords:['durga puja','kolkata puja pandal','durga idol'], pin:'Kolkata Durga Puja with elaborate pandal temple, Goddess Durga idol, dhaki drummers, women in red-bordered white sarees', nin:'Balinese ogoh-ogoh, Japanese shrine' },
    { id:'e_ganesh_chaturthi', title:'Ganesh Chaturthi', country_id:'india', cat:'festival', keywords:['ganesh chaturthi','ganpati bappa','mumbai festival'], pin:'Ganesh Chaturthi Mumbai procession with clay Lord Ganesha idol, marigold garlands, orange flags, modak sweets', nin:'Chinese dragon, Turkish fez' },
    // Mexico (4)
    { id:'e_dia_muertos', title:'Dia de los Muertos', country_id:'mexico', cat:'festival', keywords:['dia de los muertos','day of the dead mexico','ofrenda','calavera'], pin:'Mexican Day of the Dead altar with cempasuchil marigold flowers, sugar skulls, papel picado, Catrina face paint', nin:'Halloween witch hats, Scary bloody horror, Japanese torii' },
    { id:'e_cinco_mayo', title:'Cinco de Mayo', country_id:'mexico', cat:'festival', keywords:['cinco de mayo','puebla celebration'], pin:'Festive Cinco de Mayo parade with mariachi bands in charro suits, colorful Puebla dresses, Mexican flags', nin:'Spanish flamenco matador, Brazilian samba' },
    { id:'e_las_posadas', title:'Las Posadas', country_id:'mexico', cat:'festival', keywords:['las posadas','mexican christmas procession'], pin:'Las Posadas candlelit procession with children breaking star pinata, poinsettia flowers', nin:'Snowman blizzard, Balinese offering' },
    { id:'e_guelaguetza', title:'Guelaguetza Oaxaca', country_id:'mexico', cat:'festival', keywords:['guelaguetza','oaxaca indigenous festival'], pin:'Oaxacan Guelaguetza with embroidered huipil blouses, Flor de Pina dancers, pineapple props', nin:'Scottish tartan, Japanese kimono' },
    // Brazil (3)
    { id:'e_carnival_rio', title:'Rio Carnival', country_id:'brazil', cat:'festival', keywords:['rio carnival','samba parade','sambadrome brazil'], pin:'Rio Sambadrome carnival with massive parade floats, samba dancers in sequin feather costumes', nin:'Venetian carnival masks, Mexican day of dead skulls' },
    { id:'e_festa_junina', title:'Festa Junina', country_id:'brazil', cat:'festival', keywords:['festa junina','brazilian june festival','quadrilha'], pin:'Brazilian Festa Junina countryside with checkered banners, straw hats, bonfire dance quadrilha', nin:'Rio samba bikini, Halloween pumpkin' },
    { id:'e_bumba_boi', title:'Bumba Meu Boi', country_id:'brazil', cat:'festival', keywords:['bumba meu boi','maranhao folk festival'], pin:'Afro-Brazilian Bumba Meu Boi parade with embroidered bull costume, velvet tassels bells', nin:'Spanish bullfight matador' },
    // Egypt (2)
    { id:'e_sham_nessim', title:'Sham el-Nessim', country_id:'egypt', cat:'seasonal', keywords:['sham el nessim','egyptian spring festival'], pin:'Egyptian Sham el-Nessim spring picnic along Nile with painted boiled eggs, green onions, felucca sailboats', nin:'Winter snow, Halloween, Sombrero' },
    { id:'e_mawlid_egypt', title:'Mawlid an-Nabi Cairo', country_id:'egypt', cat:'festival', keywords:['mawlid cairo','moulid doll','halawet el moulid'], pin:'Islamic Cairo Mawlid with sugar doll figurines, colorful khayamiya fabric street decorations', nin:'Balinese offerings, Santa Claus' },
    // Saudi (2)
    { id:'e_saudi_national', title:'Saudi National Day', country_id:'saudi_arabia', cat:'national', keywords:['saudi national day','al yaom al watani','93 saudi national'], pin:'Saudi National Day with green illuminated Riyadh landmarks, citizens in white thobe ghutra waving flags', nin:'Turkish fez, Moroccan fez, Sombrero, Balinese temple' },
    { id:'e_hajj', title:'Hajj and Eid al-Adha', country_id:'saudi_arabia', cat:'religious', keywords:['hajj season','eid al adha saudi','makkah pilgrims'], pin:'Sacred Hajj context with white ihram garments, serene dignity, traditional hospitality', nin:'Musical carnival floats, Alcohol, Feathers' },
    // Morocco (2)
    { id:'e_throne_morocco', title:'Throne Day Morocco', country_id:'morocco', cat:'national', keywords:['throne day morocco','fete du trone'], pin:'Moroccan Throne Day with green star flags on royal palaces, horsemen in white djellaba Tbourida performance', nin:'Sombrero, Japanese kimono, Balinese temple' },
    { id:'e_imilchil', title:'Imilchil Marriage Moussem', country_id:'morocco', cat:'festival', keywords:['imilchil festival','berber marriage moussem'], pin:'Atlas Mountains Berber Imilchil festival, Amazigh women in striped handira capes, silver amber jewelry', nin:'Desert palm oasis, Turkish fez' },
    // UK (1)
    { id:'e_guy_fawkes', title:'Guy Fawkes Bonfire Night', country_id:'united_kingdom', cat:'festival', keywords:['guy fawkes night','bonfire night uk','november 5 fireworks'], pin:'British autumn Bonfire Night with glowing bonfire, fireworks over village green, children with sparklers', nin:'Tropical palm trees, Beach setting' },
    // Scotland (2)
    { id:'e_burns_night', title:'Burns Night Scotland', country_id:'scotland', cat:'festival', keywords:['burns night','robert burns supper','scottish burns night'], pin:'Scottish Burns Supper with tartan tablecloth, bagpipes, warm wooden dining room with hearth', nin:'Sombrero, Turkish fez, Balinese temple' },
    { id:'e_highland_games', title:'Scottish Highland Games', country_id:'scotland', cat:'festival', keywords:['highland games','caber toss scotland'], pin:'Scottish Highland Games in green glen, athlete tossing caber log in tartan kilt, highland dancing', nin:'Desert dunes, Japanese torii gate' },
    // France (2)
    { id:'e_bastille', title:'Bastille Day (14 Juillet)', country_id:'france', cat:'national', keywords:['bastille day','14 juillet','french national day'], pin:'Bastille Day Paris with tricolour jet smoke over Eiffel Tower, Champs-Elysees parade', nin:'Mexican mariachi, Balinese temple, Turkish fez' },
    { id:'e_fete_musique', title:'Fete de la Musique', country_id:'france', cat:'festival', keywords:['fete de la musique','paris music day'], pin:'Parisian summer street music festival, musicians in Montmartre cobble square, outdoor cafes', nin:'Rio carnival feathers, Snow landscape' },
    // Italy (2)
    { id:'e_carnevale_venezia', title:'Carnevale di Venezia', country_id:'italy', cat:'festival', keywords:['venice carnival','carnevale di venezia','venetian mask'], pin:'Venice Carnival with opulent 18th-century porcelain masks, gilded gowns, gondolas in morning mist', nin:'Rio samba bikini, Day of the dead skulls' },
    { id:'e_palio_siena', title:'Palio di Siena', country_id:'italy', cat:'festival', keywords:['palio di siena','siena horse race'], pin:'Siena Piazza del Campo with bareback horse racers in district contrade colors, heraldic silk banners', nin:'American rodeo, Modern racetrack' },
    // Spain (2)
    { id:'e_tomatina', title:'La Tomatina', country_id:'spain', cat:'festival', keywords:['la tomatina','bunol tomato fight'], pin:'La Tomatina street festival with crowds in crushed red tomatoes, white shirts stained red', nin:'Formal suits, Dry desert' },
    { id:'e_san_fermin', title:'San Fermin Running Bulls', country_id:'spain', cat:'festival', keywords:['san fermin','running of the bulls pamplona'], pin:'San Fermin Pamplona with participants in white clothes, red panuelico neckerchief and sash', nin:'Mexican sombrero, Scottish kilt' },
    // Germany (1)
    { id:'e_oktoberfest', title:'Oktoberfest Munich', country_id:'germany', cat:'festival', keywords:['oktoberfest','munich beer festival','bavarian festival'], pin:'Oktoberfest beer hall with massive steins masskrug, brass oompah band, dirndl and lederhosen', nin:'Mexican sombrero, Balinese temple, Tropical beach' },
    // Greece (1)
    { id:'e_orthodox_easter', title:'Greek Orthodox Easter', country_id:'greece', cat:'religious', keywords:['greek easter','pascha greece','red eggs greece'], pin:'Greek island Pascha with red dyed eggs, candlelit midnight church, white Aegean village', nin:'Easter bunny chocolate, Islamic minaret' },
    // Nigeria (1)
    { id:'e_durbar', title:'Durbar Festival Nigeria', country_id:'nigeria', cat:'festival', keywords:['durbar festival','nigerian durbar','hawan sallah'], pin:'Nigerian Durbar horse parade with emirs in royal regalia, ornate robes, silver swords, trumpets', nin:'Japanese kimono, Turkish fez, Mexican sombrero' },
    // Thailand (2)
    { id:'e_songkran', title:'Songkran Water Festival', country_id:'thailand', cat:'festival', keywords:['songkran','thai water festival','thai new year'], pin:'Songkran Thai New Year water festival with people splashing water, colorful floral Thai shirts', nin:'Snowy landscape, Sombrero, Turkish fez' },
    { id:'e_loy_krathong', title:'Loy Krathong Yi Peng', country_id:'thailand', cat:'festival', keywords:['loy krathong','yi peng lanterns','chiang mai lanterns'], pin:'Loy Krathong evening with floating banana leaf krathong on river, khom loi sky lanterns into night', nin:'Balinese ogoh-ogoh, Halloween skulls' }
  ];

  // CONFLICT RULES
  const CONFLICT_RULES = [
    { target:'turkey', forbidden:['kimono','hanbok','kilt','sombrero','balinese temple','sari','mariachi'], reason:'Prevents mixing Anatolian Ottoman heritage with East Asian Celtic Latin American or Arab attire' },
    { target:'indonesia', forbidden:['kimono','kilt','keffiyeh','sombrero','fez','chinese pagoda','sari','samurai armor','matador'], reason:'Ensures Nusantara aesthetics are isolated from East West Asian or European icons' },
    { target:'japan', forbidden:['ottoman minaret','balinese temple','sombrero','kilt','sari','keffiyeh','arabic calligraphy','fez'], reason:'Protects Shinto Edo architecture from Middle Eastern or South Asian elements' },
    { target:'india', forbidden:['kimono','kilt','sombrero','balinese candi bentar','turkish fez','samurai','hanbok','torii'], reason:'Keeps Vedic and Mughal motifs distinct from Far East or Latin American symbols' },
    { target:'mexico', forbidden:['kimono','keffiyeh','minaret','balinese temple','kilt','pagoda','hanbok','fez','ottoman'], reason:'Prevents Mesoamerican folk traditions blending with Asian or Middle Eastern icons' },
    { target:'scotland', forbidden:['sombrero','fez','keffiyeh','balinese temple','kimono','sari','pagoda','minaret'], reason:'Keeps Highland Gaelic heritage unpolluted by tropical or Middle Eastern items' },
    { target:'islam', forbidden:['crucifix','hindu deity statue','pagan pentagram','alcohol bottles','pork dishes'], reason:'Complies with microstock religious accuracy for commercial Islamic assets' },
    { target:'hinduism', forbidden:['islamic crescent minaret','christian cross','footwear inside sanctum'], reason:'Maintains sacred mandir iconography compliance' }
  ];

  // RESOLVER ENGINE
  function kwMatch(input, kw) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b', 'i').test(input);
  }

  function findMatch(input, db) {
    for (const item of Object.values(db) as Array<Record<string, any>>) {
      if (item.keywords && item.keywords.some(k => kwMatch(input, k))) return item;
    }
    return null;
  }

  function findEvent(input) {
    for (const ev of EVENTS) {
      if (ev.keywords.some(k => kwMatch(input, k))) return ev;
    }
    return null;
  }

  function resolveCGA(input) {
    if (!input || input.trim().length < 2) return { confidence: { should_lock_culture: false }, positive_string: '', negative_string: '' };

    const matchedEvent = findEvent(input);
    const matchedCountry = matchedEvent ? COUNTRIES[matchedEvent.country_id] : findMatch(input, COUNTRIES);
    const matchedRegion = matchedCountry ? REGIONS[matchedCountry.region_id] : findMatch(input, REGIONS);
    const matchedReligion = findMatch(input, RELIGIONS);

    const scores = [];
    if (matchedEvent) scores.push(95);
    if (matchedCountry) scores.push(90);
    if (matchedReligion) scores.push(85);
    if (matchedRegion) scores.push(70);
    const overall = scores.length ? Math.max(...scores) : 0;
    const shouldLock = overall >= 70;

    if (!shouldLock) return { confidence: { event_match: matchedEvent ? 95 : 0, country_match: matchedCountry ? 90 : 0, religion_match: matchedReligion ? 85 : 0, region_match: matchedRegion ? 70 : 0, overall_score: overall, should_lock_culture: false }, positive_string: '', negative_string: '' };

    const pos = [];
    const neg = [];

    if (matchedRegion) { pos.push(matchedRegion.positive_lockdown); neg.push(...matchedRegion.negative_exclusion); }
    if (matchedReligion) {
      pos.push(`Sacred: ${Array.isArray(matchedReligion.global_elements) ? matchedReligion.global_elements.join(', ') : matchedReligion.global_elements}`);
      if (matchedReligion.forbidden_elements) neg.push(...matchedReligion.forbidden_elements);
      if (matchedCountry && matchedReligion.regional_variations && matchedReligion.regional_variations[matchedCountry.id]) {
        pos.push(matchedReligion.regional_variations[matchedCountry.id]);
      }
    }
    if (matchedCountry) {
      pos.push(matchedCountry.identity);
      if (matchedCountry.symbols) pos.push(`Symbols: ${Array.isArray(matchedCountry.symbols) ? matchedCountry.symbols.join(', ') : matchedCountry.symbols}`);
      if (matchedCountry.architecture) pos.push(`Architecture: ${matchedCountry.architecture}`);
      if (matchedCountry.clothing) pos.push(`Attire: ${matchedCountry.clothing}`);
      if (matchedCountry.colors) pos.push(`Colors: ${matchedCountry.colors}`);
      if (matchedCountry.avoid) neg.push(...matchedCountry.avoid);
      const rule = CONFLICT_RULES.find(r => r.target === matchedCountry.id);
      if (rule) neg.push(...rule.forbidden);
    }
    if (matchedEvent) { pos.push(matchedEvent.pin); neg.push(matchedEvent.nin); }

    const uniquePos = [...new Set(pos.filter(Boolean))];
    const uniqueNeg = [...new Set(neg.filter(Boolean))];

    return {
      confidence: { event_match: matchedEvent ? 95 : 0, country_match: matchedCountry ? 90 : 0, religion_match: matchedReligion ? 85 : 0, region_match: matchedRegion ? 70 : 0, overall_score: overall, should_lock_culture: true },
      positive_string: uniquePos.join('. '),
      negative_string: uniqueNeg.join(', '),
      matched_event: matchedEvent?.id,
      matched_country: matchedCountry?.id,
      matched_religion: matchedReligion?.id,
      matched_region: matchedRegion?.id
    };
  }

  return { regions: REGIONS, countries: COUNTRIES, religions: RELIGIONS, events: EVENTS, conflict_rules: CONFLICT_RULES, resolveCGA };
})();

// ── getPaletteForCategory helper ──
export function getPaletteForCategory(categoryKey: string): string | null {
  const palettes = MARKET_PALETTES[categoryKey as keyof typeof MARKET_PALETTES];
  if (!palettes || palettes.length === 0) return null;
  return palettes[Math.floor(Math.random() * palettes.length)];
}
