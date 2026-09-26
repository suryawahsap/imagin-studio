# 9Router — AI Gateway IMAGIN (Satu Jalur)

> Dokumen ini diturunkan langsung dari code (bukan rencana). Sumber utama: `imagin-local/electron/ipc.ts`, `imagin-local/electron/services/9router-models.ts`, `imagin-local/electron/services/settings.ts`, `imagin-local/electron/preload.ts`, `imagin-local/src/modules/studio/engines/ai-bridge.ts`, `imagin-local/src/modules/studio/engines/generation.ts`, `imagin-local/electron/services/vec/vec-analyze.ts`.

## 1. Prinsip arsitektur

1. **Semua AI call lewat main process.** Renderer tidak pernah `fetch()` ke provider. Jalur wajib:
   `renderer engines/ai-bridge.ts` → `window.api.studioGenerate` (`electron/preload.ts:85-86` → `src/api/electron.ts:66,191`) → IPC `studio:generate` (`electron/ipc.ts:1343-1363`) → `studioGenerate9Router` / `studioGenerate9RouterText`.
2. **Jalur direct Gemini sudah dihapus.** `ipc.ts:1359-1361` — `endpoint === "image"` → `studioGenerate9Router(payload, cfg.imageModel)`, selain itu → `studioGenerate9RouterText(payload, cfg.textModel)`. Model yang dipakai selalu dari `getStudioConfig()`, bukan `body.model` dari renderer (body.model hanya divalidasi, lalu diabaikan).
3. **API key tidak pernah ke renderer.** Key diambil via `getDecryptedNineRouterKey()` di main. `studio:get-config` hanya mengembalikan `hasNineRouterKey: boolean`. Plaintext `nineRouterApiKey` dilarang tersimpan (lihat §6).

## 2. Peta file

| File | Peran |
|---|---|
| `electron/ipc.ts:70-108` | `DEFAULT_9ROUTER_BASE_URL`, `get9RouterBaseUrl()`, `getStudioConnection()`, `fetch9RouterModels()` (`GET /v1/models`) |
| `electron/ipc.ts:110-136` | `extractQuotaHeaders()` / `formatQuota()` — header LiteLLM `x-litellm-key-*`, `x-ratelimit-*`, `x-litellm-response-cost` |
| `electron/ipc.ts:143-234` | `studioGenerate9Router()` — image generation |
| `electron/ipc.ts:242-321` | `studioGenerate9RouterText()` — text/vision |
| `electron/ipc.ts:365-388` | Konsumen metadata: `provider` untuk `createMetadataEngine` via `studioGenerate9RouterText` (timeout 30s) |
| `electron/ipc.ts:1304-1373` | Handler IPC `studio:get-config`, `studio:save-config`, `studio:generate`, `studio:ping`, `studio:fetch-models` |
| `electron/services/9router-models.ts` (58 baris) | `isValid9RouterModel`, `sanitize/isValid9RouterModelCatalog` (cap 200), `normalize9RouterBaseUrl`, `normalize9RouterImageEndpoint`, `classify9RouterModels` |
| `electron/services/settings.ts:82-92,253-377` | Default config, `getStudioConfig()` (non-secret), `getDecryptedNineRouterKey()`, `setStudioConfig()` (encrypt via `safeStorage`) |
| `electron/preload.ts:82-88` | `studioGetConfig`, `studioSaveConfig`, `studioGenerate`, `studioPing`, `studioFetchModels` via `contextBridge` |
| `src/modules/studio/engines/ai-bridge.ts` | `request()`, `generateText()`, `generateJSON()`, `generateImage()` — baca `candidates[0]` bentuk Gemini |
| `src/modules/studio/engines/generation.ts:14-58` | `generateImageWithFallback()` (retry primary→fallback, `break` di 401/403/429), `callGeminiText()`, `callGeminiForJSON()` |
| `electron/services/vec/vec-analyze.ts:172-247` | `analyzeImageWithGemini()` — vision fire-and-forget untuk hint vtracer, `POST {baseUrl}/v1/chat/completions` langsung (bukan via `studioGenerate9RouterText`), return `null` saat gagal |
| `electron/services/vec/vec-run.ts:67-89` | `analyzeVectorizeUpload(filePath, name, nineRouterKey?)` memanggil `analyzeImageWithGemini` async |
| `scripts/test-9router-models.ts` | Test `assert/strict` untuk semua helper di `9router-models.ts` (`npm run check` menjalankannya) |

## 3. Konfigurasi & default

`electron/services/settings.ts:82-92` + `electron/ipc.ts:70-71`:

```ts
textModel: "ag/gemini-2.5-flash"
imageModel: "ag/gemini-3.1-flash-image"
nineRouterBaseUrl: "https://9router.rahmatur.dev"
nineRouterImageEndpoint: "https://9router.rahmatur.dev/v1/images/generations"
provider: "9router"
```

Normalisasi URL (`9router-models.ts:13-40`):

