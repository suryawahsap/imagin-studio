# ADOBE_STOCK_COMPLIANCE_DNA.md

> Dokumen referensi tunggal untuk arsitektur IMAGIN.
> Disusun dari audit resmi halaman-halaman Adobe Stock Contributor Help
> (helpx.adobe.com/stock/contributor), dibaca dan diverifikasi langsung — bukan asumsi.
>
> Update terakhir: berdasarkan konten Adobe per Juni 2026.
> Scope IMAGIN saat ini: **Illustration (JPEG)** dan **PNG transparan**. Vector di luar scope.

---

## 0. RINGKASAN EKSEKUTIF

Dua temuan paling kritikal yang mengubah arsitektur:

1. **Illustration WAJIB JPEG.** IMAGIN tidak boleh mengekspor hasil kategori
   "Illustration" sebagai PNG. PNG adalah kategori submission terpisah dengan
   rule teknis sendiri (transparent background wajib).
2. **Root cause penolakan aset Anda** ("Recognition technology... AI icon")
   kemungkinan besar adalah **softness/artifact** — bukan pelanggaran kebijakan
   konten. Adobe secara eksplisit mereview di zoom 100%.

---

## 1. GLOBAL RULES (berlaku untuk semua asset type)

### 1.1 Non-compliance — penyebab refusal otomatis
- Menyebut nama artis berhak cipta di prompt/title/keyword
- Konten yang mengimplikasikan kejadian nyata/newsworthy
- Menyebut nama instansi pemerintah
- Keyword/metadata tidak relevan atau spam
- Konten hateful/defamatory
- Watermark, timestamp, atau branding apa pun
- **Mislabeling GenAI checkbox** — baik lupa centang untuk konten AI, ATAUPUN
  mencentang untuk konten yang bukan AI. Dua-duanya bisa kena refusal.

### 1.2 Intellectual Property
- Logo, trademark, nama brand, kemasan produk yang bisa dikenali
- Produk komersial dengan desain khas sebagai subjek utama (mainan, fashion,
  elektronik, furniture desainer)
- Lokasi berbayar/restricted tanpa property release
- Landmark/monumen tertentu — beberapa **tidak diterima sama sekali** meski
  ada release (cek "known restrictions" list)
- Arsitektur modern dengan desain unik/recognizable sebagai fokus utama tanpa release
- Karya berhak cipta orang lain: seni, patung, street art, ilustrasi, font, elemen grafis

### 1.3 Similar Content / Distinct Submission
Ditolak jika:
- Sudut/pose berulang
- Perubahan warna atau zoom level kecil
- Variasi retouching minor
- Bulk upload tanpa diferensiasi konsep

→ Implikasi IMAGIN: **Similarity Guard** wajib membandingkan bukan cuma pixel
hash, tapi **perbedaan konsep**, bukan sekadar variasi visual permukaan.

### 1.4 Metadata (Title & Keywords)
| Item | Rule |
|---|---|
| Title length | Idealnya < 70 karakter |
| Title content | Fokus elemen visual paling penting, hindari istilah teknis/gear-heavy |
| Title larangan | Tidak boleh menyebut IP, nama artis, atau orang nyata |
| Keyword max | **49 keyword** per submission (bukan 25 — itu cuma jumlah auto-suggest) |
| Keyword order | 10 keyword pertama = bobot terbesar di search ranking |
| Keyword rule | Setiap keyword hanya boleh dipakai sekali |
| Bahasa | Satu bahasa saja per submission, harus cocok dengan setting akun |

---

## 2. ASSET-SPECIFIC RULES

### 2.1 ILLUSTRATION

**Technical:**
| Spec | Requirement |
|---|---|
| Format file | **JPEG only** |
| Color space | sRGB |
| Resolusi | Min 4MP — Maks 100MP |
| File size maks | 45MB |
| Resolusi scan/hand-drawn | Min 300 ppi |

**Restriksi teknis:** tanpa watermark, timestamp, branding. Harus sharp, bebas
artifact visual, ter-crop dengan benar.

**Legal:** model release untuk orang recognizable, property release untuk
lokasi/artwork/objek branded yang recognizable.

**Common refusal (quality):**
- Path berantakan / stroke belum selesai
- Artifact dari auto-tracing atau vectorization buruk
- Tepi bergerigi atau elemen pecah/pixelated

**GenAI Illustration — wajib:**
1. Centang checkbox Generative AI saat submit
2. Tidak ada embedded text, watermark tanda tangan, atau inkonsistensi model
3. Requirement teknis & legal sama seperti illustration tradisional
4. **Dilarang** meniru gaya artis lain atau pakai prompt terkait IP dunia nyata
5. Pelanggaran → risiko **content removal atau account termination** (bukan cuma refusal)

