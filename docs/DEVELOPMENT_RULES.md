# IMAGIN Studio Local — Development Rules

**Status:** Mandatory engineering rules  
**Date:** 2026-09-06  
**Applies to:** all developers, agents, and automation modifying the new Local project

---

## 1. Source-of-Truth Hierarchy

Use this hierarchy:

```text
1. Canvas Upgraded
   behavior / rules / edge cases

2. UI reference
   navigation / workflow / visual hierarchy

3. Architecture + Behavior Spec
   Local implementation contracts

4. Tests / E2E evidence
   runtime truth
```

The old Local project is not an implementation template.

---

## 2. No Blind Copy-Paste

Never copy a Canvas function directly into Local and assume parity.

Required method:

```text
Canvas behavior
→ identify contract
→ choose Local owner
→ implement
→ test
```

Code similarity is not acceptance evidence.

---

## 3. One Canonical Owner

Every production rule has one canonical implementation.

Bad:

```text
App rule
+ Flow rule
+ Engine rule
```

Good:

```text
UI
 ↓
Application
 ↓
Canonical Domain
```

If a duplicate is discovered, compare behavior before deleting it.

---

## 4. No Business Logic in UI

UI may:

```text
collect input
show state
trigger action
render result
```

UI must not own:

```text
production planning
AI transport
metadata policy
QA policy
persistence algorithms
retry algorithms
lineage decisions
```

---

## 5. No Direct AI Provider Call from Renderer

Allowed:

```text
Renderer
 ↓
Preload
 ↓
IPC
 ↓
AI service
 ↓
Provider / 9Router
```

Forbidden:

```text
React component
 ↓
fetch(provider)
```

---

## 6. Secrets Stay in Main Process

Never put API keys in:

- React state;
- DOM;
- localStorage;
- plain JSON settings;
- production trace;
- ordinary debug logs;
- screenshots generated for test evidence.

Only safe presence/configuration information may cross the renderer boundary.

### 6.1 9Router key-handling contract (promoted verbatim from `reference/infrastructure/9router.md` §8 per D-019)

- **Simpan:** `settings.studio.encryptedNineRouterKey` (base64 dari `safeStorage.encryptString`), file `storage/metadata/settings.json`. `persist()` selalu menghapus field plaintext. Load: migrasi otomatis plaintext → encrypted bila `safeStorage` tersedia; bila tidak tersedia, plaintext **dihapus tanpa fallback**.
- **Baca:** hanya `getDecryptedNineRouterKey()` di main. Renderer hanya terima `hasNineRouterKey: boolean`.
- **Tulis:** konfigurasi channel (Local: `settings:set`, menggantikan legacy `studio:save-config`) menerima `nineRouterApiKey` (≤8000 char); string kosong = hapus key.
- **Test cutover:** test harus assert tidak ada `nineRouterApiKey` plaintext di `settings.json`.

---

## 7. One Shared Asset Model

Never create module-specific copies of the core Asset entity.

Forbidden:

```text
StudioAsset
MetadataAsset
GalleryAsset
UpscaleAsset
```

Allowed:

```text
Shared Asset
+
module-specific view models / request DTOs
```

---

## 8. One Canonical Production Core

No feature is allowed to create a second production pipeline.

All Studio production modes must converge on:

```text
ProductionRequest
→ ProductionPlan
→ Canonical Pipeline
→ ProductionResult
```

Batch, Icon, JSON, Reference, Revision, and Object Modifier are adapters into the same execution core.

---

## 9. Flow Files Orchestrate; Domain Decides

Application/flow code may coordinate:

```text
validate
→ call domain
→ call infrastructure
→ update state
```

But decision rules belong to domain owners.

A large flow file is a warning sign when it begins to reproduce domain logic.

---

## 10. No Fake Implementations

Forbidden in production:

```text
return false
return []
return null
hardcoded fallback result
placeholder resolver
stub DNA
fake success state
```

A missing capability must fail explicitly or remain clearly marked as incomplete.

---

## 11. No Unbounded Retry

Retry must depend on error classification.

```text
retryable
→ bounded retry

non-retryable
→ fail with explicit reason
```

Never build infinite regeneration or retry loops.

---

## 12. Idempotency Is Mandatory

Critical actions require stable identity:

```text
requestId
productionId
jobId
assetId
attemptId
```

Rules:

```text
retry != duplicate
resume != regenerate
repeat click != second job
```

Persistence should be checked before creating a new result during recovery.

---

## 13. Persistence Is Part of Correctness

An operation is not complete when the UI says “done”.

It is complete only when required durable state has been successfully committed.

```text
critical write fails
→ do not claim completion
```

Use atomic writes or equivalent safe commit semantics.

---

## 14. No Hidden Persistence in React State

React state is runtime state.

Persistent truth belongs in storage/domain services.

Do not treat:

```text
useState(...)
```

as a database.

---

