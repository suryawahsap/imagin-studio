import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../../api/electron';
import { useJobSync } from '../../api/useJobSync';
import { LibraryAsset } from '../../types';
import { assetUrl } from '../../utils/assetUrl';
import RemotionSidebar from './RemotionSidebar';
import RemotionCenter from './RemotionCenter';
import RemotionInspector from './RemotionInspector';
import { AnimSourceEngine, AnimOutputFormat, JobState } from './types';
import type { KeyframeProperty } from '../global/KeyframePanel';
import './remotion-theme.css';

type AnalyzedSource = {
  assetId?: string;
  tempId: string;
  layerCount: number;
  svg?: string;
  mode: 'svg' | 'html';
  layers: any[];
};

export interface RemotionModuleProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
  libraryAssets?: LibraryAsset[];
  pendingHandoff?: { module: 'VECTOR' | 'UPSCALE' | 'ANIMATION'; assetIds: string[]; nonce: number } | null;
  onHandoffDone?: () => void;
}

export default function RemotionModule({
  onNotify,
  libraryAssets = [],
  pendingHandoff,
  onHandoffDone,
}: RemotionModuleProps) {
  const [sourceEngine, setSourceEngine] = useState<AnimSourceEngine>('svg');
  const [outputFormats, setOutputFormats] = useState<Set<AnimOutputFormat>>(
    new Set(['MP4', 'WEBM', 'GIF'])
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedSource | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fps, setFps] = useState(60);
  const [durationMs, setDurationMs] = useState(15000);
  const [canvasSize, setCanvasSize] = useState('1920×1080');
  const [background, setBackground] = useState('transparent');
  const [loop, setLoop] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jobs, setJobs] = useState<JobState[]>([]);

  // Job sync (initial fetch + live updates via existing hook)
  const mergeJobs = useCallback((incoming: any[]) => {
    setJobs(prev => {
      const byId = new Map(prev.map(j => [j.tempId, j]));
      for (const job of incoming) {
        if (!job?.tempId) continue;
        byId.set(job.tempId, { ...byId.get(job.tempId), ...job });
      }
      return Array.from(byId.values());
    });
  }, []);
  useJobSync<JobState>('animation', mergeJobs);

  const selectedAsset = useMemo(
    () => libraryAssets.find(a => a.id === selectedAssetId) || null,
    [libraryAssets, selectedAssetId]
  );

  // Auto-select first vector asset if none selected
  useEffect(() => {
    if (!selectedAssetId && libraryAssets.length > 0) {
      const firstVector = libraryAssets.find(a => a.type === 'VECTOR');
      if (firstVector) {
        setSelectedAssetId(firstVector.id);
      }
    }
  }, [selectedAssetId, libraryAssets]);

  // Handoff dari Gallery (VECTOR saja)
  useEffect(() => {
    if (!pendingHandoff || pendingHandoff.module !== 'ANIMATION') return;
    const asset = libraryAssets.find(a => a.id === pendingHandoff.assetIds?.[0]);
    if (asset && asset.type === 'VECTOR') {
      setSourceEngine('svg');
      setSelectedAssetId(asset.id);
      onNotify?.('Vector asset received, analyzing layers...', 'info');
    } else {
      onNotify?.('Animation handoff requires a vector (SVG) asset.', 'error');
    }
    onHandoffDone?.();
  }, [pendingHandoff, libraryAssets, onNotify, onHandoffDone]);

  // Analyze asset SVG saat dipilih
  useEffect(() => {
    if (!selectedAssetId || sourceEngine !== 'svg') {
      setAnalyzed(null);
      return;
    }
    if (analyzed?.assetId === selectedAssetId) return;

    const asset = libraryAssets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    let cancelled = false;
    const doAnalyze = async () => {
      setIsAnalyzing(true);
      try {
        const result = await api.animationAnalyze({ svgUrl: asset.url, name: asset.name });
        if (!result.success || !result.tempId) throw new Error(result.detail || 'Analysis failed');
        if (cancelled) return;
        setAnalyzed({
          assetId: asset.id,
          tempId: result.tempId,
          layerCount: result.layers?.length ?? 0,
          svg: result.svgContent,
          mode: 'svg',
          layers: result.layers ?? [],
        });
        onNotify?.(`SVG analyzed: ${result.layers?.length ?? 0} layers detected`, 'success');
      } catch (err: any) {
        if (!cancelled) {
          onNotify?.(`SVG analysis failed: ${err.message}`, 'error');
          setAnalyzed(null);
        }
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    };
    doAnalyze();
    return () => { cancelled = true; };
  }, [selectedAssetId, sourceEngine, libraryAssets, analyzed?.assetId, onNotify]);

  // HTML analyze (backend mendukung mode html)
  const handleAnalyzeHtml = useCallback(async () => {
    if (!htmlContent.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await api.animationAnalyze({ html: htmlContent, css: cssContent, name: 'html-source' });
      if (!result.success || !result.tempId) throw new Error(result.detail || 'Analysis failed');
      setAnalyzed({
        tempId: result.tempId,
        layerCount: result.layers?.length ?? 0,
        mode: 'html',
        layers: result.layers ?? [],
      });
      onNotify?.(`HTML analyzed: ${result.layers?.length ?? 0} layers detected`, 'success');
    } catch (err: any) {
      onNotify?.(`HTML analysis failed: ${err.message}`, 'error');
      setAnalyzed(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [htmlContent, cssContent, onNotify]);

  const toggleFormat = useCallback((format: AnimOutputFormat) => {
    setOutputFormats(prev => {
      const next = new Set(prev);
      if (next.has(format)) {
        if (next.size > 1) next.delete(format);
      } else {
        next.add(format);
      }
      return next;
    });
  }, []);

  const hasActiveJob = jobs.some(j => j.status === 'processing' || j.status === 'queued');

  const canRender = useMemo(() => {
    if (!analyzed || analyzed.layerCount === 0) return false;
    if (outputFormats.size === 0) return false;
    if (hasActiveJob) return false;
    return true;
  }, [analyzed, outputFormats, hasActiveJob]);

  const renderDisabledReason = useMemo(() => {
    if (!analyzed || analyzed.layerCount === 0) {
      return sourceEngine === 'svg'
        ? 'Select and analyze an SVG asset first'
        : 'Enter HTML and click Analyze HTML Layers';
    }
    if (outputFormats.size === 0) return 'Select at least one output format';
    if (hasActiveJob) return 'Processing animation job...';
    return '';
  }, [analyzed, outputFormats, hasActiveJob, sourceEngine]);

  // Render: enqueue AnimationDefinition nyata
  const handleRender = useCallback(async () => {
    if (!canRender || !analyzed) return;
    const [w, h] = canvasSize.split('×').map(n => parseInt(n, 10) || 0);
    const def = {
      layers: analyzed.layers,
      durationMs,
      fps,
      width: w || 1920,
      height: h || 1080,
      background,
      loop,
      sourceSvg: analyzed.mode === 'svg' ? (analyzed.svg ?? '') : '',
      sourceMode: analyzed.mode,
      sourceHtml: analyzed.mode === 'html' ? htmlContent : undefined,
      sourceCss: analyzed.mode === 'html' ? cssContent : undefined,
      sourceTempId: analyzed.tempId,
      formatList: Array.from(outputFormats),
    };
    try {
      const res = await api.animationQueue({ def });
      if (!res.success) {
        onNotify?.(res.detail || 'Failed to queue animation job.', 'error');
        return;
      }
      onNotify?.('Animation render dispatched to queue', 'success');
    } catch (err: any) {
      onNotify?.(`Failed to start render: ${err.message}`, 'error');
    }
  }, [canRender, analyzed, outputFormats, durationMs, fps, background, loop, canvasSize, htmlContent, cssContent, onNotify]);

  // Playback scrub: bounded, rAF-driven, cleanup-safe. Advances currentMs only
  // while isPlaying is true, stops at the end when loop is off, wraps when on.
  const currentMsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    currentMsRef.current = currentMs;
  }, [currentMs]);

  useEffect(() => {
    if (!isPlaying) {
      lastTsRef.current = null;
      return;
    }
    let cancelled = false;
    const tick = (ts: number) => {
      if (cancelled) return;
      const prev = currentMsRef.current;
      const delta = lastTsRef.current === null ? 0 : Math.max(0, ts - lastTsRef.current);
      lastTsRef.current = ts;
      let next = prev + delta;
      if (next >= durationMs) {
        if (loop) {
          next = durationMs > 0 ? next % durationMs : 0;
        } else {
          currentMsRef.current = durationMs;
          setCurrentMs(durationMs);
          setIsPlaying(false);
          return;
        }
      }
      currentMsRef.current = next;
      setCurrentMs(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      lastTsRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, durationMs, loop]);

  // Playback scrub lokal
  const handlePlay = useCallback(() => {
    const restart = currentMs >= durationMs ? 0 : currentMs;
    currentMsRef.current = restart;
    setCurrentMs(restart);
    setIsPlaying(true);
  }, [currentMs, durationMs]);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleSeek = useCallback((ms: number) => {
    const clamped = Math.min(Math.max(0, ms), durationMs);
    currentMsRef.current = clamped;
    setCurrentMs(clamped);
  }, [durationMs]);
  const handleSkipStart = useCallback(() => {
    currentMsRef.current = 0;
    setCurrentMs(0);
  }, []);
  const handleSkipEnd = useCallback(() => {
    currentMsRef.current = durationMs;
    setCurrentMs(durationMs);
  }, [durationMs]);

  const recentAnimations = useMemo(
    () =>
      jobs
        .filter(j => j.status === 'completed')
        .slice(0, 6)
        .map(j => ({
          id: j.tempId,
          name: j.originalName || 'Animation',
          thumbnailUrl: j.outputUrls ? assetUrl(Object.values(j.outputUrls)[0]) : undefined,
          onClick: () => {},
        })),
    [jobs]
  );

  const latestJob = jobs.find(j => j.status === 'completed');
  const latestUrl = latestJob?.outputUrls ? assetUrl(Object.values(latestJob.outputUrls)[0]) : undefined;

  const keyframeProperties: KeyframeProperty[] = useMemo(() => {
    const frame = analyzed?.layers?.[0]?.keyframes?.[0];
    if (!frame) return [];
    return (["x", "y", "scaleX", "scaleY", "rotation", "opacity"] as const)
      .filter(key => typeof frame[key] === 'number')
      .map(key => ({
        id: key,
        label: key === 'scaleX' ? 'Width / Scale X' : key === 'scaleY' ? 'Height / Scale Y' : key === 'rotation' ? 'Rotation (°)' : key === 'opacity' ? 'Opacity' : `Position ${key.toUpperCase()}`,
        value: frame[key],
        suffix: key === 'opacity' ? '%' : key === 'rotation' ? '°' : 'px',
        onChange: (value: number) => setAnalyzed(prev => {
          if (!prev) return prev;
          const layers = prev.layers.map((layer, index) =>
            index === 0
              ? {
                  ...layer,
                  keyframes: layer.keyframes.map((kf: any, kfIndex: number) =>
                    kfIndex === 0 ? { ...kf, [key]: value } : kf
                  ),
                }
              : layer
          );
          return { ...prev, layers };
        }),
      }));
  }, [analyzed]);

  return (
    <div className="remotion-theme flex h-full w-full overflow-hidden select-none bg-[var(--bg-base)]">
      <RemotionSidebar
        sourceEngine={sourceEngine}
        setSourceEngine={setSourceEngine}
        outputFormats={outputFormats}
        toggleFormat={toggleFormat}
        isRendering={hasActiveJob}
        canRender={canRender}
        renderDisabledReason={renderDisabledReason}
        onRender={handleRender}
        libraryAssets={libraryAssets}
        selectedAssetId={selectedAssetId ?? undefined}
        onSelectAsset={(asset) => setSelectedAssetId(asset ? asset.id : null)}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        cssContent={cssContent}
        setCssContent={setCssContent}
        onAnalyzeHtml={() => { void handleAnalyzeHtml(); }}
        isAnalyzing={isAnalyzing}
        analyzedLayersCount={analyzed?.layerCount ?? 0}
        canvasW={parseInt(canvasSize.split('×')[0], 10) || 1920}
        canvasH={parseInt(canvasSize.split('×')[1], 10) || 1080}
        fps={fps}
        setFps={setFps}
        durationMs={durationMs}
        setDurationMs={setDurationMs}
        canvasSize={canvasSize}
        setCanvasSize={setCanvasSize}
        background={background}
        setBackground={setBackground}
        loop={loop}
        setLoop={setLoop}
      />

      <RemotionCenter
        durationMs={durationMs}
        currentMs={currentMs}
        isPlaying={isPlaying}
        selectedTemplate={
          selectedAsset
            ? {
                id: selectedAsset.id,
                name: selectedAsset.name,
                sourceEngine,
                preview: selectedAsset.thumbnailUrl || selectedAsset.url,
                durationMs,
              }
            : null
        }
        recentAnimations={recentAnimations}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        onSkipStart={handleSkipStart}
        onSkipEnd={handleSkipEnd}
        layers={analyzed?.layers || []}
        fps={fps}
        resolution={canvasSize}
        onGenerate={handleRender}
      />

      <RemotionInspector
        durationMs={durationMs}
        canvasSize={canvasSize}
        fps={fps}
        formats={Array.from(outputFormats)}
        latestJob={latestJob}
        latestUrl={latestUrl}
        keyframeProperties={keyframeProperties}
        layersCount={analyzed?.layerCount || 0}
        onDownload={() => {
          if (latestUrl) {
            void api.exportAsset({ url: latestUrl, name: latestJob?.originalName || 'animation' });
          }
        }}
        onOpenFolder={() => {
          if (latestUrl) {
            void api.exportShowInFolder({ url: latestUrl });
          }
        }}
      />
    </div>
  );
}
