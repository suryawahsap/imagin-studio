# IMAGIN Studio — Upscale Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan layout, flow, states, dan asset semantics untuk High Resolution Enhancement.

## 1. Tujuan Workspace

Upscale meningkatkan resolusi/kualitas asset tanpa menghilangkan asset sumber. Hasil yang secara produk merupakan output baru harus menjadi distinct asset dengan lineage.

## 2. Product Flow

```text
Gallery / Asset source
  ↓
Open Upscale
  ↓
Validate source
  ↓
Choose model / enhancement
  ↓
Choose target resolution
  ↓
Preview / configure
  ↓
Start Upscale
  ↓
Native processing through Electron infrastructure
  ↓
Progress / Task Center
  ↓
Output validation
  ↓
Save new asset
  ↓
Gallery
```

## 3. Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                     │
├───────────────┬───────────────────────────────┬────────────────────┤
│ Source        │ Before / After Preview        │ Inspector          │
│               │                               │                    │
│ Upload/Select │ split comparison              │ Source             │
│ source card   │ zoom                          │ Model              │
│               │ original / enhanced           │ Resolution         │
│ Model         │ thumbnails                    │ Enhancement        │
│ Enhancement   │                               │ File information   │
│ Resolution    │                               │ Lineage            │
│ Start Upscale │                               │ Download           │
└───────────────┴───────────────────────────────┴────────────────────┘
│ Task Center                                                        │
└────────────────────────────────────────────────────────────────────┘
```

## 4. Configuration

Primary controls:
- source asset;
- upscale model/preset;
- enhancement profile;
- sharpen;
- noise reduction;
- face/detail preservation where supported;
- output resolution.

## 5. Preview Behavior

The central preview should support:
- before/after comparison;
- zoom;
- fit-to-view;
- source/output switching;
- result thumbnails when multiple jobs/results exist.

## 6. Output Semantics

For a new upscale result:

```text
Source Asset
  ↓
Upscale Job
  ↓
New Asset
  ↓
Gallery
```

The source remains intact.

## 7. Failure / Recovery

Failures must identify at least:
- invalid source;
- unsupported format;
- native binary failure;
- timeout;
- cancellation;
- output validation failure.

Interrupted processing must be recoverable/reconcilable through the shared Job system.

## 8. Metadata Relationship

Upscale does not generate stock metadata by itself. The resulting asset returns to Gallery and can then be sent to Metadata.

When the source already has metadata, the product must define whether selected metadata is inherited or marked stale based on the asset transformation contract. The default architecture should preserve provenance and make the relationship explicit rather than silently assuming equivalence.

## 9. Completion Criteria

- valid input;
- real native processing;
- observable progress;
- cancellation;
- recovery;
- validated output;
- persisted new asset;
- lineage visible in Gallery.
