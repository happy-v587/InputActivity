export type DeviceKind = 'keyboard' | 'mouse';

export type InputEventType =
  | 'key_down'
  | 'key_up'
  | 'mouse_down'
  | 'mouse_up'
  | 'wheel';

export type MouseButton = 'left' | 'right' | 'middle' | 'back' | 'forward' | 'unknown';

export type WheelDirection = 'up' | 'down' | 'left' | 'right' | 'unknown';

export type TrackingState = 'stopped' | 'active' | 'paused' | 'blocked';

export type StatsDimension = 'minute' | 'hour' | 'day' | 'month' | 'year';

export type ThemeChoice = 'dark' | 'light' | 'blue' | 'green' | 'purple';

export interface NormalizedInputEvent {
  id: string;
  ts: number;
  type: InputEventType;
  device: DeviceKind;
  keyCode?: string;
  keyLabel?: string;
  button?: MouseButton;
  wheelDeltaX?: number;
  wheelDeltaY?: number;
  repeat: boolean;
  noise: boolean;
  source: string;
}

export interface AggregateBucket {
  bucketStart: number;
  keyDownCount: number;
  mouseClickCount: number;
  wheelCount: number;
  activeMs: number;
}

export interface HourlyBucket extends AggregateBucket {
  hour: number;
}

export interface DaySummary extends AggregateBucket {
  dayKey: string;
}

export interface ActivitySummary {
  trackingState: TrackingState;
  permissionMessage?: string;
  today: DaySummary;
  hourly: HourlyBucket[];
  theme: ThemeChoice;
}

export interface FrequencyItem {
  id: string;
  label: string;
  count: number;
  share: number;
}

export interface ChartBucket extends AggregateBucket {
  label: string;
}

export interface EventLogItem {
  id: string;
  ts: number;
  timeLabel: string;
  type: InputEventType;
  device: DeviceKind;
  label: string;
  detail: string;
}

export interface EventLogPage {
  items: EventLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DimensionStats {
  dimension: StatsDimension;
  rangeStart: number;
  rangeEnd: number;
  keyTotal: number;
  mouseTotal: number;
  wheelTotal: number;
  activeMs: number;
  keyFrequencies: FrequencyItem[];
  mouseButtonFrequencies: FrequencyItem[];
  wheelDirectionFrequencies: FrequencyItem[];
  chartBuckets: ChartBucket[];
}

export interface TrackerConfig {
  idleThresholdMs: number;
  segmentTailMs: number;
  duplicateWindowMs: number;
  flushIntervalMs: number;
  batchSize: number;
  retentionDays: number | null;
  theme: ThemeChoice;
  timezone: 'local';
}

export interface PermissionStatus {
  ok: boolean;
  message?: string;
  missing?: string[];
}

export type RendererEvent =
  | { type: 'summary'; summary: ActivitySummary }
  | { type: 'input'; event: NormalizedInputEvent }
  | { type: 'tracking-state'; state: TrackingState; message?: string };

export interface SettingsPatch {
  theme?: ThemeChoice;
  idleThresholdMs?: number;
  segmentTailMs?: number;
}

export interface LlmConfig {
  provider: 'openai' | 'anthropic';
  baseUrl: string;
  accessKey: string;
  model: string;
}

export interface SavedChart {
  id: string;
  title: string;
  sqlQuery: string;
  chartType: 'bar' | 'line';
  pinned: number;
  createdAt: number;
  updatedAt: number;
}

export type ChatEntryKind = 'message' | 'progress' | 'summary';

export interface ChatConversation {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatEntry {
  id: string;
  conversationId: string;
  kind: ChatEntryKind;
  role: 'user' | 'assistant' | 'system';
  text: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  sqlQuery?: string;
  chartTitle?: string;
  rangeStart?: number;
  rangeEnd?: number;
  createdAt: number;
}

export interface ChatConversationDetail {
  conversation: ChatConversation;
  entries: ChatEntry[];
}

export type ChartQueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
};
