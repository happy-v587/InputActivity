import { contextBridge, ipcRenderer } from 'electron';
import type {
  ActivitySummary,
  BehaviorAnalysis,
  ChartQueryResult,
  ChatConversation,
  ChatConversationDetail,
  ChatEntry,
  DimensionStats,
  EventLogPage,
  LlmConfig,
  NormalizedInputEvent,
  SavedChart,
  SettingsPatch,
  StatsDimension,
  TrackerConfig,
  TrackingState,
  UpdateStatus
} from '../shared/types';

const api = {
  getSummary: (): Promise<ActivitySummary> => ipcRenderer.invoke('tracker:get-summary'),
  getStats: (dimension: StatsDimension, referenceTime?: number): Promise<DimensionStats> =>
    ipcRenderer.invoke('tracker:get-stats', dimension, referenceTime),
  getEventLog: (page = 1, pageSize = 50): Promise<EventLogPage> =>
    ipcRenderer.invoke('tracker:get-event-log', page, pageSize),
  start: (): Promise<TrackingState> => ipcRenderer.invoke('tracker:start'),
  pause: (): Promise<TrackingState> => ipcRenderer.invoke('tracker:pause'),
  resume: (): Promise<TrackingState> => ipcRenderer.invoke('tracker:resume'),
  stop: (): Promise<TrackingState> => ipcRenderer.invoke('tracker:stop'),
  updateSettings: (patch: SettingsPatch): Promise<ActivitySummary> =>
    ipcRenderer.invoke('tracker:update-settings', patch),
  getTrackerConfig: (): Promise<TrackerConfig> =>
    ipcRenderer.invoke('tracker:get-config'),
  executeQuery: (sql: string): Promise<ChartQueryResult> =>
    ipcRenderer.invoke('tracker:execute-query', sql),
  getLlmConfig: (): Promise<LlmConfig | null> =>
    ipcRenderer.invoke('tracker:get-llm-config'),
  setLlmConfig: (config: LlmConfig): Promise<void> =>
    ipcRenderer.invoke('tracker:set-llm-config', config),
  getSavedCharts: (): Promise<SavedChart[]> =>
    ipcRenderer.invoke('tracker:get-saved-charts'),
  saveChart: (chart: SavedChart): Promise<void> =>
    ipcRenderer.invoke('tracker:save-chart', chart),
  deleteChart: (id: string): Promise<void> =>
    ipcRenderer.invoke('tracker:delete-chart', id),
  togglePinChart: (id: string): Promise<void> =>
    ipcRenderer.invoke('tracker:toggle-pin-chart', id),
  getChatConversations: (): Promise<ChatConversation[]> =>
    ipcRenderer.invoke('tracker:get-chat-conversations'),
  createChatConversation: (conversation: ChatConversation): Promise<void> =>
    ipcRenderer.invoke('tracker:create-chat-conversation', conversation),
  getChatConversation: (id: string): Promise<ChatConversationDetail | null> =>
    ipcRenderer.invoke('tracker:get-chat-conversation', id),
  saveChatEntry: (entry: ChatEntry): Promise<void> =>
    ipcRenderer.invoke('tracker:save-chat-entry', entry),
  deleteChatConversation: (id: string): Promise<void> =>
    ipcRenderer.invoke('tracker:delete-chat-conversation', id),
  compactChatConversation: (conversationId: string, summaryEntry: ChatEntry, deleteThroughEntryId: string): Promise<void> =>
    ipcRenderer.invoke('tracker:compact-chat-conversation', conversationId, summaryEntry, deleteThroughEntryId),
  getBehaviorAnalysis: (): Promise<BehaviorAnalysis> =>
    ipcRenderer.invoke('tracker:get-behavior-analysis'),
  onSummary: (listener: (summary: ActivitySummary) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, summary: ActivitySummary): void => listener(summary);
    ipcRenderer.on('tracker:summary', handler);
    return () => ipcRenderer.off('tracker:summary', handler);
  },
  onInput: (listener: (event: NormalizedInputEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: NormalizedInputEvent): void => listener(event);
    ipcRenderer.on('tracker:input', handler);
    return () => ipcRenderer.off('tracker:input', handler);
  },
  onTrackingState: (listener: (state: TrackingState, message?: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, state: TrackingState, message?: string): void =>
      listener(state, message);
    ipcRenderer.on('tracker:state', handler);
    return () => ipcRenderer.off('tracker:state', handler);
  },
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('tracker:check-for-updates'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('tracker:download-update'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('tracker:quit-and-install'),
  onUpdateStatus: (listener: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: UpdateStatus): void => listener(status);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.off('update:status', handler);
  }
};

contextBridge.exposeInMainWorld('tracker', api);

export type TrackerApi = typeof api;
