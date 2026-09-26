# M14 Production Hardening — Evidence Checklist

Status: IN_PROGRESS (inc-1/2/3/6 + inc-7/7.5/8 approved · inc-4 BLOCKED on human key · inc-5 queued) · Date: 2026-09-11
Scope: IMPLEMENTATION_PLAN Phase 14 / SEQUENCE T19.01–T19.07 + assigned
M13-exit deferral ledger items + production-gate runtime evidence.
Slicing and scope-conflict rule: `docs/EXECUTION_LOG.md` — "M14 Production
Hardening — OPENED".

## Global gate commands (every increment)

```text
npm test                      # full suite
npm run typecheck             # renderer
npm run typecheck:electron    # electron
npm run lint                  # 0 errors required
npm run build                 # clean build
npm run smoke                 # electron alive check
npm run e2e                   # M14 runtime harness (inc-1+)
```

## inc-1 — Baseline + E2E harness

- [x] Playwright devDependency (dev-only, no runtime dep)
- [x] `tests/e2e/smoke.e2e.mjs` launch harness (app-shell + nav assertions)
- [x] `docs/M14_EVIDENCE.md` (this checklist)
- [x] Honest launch result RECORDED: E2E smoke PASSED — shell mounted (app-shell + nav), title "IMAGIN Studio Local", exit 0 (2026-09-11)
- [x] Baseline: build + smoke + full suite green at the inc-1 commit (gate re-run recorded in EXECUTION_LOG inc-1 entry: build PASS, E2E smoke PASS, 606/606, typechecks PASS, lint 0 errors)

## inc-2 — Cancellation signal path

- [x] executor signal → produceInternal/generateAsset forwarded (single + batch paths)
- [x] provider call honors signal (ai-service generateImage/generateText
      AbortSignal.any composition with timeout; ai_aborted classification)
- [x] repair loop checks signal before each attempt (throwIfAborted)
- [x] processing cancellation test: signal reaches the provider call, job
      'cancelled', zero assets committed (in-flight hang-on-signal mock)
- [x] repair-loop cancellation test: no further provider calls after abort,
      no asset
- [x] job becomes `cancelled`, not `completed` (executor T06.03 semantics;
      no executor edit needed — abort classification pre-existed)
- [x] queued cancellation via existing JobService transitions (no new test —
      covered by job-service queued→cancelled transitions)
- [ ] T17.03-class full-suite serial-run diagnosis (poll-with-deadline
      APPLIED to the new cancellation tests; the broader serial-suite
      diagnosis remains open for inc-5 evidence)

## inc-3 — Duplicate/idempotency/recovery runtime paths

- [x] P-045 CONCURRENCY BUG FOUND+FIXED: createJob check-then-act race
      (duplicate jobs on concurrent same-requestId creates) — synchronous
      reservation + executor in-flight dedup + produce-level requestId dedup
- [x] concurrent double-produce test: one job, one asset, same result
- [x] repeat-completed test: no duplicate asset
- [x] P-046 kill-during-processing test: provider killed without graceful
      cancel → fresh instances over the same dirs → boot scan surfaces the
      orphan recovery_required, NO phantom asset, resume re-queues and
      completes
- [x] job-recovery.ts listRecoveryJobs silent-skip of corrupt files noted
      (quarantine exists; documented as honest — reported, not changed)

## inc-4 — Real-key gateway cutover (REQUIRES real 9Router key — human/resource)

**Status: UNBLOCKING (2026-09-11; human elected "supply key now")** — the human
chose to configure the real 9Router key before the M14 exit review. Awaiting
manual key entry + connection test; inc-4 runtime verification resumes the
moment the key is configured. inc-5 stays queued behind it.

**UI blocker found + fixed (2026-09-11):** the human could not enter a key —
root cause: the Settings AI-provider tab was an M1-shell STUB (hardcoded
disabled key input, stale "lands in M3" banner, wrong hardcoded endpoint)
never wired to the live M3 settings backend. Fixed by the Head Developer:
real wiring (settings:get/set), NEW `settings:testConnection` IPC
(fetch9RouterModels — latency + model counts; the decrypted key never
leaves the main process, P-050), honest stored-key states, a11y label
association; 6-test regression guard (red→green,
`src/app/shell/__tests__/SettingsOverlay.test.tsx`).

