// @ts-nocheck — live full-image modal extracted verbatim from App.tsx.
import React, { useEffect } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AssetPreviewImage } from './AssetPreviewImage';

export interface DetailModalProps { [key: string]: any }

export default function DetailModal({ selectedAssetDetail, revisionState, previewZoom, setPreviewZoom, setSelectedAssetDetail }: DetailModalProps) {
        if (!selectedAssetDetail || revisionState.isOpen) return null;
        const asset = selectedAssetDetail;
        useEffect(() => { setPreviewZoom(1); }, [asset.id, setPreviewZoom]);

        // Wheel zoom pada area preview
        const clampZoom = z => Math.min(8, Math.max(1, z));
        const handleWheel = (e) => {
            if (e.deltaY < 0) setPreviewZoom(z => clampZoom(z + 0.4));
            else setPreviewZoom(z => clampZoom(z - 0.4));
        };

        return (
            <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm"
                onClick={() => { setPreviewZoom(1); setSelectedAssetDetail(null); }}
            >
                {/* Close button */}
                <button
                    onClick={() => { setPreviewZoom(1); setSelectedAssetDetail(null); }}
                    className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Zoom controls — kiri bawah */}
                <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-xl">
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(z => clampZoom(z - 0.4)); }}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(1); }}
                        className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center transition-all min-w-[52px]"
                        title="Reset zoom"
                    >
                        {Math.round(previewZoom * 100)}%
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(z => clampZoom(z + 0.4)); }}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setPreviewZoom(2); }}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all"
                        title="Actual size 200%"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Image only — click anywhere outside to close */}
                <div
                    className="max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative w-full h-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                    onWheel={handleWheel}
                    style={{ cursor: previewZoom > 1 ? 'grab' : 'default' }}
                >
                    <div className={`w-full h-full max-w-full max-h-[90vh] rounded-2xl overflow-auto custom-scrollbar relative ${asset.background === 'transparent' ? 'bg-checkered' : 'bg-white'}`}>
                        <div className="min-w-full min-h-full flex items-center justify-center p-4" style={{ width: previewZoom > 1 ? `${100 * previewZoom}%` : '100%' }}>
                            <AssetPreviewImage
                                src={asset.url}
                                alt={asset.stockMetadata?.title || asset.title || 'Preview'}
                                style={{ width: `${100 * previewZoom}%`, maxWidth: 'none' }}
                                className="object-contain select-none"
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
