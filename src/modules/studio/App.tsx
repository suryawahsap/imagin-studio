// ts-check-temp
// Pakai asumsi runtime (event target types, IDB result, implicit any, dll.)
// yang tidak cocok dengan strict TypeScript DOM lib kita. Build runtime via Vite
// tetap bersih. Modul ini adalah CANONICAL — JANGAN modifikasi kecuali untuk
// rename function `App` → `StudioApp` agar kompatibel dengan import di
// `src/components/StudioModule.tsx`. Sync 100% dengan imagin_studio.tsx di root.


// IMAGIN STUDIO — Stock Content Production Engine
//
// Table of contents
//  [01] IMPORTS
//  [02] TYPES & INTERFACES
//  [03] GLOBAL CONSTANTS & CONFIGURATION
//  [04] UTILITIES (pure helpers, no side effects)
//  [05] DATA REGISTRY (readonly objects, no functions)
//        05.01 Asset Type Presets
//        05.02 Icon DNA — Negative Prompt & Style Presets
//        05.03 Illustration Styles
//        05.04 Adobe Category Taxonomy
//        05.05 Global DNA & Commercial Rules
//        05.06 Category DNA (CATEGORY_DNA)
//        05.07 Composition Dimension Pool
//        05.08 System Default Settings
//  [06] STATE STORE — useImaginStateStore()
//  [07] PRODUCTION PIPELINE — runProductionPipeline() [FASE 3]
//  [08] RESOLUTION LAYER — category/DNA/background resolvers
//  [09] DOMAIN ENGINES
//        09.01 Compliance Engine
//        09.02 Storage Engine (IndexedDB)
//        09.03 Quality Engine
//        09.04 Prompt Engine (buildDNAContext, compilePrompt, composeIconPrompt)
//        09.05 Generation Engine (generateImageWithGemini, finalizeAsset)
//        09.06 Batch Engine (batchEngine)
//        09.07 Metadata Engine
//        09.08 Export Engine
//        09.09 Import Engine
//  [10] UI SYSTEM — Error Boundary, shared components
//  [11] APPLICATION — App() (murni UI: state destructure + JSX render)
//  [12] STYLES
// Aturan keras:
//   [05] DATA REGISTRY  = const/type/interface/readonly ONLY. Dilarang: function.
//   [09] DOMAIN ENGINES = function/logic ONLY. Dilarang: React component, JSX.
//   [10] UI SYSTEM      = React component ONLY. Dilarang: business rules.
//   [11] APPLICATION    = state destructure + JSX render ONLY.
// VIRTUAL MODULE RULE: Setiap section dipisahkan oleh:
//   [XX] NAMA SECTION

import {
    AlertCircle,
    Archive,
    BadgeCheck,
    BookOpen,
    Box,
    Camera,
    Check,
    CheckSquare, // [BUG #8] dipakai berpasangan dengan Square untuk toggle Pilih Semua (checked vs unchecked) — bukan duplikasi
    ChevronDown,
    CircleDot,
    ClipboardList,
    ClipboardPaste,
    Clock,
    Copy,
    Download,
    Eye,
    FileText,
    Film,
    FolderUp,
    Grid,
    Image,
    ImagePlus,
    Key,
    Layers,
    Layout,
    ListChecks,
    Loader2,
    Lock,
    Maximize2,
    Moon,
    Package,
    Palette,
    PenTool,
    RefreshCw,
    Rocket,
    Save,
    ScanSearch,
    Settings,
    ShieldCheck,
    Sliders,
    Sparkles,
    Square, // [BUG #8] dipakai untuk (a) unchecked state toggleSelectAll + (b) swatch background putih di Visual Settings — sengaja beda dari CheckSquare
    Sun,
    Trash2,
    Unlock,
    Upload,
    Wand2,
    X,
    XCircle,
    Zap,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeOpenStudioModal } from '../../components/global/studio-bridge';
import { getBatchSlots, getBatchSlotsAI } from './engines/composition';
import { expandPromptWithGemini } from './engines/prompt';
import { callGeminiForJSON, callGeminiText, generateImageWithGemini } from './engines/generation';
import * as metadataFlow from './flows/metadataFlow';
import * as importFlow from './flows/importFlow';
import * as assetActionsFlow from './flows/assetActionsFlow';
import { autoRegenerateAsset, generateObjectModVariant, generateRevisionVariant } from './engines/revision';
import { BRAND_IP_BLOCKLIST, CONTENT_SAFETY_RULES, GOVERNMENT_AGENCY_BLOCKLIST, METADATA_NEWS_MARKERS, detectNewsEvent, detectSensitiveContent, PREFLIGHT_ITEMS } from './engines/compliance';
import { generateMetadataAndQA, runKeywordValidationLoop, createDraftStockMetadata, checkBatchTitleSimilarity, checkPreGenerationSimilarity, computeBatchDiversityScore, evaluateMetadataStatus, normalizeMetadataKeyword } from './engines/metadata';
import { validateMetadataCompliance } from './engines/compliance';
import { analyzeAssetForPreflight, analyzeVisualTruth } from './engines/quality';
import { autoUpscaleImage, finalizeAsset, removeBackground3Layer } from './engines/asset-finalize';
import { computeVisualSimilarity } from './engines/quality';
import { handleDownloadSingle as handleStockExportSingle } from '../../components/metadata/export';

const { assessTechnicalQuality, assessSharpness, detectWatermark, TECHNICAL_QA, deleteAsset, deleteOldDrafts } = assetActionsFlow;
const { saveBatchProgress, clearBatchProgress, loadBatchProgress } = importFlow;
const { buildAnimationPreviewShell, buildImaginLocalFallback } = assetActionsFlow;


// 05 · DATA REGISTRY — Asset Type Presets (per assetType: vector / illustration / 3d / photo)
import { ACTIVITY_CONTEXTS, ADOBE_CATEGORY_TAXONOMY, ANIMATION_PRESETS, ASSET_TYPE_META, ASSET_TYPE_PRESETS, CAMERA_ANGLES, DEFAULT_PLATFORM, DNA_TO_OFFICIAL_MAP, FRAMING_STYLES, METADATA_RULES, MICROSTOCK_PLATFORMS, OFFICIAL_TO_DNA_MAP, PLATFORM_ADAPTERS, SUBJECT_TYPES } from './registry/presets';
import { BATCH_TIERS, CSV_EXPORT_STATUSES, FILTER_STATUS_ORDER, GENERATION_MODES, ICON_GENERATION_MODES, ICON_GRID_OPTIONS, IMAGE_MODELS, MAX_BATCH_COUNT, PAGE_SIZE, SPAM_TERMS, STATUS_CONFIG, SUBMITTABLE_FROM_EXPORT, SUBMITTABLE_STATUSES, TEXT_MODELS } from './registry/constants';
import { CATEGORY_DNA, GLOBAL_CGA_DATABASE, GLOBAL_DNA, STYLE_PRESET_DNA, STYLE_PRESET_MAP, getPaletteForCategory } from './registry/dna';
import { buildCategoryNegativeHints, buildCommercialRules, buildDNAContext, buildResolvedConfig, buildStyleGuidance, findStylePreset, loadDiversityTracker } from './flows/dnaData';
export { ACTIVITY_CONTEXTS, BATCH_TIERS, CAMERA_ANGLES, DNA_TO_OFFICIAL_MAP, FILTER_STATUS_ORDER, FRAMING_STYLES, GENERATION_MODES, GLOBAL_CGA_DATABASE, GLOBAL_DNA, ICON_GENERATION_MODES, MAX_BATCH_COUNT, OFFICIAL_TO_DNA_MAP, SPAM_TERMS, STATUS_CONFIG, SUBJECT_TYPES };


// [05.02] DATA REGISTRY — Icon DNA
//         READONLY: ICON_MASTER_NEGATIVE_PROMPT, ICON_SHEET_EXTRA_NEGATIVE,
//                   ICON_STYLE_PRESETS
//         CATATAN: sanitizer & helper functions → [09.04] PROMPT ENGINE
import { ICON_MASTER_NEGATIVE_PROMPT } from './registry/icon-dna';

import { ICON_STYLE_PRESETS } from './registry/icon-dna';

// NOTE: ICON_SHEET_EXTRA_NEGATIVE — konstanta dipakai langsung oleh
// buildIconNegativePrompt() di [09.04] PROMPT ENGINE (masih satu file, jadi
// tidak ada re-export yang benar-benar terjadi; tetap diletakkan di Registry
// karena ini data, bukan logic).
import { ICON_SHEET_EXTRA_NEGATIVE } from './registry/icon-dna';

// ANIMATION PRESETS — preset animasi CSS untuk aset icon/vector.
// Dipakai untuk menghasilkan file HTML+CSS animasi per aset (kolaborasi
// Imagin Local): AI memilih preset yang cocok, fallback deterministik juga
// memakai daftar ini. Setiap preset punya css (dipakai di class) + keyframes
// (dipakai di <style>).
import { ANIMATION_DEFAULT_PRESET, ANIMATION_PRESET_MAP, analyzeConceptGenericity, createInitialVectorState } from './flows/dnaData';

//HOISTING EXCEPTION: sanitizeIconThemeInput dan sanitizeVisualPromptInput
// secara logika termasuk [09.04] PROMPT ENGINE, tapi TIDAK BISA dipindah
// karena dipakai oleh ICON_STYLE_PRESETS di bawah (dalam section Registry ini).
// JavaScript membutuhkan fungsi ini sudah terdefinisi sebelum object yang memakainya.
// STATUS: Tetap di sini secara permanen — dikecualikan dari aturan Registry.
import { sanitizeIconThemeInput } from './utils';

import { sanitizeVisualPromptInput } from './utils';

import { extractLeadingIconCount } from './utils';


// 05 · DATA REGISTRY — Illustration Styles & Style-by-AssetType map
import { COMMERCIAL_ILLUSTRATION_STYLES } from './registry/presets';

import { STYLES_BY_ASSET_TYPE } from './registry/presets';


// 05 · DATA REGISTRY — Adobe Category Taxonomy

// Profil metadata per platform microstock. Tambah entry baru di sini kalau mau dukung Freepik/Shutterstock dst,
// tapi WAJIB riset taksonomi resminya dulu (jangan tebak) sebelum diisi.

// 14 · PLATFORM ADAPTER — Platform Registry (Adobe Stock, Freepik, dst) & default platform

// Mapping: Official Platform Category → Internal DNA category
// Arah: user pilih kategori resmi platform → engine resolve DNA internal yang cocok.
// Key = platformCategoryId (number), value = { default, alternatives? }
// "default" = DNA yang langsung dipakai engine.
// "alternatives" = opsi lain yang bisa dipilih user via Creative DNA panel (override manual).
//
// Mapping kondisional (split) diselesaikan oleh resolveDNAFromOfficial() berdasarkan subcategory.

// 08 · RESOLUTION LAYER — Official Category <-> Internal DNA mapping
// Helper: resolve DNA internal dari platform + official category ID + (opsional) subcategory hint
// Mengembalikan string internalCategory untuk dipakai buildDNAContext().
// FASE 12 (selesai): delegasi penuh ke PlatformAdapter (lihat PLATFORM_ADAPTERS di bawah).
// Fallback map langsung hanya untuk platform yang tidak punya adapter terdaftar.
import { resolveDNAFromOfficial } from './resolvers';
import { useImaginStateStore, createIdleBatchQueue, selectionReducer, assetsReducer, batchQueueReducer } from './state';
import {
    saveAssetDB, saveAssetDBMigrate, loadStudioAssets, getAssetsDB, deleteAssetDB, deleteAssetDBRaw, deleteAssetDBQueued, saveHistoryLog, getHistoryDB,
    saveQAResultDB, saveComplianceResultDB,
    markDiversityUsedDB, migrateIdbToStudioStore,
} from './engines/storage';
import { projectEngine } from './engines/project-engine';
import { getUnlinkedEligibleAssets, mergeCanonicalAssets, mergeLoadedStudioAssets, migrateUnlinked } from './engines/library-sync';
import { jobEngine, saveJobDB, getJobDB, createProductionJob, logItemStage, updateJobItemStatus, updateJobItemWithStage, normalizeJobRecord } from './engines/job-engine';
import { feedbackEngine, classifyRejection, recordRejectionFeedback, deriveProductionPolicy } from './engines/feedback';
import { buildConceptFingerprint, checkLibraryConceptSimilarity, checkBatchVisualSimilarity } from './engines/fingerprint';
import { validateImportedJSON, validateRequestIntake, normalizeRequest, downloadCustomTemplate, processImportedJSON } from './engines/import-engine';
import AnimationModalV2 from './ui/AnimationModalV2';
import ErrorBoundary from './ui/ErrorBoundary';
import BatchImportPreviewModal from './ui/modals/BatchImportPreviewModal';
import JsonFormatModal from './ui/modals/JsonFormatModal';
import ImportPasteModal from './ui/modals/ImportPasteModal';
import PreflightModal from './ui/modals/PreflightModal';
import StudioLeftPanel from './ui/screen/StudioLeftPanel';
import StatusBadge from './ui/components/StatusBadge';
import CanvasView from './ui/components/CanvasView';
import SubmissionCenter from './ui/components/SubmissionCenter';
import InsightsView from './ui/components/InsightsView';
import DetailModal from './ui/components/DetailModal';
import GridAssetModal from './ui/modals/GridAssetModal';
import HelpModal from './ui/modals/HelpModal';
import SettingsModal from './ui/modals/SettingsModal';
import RevisionModal from './ui/modals/RevisionModal';
import RemoveBgModal from './ui/modals/RemoveBgModal';
import CustomStyleModal, { type CustomStyle } from './ui/modals/CustomStyleModal';
import EditBgModal from './ui/modals/EditBgModal';
import ImportHubModal from './ui/modals/ImportHubModal';
import ObjectModifierModal from './ui/modals/ObjectModifierModal';
import HistoryModal from './ui/modals/HistoryModal';
import StudioInspectorPanel from './ui/screen/StudioInspectorPanel';
import PromptPreviewModal from './ui/modals/PromptPreviewModal';
import * as uiFlow from './flows/uiFlow';
uiFlow.installGlobalErrorLogging();
import * as projectsFlow from './flows/projectsFlow';
import * as generationFlow from './flows/generationFlow';
const { composeFinalPrompt, buildRegenerationPlan, buildProductionTrace, assessProfileMatch, resolveReferenceGenerationSettings, buildQualityGateResult, estimateAssetApiCalls, retryFailedAsset, batchEngine, buildPreviewPrompt, cancelGeneration } = generationFlow;
import { createBatchDiversitySession, classifyAssetReadiness, computeSubmissionReadiness, readyRatioCouldExport, composeIconPrompt, buildIconNegativePrompt } from './engines/prompt';
import { resolvePromptDefaults, deriveSidebarStage } from './engines/batch';
import { tailwindStyles } from './ui/appStyles';

// Backward-compat: internal DNA → official category ID (untuk batch JSON lama yang pakai adobeCategory)
// Dipakai di resolvePromptDefaults() agar batch lama tidak rusak.
// 14 · PLATFORM ADAPTER — Platform Adapters (FASE 12)
// -
// ADOBE_ADAPTER / FREEPIK_ADAPTER membungkus perilaku platform-spesifik:
// taksonomi kategori, mapping official→DNA, batas metadata, dan aturan export.
// Export Engine & Compliance Engine membaca melalui adapter, bukan langsung dari
// MICROSTOCK_PLATFORMS — satu-satunya sumber truth untuk aturan per platform.
// 03 · GLOBAL CONSTANTS — Spam terms, generation modes, status config
// Tier jumlah untuk mode batch (sidebar normal) — selector muncul saat mode
// Batch aktif. Max 20 (aman untuk sesi keyless/rate-limit).
// Grid options untuk sheet mode — source of truth untuk cols×rows layout.
// User memilih dari opsi ini saja, tidak ada free input untuk sheet mode.
// Setiap entry: qty = total icon, cols×rows = layout grid, label = tampilan UI.
// SSOT: SINGLE SOURCE OF TRUTH STATUS CONFIGURATION
// Aligned with imagin-studio-metadata-workflow.md recommended flow:
//   DRAFT → PROCESSING → (metadata_ready | needs_review | rejected) → READY → EXPORTED → SUBMITTED.
// 'processing' = preflight sedang berjalan.
// 'ready'      = user accept hasil review (override pass).
// 'exported'   = CSV sudah di-download ke Adobe workflow.
// 'submitted'  = user konfirmasi sudah upload manual ke Adobe (markAsSubmitted).
// Status yang boleh di-mark submitted oleh user (sudah di-export + siap upload).
// 05 · DATA REGISTRY — Composition Dimension Pool (input untuk DNA Engine)
//  COMPOSITION DIMENSION ENGINE — Dynamic Combinatorial Slots
//  Menggantikan UNIFIED_SLOT_LIBRARY yang statis (5 archetype)
//  dengan sistem dimensi yang menghasilkan 1.680+ kombinasi unik

