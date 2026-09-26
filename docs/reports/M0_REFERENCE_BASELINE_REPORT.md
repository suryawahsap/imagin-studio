# M0 — Reference Baseline Report (Output A)

Status: READY_FOR_APPROVAL · Date: 2026-09-07 · Prepared by: Head Developer (with Explorer/Librarian/Oracle lanes)

## 1. Canvas behavior source

- `reference/canvas-upgraded/imagin_studio_strong_v2.tsx` — 28,415 lines. Behavioral gold ONLY (READ_ME confirms: no structural copy).
- Virtual sections verified by source inspection (TOC lines 7–35): `[01] IMPORTS, [02] TYPES & INTERFACES, [03] GLOBAL CONSTANTS, [04] UTILITIES, [05] DATA REGISTRY, [06] STATE STORE, [07] PRODUCTION PIPELINE, [08] RESOLUTION LAYER, [09] DOMAIN ENGINES, [10] UI SYSTEM, [11] APPLICATION, [12] STYLES` — ~50 numbered banner areas inside (FASE-numbered: platform adapter, compliance, storage/project/job engines, DNA, rule engine, market registry/palettes, quality gate, prompt engine, batch diversity, production policy, concept clustering, background engine, metadata engine, resolution, export, import/migration, history, AI preflight, asset lifecycle).
- Declarations: 38 top-level `export`, 412 column-0 declarations (const/function/interface/type/class); authoritative inventory = mapping doc Appendix B (459 declarations, every line 1–28,415 covered by Appendix A range table).
- Pipeline contract present in source: `runProductionPipeline()` [07], QA decision contract (`pass|pass_with_warning|needs_review|regenerate|reject`), regeneration strategies, preflight/productionTrace fields, semantic intent layer, differentiation/similarity, batch diversity (EU-7), concept clustering (EU-12).

## 2. UI reference

- `reference/ui/` — 6 screenshots: `studio-ai-generation` (Studio generation flow), `studio-sidebar` (Studio navigation/controls), `upscale-clarity` (Upscale module), `galery-library` (Gallery grid/detail), `remotion-animation` (Remotion timeline), `vectorize-vtracer` (Vectorize settings).
- Drift confirmed: plan.md/ARCHITECTURE/BEHAVIOR_SPEC/IMPLEMENTATION_PLAN/COMPLETE_SEQUENCE headers reference `ui_baru/`; actual directory = `reference/ui/` (plan.md §21 and mapping doc §3 already correct). → Decision D-017.

## 3. 9Router integration reference (`reference/infrastructure/9router.md`, read fully)

