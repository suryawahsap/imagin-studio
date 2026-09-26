// @ts-nocheck — Studio metadata/preflight flow extracted with explicit context.
import { METADATA_RULES, DEFAULT_PLATFORM } from '../registry/presets';
import { SPAM_TERMS } from '../registry/constants';
import { checkBrandSafety } from '../utils';
import { METADATA_NEWS_MARKERS, sanitizeStockTitle, validateMetadataCompliance } from '../engines/compliance';
import { detectVisualProfile, analyzeAssetForPreflight } from '../engines/quality';
import { buildDraftStockMetadata, buildMetadataFallback, evaluateMetadataStatus, enforceMetadataDiversity, checkLibraryVisualSimilarity, checkBatchTitleSimilarity, regenerateMetadataField } from '../engines/metadata';
import { saveAssetDB, saveQAResultDB, saveComplianceResultDB, dbOp } from '../engines/storage';
import { feedbackEngine, classifyRejection, recordRejectionFeedback } from '../engines/feedback';
import { autoRegenerateAsset } from '../engines/revision';
import { extractSemanticIntent, assessSemanticMatch } from '../engines/intent-engine';

// SEO_CONFIG — Senior SEO Writer research (Adobe Stock Search Algorithm 2025-2026)
// Sumber: helpx.adobe.com/stock/contributor/tips-effective-titles-keywords (Jun 2026),
// ArtistHub get-started guide, MetadataReactor 2026, Adobe Field Guide 2021.
// Poin kunci SEO microstock:
// - Title 40-70 char, sweet-spot 55-70, front-load primary noun dalam 5 kata pertama.
//   Title jadi URL & sinyal ranking pertama; >70 terpotong di mobile.
// - Keywords 15-35 ideal, max 49/50. Urutan KRITIS: first 7-10 carry >50% weight.
//   Semua kata penting title harus ada di top-10 keywords untuk extra bump.
// - Search handle singular/plural otomatis — jangan duplikat "cat"+"cats" (waste slot).
// - Hindari adjective+noun phrase bukan common concept (e.g. "red dress" → split "red","dress").
// - "no people"/"nobody" wajib bila tanpa orang (Adobe guide).
// - Title sentence-case, keyword singular, buyer-intent (concept+use-case) > deskriptif generik.
// - Spam/stuffing = penalty ranking / rejection.
export const SEO_CONFIG = {
  title: {
    min: 50,                // SEO sweet-spot bawah (Adobe guide 55-70, kita 50-70 untuk toleransi)
    idealMin: 55,
    idealMax: 70,
    max: 70,                // sinkron dengan METADATA_RULES.title.TARGET_MAX_LEN
    hardMax: 200,
    sweetSpot: 60,          // target karakter untuk scoring
  },
  keywords: {
    min: 25,                // SEO minimal efektif (Adobe sweet spot 15-35, kita push 25-40)
    targetMin: 30,           // SEO target ideal — isi sampai 30 bila relevansi mendukung
    targetMax: 40,           // jangan paksakan 49 bila tidak relevan; 30-40 optimal
    max: 49,                // Adobe allows 49 efektif (50 hard, tapi 49 untuk buffer CSV)
    hardMax: 50,
    topWeightCount: 10,      // first 10 keywords = heaviest weight
    primaryWeightCount: 7,   // first 7 = ultra-weight (MetadataReactor 2026)
  },
  description: {
    min: 150,               // SEO context: 150-320 char membantu semantic indexing
    idealMin: 180,
    idealMax: 320,
    max: 500,
  },
};

// Frasa 2-kata yang merupakan common concept / dictionary phrase — JANGAN di-split.
// Adobe guide: jika frasa ada di dictionary ("social media","monkey bars") simpan utuh;
// jika bukan ("red dress","bowl of soup") split jadi kata terpisah untuk coverage lebih luas.
export const SEO_COMMON_PHRASES = new Set([
  'social media', 'artificial intelligence', 'machine learning', 'user interface',
  'user experience', 'small business', 'remote work', 'cloud computing',
  'cyber security', 'data analytics', 'business team', 'team work', // team work vs teamwork — keep teamwork as single
  'teamwork', 'flat design', 'surface design', 'wall art', 'fabric pattern',
  'seamless pattern', 'geometric pattern', 'floral pattern', 'botanical pattern',
  'food packaging', 'travel poster', 'world map', 'golden hour', 'natural light',
  'high angle', 'aerial view', 'top view', 'flat lay', 'isolated background',
  'white background', 'transparent background', 'no people', 'one person',
  'three people', 'senior adult', 'young adult',
]);



export const GENERATE_METADATA_STEPS = [
    "Analyzing image composition",
    "Detecting commercial subject",
    "Identifying platform category",
    "Creating stock title",
    "Writing description",
    "Generating keywords",
    "Running Adobe validation",
    "Finalizing metadata"
];


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



// 13 · METADATA ENGINE — AI preflight orchestration (single & bulk)
// -
// Dipindahkan APA ADANYA dari dalam App() (Fase 3e), sebelum App(). Kedua
// fungsi ini tadinya membaca ~9 variabel closure App() (state metadata,
// cleanupRef, showToast, runAutoPreflight, selection state, batchQueue
// setter). runAutoPreflight sendiri TETAP di App() (bagian Quality Engine,
// Fase 3a) karena ia membaca systemSettings/incrementApiCallCounter lewat
// closure App() — di sini ia hanya diterima sebagai referensi fungsi lewat
// ctx, tidak diubah signature-nya.
    export const handleGenerateMetadata = async (asset, openReview = false, silent = false, ctx) => {
        const { setMetadataGenerating, setMetadataStep, setMetadataProgress, cleanupRef, showToast, runAutoPreflight, selectedAssetIds, setSelectedAssetIds, setBatchQueue, setPreflightState } = ctx;
        // FASE 8: Quality Gate — asset FAILED (tidak ada gambar) TIDAK boleh
        // generate metadata. Asset rejected/needs_review BOLEH di-regenerate
        // metadata (tombol "Regenerate Metadata"/"Buat Ulang Metadata") —
        // pipeline dijalankan ulang dari gambar yang sama, status baru
        // ditentukan oleh hasil AI terbaru. Asset submitted/exported tidak
        // boleh karena metadata sudah dikirim ke platform.
        if (asset?.status === 'FAILED' || !asset?.url) {
            showToast('Asset tidak memiliki gambar — perbaiki atau regenerate aset dulu.', 'error');
            return;
        }
        if (asset?.status === 'submitted') {
            showToast('Asset sudah disubmit — metadata tidak boleh diubah lagi.', 'error');
            return;
        }
        setMetadataGenerating(true);
        setMetadataStep(0);

        const metadataGenAbortedRef = { current: false };

        const interval = setInterval(() => {
            if (metadataGenAbortedRef.current) return;
            setMetadataStep(p => Math.min(p + 1, GENERATE_METADATA_STEPS.length - 1));
        }, 600);
        const cleanupInterval = () => clearInterval(interval);
        cleanupRef.current.push(cleanupInterval);

        let analyzedAsset;
        try {
            analyzedAsset = await runAutoPreflight(asset, silent, { allowAutoRegen: false });
        } catch (err) {
            console.error('[Metadata] runAutoPreflight gagal:', err);
            cleanupInterval();
            setMetadataGenerating(false);
            setMetadataStep(0);
            if (!silent) showToast('Metadata generation gagal: ' + err.message, 'error');
            return;
        }

        cleanupInterval();
        setMetadataStep(GENERATE_METADATA_STEPS.length);

        // FIX: refresh modal preflight dengan hasil terbaru — kalau user
        // regenerate metadata dari modal review, modal harus menampilkan
        // status/metadata BARU (bukan snapshot lama yang rejected).
        if (analyzedAsset?.id && setPreflightState) {
            setPreflightState(prev => prev?.asset?.id === analyzedAsset.id
                ? { ...prev, asset: analyzedAsset }
                : prev);
        }

        // FIX: openReview=true → BUKA modal review metadata dengan hasil
        // terbaru. Sebelumnya param openReview tidak pernah dipakai, dan
        // preflightState.isOpen tidak pernah di-set true dari mana pun —
        // akibatnya modal review (yang berisi tombol "Buat Ulang Metadata")
        // tidak pernah muncul di UI.
        if (openReview && analyzedAsset?.id) {
            setPreflightState({ isOpen: true, asset: analyzedAsset });
        }

        const doneTimeout = setTimeout(() => {
            if (metadataGenAbortedRef.current) return;
            setMetadataGenerating(false);
            if (!silent) {
                const status = analyzedAsset?.status || 'draft';
                if (status === 'ready' || status === 'metadata_ready') {
                    showToast('Metadata generated successfully ', 'success');
                } else if (status === 'needs_review') {
                    showToast('Metadata generated — needs review.', 'info');
                } else {
                    showToast('Metadata generation completed.', 'info');
                }
            }
        }, 1000);
        const cleanupTimeout = () => { metadataGenAbortedRef.current = true; clearTimeout(doneTimeout); };
        cleanupRef.current.push(cleanupTimeout);
    };

    // Per-field metadata regeneration — regenerate SATU field (title/
    // description/keywords) tanpa menjalankan ulang seluruh pipeline.
    // Pakai vision data yang sudah tersimpan (stockMetadata.visualAnalysis),
    // 1 call AI ringan, jauh lebih cepat daripada regenerate penuh.
    // Menerima ctx (state App()) eksplisit — konsisten dengan handleGenerateMetadata.
    export const handleRegenField = async (field, ctx) => {
        const { preflightState, setPreflightState, setPreflightEdit, setPreflightEditDirty, regenFieldRef, setRegenField, setMetadataGenerating, systemSettings, incrementApiCallCounter, showToast, setAssets, selectedAssetDetail, setSelectedAssetDetail } = ctx;
        const asset = preflightState.asset;
        if (!asset?.url) { showToast('Asset tidak memiliki gambar.', 'error'); return; }
        if (regenFieldRef.current) { showToast('Regenerasi sedang berjalan…', 'info'); return; }

        regenFieldRef.current = true;
        setRegenField(field);
        setMetadataGenerating(true);
        try {
            const raw = await regenerateMetadataField({
                asset,
                field,
                vision: asset.stockMetadata?.visualAnalysis || null,
                issues: asset.stockMetadata?.preflightIssues || [],
                aiConfig: systemSettings.aiConfig,
                onApiCall: incrementApiCallCounter,
            });
            if (raw == null) {
                showToast(`Regenerate ${field} gagal — coba lagi.`, 'error');
                return;
            }
            const updated = await applyMetadataFieldUpdate(asset, field, raw);
            if (!updated) return;
            setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
            if (selectedAssetDetail?.id === updated.id) setSelectedAssetDetail(updated);
            setPreflightState(prev => prev?.asset?.id === updated.id ? { ...prev, asset: updated } : prev);
            // Reset edit state supaya modal menampilkan hasil regenerate terbaru
            // (bukan snapshot edit lama).
            setPreflightEdit({ assetId: updated.id, title: updated.stockMetadata?.title || updated.title || '', description: updated.stockMetadata?.description || '', keywords: (updated.stockMetadata?.keywords || []).join(', ') });
            setPreflightEditDirty(false);
            const smFinal = updated.stockMetadata || {};
            const hasComplianceIssue = Array.isArray(smFinal.preflightIssues)
                && smFinal.preflightIssues.some(i => /compliance|brand|news|spam/i.test(String(i)));
            showToast(updated.status === 'metadata_ready'
                ? `Metadata ${field} diregenerate  — asset kini Metadata Ready.`
                : hasComplianceIssue
                    ? `Metadata ${field} diregenerate, tapi masih ada pelanggaran compliance (brand/news/spam) — periksa highlight merah.`
                    : `Metadata ${field} diregenerate . Lengkapi field lain untuk unlock status.`, hasComplianceIssue ? 'error' : 'success');
        } catch (err) {
            console.error(`[RegenField] ${field} gagal:`, err);
            showToast(`Regenerate ${field} error: ${err.message}`, 'error');
        } finally {
            regenFieldRef.current = false;
            setRegenField(null);
            setMetadataGenerating(false);
        }
    };

    export const handleBulkGenerateMetadata = async (filteredAssetsList, ctx) => {
    const { setMetadataGenerating, setMetadataStep, setMetadataProgress, cleanupRef, showToast, runAutoPreflight, selectedAssetIds, setSelectedAssetIds, setBatchQueue, metadataGenerating, isRenderingAssets, bulkMetadataLockRef } = ctx;

    // FIX #20 (audit): ref guard instan (seperti generationLockRef) — state
    // guard punya race window antara cek dan set; dua klik cepat bisa lolos.
    if (bulkMetadataLockRef?.current) {
        showToast('Proses sedang berjalan — tunggu selesai sebelum memulai lagi.', 'info');
        return;
    }
    if (metadataGenerating || isRenderingAssets) {
        showToast('Proses sedang berjalan — tunggu selesai sebelum memulai lagi.', 'info');
        return;
    }

    // FIX BUG #3: perluas definisi "eligible" — bukan hanya 'draft', tapi juga
    // 'needs_review' dan 'rejected' boleh di-regenerate metadata (gambar sama,
    // metadata bisa diperbaiki ulang). 'submitted' dan 'FAILED' tetap di-skip.
    const METADATA_ELIGIBLE_STATUSES = ['draft', 'needs_review', 'rejected'];
    const hasPendingDrafts = filteredAssetsList.some(
        a => METADATA_ELIGIBLE_STATUSES.includes(a.status) && a.url && !a.isLoading
    );
    const useAllDrafts = selectedAssetIds.size === 0 && hasPendingDrafts;

    if (useAllDrafts && hasPendingDrafts) {
        const eligibleCount = filteredAssetsList.filter(
            a => METADATA_ELIGIBLE_STATUSES.includes(a.status) && a.url && !a.isLoading
        ).length;
        showToast(`Tidak ada asset terpilih — otomatis memproses SEMUA asset eligible (${eligibleCount} asset).`, 'info');
    }

    const candidates = useAllDrafts
        ? filteredAssetsList.filter(a =>
            METADATA_ELIGIBLE_STATUSES.includes(a.status) && a.url && !a.isLoading)
        : filteredAssetsList.filter(a =>
            selectedAssetIds.has(a.id) && a.url && !a.isLoading &&
            a.status !== 'FAILED' && a.status !== 'submitted');

    // Beri tahu user kalau ada asset yang dipilih tapi di-skip (submitted/
    // FAILED) — jangan diam-diam melewatinya (konsisten dengan single regenerate
    // yang sekarang mengizinkan rejected untuk diproses ulang).
    const skippedCount = selectedAssetIds.size > 0
        ? filteredAssetsList.filter(a => selectedAssetIds.has(a.id) && (a.status === 'submitted' || a.status === 'FAILED' || !a.url)).length
        : 0;

    if (candidates.length === 0) {
        showToast('Tidak ada asset yang bisa diproses untuk metadata (semua submitted, gagal, atau tidak punya gambar).', 'info');
        return;
    }

    if (skippedCount > 0) {
        showToast(` ${skippedCount} asset dipilih dilewati (submitted/gagal/tanpa gambar).`, 'info');
    }

    // FIX #20 (audit): set ref lock setelah SEMUA early-return — memastikan
    // finally selalu me-reset (tidak ada deadlock saat return tanpa proses).
    setMetadataGenerating(true);
    if (bulkMetadataLockRef) bulkMetadataLockRef.current = true;
    const releaseBulkLock = () => {
        if (bulkMetadataLockRef) bulkMetadataLockRef.current = false;
    };
    setBatchQueue(prev => ({ ...prev, phase: 'metadata', isRunning: true }));
    setMetadataStep(0);
    setMetadataProgress({ current: 0, total: candidates.length });

    showToast(` Memulai metadata engine: ${candidates.length} asset...`, 'info');

    let done = 0;
    let failed = 0;
    const bulkAbortedRef = { current: false };
    const intervals = [];

    for (const asset of candidates) {
        if (bulkAbortedRef.current) break;
        setMetadataStep(0);
        const interval = setInterval(() => {
            if (bulkAbortedRef.current) return;
            setMetadataStep(p => Math.min(p + 1, GENERATE_METADATA_STEPS.length - 1));
        }, 550);
        intervals.push(interval);

        try {
            await runAutoPreflight(asset, true, { allowAutoRegen: false });
            done++;
        } catch (e) {
            console.error(`[MetadataEngine] Asset ${asset.id} failed:`, e);
            failed++;
        }

        clearInterval(interval);
        setMetadataStep(GENERATE_METADATA_STEPS.length);
        setMetadataProgress({ current: done + failed, total: candidates.length });

        if (done + failed < candidates.length) {
            await new Promise(r => setTimeout(r, 600));
        }
    }

    intervals.forEach(clearInterval);

    const doneTimeout = setTimeout(() => {
        if (bulkAbortedRef.current) return;
        setMetadataGenerating(false);
        releaseBulkLock();
        setMetadataStep(0);
        setBatchQueue(prev => ({ ...prev, phase: failed === 0 ? 'done' : 'done_with_errors', isRunning: false }));
        setSelectedAssetIds(new Set());
        showToast(
            failed > 0
                ? `Metadata selesai: ${done} berhasil, ${failed} gagal.`
                : ` Metadata selesai untuk ${done} asset!`,
            failed > 0 ? 'info' : 'success'
        );
    }, 1000);
    cleanupRef.current.push(() => { bulkAbortedRef.current = true; clearTimeout(doneTimeout); intervals.forEach(clearInterval); releaseBulkLock(); });
};