//  COMPOSITION DIMENSION ENGINE — Hybrid Combinatorial + AI

// Pendekatan A: Pool Dimensi untuk Combinatorial

// 12 · COMPLIANCE ENGINE — Preflight items, Brand/IP blocklist, brand-safety check
// Matcher dengan word-boundary — mencegah false positive dari substring.
// "cia" tidak mendeteksi "commercial", "social", "financial", dll.
// Hyphen diperlakukan sebagai pengikat: "commercial" → lolos, "CIA operation" → blok.
// Multi-word phrase ("star wars", "white house") di-match sebagai phrase utuh.
import { matchesBlockedTerm } from './utils';

import { checkBrandSafety } from './utils';

// -
// 12 · COMPLIANCE ENGINE — News-event & sensitive-content detector (PHASE P0)
// -
// Gap terverifikasi: tidak ada check untuk konten yang mengimplikasikan peristiwa
// berita nyata (Adobe menolak "editorial/newsworthy" untuk konten komersial) atau
// konten sensitif. Ini detector heuristik zero-API yang menilai konteks:
//  - NEWS_EVENT_MARKERS: kata/frasa yang menandai peristiwa berita nyata.
//  - SENSITIVE_CONTENT_MARKERS: konten berbahaya yang Adobe blokir.
// Detector BERSIFAT context-aware: beberapa kategori (mis. "Holidays") hampir
// tidak mungkin jadi news-event, kategori lain (mis. "Business") bisa. Hasilnya
// berupa Confidence + reference string — dipakai sebagai bahan keputusan, dan
// di-wire ke hard gate preflight (hanya menurunkan decision).
// -
// -
// 12 · COMPLIANCE ENGINE — CONTENT_SAFETY_RULES (PHASE P0)
// -
// Aturan konten yang dilarang untuk Adobe Stock komersial. Dipakai oleh
// detector di atas dan oleh prompt AI preflight (di-inject ke instruksi) supaya
// model ikut memeriksa news-event/sensitive content secara visual.



// 05 · DATA REGISTRY — Creative DNA v5 (Global / Style Preset / Category DNA)
// NOTE: sesuai New_Architecture.md §DNA v5, registry ini akan dipecah lebih lanjut
// jadi beberapa domain registry terpisah pada fase berikutnya. Untuk fase ini
// isi & logic dipertahankan 100% sama, hanya dikelompokkan ulang.
//  DNA ENGINE V5 — CONFIGURATION & GLOBAL RULES
// Versi engine: 5.0 · Modular Inheritance Engine · Gemini Canvas + Adobe Stock
// Microstock Pipeline. (Metadata deskriptif — tidak dipakai runtime.)



// 12 · COMPLIANCE ENGINE — Generic Object DNA (EU-8)
// -
// Sumber: analisa penolakan Adobe Stock "Intellectual Property Refusal" untuk
// "Handshake over digital tablet with financial growth chart" — prompt yang
// terlihat generik ternyata bisa menghasilkan visual yang menyerupai produk/
// UI nyata. Registry ini berisi aturan anti-IP per jenis objek generik,
// ditempel ke prompt commercial rules HANYA untuk subkategori yang ditandai
// `genericObjectTags` di bawah (Technology, Business, Transportation, dst)
// — tidak mengubah subkategori lain sama sekali.


// 17 · MARKET PALETTES (Fase B) — palette komersial yang "menjual" per kategori
// -
// Warna terbukti laku di thumbnail microstock: kontras cukup, harmonis, tidak
// gelap semua / pastel pucat tanpa fokus. Dipakai prompt generation (dnaPrefix)
// supaya hasil visual punya palette yang menarik di ukuran kecil (200px).
// Data awal curated manual dari praktik komersial umum; dikalibrasi dari
// feedback penjualan nyata (Fase F).


// 12 · COMPLIANCE ENGINE — Category Quality Rules (EU-6)
// -
// Sumber: pola penolakan Adobe Stock per kategori (bukan IP/legal — itu urusan
// EU-8/EU-9). Setiap aturan punya kriteria reject yang SPESIFIK ke kategori:
//   - Health: unsanitary / intimidating
//   - Industrial: unsafe / broken equipment
//   - Food: unappetizing / spoiled
// dst.
//
// Cara kerja (pola identik EU-9):
//   Instruksi per kategori di-inject ke prompt analyzeAssetForPreflight
//      HANYA kalau asset.category cocok → AI menilai flag boolean.
//   runAutoPreflight memeriksa flag — kalau ada yang true, decision di-hard
//      reject ke 'fail' (tidak bisa ditutup skor kualitas tinggi).
//
// `checks` di bawah adalah nama key di output JSON AI.


// 10 · QUALITY ENGINE — Quality Gate (FASE 10)
// -
// buildQualityGateResult() — pure function yang memetakan hasil pipeline
// preflight (decision + issues + analysis) ke kontrak QAResult, lengkap dengan
// reasonCode / severity / failedRule / regenerationStrategy. Memisahkan logika
// quality gate dari App() agar bisa diuji dan dipakai ulang (single-file).
//
// Decision mapping pipeline → QAResult.decision:
//   pass            → 'pass'
//   pass (dgn warning) → 'pass_with_warning'  (hanya jika ada issue non-blokir)
//   needs_review    → 'needs_review'
//   fail (blur/safety/file-size/library-sim/profile) → 'regenerate'
//   fail (IP block) → 'reject'
// 09 · ENGINES — Prompt Engine (CGA / composition-guided variation, negative prompt builder)
//  DNA ENGINE V5.2 — GLOBAL CULTURAL & GEOGRAPHIC ANCHOR (CGA)

//  CGA DATABASE V1.0 — 8 Regions, 20 Countries, 15 Religions, 50 Events


import { MUTATION_FOCUS_BANK, COLOR_ACCENT_PALETTES, createBatchSession } from './engines/prompt-helpers';

// 09 · ENGINES — Batch Diversity Rules (EU-7)
// -
// Sumber: penolakan Adobe Stock "Similar content in our collection" — batch
// yang menghasilkan banyak asset mirip (subject/komposisi sama berulang) lebih
// mudah kena. Rules ini membatasi SEBERAPA sering subject/palette yang sama
// boleh muncul dalam SATU batch, lintas item.
//
//   sameSubcategoryMax   : maksimum kemunculan subject yang sama per batch
//   identicalPaletteMax  : maksimum kemunculan palette yang sama per batch
//
// Nilai default dipakai kalau kategori tidak override lewat
// `diversityEngine.batchRules`. Enforce-nya ada di buildDNAContext() — kalau
// batchDiversity session tidak diberikan (null), perilaku identik dengan
// sebelum EU-7 (backward compatible, no-op).

// pickWithBatchLimit() — memilih item dari pool dengan batas kemunculan max per
// batch. Kalau semua item di pool sudah mencapai max, pilih acak dari yang
// paling jarang dipakai (batch lebih besar dari ukuran pool → tetap jalan,
// tidak pernah crash). Kalau pool kosong → null.

// 07 · PRODUCTION POLICY — Submission policy & readiness (PHASE 9 / Definition of Done)
// Filosofi (dari rencana 12 fase): IMAGIN bukan mesin yang menghasilkan sebanyak
// mungkin gambar — tapi mesin yang menghasilkan sebanyak mungkin aset yang
// LAYAK DIJUAL. Tidak semua hasil generate harus di-upload.
// -
// PRODUCTION_POLICY menetapkan ambang produksi & seleksi. Dapat di-override per
// kategori via CATEGORY_DNA.<cat>.productionPolicy (sama seperti batchRules).
// computeSubmissionReadiness() mengagregasi per-asset state (status + preflight
// + ipRisk + category quality + sharpness) menjadi ringkasan batch:
//   ready | needs_review | rejected | pending — plus alasan tiap kategori.
// Dipakai UI untuk "Select Ready" dan laporan Submission Readiness.

// Status readiness untuk satu asset. Priority: rejected > ready > needs_review >
// pending. Menyusun alasan dalam Bahasa Indonesia (konsisten dengan UI) dan
// merangkum gate yang sudah ada (EU-9 IP, EU-6 category quality, PHASE P0
// sharpness & content safety) dari stockMetadata.preflightIssues.
// Agregasi readiness untuk daftar asset (filter default: satu batch). Kembalikan
// ringkasan { total, ready, needsReview, rejected, pending, readyRatio, items }
// di mana items berisi id + klasifikasi untuk keperluan UI "Select Ready".
// 09 · ENGINES — Concept Clustering Batch Planner (EU-12)
// -
// Sumber: penolakan Adobe Stock "Similar content in our collection" — batch
// yang dibangun sebagai variasi visual dari SATU subjek acak (beda angle/warna/
// crop saja) terlihat sebagai konten duplikat oleh reviewer/pencocokan Adobe.
//
// Solusi: sebelum generate, batch dipecah menjadi N "concept cluster" — setiap
// item di dalam batch diberi kombinasi (subject + macro concept + motif) yang
// BERBEDA dari item lain. Hasilnya satu batch berisi konsep yang benar-benar
// berbeda, bukan cuma variasi visual.
//
// Sumber seed per dimensi (dari yang paling spesifik):
//   - motif   : conceptDNA.motif (paling spesifik, per-subkategori)
//   - macro   : diversityEngine.macroConcepts (per-kategori)
//   - subject : sub.subjects (per-subkategori)
//
// Kalau user sudah pilih subject eksplisit (selectedSubject), subject itu
// dihormati untuk semua cluster — hanya macro/motif yang tetap dipisahkan.
// Kalau pool kosong (batch > ukuran pool), pickUnique auto-reset → tetap jalan,
// tidak pernah crash. Kalau kategori tidak dikenal → null (no-op, perilaku lama).
import { buildStrongExclusionInstruction } from './engines/prompt-helpers';

import { buildCGAContext } from './engines/dna-engine';

import { isSpecificUserInput } from './utils';

import { buildNegativePrompt } from './engines/dna-engine';


// 09 · ENGINES — Background Engine (EU-5)
// resolveBackground() — menentukan background optimal berdasarkan
// kategori/subkategori/assetType. Hanya override kalau user masih di nilai
// default preset (belum consciously memilih). User override selalu dihormati.
//
// Priority order:
//   User override eksplisit (bukan default preset) → pakai user choice
//   assetType === '3d'                             → selalu 'white'
//   Subkategori punya entry di SUBCATEGORY_BACKGROUND_OVERRIDE → pakai itu
//   Kategori punya entry di CATEGORY_BACKGROUND_STRATEGY       → pakai itu
//   Fallback                                       → 'white'

import { resolveBackground } from './resolvers';

// 06 · STATE STORE — default state factories
// 04 · UTILITIES — Network (fetch with retry)
// BUG-3 fix: notifier opsional yang dipanggil tiap kali fetchWithRetry akan
// mencoba ulang (rate-limit/5xx/timeout). App() mendaftarkan callback
// throttled yang memunculkan toast, jadi user melihat backoff sedang berjalan
// (tidak "diam" saat Gemini rate-limit) — sekaligus mengurangi risiko user
// menekan tombol generate lagi (BUG-1).
import { setFetchRetryNotifier } from './utils';


// 04 · UTILITIES — Preflight/aspect ratio helpers
import { countPreflightPassed } from './utils';

import { aspectRatioToCss } from './utils';

import { RESOLUTION_POLICY } from './utils';

// Target resolusi upscale yang user pilih di sidebar.
// '4k' = 8MP (Adobe Stock standard, default — backward-compat untuk asset
//   lawas yang tidak punya field resolutionTarget).
// '6k' = 36MP (premium — file lebih besar ~10-25MB PNG, perlu upscale agresif
//   dan bisa blur jika source resolusi kecil).
import { RESOLUTION_TARGETS } from './utils';
import { DEFAULT_RESOLUTION_TARGET } from './utils';

import { getResolutionTarget } from './utils';

import { getFormatResolutionPolicy } from './utils';

import { minShortSideForMegapixels } from './utils';


import { megapixelsOf } from './utils';

import { dimensionsForMegapixels } from './utils';

import { fileSizeKBFromDataUrl } from './utils';

// -
// 08 · RESOLUTION LAYER — Export Format Contract (PHASE P0 / Fase 0)
// -
// resolveExportFormat() menentukan format file final berdasarkan asset profile,
// BUKAN default PNG untuk semua kategori (gap yang terverifikasi). Aturan:
//  - Transparent / Green Screen / Icon → PNG (butuh alpha channel / ketajaman tepi)
//  - Illustration & 3D di atas background opaque → JPEG (lebih kecil, tanpa alpha,
//    Adobe Stock menerima baik; JPEG adalah pilihan paling aman untuk raster art)
//  - Vector flat di atas background opaque → PNG (warna solid, crisp edges)
// Pilihan EKSPLISIT user (user sudah mengubah format via UI/JSON) SELALU dihormati —
// resolver hanya mengoreksi DEFAULT, tidak menimpa niat user.
import { resolveExportFormat } from './utils';

// -
// 08 · RESOLUTION LAYER — Asset Profile classifier (PHASE 2 modified)
// -
// Prinsip PHASE 2 dari rencana migrasi: assetType ≠ assetProfile.
//   Illustration → Pattern | Background | Editorial Scene | Object | ...
//   Vector       → Icon | Illustration | Pattern | ...
// classifier murni ini menurunkan assetProfile dari assetType + category/
// subcategory + iconMode, TANPA memindahkan/mengubah registry existing
// (CATEGORY_DNA, ADOBE_CATEGORY_TAXONOMY) — hanya membaca. Hasilnya dipakai
// oleh buildResolvedConfig() (kontrak ResolvedProductionConfig) dan kelak
// Submission Readiness / Quality per-profile.


// 11 · QUALITY ENGINE — Resolution check, upscale, background verification, finalize asset
import { getImageDimensions } from './engines/quality';
import { computeTitleSimilarity } from './engines/metadata';
import { runProductionPipeline } from './pipeline';

// -
// 11 · QUALITY ENGINE — Visual fingerprint, visual similarity, sharpness (PHASE P0)
// -
// Gap terverifikasi: similarity sebelumnya HANYA teks (computeTitleSimilarity).
// Tidak ada deteksi flipped/rotated/filter-only/sharpness visual. Bagian ini
// menambahkan lapisan visual berbasis canvas — zero API, murni heuristik di
// browser (dHash + Laplacian variance). Ini melengkapi (BUKAN menggantikan)
// similarity teks dan pre-generation similarity AI.
// -

// dHash (difference hash): downsample ke 9x8 grayscale, bandingkan kecerahan
// piksel berurutan → 64 bit. Tahan terhadap resize & small color shift; murah
// dihitung (bukan AI). Hasil hex string dipakai sebagai visual fingerprint.
// FASE D3 — cache in-memory: dataUrl asset tidak berubah setelah finalize, jadi
// hash tidak perlu dihitung ulang setiap preflight/similarity check (library
// besar: O(n) hash per asset bisa sangat lambat).
// 08.2 · TECHNICAL QA ENGINE (QA-aset poin 4–8) — Multi-metrik kualitas teknis
// -
// QA_VERSION: versi engine QA. Naikkan major saat threshold/rules berubah supaya
// asset lama yang PASS bisa di-*re-inspect* (disimpan per-QAResult.qaVersion).
// QA-aset menentukan setiap check membawa score + confidence (decision matrix).


// Ukur satu set metrik teknis dalam satu lintasan canvas (browser, zero API):
// sharpness (Laplacian), edge density, high-frequency energy, noise (residual),
// compression blocking, oversharpening halo, dan exposure/clipping. Tiap metrik
// punya severity 'clean'|'mild'|'excessive' + confidence untuk decision matrix.


// Helper: peta Laplacian variance → skor 0-100 (untuk severity issue).

// Watermark detector (QA-aset poin 7 / 15): menggabungkan (a) heuristic canvas
// — teks overlay semi-transparan tipikal punya banyak guratan kecil kontras
// tinggi yang TERSUSUN MERATA melewati seluruh frame (bukan edge konten nyata),
// dan (b) sinyal AI `visibleWatermark` sebagai second opinion. Canvas detector
// berfungsi sebagai *screen* (boosting confidence) — AI adalah sumber utama.




// 04 · UTILITIES — File/Data helpers

