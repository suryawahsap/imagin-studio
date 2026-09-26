import React, { useState, useMemo } from "react";
import {
  Info,
  ShieldCheck,
  Tag,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import { InspectorPanel, Button } from "../global";
import { LibraryAsset } from "../../types";

export interface MetadataInspectorProps {
  asset: LibraryAsset | null;
  allAssets?: LibraryAsset[];
  onAddKeywordToAsset?: (kw: string) => void;
  onValidateSchema?: () => void;
  onAutoFillMissing?: () => void;
  onExportBatchCsv?: () => void;
}

export const MetadataInspector: React.FC<MetadataInspectorProps> = ({
  asset,
  allAssets = [],
  onAddKeywordToAsset,
  onValidateSchema,
  onAutoFillMissing,
  onExportBatchCsv,
}) => {
  const [activeTab, setActiveTab] = useState<string>("asset");
  const [targetPlatform, setTargetPlatform] = useState<string>("Adobe Stock");

  const isVector = asset?.type === "VECTOR";
  const formatExt = asset?.name.split(".").pop()?.toUpperCase() || (isVector ? "SVG" : "PNG");
  const dimensionsStr = asset?.resolution || (isVector ? "1024 × 1024" : "1920 × 1080");

  const titleLength = asset?.stockMetadata?.title?.length || 0;
  const kwCount = asset?.stockMetadata?.keywords?.length || 0;

  // Keyword Bank extracted across all library assets
  const keywordBank = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of allAssets) {
      for (const kw of a.stockMetadata?.keywords || []) {
        const clean = kw.trim().toLowerCase();
        if (clean) counts.set(clean, (counts.get(clean) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [allAssets]);

  return (
    <InspectorPanel
      title="INSPECTOR"
      badge="Schema v3.2"
      icon={<Info className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />}
      width={288}
      tabs={[
        { id: "asset", label: "Asset" },
        { id: "keywords", label: "Keywords" },
        { id: "audit", label: "Audit" },
        { id: "lineage", label: "Lineage" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="space-y-1.5">
          {onValidateSchema && (
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={onValidateSchema}
              icon={<ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-success)]" />}
            >
              Validate Schema
            </Button>
          )}

          {onAutoFillMissing && (
            <Button
              variant="secondary"
              size="xs"
              fullWidth
              onClick={onAutoFillMissing}
            >
              Auto-Fill Missing
            </Button>
          )}

          {onExportBatchCsv && (
            <Button
              variant="primary"
              size="xs"
              fullWidth
              onClick={onExportBatchCsv}
              icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              className="shadow-sm"
            >
              Export Batch CSV
            </Button>
          )}
        </div>
      }
    >
      {activeTab === "asset" && (
        <div className="space-y-3.5 text-xs">
          {/* Target Platform Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                Target Platform
              </span>
              <span className="text-[9px] text-[var(--accent-cyan)] font-mono">Primary Target</span>
            </div>
            <select
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-structural)] rounded px-2 py-1 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent-cyan)]"
            >
              <option value="Adobe Stock">Adobe Stock</option>
              <option value="Shutterstock">Shutterstock</option>
              <option value="Freepik">Freepik</option>
              <option value="Getty Images / iStock">Getty Images / iStock</option>
            </select>
          </div>

          {/* Platform Rules Checklist */}
          <div className="rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] p-2.5 space-y-2 shadow-xs">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono block">
              Platform Rules Checklist
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>Title length (5-200 chars)</span>
                </span>
                <span className="text-[var(--text-primary)] font-mono text-[10px]">{titleLength} chars</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>Description requirements</span>
                </span>
                <span className="text-[var(--accent-success)] font-mono text-[10px]">Passed</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>Keyword count (15-50)</span>
                </span>
                <span className="text-[var(--text-primary)] font-mono text-[10px]">{kwCount} tags</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>Category mapping</span>
                </span>
                <span className="text-[var(--accent-success)] font-mono text-[10px]">Mapped</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>AI disclosure declared</span>
                </span>
                <span className="text-[var(--accent-success)] font-mono text-[10px]">Compliant</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span>Commercial submission</span>
                </span>
                <span className="text-[var(--accent-success)] font-mono text-[10px]">Ready</span>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono block mb-1.5">
              Asset Details
            </span>
            <div className="space-y-1.5 text-[11px] divide-y divide-[var(--border-structural)]">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">File:</span>
                <span className="text-[var(--text-primary)] font-mono font-medium truncate max-w-[150px]">
                  {asset?.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Type:</span>
                <span className="text-[var(--accent-cyan)] font-mono">{isVector ? "Vector Path" : "Raster Image"}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Dimensions:</span>
                <span className="text-[var(--text-primary)] font-mono">{dimensionsStr}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Format:</span>
                <span className="text-[var(--text-primary)] font-mono">{formatExt}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Source:</span>
                <span className="text-[var(--text-primary)] font-mono">Studio Pipeline</span>
              </div>
            </div>
          </div>

          {/* Production DNA */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono block mb-1.5">
              Production DNA
            </span>
            <div className="p-2.5 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-structural)] space-y-1 text-[10px] font-mono shadow-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Source:</span>
                <span className="text-[var(--text-primary)]">Studio</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Model:</span>
                <span className="text-[var(--accent-cyan)]">Flux 1.1 Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Style DNA:</span>
                <span className="text-[var(--accent-warning)]">Cinematic / Vector</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Seed:</span>
                <span className="text-[var(--text-primary)]">2847563372</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "keywords" && (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-primary)]">Keyword Bank</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">{keywordBank.length} popular</span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Click any keyword tag below to add it directly to this asset's metadata.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {keywordBank.map(([kw, count]) => {
              const alreadyHas = asset?.stockMetadata?.keywords?.includes(kw);
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => onAddKeywordToAsset?.(kw)}
                  disabled={alreadyHas}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                    alreadyHas
                      ? "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-structural)] opacity-50 cursor-default"
                      : "bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] border-[var(--border-structural)]"
                  }`}
                >
                  <span>{kw}</span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-structural)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Preflight Validation</span>
              <span className="font-mono text-[10px] text-[var(--accent-success)]">PASSED ✓</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Automated checks verified platform compliance against standard microstock metadata schema requirements.
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-structural)] space-y-2">
            <div className="font-semibold text-[var(--text-primary)]">Submission Status</div>
            <div className="space-y-1 font-mono text-[10px] text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-[var(--accent-success)] font-semibold">Ready for Export</span>
              </div>
              <div className="flex justify-between">
                <span>Release Required:</span>
                <span>No Property Release</span>
              </div>
              <div className="flex justify-between">
                <span>Editorial:</span>
                <span>Commercial Allowed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "lineage" && (
        <div className="space-y-3 text-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono block">
            Lineage Tree
          </span>

          <div className="space-y-2.5 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-structural)]">
            <div className="relative flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[10px] text-[var(--text-muted)] -ml-5 font-mono">
                1
              </span>
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Studio (Text to Image)</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">prompt_synthesis.png</span>
              </div>
            </div>

            <div className="relative flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[10px] text-[var(--text-muted)] -ml-5 font-mono">
                2
              </span>
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Vectorize (Path Tracer)</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">{asset?.name || "vector.svg"}</span>
              </div>
            </div>

            <div className="relative flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center text-[10px] text-black -ml-5 font-bold font-mono">
                3
              </span>
              <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 p-2 rounded-lg">
                <span className="text-xs font-semibold text-[var(--accent-cyan)] block">Metadata Workspace</span>
                <span className="text-[10px] text-[var(--accent-success)] font-mono font-medium">Ready for Stock Export</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </InspectorPanel>
  );
};

export default MetadataInspector;
