// Public API — metadata export module
export { handleBulkExport, buildZipEntries } from "./bulkExport";
export type { BulkExportOptions, ZipEntry } from "./bulkExport";
export { handleDownloadSingle } from "./singleExport";
export type { SingleExportOptions } from "./singleExport";
export {
  buildCsvRow, buildCsvRows, buildCsvContent, buildManifest,
  buildJsonSidecar, getCsvMetadataEligibility, resolveReleasesValue,
  assetFileExt, downloadCsvForAssets,
} from "./csv";
export type { CsvRow, DownloadCsvOptions } from "./csv";
export { embedXmpMetadata, buildXmpPacket, xmpEscapeText, embedXmpIntoPngBytes } from "./xmp";