// 20 · IMPORT / MIGRATION ENGINE — JSON batch import validation & prompt defaults
// JSON BATCH HELPER FUNCTIONS
// [07] PRODUCTION PIPELINE
//      Saat ini: deriveSidebarStage() — UI stage helper
//      Target FASE 3: runProductionPipeline() — unified generate orchestrator
//      Rule: Tidak ada data Registry di sini. Tidak ada React/JSX.
// FIX 2: Deterministic style resolver — maps structured vision signals → STYLE_PRESET_MAP key.
// Returns exact sidebar style name (matches COMMERCIAL_ILLUSTRATION_STYLES / STYLES_BY_ASSET_TYPE).
// 23 · UI SYSTEM — Error Boundary


// 15 · EXPORT ENGINE — Moved to Gallery & Metadata modules
// Phase 2: Studio → Tools handoff (removed SVG trace inline engine)
// ── ISU 7: Releases column resolver ──────────────────────────────────────────
// Adobe Stock CSV "Releases" column logic per contributor guidelines:
//   - AI-generated fictional people/property → kolom KOSONG, centang
//     "People and Property are fictional" di Adobe Contributor portal saat upload.
//   - Real identifiable person + model release tersedia → 'Model Released'
//   - Real identifiable property + property release tersedia → 'Property Released'
//   - Tidak ada orang/properti → kosong.
// Referensi: helpx.adobe.com/stock/contributor/user-guide.html
import { resolveReleasesValue, getCsvMetadataEligibility } from './resolvers';


// IMAGIN LOCAL PACKAGE BUILDER — hasilkan paket aset untuk pipeline animasi
// IMAGIN Local: PNG + HTML fragment (elemen ber-id) + CSS statis (px, TANPA
// animasi bawaan) + JSON metadata. Konvensi IMAGIN Local:
//   - HTML = fragment body (tanpa <html>/<head>/<body>) — elemen ber-id jadi
//     layer di timeline; di dalam .scene position:relative seukuran canvas.
//   - CSS = statis (ukuran/warna/posisi/font, pakai px). JANGAN embed
//     @keyframes/animation/transition — IMAGIN Local yang menambah keyframe.
//   - PNG tetap ada (untuk preview & Vectorize).
//   - JSON opsional: canvas size + daftar animatable + suggestedGrouping.

// Fragment fallback deterministik: 1 layer img ber-id (valid kalau AI gagal).


// Preview shell — HANYA untuk preview modal Studio (TIDAK diekspor). Bungkus
// fragment + css jadi HTML lengkap; animasi preview ditambahkan di sini.


// Download paket ZIP IMAGIN Local: {nama}.png + {nama}.html + {nama}.css +
// {nama}.json + manifest.json. Base name sama supaya auto-pairing di import.


// FILE METADATA EMBEDDING — XMP/Exif ke PNG & JPEG (Windows Properties,
// macOS Finder, dan platform stock membaca ini dari dalam file itu sendiri).
//  - PNG: sisipkan chunk iTXt "XML:com.adobe.xmp" berisi XMP packet standar
//    (dc:title, dc:description, dc:subject). Native dibaca Explorer/Finder.
//  - JPEG: sisipkan APP1 Exif segment (XMP) setelah SOI marker (0xFFD8).
//  - PNG punya data URL murni (asset PNG di-generate tanpa kompresi tambahan),
//    jadi di-decode & di-re-encode byte-per-byte. JPEG/URL eksternal dilewati
//    (atau tidak ada data base64 yang bisa diedit aman) → fallback ke gambar
//    asli, metadata tetap jalan lewat CSV/XMP manifest.




// PNG: sisipkan chunk iTXt (XMP) setelah chunk IHDR. Chunk baru:
//   [len:4][type:"iTXt"][data][crc:4]  — data = "XML:com.adobe.xmp\0\0\0\0\0<packet>"




// PHASE 10 (modified): tambahkan satu entri export ke lineage.exportHistory dan
// persist ke IndexedDB (saveAssetDB module-level). Tidak mengubah state React
// di sini (helper pure) — state akan ter-refresh pada load berikutnya.



// SCENE ZIP EXPORT — V2 Multi-layer Animation → paket import IMAGIN Local
// -
// Struktur ZIP (konvensi IMAGIN Local):
//   elements/<baseName>_<id>.png   — satu PNG per layer (transparan kecuali bg)
//   <baseName>.html                — body fragment (elemen ber-id, posisi px)
//   <baseName>.css                 — CSS statis (TANPA @keyframes)
//   <baseName>.json                — metadata Local (canvas, layers, prompt)
//   manifest.json                  — deskriptor paket
// Fail-graceful: hanya layer berstatus 'done' yang diekspor; scene tetap valid
// walau sebagian elemen gagal generate.





// 20 · IMPORT / MIGRATION ENGINE — batch-resume storage & JSON batch import
// -
// Dipindahkan dari App() (Fase 3c). saveBatchProgress/clearBatchProgress/
// loadBatchProgress dipindah ke studio:batch-resume-get/set
// IPC (Fase 5 lanjutan) — TTL 24h & shape tidak berubah, hanya sisi
// penyimpanannya. processImportedJSON dan handleJSONFileUpload awalnya
// membaca 7 state setter dari closure App(); sekarang menerima sebagai satu
// objek `actions` eksplisit. Call site di App() diupdate mengirim actions
// ini — logic di dalamnya tidak berubah.
// (Catatan: handleJSONFileUpload sudah tidak dipanggil dari mana pun di file ini
// sejak sebelum refactor ini — dead code pra-eksisting, bukan hasil Fase 3c.)







// [09.04] PROMPT ENGINE
//         Fungsi: buildDNAContext, buildCommercialRules,
//                 buildNegativePrompt, buildLayeredNegativePrompt,
//                 compilePrompt, buildPreviewPrompt,
//                 composeIconPrompt, buildIconNegativePrompt,
//                 sanitizeIconThemeInput, sanitizeVisualPromptInput
//         Rule: Pure functions — input config → output string. No React. No side effects.




    /* legacy icon prompt closure removed; canonical pure engine is imported above. */
    /*
        const visualSettings = config.visualSettings || {};
        const preset = ICON_STYLE_PRESETS[config.iconStyle];
        if (!preset) return sanitizeIconThemeInput(subjectText);
        const bg = visualSettings.background === 'transparent' ? 'transparent' : 'white';
        const categoryContext = `${config.internalCategory || config.adobeCategory || ''}${config.subcategory ? ' > ' + config.subcategory : ''}`;
        const subject = sanitizeIconThemeInput(subjectText) || 'single icon';

        if (config.iconGenerationMode === 'sheet') {
            // GRID_OPTIONS adalah source of truth — qty selalu exact dari pilihan user.
            const qty = config.iconQuantity || 4;
            const gridOption = ICON_GRID_OPTIONS.find(g => g.qty === qty) || ICON_GRID_OPTIONS[1];
            const { cols, rows } = gridOption;
            const gridSpec = `${cols} columns × ${rows} rows`;

            // Instruksi eksplisit per baris — cegah model menambah baris ekstra
            const rowInstructions = Array.from({ length: rows }, (_, r) => {
                const start = r * cols + 1;
                const end = (r + 1) * cols;
                return `Row ${r + 1}: icons ${start}–${end}.`;
            }).join(' ');

            // Hint orientasi canvas berdasarkan proporsi grid
            const arHint = cols === rows
                ? 'square canvas (equal width and height)'
                : cols > rows
                ? `landscape canvas (wider than tall, ${cols}:${rows} cell proportions)`
                : `portrait canvas (taller than wide)`;

            // Layer order: SUBJECT → CANVAS → LAYOUT → STRUCTURE → STYLE → BG → DIVERSITY → CATEGORY → COMPLIANCE
            return [
                // SUBJECT
                `Icon set theme: ${subject}.`,

                // CANVAS ORIENTATION — informasikan shape canvas sebelum layout
                `Canvas shape: ${arHint}. This canvas is exactly ${cols} cells wide and ${rows} cells tall.`,

                // LAYOUT — hard constraint
                `Single canvas. Strict ${gridSpec} grid. Exactly ${qty} icons total. Each cell is perfectly equal size.`,
                `Each icon fills 75–85% of its cell with equal padding on all sides. Icons do NOT overflow cell boundaries.`,
                `Optical size and visual weight IDENTICAL across all ${qty} icons.`,

                // ROW STRUCTURE — eksplisit per baris
                `Row structure: ${rowInstructions} There are EXACTLY ${rows} row(s). Do NOT add Row ${rows + 1} or any row beyond ${rows}.`,

                // STYLE DNA
                preset.styleDNA,

                // BACKGROUND
                `${bg} background. Zero divider lines. Zero drop shadows between icons. Zero text labels. Zero decorative borders.`,

                // DIVERSITY
                `Each of the ${qty} icons must represent a DIFFERENT object/concept with a distinct unique silhouette — absolutely no duplicates or near-duplicates.`,
                `Vary internal complexity naturally but maintain identical stroke weight across all icons.`,

                // CATEGORY
                categoryContext ? `Category context: ${categoryContext}.` : '',

                // HARD COMPLIANCE — sertakan contoh SALAH agar model tidak menebak
                `ABSOLUTE RULE: output must contain EXACTLY ${qty} icons in a ${gridSpec} layout.`,
                `WRONG: ${cols}×${cols} = ${cols * cols} icons. WRONG: ${cols}×${rows + 1} = ${cols * (rows + 1)} icons. CORRECT: ${cols}×${rows} = ${qty} icons.`,
                `The canvas fits exactly ${cols} columns across and ${rows} rows down — adding more rows overflows the canvas.`,
            ].filter(Boolean).join('\n');
        }

        // Per canvas — Layer order: SUBJECT → ISOLATION → STYLE → BACKGROUND → VARIATION → CATEGORY → COMPLIANCE
        return [
            // SUBJECT — anchor pertama
            `${subject}.${visualDescription ? ` ${visualDescription}.` : ''}`,

            // ISOLATION — constraint sebelum style
            `Single icon only. One clear subject. No grid, no sheet, no collection, no multiple icons.`,

            // STYLE DNA
            preset.styleDNA,

        // BACKGROUND
        `${bg} background. Centered, isolated composition with generous padding on all sides.`,

        // CATEGORY
        categoryContext ? `Category: ${categoryContext}.` : '',

        // COMPLIANCE
        `STRICT: render exactly one icon on this canvas.`,
    ].filter(Boolean).join('\n');
}; */

// Deterministic per-canvas icon concept variations — mengganti placeholder
// "variation N" yang menghasilkan icon nyaris identik (risiko similar-content
// di Adobe Stock). Setiap index memakai sudut pandang / elemen pendukung /
// aktivitas yang BERBEDA secara nyata supaya tiap file ikon punya konsep unik
// sambil tetap satu tema.
// 09.5 · PROMPT INTEGRITY — Semantic Intent extraction + validation (audit DNA)
// -
// Fix #3 (audit_DNA.md): user intent harus LOCKED di prompt — Gemini boleh
// memperkaya visual, tapi TIDAK boleh mengganti primary subject/domain.
// Fix #4: single semantic-lock contract dipakai semua path (sidebar/JSON).

// Domain utama per kategori DNA (internal). Dipakai untuk forbidden concepts
// anti-drift: objek/domain yang tidak boleh menggantikan subject utama.
import { DOMAIN_BY_CATEGORY } from './engines/intent-engine';

// Konsep yang "membalik" domain user (penyebab utama drift seperti
// botanical → mobil). Kata-kata ini TIDAK boleh menjadi subject utama hasil
// generasi, kecuali memang diminta user secara eksplisit.
// F6 (Sprint 6b): base per-domain — di-generate penuh oleh buildForbiddenDomains()
// supaya SEMUA kategori terlindungi (bukan hanya yang ada di daftar ini).
import { DOMAIN_FORBIDDEN } from './engines/intent-engine';

// F6 · FORBIDDEN DOMAIN GENERATOR (Sprint 6b)
// -
// Prinsip: TIDAK boleh ada kategori yang terlindungi lemah. buildForbiddenDomains
// menghasilkan forbidden concepts untuk SEMUA kategori DNA (22 kategori internal)
// dari tiga sumber:
//   Semantic incompatibility matrix — objek yang hampir mustahil menjadi
//      domain yang sama (vehicle vs botanical, food vs vehicle, dsb).
//   Category DNA (CATEGORY_DNA[cat].visualDNA) — kata kunci domain spesifik.
//   Fallback universal — kategori yang belum punya aturan tetap mendapat
//      perlindungan (jangan pernah kosong).
// Hasilnya konsisten dipakai oleh extractSemanticIntent → semantic lock.

// Incompatibility matrix: domain → forbidden concepts (semantic boundary).
// Lebih lengkap daripada DOMAIN_FORBIDDEN lama; dipakai sebagai base.
import { DOMAIN_FORBIDDEN_MATRIX } from './engines/intent-engine';

// Ambil kata kunci domain dari visualDNA kategori (bila ada) — dipakai untuk
// melengkapi forbidden dengan sinonim domain yang BUKAN domain user.
import { extractDomainKeywordsFromDNA } from './engines/intent-engine';

// Generator F6 — forbidden concepts lengkap untuk SEMUA kategori.
import { buildForbiddenDomains } from './engines/intent-engine';

// FASE 7 · INTENT ENGINE — buildCanonicalIntent + lock + validate
// -
// IntentEngine: extract (dari semanticIntent + request) → lock (semanticLocks)
// → validate (field wajib). Tidak menyentuh pipeline lama; hasilnya kontrak
// terstruktur yang bisa dikonsumsi ConstraintEngine & production trace.

// Lock list — setiap request menghasilkan semantic lock eksplisit.
import { buildSemanticLocks } from './engines/intent-engine';

// Bangun CanonicalProductionIntent dari semanticIntent (Sprint 1) + request.
import { buildCanonicalIntent } from './engines/intent-engine';

// Validate — field wajib harus terisi sebelum generate.
import { validateCanonicalIntent } from './engines/intent-engine';

// FASE 7 · CONSTRAINT ENGINE — resolveConstraints
// -
// Deteksi konflik lintas dimensi (subject_style, subject_asset, dsb). Hasilnya
// berupa warning (bukan hard reject) — dipakai untuk trace & perbaikan prompt,
// sesuai prinsip "constraint engine menyaring sebelum compiler".
import { resolveConstraints } from './engines/intent-engine';

// FASE 7 · F12 — Regeneration Plan (wrong-subject)
// -
// Kalau semantic QA menolak (wrong_subject), hasilkan plan perbaikan yang
// MEMPERKUAT intent asli — tidak pernah mengubah subject/asset type/style.
// FASE 7 · F19 — Production Trace
// -
// Menggabungkan SEMUA jejak produksi (yang sudah dikumpulkan di placeholder)
// jadi satu object trace lengkap — tanpa API baru. Dasar audit "kenapa gambar
// menyimpang" (prompt benar tapi hasil salah, dsb).
// Ekstraksi semantic intent dari subject/prompt user — pure heuristic, tanpa
// API call. Menghasilkan object formal SemanticIntent (Phase 4 plan 20 fase):
// { rawPrompt, primarySubject, subjectDomain, secondarySubjects, scene, action,
//   assetConcept, assetProfile, categoryHint, lockedTerms, forbiddenDomains,
//   explicitUserIntent, confidence }.
// Backward-compat: field lama `primarySubject`, `domain`, `forbiddenConcepts`
// tetap dipertahankan sebagai alias supaya callsite lama tidak rusak.
// Sprint 1 (plan 20 fase) — dipanggil dengan (prompt, category, subcategory?, assetType?)
import { extractSemanticIntent } from './engines/intent-engine';

// cek apakah teks mengandung konsep (word-boundary aware, bukan substring).
import { containsConcept } from './engines/intent-engine';

// Prompt Integrity Check (audit DNA) — sebelum generate. Kalau primary subject
// hilang dari final prompt → drift (fail). Kalau forbidden concept muncul →
// warning saja (bisa jadi bagian deskripsi visual yang sah, mis. "no cars").
import { validatePromptIntegrity } from './engines/intent-engine';

// Blok SEMANTIC LOCK yang disisipkan ke prompt final — instruksi eksplisit ke
// model bahwa subject, domain, dan asset profile user adalah LOCK; style hanya
// transform rendering, tidak pernah menentukan "apa yang digambar".
// Sprint 1 (plan 20 fase, Phase 5): urutan tegas PRIMARY SUBJECT → DOMAIN →
// ASSET PROFILE → FORBIDDEN DOMAINS. Style TIDAK disebut di sini — style selalu
// muncul SETELAH subject lock di layer [STYLE]/styleGuidance.
import { buildSemanticLockToken } from './engines/prompt-helpers';

