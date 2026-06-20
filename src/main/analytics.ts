import type { AggregateBucket, DaySummary, HourlyBucket, NormalizedInputEvent, TrackerConfig } from '../shared/types';

export function isPrimaryCountEvent(event: NormalizedInputEvent): boolean {
  return event.type === 'key_down' || event.type === 'mouse_down' || event.type === 'wheel';
}

export function filterNoise(
  events: NormalizedInputEvent[],
  duplicateWindowMs: number
): NormalizedInputEvent[] {
  const accepted: NormalizedInputEvent[] = [];
  let previous: NormalizedInputEvent | null = null;

  for (const event of [...events].sort((a, b) => a.ts - b.ts)) {
    if (event.repeat || event.noise || !isPrimaryCountEvent(event)) {
      continue;
    }

    if (previous && event.ts - previous.ts <= duplicateWindowMs && sameIdentity(previous, event)) {
      continue;
    }

    accepted.push(event);
    previous = event;
  }

  return accepted;
}

export function estimateActiveMs(
  events: NormalizedInputEvent[],
  config: Pick<TrackerConfig, 'idleThresholdMs' | 'segmentTailMs' | 'duplicateWindowMs'>
): number {
  const clean = filterNoise(events, config.duplicateWindowMs);
  if (clean.length === 0) {
    return 0;
  }

  let activeMs = 0;
  for (let index = 0; index < clean.length - 1; index += 1) {
    const gap = clean[index + 1].ts - clean[index].ts;
    if (gap <= config.idleThresholdMs) {
      activeMs += Math.max(0, gap);
    } else {
      activeMs += Math.min(config.segmentTailMs, config.idleThresholdMs);
    }
  }

  activeMs += Math.min(config.segmentTailMs, config.idleThresholdMs);
  return activeMs;
}

export function aggregateMinuteBuckets(
  events: NormalizedInputEvent[],
  config: Pick<TrackerConfig, 'idleThresholdMs' | 'segmentTailMs' | 'duplicateWindowMs'>
): AggregateBucket[] {
  const buckets = new Map<number, NormalizedInputEvent[]>();

  for (const event of events) {
    const bucketStart = startOfLocalMinute(event.ts);
    const existing = buckets.get(bucketStart) ?? [];
    existing.push(event);
    buckets.set(bucketStart, existing);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucketStart, bucketEvents]) => ({
      bucketStart,
      keyDownCount: filterNoise(bucketEvents, config.duplicateWindowMs).filter((event) => event.type === 'key_down')
        .length,
      mouseClickCount: filterNoise(bucketEvents, config.duplicateWindowMs).filter(
        (event) => event.type === 'mouse_down'
      ).length,
      wheelCount: filterNoise(bucketEvents, config.duplicateWindowMs).filter((event) => event.type === 'wheel').length,
      activeMs: estimateActiveMs(bucketEvents, config)
    }));
}

export function aggregateHourlyBuckets(minuteBuckets: AggregateBucket[]): HourlyBucket[] {
  const buckets = new Map<number, AggregateBucket>();

  for (const minute of minuteBuckets) {
    const bucketStart = startOfLocalHour(minute.bucketStart);
    const existing = buckets.get(bucketStart) ?? emptyBucket(bucketStart);
    existing.keyDownCount += minute.keyDownCount;
    existing.mouseClickCount += minute.mouseClickCount;
    existing.wheelCount += minute.wheelCount;
    existing.activeMs += minute.activeMs;
    buckets.set(bucketStart, existing);
  }

  return [...buckets.values()]
    .sort((a, b) => a.bucketStart - b.bucketStart)
    .map((bucket) => ({ ...bucket, hour: new Date(bucket.bucketStart).getHours() }));
}

export function aggregateDaySummary(minuteBuckets: AggregateBucket[], dayStart = startOfLocalDay(Date.now())): DaySummary {
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const summary = emptyBucket(dayStart);

  for (const bucket of minuteBuckets) {
    if (bucket.bucketStart < dayStart || bucket.bucketStart >= dayEnd) {
      continue;
    }

    summary.keyDownCount += bucket.keyDownCount;
    summary.mouseClickCount += bucket.mouseClickCount;
    summary.wheelCount += bucket.wheelCount;
    summary.activeMs += bucket.activeMs;
  }

  return {
    ...summary,
    dayKey: toLocalDayKey(dayStart)
  };
}

export function startOfLocalMinute(ts: number): number {
  const date = new Date(ts);
  date.setSeconds(0, 0);
  return date.getTime();
}

export function startOfLocalHour(ts: number): number {
  const date = new Date(ts);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

export function startOfLocalDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function toLocalDayKey(ts: number): string {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyBucket(bucketStart: number): AggregateBucket {
  return {
    bucketStart,
    keyDownCount: 0,
    mouseClickCount: 0,
    wheelCount: 0,
    activeMs: 0
  };
}

function sameIdentity(a: NormalizedInputEvent, b: NormalizedInputEvent): boolean {
  return (
    a.type === b.type &&
    a.device === b.device &&
    a.keyCode === b.keyCode &&
    a.button === b.button &&
    a.wheelDeltaX === b.wheelDeltaX &&
    a.wheelDeltaY === b.wheelDeltaY
  );
}
