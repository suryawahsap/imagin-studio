import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { callGeminiForJSON } from '../../engines/generation';

export type CustomStyle = { id: string; name: string; directive: string; avoid: string };

export default function CustomStyleModal({ open, onClose, onSave, aiConfig, onApiCall, initial }: {
  open: boolean; onClose: () => void; onSave: (style: CustomStyle) => void; aiConfig: any; onApiCall: () => void; initial?: CustomStyle | null;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [brief, setBrief] = useState(initial?.directive || '');
  const [directive, setDirective] = useState(initial?.directive || '');
  const [avoid, setAvoid] = useState(initial?.avoid || '');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const optimize = async () => {
    if (!brief.trim()) return;
    setBusy(true);
    try {
      const result = await callGeminiForJSON({
        aiConfig,
        onApiCall,
        label: 'custom-style-optimize',
        payload: { contents: [{ parts: [{ text: `Create a reusable image style directive from this brief. Return JSON only with {"name":"","directive":"","avoid":""}. Name: ${name}. Style brief: ${brief}. Subject is excluded; describe rendering, composition, palette, material, lighting, and what to avoid.` }] }] },
      });
      if (result.data) { setDirective(String(result.data.directive || brief)); setAvoid(String(result.data.avoid || '')); if (result.data.name) setName(String(result.data.name)); }
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[75] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-strong)] p-5 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
      <div className="flex justify-between items-center"><h3 className="font-black">Custom Style</h3><button onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button></div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional style name" className="w-full imagin-input text-xs" />
      <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe the visual style (subject excluded)" className="w-full imagin-input text-xs h-24 resize-none" />
      <div className="text-[10px] text-[var(--text-secondary)]">Directive: {directive || 'Optimize to create a directive'}{avoid && ` · Avoid: ${avoid}`}</div>
      <div className="flex justify-end gap-2"><button onClick={optimize} disabled={busy || !brief.trim()} className="px-3 py-2 rounded-lg border border-[var(--border-structural)] text-xs font-bold disabled:opacity-50">{busy && <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />}Optimize</button><button onClick={() => onSave({ id: initial?.id || `custom_${Date.now()}`, name: name.trim() || 'Custom Style', directive: directive.trim() || brief.trim(), avoid: avoid.trim() })} disabled={!name.trim() && !brief.trim()} className="px-3 py-2 rounded-lg bg-[var(--accent-indigo-solid)] text-white text-xs font-bold disabled:opacity-50">Save</button></div>
    </div>
  </div>;
}
