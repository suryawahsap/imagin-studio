# Agent Task — Integrate GenSVG into IMAGIN Studio

## Objective
Integrate `pq-dong/GenSvg` as the Native SVG Generation Engine while preserving VTracer and the canonical IMAGIN asset/job/production architecture.

## Mandatory source-of-truth
Read first:
1. `plan.md`
2. `docs/PRODUCT_FLOW.md`
3. `docs/BEHAVIOR_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. `docs/workspace/VECTORIZE_WORKSPACE.md`
6. `docs/CANVAS_TO_LOCAL_MAPPING.md`
7. `docs/PARITY_MATRIX.md`
8. `docs/DEVELOPMENT_RULES.md`
9. `docs/EXECUTION_LOG.md`
10. `docs/vector/*.md`

## Rules

- Do not create a second production pipeline.
- Do not move provider credentials into React.
- Do not call GenSVG directly from UI components.
- Do not replace VTracer.
- Do not persist partial streaming output as completed assets.
- Do not bypass SVG normalization or QA.
- Do not generate fake/mock completion evidence.
- Do not silently rewrite unrelated architecture.
- No new `@ts-nocheck`.
- Preserve visual fidelity of the existing workspace reference.

## Work sequence

```text
1. Inspect current vectorize implementation
2. Inspect 9Router contract
3. Inspect GenSVG source/package/API shape
4. Design adapter boundary
5. Implement domain contract
6. Implement GenSVG adapter
7. Implement/verify catalog restrictions
8. Implement SVG normalization + QA
9. Wire application command
10. Wire workspace UI
11. Add tests
12. Run typecheck/lint/build
13. Run runtime generation
14. Verify Gallery persistence + lineage
15. Update docs/mapping/parity/execution log
16. Commit
17. STOP and ask for human approval
```

## Acceptance evidence

Report:
- changed files
- architecture impact
- tests
- typecheck/lint/build output
- actual generation evidence
- SVG structural metrics
- rendered preview evidence
- Gallery persistence
- lineage
- remaining risks

Then ask exactly for human approval before proceeding to the next milestone/task.