- `normalize9RouterBaseUrl`: harus `http(s)`, tanpa userinfo, strip `search`/`hash`/`trailing slash`, strip suffix `/v1` atau `/v1/models`. Return `null` jika invalid → caller fallback ke default atau reject (`studio:save-config` reject `invalid config patch`).
- `normalize9RouterImageEndpoint`: harus `http(s)`, tanpa userinfo, pathname wajib berakhir `/v1/images/generations`. Selain itu → `null`.

Validasi model: string non-empty ≤256 char, tanpa leading/trailing whitespace. Katalog: dedup + sort + cap 200 (`sanitize9RouterModelCatalog`). `studio:save-config` (`ipc.ts:1310-1341`) memvalidasi semua field + `boundedStrings` (key ≤8000, model/URL dibatasi) dan men-sanitize katalog sebelum `setStudioConfig()`.

## 4. Endpoint 1 — `GET {baseUrl}/v1/models`

Fungsi: `fetch9RouterModels()` (`ipc.ts:90-108`). Dipakai oleh `studio:ping` (ukur `latencyMs`) dan `studio:fetch-models`.

```ts
// getStudioConnection(): baseUrl dari config, key = input.apiKey?.trim() || getDecryptedNineRouterKey()
GET {baseUrl}/v1/models
Authorization: Bearer <key>
signal: AbortSignal.timeout(15000)
→ { success: true, ...classify9RouterModels(json.data) }
```

Error: `Invalid 9Router connection settings` | `9Router API key required` | `9Router returned HTTP {status}` | `9Router returned an invalid models response` (jika `json.data` bukan array) | `Unable to connect to 9Router` (catch).

Klasifikasi (`classify9RouterModels`, `9router-models.ts:42-58`): heuristik regex pada `id` + `JSON.stringify(model)` — `image|imagen|flux|dall-e|recraft|stable-diffusion`, `image_generation|generate_images|text_to_image`, `output_modalities: image`, dsb. Selain itu → text. Hasil di-sort + cap 200 per kategori (test cap 250→200 ada di `scripts/test-9router-models.ts:37-44`).

## 5. Endpoint 2 — Image `POST {imageEndpoint}`

Fungsi: `studioGenerate9Router(payload, imageModel?, timeoutMs?)` (`ipc.ts:143-234`).

Request (dibangun di main, prompt diekstrak via `extractPromptText` — gabung `contents[0].parts[].text`, buang part `Negative:...`):

```json
POST https://9router.rahmatur.dev/v1/images/generations
Authorization: Bearer <key>
Content-Type: application/json
{
  "model": "ag/gemini-3.1-flash-image",
  "prompt": "<dari payload Gemini>",
  "n": 1,
  "size": "auto",
  "quality": "auto",
  "background": "auto",
  "image_detail": "high",
  "output_format": "png"
}
```

Respons gateway: `data[0].b64_json` dipakai langsung; jika hanya ada `data[0].url`, main fetch URL → `arrayBuffer` → base64. Keduanya gagal → `9Router: tidak ada b64_json maupun url dalam response`.

Retry: **sekali** khusus `status === 429` — tunggu 12 detik lalu `doRequest()` ulang (`ipc.ts:217-220`, pesan gateway: "retry in ~10s, reset after 16s").

Shape ke renderer (agar `generation.ts` tak perlu diubah — dikonversi ke format Gemini):

```ts
{ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: b64 } }] } }], _provider: "9router" }
```

Error (`{success:false, status?, detail, quota?}`): `9Router API key required` | `Prompt tidak dapat diekstrak` | body error dipotong 800 char (non-OK) / 400 char (`json.error.message`) | `9Router: response bukan JSON valid` | `9Router: data kosong` | `9Router: gagal fetch image URL — …` | `9Router network error`.

Catatan: `timeoutMs` hanya dipakai jika caller mengopernya; `studio:generate` image saat ini memanggil **tanpa** timeout (`ipc.ts:1360`).

## 6. Endpoint 3 — Text/vision `POST {baseUrl}/v1/chat/completions`

Fungsi: `studioGenerate9RouterText(payload, textModel?, timeoutMs?)` (`ipc.ts:242-321`).

Konversi Gemini → OpenAI di main:

- `systemInstruction` (string atau `parts[].text`) → `{ role: "system", content }`.
- `contents[]`: `role === "model"` → `assistant`, selain itu `user`. Tiap `parts[]`: `{text}` → `{type:"text"}`, `{inlineData:{data, mimeType}}` → `{type:"image_url", image_url:{url:"data:<mime>;base64,<data>"}}`. Satu part teks murni dikirim sebagai string (bukan array).
- `generationConfig.temperature` → `temperature`, `generationConfig.maxOutputTokens` → `max_tokens`. `stream: false` selalu.

```json
POST https://9router.rahmatur.dev/v1/chat/completions
Authorization: Bearer <key>
{ "model": "ag/gemini-2.5-flash", "messages": [...], "stream": false }
```

Konversi balik OpenAI → Gemini (renderer membaca `candidates[0].content.parts[0].text`, lihat `ai-bridge.ts:42`):

