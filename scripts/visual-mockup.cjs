/**
 * Render mockup design reference (code.html) apa adanya di viewport yang sama
 * dengan aplikasi, lalu screenshot. Dipakai agar perbandingan visual setara
 * (bukan PNG mockup yang sudah diskalakan).
 *
 * Pakai: npx electron scripts/visual-mockup.cjs <code.html> <out.png> [width] [height]
 */
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const [, , htmlPath, outPath, wArg, hArg] = process.argv;
const width = Number(wArg || 1440);
const height = Number(hArg || 900);

app.commandLine.appendSwitch("force-device-scale-factor", "1");

app.whenReady().then(async () => {
  if (!htmlPath || !fs.existsSync(htmlPath)) {
    console.log(`mockup html tidak ada: ${htmlPath}`);
    app.exit(1);
    return;
  }

  const win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: "#07090e",
    webPreferences: { offscreen: false, sandbox: false },
  });

  try {
    await win.loadFile(path.resolve(htmlPath));
    // Beri waktu CDN Tailwind memproses kelas + font web termuat
    await new Promise((r) => setTimeout(r, 6000));
    const image = await win.webContents.capturePage();
    if (image.isEmpty()) {
      console.log("capturePage kosong");
      app.exit(1);
      return;
    }
    fs.writeFileSync(outPath, image.toPNG());
    console.log(`mockup shot: ${outPath} (${image.getSize().width}×${image.getSize().height})`);
    app.exit(0);
  } catch (err) {
    console.log("gagal render mockup:", err.message);
    app.exit(1);
  }
});
