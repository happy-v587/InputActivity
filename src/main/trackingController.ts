import { EventEmitter } from 'node:events';
import type {
  ActivitySummary,
  BehaviorAnalysis,
  BehaviorPeriod,
  ChartQueryResult,
  ChatConversation,
  ChatConversationDetail,
  ChatEntry,
  DimensionStats,
  EventLogPage,
  LlmConfig,
  NormalizedInputEvent,
  PetKind,
  SavedChart,
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
  getDimensionStats(dimension: StatsDimension, config: TrackerConfig, now?: number, referenceTime?: number): Promise<DimensionStats>;
  getEventLog(page: number, pageSize: number): Promise<EventLogPage>;
  executeQuery(sql: string): Promise<ChartQueryResult>;
  getLlmConfig(): Promise<LlmConfig | null>;
  setLlmConfig(config: LlmConfig): Promise<void>;
  getSavedCharts(): Promise<SavedChart[]>;
  saveChart(chart: SavedChart): Promise<void>;
  deleteChart(id: string): Promise<void>;
  togglePinChart(id: string): Promise<void>;
  getChatConversations(): Promise<ChatConversation[]>;
  createChatConversation(conversation: ChatConversation): Promise<void>;
  getChatConversation(id: string): Promise<ChatConversationDetail | null>;
  saveChatEntry(entry: ChatEntry): Promise<void>;
  deleteChatConversation(id: string): Promise<void>;
  compactChatConversation(conversationId: string, summaryEntry: ChatEntry, deleteThroughEntryId: string): Promise<void>;
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

    try {
      await this.adapter.start();
    } catch (error) {
      this.block(error instanceof Error ? error.message : String(error));
      return this.state;
    }

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
    const shouldRecomputeAggregates = patch.idleThresholdMs !== undefined || patch.segmentTailMs !== undefined;
    this.config = {
      ...this.config,
      ...patch,
      idleThresholdMs: Math.max(30_000, patch.idleThresholdMs ?? this.config.idleThresholdMs),
      segmentTailMs: Math.max(0, patch.segmentTailMs ?? this.config.segmentTailMs)
    };
    await this.store.updateConfig(this.config);
    await this.store.flush();
    if (shouldRecomputeAggregates) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      await this.store.recomputeAggregates(dayStart.getTime(), dayStart.getTime() + 24 * 60 * 60 * 1000);
    }
    void this.emitSummary();
    return this.config;
  }

  async getSummary(): Promise<ActivitySummary> {
    return {
      ...(await this.store.getSummary(this.config)),
      trackingState: this.state,
      permissionMessage: this.blockedMessage,
      theme: this.config.theme
    };
  }

  getStats(dimension: StatsDimension, referenceTime?: number): Promise<DimensionStats> {
    return this.store.getDimensionStats(dimension, this.config, Date.now(), referenceTime);
  }

  getEventLog(page: number, pageSize: number): Promise<EventLogPage> {
    return this.store.getEventLog(page, pageSize);
  }

  executeQuery(sql: string): Promise<ChartQueryResult> {
    return this.store.executeQuery(sql);
  }

  getLlmConfig(): Promise<LlmConfig | null> {
    return this.store.getLlmConfig();
  }

  setLlmConfig(config: LlmConfig): Promise<void> {
    return this.store.setLlmConfig(config);
  }

  getSavedCharts(): Promise<SavedChart[]> {
    return this.store.getSavedCharts();
  }

  saveChart(chart: SavedChart): Promise<void> {
    return this.store.saveChart(chart);
  }

  deleteChart(id: string): Promise<void> {
    return this.store.deleteChart(id);
  }

  togglePinChart(id: string): Promise<void> {
    return this.store.togglePinChart(id);
  }

  getChatConversations(): Promise<ChatConversation[]> {
    return this.store.getChatConversations();
  }

  createChatConversation(conversation: ChatConversation): Promise<void> {
    return this.store.createChatConversation(conversation);
  }

  getChatConversation(id: string): Promise<ChatConversationDetail | null> {
    return this.store.getChatConversation(id);
  }

  saveChatEntry(entry: ChatEntry): Promise<void> {
    return this.store.saveChatEntry(entry);
  }

  deleteChatConversation(id: string): Promise<void> {
    return this.store.deleteChatConversation(id);
  }

  compactChatConversation(conversationId: string, summaryEntry: ChatEntry, deleteThroughEntryId: string): Promise<void> {
    return this.store.compactChatConversation(conversationId, summaryEntry, deleteThroughEntryId);
  }

  async getBehaviorAnalysis(): Promise<BehaviorAnalysis> {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const startTs = dayStart.getTime();
    const endTs = Date.now();

    const result = await this.store.executeQuery(
      `SELECT bucket_start AS bucketStart, key_down_count AS keys, mouse_click_count AS clicks, wheel_count AS wheels
       FROM minute_stats
       WHERE bucket_start >= ${startTs} AND bucket_start < ${endTs}
       ORDER BY bucket_start ASC`
    );

    const buckets = result.rows.map((row) => ({
      bucketStart: Number(row.bucketStart),
      keys: Number(row.keys),
      clicks: Number(row.clicks),
      wheels: Number(row.wheels)
    }));

    const todayKeys = buckets.reduce((sum, b) => sum + b.keys, 0);
    const idlePeriods = findPeriods(buckets, (b) => b.keys < 5, 10);
    const busyPeriods = findPeriods(buckets, (b) => b.keys > 60, 5);

    return {
      todayKeys,
      idlePeriods: idlePeriods.map((p) => ({
        startTs: p.startTs,
        endTs: p.endTs,
        keys: p.keys,
        label: 'Idle'
      })),
      busyPeriods: busyPeriods.map((p) => ({
        startTs: p.startTs,
        endTs: p.endTs,
        keys: p.keys,
        label: inferBusyLabel(p.keys, p.clicks, p.wheels)
      })),
      summary: buildBehaviorSummary(todayKeys, idlePeriods.length, busyPeriods.length)
    };
  }

  async updatePetKind(petKind: PetKind): Promise<TrackerConfig> {
    return this.updateSettings({ petKind } as SettingsPatch & { petKind: PetKind });
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

interface MinuteBucketRow {
  bucketStart: number;
  keys: number;
  clicks: number;
  wheels: number;
}

interface PeriodAggregate {
  startTs: number;
  endTs: number;
  keys: number;
  clicks: number;
  wheels: number;
}

function findPeriods(
  buckets: MinuteBucketRow[],
  predicate: (b: MinuteBucketRow) => boolean,
  minLength: number
): PeriodAggregate[] {
  const periods: PeriodAggregate[] = [];
  let current: PeriodAggregate | null = null;
  const minuteMs = 60 * 1000;

  for (const bucket of buckets) {
    if (predicate(bucket)) {
      if (current && bucket.bucketStart - current.endTs <= minuteMs) {
        current.endTs = bucket.bucketStart + minuteMs;
        current.keys += bucket.keys;
        current.clicks += bucket.clicks;
        current.wheels += bucket.wheels;
      } else {
        if (current) {
          periods.push(current);
        }
        current = {
          startTs: bucket.bucketStart,
          endTs: bucket.bucketStart + minuteMs,
          keys: bucket.keys,
          clicks: bucket.clicks,
          wheels: bucket.wheels
        };
      }
    } else {
      if (current) {
        periods.push(current);
        current = null;
      }
    }
  }
  if (current) {
    periods.push(current);
  }

  return periods.filter((p) => (p.endTs - p.startTs) / minuteMs >= minLength);
}

function inferBusyLabel(keys: number, clicks: number, wheels: number): string {
  if (clicks > keys * 0.6) {
    return 'Likely browsing/reading (heavy mouse use)';
  }
  if (wheels > keys * 0.5) {
    return 'Likely reading (heavy scroll)';
  }
  return 'Likely typing work or chat';
}

function buildBehaviorSummary(todayKeys: number, idleCount: number, busyCount: number): string {
  if (todayKeys === 0) {
    return 'No activity recorded yet today.';
  }
  const parts: string[] = [];
  parts.push(`${todayKeys} keystrokes today`);
  if (busyCount > 0) {
    parts.push(`${busyCount} intense typing burst${busyCount > 1 ? 's' : ''}`);
  }
  if (idleCount > 0) {
    parts.push(`${idleCount} idle stretch${idleCount > 1 ? 'es' : ''}`);
  }
  return parts.join(' · ');
}
