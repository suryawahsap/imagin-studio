---
name: Studio Lucid
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#0051b1'
  on-tertiary: '#ffffff'
  tertiary-container: '#0f69dc'
  on-tertiary-container: '#edf0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.025em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.03em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-compact: 0.5rem
  margin: 1rem
  margin-dock: 0.5rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system targets digital creators, technical artists, prompt engineers, and multimedia designers executing high-load workflows within a professional desktop environment. The emotional posture is precise, frictionless, hyper-focused, and daylight-lucid—stripping away visual fatigue while offering immediate mechanical clarity.

The visual direction marries **Modern High-Productivity Technical Minimalism** with **Refined Glass Surface Layering**. It rejects decorative ornamentation in favor of information density, micro-contrast structural boundaries, and surgical utility. The canvas stays calm through cool-slate neutral foundations, allowing synthetic content, generative viewports, and primary action targets to command full cognitive attention.

## Colors

The palette establishes an ultra-clean workspace with clear visual delineation between static toolbars, dynamic inspect panels, and active generative viewports:

- **Surfaces & Canvases:**
  - Base canvas: `#f8fafc` (Slate 50)
  - Secondary workspace / Viewport surrounding: `#f1f5f9` (Slate 100)
  - Card & floating panel surfaces: `#ffffff` (Pure White)
  - Structural separators and inner panel dividers: `#e2e8f0` (Slate 200)
  - Active input borders and high-emphasis boundaries: `#cbd5e1` (Slate 300)

- **Typography & Content:**
  - Primary text and critical metrics: `#0f172a` (Slate 900)
  - Secondary descriptions, inactive tabs, and field labels: `#334155` (Slate 700)
  - Tertiary metadata, hotkeys, and placeholder text: `#64748b` (Slate 500)

- **Accents & Signals:**
  - Primary interactive states, primary action buttons, keyframe markers: `#2563eb` (Royal Blue)
  - AI generation states, active inference indicators, dynamic range highlights: `#0ea5e9` (Electric Cyan)
  - Secondary selections, hover washes, interactive focus rings: `#3b82f6` (Vivid Blue)
  - Success, warning, and destructive intents align to `#059669` (Emerald 600), `#d97706` (Amber 600), and `#dc2626` (Red 600).

## Typography

The typography couples the razor-sharp geometric neutrality of **Geist** for system interfaces with the mechanical legibility of **JetBrains Mono** for parametric controls, coordinate inputs, prompt tokens, and metadata displays.

- **Desktop Density Adjustments:** Desktop views prioritize compact `body-md` (13px) and `body-sm` (12px) scales to sustain high information density across multi-column configurations.
- **Parametric Labels:** All numeric values, aspect ratios, seed numbers, and hotkey combinations must be set strictly in `label-md` or `label-sm` using tabular figures (`tnum`).
- **Prompt & Script Input:** Model configuration fields, raw prompt overrides, and token visualizers render in `code-md`.

## Layout & Spacing

The architecture operates on an ultra-compact 4px/8px layout cadence optimized for multi-pane desktop productivity applications:

- **Desktop Workbench Topology:**
  - Fixed horizontal top bar: Global tools, window chrome controls, project status.
  - Three-pane layout: Collapsible left asset/layer navigation dock (260px–340px), center fluid canvas/viewport area, and right collapsible parameter/generation dock (320px–420px).
  - Guttering between workspace dock panels: `gutter-compact` (8px). Window canvas margins: `margin-dock` (8px).
- **Responsive Handling:**
  - **Large Desktop Displays (>1440px):** Simultaneous open panels for Asset Pipeline, Node Graph / Canvas, and Inspector.
  - **Standard Laptops (1024px–1440px):** Sidebar drawers transition to overlay or single-panel tabbed accordions. Gutters scale down to 8px.
  - **Mobile / Remote Companion (<1024px):** Single active panel with a bottom drawer sheet for inspector controls. Outer margin collapses to 12px.

## Elevation & Depth

Depth is defined through a hybrid of crisp micro-borders and soft ambient shadows to keep layered panels legible without muddiness:

