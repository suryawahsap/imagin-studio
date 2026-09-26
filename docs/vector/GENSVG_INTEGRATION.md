# IMAGIN Studio — GenSVG Integration Specification

**Status:** Architecture / Integration Contract
**Purpose:** Menetapkan integrasi GenSVG sebagai Native SVG Generation Engine di IMAGIN Studio Local tanpa menggantikan VTracer dan tanpa membuat pipeline produksi kedua.

## 1. Decision

IMAGIN Studio akan memiliki dua jalur pembuatan vector:

```text
TRACE RASTER
PNG/JPG → VTracer → SVG

GENERATE NATIVE VECTOR
Prompt/ProductionPlan → GenSVG → SVG
```

VTracer tetap menjadi engine Raster → Vector. GenSVG menjadi engine AI Native SVG Generation.

GenSVG yang dimaksud adalah repository `pq-dong/GenSvg`, sebuah aplikasi TypeScript yang menggunakan schema/catalog berbasiskan Zod, menghasilkan JSON Patch/JSONL yang kemudian dirender menjadi SVG. Repository tersebut mendukung Gemini sebagai provider default dan juga provider OpenAI-compatible melalui Vercel AI SDK. citeturn623628search0

## 2. Architectural Position

GenSVG tidak boleh dipanggil langsung dari React renderer.

```text
React UI
  ↓
Application Command
  ↓
VectorGenerationEngine
  ↓
GenSvgAdapter
  ↓
AI Provider / 9Router boundary
  ↓
GenSVG generation
  ↓
SVG Candidate
  ↓
SVG Normalizer
  ↓
Vector QA
  ↓
Asset Persistence
  ↓
Gallery
```

Boundary rules:

- UI hanya mengirim command dan membaca state.
- Application mengorkestrasi use case.
- Domain mendefinisikan contract, validation, plan, QA policy dan lineage.
- Infrastructure menangani provider/network/process/file execution.
- Electron menjadi OS boundary.
- GenSVG implementation detail tidak boleh bocor ke shared asset model.

## 3. Why GenSVG Fits IMAGIN

GenSVG tidak meminta model menghasilkan raw SVG string secara bebas. Sistemnya memaksa AI menghasilkan sequence JSON Patch yang harus mengikuti Catalog/Zod schema; renderer kemudian mengubah specification tersebut menjadi SVG. Architecture resminya terdiri dari Schema, Catalog, Streaming, dan Renderer layers. citeturn623628search0

Karakter ini cocok dengan kebutuhan IMAGIN karena memungkinkan guardrail struktural sebelum asset disimpan.

## 4. Canonical Production Integration

Native SVG generation tetap mengikuti pipeline standar IMAGIN:

```text
ProductionRequest
    ↓
ProductionPlan
    ↓
Canonical Production Pipeline
    ↓
semantic intent
    ↓
DNA / composition / differentiation
    ↓
Vector Generation Strategy
    ↓
GenSVG Adapter
    ↓
SVG Candidate
    ↓
SVG structural normalization
    ↓
technical / visual QA
    ↓
compliance / preflight
    ↓
ProductionResult
    ↓
ProductionTrace
    ↓
Asset persistence
    ↓
Gallery
```

Tidak boleh ada `runGenSvgPipeline()` yang melewati canonical production pipeline.

## 5. Domain Contract

Recommended domain contract:

```ts
export type VectorCreationMode =
  | "generate-native"
  | "trace-raster";

export interface VectorGenerationRequest {
  productionId: string;
  assetId?: string;
  mode: "generate-native";
  prompt: string;
  style?: string;
  composition?: string;
  colorMode?: string;
  background?: "transparent" | "white" | "custom";
  complexity?: "simple" | "medium" | "detailed";
  output: {
    format: "svg";
  };
}

export interface VectorGenerationResult {
  svg: string;
  spec: unknown;
  provider: "gensvg";
  model?: string;
  stats: {
    elementCount: number;
    pathCount: number;
    textCount: number;
    imageCount: number;
  };
  trace: {
    requestId: string;
    productionId: string;
    attemptId: string;
  };
}
```

`spec` tetap dianggap provider-specific evidence. Asset canonical output tetap SVG, bukan GenSVG JSON.

## 6. Adapter Contract

```ts
export interface VectorGenerationEngine {
  generate(
    request: VectorGenerationRequest,
    context: VectorGenerationContext
  ): Promise<VectorGenerationResult>;
}
```

Implementation:

