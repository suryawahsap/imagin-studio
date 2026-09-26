// Studio compliance engine — diekstrak dari imagin_studio.tsx baris 1183–1357.
// Pure compliance logic: preflight items, brand/IP blocklist, news-event detector,
// sensitive content detector, content safety rules.

import { METADATA_RULES } from "../registry/presets";
import { SPAM_TERMS } from "../registry/constants";

// ── PREFLIGHT_ITEMS (line 1184) ───────────────────────────────────────────
export interface PreflightItem {
  id: string;
  label: string;
  group: "content" | "legal" | "metadata";
  autoRule: (sm: any) => boolean;
}

export const PREFLIGHT_ITEMS: PreflightItem[] = [
  { id: "noText", label: "No visible text, watermarks, or typography", group: "content", autoRule: (sm) => sm.noText === true },
  { id: "noLogo", label: "No logos, brand marks, or identifiable trademarks", group: "content", autoRule: (sm) => sm.noLogo === true },
  { id: "noArtifacts", label: "No visual artifacts, blurring, or distortion", group: "content", autoRule: (sm) => sm.noArtifacts === true },
  { id: "commercial", label: "Subject is commercially relevant to selected category", group: "content", autoRule: (sm) => sm.commercial === true },
  { id: "aiDeclared", label: "Generative AI content declared (Adobe policy)", group: "legal", autoRule: (sm) => sm.aiDeclared === true },
  { id: "peopleRelease", label: "No identifiable real persons depicted", group: "legal", autoRule: (sm) => sm.peopleRelease === true },
  { id: "propRelease", label: "No identifiable private property depicted", group: "legal", autoRule: (sm) => sm.propRelease === true },
  { id: "bgMatches", label: "Background matched & applied (Auto-fixed)", group: "metadata", autoRule: (sm) => sm.backgroundVerified === true },
  {
    id: "minResolution",
    label: "Meets Adobe min resolution (≥ 4MP, sRGB)",
    group: "metadata",
    autoRule: (sm) => sm.resolutionVerified === true,
  },
  {
    id: "hasTitle",
    label: "Title is descriptive (40–200 chars, ideal 40–70, no special chars)",
    group: "metadata",
    autoRule: (sm) => {
      const t = sm.title || "";
      return t.length >= METADATA_RULES.title.MIN_LEN && t.length <= METADATA_RULES.title.HARD_MAX_LEN && !/[^a-zA-Z0-9\s]/.test(t);
    },
  },
  { id: "hasDesc", label: "Description is accurate and detailed (≥ 30 chars)", group: "metadata", autoRule: (sm) => (sm.description || "").length >= 30 },
  {
    id: "hasKeywords",
    label: `Minimum ${METADATA_RULES.keywords.MIN_COUNT} relevant keywords added`,
    group: "metadata",
    autoRule: (sm) => {
      const count = Array.isArray(sm.keywords) ? sm.keywords.length : 0;
      return count >= METADATA_RULES.keywords.MIN_COUNT && count <= METADATA_RULES.keywords.MAX_COUNT;
    },
  },
];

// ── BRAND_IP_BLOCKLIST (line 1205) ────────────────────────────────────────
export const BRAND_IP_BLOCKLIST: string[] = [
  "disney", "mickey mouse", "minnie mouse", "marvel", "avengers", "spiderman", "spider-man",
  "batman", "superman", "pokemon", "pikachu", "star wars", "harry potter", "hogwarts",
  "nike", "adidas", "puma", "coca-cola", "coca cola", "pepsi", "starbucks", "mcdonald",
  "apple inc", "iphone", "ipad", "samsung galaxy", "hello kitty", "sanrio", "spongebob",
  "minecraft", "super mario", "nintendo", "playstation", "xbox", "sonic the hedgehog",
  "frozen elsa", "barbie", "lego", "louis vuitton", "gucci", "chanel", "ferrari",
  "lamborghini", "facebook logo", "instagram logo", "twitter logo", "x logo", "google logo",
  "toyota logo", "bmw logo", "mercedes logo", "shutterstock", "getty images", "freepik",
];