### 2.2 PNG (transparent)

**Technical:**
| Spec | Requirement |
|---|---|
| Format file | PNG dengan transparency |
| Resolusi | 4MP — 100MP |
| File size maks | 45MB |
| Color profile | sRGB |
| Background | **Wajib none/transparan**, bukan warna solid |
| Watermark | Tidak boleh ada |

**Kualitas:**
- Clarity: bebas compression artifact
- Detail: semua data gambar asli dipertahankan
- Komposisi: minim ruang kosong berlebih di sekitar subjek
- Tanpa bingkai dekoratif
- Kualitas terjaga saat di-resize (scaling)

---

## 3. GENAI — QUALITY ISSUES YANG PALING RELEVAN UNTUK IMAGIN

Sumber: *Quality and technical issues behind content refusal* + *Common reasons
for content refusal*.

### 3.1 Sharpness & Focus (root cause paling mungkin untuk kasus Anda)
- **Cek di zoom 100%** untuk deteksi softness/blur — ini metode review Adobe,
  jadi Quality Gate IMAGIN idealnya mensimulasikan pengecekan setara
- Jika pakai motion blur, subjek utama tetap harus tajam
- Depth of field diterapkan hati-hati agar tidak mem-blur elemen penting
- Sharpening di post-processing harus proporsional — over-sharpen menciptakan
  artifact baru, bukan solusi

### 3.2 Generative AI-specific quality issues
- Ketidakakuratan anatomi atau objek cacat/malformed
- Hasil surreal atau terdistorsi
- Bayangan/kedalaman/pencahayaan yang tidak fit dengan subjek
- Render artifact

### 3.3 Final checklist sebelum submit (versi resmi Adobe)
1. Subjek utama tajam dan jelas
2. Noise & artifact minim
3. Pencahayaan, kontras, warna seimbang
4. Semua technical requirement (resolusi, format, ukuran) terpenuhi

---

## 4. ARSITEKTUR IMAGIN — REVISI FINAL

```
                         IMAGIN
                            │
                  Adobe Stock Rules
                            │
             ┌──────────────┴──────────────┐
             │                             │
        GLOBAL RULES                 ASSET RULES
             │                             │
             │              ┌──────────────┤
             │              │              │
             ▼              ▼              ▼
        GenAI Rules   Illustration       PNG
        (checkbox,    (JPEG, sRGB,   (transparent,
        no artist     4-100MP,       sRGB, 4-100MP,
        names, no     no artifact)   no bg color)
        real events)       │              │
             │              └──────┬───────┘
             │                     │
             │                 Pattern DNA
             │           (split by asset type)
             │                     │
             └─────────────────────┘
                        │
                        ▼
                QUALITY PREFLIGHT
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
       Technical     Content     Compliance
           │            │            │
      Resolution    Artifact      IP/Brand
      Sharpness     Anatomy       AI Label
      Format        Similarity    Fictional flag
      (JPEG vs PNG  Composition   Artist names
       per type)                  Govt agencies
           │            │            │
           └────────────┼────────────┘
                        ▼
              AUTO-FIX (jika bisa)
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
       PASS → Gallery           FAIL → Reject
                                     │
                               Reason + Tips
```

### 4.1 Pattern DNA — split wajib per file format & tipe
```
Pattern DNA
├── illustration.dna
│     output_format: JPEG
│     color_space: sRGB
│     min_resolution: 4MP
│     style: artistic, fantasy, tidak perlu match dunia nyata
│     anti_artifact: no auto-trace, no jagged edges
│
├── png-object.dna
│     output_format: PNG (transparent)
│     background: none (transparent wajib)
│     composition: minimal excess space
│
└── png-icon.dna
      output_format: PNG (transparent)
      style: flat, minimal, consistent stroke, no gradient bleed
      composition: minimal excess space
```

### 4.2 Modul IMAGIN yang perlu direvisi

| Modul | Perubahan wajib |
|---|---|
| **Prompt Builder** | Real-time scanner: blokir nama artis, orang nyata, brand, instansi pemerintah, referensi kejadian nyata |
| **Export Pipeline** | **KRITIKAL**: paksa output JPEG untuk kategori Illustration, PNG transparan untuk kategori PNG — jangan sampai tertukar |
| **Post-Processing** | Tambah sharpness check (simulasi zoom 100%) + artifact detector setelah generate, sebelum masuk Gallery |
| **Gallery** | Similarity guard: bandingkan konsep bukan cuma pixel — flag jika hanya beda warna/crop/rotate |
| **Metadata Generator** | Title < 70 karakter; keyword maksimum **49** (bukan 25); 10 keyword pertama diprioritaskan; larang nama artis/IP/orang nyata di title & keyword |
| **Batch Engine** | Kurangi default batch size, paksa diversifikasi konsep, bukan cuma variasi visual |
| **Preflight Check** | Tambah kolom: GenAI label, Distinctness score, Sharpness score, Format-match-category check |
| **GenAI Checkbox Logic** | Auto-set benar berdasarkan actual generation method — jangan pernah mismatch (baik lupa centang maupun salah centang) |

