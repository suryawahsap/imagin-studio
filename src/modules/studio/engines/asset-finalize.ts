// @ts-nocheck — Studio asset finalize/upscale extracted verbatim from App.tsx.
// engines/asset-finalize.ts — dipindah dari App.tsx (Fase 6d/D5).
// Pure functions: upscale, background-verify/removal, dan finalizeAsset
// (encode + resolution policy + auto-upscale). Tidak ada React di sini.
import { RESOLUTION_POLICY, DEFAULT_RESOLUTION_TARGET, getFormatResolutionPolicy, minShortSideForMegapixels, megapixelsOf, fileSizeKBFromDataUrl } from '../utils';
import { getImageDimensions } from './quality';

// ponytail: komentar lama mengklaim kernel Lanczos-3 ada inline di sini — tidak
// pernah ada (referensi canvas juga tak punya `resizeImageDataLanczos`, jadi
// step-doubling di bawah adalah jalur aktual sejak awal). Upgrade path:
// implementasi Lanczos-3 sungguhan atau route ke modul Upscale (realesrgan-ncnn).


// JPEG quality untuk output photo — 0.94 memberikan balance antara file size
// dan kualitas visual yang sesuai standar Adobe Stock. Lebih tinggi dari 0.92
// yang dipakai di processGeneratedImage untuk compensate dengan upscale step.
const UPSCALE_JPEG_QUALITY = 0.94;

const autoUpscaleImage = async (dataUrl, targetShortSide = RESOLUTION_POLICY.RECOMMENDED_SHORT_SIDE, assetType = 'vector', forceScale = false, maxMegapixels = RESOLUTION_POLICY.MAXIMUM_MEGAPIXELS) => {
    // ── 0. Format output: ikuti format INPUT data URL.
    //   • Kalau input sudah JPEG (scene/photo yang diproses processGeneratedImage),
    //     output tetap JPEG — menghormati pilihan user & hindari double-compression.
    //   • Kalau input PNG (vector/icon/illustration dengan alpha), output PNG.
    //   • Tidak pakai assetType karena user bisa set photo → PNG atau vector → JPEG
    //     secara eksplisit, dan format itu sudah di-encode di dataUrl input.
    const inputIsJpeg = dataUrl.startsWith('data:image/jpeg');
    const toOutputUrl = (canvas) => inputIsJpeg
        ? canvas.toDataURL('image/jpeg', UPSCALE_JPEG_QUALITY)
        : canvas.toDataURL('image/png');

    // ── 1. Load gambar dan hitung skala yang dibutuhkan ──
    const img = await new Promise((res, rej) => {
        const el = new window.Image();
        el.crossOrigin = 'Anonymous';
        el.onload  = () => res(el);
        el.onerror = () => rej(new Error('img load failed'));
        el.src = dataUrl;
    }).catch(() => null);

    if (!img) return { dataUrl, upscaled: false, width: 0, height: 0 };

    const { width: origW, height: origH } = img;
    const shortSide = Math.min(origW, origH);
    const currentMp = megapixelsOf(origW, origH);
    const maxSafeScale = currentMp > 0 ? Math.sqrt(maxMegapixels / currentMp) : 1;

    if (shortSide >= targetShortSide) {
        return { dataUrl, upscaled: false, width: origW, height: origH };
    }

    const rawScale = targetShortSide / shortSide;
    const scale    = Math.min(rawScale, RESOLUTION_POLICY.MAX_UPSCALE_FACTOR, maxSafeScale);
    if (scale <= 1.0001) {
        return { dataUrl, upscaled: false, width: origW, height: origH };
    }
    const newW     = Math.round(origW * scale);
    const newH     = Math.round(origH * scale);

    // ── 2. Siapkan source canvas ──
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width  = origW;
    srcCanvas.height = origH;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return { dataUrl, upscaled: false, width: 0, height: 0 };
    srcCtx.drawImage(img, 0, 0);

    // ── 3. Cek apakah asset punya alpha channel (transparan) ──
    // Real-ESRGAN hanya proses RGB — kalau ada alpha, kita simpan alpha map
    // dulu lalu gabungkan kembali setelah upscale.
    const hasAlpha = (() => {
        try {
            const sample = srcCtx.getImageData(0, 0, origW, origH).data;
            for (let i = 3; i < sample.length; i += 4) {
                if (sample[i] < 255) return true;
            }
            return false;
        } catch { return false; }
    })();

    // ── 5. Canvas step-doubling upscale ──
    let curW = origW, curH = origH;
    let canvas = srcCanvas;
    while (curW < newW || curH < newH) {
        const nextW      = Math.min(curW * 2, newW);
        const nextH      = Math.min(curH * 2, newH);
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width  = nextW;
        nextCanvas.height = nextH;
        const ctx = nextCanvas.getContext('2d');
        if (!ctx) return { dataUrl, upscaled: false, width: 0, height: 0 };
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, nextW, nextH);
        canvas = nextCanvas;
        curW = nextW;
        curH = nextH;
    }
    return {
        dataUrl:     toOutputUrl(canvas),
        upscaled:    true,
        width:       newW,
        height:      newH,
        scaleFactor: scale,
        engine:      'canvas',
    };
};

