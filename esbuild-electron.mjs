import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external: ['electron', 'svgo', 'onnxruntime-node'],
  logLevel: 'info',
};

async function run() {
  for (const { entry, outfile } of [
    { entry: 'electron/main.ts', outfile: 'dist-electron/main.cjs' },
    { entry: 'electron/preload.ts', outfile: 'dist-electron/preload.cjs' },
  ]) {
    const options = {
      ...common,
      entryPoints: [path.join(__dirname, entry)],
      outfile: path.join(__dirname, outfile),
      format: 'cjs',
    };
    await build(isWatch ? { ...options, watch: true } : options);
    if (!isWatch) console.log(`[esbuild] ${entry} -> ${outfile}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