// Adobe Stock generative-AI guidelines juga melarang referensi ke lembaga
// pemerintah/keamanan dalam prompt, title, atau keyword.
export const GOVERNMENT_AGENCY_BLOCKLIST: string[] = [
  "fbi", "cia", "nsa", "pentagon", "white house", "interpol", "nato",
  "united nations", "nasa", "us congress", "us senate", "scotland yard",
  "mossad", "mi6", "mi5", "kgb", "europol", "department of defense",
  "department of homeland security", "supreme court",
];

// Pola "style of X" / "inspired by X" / "in the manner of X" adalah pelanggaran
// terpisah dari daftar merek: Adobe hanya mengizinkan referensi gaya artis bila
// terverifikasi sudah bebas hak cipta.
export const ARTIST_STYLE_REFERENCE_PATTERN =
  /\b(?:style of|inspired by|in the manner of|a la|à la)\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})/g;

// Matcher dengan word-boundary — mencegah false positive dari substring.
// "cia" tidak mendeteksi "commercial", "social", "financial", dll.
// Hyphen diperlakukan sebagai pengikat: "commercial" → lolos, "CIA operation" → blok.
export function matchesBlockedTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isSingleWord = !/\s/.test(term.trim());
  const pattern = isSingleWord
    ? `(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`
    : `(?<![a-z0-9])${escaped}(?![a-z0-9])`;
  return new RegExp(pattern, "i").test(text);
}

export function checkBrandSafety(text: string): string[] {
  const raw = text || "";
  const hits: string[] = [
    ...BRAND_IP_BLOCKLIST.filter((term) => matchesBlockedTerm(raw, term)),
    ...GOVERNMENT_AGENCY_BLOCKLIST.filter((term) => matchesBlockedTerm(raw, term)),
  ];
  let match: RegExpExecArray | null;
  ARTIST_STYLE_REFERENCE_PATTERN.lastIndex = 0;
  while ((match = ARTIST_STYLE_REFERENCE_PATTERN.exec(raw)) !== null) {
    hits.push(`possible artist-style reference: "${match[0]}"`);
  }
  return hits;
}

// ── News-event & sensitive-content markers (line 1275) ────────────────────
export const NEWS_EVENT_MARKERS: string[] = [
  "breaking news", "news event", "live coverage", "press conference", "protest",
  "riot", "demonstration", "marches", "strike", "political rally", "election",
  "inauguration", "funeral", "memorial service", "prisoner", "arrest", "police raid",
  "shooting", "explosion", "crash scene", "accident scene", "natural disaster",
  "earthquake after", "hurricane damage", "flood waters", "wildfire", "evacuation",
  "refugee", "border crossing", "military conflict", "war zone", "airstrike",
  "soldier firing", "scandal", "court case", "verdict", "trial", "convicted",
  "terror attack", "hostage", "rescue operation", "search and rescue",
  "health crisis", "outbreak", "pandemic", "quarantine", "vaccination drive",
  "economic crisis", "market crash", "bank failure", "government shutdown",
  "the day of", "commemorat",
];

export const SENSITIVE_CONTENT_MARKERS: string[] = [
  "gun pointed", "pointing a gun", "weapon aimed", "blood", "gore", "corpse",
  "dead body", "severe injury", "open wound", "self-harm", "suicide", "drug use",
  "needle in arm", "smoking crack", "child abuse", "violence against",
  "hate symbol", "nazi", "swastika", "white supremacy", "terrorism",
  "graphic violence", "explicit", "nudity", "sexual",
];

// Marker tambahan yang spesifik untuk metadata (bukan prompt) supaya tidak
// false-positive pada prompt yang bersifat kreatif (mis. "protest poster illustration").
export const METADATA_NEWS_MARKERS: string[] = [
  "breaking news", "press conference", "protest", "riot", "election",
  "inauguration", "funeral of", "arrest", "shooting victim", "scandal",
  "court verdict", "convicted", "terror attack", "refugee crisis",
  "the date of", "on this day", "news report",
];

