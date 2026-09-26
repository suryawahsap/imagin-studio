import React from 'react';
import { Check, Info, Loader2, Moon, X } from 'lucide-react';
import { AssetPreviewImage } from '../components/AssetPreviewImage';
import { useEscapeClose } from '../useEscapeClose';

export interface EditBgState { isOpen: boolean; asset: any; bgMode: 'transparent' | 'white' | 'custom'; bgColor: string; processing: boolean; previewUrl: string | null; }
export interface EditBgModalProps { state: EditBgState; setEditBgState: (fn: any) => void; onApply: () => void; }

export default function EditBgModal({ state: editBgState, setEditBgState, onApply }: EditBgModalProps) {
    useEscapeClose(Boolean(editBgState.isOpen && editBgState.asset), () => { if (!editBgState.processing) setEditBgState(p => ({ ...p, isOpen: false, previewUrl: null })); }, () => editBgState.processing);
    if (!editBgState.isOpen || !editBgState.asset) return null;
    const close = () => { if (!editBgState.processing) setEditBgState(p => ({ ...p, isOpen: false, previewUrl: null })); };
    return (
        <div className="fixed inset-0 z-[75] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm" onClick={close}>
            <div role="dialog" aria-modal="true" aria-labelledby="edit-bg-title" tabIndex={-1} className="max-w-sm w-full bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between"><div className="flex items-center gap-2"><Moon className="w-4 h-4 text-[var(--mod-st-text)]" /><h3 id="edit-bg-title" className="font-black text-sm text-[var(--text-primary)]">Edit Background</h3></div><button onClick={close} disabled={editBgState.processing} className="p-1.5 rounded-lg hover:bg-[var(--bg-element)] transition-all disabled:opacity-40"><X className="w-4 h-4" /></button></div>
                <div className="p-4 space-y-4">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden border border-[var(--border-color)] flex items-center justify-center" style={{ background: editBgState.bgMode === 'transparent' ? '#eef1f5' : editBgState.bgMode === 'white' ? '#ffffff' : editBgState.bgColor }}><AssetPreviewImage src={editBgState.asset.url} alt="preview" className="w-full h-full object-contain" /></div>
                    <div className="space-y-2"><div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Warna Latar</div><div className="flex gap-2">{(['transparent','white','custom'] as const).map(id => <button key={id} onClick={() => setEditBgState(p => ({ ...p, bgMode: id }))} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${editBgState.bgMode === id ? 'bg-[var(--module-studio)]/20 text-[var(--text-primary)] border-[var(--module-studio)]/40' : 'bg-[var(--bg-element)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--module-studio)]/30'}`}>{id==='transparent'?'Transparan':id==='white'?'Putih':'Kustom'}</button>)}</div>
                        {editBgState.bgMode === 'custom' && <div className="flex items-center gap-3 p-2 bg-[var(--bg-element)] rounded-xl border border-[var(--border-color)]"><input type="color" value={editBgState.bgColor} onChange={e => setEditBgState(p => ({ ...p, bgColor: e.target.value }))} className="w-10 h-8 rounded-lg border-0 cursor-pointer bg-transparent" /><span className="text-xs font-mono text-[var(--text-secondary)]">{editBgState.bgColor}</span></div>}
                    </div>
                    <div className="text-[9px] text-[var(--text-secondary)] flex items-start gap-1.5"><Info className="w-3 h-3 flex-shrink-0 mt-0.5" />Perubahan langsung ditimpa ke aset. Gunakan AI Revision jika ingin menyimpan sebagai aset baru.</div>
                </div>
                <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3"><button onClick={close} disabled={editBgState.processing} className="px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-element)] transition-all disabled:opacity-40">Batal</button><button onClick={onApply} disabled={editBgState.processing} className="flex-1 py-2.5 rounded-xl font-black text-xs bg-[var(--module-studio)] text-[var(--text-primary)] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">{editBgState.processing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menerapkan…</> : <><Check className="w-3.5 h-3.5" /> Terapkan Background</>}</button></div>
            </div>
        </div>
    );
}
