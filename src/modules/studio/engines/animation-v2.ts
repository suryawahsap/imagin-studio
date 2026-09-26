// Animation Engine V2 — diekstrak dari App.tsx baris 8605–9673.
// Trace-based, asset-faithful animation pipeline: spatial clustering (no AI) →
// AI semantic labeling → AI animation planning → preview HTML → ZIP export.
// Flow diringkas di header asli App.tsx; lihat pipeline.md untuk audit lengkap.

import type { Asset, SystemSettings, AnimV2Package, AnimV2Track, AnimV2Emitter, AnimV2LabeledElement, AnimV2LabelResult } from "../types";
import { callGeminiForJSON } from "./generation";
import { saveAssetDB } from "./storage";

export type { AnimV2Package, AnimV2Track, AnimV2Emitter, AnimV2LabeledElement, AnimV2LabelResult };

export interface AnimV2Keyframe {
    time: number;       // ms dari awal
    value: string;      // CSS value (transform string, opacity, dll)
    easing?: string;
}

export interface AnimV2Progress {
    pct: number;
    label: string;
}

const loadJSZip = async (): Promise<any> => {
    if ((window as any).JSZip) return (window as any).JSZip;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve((window as any).JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// ─── SPATIAL CLUSTERING (deterministik, no AI) ──────────────────────────────
// Kelompokkan <path>/<circle>/<rect>/<ellipse>/<polygon>/<polyline>
// ke dalam <g> cluster berdasarkan proximity bounding box.
// Tujuan: kurangi ratusan paths menjadi 5–15 cluster semantik
// sebelum dikirim ke AI untuk labeling.

export function parseSvgViewBox(svgStr: string): { width: number; height: number; viewBox: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgStr, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return { width: 800, height: 800, viewBox: '0 0 800 800' };
    const vb = svg.getAttribute('viewBox') || '';
    const parts = vb.split(/\s+/).map(Number);
    const w = parts[2] || parseFloat(svg.getAttribute('width') || '800') || 800;
    const h = parts[3] || parseFloat(svg.getAttribute('height') || '800') || 800;
    return { width: w, height: h, viewBox: vb || `0 0 ${w} ${h}` };
}

export function decodeAnimV2SvgDataUrl(value: string): string {
    const comma = value.indexOf(',');
    if (comma < 0) throw new Error('Invalid SVG data URL');
    const body = value.slice(comma + 1);
    if (/;base64,/i.test(value.slice(0, comma + 1))) {
        const bytes = Uint8Array.from(atob(body), c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(body);
}

export function sanitizeAnimV2Package(pkg: AnimV2Package, svg: string): AnimV2Package {
    const duration = Number.isFinite(pkg.totalDuration) ? Math.min(60000, Math.max(1, pkg.totalDuration)) : 3000;
    const allowed = new Set(['transform', 'opacity', 'fill', 'stroke-width']);
    const tracks = (Array.isArray(pkg.tracks) ? pkg.tracks : []).flatMap((track: any) => {
        if (!track || typeof track.target !== 'string' || !allowed.has(track.property)) return [];
        const keyframes = (Array.isArray(track.keyframes) ? track.keyframes : [])
            .filter((k: any) => k && typeof k.value === 'string' && Number.isFinite(k.time))
            .map((k: any) => ({ ...k, time: Math.min(duration, Math.max(0, k.time)) }))
            .sort((a: any, b: any) => a.time - b.time);
        return keyframes.length >= 2 ? [{ ...track, keyframes }] : [];
    });
    const emitters = Array.isArray(pkg.emitters) ? pkg.emitters.filter((e: any) => e && e.type === 'particle') : [];
    return { ...pkg, canvas: { ...pkg.canvas, viewBox: parseSvgViewBox(svg).viewBox }, totalDuration: duration, tracks, emitters };
}

function getElementBBox(el: SVGGraphicsElement): { x: number; y: number; width: number; height: number } | null {
    try {
        // getBBox() hanya jalan di attached DOM, jadi kita pakai container sementara
        const container = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden';
        document.body.appendChild(container);
        const clone = el.cloneNode(true) as SVGGraphicsElement;
        container.appendChild(clone);
        const bb = (clone as any).getBBox();
        document.body.removeChild(container);
        if (bb.width === 0 && bb.height === 0) return null;
        return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
    } catch {
        return null;
    }
}

function bboxCenter(bb: { x: number; y: number; width: number; height: number }) {
    return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 };
}

function bboxDist(a: { x: number; y: number; width: number; height: number },
                  b: { x: number; y: number; width: number; height: number }): number {
    const ca = bboxCenter(a);
    const cb = bboxCenter(b);
    return Math.sqrt((ca.cx - cb.cx) ** 2 + (ca.cy - cb.cy) ** 2);
}

function bboxArea(bb: { x: number; y: number; width: number; height: number }) {
    return bb.width * bb.height;
}

// Union dua bounding box
function bboxUnion(a: { x: number; y: number; width: number; height: number },
                   b: { x: number; y: number; width: number; height: number }) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: x2 - x, height: y2 - y };
}

export function spatialClusterPaths(svgStr: string, canvasSize: { width: number; height: number }): {
    clusteredSvg: string;
    clusters: { id: string; bbox: { x: number; y: number; width: number; height: number } }[];
} {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgStr, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return { clusteredSvg: svgStr, clusters: [] };

    const PRIMITIVE_TAGS = ['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line'];
    const primitives = Array.from(svgEl.querySelectorAll(PRIMITIVE_TAGS.join(','))) as SVGGraphicsElement[];

    if (primitives.length === 0) return { clusteredSvg: svgStr, clusters: [] };

    // Threshold: elemen dalam jarak 15% diagonal canvas dianggap satu cluster
    const diagonal = Math.sqrt(canvasSize.width ** 2 + canvasSize.height ** 2);
    const DIST_THRESHOLD = diagonal * 0.15;

    // Collect bbox per primitive — pakai attribut geometri sebagai estimasi
    // (getBBox tidak jalan di detached SVG tanpa mount ke DOM)
    type PrimInfo = { el: SVGGraphicsElement; bbox: { x: number; y: number; width: number; height: number } | null; clusterId: number };
    const infos: PrimInfo[] = primitives.map(el => {
        // Estimasi bbox dari atribut
        let bbox: { x: number; y: number; width: number; height: number } | null = null;
        const tag = el.tagName.toLowerCase();
        if (tag === 'circle') {
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const r = parseFloat(el.getAttribute('r') || '10');
            bbox = { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
        } else if (tag === 'rect') {
            bbox = {
                x: parseFloat(el.getAttribute('x') || '0'),
                y: parseFloat(el.getAttribute('y') || '0'),
                width: parseFloat(el.getAttribute('width') || '10'),
                height: parseFloat(el.getAttribute('height') || '10'),
            };
        } else if (tag === 'ellipse') {
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const rx = parseFloat(el.getAttribute('rx') || '10');
            const ry = parseFloat(el.getAttribute('ry') || '10');
            bbox = { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
        } else if (tag === 'path') {
            // Ambil titik pertama dari 'd' untuk estimasi kasar
            const d = el.getAttribute('d') || '';
            const nums = d.match(/[-\d.]+/g)?.slice(0, 4).map(Number) || [0, 0, 50, 50];
            bbox = { x: nums[0] ?? 0, y: nums[1] ?? 0, width: nums[2] ?? 50, height: nums[3] ?? 50 };
        }
        return { el, bbox, clusterId: -1 };
    });

    // Single-pass greedy clustering
    let nextClusterId = 0;
    for (let i = 0; i < infos.length; i++) {
        if (infos[i].clusterId !== -1) continue;
        infos[i].clusterId = nextClusterId++;

        if (!infos[i].bbox) continue;
        for (let j = i + 1; j < infos.length; j++) {
            if (infos[j].clusterId !== -1 || !infos[j].bbox) continue;
            const dist = bboxDist(infos[i].bbox!, infos[j].bbox!);
            if (dist < DIST_THRESHOLD) {
                infos[j].clusterId = infos[i].clusterId;
            }
        }
    }

    // Hitung cluster bbox (union semua elemen dalam cluster)
    const clusterBboxMap = new Map<number, { x: number; y: number; width: number; height: number }>();
    for (const info of infos) {
        if (!info.bbox || info.clusterId < 0) continue;
        const existing = clusterBboxMap.get(info.clusterId);
        clusterBboxMap.set(info.clusterId, existing ? bboxUnion(existing, info.bbox) : info.bbox);
    }

    // Wrap elemen per cluster dalam <g> dengan id sementara
    // Agar tidak mengubah SVG terlalu dalam, kita inject data-cluster-id
    // ke tiap primitive, lalu wrap di post-processing string.
    // Approach lebih simpel: clone SVG, inject <g> wrappers.
    const clusterGroups = new Map<number, SVGGElement>();
    for (const [cid] of clusterBboxMap) {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', `cluster-${cid}`);
        g.setAttribute('data-animatable', 'true');
        clusterGroups.set(cid, g);
    }

    // Move elements ke dalam group mereka
    // (insert semua group ke svgEl terlebih dulu, lalu pindahkan elemen)
    const firstChild = svgEl.firstElementChild;
    for (const g of clusterGroups.values()) {
        svgEl.insertBefore(g, firstChild);
    }
    for (const info of infos) {
        const g = clusterGroups.get(info.clusterId);
        if (g && info.el.parentNode) {
            g.appendChild(info.el);
        }
    }

    const serializer = new XMLSerializer();
    const clusteredSvg = serializer.serializeToString(doc);

    const clusters = Array.from(clusterBboxMap.entries()).map(([cid, bbox]) => ({
        id: `cluster-${cid}`,
        bbox,
    }));

    return { clusteredSvg, clusters };
}

// ─── AI SEMANTIC LABELING ────────────────────────────────────────────────────
// Kirim: PNG asli (inlineData) + cluster list dengan bbox → assign data-role

export async function labelAnimationClusters(
    clusteredSvg: string,
    clusters: { id: string; bbox: { x: number; y: number; width: number; height: number } }[],
    assetPngDataUrl: string,
    assetPrompt: string,
    canvasSize: { width: number; height: number },
    aiConfig: SystemSettings['aiConfig'],
    onApiCall: () => void,
): Promise<AnimV2LabelResult> {

    const mimeMatch = assetPngDataUrl.match(/^data:(image\/[^;]+);base64,/);
    const imageMime = mimeMatch?.[1] || 'image/png';
    const imageBase64 = assetPngDataUrl.split(',')[1] || '';

    const clusterDesc = clusters.map(c => {
        const { x, y, width, height } = c.bbox;
        const cx = Math.round(x + width / 2);
        const cy = Math.round(y + height / 2);
        return `- id="${c.id}" center=(${cx},${cy}) size=${Math.round(width)}x${Math.round(height)}`;
    }).join('\n');

    const systemPrompt = `You are an animation semantic labeler for IMAGIN Studio.
Given an asset image and a list of SVG element clusters with their bounding box positions,
assign a semantic role and animation hints to each cluster.

ROLE TAXONOMY (pick the most fitting):
body        = main subject mass / largest element
head        = top part of subject
base        = bottom part of subject
appendage   = wings, fins, arms, legs, tail-like extensions
eye         = eyes, pupils, iris
face        = face area, mouth
detail      = windows, badges, buttons, ornaments, small decorations
effect      = fire, smoke, glow, aura, exhaust, sparks
background  = background elements, sky, ground
shadow      = drop shadow or ground reflection
highlight   = shine, glint, specular

ANIMATION HINTS (pick all that apply per role):
float, bounce, pulse, rotate, shake, flicker, fade, drift, scale, wiggle

OUTPUT: Return ONLY valid JSON — no markdown fences, no prose:
{
  "elements": [
    {
      "id": "<cluster-id>",
      "role": "<role>",
      "label": "<short human label>",
      "animationHints": ["<hint>", ...]
    }
  ]
}`;

    const userPrompt = `Asset description: "${assetPrompt}"
Canvas size: ${canvasSize.width}x${canvasSize.height}

Clusters to label (position in SVG coordinate space):
${clusterDesc}

Look at the image and assign a role to each cluster based on what it visually represents and its position.`;

    const textPart = { text: userPrompt };
    const imagePart = imageBase64
        ? { inlineData: { mimeType: imageMime, data: imageBase64 } }
        : null;

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: imagePart ? [textPart, imagePart] : [textPart] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    let labelMap: Record<string, { role: string; label: string; animationHints: string[] }> = {};
    try {
        const { data: parsed } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'anim-v2-labeling' } as any);
        if (parsed?.elements && Array.isArray(parsed.elements)) {
            for (const el of parsed.elements) {
                if (el.id && el.role) {
                    labelMap[el.id] = {
                        role: el.role,
                        label: el.label || el.role,
                        animationHints: Array.isArray(el.animationHints) ? el.animationHints : [],
                    };
                }
            }
        }
    } catch (err) {
        console.warn('[AnimV2] Labeling AI failed, using positional fallback:', err);
    }

    // Fallback: assign role berdasarkan posisi relatif dalam canvas
    for (const cluster of clusters) {
        if (labelMap[cluster.id]) continue;
        const { x, y, width, height } = cluster.bbox;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const relY = cy / canvasSize.height;
        const area = bboxArea(cluster.bbox);
        const totalArea = canvasSize.width * canvasSize.height;

        let role = 'detail';
        if (area > totalArea * 0.25) role = 'body';
        else if (relY < 0.3) role = 'head';
        else if (relY > 0.75) role = area > totalArea * 0.05 ? 'base' : 'effect';
        else if (cx < canvasSize.width * 0.25 || cx > canvasSize.width * 0.75) role = 'appendage';

        labelMap[cluster.id] = { role, label: role, animationHints: ['float'] };
    }

    // Inject data-role ke SVG clusters
    const parser = new DOMParser();
    const doc = parser.parseFromString(clusteredSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('Invalid SVG after clustering');

    const resultElements: AnimV2LabeledElement[] = [];

    for (const cluster of clusters) {
        const g = doc.getElementById(cluster.id);
        if (!g) continue;
        const info = labelMap[cluster.id] || { role: 'detail', label: 'detail', animationHints: [] };

        // Rename id dari "cluster-N" ke "[assetSlug]-[role]-[N]"
        const slug = assetPrompt.slice(0, 12).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const newId = `${slug}-${info.role}-${cluster.id.split('-')[1]}`;
        g.setAttribute('id', newId);
        g.setAttribute('data-role', info.role);
        g.setAttribute('data-animatable', 'true');
        g.setAttribute('data-label', info.label);

        resultElements.push({
            id: newId,
            type: info.role,
            name: info.label,
            bbox: [cluster.bbox.x, cluster.bbox.y, cluster.bbox.width, cluster.bbox.height],
            ...( { role: info.role, label: info.label, animationHints: info.animationHints } as any ),
        } as AnimV2LabeledElement);
    }

    const vb = parseSvgViewBox(clusteredSvg);
    const serializer = new XMLSerializer();
    const labeledSvg = serializer.serializeToString(doc);

    return {
        svg: labeledSvg,
        elements: resultElements,
        viewBox: vb.viewBox,
    };
}

// ─── AI ANIMATION PLANNER ────────────────────────────────────────────────────
// Terima labeled elements + custom prompt → hasilkan AnimV2Package

export async function planAnimationV2(
    labelResult: AnimV2LabelResult,
    customPrompt: string,
    assetPrompt: string,
    canvasSize: { width: number; height: number },
    aiConfig: SystemSettings['aiConfig'],
    onApiCall: () => void,
): Promise<AnimV2Package> {

    const elementsDesc = labelResult.elements.map((el: any) => {
        const [x, y, width, height] = el.bbox || [0, 0, 0, 0];
        return `- id="${el.id}" role="${el.role || el.type}" label="${el.label || el.name}" center=(${Math.round(x + width / 2)},${Math.round(y + height / 2)}) hints=[${(el.animationHints || []).join(',')}]`;
    }).join('\n');

    const systemPrompt = `You are an animation timeline planner for IMAGIN Studio.
Given labeled SVG elements and a user animation request, generate a complete animation package.

RULES:
1. "tracks" = Web Animations API keyframes per element. Use CSS transform strings.
   - transform values: translateX/Y/Z, scale, rotate, scaleX/Y
   - Always set transform-origin center (runtime handles this)
   - "time" is in milliseconds
   - Prefer smooth, looping animations unless user says otherwise
2. "emitters" = particle systems spawned by runtime.js programmatically.
   Use for: wind particles, sparkles, smoke, exhaust trails, floating specks.
   - origin: { x, y } in SVG coordinate space
   - particleSpec.trajectory: { dx, dy } total distance the particle travels
   - particleSpec.shape: "circle" or "line"
3. Keep totalDuration between 2000–5000ms for loops.
4. DO NOT include any element not in the elements list.
5. Use the CSS selector format: "[data-role='effect']" OR "#specific-id"
   Use data-role selectors when multiple elements share a role.

OUTPUT: Return ONLY valid JSON — no markdown fences:
{
  "schemaVersion": "2.0",
  "label": "<short name for this animation>",
  "canvas": { "width": ${canvasSize.width}, "height": ${canvasSize.height}, "viewBox": "${labelResult.viewBox}" },
  "totalDuration": <ms>,
  "loop": true,
  "tracks": [
    {
      "target": "<CSS selector>",
      "property": "transform",
      "easing": "ease-in-out",
      "keyframes": [
        { "time": 0, "value": "translateY(0px)" },
        { "time": 2000, "value": "translateY(-20px)" }
      ]
    }
  ],
  "emitters": [
    {
      "id": "particles-1",
      "type": "particle",
      "origin": { "x": 400, "y": 600 },
      "count": 6,
      "staggerMs": 200,
      "loop": true,
      "particleSpec": {
        "shape": "circle",
        "radius": 4,
        "color": "#88ccff",
        "opacity": 0.7,
        "trajectory": { "dx": -80, "dy": -60 },
        "duration": 1200,
        "easing": "ease-out",
        "fadeOut": true
      }
    }
  ]
}`;

    const userPrompt = `Asset: "${assetPrompt}"
Animation request: "${customPrompt || 'Make a natural, engaging looping animation that suits this asset.'}"

Available elements:
${elementsDesc}

Generate an animation package. Be creative but faithful to the asset's nature.
If the asset has an "effect" role (fire, smoke, exhaust), always animate it with flicker/pulse.
If the asset has a "body" role, consider a gentle float or bounce.
Add particle emitters only when they make sense (exhaust, wind, magic, etc).`;

    const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 },
        },
    };

    try {
        const { data: parsed } = await callGeminiForJSON({ payload, aiConfig, onApiCall, label: 'anim-v2-planning' } as any);
        if (parsed?.tracks && Array.isArray(parsed.tracks)) {
            return {
                schemaVersion: 2 as any,
                label: parsed.label || 'Custom Animation',
                canvas: { width: canvasSize.width, height: canvasSize.height, viewBox: labelResult.viewBox },
                totalDuration: typeof parsed.totalDuration === 'number' ? parsed.totalDuration : 3000,
                loop: parsed.loop !== false,
                tracks: parsed.tracks || [],
                emitters: Array.isArray(parsed.emitters) ? parsed.emitters : [],
            };
        }
    } catch (err) {
        console.warn('[AnimV2] Planning AI failed, using fallback:', err);
    }

    // Fallback deterministik: float pada body + flicker pada effect
    const bodyEl = labelResult.elements.find((e: any) => (e.role || e.type) === 'body');
    const effectEl = labelResult.elements.find((e: any) => (e.role || e.type) === 'effect');
    const fallbackTracks: AnimV2Track[] = [];

    if (bodyEl) {
        fallbackTracks.push({
            target: `#${bodyEl.id}`,
            property: 'transform',
            easing: 'ease-in-out',
            keyframes: [
                { time: 0, value: 'translateY(0px)' },
                { time: 1500, value: 'translateY(-15px)' },
                { time: 3000, value: 'translateY(0px)' },
            ],
        } as any);
    }
    if (effectEl) {
        fallbackTracks.push({
            target: `#${effectEl.id}`,
            property: 'transform',
            easing: 'ease-in-out',
            keyframes: [
                { time: 0, value: 'scaleY(1) scaleX(1)' },
                { time: 200, value: 'scaleY(1.2) scaleX(0.9)' },
                { time: 400, value: 'scaleY(0.9) scaleX(1.1)' },
                { time: 600, value: 'scaleY(1.15) scaleX(0.95)' },
                { time: 800, value: 'scaleY(1) scaleX(1)' },
            ],
        } as any);
    }

    return {
        schemaVersion: 2 as any,
        label: 'Float (Fallback)',
        canvas: { width: canvasSize.width, height: canvasSize.height, viewBox: labelResult.viewBox },
        totalDuration: 3000,
        loop: true,
        tracks: fallbackTracks,
        emitters: [],
    };
}