- **Tier 0 (Base Canvas):** `#f8fafc`. Flat, non-elevated.
- **Tier 1 (Structural Toolbars & Docks):** `#ffffff` with a solid 1px border (`#e2e8f0`). No drop shadow; spatial division is maintained purely by stroke boundaries.
- **Tier 2 (Floating Inspect Panels & Model Parameter Cards):** `#ffffff` with a 1px border in `#e2e8f0` and an ambient multi-stop shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 16px -4px rgba(15, 23, 42, 0.06)`.
- **Tier 3 (Floating HUD Overlays & Model Inference Windows):** Semi-translucent frosted glass: `rgba(255, 255, 255, 0.82)`, `backdrop-filter: blur(16px)`, surrounded by `1px solid rgba(226, 232, 240, 0.8)`, cast with `0 12px 28px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)`.
- **Tier 4 (Context Menus, Flyouts & Modals):** Pure white `#ffffff`, `1px solid #cbd5e1`, elevated with `0 20px 35px -8px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)`.

## Shapes

The design system employs a focused, compact border radius (`roundedness: 1`):

- **Micro Controls (Buttons, Inputs, Selectors, Tabs):** `0.25rem` (4px). Provides tight alignment for high-density parametric panels.
- **Containers, Docks & Cards:** `0.5rem` (8px). Softens the geometry while preserving strict linear alignment across multi-column grids.
- **Dialogs, Overlays & Prompts:** `0.75rem` (12px). Applied exclusively to floating window modals and global command palettes.
- **Status Tags & Pill Badges:** Full circular round (`9999px`) to immediately distinguish informative status flags from clickable rectangular triggers.

## Components

### Buttons
- **Primary Action (Run Model / Export):** Background `#2563eb`, text `#ffffff`, border `1px solid transparent`. Hover state shifts to `#1d4ed8`; active state to `#1e40af`. Inner focus ring: 2px offset with `#0ea5e9`.
- **Secondary (Tool Action / Add Layer):** Background `#ffffff`, text `#0f172a`, border `1px solid #cbd5e1`. Hover state: `#f8fafc` with border `#94a3b8`.
- **Ghost (Canvas Pan / Toolbar Icons):** Background transparent, text `#334155`. Hover state: `#f1f5f9` with text `#0f172a`.
- **Destructive:** Background `#ffffff`, text `#dc2626`, border `1px solid #fca5a5`. Hover state: `#fef2f2`.

### Text Inputs & Parameter Fields
- Standard height: 28px (compact) and 34px (default).
- Base: Background `#ffffff`, text `#0f172a`, border `1px solid #cbd5e1`, corner radius `4px`.
- Active/Focused: Border `#2563eb`, outline `2px solid rgba(37, 99, 235, 0.15)`.
- Numeric Steppers: Tabular mono font, accompanied by miniature vertical increment/decrement icon toggles flush to the right boundary.

### Prompt Boxes & Generation Bars
- Large multi-line card container: Background `#ffffff`, border `1px solid #cbd5e1`, rounded `8px`.
- Dynamic Inference Ring: When AI processing is active, the outer border transitions to a glowing gradient of `#2563eb` and `#0ea5e9`.

### Chips & Parameter Tags
- Metadata tags (Dimensions, Seed, CFG scale): Height 20px, background `#f1f5f9`, border `1px solid #e2e8f0`, text `#334155`, font `JetBrains Mono` at 10px.
- Active Filter Chips: Background `rgba(37, 99, 235, 0.08)`, border `1px solid #3b82f6`, text `#2563eb`.

### Sliders (Dynamic Weights & Settings)
- Track: Height 4px, background `#e2e8f0`, corner radius 2px. Filled segment: `#2563eb`.
- Thumb: 14px circle, background `#ffffff`, border `2px solid #2563eb`, drop-shadow `0 1px 3px rgba(15, 23, 42, 0.15)`.

### Checkboxes & Radios
- Size: 14px × 14px.
- Default: Border `1px solid #cbd5e1`, background `#ffffff`.
- Selected: Background `#2563eb`, border `#2563eb`, inner indicator white.

### Canvas Viewport & Asset Cards
- Asset preview container: Background `#f1f5f9`, border `1px solid #e2e8f0`, rounded `8px`, overflow hidden.
- Hover overlay: Dark translucent badge displays resolution, format, and inference runtime using `label-sm` in pure white over `rgba(15, 23, 42, 0.7)`.