const verifyBackgroundUniformity = (ctx, width, height, tolerance = 12) => {
    try {
        const sample = (x, y) => ctx.getImageData(x, y, 1, 1).data;
        // FIX BUG D: hanya 4 corner tidak robust terhadap vignette/shadow di
        // tepi. Sampling 8 titik (4 corner + 4 midpoint tepi) memberi cakupan
        // lebih baik. Toleransi tetap 12 untuk near-white detection.
        const samplePoints = [
            sample(0, 0),
            sample(width - 1, 0),
            sample(0, height - 1),
            sample(width - 1, height - 1),
            sample(Math.floor(width / 2), 0),
            sample(Math.floor(width / 2), height - 1),
            sample(0, Math.floor(height / 2)),
            sample(width - 1, Math.floor(height / 2)),
        ];
        const [r0, g0, b0] = samplePoints[0];
        return samplePoints.every(([r, g, b]) =>
            Math.abs(r - r0) <= tolerance &&
            Math.abs(g - g0) <= tolerance &&
            Math.abs(b - b0) <= tolerance
        );
    } catch (e) {
        console.warn('Background uniformity check failed', e);
        return false;
    }
};

const processGeneratedImage = (base64Data, bgMode, outputFormat = 'PNG', assetType = 'vector', styleKey = '') => {
    // BUG FIX: processGeneratedImage sebelumnya selalu output PNG untuk semua
    // mode kecuali 'scene' — mengabaikan outputFormat yang dipilih user.
    // Akibat: asset.url tersimpan sebagai PNG lossless (bisa 9+ MB untuk
    // ilustrasi kompleks), tapi saat download di-re-encode ke JPEG (824 KB).
    // Label size di UI menampilkan PNG size, file yang didownload adalah JPEG —
    // perbedaan bisa 10x lipat.
    // Fix: terima parameter outputFormat dan encode sesuai pilihan user.
    // Catatan: mode 'transparent'/'auto' dengan background removal WAJIB PNG
    // (alpha channel tidak bisa disimpan di JPEG) — ini tetap dipertahankan.
    const wantsJpeg = outputFormat === 'JPEG';
    const JPEG_QUALITY = 0.92;
    const encodeAsJpeg = (canvas) => canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const encodeAsPng  = (canvas) => canvas.toDataURL('image/png');

    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { resolve({ dataUrl: base64Data, backgroundVerified: false }); return; }

            let backgroundVerified = false;

            if (bgMode.toLowerCase() === 'white' || bgMode.toLowerCase() === 'gradient') {
                // FIX BUG A: 'gradient' adalah pseudo-mode dari BACKGROUND_STRATEGY
                // (lihat resolveBackground: gradient.mode === 'white'). Perilaku render-nya
                // identik dengan white — solid opaque fill, BUKAN background removal.
                // Sebelumnya gradient jatuh ke else (transparent removal) karena toLowerCase
                // !== 'white', sehingga asset di-strip alpha-nya bukan diberi solid fill.
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                backgroundVerified = verifyBackgroundUniformity(ctx, canvas.width, canvas.height);
                // White/gradient bg = solid opaque → JPEG aman dipakai jika user memilihnya.
                resolve({ dataUrl: wantsJpeg ? encodeAsJpeg(canvas) : encodeAsPng(canvas), backgroundVerified });
                return;
            } else if (bgMode.toLowerCase() === 'greenscreen') {
                // Chroma key green: #00B140 (broadcast-safe green screen standard)
                ctx.fillStyle = '#00B140';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                // Verify corners are green
                const sample = ctx.getImageData(0, 0, 1, 1).data;
                backgroundVerified = sample[1] > 100 && sample[0] < 50 && sample[2] < 80;
                // Greenscreen = solid opaque → JPEG aman dipakai jika user memilihnya.
                resolve({ dataUrl: wantsJpeg ? encodeAsJpeg(canvas) : encodeAsPng(canvas), backgroundVerified });
                return;
            } else if (bgMode.toLowerCase() === 'scene') {
                // Photo full-frame: draw as-is — tidak ada background removal maupun
                // uniformity check (scene adalah environment context, bukan solid).
                // Scene selalu JPEG — konsisten dengan perilaku sebelumnya.
                ctx.drawImage(img, 0, 0);
                backgroundVerified = true;
                resolve({ dataUrl: encodeAsJpeg(canvas), backgroundVerified });
                return;
            } else {
                // Mode transparent/auto: 3-layer background removal.
                // WAJIB PNG — alpha channel tidak bisa disimpan di JPEG.
                ctx.drawImage(img, 0, 0);
                removeBackground3Layer(ctx, canvas.width, canvas.height, assetType, styleKey);
                const corners = ctx.getImageData(0, 0, 1, 1).data;
                backgroundVerified = corners[3] === 0;
                resolve({ dataUrl: encodeAsPng(canvas), backgroundVerified });
                return;
            }
        };
        img.onerror = () => reject(new Error('Image processing failed'));
        img.src = base64Data;
    });
};

