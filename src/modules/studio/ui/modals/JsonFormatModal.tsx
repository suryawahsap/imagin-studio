// JsonFormatModal — extracted dari App.tsx (renderJSONFormatModal + JSON_REFERENCE_MD +
// JSON_FORMAT_TEMPLATE). Reference markdown viewer untuk format JSON batch import,
// dengan mini markdown parser inline (h1-h3, list, table, code block, quote, hr).

import { BookOpen, Check, Copy, Download, X, Zap } from "lucide-react";
import React from "react";
import { CUSTOM_TEMPLATE_JSON } from "../../engines/import-engine";
import { useEscapeClose } from '../useEscapeClose';

// IMAGIN_JSON_REFERENCE_v2.md embedded sebagai string (offline-ready, no fetch).
// Disinkronkan dari file IMAGIN_JSON_REFERENCE_v2.md di root project.
// Update const ini ketika reference doc berubah.
const JSON_REFERENCE_MD = `# IMAGIN STUDIO — JSON Batch Reference (v2.2, Verified 2026-09-03)
> Diverifikasi dari validateImportedJSON() + resolvePromptDefaults() di engines/batch.ts + CUSTOM_TEMPLATE_JSON (import-engine.ts) + COMMERCIAL_ILLUSTRATION_STYLES + ICON_STYLE_PRESETS — sinkron dengan src/modules/studio per 2026-09-03

---

## STRUKTUR JSON YANG BENAR

\`\`\`json
{
  "batch_name": "Nama Batch (WAJIB, snake_case!)",
  "description": "Deskripsi opsional",
  "platform": "adobe_stock",
  "defaults": {
    "assetType":          "illustration",
    "style":              "Watercolor",
    "aspectRatio":        "1:1",
    "background":         "transparent",
    "outputFormat":       "PNG",
    "platformCategoryId": 9,
    "subcategory":        "Christmas & Winter",
    "highDpiSharpness":   true,
    "negativeSpace":      true,
    "faceless":           false,
    "iconMode":           false
  },
  "prompts": [
    {
      "prompt": "teks prompt — WAJIB",
      "assetType":          "illustration",
      "style":              "Watercolor",
      "aspectRatio":        "1:1",
      "background":         "transparent",
      "outputFormat":       "PNG",
      "platformCategoryId": 9,
      "subcategory":        "Christmas & Winter",
      "highDpiSharpness":   true,
      "negativeSpace":      true,
      "faceless":           false,
      "iconMode":           true,
      "iconStyle":          "lineal_color",
      "iconGenerationMode": "sheet",
      "iconQuantity":       9
    }
  ]
}
\`\`\`

### Field wajib di root level:
| Field | Type | Keterangan |
|---|---|---|
| \`batch_name\` | string | **WAJIB** — snake_case, bukan batchName |
| \`prompts\` | array | **WAJIB** — min 1, max 200 item |

### Field opsional di root level:
| Field | Type | Default | Keterangan |
|---|---|---|---|
| \`description\` | string | \`""\` | Label deskriptif batch |
| \`platform\` | string | \`"adobe_stock"\` | Platform target |
| \`defaults\` | object | \`{}\` | Nilai default untuk semua prompt |

---

## 01 · ASSET TYPE

| Value | Default Style | Default Ratio | Default BG | Default Format |
|---|---|---|---|---|
| \`"vector"\` | Flat Commercial | 4:3 | auto | PNG |
| \`"illustration"\` | Editorial Scene | 4:3 | auto | PNG |
| \`"3d"\` | 3D Product Render | 1:1 | auto | PNG |
| \`"photo"\` | Lifestyle Scene | 16:9 | scene | JPEG |

---

## 02 · STYLE PER ASSET TYPE

### vector & illustration (17 style)
\`\`\`
"Flat Commercial"       "Cute Kids & Nursery"    "Hand-Drawn Organic"
"Cute Food & Object"    "Editorial Scene"         "Flat Rounded"
"Textured Editorial"    "Seamless Pattern"         "Minimal Outline"
"Bold Filled"           "Lineal Color"            "Isometric 3D"
"Watercolor"            "Watercolor Vibrant"      "Acrylic Painterly"
"Gradient Cartoon"      "Mixed Media Collage"
\`\`\`

### 3d (4 style)
\`\`\`
"Isometric 3D"    "3D Product Render"    "3D Object"    "3D Character"
\`\`\`

### photo (6 style)
\`\`\`
"Lifestyle Scene"    "Corporate Editorial"    "Cinematic Wide Shot"
"Studio Portrait"    "Flat Lay Overhead"      "Environmental Portrait"
\`\`\`

> Style di luar daftar ini diterima sebagai **custom style** — sistem akan interpretasi sendiri (warning, bukan error).

---

## 03 · ASPECT RATIO

| Value | Nama | Cocok untuk |
|---|---|---|
| \`"4:3"\` | Standard (default) | vector, illustration umum |
| \`"1:1"\` | Square | icon, product, social media |
| \`"16:9"\` | Widescreen | photo, banner, editorial |
| \`"3:2"\` | Classic | landscape, hero image |
| \`"3:4"\` | Portrait | mobile, poster, kartu |

---

## 04 · BACKGROUND

| Value | Keterangan | Cocok untuk |
|---|---|---|
| \`"auto"\` | Smart — sistem pilih berdasarkan category | semua non-photo |
| \`"white"\` | Putih bersih | clipart komersial |
| \`"transparent"\` | Alpha channel PNG | clipart untuk desainer |
| \`"greenscreen"\` | Latar hijau | video asset |
| \`"scene"\` | Full environment | photo ONLY |

> photo + white/transparent → dipaksa sistem ke "scene" (warning, bukan error)

### Auto background per category (ketika background: "auto"):
| Hasil | Categories |
|---|---|
| white | Animals · Business · Education · Food and Drink · Health and Medicine · Illustrations and Clipart · Industrial · Objects · People · Science · Signs and Symbols · Technology |
| gradient | Abstract · Buildings and Architecture · Holidays and Celebrations · Landscapes · Lifestyle · Nature · Religion and Culture · Sports · Transportation · Travel |

> \`gradient\` di tabel = \`CATEGORY_BACKGROUND_STRATEGY → 'gradient'\` dengan \`mode:'white'\` + \`promptHint\` gradient (bukan mode file terpisah). Ada override per-subkategori di \`SUBCATEGORY_BACKGROUND_OVERRIDE\` (mis. \`Animals.Wildlife/Marine Life/Birds → gradient\`, \`Pets & Domestic → white\`, \`Business.Teamwork → gradient\`).

---

## 05 · OUTPUT FORMAT

| Value | Keterangan |
|---|---|
| \`"PNG"\` | Lossless, support alpha (default semua kecuali photo) |
| \`"JPEG"\` | Compressed, no alpha (default photo) |

> Icon mode → dikunci PNG otomatis oleh sistem.

---

## 06 · KATEGORI — DUA CARA PENULISAN

### Cara 1 — platformCategoryId (DIREKOMENDASIKAN, format baru)
\`\`\`json
"platformCategoryId": 9
\`\`\`

### Cara 2 — adobeCategory (legacy, masih valid)
\`\`\`json
"adobeCategory": "Holidays and Celebrations"
\`\`\`

### Tabel platformCategoryId → DNA Internal → Subkategori Valid

| ID | Nama Adobe Stock | DNA Internal | Subkategori Valid |
|---|---|---|---|
| 1 | Animals | Animals | Wildlife · Pets & Domestic · Farm Animals · Marine Life · Birds · Insects & Bugs |
| 2 | Buildings and Architecture | Buildings and Architecture | Cityscapes · Interior Design · Historic & Landmarks · Modern Architecture · Industrial Buildings |
| 3 | Business | Business | Finance & Banking · Technology & Digital · Teamwork & Meeting · Startup & Entrepreneurship · E-commerce & Retail · Charts & Infographics |
| 4 | Drinks | Food and Drink | Healthy Food · Fast Food · **Beverages** · Cooking & Kitchen · Bakery & Desserts |
| 5 | The Environment | Nature | Flowers & Plants · Trees & Forest · Weather & Seasons · Ecology & Environment · Geology |
| 6 | States of Mind | States of Mind | *(tidak ada subkategori)* |
| 7 | Food | Food and Drink | Healthy Food · Fast Food · Beverages · Cooking & Kitchen · **Bakery & Desserts** |
| 8 | Graphic Resources | Illustrations and Clipart | Character Design · Mascot · Seamless Pattern · Geometric Pattern · Botanical Pattern · Floral Pattern · Abstract Pattern · Textile Pattern · Icon Set · Infographic Elements |
| 9 | Hobbies and Leisure | Holidays and Celebrations | **Christmas & Winter** · New Year · Easter · Halloween · Birthday & Party · Wedding |
| 10 | Industry | Industrial | Manufacturing · Construction · Energy & Power · Mining · Logistics & Warehouse |
| 11 | Landscape | Landscapes | Mountains & Hiking · Beach & Ocean · Desert · Forest · Urban Skyline |
| 12 | Lifestyle | Lifestyle | Family & Parenting · Fitness & Sport · Fashion · Home & Living · Travel & Adventure |
| 13 | People | People | Business Person · Family · Diverse & Multicultural · Senior & Elderly · Children & Youth |
| 14 | Plants and Flowers | Nature | Flowers & Plants · Trees & Forest · Weather & Seasons · Ecology & Environment · Geology |
| 15 | Culture and Religion | Religion and Culture | Religious Symbols · Cultural Traditions · Mythology · Spiritual & Mindfulness |
| 16 | Science | Science | Physics & Chemistry · Biology & DNA · Astronomy & Space · Mathematics · Technology & AI |
| 17 | Social Issues | Social Issues | *(tidak ada subkategori)* |
| 18 | Sports | Sports | Team Sports · Individual Sports · Water Sports · Winter Sports · Fitness Equipment |
| 19 | Technology | Technology | AI & Machine Learning · Cybersecurity · Cloud Computing · Mobile & Devices · Internet of Things · Robotics |
| 20 | Transport | Transportation | Cars & Vehicles · Aviation · Maritime · Public Transport · Logistics & Delivery |
| 21 | Travel | Travel | Landmarks & Monuments · Maps & Navigation · Hotel & Accommodation · Tourism · Cultural Destinations |

---

## 07 · ICON MODE FIELDS

Wajib pasangkan: \`"iconMode": true\` + \`"iconStyle": "..."\` (keduanya atau tidak sama sekali)

### iconStyle (11 preset — ICON_STYLE_PRESETS)
| Value | Label | Keterangan |
|---|---|---|
| \`"black_outline"\` | Black Outline | Outline tebal · konsisten · paling aman untuk stock |
| \`"black_filled"\` | Black Filled | Silhouette solid · tegas · mudah terbaca di ukuran kecil |
| \`"gradient"\` | Gradient | Gradient 2-warna linear · modern · opsional |
| \`"hand_drawn"\` | Hand Drawn | Organik · playful · khusus, jangan untuk icon teknis |
| \`"lineal_color"\` | Lineal Color | Outline + warna flat · profesional · preset utama |
| \`"threed"\` | 3D Icon | Clay render 3D soft · modern · cocok untuk app icon |
| \`"flat"\` | Flat | Flat fill · fleksibel · preset utama, paling aman untuk stock |
| \`"glyph"\` | Glyph | Simbol solid · ultra-minimal · dibaca seketika sebagai satu bentuk |
| \`"outline"\` | Outline | Stroke tipis konsisten · elegan · cocok untuk UI modern |
| \`"duotone"\` | Duotone | Dua warna kontras · depth tanpa gradient · modern & premium |
| \`"filled"\` | Filled | Solid fill berwarna · tegas · mudah terbaca di semua ukuran |

### iconGenerationMode
| Value | Keterangan |
|---|---|
| \`"per_canvas"\` | 1 icon per file (default) |
| \`"sheet"\` | Grid icon dalam 1 canvas |

### iconQuantity (sheet mode)
| Value | Grid | Canvas Ratio |
|---|---|---|
| \`4\` | 2×2 | 1:1 |
| \`6\` | 3×2 | 4:3 |
| \`8\` | 4×2 | 16:9 |
| \`9\` | 3×3 | 1:1 |
| \`12\` | 4×3 | 4:3 |
| \`16\` | 4×4 | 1:1 |
| \`20\` | 5×4 | 4:3 |
| \`25\` | 5×5 | 1:1 |

---

## 08 · FLAG BOOLEAN

| Field | Default | Keterangan |
|---|---|---|
| \`highDpiSharpness\` | \`true\` (\`false\` untuk \`3d\` preset) | Sharpening ekstra |
| \`negativeSpace\` | \`true\` (\`false\` untuk \`photo\`) | Breathing room di komposisi |
| \`faceless\` | \`false\` | Paksa tanpa wajah manusia |
| \`iconMode\` | \`false\` | Mode icon (wajib + iconStyle) |

---

## 09 · CONTOH LENGKAP YANG BENAR

### Template resmi dari kode (CUSTOM_TEMPLATE_JSON):
\`\`\`json
{
  "batch_name": "My Custom Batch",
  "description": "Deskripsi batch opsional",
  "platform": "adobe_stock",
  "defaults": {
    "background": "auto",
    "outputFormat": "PNG",
    "highDpiSharpness": true,
    "negativeSpace": true,
    "faceless": false,
    "iconMode": false
  },
  "prompts": [
    {
      "prompt": "Minimalist white retro surf van with a yellow surfboard on the roof",
      "assetType": "vector",
      "platformCategoryId": 20,
      "subcategory": "Cars & Vehicles",
      "style": "Flat Commercial",
      "aspectRatio": "4:3"
    },
    {
      "prompt": "Isometric home office setup with desk, monitor, plant and coffee mug",
      "assetType": "3d",
      "platformCategoryId": 19,
      "subcategory": "Mobile & Devices",
      "style": "Isometric 3D",
      "aspectRatio": "1:1"
    },
    {
      "prompt": "Christmas icon set with simple festive holiday symbols",
      "assetType": "vector",
      "platformCategoryId": 9,
      "subcategory": "Christmas & Winter",
      "style": "Flat Commercial",
      "aspectRatio": "4:3",
      "iconMode": true,
      "iconStyle": "flat",
      "iconGenerationMode": "sheet",
      "iconQuantity": 6
    }
  ]
}
\`\`\`

---

## 10 · RULES & VALIDASI

| Rule | Keterangan |
|---|---|
| \`batch_name\` wajib | Kalau tidak ada → error, batch ditolak |
| \`prompts[].prompt\` wajib | Setiap item wajib ada field prompt |
| max 200 prompts | Lebih dari 200 → error |
| \`iconMode: true\` wajib + \`iconStyle\` | Salah satu saja → error |
| \`iconStyle\` tanpa \`iconMode\` | Warning (diabaikan) |
| \`iconGenerationMode\` tidak valid saat \`iconMode\` | Error — nilai valid: per_canvas, sheet |
| \`iconQuantity\` saat \`sheet\` | WAJIB + harus valid: 4/6/8/9/12/16/20/25 → selain itu error |
| \`photo\` + \`iconMode\` | Error — tidak kompatibel |
| \`photo\` + \`white\`/\`transparent\` BG | Warning → dipaksa ke scene |
| Prompt mengandung brand/IP terlarang | Error — checkBrandSafety menolak import |
| \`adobeCategory\` tidak valid | Error — harus exact match (per prompt & defaults) |
| \`subcategory\` tidak valid | Tidak error — fallback ke subkategori pertama kategori |
| \`platformCategoryId\` salah | Tidak error, fallback ke Business |
| Custom style (di luar daftar) | Warning — diterima, diinterpretasi sistem |
`;

