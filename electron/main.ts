import { app, BrowserWindow, session, shell } from "electron";
import path from "path";
import fs from "fs";
import { registerProtocol, registerSchemesAsPrivileged, resetSessionProtocol } from "./protocol";
import { registerIpc } from "./ipc";
import { TaskStore, JobQueue } from "./services/job_queue";
import { initLibrary, persistLibrary } from "./services/library";
import { ensureDirs, resolveBinary } from "./binaries/paths";
import * as vectorize from "./services/vec/vec-run";
import * as upscale from "./services/ups/ups-run";
import { startImportWatcher, stopImportWatcher } from "./services/import_watcher";
import { saveJobState, restorePendingJobs } from "./services/job_state";

registerSchemesAsPrivileged();

const isDev = !app.isPackaged && process.env.IMAGIN_PROD !== "1";
let mainWindow: BrowserWindow | null = null;
let quitting = false;

const taskStore = new TaskStore();

function log(msg: string): void {
  console.log(`[electron] ${msg}`);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#1f1c19",
    title: "IMAGIN Studio",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log(`Renderer loaded: ${mainWindow?.webContents.getURL()}`);
  });
  mainWindow.webContents.on("console-message", (event) => {
    const { message } = event;
    if (message.includes("[IMAGIN-RENDERER]")) log(`[renderer] ${message}`);
  });

  // F5 / Ctrl+R → hard reload (abaikan cache). Tanpa ini tidak ada jalan cepat
  // membuang bundle lama selain menutup app, karena menubar disembunyikan.
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const isReloadKey = input.key === "F5" || ((input.control || input.meta) && input.key.toLowerCase() === "r");
    if (!isReloadKey) return;
    event.preventDefault();
    mainWindow?.webContents.reloadIgnoringCache();
  });

  if (isDev) {
    // Dev: Vite HMR di :5173 (developer experience only — tidak pernah masuk production)
    const devUrl = process.env.IMAGIN_DEV_URL || "http://127.0.0.1:5173";
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
      if (code === -102) {
        log(`Dev server tidak tersedia di ${devUrl}. Jalankan Vite dulu: npm run dev:vite`);
      }
    });
  } else {
    mainWindow.loadURL("imagin://app/index.html");
  }

  if (process.env.IMAGIN_SMOKE === "1") {
    mainWindow.webContents.on("did-finish-load", async () => {
      try {
        const wc = mainWindow!.webContents;
        const hasApi = await wc.executeJavaScript("typeof window.api");
        const libCount = await wc.executeJavaScript(
          "window.api.libraryList().then((l) => ({ ok: Array.isArray(l), n: (l||[]).length }))"
        );
        log(`[smoke] window.api type=${hasApi}`);
        log(`[smoke] libraryList -> ${JSON.stringify(libCount)}`);

        // Pipeline smoke: cek binary bundled + jalankan vectorize/upscale sungguhan
        log(`[smoke] vtracer = ${resolveBinary("vtracer", "vtracer")}`);
        log(`[smoke] upscayl = ${resolveBinary("realesrgan-ncnn", "upscayl-bin")}`);

        const seed = process.env.IMAGIN_SMOKE_SRC;
        if (seed && fs.existsSync(seed)) {
          const smokeStore = new TaskStore();
          const vQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
            vectorize.runVectorizeJob(data.tempId, taskId, smokeStore, (j) => {
              log(`[smoke] vec ${j.status} err=${j.error || ""}`);
            })
          );
          const item = vectorize.analyzeVectorizeUpload(seed, "smoke.png");
          vectorize.storeVectorizePreview(item.tempId!, {
            originalName: item.originalName!,
            filePath: item.filePath!,
            width: item.width!,
            height: item.height!,
            mimeType: item.mimeType!,
          });
          vectorize.enqueueVectorize([{ tempId: item.tempId! }], smokeStore, () => {}, vQueue);
          const vDeadline = Date.now() + 60000;
          while (vQueue.isRunning() || !vectorize.getVectorizeQueue().some((j) => j.tempId === item.tempId && (j.status === "completed" || j.status === "failed"))) {
            if (Date.now() > vDeadline) throw new Error("vectorize timeout");
            await new Promise((r) => setTimeout(r, 300));
          }
          const vJob = vectorize.getVectorizeQueue().find((j) => j.tempId === item.tempId);
          log(`[smoke] vectorize final=${vJob?.status} qc=${JSON.stringify(vJob?.qcWarnings)}`);

          const uQueue = new JobQueue<{ tempId: string }>((data, taskId) =>
            upscale.runUpscaleJob(data.tempId, taskId, smokeStore, (j) => {
              log(`[smoke] ups ${j.status} err=${j.error || ""}`);
            })
          );
          const uItem = upscale.analyzeUpscaleUpload(seed, "smoke.png");
          upscale.storePreview(uItem.tempId!, {
            originalName: uItem.originalName!,
            filePath: uItem.filePath!,
            width: uItem.width!,
            height: uItem.height!,
            mimeType: uItem.mimeType!,
          });
          upscale.enqueueUpscale([{ tempId: uItem.tempId!, engine: "realesrgan", scale: "2x" }], smokeStore, () => {}, uQueue);
          const uDeadline = Date.now() + 90000;
          while (uQueue.isRunning() || !upscale.getUpscaleQueue().some((j) => j.tempId === uItem.tempId && (j.status === "completed" || j.status === "failed"))) {
            if (Date.now() > uDeadline) throw new Error("upscale timeout");
            await new Promise((r) => setTimeout(r, 300));
          }
          const uJob = upscale.getUpscaleQueue().find((j) => j.tempId === uItem.tempId);
          log(`[smoke] upscale final=${uJob?.status} out=${uJob?.outputUrl}`);

          const ok = vJob?.status === "completed" && uJob?.status === "completed";
          log(`[smoke] pipeline ${ok ? "ALL OK" : "FAILED"}`);
        } else {
          log("[smoke] pipeline skip (set IMAGIN_SMOKE_SRC=<png> untuk menjalankan)");
        }

        setTimeout(() => app.quit(), 500);
      } catch (err: unknown) {
        log(`[smoke] FAILED: ${(err as Error).message}`);
        app.exit(1);
      }
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  // Dev selalu mulai dari cache bersih: modul Vite lama yang tersangkut bikin
  // perubahan kode tidak terlihat. Production tidak perlu — asset ber-hash dan
  // index.html sudah `no-store` (lihat protocol.ts).
  if (isDev) {
    try {
      await session.defaultSession.clearCache();
      log("Dev cache dibersihkan");
    } catch (err) {
      log(`Gagal bersihkan cache: ${(err as Error).message}`);
    }
  }

  ensureDirs();
  initLibrary();
  resetSessionProtocol();
  registerProtocol();

  registerIpc(() => mainWindow, taskStore);

  // Restore task yang tertinggal dari crash/close paksa
  const restored = restorePendingJobs(taskStore);
  if (restored.length > 0) {
    log(`Recovery: ${restored.length} task dibatalkan statusnya → QUEUED (menunggu keputusan user)`);
  }

  // Import watcher — file baru di storage/imports/ masuk antrian otomatis
  startImportWatcher(() => {
    mainWindow?.webContents.send("imports:changed", true);
  });

  // Persistence berkala (crash-safe)
  setInterval(persistLibrary, 30000);

  // Persist job state tiap 10 detik (untuk recovery crash)
  setInterval(() => saveJobState(taskStore), 10000);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

function cleanup(): void {
  quitting = true;
  try { saveJobState(taskStore); } catch {}
  try { stopImportWatcher(); } catch {}
  persistLibrary();
}

app.on("before-quit", cleanup);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

bootstrap().catch((err) => {
  log(`Bootstrap failed: ${err.message}`);
  app.quit();
});
