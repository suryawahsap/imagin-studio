// ImportPasteModal — extracted dari App.tsx (renderPasteJSONModal).
// Paste/upload JSON batch mentah, atau baca field reference docs.

import { Copy, Download, FileText, Info, ScanSearch, Upload, X, Zap } from "lucide-react";
import React from "react";
import { useEscapeClose } from '../useEscapeClose';
import { downloadCustomTemplate, processImportedJSON } from "../../engines/import-engine";
import { analyzePromptDifferentiation } from "../../flows/dnaData";
import type { PromptDifferentiationResult } from "../../flows/dnaData";
import ContentResearchPanel from "../components/ContentResearchPanel";

const FIELD_DOCS = [
  { field: 'batch_name', type: 'string', required: true, desc: 'Nama batch — ditampilkan di sidebar.' },
  { field: 'description', type: 'string', required: false, desc: 'Deskripsi opsional.' },
  { field: 'defaults', type: 'object', required: false, desc: 'Setting default untuk semua prompt. Bisa di-override per prompt.' },
  { field: 'defaults.assetType', type: '"vector" | "illustration" | "3d"', required: false, desc: 'Tipe asset.' },
  { field: 'defaults.adobeCategory', type: 'string', required: false, desc: 'Kategori Adobe Stock utama.' },
  { field: 'defaults.subcategory', type: 'string', required: false, desc: 'Subkategori.' },
  { field: 'defaults.style', type: 'string', required: false, desc: 'Gaya visual, misal "Flat Commercial", "Editorial Scene".' },
  { field: 'defaults.aspectRatio', type: '"4:3" | "1:1" | "16:9" | "3:2" | "3:4"', required: false, desc: 'Rasio aspek kanvas.' },
  { field: 'defaults.background', type: '"auto" | "white" | "transparent" | "greenscreen" | "scene"', required: false, desc: 'Mode background. "auto" = smart, disesuaikan otomatis per kategori/subkategori. "scene" = full-frame environment (untuk assetType photo). Default kalau field ini tidak diisi: "auto".' },
  { field: 'defaults.outputFormat', type: '"PNG" | "JPEG"', required: false, desc: 'Format output file.' },
  { field: 'defaults.highDpiSharpness', type: 'boolean', required: false, desc: 'Aktifkan parameter 4K ultra-sharp.' },
  { field: 'defaults.faceless', type: 'boolean', required: false, desc: 'Subjek tanpa wajah.' },
  { field: 'defaults.negativeSpace', type: 'boolean', required: false, desc: 'Copy space luas di sekitar subjek.' },
  { field: 'defaults.iconMode', type: 'boolean', required: false, desc: 'Aktifkan Icon Mode.' },
  { field: 'defaults.iconStyle', type: '"flat" | "lineal_color" | "black_outline" | "black_filled" | "gradient" | "hand_drawn" | "glyph" | "outline" | "duotone" | "filled"', required: false, desc: 'Wajib jika iconMode: true.' },
  { field: 'defaults.iconGenerationMode', type: '"per_canvas" | "sheet"', required: false, desc: 'per_canvas = 1 icon per file.' },
  { field: 'defaults.iconQuantity', type: 'number', required: false, desc: 'Jumlah icon per canvas atau per sheet.' },
  { field: 'prompts', type: 'array', required: true, desc: 'Array prompt. Max 200 prompt per batch.' },
  { field: 'prompts[].prompt', type: 'string', required: true, desc: 'Deskripsi visual asset. Satu subjek per prompt. Bahasa Inggris.' },
  { field: 'prompts[].*', type: 'any default field', required: false, desc: 'Override field defaults di level per-prompt.' },
];

