# IMAGIN Studio — SVG QA Specification

## QA pipeline

```text
Raw SVG
→ XML parse
→ schema/catalog validation
→ structural validation
→ normalization
→ render preview
→ visual QA
→ technical QA
→ microstock QA
→ accepted/rejected
```

## Hard failures

- invalid XML
- invalid SVG root/namespace
- broken reference
- script
- external resource dependency
- non-finite coordinates
- corrupted path data
- unsupported prohibited element
- empty/blank output
- artboard invalid
- catastrophic renderer failure

## Warning/review conditions

- excessive path count
- excessive node count
- suspicious off-canvas geometry
- text usage where policy requires review
- filter complexity
- unusual gradients
- near-duplicate composition

## Determinism

Normalization must be idempotent. QA must operate on the canonical normalized SVG, not on the streaming intermediate state.

## Evidence

Persist QA report with:

- validator version
- normalization version
- element/path/text/image counts
- warnings
- failures
- render result
- timestamp
- productionId
- attemptId