// Kategori yang secara inheren jauh dari news-event (illustration/pattern/scene
// dekoratif) — untuk menekan false-positive. Kategori berita/editorial tidak
// pernah valid untuk stock komersial.
export const NEWS_SAFE_CATEGORIES: Set<string> = new Set([
  "Holidays and Celebrations", "Backgrounds and Textures", "Patterns",
  "Objects", "Food", "Animals", "Nature", "Transportation", "Beauty and Fashion",
  "Arts", "Business", "Technology", "Science", "Industry", "Sports",
]);

// ── detectNewsEvent (line 1316) ───────────────────────────────────────────
export function detectNewsEvent(
  text: string,
  category: string = ""
): { detected: boolean; confidence: number; reference: string | null } {
  const raw = (text || "").toLowerCase();
  if (!raw) return { detected: false, confidence: 0, reference: null };
  // baseConfidence lebih rendah (0.6) untuk kategori dekoratif yang jauh dari berita.
  const baseConfidence = NEWS_SAFE_CATEGORIES.has(category) ? 0.6 : 1.0;
  let score = 0;
  let reference: string | null = null;
  for (const marker of NEWS_EVENT_MARKERS) {
    if (raw.includes(marker)) {
      score++;
      if (!reference) reference = marker;
    }
  }
  if (score === 0) return { detected: false, confidence: 0, reference: null };
  const confidence = Math.min(1, baseConfidence * (0.5 + score * 0.25));
  return { detected: confidence >= 0.6, confidence, reference };
}

// ── detectSensitiveContent (line 1335) ────────────────────────────────────
export function detectSensitiveContent(
  text: string
): { detected: boolean; category: string | null; reason: string | null } {
  const raw = (text || "").toLowerCase();
  if (!raw) return { detected: false, category: null, reason: null };
  for (const marker of SENSITIVE_CONTENT_MARKERS) {
    if (raw.includes(marker)) {
      return { detected: true, category: "sensitive", reason: marker };
    }
  }
  return { detected: false, category: null, reason: null };
}

// ── CONTENT_SAFETY_RULES (line 1352) ──────────────────────────────────────
export interface ContentSafetyRule {
  id: string;
  label: string;
}

export const CONTENT_SAFETY_RULES: ContentSafetyRule[] = [
  { id: "newsEvent", label: "No implication of a real news event or current affair (editorial only)" },
  { id: "sensitive", label: "No graphic, violent, hateful, or adult content" },
  { id: "government", label: "No government/military/agency references in title, keywords, or prompt" },
  { id: "misleading", label: "No misleading, deceptive, or fake-news-style imagery" },
];

