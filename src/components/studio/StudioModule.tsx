import StudioApp from "../../modules/studio";

/**
 * StudioModule (iterasi 4 shell reuse) — wrapper tipis di path baru components/studio/.
 *
 * STRATEGI: SHELL REUSE, NO REWRITE. No business-logic change — StudioApp
 * (src/modules/studio/App.tsx, 2515 baris) adalah renderer canonical yang sudah
 * handle Sidebar + Canvas + Modals + toasts. Layout split (sidebar kiri penuh
 * 7 section / gallery kanan / global footer Generate) diimplementasikan
 * iterasi 7+ saat Sidebar.tsx sudah dipecah.
 *
 * File ini pass-through penuh ke StudioApp — IDENTIK behaviour dengan
 * src/components/StudioModule.tsx existing, hanya beda path lokasi.
 */
export interface StudioModuleProps {
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
  onNavigate?: (module: string, assetIds?: string[]) => void;
}

export default function StudioModule({
  onNotify,
  onNavigate,
}: StudioModuleProps = {}) {
  return (
    <div className="h-full w-full overflow-hidden bg-[var(--color-bg-page)]">
      <StudioApp onNavigate={onNavigate} />
    </div>
  );
}