# M14 inc-7 — T19.05 Clean-Environment Package Verification

**Scope:** verify that the repository builds from a clean checkout, audit production and full
dependency trees, confirm a single authoritative lockfile / install-scripts policy, and record
Remotion packaging options for M15. **Audit only — no source, config or docs were modified.**

## Environment

| Item | Value |
|------|-------|
| Clean copy | `/tmp/opencode/m14-cleanenv` (repo minus `node_modules`, `dist*`, `.git`) |
| Copy method | `rsync -a --exclude node_modules --exclude 'dist*' --exclude '.git'` |
| Node | v26.8.1 |
| npm | 12.0.2 |
| Date | 2026-09-11 |

---

## 1. Clean-environment build & typecheck

All commands run inside the clean copy. `npm ci` (deterministic install from `package-lock.json`).

| Step | Command | Result | Duration |
|------|---------|--------|----------|
| Install | `npm ci` | **PASS** — 515 packages added | 15 s |
| Build | `npm run build` | **PASS** — vite 107 modules + esbuild main/preload | 3 s |
| Typecheck (renderer) | `npm run typecheck` | **PASS** | 7 s |
| Typecheck (electron) | `npm run typecheck:electron` | **PASS** | 3 s |
| Full test suite | `npm test` | **NOT RUN** — out of scope (time budget), per task |

Build artifacts produced: `dist/` 2.6 MB, `dist-electron/` 596 KB (`main.mjs` ~588 KB,
`preload.cjs` ~4.9 KB). `npm ci` completed deterministically; no lockfile drift.

`npm ci` is supported and succeeded — no fallback needed.

---

## 2. Install-scripts policy & Electron binary (KEY FINDING)

`npm ci` emitted:

```
npm warn install-scripts 4 packages had install scripts blocked because they are not covered by allowScripts:
  esbuild@0.28.1  (postinstall: node install.js)
  electron@31.7.7 (postinstall: node install.js)
  esbuild@0.28.2  (postinstall: node install.js)
  esbuild@0.21.5  (postinstall: node install.js)
```

- **esbuild is unaffected:** its platform binary is delivered through the optional dependency
  `@esbuild/linux-x64` (`node_modules/@esbuild/linux-x64` present), so `npm run build` works
  even with the postinstall blocked.
- **Electron is affected:** `node_modules/electron/dist/` and `path.txt` are **absent** after
  `npm ci`. The build/typecheck pass because they do not need the Electron runtime binary, but
  `npm run dev` / the packaged app cannot launch until the Electron postinstall is approved or
  `npm rebuild electron` is run.
- **Policy source:** the repository ships **no `.npmrc` and no `allowScripts`/install-scripts
  policy**. The block comes from the operator's user-level `~/.npmrc`
  (`allow-scripts=@anthropic-ai/claude-code`) under npm 12. On a machine with default npm
  config the same `npm ci` would run all install scripts — so install behavior is
  **environment-dependent and non-reproducible** from the repo alone.

**Finding 1 (fix-now):** add a repo-level install-scripts policy (`.npmrc`/`allowScripts`
allowlist for `electron` and `esbuild`) or a documented `npm rebuild electron` step, so a clean
install reliably yields a launchable app.

---

## 3. npm audit triage

Run in the clean copy. `npm audit fix --force` was **not** run; `package.json`/lockfile
untouched.

### Production dependencies — `npm audit --omit=dev`

Result: **2 moderate, 0 high, 0 critical** (`exit 1`).

| Package | Severity | Transitive? | Advisory summary | Fix |
|---------|----------|-------------|------------------|-----|
| `react-router-dom` 6.30.6 | moderate | direct | pulls vulnerable `react-router` | 7.18.3 (major) |
| `react-router` | moderate | transitive | open redirect via backslash in `<Link>`/`useNavigate`; SSR-hydration constructor injection | via `react-router-dom` |

### Full tree — `npm audit`

Result: **1 critical, 3 high, 5 moderate** (`exit 1`).

| Package | Severity | Direct/transitive | Reachability | Classification |
|---------|----------|-------------------|--------------|----------------|
| `vitest` 2.1.9 | **critical** | direct (dev) | Vitest UI server only; not in shipped app | **dev-only** |
| `electron` 31.7.7 | **high** | direct (dev, but *is* the runtime shell) | Production runtime — Electron is the app shell | **fix-soon** |
| `vite` 5.4.21 | high | direct (dev) | Dev server only (`server.fs.deny` bypass on Windows, path traversal); not in build output | **dev-only** |
| `extract-zip` | high | transitive via `electron` | Used by Electron extraction during install; not shipped in app payload | **dev/build-only** |
| `react-router` / `react-router-dom` | moderate | (see above) | Renderer routing; advisories target SSR/injected links — no SSR here, local app | **fix-soon** |
| `esbuild` (via vite `0.21.5`) | moderate | transitive (dev) | Vite dev server only | **dev-only** |
| `@vitest/mocker`, `vite-node` | moderate | transitive (dev) | Test tooling only | **dev-only** |

**Fix-now:** none in the shipped production runtime (no critical/high that has a non-major fix).
**Fix-soon:** `electron` (major 31→44.x, high, runtime shell — pair with M15 packaging) and
`react-router-dom` (major 6→7.x, moderate, runtime renderer).
**Accepted-risk:** none recorded — every non-dev finding has a known upgrade path.
**Never:** `npm audit fix --force` was intentionally not run; it would force semver-major
upgrades across the toolchain.

