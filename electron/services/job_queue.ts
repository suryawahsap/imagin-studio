import { EventEmitter } from "events";
import { Task, TaskStatus } from "../types";

export interface QueueItem<T> {
  id: string;
  data: T;
  taskId: string;
}

export interface JobQueueOptions {
  concurrency?: number;
}

export class JobQueue<T> {
  private queue: QueueItem<T>[] = [];
  private running = 0;
  private readonly concurrency: number;
  private emitter = new EventEmitter();
  private executor: (data: T, taskId: string) => Promise<void>;

  constructor(executor: (data: T, taskId: string) => Promise<void>, options: JobQueueOptions = {}) {
    this.executor = executor;
    this.concurrency = Math.max(1, options.concurrency ?? 1);
  }

  enqueue(item: QueueItem<T>): void {
    this.queue.push(item);
    this.emitter.emit("enqueued", item);
    this.drain();
  }

  enqueueMany(items: QueueItem<T>[]): void {
    this.queue.push(...items);
    this.drain();
  }

  get length(): number {
    return this.queue.length;
  }

  has(id: string): boolean {
    return this.queue.some((i) => i.id === id);
  }

  /**
   * Cancel item yang masih antri (BELUM diproses).
   * Item yang sedang berjalan tidak bisa di-dequeue — caller harus set
   * abort signal / kill process secara terpisah.
   */
  cancelQueued(id: string): boolean {
    const before = this.queue.length;
    this.queue = this.queue.filter((i) => i.id !== id);
    return this.queue.length < before;
  }

  drain(): void {
    while (this.queue.length > 0 && this.running < this.concurrency) {
      const item = this.queue.shift()!;
      this.running++;
      this.executor(item.data, item.taskId)
        .catch((err) => {
          console.error(`[Queue] Job ${item.id} executor error:`, err);
        })
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }

  isRunning(): boolean {
    return this.running > 0 || this.queue.length > 0;
  }

  on(event: string, cb: (...args: any[]) => void): void {
    this.emitter.on(event, cb);
  }
}

// ─── Task store shared across modules ──────────────────────
export class TaskStore {
  private tasks: Task[] = [];
  private listeners: Array<(tasks: Task[]) => void> = [];

  constructor(initial?: Task[]) {
    if (initial) this.tasks = initial;
  }

  all(): Task[] {
    return this.tasks;
  }

  get(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  add(task: Task): void {
    this.tasks.unshift(task);
    this.notify();
  }

  update(id: string, patch: Partial<Task>): void {
    const t = this.tasks.find((t) => t.id === id);
    if (!t) return;
    Object.assign(t, patch);
    this.notify();
  }

  removeCompleted(): void {
    this.tasks = this.tasks.filter((t) => t.status === "PROCESSING" || t.status === "QUEUED");
    this.notify();
  }

  subscribe(cb: (tasks: Task[]) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l(this.tasks);
  }
}

export type TaskLike = Omit<Task, "id" | "status" | "progress" | "createdAt">;

export function makeTask(store: TaskStore, type: Task["type"], name: string, module: Task["module"]): Task {
  const task: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    name,
    status: "QUEUED",
    progress: 0,
    createdAt: new Date().toISOString(),
    module,
  };
  store.add(task);
  return task;
}