const finalizeAsset = async (rawImageUrl, bgMode, assetType = 'vector', upscaleMode = 'auto', aspectRatio = '4:3', outputFormat = 'PNG', styleKey = '', resolutionTarget = DEFAULT_RESOLUTION_TARGET) => {
    const { dataUrl: processedUrl, backgroundVerified } = await processGeneratedImage(rawImageUrl, bgMode, outputFormat, assetType, styleKey);
    const resolutionPolicy = getFormatResolutionPolicy(outputFormat, resolutionTarget);

    const dims = await getImageDimensions(processedUrl);
    const shortSide = Math.min(dims.width, dims.height);
    // PHASE P0 / Adobe guidelines: min short side DIPAKSA ke 4MP untuk aspek rasio
    // ini (bukan konstanta 1500px yang cuma 2.25MP di 1:1). Up-scale otomatis bila perlu.
    const minShortForMp = minShortSideForMegapixels(aspectRatio, resolutionPolicy.minimumMegapixels);
    const recShortForMp = minShortSideForMegapixels(aspectRatio, resolutionPolicy.recommendedMegapixels);
    const needsUpscale = shortSide < minShortForMp;

    let finalUrl = processedUrl;
    let upscaleResult = { upscaled: false, width: dims.width, height: dims.height };

    if (upscaleMode === 'auto' && needsUpscale) {
        const upscaled = await autoUpscaleImage(processedUrl, recShortForMp, assetType, false, resolutionPolicy.maximumMegapixels);
        finalUrl = upscaled.dataUrl;
        upscaleResult = upscaled;
    }

    const finalDims = await getImageDimensions(finalUrl);
    const finalMp = megapixelsOf(finalDims.width, finalDims.height);
    const resolutionVerified = finalMp >= resolutionPolicy.minimumMegapixels && finalMp <= resolutionPolicy.maximumMegapixels;
    const fileSizeKB = fileSizeKBFromDataUrl(finalUrl);
    const fileSizeOk = fileSizeKB <= resolutionPolicy.maxFileSizeMB * 1024;

    return {
        dataUrl: finalUrl,
        backgroundVerified,
        resolutionVerified,
        width: finalDims.width,
        height: finalDims.height,
        wasUpscaled: upscaleResult.upscaled,
        upscaleScaleFactor: upscaleResult.scaleFactor || 1,
        upscaleEngine: upscaleResult.engine || 'none',
        originalDims: { width: dims.width, height: dims.height },
        meetsRecommended: finalMp >= resolutionPolicy.recommendedMegapixels,
        megapixels: Math.round(finalMp * 10) / 10,
        fileSizeKB,
        fileSizeOk,
    };
};

