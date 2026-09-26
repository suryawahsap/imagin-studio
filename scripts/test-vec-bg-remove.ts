/**
 * Test vec-bg stripBackground with generative PNG.
 * Run: npx tsx scripts/test-vec-bg-remove.ts
 */

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { stripBackground } from '../electron/services/vec/vec-bg';

function createTestImage(
  width: number,
  height: number,
  bg: [number, number, number, number],
  rect: { x: number; y: number; w: number; h: number; color: [number, number, number, number] }
): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const inRect =
        x >= rect.x && x < rect.x + rect.w &&
        y >= rect.y && y < rect.y + rect.h;
      const c = inRect ? rect.color : bg;
      png.data[idx] = c[0];
      png.data[idx + 1] = c[1];
      png.data[idx + 2] = c[2];
      png.data[idx + 3] = c[3];
    }
  }
  return PNG.sync.write(png);
}

function makeTempFile(prefix: string, ext = '.png'): string {
  return path.join('/tmp', `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`);
}

async function testBasicStripping() {
  const tmpIn = makeTempFile('bg-test-in');
  const tmpOut = makeTempFile('bg-test-out');

  // 64x64, white background, red 20x20 centered
  const buffer = createTestImage(64, 64, [255, 255, 255, 255], {
    x: 22,
    y: 22,
    w: 20,
    h: 20,
    color: [255, 0, 0, 255],
  });
  fs.writeFileSync(tmpIn, buffer);

  const result = stripBackground(tmpIn, tmpOut);
  assert(result.stripped, 'Expected background to be stripped');

  const outPng = PNG.sync.read(fs.readFileSync(tmpOut));

  // Border pixels (top-left corner) should be transparent
  const borderIdx = 0 * 64 + 0;
  assert.equal(outPng.data[borderIdx * 4 + 3], 0, 'Border pixel should be transparent');

  // Center pixel (32,32) should remain opaque red
  const centerIdx = 32 * 64 + 32;
  assert.equal(outPng.data[centerIdx * 4], 255, 'Center R should be 255');
  assert.equal(outPng.data[centerIdx * 4 + 1], 0, 'Center G should be 0');
  assert.equal(outPng.data[centerIdx * 4 + 2], 0, 'Center B should be 0');
  assert.equal(outPng.data[centerIdx * 4 + 3], 255, 'Center alpha should be 255');

  // Cleanup
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
}

function testNoisyBorderSkips() {
  // Create an image with mixed border colors (gradient / noise) so dominance < 60%
  const tmpIn = makeTempFile('bg-test-noisy');
  const tmpOut = makeTempFile('bg-test-noisy-out');

  const width = 64,
    height = 64;
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Border: alternating colors
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      let r = 128,
        g = 128,
        b = 128;
      if (isBorder) {
        const v = (x + y) % 4;
        if (v === 0) { r = 255; g = 0; b = 0; } else if (v === 1) { r = 0; g = 255; b = 0; } else if (v === 2) { r = 0; g = 0; b = 255; } else { r = 255; g = 255; b = 0; }
      } else {
        // Interior: white with red square to check unchanged
        const inRect = x >= 22 && x < 42 && y >= 22 && y < 42;
        if (inRect) { r = 255; g = 0; b = 0; } else { r = 255; g = 255; b = 255; }
      }
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  fs.writeFileSync(tmpIn, PNG.sync.write(png));

  const result = stripBackground(tmpIn, tmpOut);
  assert(!result.stripped, 'Should skip noisy border');

  // Verify output is identical to input (byte-for-byte)
  const inBuf = fs.readFileSync(tmpIn);
  const outBuf = fs.readFileSync(tmpOut);
  assert.deepEqual(inBuf, outBuf, 'Output should be identical for skipped case');

  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
}

// Run
testBasicStripping();
testNoisyBorderSkips();

console.log('✅ test-vec-bg-remove passed');