// ─── RUNTIME JS (self-contained, no deps) ────────────────────────────────────
// Ini string yang ditulis ke runtime.js dalam ZIP.
// Handle tracks (Web Animations API) + emitters (spawn SVG particle elements).

export const ANIM_V2_RUNTIME_JS = `// IMAGIN Animation Runtime v2.0
// Self-contained — no external dependencies.
// Supports: tracks (Web Animations API) + particle emitters (SVG DOM injection)

class ImaginAnimationRuntime {
  constructor(svgRoot, animData) {
    this.svgRoot = svgRoot;
    this.data = animData;
    this.animations = [];
    this.emitterIntervals = [];
    this.state = 'idle';
    this._listeners = {};
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  _emit(event, ...args) {
    (this._listeners[event] || []).forEach(fn => fn(...args));
  }

  _buildTracks() {
    this.animations = [];
    (this.data.tracks || []).forEach(track => {
      const el = this.svgRoot.querySelector(track.target);
      if (!el) { console.warn('[IMAGIN] Target not found:', track.target); return; }
      el.style.transformBox = 'fill-box';
      el.style.transformOrigin = 'center';
      const keyframes = track.keyframes.map(kf => ({
        offset: kf.time / this.data.totalDuration,
        [track.property]: kf.value,
        easing: kf.easing || track.easing || 'ease-in-out',
      }));
      const anim = el.animate(keyframes, {
        duration: this.data.totalDuration,
        delay: track.delay || 0,
        iterations: this.data.loop ? Infinity : 1,
        fill: 'forwards',
      });
      anim.pause();
      this.animations.push(anim);
    });
  }

  _spawnParticle(emitter, svgNS, svgEl, vbW, vbH) {
    const spec = emitter.particleSpec;
    const el = document.createElementNS(svgNS, spec.shape === 'line' ? 'line' : 'circle');
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 20;
    const startX = emitter.origin.x + jitterX;
    const startY = emitter.origin.y + jitterY;

    if (spec.shape === 'circle') {
      el.setAttribute('cx', startX);
      el.setAttribute('cy', startY);
      el.setAttribute('r', spec.radius || 4);
    } else {
      el.setAttribute('x1', startX);
      el.setAttribute('y1', startY);
      el.setAttribute('x2', startX + (spec.length || 8));
      el.setAttribute('y2', startY);
    }
    el.setAttribute('fill', spec.shape === 'circle' ? (spec.color || '#ffffff') : 'none');
    el.setAttribute('stroke', spec.shape === 'line' ? (spec.color || '#ffffff') : 'none');
    el.setAttribute('stroke-width', spec.shape === 'line' ? '2' : '0');
    el.setAttribute('opacity', spec.opacity || 0.7);
    el.style.pointerEvents = 'none';
    svgEl.appendChild(el);

    const endX = startX + (spec.trajectory?.dx || 0);
    const endY = startY + (spec.trajectory?.dy || 0);
    const dur = spec.duration || 1000;

    const kf = spec.shape === 'circle'
      ? [
          { offset: 0, cx: startX, cy: startY, opacity: spec.opacity || 0.7 },
          { offset: 1, cx: endX, cy: endY, opacity: spec.fadeOut ? 0 : spec.opacity || 0.7 },
        ]
      : [
          { offset: 0, x1: startX, y1: startY, x2: startX + (spec.length || 8), y2: startY, opacity: spec.opacity || 0.7 },
          { offset: 1, x1: endX, y1: endY, x2: endX + (spec.length || 8), y2: endY, opacity: spec.fadeOut ? 0 : spec.opacity || 0.7 },
        ];

    const particleAnim = el.animate(kf, {
      duration: dur,
      easing: spec.easing || 'ease-out',
      fill: 'forwards',
    });
    particleAnim.onfinish = () => { if (el.parentNode) el.parentNode.removeChild(el); };
  }

  _buildEmitters() {
    this.emitterIntervals.forEach(id => clearInterval(id));
    this.emitterIntervals = [];
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = this.svgRoot;
    const vb = (svgEl.getAttribute && svgEl.getAttribute('viewBox') || '0 0 800 800').split(/\\s+/).map(Number);
    const vbW = vb[2] || 800;
    const vbH = vb[3] || 800;

    (this.data.emitters || []).forEach(emitter => {
      // Initial burst
      for (let i = 0; i < emitter.count; i++) {
        setTimeout(() => this._spawnParticle(emitter, svgNS, svgEl, vbW, vbH), i * (emitter.staggerMs || 150));
      }
      if (emitter.loop) {
        const totalInitDelay = emitter.count * (emitter.staggerMs || 150);
        const loopInterval = Math.max(totalInitDelay, (emitter.particleSpec?.duration || 1000));
        const id = setInterval(() => {
          for (let i = 0; i < emitter.count; i++) {
            setTimeout(() => this._spawnParticle(emitter, svgNS, svgEl, vbW, vbH), i * (emitter.staggerMs || 150));
          }
        }, loopInterval);
        this.emitterIntervals.push(id);
      }
    });
  }

  play() {
    if (!this.animations.length) this._buildTracks();
    this.animations.forEach(a => a.play());
    if (this.state !== 'playing') this._buildEmitters();
    this.state = 'playing';
    this._emit('play');
  }

  pause() {
    this.animations.forEach(a => a.pause());
    this.emitterIntervals.forEach(id => clearInterval(id));
    this.emitterIntervals = [];
    this.state = 'paused';
    this._emit('pause');
  }

  stop() {
    this.animations.forEach(a => a.cancel());
    this.animations = [];
    this.emitterIntervals.forEach(id => clearInterval(id));
    this.emitterIntervals = [];
    this.state = 'idle';
    this._emit('stop');
  }

  seek(timeMs) {
    if (!this.animations.length) this._buildTracks();
    this.animations.forEach(a => { a.currentTime = timeMs; });
  }

  destroy() { this.stop(); this._listeners = {}; }
}

// Auto-init when used as entry point (index.html)
if (typeof window !== 'undefined') {
  window.ImaginAnimationRuntime = ImaginAnimationRuntime;
}
`;

