# IMAGIN Studio — Vector Architecture

## Overview

Vector functionality is split between native generation and raster tracing while sharing a common SVG asset lifecycle.

```text
                   VECTOR CREATION
                         │
          ┌──────────────┴──────────────┐
          │                             │
    Generate Native                Trace Raster
          │                             │
        GenSVG                       VTracer
          │                             │
          └──────────────┬──────────────┘
                         ↓
                       SVG
                         ↓
                 Normalize / Validate
                         ↓
                      Vector QA
                         ↓
                       Asset
                         ↓
                      Gallery
```

## Ownership

`modules/vectorize` owns vector creation semantics, SVG validation/normalization and vector-specific QA.

Shared `Asset`, `Job`, provenance and persistence contracts remain in shared/application/infrastructure layers.

## No parallel pipeline

Native generation must enter the same canonical production/job/persistence infrastructure used elsewhere in IMAGIN.
