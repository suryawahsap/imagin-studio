// @ts-nocheck — Studio asset actions extracted with explicit context.
import { ANIMATION_PRESETS } from '../registry/presets';
import { generateObjectModVariant, generateRevisionVariant } from '../engines/revision';
import { createDraftStockMetadata } from '../engines/metadata';
import { assessSharpness, computeDHash, computeVisualSimilarity, getImageDimensions, hammingDistance } from '../engines/quality';
import { finalizeAsset, removeBackground3Layer } from '../engines/asset-finalize';
import { saveAssetDB, deleteAssetDBLinked, saveHistoryLog } from '../engines/storage';
import { isFinalSaveCommitted } from '../engines/library-sync';
import { selectionReducer, assetsReducer } from '../state';
import { assetFileExt } from '../resolvers';
import { DEFAULT_RESOLUTION_TARGET, fileSizeKBFromDataUrl, formatFileSize, getAssetFileSizeKB, getFormatResolutionPolicy, megapixelsOf, minShortSideForMegapixels } from '../utils';
import { IMAGE_MODELS } from '../registry/constants';

const ANIMATION_PRESET_MAP = Object.fromEntries(ANIMATION_PRESETS.map(p => [p.id, p]));
const ANIMATION_DEFAULT_PRESET = 'fade-in';
export { assessSharpness, computeDHash, computeVisualSimilarity, hammingDistance };
export { loadJSZip } from '../../../utils/loadJszip';
export const addHistory = async (actionText, ctx) => {
    try {
        const log = { id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, action: actionText, timestamp: Date.now() };
        await saveHistoryLog(log); ctx.setHistoryLogs(p => [log, ...p]);
    } catch (e) { console.warn('Failed to save history log:', e); }
};
export const deleteAsset = async (id, ctx) => {
    try {
        await deleteAssetDBLinked(id);
    } catch (err) {
        console.warn('[Imagin] Asset delete failed (kept local):', id, err);
        ctx.showToast?.('Gagal menghapus asset dari Library: ' + (err.message || 'sync error'), 'error');
        return;
    }
    ctx.setAssets(p => p.filter(a => a.id !== id));
    if (ctx.selectedAssetDetail?.id === id) ctx.setSelectedAssetDetail(null);
    ctx.showToast('Asset deleted', 'info');
};
export const deleteOldDrafts = async (daysOld = 30, ctx) => {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const toDelete = ctx.assets.filter(a => a.status === 'draft' && a.createdAt < cutoff);
    if (toDelete.length === 0) {
        ctx.showToast(`Tidak ada draft lebih lama dari ${daysOld} hari.`, 'info');
        return;
    }
    if (!window.confirm(`Hapus ${toDelete.length} draft yang lebih lama dari ${daysOld} hari? Tindakan ini tidak bisa dibatalkan (lakukan Export Backup dulu kalau ragu).`)) return;
    const deletedIds = [];
    for (const a of toDelete) {
        try {
            await deleteAssetDBLinked(a.id);
            deletedIds.push(a.id);
        } catch (err) {
            console.warn('[Imagin] Draft delete failed (kept local):', a.id, err);
        }
    }
    ctx.setAssets(prev => prev.filter(a => !deletedIds.includes(a.id)));
    ctx.showToast(`${deletedIds.length} draft lama dihapus.`, 'success');
};

export const SHARPNESS = {
    MIN_GOOD: 20,     // ≥ ini tajam
    MIN_WARN: 8,      // di bawah ini dianggap soft/blur
    SAMPLE_SIZE: 96,
};

export const TECHNICAL_QA = {
    QA_VERSION: '1.0',             // bump saat rules berubah
    // Blur multi-metrik: Laplacian variance (existing) + edge density + energi
    // high-frequency. Mencegah false-accept gambar "soft tapi ber-edge rendah".
    sharpness: SHARPNESS,          // reuse threshold yang sudah ada
    edge: {
        minEdgeDensity: 0.06,      // rasio piksel edge terhadap total (0-1)
        gradientThreshold: 24,     // magnitude gradient yang dianggap edge
    },
    noise: {                       // std residual (lowpass diff), severity threshold
        clean: 9,
        mild: 16,                  // ≥ ini flag "excessive" → perlu review
        photographic: 60,          // film grain / paper texture batas foto wajar
    },
    compression: {                 // ratio boundary(8px grid) vs interior gradient
        boundaryBiasClean: 1.45,   // blocking ringan
        boundaryBiasMild: 2.0,     // blocking nyata → Adobe tolak compression artifact
        blockSize: 8,
        sampleSize: 256,
    },
    oversharpen: {                 // proporsi piksel overshoot di sekitar edge
        overshootRatioClean: 0.10,
        overshootRatioMild: 0.18,  // halo/ringing nyata → Adobe tolak oversharpened
    },
    exposure: {                    // clipping / under-exposure via histogram
        clipSharp: 5,              // gray < 5 dianggap shadow-clipped
        clipHot: 250,              // gray > 250 dianggap highlight-clipped
        clipFractionWarn: 0.10,    // total clipped > ini → needs_review
        clipFractionFail: 0.40,    // > ini → reject exposure
    },
};

