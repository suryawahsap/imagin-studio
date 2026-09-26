import React, { useEffect, useState } from "react";
import { assetUrl } from "../../../../utils/assetUrl";
import { Loader2, ImageOff } from "lucide-react";

export interface AssetPreviewImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackText?: string;
}

export function resolvePreviewUrl(rawUrl?: string): { isDirect: boolean; resolvedUrl: string } {
  if (!rawUrl) return { isDirect: true, resolvedUrl: "" };
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return { isDirect: true, resolvedUrl: trimmed };
  }
  if (trimmed.startsWith("/storage/") || trimmed.startsWith("imagin://")) {
    return { isDirect: false, resolvedUrl: assetUrl(trimmed) };
  }
  return { isDirect: true, resolvedUrl: "" };
}

export function AssetPreviewImage({
  src,
  alt = "Asset preview",
  className = "",
  style,
  fallbackText = "Gambar tidak tersedia",
  onError,
  ...rest
}: AssetPreviewImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setError(false);
    setBlobUrl(null);

    if (!src) {
      setLoading(false);
      return;
    }

    const { isDirect, resolvedUrl } = resolvePreviewUrl(src);

    if (isDirect || !resolvedUrl) {
      setLoading(false);
      return;
    }

    let active = true;
    let createdObjectUrl: string | null = null;
    setLoading(true);

    fetch(resolvedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        createdObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(createdObjectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [src]);

  const { isDirect, resolvedUrl } = resolvePreviewUrl(src);
  const displaySrc = isDirect ? resolvedUrl : blobUrl;

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[var(--bg-elevated)]/60 text-[var(--text-secondary)] ${className}`}
        style={style}
        role="status"
        aria-label="Memuat pratinjau gambar"
      >
        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-cobalt)]" />
        <span className="font-mono text-[9px] font-bold mt-1 uppercase tracking-wider text-[var(--text-muted)]">Loading…</span>
      </div>
    );
  }

  if (error || (!displaySrc && !loading)) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-2 bg-[var(--bg-elevated)] text-[var(--accent-error)] text-center ${className}`}
        style={style}
        role="status"
        aria-label={fallbackText}
      >
        <ImageOff className="w-5 h-5 mb-1 opacity-80" />
        <span className="font-mono text-[9px] font-bold">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={displaySrc || ""}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        setError(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