// 16 · STORAGE / PROJECT ENGINE — asset lifecycle (submit/favorite/delete)
//     & backup import/export
// -
// Dipindahkan APA ADANYA dari dalam App() (Fase 3e), sebelum App(). Semua
// menerima satu ctx eksplisit (assets, setAssets, selectedAssetDetail,
// setSelectedAssetDetail, setHistoryLogs, showToast) alih-alih closure.
// importAllData meneruskan ctx yang sama ke addHistory.
//
// Status: markAsSubmitted terhubung ke UI preflight (Mark as Submitted),
// exportAllData terhubung ke sidebar backup — bukan dead code lagi.
    export const markAsSubmitted = async (asset, ctx) => {
        const { assets, setAssets, selectedAssetDetail, setSelectedAssetDetail, setHistoryLogs, showToast } = ctx;
        const updatedAsset = {
            ...asset,
            status: 'submitted',
            stockMetadata: {
                ...asset.stockMetadata,
                submittedAt: Date.now(),
            }
        };
        await saveAssetDB(updatedAsset);
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updatedAsset);
        showToast('Asset marked as Submitted to Adobe Stock ', 'success');
    };

    // FASE 6 (feedback loop): tandai asset DITOLAK Adobe setelah disubmit —
    // merekam rejection reason ke feedbackEngine supaya deriveProductionPolicy
    // bisa menampilkan pola penolakan nyata (kalibrasi threshold QA).
    export const markRejectedByAdobe = async (asset, reasonCode, issueText, ctx) => {
        const { assets, setAssets, selectedAssetDetail, setSelectedAssetDetail, showToast } = ctx;
        try {
            await recordRejectionFeedback(asset, reasonCode, null, { issueText });
        } catch (err) {
            console.warn('[Imagin] Rejection feedback gagal direkam:', err);
        }
        const updatedAsset = { ...asset, status: 'rejected' };
        await saveAssetDB(updatedAsset);
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updatedAsset);
        showToast('Asset ditandai Ditolak Adobe — rejection dicatat untuk kalibrasi QA.', 'info');
    };

    // FASE F (sales loop): tandai asset TERJUAL — merekam ke feedbackEngine
    // dengan action 'sold'. Data ini mengkalibrasi MARKET_DEMAND (apa yang
    // benar-benar laku) dan menampilkan dashboard "apa yang laku".
    export const markSold = async (asset, ctx) => {
        const { assets, setAssets, selectedAssetDetail, setSelectedAssetDetail, showToast } = ctx;
        try {
            await feedbackEngine.record({
                assetId: asset.id,
                qaDecision: 'pass',
                reasonCode: 'sold',
                action: 'sold',
                note: `Sold: ${asset.title || asset.stockMetadata?.title || 'untitled'}`,
                qaSnapshot: {
                    score: asset.stockMetadata?.preflightScore || null,
                    severity: 'info',
                    failedRule: '',
                    feedbackType: 'sold',
                    category: asset.adobeCategory || '',
                    conceptFingerprint: asset.lineage?.conceptFingerprint || null,
                },
                platform: asset.platform || DEFAULT_PLATFORM,
            });
        } catch (err) {
            console.warn('[Imagin] Sales feedback gagal direkam:', err);
        }
        const updatedAsset = { ...asset, status: 'submitted', soldAt: Date.now() };
        await saveAssetDB(updatedAsset);
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updatedAsset);
        showToast('Ditandai TERJUAL — dicatat untuk kalibrasi konsep laris. ', 'success');
    };


// 12 · COMPLIANCE ENGINE — title/keyword sanitation & policy checks (pure)
// -
// Dipindahkan APA ADANYA dari dalam App() (Fase 3a). Fungsi murni, tidak
// membaca state React — hanya bergantung pada konstanta module-level
// (METADATA_RULES, SPAM_TERMS) dari layer 03/05 di atas.
const NEWSWORDS_EVENT_DETECT = (text) => {
    const patterns = [
        /\b(breaking\s+news|breaking|latest|just\s+in|developing\s+story)\b/i,
        /\b(today['’]?s|yesterday['’]?s|this\s+(morning|afternoon|evening|week|month|year))\b/i,
        /\b(protest|rally|demonstration|riot|march|strike)\s+(again|during|over|after|against)\b/i,
        /\b(election|vote|ballot|campaign|presidential|prime\s+minister|royal)\s+(result|day|night|visit|speech|announcement|rally)\b/i,
        /\b(recent|ongoing|current|living)\s+(event|crisis|conflict|disaster|emergency|situation)\b/i,
        /\b(war|conflict|invasion|ceasefire|attack|bombing|military\s+operation)\b/i,
        /\b(during\s+the\s+(recent|great|historic|worst|deadly|devastating))\b/i,
        /\b(news|headline|report|reporter|journalist|correspondent)\b/i,
    ];
    return patterns.some(p => p.test(text));
};

// sanitizeStockTitle extracted to engines/compliance.ts

const validateStockTitle = (title = '') => {
const issues = [];
const t = String(title || '').trim();
const MIN = METADATA_RULES.title.MIN_LEN;
const MAX = METADATA_RULES.title.MAX_LEN;
const HARD_LIMIT = METADATA_RULES.title.HARD_MAX_LEN; // 200 — Adobe platform limit

if (!t) { issues.push('Title is empty'); return { passed: false, issues }; }
if (t.length > HARD_LIMIT) issues.push(`Title exceeds platform hard limit of ${HARD_LIMIT} chars (${t.length}) — must be shortened`);
else if (t.length > MAX) issues.push(`Title exceeds recommended ${MAX} chars (${t.length}) — consider shortening for better editorial quality`);
if (t.length < MIN) issues.push(`Title too short (${t.length} chars, min ${MIN}) — add more descriptive context about subject, use case, or mood`);
if (/[^a-zA-Z0-9\s]/.test(t)) issues.push('Title contains special characters — only letters, numbers, and spaces allowed');
if (/\b\d+\b/.test(t) && /^\w.*\d+$/.test(t)) issues.push('Title ends with a number (serial ID)');
if (/^(flat\s+illustration|flat\s+icon|vector|illustration|3d\s+render|image|picture|design|artwork|graphic)/i.test(t)) issues.push('Title starts with an internal type label — describe the subject instead');
if (/(amazing|beautiful|awesome|best\s+quality|high[\s-]quality|stunning|premium|elegant)\b/i.test(t)) issues.push('Contains generic filler adjectives');
// Catatan: "professional/creative/modern" TIDAK dianggap filler di sini —
// sebagai kata sifat kontekstual (Professional Workspace, Modern Office,
// Creative Team) itu sah dan sesuai contoh spec workflow.
if (/(ai[\s-]?generated|stock\s+vector|stock\s+image|free\s+to\s+use|commercial\s+use)/i.test(t)) issues.push('Contains disallowed auto-generated labels');
if (NEWSWORDS_EVENT_DETECT(t)) issues.push('Title implies an actual news event — rewrite as a generic commercial concept');

return { passed: issues.length === 0, issues };
};

// METADATA HIGHLIGHT — tandai kata/istilah bermasalah dalam teks metadata
// -
// Dipakai modal review: title/description/keywords dirender dengan istilah
// yang memicu reject diwarnai MERAH, supaya user langsung tahu kata mana yang
// bermasalah (brand, spam, news marker, dsb). Mengembalikan array segmen:
// [{ text, bad }] — dipakai untuk render JSX.
export function highlightMetadataIssues(text = '', keywords = [], ctx = {}) {
    const { brandIpBlocklist = [], governmentAgencyBlocklist = [], metadataNewsMarkers = [] } = ctx;
    const raw = String(text || '');
    if (!raw.trim()) return [{ text: raw, bad: false }];

    const METADATA_HIGHLIGHT_TERMS = [
        ...brandIpBlocklist,
        ...governmentAgencyBlocklist,
        ...SPAM_TERMS,
        ...metadataNewsMarkers,
    ];

    // Kumpulkan semua istilah yang muncul (word-boundary aware) + posisi.
    const hits = [];
    const addTerm = (term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const isSingleWord = !/\s/.test(term.trim());
        const pattern = isSingleWord
            ? `(?<![a-zA-Z0-9-])${escaped}(?![a-zA-Z0-9-])`
            : `(?<![a-z0-9])${escaped}(?![a-z0-9])`;
        const re = new RegExp(pattern, 'ig');
        let m;
        while ((m = re.exec(raw)) !== null) {
            hits.push({ start: m.index, end: m.index + m[0].length, term: m[0] });
        }
    };

    for (const term of METADATA_HIGHLIGHT_TERMS) addTerm(term);
    // Keyword yang dianggap spam/useless (dari daftar SPAM_TERMS) juga.
    for (const kw of keywords) {
        const norm = normalizeMetadataKeyword(kw);
        if (!norm) continue;
        if (SPAM_TERMS.some(t => t.toLowerCase() === norm)) addTerm(kw);
        if (metadataNewsMarkers.some(m => norm.includes(m.toLowerCase()))) addTerm(kw);
    }

    if (hits.length === 0) return [{ text: raw, bad: false }];

    // Urutkan & gabungkan overlap, lalu potong jadi segmen.
    hits.sort((a, b) => a.start - b.start || a.end - b.end);
    const merged = [];
    for (const h of hits) {
        const last = merged[merged.length - 1];
        if (last && h.start < last.end) {
            last.end = Math.max(last.end, h.end);
            last.term = raw.slice(last.start, last.end);
        } else {
            merged.push({ ...h });
        }
    }

    const segments = [];
    let cursor = 0;
    for (const h of merged) {
        if (h.start > cursor) segments.push({ text: raw.slice(cursor, h.start), bad: false });
        segments.push({ text: raw.slice(h.start, h.end), bad: true, term: h.term });
        cursor = h.end;
    }
    if (cursor < raw.length) segments.push({ text: raw.slice(cursor), bad: false });

    return segments;
}

// 12 · METADATA VALIDATION — post-build metadata compliance stage
// -
// Spec workflow poin 2 & 17: setelah metadata dibuat, metadata itu sendiri
// HARUS divalidasi ulang terhadap IP / Brand / Artist / Person / Character /
// Government Agency / Copyrighted Work / Newsworthy Event / Spam. Ini bukan
// sekadar "title valid? keyword cukup?" — tapi "apakah metadata ini aman untuk
// Adobe Stock?". Menangkap kasus seperti title "Apple technology concept"
// padahal gambarnya komputer generik (brand nuggle, misleading), atau keyword
// yang memuat kata bermerek/berita.
//
// Memanggil helper yang SUDAH ADA (checkBrandSafety, detectNewsEvent,
// detectSensitiveContent, METADATA_NEWS_MARKERS) supaya tidak ada logika
// duplikat. Nilai balik: issues (pelanggaran) + severity 'critical' | 'review'.
// validateMetadataCompliance extracted to engines/compliance.ts

// 12 · METADATA ENGINE V2 — Keyword Normalization + Expansion
// -
// Metadata harus:
// berasal dari visual analysis,
// memiliki 20–50 keyword (target 25–35, relevansi > jumlah),
// mengutamakan keyword paling relevan,
// menghapus spam / generic filler,
// tidak mengarang objek yang tidak terlihat,
// tetap mempunyai fallback deterministic jika AI mengembalikan terlalu
//    sedikit keyword.

const METADATA_GENERIC_STOPWORDS = new Set([
    // File/asset references — never meaningful as a keyword
    'asset', 'assets', 'image', 'images', 'picture', 'pictures', 'photo', 'photos',
    // Promotional filler — low SEO value, Adobe rejects these as lazy tags.
    // Catatan: 'creative', 'modern', 'professional' TIDAK ada di daftar ini —
    // ketiganya keyword komersial sah (mis. "creative team", "modern office",
    // "professional workspace") sesuai spec workflow, dan sering jadi pembeda
    // batch. Hanya filler murni yang diblokir.
    'high quality', 'best quality', 'beautiful', 'amazing', 'stunning',
    'premium', 'elegant',
    // Stock/AI labels — explicitly prohibited
    'stock', 'stock asset', 'commercial asset', 'royalty free', 'royalty-free',
    'ai', 'ai generated', 'generated by ai', 'ai art', 'ai created',
    // Pure metadata labels — describe the file, not the content
    'clip', 'clipart', 'eps file', 'png file', 'jpeg file',
]);

const normalizeMetadataKeyword = (value = '') =>
    String(value || '')
        // Adobe rule: only letters, numbers, and spaces in each individual keyword.
        // Commas are only used in the CSV output to separate keywords, not within them.
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const keywordTokens = (value = '') =>
    normalizeMetadataKeyword(value)
        .split(/\s+/)
        .filter(Boolean);

const isUsefulMetadataKeyword = (keyword = '') => {
    const k = normalizeMetadataKeyword(keyword);

    if (!k) return false;
    // Min 2 chars, max 40 chars for a 2-word phrase
    if (k.length < 2 || k.length > 40) return false;
    // Pure numbers are not keywords
    if (/^\d+$/.test(k)) return false;
    // Strip known filler/spam
    if (METADATA_GENERIC_STOPWORDS.has(k)) return false;
    if (SPAM_TERMS.some(term => k === term.toLowerCase())) return false;
    // Don't use editorial/news markers as keywords
    if (METADATA_NEWS_MARKERS.some(marker => k.includes(marker))) return false;
    // Adobe membatasi JUMLAH keyword (max 50), bukan panjang frasa per keyword.
    // Frasa 3 kata seperti "small business owner", "flat lay design", "social media marketing"
    // sah dan sering dipakai contributor top. Frasa ≥4 kata jarang berguna, batasi di sana.
    const wordCount = k.trim().split(/\s+/).length;
    if (wordCount > 3) return false;

    return true;
};

