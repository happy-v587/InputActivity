import type { TrackerConfig } from './types';

export const defaultConfig: TrackerConfig = {
  idleThresholdMs: 5 * 60 * 1000,
  segmentTailMs: 60 * 1000,
  duplicateWindowMs: 20,
  flushIntervalMs: 1000,
  batchSize: 100,
  retentionDays: 90,
  theme: 'dark',
  timezone: 'local'
};

export function mergeConfig(patch: Partial<TrackerConfig>): TrackerConfig {
  return {
    ...defaultConfig,
    ...patch,
    idleThresholdMs: Math.max(30_000, patch.idleThresholdMs ?? defaultConfig.idleThresholdMs),
    segmentTailMs: Math.max(0, patch.segmentTailMs ?? defaultConfig.segmentTailMs)
  };
}