```text
modules/vectorize/
├── domain/
│   ├── vector-creation.ts
│   ├── vector-generation.ts
│   ├── svg-validation.ts
│   ├── svg-normalization.ts
│   └── vector-qa.ts
├── application/
│   ├── generate-native-vector.ts
│   └── trace-raster.ts
├── infrastructure/
│   └── gensvg/
│       ├── GenSvgAdapter.ts
│       ├── GenSvgClient.ts
│       └── GenSvgMapper.ts
├── state/
└── ui/
```

The exact file names may vary, but ownership must remain equivalent.

## 7. GenSVG Catalog Policy

The supplied GenSVG project defines elements through a Catalog and Zod props schema. Its default examples include Rect, Circle, Ellipse, Line, Path, Polyline, Polygon, Text, Group and definition/filter-related elements. citeturn623628search0

IMAGIN must not blindly adopt a broad catalog for stock production. Create an IMAGIN-specific production catalog/profile.

### Production catalog principles

1. Prefer deterministic primitives and paths.
2. Minimize unsupported or difficult-to-export constructs.
3. Avoid external URLs and embedded raster assets unless explicitly permitted.
4. Make text optional and subject to policy because fonts/text objects complicate stock delivery.
5. Allow gradients only when they survive the downstream QA/export path.
6. Keep IDs deterministic and collision-safe.
7. Keep the generated document self-contained.

Suggested production profiles:

```text
MICROSTOCK_FLAT
MICROSTOCK_ICON
MICROSTOCK_ILLUSTRATION
MICROSTOCK_PATTERN
EDITORIAL_DIAGRAM
```

Catalog availability must be profile-specific rather than globally permissive.

## 8. Provider and 9Router Boundary

GenSVG currently documents Gemini as its default AI provider and supports an OpenAI-compatible provider through the Vercel AI SDK. citeturn623628search0

For IMAGIN, the renderer must not own provider credentials. The provider boundary belongs to infrastructure.

Preferred architecture:

```text
GenSvgAdapter
    ↓
AiGateway contract
    ↓
9Router adapter / configured AI endpoint
```

The final transport implementation must follow the actual 9Router contract already approved by IMAGIN documentation. No new provider architecture may be invented merely to make the GenSVG sample run.

## 9. Streaming

GenSVG supports incremental streaming and parses JSON Patch operations during generation. citeturn623628search0

IMAGIN may expose streaming progress in the Vectorize workspace, but the persisted asset must only be committed after the candidate passes final validation.

```text
queued
→ preparing
→ generating
→ assembling
→ validating
→ QA
→ finalizing
→ completed
```

A partial stream is never a valid Gallery asset.

## 10. JSON Patch Safety

GenSVG relies on JSON Patch (RFC 6902) for incremental updates. citeturn623628search0

IMAGIN must validate every patch before applying it to the in-memory specification.

Required protections:

- schema validation;
- path validation;
- allowed operation validation;
- element/catalog validation;
- numeric bounds;
- string length bounds;
- recursion/depth bounds;
- element-count limits;
- timeout/cancellation;
- malformed patch recovery;
- final full-spec validation.

Do not execute arbitrary code emitted by the model.

## 11. SVG Normalization

After GenSVG rendering, IMAGIN owns normalization.

```text
SVG Candidate
  ↓
XML/SVG parse
  ↓
namespace validation
  ↓
viewBox normalization
  ↓
ID normalization
  ↓
style normalization
  ↓
remove prohibited/external references
  ↓
optional path consolidation
  ↓
canonical serialization
```

Normalization must be deterministic and idempotent:

```text
normalize(normalize(svg)) === normalize(svg)
```

## 12. SVG Structural QA

Minimum checks:

- valid XML;
- valid SVG root;
- expected namespace;
- valid viewBox/artboard;
- no unresolved href/image dependency;
- no external stylesheet dependency;
- no script;
- no unsupported animation;
- no broken references;
- valid numeric attributes;
- finite coordinates;
- acceptable element count;
- no pathological path complexity;
- no accidental empty document;
- no hidden oversized object outside artboard;
- no unintended text when text policy disallows it.

## 13. Visual QA

Structural validity does not imply visual validity.

Every accepted native SVG must have a rendered preview and pass visual QA for:

- visual completeness;
- clipping;
- overflow;
- accidental invisible objects;
- broken gradients;
- incorrect layering;
- background correctness;
- artboard framing;
- composition;
- obvious rendering artifacts.

## 14. Microstock Readiness Gate

GenSVG output is **candidate artwork**, not automatically stock-ready artwork.

Acceptance:

```text
GenSVG
→ structural validation
→ normalization
→ render QA
→ technical QA
→ microstock policy QA
→ accepted asset
```