export const assessTechnicalQuality = (dataUrl, styleKey = '') => new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
        try {
            const SIZE = TECHNICAL_QA.sharpness.SAMPLE_SIZE;
            const canvas = document.createElement('canvas');
            canvas.width = SIZE; canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
            const N = SIZE * SIZE;
            const gray = new Float64Array(N);
            for (let i = 0; i < N; i++) {
                gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
            }
            const _styleKeyNorm = (styleKey || '').toLowerCase().replace(/\s+/g, '');
            const _isWatercolorStyle = _styleKeyNorm.includes('watercolor') || _styleKeyNorm.includes('vibrantwatercolor');
            const _isPainterlyStyle = _styleKeyNorm.includes('acrylic') || _styleKeyNorm.includes('painterly')
                || _styleKeyNorm.includes('risograph') || _styleKeyNorm.includes('gouache')
                || _styleKeyNorm.includes('handdrawn') || _styleKeyNorm.includes('hand-drawn')
                || _styleKeyNorm.includes('organic') || _styleKeyNorm.includes('textured')
                || _styleKeyNorm.includes('editorial') || _styleKeyNorm.includes('sketch');
            const _isSoftStyle = _isWatercolorStyle || _isPainterlyStyle;
            const _sharpMinWarn = _isWatercolorStyle ? 1.5 : _isSoftStyle ? 3 : TECHNICAL_QA.sharpness.MIN_WARN;
            const _sharpMinGood = _isWatercolorStyle ? 4 : _isSoftStyle ? 8 : TECHNICAL_QA.sharpness.MIN_GOOD;
            const _noiseMild = _isSoftStyle ? 55 : TECHNICAL_QA.noise.mild;
            const _noisePhotographic = _isSoftStyle ? 100 : TECHNICAL_QA.noise.photographic;

            // Laplacian variance (sharpness)
            let lapSum = 0, lapSumSq = 0, lapAbsSum = 0, count = 0;
            let highFreqCount = 0;          // |Laplacian| > edgeThreshold → energi tinggi
            let overshootCount = 0;         // overshoot = |Laplacian| jauh di atas edge
            const edgeScale = TECHNICAL_QA.edge.gradientThreshold * 3;
            for (let y = 1; y < SIZE - 1; y++) {
                for (let x = 1; x < SIZE - 1; x++) {
                    const idx = y * SIZE + x;
                    const lap = -gray[idx - SIZE - 1] - gray[idx - SIZE] - gray[idx - SIZE + 1]
                        - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
                        - gray[idx + SIZE - 1] + (-gray[idx + SIZE]) - gray[idx + SIZE + 1];
                    lapSum += lap; lapAbsSum += Math.abs(lap); lapSumSq += lap * lap; count++;
                    if (Math.abs(lap) > TECHNICAL_QA.edge.gradientThreshold) highFreqCount++;
                    if (Math.abs(lap) > edgeScale) overshootCount++;
                }
            }
            const mean = lapSum / count;
            const laplacianVariance = lapSumSq / count - mean * mean;

            // Edge density (Sobel-ish via neighbor diff)
            let edgeCount = 0;
            for (let p = 0; p < N; p++) {
                const x = p % SIZE, y = (p / SIZE) | 0;
                if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) continue;
                const gx = gray[p + 1] - gray[p - 1];
                const gy = gray[p + SIZE] - gray[p - SIZE];
                const mag = Math.sqrt(gx * gx + gy * gy);
                if (mag > TECHNICAL_QA.edge.gradientThreshold) edgeCount++;
            }
            const edgeDensity = edgeCount / N;

            // Noise (residual vs 3x3 mean-lowpass di area paling datar)
            const low = new Float64Array(N);
            for (let y = 1; y < SIZE - 1; y++) {
                for (let x = 1; x < SIZE - 1; x++) {
                    const idx = y * SIZE + x;
                    low[idx] = (gray[idx - SIZE - 1] + gray[idx - SIZE] + gray[idx - SIZE + 1]
                        + gray[idx - 1] + gray[idx] + gray[idx + 1]
                        + gray[idx + SIZE - 1] + gray[idx + SIZE] + gray[idx + SIZE + 1]) / 9;
                }
            }
            const residual = new Float64Array(N);
            let rSum = 0;
            for (let i = 0; i < N; i++) { residual[i] = gray[i] - low[i]; rSum += Math.abs(residual[i]); }
            const residualMAE = rSum / N;                 // untuk flat-region noise
            // Ambil half paling datar sebagai base noise (edge merusak ukuran std).
            const halfL = new Float64Array(N);
            let h = 0;
            for (let i = 0; i < N; i++) halfL[h++] = residual[i];
            const sortedL = halfL.slice().sort((a, b) => a - b);
            const meaningful = sortedL.filter(v => Math.abs(v) < Math.max(80, mean));
            const noiseLevel = meaningful.reduce((a, b) => a + Math.abs(b), 0) / Math.max(1, meaningful.length);

            // Exposure / clipping (histogram)
            let clipLow = 0, clipHigh = 0;
            for (let i = 0; i < N; i++) {
                if (gray[i] < TECHNICAL_QA.exposure.clipSharp) clipLow++;
                else if (gray[i] > TECHNICAL_QA.exposure.clipHot) clipHigh++;
            }
            const clipFraction = (clipLow + clipHigh) / N;

            // Compression blocking (on downsample 256 untuk menjaga blok 8px)
            const CS = TECHNICAL_QA.compression.sampleSize;
            const cCanvas = document.createElement('canvas');
            cCanvas.width = CS; cCanvas.height = CS;
            const cCtx = cCanvas.getContext('2d');
            if (!cCtx) { resolve(null); return; }
            cCtx.drawImage(img, 0, 0, CS, CS);
            const cData = cCtx.getImageData(0, 0, CS, CS).data;
            const cGray = new Float64Array(CS * CS);
            for (let i = 0; i < CS * CS; i++) {
                cGray[i] = 0.299 * cData[i * 4] + 0.587 * cData[i * 4 + 1] + 0.114 * cData[i * 4 + 2];
            }
            const B = TECHNICAL_QA.compression.blockSize;
            let boundarySum = 0, boundaryN = 0, interiorSum = 0, interiorN = 0;
            for (let y = 1; y < CS - 1; y++) {
                for (let x = 1; x < CS - 1; x++) {
                    const idx = y * CS + x;
                    const d = Math.abs(cGray[idx] - cGray[idx - 1]);
                    if (x % B === 0) { boundarySum += d; boundaryN++; }
                    else { interiorSum += d; interiorN++; }
                }
            }
            const boundaryMean = boundaryN ? boundarySum / boundaryN : 0;
            const interiorMean = interiorN ? interiorSum / interiorN : 0;
            const boundaryBias = interiorMean > 0 ? boundaryMean / interiorMean : 1;

            // Map metrik ke severity + confidence
            const sharpVerdict = laplacianVariance >= _sharpMinGood ? 'clean'
                : laplacianVariance >= _sharpMinWarn ? 'mild' : 'excessive';

            const noise = noiseLevel;
            // INTENTIONAL: threshold TERBALIK — kalau noise sangat tinggi
            // (> photographic), itu dianggap grain/tekstur alami (bukan defect),
            // sehingga severity turun ke 'mild'. Hanya kisaran tengah
            // (mild < noise <= photographic) yang dianggap 'excessive' (defect nyata).
            // Jangan ubah urutan ini tanpa memahami maksud di atas.
            const noiseSeverity = noise > _noiseMild
                ? (noise > _noisePhotographic ? 'mild' : 'excessive')
                : 'clean';

            const compressionSeverity = boundaryBias > TECHNICAL_QA.compression.boundaryBiasMild
                ? 'excessive' : boundaryBias > TECHNICAL_QA.compression.boundaryBiasClean ? 'mild' : 'clean';

            const overshootRatio = count ? overshootCount / count : 0;
            const oversharpenSeverity = overshootRatio > TECHNICAL_QA.oversharpen.overshootRatioMild
                ? 'excessive' : overshootRatio > TECHNICAL_QA.oversharpen.overshootRatioClean ? 'mild' : 'clean';

            const exposureSeverity = clipFraction > TECHNICAL_QA.exposure.clipFractionFail
                ? 'excessive' : clipFraction > TECHNICAL_QA.exposure.clipFractionWarn ? 'mild' : 'clean';

            // Kumpulkan defect (QA-aset decision matrix: severity+density)
            const defects = [];
            const pushDefect = (id, type, severity, score, threshold, confidence, message) => {
                defects.push({ id, type, severity, confidence, score, threshold, evidence: 'full-frame', message });
            };
            if (sharpVerdict === 'excessive') {
                pushDefect('QA_BLUR', 'sharpness', 'critical', laplacianVariance <= 0 ? 0 : scoreSharpness(laplacianVariance), _sharpMinWarn, _isSoftStyle ? 0.5 : 0.92, `Sharpness too low (${laplacianVariance.toFixed(1)} variance, edge ${(edgeDensity * 100).toFixed(0)}%)${_isSoftStyle ? ' [soft-style: soft edges are expected, verify visually]' : ' — likely blurry, Adobe rejects.'}`);
            } else if (sharpVerdict === 'mild') {
                pushDefect('QA_SOFT', 'sharpness', 'warning', scoreSharpness(laplacianVariance), TECHNICAL_QA.sharpness.MIN_WARN, 0.75, `Sharpness borderline (${laplacianVariance.toFixed(1)} variance) — consider upscaling/regenerating.`);
            }
            if (noiseSeverity === 'excessive') {
                pushDefect('QA_TECHNOISE', 'noise', _isSoftStyle ? 'warning' : 'major', Math.max(10, 100 - noise), _noiseMild, _isSoftStyle ? 0.35 : 0.7, `${_isSoftStyle ? 'Texture/grain detected' : 'Excessive luminance noise'} (${noise.toFixed(1)}) spotted in flat areas — verify intentional effect.`);
            } else if (noiseSeverity === 'mild') {
                pushDefect('QA_TECHNOISE_MILD', 'noise', 'warning', Math.max(10, 100 - noise), _noisePhotographic, _isSoftStyle ? 0.15 : 0.5, `High-frequency texture/grain (${noise.toFixed(1)}) — confirm intentional effect (film grain / paper).`);
            }
            if (compressionSeverity === 'excessive') {
                pushDefect('QA_COMPRESSION', 'compression', 'major', Math.max(10, 100 - boundaryBias * 40), TECHNICAL_QA.compression.boundaryBiasMild, 0.8, `Compression blocking artifact (boundary bias ${boundaryBias.toFixed(2)}) — Adobe rejects heavy compression artifacts.`);
            } else if (compressionSeverity === 'mild') {
                pushDefect('QA_COMPRESSION_MILD', 'compression', 'warning', Math.max(10, 100 - boundaryBias * 40), TECHNICAL_QA.compression.boundaryBiasClean, 0.6, `Mild compression blocking (${boundaryBias.toFixed(2)}) — prefer lossless/PNG export.`);
            }
            if (oversharpenSeverity === 'excessive') {
                pushDefect('QA_OVERSHARPEN', 'oversharpening', 'major', Math.max(10, 100 - overshootRatio * 300), TECHNICAL_QA.oversharpen.overshootRatioMild, 0.72, `Oversharpening halo/ringing (overshoot ${(overshootRatio * 100).toFixed(1)}%) — Adobe rejects oversharpened edges.`);
            } else if (oversharpenSeverity === 'mild') {
                pushDefect('QA_OVERSHARPEN_MILD', 'oversharpening', 'warning', Math.max(10, 100 - overshootRatio * 300), TECHNICAL_QA.oversharpen.overshootRatioClean, 0.55, `Slight oversharpening halo (${(overshootRatio * 100).toFixed(1)}%) — verify edges.`);
            }
            if (exposureSeverity === 'excessive') {
                pushDefect('QA_EXPOSURE', 'exposure', 'major', Math.max(5, 100 - clipFraction * 150), TECHNICAL_QA.exposure.clipFractionFail, 0.85, `Heavy exposure clipping (${(clipFraction * 100).toFixed(0)}% pixels clipped) — Adobe rejects blown/blocked exposure.`);
            } else if (exposureSeverity === 'mild') {
                pushDefect('QA_EXPOSURE_MILD', 'exposure', 'warning', Math.max(5, 100 - clipFraction * 150), TECHNICAL_QA.exposure.clipFractionWarn, 0.7, `Noticeable exposure clipping (${(clipFraction * 100).toFixed(0)}% clipped) — verify highlights/shadows.`);
            }

            resolve({
                qaVersion: TECHNICAL_QA.QA_VERSION,
                metrics: {
                    sharpness: { score: laplacianVariance, verdict: sharpVerdict },
                    edgeDensity,
                    highFrequencyEnergy: lapAbsSum / count,
                    noise: { score: noise, severity: noiseSeverity },
                    compression: { score: boundaryBias, severity: compressionSeverity },
                    oversharpening: { score: overshootRatio, severity: oversharpenSeverity },
                    exposure: { score: clipFraction, severity: exposureSeverity },
                },
                defects,
            });
        } catch {
            resolve(null);
        }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
});

