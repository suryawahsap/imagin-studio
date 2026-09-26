# IMAGIN Studio — Native SVG Production Specification

**Status:** Domain contract

## Purpose
Define the business/technical contract for AI-generated native SVG assets.

## Core principle
Native SVG is a first-class production asset, not a converted raster image.

## Two vector creation modes

```text
TRACE RASTER      → VTracer → SVG
GENERATE NATIVE   → GenSVG  → SVG
```

Both produce new SVG assets and enter the same validation, persistence, lineage and Gallery flow.

## Required asset semantics

- MIME: `image/svg+xml`
- canonical master: SVG
- source/lineage recorded
- productionId recorded
- generator/provider recorded
- QA state recorded
- deterministic artifact hash recorded after canonical serialization

## Quality tiers

```text
CANDIDATE
VALIDATED
STOCK_READY
REJECTED
NEEDS_REVIEW
```

Only validated/accepted states may be treated as completed production assets.

## Metadata

Stock metadata generation is not owned by Studio/Vectorize. After the asset reaches Gallery, the user may route it into the dedicated Metadata workspace.

## Export

SVG remains master. PNG preview and EPS are derived artifacts.
