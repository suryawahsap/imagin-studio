/**
 * Converts a `/storage/...` asset URL into a full `imagin://storage/...` URL
 * so the Electron protocol handler serves it in both dev (Vite) and
 * production (`imagin://app/`) modes. Plain `/storage/...` paths resolve to
 * the Vite dev server in dev mode, which does not serve the storage folder.
 */
export function assetUrl(path: string): string {
  if (path.startsWith("/storage/")) {
    return `imagin://storage${path.slice("/storage".length)}`;
  }
  return path;
}
