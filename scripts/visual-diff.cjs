/**
 * Bandingkan screenshot aplikasi dengan screenshot mockup design reference.
 * Dijalankan lewat Electron (tanpa dependency tambahan) karena butuh nativeImage
 * untuk decode/resize/encode PNG.
 *
 * Pakai:
 *   npx electron scripts/visual-diff.cjs <app.png> <mockup.png> <out.png>
 *
 * Output: komposit [app | mockup | selisih] + skor kemiripan coarse (0-100)
 * dan skor per zona (kiri / tengah / kanan) supaya mismatch per kolom kelihatan.
 */
const { app, nativeImage } = require("electron");
const fs = require("fs");

const TARGET_HEIGHT = 720;

function buildComposite(appImg, mockImg, diffBuf, diffW, diffH) {
  const gap = 8;
  const width = appImg.getSize().width + mockImg.getSize().width + diffW + gap * 2;
  const height = Math.max(appImg.getSize().height, mockImg.getSize().height, diffH);
  const out = Buffer.alloc(width * height * 4);

  // latar gelap
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 24; out[i + 1] = 20; out[i + 2] = 16; out[i + 3] = 255;
  }

  const blit = (bmp, w, h, dx) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4;
        const d = (y * width + (x + dx)) * 4;
        out[d] = bmp[s]; out[d + 1] = bmp[s + 1]; out[d + 2] = bmp[s + 2]; out[d + 3] = 255;
      }
    }
  };

  blit(appImg.getBitmap(), appImg.getSize().width, appImg.getSize().height, 0);
  const mockX = appImg.getSize().width + gap;
  blit(mockImg.getBitmap(), mockImg.getSize().width, mockImg.getSize().height, mockX);
  blit(diffBuf, diffW, diffH, mockX + mockImg.getSize().width + gap);

  return nativeImage.createFromBitmap(out, { width, height });
}

app.whenReady().then(() => {
  const [, , appPath, mockPath, outPath] = process.argv;
  if (!appPath || !mockPath) {
    console.log("pakai: npx electron scripts/visual-diff.cjs <app.png> <mockup.png> <out.png>");
    app.exit(1);
    return;
  }

  const appRaw = nativeImage.createFromPath(appPath);
  const mockRaw = nativeImage.createFromPath(mockPath);
  if (appRaw.isEmpty() || mockRaw.isEmpty()) {
    console.log(`GAGAL baca gambar (app=${appRaw.isEmpty() ? "kosong" : "ok"}, mockup=${mockRaw.isEmpty() ? "kosong" : "ok"})`);
    app.exit(1);
    return;
  }

  const appImg = appRaw.resize({ height: TARGET_HEIGHT });
  const mockImg = mockRaw.resize({ height: TARGET_HEIGHT });
  const aSize = appImg.getSize();
  const mSize = mockImg.getSize();
  const aBmp = appImg.getBitmap();
  const mBmp = mockImg.getBitmap();

  const w = Math.min(aSize.width, mSize.width);
  const h = Math.min(aSize.height, mSize.height);
  const diffBuf = Buffer.alloc(w * h * 4);

  const zoneAcc = [
    { sum: 0, n: 0 },
    { sum: 0, n: 0 },
    { sum: 0, n: 0 },
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ia = (y * aSize.width + x) * 4;
      const im = (y * mSize.width + x) * 4;
      const d =
        (Math.abs(aBmp[ia] - mBmp[im]) + Math.abs(aBmp[ia + 1] - mBmp[im + 1]) + Math.abs(aBmp[ia + 2] - mBmp[im + 2])) / 3;
      const o = (y * w + x) * 4;
      diffBuf[o] = d;
      diffBuf[o + 1] = d;
      diffBuf[o + 2] = d;
      diffBuf[o + 3] = 255;
      zoneAcc[Math.min(2, Math.floor((x / w) * 3))].sum += d;
      zoneAcc[Math.min(2, Math.floor((x / w) * 3))].n++;
    }
  }

  const meanOf = (acc) => (acc.n ? acc.sum / acc.n : 0);
  const mean = meanOf({ sum: zoneAcc.reduce((s, z) => s + z.sum, 0), n: zoneAcc.reduce((s, z) => s + z.n, 0) });
  const pct = (m) => (100 - (m / 255) * 100).toFixed(1);

  const composite = buildComposite(appImg, mockImg, diffBuf, w, h);
  const dest = outPath || appPath.replace(/\.png$/, ".compare.png");
  fs.writeFileSync(dest, composite.toPNG());

  console.log(`app    : ${aSize.width}×${aSize.height}`);
  console.log(`mockup : ${mSize.width}×${mSize.height}`);
  console.log(`selisih rata-rata : ${mean.toFixed(1)} / 255`);
  console.log(`kemiripan coarse : ${pct(mean)}%  (kiri ${pct(meanOf(zoneAcc[0]))}% · tengah ${pct(meanOf(zoneAcc[1]))}% · kanan ${pct(meanOf(zoneAcc[2]))}%)`);
  console.log(`komposit  : ${dest}`);
  app.exit(0);
});