// SEO OPTIMIZATION LAYER — Senior SEO Writer (Adobe Stock Algorithm 2026)
// -
// Adobe search weighting: first 7-10 keywords >50% ranking weight.
// Title front-load, keyword singularization, phrase splitting, no-people handling.
// Helper pure — tidak ada side effect, bisa di-test tanpa Canvas runtime.

// Singularisasi sederhana — Adobe menangani plural otomatis, simpan singular saja.
// Hapus plural 's' bila singular sudah ada di set untuk dedupe.
const singularizeKeyword = (kw = '') => {
    const k = normalizeMetadataKeyword(kw);
    if (k.endsWith('ies') && k.length > 4) return k.slice(0, -3) + 'y';
    if (k.endsWith('es') && k.length > 3 && !k.endsWith('sses')) return k.slice(0, -2);
    if (k.endsWith('s') && k.length > 3 && !k.endsWith('ss')) return k.slice(0, -1);
    return k;
};

const dedupePluralSingular = (keywords = []) => {
    const seenSingular = new Map(); // singular -> original
    const result = [];
    for (const kw of keywords) {
        const sing = singularizeKeyword(kw);
        // Jika singular vs plural keduanya ada, simpan yang lebih pendek (singular) pertama.
        if (seenSingular.has(sing)) continue;
        // Juga cek apakah kw ini adalah plural dari yang sudah ada
        const isPluralDup = [...seenSingular.keys()].some(s => singularizeKeyword(kw) === s);
        if (isPluralDup) continue;
        seenSingular.set(sing, kw);
        result.push(kw);
    }
    return result;
};

// Cek apakah frasa ada di whitelist common concept — jangan di-split.
const isCommonPhrase = (kw = '') => SEO_COMMON_PHRASES.has(normalizeMetadataKeyword(kw).toLowerCase());

// Split adjective-noun phrase bukan common concept jadi kata terpisah untuk coverage luas.
// Adobe guide: "red dress" → "red","dress" lebih baik daripada 1 keyword "red dress".
const splitNonCommonPhrases = (keywords = []) => {
    const expanded = [];
    const seen = new Set(keywords.map(k => normalizeMetadataKeyword(k)));
    for (const kw of keywords) {
        const norm = normalizeMetadataKeyword(kw);
        const words = norm.split(/\s+/);
        if (words.length === 2 && !isCommonPhrase(norm)) {
            // Split jadi 2 keyword individual jika masing-masing useful dan belum ada
            for (const w of words) {
                if (w.length >= 3 && isUsefulMetadataKeyword(w) && !seen.has(w)) {
                    seen.add(w);
                    expanded.push(w);
                }
            }
        }
        // Pertahankan frasa asli juga bila 2 kata (coverage phrase + kata terpisah)
        // — tapi jangan duplikat bila sudah ada.
    }
    return [...keywords, ...expanded];
};

// Skor SEO keyword — semakin spesifik & komersial semakin tinggi.
// Dipakai untuk ranking top 10.
const scoreKeywordSEO = (kw = '', ctx: { primarySubject?: string; titleWords?: string[]; vision?: any } = {}) => {
    const k = normalizeMetadataKeyword(kw).toLowerCase();
    const words = k.split(/\s+/);
    let score = 50; // base
    const primary = (ctx.primarySubject || '').toLowerCase();
    const titleFirst = (ctx.titleWords?.[0] || '').toLowerCase();
    // Primary subject exact match — highest
    if (k === primary || k === titleFirst) score += 40;
    else if (primary && k.includes(primary)) score += 20;
    // Panjang frasa: 1 kata spesifik > 2 kata generik > 3 kata
    if (words.length === 1 && k.length >= 5) score += 15; // specific single noun
    else if (words.length === 2) score += 8;
    else if (words.length === 3) score -= 5;
    // Kata buyer-intent komersial (dari MARKET_DEMAND) boost
    const commercialBoost = ['business', 'marketing', 'design', 'pattern', 'illustration', 'background', 'concept', 'team', 'office', 'technology', 'nature', 'floral', 'food', 'travel'];
    if (commercialBoost.some(t => k.includes(t))) score += 7;
    // Generik filler penalize
    if (['background', 'design', 'concept', 'illustration', 'pattern'].includes(k)) score -= 15;
    if (k.length < 3) score -= 20;
    // Common phrase boost (dictionary phrase = real buyer query)
    if (isCommonPhrase(k)) score += 10;
    // Vision grounded boost: objek/warna/style yang ada di vision
    const visionObjs = [...(ctx.vision?.objects || []), ...(ctx.vision?.colors || []), ...(ctx.vision?.visualElements || [])].map(v => normalizeMetadataKeyword(v));
    if (visionObjs.some(v => v === k || k.includes(v))) score += 12;
    return Math.max(0, Math.min(100, score));
};

const rankKeywordsForSEO = (keywords = [], ctx = {}) => {
    const scored = keywords.map((kw, idx) => ({ kw, score: scoreKeywordSEO(kw, ctx), idx }));
    // Sort by score desc, stabil by original idx untuk deterministik
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
    return scored.map(s => s.kw);
};

// Inject keyword SEO kritis yang wajib ada per Adobe guide.
const injectSEOCriticalKeywords = (keywords = [], vision = null, profile = '') => {
    const normSet = new Set(keywords.map(k => normalizeMetadataKeyword(k)));
    const toAdd = [];
    const pushIfMissing = (term) => {
        const norm = normalizeMetadataKeyword(term);
        if (norm && isUsefulMetadataKeyword(norm) && !normSet.has(norm)) {
            normSet.add(norm);
            toAdd.push(norm);
        }
    };
    // Adobe guide: bila no people, wajib "no people","nobody"
    if (vision && vision.peopleVisible === false) {
        pushIfMissing('no people');
        pushIfMissing('nobody');
    } else if (vision && vision.peopleVisible === true) {
        // Jumlah orang — SEO penting untuk buyer filter
        const cnt = vision.peopleCount || 1;
        if (cnt === 1) pushIfMissing('one person');
        else if (cnt === 2) pushIfMissing('two people');
        else if (cnt >= 3 && cnt <= 5) pushIfMissing(`${cnt} people`);
        else if (cnt > 5) pushIfMissing('group of people');
        if (vision.peopleRecognizable === false) pushIfMissing('fictional person');
    }
    // Setting & viewpoint — sering dicari buyer
    if (vision?.environment) {
        const env = vision.environment.toLowerCase();
        if (env.includes('indoor')) pushIfMissing('indoors');
        if (env.includes('outdoor')) pushIfMissing('outdoors');
        if (env.includes('plain') || env.includes('white') || env.includes('transparent')) pushIfMissing('isolated');
        if (env.includes('studio')) pushIfMissing('studio shot');
    }
    if (vision?.cameraAngle) {
        const ca = vision.cameraAngle.toLowerCase();
        if (ca.includes('aerial') || ca.includes('top-down') || ca.includes('bird')) pushIfMissing('aerial view');
        else if (ca.includes('high angle')) pushIfMissing('high angle view');
        else if (ca.includes('close-up') || ca.includes('macro')) pushIfMissing('close up');
    }
    // Profile-specific style keywords — Adobe illustration guide
    if (profile === 'pattern') pushIfMissing('seamless pattern');
    else if (profile === 'icon') pushIfMissing('icon');
    else if (profile === 'illustration') pushIfMissing('illustration');
    // Mood conceptual — bila ada
    if (vision?.mood) {
        const mood = normalizeMetadataKeyword(vision.mood);
        if (mood && mood.split(/\s+/).length <= 2) pushIfMissing(mood);
    }
    return [...keywords, ...toAdd];
};

const PRIMARY_ESCAPE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Optimasi Title SEO: front-load primary noun, sentence-case, length 50-70.
const optimizeTitleForSEO = (title = '', vision = null) => {
    let t = sanitizeStockTitle(title);
    // Sentence case sudah via sanitizeStockTitle; pastikan primary subject di depan
    const primary = vision?.primarySubject ? normalizeMetadataKeyword(vision.primarySubject) : '';
    if (primary && t.toLowerCase().indexOf(primary) > 12) {
        // Jika primary tidak di 12 char awal, pindah ke depan
        const withoutPrimary = t.replace(new RegExp(PRIMARY_ESCAPE(primary), 'i'), '').replace(/\s{2,}/g, ' ').trim();
        t = `${primary.charAt(0).toUpperCase() + primary.slice(1)} ${withoutPrimary}`.replace(/\s{2,}/g, ' ').trim();
        t = sanitizeStockTitle(t);
    }
    // SEO length tuning: ideal 55-70, minimal 50. Jika terlalu pendek, tambah konteks use-case.
    if (t.length < SEO_CONFIG.title.idealMin && vision?.visualStyle) {
        const suffix = vision.patternType && vision.patternType !== 'not a pattern' ? ' for surface design' : vision.composition ? ` ${vision.composition}` : '';
        const candidate = sanitizeStockTitle(`${t}${suffix}`);
        if (candidate.length <= SEO_CONFIG.title.idealMax && candidate.length > t.length) t = candidate;
    }
    // Jika kepanjangan >70, potong di word boundary (sanitize sudah handle 200, kita tight ke 70)
    if (t.length > SEO_CONFIG.title.max) {
        const cut = t.slice(0, SEO_CONFIG.title.max);
        const lastSpace = cut.lastIndexOf(' ');
        t = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
    }
    return t;
};

// Pastikan semua kata penting title ada di top-10 keywords — Adobe extra bump.
const ensureTitleKeywordsInTop10 = (keywords = [], title = '') => {
    const titleWords = keywordTokens(title).filter(w => w.length >= 3 && isUsefulMetadataKeyword(w));
    const topSet = new Set(keywords.slice(0, SEO_CONFIG.keywords.topWeightCount).map(k => normalizeMetadataKeyword(k)));
    const toInject = titleWords.filter(w => !topSet.has(w) && !keywords.map(k => normalizeMetadataKeyword(k)).includes(w));
    if (toInject.length === 0) return keywords;
    // Sisipkan title words yang hilang ke posisi 5-9 (setelah primary synonyms)
    const insertPos = Math.min(5, keywords.length);
    const result = [...keywords];
    for (let i = toInject.length - 1; i >= 0; i--) {
        if (result.length >= SEO_CONFIG.keywords.hardMax) break;
        result.splice(insertPos, 0, toInject[i]);
    }
    // De-dupe dan potong hardMax
    const seen = new Set();
    return result.filter(k => {
        const n = normalizeMetadataKeyword(k);
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
    }).slice(0, SEO_CONFIG.keywords.hardMax);
};

// Hitung skor SEO metadata (0-100) untuk QA & UI hint.
const calculateSEOScore = ({ title = '', keywords = [], description = '' }) => {
    let score = 0;
    const tLen = title.length;
    if (tLen >= SEO_CONFIG.title.idealMin && tLen <= SEO_CONFIG.title.idealMax) score += 30;
    else if (tLen >= SEO_CONFIG.title.min && tLen <= SEO_CONFIG.title.hardMax) score += 18;
    else if (tLen >= METADATA_RULES.title.MIN_LEN) score += 8;
    const kwCount = keywords.length;
    if (kwCount >= SEO_CONFIG.keywords.targetMin && kwCount <= SEO_CONFIG.keywords.targetMax) score += 30;
    else if (kwCount >= SEO_CONFIG.keywords.min && kwCount <= SEO_CONFIG.keywords.hardMax) score += 18;
    else if (kwCount >= METADATA_RULES.keywords.MIN_COUNT) score += 8;
    // First keyword = first title word
    const firstTitle = keywordTokens(title)[0] || '';
    if (firstTitle && normalizeMetadataKeyword(keywords[0] || '') === firstTitle) score += 15;
    // Description length
    if (description.length >= SEO_CONFIG.description.idealMin && description.length <= SEO_CONFIG.description.idealMax) score += 15;
    else if (description.length >= 50) score += 7;
    // Top keyword uniqueness
    const top10 = keywords.slice(0, 10).map(k => normalizeMetadataKeyword(k));
    const uniqTop = new Set(top10).size;
    score += Math.round((uniqTop / 10) * 10);
    return Math.min(100, score);
};

const validateAndCleanKeywords = (keywords = [], options = {}) => {
    const issues = [];
    const MIN = METADATA_RULES.keywords.MIN_COUNT;
    const MAX = METADATA_RULES.keywords.MAX_COUNT;

    const source = Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string'
            ? keywords.split(',')
            : [];

    const seen = new Set();
    const cleaned = [];

    for (const raw of source) {
        const keyword = normalizeMetadataKeyword(raw);

        if (!isUsefulMetadataKeyword(keyword)) continue;
        if (seen.has(keyword)) continue;

        seen.add(keyword);
        cleaned.push(keyword);

        if (cleaned.length >= MAX) break;
    }

    // Optional deterministic expansion sources.
    const expansionSources = [
        ...(Array.isArray(options.titleWords) ? options.titleWords : []),
        ...(Array.isArray(options.themeKeywords) ? options.themeKeywords : []),
        ...(Array.isArray(options.contextKeywords) ? options.contextKeywords : []),
    ];

    for (const raw of expansionSources) {
        const keyword = normalizeMetadataKeyword(raw);

        if (!isUsefulMetadataKeyword(keyword)) continue;
        if (seen.has(keyword)) continue;

        seen.add(keyword);
        cleaned.push(keyword);

        // Expansion hanya gap-fill sampai MIN — relevansi > jumlah, jangan
        // memaksakan sampai MAX hanya karena sumber expansion tersedia.
        if (cleaned.length >= MIN) break;
    }

    // Final safety cap.
    const finalKeywords = cleaned.slice(0, MAX);

    if (finalKeywords.length < MIN) {
        issues.push(
            `Only ${finalKeywords.length} keywords after sanitization (minimum ${MIN}).`
        );
    }

    if (finalKeywords.length > MAX) {
        issues.push(`Keyword count exceeded ${MAX} and was truncated.`);
    }

    return {
        passed: finalKeywords.length >= MIN,
        issues,
        cleaned: finalKeywords,
    };
};


// METADATA ENGINE V2 — Build commercial keyword expansion candidates

