import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import * as importService from "../electron/services/import";
import { ensureDirs, importsRoot } from "../electron/binaries/paths";

ensureDirs();
const sample = path.join(importsRoot, "studio-sample.png");
if (!fs.existsSync(sample)) {
  const png = new PNG({ width: 64, height: 64 });
  for (let i = 0; i < png.data.length; i++) png.data[i] = (i * 3) % 255;
  fs.writeFileSync(sample, PNG.sync.write(png));
}

const items = importService.analyzeSingleFile(sample, "studio-sample.png");
console.log("analyze:", items.originalName, items.mimeType, `${items.width}x${items.height}`);

const summary = importService.buildSummary([items]);
console.log("summary:", JSON.stringify(summary));

const committed = importService.commitImportedAssets([items], "import-test");
console.log("committed:", committed.length, committed[0]?.name, committed[0]?.url);

fs.unlinkSync(sample);
console.log("IMPORT TEST OK");