// removeBackground3Layer — 3-layer background removal pipeline
//
// Menggantikan flood-fill lama yang bermasalah saat objek berwarna putih/abu-abu
// (warna objek mirip warna background → pixel objek ikut terhapus).
//
// Layer 1 — Core BG Removal (flood fill sangat ketat)
//   Tolerance diturunkan per assetType. Hanya hapus pixel yang SANGAT mirip
//   warna background corner — tidak menyentuh putih/abu dalam objek.
//
// Layer 2 — Alpha Matting di zona transisi (fringe ≤ 0.5–1px)
//   Pixel di "zona tepi" (berdekatan dengan boundary antara bg dan fg) dihitung
//   alpha-nya secara proporsional terhadap jarak warna dari bg. Ini menghasilkan
//   soft edge yang natural tanpa fringe keras.
//
// Layer 3 — Interior Guard (enclosed pixel restoration)
//   Setelah Layer 1+2, scan seluruh canvas. Pixel yang alpha-nya 0 tapi
//   dikelilingi (enclosed) pixel non-transparan di semua 4 arah → restore
//   alpha ke 255. Ini melindungi putih/abu di dalam objek (highlight, fill
//   putih, watercolor wash internal).
//
// Parameter per assetType:
//   icon/vector : coreTol=12, fringeTol=22, mattingRadius=1  → tepi keras, ≤0.5px fringe
//   illustration: coreTol=15, fringeTol=28, mattingRadius=2  → soft edge moderate
//   coreTol=12, fringeTol=24, mattingRadius=1  → tepi cukup keras
//   photo       : coreTol=18, fringeTol=32, mattingRadius=2  → paling lembut
//   default     : coreTol=15, fringeTol=25, mattingRadius=2
const removeBackground3Layer = (ctx, width, height, assetType = 'vector', styleKey = '') => {
    // ── Parameter per assetType + styleKey ───────────────────────────────────
    // styleKey memungkinkan watercolor/vibrantWatercolor mendapat parameter
    // khusus tanpa mengubah assetType (keduanya masuk sebagai 'illustration').
    //
    // Karakteristik watercolor yang berbeda dari illustration biasa:
    //  • Background bukan putih bersih — cream/off-white dengan paper texture,
    //    warm tint, kadang subtle gradient dari center ke tepi.
    //  • Edge objek sangat soft/gradual — pigmen meresap ke kertas, tidak ada
    //    hard edge. Zona fringe jauh lebih lebar (bisa 40–60px di gambar 2000px).
    //  • Interior objek punya transparansi natural (wash pigment tipis di highlight).
    //    Interior Guard harus LEBIH KONSERVATIF agar tidak restore area wash valid.
    //  • coreTol harus lebih tinggi untuk toleransi cream/off-white bg.
    //  • fringeTol harus jauh lebih tinggi untuk tangkap soft paint edge.
    //  • mattingRadius lebih besar untuk smooth transition di zona soft edge.
    //  • interiorGuardThreshold lebih rendah untuk proteksi wash interior.
    const PARAMS_BY_ASSET: Record<string, { coreTol: number; fringeTol: number; mattingRadius: number; interiorGuardThreshold: number }> = {
        icon:         { coreTol: 18, fringeTol: 28, mattingRadius: 1, interiorGuardThreshold: 32 },
        vector:       { coreTol: 18, fringeTol: 28, mattingRadius: 1, interiorGuardThreshold: 32 },
        illustration: { coreTol: 22, fringeTol: 32, mattingRadius: 2, interiorGuardThreshold: 32 },
        '3d':         { coreTol: 18, fringeTol: 28, mattingRadius: 1, interiorGuardThreshold: 32 },
        photo:        { coreTol: 24, fringeTol: 36, mattingRadius: 2, interiorGuardThreshold: 32 },
    };
    // Style-level overrides — lebih spesifik dari assetType.
    // Key adalah normalizedStyleKey (lowercase, no spaces/underscore/dash).
    // Setiap COMMERCIAL_ILLUSTRATION_STYLES (17 style) punya entry + beberapa
    // alias umum (mis. 'watercolor' = 'vintagewatercolor' dll).
    const PARAMS_BY_STYLE: Record<string, { coreTol: number; fringeTol: number; mattingRadius: number; interiorGuardThreshold: number }> = {
        // ── Watercolor family: cream/off-white bg, soft edge, wash interior ──
        // guardT rendah (12) supaya wash pigment semi-transparan (alpha 12-25)
        // tidak direstore jadi opaque. fringeT tinggi (60) untuk wet-edge bleeding
        // yang khas watercolor (pigmen meresap ke kertas).
        watercolor:       { coreTol: 30, fringeTol: 60, mattingRadius: 3, interiorGuardThreshold: 12 },
        // Vibrant watercolor: white bg (cleaner), soft edge tapi kontras lebih tinggi
        // fringeT 50, guardT 18 (lebih tinggi dari vintage watercolor karena vibrant
        // lebih kontras, lebih banyak opaque area).
        vibrantwatercolor:{ coreTol: 26, fringeTol: 50, mattingRadius: 3, interiorGuardThreshold: 18 },
        // ── Painterly/Texture family: opaque paint, textured bg, medium edge ──
        acrylicpainterly: { coreTol: 20, fringeTol: 36, mattingRadius: 2, interiorGuardThreshold: 30 },
        // Mixed media collage: textured paper bg (paper grain noise) — coreT tinggi (26)
        // supaya noise tidak dianggap "foreground". fringe 42.
        mixedmediacollage:{ coreTol: 26, fringeTol: 42, mattingRadius: 2, interiorGuardThreshold: 24 },
        // Textured editorial: paper texture, magazine-style, soft edges
        texturededitorial:{ coreTol: 24, fringeTol: 40, mattingRadius: 2, interiorGuardThreshold: 24 },
        // Hand-drawn organic: cream bg, organic variable stroke (brush-pen)
        // guardT rendah (22) supaya wobbly line / internal detail tidak dianggap wash
        handdrawnorganic: { coreTol: 24, fringeTol: 42, mattingRadius: 2, interiorGuardThreshold: 22 },
        // ── Hard-edge flat family: white bersih, sharp edge, no wash ──
        // coreT rendah (16) karena flat biasanya pure white bg, no grain
        flatcommercial:   { coreTol: 16, fringeTol: 26, mattingRadius: 1, interiorGuardThreshold: 32 },
        flatrounded:      { coreTol: 16, fringeTol: 26, mattingRadius: 1, interiorGuardThreshold: 32 },
        cutekidsnursery:  { coreTol: 18, fringeTol: 28, mattingRadius: 1, interiorGuardThreshold: 32 },
        cutefoodobject:   { coreTol: 18, fringeTol: 28, mattingRadius: 1, interiorGuardThreshold: 32 },
        seamlesspattern:  { coreTol: 16, fringeTol: 26, mattingRadius: 1, interiorGuardThreshold: 32 },
        boldfilled:       { coreTol: 18, fringeTol: 26, mattingRadius: 1, interiorGuardThreshold: 32 },
        // ── Outline family: thin stroke, no fill ──
        // coreT sangat rendah (14) untuk thin stroke 1.5-2px, fringe 22 (narrow)
        minimaloutline:   { coreTol: 14, fringeTol: 22, mattingRadius: 1, interiorGuardThreshold: 30 },
        // ── Editorial/Corporate family: white bg, medium edge ──
        // guardT 28 untuk preserve internal scene details (background, foreground)
        editorialscene:   { coreTol: 20, fringeTol: 32, mattingRadius: 2, interiorGuardThreshold: 28 },
        linealcolor:      { coreTol: 20, fringeTol: 32, mattingRadius: 2, interiorGuardThreshold: 28 },
        // ── 3D / Gradient family: soft shadow, more tolerance ──
        // guardT 26 untuk preserve 3D shadow / gradient body interior
        isometric3d:      { coreTol: 22, fringeTol: 36, mattingRadius: 2, interiorGuardThreshold: 26 },
        gradientcartoon:  { coreTol: 22, fringeTol: 36, mattingRadius: 2, interiorGuardThreshold: 26 },
    };
    // Normalize styleKey: resolvedStyle dari DB bisa mixed case / spaced
    const normalizedStyleKey = (styleKey || '').toLowerCase().replace(/[\s_-]/g, '');
    // Map alias → canonical style key. Hanya tulis alias yang BERBEDA dari
    // canonical key (alias = input user, value = canonical PARAMS_BY_STYLE key).
    // Alias sudah normalized (lowercase, no spaces/underscore/dash), jadi
    // 'Watercolor' dari user jadi 'watercolor' → maps ke 'watercolor'.
    const styleKeyMap: Record<string, string> = {
        // Watercolor aliases → canonical 'watercolor'
        'vintagewatercolor': 'watercolor',
        'watercolorvintage': 'watercolor',
        'watercolovintage': 'watercolor',
        // Watercolor Vibrant aliases → canonical 'vibrantwatercolor'
        'watercolorvibrant': 'vibrantwatercolor',
        'watercolovibrant': 'vibrantwatercolor',
        // Painterly aliases → canonical 'acrylicpainterly'
        'acrylic': 'acrylicpainterly',
        'painterly': 'acrylicpainterly',
        // Mixed media aliases → canonical 'mixedmediacollage'
        'mixedmedia': 'mixedmediacollage',
        'collage': 'mixedmediacollage',
        // Textured aliases → canonical 'texturededitorial'
        'textured': 'texturededitorial',
        // Hand-drawn aliases → canonical 'handdrawnorganic'
        'handdrawn': 'handdrawnorganic',
        'handdrawnorganics': 'handdrawnorganic',
        // Flat aliases → canonical 'flatcommercial'
        'flat': 'flatcommercial',
        'flatrounded': 'flatrounded',
        'rounded': 'flatrounded',
        'cutekids': 'cutekidsnursery',
        'kidsnursery': 'cutekidsnursery',
        'cutefood': 'cutefoodobject',
        'foodobject': 'cutefoodobject',
        'pattern': 'seamlesspattern',
        'seamless': 'seamlesspattern',
        'filled': 'boldfilled',
        // Outline aliases → canonical 'minimaloutline'
        'minimal': 'minimaloutline',
        'outline': 'minimaloutline',
        // Editorial aliases → canonical 'editorialscene'
        'editorial': 'editorialscene',
        // Lineal aliases → canonical 'linealcolor'
        'lineal': 'linealcolor',
        'linealcolour': 'linealcolor',
        // 3D / Gradient aliases → canonical
        'isometric': 'isometric3d',
        '3d': 'isometric3d',
        'gradient': 'gradientcartoon',
    };
    const resolvedStyleKey = styleKeyMap[normalizedStyleKey] || null;
    const { coreTol, fringeTol, mattingRadius, interiorGuardThreshold } =
        (resolvedStyleKey && PARAMS_BY_STYLE[resolvedStyleKey])
        || PARAMS_BY_ASSET[assetType]
        || { coreTol: 20, fringeTol: 30, mattingRadius: 2, interiorGuardThreshold: 32 };

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const n = width * height;
    const idxOf = (x, y) => y * width + x;

    // ── Sample background color dari 4 corner + 4 midpoint tepi + center ─────
    // FIX BUG B (cont.): sebelumnya hanya 8 titik tepi. Tambah sampling dari
    // area dalam (offset ~5% dari tepi) untuk menghindari AI-generated vignette
    // / shadow di border yang bisa miss. Median lebih robust dari mean untuk
    // kasus outlier (1-2 titik tepi sangat gelap).
    const samplePx = (x, y) => { const i = idxOf(x, y) * 4; return [data[i], data[i+1], data[i+2]]; };
    const inset = Math.max(2, Math.floor(Math.min(width, height) * 0.05));
    const bgSamplePoints = [
        // 4 corner
        samplePx(0, 0), samplePx(width-1, 0),
        samplePx(0, height-1), samplePx(width-1, height-1),
        // 4 tepi (midpoint)
        samplePx(Math.floor(width/2), 0), samplePx(Math.floor(width/2), height-1),
        samplePx(0, Math.floor(height/2)), samplePx(width-1, Math.floor(height/2)),
        // 4 inset (offset 5% dari tepi, fallback ke corner kalau canvas kecil)
        samplePx(inset, inset), samplePx(width-1-inset, inset),
        samplePx(inset, height-1-inset), samplePx(width-1-inset, height-1-inset),
    ];
    // Median per-channel: lebih robust dari mean untuk menolak outlier
    // (mis. 1-2 corner dengan vignette/shadow yang sangat berbeda).
    const median3 = (vals) => {
        const s = [...vals].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : Math.round((s[m-1] + s[m]) / 2);
    };
    const bgR = median3(bgSamplePoints.map(c => c[0]));
    const bgG = median3(bgSamplePoints.map(c => c[1]));
    const bgB = median3(bgSamplePoints.map(c => c[2]));

    // ── Watercolor: perceptual luminance distance ─────────────────────────────
    // Watercolor background sering cream/off-white (R≈248, G≈242, B≈232) dengan
    // paper tooth texture. Euclidean RGB distance kurang optimal karena mata
    // lebih sensitif ke luminance (Y channel) daripada chroma untuk near-white.
    // Untuk watercolor gunakan distance yang lebih condong ke luminance supaya
    // cream near-white dan white near-cream tetap dianggap "sama warna" bg.
    const isWatercolorMode = resolvedStyleKey === 'watercolor' || resolvedStyleKey === 'vibrantWatercolor';
    const colorDist = (i4) => {
        const dr = data[i4]   - bgR;
        const dg = data[i4+1] - bgG;
        const db = data[i4+2] - bgB;
        if (isWatercolorMode) {
            // Weighted perceptual distance: lebih toleran ke warm/cool tint
            // sehingga cream bg (#F8F2E8 style) yang sedikit berwarna tetap
            // dianggap background. Bobot Y-channel (0.299R + 0.587G + 0.114B).
            const lumaD = 0.299 * dr + 0.587 * dg + 0.114 * db;
            const chromaD = Math.sqrt(
                (dr - lumaD) * (dr - lumaD) * 0.3 +
                (dg - lumaD) * (dg - lumaD) * 0.3 +
                (db - lumaD) * (db - lumaD) * 0.3
            );
            return Math.abs(lumaD) * 0.7 + chromaD * 0.3;
        }
        return Math.sqrt(dr*dr + dg*dg + db*db);
    };

    // ── LAYER 1: Core flood fill (tolerance sangat ketat) ────────────────────
    // Seed dari semua pixel di 4 tepi yang benar-benar dekat warna bg.
    // Flood hanya menyebar ke pixel yang dist ≤ coreTol — tidak menyentuh
    // warna objek meski itu putih/abu, karena threshold sangat rendah.
    const visited  = new Uint8Array(n); // 1 = visited by flood
    const isBgCore = (pi) => colorDist(pi * 4) <= coreTol;
    const stack = [];

    const seedEdge = (x, y) => {
        const pi = idxOf(x, y);
        if (!visited[pi] && isBgCore(pi)) { visited[pi] = 1; stack.push(pi); }
    };
    for (let x = 0; x < width;  x++) { seedEdge(x, 0); seedEdge(x, height-1); }
    for (let y = 1; y < height-1; y++) { seedEdge(0, y); seedEdge(width-1, y); }

    while (stack.length) {
        const pi = stack.pop();
        data[pi * 4 + 3] = 0; // hapus alpha
        const x = pi % width, y = Math.floor(pi / width);
        const neighbors = [
            x > 0          ? idxOf(x-1, y) : -1,
            x < width-1    ? idxOf(x+1, y) : -1,
            y > 0          ? idxOf(x, y-1) : -1,
            y < height-1   ? idxOf(x, y+1) : -1,
        ];
        for (const np of neighbors) {
            if (np >= 0 && !visited[np] && isBgCore(np)) { visited[np] = 1; stack.push(np); }
        }
    }

    // ── LAYER 2: Alpha matting di zona fringe ────────────────────────────────
    // Scan pixel yang belum di-flood (visited=0, alpha masih 255) tapi
    // warna masuk rentang fringeTol. Hitung alpha proporsional:
    //   dist ≤ coreTol  → alpha = 0   (sudah ditangani Layer 1)
    //   coreTol < dist ≤ fringeTol → alpha lerp 0→255
    //   dist > fringeTol → alpha = 255 (tidak disentuh)
    //
    // Hanya pixel yang berdekatan (dalam mattingRadius) dengan pixel
    // yang sudah transparan yang di-matte — ini memastikan matting
    // hanya terjadi di zona transisi, bukan di tengah objek.
    const alphaMap = new Float32Array(n).fill(255);
    // Baca alpha map dari hasil Layer 1
    for (let pi = 0; pi < n; pi++) alphaMap[pi] = data[pi * 4 + 3];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pi = idxOf(x, y);
            if (alphaMap[pi] === 0) continue; // sudah transparan dari Layer 1
            const dist = colorDist(pi * 4);
            if (dist > fringeTol) continue; // jauh dari warna bg, aman

            // Cek apakah ada tetangga transparan dalam mattingRadius
            let hasTransparentNeighbor = false;
            outer: for (let dy = -mattingRadius; dy <= mattingRadius; dy++) {
                for (let dx = -mattingRadius; dx <= mattingRadius; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (alphaMap[idxOf(nx, ny)] === 0) { hasTransparentNeighbor = true; break outer; }
                }
            }
            if (!hasTransparentNeighbor) continue;

            // Lerp alpha: dist=coreTol → alpha=0, dist=fringeTol → alpha=255
            const t = Math.max(0, Math.min(1, (dist - coreTol) / Math.max(1, fringeTol - coreTol)));
            data[pi * 4 + 3] = Math.round(t * 255);
        }
    }

    // ── LAYER 3: Interior Guard ───────────────────────────────────────────────
    // Pixel yang alpha-nya 0 atau sangat rendah TAPI enclosed (dikelilingi
    // pixel non-transparan dari semua 4 sisi kardinal) → restore ke 255.
    // Ini melindungi:
    //   • Putih di dalam objek (highlight, fill putih)
    //   • Abu-abu watercolor internal
    //   • Celah kecil di dalam kontur objek
    //
    // Algoritma: flood fill dari tepi canvas pada pixel TRANSPARAN.
    // Pixel transparan yang TIDAK terjangkau flood = enclosed → restore.
    //
    // FIX BUG C: threshold '< 128' terlalu longgar. Pixel semi-transparan
    // (alpha 128-254) hasil Layer 2 fringe akan ikut di-restore jika
    // enclosed, padahal itu bukan "transparan murni" — itu pixel di zona
    // transisi yang sengaja di-matte sebagian. Turunkan threshold ke '< 32'
    // (≈12% alpha) agar hanya pixel benar-benar transparan (≈ 0) yang
    // diperlakukan sebagai "transparent hole" dan diuji enclosed-nya.
    const reachable = new Uint8Array(n); // 1 = bisa dijangkau dari tepi
    // interiorGuardThreshold sudah di-resolve dari PARAMS_BY_STYLE / PARAMS_BY_ASSET di atas.
    // Watercolor: 16 (konservatif — jangan restore wash interior tipis)
    // Default:    32 (pixel Layer 1 flood yang benar-benar dihapus)
    const INTERIOR_GUARD_THRESHOLD = interiorGuardThreshold;

    const stack3 = [];
    const seedEdge3 = (x, y) => {
        const pi = idxOf(x, y);
        if (!reachable[pi] && data[pi * 4 + 3] < INTERIOR_GUARD_THRESHOLD) { reachable[pi] = 1; stack3.push(pi); }
    };
    for (let x = 0; x < width;  x++) { seedEdge3(x, 0); seedEdge3(x, height-1); }
    for (let y = 1; y < height-1; y++) { seedEdge3(0, y); seedEdge3(width-1, y); }

    while (stack3.length) {
        const pi = stack3.pop();
        const x = pi % width, y = Math.floor(pi / width);
        const neighbors = [
            x > 0          ? idxOf(x-1, y) : -1,
            x < width-1    ? idxOf(x+1, y) : -1,
            y > 0          ? idxOf(x, y-1) : -1,
            y < height-1   ? idxOf(x, y+1) : -1,
        ];
        for (const np of neighbors) {
            if (np >= 0 && !reachable[np] && data[np * 4 + 3] < INTERIOR_GUARD_THRESHOLD) {
                reachable[np] = 1; stack3.push(np);
            }
        }
    }

    // Restore pixel transparan yang tidak reachable (= enclosed di dalam objek)
    for (let pi = 0; pi < n; pi++) {
        if (data[pi * 4 + 3] < INTERIOR_GUARD_THRESHOLD && !reachable[pi]) {
            data[pi * 4 + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // [09.07d] Side-effect observability: expose resolved params ke window
    // untuk runtime test di Console (__imaginStyleParams). Hanya set kalau
    // belum ada (first call) — pola inisialisasi ringan, tidak mengganggu
    // hot path bg removal yang dipanggil tiap generate.
    if (typeof window !== 'undefined' && !(window as any).__imaginStyleParams) {
        (window as any).__imaginStyleParams = PARAMS_BY_STYLE;
    }
};

export { UPSCALE_JPEG_QUALITY, autoUpscaleImage, verifyBackgroundUniformity, processGeneratedImage, finalizeAsset, removeBackground3Layer };
