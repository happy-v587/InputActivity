import { describe, expect, it } from 'vitest';
import type { NormalizedInputEvent, TrackerConfig } from '../src/shared/types';
import { defaultConfig } from '../src/shared/config';
import {
  aggregateDaySummary,
  aggregateHourlyBuckets,
  aggregateMinuteBuckets,
  estimateActiveMs,
  filterNoise,
  startOfLocalDay
} from '../src/main/analytics';

const config: TrackerConfig = {
  ...defaultConfig,
  idleThresholdMs: 5 * 60 * 1000,
  segmentTailMs: 60 * 1000,
  duplicateWindowMs: 20
};

describe('analytics', () => {
  it('filters auto-repeat and duplicate primary events', () => {
    const events = [
      event({ id: 'a', ts: 1000, type: 'key_down', keyCode: 'key:a' }),
      event({ id: 'b', ts: 1005, type: 'key_down', keyCode: 'key:a' }),
      event({ id: 'c', ts: 2000, type: 'key_down', keyCode: 'key:b', repeat: true }),
      event({ id: 'd', ts: 3000, type: 'mouse_down', button: 'left' })
    ];

    expect(filterNoise(events, 20).map((item) => item.id)).toEqual(['a', 'd']);
  });

  it('estimates active time across active segments and idle gaps', () => {
    const events = [
      event({ id: 'a', ts: 0, type: 'key_down', keyCode: 'key:a' }),
      event({ id: 'b', ts: 30_000, type: 'mouse_down', button: 'left' }),
      event({ id: 'c', ts: 10 * 60_000, type: 'key_down', keyCode: 'key:c' })
    ];

    expect(estimateActiveMs(events, config)).toBe(150_000);
  });

  it('aggregates minute, hour, and day buckets using local day boundaries', () => {
    const dayStart = startOfLocalDay(Date.now());
    const events = [
      event({ id: 'a', ts: dayStart + 1000, type: 'key_down', keyCode: 'key:a' }),
      event({ id: 'b', ts: dayStart + 30_000, type: 'mouse_down', button: 'left' }),
      event({ id: 'c', ts: dayStart + 70_000, type: 'wheel', wheelDeltaY: 1 })
    ];

    const minutes = aggregateMinuteBuckets(events, config);
    const hours = aggregateHourlyBuckets(minutes);
    const day = aggregateDaySummary(minutes, dayStart);

    expect(minutes).toHaveLength(2);
    expect(hours[0].keyDownCount).toBe(1);
    expect(day.keyDownCount).toBe(1);
    expect(day.mouseClickCount).toBe(1);
    expect(day.wheelCount).toBe(1);
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
