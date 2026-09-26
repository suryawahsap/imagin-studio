import { initLibrary, getLibrary, getStorage } from "../electron/services/library";
import os from "os";
import path from "path";
import fs from "fs";
import assert from "assert";

// Regression guard: import:upload may consume its app-owned copy, never the renderer path.
const ipcSource = fs.readFileSync(path.join(process.cwd(), "electron/ipc.ts"), "utf8");
const importHandler = ipcSource.slice(ipcSource.indexOf('ipcMain.handle("import:upload"'), ipcSource.indexOf('ipcMain.handle("import:confirm")'));
assert(!importHandler.includes("unlinkSync(file.path)"), "import:upload must preserve renderer-supplied originals");
console.log("[regression] import original preservation guard OK");

// Service smoke only: Electron IPC handlers are not invoked by this script.
// Isolasi DB library test — jangan merusak DB production user.
initLibrary(path.join(os.tmpdir(), "imagin-test-ipc-library.json"));
const lib = getLibrary();
const storage = getStorage();
console.log(`[service-smoke] library count = ${lib.length}`);
console.log(`[service-smoke] storage = ${JSON.stringify(storage)}`);

// Test library add/delete via service layer.
const added = (await import("../electron/services/library")).addLibraryAsset({
    id: "lib-ipctest-1",
    type: "IMAGE",
    name: "ipc-test.png",
    url: "/storage/assets/images/ipc-test.png",
    folder: "storage/assets/images",
    sourceModule: "SYSTEM",
    mimeType: "image/png",
    fileSize: "0.01 MB",
    tags: ["test"],
    createdAt: new Date().toISOString(),
});
console.log(`[service-smoke] added asset id=${added.id}`);
const del = (await import("../electron/services/library")).deleteLibraryAsset(added.id);
console.log(`[service-smoke] deleted = ${JSON.stringify(del)}`);

console.log("SERVICE SMOKE OK (IPC handlers not invoked)");