// ─── INDEX.HTML BUILDER ──────────────────────────────────────────────────────

export function buildAnimV2IndexHtml(animPkg: AnimV2Package, assetName: string): string {
    const { width, height } = animPkg.canvas;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${assetName} — IMAGIN Animated</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 100vw; height: 100vh;
    background: #0f1115;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .imagin-stage {
    width: min(90vw, 90vh, ${width}px);
    height: min(90vw, 90vh, ${height}px);
    position: relative;
  }
  .imagin-stage svg {
    width: 100%; height: 100%;
    display: block;
  }
  [data-animatable="true"] {
    transform-box: fill-box;
    transform-origin: center;
  }
</style>
</head>
<body>
<div class="imagin-stage" id="stage"></div>
<script src="runtime.js"></script>
<script>
  Promise.all([
    fetch('scene.svg').then(r => r.text()),
    fetch('animation.json').then(r => r.json()),
  ]).then(([svgText, animData]) => {
    const stage = document.getElementById('stage');
    stage.innerHTML = svgText;
    const svgRoot = stage.querySelector('svg');
    if (!svgRoot) { console.error('[IMAGIN] No SVG element found'); return; }
    window.imaginRuntime = new ImaginAnimationRuntime(svgRoot, animData);
    window.imaginRuntime.play();

    // Puppeteer hook: expose control API
    window.__imagin__ = {
      play:    () => window.imaginRuntime.play(),
      pause:   () => window.imaginRuntime.pause(),
      stop:    () => window.imaginRuntime.stop(),
      seek:    (t) => window.imaginRuntime.seek(t),
      meta:    animData,
    };
  }).catch(err => console.error('[IMAGIN] Load failed:', err));
