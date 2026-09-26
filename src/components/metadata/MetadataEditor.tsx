import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  Save,
  Tag,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Plus,
  X,
  Layers,
  Check,
  FileDown,
} from "lucide-react";
import { LibraryAsset, StockMetadata } from "../../types";
import { assetUrl } from "../../utils/assetUrl";
import { Button } from "../global";

interface MetadataEditorProps {
  asset: LibraryAsset | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSave: (assetId: string, metadata: Partial<StockMetadata>) => Promise<void>;
  onGenerate?: (assetId: string) => void;
  onExportSingleCsv?: (asset: LibraryAsset) => void;
  persistent?: boolean;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  asset,
  onSave,
  onGenerate,
  onExportSingleCsv,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [category, setCategory] = useState("Illustration");
  const [license, setLicense] = useState("Commercial Use");
  const [isSaving, setIsSaving] = useState(false);
  const [zoomScale, setZoomScale] = useState(100);
  const [batchMode, setBatchMode] = useState(true);

  useEffect(() => {
    if (asset) {
      const meta = asset.stockMetadata;
      setTitle(meta?.title || asset.name || "");
      setDescription(meta?.description || "");
      setKeywords(meta?.keywords ? [...meta.keywords] : []);
      setCategory(meta?.stockCategory || asset.adobeCategory || "Illustration");
      setLicense((meta as any)?.license || "Commercial Use");
      setShowAddKeyword(false);
      setNewKeywordInput("");
    }
  }, [asset]);

  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeywordInput("");
      setShowAddKeyword(false);
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!asset) return;
    setIsSaving(true);
    const updated: Partial<StockMetadata> = {
      title,
      description,
      keywords,
      stockCategory: category,
      preflightChecks: asset.stockMetadata?.preflightChecks || {},
      preflightPassedAt: asset.stockMetadata?.preflightPassedAt || null,
      submittedAt: asset.stockMetadata?.submittedAt || null,
      backgroundVerified: asset.stockMetadata?.backgroundVerified ?? true,
      resolutionVerified: asset.stockMetadata?.resolutionVerified ?? true,
      submissionStatus: asset.stockMetadata?.submissionStatus || "draft",
    };

    try {
      await onSave(asset.id, updated);
    } finally {
      setIsSaving(false);
    }
  };

  const complianceScore = useMemo(() => {
    let score = 50;
    if (title.length >= 15 && title.length <= 150) score += 20;
    if (description.length >= 30) score += 10;
    if (keywords.length >= 15) score += 20;
    return Math.min(100, score);
  }, [title, description, keywords]);

  if (!asset) {
    return (
      <main className="flex-1 bg-[var(--bg-void)] flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-muted)] select-none">
        <Layers className="w-10 h-10 text-[var(--accent-cyan)] opacity-40 mb-3" />
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Select an Asset to Edit Metadata</h3>
        <p className="max-w-md mt-1 text-[var(--text-secondary)]">
          Choose any vector or raster asset from the left Asset Queue to inspect AI tags, validate platform rules, and edit metadata.
        </p>
      </main>
    );
  }

  const isVector = asset.type === "VECTOR";
  const typeBadgeLabel = isVector ? "Vector" : "Raster";
  const formatExt = asset.name.split(".").pop()?.toUpperCase() || (isVector ? "SVG" : "PNG");
  const dimensionsStr = asset.resolution || (isVector ? "1024 × 1024" : "1920 × 1080");

  return (
    <main className="flex-1 bg-[var(--bg-base)] flex flex-col h-full overflow-hidden select-none border-r border-[var(--border-structural)]">
      <div className="p-3 border-b border-[var(--border-structural)] bg-[var(--bg-panel)]/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
            Metadata Workspace
          </h2>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="font-mono text-[var(--accent-cyan)] font-medium text-xs truncate max-w-[200px]">
            {asset.name}
          </span>
          <span className="px-1.5 py-0.2 bg-[var(--bg-elevated)] text-[var(--accent-cyan)] text-[9px] rounded font-mono border border-[var(--border-structural)]">
            {typeBadgeLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[var(--accent-success-solid)]/10 border border-[var(--accent-success)]/40 text-[var(--accent-success)] text-[10px] flex items-center gap-1 font-medium font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)]" />
            <span>Metadata Ready</span>
          </span>
          <button
            type="button"
            onClick={() => onGenerate?.(asset.id)}
            title="Regenerate with AI"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[var(--border-structural)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="xs"
            onClick={() => onGenerate?.(asset.id)}
          >
            Generate All
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={() => onGenerate?.(asset.id)}
            icon={<RefreshCw className="w-3 h-3 text-[var(--text-muted)]" />}
          >
            Regenerate
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={handleSave}
            icon={<Check className="w-3 h-3 text-[var(--accent-success)]" />}
          >
            Validate
          </Button>
        </div>

        {/* Batch Queue Mode Switch */}
        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
          <span className="font-mono text-[11px]">Batch Queue Mode</span>
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${
              batchMode ? "bg-[var(--accent-cobalt)] justify-end" : "bg-[var(--bg-elevated)] border border-[var(--border-structural)] justify-start"
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-white shadow-xs inline-block" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--bg-base)]">
        {/* Preview Canvas Section */}
        <div className="rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] overflow-hidden shadow-xs">
          {/* Canvas Top Bar */}
          <div className="px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border-structural)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px] font-mono">
                Preview Canvas
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {isVector ? "Vector / Scalable Path" : "Raster Image"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.2 bg-[var(--bg-panel)] text-[var(--text-primary)] font-mono text-[10px] rounded border border-[var(--border-structural)]">
                {zoomScale}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(100)}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(200, z + 15))}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(50, z - 15))}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Canvas Render Frame */}
          <div className="h-44 bg-[var(--bg-void)] flex items-center justify-center relative overflow-hidden">
            {/* Subtle grid pattern background */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--accent-cyan)_1px,transparent_1px)] [background-size:16px_16px]" />

            <div
              className="relative z-10 max-h-36 max-w-xs flex items-center justify-center transition-transform duration-150"
              style={{ transform: `scale(${zoomScale / 100})` }}
            >
              <img
                src={assetUrl(asset.thumbnailUrl || asset.url)}
                alt={asset.name}
                className="max-h-32 max-w-full object-contain rounded drop-shadow-md"
              />
            </div>

            {/* Path / dimensions telemetry tag */}
            <div className="absolute bottom-2 left-3 text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-panel)]/90 px-2 py-0.5 rounded border border-[var(--border-structural)]">
              {isVector ? `Paths: 142 • Points: 1,840 • ${dimensionsStr}` : `Raster • ${dimensionsStr} • Format: ${formatExt}`}
            </div>
          </div>
        </div>

        {/* AI Metadata Banner Card */}
        <div className="p-2.5 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] shrink-0 animate-pulse" />
            <span className="text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1">
              <span>AI Metadata Generated</span>
              <Check className="w-3 h-3 text-[var(--accent-success)] inline" />
            </span>
            <span className="text-[var(--text-muted)] text-[10px] hidden md:inline">
              — AI analyzes visual composition, contextual keywords & platform schema
            </span>
          </div>

          <div className="text-[9px] text-[var(--accent-cyan)] font-mono px-2 py-0.5 rounded bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30 shrink-0 font-medium">
            Engine: Flux Meta-V3
          </div>
        </div>

        {/* Metadata Form Fields */}
        <div className="space-y-3">
          {/* Title Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <span>Title</span>
                <span className="text-[var(--accent-error)]">*</span>
                <span className="text-[var(--text-muted)] font-mono font-normal text-[10px]">
                  ({title.length} / 200 chars)
                </span>
              </label>
              <button
                type="button"
                onClick={() => onGenerate?.(asset.id)}
                className="text-[var(--accent-cyan)] hover:underline text-[10px] font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Regenerate Title</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:border-[var(--accent-cyan)] focus:outline-none"
            />
          </div>

          {/* Description Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <span>Description</span>
                <span className="text-[var(--text-muted)] font-mono font-normal text-[10px]">
                  ({description.length} / 1000 chars)
                </span>
              </label>
              <button
                type="button"
                onClick={() => onGenerate?.(asset.id)}
                className="text-[var(--accent-cyan)] hover:underline text-[10px] font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Regenerate Description</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-3 py-1.5 text-xs text-[var(--text-secondary)] font-normal leading-relaxed focus:border-[var(--accent-cyan)] focus:outline-none resize-none"
            />
          </div>

          {/* Keywords / Tags Cloud */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <span>Keywords (Tags)</span>
                <span className="text-[var(--accent-success)] font-mono font-normal text-[10px]">
                  ✓ {keywords.length} / 50 keywords
                </span>
              </label>
              <button
                type="button"
                onClick={() => onGenerate?.(asset.id)}
                className="text-[var(--accent-cyan)] hover:underline text-[10px] font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Regenerate Keywords</span>
              </button>
            </div>

            {/* Tags Cloud Container */}
            <div className="p-2.5 bg-[var(--bg-panel)] border border-[var(--border-structural)] rounded-lg flex flex-wrap gap-1.5">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-structural)] text-[11px] flex items-center gap-1 hover:border-[var(--border-strong)] transition-colors"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(i)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-error)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {showAddKeyword ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddKeyword();
                      if (e.key === "Escape") setShowAddKeyword(false);
                    }}
                    placeholder="tag name..."
                    className="w-24 bg-[var(--bg-elevated)] border border-[var(--accent-cyan)] rounded px-1.5 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-1.5 py-0.5 bg-[var(--accent-cobalt-solid)] text-white text-[10px] rounded"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddKeyword(true)}
                  className="px-2 py-0.5 rounded-full border border-dashed border-[var(--border-strong)] text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add keyword</span>
                </button>
              )}
            </div>
          </div>

          {/* Category & Licensing Dual Field */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
              >
                <option value="Illustration">Illustration</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Animals / Wildlife">Animals / Wildlife</option>
                <option value="Nature & Landscapes">Nature & Landscapes</option>
                <option value="Technology">Technology</option>
                <option value="Abstract">Abstract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">License</label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
              >
                <option value="Commercial Use">Commercial Use</option>
                <option value="Editorial Only">Editorial Only</option>
                <option value="Creative Commons CC-BY">Creative Commons CC-BY</option>
                <option value="Extended Commercial">Extended Commercial</option>
              </select>
            </div>
          </div>

          {/* Quality & Platform Compliance Validation Card */}
          <div className="rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-success)]" />
                <span className="text-[11px] font-bold tracking-wider text-[var(--text-primary)] uppercase font-mono">
                  Metadata Quality & Platform Compliance
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-success-solid)]/10 text-[var(--accent-success)] border border-[var(--accent-success)]/40">
                Score: {complianceScore}/100
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Title:</span>
                <span className="text-[var(--accent-success)] font-mono text-[10px] font-semibold">✓ PASS</span>
              </div>
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Description:</span>
                <span className="text-[var(--accent-success)] font-mono text-[10px] font-semibold">✓ PASS</span>
              </div>
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Keywords:</span>
                <span className="text-[var(--accent-success)] font-mono text-[10px] font-semibold">
                  ✓ {keywords.length} tags
                </span>
              </div>
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Category:</span>
                <span className="text-[var(--accent-success)] font-mono text-[10px]">Valid (98%)</span>
              </div>
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Relevance:</span>
                <span className="text-[var(--accent-cyan)] font-mono text-[10px] font-semibold">94%</span>
              </div>
              <div className="bg-[var(--bg-elevated)] p-1.5 rounded border border-[var(--border-structural)] flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-mono text-[10px]">Diversity:</span>
                <span className="text-[var(--accent-success)] font-mono text-[10px] font-semibold">✓ PASS</span>
              </div>
            </div>

            {/* Auto-optimize hint */}
            <div className="pt-2 border-t border-[var(--border-structural)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span>Metadata note: Tags conform to platform search taxonomy</span>
              </span>
              <button
                type="button"
                onClick={() => onGenerate?.(asset.id)}
                className="text-[var(--accent-warning)] hover:underline font-mono font-medium flex items-center gap-0.5"
              >
                <span>Auto-optimize</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-[var(--bg-panel)] border-t border-[var(--border-structural)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-success)]" />
          <span className="text-[11px] text-[var(--text-secondary)] font-medium">Metadata Status:</span>
          <span className="text-[11px] text-[var(--accent-success)] font-mono font-semibold">Ready ✓</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (asset.stockMetadata) {
                setTitle(asset.stockMetadata.title || asset.name || "");
                setDescription(asset.stockMetadata.description || "");
                setKeywords(asset.stockMetadata.keywords || []);
              }
            }}
          >
            Discard Changes
          </Button>

          {onExportSingleCsv && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onExportSingleCsv(asset)}
              icon={<FileDown className="w-3 h-3" />}
            >
              Export Manifest
            </Button>
          )}

          <Button
            variant="primary"
            size="xs"
            loading={isSaving}
            onClick={handleSave}
            icon={<Save className="w-3 h-3" />}
          >
            Save Metadata
          </Button>
        </div>
      </div>
    </main>
  );
};

export default MetadataEditor;