// 09.5b · STYLE INTELLIGENCE — Gemini Style Interpreter + Cache (Sprint 2)
// -
// Plan 20 fase, Phase 2-3 & 8. Prinsip:
//   resolveStyle() → registry lookup → known? preset | unknown → Gemini
// Style = "bagaimana digambar", BUKAN "apa yang digambar". Interpreter hanya
// menerjemahkan style menjadi visual rendering directive, tidak pernah
// menentukan subject. Cache key = style name saja (bukan style+subject):
// "Cottage Garden + flower" dan "Cottage Garden + packaging" = style sama.

// Soft Style Compatibility Gate (Phase 8) — TIDAK agresif, TIDAK reject.
// Menghasilkan verdict informasi: preset → compatible; custom → overlap domain
// → compatible; tanpa overlap tapi confidence tinggi → plausible (tetap jalan);
// confidence rendah → unknown. Tidak pernah memblokir generate di Sprint 2.
import { assessStyleCompatibility } from './engines/intent-engine';


import { getAssetFileSizeKB } from './utils';

import { formatFileSize } from './utils';

import { isUpscaleEligible } from './utils';



// trace SATU asset raster → SVG (per complexity). Pakai cache
// IndexedDB bila level sudah pernah di-trace; kalau gambar sudah berubah
// (upscale/regenerate) cache di-reset otomatis oleh handler terkait.


// bulk trace asset terpilih (Vector/Illustration/Icon saja).


// bulk trace icon dengan preset optimal per icon style (11 style).
// Setiap icon style punya karakter stroke/fill/warna berbeda → preset dioptimalkan
// agar garis sangat mulus tidak pecah/kasar (smoothEdges:true, lineQuality sesuai).
// Background ikut pilihan user (transparent / white) — tidak di-hardcode per style.
// Hasil dibuat sebagai asset SVG baru per PNG (seperti doSave di modal), bukan update cache.



// 09.5c · PROMPT COMPILER — deterministic final prompt builder (Sprint 3)
// -
// Plan 20 fase, Phase 7/9/16/18. Satu-satunya tempat final prompt di-compile.
// Urutan layer FIX (deterministic): GLOBAL DNA → BACKGROUND → SUBJECT/DNA →
// SEMANTIC LOCK → COMMERCIAL → STYLE → COMPOSITION → USER PROMPT → NEGATIVE →
// FORMAT. Style TIDAK pernah muncul sebelum subject lock. Input identik →
// output identik (sidebar & JSON pakai fungsi yang sama = unified path).

// Build object PromptGraph (Phase 7) — struktur data ter-inspeksi, bukan string.
// 09.5d · POST-GENERATION SEMANTIC QA (Sprint 4)
// -
// Plan 20 fase, Phase 11-13. Memakai hasil vision Layer A (analyzeVisualTruth:
// primarySubject, objects, patternType, composition) yang SUDAH ada di preflight
// — TIDAK menambah API call. Tujuannya: prompt benar tapi gambar salah (mis.
// botanical → mobil) ditangkap sebelum masuk Library.

// Deteksi domain dari teks vision (primarySubject/objects) — heuristik keyword.
// Word-boundary aware (bukan substring): 'scar' tidak boleh match 'car'.
// Return array domain tags (lowercase).
import { detectDomainsFromVision } from './engines/intent-engine';

// Semantic Match QA (Phase 11) — bandingkan intent (dari prompt) dengan vision.
// Kontrak:
//   { expectedDomain, detectedDomains[], primarySubjectMatch, verdict, confidence, reason }
// Verdict: 'match' | 'wrong_subject' | 'unknown'. 'unknown' TIDAK menolak.
import { assessSemanticMatch } from './engines/intent-engine';

// Asset Profile QA (Phase 13, parsial) — cek profil dari vision vs intent.
// Pattern: vision patternType harus mengandung 'pattern'; icon: isolated single.
// 09.5e · CONCEPT FINGERPRINT — deterministic similarity layer (Sprint 5)
// -
// Plan 20 fase, Phase 14-15. Lapisan similarity KETIGA (selain title-based
// `computeTitleSimilarity` dan visual dHash `checkLibraryVisualSimilarity`):
// fingerprint konsep dari semantic intent + style + DNA. Deterministik (hash
// dari terms), bukan random — beda dari `genDNASignature` (session diversity).

// 09.5f · REJECTION TAXONOMY & PRODUCTION POLICY (Sprint 6)
// -
// Plan 20 fase, Phase 20. Feedback Loop jadi fondasi belajar: rejection Adobe
// / QA diklasifikasikan ke taxonomy terstruktur (bukan free-text), direkam via
// feedbackEngine.record (sudah ada), lalu diagregasi jadi Production Policy.

// Taxonomy: reasonCode / pola issue → { category, feedbackType, severity }.
// Dipakai oleh classifyRejection() untuk mengisi feedbackType saat record.
// Klasifikasikan reasonCode / issue string → taxonomy entry. Fallback:
// { category: 'unknown', feedbackType: 'unclassified', severity: 'info' }.
// Rekam feedback rejection terstruktur — memakai feedbackEngine.record yang
// sudah ada, dengan feedbackType + taxonomy dari classifyRejection.
// FASE 6: dipanggil dari markRejectedByAdobe() (App) saat user menandai asset
// ditolak Adobe setelah disubmit — basis kalibrasi threshold QA ke kenyataan.
// Production Policy (parsial, Sprint 6) — agregasi history feedback rejection
// → jenis penolakan paling sering + per kategori + saran sederhana.
// STATUS: belum ada callsite — rencana di-wire ke UI "Submission Readiness"
// (komponen yang dipakai saat ini adalah computeSubmissionReadiness di [07]).
// [09.05] GENERATION ENGINE
//         Fungsi: generateImageWithGemini, finalizeAsset,
//                 isUpscaleEligible
//         Rule: Async I/O only. No React. No UI state. No DNA data.

// -
// FASE 8 · REQUEST INTAKE & NORMALIZATION
// -
// Menggantikan kebutuhan "stepIntake/stepNormalize": sidebar, JSON batch, dan
// batch semuanya dinormalisasi ke NormalizedRequest seragam sebelum masuk
// pipeline. Intake = blocking (invalid → tidak generate).
// -

// Intake validation — blocking. Prompt kosong/terlalu pendek, assetType/
// category/platform hilang → request ditolak SEBELUM pipeline.
// 16 · STORAGE / PROJECT ENGINE — history log helper
// -
// Dipindahkan APA ADANYA dari dalam App() (Fase 3e), sebelum App(). Satu-
// satunya closure dependency (setHistoryLogs) sekarang diterima lewat ctx.
// Pemanggil yang tetap di App() (saveRevisedAsset) mengirim { setHistoryLogs }
// langsung; pemanggil yang ikut dipindah (importAllData) mengirim ctx yang
// sama yang diterimanya sendiri.
// 16 · STORAGE / PROJECT ENGINE — bulk draft cleanup
// -
// Dipindahkan APA ADANYA dari dalam App() (Fase 3e), sebelum App(). Sama
// seperti fungsi Storage/Project Engine lain, menerima ctx eksplisit.
//
// "Delete Old Drafts" di JSX yang memanggilnya. Tidak dihapus, hanya dicatat.
// Estimator biaya API — dipakai footer sidebar. Menghitung jumlah CALL NYATA:
//   Normal: expand (1) + image (1) per asset; +1 differentiation check (EU-10)
//           jika aktif; +1 getBatchSlotsAI jika AI composition aktif & qty>1.
//   Icon:   1 call image per canvas (sheet = 1 canvas); tidak ada expand.
import { estimateApiCalls } from './utils';

