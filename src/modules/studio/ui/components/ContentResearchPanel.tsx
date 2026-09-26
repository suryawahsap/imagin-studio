import React from 'react';
import { ChevronDown, Loader2, ScanSearch, X } from 'lucide-react';
import type { PromptDifferentiationResult } from '../../flows/dnaData';

export interface ContentResearchPanelProps {
    results: PromptDifferentiationResult[];
    isResearching: boolean;
    onClose: () => void;
}

export default function ContentResearchPanel({ results, isResearching, onClose }: ContentResearchPanelProps) {
    const riskColor = (r: string) => r === 'high' ? 'text-[var(--accent-error)]' : r === 'medium' ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-success)]';
    const riskBg = (r: string) => r === 'high' ? 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/30' : r === 'medium' ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/30' : 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30';
    const tierLabel = (t: string) => t === 'red' ? ' Tier Red' : t === 'yellow' ? ' Tier Yellow' : t === 'green' ? ' Tier Green' : ' Unknown';
    const riskLabel = (r: string) => r === 'high' ? ' HIGH RISK' : r === 'medium' ? ' MEDIUM RISK' : ' LOW RISK';
    const highCount = results.filter(r => r.riskLevel === 'high').length;
    const medCount = results.filter(r => r.riskLevel === 'medium').length;
    const lowCount = results.filter(r => r.riskLevel === 'low').length;
    return (
        <div className="flex flex-col h-full min-h-0 bg-[var(--bg-panel)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-structural)] shrink-0">
                <div><div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2"><ScanSearch className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" /> Content Research</div><div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Similarity Risk Analysis</div></div>
                <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>
            </div>
            {isResearching ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent-cobalt)]" /><div className="font-mono text-xs font-bold">Analyzing prompts...</div></div>
            ) : results.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] px-4 text-center"><ScanSearch className="w-8 h-8 opacity-30" /><div className="font-mono text-xs font-bold">No results yet</div><div className="text-[10px] opacity-60 font-mono">Paste JSON prompts then click Research</div></div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="px-4 py-2.5 flex items-center gap-3 border-b border-[var(--border-structural)] shrink-0 bg-[var(--bg-elevated)]">
                        <div className="font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{results.length} Prompts</div>
                        <div className="flex items-center gap-1.5 ml-auto font-mono text-[10px] font-bold">{highCount > 0 && <span className="px-2 py-0.5 rounded-full bg-[var(--accent-error)]/15 text-[var(--accent-error)]">{highCount} High</span>}{medCount > 0 && <span className="px-2 py-0.5 rounded-full bg-[var(--accent-warning)]/15 text-[var(--accent-warning)]">{medCount} Med</span>}{lowCount > 0 && <span className="px-2 py-0.5 rounded-full bg-[var(--accent-success)]/15 text-[var(--accent-success)]">{lowCount} Low</span>}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--border-structural)]">
                        {results.map((r, i) => (
                            <details key={i} className="group/res">
                                <summary className="px-4 py-2.5 flex items-center gap-2.5 cursor-pointer list-none select-none hover:bg-[var(--bg-hover)] transition-colors font-mono">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] w-6 shrink-0">#{i + 1}</span><div className="flex-1 min-w-0"><div className={`text-[10px] font-bold ${riskColor(r.riskLevel)}`}>{riskLabel(r.riskLevel)}</div>{r.detectedSubject && <div className="text-[9px] text-[var(--text-muted)] truncate">{tierLabel(r.subjectTier)} · "{r.detectedSubject}"</div>}</div><div className="text-[9px] text-[var(--text-muted)] shrink-0">Score {r.totalScore}/5</div><ChevronDown className="w-3 h-3 text-[var(--text-muted)] group-open/res:rotate-180 transition-transform shrink-0" />
                                </summary>
                                <div className={`px-4 py-3 mx-3 mb-2 rounded-xl border text-[10px] space-y-2 ${riskBg(r.riskLevel)}`}>
                                    <div className="grid grid-cols-3 gap-2">{[{ label: 'Style', score: r.styleScore, hints: r.matchedStyleHints }, { label: 'Composition', score: r.compositionScore, hints: r.matchedCompositionHints }, { label: 'Context', score: r.contextScore, hints: r.matchedContextHints }].map(({ label, score, hints }) => <div key={label} className="bg-[var(--bg-panel)] rounded-lg p-2 border border-[var(--border-structural)]"><div className="font-bold text-[var(--text-primary)] mb-1 font-mono">{label}</div><div className="flex gap-0.5 mb-1">{[0, 1].map(j => <div key={j} className={`h-1.5 flex-1 rounded-full ${j < score ? 'bg-[var(--accent-success)]' : 'bg-[var(--border-structural)]'}`} />)}</div>{hints.length > 0 && <div className="text-[var(--accent-success)] opacity-90 truncate font-mono text-[9px]"> {hints[0]}</div>}</div>)}</div>
                                    {r.suggestions.length > 0 && <div className="space-y-1"><div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[9px] font-mono">Suggestions</div>{r.suggestions.map((s, si) => <div key={si} className="text-[var(--text-secondary)] flex gap-1.5"><span className="shrink-0 text-[var(--accent-cobalt)]">→</span><span>{s}</span></div>)}</div>}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
