import Database from 'better-sqlite3';
import type { Database as DatabaseHandle } from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type {
  ActivitySummary,
  AggregateBucket,
  ChartBucket,
  ChartQueryResult,
  DimensionStats,
  EventLogItem,
  EventLogPage,
  FrequencyItem,
  LlmConfig,
  NormalizedInputEvent,
  SavedChart,
  StatsDimension,
  TrackerConfig
} from '../../shared/types';
import {
  aggregateDaySummary,
  aggregateHourlyBuckets,
  aggregateMinuteBuckets,
  estimateActiveMs,
  filterNoise,
  startOfLocalDay
} from '../analytics';

export class SqliteEventStore {
  private readonly db: DatabaseHandle;
  private config: TrackerConfig;
  private readonly pending: NormalizedInputEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(dbPath: string, config: TrackerConfig) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.config = config;
    this.initialize();
  }

  enqueue(event: NormalizedInputEvent): void {
    this.pending.push(event);
    if (this.pending.length >= this.config.batchSize) {
      this.flush();
      return;
    }

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.flushIntervalMs);
      this.flushTimer.unref();
    }
  }

  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.pending.length === 0) {
      return;
    }

    const batch = this.pending.splice(0, this.pending.length);
    this.insertEvents(batch);
    this.recomputeAggregates(
      Math.min(...batch.map((event) => event.ts)),
      Math.max(...batch.map((event) => event.ts)) + 60_000
    );
  }

  close(): void {
    this.flush();
    this.db.close();
  }

  updateConfig(config: TrackerConfig): void {
    this.config = config;
  }

  getEvents(start: number, end: number): NormalizedInputEvent[] {
    const rows = this.db
      .prepare(
        `SELECT id, ts, type, device, key_code, key_label, button, wheel_delta_x, wheel_delta_y,
                repeat, noise, source
           FROM input_events
          WHERE ts >= ? AND ts < ?
          ORDER BY ts ASC, rowid ASC`
      )
      .all(start, end) as EventRow[];

    return rows.map(rowToEvent);
  }

  getMinuteBuckets(start: number, end: number): AggregateBucket[] {
    return this.db
      .prepare(
        `SELECT bucket_start AS bucketStart,
                key_down_count AS keyDownCount,
                mouse_click_count AS mouseClickCount,
                wheel_count AS wheelCount,
                active_ms AS activeMs
           FROM minute_stats
          WHERE bucket_start >= ? AND bucket_start < ?
          ORDER BY bucket_start ASC`
      )
      .all(start, end) as AggregateBucket[];
  }

  getSummary(config: TrackerConfig, now = Date.now()): ActivitySummary {
    this.flush();
    const dayStart = startOfLocalDay(now);
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const minuteBuckets = this.getMinuteBuckets(dayStart, dayEnd);
    const todayEvents = this.getEvents(dayStart, dayEnd);
    const today = {
      ...aggregateDaySummary(minuteBuckets, dayStart),
      activeMs: estimateActiveMs(todayEvents, config)
    };
    const hourly = fillHourlyBuckets(aggregateHourlyBuckets(minuteBuckets), dayStart);

    return {
      trackingState: 'stopped',
      today,
      hourly,
      theme: config.theme
    };
  }

  getDimensionStats(dimension: StatsDimension, config: TrackerConfig, now = Date.now(), referenceTime?: number): DimensionStats {
    this.flush();
    const [rangeStart, rangeEnd] = getDimensionRange(dimension, now, referenceTime);
    const events = this.getEvents(rangeStart, rangeEnd);
    const activeMs = estimateActiveMs(events, config);
    const keyRows = this.getKeyFrequencyRows(rangeStart, rangeEnd);
    const mouseRows = this.getMouseButtonFrequencyRows(rangeStart, rangeEnd);
    const wheelRows = this.getWheelDirectionFrequencyRows(rangeStart, rangeEnd);
    const wheelTotal = this.getWheelTotal(rangeStart, rangeEnd);
    const keyTotal = this.getKeyTotal(rangeStart, rangeEnd);
    const mouseTotal = this.getMouseTotal(rangeStart, rangeEnd);

    return {
      dimension,
      rangeStart,
      rangeEnd,
      keyTotal,
      mouseTotal,
      wheelTotal,
      activeMs,
      keyFrequencies: toFrequencyItems(keyRows, keyTotal),
      mouseButtonFrequencies: toFrequencyItems(mouseRows, mouseTotal),
      wheelDirectionFrequencies: toFrequencyItems(wheelRows, wheelTotal),
      chartBuckets: this.getChartBuckets(dimension, rangeStart, rangeEnd, config)
    };
  }

  getEventLog(page = 1, pageSize = 50): EventLogPage {
    this.flush();
    const normalizedPageSize = Math.max(1, Math.min(200, Math.floor(pageSize)));
    const total = (this.db.prepare('SELECT COUNT(*) AS count FROM input_events').get() as { count: number }).count;
    const maxPage = Math.max(1, Math.ceil(total / normalizedPageSize));
    const normalizedPage = Math.max(1, Math.min(maxPage, Math.floor(page)));
    const offset = (normalizedPage - 1) * normalizedPageSize;
    const rows = this.db
      .prepare(
        `SELECT id, ts, type, device, key_code, key_label, button, wheel_delta_x, wheel_delta_y,
                repeat, noise, source
           FROM input_events
          ORDER BY ts DESC, rowid DESC
          LIMIT ? OFFSET ?`
      )
      .all(normalizedPageSize, offset) as EventRow[];

    return {
      items: rows.map(rowToLogItem),
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize
    };
  }

  recomputeAggregates(start: number, end: number): void {
    const bucketStart = Math.floor(start / 60_000) * 60_000;
    const bucketEnd = Math.ceil(end / 60_000) * 60_000;
    const events = this.getEvents(bucketStart, bucketEnd);
    const buckets = aggregateMinuteBuckets(events, this.config);

    const deleteStmt = this.db.prepare('DELETE FROM minute_stats WHERE bucket_start >= ? AND bucket_start < ?');
    const insertStmt = this.db.prepare(
      `INSERT INTO minute_stats (
        bucket_start, key_down_count, mouse_click_count, wheel_count, active_ms, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(bucket_start) DO UPDATE SET
        key_down_count = excluded.key_down_count,
        mouse_click_count = excluded.mouse_click_count,
        wheel_count = excluded.wheel_count,
        active_ms = excluded.active_ms,
        updated_at = excluded.updated_at`
    );

    this.db.transaction(() => {
      deleteStmt.run(bucketStart, bucketEnd);
      for (const bucket of buckets) {
        insertStmt.run(
          bucket.bucketStart,
          bucket.keyDownCount,
          bucket.mouseClickCount,
          bucket.wheelCount,
          bucket.activeMs,
          Date.now()
        );
      }
    })();
  }

  cleanupRetention(now = Date.now()): void {
    if (!this.config.retentionDays) {
      return;
    }

    const cutoff = now - this.config.retentionDays * 24 * 60 * 60 * 1000;
    this.db.prepare('DELETE FROM input_events WHERE ts < ?').run(cutoff);
    this.db.prepare('DELETE FROM minute_stats WHERE bucket_start < ?').run(cutoff);
  }

  private initialize(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS input_events (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        device TEXT NOT NULL,
        key_code TEXT,
        key_label TEXT,
        button TEXT,
        wheel_delta_x REAL,
        wheel_delta_y REAL,
        repeat INTEGER NOT NULL DEFAULT 0,
        noise INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS input_events_ts_idx ON input_events(ts);

      CREATE TABLE IF NOT EXISTS minute_stats (
        bucket_start INTEGER PRIMARY KEY,
        key_down_count INTEGER NOT NULL DEFAULT 0,
        mouse_click_count INTEGER NOT NULL DEFAULT 0,
        wheel_count INTEGER NOT NULL DEFAULT 0,
        active_ms INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS llm_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS saved_charts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        chart_type TEXT NOT NULL DEFAULT 'bar',
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    this.db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(Date.now());
    this.cleanupRetention();
  }

  private insertEvents(events: NormalizedInputEvent[]): void {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO input_events (
        id, ts, type, device, key_code, key_label, button, wheel_delta_x, wheel_delta_y,
        repeat, noise, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    this.db.transaction(() => {
      for (const event of events) {
        stmt.run(
          event.id,
          event.ts,
          event.type,
          event.device,
          event.keyCode ?? null,
          event.keyLabel ?? null,
          event.button ?? null,
          event.wheelDeltaX ?? null,
          event.wheelDeltaY ?? null,
          event.repeat ? 1 : 0,
          event.noise ? 1 : 0,
          event.source,
          Date.now()
        );
      }
    })();
  }

  private getKeyFrequencyRows(start: number, end: number): FrequencyRow[] {
    return this.db
      .prepare(
        `SELECT COALESCE(key_code, 'unknown') AS id,
                MAX(COALESCE(NULLIF(key_label, ''), COALESCE(key_code, 'unknown'))) AS label,
                COUNT(*) AS count
           FROM input_events
          WHERE ts >= ? AND ts < ?
            AND type = 'key_down'
            AND repeat = 0
            AND noise = 0
          GROUP BY COALESCE(key_code, 'unknown')
          ORDER BY count DESC, label ASC
          LIMIT 30`
      )
      .all(start, end) as FrequencyRow[];
  }

  private getMouseButtonFrequencyRows(start: number, end: number): FrequencyRow[] {
    return this.db
      .prepare(
        `SELECT COALESCE(button, 'unknown') AS id,
                MAX(COALESCE(button, 'unknown')) AS label,
                COUNT(*) AS count
           FROM input_events
          WHERE ts >= ? AND ts < ?
            AND type = 'mouse_down'
            AND repeat = 0
            AND noise = 0
          GROUP BY COALESCE(button, 'unknown')
          ORDER BY count DESC, label ASC
          LIMIT 12`
      )
      .all(start, end) as FrequencyRow[];
  }

  private getWheelDirectionFrequencyRows(start: number, end: number): FrequencyRow[] {
    return this.db
      .prepare(
        `SELECT direction_id AS id,
                direction_label AS label,
                COUNT(*) AS count
           FROM (
             SELECT
               CASE
                 WHEN COALESCE(wheel_delta_y, 0) > 0 THEN 'down'
                 WHEN COALESCE(wheel_delta_y, 0) < 0 THEN 'up'
                 WHEN COALESCE(wheel_delta_x, 0) > 0 THEN 'right'
                 WHEN COALESCE(wheel_delta_x, 0) < 0 THEN 'left'
                 ELSE 'unknown'
               END AS direction_id,
               CASE
                 WHEN COALESCE(wheel_delta_y, 0) > 0 THEN 'Scroll Down'
                 WHEN COALESCE(wheel_delta_y, 0) < 0 THEN 'Scroll Up'
                 WHEN COALESCE(wheel_delta_x, 0) > 0 THEN 'Scroll Right'
                 WHEN COALESCE(wheel_delta_x, 0) < 0 THEN 'Scroll Left'
                 ELSE 'Scroll Unknown'
               END AS direction_label
              FROM input_events
             WHERE ts >= ? AND ts < ?
               AND type = 'wheel'
               AND repeat = 0
               AND noise = 0
           )
          GROUP BY direction_id, direction_label
          ORDER BY count DESC, direction_label ASC`
      )
      .all(start, end) as FrequencyRow[];
  }

  private getKeyTotal(start: number, end: number): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM input_events
          WHERE ts >= ? AND ts < ?
            AND type = 'key_down'
            AND repeat = 0
            AND noise = 0`
      )
      .get(start, end) as { count: number };
    return row.count;
  }

  private getMouseTotal(start: number, end: number): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM input_events
          WHERE ts >= ? AND ts < ?
            AND type = 'mouse_down'
            AND repeat = 0
            AND noise = 0`
      )
      .get(start, end) as { count: number };
    return row.count;
  }

  private getWheelTotal(start: number, end: number): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM input_events
          WHERE ts >= ? AND ts < ?
            AND type = 'wheel'
            AND repeat = 0
            AND noise = 0`
      )
      .get(start, end) as { count: number };
    return row.count;
  }

  private getChartBuckets(
    dimension: StatsDimension,
    rangeStart: number,
    rangeEnd: number,
    config: TrackerConfig
  ): ChartBucket[] {
    if (dimension === 'minute') {
      const events = this.getEvents(rangeStart, rangeEnd);
      return Array.from({ length: 60 }, (_, second) => {
        const bucketStart = rangeStart + second * 1000;
        const bucketEvents = events.filter((event) => event.ts >= bucketStart && event.ts < bucketStart + 1000);
        const clean = filterNoise(bucketEvents, config.duplicateWindowMs);
        return {
          bucketStart,
          label: String(second).padStart(2, '0'),
          keyDownCount: clean.filter((event) => event.type === 'key_down').length,
          mouseClickCount: clean.filter((event) => event.type === 'mouse_down').length,
          wheelCount: clean.filter((event) => event.type === 'wheel').length,
          activeMs: estimateActiveMs(bucketEvents, config)
        };
      });
    }

    if (dimension === 'hour') {
      const byMinute = new Map(this.getMinuteBuckets(rangeStart, rangeEnd).map((bucket) => [bucket.bucketStart, bucket]));
      return Array.from({ length: 60 }, (_, minute) => {
        const bucketStart = rangeStart + minute * 60_000;
        const found = byMinute.get(bucketStart);
        return {
          bucketStart,
          label: String(minute).padStart(2, '0'),
          keyDownCount: found?.keyDownCount ?? 0,
          mouseClickCount: found?.mouseClickCount ?? 0,
          wheelCount: found?.wheelCount ?? 0,
          activeMs: found?.activeMs ?? 0
        };
      });
    }

    const hourly = aggregateHourlyBuckets(this.getMinuteBuckets(rangeStart, rangeEnd));
    const byHour = new Map(hourly.map((bucket) => [bucket.hour, bucket]));
    if (dimension === 'day') {
      return Array.from({ length: 24 }, (_, hour) => {
        const bucketStart = rangeStart + hour * 60 * 60 * 1000;
        const found = byHour.get(hour);
        return toChartBucket(bucketStart, `${String(hour).padStart(2, '0')}:00`, found);
      });
    }

    if (dimension === 'month') {
      const byDay = new Map<number, AggregateBucket>();
      for (const minuteBucket of this.getMinuteBuckets(rangeStart, rangeEnd)) {
        const bucketStart = startOfLocalDay(minuteBucket.bucketStart);
        const aggregate = byDay.get(bucketStart) ?? emptyAggregateBucket(bucketStart);
        addAggregateBucket(aggregate, minuteBucket);
        byDay.set(bucketStart, aggregate);
      }

      const buckets: ChartBucket[] = [];
      const cursor = new Date(rangeStart);
      const month = cursor.getMonth() + 1;
      while (cursor.getTime() < rangeEnd) {
        const bucketStart = cursor.getTime();
        buckets.push(toChartBucket(bucketStart, `${month}/${cursor.getDate()}`, byDay.get(bucketStart)));
        cursor.setDate(cursor.getDate() + 1);
      }

      return buckets;
    }

    const byMonth = new Map<number, AggregateBucket>();
    for (const minuteBucket of this.getMinuteBuckets(rangeStart, rangeEnd)) {
      const bucketStart = startOfLocalMonth(minuteBucket.bucketStart);
      const aggregate = byMonth.get(bucketStart) ?? emptyAggregateBucket(bucketStart);
      addAggregateBucket(aggregate, minuteBucket);
      byMonth.set(bucketStart, aggregate);
    }

    const year = new Date(rangeStart).getFullYear();
    return Array.from({ length: 12 }, (_, month) => {
      const bucketStart = new Date(year, month, 1).getTime();
      return toChartBucket(bucketStart, `${year}/${monthLabel(month)}`, byMonth.get(bucketStart));
    });
  }

  executeQuery(sql: string): ChartQueryResult {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
      throw new Error('Only SELECT and WITH queries are allowed');
    }
    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows };
  }

  getLlmConfig(): LlmConfig | null {
    const row = this.db.prepare("SELECT value FROM llm_config WHERE key = 'llm_config'").get() as
      | { value: string }
      | undefined;
    if (!row) return null;
    return JSON.parse(row.value) as LlmConfig;
  }

  setLlmConfig(config: LlmConfig): void {
    const value = JSON.stringify(config);
    this.db.prepare("INSERT OR REPLACE INTO llm_config (key, value) VALUES ('llm_config', ?)").run(value);
  }

  getSavedCharts(): SavedChart[] {
    return this.db
      .prepare('SELECT id, title, sql_query, chart_type, pinned, created_at, updated_at FROM saved_charts ORDER BY updated_at DESC')
      .all() as SavedChart[];
  }

  saveChart(chart: SavedChart): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO saved_charts (id, title, sql_query, chart_type, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(chart.id, chart.title, chart.sqlQuery, chart.chartType, chart.pinned, chart.createdAt, chart.updatedAt);
  }

  deleteChart(id: string): void {
    this.db.prepare('DELETE FROM saved_charts WHERE id = ?').run(id);
  }

  togglePinChart(id: string): void {
    this.db.prepare('UPDATE saved_charts SET pinned = CASE WHEN pinned THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?').run(Date.now(), id);
  }
}

interface EventRow {
  id: string;
  ts: number;
  type: NormalizedInputEvent['type'];
  device: NormalizedInputEvent['device'];
  key_code: string | null;
  key_label: string | null;
  button: NormalizedInputEvent['button'] | null;
  wheel_delta_x: number | null;
  wheel_delta_y: number | null;
  repeat: number;
  noise: number;
  source: string;
}

interface FrequencyRow {
  id: string;
  label: string;
  count: number;
}

function emptyAggregateBucket(bucketStart: number): AggregateBucket {
  return {
    bucketStart,
    keyDownCount: 0,
    mouseClickCount: 0,
    wheelCount: 0,
    activeMs: 0
  };
}

function addAggregateBucket(target: AggregateBucket, source: AggregateBucket): void {
  target.keyDownCount += source.keyDownCount;
  target.mouseClickCount += source.mouseClickCount;
  target.wheelCount += source.wheelCount;
  target.activeMs += source.activeMs;
}

function toChartBucket(bucketStart: number, label: string, bucket?: AggregateBucket): ChartBucket {
  return {
    bucketStart,
    label,
    keyDownCount: bucket?.keyDownCount ?? 0,
    mouseClickCount: bucket?.mouseClickCount ?? 0,
    wheelCount: bucket?.wheelCount ?? 0,
    activeMs: bucket?.activeMs ?? 0
  };
}

function startOfLocalMonth(ts: number): number {
  const date = new Date(ts);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfLocalYear(ts: number): number {
  const date = new Date(ts);
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function monthLabel(month: number): string {
  return `${month + 1}月`;
}

function rowToEvent(row: EventRow): NormalizedInputEvent {
  return {
    id: row.id,
    ts: row.ts,
    type: row.type,
    device: row.device,
    keyCode: row.key_code ?? undefined,
    keyLabel: row.key_label ?? undefined,
    button: row.button ?? undefined,
    wheelDeltaX: row.wheel_delta_x ?? undefined,
    wheelDeltaY: row.wheel_delta_y ?? undefined,
    repeat: Boolean(row.repeat),
    noise: Boolean(row.noise),
    source: row.source
  };
}

function rowToLogItem(row: EventRow): EventLogItem {
  return {
    id: row.id,
    ts: row.ts,
    timeLabel: formatLogTime(row.ts),
    type: row.type,
    device: row.device,
    label: eventLabel(row),
    detail: eventDetail(row)
  };
}

function fillHourlyBuckets(existing: ReturnType<typeof aggregateHourlyBuckets>, dayStart: number): ReturnType<typeof aggregateHourlyBuckets> {
  const byHour = new Map(existing.map((bucket) => [bucket.hour, bucket]));

  return Array.from({ length: 24 }, (_, hour) => {
    const found = byHour.get(hour);
    if (found) {
      return found;
    }

    return {
      bucketStart: dayStart + hour * 60 * 60 * 1000,
      hour,
      keyDownCount: 0,
      mouseClickCount: 0,
      wheelCount: 0,
      activeMs: 0
    };
  });
}

function getDimensionRange(dimension: StatsDimension, now: number, referenceTime?: number): [number, number] {
  const ref = referenceTime ?? now;
  const date = new Date(ref);
  if (dimension === 'minute') {
    date.setSeconds(0, 0);
    const start = date.getTime();
    return [start, start + 60 * 1000];
  }

  if (dimension === 'hour') {
    date.setMinutes(0, 0, 0);
    const start = date.getTime();
    return [start, start + 60 * 60 * 1000];
  }

  if (dimension === 'month') {
    const start = startOfLocalMonth(ref);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return [start, end.getTime()];
  }

  if (dimension === 'year') {
    const start = startOfLocalYear(ref);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return [start, end.getTime()];
  }

  const start = startOfLocalDay(ref);
  return [start, start + 24 * 60 * 60 * 1000];
}

function toFrequencyItems(rows: FrequencyRow[], total: number): FrequencyItem[] {
  return rows.map((row) => ({
    id: row.id,
    label: displayInputLabel(row.label),
    count: row.count,
    share: total > 0 ? row.count / total : 0
  }));
}

function displayInputLabel(label: string): string {
  const numericCodeMatch = /^(?:key:)?code-(\d+)$/i.exec(label);
  if (numericCodeMatch) {
    return displayUiohookCode(Number(numericCodeMatch[1]));
  }

  const numericKeyMatch = /^key:(\d+)$/i.exec(label);
  if (numericKeyMatch) {
    return displayUiohookCode(Number(numericKeyMatch[1]));
  }

  if (label.startsWith('key:')) {
    return displayInputLabel(label.slice(4));
  }

  if (/^key[a-z]$/i.test(label)) {
    return label.slice(3).toUpperCase();
  }

  if (/^digit\d$/i.test(label)) {
    return label.slice(5);
  }

  if (/^[a-z]$/i.test(label)) {
    return label.toUpperCase();
  }

  if (label === 'printable') {
    return 'Printable';
  }

  return label;
}

function eventLabel(row: EventRow): string {
  if (row.type === 'key_down' || row.type === 'key_up') {
    return displayInputLabel(row.key_label ?? row.key_code ?? 'unknown');
  }

  if (row.type === 'mouse_down' || row.type === 'mouse_up') {
    return `${displayMouseButton(row.button)} ${row.type === 'mouse_down' ? 'Down' : 'Up'}`;
  }

  return displayWheelDirection(row.wheel_delta_x, row.wheel_delta_y);
}

function eventDetail(row: EventRow): string {
  if (row.type === 'key_down' || row.type === 'key_up') {
    return `${row.type === 'key_down' ? 'Key down' : 'Key up'}${row.repeat ? ' repeat' : ''}`;
  }

  if (row.type === 'mouse_down' || row.type === 'mouse_up') {
    return row.type === 'mouse_down' ? 'Mouse button down' : 'Mouse button up';
  }

  return `Wheel dx ${row.wheel_delta_x ?? 0}, dy ${row.wheel_delta_y ?? 0}`;
}

function displayMouseButton(button: NormalizedInputEvent['button'] | null): string {
  switch (button) {
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
    case 'middle':
      return 'Middle';
    case 'back':
      return 'Back';
    case 'forward':
      return 'Forward';
    default:
      return 'Unknown';
  }
}

function displayWheelDirection(deltaX: number | null, deltaY: number | null): string {
  const x = deltaX ?? 0;
  const y = deltaY ?? 0;
  if (y < 0) {
    return 'Scroll Up';
  }
  if (y > 0) {
    return 'Scroll Down';
  }
  if (x < 0) {
    return 'Scroll Left';
  }
  if (x > 0) {
    return 'Scroll Right';
  }
  return 'Scroll Unknown';
}

function formatLogTime(ts: number): string {
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds()
  ).padStart(2, '0')}`;
}