- Transport law: all AI via main process. `renderer ai-bridge → preload → IPC studio:generate → main → 9Router`. Renderer never fetches; renderer `body.model` is validated then ignored (main's `getStudioConfig()` decides).
- Key security (§8): `safeStorage.encryptString` → base64 `encryptedNineRouterKey` in `storage/metadata/settings.json`; plaintext stripped on persist, auto-migrated, deleted without fallback when safeStorage unavailable; renderer receives only `hasNineRouterKey: boolean`.
- Endpoints: `GET /v1/models` (AbortSignal 15s; classify text/image, catalog cap 200); `POST /v1/images/generations` (b64_json or url→base64; **no default timeout** — `ipc.ts:1360`; single 429 retry after 12s); `POST /v1/chat/completions` (Gemini↔OpenAI transformation both directions).
- IPC channels: `studio:generate | studio:ping | studio:fetch-models | studio:get-config | studio:save-config`.
- Consumers: metadata job (text, 30s timeout); vectorize vision hint (legacy direct-fetch, fire-and-forget, key passed as argument — **must NOT be ported**; route through the one AI service); renderer fallback chain breaks on 401/403/429 (**retry/fallback policy must move to main**).
- Quota: LiteLLM headers (`x-litellm-key-*`, `x-ratelimit-*`, response cost) surfaced per generation.

## 4. Legacy reference (`reference/legacy-local/imagin_studio.zip`, listing-only)

Justification per Legacy ZIP Rule: WHY = M0 architecture inventory; WHAT = process structure, IPC surface, storage layout, binary integration, job mechanics; WHICH = informs ARCHITECTURE.md compliance + M3/M8–M10 lessons, never an architecture baseline.
- 23,722 entries (961 source files; rest node_modules/.git). Root `imagin_studio/imagin-local/`.
- `electron/bin/`: realesrgan-ncnn (+x4plus models), vtracer, whisper-cli (+ggml model), yt-dlp, per-OS dirs. `electron/binaries/`: 7 TS wrappers incl. `paths.ts`.
- `electron/services/`: `job_queue.ts`, `job_state.ts`, `import_watcher.ts`, `animation-renderer.ts`, `export.ts`, `import.ts`, `svg-path-parser.ts`.
- Renderer: studio ×20 engines + `pipeline.ts` + `flows/`; gallery/metadata(+xmp|csv export)/upscale/vectorize/remotion modules; global TaskCenter/RecoveryModal/ABCompare/PipelineStepper.
- Lessons to extract later (not now): durable job queue mechanics, binary path resolution, import watcher, animation render lifecycle.

## 5. Architecture constraints

- Layering: UI → Application → Domain → Shared Domain → Infrastructure → Electron/OS/Provider. One canonical Studio pipeline; adapters only. Shared Asset/Job/Project contracts; module-specific duplicates forbidden.
- Oracle verdict: architecture consistency PASS-WITH-NOTES; security PASS-WITH-NOTES; scaffold is compliant (pure stubs, no legacy copy, no `@ts-nocheck`, renderer secrets-clean, `contextIsolation+sandbox` on).
- Enforcement gaps to close: (a) 7 mode-split `studio:*` channels + sibling `domain/generation` permit pipeline bypass → collapse to one `studio:produce(mode)` or add import-graph guard; (b) key-handling contract must be promoted from 9router.md into ARCHITECTURE.md/DEVELOPMENT_RULES.md; (c) ESM preload vs `sandbox:true` incompatibility → bundle preload to CJS; (d) `main` points at uncompiled TS; no lint config/deps, no test runner, no Electron build → M1 tooling; (e) scaffold untracked in git → commit before M0 close.

## 6. Shared contracts status

- Defined shape-level (ARCHITECTURE.md §5/§6). Blocking field-level gaps before M2: Asset id scheme/schemaVersion/timestamps/media hash/lineage direction; Job idempotency linkage (`requestId/attemptId/parentJobId`); ONE Job lifecycle enum (3 conflicting taxonomies across docs, 4th in Canvas: `running/paused`); storage engine choice. All recorded as decisions D-015…D-019.

## 7. Known unknowns

- Canvas job states `running/paused` — disposition required (proposed RETIRE: replaced by durable job contract; pending D-015).
- Exact error-code enum extensions (`binary_missing/storage_error/validation_error`) — settle in M3/M8.
- Freepik locked (D-012); platform adapter field mappings deferred.
- ~45 Appendix B symbol entries have deferred-resolution targets (split-by-owner) — recorded PENDING in mapping doc; allowed for non-critical helpers per M0 rules; file-level resolution due at owner milestone.

## 8. Intentional drifts (pre-approved, plan.md §19)

Electron persistent storage; IPC + secure AI boundary; durable jobs/recovery; centralized Gallery; Metadata full workspace; native binary execution. All other drift must enter PARITY_MATRIX.md.

## 9. Critical risks (top of register)

R1 Job enum freeze-wrong (Critical) · R2 hidden second pipeline (High) · R3 ESM/sandbox preload (High) · R4 no Electron build/packaging (High) · R5 key contract not codified (High) · R6 9Router timeout/429 policy (Med) · R7 legacy direct-fetch leak (Med) · R8 binary packaging (Med) · R9 storage/recovery correctness (Med) · R10 Electron 31 age (Low, reassess M14).

## 10. First implementation dependency chain

Decisions D-015…D-019 → M1 (shell + tooling: eslint, test runner, electron-vite/CJS preload, git commit) → M2 (Job enum, Asset field-level contract, storage engine, lineage) → M3 (AI service + 9Router adapter, key contract, timeouts/retry, model discovery/connection-test gates — acceptance criteria to be added per D-018) → M4 Gallery → M5 Studio core vertical slice.

---

## Post-M0 correction (2026-09-07)

The six screenshots listed in `reference/ui/` were replaced with a re-exported, descriptively
named set (2026-09-07): `Gallery - Asset Management.png`, `Remotion - Video Creation.png`,
`Studio - Image Generation & Asset Workflow.png`, `Upscale - High Resolution Enhancement.png`,
`Vectorize - Vector Conversion.png` (Studio sidebar coverage merged into the Studio screenshot).
The original M0 files remain retrievable from git history (`b290e26`). This report's §2 file
names refer to the M0-time set.
