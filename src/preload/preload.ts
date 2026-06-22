import { contextBridge, ipcRenderer } from 'electron';
import type {
  ActivitySummary,
  ChartQueryResult,
  DimensionStats,
  EventLogPage,
  LlmConfig,
  NormalizedInputEvent,
  SavedChart,
  SettingsPatch,
  StatsDimension,
  TrackingState
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
  }
};

contextBridge.exposeInMainWorld('tracker', api);

export type TrackerApi = typeof api;
