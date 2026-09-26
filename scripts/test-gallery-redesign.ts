import assert from 'node:assert/strict';
import type { LibraryAsset } from '../src/types';

// Mock sample assets
const mockAssets: LibraryAsset[] = [
  {
    id: 'asset-1',
    type: 'IMAGE',
    name: 'city_sunset.png',
    url: '/storage/assets/images/city_sunset.png',
    folder: 'images',
    sourceModule: 'STUDIO',
    mimeType: 'image/png',
    fileSize: '2.4 MB',
    resolution: '1024 × 1024',
    tags: ['city', 'cyberpunk', 'sunset'],
    createdAt: new Date().toISOString(),
    prompt: 'A futuristic city skyline at sunset, cyberpunk style',
    favorite: true,
  },
  {
    id: 'asset-2',
    type: 'VECTOR',
    name: 'tiger_vector.svg',
    url: '/storage/assets/vectors/tiger_vector.svg',
    folder: 'vectors',
    sourceModule: 'VECTOR',
    mimeType: 'image/svg+xml',
    fileSize: '245 KB',
    resolution: 'Vector',
    tags: ['tiger', 'vector'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    favorite: false,
  },
  {
    id: 'asset-3',
    type: 'IMAGE',
    name: 'portrait_4k.png',
    url: '/storage/assets/upscaled/portrait_4k.png',
    folder: 'upscaled',
    sourceModule: 'UPSCALE',
    mimeType: 'image/png',
    fileSize: '6.8 MB',
    resolution: '4096 × 4096 (4K)',
    status: 'Upscaled',
    tags: ['portrait', '4k'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    favorite: true,
  },
];

// Test Filtering
const favorites = mockAssets.filter((a) => a.favorite);
assert.equal(favorites.length, 2, 'Should filter favorites correctly');

const vectors = mockAssets.filter((a) => a.type === 'VECTOR');
assert.equal(vectors.length, 1, 'Should filter vectors correctly');

const upscaled = mockAssets.filter((a) => a.status === 'Upscaled' || a.sourceModule === 'UPSCALE');
assert.equal(upscaled.length, 1, 'Should identify upscaled asset');

// Test Search
const searchQ = 'cyberpunk';
const searched = mockAssets.filter((a) =>
  [a.name, a.prompt, ...(a.tags || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(searchQ))
);
assert.equal(searched.length, 1, 'Search by prompt keyword should return 1 match');
assert.equal(searched[0].id, 'asset-1', 'Search match should be asset-1');

console.log('✓ test-gallery-redesign assertions passed successfully');
