# M14 inc-7 — T19.03 Security Audit

**Scope:** IMAGIN Studio Local desktop app — Electron 31 main process (`electron/`), preload
(`electron/preload.ts`), renderer (`src/`), scripts, tests, fixtures, lockfile.
**Method:** static source review + targeted `git grep`. No pen-testing, no runtime
exploitation, no network fuzzing. Git history was **not** scanned (see Limitations).
**Date:** 2026-09-11

---

## Summary table

| # | Checklist item | Status | Findings |
|---|----------------|--------|----------|
| 1 | Secrets in tracked source/tests/fixtures/scripts | **PASS** | 0 |
| 1b | `.gitignore` covers secrets/env | **PASS** | 0 |
| 2 | IPC surface validated at boundary | **FINDING** | F-03, F-05, F-06 |
| 3 | BrowserWindow / webPreferences hardening | **PASS** (hardening gap F-08) | 1 low |
| 4 | Secrets-at-rest + no secret to renderer | **PASS** (hardening gap F-09) | 1 low |
| 5 | Dependency / API key exposure | **FINDING** | F-07 |
| 6 | Logging / error leakage | **FINDING** | F-06 |
| 7 | Native spawn/exec argument injection, shell, SSRF | **FINDING** | F-01, F-04 |
| 8 | LLM output handling (base64/JSON) | **PASS** (gap F-04) | 0 high |
| 9 | Renderer filesystem exposure / path traversal | **FINDING** | F-01, F-02, F-03 |

Totals: **3 High, 3 Medium, 3 Low, 0 Critical**.

---

## F-01 (HIGH) — `requestId` path traversal + recursive delete/overwrite in job temp dirs

User-controlled `requestId` is validated only as a non-empty string, then joined directly into
a filesystem path used for `mkdir`/writes and, in `finally`, `fs.rm(..., { recursive: true, force: true })`.

- `electron/services/upscale/upscale-service.ts:198` — `path.join(deps.storageDir, 'tmp', request.requestId)`; `:202` mkdir; `:277` recursive rm.
- `electron/services/vectorize/vectorize-service.ts:164` — same construction; `:233` recursive rm.
- `electron/services/remotion/remotion-service.ts:178` — same construction; `:196` writes `index.ts`; `:290` recursive rm.
- `src/modules/metadata/application/export-metadata.ts:40` — `requestId` used in default export filename.
- Validation origin: `electron/ipc/upscale.ts`, `vectorize.ts:48`, `remotion.ts`, `metadata.ts:117` accept any non-empty string.

A renderer passing `requestId = "../../../../<dir>"` escapes the module storage root; the
recursive delete can remove an arbitrary directory the user account can access. Severity
raised because the traversal reaches a destructive recursive operation, not just a read.

**Recommended fix class:** never use caller-supplied values as path segments. Generate a
server-side temp id (e.g. `newId('tmp')`/`crypto.randomUUID()`), or validate against
`/^[A-Za-z0-9._-]{1,64}$/` and assert the resolved path stays inside `storageDir` via
`path.resolve` + prefix check before any fs call.

---

## F-02 (HIGH) — Arbitrary file write via `metadata:export` `destinationPath`

- `electron/ipc/metadata.ts:130` passes `req.destinationPath` through when it is any string.
- `src/modules/metadata/application/export-metadata.ts:38-40` uses it verbatim (fallback to storage dir); `:72-73` `mkdir` + `writeFile`; `:75` re-stats.

The renderer can cause the main process to write a CSV/JSON file (asset metadata content) to
any path the user can write, including overwriting existing files. The written bytes are
app-derived asset metadata, so this is arbitrary-location write rather than arbitrary-content
injection — still a broken trust boundary.

**Recommended fix class:** drop `destinationPath` from the IPC contract and always write
under `storageDir/exports`; if user-chosen export location is required, route it through a
main-process native save dialog and validate containment of the resolved path.

---

## F-03 (MEDIUM) — Arbitrary filesystem probe/registration via `gallery:create` + `file://` URL

