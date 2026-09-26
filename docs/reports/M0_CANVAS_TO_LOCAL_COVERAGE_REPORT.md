# M0 — Canvas-to-Local Coverage Report (Output B)

Status: READY_FOR_APPROVAL · Date: 2026-09-07 · Source of counts: CANVAS_TO_LOCAL_MAPPING.md audit (§5–§82, Appendix A/B) cross-checked against Canvas source inspection.

## Headline numbers

```text
Total logical Canvas blocks identified: 78 section-level blocks (§5–§82)
                                        + 459 symbol-level declarations (Appendix B)
                                        + ~80 source-range rows (Appendix A, full 1–28,415)
Mapped:       78/78 section-level; 459/459 symbol-level entries present
              (of which ~45 have deferred-resolution targets — see Pending)
Unmapped:     0
Retired:      0   ← disposition defined but never applied (see Gap G1)
Consolidated: ≈8  (presets/styles/registries; rule-engine consolidation)
Split:        8   (6 SPLIT + 2 SPLIT+REBUILD)
Rebuilt:      ≈7  (4 REBUILD + 2 SPLIT+REBUILD + 1 REBUILD/ADAPT)
Adapted:      ≈4  (3 ADAPT + 1 REBUILD/ADAPT)
Move:         ≈10
Remainder:    dispositions expressed as section-level target owners with
              file-level resolution due at the owner milestone
```

Counting method: dispositions read from explicit section-level statements (§5–§82); "≈" where disposition is expressed via section-level mapping rather than a per-symbol tag. No block is without a disposition.

## Critical behavior coverage

All 22 critical Studio capabilities have mapping entries with target owners:

normal generation, batch, JSON batch, icon, reference workflow, semantic intent, DNA, prompt compilation, composition/diversity, differentiation/similarity, technical QA, visual QA, metadata, compliance, preflight, auto-regeneration, revision, object modifier, project/history, export, production trace, feedback recording.

```text
Critical behavior coverage = 100% (entry level, with owner targets)
Unknown critical mapping   = 0
```

Capability completeness notes (documented, not unknowns):
- **Feedback recording** — mapped (§56 rejection taxonomy → `recordRejectionFeedback`) but as application-level action without dedicated workspace section. Acceptable; revisit at M6.
- **Import** — covered across §47 (JSON batch import/resume) + §39 (file utilities) + §61 (asset lifecycle) without a consolidated Import-module entry. Acceptable; consider explicit CONSOLIDATE entry at M5.

## Gaps requiring action (tracked)

- **G1 — RETIRE never used.** Mapping doc defines RETIRE (§2.1, Rule 6) but applies it zero times. A dead-code/obsolete-block pass over Canvas must run and produce documented RETIRE entries (or explicit "nothing to retire" evidence) before M13. Not hiding work: no Canvas block is currently identified obsolete; unfulfilled rule recorded.
- **G2 — ~45 Appendix B entries with deferred file resolution** (mostly type contracts, e.g. lines 2098–2691 → "split by owner"; ~30 dual-option targets). Recorded as PENDING-RESOLUTION in CANVAS_TO_LOCAL_MAPPING.md (M0 audit addendum). Resolution due at owner milestone (M2 for contract types, M5 for studio domain).
- **G3 — Job-state taxonomy divergence** between Canvas (`running/paused`) and all target docs. Blocked on decision D-015; Canvas states proposed RETIRE.

## Verification against M0 gate

```text
[✓] CANVAS_TO_LOCAL_MAPPING.md validated (78 sections + 459 symbols audited)
[✓] Canvas critical coverage = 100% (entry level)
[✓] Unknown critical mapping = 0
[✓] Coverage Report produced (this document)
[→] RETIRE pass scheduled (G1, gate M13)
[→] PENDING-RESOLUTION markers added to mapping doc (G2)
```