// Template .json — SSOT dari CUSTOM_TEMPLATE_JSON (engines/import-engine.ts),
// sama persis dengan button "Download Template" di ImportPasteModal.
const JSON_FORMAT_TEMPLATE = JSON.stringify(CUSTOM_TEMPLATE_JSON, null, 2);

export interface JsonFormatModalProps {
  open: boolean;
  onClose: () => void;
  copied: boolean;
  onCopy: (copied: boolean) => void;
  showToast: (msg: string, type?: string) => void;
  onSwitchToPaste: (template: string) => void;
}

export default function JsonFormatModal({ open, onClose, copied, onCopy, showToast, onSwitchToPaste }: JsonFormatModalProps) {
  useEscapeClose(open, onClose);
  if (!open) return null;

  // Parser markdown inline (h1-h3, list, table, code block, inline code, bold, hr, blockquote)
  // — ringkas & deterministik, cukup untuk IMAGIN_JSON_REFERENCE_v2.md.
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const parseInline = (text: string) => {
    const out: any[] = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
      const tok = m[0];
      if (tok.startsWith('**')) out.push({ t: 'bold', v: tok.slice(2, -2) });
      else out.push({ t: 'code', v: tok.slice(1, -1) });
      last = m.index + tok.length;
    }
    if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
    return out;
  };

  const blocks: any[] = [];
  const lines = JSON_REFERENCE_MD.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ t: 'code', lang, v: codeLines.join('\n') });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ t: 'hr' });
      i++; continue;
    }

    const hm = /^(#{1,3})\s+(.+)$/.exec(line);
    if (hm) {
      const level = hm[1].length;
      const text = hm[2].trim();
      blocks.push({ t: 'h' + level, v: text, id: slugify(text) });
      i++; continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split('|').map(c => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(lines[i].split('|').map(c => c.trim()));
        i++;
      }
      blocks.push({ t: 'table', header, rows });
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ t: 'quote', v: quoteLines.join(' ') });
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ''));
        i++;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].startsWith('>') && !/^\s*-\s+/.test(lines[i]) && !lines[i].includes('|')) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) blocks.push({ t: 'p', v: paraLines.join(' ') });
  }

  const toc = blocks.filter(b => b.t === 'h1' || b.t === 'h2').map(b => ({ id: b.id, label: b.v, level: b.t }));

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (err) { return false; }
  };

  const copyText = (text: string) => {
    const markCopied = () => {
      onCopy(true);
      setTimeout(() => onCopy(false), 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => {
        if (fallbackCopy(text)) markCopied();
        else showToast('Gagal menyalin — coba Download sebagai alternatif.', 'error');
      });
    } else {
      if (fallbackCopy(text)) markCopied();
      else showToast('Gagal menyalin — coba Download sebagai alternatif.', 'error');
    }
    showToast('Disalin!', 'success');
  };

  const downloadBlob = (text: string, filename: string, mime: string) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadMd = () => {
    downloadBlob(JSON_REFERENCE_MD, 'IMAGIN_JSON_REFERENCE_v2.md', 'text/markdown');
    showToast('Reference markdown didownload!', 'success');
  };

  const handleDownloadJson = () => {
    downloadBlob(JSON_FORMAT_TEMPLATE, 'imagin_batch_template.json', 'application/json');
    showToast('Template JSON didownload!', 'success');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById('md-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="json-format-title" tabIndex={-1}
        className="max-w-5xl w-full bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)] flex-shrink-0 gap-3">
          <div className="min-w-0 flex-1">
            <h3 id="json-format-title" className="font-black text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent-blue)]" /> JSON Batch Reference
            </h3>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              Spesifikasi lengkap field JSON · disinkronkan dengan kode (v2.2)
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <button
              onClick={() => copyText(JSON_REFERENCE_MD)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                copied
                  ? 'bg-[var(--accent-green-solid)] text-white'
                  : 'bg-[var(--accent-blue-solid)] text-white hover:opacity-90'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy .md
            </button>
            <button
              onClick={handleDownloadMd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download .md
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download .json
            </button>
            <button
              onClick={() => onSwitchToPaste(JSON_FORMAT_TEMPLATE)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-all"
              title="Buka template JSON di editor paste"
            >
              <Zap className="w-3.5 h-3.5" /> Buka di Editor
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-element)] rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          <aside className="w-56 border-r border-[var(--border-color)] bg-[var(--bg-element)] overflow-y-auto custom-scrollbar p-3 flex-shrink-0 hidden md:block">
            <div className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-1">Daftar Isi</div>
            <nav className="space-y-0.5">
              {toc.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToSection(t.id)}
                  className={`w-full text-left text-[10px] font-bold rounded-lg px-2 py-1.5 transition-all hover:bg-[var(--bg-card)] hover:text-[var(--accent-blue)] ${t.level === 'h1' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] pl-5'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-w-0">
            {blocks.map((b, idx) => {
              if (b.t === 'h1') return <h1 key={idx} id={`md-${b.id}`} className="text-lg font-black text-[var(--text-primary)] mt-6 mb-3 pb-2 border-b border-[var(--border-color)] first:mt-0 scroll-mt-4">{b.v}</h1>;
              if (b.t === 'h2') return <h2 key={idx} id={`md-${b.id}`} className="text-[14px] font-black text-[var(--accent-blue)] mt-5 mb-2 scroll-mt-4">{b.v}</h2>;
              if (b.t === 'h3') return <h3 key={idx} id={`md-${b.id}`} className="text-[12px] font-black text-[var(--accent-gold)] mt-4 mb-1.5 scroll-mt-4">{b.v}</h3>;
              if (b.t === 'p') {
                const segs = parseInline(b.v);
                return (
                  <p key={idx} className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-3">
                    {segs.map((s, j) => {
                      if (s.t === 'bold') return <strong key={j} className="font-black text-[var(--text-primary)]">{s.v}</strong>;
                      if (s.t === 'code') return <code key={j} className="bg-[var(--bg-element)] px-1 py-0.5 rounded text-[10px] font-mono text-[var(--accent-gold)]">{s.v}</code>;
                      return <span key={j}>{s.v}</span>;
                    })}
                  </p>
                );
              }
              if (b.t === 'ul') {
                return (
                  <ul key={idx} className="text-[11px] text-[var(--text-secondary)] space-y-1 mb-3 pl-4 list-disc">
                    {b.items.map((it: string, j: number) => {
                      const segs = parseInline(it);
                      return (
                        <li key={j} className="leading-relaxed">
                          {segs.map((s, k) => {
                            if (s.t === 'bold') return <strong key={k} className="font-black text-[var(--text-primary)]">{s.v}</strong>;
                            if (s.t === 'code') return <code key={k} className="bg-[var(--bg-element)] px-1 py-0.5 rounded text-[10px] font-mono text-[var(--accent-gold)]">{s.v}</code>;
                            return <span key={k}>{s.v}</span>;
                          })}
                        </li>
                      );
                    })}
                  </ul>
                );
              }
              if (b.t === 'code') {
                return (
                  <pre key={idx} className="text-[10px] font-mono text-[var(--accent-green)] leading-relaxed bg-[var(--bg-element)] p-3 rounded-xl border border-[var(--border-color)] overflow-x-auto custom-scrollbar whitespace-pre mb-3">
                    {b.v}
                  </pre>
                );
              }
              if (b.t === 'quote') {
                const segs = parseInline(b.v);
                return (
                  <blockquote key={idx} className="text-[11px] text-[var(--accent-blue)] leading-relaxed border-l-2 border-[var(--accent-blue)] pl-3 mb-3 italic">
                    {segs.map((s, j) => {
                      if (s.t === 'bold') return <strong key={j} className="font-black not-italic">{s.v}</strong>;
                      if (s.t === 'code') return <code key={j} className="bg-[var(--bg-element)] px-1 py-0.5 rounded text-[10px] font-mono not-italic">{s.v}</code>;
                      return <span key={j}>{s.v}</span>;
                    })}
                  </blockquote>
                );
              }
              if (b.t === 'hr') return <hr key={idx} className="border-t border-[var(--border-color)] my-4" />;
              if (b.t === 'table') {
                return (
                  <div key={idx} className="overflow-x-auto custom-scrollbar mb-3 rounded-xl border border-[var(--border-color)]">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-[var(--bg-element)] border-b border-[var(--border-color)]">
                          {b.header.map((h: string, j: number) => (
                            <th key={j} className="text-left px-2.5 py-2 font-black text-[var(--text-secondary)] uppercase tracking-wider text-[9px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.rows.map((row: string[], r: number) => (
                          <tr key={r} className="border-b border-[var(--border-color)]/50 last:border-0 hover:bg-[var(--bg-element)]/40">
                            {row.map((cell, c) => {
                              const segs = parseInline(cell);
                              return (
                                <td key={c} className="px-2.5 py-2 text-[var(--text-secondary)] align-top">
                                  {segs.map((s, k) => {
                                    if (s.t === 'bold') return <strong key={k} className="font-black text-[var(--text-primary)]">{s.v}</strong>;
                                    if (s.t === 'code') return <code key={k} className="bg-[var(--bg-element)] px-1 py-0.5 rounded text-[9px] font-mono text-[var(--accent-gold)]">{s.v}</code>;
                                    return <span key={k}>{s.v}</span>;
                                  })}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