</script>
</body>
</html>`;
}

// ─── MANIFEST BUILDER ────────────────────────────────────────────────────────

export function buildAnimV2Manifest(
    asset: Asset,
    labelResult: AnimV2LabelResult,
    animPkg: AnimV2Package,
    baseName: string,
): object {
    return {
        schemaVersion: '2.0',
        exportedBy: 'IMAGIN Studio',
        exportedAt: new Date().toISOString(),
        asset: {
            id: asset.id,
            title: asset.stockMetadata?.title || asset.title || baseName,
            assetType: asset.assetType,
            style: asset.style,
            prompt: asset.assembledPrompt || asset.prompt,
        },
        canvas: animPkg.canvas,
        elements: labelResult.elements.map((el: any) => ({
            id: el.id,
            role: el.role || el.type,
            label: el.label || el.name,
            animationHints: el.animationHints,
        })),
        animation: {
            label: animPkg.label,
            totalDuration: animPkg.totalDuration,
            loop: animPkg.loop,
            trackCount: animPkg.tracks.length,
            emitterCount: (animPkg.emitters || []).length,
        },
        files: ['scene.svg', 'animation.json', 'runtime.js', 'index.html', 'manifest.json'],
    };
}

// ─── PREVIEW HTML (iframe, Opsi C) ───────────────────────────────────────────
// Preview di modal Studio: SVG langsung di DOM + animasi jalan via inline script.
// Identik dengan index.html tapi embed SVG dan animData inline (tidak pakai fetch).

export function buildAnimV2PreviewHtml(
    labeledSvg: string,
    animPkg: AnimV2Package,
    assetName: string,
): string {
    const { width, height } = animPkg.canvas;
    const animJson = JSON.stringify(animPkg);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 100%; height: 100vh;
    background: #0f1115;
    display: flex; align-items: center; justify-content: center;
  }
  .stage {
    width: min(100%, ${width}px);
    aspect-ratio: ${width} / ${height};
    position: relative;
  }
  .stage svg { width: 100%; height: 100%; display: block; }
  [data-animatable="true"] { transform-box: fill-box; transform-origin: center; }
</style>
</head>
<body>
<div class="stage" id="stage">
${labeledSvg}
</div>
<script>
${ANIM_V2_RUNTIME_JS}
const animData = ${animJson};
const svgRoot = document.querySelector('#stage svg');
if (svgRoot) {
  const runtime = new ImaginAnimationRuntime(svgRoot, animData);
  runtime.play();
  window.imaginRuntime = runtime;
}
</script>
</body>
</html>`;
}