- `electron/ipc/gallery.ts:66-79` validates only that `kind`/`origin` are strings and
  `location.kind` is a string; the whole object is cast to `CreateAssetInput`.
- `electron/services/library/library-service.ts:170-181` then `ensureFileExists`, `stat`s and
  SHA-256-hashes the caller-supplied `location.absolutePath`.
- `electron/ipc/gallery.ts:60` exposes the registered path as a `file://` URL to the renderer.

The renderer can register any readable path as an "asset", learning existence, size, mtime
and SHA-256 (a file oracle), and receive a `file://` URL. Combined with any renderer
script-injection vector this becomes an arbitrary-file-read primitive.

**Recommended fix class:** validate that `absolutePath` resolves inside managed asset roots
(storage/outputs) before create; reject `..`/absolute paths outside those roots. Prefer
main-orchestrated imports (dialog-based) instead of renderer-supplied paths.

---

## F-04 (MEDIUM) — Provider-response URL fetch is unvalidated (SSRF / unbounded download)

- `electron/services/ai/ai-service.ts:301-309` — when the image response contains `data[0].url`
  instead of `b64_json`, the main process fetches that URL directly with the plain `fetch`
  implementation. There is **no host allowlist**, no scheme restriction, no timeout and no
  max-size cap on this secondary fetch.

A compromised/malicious 9Router endpoint (the configured base URL is user-editable and can
point at `localhost`/link-local metadata addresses) can make the app issue requests to
arbitrary hosts from the user's network context (SSRF), or return an unbounded body to
exhaust memory. Note the primary request already runs against a user-chosen base URL, so the
incremental risk is the *second*, response-supplied URL.

**Recommended fix class:** reject non-`https:` URLs, enforce a host allowlist (or require
same-host as configured base URL), add `AbortSignal.timeout` and a byte cap on the fetched
image.

---

## F-05 (MEDIUM) — Several IPC handlers forward renderer JSON blobs with only shape checks

Boundary validation is inconsistent. Handlers that cast untrusted payloads into typed inputs
without field validation:

- `electron/ipc/studio.ts` — `studio:produce` validates `requestId`/`mode`/`prompt` are
  non-empty strings but does **not** allowlist `mode` against the known discriminator set
  before forwarding the whole object to the production service.
- `electron/ipc/projects.ts:54-59` — `projects:save` persists an arbitrary object as
  `ProjectRecord` (only `projectId` looked up).
- `electron/ipc/gallery.ts:85-93` — `gallery:update` casts arbitrary `patch`.
- `electron/ipc/history.ts:30-38` — `history:append` requires `type`/`action` strings but
  forwards the rest.
- `electron/ipc/vectorize.ts:61` — `config` forwarded as `VectorizeConfig`; `config.mode` is
  not allowlisted and is passed as an argument value to the `vtracer` binary
  (`electron/services/vectorize/vectorize-service.ts:38-51`). No shell is involved, so this is
  argument-value tampering / CLI confusion, not command injection.

**Recommended fix class:** add per-channel schema validation (e.g. small shape guards or a
validator) at the IPC adapter, matching the stricter handlers (settings, gallery:get,
feedback). For vectorize, allowlist `mode` to `spline|polygon|none` and coerce numerics.

---

## F-06 (LOW/MEDIUM) — Internal `detail` objects returned to renderer

`src/shared/errors/contract.ts:74-83` `toSerializableError` returns the full `StructuredError`
including `detail`, and unknown errors attach the raw thrown value (`detail: e`). Handlers such
as `gallery:list`, `projects:save`, `history:append`, `feedback:record`, `jobs:*` return this
object to the renderer. `detail` can contain absolute filesystem paths, binary argument
vectors and stderr tails (e.g. `electron/services/binaries/binary-service.ts:159-161`,
`missingError` `searchedPaths`), and raw Error objects (stack/cause). The stricter handlers
(`studio.ts`, `metadata.ts`, `upscale.ts`) already strip to `{code, message}`.

**Recommended fix class:** always map to `{code, message}` at the IPC envelope (as
`metadata.ts` `errResult` does) and keep `detail` main-process-only / behind an opt-in
diagnostics channel.

