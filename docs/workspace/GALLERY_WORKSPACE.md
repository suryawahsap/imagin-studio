# IMAGIN Studio — Gallery Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan Gallery sebagai centralized asset management hub, termasuk view modes, selection, inspector, routing, dan bulk workflow.

## 1. Tujuan Workspace

Gallery adalah pusat pengelolaan seluruh asset. Gallery bukan pemilik business logic Studio, Metadata, Upscale, Vectorize, atau Remotion.

Gallery bertanggung jawab atas:
- search;
- filter;
- grouping;
- selection;
- preview;
- view mode;
- bulk actions;
- lineage inspection;
- routing ke workspace tujuan.

## 2. Product Flow

```text
Asset created/imported
  ↓
Gallery
  ↓
Search / Filter / Select
  ↓
Inspect
  ↓
Choose action
  ├── Metadata
  ├── Upscale
  ├── Vectorize
  ├── Remotion
  ├── Revision / allowed production actions
  └── Export / Download
```

## 3. Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                     │
├────────────────────────────────────────────────────────────────────┤
│ Search | View | Filters | Sort | Bulk Actions                     │
├──────────────────────────────────────────────┬─────────────────────┤
│                                              │                     │
│ Asset Grid / List / Masonry                  │ Inspector           │
│                                              │                     │
│ thumbnails                                   │ Preview             │
│ status                                       │ Metadata             │
│ type                                         │ QA                   │
│ dimensions                                   │ Lineage              │
│                                              │ Quick Actions        │
├──────────────────────────────────────────────┴─────────────────────┤
│ Pagination / selection summary                                    │
├────────────────────────────────────────────────────────────────────┤
│ Task Center                                                        │
└────────────────────────────────────────────────────────────────────┘
```

## 4. View Modes

Final recommended modes:

```text
Grid 5×5  ← default
Grid 4×4
Grid 3×3
List
Masonry
```

### Grid 5×5
Default for high-volume production and browsing.

### Grid 4×4
Balanced browsing and information density.

### Grid 3×3
Inspection-oriented mode with larger thumbnails.

### List
Management-oriented mode for dense metadata and status information.

### Masonry
Visual inspection for mixed aspect ratios.

View preference should persist as a user preference.

## 5. Contextual Inspector

Inspector behavior depends on selection.

### No selection
Show:
- gallery context;
- filters;
- collection information.

### One asset
Show:
- preview;
- file information;
- metadata summary;
- QA summary;
- lineage;
- quick actions.

### Multiple assets
Show:
- selection count;
- bulk actions;
- metadata actions;
- export actions;
- batch routing.

## 6. Metadata Entry Flow

This is the primary metadata entry path:

```text
Select asset(s)
  ↓
Create Metadata
  ↓
Metadata Workspace
```

Gallery does not generate metadata itself. It only initiates routing and preserves selected asset context.

## 7. Routing Rules

### Send to Metadata
Preserve:
- asset IDs;
- selection order when relevant;
- current filters/view context where useful;
- asset lineage references.

### Send to Upscale
Preserve selected asset IDs and configuration context needed by Upscale.

### Send to Vectorize
Preserve selected source asset IDs.

### Send to Remotion
Preserve selected assets for composition.

## 8. Asset Lineage

Gallery must make parent/child relationships inspectable.

```text
Original
  ↓
Studio Generated
  ↓
Upscaled / Vectorized / Remotion Result
  ↓
Metadata Applied
  ↓
Exported
```

Actual relationships must be derived from shared Asset relations/provenance, not from Gallery-specific hidden state.

## 9. Bulk Actions

Potential actions depend on selection:
- Add to collection;
- Create Metadata;
- Send to Upscale;
- Send to Vectorize;
- Send to Remotion;
- Export;
- Download;
- Delete where allowed.

## 10. Gallery + Task Center

The Task Center is shared infrastructure/UI. Gallery may display job summaries but does not own job execution semantics.

## 11. Completion Criteria

- search/filter works;
- all five view modes work;
- selection is stable;
- inspector is contextual;
- routing preserves asset context;
- lineage is visible;
- bulk Metadata entry works;
- transformations return new assets to Gallery when required.