const buildMetadataExpansionCandidates = ({
    asset,
    title = '',
    analysis = null,
}) => {
    const candidates = [];

    const push = (value) => {
        if (!value) return;

        const normalized = normalizeMetadataKeyword(value);

        if (!normalized) return;

        if (!isUsefulMetadataKeyword(normalized)) return;

        candidates.push(normalized);
    };

    // Title phrases.
    const titleWords = keywordTokens(title);

    titleWords.forEach(push);

    // Original generation theme.
    const theme = asset?.baseTheme || asset?.title || '';
    const themeParts = String(theme)
        .split(/[,;|/]+/)
        .map(s => s.trim())
        .filter(Boolean);

    themeParts.forEach(push);

    // Category context.
    push(asset?.adobeCategory);
    push(asset?.subcategory);

    // Style context.
    push(asset?.style);

    // AI visual observations.
    if (analysis) {
        [
            analysis.subject,
            analysis.primarySubject,
            analysis.patternType,
            analysis.visualStyle,
            analysis.composition,
            analysis.backgroundDescription,
        ].forEach(push);

        if (Array.isArray(analysis.objects)) {
            analysis.objects.forEach(push);
        }

        if (Array.isArray(analysis.colors)) {
            analysis.colors.forEach(push);
        }

        if (Array.isArray(analysis.styles)) {
            analysis.styles.forEach(push);
        }

        if (Array.isArray(analysis.visualElements)) {
            analysis.visualElements.forEach(push);
        }
    }

    // Useful phrase combinations from title words.
    // Hanya kombinasi 2 kata agar tidak membuat keyword stuffing.
    for (let i = 0; i < titleWords.length - 1; i++) {
        push(`${titleWords[i]} ${titleWords[i + 1]}`);
    }

    // Buyer vocabulary (Fase A.2) — istilah yang pembeli microstock ketik.
    // Ditempatkan setelah visual observations supaya keyword relevan dengan
    // gambar, lalu dilengkapi istilah pencarian yang membuat asset DITEMUKAN.
    const categoryKey = asset?.adobeCategory || asset?.stockMetadata?.stockCategory || '';
    getBuyerTermsForCategory(categoryKey).forEach(push);

    return [...new Set(candidates)];
};


// METADATA ENGINE V2 — Final metadata normalizer