---

## F-07 (HIGH, dependency) — Electron 31 shell carries high-severity advisories

`package.json` pins `electron: ^31.4.0`; installed `31.7.7`. `npm audit` reports multiple
high-severity Electron advisories reachable in the production runtime shell (use-after-free,
context-isolation bypass via `Function.prototype.bind` hijack, renderer command-line switch
injection, custom-protocol cross-origin reads). Full triage in
`docs/M14_AUDIT_T1905_PACKAGING.md` (audit table). Since Electron **is** the shipped runtime,
these are runtime-reachable, unlike the dev-only Vite/Vitest advisories.

**Recommended fix class:** plan a major Electron upgrade through M15 packaging
(bump major, re-verify `sandbox`/`contextIsolation` behavior). No immediate patch exists on
the 31.x line.

---

## F-08 (LOW) — No Content-Security-Policy in the renderer

`index.html` (lines 3-7) defines no CSP meta and Electron sets no CSP header. The preload +
`contextIsolation` boundary is the primary control and is correctly enabled, but a CSP is
missing defense-in-depth against injected content (e.g. a future provider-rendered payload).

**Recommended fix class:** add a restrictive `Content-Security-Policy`
(`default-src 'self'; img-src 'self' data: file:; ...; object-src 'none'`) via meta or
`session.webRequest.onHeadersReceived`.

---

## F-09 (LOW) — Settings file written with default permissions, no explicit mode

`electron/services/storage/atomic-json.ts:69-78` writes `settings.json` (holding only
safeStorage ciphertext, never plaintext) with default process permissions (`umask`-derived,
typically `0644`) and no explicit `mode`/`fsync`. The plaintext key is never persisted, and the
renderer never receives ciphertext or plaintext, so this is hardening only.

**Recommended fix class:** write sensitive stores with `mode: 0o600` and an explicit `fsync`
before rename.

---

## PASS item details

1. **No hardcoded secrets.** `git grep` for `sk-*`, `AIza*`, `ghp_*`, `xox[baprs]-`,
   `-----BEGIN * PRIVATE`, `AKIA*` across tracked files (excluding `package-lock.json`)
   returned no matches. The only key-like literals are test placeholders (`sk-secret`,
   `sk-1`, `sk-2`) in `electron/services/settings/settings-service.test.ts` and fake keys in
   test mocks. No `.env` file is tracked.
2. **`.gitignore`** covers `.env`, `.env.*` (with `!.env.example`), `*.local.json`,
   `settings.local.json`, `node_modules/`, `dist*`, `bin/`, `binaries/`, `native/`,
   `/storage/`, `session-*.md`. No key material or local settings are tracked.
3. **BrowserWindow hardening.** `electron/main.ts:10-15` sets `contextIsolation: true`,
   `nodeIntegration: false`, `sandbox: true`; `webSecurity` is not disabled and no
   `allowRunningInsecureContent`/`webviewTag` is set. No other `BrowserWindow`/`webPreferences`
   exists.
4. **Secrets-at-rest.** `settings-service.ts:86-97` — `getStudioConfig()` returns only
   `hasNineRouterKey` boolean; `getDecryptedNineRouterKey()` is main-process-only.
   `persist()` (`:78-84`) defensively deletes `nineRouterApiKey`; plaintext is migrated to
   safeStorage ciphertext on load or dropped with no fallback (`:64-76`).
   `key-vault.ts:7-12` wraps Electron `safeStorage`. No renderer path returns key material.
5. **Logging.** No `console.log` of request payloads, prompts, headers or keys in `electron/`
   (only `main.ts:31,34` recovery summary). Renderer `console.warn` calls log error objects
   but no secrets.
6. **Native command execution.** All `spawn`/`execFile` calls use argument arrays; no `shell`
   option is set true (BinaryService explicitly `shell: false`,
   `electron/services/binaries/binary-service.ts:131-136`). No string interpolation into a
   shell. Resources passed to binaries derive from library records / internal storage paths,
   apart from the vectorize `config` flags noted in F-05.