## 15. `@ts-nocheck` Is Forbidden in New Code

The new project must not introduce `@ts-nocheck`.

Type errors must be fixed at the type boundary or implementation boundary.

Build is mandatory because typecheck alone can miss some structural issues depending on tooling.

---

## 16. Build Is a Required Gate

For structural changes:

```text
lint/typecheck
→ build
→ relevant runtime/integration tests
```

Do not declare success based only on:

- editor diagnostics;
- `tsc` passing;
- static search;
- unit tests only.

---

## 17. Integration Tests Must Exercise Real Boundaries

A useful integration test should prove a path like:

```text
UI
→ application
→ domain
→ IPC
→ service
→ result
→ persistence
```

For critical paths, use a real configured environment rather than mocks only.

---

## 18. Production Trace Is Mandatory for Critical Flows

For critical production actions, record enough trace to answer:

```text
What was requested?
What was normalized?
What config was resolved?
What DNA/prompt was used?
What model was used?
What QA decision occurred?
Why was regeneration triggered?
What metadata was generated?
What was exported?
```

Do not store secrets in that trace.

---

## 19. Error Contract Must Be Structured

Minimum useful fields:

```text
code
message
retryable
stage
source
cause
```

AI errors should distinguish at least:

```text
401
403
429
408
aborted
invalid_response
invalid_json
safety_block
provider_error
network_error
```

Do not collapse all failures into one generic message.

---

## 20. Intentional Drift Rule

Differences from Canvas are allowed only when they improve architecture/security/reliability without changing intended production semantics.

Approved categories include:

- desktop persistence;
- secure IPC;
- durable jobs;
- centralized Gallery;
- metadata workspace;
- native binary execution in Electron.

Any other drift must be documented and reviewed.

---

## 21. Delete Only After Behavioral Comparison

When a duplicate appears:

```text
discover duplicate
→ compare behavior
→ compare edge cases
→ identify canonical owner
→ add regression test
→ delete duplicate
```

Never delete logic simply because it “looks similar”.

---

## 22. No Module-to-Module Private State Access

Forbidden:

```text
Metadata → import Studio internal state
Gallery → import Studio internal state
Upscale → import Gallery internal state
```

Use shared contracts or application commands.

---

## 23. Registry Discipline

Registry files are for stable data/configuration.

Do not turn registry into a place for:

- AI calls;
- React components;
- storage mutations;
- production execution.

---

## 24. IPC Discipline

IPC handlers should do only:

```text
validate transport input
→ call service
→ return structured result
→ emit event
```

Large domain algorithms belong outside IPC.

---

## 25. UI Completeness Rule

A screen is not complete because the component exists.

Acceptance must exercise:

```text
action
→ state
→ result
→ persistence
```

A disabled/placeholder screen must be clearly marked as incomplete rather than pretending to be functional.

---

## 26. Metadata Rules

Metadata generation must respect:

```text
Visual truth
>
Visual profile
>
Asset context
```

Field regeneration must be field-specific.

Do not run a full production pipeline to fix one metadata field.

---

## 27. Gallery Rules

Gallery is the asset workspace, not the business-logic owner of other modules.

Gallery may route actions, but domain decisions remain in the destination module.

When a transformation is defined as producing a new asset, preserve both source and derived asset with lineage.

---

## 28. Commit Discipline

A production-affecting change should contain:

```text
code change
+ test change
+ matrix update
+ drift note if needed
```

Do not bundle unrelated refactors into a production behavior patch unless necessary.

---

## 29. Agent Execution Protocol

Every agent task must follow:

```text
1. Read relevant architecture contract
2. Read relevant behavior contract
3. Identify target domain
4. Identify canonical owner
5. Define/confirm contract
6. Implement smallest coherent change
7. Add regression/contract test
8. Run lint/typecheck
9. Run build
10. Run relevant integration test
11. Verify persistence/recovery impact
12. Update parity matrix
13. Record intentional drift if any
```

---

## 30. What Agents Must Not Do

Do not:

```text
add a feature because a slot looks empty
copy Canvas code blindly
create a second engine for convenience
create a second pipeline for a new mode
put business logic into JSX
hide missing behavior behind fake fallbacks
introduce @ts-nocheck
mark parity because compile succeeds
start Market Opportunity logic before production parity is stable
```

---

## 31. Priority Order

When trade-offs occur, use this order:

```text
1. Correctness
2. Security
3. Data integrity
4. Behavioral parity
5. Reliability / recovery
6. Maintainability
7. Performance
8. UI polish
9. New features
```

A new feature must never be allowed to weaken a higher-priority item.

---

## 32. Final Engineering Rule

The project is successful when:

```text
Canvas Upgraded tells us WHAT

UI reference tells us HOW IT SHOULD FEEL

Architecture tells us HOW TO BUILD IT

Tests tell us WHETHER IT IS TRUE
```

The team must optimize for a stable product system, not for moving code quickly between files.