```ts
// choices[0].message.content: string | [{text}]
{ candidates: [{ content: { parts: [{ text: outText }] } }], _provider: "9router" }
```

Error: sama polanya dengan image + `9Router: konten kosong dalam response` jika `content` kosong.

## 7. Konsumen (selain Studio generate)

### 7.1 Metadata queue (`ipc.ts:365-388`)

`runMetadataJob` memakai `provider` yang memanggil `studioGenerate9RouterText` dengan payload `{ contents:[{role:"user", parts:[{text:prompt},{inlineData:image}]}], generationConfig:{temperature:0.2, maxOutputTokens:1024} }`, model dari `getStudioConfig().textModel`, **timeout 30s**. Gagal → `throw Error(result.detail || "metadata_provider_failed")`, lalu engine membatalkan antar-step via `aborted(signal)`.

### 7.2 Vectorize vision hint (`vec-analyze.ts:172-247`, `vec-run.ts:67-89`, `ipc.ts:638-642`)

`analyzeImageWithGemini(filePath, apiKey, {baseUrl, model, tempId})` — **fetch langsung** ke `{baseUrl}/v1/chat/completions` (default hardcoded `https://9router.rahmatur.dev`, model `ag/gemini-2.5-flash`, `temperature: 0.2`, timeout 15s). Prompt: system `GEMINI_SYSTEM_PROMPT` + user `[text "Analyze this image…", image_url dataURL]`. Fire-and-forget: semua gagal (`no api key` / non-OK / konten kosong / parse gagal / network) hanya `console.warn` + return `null`, pixel analysis tetap dipakai. `vector:upload` mengoper `nineRouterKey = getDecryptedNineRouterKey()` sebagai argumen ketiga.

### 7.3 Renderer fallback chain (`generation.ts:14-36`)

`generateImageWithFallback(primary, fallback, payloads, onApiCall)` — loop `Set([primary, fallback])` × varian payload, via `generateImage()` (ai-bridge). `break` (ganti model) saat `error.status ∈ {401,403,429}`. Text (`callGeminiText`, `callGeminiForJSON`) saat ini **satu model tanpa fallback**.

## 8. Keamanan key

- Simpan: `settings.studio.encryptedNineRouterKey` (base64 dari `safeStorage.encryptString`), file `storage/metadata/settings.json`. `persist()` selalu menghapus field plaintext (`settings.ts:180-186`). Load: migrasi otomatis plaintext → encrypted bila `safeStorage` tersedia; bila tidak tersedia, plaintext **dihapus tanpa fallback** (`settings.ts:128-170`).
- Baca: hanya `getDecryptedNineRouterKey()` di main. Renderer hanya terima `hasNineRouterKey: boolean` (`getStudioConfig():253-274`, `studio:get-config`).
- Tulis: `studio:save-config` menerima `nineRouterApiKey` (≤8000 char); string kosong = hapus key.
- Test cutover: `test/security-cutover.test.{cjs,js}` assert tidak ada `nineRouterApiKey` plaintext di `settings.json`.

## 9. Quota/telemetri

`extractQuotaHeaders()` (`ipc.ts:112-127`) membaca `x-litellm-key-max-budget` / `x-key-max-budget`, `x-litellm-key-spend` / `x-key-spend`, `x-ratelimit-*`, `x-litellm-response-cost` (termasuk varian prefix `llm_provider-`). Setiap hasil generate membawa `quota: {maxBudget, spend, remainingBudget, rateLimitLimit, rateLimitRemaining, lastCost}`; `formatQuota()` memformatnya untuk tampilan Test Koneksi.

## 10. Daftar channel IPC terkait

| Channel | Arah | Handler |
|---|---|---|
| `studio:generate` `{endpoint:"image"\|"text", model, payload, requiresKey?}` | renderer → main | `ipc.ts:1343-1363` (validasi `isRecord`/`validString`, lalu route ke 9Router) |
| `studio:ping` `{apiKey?, baseUrl}` | renderer → main | `ipc.ts:1365-1371` → `fetch9RouterModels`, return `{success, latencyMs, detail?}` |
| `studio:fetch-models` | renderer → main | `ipc.ts:1373` → `fetch9RouterModels` mentah |
| `studio:get-config` | renderer → main | `ipc.ts:1305-1308` → `getStudioConfig()` (non-secret) |
| `studio:save-config` | renderer → main | `ipc.ts:1310-1341` validasi + sanitize → `setStudioConfig()` |

## 11. Test & cara verifikasi

```bash
npx tsx scripts/test-9router-models.ts  # atau: npm run check (lint+test+script ini)
```

Test meng-cover: strip `/`, `/v1`, `/v1/models` pada base URL; reject `ftp://` dan URL ber-userinfo; image endpoint wajib `/v1/images/generations`; dedup/sort/cap katalog; klasifikasi text vs image (`flux-pro`, `dall-e-3`, `image_generation:true`, `output_modalities:[image]` → image). Untuk E2E live gateway: isi key di Settings Studio → Test Koneksi (`studio:ping`) → `studio:fetch-models` harus return katalog terbagi text/image.
