import { EventEmitter } from 'node:events';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/shared/config';
import type {
  ActivitySummary,
  DimensionStats,
  EventLogPage,
  NormalizedInputEvent,
  PermissionStatus,
  StatsDimension,
  TrackerConfig
} from '../src/shared/types';
import type { InputCaptureAdapter } from '../src/main/capture/types';
import { SqliteEventStore } from '../src/main/storage/sqliteEventStore';
import { type EventStorePort, TrackingController } from '../src/main/trackingController';

describe('TrackingController', () => {
  it('reports blocked state when capture permissions are missing', async () => {
    const rawStore = makeStore();
    const store = new TestStorePort(rawStore);
    const adapter = new FakeAdapter({ ok: false, message: 'Missing Accessibility', missing: ['Accessibility'] });
    const controller = new TrackingController(adapter, store, { ...defaultConfig, retentionDays: null });

    await controller.start();

    expect(controller.getState()).toBe('blocked');
    expect((await controller.getSummary()).permissionMessage).toBe('Missing Accessibility');
    expect(adapter.started).toBe(false);
    rawStore.close();
  });

  it('records events only while active', async () => {
    const rawStore = makeStore();
    const store = new TestStorePort(rawStore);
    const adapter = new FakeAdapter({ ok: true });
    const controller = new TrackingController(adapter, store, { ...defaultConfig, retentionDays: null });

    await controller.start();
    adapter.emitInput(event({ id: 'active', ts: Date.now(), type: 'key_down', keyCode: 'key:a' }));
    await controller.pause();
    adapter.emitInput(event({ id: 'paused', ts: Date.now() + 1, type: 'key_down', keyCode: 'key:b' }));
    await store.flush();

    const events = rawStore.getEvents(Date.now() - 1000, Date.now() + 1000);
    expect(events.map((item) => item.id)).toEqual(['active']);
    rawStore.close();
  });
});

class FakeAdapter extends EventEmitter implements InputCaptureAdapter {
  readonly source = 'fake';
  started = false;

  constructor(private readonly permission: PermissionStatus) {
    super();
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return this.permission;
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  emitInput(input: NormalizedInputEvent): void {
    this.emit('input', input);
  }
}

class TestStorePort implements EventStorePort {
  constructor(private readonly store: SqliteEventStore) {}

  async enqueue(event: NormalizedInputEvent): Promise<void> {
    this.store.enqueue(event);
  }

  async flush(): Promise<void> {
    this.store.flush();
  }

  async updateConfig(config: TrackerConfig): Promise<void> {
    this.store.updateConfig(config);
  }

  async recomputeAggregates(start: number, end: number): Promise<void> {
    this.store.recomputeAggregates(start, end);
  }

  async getSummary(config: TrackerConfig): Promise<ActivitySummary> {
    return this.store.getSummary(config);
  }

  async getDimensionStats(dimension: StatsDimension, config: TrackerConfig): Promise<DimensionStats> {
    return this.store.getDimensionStats(dimension, config);
  }

  async getEventLog(page: number, pageSize: number): Promise<EventLogPage> {
    return this.store.getEventLog(page, pageSize);
  }
}

function makeStore(): SqliteEventStore {
  const dir = mkdtempSync(join(tmpdir(), 'keyboard-controller-'));
  return new SqliteEventStore(join(dir, 'activity.sqlite'), { ...defaultConfig, retentionDays: null });
}

function event(patch: Partial<NormalizedInputEvent>): NormalizedInputEvent {
  return {
    id: 'event',
    ts: 0,
    type: 'key_down',
    device: patch.type?.startsWith('key') ? 'keyboard' : 'mouse',
    repeat: false,
    noise: false,
    source: 'test',
    ...patch
  };
}