const buildFinalStockMetadata = ({
    asset,
    analysis,
    title = '',
    description = '',
}) => {
    // ── TITLE ──────────────────────────────────────────────────────────────────
    // SEO Layer: optimize title untuk front-load primary noun + length 55-70 (Adobe sweet-spot)
    let finalTitle = optimizeTitleForSEO(title || '', analysis);

    // ── DESCRIPTION ────────────────────────────────────────────────────────────
    const rawDescription = String(description || '').replace(/\s+/g, ' ').trim();
    let finalDescription = rawDescription;

    // Fallback: build a structured description from visual analysis fields only.
    // Never use asset.baseTheme (the generation prompt) — it may be in Indonesian.
    if (!finalDescription || finalDescription.length < 40) {
        const subject =
            analysis?.primarySubject ||
            analysis?.subject ||
            asset?.subcategory ||
            asset?.adobeCategory ||
            'commercial design element';

        const visualStyle  = analysis?.visualStyle   || '';
        const patternType  = analysis?.patternType   || '';
        const composition  = analysis?.composition   || '';
        const colors       = Array.isArray(analysis?.colors) && analysis.colors.length > 0
            ? analysis.colors.slice(0, 3).join(', ')
            : '';

        // Determine a relevant use-case sentence based on asset type / category
        const assetType = (asset?.assetType || 'vector').toLowerCase();
        const category  = (asset?.adobeCategory || '').toLowerCase();
        let useCaseSentence = '';
        if (assetType === 'vector' || category.includes('pattern')) {
            useCaseSentence = 'Ideal for surface design, fabric printing, packaging, stationery, and digital backgrounds.';
        } else if (assetType === 'illustration') {
            useCaseSentence = 'Suitable for editorial illustration, social media content, marketing materials, and creative projects.';
        } else if (assetType === '3d') {
            useCaseSentence = 'Perfect for product visualization, advertising, e-commerce, and digital marketing campaigns.';
        } else if (category.includes('icon') || asset?.assetProfile === 'icon') {
            useCaseSentence = 'Designed for web and mobile UI, app design, infographics, and digital communication.';
        } else {
            useCaseSentence = 'Suitable for commercial design, marketing, web, print, and creative applications.';
        }

        const descParts = [];

        // Sentence 1: Subject + style context
        const styleDetail = [visualStyle, patternType].filter(Boolean).join(', ');
        descParts.push(
            `${subject.charAt(0).toUpperCase() + subject.slice(1)}${styleDetail ? ` with ${styleDetail} style` : ''}.`
        );

        // Sentence 2: Composition / color detail (only if available)
        const detail2 = [
            colors ? `Color palette features ${colors}` : '',
            composition ? `Composition: ${composition}` : '',
        ].filter(Boolean).join('. ');
        if (detail2) descParts.push(detail2 + '.');

        // Sentence 3: Use case
        descParts.push(useCaseSentence);

        finalDescription = descParts
            .join(' ')
            // Adobe compliance: strip special chars from description too
            .replace(/[^a-zA-Z0-9\s.,!?]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    } else {
        // Sanitize description from AI: remove special chars except .,!?
        finalDescription = finalDescription
            .replace(/[^a-zA-Z0-9\s.,!?]/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // ── DESCRIPTION SEO ENRICHMENT (Senior SEO Writer) ───────────────────────
    // Adobe semantic indexing memakai description untuk konteks komersial.
    // Jika <150 char, tambah use-case + style context supaya 180-320 (SEO ideal).
    if (finalDescription.length < SEO_CONFIG.description.idealMin) {
        const seoAdditions = [];
        if (analysis?.mood) seoAdditions.push(`Mood is ${analysis.mood}`);
        if (analysis?.lighting) seoAdditions.push(`lighting is ${analysis.lighting}`);
        if (analysis?.composition) seoAdditions.push(analysis.composition);
        const extra = seoAdditions.filter(Boolean).join(', ');
        if (extra) {
            const candidate = `${finalDescription} ${extra}.`.replace(/\s{2,}/g, ' ').trim();
            if (candidate.length <= SEO_CONFIG.description.idealMax) finalDescription = candidate;
        }
    }

    // ── DESCRIPTION VALIDATION ──────────────────────────────────────────────────
    // Adobe Stock tidak mendokumentasikan batas karakter resmi untuk description,
    // tapi praktik contributor: 50–250 karakter deskriptif. Truncate di 500 sebagai
    // safety cap (jauh di atas kebutuhan); flag terlalu pendek sebagai issue saja.
    const DESC_MIN = 50;
    const DESC_MAX_SOFT = 500;
    const descIssues: string[] = [];

    if (finalDescription.length > DESC_MAX_SOFT) {
        finalDescription = finalDescription.slice(0, DESC_MAX_SOFT).trim();
        descIssues.push(`Description truncated to ${DESC_MAX_SOFT} chars.`);
    }
    if (finalDescription.length < DESC_MIN) {
        descIssues.push(`Description too short (${finalDescription.length} chars, target min ${DESC_MIN}) — add subject context, use-case, or style detail.`);
    }
    // SEO description hint
    if (finalDescription.length < SEO_CONFIG.description.min) {
        descIssues.push(`Description below SEO ideal (${finalDescription.length} chars, SEO target ${SEO_CONFIG.description.idealMin}-${SEO_CONFIG.description.idealMax}) — add commercial context for better semantic ranking.`);
    }

    // ── KEYWORDS ───────────────────────────────────────────────────────────────
    const titleWords   = keywordTokens(finalTitle);
    const firstTitleWord = titleWords[0] || '';

    // Priority order: AI keywords are the primary source.
    // Only supplement with expansion candidates if AI keywords are insufficient.
    const aiKeywords   = Array.isArray(analysis?.keywords) ? analysis.keywords : [];
    const MIN          = METADATA_RULES.keywords.MIN_COUNT;
    const MAX          = METADATA_RULES.keywords.MAX_COUNT;

    // Always put first title word at position 0 to enforce title/keyword consistency.
    const seedKeywords = firstTitleWord
        ? [firstTitleWord, ...aiKeywords.filter(k => normalizeMetadataKeyword(k) !== firstTitleWord)]
        : aiKeywords;

    let keywordResult = validateAndCleanKeywords(seedKeywords, {
        // Only use expansion as supplemental gap-fill, not primary source
        titleWords:   aiKeywords.length < MIN ? titleWords : [],
        themeKeywords: aiKeywords.length < MIN ? keywordTokens(asset?.baseTheme || '') : [],
        contextKeywords: aiKeywords.length < MIN
            ? [asset?.adobeCategory, asset?.subcategory, asset?.style].filter(Boolean)
            : [],
    });

    let finalKeywords = keywordResult.cleaned;

    // Hard enforce: first keyword = first title word
    if (firstTitleWord && finalKeywords[0] !== firstTitleWord) {
        finalKeywords = [
            firstTitleWord,
            ...finalKeywords.filter(k => k !== firstTitleWord),
        ];
    }

    // Fase A.2: inject buyer vocabulary — istilah pencarian pembeli microstock
    // untuk kategori ini. SELALU dipertimbangkan (bukan hanya gap-fill), supaya
    // keyword mengandung istilah yang membuat asset DITEMUKAN di pencarian —
    // bukan hanya deskripsi visual dari AI.
    const buyerTerms = getBuyerTermsForCategory(asset?.adobeCategory || '');
    if (buyerTerms.length > 0) {
        const seenSet = new Set(finalKeywords.map(k => normalizeMetadataKeyword(k)));
        for (const term of buyerTerms) {
            const norm = normalizeMetadataKeyword(term);
            if (norm && !seenSet.has(norm) && isUsefulMetadataKeyword(norm)) {
                seenSet.add(norm);
                finalKeywords.push(norm);
                if (finalKeywords.length >= MAX) break;
            }
        }
    }

    // If still below MIN after all sources, append expansion candidates
    if (finalKeywords.length < MIN) {
        const expansionCandidates = buildMetadataExpansionCandidates({ asset, title: finalTitle, analysis });
        const seenSet = new Set(finalKeywords);
        for (const c of expansionCandidates) {
            const norm = normalizeMetadataKeyword(c);
            if (norm && !seenSet.has(norm) && isUsefulMetadataKeyword(norm)) {
                seenSet.add(norm);
                finalKeywords.push(norm);
                if (finalKeywords.length >= MIN) break;
            }
        }
    }

    // Post-process: split keyword yang melebihi 3 kata.
    // Frasa 1–3 kata (mis. "small business owner", "flat lay") dipertahankan utuh —
    // Adobe tidak membatasi panjang frasa, hanya jumlah total keyword (max 50).
    // Frasa ≥4 kata dipecah: ambil 3-kata pertama, lalu kata-kata individual.
    const expandedKeywords: string[] = [];
    const seenExpanded = new Set<string>();

    for (const kw of finalKeywords) {
        const words = kw.trim().split(/\s+/);
        if (words.length <= 3) {
            // 1–3 kata: valid, simpan utuh
            if (!seenExpanded.has(kw)) {
                seenExpanded.add(kw);
                expandedKeywords.push(kw);
            }
        } else {
            // ≥4 kata: ambil 3-kata pertama sebagai frasa utama, lalu kata individual
            const threeWord = words.slice(0, 3).join(' ');
            if (!seenExpanded.has(threeWord)) {
                seenExpanded.add(threeWord);
                expandedKeywords.push(threeWord);
            }
            for (const w of words) {
                if (w.length >= 3 && !seenExpanded.has(w) && isUsefulMetadataKeyword(w)) {
                    seenExpanded.add(w);
                    expandedKeywords.push(w);
                }
            }
        }
    }

    finalKeywords = expandedKeywords.slice(0, MAX);

    // ── SEO OPTIMIZATION LAYER (Senior SEO Writer — Adobe Algorithm 2026) ─────
    // - Dedupe plural/singular (Adobe handles synonyms otomatis — waste slot bila duplikat)
    // - Split non-common adjective+noun phrase → kata terpisah untuk coverage luas
    // - Inject no people/viewpoint/setting/mood conceptual (Adobe guide wajib)
    // - Rank top 7-10 by SEO score (specific + commercial + vision grounded)
    // - Ensure title words in top 10 (extra bump)
    // - Target 30-40 keywords untuk max coverage tanpa stuffing
    const seoProfile = detectVisualProfile(analysis, asset);
    finalKeywords = dedupePluralSingular(finalKeywords);
    finalKeywords = splitNonCommonPhrases(finalKeywords);
    // De-dupe lagi setelah split
    finalKeywords = [...new Set(finalKeywords.map(k => normalizeMetadataKeyword(k)).filter(Boolean))].filter(k => isUsefulMetadataKeyword(k));
    finalKeywords = injectSEOCriticalKeywords(finalKeywords, analysis, seoProfile);
    // SEO target: push ke 30 bila masih di bawah targetMin dan relevansi mendukung
    if (finalKeywords.length < SEO_CONFIG.keywords.targetMin) {
        const extraCandidates = buildMetadataExpansionCandidates({ asset, title: finalTitle, analysis });
        const seenSEO = new Set(finalKeywords.map(k => normalizeMetadataKeyword(k)));
        for (const c of extraCandidates) {
            const norm = normalizeMetadataKeyword(c);
            if (norm && !seenSEO.has(norm) && isUsefulMetadataKeyword(norm)) {
                seenSEO.add(norm);
                finalKeywords.push(norm);
                if (finalKeywords.length >= SEO_CONFIG.keywords.targetMin) break;
            }
        }
    }
    // Rank SEO — paling spesifik & komersial di posisi 1-10 (first 7 ultra-weight)
    finalKeywords = rankKeywordsForSEO(finalKeywords, { primarySubject: analysis?.primarySubject || '', titleWords: keywordTokens(finalTitle), vision: analysis });
    // Pastikan kata penting title ada di top 10 (Adobe extra bump)
    finalKeywords = ensureTitleKeywordsInTop10(finalKeywords, finalTitle);
    // Hard enforce first keyword = first title word (tetap — SEO utama)
    const seoFirstTitleWord = keywordTokens(finalTitle)[0] || '';
    if (seoFirstTitleWord && normalizeMetadataKeyword(finalKeywords[0] || '') !== seoFirstTitleWord) {
        finalKeywords = [seoFirstTitleWord, ...finalKeywords.filter(k => normalizeMetadataKeyword(k) !== seoFirstTitleWord)];
    }
    finalKeywords = finalKeywords.slice(0, SEO_CONFIG.keywords.max);

    // ── POST-PROCESS: Strip/replace spam & banned terms from title, description, keywords ──────
    // Pastikan output bersih tanpa perlu mengandalkan AI mengikuti instruksi 100%.
    // TITLE: sudah ditangani optimizeTitleForSEO di atas.
    // DESCRIPTION: ganti spam-terms dengan padanan netral supaya kalimat tetap utuh.
    const DESC_REPLACEMENTS: [RegExp, string][] = [
        [/\billustration\b/gi, 'artwork'],
        [/\bvector\s+illustration\b/gi, 'artwork'],
        [/\bvector\s+graphic[s]?\b/gi, 'artwork'],
        [/\bstock\s+vector\b/gi, 'commercial artwork'],
        [/\bflat\s+2d\b/gi, 'flat design'],
        [/\bai[\s-]generated\b/gi, ''],
        [/\bai\s+art\b/gi, ''],
        [/\bgenerated\s+by\s+ai\b/gi, ''],
        [/\bhigh[\s-]quality\b/gi, ''],
        [/\bhigh\s+resolution\b/gi, ''],
        [/\bfree\s+to\s+use\b/gi, ''],
        [/\bcommercial\s+use\b/gi, ''],
        [/\bamazing\b/gi, ''],
        [/\bbeautiful\b/gi, ''],
        [/\bawesome\b/gi, ''],
        [/\bstunning\b/gi, ''],
        [/\bbest\s+quality\b/gi, ''],
        [/\bclipart\b/gi, 'design element'],
        [/\bconcept\s+art\b/gi, 'artwork'],
        [/\beps\s+file\b/gi, ''],
        [/\bdigital\s+asset\b/gi, ''],
        [/\bgraphic\s+design\b/gi, 'design'],
    ];
    for (const [pattern, replacement] of DESC_REPLACEMENTS) {
        finalDescription = finalDescription.replace(pattern, replacement);
    }
    // Cleanup artefak double-space / leading comma setelah penghapusan term
    finalDescription = finalDescription
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\./g, '.')
        .replace(/\s+,/g, ',')
        .trim();

    // KEYWORDS: buang seluruh keyword yang masuk daftar spam
    finalKeywords = finalKeywords.filter(kw => {
        const k = normalizeMetadataKeyword(kw);
        return !SPAM_TERMS.some(term => k === term.toLowerCase() || k === normalizeMetadataKeyword(term));
    });
    // Pastikan masih cukup (min count) — kalau ada yang terbuang, biarkan saja;
    // jumlah issue akan ditangkap di keywordIssues di bawah.

    const keywordIssues = [...keywordResult.issues];
    if (finalKeywords.length < MIN) {
        keywordIssues.push(`Final metadata contains only ${finalKeywords.length} keywords (minimum ${MIN}).`);
    }
    // SEO scoring — hitung setelah semua optimasi selesai
    const seoScore = calculateSEOScore({ title: finalTitle, keywords: finalKeywords, description: finalDescription });
    if (seoScore < 70) {
        keywordIssues.push(`SEO score ${seoScore}/100 below ideal — strengthen title front-load & top 10 keyword specificity for better ranking.`);
    }
    // SEO keyword count hint
    if (finalKeywords.length < SEO_CONFIG.keywords.targetMin) {
        keywordIssues.push(`Keyword count ${finalKeywords.length} below SEO target ${SEO_CONFIG.keywords.targetMin} — add 2-3 more specific buyer-intent terms visible in image.`);
    }

    return {
        title:        finalTitle,
        description:  finalDescription,
        keywords:     finalKeywords,
        keywordIssues,
        descriptionIssues: descIssues,       // ← ISU 6: expose ke caller untuk merge ke preflightIssues
        descriptionPassed: finalDescription.length >= DESC_MIN,
        keywordPassed:
            finalKeywords.length >= MIN &&
            finalKeywords.length <= MAX,
        seoScore,
        seoPassed: seoScore >= 70,
    };
};

// Fallback metadata OFFLINE (tanpa AI) saat AI visual analysis gagal — agar
// metadata tidak dikosongkan. Dibangun murni dari field deterministik aset
// (subcategory/adobeCategory/assetType/style — BUKAN teks prompt baseTheme)
// sehingga tetap berbahasa Inggris & aman compliance. Dipakai di runAutoPreflight
// saat pipeline AI gagal total; asset tetap ditandai Needs Review.

// Terapkan hasil regenerate per-field ke asset + simpan.
// `raw` = hasil dari regenerateMetadataField. Return updated asset.
const applyMetadataFieldUpdate = async (asset, field, raw) => {
    if (!asset) return null;
    const sm = { ...(asset.stockMetadata || {}) };
    if (field === 'keywords') {
        const cleaned = (Array.isArray(raw) ? raw : [])
            .map(k => String(k).trim())
            .filter(k => {
                const norm = normalizeMetadataKeyword(k);
                return Boolean(k) && !SPAM_TERMS.some(term => norm === term.toLowerCase() || norm === normalizeMetadataKeyword(term));
            })
            .slice(0, METADATA_RULES.keywords.MAX_COUNT);
        sm.keywords = cleaned;
    } else if (field === 'title') {
        sm.title = String(raw).trim();
        asset.title = String(raw).trim();
    } else if (field === 'description') {
        sm.description = String(raw).trim();
    }
    sm.manualFixedAt = Date.now();

    // Unlock otomatis: kalau metadata LENGKAP & valid setelah field baru
    // diterapkan (title ≥ MIN, desc ≥ 30, kw ≥ MIN), naikkan status ke
    // metadata_ready — user tidak perlu klik Save Edits lagi. Kalau belum
    // lengkap, status tetap dan field yang kurang bisa diregenerate.
    const titleOk = (sm.title || '').trim().length >= METADATA_RULES.title.MIN_LEN;
    const descOk = (sm.description || '').trim().length >= 30;
    const kwOk = (Array.isArray(sm.keywords) ? sm.keywords : []).length >= METADATA_RULES.keywords.MIN_COUNT;
    const allOk = titleOk && descOk && kwOk;

    // Validasi compliance ulang terhadap metadata FINAL — hasil regenerate
    // harus lolos hard gate (brand/IP/news/spam), bukan cuma panjangnya cukup.
    // Kalau ada critical, JANGAN unlock ke metadata_ready — tetap rejected dan
    // issue compliance baru ditambahkan supaya ter-highlight di modal.
    const compliance = allOk
        ? validateMetadataCompliance({ title: sm.title || '', description: sm.description || '', keywords: sm.keywords || [] })
        : null;
    const complianceCritical = compliance ? compliance.issues.some(i => i.severity === 'critical') : false;
    const canUnlock = allOk && !complianceCritical;

    const existingIssues = [ ...(Array.isArray(sm.preflightIssues) ? sm.preflightIssues : []), ...Object.values(sm.preflightIssueCategories || {}).flatMap(v => Array.isArray(v) ? v : []) ].map(String).join(' ').toLowerCase();
    const analysisEvidence = sm.evidence && typeof sm.evidence === 'object' &&
        [sm.evidence.titleBasis, sm.evidence.keywordBasis, sm.evidence.categoryBasis]
            .some(value => Array.isArray(value) && value.length > 0);
    // PERBAIKAN: watermark TIDAK menjadi hard block saat regenerate metadata
    // kecuali AI secara eksplisit menandai (checks.noWatermark === false).
    // Canvas heuristic terlalu agresif pada ilustrasi detail — jangan pakai
    // string "watermark" dari preflightIssues lama sebagai gate.
    const existingIssuesNoWatermark = existingIssues.replace(/watermark[^;.\n]*/gi, '').trim();
    // FIX-WATERMARK-FP: block only when noWatermark=false has explicit AI evidence.
    const aiWatermarkBlocked = sm.preflightChecks?.noWatermark === false
        && Boolean(sm.evidence?.contentSafetyBasis || sm.preflightIssues?.some(i => /AI.*watermark|watermark.*AI|visibleWatermark/i.test(String(i))));
    const statusResult = evaluateMetadataStatus({
        analysisAvailable: Boolean(analysisEvidence),
        title: sm.title || '', description: sm.description || '', keywords: sm.keywords || [],
        categoryValid: Boolean(sm.stockCategory || asset.adobeCategory || asset.platformCategoryId != null),
        hardBlocks: [complianceCritical, /semantic mismatch|wrong subject|category quality reject|content safety reject|\b(?:brand|trademark|ip risk|copyright)\b|\bduplicate\b|near[- ]duplicate|\bblur(?:red)?\b|critical metadata compliance/i.test(existingIssuesNoWatermark), aiWatermarkBlocked, sm.ipRisk?.recommendation === 'block' || sm.ipRisk?.recommendation === 'regenerate'],
    });
    const nextStatus = ['exported', 'submitted'].includes(asset.status) ? asset.status : statusResult.status;

    if (compliance && compliance.issues.length > 0) {
        const existing = Array.isArray(sm.preflightIssues) ? sm.preflightIssues : [];
        sm.preflightIssues = [
            ...existing.filter(i => !/compliance|brand|news|spam|metadata/i.test(String(i))),
            ...compliance.issues.map(i => `Metadata compliance: ${i.message}`),
        ];
        sm.preflightDecision = 'needs_review';
    }

    if (statusResult.status === 'metadata_ready') {
        sm.preflightDecision = 'pass';
        // Sinkronkan kategori: metadata sudah lengkap — kosongkan kategori
        // metadata (image/content tetap, karena itu masalah gambar).
        const cats = sm.preflightIssueCategories || { image: [], metadata: [], content: [] };
        sm.preflightIssueCategories = { ...cats, metadata: [] };
        sm.preflightIssues = (sm.preflightIssues || []).filter(i => !/title|keyword|description|metadata|compliance|diversity|semantic/i.test(String(i)));
    }

    const updated = { ...asset, status: nextStatus, stockMetadata: sm };
    await saveAssetDB(updated);
    return updated;
};


const AUTO_REGENERATION_MAX_RETRIES = 2;

    // runAutoPreflight — QA + metadata + compliance + auto-regeneration.
    // Didefinisikan sebagai function declaration (hoisted) supaya bisa memanggil
    // dirinya sendiri untuk re-preflight hasil auto-regeneration (FASE 1).
    export async function runAutoPreflight(asset, silent = false, opts = {}, ctx) {
        const { assets, setAssets, setSelectedAssetDetail, preflightInFlightRef, showToast, systemSettings, incrementApiCallCounter, finalizeAsset, assessTechnicalQuality, assessSharpness, detectWatermark, TECHNICAL_QA, assessProfileMatch, buildQualityGateResult, buildRegenerationPlan } = ctx;
        const allowAutoRegen = opts.allowAutoRegen ?? true;
        if (!asset?.url) return asset;
        const isRecursion = !!opts._isRecursion;
        if (!isRecursion && preflightInFlightRef.current.has(asset.id)) {
            if (!silent) showToast('Metadata untuk asset ini sedang diproses — tunggu selesai.', 'info');
            return asset;
        }
        if (!isRecursion) preflightInFlightRef.current.add(asset.id);
        const originalStatus = asset.status;
        let finalAssetPersisted = false;
        try {

        // FASE D3 — Stage Log: jejak tahapan QA (observability). Dicatat ke
        // asset.lineage.stageLog saat selesai — "di stage mana asset gagal".
        const stageLog = [{ stage: 'preflight_start', at: Date.now() }];
        const logStage = (stage) => { stageLog.push({ stage, at: Date.now() }); };

        const baseMetadata = asset.stockMetadata || buildDraftStockMetadata({
            assetType: asset.assetType || 'vector',
            background: asset.background || 'white',
            outputFormat: asset.outputFormat || 'PNG',
            stockCategory: asset.adobeCategory || '',
            subcategory: asset.subcategory || '',
        });

        // Spec workflow poin 15: PROCESSING adalah status transien saat preflight
        // berjalan — bukan kondisi final. Set di sini, override ke final status
        // di bawah setelah decision terbentuk.
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: 'processing' } : a));

        let preflightFailureReason = null;
        logStage('vision_analysis');
        const analysis = await analyzeAssetForPreflight(
            asset,
            systemSettings.aiConfig,
            incrementApiCallCounter,
            (reason) => { preflightFailureReason = reason; }
        );

        // METADATA ENGINE V2 — Single Source of Truth

        // Metadata failure is NOT allowed to silently produce generic/structured
        // fallback metadata. If the AI vision+metadata pipeline failed entirely
        // (analysis === null), leave title/description/keywords EMPTY and force
        // review — do NOT synthesize metadata from baseTheme/category/subcategory.
        // buildFinalStockMetadata() (which contains that deterministic fallback
        // text/keyword builder) is only called when we actually have an analysis.
        let title = '';
        let description = '';
        let keywordResult = { cleaned: [], issues: [], passed: false };
        // FIX BUG #1: deklarasikan metadataPackage di outer scope supaya bisa
        // diakses di nextMetadata.preflightIssues (line ~20526) yang berada di
        // luar blok if (analysis). Sebelumnya `const metadataPackage` di-declare
        // di dalam if-block sehingga ReferenceError ter-throw saat nextMetadata
        // di-build → di-catch oleh try/catch → setAssets restore status lama
        // tanpa metadata → metadata kosong di UI tanpa error toast (bulk silent).
        let metadataPackage: ReturnType<typeof buildFinalStockMetadata> | null = null;

        if (analysis) {
            metadataPackage = buildFinalStockMetadata({
                asset,
                analysis,
                // Title MUST come from AI visual analysis ONLY — never fall back to
                // the generation prompt (baseTheme/asset.title) which is in Indonesian
                // or contains prompt-style text that doesn't belong in stock metadata.
                title: analysis?.title || '',
                description: analysis?.description || '',
            });

            title = metadataPackage.title;
            description = metadataPackage.description;

            keywordResult = {
                cleaned: metadataPackage.keywords,
                issues: metadataPackage.keywordIssues,
                passed: metadataPackage.keywordPassed,
            };

            // FIX: auto-hapus keyword terlarang (brand/IP, spam, news marker).
            // Aman untuk keywords: membuang 1 dari 30 keyword tidak merusak
            // struktur; untuk title/description justru AI yang menulis ulang
            // kalimat utuh (lewat issues yang diteruskan ke regenerate).
            const bannedTermList = [...checkBrandSafety(keywordResult.cleaned.join(', ')), ...SPAM_TERMS, ...METADATA_NEWS_MARKERS];
            const sanitizedKeywords = keywordResult.cleaned.filter(kw => {
                const k = kw.toLowerCase();
                return !bannedTermList.some(term => k.includes(String(term).toLowerCase()));
            });
            if (sanitizedKeywords.length !== keywordResult.cleaned.length) {
                const removedCount = keywordResult.cleaned.length - sanitizedKeywords.length;
                keywordResult = {
                    cleaned: sanitizedKeywords,
                    issues: [...keywordResult.issues, `Removed ${removedCount} banned keyword(s) (brand/spam/news) automatically.`],
                    passed: sanitizedKeywords.length >= METADATA_RULES.keywords.MIN_COUNT,
                };
            }
        } else {
            // Fallback offline — metadata TIDAK dikosongkan saat AI visual analysis
            // gagal (mis. API key Gemini 401/403). Dibangun deterministik dari field
            // aset (subcategory/category/assetType/style — bukan teks prompt baseTheme)
            // sehingga tetap berbahasa Inggris & aman compliance. Asset tetap Needs
            // Review supaya user tahu harus menjalankan ulang setelah masalah diperbaiki.
            const reasonLabel = {
                no_api_key: 'API key Gemini belum diisi di Settings.',
                no_image: 'Gambar asset tidak terbaca (url hilang/rusak).',
                rate_limited: 'Kena rate limit Gemini (429) — tunggu sebentar lalu coba lagi, atau kurangi jumlah asset per batch.',
                auth_error: 'API key ditolak Gemini (401/403) — cek ulang key di Settings.',
                model_not_found: 'Model text yang dipilih di Settings tidak ditemukan (404) — cek nama model.',
                server_error: 'Server Gemini sedang bermasalah (5xx) — coba lagi beberapa saat.',
                bad_request: 'Request ditolak Gemini (400) — cek console untuk detail.',
                safety_block: 'Gambar diblokir oleh safety filter Gemini.',
                truncated_output: 'Respons Gemini terpotong sebelum JSON selesai — coba lagi.',
                empty_response: 'Gemini tidak mengembalikan jawaban apapun.',
                invalid_json: 'Respons Gemini bukan JSON valid — coba lagi.',
                timeout: 'Request ke Gemini timeout — cek koneksi lalu coba lagi.',
                network_error: 'Gagal terhubung ke Gemini — cek koneksi internet.',
                missing_vision_image: 'Internal error — hasil vision tidak menyimpan data gambar.',
            }[preflightFailureReason] || 'Penyebab tidak diketahui — cek console (F12) untuk detail.';

            const fb = buildMetadataFallback(asset);
            title = fb.title;
            description = fb.description;
            keywordResult = {
                cleaned: fb.keywords,
                issues: [`AI visual analysis failed — metadata memakai fallback offline (bukan AI), asset ditandai Needs Review. ${reasonLabel}`],
                passed: fb.keywords.length >= METADATA_RULES.keywords.MIN_COUNT,
            };

            if (!silent) {
                showToast(
                    `AI visual analysis gagal — metadata memakai fallback offline (tidak kosong), asset ditandai Needs Review. ${reasonLabel}`,
                    'error'
                );
            }
        }
        const isFallback = !analysis;
        const analysisAvailable = !!analysis;

        const score = Number(analysis?.score) || 0;
        let decision = analysis?.preflightDecision;

        if (!analysis) {
            decision = 'needs_review'; // Force review if analysis pipeline completely failed
        } else if (!decision) {
            decision = (score >= 85 ? 'pass' : score >= 70 ? 'needs_review' : 'fail');
        }

        // Sprint 4 (Phase 11-13): Post-generation Semantic QA — bandingkan intent
        // (dari lineage.promptGraph, disimpan saat generate) dengan vision Layer A.
        // HANYA menurunkan decision, tidak pernah menaikkan. Verdict 'unknown'
        // tidak menolak (gate non-agresif). 'wrong_subject' → reject.
        logStage('semantic_qa');
        const semanticQA = (() => {
            if (!analysis) return null;
            const promptIntent = asset?.lineage?.promptGraph?.intent
                || (asset?.generationMode !== 'imported' && asset?.baseTheme ? extractSemanticIntent(asset.baseTheme, asset.adobeCategory || '', asset.subcategory || '', asset.assetType || 'vector') : null);
            if (!promptIntent) return null;
            const vision = analysis?.visualAnalysis || {};
            const match = assessSemanticMatch(promptIntent, vision);
            const profile = assessProfileMatch(promptIntent.assetProfile, vision);
            return {
                expectedDomain: match.expectedDomain || promptIntent.subjectDomain || '',
                detectedDomains: match.detectedDomains || [],
                primarySubjectMatch: match.primarySubjectMatch || false,
                verdict: match.verdict || 'unknown',
                confidence: match.confidence || 0,
                reason: match.reason || '',
                // FASE 8: Prompt Fidelity skor (0-100) + integrity warning.
                promptFidelity: Number(match.promptFidelity) ?? 0,
                integrityWarning: Boolean(match.integrityWarning),
                integrityReason: match.integrityReason || null,
                profileMatch: profile.verdict || 'unknown',
                profileConfidence: profile.confidence || 0,
                profileReason: profile.reason || '',
                checkedAt: Date.now(),
            };
        })();

        // Gate: wrong_subject (confidence cukup) → reject. Profile mismatch →
        // needs_review (bukan reject — profil bisa ambigu).
        // FASE 8: Prompt Fidelity QA sebagai QA kelas satu — promptFidelity < 50
        // (gambar tidak sesuai intent) → fail, bukan sekadar warning.
        let semanticQAIssue = null;
        const fidelityScore = Number(semanticQA?.promptFidelity) ?? null;
        if (semanticQA && (semanticQA.verdict === 'wrong_subject' && semanticQA.confidence >= 0.7)) {
            decision = 'fail';
            semanticQAIssue = `Semantic mismatch — expected "${semanticQA.expectedDomain}" but detected ${semanticQA.detectedDomains.join(', ') || 'unrelated subject'}. ${semanticQA.reason}.`;
        } else if (semanticQA && fidelityScore !== null && fidelityScore < 50) {
            // Prompt benar tapi gambar menyimpang (fidelity rendah) → reject.
            decision = 'fail';
            semanticQAIssue = `Prompt fidelity rendah (${fidelityScore}/100) — gambar tidak sesuai intent. ${semanticQA.reason || ''}${semanticQA.integrityReason ? ` ${semanticQA.integrityReason}.` : ''}`;
        } else if (semanticQA && semanticQA.profileMatch === 'mismatch' && semanticQA.profileConfidence >= 0.7 && decision === 'pass') {
            decision = 'needs_review';
            semanticQAIssue = `Asset profile mismatch — expected pattern but vision shows isolated object. ${semanticQA.profileReason}.`;
        }

        // EU-9: Visual IP risk hard gate — sumber: penolakan Adobe Stock "Intellectual
        // Property Refusal". Ini HANYA bisa menurunkan decision, tidak pernah menaikkan
        // (skor kualitas tinggi tidak bisa menutupi risiko IP tinggi).
        logStage('ip_gate');
        const ipRiskScore = Number(analysis?.ipRiskScore) || 0;
        const ipDetectedElements = Array.isArray(analysis?.ipDetectedElements) ? analysis.ipDetectedElements : [];
        const ipRecommendation = analysis?.ipRecommendation || 'pass';

        if (analysis && (ipRecommendation === 'block' || ipRiskScore >= 71)) {
            decision = 'fail';
        } else if (analysis && (ipRecommendation === 'regenerate' || ipRiskScore >= 51) && decision !== 'fail') {
            decision = 'fail';
        } else if (analysis && (ipRecommendation === 'review' || ipRiskScore >= 31) && decision === 'pass') {
            decision = 'needs_review';
        }

        // EU-6: Category Quality hard gate — sumber: penolakan Adobe Stock yang
        // spesifik per kategori (unsanitary untuk Health, unsafe equipment untuk
        // Industrial, dst). AI menilai flag boolean per kategori di
        // `categoryQuality`; kalau ada yang ter-trigger, asset di-hard reject.
        // Sama seperti EU-9: HANYA menurunkan decision, tidak pernah menaikkan.
        logStage('category_quality_gate');
        const categoryQuality = (analysis?.categoryQuality && typeof analysis.categoryQuality === 'object') ? analysis.categoryQuality : {};
        const qualityCategoryDecision = analysis?.quality_category_decision || 'pass';
        const qualityCategoryIssue = analysis?.quality_category_issue || '';
        const flaggedCategoryChecks = Object.entries(categoryQuality)
            .filter(([, val]) => val === true)
            .map(([key]) => key);

        if (analysis && (qualityCategoryDecision === 'fail' || flaggedCategoryChecks.length > 0)) {
            decision = 'fail';
        }

        // PHASE P0: Content Safety gate — sumber: Adobe menolak konten editorial /
        // news-event / sensitive untuk stock komersial. Detector AI (visual) + gating
        // HANYA menurunkan decision, tidak pernah menaikkan.
        logStage('content_safety_gate');
        const newsEventDetected = Boolean(analysis?.newsEventDetected);
        const sensitiveContent = analysis?.sensitiveContent || 'none';
        const contentSafetyVerdict = analysis?.contentSafetyVerdict || 'pass';
        let contentSafetyIssue = null;
        if (analysis && (newsEventDetected || (sensitiveContent !== 'none' && sensitiveContent !== undefined) || contentSafetyVerdict === 'fail')) {
            decision = 'fail';
            contentSafetyIssue = `Content safety reject — ${newsEventDetected ? 'news-event/editorial content not allowed in commercial stock' : (sensitiveContent && sensitiveContent !== 'none' ? `sensitive content: ${sensitiveContent}` : 'content safety verdict fail')}. ${analysis?.contentSafetyReason || ''}`;
        }

        // PHASE P0: Technical QA gate (QA-aset poin 4–8) — multi-metrik canvas,
        // zero API: sharpness (Laplacian), edge density, high-frequency energy,
        // noise residual, compression blocking, oversharpening halo, dan exposure
        // clipping. Tiap defect membawa severity + confidence (decision matrix).
        // HANYA menurunkan decision, tidak pernah menaikkan.
        logStage('technical_qa');
        const techQa = await assessTechnicalQuality(asset.url, asset.style || '');
        const qaIssues = [];
        let sharpnessIssue = null;
        if (techQa) {
            // Gabungkan semua defect technical (termasuk blur/soft dari sharpness)
            // ke dalam satu array QAIssue terstruktur untuk decision matrix.
            (techQa.defects || []).forEach(d => qaIssues.push(d));
            const blur = (techQa.defects || []).find(d => d.id === 'QA_BLUR');
            const soft = (techQa.defects || []).find(d => d.id === 'QA_SOFT');
            if (blur) {
                decision = 'fail';
                sharpnessIssue = blur.message;
            } else if (soft && decision === 'pass') {
                decision = 'needs_review';
                sharpnessIssue = soft.message;
            }
        } else {
            // Fallback: engine lama (kinerja gagal load) → pertahankan gate blur.
            const sharpnessResult = await assessSharpness(asset.url);
            if (sharpnessResult && sharpnessResult.verdict === 'blurred') {
                decision = 'fail';
                sharpnessIssue = `Visual sharpness too low (${sharpnessResult.score.toFixed(1)} variance) — likely blurry/soft, Adobe rejects this.`;
            } else if (sharpnessResult && sharpnessResult.verdict === 'soft' && decision === 'pass') {
                decision = 'needs_review';
                sharpnessIssue = `Sharpness is borderline (${sharpnessResult.score.toFixed(1)} variance) — consider upscaling/regenerating.`;
            }
        }

        // PHASE P0: Watermark gate (QA-aset poin 7 / 15) — canvas heuristic stroke
        // density + second opinion sinyal AI (visibleWatermark / checks.noWatermark).
        // Sumber: Adobe menolak watermark/visible text overlay. HANYA menurunkan.
        logStage('watermark_gate');
        // FIX-WATERMARK-FP: only an explicit visibleWatermark flag is an AI signal.
        const aiWatermark = analysis?.visibleWatermark === true;
        const watermarkResult = await detectWatermark(asset.url, aiWatermark);
        let watermarkIssue = null;
        if (watermarkResult && watermarkResult.detected) {
            if (decision !== 'fail') {
                decision = decision === 'pass' ? 'needs_review' : decision;
            }
            watermarkIssue = `Visible watermark/text overlay detected (${watermarkResult.evidence}). Adobe rejects watermarked content — regenerate clean.`;
            qaIssues.push({
                id: 'QA_WATERMARK', type: 'watermark', severity: watermarkResult.confidence >= 0.75 ? 'critical' : 'major',
                confidence: watermarkResult.confidence, score: watermarkResult.score, threshold: 60,
                evidence: watermarkResult.evidence, message: watermarkIssue,
            });
        }

        // PHASE P0: File size gate — sumber: pedoman Adobe Stock (max file size
        // 45MB; JPEG lebih kecil untuk opaque). `fileSizeOk` dihitung di
        // finalizeAsset (post-upscale). File > 45MB = kandidat penolakan → HANYA
        // menurunkan decision (never raise).
        let fileSizeIssue = null;
        if (baseMetadata.fileSizeOk === false) {
            const fsMB = baseMetadata.fileSizeKB ? (baseMetadata.fileSizeKB / 1024).toFixed(1) : '?';
            fileSizeIssue = `File size ${fsMB}MB melebihi batas maksimum Adobe (45MB) — re-encode/kompres sebelum submit.`;
            if (decision !== 'fail') {
                decision = decision === 'pass' ? 'needs_review' : decision;
            }
        }

        // FASE 8: Asset-Profile QA gate — sumber: penolakan Adobe spesifik per
        // asset type (pattern seam/repeat, icon stroke/shape, illustration subject
        // integrity). AI menilai flag per profile; skor < 60 = profile rusak → hard
        // regenerate. HANYA menurunkan decision (never raise).
        const assetProfileChecks = (analysis?.assetProfileChecks && typeof analysis.assetProfileChecks === 'object')
            ? analysis.assetProfileChecks
            : {};
        const profileDecision = analysis?.assetProfileDecision || 'pass';
        const profileIssue = analysis?.assetProfileIssue || '';
        const profileValues = Object.values(assetProfileChecks).filter(v => typeof v === 'number');
        const lowestProfileScore = profileValues.length > 0 ? Math.min(...profileValues) : null;
        let assetProfileIssue = null;
        if (analysis && (profileDecision === 'regenerate' || (lowestProfileScore !== null && lowestProfileScore < 60))) {
            decision = 'fail';
            assetProfileIssue = `Asset profile QA reject (${asset.assetProfile || 'unknown'}): ${profileIssue || `skor profile ${lowestProfileScore !== null ? lowestProfileScore : '?'} di bawah 60 — profile visual tidak valid untuk tipe ini.`}`;
        } else if (analysis && (profileDecision === 'review' || (lowestProfileScore !== null && lowestProfileScore < 75)) && decision === 'pass') {
            decision = 'needs_review';
            assetProfileIssue = `Asset profile QA review (${asset.assetProfile || 'unknown'}): ${profileIssue || `skor profile ${lowestProfileScore} di bawah 75 — periksa kualitas spesifik tipe asset ini.`}`;
        }

        // PHASE P0: Library visual similarity gate — sumber: penolakan Adobe
        // "Similar content in our collection". Membandingkan asset baru vs library
        // kategori yang sama secara VISUAL (dHash, zero API). Score ≥ 0.85 =
        // near-duplicate → FASE 4: HARD BLOCK (fail), bukan sekadar needs_review.
        // Penolakan Adobe #1 adalah "similar content" — near-duplicate visual tidak
        // boleh pernah mencapai status siap-export.
        logStage('library_similarity_gate');
        const librarySimilar = await checkLibraryVisualSimilarity(asset.url, asset.id, asset.adobeCategory || '', assets);
        let librarySimIssue = null;
        if (librarySimilar) {
            decision = 'fail';
            librarySimIssue = `Visually too similar to existing asset "${librarySimilar.title.slice(0, 40)}…" (${Math.round(librarySimilar.score * 100)}%) — Adobe rejects duplicates. Regenerate with a different concept.`;
        }

        // PHASE P0: Metadata news-event check — title/keywords hasil AI tidak boleh
        // berisi marker editorial (mis. "breaking news", "protest", "election").
        // Ini mencegah metadata yang menjadikan asset terlihat seperti konten berita.
        logStage('metadata_news_check');
        const metadataNewsHits = METADATA_NEWS_MARKERS.filter(
            m => (title || '').toLowerCase().includes(m) || (keywordResult.cleaned || []).some(k => k.toLowerCase().includes(m))
        );
        let metadataNewsIssue = null;
        if (metadataNewsHits.length > 0 && decision !== 'fail') {
            decision = decision === 'pass' ? 'needs_review' : decision;
            metadataNewsIssue = `Metadata contains editorial/news markers (${metadataNewsHits.join(', ')}) — Adobe requires commercial wording.`;
        }

        // Spec workflow poin 2 & 17: METADATA COMPLIANCE stage — validasi ulang
        // metadata FINAL (title + description + keywords) terhadap brand/IP/
        // newsworthy/sensitive/spam SETELAH metadata selesai dibangun. Ini
        // menangkap kasus "title 'Apple technology concept' padahal gambarnya
        // komputer generik" (brand nuggle/misleading). HANYA menurunkan decision.
        logStage('metadata_compliance');
        const metadataCompliance = analysis
            ? validateMetadataCompliance({ title, description, keywords: keywordResult.cleaned })
            : { issues: [], hasCritical: false, passed: true };
        let metadataComplianceIssue = null;
        if (metadataCompliance.issues.length > 0 && decision !== 'fail') {
            if (metadataCompliance.hasCritical) {
                // Critical compliance (brand/IP/agent news) → hard reject, never exports.
                decision = 'fail';
            } else if (decision === 'pass') {
                decision = 'needs_review';
            }
            metadataComplianceIssue = `Metadata compliance: ${metadataCompliance.issues[0].message}`;
        }

        // Normalisasi: quality_overall harus konsisten dengan preflightScore.
        // Jika AI tidak return quality_overall atau nilainya 0, fallback ke score.
        const rawOverall = Number(analysis?.quality_overall) || 0;
        const normalizedOverall = rawOverall > 0 ? rawOverall : score;

        const derivedChecks = {
            noText: analysis?.checks?.noText ?? false,
            noLogo: analysis?.checks?.noLogo ?? false,
            // FIX: default noWatermark ke true (tidak ada watermark) bukan false.
            // Sebelumnya ?? false membuat setiap aset yang tidak mengembalikan field
            // checks.noWatermark dari AI dianggap "ada watermark" → false positive.
            noWatermark: analysis?.checks?.noWatermark ?? true,
            noArtifacts: analysis?.checks?.noArtifacts ?? false,
            commercial: analysis?.checks?.commercial ?? false,
            peopleRelease: analysis?.checks?.peopleRelease ?? false,
            propRelease: analysis?.checks?.propRelease ?? analysis?.checks?.noLogo ?? false,
            aiDeclared: true,
            bgMatches: baseMetadata.backgroundVerified === true,
            minResolution: baseMetadata.resolutionVerified === true,
            hasTitle: Boolean(title && title.length <= METADATA_RULES.title.MAX_LEN && title.length > 0 && !/[^a-zA-Z0-9\s]/.test(title)),
            hasDesc: Boolean(description && description.length >= 30),
            hasKeywords:
                keywordResult.cleaned.length >= METADATA_RULES.keywords.MIN_COUNT &&
                keywordResult.cleaned.length <= METADATA_RULES.keywords.MAX_COUNT,
        };

        const peopleDetected = derivedChecks.peopleRelease === true || analysis?.people?.peopleDetected === true || analysis?.visualAnalysis?.peopleVisible === true;
        const propDetected = derivedChecks.propRelease === true || analysis?.people?.propertyDetected === true;

        // Spec workflow poin 5: PeopleAnalysis terstruktur. Gabungkan Layer A
        // (vision: jumlah/recognizable) + Layer B+C (AI QA: release requirement &
        // label fiktif). Idealnya identitas orang harus dianalisis — bukan hanya
        // boolean "people detected: YES".
        const peopleAnalysis: PeopleAnalysis | null = analysis ? {
            detected: peopleDetected,
            count: Number(analysis?.visualAnalysis?.peopleCount ?? analysis?.people?.peopleCount ?? (peopleDetected ? 1 : 0)) || 0,
            // recognizable = identitas orang bisa dikenali sebagai real individual
            recognizable: Boolean(analysis?.people?.peopleRecognizableIdentity ?? analysis?.visualAnalysis?.peopleRecognizable ?? peopleDetected),
            // fictional = orangnya fiktif / bukan real identifiable person
            fictional: peopleDetected
                ? !Boolean(analysis?.people?.peopleRecognizableIdentity ?? analysis?.visualAnalysis?.peopleBasedOnRealPerson ?? false)
                : false,
            // visible real identifiable person → wajib model release
            releaseRequired: Boolean(analysis?.people?.peopleReleaseRequired ?? false),
            // releaseAvailability selalu fakta manual → default false
            releaseAvailable: Boolean(analysis?.people?.peopleReleaseAvailable ?? false),
        } : null;

        // Label Adobe "People and Property are fictional" (spec workflow poin 4):
        // true bila ayang tampak nyata di gambar adalah fiktif (AI-generated).
        // Berasal dari Layer B+C; fallback ke deterministik: detected & tidak
        // recognizable real person → fictional.
        const peopleAndPropertyFictional = analysis
            ? Boolean(analysis?.people?.peopleAndPropertyFictional ?? (peopleDetected || propDetected))
            : false;

        const nextMetadata = {
            ...baseMetadata,
            title,
            description,
            keywords: keywordResult.cleaned,
            seoScore: (metadataPackage as any)?.seoScore ?? null,
            seoPassed: (metadataPackage as any)?.seoPassed ?? null,
            metadataSource: isFallback ? 'fallback' : 'ai',
            analysisAvailable,
            // If analysis failed, keep the deterministic fallback (from
            // baseMetadata/asset fields) instead of emptying the category.
            stockCategory: analysis ? (analysis?.category || baseMetadata.stockCategory || asset.adobeCategory || '') : (baseMetadata.stockCategory || asset.adobeCategory || ''),
            subcategory: analysis ? (analysis?.subcategory || baseMetadata.subcategory || asset.subcategory || '') : (baseMetadata.subcategory || asset.subcategory || ''),
            peopleRelease: peopleDetected ? 'fictional' : 'not-applicable',
            propertyRelease: propDetected ? 'fictional' : 'not-applicable',
            // Spec workflow poin 4 & 5: label fiktif otomatis + analisis orang.
            peopleAndPropertyFictional,
            peopleAnalysis,
            preflightChecks: derivedChecks,
            preflightDecision: decision,
            preflightScore: score,
            preflightIssues: [
                ...(Array.isArray(analysis?.issues) ? analysis.issues : []),
                ...(keywordResult.issues || []),
                // ISU 6: description length validation issues dari buildFinalStockMetadata
                ...((metadataPackage as any)?.descriptionIssues || []),
                ...(ipDetectedElements.length > 0 ? [`Visual IP risk: ${ipDetectedElements.join('; ')}`] : []),
                ...(flaggedCategoryChecks.length > 0
                    ? [`Category quality reject (${asset.adobeCategory || 'unknown'}): ${flaggedCategoryChecks.join(', ')}${qualityCategoryIssue ? ` — ${qualityCategoryIssue}` : ''}`]
                    : []),
                ...(sharpnessIssue ? [sharpnessIssue] : []),
                ...(watermarkIssue ? [watermarkIssue] : []),
                ...(contentSafetyIssue ? [contentSafetyIssue] : []),
                ...(metadataNewsIssue ? [metadataNewsIssue] : []),
                ...(metadataComplianceIssue ? [metadataComplianceIssue] : []),
                ...(fileSizeIssue ? [fileSizeIssue] : []),
                ...(librarySimIssue ? [librarySimIssue] : []),
                ...(assetProfileIssue ? [assetProfileIssue] : []),
                ...(semanticQAIssue ? [semanticQAIssue] : []),
            ],
            // FIX UX: kategorikan alasan reject supaya user tahu reject karena
            // GAMBAR (perlu regenerate/AI edit — regenerate metadata tidak akan
            // membantu karena gambar sama) atau karena METADATA (bisa diperbaiki
            // manual/regenerate metadata).
            preflightIssueCategories: (() => {
                const cats = { image: [], metadata: [], content: [] };
                const imgPattern = /sharpness|blur|soft|watermark|artifact|resolution|file size|duplicate|similar|fidelity|semantic mismatch|wrong subject|profile|IP risk|ip risk|trademark|brand/i;
                const metaPattern = /title|keyword|description|metadata|compliance|news|spam|diversity/i;
                const contentPattern = /sensitive|news-event|editorial|violent|graphic|adult|hate/i;
                const all = [
                    ...(Array.isArray(analysis?.issues) ? analysis.issues : []),
                    ...(keywordResult.issues || []),
                    ...(ipDetectedElements.length > 0 ? [`Visual IP risk: ${ipDetectedElements.join('; ')}`] : []),
                    ...(flaggedCategoryChecks.length > 0 ? [`Category quality: ${flaggedCategoryChecks.join(', ')}`] : []),
                    ...(sharpnessIssue ? [sharpnessIssue] : []),
                    ...(watermarkIssue ? [watermarkIssue] : []),
                    ...(contentSafetyIssue ? [contentSafetyIssue] : []),
                    ...(metadataNewsIssue ? [metadataNewsIssue] : []),
                    ...(metadataComplianceIssue ? [metadataComplianceIssue] : []),
                    ...(fileSizeIssue ? [fileSizeIssue] : []),
                    ...(librarySimIssue ? [librarySimIssue] : []),
                    ...(assetProfileIssue ? [assetProfileIssue] : []),
                    ...(semanticQAIssue ? [semanticQAIssue] : []),
                ];
                for (const iss of all) {
                    const s = String(iss);
                    if (contentPattern.test(s)) cats.content.push(s);
                    else if (imgPattern.test(s)) cats.image.push(s);
                    else if (metaPattern.test(s)) cats.metadata.push(s);
                    else cats.image.push(s); // default ke image (alasan tak dikenal → gambar)
                }
                return cats;
            })(),
            // Sprint 4 (Phase 11-13): hasil Semantic QA — jejak "prompt benar tapi
            // gambar salah" (wrong_subject / profile mismatch).
            semanticQA: semanticQA || null,
            ipRisk: {
                score: ipRiskScore,
                elements: ipDetectedElements,
                recommendation: ipRecommendation,
            },
            qualityScore: {
                composition: Number(analysis?.quality_composition) || 0,
                commercial: Number(analysis?.quality_commercial) || 0,
                keywords: Number(analysis?.quality_keywords) || 0,
                title: Number(analysis?.quality_title) || 0,
                description: Number(analysis?.quality_description) || 0,
                overall: normalizedOverall,
            },
            acceptancePrediction: Number.isFinite(Number(analysis?.acceptancePrediction)) ? Number(analysis.acceptancePrediction) : null, // FIX #10 (audit): skor sah 0 tidak dibiarkan jadi null
            suggestions: Array.isArray(analysis?.suggestions) ? analysis.suggestions : [],
            // Spec workflow poin 13–14: confidence & evidence metadata.
            // Diambil dari AI (Layer B+C) dengan fallback deterministik dari
            // qualityScore / visualAnalysis supaya asset lama tetap punya nilai.
            confidence: {
                title: Number(analysis?.confidence?.title) > 0
                    ? Number(analysis.confidence.title)
                    : (Number(analysis?.quality_title) || 0),
                category: Number(analysis?.confidence?.category) > 0
                    ? Number(analysis.confidence.category)
                    : (Number(analysis?.quality_commercial) || 0),
                keywords: Number(analysis?.confidence?.keywords) > 0
                    ? Number(analysis.confidence.keywords)
                    : (Number(analysis?.quality_keywords) || 0),
            },
            evidence: {
                titleBasis: Array.isArray(analysis?.evidence?.titleBasis) && analysis.evidence.titleBasis.length > 0
                    ? analysis.evidence.titleBasis
                    : [analysis?.primarySubject, analysis?.environment, analysis?.visualStyle].filter(Boolean),
                keywordBasis: Array.isArray(analysis?.evidence?.keywordBasis) && analysis.evidence.keywordBasis.length > 0
                    ? analysis.evidence.keywordBasis
                    : [analysis?.primarySubject, ...(Array.isArray(analysis?.objects) ? analysis.objects.slice(0, 2) : [])].filter(Boolean),
                categoryBasis: Array.isArray(analysis?.evidence?.categoryBasis) && analysis.evidence.categoryBasis.length > 0
                    ? analysis.evidence.categoryBasis
                    : [analysis?.primarySubject, analysis?.environment].filter(Boolean),
            },
            backgroundVerified: baseMetadata.backgroundVerified ?? false,
            resolutionVerified: baseMetadata.resolutionVerified ?? false,
            preflightPassedAt: decision === 'pass' ? Date.now() : null,
        };

        // PHASE 10 (modified): isi lineage saat preflight selesai — compliance,
        // qualityScore, dan similarity (kalau ada). Memperkaya Audit Lineage tanpa
        // mengubah pipeline yang sudah berjalan.
        // FIX BUG-1: compliance dihitung terpisah (bukan inline di dalam objek yang
        // sedang dibangun) supaya complianceRef tidak self-reference updatedLineage.
        const complianceSnapshot = analysis ? {
            decision: decision === 'pass' ? 'pass' : decision === 'needs_review' ? 'review' : 'fail',
            score: Math.min(100, ipRiskScore || 0),
            issues: nextMetadata.preflightIssues,
            warnings: [],
            brandHits: [],
            ipRisk: { score: ipRiskScore, elements: ipDetectedElements, recommendation: ipRecommendation },
            newsEvent: { detected: newsEventDetected, confidence: newsEventDetected ? 1 : 0, reference: contentSafetyIssue || null },
            sensitiveContent: { detected: sensitiveContent !== 'none', category: sensitiveContent === 'none' ? null : sensitiveContent, reason: contentSafetyIssue || null },
            checks: {
                noText: derivedChecks.noText,
                noLogo: derivedChecks.noLogo,
                // FIX: sama seperti derivedChecks — default true (tidak ada watermark).
                noWatermark: analysis?.checks?.noWatermark ?? true,
                noArtifacts: analysis?.checks?.noArtifacts ?? false,
                peopleRelease: derivedChecks.peopleRelease,
                propRelease: derivedChecks.propRelease,
                generativeAIDeclared: true,
                newsEventSafe: !newsEventDetected,
            },
            checkedAt: Date.now(),
        } : null;

        const updatedLineage = {
            ...(asset.lineage || {}),
            compliance: complianceSnapshot,
            qualityScore: { overall: normalizedOverall },
            // PHASE P0: isi lineage.similarity dengan kontrak SimilarityResult —
            // hasil library visual similarity check (nil atau null kalau tidak mirip).
            similarity: librarySimilar ? {
                kind: 'library',
                method: 'visual',
                score: librarySimilar.score,
                threshold: 0.85,
                verdict: 'similar',
                matchedWith: [{ id: librarySimilar.id, title: librarySimilar.title }],
                fingerprint: null,
                computedAt: Date.now(),
            } : null,
            // FASE 8: hasil Asset-Profile QA (pattern/icon/illustration) disimpan
            // agar bisa direview & di-lineage. Null kalau AI tidak mengembalikannya.
            assetProfile: analysis && (analysis.assetProfileChecks || analysis.assetProfileDecision) ? {
                checks: analysis.assetProfileChecks || null,
                decision: analysis.assetProfileDecision || 'pass',
                issue: analysis.assetProfileIssue || '',
                lowestScore: lowestProfileScore,
                computedAt: Date.now(),
            } : null,
            // FASE 14: referensi hasil QA & compliance (di store terpisah) +
            // konteks job/project — lineage enrichment untuk audit lintas penyimpanan.
            // qaRef diisi di bawah (setelah buildQualityGateResult) — bukan self-ref.
            qaRef: null,
            // Sprint 4 (Phase 11-13): Semantic QA — jejak "prompt benar tapi
            // gambar salah" (wrong_subject / profile mismatch).
            semanticQA: semanticQA || null,
            complianceRef: complianceSnapshot ? { decision: complianceSnapshot.decision, checkedAt: complianceSnapshot.checkedAt } : null,
            jobRef: { batchId: asset.batchId ?? null, batchSessionId: asset.batchSessionId ?? null },
            storage: { qaStore: 'qa_results', complianceStore: 'compliance_results' },
        };

        // PHASE 9: Metadata diversity guard — kalau title asset ini near-duplicate
        // dengan asset lain di batch yang sudah punya title, turunkan decision ke
        // needs_review (HANYA menurunkan) dan tambah issue. Mencegah batch berisi
        // duplikat metadata yang Adobe tolak sebagai "similar content".
        const metadataConflicts = enforceMetadataDiversity(title, asset.batchId, assets);
        let metadataDiversityIssue = null;
        if (metadataConflicts.length > 0 && decision !== 'fail') {
            decision = decision === 'pass' ? 'needs_review' : decision;
            metadataDiversityIssue = `Metadata near-duplicate dalam batch: ${metadataConflicts.join('; ')}`;
        }

        const finalStatus = evaluateMetadataStatus({
            analysisAvailable: Boolean(analysis), analysisFailed: !analysis,
            title, description, keywords: keywordResult.cleaned,
            categoryValid: Boolean(nextMetadata.stockCategory || asset.adobeCategory || asset.platformCategoryId != null),
            hardBlocks: [
                semanticQA?.verdict === 'wrong_subject' && semanticQA.confidence >= 0.7,
                fidelityScore !== null && fidelityScore < 50,
                ipRecommendation === 'block' || ipRecommendation === 'regenerate' || ipRiskScore >= 51,
                qualityCategoryDecision === 'fail' || flaggedCategoryChecks.length > 0,
                newsEventDetected || (sensitiveContent !== 'none' && sensitiveContent !== undefined) || contentSafetyVerdict === 'fail',
                Boolean((techQa?.defects || []).some(d => d.id === 'QA_BLUR')),
                Boolean(watermarkResult?.detected), Boolean(metadataCompliance?.hasCritical), metadataConflicts.length > 0,
            ],
        }).status;

        // FASE D3: tutup stage log + catat ke asset (observability pipeline).
        stageLog.push({ stage: 'quality_gate', at: Date.now() });

        // FASE 10: Quality Gate — bangun QAResult SEBELUM asset save agar qaRef dapat dipersist atomik
        // dalam satu write (sebelumnya qaRef di-assign setelah saveAssetDB — lost).
        const structuredGateIssues = [
            ...(semanticQAIssue ? [{ id: 'QA_SEMANTIC_MATCH', type: 'semantic_match', severity: 'major', confidence: semanticQA?.confidence || 0.7, score: fidelityScore ?? 0, threshold: 50, evidence: semanticQA?.reason || '', message: semanticQAIssue }] : []),
            ...(ipDetectedElements.length > 0 ? [{ id: 'QA_IP_RISK', type: 'intellectual_property', severity: ipRiskScore >= 51 ? 'critical' : 'major', confidence: Math.min(1, ipRiskScore / 100), score: ipRiskScore, threshold: 51, evidence: ipDetectedElements.join('; '), message: `Visual IP risk: ${ipDetectedElements.join('; ')}` }] : []),
            ...(flaggedCategoryChecks.length > 0 || qualityCategoryDecision === 'fail' ? [{ id: 'QA_CATEGORY_QUALITY', type: 'category_quality', severity: 'major', confidence: 0.8, score: 0, threshold: 60, evidence: flaggedCategoryChecks.join(', '), message: `Category quality reject (${asset.adobeCategory || 'unknown'}): ${flaggedCategoryChecks.join(', ')}${qualityCategoryIssue ? ` — ${qualityCategoryIssue}` : ''}` }] : []),
            ...(contentSafetyIssue ? [{ id: 'QA_CONTENT_SAFETY', type: 'content_safety', severity: 'critical', confidence: 0.9, score: 0, threshold: 1, evidence: contentSafetyIssue, message: contentSafetyIssue }] : []),
            ...(watermarkIssue && !qaIssues.some(issue => issue.id === 'QA_WATERMARK') ? [{ id: 'QA_WATERMARK', type: 'watermark', severity: 'major', confidence: watermarkResult?.confidence || 0.7, score: watermarkResult?.score || 0, threshold: 60, evidence: watermarkResult?.evidence || '', message: watermarkIssue }] : []),
            ...(fileSizeIssue ? [{ id: 'QA_FILE_SIZE', type: 'file_size', severity: 'major', confidence: 1, score: baseMetadata.fileSizeKB || 0, threshold: 45 * 1024, evidence: `${baseMetadata.fileSizeKB || '?'}KB`, message: fileSizeIssue }] : []),
            ...(assetProfileIssue ? [{ id: 'QA_ASSET_PROFILE', type: 'asset_profile', severity: lowestProfileScore !== null && lowestProfileScore < 60 ? 'major' : 'warning', confidence: 0.8, score: lowestProfileScore ?? 0, threshold: 60, evidence: profileIssue, message: assetProfileIssue }] : []),
            ...(librarySimIssue ? [{ id: 'QA_LIBRARY_SIMILARITY', type: 'library_similarity', severity: 'major', confidence: librarySimilar?.score || 0.85, score: Math.round((librarySimilar?.score || 0) * 100), threshold: 85, evidence: librarySimilar?.title || '', message: librarySimIssue }] : []),
            ...(metadataNewsIssue ? [{ id: 'QA_METADATA_NEWS', type: 'metadata_news', severity: 'major', confidence: 0.9, score: 0, threshold: 1, evidence: metadataNewsHits.join(', '), message: metadataNewsIssue }] : []),
            ...(metadataComplianceIssue ? [{ id: 'QA_METADATA_COMPLIANCE', type: 'metadata_compliance', severity: metadataCompliance.hasCritical ? 'critical' : 'major', confidence: 0.9, score: 0, threshold: 1, evidence: metadataCompliance.issues[0]?.message || '', message: metadataComplianceIssue }] : []),
            ...(metadataDiversityIssue ? [{ id: 'QA_METADATA_DIVERSITY', type: 'metadata_diversity', severity: 'major', confidence: 0.9, score: 0, threshold: 1, evidence: metadataConflicts.join('; '), message: metadataDiversityIssue }] : []),
        ];
        const qualityGateResult = buildQualityGateResult({
            assetId: asset.id,
            decision,
            score: normalizedOverall ?? score,
            issues: nextMetadata.preflightIssues,
            analysis,
            qaIssues: [...qaIssues, ...structuredGateIssues],
            qaVersion: techQa?.qaVersion || TECHNICAL_QA.QA_VERSION,
        });
        let qaSaved = false;
        try {
            await saveQAResultDB(qualityGateResult);
            qaSaved = true;
        } catch (qaErr) {
            console.warn('[Imagin] QA result save failed:', qaErr);
        }
        updatedLineage.qaRef = qaSaved ? {
            decision: qualityGateResult?.decision ?? null,
            reasonCode: qualityGateResult?.gate?.reasonCode ?? null,
            severity: qualityGateResult?.gate?.severity ?? null,
            score: qualityGateResult?.score ?? null,
        } : null;

        // Merge only preflight-owned fields onto the latest record so concurrent
        // edits (export history, flags, revisions, etc.) are not overwritten.
        const latestAsset = await dbOp('assets', 'readonly', s => s.get(asset.id));
        const persistedBase = latestAsset || asset;
        const nextPreflightMetadata = metadataDiversityIssue
            ? { ...nextMetadata, preflightDecision: decision, preflightIssues: [...nextMetadata.preflightIssues, metadataDiversityIssue] }
            : nextMetadata;
        const updatedAsset = {
            ...persistedBase,
            title: title || '', // empty title logic applied here
            status: finalStatus,
            // Preserve concurrent metadata/lineage fields that preflight does not own
            // (notably manual edits and exportHistory), then overlay preflight facts.
            stockMetadata: { ...(persistedBase.stockMetadata || {}), ...nextPreflightMetadata },
            lineage: {
                ...(persistedBase.lineage || {}),
                ...updatedLineage,
                exportHistory: persistedBase.lineage?.exportHistory || updatedLineage.exportHistory || [],
                stageLog,
            },
            stageLog,
        };

        await saveAssetDB(updatedAsset);
        finalAssetPersisted = true;
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        setSelectedAssetDetail(prev => prev?.id === updatedAsset.id ? updatedAsset : prev);

        // FASE 14: simpan snapshot compliance ke store compliance_results —
        // lineage enrichment (audit trail terpisah dari asset record).
        if (updatedLineage.compliance) {
            await saveComplianceResultDB({
                assetId: asset.id,
                title: title || '',
                category: asset.adobeCategory || '',
                platform: asset.platform || DEFAULT_PLATFORM,
                decision: updatedLineage.compliance.decision,
                score: updatedLineage.compliance.score,
                ipRisk: updatedLineage.compliance.ipRisk,
                newsEvent: updatedLineage.compliance.newsEvent,
                sensitiveContent: updatedLineage.compliance.sensitiveContent,
                checks: updatedLineage.compliance.checks,
                issues: updatedLineage.compliance.issues,
                checkedAt: updatedLineage.compliance.checkedAt,
            }).catch(err => console.warn('[Imagin] Compliance result save failed:', err));
        }

        // FASE 15: Feedback Loop — catat keputusan QA sebagai feedback otomatis.
        // Basis untuk Quality Gate belajar (rule yang sering gagal) & audit keputusan.
        if (qualityGateResult) {
            // Sprint 6 (Phase 20): klasifikasi rejection ke taxonomy terstruktur —
            // feedbackType/category diisi dari reasonCode + issue text.
            const _rejectTaxonomy = classifyRejection(
                qualityGateResult.gate?.reasonCode || '',
                (qualityGateResult.gate?.recommendation || '') + ' ' + (semanticQAIssue || '')
            );
            await feedbackEngine.record({
                assetId: asset.id,
                qaDecision: qualityGateResult.decision,
                reasonCode: qualityGateResult.gate?.reasonCode || _rejectTaxonomy.key || '',
                action: decision === 'pass' ? 'accept' : decision === 'fail' ? 'reject' : 'override_pass',
                note: qualityGateResult.gate?.recommendation || (decision === 'pass' ? 'Preflight passed.' : 'Preflight requires attention.'),
                qaSnapshot: {
                    score: qualityGateResult.score,
                    severity: qualityGateResult.gate?.severity || 'info',
                    failedRule: qualityGateResult.gate?.failedRule || '',
                    // Sprint 6: taxonomy + jejak lineage untuk Production Policy.
                    feedbackType: _rejectTaxonomy.feedbackType,
                    category: _rejectTaxonomy.category,
                    intent: asset?.lineage?.promptGraph?.intent || null,
                    semanticQA: asset?.stockMetadata?.semanticQA || asset?.lineage?.semanticQA || null,
                    conceptFingerprint: asset?.lineage?.conceptFingerprint || null,
                },
                platform: asset.platform || DEFAULT_PLATFORM,
            }).catch(err => console.warn('[Imagin] Feedback record failed:', err));
        }

        if (!silent) {
            if (decision === 'pass') {
                showToast('Pre-flight passed — Asset is Ready for Submission! ', 'success');
            } else if (decision === 'needs_review') {
                showToast('Pre-flight needs review. Please check the generated metadata.', 'info');
            } else {
                showToast('Pre-flight rejected this asset. Consider regenerating.', 'error');
            }
        }

        // FASE 9 + FASE 1: Auto-Regeneration — kalau fail karena wrong_subject/
        // fidelity rendah (semanticQAIssue) DAN belum mencapai cap retry, regenerate
        // dengan prompt diperkuat. Intent TIDAK berubah. Hasil regenerasi langsung
        // di-preflight ulang (rekursif, bounded oleh attempt counter) — bukan
        // dibiarkan berstatus draft menunggu tombol manual.
        const autoRegenAttempt = asset?.lineage?.autoRegeneration?.attempt || 0;
        let finalAsset = updatedAsset;
        const ipRegenerateTriggered = allowAutoRegen && decision === 'fail'
            && (ipRecommendation === 'regenerate' || (ipRiskScore >= 51 && ipRiskScore < 71))
            && ipDetectedElements.length > 0;
        if (allowAutoRegen && decision === 'fail' && semanticQAIssue && autoRegenAttempt < AUTO_REGENERATION_MAX_RETRIES) {
            try {
                const plan = buildRegenerationPlan(
                    asset?.lineage?.canonicalIntent || asset?.lineage?.promptGraph?.intent,
                    semanticQA
                );
                const regenCtx = {
                    systemSettings,
                    setAssets,
                    incrementApiCallCounter, finalizeAsset,
                };
                const regenResult = await autoRegenerateAsset(asset, plan, regenCtx);
                if (regenResult.ok) {
                    if (!silent) showToast(`Auto-regeneration (${autoRegenAttempt + 1}/${AUTO_REGENERATION_MAX_RETRIES}) — prompt diperkuat, jalankan preflight ulang.`, 'info');
                    // Re-preflight hasil regenerasi — bounded oleh attempt counter
                    // (autoRegenAttempt sudah naik di asset regenerated, jadi loop
                    // berhenti otomatis di cap). Silent supaya tidak spam toast.
                    try {
                        const reanalyzed = await runAutoPreflight(regenResult.asset, true, { allowAutoRegen: true, _isRecursion: true }, ctx);
                        if (reanalyzed && reanalyzed.id) finalAsset = reanalyzed;
                    } catch (rePreflightErr) {
                        console.warn('[Imagin] Re-preflight hasil auto-regen gagal:', rePreflightErr);
                    }
                } else {
                    console.warn('[Imagin] Auto-regeneration gagal:', regenResult.reason);
                }
            } catch (regenErr) {
                console.warn('[Imagin] Auto-regeneration error:', regenErr);
            }
        } else if (ipRegenerateTriggered && autoRegenAttempt < AUTO_REGENERATION_MAX_RETRIES) {
            // FIX: IP regenerate — AI minta regenerasi karena elemen brand/IP di
            // gambar. Bangun plan yang menghapus elemen IP dan regenerate dengan
            // prompt generik; sebelumnya alur ini tidak pernah jalan (buildRegenerationPlan
            // hanya menangani wrong_subject) sehingga asset langsung rejected tanpa
            // kesempatan perbaikan otomatis.
            try {
                const plan = buildRegenerationPlan(
                    asset?.lineage?.canonicalIntent || asset?.lineage?.promptGraph?.intent,
                    null,
                    { ipRegenerate: true, ipElements: ipDetectedElements }
                );
                const regenCtx = { systemSettings, setAssets, incrementApiCallCounter, finalizeAsset };
                const regenResult = await autoRegenerateAsset(asset, plan, regenCtx);
                if (regenResult.ok) {
                    if (!silent) showToast(`Auto-regeneration IP (${autoRegenAttempt + 1}/${AUTO_REGENERATION_MAX_RETRIES}) — elemen brand dihapus, jalankan preflight ulang.`, 'info');
                    try {
                        const reanalyzed = await runAutoPreflight(regenResult.asset, true, { allowAutoRegen: true, _isRecursion: true }, ctx);
                        if (reanalyzed && reanalyzed.id) finalAsset = reanalyzed;
                    } catch (rePreflightErr) {
                        console.warn('[Imagin] Re-preflight hasil auto-regen IP gagal:', rePreflightErr);
                    }
                } else {
                    console.warn('[Imagin] Auto-regeneration IP gagal:', regenResult.reason);
                }
            } catch (regenErr) {
                console.warn('[Imagin] Auto-regeneration IP error:', regenErr);
            }
        }

        return finalAsset;
        } catch (preflightErr) {
            console.error('[Imagin] Preflight failed:', preflightErr);
            if (!finalAssetPersisted) {
                setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: originalStatus } : a));
                try {
                    const latest = await dbOp('assets', 'readonly', s => s.get(asset.id));
                    if (latest) await saveAssetDB({ ...latest, status: originalStatus });
                } catch (restoreErr) {
                    console.warn('[Imagin] Preflight status restore failed:', restoreErr);
                }
            }
            throw preflightErr;
        } finally {
            if (!isRecursion) preflightInFlightRef.current.delete(asset.id);
        }
    };


export const metaFieldFromStep = (step) => { if (step < 0) return null; if (step < 3) return 'analyzing'; if (step === 3) return 'title'; if (step === 4) return 'description'; if (step === 5) return 'keywords'; return 'validating'; };
export const metaStepLabel = (step) => GENERATE_METADATA_STEPS[Math.max(0, Math.min(step, GENERATE_METADATA_STEPS.length - 1))] || '';
