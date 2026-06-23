import { parentPort, workerData } from 'node:worker_threads';
import type {
  ChartQueryResult,
  ChatConversation,
  ChatEntry,
  LlmConfig,
  SavedChart,
  TrackerConfig
} from '../../shared/types';
import { SqliteEventStore } from './sqliteEventStore';

if (!parentPort) {
  throw new Error('eventStoreWorker must run inside a Worker');
}

const store = new SqliteEventStore(workerData.dbPath as string, workerData.config as TrackerConfig);

parentPort.on('message', (message: WorkerMessage) => {
  try {
    const value = handleMessage(message);
    parentPort?.postMessage({ id: message.id, ok: true, value });
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

function handleMessage(message: WorkerMessage): unknown {
  switch (message.type) {
    case 'enqueue':
      store.enqueue(message.payload.event);
      return undefined;
    case 'flush':
      store.flush();
      return undefined;
    case 'close':
      store.close();
      return undefined;
    case 'updateConfig':
      store.updateConfig(message.payload.config);
      return undefined;
    case 'getSummary':
      return store.getSummary(message.payload.config, message.payload.now);
    case 'getStats':
      return store.getDimensionStats(message.payload.dimension, message.payload.config, message.payload.now, message.payload.referenceTime);
    case 'getEventLog':
      return store.getEventLog(message.payload.page, message.payload.pageSize);
    case 'recomputeAggregates':
      store.recomputeAggregates(message.payload.start, message.payload.end);
      return undefined;
    case 'executeQuery':
      return store.executeQuery(message.payload.sql);
    case 'getLlmConfig':
      return store.getLlmConfig();
    case 'setLlmConfig':
      store.setLlmConfig(message.payload.config);
      return undefined;
    case 'getSavedCharts':
      return store.getSavedCharts();
    case 'saveChart':
      store.saveChart(message.payload.chart);
      return undefined;
    case 'deleteChart':
      store.deleteChart(message.payload.id);
      return undefined;
    case 'togglePinChart':
      store.togglePinChart(message.payload.id);
      return undefined;
    case 'getChatConversations':
      return store.getChatConversations();
    case 'createChatConversation':
      store.createChatConversation(message.payload.conversation);
      return undefined;
    case 'getChatConversation':
      return store.getChatConversation(message.payload.id);
    case 'saveChatEntry':
      store.saveChatEntry(message.payload.entry);
      return undefined;
    case 'deleteChatConversation':
      store.deleteChatConversation(message.payload.id);
      return undefined;
    case 'compactChatConversation':
      store.compactChatConversation(
        message.payload.conversationId,
        message.payload.summaryEntry,
        message.payload.deleteThroughEntryId
      );
      return undefined;
    default:
      throw new Error(`Unknown worker message: ${(message as { type?: string }).type}`);
  }
}

type WorkerMessage =
  | { id: number; type: 'enqueue'; payload: { event: Parameters<SqliteEventStore['enqueue']>[0] } }
  | { id: number; type: 'flush' }
  | { id: number; type: 'close' }
  | { id: number; type: 'updateConfig'; payload: { config: TrackerConfig } }
  | { id: number; type: 'getSummary'; payload: { config: TrackerConfig; now?: number } }
  | { id: number; type: 'getStats'; payload: { dimension: Parameters<SqliteEventStore['getDimensionStats']>[0]; config: TrackerConfig; now?: number; referenceTime?: number } }
  | { id: number; type: 'getEventLog'; payload: { page: number; pageSize: number } }
  | { id: number; type: 'recomputeAggregates'; payload: { start: number; end: number } }
  | { id: number; type: 'executeQuery'; payload: { sql: string } }
  | { id: number; type: 'getLlmConfig' }
  | { id: number; type: 'setLlmConfig'; payload: { config: LlmConfig } }
  | { id: number; type: 'getSavedCharts' }
  | { id: number; type: 'saveChart'; payload: { chart: SavedChart } }
  | { id: number; type: 'deleteChart'; payload: { id: string } }
  | { id: number; type: 'togglePinChart'; payload: { id: string } }
  | { id: number; type: 'getChatConversations' }
  | { id: number; type: 'createChatConversation'; payload: { conversation: ChatConversation } }
  | { id: number; type: 'getChatConversation'; payload: { id: string } }
  | { id: number; type: 'saveChatEntry'; payload: { entry: ChatEntry } }
  | { id: number; type: 'deleteChatConversation'; payload: { id: string } }
  | { id: number; type: 'compactChatConversation'; payload: { conversationId: string; summaryEntry: ChatEntry; deleteThroughEntryId: string } };
