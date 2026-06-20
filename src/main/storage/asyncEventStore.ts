import { Worker } from 'node:worker_threads';
import type {
  ActivitySummary,
  DimensionStats,
  EventLogPage,
  NormalizedInputEvent,
  StatsDimension,
  TrackerConfig
} from '../../shared/types';

type WorkerRequest =
  | { id: number; type: 'enqueue'; payload: { event: NormalizedInputEvent } }
  | { id: number; type: 'flush' }
  | { id: number; type: 'close' }
  | { id: number; type: 'updateConfig'; payload: { config: TrackerConfig } }
  | { id: number; type: 'getSummary'; payload: { config: TrackerConfig; now?: number } }
  | { id: number; type: 'getStats'; payload: { dimension: StatsDimension; config: TrackerConfig; now?: number } }
  | { id: number; type: 'getEventLog'; payload: { page: number; pageSize: number } }
  | { id: number; type: 'recomputeAggregates'; payload: { start: number; end: number } };

type WorkerResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

export class AsyncEventStore {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(workerPath: string, dbPath: string, config: TrackerConfig) {
    this.worker = new Worker(workerPath, {
      workerData: { dbPath, config }
    });
    this.worker.on('message', (message: WorkerResponse) => this.handleMessage(message));
    this.worker.on('error', (error) => this.rejectAll(error));
    this.worker.on('exit', (code) => {
      if (code !== 0) {
        this.rejectAll(new Error(`Event store worker exited with code ${code}`));
      }
    });
  }

  enqueue(event: NormalizedInputEvent): Promise<void> {
    return this.request<void>({ id: 0, type: 'enqueue', payload: { event } });
  }

  flush(): Promise<void> {
    return this.request<void>({ id: 0, type: 'flush' });
  }

  close(): Promise<void> {
    return this.request<void>({ id: 0, type: 'close' }).finally(() => this.worker.terminate());
  }

  updateConfig(config: TrackerConfig): Promise<void> {
    return this.request<void>({ id: 0, type: 'updateConfig', payload: { config } });
  }

  getSummary(config: TrackerConfig, now = Date.now()): Promise<ActivitySummary> {
    return this.request<ActivitySummary>({ id: 0, type: 'getSummary', payload: { config, now } });
  }

  getDimensionStats(dimension: StatsDimension, config: TrackerConfig, now = Date.now()): Promise<DimensionStats> {
    return this.request<DimensionStats>({ id: 0, type: 'getStats', payload: { dimension, config, now } });
  }

  getEventLog(page: number, pageSize: number): Promise<EventLogPage> {
    return this.request<EventLogPage>({ id: 0, type: 'getEventLog', payload: { page, pageSize } });
  }

  recomputeAggregates(start: number, end: number): Promise<void> {
    return this.request<void>({ id: 0, type: 'recomputeAggregates', payload: { start, end } });
  }

  private request<T>(request: WorkerRequest): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
      this.worker.postMessage({ ...request, id });
    });
  }

  private handleMessage(message: WorkerResponse): void {
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);

    if (message.ok) {
      pending.resolve(message.value);
    } else {
      pending.reject(new Error(message.error));
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