// ─── FULL PIPELINE RUNNER ────────────────────────────────────────────────────

export interface AnimV2Result {
    labeledSvg: string;
    animPkg: AnimV2Package;
    labelResult: AnimV2LabelResult;
    previewHtml: string;
    baseName: string;
}

export const resolveAnimationV2Assets = (asset: Asset, assets: Asset[]) => {
    const isSvgUrl = (value: unknown) => typeof value === 'string' && (
        value.startsWith('data:image/svg+xml') || value.trimStart().startsWith('<svg')
    );
    const isSavedSvg = (candidate: Asset) => (
        String(candidate.outputFormat || '').toUpperCase() === 'SVG' || isSvgUrl(candidate.url)
    );
    const savedSvgUrl = (candidate: Asset) => {
        if (isSvgUrl(candidate.url)) return candidate.url;
        const complexity = candidate.lineage?.traceComplexity;
        const cached = complexity ? (candidate as any).svgUrls?.[complexity] : undefined;
        return isSvgUrl(cached) ? cached : undefined;
    };
    const sourceRasterAsset = asset.lineage?.sourceAssetId
        ? assets.find(candidate => candidate.id === asset.lineage?.sourceAssetId)
        : undefined;
    const ownSvgUrl = isSavedSvg(asset) ? savedSvgUrl(asset) : undefined;
    if (ownSvgUrl) return { animationAsset: asset, sourceRasterAsset, svgDataUrl: ownSvgUrl };
    const derivative = assets
        .filter(candidate => candidate.lineage?.sourceAssetId === asset.id && isSavedSvg(candidate) && savedSvgUrl(candidate))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    return derivative
        ? { animationAsset: derivative, sourceRasterAsset: asset, svgDataUrl: savedSvgUrl(derivative) }
        : { animationAsset: asset, sourceRasterAsset: undefined, svgDataUrl: undefined };
};