export interface ImportPasteModalProps {
  open: boolean;
  jsonModalTab: string;
  setJsonModalTab: (tab: string) => void;
  headerMenuOpen: boolean;
  onHeaderMenuToggle: React.Dispatch<React.SetStateAction<boolean>>;
  pasteJsonInput: string;
  setPasteJsonInput: (text: string) => void;
  pasteJsonErrors: string[];
  setPasteJsonErrors: (errors: string[]) => void;
  showToast: (msg: string, type?: string) => void;
  setImportedBatch: (batch: any) => void;
  setBatchQueue: (queue: any) => void;
  setVectorState: (state: any) => void;
  setImportPasteModalOpen: (open: boolean) => void;
  clearBatchProgress: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  researchOpen: boolean;
  setResearchOpen: (open: boolean) => void;
  researchResults: PromptDifferentiationResult[];
  setResearchResults: (results: PromptDifferentiationResult[]) => void;
  isResearching: boolean;
  setIsResearching: (value: boolean) => void;
}

export default function ImportPasteModal({
  open,
  jsonModalTab,
  setJsonModalTab,
  headerMenuOpen,
  onHeaderMenuToggle,
  pasteJsonInput,
  setPasteJsonInput,
  pasteJsonErrors,
  setPasteJsonErrors,
  showToast,
  setImportedBatch,
  setBatchQueue,
  setVectorState,
  setImportPasteModalOpen,
  clearBatchProgress,
  fileInputRef,
  researchOpen,
  setResearchOpen,
  researchResults,
  setResearchResults,
  isResearching,
  setIsResearching,
}: ImportPasteModalProps) {
  const close = () => { setImportPasteModalOpen(false); setPasteJsonErrors([]); };
  useEscapeClose(open, close, () => isResearching);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-paste-title" tabIndex={-1} className="max-w-6xl w-full bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-2xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div>
            <h3 id="import-paste-title" className="font-black text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--accent-gold)]" /> JSON Batch Studio
            </h3>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {jsonModalTab === 'paste' ? 'Paste JSON batch atau upload file .json' : 'Referensi field JSON batch'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); onHeaderMenuToggle(prev => !prev); }}
                className="p-2 hover:bg-[var(--bg-element)] rounded-xl transition-all flex items-center gap-1 text-[var(--text-secondary)]"
                title="Menu"
              >
                <span className="text-lg leading-none px-0.5">⋮</span>
              </button>

              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => onHeaderMenuToggle(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => { setJsonModalTab('paste'); onHeaderMenuToggle(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-all ${
                        jsonModalTab === 'paste'
                          ? 'text-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> Custom JSON
                    </button>
                    <button
                      onClick={() => { setJsonModalTab('docs'); onHeaderMenuToggle(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center gap-2 transition-all ${
                        jsonModalTab === 'docs'
                          ? 'text-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-element)]'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" /> Field Reference
                    </button>
                    <div className="h-px bg-[var(--border-color)] my-1" />
                    <button
                      onClick={() => { downloadCustomTemplate(showToast); onHeaderMenuToggle(false); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Template
                    </button>
                    <button
                      onClick={() => { setJsonModalTab('docs'); onHeaderMenuToggle(false); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-element)] flex items-center gap-2"
                    >
                      <Info className="w-3.5 h-3.5" /> Field Docs
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={close} className="p-2 hover:bg-[var(--bg-element)] rounded-xl transition-all">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* TAB: CUSTOM PASTE */}
          {jsonModalTab === 'paste' && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className={`flex flex-col gap-3 min-h-0 overflow-hidden p-5 transition-all duration-300 ${researchOpen ? 'w-1/2' : 'w-full'}`}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">JSON Editor</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-element)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-gold)] flex items-center gap-1.5 transition-all"
                    title="Upload file .json dari komputer"
                  >
                    <Upload className="w-3 h-3" /> Upload .json
                  </button>
                  {pasteJsonInput.trim() && (
                    <button
                      onClick={() => {
                        setIsResearching(true); setResearchOpen(true);
                        setTimeout(() => {
                          try {
                            const parsed = JSON.parse(pasteJsonInput);
                            const prompts: string[] = Array.isArray(parsed.prompts) ? parsed.prompts.map((p: any) => p.prompt || '').filter(Boolean) : [];
                            setResearchResults(prompts.map(analyzePromptDifferentiation));
                          } catch { setResearchResults([]); }
                          setIsResearching(false);
                        }, 600);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 text-[11px] font-bold text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/20 flex items-center gap-1.5 transition-all"
                      title="Analisis similarity risk semua prompt">
                      <ScanSearch className="w-3 h-3" /> Research
                    </button>
                  )}
                  {pasteJsonInput.trim() && (
                    <button
                      onClick={() => { setPasteJsonInput(''); setPasteJsonErrors([]); }}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--accent-gold)]'); }}
                onDragLeave={e => { e.currentTarget.classList.remove('border-[var(--accent-gold)]'); }}
                onDrop={e => {
                  e.preventDefault(); e.currentTarget.classList.remove('border-[var(--accent-gold)]');
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  if (!file.name.toLowerCase().endsWith('.json')) { setPasteJsonErrors(['File harus .json']); return; }
                  const reader = new FileReader();
                  reader.onload = ev => { setPasteJsonInput(String(ev.target?.result || '')); setPasteJsonErrors([]); showToast(`File ${file.name} dimuat — klik Validate & Import`, 'success'); };
                  reader.readAsText(file);
                }}
                className="flex-1 flex flex-col min-h-0 border border-transparent rounded-xl transition-colors"
              >
              <textarea
                value={pasteJsonInput}
                onChange={e => { setPasteJsonInput(e.target.value); if (pasteJsonErrors.length) setPasteJsonErrors([]); }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 460) + 'px';
                }}
placeholder={`{
  "batch_name": "My Batch",
  "platform": "adobe_stock",
  "defaults": {
    "assetType": "vector",
    "aspectRatio": "4:3",
    "background": "white",
    "outputFormat": "PNG"
  },
  "prompts": [
    {
      "prompt": "Deskripsi visual asset pertama",
      "platformCategoryId": 3
    },
    {
      "prompt": "Deskripsi visual asset kedua",
      "platformCategoryId": 19
    }
  ]
}`}
                className="w-full p-3 imagin-input font-mono text-xs custom-scrollbar resize-none bg-[var(--bg-element)] min-h-[120px] max-h-[460px] shrink transition-[height] duration-200"
              />
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5 px-1">
                <Info className="w-3 h-3 flex-shrink-0" /> Tip: drag & drop file .json ke editor, atau klik Upload .json
              </div>
              {pasteJsonErrors.length > 0 && (
                <details className="shrink-0 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded-xl border border-[var(--accent-red)]/20 overflow-hidden group/errs">
                  <summary className="flex items-center justify-between px-3 py-2.5 font-black cursor-pointer list-none select-none hover:bg-[var(--accent-red)]/10 transition-colors">
                    <span> Validation Errors ({pasteJsonErrors.length})</span>
                    <span className="text-[10px] opacity-60 group-open/errs:hidden">▼ Show</span>
                    <span className="text-[10px] opacity-60 hidden group-open/errs:inline">▲ Hide</span>
                  </summary>
                  <ul className="list-disc pl-5 pb-3 pr-3 space-y-1 opacity-80 font-medium max-h-52 overflow-y-auto custom-scrollbar">
                    {pasteJsonErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </details>
              )}
              <button
                onClick={() => processImportedJSON(pasteJsonInput, { setPasteJsonErrors, showToast, setImportedBatch, setBatchQueue, setVectorState, setImportPasteModalOpen, setPasteJsonInput, clearBatchProgress })}
                disabled={!pasteJsonInput.trim()}
                className="w-full py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-card)] text-xs font-black tracking-widest flex justify-center items-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-40"
              >
                <Zap className="w-4 h-4 text-[var(--accent-gold)]" /> VALIDATE & IMPORT
              </button>
            </div>
            {researchOpen && (
              <div className="w-1/2 border-l border-[var(--border-color)] flex flex-col min-h-0">
                <ContentResearchPanel results={researchResults} isResearching={isResearching} onClose={() => setResearchOpen(false)} />
              </div>
            )}
            </div>
          )}

          {/* TAB: DOCS */}
          {jsonModalTab === 'docs' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 min-h-0">
              <div className="p-3 bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 rounded-xl text-[10px] text-[var(--text-secondary)] leading-relaxed">
                <span className="font-black text-[var(--accent-blue)]">Struktur JSON Batch IMAGIN.</span> Field di <code className="bg-[var(--bg-element)] px-1 rounded">defaults</code> berlaku untuk semua prompt. Field di <code className="bg-[var(--bg-element)] px-1 rounded">prompts[]</code> bisa override defaults per prompt. Field yang tidak diisi menggunakan nilai default sistem.
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[160px_1fr_auto] gap-2 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider pb-1 border-b border-[var(--border-color)]">
                  <span>Field</span><span>Tipe / Nilai</span><span>Req?</span>
                </div>
                {FIELD_DOCS.map((doc, i) => (
                  <div key={i} className={`grid grid-cols-[160px_1fr_auto] gap-2 items-start py-1.5 border-b border-[var(--border-color)]/50 text-[10px] ${doc.field.startsWith('prompts') ? 'bg-[var(--accent-green)]/3' : ''}`}>
                    <code className="text-[var(--accent-blue)] font-bold font-mono text-[9px] break-all">{doc.field}</code>
                    <div>
                      <div className="font-mono text-[9px] text-[var(--accent-gold)] mb-0.5">{doc.type}</div>
                      <div className="text-[var(--text-secondary)] leading-relaxed text-[9px]">{doc.desc}</div>
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${doc.required ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]' : 'bg-[var(--bg-element)] text-[var(--text-secondary)]'}`}>
                      {doc.required ? 'REQ' : 'OPT'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[var(--bg-element)] rounded-xl border border-[var(--border-color)] space-y-2">
                <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Contoh Minimal</div>
                <pre className="text-[9px] font-mono text-[var(--accent-green)] leading-relaxed overflow-x-auto custom-scrollbar">{`{
  "batch_name": "My First Batch",
  "defaults": {
    "background": "white",
    "outputFormat": "PNG",
    "highDpiSharpness": true,
    "negativeSpace": true,
    "faceless": false,
    "iconMode": false
  },
  "prompts": [
    {
      "prompt": "Entrepreneur at a startup desk with charts",
      "assetType": "vector",
      "adobeCategory": "Business",
      "subcategory": "Startup & Entrepreneurship",
      "style": "Flat Commercial",
      "aspectRatio": "4:3"
    },
    {
      "prompt": "Team meeting with sticky notes on whiteboard",
      "assetType": "vector",
      "adobeCategory": "Business",
      "subcategory": "Teamwork & Meeting",
      "style": "Editorial Scene",
      "aspectRatio": "4:3"
    }
  ]
}`}</pre>
                <button onClick={() => {
                  setPasteJsonInput(`{\n  "batch_name": "My First Batch",\n  "defaults": {\n    "background": "white",\n    "outputFormat": "PNG",\n    "highDpiSharpness": true,\n    "negativeSpace": true,\n    "faceless": false,\n    "iconMode": false\n  },\n  "prompts": [\n    {\n      "prompt": "Entrepreneur at a startup desk with charts",\n      "assetType": "vector",\n      "adobeCategory": "Business",\n      "subcategory": "Startup & Entrepreneurship",\n      "style": "Flat Commercial",\n      "aspectRatio": "4:3"\n    },\n    {\n      "prompt": "Team meeting with sticky notes on whiteboard",\n      "assetType": "vector",\n      "adobeCategory": "Business",\n      "subcategory": "Teamwork & Meeting",\n      "style": "Editorial Scene",\n      "aspectRatio": "4:3"\n    }\n  ]\n}`);                                        setJsonModalTab('paste');
                }} className="text-[10px] font-bold text-[var(--accent-blue)] hover:underline flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Pakai contoh ini → buka di editor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