7. **LLM output handling.** Provider JSON is parsed defensively with type guards
   (`ai-service.ts:238-242,293-316,394-408`); base64 is wrapped with `Buffer.from(...)`, not
   executed. No `eval`, `new Function`, `innerHTML` or `dangerouslySetInnerHTML` anywhere in
   `src/` (grep returned none).
8. **IPC transport.** `preload.ts` exposes only `ipcRenderer.invoke` wrappers — no
   `ipcRenderer.send`, no `ipcRenderer.on` listener exposure, no raw `ipcRenderer`. No
   arbitrary-object channel exists.

### IPC surface inventory

Exposed on `window.api` (`electron/preload.ts:7-77`): `studio.produce`; `metadata.generate/
regenerateField/validate/export`; `gallery.list/get/assetUrl/create/update/delete`;
`upscale.run/status`; `vectorize.run/status`; `remotion.render/status`;
`jobs.list/get/cancel/resume`; `recovery.list/resume/discard`; `settings.get/set`;
`projects.list/get/create/save/duplicate/archive/unarchive/remove/attachJob/setAssetCount`;
`history.list/append/logError`; `feedback.list/record/remove`.

Registered main handlers (`electron/ipc/*.ts`): the same channel names above plus
`feedback:list/record/remove`. Every handler is wrapped in try/catch returning a structured
`{success:false,error}` envelope; validation strictness varies (see F-05).

---

## N/A / out of scope

- **Git history secret scan** — not performed (history rewrite/secret scanning is a separate
  exercise; only the current tree was audited).
- **Penetration testing / dynamic exploit validation** — not performed; findings are static.
- **Server-side SSRF** — no server component exists; all networking is from the desktop main
  process under the local user's control (F-04 is the client-side equivalent).
- **OS/package-manager supply chain** — covered at the dependency level in T19.05; binary
  provenance (Real-ESRGAN/VTracer/ffmpeg) is provisioned out-of-band and not verified here.

---

## Audit limitations (honest)

This is a **static, source-level review** performed on the working tree at 2026-09-11. It did
not run the application, exercise IPC dynamically, or attempt exploitation; several findings
(F-01, F-03, F-04) are established by code inspection and would need a dynamic test to confirm
runtime exploitability. Dependency vulnerabilities are reported by `npm audit` and triaged in
the companion T19.05 report, not independently verified. Transitive/dynamic behavior of
Electron/safeStorage per OS, and git-history secret leakage, were not examined.

---

## Remediation status (updated 2026-09-11 — M14 inc-7.5)

| Finding | Status |
|---|---|
| F-01 requestId traversal + recursive rm | **REMEDIATED** — `electron/security/validate.ts` boundary validator + `resolveTempDir` containment; 18 boundary tests (`electron/ipc/__tests__/security-boundaries.test.ts`) |
| F-02 metadata:export arbitrary write | **REMEDIATED** — export always under `<storageDir>/exports/`; destinationPath no longer honored |
| F-03 gallery:create arbitrary path | **REMEDIATED** — LibraryService `allowedRoots` containment (managed storage tree only) |
| F-04 provider-URL fetch (SSRF/unbounded) | **REMEDIATED** — https-only, same-host as configured gateway endpoint, AbortSignal.timeout, 32 MB body cap |
| F-05 IPC payload validation gaps | **REMEDIATED** — studio 7-mode allowlist, projects save shape guard, gallery:update patch checks, history:append allowlist, vectorize config mode {spline,polygon,pixel} + numeric coercion |
| F-06 error detail leakage | **REMEDIATED** — gallery/projects/history/feedback/jobs envelopes return `{code, message}` only |
| F-07 EOL Electron 31 (HIGH) | **OPEN** — major upgrade coupled to M15 packaging (no patch on the 31.x line) |
| F-08 no CSP | **REMEDIATED** — restrictive meta CSP in `index.html` (dev-only fast-refresh preamble caveat: Vite HMR needs `ws:`/refresh allowances; production unaffected) |
| F-09 settings file permissions | **REMEDIATED** — AtomicJsonStore optional `mode` + fsync-before-rename; settings store `0o600` |
