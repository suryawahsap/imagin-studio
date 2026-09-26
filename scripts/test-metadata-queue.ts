import assert from 'assert/strict';
import { MetadataQueue } from '../electron/services/metadata_queue';
import { MetadataJob } from '../electron/types';

// Helper: wait for a condition
const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock executor that completes after a delay, with abort support
const createExecutor = (shouldFail = false, delayMs = 50) => {
  return async (jobId: string, assetId: string, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (signal.aborted) {
          reject(new Error('Aborted'));
        } else if (shouldFail) {
          reject(new Error('executor_failed'));
        } else {
          resolve();
        }
      }, delayMs);
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      });
    });
  };
};

// Test 1: Basic enqueue and completion
async function testBasicEnqueue() {
  const queue = new MetadataQueue(
    createExecutor(false, 20),
    () => {} // broadcast not asserted here; see other tests for broadcast coverage
  );

  const assetId = 'asset-1';
  const jobId = queue.enqueue(assetId);
  assert.ok(jobId, 'should return job id');
  const job = queue.get(jobId);
  assert.ok(job, 'job should exist');
  assert.strictEqual(job.assetId, assetId);

  // Wait for processing
  await waitFor(100);
  const updated = queue.get(jobId);
  assert.strictEqual(updated?.status, 'completed');
  assert.ok(updated?.completedAt, 'completedAt should be set');

  // Clear terminal
  const removed = queue.clearTerminal();
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(removed[0].id, jobId);
  assert.strictEqual(queue.get(jobId), undefined);
}

// Test 2: Duplicate prevention
async function testDuplicatePrevention() {
  const queue = new MetadataQueue(createExecutor(false, 10), () => {});
  const assetId = 'asset-2';
  const jobId1 = queue.enqueue(assetId);
  assert.ok(jobId1);
  assert.throws(() => queue.enqueue(assetId), /already has an active job/);
  // After completion, should be able to re-enqueue
  await waitFor(50);
  queue.clearTerminal();
  const jobId2 = queue.enqueue(assetId);
  assert.ok(jobId2);
  assert.notStrictEqual(jobId1, jobId2);
}

// Test 3: Cancel queued job
async function testCancelQueued() {
  const queue = new MetadataQueue(createExecutor(false, 1000), () => {});
  const assetId = 'asset-3';
  const jobId = queue.enqueue(assetId);
  // Cancel immediately; may be queued or already processing
  const cancelled = queue.cancel(jobId);
  assert.strictEqual(cancelled, true);
  // Wait for executor to abort
  await waitFor(100);
  const job = queue.get(jobId);
  assert.strictEqual(job?.status, 'cancelled');
  assert.ok(job?.updatedAt);
  const removed = queue.clearTerminal();
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(removed[0].id, jobId);
}

// Test 4: Cancel processing job
async function testCancelProcessing() {
  const queue = new MetadataQueue(createExecutor(false, 500), () => {});
  const assetId = 'asset-4';
  const jobId = queue.enqueue(assetId);
  // Wait for it to start processing
  await waitFor(20);
  const job = queue.get(jobId);
  assert.strictEqual(job?.status, 'processing');
  const cancelled = queue.cancel(jobId);
  assert.strictEqual(cancelled, true);
  // Wait for executor to finish (will abort)
  await waitFor(100);
  const updated = queue.get(jobId);
  assert.strictEqual(updated?.status, 'cancelled');
  // Should be removable
  const removed = queue.clearTerminal();
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(removed[0].id, jobId);
}

// Test 5: Clear terminal only removes terminal jobs
async function testClearTerminal() {
  const queue = new MetadataQueue(createExecutor(false, 10), () => {});
  const assetId1 = 'asset-5a';
  const assetId2 = 'asset-5b';
  const jobId1 = queue.enqueue(assetId1);
  const jobId2 = queue.enqueue(assetId2);
  // Wait for both to complete
  await waitFor(50);
  // Both should be completed
  assert.strictEqual(queue.get(jobId1)?.status, 'completed');
  assert.strictEqual(queue.get(jobId2)?.status, 'completed');
  const removed = queue.clearTerminal();
  assert.strictEqual(removed.length, 2);
  assert.strictEqual(queue.list().length, 0);
}

// Test 6: Queue listing and get
async function testListAndGet() {
  const queue = new MetadataQueue(createExecutor(false, 1000), () => {});
  const assetId = 'asset-6';
  const jobId = queue.enqueue(assetId);
  const list = queue.list();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, jobId);
  assert.strictEqual(queue.get(jobId)?.id, jobId);
  // Cancel and clear
  queue.cancel(jobId);
  queue.clearTerminal();
  assert.strictEqual(queue.list().length, 0);
}

// Run all tests
async function main() {
  await testBasicEnqueue();
  await testDuplicatePrevention();
  await testCancelQueued();
  await testCancelProcessing();
  await testClearTerminal();
  await testListAndGet();
  console.log('✅ All metadata-queue tests passed');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});