// [11] APPLICATION — App()
//      Rule: State destructure dari useImaginStateStore() + JSX render ONLY.
//            Business logic → [09] DOMAIN ENGINES atau [07] PRODUCTION PIPELINE.
//            Event handlers yang murni UI (setState) boleh inline.
//            Event handlers dengan business logic → pindah ke FASE 5.
export default function StudioApp({ onNavigate }: { onNavigate?: (module: string, assetIds?: string[]) => void } = {}) {
    const [inspectorAsset, setInspectorAsset] = useState<any | null>(null);
    const [inspectorTab, setInspectorTab] = useState<'inspector' | 'metadata' | 'history'>('inspector');
    // [06] STATE STORE — destructure dari custom hook
    const {
        theme,
        setTheme,
        systemSettings,
        setSystemSettings,
        studioPrefsHydrated,
        studioIdbMigrationNeeded,
        setStudioIdbMigrationNeeded,
        isSettingsOpen,
        setIsSettingsOpen,
        blockingDialog,
        setBlockingDialog,
        assets,
        setAssets,
        isAssetsLoading,
        setIsAssetsLoading,
        historyLogs,
        setHistoryLogs,
        searchQuery,
        setSearchQuery,
        filterStatus,
        setFilterStatus,
        workspaceView,
        setWorkspaceView,
        selectedAssetDetail,
        setSelectedAssetDetail,
        previewZoom,
        setPreviewZoom,
        gridModalAsset,
        setGridModalAsset,
        selectedAssetIds,
        setSelectedAssetIds,
        preflightState,
        setPreflightState,
        animationV2Modal,
        setAnimationV2Modal,
        animateFromPngState,
        setAnimateFromPngState,
        preflightEdit,
        setPreflightEdit,
        preflightEditDirty,
        setPreflightEditDirty,
        regenField,
        setRegenField,
        regenFieldRef,
        metadataGenerating,
        setMetadataGenerating,
        metadataStep,
        setMetadataStep,
        metadataProgress,
        setMetadataProgress,
        importedBatch,
        setImportedBatch,
        batchQueue,
        setBatchQueue,
        isBatchPauseRequested,
        setIsBatchPauseRequested,
        pauseBatchRef,
        discardBatchRef,
        importPasteModalOpen,
        setImportPasteModalOpen,
        pasteJsonInput,
        setPasteJsonInput,
        pasteJsonErrors,
        setPasteJsonErrors,
        jsonModalTab,
        setJsonModalTab,
        jsonFormatModalOpen,
        setJsonFormatModalOpen,
        jsonFormatCopied,
        setJsonFormatCopied,
        promptSafety,
        setPromptSafety,
        revisionState,
        setRevisionState,
        vectorState,
        setVectorState,
        isRenderingAssets,
        setIsRenderingAssets,
        generationProgress,
        setGenerationProgress,
        cancelGenerationRef,
        generationLockRef,
        toasts,
        setToasts,
        cleanupRef,
        promptPreview,
        setPromptPreview,
        bulkMenuOpen,
        setBulkMenuOpen,
        todayKeyRef,
        apiCallsToday,
        setApiCallsToday,
        incrementApiCallCounter,
        isHistoryOpen,
        setIsHistoryOpen,
        isHelpOpen,
        setIsHelpOpen,
        helpActiveTab,
        setHelpActiveTab,
        importFileInputRef,
        importImageInputRef,
        referenceImageInputRef,
        objectModInputRef,
        importHubOpen,
        setImportHubOpen,
        objectModState,
        setObjectModState,
        editBgState,
        setEditBgState,
        removeBgState,
        setRemoveBgState,
        projects,
        setProjects,
        activeProjectId,
        setActiveProjectId,
        rejectionInsights,
        setRejectionInsights,
        tasksOpen,
        setTasksOpen,
        tasksCollapsed,
        setTasksCollapsed,
        sidebarMenuOpen,
        setSidebarMenuOpen,
        lockSettings,
        setLockSettings,
        customStyles,
        setCustomStyles,
        sidebarProjectOpen,
        setSidebarProjectOpen,
        researchOpen,
        setResearchOpen,
        researchResults,
        setResearchResults,
        isResearching,
        setIsResearching,
    } = useImaginStateStore();

    const [jsonHeaderMenuOpen, setJsonHeaderMenuOpen] = useState(false);
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const themeWriteReadyRef = useRef(false);
    const videoUrlWriteReadyRef = useRef(false);
    const negativePromptWriteReadyRef = useRef(false);
    const diffCheckWriteReadyRef = useRef(false);
    const jsonBatchFileInputRef = useRef(null);
    // Multi-file batch import preview (ses_fcc2+): user pilih N file .json,
    // kita parse + tampilkan preview list, user pilih yang mana yang di-import.
    // Tiap item: { fileName, text, _raw, batchName, promptCount, error, selected }.
    // Local state (tidak di-share dengan engine), cukup di App() saja.
    const [batchImportPreview, setBatchImportPreview] = useState<{ files: any[] } | null>(null);
    const [referencePromptConfirmation, setReferencePromptConfirmation] = useState<{
        prompt: string;
        onConfirm: (() => void) | null;
    }>({ prompt: '', onConfirm: null });
    const [lastReferencePreview, setLastReferencePreview] = useState<{ url: string; name: string } | null>(null);
    const [isReferenceAnalyzing, setIsReferenceAnalyzing] = useState(false);
    const referenceAnalysisTokenRef = useRef(0);
    const vectorStateRef = useRef(null);
    const preflightInFlightRef = useRef(new Set());
    const libraryMigrationRef = useRef(false);
    // FIX #20 (audit): ref guard untuk bulk metadata — mencegah double-click race.
    const bulkMetadataLockRef = useRef(false);
    // Keep latest prompt for stale-closure checks in async reference flow
    // (avoid overwriting user typing during vision analysis).
    // Sync happens below in an effect.
    const [referenceInferredSettings, setReferenceInferredSettings] = useState(null);
    const [masterPromptMode, setMasterPromptMode] = useState<'single' | 'json' | 'import'>('single');
    // [UX P1-2] migrate legacy 'import' tab → secondary ghost buttons in single mode
    useEffect(() => { if ((masterPromptMode as string) === 'import') setMasterPromptMode('single'); }, [masterPromptMode]);

    useEffect(() => { vectorStateRef.current = vectorState; }, [vectorState]);

    // Auto-advance toast: saat batch dengan multi-file, kalau completed melewati
    // endIndex sebuah file (selain file terakhir), tampilkan toast.
    // Track lastNotifiedFileIdx via useRef agar tidak double-toast saat re-render.
    const lastNotifiedFileIdxRef = useRef<number>(-1);
    // Reset ref setiap kali importedBatch berganti (batch baru di-load) atau null (cancel/reset).
    // Tanpa reset ini, toast bisa ter-skip kalau user import batch baru setelah batch sebelumnya
    // (ref masih pointing ke file index lama, sehingga threshold `lastNotified < i` gagal).
    useEffect(() => {
        lastNotifiedFileIdxRef.current = -1;
    }, [importedBatch?.id]);
    useEffect(() => {
        const files = importedBatch?.files;
        if (!files || files.length <= 1) return;
        if (importedBatch?.status !== 'generating') return;
        const completed = batchQueue.completed;
        // Cari file index yang baru saja selesai (completed === endIndex + 1)
        for (let i = 0; i < files.length - 1; i++) {
            const f = files[i];
            if (completed > f.endIndex && lastNotifiedFileIdxRef.current < i) {
                lastNotifiedFileIdxRef.current = i;
                const displayName = f.displayBatchName || f.batchName;
                const next = files[i + 1];
                const nextName = next ? (next.displayBatchName || next.batchName) : '';
                showToast(` File ${i + 1} "${displayName}" selesai (${f.promptCount} prompts). Lanjut ke file ${i + 2} "${nextName}"...`, 'success');
                break;
            }
        }
    }, [batchQueue.completed, importedBatch?.status, importedBatch?.files]);

    const resetSidebarToManual = () => {
        clearBatchProgress();
        setImportedBatch(null);
        setBatchQueue(createIdleBatchQueue());
        setVectorState(createInitialVectorState());
        setPasteJsonInput('');
        setPasteJsonErrors([]);
        setJsonModalTab('paste');
        setIsBatchPauseRequested(false);
        pauseBatchRef.current = false;
        discardBatchRef.current = false;
        cancelGenerationRef.current = false;
        generationLockRef.current = false;
        lastNotifiedFileIdxRef.current = -1;
    };

    const cancelJsonImport = () => {
        clearBatchProgress();
        if (isRenderingAssets) {
            discardBatchRef.current = true;
            cancelGenerationRef.current = true;
            pauseBatchRef.current = false;
            setIsBatchPauseRequested(false);
            showToast('Batch akan dibatalkan setelah prompt yang sedang berjalan selesai.', 'info');
            return;
        }
        resetSidebarToManual();
        showToast('JSON preset cancelled.', 'info');
    };

    const uiCtx = { setToasts, setBlockingDialog, setPreflightEditDirty, setPreflightEdit, setPreflightState };
    const showToast = useCallback((msg: string, type: uiFlow.ToastType = 'info') => uiFlow.showToast(uiCtx, msg, type), []);
    const confirmBlocking = useCallback((options) => uiFlow.confirmBlocking(uiCtx, options), []);
    const closePreflightModal = useCallback(() => uiFlow.closePreflightModal(uiCtx), []);

    const projectsCtx = { projects, setProjects, activeProjectId, setActiveProjectId, setSidebarProjectOpen, showToast };
    const handleCreateProject = (name = '') => projectsFlow.handleCreateProject(projectsCtx, name);
    const handleSwitchProject = (projectId) => projectsFlow.handleSwitchProject(projectsCtx, projectId);
    const handleDuplicateProject = (project) => projectsFlow.handleDuplicateProject(projectsCtx, project);
    const handleArchiveProject = (project) => projectsFlow.handleArchiveProject(projectsCtx, project);
    const handleDeleteProject = (projectId) => projectsFlow.handleDeleteProject(projectsCtx, projectId);

    useEffect(() => {
        return subscribeOpenStudioModal((modal) => {
            if (modal === 'settings') setIsSettingsOpen(true);
            else if (modal === 'help') setIsHelpOpen(true);
            else if (modal === 'history') setIsHistoryOpen(true);
        });
    }, [setIsSettingsOpen, setIsHelpOpen, setIsHistoryOpen]);

    useEffect(() => {
        if (!studioPrefsHydrated) return;
        if (!themeWriteReadyRef.current) { themeWriteReadyRef.current = true; return; }
        void window.api?.studioSaveConfig?.({ theme }).catch(() => {});
    }, [theme, studioPrefsHydrated]);

    useEffect(() => {
        const existing = document.getElementById('imagin-tailwind-styles');
        if (!existing) {
            const s = document.createElement('style');
            s.id = 'imagin-tailwind-styles';
            s.textContent = tailwindStyles;
            document.head.appendChild(s);
        }
        Promise.all([loadStudioAssets(), getHistoryDB()])
            .then(([a, h]) => {
                const loaded = a?.assets || [];
                const status = a?.status || "idb-fallback";
                if (status === "unavailable") {
                    console.error('Studio Library load failed; retaining last canonical state');
                    showToast('Library unavailable; Studio assets may be stale.', 'error');
                }
                setAssets(prev => {
                    // Gallery-canonical merge: canonical drops every prior asset
                    // not returned by the Library (unless transient in-progress);
                    // idb-fallback keeps IDB + prev (renderer-only); unavailable
                    // retains last canonical React state untouched.
                    return mergeLoadedStudioAssets(loaded, prev || [], status);
                });
                setHistoryLogs(prev => {
                    const loadedH = h || [];
                    if (!prev || prev.length === 0) return loadedH;
                    const byId = new Set(loadedH.map(x => x.id));
                    return [...loadedH, ...prev.filter(p => !byId.has(p.id))].sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0));
                });
            })
            .catch(err => {
                console.error('Failed to load local Imagin data:', err);
                showToast('Local library failed to load. IndexedDB may be blocked or unavailable.', 'error');
            })
            .finally(() => setIsAssetsLoading(false));
        // FASE 6: load project list dari IndexedDB + pulihkan active project.
        projectEngine.list()
            .then(list => {
                setProjects(list || []);
                setProjectsLoaded(true);
            })
            .catch(() => {});
        loadBatchProgress().then(savedBatch => {
            if (savedBatch && typeof savedBatch === 'object' &&
                'batch' in savedBatch && savedBatch.batch && typeof savedBatch.batch === 'object' &&
                'prompts' in savedBatch.batch && Array.isArray(savedBatch.batch.prompts) && savedBatch.batch.prompts.length) {
                setImportedBatch({ ...savedBatch.batch, status: 'paused', currentIndex: savedBatch.promptIndex || 0 });
                setBatchQueue({
                    ...createIdleBatchQueue(),
                    isPaused: true,
                    currentIndex: savedBatch.promptIndex || 0,
                    completed: savedBatch.promptIndex || 0,
                    total: savedBatch.batch.prompts.length,
                    phase: 'paused',
                    sessionId: savedBatch.sessionId || null,
                    batchId: savedBatch.batchId || null,
                });
            }
        });
        return () => {
            cleanupRef.current.forEach(fn => fn());
            cleanupRef.current = [];
        };
    }, []);

    useEffect(() => {
        // Phase 5C: reconcile Local-originated deletions + bounded sync-error retry.
        // Tombstones/events use raw IndexedDB delete ONLY (never loop back to main);
        // durable tombstones are acked only after successful local deletion.
        let disposed = false;

        const drainTombstones = async () => {
            try {
                const res = await window.api?.studioSyncGetDeletions?.();
                if (!res?.success || !res.ids?.length) return;
                const removed: string[] = [];
                for (const id of res.ids) {
                    try {
                        await deleteAssetDBQueued(id);
                        removed.push(id);
                    } catch (err) {
                        console.warn('[Imagin] tombstone local delete failed:', id, err);
                    }
                }
                if (removed.length) {
                    setAssets(prev => prev.filter(a => !removed.includes(a.id)));
                    await window.api?.studioSyncAckDeletions?.(removed);
                }
            } catch (err) {
                console.warn('[Imagin] tombstone drain failed:', err);
            }
        };

        // Bounded retry: only assets in sync-error state, capped per cycle.
        const retrySyncErrors = async () => {
            try {
                const errored = (await getAssetsDB()).filter(a => a.librarySyncState === 'error').slice(0, 20);
                for (const a of errored) {
                    if (disposed) return;
                    try { await saveAssetDB(a); } catch (err) { console.warn('[Imagin] sync retry failed:', a.id, err); }
                }
            } catch (err) {
                console.warn('[Imagin] sync-error retry failed:', err);
            }
        };

        const onFocus = () => {
            if (document.visibilityState === 'hidden') return;
            drainTombstones();
            retrySyncErrors();
        };

        const unsub = window.api?.onStudioAssetDeleted?.((studioAssetId: string) => {
            deleteAssetDBQueued(studioAssetId)
                .then(() => { if (!disposed) setAssets(prev => prev.filter(a => a.id !== studioAssetId)); })
                .catch(err => console.warn('[Imagin] local delete from Library failed:', studioAssetId, err));
        });

        // Gallery-canonical: a Library change (e.g. migration pushed a canonical
        // record, or Gallery modified/deleted an asset) refreshes the canonical
        // Studio asset list.  Falls back to IDB-only when the Library API does
        // not exist (renderer-only test/dev).  When canonical, every asset not
        // returned by the Library is dropped (unless still transient in-progress)
        // so Gallery-originated deletions never resurrect from stale state.  If
        // the Library API exists but fails, retain last canonical state.
        const refreshCanonical = async () => {
            if (disposed) return;
            try {
                const res = await loadStudioAssets();
                if (disposed) return;
                const loaded = res?.assets || [];
                const status = res?.status || "idb-fallback";
                if (status === "unavailable") {
                    console.warn('[Imagin] canonical refresh unavailable; retaining last canonical state');
                    return;
                }
                setAssets(prev => mergeLoadedStudioAssets(loaded, prev || [], status));
            } catch (err) {
                console.warn('[Imagin] canonical refresh failed:', err);
            }
        };
        const unsubLib = window.api?.onLibraryUpdated?.(() => { refreshCanonical(); });

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        drainTombstones();
        retrySyncErrors();

        return () => {
            disposed = true;
            unsub?.();
            unsubLib?.();
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, []);

    useEffect(() => {
        // Phase 5D: bounded migration of legacy unlinked Studio assets to the
        // main-process Library. Runs once prefs are hydrated AND assets are loaded
        // (the 5C reconciliation effect above registered on mount). Processes
        // batches of 10 sequentially, scheduling the next batch via setTimeout so
        // the UI isn't blocked. Sync state is self-tracking: migrated assets get
        // librarySyncState="synced" and won't be re-picked; failures stay unlinked
        // and are retried on the next startup.
        if (!studioPrefsHydrated || isAssetsLoading) return;
        // N2 guard: without a main-process sync API (e.g. renderer-only dev) no
        // asset can ever leave the unlinked pool, so skip migration entirely
        // instead of rescheduling batches forever.
        if (!window.api?.studioAssetUpsert) return;
        let disposed = false;
        const BATCH_LIMIT = 10;
        const BATCH_DELAY_MS = 500;

        const runMigrationBatch = async () => {
            if (disposed || libraryMigrationRef.current) return;
            libraryMigrationRef.current = true;
            try {
                const all = await getAssetsDB();
                const batch = getUnlinkedEligibleAssets(all, BATCH_LIMIT);
                if (batch.length === 0) return; // nothing left to migrate
                const { migrated, failed } = await migrateUnlinked(
                    batch.map(a => a.id),
                    saveAssetDBMigrate,
                );
                console.log(`[LibrarySync] migrated ${migrated}/${batch.length} assets`);
                if (failed > 0) console.warn(`[LibrarySync] ${failed} asset(s) failed to migrate`);
                // More may remain after this batch; schedule the next cycle.
                setTimeout(runMigrationBatch, BATCH_DELAY_MS);
            } catch (err) {
                console.warn('[LibrarySync] migration batch failed:', err);
            } finally {
                libraryMigrationRef.current = false;
            }
        };

        runMigrationBatch();
        return () => { disposed = true; };
    }, [studioPrefsHydrated, isAssetsLoading, setAssets]);

    useEffect(() => {
        if (!studioPrefsHydrated || !studioIdbMigrationNeeded) return;
        migrateIdbToStudioStore()
            .then(async () => {
                const saved = await window.api?.studioSaveConfig?.({ idbMigrated: true });
                if (!saved?.success) throw new Error(saved?.detail || 'Failed to mark IDB migration complete');
                setStudioIdbMigrationNeeded(false);
                const [history, projectList] = await Promise.all([getHistoryDB(), projectEngine.list()]);
                setHistoryLogs(history || []);
                setProjects(projectList || []);
                setProjectsLoaded(true);
            })
            .catch(err => console.warn('[Imagin] IDB studio-store migration failed; retrying next launch:', err));
    }, [studioPrefsHydrated, studioIdbMigrationNeeded, setStudioIdbMigrationNeeded, setHistoryLogs, setProjects]);

    useEffect(() => {
        if (!studioPrefsHydrated || studioIdbMigrationNeeded || !projectsLoaded || !activeProjectId) return;
        if (!projects.some(p => p.projectId === activeProjectId)) {
            void window.api?.studioSaveConfig?.({ activeProjectId: '' }).catch(() => {});
            setActiveProjectId(null);
        }
    }, [activeProjectId, projects, projectsLoaded, studioPrefsHydrated, studioIdbMigrationNeeded, setActiveProjectId]);

    useEffect(() => {
        if (!studioPrefsHydrated || isRenderingAssets) return;
        void loadBatchProgress().then((saved: any) => {
            if (!saved?.batch?.vectorState || saved.batch.importedBatch || !(saved.promptIndex > 0)) return;
            if (saved.batch.status !== 'paused') return;
            setVectorState(prev => ({ ...prev, ...saved.batch.vectorState }));
            setBatchQueue(prev => ({ ...prev, isRunning: true, isPaused: true, currentIndex: saved.promptIndex, total: saved.batch.vectorState.quantity || prev.total }));
            showToast('Batch sebelumnya ditemukan. Lanjutkan dari progres tersimpan.', 'info');
        }).catch(() => {});
    }, [studioPrefsHydrated]);

    useEffect(() => uiFlow.installUiEffects({
        bulkMenuOpen, setBulkMenuOpen, sidebarMenuOpen, setSidebarMenuOpen,
        animateFromPngState,
        setAnimateFromPngState, animationV2Modal, setAnimationV2Modal,
        preflightState, closePreflightModal, selectedAssetDetail,
        setSelectedAssetDetail, gridModalAsset,
        setPreviewZoom, setGridModalAsset, promptPreview, setPromptPreview,
        revisionState, setRevisionState, isHistoryOpen, setIsHistoryOpen,
        isHelpOpen, setIsHelpOpen, isSettingsOpen, setIsSettingsOpen,
        jsonFormatModalOpen, setJsonFormatModalOpen, importPasteModalOpen,
        setImportPasteModalOpen,
    }), [animateFromPngState.isOpen, animationV2Modal, preflightState.isOpen, selectedAssetDetail, gridModalAsset, promptPreview, revisionState.isOpen, revisionState.isRevising, isHistoryOpen, isHelpOpen, isSettingsOpen, jsonFormatModalOpen, importPasteModalOpen, bulkMenuOpen, sidebarMenuOpen, closePreflightModal, setSelectedAssetDetail, setGridModalAsset, setPromptPreview, setRevisionState, setIsHistoryOpen, setIsHelpOpen, setIsSettingsOpen, setJsonFormatModalOpen, setImportPasteModalOpen, setBulkMenuOpen, setSidebarMenuOpen, setAnimationV2Modal]);

    // FIX: saat History dibuka, ambil feedback rejection dari store dan
    // agregasi jadi Production Policy (deriveProductionPolicy) — panel
    // "Pola Penolakan" di History Modal. Fitur ini tadinya hanya merekam
    // feedback tanpa pernah menampilkan hasilnya.
    useEffect(() => projectsFlow.loadRejectionFeedback({ isHistoryOpen, setRejectionInsights }), [isHistoryOpen]);

    // BUG-3: feedback retry/backoff — throttle supaya tidak spam toast saat
    // beberapa request retry bersamaan, tapi user tetap tahu API sedang dijeda.
    useEffect(() => {
        let lastNotified = 0;
        setFetchRetryNotifier((status, delayMs) => {
            const now = Date.now();
            if (now - lastNotified < 3000) return;
            lastNotified = now;
            const reason = status >= 500 ? `Server error (${status})` : 'Timeout/network';
            showToast(` ${reason} — mencoba ulang dalam ${Math.round(delayMs / 1000)}s…`, 'info');
        });
        return () => setFetchRetryNotifier(null);
    }, [showToast]);

    const uiPersistenceCtx = { studioPrefsHydrated, systemSettings, videoUrlWriteReadyRef, negativePromptWriteReadyRef, diffCheckWriteReadyRef };
    useEffect(() => uiFlow.persistVideoUrl(uiPersistenceCtx), [systemSettings.imaginVideoUrl, studioPrefsHydrated]);

    // FIX: persist commercial rules (negative prompt + differentiation toggle)
    // — sebelumnya hanya textModel/imageModel yang disimpan; aturan custom
    // hilang setiap reload. apiKey sengaja TIDAK dipersist (Gemini Canvas
    // inject session credentials; key kosong = pakai session).
    useEffect(() => uiFlow.persistNegativePrompt(uiPersistenceCtx), [systemSettings.commercialRules?.defaultNegativePrompt, studioPrefsHydrated]);

    useEffect(() => uiFlow.persistDiffCheck(uiPersistenceCtx), [systemSettings.commercialRules?.enableDifferentiationCheck, studioPrefsHydrated]);

    const handleAssetTypeChange = (newType) => {
        const preset = ASSET_TYPE_PRESETS[newType];
        if (!preset) return;

        setReferenceInferredSettings(null);
        setVectorState(prev => {
            const newVisual = { ...prev.visualSettings };
            const dirty = prev._visualDirty || {};

            const PRESET_FIELDS = ['aspectRatio', 'style', 'background', 'outputFormat', 'highDpiSharpness', 'faceless', 'negativeSpace'];
            PRESET_FIELDS.forEach(k => {
                if (!dirty[k] && preset[k] !== undefined) {
                    newVisual[k] = preset[k];
                }
            });

            const validStyles = STYLES_BY_ASSET_TYPE[newType] || [];
            const iconReset = { iconMode: false, iconStyle: null, iconQuantity: 1, iconGenerationMode: 'per_canvas' };
        // Reset generation mode dirty flag karena mode di-reset ke default
        const modeReset = { _generationModeDirty: false };

            // FASE 10: Ganti assetType TIDAK membuang style custom user.
            // Hanya reset ke default kalau user BELUM pernah memilih style
            // (tidak dirty). Kalau user sudah pilih style custom → pertahankan
            // (akan di-interpretasi sebagai custom style, bukan fallback).
            if (!dirty.style && !validStyles.includes(newVisual.style)) {
                newVisual.style = validStyles[0];
            }
            if (dirty.style && !validStyles.includes(newVisual.style)) {
                const { style: _removed, ...restDirty } = dirty;
                return {
                    ...prev,
                    assetType: newType,
                    generationMode: 'single',
                    quantity: 1,
                    visualSettings: newVisual,
                    _visualDirty: restDirty,
                    _assetTypeDirty: true,
                    ...iconReset,
                    ...modeReset,
                };
            }

            return {
                ...prev,
                assetType: newType,
                generationMode: 'single',
                quantity: 1,
                visualSettings: newVisual,
                _assetTypeDirty: true,
                ...iconReset,
                ...modeReset,
            };
        });
    };

    const handleVisualSettingChange = (key, value) => {
        setReferenceInferredSettings(null);
        setVectorState(prev => ({
            ...prev,
            visualSettings: { ...prev.visualSettings, [key]: value },
            _visualDirty: { ...prev._visualDirty, [key]: true },
        }));
    };

    const [customStyleModalOpen, setCustomStyleModalOpen] = useState(false);
    const handleSaveCustomStyle = (style: CustomStyle) => {
        let name = style.name.trim() || 'Custom Style';
        if (customStyles.some(s => s.id !== style.id && s.name.toLowerCase() === name.toLowerCase())) {
            let i = 2;
            while (customStyles.some(s => s.id !== style.id && s.name.toLowerCase() === `${name} (${i})`.toLowerCase())) i++;
            name = `${name} (${i})`;
        }
        const saved = { ...style, name };
        const next = [saved, ...customStyles.filter(s => s.id !== saved.id)].slice(0, 30);
        setCustomStyles(next);
        setVectorState(prev => ({ ...prev, visualSettings: { ...prev.visualSettings, customDirective: saved.directive, customAvoid: saved.avoid } }));
        setCustomStyleModalOpen(false);
        void window.api?.studioSaveConfig?.({ customStyles: next }).then((res: any) => {
            if (res?.success) showToast(`Custom style "${name}" tersimpan & langsung dipakai.`, 'success');
            else showToast(`Custom style "${name}" aktif di sesi ini — gagal simpan permanen: ${res?.detail || 'unknown'}`, 'error');
        }).catch(() => showToast(`Custom style "${name}" aktif di sesi ini — gagal simpan permanen.`, 'error'));
    };

    const handleMasterPromptBlur = () => {
        if (!vectorState.iconMode) return;
        const raw = vectorState.singlePromptInput;
        const detectedCount = vectorState.iconGenerationMode === 'per_canvas'
            ? extractLeadingIconCount(raw)
            : null;
        const cleaned = sanitizeIconThemeInput(raw);

        if (cleaned === raw && !detectedCount) return;

        const shouldSyncQuantity = detectedCount !== null && detectedCount !== undefined && detectedCount !== vectorState.iconQuantity;
        setVectorState(prev => ({
            ...prev,
            singlePromptInput: cleaned,
            iconQuantity: shouldSyncQuantity && detectedCount !== null ? detectedCount : prev.iconQuantity,
        }));

        if (shouldSyncQuantity) {
            showToast(`Terdeteksi angka ${detectedCount} di prompt — disinkron ke "Icons to Generate". Prompt dibersihkan jadi tema saja.`, 'info');
        } else if (cleaned !== raw) {
            showToast('Prompt dibersihkan: kata jumlah/istilah mode dihapus, tersisa tema saja.', 'info');
        }
    };

    const handleResetToPreset = () => {
        const preset = ASSET_TYPE_PRESETS[vectorState.assetType];
        if (!preset) return;
        setReferenceInferredSettings(null);
        setVectorState(prev => ({
            ...prev,
            visualSettings: {
                ...prev.visualSettings,
                aspectRatio: preset.aspectRatio,
                style: STYLES_BY_ASSET_TYPE[prev.assetType]?.[0] || preset.style,
                background: preset.background,
                outputFormat: preset.outputFormat,
                highDpiSharpness: preset.highDpiSharpness,
                faceless: preset.faceless,
                negativeSpace: preset.negativeSpace,
                customDirective: '',
                customAvoid: '',
            },
            _visualDirty: {},
        }));
        showToast('Visual settings reset to asset type preset.', 'info');
    };

    const updateAIConfig = (key, val) => {
        setSystemSettings(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, [key]: val } }));
        if (key === 'textModel') window.api?.studioSaveConfig?.({ textModel: val }).catch(console.error);
        if (key === 'imageModel') window.api?.studioSaveConfig?.({ imageModel: val }).catch(console.error);
    };