export async function runAnimationV2Pipeline(
    asset: Asset,
    referenceImageAsset: Asset | undefined,
    assets: Asset[],
    customPrompt: string,
    aiConfig: SystemSettings['aiConfig'],
    onApiCall: () => void,
    onProgress: (p: AnimV2Progress) => void,
): Promise<AnimV2Result> {
    const { sourceRasterAsset, svgDataUrl } = resolveAnimationV2Assets(asset, assets);
    const report = (pct: number, label: string) => onProgress({ pct, label });
    const assetPrompt = asset.assembledPrompt || asset.prompt || asset.stockMetadata?.title || asset.title || 'asset';

    if (!svgDataUrl) {
        throw new Error('Simpan hasil SVG Trace ke Galeri terlebih dahulu, lalu coba lagi.');
    }

    // Dapatkan SVG hasil SVG Trace yang sudah tersimpan
    report(5, 'Menyiapkan SVG artwork…');
    const svgString = decodeAnimV2SvgDataUrl(svgDataUrl);
    report(20, 'Memakai hasil SVG Trace yang tersimpan di Galeri…');

    // Spatial clustering
    report(42, 'Mengelompokkan elemen visual…');
    const vbInfo = parseSvgViewBox(svgString);
    const { clusteredSvg, clusters } = spatialClusterPaths(svgString, { width: vbInfo.width, height: vbInfo.height });

    if (clusters.length === 0) throw new Error('Tidak ada elemen yang bisa dikluster dari SVG ini.');
    report(50, `${clusters.length} cluster terdeteksi.`);

    // AI Semantic Labeling
    report(55, 'AI memberi label semantik pada tiap elemen…');
    const labelResult = await labelAnimationClusters(
        clusteredSvg,
        clusters,
        referenceImageAsset?.url || sourceRasterAsset?.url || '',
        assetPrompt,
        { width: vbInfo.width, height: vbInfo.height },
        aiConfig,
        onApiCall,
    );
    report(70, `${labelResult.elements.length} elemen dilabeli: ${[...new Set(labelResult.elements.map((e: any) => e.role || e.type))].join(', ')}`);

    // AI Animation Planning
    report(75, 'AI merencanakan timeline animasi…');
    const animPkg = sanitizeAnimV2Package(await planAnimationV2(
        labelResult,
        customPrompt,
        assetPrompt,
        { width: vbInfo.width, height: vbInfo.height },
        aiConfig,
        onApiCall,
    ), labelResult.svg);
    report(90, `${animPkg.tracks.length} track, ${(animPkg.emitters || []).length} emitter dibuat.`);

    // Build preview HTML
    report(95, 'Membangun preview…');
    const previewHtml = buildAnimV2PreviewHtml(labelResult.svg, animPkg, assetPrompt);

    const baseName = (asset.stockMetadata?.title || asset.title || 'asset')
        .replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
        .replace(/\s+/g, '-').toLowerCase() || 'asset';

    report(100, 'Selesai!');
    return { labeledSvg: labelResult.svg, animPkg, labelResult, previewHtml, baseName };
}

