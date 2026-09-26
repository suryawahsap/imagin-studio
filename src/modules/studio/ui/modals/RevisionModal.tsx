// @ts-nocheck
import React from 'react';
import { Layers, Loader2, Palette, Save, Sparkles, X } from 'lucide-react';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';

export default function RevisionModal({ revisionState, setRevisionState, handleApplyRevision, saveRevisedAsset, aspectRatioToCss }) {
    useEscapeClose(Boolean(revisionState.isOpen && revisionState.asset), () => !revisionState.isRevising && setRevisionState(p => ({ ...p, isOpen: false })), () => revisionState.isRevising);
    if (!revisionState.isOpen || !revisionState.asset) return null;
    const close = () => !revisionState.isRevising && setRevisionState(p => ({ ...p, isOpen: false }));
    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm" onClick={close}>
            <div role="dialog" aria-modal="true" aria-labelledby="revision-title" tabIndex={-1} className="max-w-5xl w-full bg-[var(--bg-page)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center">
                    <div><h3 id="revision-title" className="font-black text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-[var(--accent-blue)]" /> AI Selective Studio</h3><div className="text-xs text-[var(--text-secondary)] mt-0.5">Revise colors or modify objects based on strict commercial constraints.</div></div>
                    <button onClick={close} className="p-2 rounded-lg hover:bg-[var(--bg-element)] transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--bg-page)]">
                    <div className="space-y-3"><div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Original Asset</div><div className={`overflow-hidden p-2 border border-[var(--border-color)] rounded-xl flex items-center justify-center shadow-inner ${revisionState.asset.background === 'transparent' ? 'bg-checkered' : 'bg-solid-white'}`} style={{ aspectRatio: aspectRatioToCss(revisionState.asset.aspectRatio) }}><AssetPreviewImage src={revisionState.asset.url} alt="original" className="w-full h-full object-contain" /></div></div>
                    <div className="space-y-5 flex flex-col">
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-[var(--text-primary)] block mb-2">Edit Mode</label><div className="flex bg-[var(--bg-element)] p-1 rounded-xl border border-[var(--border-color)]">
                                <button onClick={() => setRevisionState(p => ({ ...p, editMode: 'repaint' }))} disabled={revisionState.isRevising} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${revisionState.editMode === 'repaint' ? 'bg-white text-[var(--accent-blue)] shadow' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}><Palette className="w-3.5 h-3.5" /> Repaint / Colors</button>
                                <button onClick={() => setRevisionState(p => ({ ...p, editMode: 'modify_objects' }))} disabled={revisionState.isRevising} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${revisionState.editMode === 'modify_objects' ? 'bg-white text-[var(--accent-green)] shadow' : 'text-[var(--text-secondary)] hover:bg-white/50'}`}><Layers className="w-3.5 h-3.5" /> Modify Objects</button>
                            </div><div className="text-[10px] text-[var(--text-secondary)] mt-1.5 px-1 font-medium">{revisionState.editMode === 'repaint' ? "Locks structure and composition. Strictly for changing colors or surface styles." : "Flexible structure. Best for adding new items or removing existing ones (strict commercial rules applied)."}</div></div>
                            <div className="space-y-2"><label className="text-xs font-bold text-[var(--text-primary)] block">Revision Instruction</label><div className="flex gap-2"><input type="text" value={revisionState.instruction} onChange={e => setRevisionState(p => ({ ...p, instruction: e.target.value }))} placeholder={revisionState.editMode === 'repaint' ? "e.g. Change the van body color to royal blue" : "e.g. Add a red surfboard next to the van"} className="flex-1 p-3 imagin-input text-sm font-medium" disabled={revisionState.isRevising} /><button onClick={handleApplyRevision} disabled={revisionState.isRevising || !revisionState.instruction.trim()} className="px-5 py-3 bg-[var(--accent-blue-solid)] hover:bg-[var(--accent-action)] text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-2">{revisionState.isRevising ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Apply</button></div></div>
                        </div>
                        <div className="flex-1 flex flex-col space-y-3"><div className="text-xs font-bold text-[var(--accent-blue)] uppercase tracking-wider mt-2 border-t border-[var(--border-color)] pt-4">Revised Result</div><div className="flex-1 min-h-[200px] bg-solid-white rounded-xl overflow-hidden border border-[var(--border-color)] relative flex items-center justify-center shadow-inner">{revisionState.isRevising ? <div className="flex flex-col items-center gap-3 text-[var(--accent-blue)]"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs font-bold uppercase tracking-widest">Processing Revision...</span></div> : revisionState.revisedImageUrl ? <img src={revisionState.revisedImageUrl} alt="revised" className="w-full h-full object-contain p-2" /> : <div className="text-xs font-medium text-[var(--text-secondary)] text-center px-4">Enter an instruction and click Apply to see the result here.</div>}</div></div>
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex justify-end gap-3"><button onClick={close} className="px-5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-all">Cancel</button><button onClick={saveRevisedAsset} disabled={!revisionState.revisedImageUrl || revisionState.isRevising} className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[var(--text-primary)] text-[var(--bg-card)] disabled:opacity-50 hover:opacity-90 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Save to Library</button></div>
            </div>
        </div>
    );
}
