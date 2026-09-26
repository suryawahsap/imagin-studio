# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

The actual app lives in `imagin-local/` — all commands below are run from there. The repo root only has top-level planning docs (`PRD.md`, `rebuild-plan.md`) and `start.sh`. `imagin-local/docs/` is the planning/spec corpus — several docs there are aspirational/stale; read `imagin-local/docs/README.md` first, and treat the code as source of truth.

## Commands (run inside `imagin-local/`)

```bash
npm run dev:electron   # electron:build then launch electron + Vite HMR (main dev loop)
npm run dev:vite       # Vite only, for frontend-only work
npm run start          # production-mode build + run (IMAGIN_PROD=1)
npm run lint           # tsc --noEmit for both tsconfig.json (renderer) and tsconfig.electron.json (main) — no test framework, this is the primary correctness gate
npm run build          # vite build + electron:build (esbuild bundles electron/ → dist-electron/*.cjs)
```

Tests are plain `tsx`/`node` scripts under `scripts/` using `assert/strict` — no Jest/Vitest. Each is its own npm script and can be run individually:

```bash
npx tsx scripts/test-studio-store.ts        # or: npm run test:studio-store
npx tsx scripts/test-<name>.ts              # any test script directly
node scripts/test-<name>.mjs                # .mjs tests run directly with node, no tsx needed
npm run test                                # test:import + test:service-smoke only (not the full scripts/ suite)
IMAGIN_TEST_IMAGE=/path/to/image.png npm run test:pipeline   # needs a real PNG/JPEG fixture
npm run test:protocol                       # electron --headless, tests the imagin:// custom protocol
```

When adding a test for one function, follow the existing pattern: a standalone `scripts/test-<thing>.ts` importing the real function (not a mock) and asserting with `assert/strict`, runnable directly with `npx tsx`.

From the repo root, `./start.sh`, `./start.sh --dev`, `./start.sh --package` wrap the same npm scripts.

## Architecture

### Process split (Electron)

