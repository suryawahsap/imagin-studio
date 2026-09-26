import {
  CheckCircle,
  Info,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GalleryModule from "./components/gallery/GalleryModule";
import MetadataModule from "./components/metadata/MetadataModule";
import GlobalTopBar from "./components/GlobalTopBar";
import RecoveryModal from "./components/RecoveryModal";
import RemotionModule from "./components/remotion/RemotionModule";
import StudioModuleNew from "./components/studio/StudioModule";
import TaskCenterBar from "./components/TaskCenterBar";
import UpscaleModuleNew from "./components/upscale/UpscaleModule";
import VectorizeModule from "./components/vectorize/VectorizeModule";
import { LibraryAsset, ModuleType, StorageInfo, Task } from "./types";
import { ModuleKey } from "./utils/moduleAccent";
import { api } from "./api/electron";

const MOTION_MODULE_TRANSITION = { duration: 0.18, ease: "easeOut" as const };

export default function App() {
  // Global States
  const [activeModule, setActiveModuleState] =
    useState<ModuleType>("STUDIO");
  const [newActiveModule, setNewActiveModule] = useState<ModuleKey>("studio");
    const setActiveModule = (m: ModuleType) => {
    setActiveModuleState(m);
    const keyMap: Record<ModuleType, ModuleKey> = {
      STUDIO: "studio",
      VECTOR: "vectorize",
      UPSCALE: "upscale",
      ANIMATION: "remotion",
      METADATA: "metadata",
      GALERY: "gallery",
    };
    setNewActiveModule(keyMap[m]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [outputFolder, setOutputFolder] = useState("C:\\GENAI\\ADOBE_STOCK\\");
  const [taskBarExpanded, setTaskBarExpanded] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState(false);

  // Recovery state (task tertinggal dari crash)
  const [recovery, setRecovery] = useState<{
    tasks: Task[];
    savedAt: string;
  } | null>(null);

  // Toast Alerts State
  interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Handoff from Studio → Vectorize/Upscale (Phase 2) + Animation (Phase 3)
  const [pendingHandoff, setPendingHandoff] = useState<{ module: "VECTOR" | "UPSCALE" | "ANIMATION"; assetIds: string[]; nonce: number } | null>(null);
  const onHandoffDone = () => setPendingHandoff(null);

  // Navigate from Gallery detail → Metadata editor
  const [pendingMetadataEditAssetId, setPendingMetadataEditAssetId] = useState<string | null>(null);

  const addToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sync API Fetchers
  const [isLoading, setIsLoading] = useState(true);

  const fetchLibrary = async () => {
    try {
      const data = await api.fetchLibrary();
      setLibraryAssets(data);
    } catch (err) {
      console.error("Failed to load library assets:", err);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const data = await api.fetchTasks();
      setTasks(data);
      setTasksError(false);
    } catch (err) {
      console.error("Failed to load task queue:", err);
      setTasksError(true);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchStorage = async () => {
    try {
      const data = await api.fetchStorage();
      setStorage(data);
    } catch (err) {
      console.error("Failed to fetch storage stats:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.fetchSettings();
      setOutputFolder(data.outputFolder);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const updateFolder = async (folder: string) => {
    try {
      const data = await api.updateFolder(folder);
      if (data.success) {
        setOutputFolder(data.outputFolder);
        addToast(`Workspace updated: ${data.outputFolder}`, "success");
      }
    } catch (err) {
      addToast("Failed to update output folder.", "error");
    }
  };

  // Initial Seed Load
  useEffect(() => {
    Promise.all([
      fetchLibrary(),
      fetchTasks(),
      fetchStorage(),
      fetchSettings(),
    ]).finally(() => setIsLoading(false));
  }, []);

  // Recovery — cek task tertinggal dari crash saat startup
  useEffect(() => {
    (async () => {
      try {
        const res = await api.recoveryGet();
        if (res.success && res.tasks && res.tasks.length > 0) {
          setRecovery({ tasks: res.tasks, savedAt: res.savedAt || "" });
        }
      } catch {}
    })();
  }, []);

  const handleRecoveryResume = async (ids: string[]) => {
    // Task sudah di-set QUEUED di main saat startup — cukup dismiss state file
    await api.recoveryDismiss(ids).catch(() => {});
    setRecovery(null);
    fetchTasks();
    addToast("Task dilanjutkan di antrian.", "info");
  };

  const handleRecoveryDismiss = async (ids: string[]) => {
    await api.recoveryDismiss(ids).catch(() => {});
    setRecovery(null);
    fetchTasks();
    addToast("Task dibatalkan.", "info");
  };

  const handleRecoveryClose = async () => {
    setRecovery(null);
  };

  // Polling for progress
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks();
      fetchStorage();
      fetchLibrary();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time IPC progress events
  useEffect(() => {
    const offTask = api.onTaskProgress(() => fetchTasks());
    const offLibrary = api.onLibraryUpdated(() => {
      fetchLibrary();
      fetchStorage();
    });
    return () => {
      offTask();
      offLibrary();
    };
  }, [fetchTasks, fetchLibrary, fetchStorage]);

  // Action Controllers
  const handleDeleteAsset = async (id: string) => {
    if (
      !window.confirm(
        "Yakin mau dihapus? File hasil generate akan dihapus dari storage juga."
      )
    )
      return;
    try {
      const data = await api.deleteAsset(id);
      if (data.success) {
        addToast("Asset removed from library.", "success");
        fetchLibrary();
        fetchStorage();
      }
    } catch (err) {
      addToast("Failed to delete asset.", "error");
    }
  };

  // Bulk delete — select all / multiple items di library
  const handleDeleteAssets = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Yakin mau hapus ${ids.length} asset? File hasil generate akan dihapus dari storage juga.`
      )
    )
      return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        const data = await api.deleteAsset(id);
        if (data.success) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    if (ok > 0) addToast(`${ok} asset dihapus.`, "success");
    if (fail > 0) addToast(`${fail} asset gagal dihapus.`, "error");
    fetchLibrary();
    fetchStorage();
  };

  const handleRenameAsset = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      addToast("Name can't be empty.", "error");
      return;
    }
    try {
      const data = await api.renameAsset(id, trimmed);
      if (data.success) {
        addToast("Asset renamed.", "success");
        fetchLibrary();
      } else {
        addToast("Failed to rename asset.", "error");
      }
    } catch (err) {
      addToast("Failed to rename asset.", "error");
    }
  };

  const handleCancelTask = async (id: string) => {
    try {
      const data = await api.cancelTask(id);
      if (data.success) {
        addToast("Job cancelled.", "info");
        fetchTasks();
      }
    } catch (err) {
      addToast("Failed to cancel task.", "error");
    }
  };

  const handleRetryTask = async (id: string) => {
    try {
      const data = await api.retryTask(id);
      if (data.success) {
        addToast("Job queued ulang untuk retry.", "info");
        fetchTasks();
      } else if (data.detail) {
        addToast(data.detail, "error");
      }
    } catch (err) {
      addToast("Failed to retry task.", "error");
    }
  };

  const handleClearTasks = async () => {
    try {
      const data = await api.clearTasks();
      if (data.success) {
        addToast("Task history cleared.", "info");
        fetchTasks();
      }
    } catch (err) {
      addToast("Failed to clear task history.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vintage-paper flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-vintage-terracotta animate-pulse" />
          <span className="text-xs font-mono text-vintage-navy animate-pulse">
            Loading IMAGIN...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--s-void)] text-[var(--s-text-2)]">
      {/* Global Top Bar — iterasi 1 redesign */}
      <GlobalTopBar
        activeModule={newActiveModule}
        onModuleChange={(m) => {
          if (m === "gallery") {
            setNewActiveModule("gallery");
          } else if (m === "metadata") {
            setNewActiveModule("metadata");
          } else {
            const legacyMap: Record<string, ModuleType> = {
              studio: "STUDIO",
              vectorize: "VECTOR",
              upscale: "UPSCALE",
              remotion: "ANIMATION",
              metadata: "METADATA",
            };
            setActiveModule(legacyMap[m]);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        taskCount={tasks.filter((task) => task.status === "PROCESSING" || task.status === "QUEUED").length}
        onTaskCenterToggle={() => setTaskBarExpanded((expanded) => !expanded)}
      />

      {/* Body — module workspace */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
        {newActiveModule === "gallery" ? (
          <motion.div
            key={`gallery-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
<GalleryModule
  assets={libraryAssets}
  onDeleteAsset={handleDeleteAsset}
  onDeleteAssets={handleDeleteAssets}
  onRenameAsset={handleRenameAsset}
  onCreateMetadata={() => {
    setNewActiveModule("metadata");
    setActiveModule("METADATA");
  }}
  onAnimate={(assetId) => {
    setPendingHandoff({ module: "ANIMATION", assetIds: [assetId], nonce: Date.now() });
    setActiveModule("ANIMATION");
  }}
  onSendToUpscale={(assetIds) => {
    setPendingHandoff({ module: "UPSCALE", assetIds, nonce: Date.now() });
    setActiveModule("UPSCALE");
  }}
  onSendToVectorize={(assetIds) => {
    setPendingHandoff({ module: "VECTOR", assetIds, nonce: Date.now() });
    setActiveModule("VECTOR");
  }}
  onNotify={addToast}
  storage={storage}
  onEditMetadata={(id) => {
    setPendingMetadataEditAssetId(id);
    setNewActiveModule("metadata");
    setActiveModule("METADATA");
  }}
/>
          </motion.div>
        ) : newActiveModule === "vectorize" ? (
          <motion.div
            key={`vectorize-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
          <VectorizeModule
            onNotify={addToast}
            libraryAssets={libraryAssets}
            pendingHandoff={pendingHandoff}
            onHandoffDone={onHandoffDone}
          />
          </motion.div>
        ) : newActiveModule === "upscale" ? (
          <motion.div
            key={`upscale-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
          <UpscaleModuleNew
            onNotify={addToast}
            libraryAssets={libraryAssets}
            pendingHandoff={pendingHandoff}
            onHandoffDone={onHandoffDone}
          />
          </motion.div>
        ) : newActiveModule === "studio" ? (
          <motion.div
            key={`studio-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
          <StudioModuleNew
            onNotify={addToast}
            onNavigate={(module, assetIds) => {
              if (assetIds && assetIds.length > 0 && (module === "VECTOR" || module === "UPSCALE")) {
                setPendingHandoff({ module, assetIds, nonce: Date.now() });
              }
              setActiveModule(module as ModuleType);
            }}
          />
          </motion.div>
        ) : newActiveModule === "remotion" ? (
          <motion.div
            key={`remotion-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
          <RemotionModule
            onNotify={addToast}
            libraryAssets={libraryAssets}
            pendingHandoff={pendingHandoff}
            onHandoffDone={onHandoffDone}
          />
          </motion.div>
        ) : newActiveModule === "metadata" ? (
          <motion.div
            key={`metadata-${newActiveModule}-${activeModule}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION_MODULE_TRANSITION}
            className="h-full"
          >
          <MetadataModule
  onNotify={addToast}
  openAssetId={pendingMetadataEditAssetId}
  onOpenAssetHandled={() => setPendingMetadataEditAssetId(null)}
/>
          </motion.div>
        ) : null
        }
        </AnimatePresence>
      </main>

      <TaskCenterBar
        tasks={tasks}
        onCancelTask={handleCancelTask}
        onRetryTask={handleRetryTask}
        onClearTasks={handleClearTasks}
        storage={storage}
        expanded={taskBarExpanded}
        onExpandedChange={setTaskBarExpanded}
        loading={tasksLoading}
        error={tasksError}
        onRetryLoad={fetchTasks}
      />

      {/* Recovery Modal — task tertinggal dari crash */}
      {recovery && (
        <RecoveryModal
          tasks={recovery.tasks}
          savedAt={recovery.savedAt}
          onResume={handleRecoveryResume}
          onDismiss={handleRecoveryDismiss}
          onClose={handleRecoveryClose}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-14 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3 rounded-lg border shadow-lg flex items-start gap-2.5 bg-vintage-ivory text-vintage-coffee transition-all ${
              t.type === "success"
                ? "border-vintage-olive/50"
                : t.type === "error"
                ? "border-[var(--accent-error)]/40/50"
                : "border-vintage-terracotta/50"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-vintage-olive shrink-0 mt-0.5" />
            ) : t.type === "error" ? (
              <XCircle className="h-4 w-4 text-[var(--accent-error)] shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-vintage-terracotta shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs font-medium">{t.message}</div>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }
              className="text-vintage-navy hover:text-vintage-coffee shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