---

## 5. HALAMAN SUMBER (untuk audit trail)

Dibaca dan diverifikasi di Fase 1:
- Technical requirements for PNG submissions
- Technical and legal requirements for illustration submissions
- Quality and technical issues behind content refusal
- Common reasons for content refusal
- Tips for effective titles and keywords
- Generative AI Illustrations submission guidelines

Belum dibaca (opsional untuk iterasi berikutnya jika diperlukan):
- Distinct vector and illustration submission best practices (detail submission diversifikasi)
- Content policy for artist names, known people, fictional characters (detail lengkap)
- Choose the right category for your content
- CSV requirements for Adobe Stock (jika IMAGIN pakai bulk upload via CSV)

---

## 6. NEXT STEP — FASE 3

Urutan revisi kode yang disarankan:
1. **Export Pipeline fix** — paling kritikal, ini bug arsitektural yang
   langsung berdampak ke rejection rate (illustration harus JPEG)
2. **QUALITY_GATE** — sharpness + artifact detector
3. **PROMPT_SAFETY** — real-time scanner
4. **PATTERN_DNA** — split per asset type
5. **METADATA_PIPELINE** — perbaiki keyword limit ke 49, title rules
6. **SIMILARITY_GUARD** — concept-level distinctness check


Audit Fase 3 — IMAGIN vs Compliance DNA
OK / Sudah ada
Perlu perbaikan
Bug kritis / Missing
1 · Export Pipeline
KRITIS
✗ Illustration (assetType='illustration') masih output PNG — seharusnya JPEG wajib
✗ ASSET_TYPE_PRESETS.illustration → outputFormat: 'PNG' (baris 62) — harus diganti JPEG
✓ Export handler (baris 3951) sudah ada logika isJpeg — tapi tidak pernah triggered karena preset salah
↳ Fix: ubah preset illustration.outputFormat ke 'JPEG', pastikan initialPlaceholder ikut preset
2 · Quality Gate (Sharpness + Artifact)
PERLU FIX
✓ Preflight checks ada: noArtifacts, noText, noLogo sudah di PREFLIGHT_ITEMS (baris 633)
✗ Sharpness check tidak ada — Adobe review di zoom 100%, IMAGIN tidak punya simulasi setara
✗ AI preflight prompt (baris 3221) tidak secara eksplisit meminta deteksi softness/blur di 100% zoom
↳ Fix: tambah 'sharpnessScore' di preflight prompt, flag sebagai issue jika < threshold
3 · Prompt Safety
BAGUS
✓ BRAND_IP_BLOCKLIST ada (baris 645), checkBrandSafety() berjalan di executeGenerate
✓ BlockingDialog muncul jika brand detected sebelum generate (baris 4043)
✗ Tidak ada scanner untuk nama artis, instansi pemerintah, orang nyata
↳ Tambah ARTIST_NAMES_BLOCKLIST + GOV_AGENCY_BLOCKLIST di checkPromptSafety()
4 · Pattern DNA (split per asset type)
PERLU FIX
✓ ASSET_TYPE_PRESETS ada untuk vector, illustration, 3d (baris 49)
✗ illustration.dna dan png-icon.dna tidak dipisah dengan benar — outputFormat illustration masih PNG
✗ Icon (png-icon) tidak punya preset DNA terpisah, ikut vector preset
↳ Fix: tambah 'icon' sebagai assetType tersendiri di ASSET_TYPE_PRESETS dengan output PNG+transparent
5 · Metadata Pipeline
BAGUS
✓ METADATA_RULES.keywords.MAX_COUNT = 49 (baris 385) — sudah benar
✓ METADATA_RULES.title.MAX_LEN = 60, SPAM_TERMS list ada
⚠ titleMaxLen di MICROSTOCK_PLATFORMS.adobe_stock = 200 (baris 268) — inkonsisten dengan METADATA_RULES (60)
↳ Sinkronisasi: pakai METADATA_RULES.title.MAX_LEN sebagai single source, hapus 200 di platform config
6 · Similarity Guard
PERLU FIX
✓ checkPreGenerationSimilarity() ada, checkBatchTitleSimilarity() ada (baris 3770)
✗ Comparison berbasis judul/kata — mudah miss jika judul beda tapi konsep sama (warna/crop/rotate)
↳ Tambah concept-fingerprint: hash kombinasi category + subcategory + subject-type sebelum generate