// PHASE P0: Batch Diversity Score (QA-aset poin 21–24) — satu skor numerik yang
// menilai seberapa beragam satu batch, agar tidak tertolak Adobe sebagai
// "similar content / near-duplicate" dalam satu submission. Menggabungkan rasio
// duplikat visual (dHash) + pengulangan konsep (title/fingerprint) + komposisi
// serupa. Contoh QA-aset: 20 asset → 12 sunflower pattern → Diversity 31/100,
// keepTopK = kuatkan 4-6 terbaik.
// 11 · QUALITY ENGINE — AI preflight analysis & title similarity scoring
// -
// FASE "IMAGE-FIRST METADATA": pipeline ini SENGAJA dipecah jadi beberapa
// tahap terpisah — bukan satu prompt raksasa yang minta Vision + Metadata +
// QA sekaligus. Alasannya: satu prompt besar cenderung membiarkan konteks
// prompt/tema generation "bocor" jadi title/keyword walau visualnya sendiri
// tidak mendukung (mis. prompt "cute cat for nursery" → AI ikut nulis
// "nursery" padahal gambarnya cuma kucing biasa).
//
// Urutan tahap (lihat juga renderMetadataPipeline untuk visualisasi status):
//   Layer A — analyzeVisualTruth()   : AI vision-only, TANPA konteks apapun,
//                                       cuma jawab "apa yang benar-benar
//                                       terlihat di gambar".
//   detectVisualProfile()   : deterministic (bukan AI call), pilih
//                                       pattern/icon/illustration/3d/other.
//   Layer B+C — generateMetadataAndQA(): AI kedua, menerima IMAGE + hasil
//                                       Layer A sebagai "visual truth" yang
//                                       otoritatif, ditambah asset context
//                                       HANYA sebagai hint prioritas terendah.
//                                       Menghasilkan title/description/
//                                       keywords/category (Layer B) sekaligus
//                                       quality/IP/safety/profile QA (Layer C).
//   Keyword validation loop          : kalau AI kembali dengan keyword lebih
//                                       sedikit dari MIN_COUNT (20), sistem
//                                       MINTA tambahan lewat 1 call ringan
//                                       sebelum jatuh ke fallback deterministik
//                                       di buildFinalStockMetadata().
//
// analyzeAssetForPreflight() di bawah adalah orchestrator publik — signature
// dan return shape-nya TETAP SAMA seperti sebelumnya (asset, aiConfig,
// onApiCall) → objek gabungan berisi visualAnalysis + metadata + QA — supaya
// semua pemanggil existing (runAutoPreflight, handleGenerateMetadata,
// buildFinalStockMetadata dan UI review metadata tidak perlu diubah.

// callGeminiForJSON returns { data, reason } instead of a bare value/null so
// callers (and the console) can tell WHY a call failed instead of getting an
// indistinguishable `null` for "no API key", "rate limited", "safety block",
// "truncated output", and "bad JSON" alike. `reason` is null on success.
//
// AUDIT NOTE (root cause of "AI vision gagal" / "generate metadata gagal"):
// These calls previously had NO `generationConfig` at all. gemini-2.5+/3.x
//    flash models are "thinking" models — without `thinkingConfig` and a
//    generous `maxOutputTokens`, the model can spend its entire output
//    budget on internal reasoning and return `finishReason: MAX_TOKENS`
//    with an EMPTY or truncated `text` part. A truncated JSON response fails
//    every parse strategy in extractJSONFromText (unbalanced braces), so it
//    silently became `null` — indistinguishable from a network/auth error.
//    This mainly affects Layer B+C (generateMetadataAndQA), whose prompt +
//    expected JSON output (title/description/45 keywords/QA/profile fields)
//    is large enough to be truncated well before a "safe" default token
//    limit is reached.
// `!res.ok` was swallowed with zero logging — 400 (bad request/schema),
//    401/403 (invalid/missing key), 404 (unknown model), 429 (rate limit),
//    and 5xx were all indistinguishable.
// A blocked/empty candidate (safety filter, `finishReason !== 'STOP'`)
//    also produced a silent `null` with no trace of *why*.
// Fixes below: explicit generationConfig (JSON mime type + thinking disabled
// + a token budget sized per call), and every failure path now logs enough
// to diagnose it from the console without guessing.





// VISUAL PROFILE DETECTION (deterministic, NO AI call)
// -
// Pattern vs Icon vs Illustration vs 3D vs Other butuh aturan metadata & QA
// yang berbeda (lihat ASSET PROFILE QA RULES di Layer B+C). Prioritas sinyal:
// assetProfile/assetType eksplisit dari App() > sinyal visual dari Layer A.
// detectVisualProfile extracted to engines/quality.ts

// LAYER B + C — METADATA GENERATOR + METADATA VALIDATOR + STOCK QA
// -
// Input diprioritaskan dalam urutan ini (sesuai spesifikasi):
//   IMAGE (dikirim ulang di sini)
//   VISION ANALYSIS (Layer A — otoritatif, sudah diverifikasi visual)
//   VISUAL PROFILE (step 3)
//   ASSET CONTEXT (prompt/tema/kategori — HANYA hint, boleh diabaikan)
// Bukan PROMPT > IMAGE.


// KEYWORD VALIDATION LOOP
// -
// "AI tidak boleh selesai dengan keyword di bawah minimum; sistem harus
// mendeteksi count < MIN_COUNT dan menganggap metadata belum valid."
// Kalau Layer B mengembalikan keyword lebih sedikit dari minimum, minta
// tambahan lewat SATU call ringan (bukan generate ulang semuanya) sebelum
// jatuh ke fallback deterministik (buildMetadataExpansionCandidates) yang
// sudah ada sebagai jaring pengaman terakhir.


// PER-FIELD METADATA REGENERATION — regenerate SATU field saja (title /
// description / keywords) tanpa menjalankan ulang seluruh pipeline preflight.
// -
// Kenapa: kalau reject hanya karena kata di title, tidak perlu jalankan ulang
// vision + QA + metadata lengkap (lambat & boros). Cukup 1 call AI ringan untuk
// field yang bermasalah, pakai vision data yang SUDAH tersimpan di asset.
// Semua fungsi menerima `vision` (visualAnalysis hasil preflight sebelumnya)
// sebagai konteks otoritatif — sama seperti Layer B+C.





// PUBLIC ORCHESTRATOR — signature & return shape TETAP SAMA seperti sebelum
// pemisahan Layer A / Layer B+C, supaya runAutoPreflight, buildFinalStockMetadata,
// dan UI review metadata tidak perlu berubah.