Full-tree `esbuild`/`vite`/`vitest`/`@vitest/mocker`/`vite-node` are development-tooling only
and are omitted from the packaged application once a packager prunes devDependencies.

**Finding 2 (fix-soon):** the Electron shell is EOL with multiple high advisories; upgrading it
is the single highest-value dependency action and is naturally coupled to M15 packaging.

---

## 4. Lockfile & package-manager verification

| Check | Result |
|-------|--------|
| Authoritative lockfile | **`package-lock.json` only**, `lockfileVersion: 3` |
| Competing lockfiles | none (`yarn.lock`, `pnpm-lock.yaml`, `npm-shrinkwrap.json` absent) |
| Git-tracked lockfiles | only `package-lock.json` (via `git ls-files`) |
| `packageManager` field | **absent** in `package.json` |
| `.npmrc` in repo | absent |

**Note:** single lockfile + `npm ci` gives dependency reproducibility, but the missing
`packageManager` pin means Node/npm major drift (e.g. npm 12's install-scripts behavior) can
change install semantics without a repo change. Recommend pinning `packageManager` when the
install-scripts policy is added.

---

## 5. Remotion packaging strategy — decision options (M15)

**Current facts**

- Runtime deps: `@remotion/bundler`, `@remotion/cli`, `@remotion/renderer`, `remotion` — all
  `^4.0.522` (in `dependencies`).
- `npm run build:electron` externalizes `@remotion/*` and `remotion`, so the main bundle
  **does not contain Remotion**; `electron/services/remotion/remotion-service.ts:200,219`
  dynamically imports `@remotion/bundler` and `@remotion/renderer` from `node_modules` at
  render time.
- Bundling resolves modules from `process.cwd()/node_modules` (`remotion-service.ts:212`)
  and calls `ensureBrowser()` (`:220`), which requires a headless Chrome; `renderMedia` also
  needs `ffprobe` on `PATH` (`:105,255`).
- Both are triggered from renderer IPC `remotion:render`, not at app start.
- Native binaries (Real-ESRGAN `upscayl-bin`, VTracer) are provisioned out-of-band into
  `electron/bin/linux/...` and are gitignored (`scripts/provision-binaries.mjs`).
- There is **no packager configured** (no `electron-builder`/`electron-forge`/
  `electron-packager` dependency or config); `electron` itself is a devDependency.

**Options (trade-offs only — no decision taken here)**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A. Bundle full runtime deps + Electron** | Ship packaged app with `node_modules` (asar + `asarUnpack` for native binaries), Remotion deps included; Chrome downloaded on first render or pre-seeded; bundle `electron/bin` + `ffmpeg`/`ffprobe`. | Simplest runtime correctness; dynamic imports just work; no build-time Remotion pipeline. | Largest artifact (Remotion toolchain + Chrome + node_modules, hundreds of MB); first run may need network for `ensureBrowser` (or a large pre-seeded browser dir); asar/unpack config for native binaries; ships dev-ish packages (`@remotion/cli`) unless pruned. |
| **B. Pre-bundle Remotion at build time** | Run `@remotion/bundler` during app packaging to emit a static Remotion bundle under `resources/`; ship `@remotion/renderer` + a fixed Chrome (`browserExecutable`); prune `@remotion/bundler`/webpack from the app. | Smaller app dependency tree; deterministic offline render; build-time failures surface early. | Build pipeline complexity; composition must remain static/serializable; must vendor a headless shell and keep it version-matched to `@remotion/renderer`; ffprobe still needed. |
| **C. Defer to M15** | Keep Remotion as a dev/node_modules runtime dependency for now; document that a packaged build will not include a working Render feature until A or B is chosen. | Zero inc-7 work; keeps this task audit-only; avoids prematurely committing to a strategy. | Packaged builds ship a non-functional Remotion feature; unresolved `ensureBrowser`/ffprobe/binary bundling. |

**Cross-cutting for all options:** native binaries (`electron/bin/linux/{realesrgan-ncnn,vtracer}`)
and `ffmpeg`/`ffprobe` must be included in whatever package layout is chosen, or Upscale/
Vectorize/Remotion fail in the packaged app for the same reason they are currently
provisioned manually. Because `electron` is a devDependency and no packager exists, **the repo
currently has no reproducible path from `npm ci` to a distributable desktop package**; adopting
a packager is a prerequisite to evaluating A vs B.

---

## Top findings

1. **No repo-level install-scripts/lockfile policy:** a clean `npm ci` used here left the
   Electron binary uninstalled (postinstall blocked by npm 12 `allowScripts`), so the build
   passes but the app cannot launch — install behavior depends on the operator's `~/.npmrc`.
2. **No packager + EOL Electron:** there is no configured tool to produce a desktop package,
   native/Remotion runtime assets are unbundled, and the Electron 31 shell carries multiple
   high-severity advisories (highest-value fix is a major Electron upgrade in M15).

### Out of scope
- Full `npm test` suite in the clean env (per task, time budget).
- `npm audit fix --force` (prohibited).
- Git-history scanning and dynamic runtime verification.