// ─── ZIP EXPORT ──────────────────────────────────────────────────────────────

export async function handleExportAnimV2Zip(
    asset: Asset,
    result: AnimV2Result,
    showToast: (msg: string, type: string) => void,
): Promise<void> {
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const { labeledSvg, animPkg, labelResult, baseName } = result;
        const manifest = buildAnimV2Manifest(asset, labelResult, animPkg, baseName);
        const folder = zip.folder(baseName)!;

        folder.file('scene.svg', labeledSvg);
        folder.file('animation.json', JSON.stringify(animPkg, null, 2));
        folder.file('runtime.js', ANIM_V2_RUNTIME_JS);
        folder.file('index.html', buildAnimV2IndexHtml(animPkg, baseName));
        folder.file('manifest.json', JSON.stringify(manifest, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_animated.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        showToast(`ZIP animasi siap — ${labelResult.elements.length} elemen, ${animPkg.tracks.length} track `, 'success');
    } catch (err: any) {
        console.error('[AnimV2] ZIP export gagal:', err);
        showToast('Gagal export ZIP: ' + (err?.message || err), 'error');
    }
}

// ─── SAVE RESULT KE ASSET ────────────────────────────────────────────────────

export async function saveAnimV2ToAsset(
    asset: Asset,
    result: AnimV2Result,
    setAssets: React.Dispatch<React.SetStateAction<any[]>>,
): Promise<Asset> {
    const updated: Asset = {
        ...asset,
        // Simpan ke field yang sudah ada di interface (backward compat)
        animationHtml: result.previewHtml,
        animationPreset: result.animPkg.label,
        // Field v2
        animV2LabeledSvg: result.labeledSvg,
        animV2Package: result.animPkg,
        animV2LabelResult: result.labelResult,
        animV2PreviewHtml: result.previewHtml,
        animV2BaseName: result.baseName,
    } as any;
    const saveResult = await saveAssetDB(updated);
    if (!saveResult.success) {
        throw new Error('Failed to save animation to gallery: ' + (saveResult.detail || 'unknown error'));
    }
    setAssets((prev: any[]) => prev.map((a: any) => a.id === updated.id ? updated : a));
    return updated;
}