// IMAGIN LOCAL PACKAGE GENERATOR — buat paket aset untuk pipeline animasi
// IMAGIN Local: fragment HTML (elemen ber-id) + CSS statis + metadata.
// -
// Konvensi IMAGIN Local:
//   - fragment = body fragment, elemen ber-id unik di dalam .scene
//     (position:relative, ukuran px) — id jadi layer di timeline.
//   - css = STATIS (ukuran/warna/posisi/font, px). TANPA @keyframes/animation/
//     transition — IMAGIN Local yang menambah keyframe di timeline.
//   - metadata = { canvas:{width,height}, animatable:[ids], suggestedGrouping }.
// Kalau AI gagal → fallback deterministik: 1 layer <img id>. Tidak pernah gagal.
// Dideklarasikan sebagai async function (hoisted) untuk dipakai oleh modal V2.
async function generateAnimationCode(asset, aiConfig, onApiCall, options: { presetId?: string; customPrompt?: string } = {}) {
    // Hanya icon/vector yang dapat animasi (per keputusan desain).
    const isIcon = asset?.generationMode?.startsWith('icon') || asset?.iconStyle;
    const isVector = asset?.assetType === 'vector';
    if (!isIcon && !isVector) return null;

    const chosenPreset = options.presetId && ANIMATION_PRESET_MAP[options.presetId] ? options.presetId : null;
    const customPrompt = options.customPrompt ? String(options.customPrompt).trim() : '';

    // Ukuran canvas default 800x800 (atau dari aspect ratio aset).
    const ar = asset?.aspectRatio || '1:1';
    const [aw, ah] = String(ar).split(':').map(n => parseFloat(n) || 1);
    // Normalisasi: lebar maks 800, tinggi mengikuti aspect ratio (min 400).
    const ratio = aw / ah;
    const canvasW = Math.round(ratio >= 1 ? 800 : 800 * ratio);
    const canvasH = Math.round(ratio >= 1 ? 800 / ratio : 800);

    const instruction = customPrompt
        ? `The user described the animation target:
"${customPrompt}"

Build the HTML structure with that animation goal in mind (e.g. separate the moving part into its own element). Keep the CSS static though.`
        : `Structure the asset into clear reusable layers (logo, icon, text, decorations, background).`;

    // Ekstrak data URL gambar untuk dikirim ke Gemini sebagai inlineData.
    const assetUrl = asset?.url || '';
    const mimeMatch = assetUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const imageMime = mimeMatch?.[1] || 'image/png';
    const imageBase64 = assetUrl.includes(',') ? assetUrl.split(',')[1] : '';

    const imagePart = imageBase64
        ? { inlineData: { mimeType: imageMime, data: imageBase64 } }
        : null;

    const textPart = {
        text: `You are an expert HTML/CSS developer for IMAGIN Local, a tool that animates assets by extracting layers from HTML elements with unique ids.

Look at this image asset and convert it into an HTML fragment that IMAGIN Local can animate.
The image shows the actual asset — use it to understand the visual structure, colors, and composition.

${instruction}

STRICT OUTPUT CONVENTIONS:
1. Return ONLY valid JSON.
2. "fragment": body fragment (NO <html>/<head>/<body> tags). A root <div class="scene"> with inline style width:${canvasW}px;height:${canvasH}px;position:relative;overflow:hidden;background:#ffffff. Inside it, place one <img> element with id="asset" that displays the full image using the actual src URL. Each additional animatable overlay element has a UNIQUE id and inline style position:absolute with px values (left/top/width/height). Use descriptive ids (logo, wheel-front, cta-button, title, badge, shadow, highlight) — NOT a1, b2.
3. IMPORTANT: The main image tag must use src="${assetUrl ? assetUrl.slice(0, 80) + '...' : ''}" (use the full actual URL in real output). The img must cover the full scene: position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain.
4. "css": static CSS ONLY — sizes, colors, positions, fonts, border-radius in px. ABSOLUTELY NO @keyframes, no animation:, no transition:. Keep it minimal.
5. "animatable": array of the element ids that would make good animation layers.
6. "suggestedGrouping": object mapping a parent layer id to array of child ids that should move together (can be empty {}).
7. "note": 1 sentence explaining the structure.`,
    };

    const payload = {
        contents: [{
            parts: imagePart ? [textPart, imagePart] : [textPart],
        }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    try {
        const { data: parsed } = await callGeminiForJSON({
            payload,
            aiConfig,
            onApiCall,
            label: 'imagin-local-package',
        });
        if (parsed?.fragment && typeof parsed.fragment === 'string' && parsed.fragment.trim().length > 10) {
            const fragment = parsed.fragment.trim();
            const css = typeof parsed.css === 'string' && parsed.css.trim()
                ? parsed.css.trim()
                : (parsed.fragmentCss || '');
            const metadata = {
                canvas: { width: canvasW, height: canvasH },
                animatable: Array.isArray(parsed.animatable) && parsed.animatable.length ? parsed.animatable : [],
                suggestedGrouping: (parsed.suggestedGrouping && typeof parsed.suggestedGrouping === 'object') ? parsed.suggestedGrouping : {},
            };
            return {
                fragment,
                css,
                metadata,
                baseName: (asset?.stockMetadata?.title || asset?.title || 'asset').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase() || 'asset',
                presetId: chosenPreset || ANIMATION_DEFAULT_PRESET,
                note: parsed.note || '',
                previewHtml: buildAnimationPreviewShell(asset, fragment, css, chosenPreset || ANIMATION_DEFAULT_PRESET),
            };
        }
    } catch (err) {
        // Fallback deterministik: AI gagal → 1 layer img ber-id.
        console.warn('[Imagin] IMAGIN Local package AI gagal — fallback 1-layer:', err);
    }

    // Fallback
    const fb = buildImaginLocalFallback(asset);
    return {
        fragment: fb.fragment,
        css: fb.css,
        metadata: fb.metadata,
        baseName: fb.baseName,
        presetId: chosenPreset || ANIMATION_DEFAULT_PRESET,
        note: 'Fallback: 1 layer (seluruh aset). Generate ulang untuk struktur multi-layer.',
        previewHtml: buildAnimationPreviewShell(asset, fb.fragment, fb.css, chosenPreset || ANIMATION_DEFAULT_PRESET),
    };
}

// MARKETPLACE DIFFERENTIATION ENGINE (EU-10)
// Bukan pencarian real-time ke Adobe Stock (tidak realistis/tidak ada API-nya
// untuk itu) — ini adalah knowledge-based heuristic: satu text-only call ke
// Gemini yang menilai seberapa generik sebuah konsep dibandingkan pola stock
// umum yang sudah dikenal luas dari training data model (mis. "single sunflower
// on white background", "handshake business deal", "generic laptop on desk").
// Dipanggil SEKALI per prompt/tema unik, SEBELUM generate gambar — supaya kalau
// konsepnya sangat generik, user bisa putuskan differentiate/reconsider lebih
// dulu daripada baru tahu setelah gambar (dan biaya generate) sudah keluar.
// Non-blocking by design: hasilnya berupa skor + saran, bukan hard gate,
// karena ini heuristic pengetahuan model, bukan fakta yang bisa diverifikasi.
// FASE 9 · AUTO-REGENERATION — wrong_subject / fidelity rendah
// -
// Kalau gambar gagal Prompt Fidelity / wrong_subject, generate ulang otomatis
// dengan prompt DIPERKUAT (reinforce + forbidden) — intent TIDAK pernah berubah.
// Cap 2 retry per asset; hanya untuk semantic/fidelity fail (bukan QA teknis).
    const checkPromptSafety = useCallback((text) => {
        if (!text || !text.trim()) return { safe: true, warnings: [], brandHits: [] };
        const brandHits = checkBrandSafety(text);
        const warnings = [];
        if (brandHits.length > 0) warnings.push(`Brand/IP detected: ${brandHits.join(', ')}`);
        // PHASE P0: news-event & sensitive-content pre-generation detection.
        const news = detectNewsEvent(text, vectorState.adobeCategory || '');
        if (news.detected) warnings.push(`News-event reference detected ("${news.reference}") — Adobe rejects editorial/newsworthy content in commercial stock.`);
        const sensitive = detectSensitiveContent(text);
        if (sensitive.detected) warnings.push(`Sensitive content detected ("${sensitive.reason}") — blocked by Adobe Stock.`);
        return { safe: brandHits.length === 0 && !news.detected && !sensitive.detected, warnings, brandHits, safetyRules: CONTENT_SAFETY_RULES };
    }, [vectorState.adobeCategory]);

    const importCtx = { setAssets, showToast, systemSettings, incrementApiCallCounter, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, vectorState, setVectorState, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview, setHistoryLogs };
    const assetActionsCtx = { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, editBgState, setEditBgState, selectedAssetDetail, setSelectedAssetDetail, setAnimationV2Modal };
    const toggleSelection = (id) => assetActionsFlow.toggleSelection(id, assetActionsCtx);
    const handleBulkDelete = () => assetActionsFlow.handleBulkDelete(assetActionsCtx);
    const handleApplyRevision = () => assetActionsFlow.handleApplyRevision(assetActionsCtx);
    const saveRevisedAsset = () => assetActionsFlow.saveRevisedAsset(assetActionsCtx);
    const handleJsonBatchFileSelected = (e) => importFlow.handleJsonBatchFileSelected(e, importCtx);
    const handleObjectModImportSelected = (e) => assetActionsFlow.handleObjectModImportSelected(e, assetActionsCtx);
    const handleReplicateAsset = () => assetActionsFlow.handleReplicateAsset(assetActionsCtx);
    const handleApplyObjectMod = () => assetActionsFlow.handleApplyObjectMod(assetActionsCtx);
    const saveObjectModVariant = () => assetActionsFlow.saveObjectModVariant(assetActionsCtx);
    const handleReferenceImageSelected = (e) => importFlow.handleReferenceImageSelected(e, importCtx);
    const handleImportImageSelected = (e) => importFlow.handleImportImageSelected(e, importCtx);
    const copyToClipboard = (text, label) => importFlow.copyToClipboard(text, label, importCtx);
    const handleOpenRemoveBgSingle = (asset, e) => assetActionsFlow.handleOpenRemoveBgSingle(asset, e, assetActionsCtx);
    // A11: tombol Download = delivery event (XMP + exportHistory awaited, target libraryAssetId) — paritas canvas.
    const handleDownloadSingle = (asset, e, showToastFn) => {
        if (e) e.stopPropagation();
        void handleStockExportSingle({ asset, showToast: showToastFn ?? showToast });
    };
    const handleOpenRemoveBgBulk = (selected) => assetActionsFlow.handleOpenRemoveBgBulk(selected, assetActionsCtx);
    const handleApplyRemoveBgSingle = () => assetActionsFlow.handleApplyRemoveBgSingle(assetActionsCtx);
    const handleSaveRemoveBgResult = () => assetActionsFlow.handleSaveRemoveBgResult(assetActionsCtx);
    const handleOpenEditBg = (asset) => assetActionsFlow.handleOpenEditBg(assetActionsCtx, asset);
    const handleApplyEditBg = () => assetActionsFlow.handleApplyEditBg(assetActionsCtx);
    const openRevisionModal = (asset, e) => assetActionsFlow.openRevisionModal(asset, e, assetActionsCtx);
    const handleOpenImaginVideo = (asset) => assetActionsFlow.handleOpenImaginVideo(asset, assetActionsCtx);
    const handleOpenAnimateForAsset = (asset) => assetActionsFlow.handleOpenAnimateForAsset(asset, assetActionsCtx);
    const handleHandoff = (module, studioAssetIds) => {
        const libIds = studioAssetIds.map((id) => assets.find((a) => a.id === id)?.libraryAssetId).filter(Boolean);
        const skipped = studioAssetIds.length - libIds.length;
        if (libIds.length === 0) {
            showToast('Tidak ada asset terpilih yang terhubung ke Library (libraryAssetId belum ada). Sync asset dulu.', 'error');
            return;
        }
        if (skipped > 0) showToast(`${skipped} asset tanpa tautan Library dilewati.`, 'info');
        onNavigate?.(module, libIds);
    };






    const handleImportFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (file) importFlow.importAllData(file, storageCtx);
        e.target.value = '';
    };


    // ── OBJECT MODIFIER IMPORT ──────────────────────────────────────────────
    // Handler ke-3: import asset untuk workflow replikasi + modifikasi objek.


    // Generate sama persis dari asset yang diimport


    // Generate 3 variasi modifikasi dari asset yang sudah direplikasi


    // Simpan variasi yang dipilih ke library





    // ── REMOVE BACKGROUND handlers ──────────────────────────────────────────
    // Modal remove-bg mereferensikan 3 handler ini dan memakai canvas lokal
    // (removeBackground3Layer, module-level).








    const preflightCtx = { assets, setAssets, setSelectedAssetDetail, preflightInFlightRef, showToast, systemSettings, incrementApiCallCounter, finalizeAsset, assessTechnicalQuality, assessSharpness, detectWatermark, TECHNICAL_QA, assessProfileMatch, buildQualityGateResult, buildRegenerationPlan, metadataNewsMarkers: METADATA_NEWS_MARKERS };
    const runAutoPreflight = (asset, silent = false, opts = {}) => metadataFlow.runAutoPreflight(asset, silent, opts, preflightCtx);
    const handleGenerateMetadata = (asset, openReview = false, silent = false, ctx) => metadataFlow.handleGenerateMetadata(asset, openReview, silent, ctx);
    const handleRegenField = (field, ctx) => metadataFlow.handleRegenField(field, ctx);
    const handleBulkGenerateMetadata = (list, ctx) => metadataFlow.handleBulkGenerateMetadata(list, ctx);
    const markAsSubmitted = (asset, ctx) => metadataFlow.markAsSubmitted(asset, ctx);
    const markRejectedByAdobe = (asset, reasonCode, issueText, ctx) => metadataFlow.markRejectedByAdobe(asset, reasonCode, issueText, ctx);
    const markSold = (asset, ctx) => metadataFlow.markSold(asset, ctx);
    const metaFieldFromStep = metadataFlow.metaFieldFromStep;
    const metaStepLabel = metadataFlow.metaStepLabel;
    const highlightMetadataIssues = (text, keywords) => metadataFlow.highlightMetadataIssues(text, keywords, { brandIpBlocklist: BRAND_IP_BLOCKLIST, governmentAgencyBlocklist: GOVERNMENT_AGENCY_BLOCKLIST, metadataNewsMarkers: METADATA_NEWS_MARKERS });

    // Generation Engine context bundle (Fase 3d) — dikirim ke semua fungsi
    // Prompt/Generation Engine yang sudah dipindah ke module-level, supaya
    // fungsi-fungsi itu tidak lagi bergantung ke closure App().
    const genCtx = {
        vectorState, setVectorState,
        systemSettings,
        assets, setAssets,
        finalizeAsset, saveAssetDB,
        setBlockingDialog,
        // Dispatch authority: single mode must ignore a retained importedBatch.
        masterPromptMode,
        importedBatch, setImportedBatch,
        batchQueue, setBatchQueue,
        setIsBatchPauseRequested,
        pauseBatchRef, discardBatchRef,
        cancelGenerationRef,
        generationLockRef,
        setIsRenderingAssets,
        setGenerationProgress,
        setPromptSafety,
        showToast,
        resetSidebarToManual,
        lockSettings,
        setLockSettings,
        checkBatchTitleSimilarity,
        checkPreGenerationSimilarity,
        analyzeConceptGenericity,
        incrementApiCallCounter,
        // FIX BUG-3: checkBatchVisualSimilarity di-thread lewat ctx (sama seperti
        // checkBatchTitleSimilarity) — didefinisikan di scope App(), dipakai di
        // fungsi standalone executeGenerateNormalAssets.
        checkBatchVisualSimilarity,
        // FIX: computeBatchDiversityScore juga di-thread lewat ctx — didefinisikan
        // di scope App(), dipakai oleh executeGenerateNormalAssets (module-level).
        computeBatchDiversityScore,
        // FIX BUG-4: activeProjectId di-thread lewat ctx supaya job attach ke
        // project berfungsi dari executeJSONBatchGeneration (standalone function).
        activeProjectId,
        // FASE 1 (production loop): runAutoPreflight di-thread lewat ctx supaya
        // pipeline generate (module-level) bisa menjalankan QA + metadata
        // OTOMATIS setelah finalize — tanpa menunggu tombol manual.
        runAutoPreflight,
        // BUG FIX (D5 walkthrough): executeGenerateNormalAssets/IconAssets/
        // JSONBatchGeneration (flows/generationFlow.ts) destructure semua ini
        // dari ctx — sebelumnya tidak di-thread sama sekali, jadi Generate akan
        // crash "X is not a function" begitu dipanggil. Semua nilai ini sudah
        // ada sebagai import/module-level di App.tsx, cuma belum ikut ke genCtx.
        MAX_BATCH_COUNT, CATEGORY_DNA, GLOBAL_DNA,
        buildDNAContext, buildCommercialRules, buildStyleGuidance, getPaletteForCategory, findStylePreset,
        loadDiversityTracker, loadBatchProgress, saveBatchProgress, clearBatchProgress,
        buildIconNegativePrompt, composeIconPrompt,
        createDraftStockMetadata, createInitialVectorState, generateAnimationCode,
        normalizeJobRecord, batchQueueReducer, createIdleBatchQueue,
    };

    // Metadata Engine context bundle (Fase 3e) — untuk handleGenerateMetadata
    // & handleBulkGenerateMetadata yang sudah dipindah ke module-level.
    // runAutoPreflight tetap didefinisikan di App() (Quality Engine, Fase 3a)
    // dan hanya diteruskan sebagai referensi fungsi di sini.
    const metaCtx = {
        setMetadataGenerating, setMetadataStep, setMetadataProgress,
        cleanupRef, showToast, runAutoPreflight,
        bulkMetadataLockRef, // FIX #20 (audit): ref guard anti double-click race
        setPreflightState,
        selectedAssetIds, setSelectedAssetIds, setBatchQueue,
        assets, setAssets,
        metadataGenerating, isRenderingAssets,
        // State untuk per-field regenerate (handleRegenField) — tombol
        // Regenerate di modal preflight meneruskan ctx ini.
        preflightState, setPreflightEdit, setPreflightEditDirty,
        regenFieldRef, setRegenField,
        selectedAssetDetail, setSelectedAssetDetail,
        systemSettings, incrementApiCallCounter,
    };


    // Status tasks yang sedang berjalan (untuk Task button pojok kanan).
    const activeGeneration = isRenderingAssets;
    const activeMetadata = metadataGenerating;

    // Storage / Project Engine context bundle (Fase 3e) — untuk
    // markAsSubmitted, deleteAsset, exportAllData,
    // importAllData, deleteOldDrafts yang sudah dipindah ke module-level.
    const storageCtx = {
        assets, setAssets,
        selectedAssetDetail, setSelectedAssetDetail,
        setHistoryLogs, showToast,
    };

    const workspaceTabsNode = (
        <div className="flex items-center gap-1 bg-[#141b2b] p-0.5 rounded-lg border border-slate-800 text-[10px] shrink-0">
            {(['create', 'production', 'review', 'submit', 'insights'] as const).map(view => (
                <button
                    key={view}
                    onClick={() => { setWorkspaceView(view); setFilterStatus(view === 'review' ? 'review' : 'all'); setSelectedAssetIds(new Set()); setSelectedAssetDetail(null); }}
                     className={`px-2.5 py-1 rounded-md transition ${workspaceView === view ? 'bg-[var(--studio-accent)] text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    {view[0].toUpperCase() + view.slice(1)}
                </button>
            ))}
        </div>
    );

    return (
        <ErrorBoundary>
        <div className="imagin-app-shell studio-shell flex h-screen overflow-hidden min-w-[1140px] bg-[var(--bg-page)] text-[var(--text-primary)]">
            <StudioLeftPanel
                vectorState={vectorState}
                setVectorState={setVectorState}
                apiCallsToday={apiCallsToday}
                estimateApiCalls={estimateApiCalls}
                buildPreviewPrompt={buildPreviewPrompt}
                setPromptPreview={setPromptPreview}
                handleAssetTypeChange={handleAssetTypeChange}
                handleVisualSettingChange={handleVisualSettingChange}
                handleResetToPreset={handleResetToPreset}
                handleMasterPromptBlur={handleMasterPromptBlur}
                checkPromptSafety={checkPromptSafety}
                promptSafety={promptSafety}
                setPromptSafety={setPromptSafety}
                masterPromptMode={masterPromptMode}
                setMasterPromptMode={setMasterPromptMode}
                lockSettings={lockSettings}
                setLockSettings={setLockSettings}
                referenceImageInputRef={referenceImageInputRef}
                importImageInputRef={importImageInputRef}
                objectModInputRef={objectModInputRef}
                importFileInputRef={importFileInputRef}
                handleReferenceImageSelected={handleReferenceImageSelected}
                handleImportImageSelected={handleImportImageSelected}
                handleObjectModImportSelected={handleObjectModImportSelected}
                handleImportFileSelected={handleImportFileSelected}
                isReferenceAnalyzing={isReferenceAnalyzing}
                isRenderingAssets={isRenderingAssets}
                generationProgress={generationProgress}
                metadataGenerating={metadataGenerating}
                metadataProgress={metadataProgress}
                batchQueue={batchQueue}
                importedBatch={importedBatch}
                genCtx={genCtx}
                batchEngine={batchEngine}
                hasProviderKey={systemSettings.aiConfig.provider === '9router'
                    ? Boolean(systemSettings.aiConfig.hasNineRouterKey)
                    : Boolean(systemSettings.aiConfig.hasGeminiKey)}
                systemSettings={systemSettings}
                resolveDNAFromOfficial={resolveDNAFromOfficial}
                setJsonFormatModalOpen={setJsonFormatModalOpen}
                setImportPasteModalOpen={setImportPasteModalOpen}
                jsonBatchFileInputRef={jsonBatchFileInputRef}
                handleJsonBatchFileSelected={handleJsonBatchFileSelected}
                resetSidebarToManual={resetSidebarToManual}
                setIsHistoryOpen={setIsHistoryOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                setIsHelpOpen={setIsHelpOpen}
                theme={theme}
                setTheme={setTheme}
                sidebarMenuOpen={sidebarMenuOpen}
                setSidebarMenuOpen={setSidebarMenuOpen}
                exportAllData={importFlow.exportAllData}
                storageCtx={storageCtx}
                cancelGeneration={cancelGeneration}
                isBatchPauseRequested={isBatchPauseRequested}
                setIsBatchPauseRequested={setIsBatchPauseRequested}
                pauseBatchRef={pauseBatchRef}
                cancelGenerationRef={cancelGenerationRef}
                generationLockRef={generationLockRef}
                confirmBlocking={confirmBlocking}
                showToast={showToast}
            />
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Tab view workspace: baris sendiri karena area tengah (~840px pada 1440)
                    tidak cukup menampung search + 5 tab + kontrol View/Filters/Sort. */}
                <div className="studio-workspace-tabs h-10 shrink-0 border-b border-slate-800/80 bg-[#0b0f18] px-4 flex items-center">
                    {workspaceTabsNode}
                </div>
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {workspaceView === 'submit' ? <SubmissionCenter assets={assets} selectedAssetIds={selectedAssetIds} setSelectedAssetIds={setSelectedAssetIds} setPreflightState={setPreflightState} showToast={showToast} computeSubmissionReadiness={computeSubmissionReadiness} /> : workspaceView === 'insights' ? <InsightsView assets={assets} /> : <CanvasView handleOpenRemoveBgBulk={handleOpenRemoveBgBulk} handleImportImageSelected={handleImportImageSelected}
                    activeGeneration={activeGeneration}
                    activeMetadata={activeMetadata}
                    assets={assets}
                    batchQueue={batchQueue}
                    bulkMenuOpen={bulkMenuOpen}
                    cancelGeneration={cancelGeneration}
                    computeSubmissionReadiness={computeSubmissionReadiness}
                    confirmBlocking={confirmBlocking}
                    copyToClipboard={copyToClipboard}
                    deleteAsset={deleteAsset}
                    deleteOldDrafts={deleteOldDrafts}
                    filterStatus={filterStatus}
                    formatFileSize={formatFileSize}
                genCtx={genCtx}
                customStyles={customStyles}
                onOpenCustomStyle={() => setCustomStyleModalOpen(true)}
                    generationProgress={generationProgress}
                    getAssetFileSizeKB={getAssetFileSizeKB}
                    handleBulkDelete={handleBulkDelete}
                    handleBulkGenerateMetadata={handleBulkGenerateMetadata}
                    handleDownloadSingle={handleDownloadSingle}
                    handleGenerateMetadata={handleGenerateMetadata}
                    handleOpenAnimateForAsset={handleOpenAnimateForAsset}
                    handleOpenEditBg={handleOpenEditBg}
                    isAssetsLoading={isAssetsLoading}
                    isUpscaleEligible={isUpscaleEligible}
                    metaCtx={metaCtx}
                    metaFieldFromStep={metaFieldFromStep}
                    metaStepLabel={metaStepLabel}
                    metadataGenerating={metadataGenerating}
                    metadataProgress={metadataProgress}
                    metadataStep={metadataStep}
                    openRevisionModal={openRevisionModal}
                    retryFailedAsset={retryFailedAsset}
                    runAutoPreflight={runAutoPreflight}
                    searchQuery={searchQuery}
                    selectedAsset={inspectorAsset}
                    selectedAssetIds={selectedAssetIds}
                    setAssets={setAssets}
                    setBulkMenuOpen={setBulkMenuOpen}
                    setFilterStatus={setFilterStatus}
                    setGridModalAsset={setGridModalAsset}
                    setPreflightState={setPreflightState}
                    setPreviewZoom={setPreviewZoom}
                    setSearchQuery={setSearchQuery}
                    setSelectedAssetDetail={setSelectedAssetDetail}
                    setSelectedAssetIds={setSelectedAssetIds}
                     setTasksOpen={setTasksOpen}
                     setTasksCollapsed={setTasksCollapsed}
                    showToast={showToast}
                    storageCtx={storageCtx}
                     tasksOpen={tasksOpen}
                     tasksCollapsed={tasksCollapsed}
                    toggleSelection={toggleSelection}
                    onVectorize={(ids) => handleHandoff('VECTOR', ids)}
                    onUpscale={(ids) => handleHandoff('UPSCALE', ids)}
                    onAssetSelect={setInspectorAsset}
                    />}
                </div>
            </main>
            <StudioInspectorPanel
                asset={inspectorAsset}
                tab={inspectorTab}
                onTabChange={setInspectorTab}
                onClose={() => setInspectorAsset(null)}
                onOpenDetails={() => inspectorAsset && setGridModalAsset(inspectorAsset)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onDownload={(a) => handleDownloadSingle(a, undefined, showToast)}
                onUpscale={(ids) => handleHandoff('UPSCALE', ids)}
                onVectorize={(ids) => handleHandoff('VECTOR', ids)}
                onRemoveBgSingle={(a) => handleOpenRemoveBgSingle(a, undefined)}
                onAnimate={handleOpenAnimateForAsset}
                historyLogs={historyLogs}
                assets={assets}
                onSelectAsset={setInspectorAsset}
            />

            <RevisionModal revisionState={revisionState} setRevisionState={setRevisionState} handleApplyRevision={handleApplyRevision} saveRevisedAsset={saveRevisedAsset} aspectRatioToCss={aspectRatioToCss} />
            <EditBgModal state={editBgState} setEditBgState={setEditBgState} onApply={handleApplyEditBg} />
            <RemoveBgModal removeBgState={removeBgState} setRemoveBgState={setRemoveBgState} handleApplyRemoveBgSingle={handleApplyRemoveBgSingle} handleSaveRemoveBgResult={handleSaveRemoveBgResult} />
            <CustomStyleModal open={customStyleModalOpen} onClose={() => setCustomStyleModalOpen(false)} onSave={handleSaveCustomStyle} aiConfig={systemSettings.aiConfig} onApiCall={incrementApiCallCounter} initial={customStyles.find(s => s.directive && s.directive === vectorState.visualSettings.customDirective) || null} />
            <ImportHubModal importHubOpen={importHubOpen} setImportHubOpen={setImportHubOpen} isReferenceAnalyzing={isReferenceAnalyzing} referenceImageInputRef={referenceImageInputRef} isRenderingAssets={isRenderingAssets} lastReferencePreview={lastReferencePreview} importImageInputRef={importImageInputRef} objectModInputRef={objectModInputRef} />
            <ObjectModifierModal objectModState={objectModState} setObjectModState={setObjectModState} handleReplicateAsset={handleReplicateAsset} handleApplyObjectMod={handleApplyObjectMod} saveObjectModVariant={saveObjectModVariant} />
            <PreflightModal
                preflightState={preflightState}
                closePreflightModal={closePreflightModal}
                countPreflightPassed={countPreflightPassed}
                evaluateMetadataStatus={evaluateMetadataStatus}
                preflightEdit={preflightEdit}
                preflightEditDirty={preflightEditDirty}
                validateMetadataCompliance={validateMetadataCompliance}
                saveAssetDB={saveAssetDB}
                setAssets={setAssets}
                selectedAssetDetail={selectedAssetDetail}
                setSelectedAssetDetail={setSelectedAssetDetail}
                setPreflightState={setPreflightState}
                setPreflightEditDirty={setPreflightEditDirty}
                showToast={showToast}
                renderStatusBadge={(asset, size) => <StatusBadge asset={asset} size={size} />}
                handleGenerateMetadata={handleGenerateMetadata}
                metaCtx={metaCtx}
                metadataGenerating={metadataGenerating}
                setGridModalAsset={setGridModalAsset}
                openRevisionModal={openRevisionModal}
                metadataStep={metadataStep}
                metaStepLabel={metaStepLabel}
                metaFieldFromStep={metaFieldFromStep}
                handleRegenField={handleRegenField}
                regenField={regenField}
                setPreflightEdit={setPreflightEdit}
                highlightMetadataIssues={highlightMetadataIssues}
                normalizeMetadataKeyword={normalizeMetadataKeyword}
                spamTerms={SPAM_TERMS}
                metadataNewsMarkers={METADATA_NEWS_MARKERS}
                brandIpBlocklist={BRAND_IP_BLOCKLIST}
                governmentAgencyBlocklist={GOVERNMENT_AGENCY_BLOCKLIST}
                megapixelsOf={megapixelsOf}
                getAssetFileSizeKB={getAssetFileSizeKB}
                formatFileSize={formatFileSize}
                submittableFromExport={SUBMITTABLE_FROM_EXPORT}
                markAsSubmitted={markAsSubmitted}
                storageCtx={storageCtx}
                confirmBlocking={confirmBlocking}
                markRejectedByAdobe={markRejectedByAdobe}
                setBlockingDialog={setBlockingDialog}
                markSold={markSold}
            />
            <DetailModal selectedAssetDetail={selectedAssetDetail} revisionState={revisionState} previewZoom={previewZoom} setPreviewZoom={setPreviewZoom} setSelectedAssetDetail={setSelectedAssetDetail} />
            <SettingsModal
                open={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                systemSettings={systemSettings}
                onUpdateAIConfig={updateAIConfig}
                onUpdateCommercialRules={(key, value) => setSystemSettings(prev => ({ ...prev, commercialRules: { ...prev.commercialRules, [key]: value } }))}
                onUpdateVideoUrl={(url) => setSystemSettings(prev => ({ ...prev, imaginVideoUrl: url }))}
                showToast={showToast}
                onSave={() => {
                    showToast("Settings tersimpan  (API key terenkripsi)", "success");
 //Refresh flag has*Key agar badge "Configured " langsung update — key tak pernah kembali ke renderer
                    window.api?.studioGetConfig?.().then(res => {
                        if (res?.success) setSystemSettings(prev => ({ ...prev, aiConfig: { ...prev.aiConfig, hasGeminiKey: Boolean((res.config as any)?.hasGeminiKey), hasNineRouterKey: Boolean((res.config as any)?.hasNineRouterKey) } }));
                    }).catch(() => {});
                }}
                onSaveError={() => showToast("Gagal menyimpan settings — cek console untuk detail", "error")}
            />
            <HistoryModal open={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyLogs={historyLogs} rejectionInsights={rejectionInsights} />
            <HelpModal
                open={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                activeTab={helpActiveTab}
                onTabChange={setHelpActiveTab}
            />
            <JsonFormatModal
                open={jsonFormatModalOpen}
                onClose={() => setJsonFormatModalOpen(false)}
                copied={jsonFormatCopied}
                onCopy={setJsonFormatCopied}
                showToast={showToast}
                onSwitchToPaste={(template) => { setPasteJsonInput(template); setJsonFormatModalOpen(false); setJsonModalTab('paste'); setImportPasteModalOpen(true); }}
            />
            <ImportPasteModal
                open={importPasteModalOpen}
                jsonModalTab={jsonModalTab}
                setJsonModalTab={setJsonModalTab}
                headerMenuOpen={jsonHeaderMenuOpen}
                onHeaderMenuToggle={setJsonHeaderMenuOpen}
                pasteJsonInput={pasteJsonInput}
                setPasteJsonInput={setPasteJsonInput}
                pasteJsonErrors={pasteJsonErrors}
                setPasteJsonErrors={setPasteJsonErrors}
                showToast={showToast}
                setImportedBatch={setImportedBatch}
                setBatchQueue={setBatchQueue}
                setVectorState={setVectorState}
                setImportPasteModalOpen={setImportPasteModalOpen}
                clearBatchProgress={clearBatchProgress}
                fileInputRef={jsonBatchFileInputRef}
                researchOpen={researchOpen}
                setResearchOpen={setResearchOpen}
                researchResults={researchResults}
                setResearchResults={setResearchResults}
                isResearching={isResearching}
                setIsResearching={setIsResearching}
            />
            <BatchImportPreviewModal
                batchImportPreview={batchImportPreview}
                onClose={() => setBatchImportPreview(null)}
                setBatchImportPreview={setBatchImportPreview}
                setPasteJsonInput={setPasteJsonInput}
                setPasteJsonErrors={setPasteJsonErrors}
                setJsonModalTab={setJsonModalTab}
                setImportPasteModalOpen={setImportPasteModalOpen}
                showToast={showToast}
                setImportedBatch={setImportedBatch}
                setBatchQueue={setBatchQueue}
                setVectorState={setVectorState}
                clearBatchProgress={clearBatchProgress}
            />
            {referencePromptConfirmation.onConfirm && (
                <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="max-w-md w-full bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-strong)] space-y-4 shadow-2xl">
                        <h3 className="font-bold text-base text-[var(--accent-cobalt)]">Ganti prompt dengan referensi?</h3>
                        <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">Prompt lama akan diganti oleh prompt dari analisis visual, dan tetap dapat diedit setelahnya.</p>
                        <div className="flex gap-3 flex-row">
                            <button
                                onClick={() => setReferencePromptConfirmation({ prompt: '', onConfirm: null })}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--border-structural)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--bg-elevated)] transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => referencePromptConfirmation.onConfirm?.()}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-indigo-solid)] text-white font-bold text-xs hover:brightness-110 shadow-sm transition-all"
                            >
                                Ganti prompt
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {blockingDialog && (
                <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="max-w-md w-full bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-strong)] space-y-4 shadow-2xl">
                        <h3 className="font-bold text-base text-[var(--accent-error)]">{blockingDialog.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">{blockingDialog.message}</p>
                        <div className={`flex gap-3 ${blockingDialog.onCancel ? 'flex-row' : ''}`}>
                            {blockingDialog.onCancel && (
                                <button onClick={blockingDialog.onCancel} className="flex-1 py-2.5 rounded-xl border border-[var(--border-structural)] text-[var(--text-secondary)] font-bold text-xs hover:bg-[var(--bg-elevated)] transition-all">
                                    {blockingDialog.cancelLabel || 'Tidak'}
                                </button>
                            )}
                            <button onClick={blockingDialog.onClose} className={`py-2.5 rounded-xl bg-[var(--accent-indigo-solid)] text-white font-bold text-xs hover:brightness-110 shadow-sm transition-all ${blockingDialog.onCancel ? 'flex-1' : 'w-full'}`}>
                                {blockingDialog.confirmLabel || 'OK, I Understand'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <GridAssetModal gridModalAsset={gridModalAsset} setGridModalAsset={setGridModalAsset} previewZoom={previewZoom} setPreviewZoom={setPreviewZoom} metadataGenerating={metadataGenerating} metadataStep={metadataStep} metaFieldFromStep={metaFieldFromStep} copyToClipboard={copyToClipboard} megapixelsOf={megapixelsOf} getAssetFileSizeKB={getAssetFileSizeKB} formatFileSize={formatFileSize} retryFailedAsset={retryFailedAsset} genCtx={genCtx} handleDownloadSingle={handleDownloadSingle} showToast={showToast} handleOpenAnimateForAsset={handleOpenAnimateForAsset} setAssets={setAssets} runAutoPreflight={runAutoPreflight} openRevisionModal={openRevisionModal} setPreflightState={setPreflightState} confirmBlocking={confirmBlocking} deleteAsset={deleteAsset} storageCtx={storageCtx} handleGenerateMetadata={handleGenerateMetadata} metaCtx={metaCtx} onVectorize={(ids) => handleHandoff('VECTOR', ids)} onUpscale={(ids) => handleHandoff('UPSCALE', ids)} />
            {animationV2Modal && (
                <AnimationModalV2
                    key={animationV2Modal.id}
                    asset={animationV2Modal}
                    assets={assets}
                    onClose={() => setAnimationV2Modal(null)}
                    aiConfig={systemSettings.aiConfig}
                    onApiCall={incrementApiCallCounter}
                    setAssets={setAssets}
                    showToast={showToast}
                />
            )}
            <PromptPreviewModal open={!!promptPreview} onClose={() => setPromptPreview(null)} prompt={promptPreview} vectorState={vectorState} onCopy={(text) => { navigator.clipboard?.writeText(text); showToast('Prompt disalin ke clipboard.', 'success'); }} />

            {toasts && toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-sm pointer-events-none">
                    {toasts.map((t: any) => (
                        <div
                            key={t.id}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-medium shadow-lg pointer-events-auto transition-all animate-[slideInRight_150ms_ease] ${
                                t.type === 'error'
                                    ? 'bg-[var(--accent-error)]/15 border-[var(--accent-error)]/40 text-[var(--accent-error)]'
                                    : t.type === 'success'
                                    ? 'bg-[var(--accent-success)]/15 border-[var(--accent-success)]/40 text-[var(--accent-success)]'
                                    : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)]'
                            }`}
                        >
                            {t.message}
                        </div>
                    ))}
                </div>
            )}

        </div>
        </ErrorBoundary>
    );
}

//  (Dihapus) GLOBAL EXPORTS bridge — di file lama blok ini menempelkan
//  CATEGORY_DNA/GLOBAL_DNA/dst ke globalThis supaya bisa dibaca oleh file
//  imagin.tsx terpisah (setup 2-file tanpa bundler di Gemini Canvas).
//  Di imagin.tsx (arsitektur baru) semua registry sudah berada di module
//  yang sama, tidak ada file lain yang membaca globalThis, jadi bridge ini
//  vestigial dan sengaja tidak dipindahkan. Tidak ada logic aplikasi yang
//  bergantung padanya (sudah diverifikasi: tidak ada pembacaan balik dari
//  globalThis di mana pun pada file asli).