A failed QA result must not be persisted as a normal completed stock asset.

## 15. Lineage

Native SVG generation creates a new asset.

```text
Production Request
      ↓
Native SVG Asset
      ↓
Gallery
```

For later transformations:

```text
Native SVG
   ↓
Upscaled preview / derivative
```

or

```text
Native SVG
   ↓
EPS derivative
```

The original SVG remains intact.

## 16. EPS Policy

SVG is the canonical master for this vector-generation path.

```text
SVG master
 ├── SVG delivery
 ├── PNG preview
 └── EPS derivative/export
```

EPS conversion is downstream and must never overwrite the SVG master.

## 17. Error Mapping

Map provider/runtime errors to the shared Job error contract.

```text
401 → authentication_error
403 → authorization_error
429 → rate_limited
408 → timeout
abort → aborted
invalid model output → invalid_response
invalid JSON/patch → invalid_json
schema mismatch → validation_error
safety block → safety_block
network → network_error
provider failure → provider_error
```

Retries must be bounded and idempotent.

## 18. Retry / Recovery

Rules:

```text
retry != duplicate
resume != regenerate
repeat click != second job
```

A retry receives a new attemptId under the same logical job/production when appropriate.

A failed generation must preserve diagnostics in ProductionTrace.

## 19. Revision / Refinement

GenSVG should also support future targeted refinement through JSON Patch rather than always regenerating from scratch. This aligns with the repository roadmap, which proposes targeted patches against an existing SVG state and autonomous correction loops. citeturn623628search0

IMAGIN implementation should initially expose only safe, bounded refinement commands:

```text
change color
change size
change position
remove element
add element
simplify element
```

Do not expose arbitrary patch execution directly to end users without validation.

## 20. UI Contract

Vectorize workspace retains its existing trace flow and controls. Native generation is added as a creation mode rather than a replacement.

```text
Mode
[ Trace Raster ] [ Generate Native Vector ]
```

Generate Native Vector controls should include, at minimum:

- prompt/content;
- style/profile;
- composition;
- color mode/palette;
- background;
- complexity;
- Generate;
- Cancel;
- Regenerate;
- Save to Gallery.

The existing workspace contract already defines Source, Vector Preview, Inspector and Task Center, including output information, dimensions, colors, paths, SVG stats, lineage, download/editor actions, and trace settings. Native generation must fit that same workspace contract rather than create a separate UI product. fileciteturn42file2

## 21. Current Vectorize Flow After Integration

```text
Gallery / Source Asset
   │
   └─ Raster source → Trace Raster → VTracer → SVG

Studio / Gallery / Vectorize
   │
   └─ Prompt → Generate Native Vector → GenSVG → SVG

Both
   ↓
SVG normalization
   ↓
Structural QA
   ↓
Visual QA
   ↓
Save as new asset
   ↓
Gallery
```

## 22. Tests

Required test layers:

### Unit
- Catalog schema validation
- JSON Patch validation
- SVG normalization
- ID prefixing
- forbidden element rejection
- structural metrics
- deterministic normalization

### Integration
- application → GenSvgAdapter
- gateway/provider response handling
- streaming assembly
- cancellation
- retry
- persistence

### Runtime
- actual generation with configured provider
- rendered SVG preview
- save to Gallery
- reopen asset
- lineage inspection
- derived EPS export if available

### Negative
- malformed JSONL
- invalid patch
- unsupported element
- missing viewBox
- external image URL
- script element
- excessive element count
- pathological path data
- provider timeout
- 429
- safety block

## 23. Acceptance Criteria

GenSVG integration is DONE only when all are true:

```text
[ ] GenSVG adapter exists behind domain/application contract
[ ] no direct provider call in renderer
[ ] canonical production pipeline is preserved
[ ] native and trace modes converge on same asset persistence path
[ ] streamed partial output is never persisted as completed asset
[ ] schema/patch validation works
[ ] SVG normalization works
[ ] structural QA works
[ ] visual QA works
[ ] lineage works
[ ] Gallery persistence works
[ ] retry/cancel/recovery work
[ ] runtime evidence exists
[ ] tests pass
[ ] typecheck/lint/build pass
[ ] relevant docs/parity/mapping/execution log updated
[ ] human approval received
```

## 24. Source Notes

This specification is based on the current IMAGIN architecture/workspace contracts and an up-to-date inspection of `pq-dong/GenSvg`. The GenSVG repository documents JSONL/JSON Patch generation, Zod Catalog guardrails, streaming rendering, React rendering, Gemini as default provider, and OpenAI-compatible provider support. citeturn623628search0