function displayUiohookCode(code: number): string {
  const labels = new Map<number, string>([
    [30, 'A'],
    [48, 'B'],
    [46, 'C'],
    [32, 'D'],
    [18, 'E'],
    [33, 'F'],
    [34, 'G'],
    [35, 'H'],
    [23, 'I'],
    [36, 'J'],
    [37, 'K'],
    [38, 'L'],
    [50, 'M'],
    [49, 'N'],
    [24, 'O'],
    [25, 'P'],
    [16, 'Q'],
    [19, 'R'],
    [31, 'S'],
    [20, 'T'],
    [22, 'U'],
    [47, 'V'],
    [17, 'W'],
    [45, 'X'],
    [21, 'Y'],
    [44, 'Z'],
    [2, '1'],
    [3, '2'],
    [4, '3'],
    [5, '4'],
    [6, '5'],
    [7, '6'],
    [8, '7'],
    [9, '8'],
    [10, '9'],
    [11, '0'],
    [57, 'Space'],
    [28, 'Enter'],
    [15, 'Tab'],
    [14, 'Backspace'],
    [1, 'Escape'],
    [57419, 'ArrowLeft'],
    [57416, 'ArrowUp'],
    [57421, 'ArrowRight'],
    [57424, 'ArrowDown']
  ]);
  return labels.get(code) ?? `Code ${code}`;
}
