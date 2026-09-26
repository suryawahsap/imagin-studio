// SettingsModal — extracted dari imagin_studio.tsx line 27045–27158.
// Konfigurasi: API key Gemini/9Router, model selection, negative prompt rules, IMAGIN Video URL.

import { Film, Key, Settings, X, Check, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import type { SystemSettings } from "../../types";
import { useEscapeClose } from '../useEscapeClose';

const isValidModelId = (value: string) => value.length > 0 && value.length <= 256 && value.trim() === value;

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  systemSettings: SystemSettings;
  onUpdateAIConfig: (key: "textModel" | "imageModel" | "provider", value: string) => void;
  onUpdateCommercialRules: (key: "defaultNegativePrompt" | "enableDifferentiationCheck", value: any) => void;
  onUpdateVideoUrl?: (url: string) => void;
  onSave?: () => void;
  onSaveError?: () => void;
  showToast?: (message: string, type?: string) => void;
}

export default function SettingsModal({
  open,
  onClose,
  systemSettings,
  onUpdateAIConfig,
  onUpdateCommercialRules,
  onUpdateVideoUrl,
  onSave,
  onSaveError,
  showToast,
}: SettingsModalProps) {
  useEscapeClose(open, onClose, () => isSaving || Boolean(pingStatus?.running));
  const [nineRouterKeyInput, setNineRouterKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("https://9router.rahmatur.dev");
  const [initialBaseUrl, setInitialBaseUrl] = useState("https://9router.rahmatur.dev");
  const [imageEndpointInput, setImageEndpointInput] = useState("https://9router.rahmatur.dev/v1/images/generations");
  const [initialImageEndpoint, setInitialImageEndpoint] = useState("https://9router.rahmatur.dev/v1/images/generations");
  const [availableTextModels, setAvailableTextModels] = useState<string[]>([]);
  const [availableImageModels, setAvailableImageModels] = useState<string[]>([]);
  const [isFetchedModels, setIsFetchedModels] = useState(false);
  const [lastTestedConfig, setLastTestedConfig] = useState<{ baseUrl: string; apiKey?: string } | null>(null);
  const [manualModelId, setManualModelId] = useState("");
  const [manualModelMessage, setManualModelMessage] = useState<string | null>(null);
  const [manualModelIds, setManualModelIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [pingStatus, setPingStatus] = useState<null | {
    running: boolean;
    ok: boolean;
    message: string;
  }>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  // Invalidate discovery state when baseUrl or apiKey input changes (keeps model catalogs intact)
  const resetDiscoveryState = () => {
    if (isFetchedModels || pingStatus) {
      setIsFetchedModels(false);
      setLastTestedConfig(null);
      setPingStatus({
        running: false,
        ok: false,
        message: "Konfigurasi diubah. Silakan jalankan Test Koneksi kembali.",
      });
    }
  };

  const handleBaseUrlChange = (val: string) => {
    setBaseUrlInput(val);
    resetDiscoveryState();
  };

  const handleImageEndpointChange = (val: string) => {
    setImageEndpointInput(val);
    resetDiscoveryState();
  };

  const handleKeyInputChange = (val: string) => {
    setNineRouterKeyInput(val);
    resetDiscoveryState();
  };

  // Base URL & model catalog tersimpan di config — dimuat saat modal dibuka
  React.useEffect(() => {
    if (!open) return;
    setSaveError(null);
    setIsSaving(false);
    window.api?.studioGetConfig?.().then((res) => {
      if (res?.success && res.config) {
        const config = res.config as any;
        if (config.nineRouterBaseUrl) {
          setBaseUrlInput(config.nineRouterBaseUrl);
          setInitialBaseUrl(config.nineRouterBaseUrl);
        }
        if (config.nineRouterImageEndpoint) {
          setImageEndpointInput(config.nineRouterImageEndpoint);
          setInitialImageEndpoint(config.nineRouterImageEndpoint);
        }
        if (Array.isArray(config.availableTextModels) && config.availableTextModels.length > 0) {
          setAvailableTextModels(config.availableTextModels);
        } else {
          setAvailableTextModels([]);
        }
        if (Array.isArray(config.availableImageModels) && config.availableImageModels.length > 0) {
          setAvailableImageModels(config.availableImageModels);
        } else {
          setAvailableImageModels([]);
        }
      }
    }).catch(() => {});
  }, [open]);

  if (!open) return null;

  const handlePing = async () => {
    const cleanedUrl = baseUrlInput.trim();
    if (!cleanedUrl) {
      setPingStatus({ running: false, ok: false, message: "Endpoint Base URL wajib diisi." });
      return;
    }

    const cleanedKey = nineRouterKeyInput.trim() || undefined;
    const payload = { baseUrl: cleanedUrl, apiKey: cleanedKey };

    setPingStatus({
      running: true,
      ok: false,
      message: "Menguji koneksi gateway & mengambil daftar model…",
    });
    setSaveError(null);

    try {
      if (!window.api?.studioPing) {
        setPingStatus({
          running: false,
          ok: false,
          message: "studioPing tidak tersedia di environment ini.",
        });
        return;
      }

      const pingRes = await window.api.studioPing(payload);
      if (!pingRes || !pingRes.success) {
        setPingStatus({
          running: false,
          ok: false,
          message: pingRes?.detail || "Gagal terhubung ke gateway 9Router.",
        });
        return;
      }

      if (!window.api?.studioFetchModels) {
        setPingStatus({
          running: false,
          ok: true,
          message: pingRes.detail || "Terhubung  (Auto-discover model tidak tersedia)",
        });
        return;
      }

      const modelsRes = await window.api.studioFetchModels(payload);
      if (!modelsRes || !modelsRes.success) {
        setPingStatus({
          running: false,
          ok: false,
          message: modelsRes?.detail || "Koneksi berhasil, tetapi gagal mengambil daftar model.",
        });
        return;
      }

      const fetchedText = Array.isArray(modelsRes.textModels) ? modelsRes.textModels : [];
      const fetchedImage = Array.isArray(modelsRes.imageModels) ? modelsRes.imageModels : [];

      const catalog = Array.isArray(modelsRes.models) ? modelsRes.models : [];
      setAvailableTextModels([...fetchedText].sort());
      setAvailableImageModels([...fetchedImage].sort());
      const currentText = systemSettings.aiConfig.textModel;
      if (fetchedText.length > 0 && !fetchedText.includes(currentText)) {
        onUpdateAIConfig("textModel", fetchedText[0]);
      }

      if (fetchedImage.length > 0) {
        setAvailableImageModels(fetchedImage);
        const currentImage = systemSettings.aiConfig.imageModel;
        if (!fetchedImage.includes(currentImage)) {
          onUpdateAIConfig("imageModel", fetchedImage[0]);
        }
      }

      setIsFetchedModels(true);
      setLastTestedConfig(payload);
      setPingStatus({
        running: false,
        ok: true,
        message: `Terhubung  (${catalog.length || fetchedText.length + fetchedImage.length} model: ${fetchedText.length} text, ${fetchedImage.length} image${modelsRes.imageSource === "kind-endpoint" ? " (endpoint khusus)" : " (heuristic)"}).`,
      });
    } catch (err: any) {
      const rawMsg = err?.message || "Terjadi kesalahan koneksi";
      const safeMsg = nineRouterKeyInput.trim() ? rawMsg.replaceAll(nineRouterKeyInput.trim(), "***") : rawMsg;
      setPingStatus({
        running: false,
        ok: false,
        message: safeMsg,
      });
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    const cleanedUrl = baseUrlInput.trim();
    if (!cleanedUrl) {
      setSaveError("Endpoint Base URL tidak boleh kosong.");
      return;
    }

    const cleanedImageEndpoint = imageEndpointInput.trim();
    if (!cleanedImageEndpoint) {
      setSaveError("Image Generation Endpoint tidak boleh kosong.");
      return;
    }

    const cleanedKey = nineRouterKeyInput.trim() || undefined;

    // If user changed connection settings or key, require Test Koneksi discovery first
    if (!isFetchedModels) {
      const isBaseUrlChanged = cleanedUrl !== initialBaseUrl;
      const isImageEndpointChanged = cleanedImageEndpoint !== initialImageEndpoint;
      if (cleanedKey || isBaseUrlChanged || isImageEndpointChanged || (lastTestedConfig && (lastTestedConfig.baseUrl !== cleanedUrl || lastTestedConfig.apiKey !== cleanedKey))) {
        setSaveError("Silakan jalankan 'Test Koneksi' terlebih dahulu untuk memverifikasi model gateway.");
        return;
      }
    }

    const selectedTextModel = systemSettings.aiConfig.textModel;
    const selectedImageModel = systemSettings.aiConfig.imageModel;

    const validTextList = availableTextModels;
    const validImageList = availableImageModels;

    if (isFetchedModels && availableTextModels.length === 0) {
      setSaveError("Model text wajib tersedia dari gateway sebelum menyimpan.");
      return;
    }

    if (!selectedTextModel || !validTextList.includes(selectedTextModel)) {
      setSaveError(`Model text terpilih (${selectedTextModel || "kosong"}) tidak tersedia.`);
      return;
    }

    if (!selectedImageModel || !validImageList.includes(selectedImageModel)) {
      setSaveError(`Model image terpilih (${selectedImageModel || "kosong"}) tidak tersedia.`);
      return;
    }

    const patch: any = {
      provider: "9router",
      textModel: selectedTextModel,
      imageModel: selectedImageModel,
      nineRouterBaseUrl: cleanedUrl,
      nineRouterImageEndpoint: cleanedImageEndpoint,
      availableTextModels: validTextList,
      availableImageModels: validImageList,
    };

    if (nineRouterKeyInput.trim()) {
      patch.nineRouterApiKey = nineRouterKeyInput.trim();
    }

    setIsSaving(true);
    try {
      const res = await window.api.studioSaveConfig(patch);
      if (res && res.success === false) {
        setSaveError(res.detail || "Gagal menyimpan konfigurasi.");
        onSaveError?.();
        setIsSaving(false);
        return;
      }
      setNineRouterKeyInput("");
      onSave?.();
      onClose();
    } catch (err: any) {
      const rawMsg = err?.message || "Gagal menyimpan konfigurasi.";
      const safeMsg = nineRouterKeyInput.trim() ? rawMsg.replaceAll(nineRouterKeyInput.trim(), "***") : rawMsg;
      setSaveError(safeMsg);
      onSaveError?.();
      setIsSaving(false);
    }
  };

  const addManualModel = () => {
    if (!isValidModelId(manualModelId)) {
      setManualModelMessage("ID model wajib 1–256 karakter tanpa spasi di awal atau akhir.");
      return;
    }
    const bucket = availableImageModels;
    if (bucket.includes(manualModelId)) {
      setManualModelMessage("Model ini sudah terdaftar.");
      return;
    }
    if (bucket.length >= 200) {
      setManualModelMessage("Bucket image sudah mencapai batas 200 model.");
      return;
    }
    setAvailableImageModels((current) => [...current, manualModelId]);
    setManualModelIds((current) => new Set(current).add(manualModelId));
    setManualModelId("");
    setManualModelMessage(null);
  };
  const removeManualModel = (id: string, kind: "text" | "image") => {
    setAvailableTextModels((current) => current.filter((model) => model !== id));
    setAvailableImageModels((current) => current.filter((model) => model !== id));
    if (kind === "text" && systemSettings.aiConfig.textModel === id) onUpdateAIConfig("textModel", "");
    if (kind === "image" && systemSettings.aiConfig.imageModel === id) onUpdateAIConfig("imageModel", "");
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 md:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full bg-vintage-ivory rounded-3xl border border-vintage-border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-settings-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-vintage-border bg-vintage-paper/50">
          <div>
            <h3 id="modal-settings-title" className="font-extrabold text-base flex items-center gap-2 text-vintage-coffee">
              <Settings className="w-4 h-4 text-vintage-mustard" /> Pengaturan Sistem Studio
            </h3>
            <p className="text-[11px] text-vintage-coffee/70 mt-0.5">
              Konfigurasi koneksi AI Gateway, preferensi model, dan aturan komersial.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup settings"
            className="text-vintage-coffee hover:bg-vintage-paper rounded-xl p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-vintage-mustard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body - 2 Column Layout on MD screens */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left Column: Gateway Connection & Discovery */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-vintage-border/60 pb-2">
                  <h4 className="font-extrabold text-vintage-mustard flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                    <Key className="w-3.5 h-3.5" /> Gateway & Koneksi
                  </h4>
                  <span className="text-[10px] font-mono text-vintage-coffee/60 bg-vintage-paper px-2 py-0.5 rounded border border-vintage-border">
                    Provider: 9Router
                  </span>
                </div>

                <div>
                  <label htmlFor="endpoint-base-url" className="block font-bold mb-1 text-vintage-navy">
                    Endpoint Base URL
                  </label>
                  <input
                    id="endpoint-base-url"
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => handleBaseUrlChange(e.target.value)}
                    placeholder="https://9router.rahmatur.dev"
                    className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all"
                  />
                  <span className="text-[10px] text-vintage-navy/70 mt-1 block">
                    URL dasar untuk /models dan /chat/completions.
                  </span>
                </div>

                <div>
                  <label htmlFor="image-endpoint-url" className="block font-bold mb-1 text-vintage-navy">
                    Image Generation Endpoint
                  </label>
                  <input
                    id="image-endpoint-url"
                    type="text"
                    value={imageEndpointInput}
                    onChange={(e) => handleImageEndpointChange(e.target.value)}
                    placeholder="https://9router.rahmatur.dev/v1/images/generations"
                    className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all"
                  />
                  <span className="text-[10px] text-vintage-navy/70 mt-1 block">
                    URL khusus dipakai langsung untuk pembuatan gambar.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="nine-router-api-key" className="font-bold text-vintage-navy">
                      9Router API Key
                    </label>
                    {systemSettings.aiConfig.hasNineRouterKey ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-success)] bg-[var(--module-vectorize)] px-2 py-0.5 rounded-full border border-[var(--accent-success)]/40">
                        <Check className="w-3 h-3 text-[var(--accent-success)]" /> Key Tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-warning)] bg-[var(--module-library)] px-2 py-0.5 rounded-full border border-[var(--accent-warning)]/40">
                        <AlertTriangle className="w-3 h-3 text-[var(--accent-warning)]" /> Belum Konfigurasi
                      </span>
                    )}
                  </div>
                  <input
                    id="nine-router-api-key"
                    type="password"
                    value={nineRouterKeyInput}
                    onChange={(e) => handleKeyInputChange(e.target.value)}
                    placeholder={systemSettings.aiConfig.hasNineRouterKey ? "Kosongkan jika tidak ingin mengubah" : "Masukkan API key baru"}
                    className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all"
                  />
                  <span className="text-[10px] text-vintage-navy/70 mt-1 block">
                    Key disimpan terenkripsi aman di main process (safeStorage).
                  </span>
                </div>
              </div>

              {/* Status Box & Action */}
              <div className="bg-vintage-paper/80 p-3.5 rounded-2xl border border-vintage-border space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-vintage-coffee">Status Koneksi & Model</span>
                  <button
                    onClick={handlePing}
                    disabled={pingStatus?.running || isSaving}
                    aria-label="Test koneksi gateway 9Router"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-vintage-mustard/60 bg-vintage-mustard/20 text-[11px] font-extrabold text-vintage-coffee hover:bg-vintage-mustard/30 transition-all disabled:opacity-50 focus:ring-2 focus:ring-vintage-mustard"
                  >
                    {pingStatus?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin text-vintage-coffee" /> : <ShieldCheck className="w-3.5 h-3.5 text-vintage-coffee" />}
                    {pingStatus?.running ? "Menguji…" : "Test Koneksi"}
                  </button>
                </div>
                <div aria-live="polite" className="min-h-[1.25rem]">
                  {pingStatus ? (
                    <p className={`text-[10px] font-medium leading-relaxed ${pingStatus.running ? "text-vintage-coffee/80" : pingStatus.ok ? "text-[var(--accent-success)]" : "text-[var(--accent-error)]"}`}>
                      {pingStatus.message}
                    </p>
                  ) : (
                    <p className="text-[10px] text-vintage-coffee/60 italic">
                      Klik &apos;Test Koneksi&apos; untuk mendeteksi model yang tersedia di gateway.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Model Selections & Generation Rules */}
            <div className="space-y-4">
              <div className="border-b border-vintage-border/60 pb-2">
                <h4 className="font-extrabold text-vintage-mustard flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  Model AI & Aturan Komersial
                </h4>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="text-model-select" className="font-bold text-vintage-navy">Text Engine Model</label>
                  <span className="text-[10px] font-semibold text-vintage-coffee/70">
                    {isFetchedModels ? `${availableTextModels.length} model terdeteksi` : `${availableTextModels.length} model (cached)`}
                  </span>
                </div>
                <select
                  id="text-model-select"
                  value={systemSettings.aiConfig.textModel}
                  onChange={(e) => onUpdateAIConfig("textModel", e.target.value)}
                  disabled={pingStatus?.running}
                  className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all disabled:opacity-50"
                >
                  {(!availableTextModels.includes(systemSettings.aiConfig.textModel) && systemSettings.aiConfig.textModel
                    ? [systemSettings.aiConfig.textModel, ...availableTextModels]
                    : availableTextModels
                  ).map((m) => (
                    <option key={m} value={m}>{m}{manualModelIds.has(m) ? " · manual" : ""}</option>
                  ))}
                </select>
                <span className="text-[10px] text-vintage-navy/70 mt-1 block">
                  Digunakan untuk prompt expansion, komersial preflight, dan evaluasi konsep.
                </span>
              </div>

              {systemSettings.aiConfig.textModel && <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="image-model-select" className="font-bold text-vintage-navy">Image Generation Model</label>
                  <span className="text-[10px] font-semibold text-vintage-coffee/70">
                    {isFetchedModels ? `${availableImageModels.length} model terdeteksi` : `${availableImageModels.length} model (cached)`}
                  </span>
                </div>
                <select
                  id="image-model-select"
                  value={systemSettings.aiConfig.imageModel}
                  onChange={(e) => onUpdateAIConfig("imageModel", e.target.value)}
                  disabled={pingStatus?.running}
                  className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all disabled:opacity-50"
                >
                  {(!availableImageModels.includes(systemSettings.aiConfig.imageModel) && systemSettings.aiConfig.imageModel
                    ? [systemSettings.aiConfig.imageModel, ...availableImageModels]
                    : availableImageModels
                  ).map((m) => (
                    <option key={m} value={m}>{m}{manualModelIds.has(m) ? " · manual" : ""}</option>
                  ))}
                </select>
                {availableImageModels.length === 0 && <div className="mt-1 space-y-1">
                  <span className="text-[10px] text-vintage-coffee/60 block">Gateway tidak mengiklankan image model.</span>
                  <div className="flex items-center gap-1.5">
                    <input value={manualModelId} onChange={(e) => { setManualModelId(e.target.value); setManualModelMessage(null); }} onKeyDown={(e) => e.key === "Enter" && addManualModel()} placeholder="+ tambah manual" aria-label="ID image model manual" className="min-w-0 flex-1 p-1.5 bg-vintage-paper border border-vintage-border rounded-lg font-mono text-[10px] text-vintage-coffee outline-none focus:ring-2 focus:ring-vintage-mustard" />
                    <button type="button" onClick={addManualModel} className="rounded-lg bg-vintage-mustard/30 px-2 py-1.5 text-[10px] font-bold text-vintage-coffee">Tambah</button>
                  </div>
                  {manualModelMessage && <span className="text-[10px] text-vintage-coffee/70 block">{manualModelMessage}</span>}
                </div>}
                {manualModelIds.size > 0 && <div className="flex flex-wrap gap-1 mt-1">{[...manualModelIds].filter((id) => availableImageModels.includes(id)).map((id) => <span key={id} className="inline-flex items-center gap-1 rounded border border-vintage-border px-1.5 py-0.5 font-mono text-[9px] text-vintage-coffee/70">{id} <button type="button" aria-label={`Hapus model manual ${id}`} onClick={() => removeManualModel(id, "image")} className="text-[var(--accent-error)]">×</button></span>)}</div>}
                <span className="text-[10px] text-vintage-navy/70 mt-1 block">
                  Digunakan untuk membuat visual dari prompt kanvas.
                </span>
              </div>}

              <div>
                <label htmlFor="negative-prompt-rules" className="block font-bold mb-1 text-vintage-navy">Global Negative Prompt Rules</label>
                <textarea
                  id="negative-prompt-rules"
                  value={systemSettings.commercialRules.defaultNegativePrompt}
                  onChange={(e) => onUpdateCommercialRules("defaultNegativePrompt", e.target.value)}
                  className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-[10px] h-16 outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex items-start justify-between gap-3 p-3 bg-vintage-paper/50 rounded-xl border border-vintage-border">
                <div>
                  <label htmlFor="differentiation-check" className="block font-bold text-vintage-navy text-[11px] cursor-pointer">
                    Marketplace Differentiation Check
                  </label>
                  <span className="text-[10px] text-vintage-navy/70 block mt-0.5 leading-relaxed">
                    Evaluasi keunikan konsep sebelum membuat aset (+1 API call text per prompt).
                  </span>
                </div>
                <input
                  id="differentiation-check"
                  type="checkbox"
                  checked={systemSettings.commercialRules.enableDifferentiationCheck}
                  onChange={(e) => onUpdateCommercialRules("enableDifferentiationCheck", e.target.checked)}
                  className="w-4 h-4 mt-0.5 shrink-0 accent-vintage-mustard cursor-pointer rounded focus:ring-vintage-mustard"
                />
              </div>
            </div>

          </div>

          <div className="space-y-3 pt-4 border-t border-vintage-border">
            <h4 className="font-extrabold text-vintage-mustard uppercase tracking-wide text-[11px]">Data</h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={backupBusy} onClick={async () => {
                setBackupBusy(true);
                try { const result = await window.api?.backupExport?.(); showToast?.(result?.success ? `Backup diekspor: ${result.path || 'selesai'}` : `Export backup gagal: ${result?.detail || 'unknown error'}`, result?.success ? 'success' : 'error'); }
                catch (error: any) { showToast?.(`Export backup gagal: ${error?.message || 'unknown error'}`, 'error'); }
                finally { setBackupBusy(false); }
              }} className="px-3 py-2 rounded-xl border border-vintage-border bg-vintage-paper text-[11px] font-bold disabled:opacity-50">Export Backup</button>
              <button type="button" disabled={backupBusy} onClick={async () => {
                setBackupBusy(true);
                try { const result = await window.api?.backupImport?.(); if (result?.canceled) return; showToast?.(result?.success ? `Backup diimpor: ${result.imported || 0} asset` : `Import backup gagal: ${result?.detail || 'unknown error'}`, result?.success ? 'success' : 'error'); }
                catch (error: any) { showToast?.(`Import backup gagal: ${error?.message || 'unknown error'}`, 'error'); }
                finally { setBackupBusy(false); }
              }} className="px-3 py-2 rounded-xl border border-vintage-border bg-vintage-paper text-[11px] font-bold disabled:opacity-50">Import Backup</button>
            </div>
          </div>

          {/* Optional Integrations: IMAGIN Video */}
          {onUpdateVideoUrl && (
            <div className="space-y-3 pt-4 border-t border-vintage-border">
              <h4 className="font-extrabold text-vintage-coral flex items-center gap-2 uppercase tracking-wide text-[11px]">
                <Film className="w-3.5 h-3.5" /> IMAGIN Video Integration
              </h4>
              <div>
                <label htmlFor="video-tool-url" className="block font-bold mb-1 text-vintage-navy">
                  Video Tool Base URL
                </label>
                <input
                  id="video-tool-url"
                  type="url"
                  value={systemSettings.imaginVideoUrl}
                  onChange={(e) => onUpdateVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-vintage-paper border border-vintage-border text-vintage-coffee rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-vintage-mustard focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-[var(--module-animation)] border border-[var(--accent-error)]/40 text-[11px] text-[var(--accent-error)] font-semibold flex items-center gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--accent-error)]" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-3 px-6 py-4 border-t border-vintage-border bg-vintage-paper/50">
          <button
            onClick={onClose}
            disabled={isSaving || pingStatus?.running}
            className="px-4 py-2 bg-transparent hover:bg-vintage-paper text-vintage-coffee text-xs font-bold rounded-xl border border-vintage-border transition-colors disabled:opacity-50 focus:ring-2 focus:ring-vintage-mustard"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || pingStatus?.running}
            className="px-5 py-2 bg-vintage-coffee text-vintage-ivory text-xs font-bold rounded-xl hover:bg-vintage-coffee/90 shadow-md transition-all disabled:opacity-50 focus:ring-2 focus:ring-vintage-mustard inline-flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSaving ? "Menyimpan…" : "Simpan & Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
}
