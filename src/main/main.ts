import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } from 'electron';
import { join } from 'node:path';
import { defaultConfig } from '../shared/config';
import type {
  ActivitySummary,
  ChatConversation,
  ChatEntry,
  LlmConfig,
  SavedChart,
  SettingsPatch,
  StatsDimension,
  TrackingState
} from '../shared/types';
import { UiohookInputCaptureAdapter } from './capture/uiohookAdapter';
import { AsyncEventStore } from './storage/asyncEventStore';
import { TrackingController } from './trackingController';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let controller: TrackingController | null = null;
let isQuitting = false;
let shutdownStarted = false;

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === 'development';

async function createApp(): Promise<void> {
  if (process.platform === 'darwin') {
    app.dock?.hide();
    app.setActivationPolicy('accessory');
  }

  const userData = app.getPath('userData');
  const dbPath = join(userData, 'activity.sqlite');
  const workerPath = join(__dirname, 'storage/eventStoreWorker.js');
  const store = new AsyncEventStore(workerPath, dbPath, defaultConfig);
  controller = new TrackingController(new UiohookInputCaptureAdapter(), store, defaultConfig);

  createWindow();
  createTray();
  bindController(controller);
  bindIpc(controller);

  if (shouldStartTrackingOnLaunch()) {
    void controller.start();
  }

  app.on('before-quit', (event) => {
    if (shutdownStarted) {
      return;
    }

    event.preventDefault();
    shutdownStarted = true;
    isQuitting = true;

    void (async () => {
      await controller?.stop();
      await store.close();
      app.quit();
    })();
  });
}

function shouldStartTrackingOnLaunch(): boolean {
  return process.platform === 'darwin' && app.isPackaged;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 620,
    minWidth: 860,
    minHeight: 520,
    show: true,
    alwaysOnTop: false,
    title: 'Input Activity',
    backgroundColor: '#0e1116',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173');
  } else {
    void mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const image = nativeImage.createFromDataURL(
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="5" width="14" height="8" rx="2" fill="black"/><circle cx="5" cy="9" r="1" fill="white"/><circle cx="9" cy="9" r="1" fill="white"/><circle cx="13" cy="9" r="1" fill="white"/></svg>'
      )
  );
  image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip('Input Activity');
  void updateTrayMenu('stopped');
  tray.on('click', () => toggleWindow());
  tray.on('right-click', () => tray?.popUpContextMenu());
}

async function updateTrayMenu(state: TrackingState, knownSummary?: ActivitySummary): Promise<void> {
  if (!tray || !controller) {
    return;
  }

  const summary = knownSummary ?? (await controller.getSummary());
  const label = `Today: ${summary.today.keyDownCount} keys / ${summary.today.mouseClickCount} clicks`;
  tray.setTitle(formatTrayTitle(summary));
  tray.setToolTip(
    `Input Activity\nToday: ${summary.today.keyDownCount} keys / ${summary.today.mouseClickCount} clicks`
  );
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label, enabled: false },
      { type: 'separator' },
      { label: 'Show Activity', click: () => toggleWindow(true) },
      {
        label: state === 'active' ? 'Pause Tracking' : 'Start Tracking',
        click: () => {
          void (state === 'active' ? controller?.pause() : controller?.resume().then(async (next) => {
            if (next === 'stopped') {
              await controller?.start();
            }
          }));
        }
      },
      { label: 'Stop Tracking', enabled: state !== 'stopped', click: () => void controller?.stop() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  );
}

function formatTrayTitle(summary: ActivitySummary): string {
  return `${compactTrayCount(summary.today.keyDownCount)}/${compactTrayCount(summary.today.mouseClickCount)}`;
}

function compactTrayCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }

  if (value < 10_000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  if (value < 1_000_000) {
    return `${Math.round(value / 1000)}k`;
  }

  return `${(value / 1_000_000).toFixed(1)}m`;
}

function toggleWindow(forceShow = false): void {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible() && !forceShow) {
    mainWindow.hide();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function bindController(activeController: TrackingController): void {
  activeController.on('summary', (summary: ActivitySummary) => {
    mainWindow?.webContents.send('tracker:summary', summary);
    void updateTrayMenu(summary.trackingState, summary);
  });
  activeController.on('input', (event) => mainWindow?.webContents.send('tracker:input', event));
  activeController.on('state', (state: TrackingState, message?: string) => {
    mainWindow?.webContents.send('tracker:state', state, message);
    void updateTrayMenu(state);
  });
}

function bindIpc(activeController: TrackingController): void {
  ipcMain.handle('tracker:get-summary', () => activeController.getSummary());
  ipcMain.handle('tracker:get-stats', (_event, dimension: StatsDimension, referenceTime?: number) =>
    activeController.getStats(dimension, referenceTime)
  );
  ipcMain.handle('tracker:get-event-log', (_event, page: number, pageSize: number) =>
    activeController.getEventLog(page, pageSize)
  );
  ipcMain.handle('tracker:start', () => activeController.start());
  ipcMain.handle('tracker:pause', () => activeController.pause());
  ipcMain.handle('tracker:resume', () => activeController.resume());
  ipcMain.handle('tracker:stop', () => activeController.stop());
  ipcMain.handle('tracker:update-settings', async (_event, patch: SettingsPatch) => {
    await activeController.updateSettings(patch);
    return activeController.getSummary();
  });
  ipcMain.handle('tracker:execute-query', (_event, sql: string) =>
    activeController.executeQuery(sql)
  );
  ipcMain.handle('tracker:get-llm-config', () =>
    activeController.getLlmConfig()
  );
  ipcMain.handle('tracker:set-llm-config', (_event, config: LlmConfig) =>
    activeController.setLlmConfig(config)
  );
  ipcMain.handle('tracker:get-saved-charts', () =>
    activeController.getSavedCharts()
  );
  ipcMain.handle('tracker:save-chart', (_event, chart: SavedChart) =>
    activeController.saveChart(chart)
  );
  ipcMain.handle('tracker:delete-chart', (_event, id: string) =>
    activeController.deleteChart(id)
  );
  ipcMain.handle('tracker:toggle-pin-chart', (_event, id: string) =>
    activeController.togglePinChart(id)
  );
  ipcMain.handle('tracker:get-chat-conversations', () =>
    activeController.getChatConversations()
  );
  ipcMain.handle('tracker:create-chat-conversation', (_event, conversation: ChatConversation) =>
    activeController.createChatConversation(conversation)
  );
  ipcMain.handle('tracker:get-chat-conversation', (_event, id: string) =>
    activeController.getChatConversation(id)
  );
  ipcMain.handle('tracker:save-chat-entry', (_event, entry: ChatEntry) =>
    activeController.saveChatEntry(entry)
  );
  ipcMain.handle('tracker:delete-chat-conversation', (_event, id: string) =>
    activeController.deleteChatConversation(id)
  );
  ipcMain.handle(
    'tracker:compact-chat-conversation',
    (_event, conversationId: string, summaryEntry: ChatEntry, deleteThroughEntryId: string) =>
      activeController.compactChatConversation(conversationId, summaryEntry, deleteThroughEntryId)
  );
}

app.whenReady().then(createApp).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => undefined);

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});
