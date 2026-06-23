import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/shared/config';
import type { NormalizedInputEvent } from '../src/shared/types';
import { SqliteEventStore } from '../src/main/storage/sqliteEventStore';

describe('SqliteEventStore', () => {
  it('initializes schema, writes batches, and reads events after restart', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const first = new SqliteEventStore(dbPath, { ...defaultConfig, batchSize: 10, retentionDays: null });
    first.enqueue(event({ id: 'a', ts: 1000, type: 'key_down', keyCode: 'key:a' }));
    first.enqueue(event({ id: 'b', ts: 1200, type: 'mouse_down', button: 'left' }));
    first.flush();
    first.close();

    const second = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const events = second.getEvents(0, 5000);
    second.close();

    expect(events.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('recomputes minute aggregates from raw events', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    store.enqueue(event({ id: 'a', ts: 1000, type: 'key_down', keyCode: 'key:a' }));
    store.enqueue(event({ id: 'b', ts: 1500, type: 'key_down', keyCode: 'key:b', repeat: true }));
    store.flush();
    store.recomputeAggregates(0, 60_000);

    const buckets = store.getMinuteBuckets(0, 60_000);
    store.close();

    expect(buckets).toHaveLength(1);
    expect(buckets[0].keyDownCount).toBe(1);
  });

  it('returns per-key and mouse button frequency stats for dimensions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const now = Date.now();
    store.enqueue(event({ id: 'a1', ts: now - 1000, type: 'key_down', keyCode: 'key:a', keyLabel: 'KeyA' }));
    store.enqueue(event({ id: 'a2', ts: now - 800, type: 'key_down', keyCode: 'key:a', keyLabel: 'KeyA' }));
    store.enqueue(event({ id: 'b1', ts: now - 600, type: 'key_down', keyCode: 'key:b', keyLabel: 'KeyB' }));
    store.enqueue(event({ id: 'r1', ts: now - 500, type: 'key_down', keyCode: 'key:r', keyLabel: 'KeyR', repeat: true }));
    store.enqueue(event({ id: 'm1', ts: now - 400, type: 'mouse_down', button: 'left' }));
    store.enqueue(event({ id: 'm2', ts: now - 300, type: 'mouse_down', button: 'right' }));
    store.enqueue(event({ id: 'w1', ts: now - 200, type: 'wheel', wheelDeltaY: 1 }));
    store.flush();

    const stats = store.getDimensionStats('day', { ...defaultConfig, retentionDays: null }, now);
    store.close();

    expect(stats.keyTotal).toBe(3);
    expect(stats.mouseTotal).toBe(2);
    expect(stats.wheelTotal).toBe(1);
    expect(stats.keyFrequencies[0]).toMatchObject({ label: 'A', count: 2 });
    expect(stats.mouseButtonFrequencies.map((item) => item.label)).toEqual(['left', 'right']);
  });

  it('displays legacy numeric key codes as readable labels', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const now = Date.now();
    store.enqueue(event({ id: 'legacy-code', ts: now - 1000, type: 'key_down', keyCode: 'key:36', keyLabel: 'code-36' }));
    store.flush();

    const stats = store.getDimensionStats('day', { ...defaultConfig, retentionDays: null }, now);
    store.close();

    expect(stats.keyFrequencies[0]).toMatchObject({ label: 'J', count: 1 });
  });

  it('returns month and year chart buckets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const juneTs = new Date(2026, 5, 18, 9, 8, 7).getTime();
    const januaryTs = new Date(2026, 0, 3, 10, 0, 0).getTime();
    store.enqueue(event({ id: 'jun-key', ts: juneTs, type: 'key_down', keyCode: 'key:j', keyLabel: 'J' }));
    store.enqueue(event({ id: 'jun-click', ts: juneTs + 1, type: 'mouse_down', button: 'left' }));
    store.enqueue(event({ id: 'jan-wheel', ts: januaryTs, type: 'wheel', wheelDeltaY: 1 }));
    store.flush();

    const month = store.getDimensionStats('month', { ...defaultConfig, retentionDays: null }, juneTs);
    const year = store.getDimensionStats('year', { ...defaultConfig, retentionDays: null }, juneTs);
    store.close();

    expect(month.rangeStart).toBe(new Date(2026, 5, 1).getTime());
    expect(month.chartBuckets).toHaveLength(30);
    expect(month.keyTotal).toBe(1);
    expect(month.mouseTotal).toBe(1);
    expect(month.chartBuckets[17]).toMatchObject({ label: '6/18', keyDownCount: 1, mouseClickCount: 1 });
    expect(year.chartBuckets).toHaveLength(12);
    expect(year.wheelTotal).toBe(1);
    expect(year.chartBuckets[0]).toMatchObject({ label: '2026/1月', wheelCount: 1 });
    expect(year.chartBuckets[5]).toMatchObject({ label: '2026/6月', keyDownCount: 1, mouseClickCount: 1 });
  });

  it('returns event log rows with readable times and mouse wheel directions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const ts = new Date(2026, 5, 18, 9, 8, 7).getTime();
    store.enqueue(event({ id: 'key', ts, type: 'key_down', keyCode: 'key:j', keyLabel: 'J' }));
    store.enqueue(event({ id: 'left', ts: ts + 1, type: 'mouse_down', button: 'left' }));
    store.enqueue(event({ id: 'wheel-up', ts: ts + 2, type: 'wheel', wheelDeltaY: -1 }));
    store.enqueue(event({ id: 'wheel-down-a', ts: ts + 3, type: 'wheel', wheelDeltaY: 1 }));
    store.enqueue(event({ id: 'wheel-down-b', ts: ts + 4, type: 'wheel', wheelDeltaY: 1 }));
    store.flush();

    const log = store.getEventLog(1, 10);
    const stats = store.getDimensionStats('day', { ...defaultConfig, retentionDays: null }, ts);
    store.close();

    expect(log.items.map((item) => item.label)).toEqual(['Scroll Down', 'Scroll Down', 'Scroll Up', 'Left Down', 'J']);
    expect(log.items[4].timeLabel).toBe('09:08:07');
    expect(log.total).toBe(5);
    expect(stats.wheelDirectionFrequencies.map((item) => `${item.label}:${item.count}`)).toEqual([
      'Scroll Down:2',
      'Scroll Up:1'
    ]);
  });

  it('maps saved chart rows back to camelCase fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const now = Date.now();

    store.saveChart({
      id: 'chart-1',
      title: 'Daily Keys',
      sqlQuery: 'SELECT 1 AS value',
      chartType: 'bar',
      pinned: 1,
      createdAt: now,
      updatedAt: now + 1
    });

    const charts = store.getSavedCharts();
    store.close();

    expect(charts).toEqual([
      {
        id: 'chart-1',
        title: 'Daily Keys',
        sqlQuery: 'SELECT 1 AS value',
        chartType: 'bar',
        pinned: 1,
        createdAt: now,
        updatedAt: now + 1
      }
    ]);
  });

  it('persists chat conversations and entries across restart', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const first = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const conversation = {
      id: 'conv-1',
      title: 'Activity trends',
      summary: '',
      createdAt: 100,
      updatedAt: 100
    };
    const entry = {
      id: 'entry-1',
      conversationId: 'conv-1',
      kind: 'message' as const,
      role: 'user' as const,
      text: 'Show my key presses by day',
      createdAt: 101
    };

    first.createChatConversation(conversation);
    first.saveChatEntry(entry);
    first.close();

    const second = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });
    const conversations = second.getChatConversations();
    const detail = second.getChatConversation('conv-1');
    second.close();

    expect(conversations).toEqual([
      {
        ...conversation,
        updatedAt: 101,
        summary: 'Show my key presses by day'
      }
    ]);
    expect(detail).toEqual({
      conversation: {
        ...conversation,
        updatedAt: 101,
        summary: 'Show my key presses by day'
      },
      entries: [entry]
    });
  });

  it('compacts old chat entries into a summary entry', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keyboard-store-'));
    const dbPath = join(dir, 'activity.sqlite');
    const store = new SqliteEventStore(dbPath, { ...defaultConfig, retentionDays: null });

    store.createChatConversation({
      id: 'conv-compact',
      title: 'Compact me',
      summary: '',
      createdAt: 100,
      updatedAt: 100
    });
    store.saveChatEntry({
      id: 'entry-a',
      conversationId: 'conv-compact',
      kind: 'message',
      role: 'user',
      text: 'First question',
      createdAt: 101
    });
    store.saveChatEntry({
      id: 'entry-b',
      conversationId: 'conv-compact',
      kind: 'message',
      role: 'assistant',
      text: 'First answer',
      createdAt: 102
    });
    store.saveChatEntry({
      id: 'entry-c',
      conversationId: 'conv-compact',
      kind: 'message',
      role: 'user',
      text: 'Second question',
      createdAt: 103
    });

    store.compactChatConversation(
      'conv-compact',
      {
        id: 'summary-1',
        conversationId: 'conv-compact',
        kind: 'summary',
        role: 'system',
        text: 'Earlier discussion summary',
        rangeStart: 101,
        rangeEnd: 102,
        createdAt: 104
      },
      'entry-b'
    );

    const detail = store.getChatConversation('conv-compact');
    const conversations = store.getChatConversations();
    store.close();

    expect(detail?.entries).toEqual([
      {
        id: 'entry-c',
        conversationId: 'conv-compact',
        kind: 'message',
        role: 'user',
        text: 'Second question',
        createdAt: 103
      },
      {
        id: 'summary-1',
        conversationId: 'conv-compact',
        kind: 'summary',
        role: 'system',
        text: 'Earlier discussion summary',
        rangeStart: 101,
        rangeEnd: 102,
        createdAt: 104
      }
    ]);
    expect(conversations[0]).toMatchObject({
      id: 'conv-compact',
      summary: 'Earlier discussion summary',
      updatedAt: 104
    });
  });
});

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
