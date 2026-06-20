import { EventEmitter } from 'node:events';
import type {
  ActivitySummary,
  DimensionStats,
  EventLogPage,
  NormalizedInputEvent,
  SettingsPatch,
  StatsDimension,
  TrackerConfig,
  TrackingState
} from '../shared/types';
import type { InputCaptureAdapter } from './capture/types';

export interface EventStorePort {
  enqueue(event: NormalizedInputEvent): Promise<void>;
  flush(): Promise<void>;
  updateConfig(config: TrackerConfig): Promise<void>;
  recomputeAggregates(start: number, end: number): Promise<void>;
  getSummary(config: TrackerConfig): Promise<ActivitySummary>;
  getDimensionStats(dimension: StatsDimension, config: TrackerConfig): Promise<DimensionStats>;
  getEventLog(page: number, pageSize: number): Promise<EventLogPage>;
}

export class TrackingController extends EventEmitter {
  private state: TrackingState = 'stopped';
  private blockedMessage: string | undefined;
  private summaryTimer: NodeJS.Timeout | null = null;
  private summaryInFlight = false;
  private summaryDirty = false;

  constructor(
    private readonly adapter: InputCaptureAdapter,
    private readonly store: EventStorePort,
    private config: TrackerConfig
  ) {
    super();
    this.adapter.on('input', (event: NormalizedInputEvent) => this.handleInput(event));
    this.adapter.on('error', (error: Error) => this.block(error.message));
  }

  getState(): TrackingState {
    return this.state;
  }

  getConfig(): TrackerConfig {
    return this.config;
  }

  async start(): Promise<TrackingState> {
    const permission = await this.adapter.checkPermissions();
    if (!permission.ok) {
      this.block(permission.message ?? 'Input capture permissions are missing.');
      return this.state;
    }

    await this.adapter.start();
    this.setState('active');
    return this.state;
  }

  async pause(): Promise<TrackingState> {
    if (this.state !== 'active') {
      return this.state;
    }

    await this.adapter.stop();
    this.clearScheduledSummary();
    this.setState('paused');
    return this.state;
  }

  async resume(): Promise<TrackingState> {
    if (this.state !== 'paused' && this.state !== 'blocked') {
      return this.state;
    }

    return this.start();
  }

  async stop(): Promise<TrackingState> {
    await this.adapter.stop();
    this.clearScheduledSummary();
    await this.store.flush();
    this.setState('stopped');
    return this.state;
  }

  async updateSettings(patch: SettingsPatch): Promise<TrackerConfig> {
    this.config = {
      ...this.config,
      ...patch,
      visualFeedbackIntensity: clamp(patch.visualFeedbackIntensity ?? this.config.visualFeedbackIntensity, 0, 1),
      idleThresholdMs: Math.max(30_000, patch.idleThresholdMs ?? this.config.idleThresholdMs),
      segmentTailMs: Math.max(0, patch.segmentTailMs ?? this.config.segmentTailMs)
    };
    await this.store.updateConfig(this.config);
    await this.store.flush();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    await this.store.recomputeAggregates(dayStart.getTime(), dayStart.getTime() + 24 * 60 * 60 * 1000);
    void this.emitSummary();
    return this.config;
  }

  async getSummary(): Promise<ActivitySummary> {
    return {
      ...(await this.store.getSummary(this.config)),
      trackingState: this.state,
      permissionMessage: this.blockedMessage,
      visualFeedbackEnabled: this.config.visualFeedbackEnabled,
      visualFeedbackIntensity: this.config.visualFeedbackIntensity,
      lowPowerMode: this.config.lowPowerMode
    };
  }

  getStats(dimension: StatsDimension): Promise<DimensionStats> {
    return this.store.getDimensionStats(dimension, this.config);
  }

  getEventLog(page: number, pageSize: number): Promise<EventLogPage> {
    return this.store.getEventLog(page, pageSize);
  }

  async emitSummary(): Promise<void> {
    this.emit('summary', await this.getSummary());
  }

  private handleInput(event: NormalizedInputEvent): void {
    if (this.state !== 'active') {
      return;
    }

    void this.store.enqueue(event);
    this.emit('input', event);
    this.scheduleSummary();
  }

  private block(message: string): void {
    this.blockedMessage = message;
    this.setState('blocked', message);
  }

  private setState(state: TrackingState, message?: string): void {
    this.state = state;
    if (state !== 'blocked') {
      this.blockedMessage = undefined;
    }
    this.emit('state', state, message);
    void this.emitSummary();
  }

  private scheduleSummary(): void {
    this.summaryDirty = true;
    if (this.summaryTimer) {
      return;
    }

    this.summaryTimer = setTimeout(() => {
      this.summaryTimer = null;
      void this.emitSummaryOnce();
    }, 250);
    this.summaryTimer.unref();
  }

  private clearScheduledSummary(): void {
    if (!this.summaryTimer) {
      return;
    }

    clearTimeout(this.summaryTimer);
    this.summaryTimer = null;
  }

  private async emitSummaryOnce(): Promise<void> {
    if (this.summaryInFlight) {
      this.scheduleSummary();
      return;
    }

    this.summaryDirty = false;
    this.summaryInFlight = true;
    try {
      await this.emitSummary();
    } finally {
      this.summaryInFlight = false;
      if (this.summaryDirty) {
        this.scheduleSummary();
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