// ── sanitizeStockTitle (line 18152) ─────────────────────────────────────────
export const sanitizeStockTitle = (title = "") => {
    let t = String(title || "").trim();

    // Strip bad prefixes
    t = t.replace(/^(flat\s+illustration\s+of|commercial\s+vector\s+graphic|flat\s+icon|black\s+outline|lineal\s+color|hand\s+drawn|ai\s+generated|3d\s+render|vector\s+graphic|stock\s+image|illustration|gradient|filled|vector|flat|image|picture)\s*[—\-–:]\s*/gi, "");
    t = t.replace(/^(flat\s+illustration\s+of|flat\s+icon|vector\s+graphic|stock\s+image|illustration|vector|icon|flat|ai\s+generated)\s+/gi, "");

    // Strip trailing background boilerplate
    t = t.replace(/\s+isolated\s+on\s+(a\s+)?(white|transparent|solid|plain|clean)\s+background\.?\s*$/gi, "");

    // Strip trailing numbers (serial IDs)
    t = t.replace(/[\s#(]*\d+[)\s]*$/g, "").trim();

    // Strip filler adjectives — hanya filler murni. "professional" sengaja
    // TIDAK dihapus: sebagai kata sifat kontekstual (Professional Workspace,
    // Professional Team) itu sah dan sesuai contoh spec workflow.
    t = t.replace(/\b(amazing|beautiful|awesome|best|high[\s-]quality|stunning|perfect|excellent|great|wonderful|fantastic|premium|elegant)\b\s*/gi, "");

    // Strip AI/stock labels
    t = t.replace(/\b(ai[\s-]?generated|generated\s+by\s+ai|ai\s+art|stock\s+image|stock\s+photo|stock\s+vector|free\s+to\s+use)\b\s*/gi, "");

    // Adobe compliance: ONLY letters, numbers, and spaces allowed
    // Strip ALL special characters: punctuation, symbols, emojis, unicode
    t = t.replace(/[^a-zA-Z0-9\s]/g, " ");

    // Collapse whitespace
    t = t.replace(/\s{2,}/g, " ").trim();

    // Enforce HARD limit (METADATA_RULES.title.HARD_MAX_LEN = 200, Adobe platform limit)
    // — truncate at word boundary. TARGET_MAX_LEN (70) adalah editorial sweet-spot untuk
    // panduan AI/UI saja; HARD_MAX_LEN = 200 agar title 75-char bagus tidak dipotong.
    const TITLE_HARD_LIMIT = METADATA_RULES.title.HARD_MAX_LEN;
    if (t.length > TITLE_HARD_LIMIT) {
        const lastSpace = t.lastIndexOf(" ", TITLE_HARD_LIMIT);
        t = t.slice(0, lastSpace > 0 ? lastSpace : TITLE_HARD_LIMIT).trim();
    }

    // Capitalize first letter
    if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);

    return t;
};

// ── validateMetadataCompliance (line 18304) ─────────────────────────────────
export const validateMetadataCompliance = ({ title = "", description = "", keywords = [] }) => {
    const issues = [];
    const titleText = String(title || "").toLowerCase();
    const descText = String(description || "").toLowerCase();
    const kwList = Array.isArray(keywords) ? keywords.map((k) => String(k || "").toLowerCase()) : [];
    // Teks gabungan untuk deteksi frasa (bukan substring tunggal).
    const allText = `${titleText} ${descText} ${kwList.join(" ")}`;

    // Brand / IP / Government agency / artist-style reference liar di metadata.
    const brandHits = checkBrandSafety(
        (Array.isArray(keywords) ? keywords.join(", ") : "") + " " + String(title || "") + " " + String(description || "")
    );
    if (brandHits.length > 0) {
        issues.push({
            severity: "critical",
            scope: ["title", "description", "keywords"],
            type: "brand_ip",
            message: `Metadata contains brand/IP/government/artist-style reference: ${[...new Set(brandHits.slice(0, 5))].join("; ")} — Adobe rejects trademark/agency references in title/keywords.`,
        });
    }

    // Newsworthy event / editorial marker di metadata.
    const newsHits = METADATA_NEWS_MARKERS.filter((m) =>
        titleText.includes(m) || descText.includes(m) || kwList.some((k) => k.includes(m)));
    if (newsHits.length > 0) {
        issues.push({
            severity: "critical",
            scope: ["title", "description", "keywords"],
            type: "news_event",
            message: `Metadata implies a real news/editorial event (${newsHits.join(", ")}) — Adobe requires commercial wording.`,
        });
    } else {
        const newsEvent = detectNewsEvent(allText);
        if (newsEvent.detected) {
            issues.push({
                severity: "review",
                scope: ["title", "description", "keywords"],
                type: "news_event",
                message: `Metadata contains possible news-event marker ("${newsEvent.reference}") — verify wording is generic commercial.`,
            });
        }
    }

    // Sensitive content di metadata.
    const sensitive = detectSensitiveContent(allText);
    if (sensitive.detected) {
        issues.push({
            severity: "critical",
            scope: ["title", "description", "keywords"],
            type: "sensitive",
            message: `Metadata contains sensitive content ("${sensitive.reason}") — blocked by Adobe Stock.`,
        });
    }

    // Spam terms (generik) di metadata.
    const spamHits = SPAM_TERMS.filter((term) => {
        const normTerm = term.toLowerCase();
        return titleText.includes(normTerm) || kwList.some((k) => k === normTerm);
    });
    if (spamHits.length > 0) {
        issues.push({
            severity: "review",
            scope: ["keywords"],
            type: "spam",
            message: `Metadata contains spam/low-value terms: ${spamHits.slice(0, 5).join(", ")}.`,
        });
    }

    const hasCritical = issues.some((i) => i.severity === "critical");

    return { issues, hasCritical, passed: issues.length === 0 };
};