export function scoreSharpness(variance) {
    const good = TECHNICAL_QA.sharpness.MIN_GOOD;
    const warn = TECHNICAL_QA.sharpness.MIN_WARN;
    if (variance >= good) return 100;
    if (variance <= warn) return Math.max(0, Math.round((variance / warn) * 40));
    return Math.round(40 + ((variance - warn) / (good - warn)) * 60);
}

// FIX-WATERMARK-FP: require multiple watermark-specific canvas signals, or explicit AI plus one canvas signal.
export const detectWatermark = (dataUrl, aiSignal) => new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
        try {
            const SIZE = 128;
            const canvas = document.createElement('canvas');
            canvas.width = SIZE; canvas.height = SIZE;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { resolve({ detected: false, confidence: 0, score: 0, evidence: 'no canvas' }); return; }
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
            const gray = new Float64Array(SIZE * SIZE);
            const alpha = new Float64Array(SIZE * SIZE);
            for (let i = 0; i < SIZE * SIZE; i++) {
                gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
                alpha[i] = data[i * 4 + 3];
            }
            let semiTranspCount = 0, nonBgCount = 0;
            for (let i = 0; i < SIZE * SIZE; i++) {
                const isBackground = gray[i] > 240 && alpha[i] > 240;
                if (!isBackground) {
                    nonBgCount++;
                    if (alpha[i] >= 40 && alpha[i] <= 210) semiTranspCount++;
                }
            }
            const semiTranspRatio = nonBgCount > 50 ? semiTranspCount / nonBgCount : 0;
            const signal1 = semiTranspRatio > 0.25;
            const computeEdgeDensity = (x0, y0, w, h) => {
                let edges = 0, pixels = 0;
                for (let y = y0 + 1; y < y0 + h - 1 && y < SIZE - 1; y++) {
                    for (let x = x0 + 1; x < x0 + w - 1 && x < SIZE - 1; x++) {
                        const idx = y * SIZE + x;
                        if (Math.abs(gray[idx + 1] - gray[idx - 1]) + Math.abs(gray[idx + SIZE] - gray[idx - SIZE]) > 30) edges++;
                        pixels++;
                    }
                }
                return pixels > 0 ? edges / pixels : 0;
            };
            const CORNER = 24;
            const maxCorner = Math.max(computeEdgeDensity(0, 0, CORNER, CORNER), computeEdgeDensity(SIZE - CORNER, 0, CORNER, CORNER), computeEdgeDensity(0, SIZE - CORNER, CORNER, CORNER), computeEdgeDensity(SIZE - CORNER, SIZE - CORNER, CORNER, CORNER));
            const centerDensity = computeEdgeDensity(SIZE / 4, SIZE / 4, SIZE / 2, SIZE / 2);
            const cornerConcentration = centerDensity > 0.01 ? maxCorner / centerDensity : 0;
            const signal2 = cornerConcentration > 3.5 && maxCorner > 0.15;
            let textBandScore = 0;
            for (let y = 2; y < SIZE - 2; y++) {
                const rowEdges: number[] = [];
                for (let x = 1; x < SIZE - 1; x++) rowEdges.push(Math.abs(gray[y * SIZE + x + 1] - gray[y * SIZE + x - 1]));
                const rowMean = rowEdges.reduce((a, b) => a + b, 0) / rowEdges.length;
                if (rowMean < 5) continue;
                const rowVariance = rowEdges.reduce((a, b) => a + (b - rowMean) ** 2, 0) / rowEdges.length;
                if (Math.sqrt(rowVariance) / (rowMean + 1) < 0.6 && rowMean > 8) textBandScore++;
            }
            const textBandRatio = textBandScore / (SIZE - 4);
            const signal3 = textBandRatio > 0.12;
            const aiDetected = Boolean(aiSignal);
            const canvasSignals = [signal1, signal2, signal3].filter(Boolean).length;
            const detected = canvasSignals >= 2 || (aiDetected && canvasSignals >= 1);
            const confidence = Math.min(1, canvasSignals * 0.25 + (aiDetected ? 0.4 : 0));
            const evidenceParts: string[] = [];
            if (signal1) evidenceParts.push('semi-transparent pixels');
            if (signal2) evidenceParts.push(`corner concentration (${cornerConcentration.toFixed(1)}x)`);
            if (signal3) evidenceParts.push(`text-band rows (${Math.round(textBandRatio * 100)}%)`);
            if (aiDetected) evidenceParts.push('AI visibleWatermark flag');
            resolve({ detected, confidence, score: Math.round(confidence * 100), evidence: detected ? `Watermark signals: ${evidenceParts.join(', ')}` : `No watermark (signals: ${evidenceParts.join(', ') || 'none'}, canvasSignals=${canvasSignals})` });
        } catch { resolve(null); }
        finally { URL.revokeObjectURL(img.src); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
});