- [ ] Settings connection test + model discovery
- [ ] real image generation via studio:produce
- [ ] optional text/vision call
- [ ] persisted asset + Gallery result
- [ ] trace carries provider/model/error details
- [ ] NO key in repo files, fixtures, renderer state, or logs

## inc-5 — Runtime workflow E2E matrix

- [ ] Studio → Gallery; Gallery → Metadata
- [ ] Gallery → Upscale/Vectorize/Remotion → Gallery (binary provisioning)
- [ ] Recovery surface; Task Center cancellation
- [ ] UI-001–008/104/201/202/204/207/208/305–307 runtime upgrade
- [ ] P-055 cross-module runtime evidence

## inc-6 — Trace/observability completion (T19.01/T19.02)

**Status: COMPLETE (2026-09-11)** — completed directly by the Head Developer
(bounded precision work on warm-context files; no lane dispatched after the
inc-8 fix-2 partial stall #17).

- [x] trace audit: all 15 canonical stages carry detail (intake/normalize/
      resolve/semantic_intent/differentiation/dna/composition/plan/generation/
      finalize/qa/preflight/repair/persist/complete); generation[] carries
      model/durationMs/error per attempt. HONEST GAPS RECORDED: dnaVersion/
      promptVersion have NO local version constants (no truthful source —
      deferral, never fabricated); "metadata result" and "export" are NOT
      Studio pipeline stages per D-024/D-006 (the Metadata module owns them) —
      no dead trace fields added (T19.07 discipline)
- [x] gaps fixed against T19.02 checklist — ProductionTrace gains additive
      optional `normalizedRequest` (mode/count/prompt+negative lengths/
      hasItems/resolved overrides) + `resolvedConfig` (provider/baseUrl/
      imageEndpoint/model defaults — EXPLICITLY picked fields so the
      decrypted key can never enter a trace, P-050); populated at the
      normalize/resolve stages, carried on success AND error traces (honest
      absence on early failure); happy-path test asserts the fields on the
      returned trace AND the persisted trace file

## inc-7 — Audits (T19.03–T19.07)

**Status: AUDITS COMPLETE (2026-09-11)** — both lanes delivered and reconciled:
`docs/M14_AUDIT_T1903_SECURITY.md` + `docs/M14_AUDIT_T1905_PACKAGING.md` (fix-2),
`docs/M14_AUDIT_T1904_T1906_T1907.md` (explorer lane). Findings only — no
remediation committed; fix-timing decisions reserved for the human gate.

- [x] T19.03 security audit (secrets, IPC, logs, storage, renderer exposure,
      provider access, native commands) — 0 Critical / 3 High / 3 Medium /
      3 Low; top: F-01 requestId path traversal + recursive rm, F-02
      metadata:export arbitrary write, F-07 EOL Electron advisories
- [x] T19.04 performance audit (startup, Gallery query, preview, job updates,
      large library, batch) — 11 RISK / 1 GAP recorded, `docs/M14_AUDIT_T1904_T1906_T1907.md`
- [x] T19.05 clean-environment package verification (+ Remotion packaging
      strategy decision) — clean copy: npm ci 515 pkgs / build / typechecks
      PASS; findings: repo-level install-scripts policy missing (Electron
      postinstall environment-dependent), no packager configured, EOL
      Electron 31 (fix-soon, coupled to M15); Remotion options A/B/C
      recorded for the M15 decision — no decision taken at inc-7
- [x] T19.06 scaffolding removal ledger (intentional deferrals classified) —
      `docs/M14_AUDIT_T1904_T1906_T1907.md` incl. HD reconciliation of the five
      M13-inc-10 honest-deferral UI states (documented at milestone level)
- [x] T19.07 stub audit (TODO/placeholder/fake-resolver surface classified) —
      ZERO runtime stubs on real paths; six unimported `electron/binaries/*`
      wrappers recorded as dead-code scaffolds

## inc-7.5 — Security remediation (audit fix-now classes; opened 2026-09-11)

**Status: COMPLETE (2026-09-11)** — F-01..F-06, F-08, F-09 remediated; F-07
(Electron major) open, coupled to M15. Fixes the small validation findings from
`M14_AUDIT_T1903_SECURITY.md` at trust boundaries (F-07 Electron major stays coupled to M15; findings are
the spec). Scope: F-01 requestId validation + containment, F-02 export
routed to storageDir/exports, F-03 gallery:create path containment, F-04
provider-URL fetch guard (https + timeout + byte cap), F-05 IPC payload
allowlists/guards, F-06 error detail stripped at the IPC envelope, F-08
CSP, F-09 sensitive-store file mode. Boundary tests per TDD.

- [x] F-01/F-02/F-03 path/write containment fixes + tests (electron/security/validate.ts NEW; requestId boundary validation + resolveTempDir containment; export forced under <storageDir>/exports; LibraryService allowedRoots)
- [x] F-04 provider-URL fetch guard + test (https-only, same-host as configured gateway endpoint, AbortSignal.timeout, 32 MB cap)
- [x] F-05 IPC payload allowlists (studio 7-mode allowlist, projects save shape, gallery update patch checks, history append allowlist, vectorize config mode {spline,polygon,pixel} + numeric coercion) + tests
- [x] F-06 IPC envelope strips detail to {code, message} (gallery/projects/history/feedback/jobs)
- [x] F-08 CSP meta; F-09 AtomicJsonStore mode 0600 + fsync (settings store 0o600; dev-only fast-refresh CSP caveat recorded)
- [x] Full gate green with the new boundary tests — 629/629 (60 files, +18 boundary tests), typechecks ×2, lint 0 errors, build, E2E smoke PASS

## inc-8 — P-014 visual similarity (nativeImage) — COMPLETE (2026-09-11)

Human decision (asked twice; final answer **A: implement, nativeImage**):
implement with the platform-native decode path — Electron built-in
`nativeImage` (PNG/JPEG), ZERO new decoder dependency (no sharp/jimp/pngjs).
fix-2 delivered partially then died (stall #17): domain module + tests only;
Head Developer completed the implementation and wiring directly.

- [x] decode service (nativeImage, injectable decoder) + unit tests —
      `electron/services/library/visual-fingerprint.ts` (lazy dynamic
      import keeps vitest Electron-free; BGRA→RGBA; honest
      decode_failed/invalid_pixels reasons); domain algorithms in
      `src/modules/studio/domain/concept/perceptual-hash.ts` (HD-corrected:
      integer-exact grayscale accumulation — float box-average hashed a flat
      image non-deterministically; dHash polarity tests corrected to Canvas
      7266: bit=1 iff current pixel brighter than next)
- [x] batch-completion hook: fingerprint computed + persisted per produced
      asset (single + batch share the persist path in generateAsset;
      best-effort — never fails the asset)
- [x] similarity wired at existing seams —
      `LibraryService.findSimilarVisual` (Canvas checkLibraryVisualSimilarity
      18564 mapping: threshold 0.55 / limit 5; only fingerprinted assets
      participate). HONEST NOTE: no renderer/IPC similar-assets surface and
      no change to concept-based repair evidence — the visual lookup is
      main-process and unit-tested; a renderer surface belongs to a UI row.
      Additive optional `visualFingerprint` field on the Asset contract
      (shape mirrored structurally; shared←modules direction preserved)
- [x] unsupported formats skipped honestly (field absent, never fabricated)
- [x] full gate green — 648/648 (62 files, +19 tests), typechecks ×2, lint
      0 errors, build, E2E smoke PASS

## Out of M14 scope (assigned elsewhere)

- Layer B+C metadata-QA coupling, PREFLIGHT_ITEMS checklist,
  decision→asset-STATUS persistence (metadata integration increment)
- P-011 reconsider dialog, P-026 renderer confirmation/progress (renderer
  milestone)
- P-029 background editing, UI-102/103 inference backend (feature
  increments)
- M15 production gate approval (after M14 evidence)
