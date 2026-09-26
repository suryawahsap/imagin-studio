// Icon DNA registry.
export const ICON_MASTER_NEGATIVE_PROMPT =
    'text, typography, letters, numbers, readable words, watermark, logo, brand name, trademark, ' +
    'signature, UI screenshot, interface, dashboard, diagram, labels, titles, captions, photorealism, ' +
    'realistic photography, complex background, busy composition, clutter, random decorative elements, ' +
    'excessive detail, blurry, distorted, low quality, poorly drawn, malformed shapes, broken geometry, ' +
    'inconsistent proportions, inconsistent stroke weight, inconsistent visual style, mixed icon styles, ' +
    'duplicate icons, overlapping icons, cropped icon, partially visible icon, multiple subjects in one icon, ' +
    'gradients, shadows, highlights, textures, reflections, 3D rendering, realistic lighting, excessive perspective';
export const ICON_STYLE_PRESETS = {
    black_outline: {
        label: 'Black Outline',
        hint: 'Outline tebal · konsisten · paling aman untuk stock',
        styleDNA:
            'Create a professional commercial vector icon using a strict BOLD black outline style. ' +
            'Stroke weight: heavy, confident, and IDENTICAL across every single element — the same stroke ' +
            'thickness on the outer contour, inner details, and every sub-element without exception; ' +
            'clearly readable even when the icon is shrunk to 32px thumbnail size, never a thin hairline. ' +
            'Line endings: rounded cap on open paths, smoothly closed paths on closed shapes — ' +
            'no flat butt caps, no abrupt raw endings. ' +
            'Internal detail rule: maximum 2–3 bold interior strokes per icon — each internal line must ' +
            'be structurally necessary; remove any stroke that could be omitted without losing recognizability. ' +
            'Shape language: clean simplified geometric — straight lines are ruler-straight, curves are ' +
            'smooth single-radius arcs, no organic wobble or hand-drawn character. ' +
            'Color: black stroke on white or transparent background ONLY — no colorful fills inside shapes, ' +
            'no grey tones, no multi-color palette, pure black-and-white visual system. ' +
            'Strictly flat 2D: no gradients, no drop shadows, no highlights, no ambient occlusion, ' +
            'no realistic lighting, no textures, no 3D dimensional effect of any kind. ' +
            'Quality reference: Noun Project premium icon, Feather Icons, Heroicons bold set.',
        negativeOverride: ['thin hairline stroke', 'inconsistent stroke width between elements', 'flat butt cap line ending', 'colored fill inside outline'],
    },
    black_filled: {
        label: 'Black Filled',
        hint: 'Silhouette solid · tegas · mudah terbaca di ukuran kecil',
        styleDNA:
            'Create a professional commercial vector icon using a strict black filled silhouette style. ' +
            'The entire icon is built from solid black filled shapes — the SILHOUETTE IS the icon. ' +
            'Silhouette quality: the overall outer shape must be immediately recognizable at 24px size ' +
            'from its contour alone, without any internal detail needed for identification. ' +
            'Negative space technique: use deliberate white knock-out cutouts INSIDE the black fill ' +
            'only when internal features are essential for recognition — a keyhole, a window, a screen — ' +
            'never decorative, always functional. Keep knock-outs bold and simple. ' +
            'Internal detail: extremely minimal — if the silhouette reads clearly without it, remove it. ' +
            'No more than 1–2 interior cutouts per icon. ' +
            'Shape language: bold, clean, resolved — smooth controlled curves, confident straight edges, ' +
            'no serrated edges, no rough silhouettes, no accidental notches in the outer contour. ' +
            'Color: solid black ONLY — no grey fill, no colorful fill, no gradient on any part. ' +
            'Strictly flat 2D: no shadows, no highlights, no lighting effects, no textures, no 3D effects. ' +
            'Quality reference: Font Awesome solid set, Bootstrap Icons filled, Material Icons filled.',
        negativeOverride: ['outline stroke added around silhouette', 'grey tonal fill', 'colored accent', 'complex internal detail', 'thin fragile silhouette feature'],
    },
    gradient: {
        label: 'Gradient',
        hint: 'Gradient terkontrol · modern · opsional, bukan default',
        styleDNA:
            'Create a modern commercial vector icon using a controlled contemporary gradient style. ' +
            'Gradient specification: use LINEAR gradients as the default — direction must be consistent ' +
            'across the entire icon set (top-to-bottom OR top-left-to-bottom-right — pick one and never deviate). ' +
            'Use maximum TWO colors per gradient stop: one lighter tint at the start, one deeper shade at the end — ' +
            'both from the same hue family. A third gradient stop is only allowed as a subtle midpoint of the same hue. ' +
            'Palette: choose ONE primary hue for the icon (e.g. blue, violet, coral, teal) and build the entire ' +
            'gradient within that hue — gradient start: saturated bright version, gradient end: deeper richer version. ' +
            'Never use rainbow multi-hue gradients. Never mix two unrelated hue families in one gradient. ' +
            'Shape language: clean simple geometric vector shapes — rounded corners preferred for approachability, ' +
            'smooth controlled curves, no organic hand-drawn variation. ' +
            'Outline treatment: NO outline strokes — gradient fills define the shapes entirely. ' +
            'Shapes separated by subtle color contrast or very thin 1px neutral divider only if necessary. ' +
            'Depth cue: the gradient itself provides the only sense of dimension — no shadows, no highlights, ' +
            'no ambient occlusion, no photorealistic 3D lighting beyond the gradient. ' +
            'Quality reference: Flaticon gradient icon pack, Freepik premium gradient icon set, ' +
            'iOS App Store category icon style, Streamline gradient icons.',
        negativeOverride: ['gradients', 'black outline stroke', 'flat solid fill with no gradient', 'rainbow multi-color gradient', 'two unrelated hue families in one gradient'],
    },
    hand_drawn: {
        label: 'Hand Drawn',
        hint: 'Organik · playful · khusus, jangan untuk icon teknis',
        styleDNA:
            'Create a professional commercial vector icon using a controlled hand-drawn illustration style. ' +
            'Line character: organic human-like linework with subtle controlled variation in stroke thickness — ' +
            'the line feels DRAWN by a person with a brush pen or ink liner, not traced by a machine. ' +
            'Variation is intentional and charming, never chaotic: slightly thicker on curves and corners, ' +
            'slightly thinner on straight passages — the natural pressure variation of a skilled hand. ' +
            'Absolutely avoid: unfinished construction lines, random scribbles, scratchy hatching, ' +
            'or any line that looks accidental rather than purposeful. ' +
            'Shape simplicity: despite the organic line, the icon subject must still be clearly readable ' +
            'at 48px thumbnail — keep shapes bold enough that organic line variation does not destroy legibility. ' +
            'Minimum stroke visibility rule: even the thinnest variation in the hand-drawn stroke must ' +
            'remain clearly visible at small display size — if it disappears at 48px, it is too thin. ' +
            'Color palette: warm earthy tones — terracotta, sage green, warm mustard yellow, dusty rose, ' +
            'warm navy, off-white cream — maximum 3–4 flat colors per icon, no cold grey or clinical palette. ' +
            'Fill approach: flat solid color fills inside shapes — no gradient, no texture — ' +
            'the hand-drawn character lives in the LINE, not the fill. ' +
            'Primarily flat 2D: no photorealism, no realistic lighting, no heavy drop shadow, no 3D rendering. ' +
            'Quality reference: Etsy hand-drawn icon set, Freepik doodle icon collection, ' +
            'Lisa Congdon illustration style, handmade goods packaging icon.',
        negativeOverride: ['mechanically perfect uniform stroke', 'ruler-straight geometric line', 'cold grey or neon palette', 'gradient fill', 'complex detailed interior', 'stroke so thin it disappears at small size'],
    },
    lineal_color: {
        label: 'Lineal Color',
        hint: 'Outline + warna flat · profesional · preset utama',
        styleDNA:
            'Create a professional commercial vector icon using a clean lineal color style. ' +
            'Outline rule: bold, confident, and IDENTICAL stroke weight on every single element — ' +
            'outer contour, inner details, and sub-shapes all share the same stroke width throughout the set. ' +
            'Stroke must be clearly visible at 32px thumbnail size — never a thin hairline, never a ' +
            'decorative accent line that is thinner than the structural lines. ' +
            'Fill rule: flat solid color fills ONLY inside the outlined shapes — no gradients, no tonal shading, ' +
            'no highlight color variation on any fill surface. ' +
            'Color palette: maximum 4–5 colors per icon — one neutral background (white or transparent), ' +
            'one dominant accent color for the primary shape, 1–2 supporting accent colors for secondary elements, ' +
            'black or very dark navy for all outlines. Never use more than 3 fill colors plus outline. ' +
            'Accent placement: focal element of the icon gets the strongest accent color — ' +
            'supporting elements use a secondary harmonious color — this hierarchy guides the viewer\'s eye. ' +
            'Shape language: clean geometric and organic shapes — smooth curves, parallel straight lines, ' +
            'consistent corner radius per icon. Never use sketchy, organic, or hand-drawn linework. ' +
            'Strictly flat 2D: no photorealism, no complex lighting, no drop shadows, no textures, no 3D effects. ' +
            'Quality reference: Flaticon lineal color premium set, Adobe Stock top lineal color collection, ' +
            'Google Material Symbols with color, Streamline lineal color icons.',
        negativeOverride: ['thin hairline stroke', 'inconsistent stroke weight between elements', 'gradient fill inside shape', 'tonal shading on fill surface', 'sketchy hand-drawn linework', 'more than 3 fill colors per icon'],
    },
    threed: {
        label: '3D Icon',
        hint: 'Render 3D soft · modern · cocok untuk app icon & marketplace',
        styleDNA:
            'Create a professional commercial 3D icon with a clean, modern soft clay-render style. ' +
            'Form language: smooth rounded forms and simple resolved 3D geometry — every edge is softly ' +
            'chamfered or filleted, no sharp hard corners unless the concept absolutely requires it ' +
            '(e.g. a blade icon). Geometry must remain simple and immediately readable at 64px thumbnail — ' +
            'no complex polygon meshes, no overly detailed surface features that collapse at small size. ' +
            'Lighting: soft directional key light from upper-left at approximately 45 degrees — ' +
            'this creates a bright illuminated top-left face and a gently shadowed bottom-right face. ' +
            'Add very subtle ambient occlusion in concave joints and recessed areas only — ' +
            'never heavy, never photorealistic. Lighting must be IDENTICAL across all icons in the set. ' +
            'Material: smooth matte or soft plastic appearance as the default — ' +
            'the surface absorbs light gently rather than specularly reflecting it. ' +
            'Exceptions: glass objects may show subtle transparency; metal objects may show a controlled ' +
            'soft specular highlight — but only when the concept specifically requires that material. ' +
            'Color: one primary hue per icon, with light face variant and shadow face variant of that same hue — ' +
            'maximum 2–3 hues per icon for multi-component subjects. Harmonious and saturated but not neon. ' +
            'Shadow: one single soft drop shadow directly beneath the icon — ' +
            'low opacity, small spread, zero cast shadow in any other direction. ' +
            'No flat 2D fills, no bold outlines, no cartoon cel-shading, no hard-edge comic line art. ' +
            'Quality reference: iOS app icon clay render style, Craftwork 3D icon library, ' +
            'UI8 3D icon pack, Figma Community 3D icon sets.',
        negativeOverride: ['flat 2D fills', 'bold black outline stroke', 'cartoon cel-shading', 'photorealistic complex material', 'harsh specular highlight', 'complex polygon mesh', 'cast shadow in multiple directions', 'sharp unrounded hard edge'],
    },
    flat: {
        label: 'Flat',
        hint: 'Flat fill · fleksibel · preset utama, paling aman untuk stock',
        styleDNA:
            'Create a professional commercial vector icon using a strict flat design style. ' +
            'Shape language: simple, clean, resolved geometric and organic shapes — ' +
            'smooth arcs, parallel straight lines, consistent corner radius throughout. ' +
            'No accidental jagged edges, no rough curves, no complex polygon silhouettes. ' +
            'Fill: solid flat color only — no gradients, no tonal shading, no highlight color on any surface. ' +
            'Color palette: maximum 4–5 flat colors per icon, consistent across the entire icon set. ' +
            'Choose one dominant color for the primary shape, 1–2 supporting colors for secondary elements — ' +
            'every color in the set should feel like it belongs to the same palette family. ' +
            'Outline decision — choose ONE system and apply it without exception across the entire set: ' +
            'OPTION A (no outline): shapes are defined by color contrast alone — every adjacent shape pair ' +
            'must have sufficient color contrast to read as separate without any stroke. ' +
            'OPTION B (with outline): a single uniform bold stroke weight applied to ALL elements ' +
            'in the set without exception — same weight on outer contour AND all internal shapes; ' +
            'never mix outlined and outline-free icons in the same set; ' +
            'never mix thick structural strokes with thin hairline accent strokes anywhere. ' +
            'Negative space: use deliberate empty areas within the composition to improve icon ' +
            'readability at small sizes — the white space is as intentional as the colored shapes. ' +
            'Strictly flat 2D: no gradients, no realistic shadows, no highlights, no photorealistic lighting, ' +
            'no textures, no 3D dimensional effects of any kind. ' +
            'Quality reference: Google Material Icons, Phosphor Icons, Remix Icon, Tabler Icons.',
        negativeOverride: ['inconsistent stroke weight between elements', 'mixed outline and no-outline icons in same set', 'hairline accent stroke alongside bold structural stroke', 'gradient fill', 'tonal shading on any surface', 'photorealistic material or lighting'],
    },
    glyph: {
        label: 'Glyph',
        hint: 'Simbol solid · ultra-minimal · dibaca seketika sebagai satu bentuk',
        styleDNA:
            'Create a professional commercial vector icon using a strict glyph / symbol style. ' +
            'Core principle: the icon IS a single unified symbol — it must be instantly recognisable ' +
            'as one cohesive shape even at 16px, the way a letter in a typeface is read at a glance. ' +
            'Construction: build the icon from solid filled paths only — positive shapes and deliberate ' +
            'negative-space knock-outs work together to form the symbol. ' +
            'No strokes, no outlines, no drawn lines of any kind — the entire visual is achieved through ' +
            'filled shapes and white/transparent cutouts exclusively. ' +
            'Silhouette discipline: the outer bounding silhouette must be bold and immediately descriptive — ' +
            'if covering all internal cutouts, the remaining outer shape alone should suggest the concept. ' +
            'Negative-space knock-outs: use sparingly and only when structurally necessary for recognition ' +
            '(e.g. the hole in a magnifier lens, the aperture of a camera) — never decorative. ' +
            'Reduction rule: remove every detail that is not load-bearing for recognition. ' +
            'If an element can be removed without breaking identification, remove it. ' +
            'Maximum complexity: 1–3 internal cutouts per icon; prefer fewer. ' +
            'Color: single solid color only — typically black or a single brand color. ' +
            'No multi-color palette, no color accent on sub-elements. ' +
            'Strictly flat 2D: no gradients, no shadows, no highlights, no textures, no 3D effects. ' +
            'Optical sizing: design to a consistent optical weight — icon must look the same visual weight ' +
            'as every other glyph in the set, regardless of whether its geometry is wide or tall. ' +
            'Quality reference: SF Symbols (Apple), Material Symbols filled, Phosphor Icons fill, ' +
            'Font Awesome solid, Bootstrap Icons fill — the gold standard of glyph/symbol icon systems.',
        negativeOverride: ['outline stroke of any kind', 'decorative internal detail', 'multi-color fill', 'gradient', 'shadow or highlight', 'complex polygon detail', 'thin fragile element at small size', 'mixed glyph and outline icons in same set'],
    },
    outline: {
        label: 'Outline',
        hint: 'Stroke tipis konsisten · elegan · cocok untuk UI modern',
        styleDNA:
            'Create a professional commercial vector icon using a strict outline / stroke-only style. ' +
            'Core principle: the icon is built entirely from strokes — NO filled shapes, NO solid color areas. ' +
            'Every element is defined by its line alone. ' +
            'Stroke weight: thin-to-medium, consistent, and IDENTICAL across every single path in the set — ' +
            'typically 1.5px–2px at 24px canvas size; heavier weights lose the elegance of the style. ' +
            'The stroke weight must be the same on the outer contour, inner detail lines, and every sub-element ' +
            'without exception — never a thicker structural stroke alongside a thinner accent line. ' +
            'Line endings: rounded line cap on open paths, smoothly closed paths on closed shapes — ' +
            'absolutely no flat butt caps anywhere in the set. ' +
            'Corner treatment: consistently rounded joins (round join) on all path corners — ' +
            'never sharp miter joins, never mixed sharp and rounded corners in the same set. ' +
            'Internal detail discipline: maximum 2–3 interior stroke lines per icon — each must be ' +
            'structurally necessary; remove any line that does not add essential meaning. ' +
            'Shape language: clean, precise, geometric and organic — smooth single-radius curves, ' +
            'ruler-straight lines where straight, no wobble or imprecision. ' +
            'Color: single stroke color only (typically black, dark grey, or one brand color) — ' +
            'NO fill color on any shape, NO two-tone outline, NO colored accents on sub-paths. ' +
            'Background: white or transparent — the stroke is the ONLY visual element. ' +
            'Strictly flat 2D: no gradients, no drop shadows, no glow, no highlights, no 3D effects. ' +
            'Quality reference: Feather Icons, Heroicons (outline), Lucide Icons, Tabler Icons, ' +
            'Ionicons outline set — the canonical reference for elegant thin-outline icon design.',
        negativeOverride: ['filled solid shape', 'inconsistent stroke weight', 'flat butt cap line ending', 'sharp miter corner join', 'color fill inside any shape', 'gradient stroke', 'thick heavy stroke that loses elegance', 'mixed outline weights in same set'],
    },
    duotone: {
        label: 'Duotone',
        hint: 'Dua warna kontras · depth tanpa gradient · modern & premium',
        styleDNA:
            'Create a professional commercial vector icon using a strict duotone style. ' +
            'Core principle: the entire icon uses EXACTLY two colors — one primary (darker, more saturated) ' +
            'and one secondary (lighter tint of the same hue, or a closely harmonious hue). ' +
            'No third color, no neutral grey, no black, no white fill — only the two chosen colors. ' +
            'Color system: Primary color applies to the dominant structural shapes of the icon. ' +
            'Secondary color (lighter tint, typically 30–50% opacity of the primary, or a lighter hue step) ' +
            'applies to secondary shapes, background fill areas, or decorative sub-elements — ' +
            'never randomly assigned; the two-color split must follow a clear visual logic. ' +
            'Recommended palette examples: deep blue + light sky blue; coral red + soft peach; ' +
            'forest green + mint; violet + lavender — always within the same hue family or analogous pair. ' +
            'Construction: mix of filled shapes (for solid areas) and strokes (for fine detail lines) is allowed, ' +
            'but the stroke color must strictly be one of the two palette colors — never a third. ' +
            'Stroke weight: medium, consistent across all stroked elements in the set. ' +
            'Depth technique: the two-color contrast creates the only sense of layering and depth — ' +
            'no gradients, no shadows, no highlights, no ambient occlusion. ' +
            'Shape language: clean geometric and organic shapes, smooth curves, consistent corner radius. ' +
            'Strictly flat 2D: no gradients on any shape, no drop shadows, no glow, no 3D effects. ' +
            'Set consistency: the same two colors apply to EVERY icon in the set without exception — ' +
            'never swap the palette between icons, never introduce a third color on one icon. ' +
            'Quality reference: Phosphor Icons duotone, Streamline duotone icon set, ' +
            'Heroicons duotone, Flaticon duotone collection — the definitive duotone icon standard.',
        negativeOverride: ['three or more colors', 'gradient fill', 'black or white fill as a third tone', 'drop shadow', 'inconsistent color assignment between icons', 'photorealistic lighting', 'fully monochrome single-color icon in the set'],
    },
    filled: {
        label: 'Filled',
        hint: 'Solid fill berwarna · tegas · mudah terbaca di semua ukuran',
        styleDNA:
            'Create a professional commercial vector icon using a strict filled / solid color style. ' +
            'Core principle: every shape in the icon is filled with solid color — ' +
            'the icon reads as bold, confident, and immediately legible from its filled shapes alone. ' +
            'This is the colored counterpart to the black_filled glyph style: same solid-fill discipline, ' +
            'but with a rich flat color palette instead of monochrome black. ' +
            'Construction: use solid filled shapes exclusively — no outline strokes as the primary structure. ' +
            'Shapes are separated by color contrast and/or deliberate negative space knock-outs, not by lines. ' +
            'Color palette: 2–4 flat solid colors per icon, consistent across the entire icon set. ' +
            'Choose one dominant fill color for the primary shape and 1–2 supporting fill colors for ' +
            'secondary elements — all from a harmonious palette. No random color per element. ' +
            'Negative space: use deliberate white or transparent knock-outs inside filled shapes ' +
            'when essential for recognition — the hole in a lock, the screen of a phone, the lens ring. ' +
            'Keep knock-outs purposeful and bold; never decorative or overly complex. ' +
            'Detail level: sufficient internal color-defined shapes to make the concept clear, ' +
            'but ruthlessly edited — every filled sub-shape must earn its place in the composition. ' +
            'Silhouette quality: the outer bounding silhouette of all filled shapes combined must be ' +
            'clean, bold, and readable at 24px thumbnail without relying on internal detail. ' +
            'Strictly flat 2D: no gradients, no drop shadows, no highlights, no realistic lighting, ' +
            'no textures, no 3D dimensional effects of any kind. ' +
            'Quality reference: Google Material Icons (filled variant), Phosphor Icons fill, ' +
            'Bootstrap Icons fill, Fluent UI filled icons — the reference for color-filled icon systems.',
        negativeOverride: ['outline stroke as primary structure', 'gradient fill', 'tonal shading or highlight color', 'drop shadow', 'photorealistic material', 'more than 4 colors per icon', 'inconsistent palette between icons in set', 'overly complex internal detail'],
    },
};
export const ICON_SHEET_EXTRA_NEGATIVE =
    'text labels under icons, drop shadow between icons, uneven icon sizing, mixed icon sizes, ' +
    'empty cells, icons outside grid, divider lines between cells, border frames around cells, ' +
    'decorative background behind individual icons, icons floating outside their cell';