export const buildImaginLocalFallback = (asset) => {
    const title = asset?.stockMetadata?.title || asset?.title || 'asset';
    const baseName = title.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase() || 'asset';
    const imgSrc = asset?.url || '';
    const w = 800, h = 800;
    const fragment = `<div class="scene" style="width:${w}px;height:${h}px;position:relative;overflow:hidden;background:#ffffff">\n  <img id="${baseName || 'asset'}" class="asset" src="${imgSrc}" alt="${title}" style="position:absolute;width:100%;height:100%;object-fit:contain" />\n</div>`;
    const css = [
        `/* ${baseName} — static CSS for IMAGIN Local (no animations) */`,
        `.scene { position: relative; width: ${w}px; height: ${h}px; background: #ffffff; overflow: hidden; }`,
        `#${baseName || 'asset'} { position: absolute; width: 100%; height: 100%; object-fit: contain; }`,
        '',
    ].join('\n');
    const metadata = {
        canvas: { width: w, height: h },
        animatable: [baseName || 'asset'],
        suggestedGrouping: {},
    };
    return { fragment, css, metadata, baseName };
};

export const buildAnimationPreviewShell = (asset, fragment, css, presetId = ANIMATION_DEFAULT_PRESET) => {
    const preset = ANIMATION_PRESET_MAP[presetId] || ANIMATION_PRESET_MAP[ANIMATION_DEFAULT_PRESET];
    const title = asset?.stockMetadata?.title || asset?.title || 'Imagin Asset';
    const safeTitle = title.replace(/[^a-zA-Z0-9\s]/g, ' ').trim() || 'Imagin Asset';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle} — Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f1115; font-family: system-ui, sans-serif; }
  .stage { max-width: min(90vw, 640px); max-height: 90vh; display: flex; align-items: center; justify-content: center; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .scene { transform-origin: top left; }
  /* Preview-only animation (tidak ikut diekspor) */
  .scene { ${preset.css} }
  ${preset.keyframes}
</style>
</head>
<body>
  <div class="stage">${fragment}</div>
</body>
</html>`;
};

export const handleDownloadImaginLocal = async (asset, e, showToast) => {
    if (e) e.stopPropagation();
    const paket = asset?.imaginLocalPaket;
    if (!paket?.fragment) { showToast('Aset ini belum punya paket IMAGIN Local — generate dulu via tombol Animate.', 'error'); return; }
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const title = asset.stockMetadata?.title || asset.title || 'asset';
        const baseName = (paket.baseName || title.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase() || 'asset');
        const folder = zip.folder('assets');
        // PNG dari data URL
        const pngB64 = (asset.url || '').split(',')[1] || '';
        folder.file(`${baseName}.png`, pngB64, { base64: true });
        folder.file(`${baseName}.html`, paket.fragment);
        folder.file(`${baseName}.css`, paket.css || '');
        folder.file(`${baseName}.json`, JSON.stringify(paket.metadata || {}, null, 2));
        zip.file('manifest.json', JSON.stringify({
            name: title,
            baseName,
            exportedAt: new Date().toISOString(),
            files: [`assets/${baseName}.png`, `assets/${baseName}.html`, `assets/${baseName}.css`, `assets/${baseName}.json`],
            source: 'IMAGIN Studio',
        }, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_imagin_local.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        // ponytail: no recordExportHistory — Studio is generate-only (Fase 2).
        showToast('Paket ZIP IMAGIN Local terunduh  (PNG + HTML + CSS + JSON)', 'success');
    } catch (err) {
        console.error('[ImaginLocal] ZIP gagal:', err);
        showToast('Gagal membuat ZIP: ' + err.message, 'error');
    }
};

export const getDoneSceneElements = (scene) => (scene?.elements || scene?.layers || []).filter(el => el && el.status === 'done' && el.url) || [];

export const handleExportSceneZip = async (scene, showToast) => {
    if (!scene) return;
    if (scene.status !== 'ready') {
        showToast('Scene belum siap — tunggu generation selesai.', 'error');
        return;
    }
    showToast('Mempersiapkan Scene ZIP...', 'info');
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const baseName = `IMAGIN_SCENE_${scene.id.slice(-6)}`;

        const elemFolder = zip.folder('elements');
        const doneElements = getDoneSceneElements(scene);
        if (doneElements.length === 0) {
            showToast('Tidak ada layer berhasil — scene tidak bisa diekspor.', 'error');
            return;
        }

        for (const el of doneElements) {
            const dataUrl = el.url || '';
            const comma = dataUrl.indexOf(',');
            const header = comma >= 0 ? dataUrl.slice(0, comma) : '';
            const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
            const isB64 = /base64/i.test(header);
            elemFolder.file(`${baseName}_${el.id}.png`, isB64 ? payload : decodeURIComponent(payload), { base64: isB64 });
        }

        zip.file(`${baseName}.html`, scene.assembledHtml || '');
        zip.file(`${baseName}.css`, scene.assembledCss || '');

        const localMeta = {
            // FIX #11 (audit): scene lawas bisa tanpa blueprint — optional
            // chaining mencegah TypeError saat export ZIP.
            canvas: scene.blueprint?.canvas,
            animatable: doneElements.map(el => el.id),
            layers: doneElements.map(el => ({
                id: el.id,
                label: el.label,
                layer: el.layer,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
            })),
            suggestedGrouping: {},
            source: 'imagin-studio-v2',
            prompt: scene.prompt,
            sceneStyle: scene.blueprint?.sceneStyle,
            exportedAt: new Date().toISOString(),
        };
        zip.file(`${baseName}.json`, JSON.stringify(localMeta, null, 2));

        zip.file('manifest.json', JSON.stringify({
            type: 'imagin-scene',
            baseName,
            elementCount: doneElements.length,
            exportedAt: new Date().toISOString(),
        }, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_local_animation.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        showToast(`Scene ZIP berhasil — ${doneElements.length} layer siap diimport ke IMAGIN Local `, 'success');
    } catch (err) {
        console.error('Scene export failed:', err);
        showToast(`Gagal export Scene ZIP: ${err.message}`, 'error');
    }
};






export const toggleSelection = (id, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        // FASE 5: action layer — selectionReducer murni (bisa diuji).
        setSelectedAssetIds(prev => selectionReducer(prev, { type: 'toggle', id }));
    };

export const handleBulkDelete = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (selectedAssetIds.size === 0) return;
        const count = selectedAssetIds.size;
        confirmBlocking({
            title: 'Hapus Asset Terpilih?',
            message: `Hapus ${count} asset terpilih secara permanen? Tindakan ini tidak bisa dibatalkan.`,
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            onConfirm: async () => {
                const deletedIds = [];
                for (const id of selectedAssetIds) {
                    try {
                        await deleteAssetDBLinked(id);
                        deletedIds.push(id);
                    } catch (err) {
                        console.warn('[Imagin] Bulk delete failed (kept local):', id, err);
                    }
                }
                setAssets(p => assetsReducer(p, { type: 'remove', ids: deletedIds }));
                setSelectedAssetIds(selectionReducer(selectedAssetIds, { type: 'clear' }));
                showToast(`${deletedIds.length} asset berhasil dihapus.`, 'success');
            }
        });
    };

export const handleApplyRevision = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (!revisionState.instruction.trim()) {
            showToast("Please enter a revision instruction.", "error");
            return;
        }
        setRevisionState(p => ({ ...p, isRevising: true, revisedImageUrl: null }));

        try {
            const hasKey = systemSettings.aiConfig.hasGeminiKey || systemSettings.aiConfig.hasNineRouterKey;
            if (!hasKey) {
                console.warn("[Revision] No API key set — edit call will require key");
            }

            const primaryModel = systemSettings.aiConfig.imageModel || 'gemini-3.1-flash-image';
            const fallbackModel = primaryModel === 'gemini-3-pro-image' ? 'gemini-3.1-flash-image' : 'gemini-3-pro-image';

            if (!revisionState.asset.url || !revisionState.asset.url.startsWith('data:image') || !revisionState.asset.url.includes(';base64,')) {
                throw new Error("Valid reference image is missing.");
            }

            const base64Data = revisionState.asset.url.split(',')[1];
            const mimeType = (revisionState.asset.url.match(/data:(.*?);base64/) || [])[1] || 'image/png';

            let modeConstraints = "";
            if (revisionState.editMode === 'repaint') {
                modeConstraints =
                    `CRITICAL CONSTRAINTS (REPAINT MODE):\n` +
                    `- Preserve exact structure, camera angle, scale, and object placement.\n` +
                    `- Do not add or remove any items. Only change colors, patterns, or surface details.\n` +
                    `- Keep the background strictly untouched.`;
            } else if (revisionState.editMode === 'modify_objects') {
                // FIX: background constraint harus mengikuti assetType asset yang
                // sedang direvisi — photo (scene) tidak boleh dipaksa balik ke
                // solid white, karena itu merusak full-frame environment context.
                const isPhotoAsset = revisionState.asset.assetType === 'photo'
                    || revisionState.asset.background === 'scene';
                const bgConstraint = isPhotoAsset
                    ? `- Keep the background scene, environmental context, and depth of field consistent with the original — do not flatten it into a solid or isolated background.`
                    : `- Keep the background strictly clean, solid plain white, and isolated.`;
                modeConstraints =
                    `CRITICAL CONSTRAINTS (OBJECT MODIFICATION MODE):\n` +
                    `- Maintain the exact same art style, lighting direction, and line weights as the original image.\n` +
                    `- Seamlessly integrate added or removed elements into the existing composition without disrupting perspective.\n` +
                    `${bgConstraint}\n` +
                    `- STRICT PROHIBITION: NO watermarks, NO text, NO typography, NO logos, NO brand names, NO signatures, NO frames, and NO jpeg artifacts.`;
            }

            const editInstruction =
                `Perform the following edit instruction: "${revisionState.instruction}".\n\n` +
                `${modeConstraints}\n\n` +
                (revisionState.asset.negativePrompt
                    ? `STRICT PROHIBITION: DO NOT introduce or retain any of: ${revisionState.asset.negativePrompt}.\n\n`
                    : '') +
                `Output only the clean edited image matching professional microstock vector standards.`;

            const buildPayloads = () => ([
                {
                    // v1beta dengan imageConfig (format paling stabil untuk image editing)
                    label: 'v1beta-imageConfig',
                    endpointVersion: 'v1beta',
                    body: {
                        contents: [{
                            role: "user",
                            parts: [
                                { text: editInstruction },
                                { inlineData: { mimeType, data: base64Data } }
                            ]
                        }],
                        generationConfig: { responseModalities: ['IMAGE'], imageConfig: {} }
                    },
                },
                {
                    // v1beta basic — fallback jika imageConfig ditolak model tertentu
                    label: 'v1beta-basic',
                    endpointVersion: 'v1beta',
                    body: {
                        contents: [{
                            role: "user",
                            parts: [
                                { text: editInstruction },
                                { inlineData: { mimeType, data: base64Data } }
                            ]
                        }],
                        generationConfig: { responseModalities: ['IMAGE'] }
                    },
                },
            ]);

            const primaryResult = await generateRevisionVariant([primaryModel], buildPayloads(), incrementApiCallCounter);
            if (primaryResult) {
                setRevisionState(p => ({ ...p, isRevising: false, revisedImageUrl: primaryResult }));
                showToast("Revision applied! ", "success");
                return;
            }

            console.debug(`[Revision] Primary model (${primaryModel}) failed. Trying fallback (${fallbackModel})...`);
            const fallbackResult = await generateRevisionVariant([fallbackModel], buildPayloads(), incrementApiCallCounter);
            if (fallbackResult) {
                setRevisionState(p => ({ ...p, isRevising: false, revisedImageUrl: fallbackResult }));
                showToast("Revision applied! ", "success");
                return;
            }

            if (!hasKey) {
                throw new Error("No API key configured. Set a custom API key in Settings → Generative AI Config.");
            }
            throw new Error("All API variants returned errors. Check that your API key has access to image generation models.");
        } catch (err) {
            console.error("Image editing failed:", err);
            setRevisionState(p => ({ ...p, isRevising: false }));
            showToast("Failed to apply revision: " + err.message, "error");
        }
    };

export const saveRevisedAsset = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (!revisionState.revisedImageUrl) return;
        const newAssetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const finalized = await finalizeAsset(
            revisionState.revisedImageUrl,
            revisionState.asset.background,
            revisionState.asset.assetType,
            'none',
            revisionState.asset.aspectRatio || '4:3',
            revisionState.asset.outputFormat || 'PNG',
            revisionState.asset.style || '',
        );

        const newAsset = {
            ...revisionState.asset,
            id: newAssetId,
            title: '',
            url: finalized.dataUrl,
            svgUrls: undefined,   // STEP 10b: gambar baru → tanpa cache SVG lama
            svgStats: undefined,
            createdAt: Date.now(),
            assembledPrompt: composeFinalPrompt(revisionState.asset.baseTheme, true, revisionState.instruction, '', vectorState),
            status: 'draft',
            resolutionTarget: undefined,
            resolution: {
                width: finalized.width,
                height: finalized.height,
                wasUpscaled: false,
                scaleFactor: 1,
            },
            stockMetadata: createDraftStockMetadata({
                assetType: revisionState.asset.assetType,
                background: revisionState.asset.background,
                outputFormat: revisionState.asset.outputFormat,
                stockCategory: revisionState.asset.adobeCategory,
                subcategory: revisionState.asset.subcategory,
            }),
        };
        const saveResult = await saveAssetDB(newAsset);
        if (!saveResult.success) {
                showToast('Gagal menyimpan revisi: ' + (saveResult.detail || 'unknown error'), 'error');
            return;
        }
        await addHistory(`Saved revised asset: ${revisionState.instruction}`, { setHistoryLogs });
        setAssets(prev => [...prev, newAsset]);
        showToast("Revised asset saved to library!", "success");
        setRevisionState({ isOpen: false, asset: null, instruction: '', editMode: 'repaint', isRevising: false, revisedImageUrl: null });
    };

export const handleObjectModImportSelected = async (e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
            showToast('Asset harus berupa PNG, JPEG, atau WebP.', 'error');
            return;
        }
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Gagal membaca file.'));
                reader.readAsDataURL(file);
            });
            // Buat asset sementara sebagai wadah
            const tempAsset = {
                id: `objmod_${Date.now()}`,
                type: 'IMAGE', assetType: 'vector', generationMode: 'imported',
                adobeCategory: '', subcategory: '', title: file.name.replace(/\.[^.]+$/, ''),
                baseTheme: file.name, prompt: '', assembledPrompt: '', negativePrompt: '',
                aspectRatio: '4:3', style: '', highDpiSharpness: false, outputFormat: 'PNG',
                background: 'white', createdAt: Date.now(), status: 'draft', favorite: false,
                batchId: '', isLoading: false, isMetaLoading: false, url: dataUrl,
                stockMetadata: createDraftStockMetadata({ assetType: 'vector', background: 'white', outputFormat: 'PNG' }),
            };
            setObjectModState({
                isOpen: true,
                asset: tempAsset,
                step: 'replicate',
                isReplicating: false,
                replicatedUrl: null,
                editMode: 'modify_objects',
                instruction: '',
                isGenerating: false,
                variants: [],
                selectedVariantIdx: -1,
            });
            setImportHubOpen(false);
        } catch (err) {
            showToast('Gagal membaca asset: ' + (err?.message || 'Unknown error'), 'error');
        }
    };

export const handleReplicateAsset = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (!objectModState.asset?.url) return;
        setObjectModState(p => ({ ...p, isReplicating: true }));
        try {
            // Gunakan fallback chain seluruh IMAGE_MODELS — identik dengan generateImageWithGemini
            const configuredModel = systemSettings.aiConfig.imageModel || 'gemini-3.1-flash-image';
            const modelChain = [
                configuredModel,
                ...IMAGE_MODELS.map(m => m.value).filter(v => v !== configuredModel),
            ];

            if (!objectModState.asset.url.startsWith('data:image')) throw new Error('Valid reference image is missing.');
            const base64Data = objectModState.asset.url.split(',')[1];
            const mimeType = (objectModState.asset.url.match(/data:(.*?);base64/) || [])[1] || 'image/png';

            const replicateInstruction =
                `Reproduce this image with maximum fidelity. ` +
                `Preserve every visual element: subjects, objects, colors, composition, layout, art style, line weights, shadows, and background. ` +
                `Output must be a clean, professional microstock asset — identical in visual DNA to the reference. ` +
                `STRICT PROHIBITION: NO watermarks, NO text, NO logos, NO signatures, NO jpeg artifacts.`;

            const buildPayloads = () => ([
                {
                    label: 'v1beta-with-imageConfig',
                    endpointVersion: 'v1beta',
                    body: {
                        contents: [{ role: 'user', parts: [{ text: replicateInstruction }, { inlineData: { mimeType, data: base64Data } }] }],
                        generationConfig: { responseModalities: ['IMAGE'], imageConfig: {} },
                    },
                },
                {
                    label: 'v1beta-basic',
                    endpointVersion: 'v1beta',
                    body: {
                        contents: [{ role: 'user', parts: [{ text: replicateInstruction }, { inlineData: { mimeType, data: base64Data } }] }],
                        generationConfig: { responseModalities: ['IMAGE'] },
                    },
                },
            ]);

            const result = await generateObjectModVariant(modelChain, buildPayloads(), incrementApiCallCounter);

            if (result) {
                setObjectModState(p => ({ ...p, isReplicating: false, replicatedUrl: result, step: 'modify' }));
                showToast('Asset berhasil direplikasi! Sekarang tambahkan instruksi modifikasi. ', 'success');
            } else {
                throw new Error('Semua model gagal menghasilkan replikasi. Cek Console (F12) untuk detail error dari Google API.');
            }
        } catch (err) {
            console.error('[ObjectMod] Replication failed:', err);
            setObjectModState(p => ({ ...p, isReplicating: false }));
            showToast('Replikasi gagal: ' + err.message, 'error');
        }
    };

export const handleApplyObjectMod = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (!objectModState.instruction.trim()) {
            showToast('Masukkan instruksi modifikasi terlebih dahulu.', 'error');
            return;
        }
        const sourceUrl = objectModState.replicatedUrl || objectModState.asset?.url;
        if (!sourceUrl?.startsWith('data:image')) {
            showToast('Tidak ada base image yang valid.', 'error');
            return;
        }
        setObjectModState(p => ({ ...p, isGenerating: true, variants: [], selectedVariantIdx: -1 }));
        try {
            const configuredModel = systemSettings.aiConfig.imageModel || 'gemini-3.1-flash-image';
            // Gunakan fallback chain seluruh IMAGE_MODELS — identik dengan generateImageWithGemini
            const modelChain = [
                configuredModel,
                ...IMAGE_MODELS.map(m => m.value).filter(v => v !== configuredModel),
            ];

            const base64Data = sourceUrl.split(',')[1];
            const mimeType = (sourceUrl.match(/data:(.*?);base64/) || [])[1] || 'image/png';

            const isPhotoAsset = objectModState.asset?.assetType === 'photo' || objectModState.asset?.background === 'scene';
            const bgConstraint = isPhotoAsset
                ? `- Keep the background scene, environmental context, and depth of field consistent with the original.`
                : `- Keep the background strictly clean, solid plain white, and isolated.`;

            const modeConstraints = objectModState.editMode === 'repaint'
                ? `CRITICAL CONSTRAINTS (REPAINT MODE):\n- Preserve exact structure, camera angle, scale, and object placement.\n- Do not add or remove any items. Only change colors, patterns, or surface details.\n- Keep the background strictly untouched.`
                : `CRITICAL CONSTRAINTS (OBJECT MODIFICATION MODE):\n- Maintain the exact same art style, lighting direction, and line weights as the original image.\n- Seamlessly integrate added or removed elements into the existing composition without disrupting perspective.\n${bgConstraint}\n- STRICT PROHIBITION: NO watermarks, NO text, NO typography, NO logos, NO brand names, NO signatures, NO frames.`;

            // Seed variasi kecil supaya Gemini menghasilkan output yang berbeda per request
            const variationSeeds = [
                'Variation A: apply the instruction with moderate intensity.',
                'Variation B: apply the instruction with a slightly different compositional angle or element placement.',
                'Variation C: apply the instruction with a bolder, more expressive interpretation.',
            ];

            const buildPayload = (seed: string) => ({
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text: `Perform the following edit: "${objectModState.instruction}".\n\n${modeConstraints}\n\n${seed}\n\nOutput only the clean edited image matching professional microstock standards.`,
                        },
                        { inlineData: { mimeType, data: base64Data } },
                    ],
                }],
                generationConfig: { responseModalities: ['IMAGE'] },
            });

            // Generate 3 variasi secara paralel, fallback ke seluruh modelChain jika gagal
            const results = await Promise.all(
                variationSeeds.map(seed => generateObjectModVariant(
                    modelChain,
                    [{ label: 'v1beta', body: buildPayload(seed) }],
                    incrementApiCallCounter,
                ))
            );

            const validVariants = results.filter(Boolean) as string[];
            if (validVariants.length === 0) throw new Error('Semua variasi gagal digenerate. Cek Console (F12) untuk detail error dari Google API.');

            setObjectModState(p => ({ ...p, isGenerating: false, variants: validVariants, selectedVariantIdx: 0 }));
            showToast(`${validVariants.length} variasi berhasil digenerate! `, 'success');
        } catch (err) {
            console.error('[ObjectMod] Modification failed:', err);
            setObjectModState(p => ({ ...p, isGenerating: false }));
            showToast('Modifikasi gagal: ' + err.message, 'error');
        }
    };

export const saveObjectModVariant = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const { variants, selectedVariantIdx, asset, instruction, editMode, saveMode } = objectModState;
        const urlToSave = variants[selectedVariantIdx] || null;
        if (!urlToSave) return;
        const finalized = await finalizeAsset(
            urlToSave,
            asset.background,
            asset.assetType,
            'none',
            asset.aspectRatio || '4:3',
            asset.outputFormat || 'PNG',
            asset.style || '',
        );
        const resolution = { width: finalized.width, height: finalized.height, wasUpscaled: false, scaleFactor: 1 };
        const resetState = { isOpen: false, asset: null, step: 'replicate', isReplicating: false, replicatedUrl: null, editMode: 'modify_objects', instruction: '', isGenerating: false, variants: [], selectedVariantIdx: -1, saveMode: 'new' };
        if (saveMode === 'overwrite') {
            const updatedAsset = { ...asset, url: finalized.dataUrl, svgUrls: undefined, svgStats: undefined, resolutionTarget: undefined, assembledPrompt: `[Object Modifier / ${editMode}] ${instruction}`, status: asset.status === 'ready' ? 'needs_review' : asset.status, resolution };
            const saveResult = await saveAssetDB(updatedAsset);
            if (!saveResult.success) {
                showToast('Gagal menimpa aset: ' + (saveResult.detail || 'unknown error'), 'error');
                return;
            }
            await addHistory(`Overwrite object-modifier asset: ${instruction}`, { setHistoryLogs });
            setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
            showToast('Aset berhasil ditimpa dengan hasil edit! ', 'success');
        } else {
            const newAsset = {
                ...asset, id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: '', url: finalized.dataUrl,
                svgUrls: undefined, svgStats: undefined, createdAt: Date.now(), assembledPrompt: `[Object Modifier / ${editMode}] ${instruction}`,
                status: 'draft', generationMode: 'object-modifier', resolutionTarget: undefined, resolution,
                stockMetadata: createDraftStockMetadata({ assetType: asset.assetType, background: asset.background, outputFormat: asset.outputFormat, stockCategory: asset.adobeCategory, subcategory: asset.subcategory }),
            };
            const saveResult = await saveAssetDB(newAsset);
            if (!saveResult.success) {
                showToast('Gagal menyimpan aset baru: ' + (saveResult.detail || 'unknown error'), 'error');
                return;
            }
            await addHistory(`Saved object-modifier asset: ${instruction}`, { setHistoryLogs });
            setAssets(prev => [...prev, newAsset]);
            showToast('Aset baru berhasil disimpan ke library! ', 'success');
        }
        setObjectModState(resetState);
    };

export const handleOpenRemoveBgSingle = (asset, e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (e) e.stopPropagation();
        if (!asset?.url || asset.isLoading || asset.isUpscaling || asset.status === 'FAILED') {
            showToast('Asset tidak siap untuk Remove Background.', 'error');
            return;
        }
        setRemoveBgState({
            isOpen: true,
            mode: 'single',
            asset,
            processing: false,
            progress: { current: 0, total: 0 },
            result: null,
            bulkDone: 0,
            bulkFailed: 0,
        });
    };

export const handleOpenRemoveBgBulk = (selectedAssets, ctx) => {
    const { setRemoveBgState, showToast } = ctx;
    const assets = (selectedAssets || []).filter(a => a?.url && !a.isLoading && !a.isUpscaling && a.status !== 'FAILED');
    if (!assets.length) { showToast('Pilih asset yang siap diproses.', 'error'); return; }
    setRemoveBgState({ isOpen: true, mode: 'bulk', asset: assets, processing: false, progress: { current: 0, total: assets.length }, result: null, bulkDone: 0, bulkFailed: 0 });
    void processRemoveBgBulk(assets, ctx);
};

const processRemoveBgBulk = async (assets, ctx) => {
    const { setRemoveBgState, setAssets, showToast, selectedAssetDetail, setSelectedAssetDetail } = ctx;
    setRemoveBgState(p => ({ ...p, processing: true }));
    let done = 0; let failed = 0;
    for (let index = 0; index < assets.length; index += 1) {
        const asset = assets[index];
        try {
            const result = await applyRemoveBgToDataUrl(asset.url, asset.assetType, asset.style || '');
            const dims = await getImageDimensions(result);
            const updated = { ...asset, url: result, outputFormat: 'PNG', background: 'transparent', svgUrls: undefined, svgStats: undefined, resolution: { ...(asset.resolution || {}), width: dims.width, height: dims.height, wasUpscaled: false, scaleFactor: 1 }, stockMetadata: { ...(asset.stockMetadata || {}), backgroundMode: 'transparent', backgroundVerified: true } };
            const saveResult = await saveAssetDB(updated);
            if (!isFinalSaveCommitted(saveResult)) throw new Error(saveResult?.detail || 'Library save failed');
            done += 1;
            setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
            if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updated);
        } catch (error) { failed += 1; console.error('[RemoveBG bulk] failed:', asset.id, error); }
        setRemoveBgState(p => ({ ...p, progress: { current: index + 1, total: assets.length }, bulkDone: done, bulkFailed: failed }));
    }
    setRemoveBgState(p => ({ ...p, processing: false }));
    showToast(`Remove Background selesai: ${done} berhasil, ${failed} gagal.`, failed ? 'error' : 'success');
};

export const handleOpenEditBg = (ctx, asset) => {
        const { showToast, setEditBgState } = ctx;
        if (!asset?.url || asset.isLoading || asset.isUpscaling || asset.status === 'FAILED') {
            showToast('Asset tidak siap untuk Edit Background.', 'error');
            return;
        }
        setEditBgState({ isOpen: true, asset, bgMode: 'white', bgColor: '#ffffff', processing: false, previewUrl: null });
    };

export const applyBgColorToDataUrl = (dataUrl, bgMode, bgColor) => new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const canvasCtx = canvas.getContext('2d');
                if (!canvasCtx) { reject(new Error('Canvas context unavailable')); return; }
                if (bgMode !== 'transparent') {
                    canvasCtx.fillStyle = bgMode === 'white' ? '#ffffff' : bgColor;
                    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
                }
                canvasCtx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('Gambar tidak dapat dimuat.'));
        img.src = dataUrl;
    });

export const handleApplyEditBg = async (ctx) => {
        const { editBgState, setEditBgState, setAssets, showToast, setHistoryLogs } = ctx;
        const { asset, bgMode, bgColor } = editBgState;
        if (!asset?.url || editBgState.processing) return;
        setEditBgState(p => ({ ...p, processing: true }));
        try {
            const resultUrl = await applyBgColorToDataUrl(asset.url, bgMode, bgColor);
            const bgLabel = bgMode === 'transparent' ? 'transparan' : bgMode === 'white' ? 'putih' : bgColor;
            const updatedAsset = { ...asset, url: resultUrl, background: bgMode === 'transparent' ? 'transparent' : bgMode === 'white' ? 'white' : 'custom' };
            await saveAssetDB(updatedAsset);
            await addHistory(`Changed asset background to ${bgLabel}`, { setHistoryLogs });
            setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
            showToast(`Background berhasil diubah ke ${bgLabel} `, 'success');
            setEditBgState({ isOpen: false, asset: null, bgMode: 'white', bgColor: '#ffffff', processing: false, previewUrl: null });
        } catch (err) {
            showToast(`Gagal menerapkan background: ${err?.message || 'unknown error'}`, 'error');
            setEditBgState(p => ({ ...p, processing: false }));
        }
    };

export const applyRemoveBgToDataUrl = async (dataUrl, assetType, styleKey = '') => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        // Canvas lokal: pipeline 3-layer (core flood → alpha matting → interior guard).
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
                    ctx.drawImage(img, 0, 0);
                    removeBackground3Layer(ctx, canvas.width, canvas.height, assetType || 'vector', styleKey);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) { reject(e); }
            };
            img.onerror = () => reject(new Error('Gambar tidak dapat dimuat.'));
            img.src = dataUrl;
        });
    };

export const handleApplyRemoveBgSingle = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const asset = removeBgState.asset;
        if (!asset?.url || removeBgState.processing) return;
        setRemoveBgState(p => ({ ...p, processing: true }));
        try {
            const result = await applyRemoveBgToDataUrl(asset.url, asset.assetType, asset.style || '');
            setRemoveBgState(p => ({ ...p, processing: false, result }));
            showToast('Background dihapus — preview siap. Klik "Simpan ke Asset" untuk konfirmasi.', 'success');
        } catch (err) {
            console.error('[RemoveBG] failed:', err);
            setRemoveBgState(p => ({ ...p, processing: false }));
            showToast('Gagal menghapus background: ' + err.message, 'error');
        }
    };

export const handleSaveRemoveBgResult = async (ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const { asset, result } = removeBgState;
        if (!asset || !result) return;
        try {
            const dims = await getImageDimensions(result);
            const updatedAsset = {
                ...asset,
                url: result,
                outputFormat: 'PNG',
                background: 'transparent',
                svgUrls: undefined,
                svgStats: undefined,
                resolution: {
                    ...(asset.resolution || {}),
                    width: dims.width,
                    height: dims.height,
                    wasUpscaled: false,
                    scaleFactor: 1,
                },
                stockMetadata: {
                    ...(asset.stockMetadata || {}),
                    backgroundMode: 'transparent',
                    backgroundVerified: true,
                },
            };
            await saveAssetDB(updatedAsset);
            setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
            if (selectedAssetDetail?.id === asset.id) setSelectedAssetDetail(updatedAsset);
            setRemoveBgState({
                isOpen: false,
                mode: 'single',
                asset: null,
                processing: false,
                progress: { current: 0, total: 0 },
                result: null,
                bulkDone: 0,
                bulkFailed: 0,
            });
            showToast('Asset diperbarui tanpa background  (PNG transparan)', 'success');
        } catch (err) {
            console.error('[RemoveBG] Save failed:', err);
            showToast('Gagal menyimpan hasil: ' + err.message, 'error');
        }
    };

export const openRevisionModal = (asset, e, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (e) e.stopPropagation();
        setRevisionState({ isOpen: true, asset, instruction: '', editMode: 'repaint', isRevising: false, revisedImageUrl: null });
        if (selectedAssetDetail) setSelectedAssetDetail(null);
    };


export const handleOpenImaginVideo = (asset: Asset, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        const videoUrl = systemSettings.imaginVideoUrl || 'https://labs.google/fx/tools/flow/shared/tool/6ab19380-04db-4e56-a285-1ee31d8f5c1e';
        try {
            const url = new URL(videoUrl);
            url.searchParams.set('assetName', asset.stockMetadata?.title || asset.title || 'Untitled');
            url.searchParams.set('assetUrl', asset.url || '');
            url.searchParams.set('prompt', asset.assembledPrompt || asset.prompt || asset.stockMetadata?.title || asset.title || '');
            window.open(url.toString(), '_blank');
        } catch {
            window.open(videoUrl, '_blank');
        }
    };

export const handleOpenAnimateForAsset = (sourceAsset: any, ctx) => {
        const { setSelectedAssetIds, selectedAssetIds, confirmBlocking, setAssets, showToast, revisionState, setRevisionState, systemSettings, apiKey, incrementApiCallCounter, vectorState, composeFinalPrompt, setHistoryLogs, setObjectModState, objectModState, setImportHubOpen, removeBgState, selectedAssetDetail, setSelectedAssetDetail, setSvgTraceModal, setAnimationV2Modal, referenceAnalysisTokenRef, setReferenceInferredSettings, setLastReferencePreview, setIsReferenceAnalyzing, vectorStateRef, setReferencePromptConfirmation, setPasteJsonInput, setPasteJsonErrors, setJsonModalTab, setImportPasteModalOpen, setBatchImportPreview } = ctx;
        if (!sourceAsset) return;
        setAnimationV2Modal(sourceAsset as Asset);
    };
