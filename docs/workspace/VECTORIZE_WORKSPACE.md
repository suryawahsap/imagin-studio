# IMAGIN Studio — Vectorize Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan layout, flow, controls, output semantics, dan lineage untuk Raster → Vector.

## 1. Tujuan Workspace

Vectorize mengubah raster/image menjadi vector artwork, terutama SVG, dengan kontrol tracing dan preview hasil. Source raster dipertahankan.

## 2. Product Flow

```text
Gallery / Source Asset
  ↓
Open Vectorize
  ↓
Validate traceability
  ↓
Choose preset / trace mode
  ↓
Configure colors / background / advanced trace settings
  ↓
Trace
  ↓
Preview Original vs Vectorized
  ↓
Optional Retrace
  ↓
SVG quality / artboard validation
  ↓
Save as new SVG asset
  ↓
Gallery
```

## 3. Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                     │
├───────────────┬───────────────────────────────┬────────────────────┤
│ Source        │ Vector Preview                │ Inspector          │
│               │                               │                    │
│ Source asset  │ Original | Vectorized         │ Output info        │
│ Mode          │ comparison                    │ Dimensions         │
│ Preset        │ zoom                           │ Colors             │
│ Colors        │ thumbnails                    │ Paths              │
│ Background    │                               │ SVG stats          │
│ Advanced      │                               │ Lineage             │
│ Vectorize     │                               │ Download / Editor  │
└───────────────┴───────────────────────────────┴────────────────────┘
│ Task Center                                                        │
└────────────────────────────────────────────────────────────────────┘
```

## 4. Controls

### Quick Presets
- standard;
- detailed;
- icon-oriented presets;
- project-defined preset families.

### Color / Background
- color complexity;
- palette mode;
- transparent;
- white;
- custom background where supported.

### Advanced Trace
- draw style;
- line quality;
- grouping;
- smooth edges;
- gap filler;
- retrace controls.

## 5. Preview Rules

The main preview is comparison-oriented:

```text
Original | Vectorized
```

The workspace should show enough information for the user to judge whether tracing is acceptable before saving.

## 6. Output Semantics

Vectorize must create a new asset:

```text
Raster Source
  ↓
Vectorize
  ↓
SVG Asset
  ↓
Gallery
```

Never silently replace the source raster when the operation represents a distinct output.

## 7. Technical Validation

At minimum validate:
- SVG parseability;
- artboard/dimensions;
- path count/statistics;
- color information;
- background behavior;
- output file integrity.

## 8. Metadata Relationship

Vectorize does not generate stock metadata. Once the SVG is saved as an asset, it can be selected from Gallery and sent to Metadata Workspace for AI metadata generation.

Because vectorization changes the asset representation, Metadata should analyze the resulting asset itself rather than blindly copying source metadata.

## 9. Completion Criteria

- trace settings are applied;
- preview reflects actual output;
- retrace works where applicable;
- SVG is validated;
- output persists as a new asset;
- lineage points to the source;
- Gallery receives the result.
