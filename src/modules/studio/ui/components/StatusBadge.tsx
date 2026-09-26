// @ts-nocheck — live status badge closure extracted verbatim from App.tsx.
import React from 'react';
import { STATUS_CONFIG } from '../../registry/constants';

export interface StatusBadgeProps {
    asset: any;
    size?: string;
}

export default function StatusBadge({ asset, size = 'sm' }: StatusBadgeProps) {
        const status = asset.status || 'draft';
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
        const Icon = cfg.icon;

        const isDraft = status === 'draft';
        const label = cfg.label;
        const bgClass = isDraft
            ? 'bg-[var(--bg-elevated)]'
            : cfg.bg;
        const colorClass = isDraft
            ? 'text-[var(--text-secondary)]'
            : cfg.color;

        if (size === 'sm') {
            return (
                <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full ${bgClass} ${colorClass} border border-[var(--border-structural)]`}>
                    <Icon className="w-2.5 h-2.5" /> {label}
                </span>
            );
        }

        return (
            <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1.5 rounded-full ${bgClass} ${colorClass} border border-[var(--border-structural)]`}>
                <Icon className="w-3.5 h-3.5" /> {label}
            </span>
        );
}
