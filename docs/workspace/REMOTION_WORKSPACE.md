# IMAGIN Studio — Remotion Workspace Specification

**Status:** Product/UI/Flow Contract
**Purpose:** Menetapkan layout, flow, controls, render lifecycle, dan output semantics untuk video creation.

## 1. Tujuan Workspace

Remotion mengubah selected assets/media menjadi video melalui template, timeline, settings, render, dan output validation.

## 2. Product Flow

```text
Gallery / Assets
  ↓
Open Remotion
  ↓
Select source assets
  ↓
Choose template
  ↓
Configure duration / resolution / composition
  ↓
Preview timeline
  ↓
Generate / Render Video
  ↓
Progress / Task Center
  ↓
Validate rendered file
  ↓
Save video asset
  ↓
Gallery
```

## 3. Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Navigation                                                     │
├───────────────┬───────────────────────────────┬────────────────────┤
│ Source /      │ Video Preview + Timeline      │ Inspector          │
│ Template      │                               │                    │
│               │ player                        │ template            │
│ Assets        │ transport controls            │ duration            │
│ Template      │ timeline                      │ resolution          │
│ Duration      │ clips                        │ format              │
│ Resolution    │ audio/visual tracks          │ file info            │
│ Generate      │                               │ lineage             │
└───────────────┴───────────────────────────────┴────────────────────┘
│ Task Center                                                        │
└────────────────────────────────────────────────────────────────────┘
```

## 4. Controls

- selected source assets;
- template;
- duration;
- resolution;
- output format;
- timeline/clip arrangement;
- preview controls.

## 5. Render Flow

```text
Create Remotion Job
  ↓
Prepare assets
  ↓
Resolve template/config
  ↓
Compose
  ↓
Render through approved infrastructure
  ↓
Progress events
  ↓
Validate output
  ↓
Persist video asset
  ↓
Gallery
```

## 6. Output Semantics

The rendered video is a distinct asset linked to its source assets.

```text
Input Assets
   ↓
Remotion Job
   ↓
Video Asset
   ↓
Gallery
```

## 7. Failure / Recovery

Task Center must expose:
- queued;
- preparing;
- rendering;
- finalizing;
- completed;
- failed;
- cancelled;
- recovered.

The UI must not claim completion before the output file is verified and persisted.

## 8. Metadata Relationship

Remotion does not own stock metadata generation. The resulting video returns to Gallery, after which Metadata can analyze the resulting video asset and generate appropriate metadata.

Metadata behavior for video must use the actual final media content as the primary truth rather than blindly inheriting image metadata from source assets.

## 9. Completion Criteria

- real render path;
- actual file output;
- visible progress;
- cancellation where supported;
- recovery/reconciliation;
- validated persisted video asset;
- source lineage preserved.
