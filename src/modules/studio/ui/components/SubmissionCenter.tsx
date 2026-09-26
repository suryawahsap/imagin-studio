import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Download, Eye } from 'lucide-react';
import { classifyAssetReadiness, computeSubmissionReadiness } from '../../engines/prompt';
import { handleBulkExport } from '../../../../components/metadata/export';

export default function SubmissionCenter({ assets = [], selectedAssetIds, setSelectedAssetIds, setPreflightState, showToast, computeSubmissionReadiness: compute = computeSubmissionReadiness, onFilterByStatus, isClassifying = false }: any) {
  const readiness = useMemo(() => compute(assets), [assets, compute]);
  const ready = assets.filter((a: any) => classifyAssetReadiness(a).status === 'ready');
  // Lifecycle paritas canvas (recordExportHistory): sekali ter-export (lineage.exportHistory terisi —
  // dipetakan dari rekaman library oleh library-sync) aset keluar dari Approved → Exported.
  // Paritas presisi: aset submitted TETAP di Submitted saja (canvas tidak menurunkan status submitted).
  const isExported = (a: any) => {
    const s = String(a.status).toLowerCase();
    if (s === 'submitted') return false;
    return s === 'exported' || (Array.isArray(a.lineage?.exportHistory) && a.lineage.exportHistory.length > 0);
  };
  const BUCKETS: Array<[string, (a: any) => boolean]> = [
    ['Approved', (a) => !isExported(a) && ['metadata_ready', 'ready'].includes(String(a.status).toLowerCase())],
    ['Review', (a) => String(a.status).toLowerCase() === 'needs_review'],
    ['Rejected', (a) => String(a.status).toLowerCase() === 'rejected'],
    ['Exported', isExported],
    ['Submitted', (a) => String(a.status).toLowerCase() === 'submitted'],
  ];
  const counts = BUCKETS.map(([label, pred]) => ({ label, count: assets.filter(pred).length }));
  const toggleReady = () => setSelectedAssetIds(new Set(selectedAssetIds?.size === ready.length ? [] : ready.map(a => a.id)));
  return <section className="flex-1 min-w-0 overflow-y-auto custom-scrollbar bg-[var(--bg-base)] p-6 space-y-5">
    <div className="flex items-center justify-between">
      <div><h1 className="text-sm font-bold">Submission Center</h1><p className="text-[11px] text-[var(--text-secondary)]">Kesiapan aset berdasarkan preflight yang tersimpan.</p></div>
      <button onClick={() => void handleBulkExport({ assets: (selectedAssetIds?.size ? ready.filter(a => selectedAssetIds.has(a.id)) : ready), showToast })} disabled={!ready.length} className="imagin-btn-primary rounded-lg px-3 py-2 text-[11px] font-bold flex items-center gap-2 disabled:opacity-40"><Download className="w-3.5 h-3.5" /> Export</button>
    </div>
    {isClassifying ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">{BUCKETS.map(([label]) => <div key={label} className="h-16 animate-pulse rounded-lg bg-[var(--bg-panel)]" />)}</div> : !assets.length ? <div className="rounded-lg border border-dashed border-[var(--border-structural)] p-8 text-center text-xs text-[var(--text-secondary)]">No submissions yet</div> : <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">{counts.map(({ label, count }) => <button type="button" key={label} onClick={() => onFilterByStatus?.(label.toLowerCase())} className="rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] p-3 text-left hover:border-[var(--accent-cobalt)]"><div className="text-[10px] uppercase text-[var(--text-secondary)]">{label}</div><div className="text-lg font-bold mt-1">{count}</div></button>)}</div>
      <div className="rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] p-4"><div className="flex justify-between text-[11px] font-semibold"><span>Readiness</span><span>{Math.round(readiness.readyRatio * 100)}%</span></div><div className="h-1.5 mt-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden"><div className="h-full bg-[var(--accent-cobalt)]" style={{ width: `${readiness.readyRatio * 100}%` }} /></div><p className="text-[10px] text-[var(--text-secondary)] mt-2">{readiness.ready} siap dari {readiness.total} aset · {readiness.recommendation === 'export' ? 'Siap export' : 'Perlu review'}</p></div>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Aset siap ({ready.length})</span><button onClick={toggleReady} className="text-[11px] text-[var(--accent-cobalt)]">{selectedAssetIds?.size === ready.length && ready.length ? 'Clear ready' : 'Select ready'}</button></div>
      {ready.length ? <div className="space-y-1">{ready.map((asset: any) => <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-structural)] bg-[var(--bg-panel)] px-3 py-2"><button onClick={() => setSelectedAssetIds((prev: Set<string>) => { const n = new Set(prev); n.has(asset.id) ? n.delete(asset.id) : n.add(asset.id); return n; })}>{selectedAssetIds?.has(asset.id) ? <CheckCircle2 className="w-4 h-4 text-[var(--accent-cobalt)]" /> : <Circle className="w-4 h-4 text-[var(--text-secondary)]" />}</button><span className="flex-1 truncate text-xs">{asset.name || asset.id}</span><button onClick={() => setPreflightState({ isOpen: true, asset })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Review"><Eye className="w-3.5 h-3.5" /></button></div>)}</div> : <div className="rounded-lg border border-dashed border-[var(--border-structural)] p-8 text-center text-xs text-[var(--text-secondary)]">Belum ada aset yang siap dikirim.</div>}
    </>}
  </section>;
}
