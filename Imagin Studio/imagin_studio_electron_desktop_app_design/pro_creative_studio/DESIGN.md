---
name: Pro Creative Studio
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a30'
  surface-container-highest: '#33343b'
  on-surface: '#e2e2eb'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e2e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#8083ff'
  on-tertiary-container: '#0d0096'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#111319'
  on-background: '#e2e2eb'
  surface-variant: '#33343b'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.04em
  code-value:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-base: 0.75rem
  space-lg: 1rem
  space-xl: 1.25rem
  space-2xl: 1.5rem
  space-3xl: 2rem
  toolbar-height: 2.75rem
  statusbar-height: 1.875rem
  panel-left-width: 22rem
  panel-right-width: 24rem
  drawer-collapsed-width: 3.5rem
---

## Brand & Style

The design system powers high-throughput AI generation, vectorization, upscaling, motion compositing, and stock-ready asset production. The target audience comprises technical creatives, digital artists, stock contributors, and visual engineers who expect immediate feedback, precision control, and deep hardware telemetry.

The visual style is **Pro-Grade Dark Technical / Cyber-Editorial**:
- **Tone:** Methodical, surgical, authoritative, and frictionless.
- **Palette Foundation:** Cold, deeply saturated obsidian, slate, and zinc foundations designed to eliminate eye fatigue during extended darkroom sessions and maintain true color fidelity across visual viewports.
- **Visual Weight:** Ultra-crisp 1px boundary delineations, monolithic toolbars, tabular alignment, and tight information density inspired by native creative suites (DaVinci Resolve, Blender, Unreal Engine, and Figma desktop).
- **Affordances:** Explicit state telemetry (active renders, queue meters, GPU/VRAM loads, compliance audits) using electric cyan, cobalt, and indigo accents.

## Colors

The system uses a tiered dark-space color model where surfaces step up subtly from backplate canvas to elevated floating panels.

### Surface Tiers
- **Void Surface (`#07090e`):** Underlay canvas, image letterboxes, and canvas backing.
- **Base Chrome (`#0c0e14`):** Primary window shell, window title bar, and application background.
- **Panel Surface (`#12151f`):** Collapsible workflow panels, inspectors, side drawers, and secondary toolbars.
- **Elevated Canvas (`#181c2b`):** Input containers, nested cards, segmented controls, and thumbnail tiles.
- **Surface Hover (`#1f2438`):** Hovered interaction targets and table row highlights.

### Borders & Dividers
- **Structural Border (`#1e2333`):** Default panel splitters, window chrome borders, card dividers.
- **Subtle Border (`#151926`):** Secondary nested controls and table row lines.
- **Focus / Active Border (`#3b82f6`):** Active step indicators, active canvas focus, focused inputs.

### Brand & Engine Accents
- **Primary Cobalt (`#3b82f6`):** Primary action triggers, selected navigation tabs, primary tags.
- **Cyan Neon (`#06b6d4`):** Telemetry metrics, vector paths, active upscaling meters, real-time cache flags.
- **Indigo Pulse (`#6366f1`):** Machine learning models, secondary process badges, synthesis lineage points.

### Semantic Telemetry
- **Success / Validated (`#10b981`):** Generation complete, platform compliance checks passed, valid metadata.
- **Warning / Review (`#f59e0b`):** Needs review, low token count, platform warnings.
- **Error / Terminated (`#ef4444`):** Generation failed, pipeline timeout, invalid file schema.
- **Text Primary (`#f1f5f9`):** High-contrast headers, active labels, primary telemetry readouts.
- **Text Secondary (`#94a3b8`):** Field labels, unselected tabs, secondary specs.
- **Text Muted (`#4b5563`):** Inactive icons, line guides, unit tags, inactive keyboard shortcuts.

## Typography

Typography balances rapid scanning and surgical precision.
- **UI & Interface Font:** `Geist` delivers neutral, proportional clarity across dense dashboards, nested menus, and multi-column forms.
- **Data & Telemetry Font:** `JetBrains Mono` handles all numerical readouts, timestamps, coordinates, seed values, paths, resolutions, and system stats (GPU/VRAM) to guarantee rock-solid tabular alignment without layout shifts.
- **Uppercase Usage:** Metadata headers, status badges, workflow stage numbers, and pipeline counters use uppercase labels with open tracking (`letterSpacing: 0.03em - 0.06em`).

## Layout & Spacing

The layout is built for native desktop workspaces with strict pixel boundaries and zero viewport overflow:

### Screen Zoning
1. **Window Header Bar (`toolbar-height: 44px`):** Hosts the window drag region, branding, central workspace navigation tabs (`Studio`, `Upscale`, `Vectorize`, `Remotion`, `Metadata`, `Gallery`), and right-side utility icons (notifications, documentation, settings, account).
2. **Left Workflow Column (`panel-left-width: 352px`):** Fixed-width or collapsible side panel dedicated to input prompts, model configuration, preset cards, and source asset dropzones.
3. **Central Canvas & Staging Arena (Flex 1):** Responsive viewport displaying the primary viewer, interactive split-sliders, A/B vector overlays, or video timeline sequences. Accompanied by sub-bars for quick zoom, view modes, and contextual filmstrips.
4. **Right Inspector Column (`panel-right-width: 384px`):** Tabbed analytical panel housing asset specifications, AI compliance checklists, seed parameters, generation DNA, and batch quick actions.
5. **Persistent Bottom Task Center (`height: auto`, expandable from `32px` to `240px`):** Multi-task background processing queue with progress bars, step statuses, and GPU/RAM telemetry.

