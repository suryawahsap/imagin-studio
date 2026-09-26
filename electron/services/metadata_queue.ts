import { MetadataJob, MetadataJobStatus } from '../types';
import { randomUUID } from 'crypto';

export type MetadataExecutor = (jobId: string, assetId: string, signal: AbortSignal) => Promise<void>;

type JobEntry = {
  job: MetadataJob;
  abortController: AbortController;
};

/**
 * In-memory metadata queue with deterministic state.
 * - enqueue: starts a new job for an asset, prevents duplicate active jobs.
 * - get / list / clearTerminal / cancel.
 * - Cancellation sets status to 'cancelled' and aborts the executor via AbortSignal.
 */
export class MetadataQueue {
  private jobs = new Map<string, JobEntry>();
  private assetToJobId = new Map<string, string>(); // active asset (queued or processing)
  private executor: MetadataExecutor;
  private broadcast: (job: MetadataJob) => void;
  private processing = false;
  private queue: string[] = []; // jobIds in FIFO order

  constructor(executor: MetadataExecutor, broadcast: (job: MetadataJob) => void) {
    this.executor = executor;
    this.broadcast = broadcast;
  }

  /**
   * Enqueue a new job for assetId.
   * @throws Error if asset already has an active job (queued or processing).
   */
  enqueue(assetId: string): string {
    if (this.assetToJobId.has(assetId)) {
      throw new Error(`Asset ${assetId} already has an active job`);
    }
    const jobId = randomUUID();
    const job: MetadataJob = {
      id: jobId,
      assetId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    const abortController = new AbortController();
    this.jobs.set(jobId, { job, abortController });
    this.assetToJobId.set(assetId, jobId);
    this.queue.push(jobId);
    this.broadcast(job);
    this.processNext();
    return jobId;
  }

  get(jobId: string): MetadataJob | undefined {
    return this.jobs.get(jobId)?.job;
  }

  list(): MetadataJob[] {
    return Array.from(this.jobs.values()).map(entry => entry.job);
  }

  /**
   * Remove all terminal jobs (completed/failed/cancelled) and return them.
   */
  clearTerminal(): MetadataJob[] {
    const toRemove: string[] = [];
    const removed: MetadataJob[] = [];
    for (const [id, entry] of this.jobs) {
      const status = entry.job.status;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        if (this.assetToJobId.get(entry.job.assetId) === id) continue;
        toRemove.push(id);
        removed.push(entry.job);
        // Remove from queue if still present (should not happen for terminal)
        this.queue = this.queue.filter(qid => qid !== id);
      }
    }
    for (const id of toRemove) {
      this.jobs.delete(id);
    }
    return removed;
  }

  /**
   * Cancel a job by id.
   * - If queued: remove from queue and set status to cancelled.
   * - If processing: abort the executor and set status to cancelled.
   * - If already terminal: no-op.
   * @returns true if the job was cancelled (status changed), false otherwise.
   */
  cancel(jobId: string): boolean {
    const entry = this.jobs.get(jobId);
    if (!entry) return false;
    const job = entry.job;
    const status = job.status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return false;
    }
    if (status === 'queued') {
      this.queue = this.queue.filter(id => id !== jobId);
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      this.broadcast(job);
      return true;
    }
    if (status === 'processing') {
      entry.abortController.abort();
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      this.assetToJobId.delete(job.assetId);
      this.broadcast(job);
      return true;
    }
    return false;
  }

  private async processNext() {
    if (this.processing) return;
    if (this.queue.length === 0) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const jobId = this.queue[0];
        const entry = this.jobs.get(jobId);
        if (!entry) {
          this.queue.shift();
          continue;
        }
        const job = entry.job;
        if (job.status !== 'queued') {
          this.queue.shift();
          continue;
        }
        // Start processing
        job.status = 'processing';
        job.startedAt = new Date().toISOString();
        this.broadcast(job);
        try {
          await this.executor(jobId, job.assetId, entry.abortController.signal);
          // If not cancelled during execution, mark completed
          if (!entry.abortController.signal.aborted) {
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            this.broadcast(job);
          }
        } catch (err: any) {
          // If already cancelled, keep cancelled status; otherwise mark failed
          if (!entry.abortController.signal.aborted) {
            job.status = 'failed';
            job.error = err?.message || 'Unknown error';
            job.completedAt = new Date().toISOString();
            this.broadcast(job);
          }
          // If cancelled, status is already set; we just keep it.
        } finally {
          if (this.assetToJobId.get(job.assetId) === jobId) this.assetToJobId.delete(job.assetId);
          this.queue.shift();
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
