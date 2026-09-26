import type { ProductionJob } from "../types";
import { dbOp, getDB } from "./storage";

// ponytail: TaskStore integration deferred until studio generation jobs move to main process.
export const saveJobDB = (job: ProductionJob) => dbOp("jobs", "readwrite", (store) => store.put(job));

export const normalizeJobRecord = <T extends { status?: string; items?: any[] }>(job: T): T => {
  if (!job) return job;
  const legacy: Record<string, string> = { done: "completed", finished: "completed" };
  let next = legacy[job.status || ""] ? { ...job, status: legacy[job.status as string] } as T : job;
  if (Array.isArray(next.items)) {
    const items = next.items.map((item: any) => legacy[item.status] ? { ...item, status: legacy[item.status] } : item);
    if (items.some((item: any, index: number) => item !== next.items![index])) next = { ...next, items } as T;
  }
  return next;
};

export async function getJobsDB(includeFinished = false): Promise<ProductionJob[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction("jobs", "readonly").objectStore("jobs").getAll();
    request.onsuccess = () => resolve((request.result as ProductionJob[]).map(normalizeJobRecord)
      .filter((job) => includeFinished || (job.status !== "completed" && job.status !== "failed"))
      .sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

export async function getJobDB(jobId: string): Promise<ProductionJob | undefined> {
  const raw = await dbOp<ProductionJob>("jobs", "readonly", (store) => store.get(jobId));
  return raw ? normalizeJobRecord(raw) : undefined;
}

export const deleteJobDB = (jobId: string) => dbOp("jobs", "readwrite", (store) => store.delete(jobId));

export const updateJobItemInTransaction = (jobId: string, itemId: string, patch: any, stage = ""): Promise<ProductionJob | null> => {
  const terminal = new Set(["completed", "failed", "skipped", "rejected"]);
  const legacy: Record<string, string> = { done: "completed", finished: "completed" };
  return getDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("jobs", "readwrite");
    const store = tx.objectStore("jobs");
    const request = store.get(jobId);
    let next: ProductionJob | null = null;
    request.onsuccess = () => {
      const raw = request.result as ProductionJob | undefined;
      if (!raw) return;
      const job = normalizeJobRecord(raw);
      const normalizedPatch = patch.status && legacy[patch.status] ? { ...patch, status: legacy[patch.status] } : patch;
      const items = (job.items || []).map((item: any) => item.itemId !== itemId ? item : {
        ...item, ...normalizedPatch,
        stageLog: stage ? [...(item.stageLog || []), { stage, at: Date.now() }] : item.stageLog || [],
      });
      const completed = items.filter((item: any) => terminal.has(item.status)).length;
      const failed = items.filter((item: any) => item.status === "failed" || item.status === "rejected").length;
      const allTerminal = items.length > 0 && items.every((item: any) => terminal.has(item.status));
      next = { ...job, items, completed, failed, status: allTerminal ? (failed > 0 ? "failed" : "completed") : job.status, finishedAt: allTerminal ? Date.now() : null };
      store.put(next);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(next);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  }));
};

export const jobEngine = {
  async createJob(job: ProductionJob) { await saveJobDB(job); return job; },
  async save(job: ProductionJob) { await saveJobDB(job); return job; },
  async open(jobId: string) { return getJobDB(jobId); },
  async list(includeFinished = false) { return getJobsDB(includeFinished); },
  async remove(jobId: string): Promise<void> { await deleteJobDB(jobId); },
  async updateItem(jobId: string, itemId: string, patch: any) { return updateJobItemInTransaction(jobId, itemId, patch); },
};

export const logItemStage = (jobId: string, itemId: string, stage: string, _ctx?: any): void => {
  if (!jobId || !itemId) return;
  (async () => {
    try {
      const job = await getJobDB(jobId);
      if (!job) return;
      const items = (job.items || []).map((item: any) => item.itemId !== itemId ? item : { ...item, stageLog: [...(item.stageLog || []), { stage, at: Date.now() }] });
      await saveJobDB({ ...job, items });
    } catch (error) { console.warn("[Imagin] logItemStage failed:", error); }
  })();
};

export const updateJobItemStatus = async (jobId: string, itemId: string, patch: any): Promise<ProductionJob | null> => {
  if (!jobId || !itemId) return null;
  try { return await jobEngine.updateItem(jobId, itemId, patch); }
  catch (error) { console.warn("[Imagin] updateJobItemStatus failed:", error); return null; }
};

export const updateJobItemWithStage = async (jobId: string, itemId: string, stage: string, patch: any = {}): Promise<ProductionJob | null> => {
  if (!jobId || !itemId) return null;
  try { return await updateJobItemInTransaction(jobId, itemId, patch, stage); }
  catch (error) { console.warn("[Imagin] updateJobItemWithStage failed:", error); return null; }
};

export const createProductionJob = ({ jobId, request, total, batchId, batchSessionId, concurrency = 1, items = [] }: {
  jobId: string; request: any; total: number; batchId: string | null; batchSessionId: string | null; concurrency?: number; items?: any[];
}): ProductionJob => ({
  jobId, request, status: "queued", items, total, completed: 0, failed: 0, batchId, batchSessionId, concurrency,
  createdAt: Date.now(), startedAt: null, finishedAt: null, lastResumeState: null,
});