### Spacing Rhythm
- Compact internal component gaps adhere to an ultra-dense `4px / 6px / 8px` rhythm.
- Section groupings use `12px` and `16px` padding.
- Panel separators use hairline `1px` structural borders (`#1e2333`) without ambient drop shadows.

## Elevation & Depth

Visual hierarchy is constructed through **Tonal Boundary Layering** and **Subtle Luminous Accents**:

- **Layer 0 (Canvas Base):** Deepest matte background (`#07090e` to `#0c0e14`). Flat, non-reflective.
- **Layer 1 (Panels & Toolbars):** `#12151f` framed with crisp `1px solid #1e2333`.
- **Layer 2 (Control Surfaces & Cards):** `#181c2b` framed with `#252b3e`. Subtle inset top highlight `1px inset rgba(255, 255, 255, 0.04)`.
- **Layer 3 (Modals, Overlays, Dropdowns):** `#161a27` with heavy boundary definition (`1px solid #2e364f`) and diffused dark drop shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.65)`.
- **Active State Glow:** Focused primary action buttons and active timeline splitters emit a localized accent blur (`box-shadow: 0 0 16px -2px rgba(59, 130, 246, 0.35)`).

## Shapes

The interface embraces a precise, low-radius engineering feel (`roundedness: 1`):
- **Standard Controls (Buttons, Inputs, Badges, Tabs):** `4px` to `6px` radius (`0.25rem` to `0.375rem`).
- **Cards & Outer Container Windows:** `6px` to `8px` radius (`0.375rem` to `0.5rem`).
- **Interactive Toggles & Status Pills:** Full circular pill (`9999px`) reserved strictly for on/off switches and compact stage indicators.
- **Viewer Glass Badges:** `4px` border radius with matte semi-transparency.

## Components

### Buttons
- **Primary:** Background `linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)`, text `#ffffff`, border `1px solid #60a5fa`, radius `6px`, text `label-md` uppercase. Subtle inner top border glow. Hover triggers high saturation and `0 0 12px rgba(59, 130, 246, 0.4)`.
- **Secondary / Ghost:** Background `#181c2b`, text `#e2e8f0`, border `1px solid #1e2333`. Hover: background `#1f2438`, border `#3b82f6`.
- **Destructive:** Background `#2a1215`, text `#f87171`, border `1px solid #451a1d`.
- **Icon Actions:** `28px x 28px` square target, border `1px solid #1e2333`, background `#12151f`, muted glyph color `#94a3b8` transitioning to `#f1f5f9` on hover.

### Navigation Workspace Tabs
- Pill-segmented navigation group encapsulated in a unified `#12151f` track with `1px solid #1e2333`.
- Active tab features solid surface `#1e2538`, border `1px solid #3b82f6`, active text `#f8fafc`, and a glowing dot or cyan icon indicator.
- Inactive tabs feature ghost transparency, text `#94a3b8`, shifting to `#cbd5e1` on hover.

### Input Fields & Selectors
- Background `#0c0e14`, border `1px solid #1e2333`, radius `4px`, padding `6px 10px`, font `body-md` / `code-value`.
- Focus state: border `1px solid #3b82f6`, glow `0 0 0 1px #3b82f6`.
- Label placed overhead in `label-xs` uppercase tracking.
- Suffix / Prefix tags (e.g., `px`, `ms`, `UUID`, `v4.2 Engine`) rendered in `#4b5563` monospace.

### Asset Cards & Grid Items
- Container: Background `#12151f`, border `1px solid #1e2333`, radius `6px`, relative overflow hidden.
- Image Preview: Native aspect ratio display with letterbox dark canvas (`#07090e`).
- Top Overlay: Format pill (e.g., `VECTOR`, `IMAGE`, `4K UPSCALED`) in top-left with background `rgba(12, 14, 20, 0.85)` and border `1px solid rgba(255, 255, 255, 0.1)`. Favorite star action top-right.
- Bottom Metadata Shelf: Background `#181c2b`, two-line layout showing filename (`Geist Medium 12px`) and dimensions/size (`JetBrains Mono 11px`). Hover reveals quick send-to-upscale / vectorize overlay icons.

### Telemetry Bars & Checklists
- **Progress Track:** Height `4px` or `6px`, background `#1e2333`, radius `9999px`. Active fill uses vibrant cyan `#06b6d4` or cobalt `#3b82f6`.
- **System Resource Pointers:** Green dot indicator (`#10b981`) for `System Ready`, paired with inline monospace indicators: `GPU: 42%`, `RAM: 68%`, `VRAM: 5.2 GB / 24 GB`.
- **Quality & Platform Compliance:** Checklist layout with check icons (`#10b981`), target counters, character count limits (`58 / 200 chars`), and audit score meters.

### Timeline & Comparison Viewport
- Dual-pane canvas with interactive center slider handle (`#3b82f6` vertical rule with floating circular grip) displaying Before/After telemetry tags.
- Remotion sequence timeline: Horizontal ruler showing frame increments (`00:00`, `00:03`), track lane headers (`Video 1`, `Audio A1`), audio visualizer wave canvas, and active playhead needle in coral-red (`#f43f5e`).