- `electron/` — main process, TypeScript, bundled by esbuild (`esbuild-electron.mjs`) into `dist-electron/*.cjs`. Owns all filesystem access, subprocess spawning, and API keys.
- `src/` — renderer, React + Vite. **Never** calls `fetch()` for app APIs — everything goes through `window.api` (contextBridge, defined in `electron/preload.ts` and typed in `src/api/electron.ts`). Every new main-process handler needs a matching entry in both `electron/preload.ts` and `src/api/electron.ts`, or the renderer silently can't call it.
- IPC handlers are centralized in `electron/ipc.ts` (~950 lines, ~65 `ipcMain.handle` channels) — this is the map of everything the app can do.
- Custom `imagin://` protocol serves the built app and `storage/` files to the renderer (needed because renderer can't use `file://` under contextIsolation); CORS headers were added here specifically so `fetch()` against `imagin://storage/...` works cross-origin between dev (`http://127.0.0.1:5173`) and prod.

### Pipelines are real CLI binaries, not JS ports

Vectorize, Upscale, and Animation are NOT reimplementations — they shell out to bundled binaries via `child_process.spawn` in the main process. This is a deliberate, load-bearing decision (see `PRD.md` §1): no Python, no ML runtime, binaries chosen specifically to avoid CUDA/PyTorch.

- **Vectorize** (`electron/services/vec/`): `vec-run.ts` orchestrates a 9-step pipeline (analyze → prepare → config → vtracer → postprocess → validate → auto-retry-once-if-bad → EPS(non-fatal) → library). Config per `AssetType` (flat-icon/outline-icon/flat-illustration/line-art/photo/pixel-art) lives in `vec-config.ts` and maps directly to `vtracer` CLI args — no manual color clustering/shape-fitting/symmetry layers (those were deliberately deleted, see `rebuild-plan.md`).
- **Upscale** (`electron/services/ups/`): `ups-run.ts` orchestrates real-esrgan-ncnn/waifu2x-ncnn calls, multi-step for scale >2x (`calcSteps`: 4x→[2,2], 3x→[2,1.5]). No fallback if a binary is missing — job fails explicitly (`binary_missing`), by design (no silent nearest-neighbor degradation).
- **Animation**: renders via an offscreen `BrowserWindow` driving WAAPI (`el.animate`) frame-by-frame, captured with `capturePage()`, then encoded with `ffmpeg` (MP4/WebM/GIF) or serialized in-process to Lottie JSON.
- All three run through a shared `JobQueue` (`electron/services/job_queue.ts`, FIFO per-module queue, one queue per pipeline so e.g. GPU upscale and CPU vectorize can run concurrently) and a `TaskStore` lifecycle (`QUEUED → PROCESSING → COMPLETED/FAILED/CANCELLED`), broadcasting progress to the renderer via `<module>:job-update` events consumed by `src/api/useJobSync.ts`.
- Binary resolution (`electron/binaries/paths.ts`) picks `electron/bin/<platform>/` at runtime; only `linux/` is populated today — `win32/`/`darwin/` are placeholders (Windows/macOS support is paused). `ffmpeg`/`inkscape` come from system PATH, not bundled.
- `imagin-local/pipeline.md` is the authoritative, kept-up-to-date audit of these three pipelines (stage-by-stage, parameters, known issues) — read it before touching vectorize/upscale/animation code instead of re-deriving flow from source.

### Studio module (in-progress migration)

`src/modules/studio/` is IMAGIN's AI-generation module, being migrated from a legacy single-file prototype (`imagin_studio.tsx`, ~28.7k lines — frozen reference, not the source of truth) into the modular structure under `src/modules/studio/`. `MIGRATION_PLAN.md` (in `imagin-local/`) tracks phase-by-phase status; check its checklist before assuming a canvas feature exists in local. Key points if you touch this module:

- **All AI calls must go through `engines/ai-bridge.ts` → IPC**, never direct `fetch()` to a model provider from the renderer. The provider fallback chain (primary→fallback model, rate-limit/401/403 handling) lives in the main process (`studioGenerateGemini` in `ipc.ts`), not the renderer — this was a deliberate move during migration so API keys and retry logic never reach client code.
- **Storage**: legacy canvas used IndexedDB; local Studio persists 6 whitelisted collections (`history`, `projects`, `feedback`, `diversity_tracker`, `qa_results`, `compliance_results`) through one service, `electron/services/studio-store.ts`, as atomic-write JSON files (`storage/metadata/studio/<collection>.json`) via IPC (`studio:store:get`/`studio:store:commit`). Renderer never gets a filesystem path — it's not sent from renderer, only resolved in main. Assets/jobs/batches are explicitly out of scope for this store (handled by existing `libraryService`/`JobQueue`).
- `App.tsx` inside `studio/` (27k+ lines) is mid-decomposition into `ui/components/` (Sidebar, CanvasView, DetailModal) and `ui/modals/` — expect to find large chunks of not-yet-extracted logic still there.
- Settings/API keys: `settings:get`/`settings:set` never return raw keys to the renderer, only `has...Key: boolean` status flags — keys are stored via `safeStorage`, not plain JSON.

### Storage layout (on disk)

```
storage/assets/{images,vectors,eps,upscaled,animations,html,videos,audio,clips,downloads}/
storage/imports/          # transient uploads/previews, deleted after job completes
storage/temp/             # animation frames, job state, intermediate trace/upscale steps
storage/metadata/library-db.json
storage/metadata/studio/<collection>.json   # Studio's 6 whitelisted collections
```
Packaged app uses `~/.config/imagin/storage` (Linux) instead of the repo-local `storage/`.

## Gotchas specific to this repo

- Files served through `toBlobUrl()` (fetched via `imagin://storage/...`) must be used because `storage/imports/*` originals are deleted once a job completes — rendering `originalUrl` directly after that point will 404.
- `engine: "auto"` for upscale is not actually adaptive yet — it hardcodes to realesrgan; waifu2x only triggers on explicit user choice (see `pipeline.md` audit notes before changing this).
