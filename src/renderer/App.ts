import './styles.css';
import type {
  ActivitySummary,
  ChatConversation,
  ChatEntry,
  ChartQueryResult,
  DimensionStats,
  EventLogPage,
  FrequencyItem,
  LlmConfig,
  StatsDimension,
  ThemeChoice,
  TrackingState,
  UpdateStatus
} from '../shared/types';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing app root');
}

root.innerHTML = `
  <main class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="appMark" aria-hidden="true"></span>
        <div>
          <p class="eyebrow">Input Activity</p>
          <h1>Keyboard</h1>
        </div>
      </div>

      <nav class="tabs" role="tablist" aria-label="main pages">
        <button class="tab active" data-page="overview">Overview</button>
        <button class="tab" data-page="chat">Chat</button>
        <button class="tab" data-page="events">Events</button>
        <button class="tab" data-page="config">Config</button>
      </nav>

      <div class="sidebarFooter">
        <span class="statePill">
          <i class="status" id="statusDot" aria-label="tracking status"></i>
          <span id="stateLabel">Stopped</span>
        </span>
        <button id="start" class="primaryAction">Start</button>
        <div class="controls" aria-label="tracking controls">
          <button id="pause">Pause</button>
          <button id="stop">Stop</button>
        </div>
      </div>
    </aside>

    <section class="content">
      <section class="page active" id="overviewPage">
        <section class="todayPanel" aria-label="today activity">
          <article class="activeMetric">
            <span>Active time</span>
            <strong id="active">0m</strong>
            <small id="dayKey"></small>
          </article>
          <div class="compactMetrics">
            <article>
              <span>Keys</span>
              <strong id="keys">0</strong>
            </article>
            <article>
              <span>Clicks</span>
              <strong id="clicks">0</strong>
            </article>
            <article>
              <span>Scrolls</span>
              <strong id="wheels">0</strong>
            </article>
          </div>
        </section>

        <section class="pinnedCharts" id="pinnedCharts" aria-label="pinned charts" style="display:none">
          <div class="panelHeader">
            <span>Pinned Charts</span>
          </div>
          <div id="pinnedChartList"></div>
        </section>

        <section class="chartPanel" aria-label="activity pattern">
          <div class="chartHeader">
            <div>
              <span>Activity Pattern</span>
              <strong id="rangeLabel"></strong>
            </div>
            <div class="segments" role="tablist" aria-label="statistics dimension">
              <button class="segment" id="dimensionMinute" data-dimension="minute">Minute</button>
              <button class="segment" id="dimensionHour" data-dimension="hour">Hour</button>
              <button class="segment active" id="dimensionDay" data-dimension="day">Day</button>
              <button class="segment" id="dimensionMonth" data-dimension="month">Month</button>
              <button class="segment" id="dimensionYear" data-dimension="year">Year</button>
            </div>
            <div class="yearNav" id="yearNav" style="display:none">
              <button id="prevYear" class="tinyButton" title="Previous year">◀</button>
              <span id="yearLabel"></span>
              <button id="nextYear" class="tinyButton" title="Next year">▶</button>
            </div>
            <select id="refreshInterval" class="refreshSelect" title="Auto-refresh interval">
              <option value="1000">1s</option>
              <option value="5000" selected>5s</option>
              <option value="10000">10s</option>
              <option value="30000">30s</option>
              <option value="60000">1m</option>
            </select>
          </div>
          <div class="chartBody">
            <div class="bars" id="bars"></div>
            <svg class="chartLine" id="chartLine" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
          </div>
          <div class="xAxis" id="xAxis"></div>
        </section>

        <section class="detailPanel" aria-label="frequency details">
          <div class="panelHeader">
            <span>Top Inputs</span>
            <div class="statsTotals">
              <span><b id="statKeys">0</b> keys</span>
              <span><b id="statMouse">0</b> clicks</span>
              <span><b id="statWheel">0</b> scrolls</span>
            </div>
          </div>
          <div class="frequencyGrid">
            <div class="frequencyBlock">
              <div class="blockTitle">Keys</div>
              <div class="frequencyList" id="keyFrequency"></div>
            </div>
            <div class="frequencyBlock">
              <div class="blockTitle">Mouse Buttons</div>
              <div class="frequencyList" id="mouseFrequency"></div>
            </div>
            <div class="frequencyBlock">
              <div class="blockTitle splitTitle">
                <span>Wheel</span>
                <span id="wheelPageLabel">1 / 1</span>
              </div>
              <div class="frequencyList" id="wheelFrequency"></div>
              <div class="miniPagination">
                <button id="prevWheelPage" class="tinyButton">Prev</button>
                <button id="nextWheelPage" class="tinyButton">Next</button>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section class="page" id="eventsPage">
        <section class="eventPanel" aria-label="event log">
          <div class="panelHeader">
            <span>Raw Event Log</span>
            <button id="refreshLog" class="smallButton">Refresh</button>
          </div>
          <div class="eventHeader">
            <span>Time</span>
            <span>Input</span>
            <span>Detail</span>
          </div>
          <div class="eventList" id="eventList"></div>
          <div class="pagination">
            <button id="prevLogPage" class="smallButton">Prev</button>
            <span id="logPageLabel">Page 1 / 1</span>
            <button id="nextLogPage" class="smallButton">Next</button>
          </div>
        </section>
      </section>

      <section class="page" id="chatPage">
        <section class="chatWorkspace">
          <aside class="chatSidebarPanel" aria-label="chat history">
            <div class="panelHeader chatSidebarHeader">
              <div>
                <span>Conversations</span>
                <small class="chatHint">Saved locally on this device</small>
              </div>
              <button id="newConversationBtn" class="smallButton">New</button>
            </div>
            <div class="chatConversationList" id="chatConversationList"></div>
          </aside>

          <section class="chatPanel" aria-label="chat query">
            <div class="panelHeader chatPanelHeader">
              <div>
                <span id="chatConversationTitle">New conversation</span>
                <small class="chatHint" id="chatConversationMeta">Describe what you want to see about your activity data</small>
              </div>
              <button id="deleteConversationBtn" class="smallButton">Delete</button>
            </div>
            <div class="chatBody">
              <div class="chatMessages" id="chatMessages"></div>
              <div class="chatResult" id="chatResult" style="display:none">
                <div class="chatSqlPanel" id="chatSqlPanel" style="display:none">
                  <div class="chatSqlHeader">
                    <span>SQL</span>
                    <span id="chatResultMeta"></span>
                  </div>
                  <pre id="chatSqlText"></pre>
                </div>
                <div class="chatResultChart" id="chatResultChart" style="display:none">
                  <div class="bars" id="chatBars"></div>
                  <div class="xAxis" id="chatXAxis"></div>
                </div>
                <div class="chatEmptyResult" id="chatEmptyResult" style="display:none">No rows returned for this query.</div>
                <div class="chatActions">
                  <input id="chartTitle" class="chartTitleInput" placeholder="Chart title..." />
                  <button id="saveChartBtn" class="smallButton">Save Chart</button>
                </div>
              </div>
            </div>
            <div class="chatInputBar">
              <textarea id="chatInput" rows="3" placeholder="e.g. Show me my most active hours on Thursdays"></textarea>
              <button id="sendChat" class="chatSendButton">Send</button>
            </div>
          </section>
        </section>
      </section>

      <section class="page" id="configPage">
        <section class="configPanel" aria-label="configuration settings">
          <div class="panelHeader">
            <span>Config</span>
          </div>
          <div class="configGrid">
            <label class="settingRow">
              <span>
                <b>Theme</b>
                <small>Choose a light, dark, or colored interface theme.</small>
              </span>
              <select id="themeSelect">
                <option value="dark">Black</option>
                <option value="light">White</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
              </select>
            </label>
            <div class="settingRow">
              <span>
                <b>LLM Provider</b>
                <small>Configure AI-powered data querying.</small>
              </span>
              <select id="llmProvider" class="configInput">
                <option value="openai">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <label class="settingRow">
              <span><b>Base URL</b></span>
              <input id="llmBaseUrl" class="configInput" type="text" placeholder="https://api.openai.com/v1" />
            </label>
            <label class="settingRow">
              <span><b>Access Key</b></span>
              <input id="llmAccessKey" class="configInput" type="password" placeholder="sk-..." />
            </label>
            <label class="settingRow">
              <span><b>Model</b></span>
              <input id="llmModel" class="configInput" type="text" placeholder="gpt-4o" />
            </label>
          </div>
          <div class="panelHeader" style="margin-top:24px">
            <span>Update</span>
          </div>
          <div class="updateSection">
            <button id="checkUpdateBtn" class="smallButton">Check for Updates</button>
            <span id="updateStatus" class="updateStatusText">Ready</span>
          </div>
          <div id="updateProgressBar" class="updateProgressBar" style="display:none">
            <div id="updateProgressFill" class="updateProgressFill"></div>
          </div>
        </section>
      </section>

      <p class="permission" id="permission"></p>
    </section>
  </main>
`;

const stateLabel = getEl<HTMLElement>('stateLabel');
const statusDot = getEl<HTMLDivElement>('statusDot');
const startButton = getEl<HTMLButtonElement>('start');
const pauseButton = getEl<HTMLButtonElement>('pause');
const stopButton = getEl<HTMLButtonElement>('stop');
const keys = getEl<HTMLElement>('keys');
const clicks = getEl<HTMLElement>('clicks');
const wheels = getEl<HTMLElement>('wheels');
const active = getEl<HTMLElement>('active');
const dayKey = getEl<HTMLElement>('dayKey');
const bars = getEl<HTMLDivElement>('bars');
const chartLine = getEl<SVGSVGElement>('chartLine');
const xAxis = getEl<HTMLDivElement>('xAxis');
const rangeLabel = getEl<HTMLElement>('rangeLabel');
const statKeys = getEl<HTMLElement>('statKeys');
const statMouse = getEl<HTMLElement>('statMouse');
const statWheel = getEl<HTMLElement>('statWheel');
const keyFrequency = getEl<HTMLDivElement>('keyFrequency');
const mouseFrequency = getEl<HTMLDivElement>('mouseFrequency');
const wheelFrequency = getEl<HTMLDivElement>('wheelFrequency');
const wheelPageLabel = getEl<HTMLElement>('wheelPageLabel');
const prevWheelPage = getEl<HTMLButtonElement>('prevWheelPage');
const nextWheelPage = getEl<HTMLButtonElement>('nextWheelPage');
const eventList = getEl<HTMLDivElement>('eventList');
const logPageLabel = getEl<HTMLElement>('logPageLabel');
const prevLogPage = getEl<HTMLButtonElement>('prevLogPage');
const nextLogPage = getEl<HTMLButtonElement>('nextLogPage');
const permission = getEl<HTMLParagraphElement>('permission');
const themeSelect = getEl<HTMLSelectElement>('themeSelect');
const yearNav = getEl<HTMLDivElement>('yearNav');
const yearLabel = getEl<HTMLElement>('yearLabel');
const prevYear = getEl<HTMLButtonElement>('prevYear');
const nextYear = getEl<HTMLButtonElement>('nextYear');
const chatMessages = getEl<HTMLDivElement>('chatMessages');
const chatInput = getEl<HTMLTextAreaElement>('chatInput');
const sendChat = getEl<HTMLButtonElement>('sendChat');
const chatResult = getEl<HTMLDivElement>('chatResult');
const chatBars = getEl<HTMLDivElement>('chatBars');
const chatXAxis = getEl<HTMLDivElement>('chatXAxis');
const chartTitle = getEl<HTMLInputElement>('chartTitle');
const saveChartBtn = getEl<HTMLButtonElement>('saveChartBtn');
const newConversationBtn = getEl<HTMLButtonElement>('newConversationBtn');
const deleteConversationBtn = getEl<HTMLButtonElement>('deleteConversationBtn');
const chatConversationList = getEl<HTMLDivElement>('chatConversationList');
const chatConversationTitle = getEl<HTMLElement>('chatConversationTitle');
const chatConversationMeta = getEl<HTMLElement>('chatConversationMeta');
const chatSqlPanel = getEl<HTMLDivElement>('chatSqlPanel');
const chatSqlText = getEl<HTMLElement>('chatSqlText');
const chatResultChart = getEl<HTMLDivElement>('chatResultChart');
const chatEmptyResult = getEl<HTMLDivElement>('chatEmptyResult');
const chatResultMeta = getEl<HTMLElement>('chatResultMeta');
const pinnedCharts = getEl<HTMLDivElement>('pinnedCharts');
const pinnedChartList = getEl<HTMLDivElement>('pinnedChartList');
const llmProvider = getEl<HTMLSelectElement>('llmProvider');
const llmBaseUrl = getEl<HTMLInputElement>('llmBaseUrl');
const llmAccessKey = getEl<HTMLInputElement>('llmAccessKey');
const llmModel = getEl<HTMLInputElement>('llmModel');

let lastSummary: ActivitySummary | null = null;
let selectedDimension: StatsDimension = 'day';
let selectedYear: number = new Date().getFullYear();
let latestWheelItems: FrequencyItem[] = [];
let wheelPage = 1;
const wheelPageSize = 2;
let eventLogPage = 1;
const eventLogPageSize = 50;
let currentPage = 'overview';
let refreshInterval = 5000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let cachedHeatmapCounts: Map<string, number> | null = null;

type ChatMessageRole = 'user' | 'assistant' | 'system';
type ProgressStatus = NonNullable<ChatEntry['status']>;

type ChatRenderState = {
  sqlQuery?: string;
  result?: ChartQueryResult;
};

const visibleChatEntryLimit = 12;
let chatConversations: ChatConversation[] = [];
let activeConversationId: string | null = null;
let activeConversationEntries: ChatEntry[] = [];
let conversationDraft = createDraftConversation();
let lastQueryResult: ChartQueryResult | null = null;
let lastQuerySql = '';
let chatBusy = false;

const themeStorageKey = 'input-activity-theme';

startButton.addEventListener('click', () => void startOrResume());
pauseButton.addEventListener('click', () => void runAction(() => window.tracker.pause()));
stopButton.addEventListener('click', () => void runAction(() => window.tracker.stop()));
getEl<HTMLButtonElement>('refreshLog').addEventListener('click', () => void refreshEventLog());
prevLogPage.addEventListener('click', () => {
  eventLogPage = Math.max(1, eventLogPage - 1);
  void refreshEventLog();
});
nextLogPage.addEventListener('click', () => {
  eventLogPage += 1;
  void refreshEventLog();
});
prevWheelPage.addEventListener('click', () => {
  wheelPage = Math.max(1, wheelPage - 1);
  renderWheelFrequency();
});
nextWheelPage.addEventListener('click', () => {
  wheelPage += 1;
  renderWheelFrequency();
});

for (const button of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  button.addEventListener('click', () => {
    const page = button.dataset.page ?? 'overview';
    switchPage(page);
    if (page === 'events') {
      void refreshEventLog();
    }
  });
}

themeSelect.addEventListener('change', () => {
  const theme = themeSelect.value as ThemeChoice;
  localStorage.setItem(themeStorageKey, theme);
  applyTheme(theme);
  void window.tracker.updateSettings({ theme });
});

for (const button of document.querySelectorAll<HTMLButtonElement>('.segment')) {
  button.addEventListener('click', () => {
    selectedDimension = button.dataset.dimension as StatsDimension;
    updateDimensionButtons();
    void refreshStats();
  });
}

prevYear.addEventListener('click', () => {
  selectedYear -= 1;
  void refreshStats();
});
nextYear.addEventListener('click', () => {
  selectedYear += 1;
  void refreshStats();
});

void window.tracker.getSummary().then(async (summary) => {
  const savedTheme = readSavedTheme();
  const resolvedSummary =
    savedTheme && savedTheme !== summary.theme
      ? await window.tracker.updateSettings({ theme: savedTheme })
      : summary;

  renderSummary(resolvedSummary);
  return Promise.all([refreshStats(), refreshEventLog(), initializeChatPage()]);
}).then(() => startRefreshTimer());

window.tracker.onSummary(renderSummary);
window.tracker.onTrackingState((state, message) => {
  renderState(state, message);
});
window.tracker.onInput(() => {
  // Stats and event log are refreshed by periodic timer, not on every keystroke
});

void loadLlmConfig();

getEl<HTMLSelectElement>('refreshInterval').addEventListener('change', function () {
  refreshInterval = Number(this.value);
  startRefreshTimer();
});

sendChat.addEventListener('click', () => void handleChatQuery());
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void handleChatQuery();
  }
});
saveChartBtn.addEventListener('click', () => void handleSaveChart());
newConversationBtn.addEventListener('click', () => void startNewConversation());
deleteConversationBtn.addEventListener('click', () => void handleDeleteConversation());
llmProvider.addEventListener('change', () => void saveLlmConfig());
llmBaseUrl.addEventListener('change', () => void saveLlmConfig());
llmAccessKey.addEventListener('change', () => void saveLlmConfig());
llmModel.addEventListener('change', () => void saveLlmConfig());

const checkUpdateBtn = getEl<HTMLButtonElement>('checkUpdateBtn');
const updateStatusEl = getEl<HTMLElement>('updateStatus');
const updateProgressBar = getEl<HTMLDivElement>('updateProgressBar');
const updateProgressFill = getEl<HTMLDivElement>('updateProgressFill');

checkUpdateBtn.addEventListener('click', () => {
  updateStatusEl.textContent = 'Checking...';
  checkUpdateBtn.disabled = true;
  void window.tracker.checkForUpdates();
});

window.tracker.onUpdateStatus((status) => {
  updateStatusEl.textContent = status.info ?? status.status;
  checkUpdateBtn.disabled = status.status === 'checking' || status.status === 'downloading';
  if (status.status === 'available') {
    checkUpdateBtn.textContent = 'Download Update';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.onclick = () => {
      checkUpdateBtn.disabled = true;
      updateStatusEl.textContent = 'Downloading...';
      void window.tracker.downloadUpdate();
    };
  } else if (status.status === 'downloading' && status.progress !== undefined) {
    updateProgressBar.style.display = '';
    updateProgressFill.style.width = `${status.progress}%`;
    updateStatusEl.textContent = `Downloading... ${status.progress.toFixed(0)}%`;
  } else if (status.status === 'downloaded') {
    checkUpdateBtn.textContent = 'Restart & Install';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.onclick = () => void window.tracker.quitAndInstall();
    updateProgressBar.style.display = 'none';
  } else if (status.status === 'up-to-date') {
    checkUpdateBtn.textContent = 'Check for Updates';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.onclick = null;
    updateProgressBar.style.display = 'none';
  } else if (status.status === 'error') {
    checkUpdateBtn.textContent = 'Check for Updates';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.onclick = null;
    updateProgressBar.style.display = 'none';
  } else if (status.status === 'checking') {
    updateProgressBar.style.display = 'none';
  }
});

async function loadLlmConfig(): Promise<void> {
  try {
    const config = await window.tracker.getLlmConfig();
    if (config) {
      llmProvider.value = config.provider;
      llmBaseUrl.value = config.baseUrl;
      llmAccessKey.value = config.accessKey;
      llmModel.value = config.model;
    }
  } catch {
    // LLM config not set yet
  }
}

async function saveLlmConfig(): Promise<void> {
  await window.tracker.setLlmConfig({
    provider: llmProvider.value as 'openai' | 'anthropic',
    baseUrl: llmBaseUrl.value,
    accessKey: llmAccessKey.value,
    model: llmModel.value
  });
}

async function initializeChatPage(): Promise<void> {
  await refreshChatConversations();
  if (chatConversations.length > 0) {
    await loadConversation(chatConversations[0].id);
    return;
  }
  conversationDraft = createDraftConversation();
  activeConversationId = null;
  activeConversationEntries = [];
  renderChatConversationList();
  renderChatConversationHeader();
  renderChatTranscript();
  renderChatResult();
}

async function refreshChatConversations(): Promise<void> {
  chatConversations = await window.tracker.getChatConversations();
  renderChatConversationList();
  renderChatConversationHeader();
}

async function loadConversation(conversationId: string): Promise<void> {
  const detail = await window.tracker.getChatConversation(conversationId);
  if (!detail) {
    await refreshChatConversations();
    if (chatConversations.length === 0) {
      activeConversationId = null;
      activeConversationEntries = [];
      conversationDraft = createDraftConversation();
      renderChatConversationHeader();
      renderChatTranscript();
      renderChatResult();
      return;
    }
    await loadConversation(chatConversations[0].id);
    return;
  }

  activeConversationId = detail.conversation.id;
  activeConversationEntries = detail.entries;
  conversationDraft = detail.conversation;
  lastQuerySql = getLatestSql(detail.entries);
  lastQueryResult = null;
  renderChatConversationList();
  renderChatConversationHeader();
  renderChatTranscript();
  renderChatResult();
}

async function startNewConversation(): Promise<void> {
  activeConversationId = null;
  activeConversationEntries = [];
  conversationDraft = createDraftConversation();
  lastQueryResult = null;
  lastQuerySql = '';
  chartTitle.value = '';
  renderChatConversationList();
  renderChatConversationHeader();
  renderChatTranscript();
  renderChatResult({});
  chatInput.focus();
}

async function ensureActiveConversation(firstPrompt: string): Promise<string> {
  if (activeConversationId) {
    return activeConversationId;
  }

  const now = Date.now();
  const conversation: ChatConversation = {
    ...conversationDraft,
    title: buildConversationTitle(firstPrompt),
    summary: '',
    createdAt: now,
    updatedAt: now
  };

  await window.tracker.createChatConversation(conversation);
  activeConversationId = conversation.id;
  conversationDraft = conversation;
  await refreshChatConversations();
  renderChatConversationHeader();
  return conversation.id;
}

async function handleChatQuery(): Promise<void> {
  const query = chatInput.value.trim();
  if (!query) {
    return;
  }

  const config = await window.tracker.getLlmConfig();
  if (!config || !config.accessKey) {
    appendLocalChatEntry(createMessageEntry(activeConversationId ?? conversationDraft.id, 'system', 'Please configure LLM settings in the Config page first.'));
    renderChatTranscript();
    return;
  }

  const conversationId = await ensureActiveConversation(query);
  const userEntry = createMessageEntry(conversationId, 'user', query);
  const preparingEntry = createProgressEntry(conversationId, 'Preparing request', 'running');
  appendLocalChatEntry(userEntry, preparingEntry);
  await window.tracker.saveChatEntry(userEntry);
  await window.tracker.saveChatEntry(preparingEntry);
  await maybeCompactConversation(conversationId);

  chatInput.value = '';
  setChatBusy(true);

  try {
    await completeProgressEntry(preparingEntry, 'Prepared request');
    const sqlProgress = createProgressEntry(conversationId, 'Generating SQL', 'running');
    appendLocalChatEntry(sqlProgress);
    await window.tracker.saveChatEntry(sqlProgress);

    const sql = await generateSqlFromLlm(query, config);
    lastQuerySql = sql;
    await completeProgressEntry(sqlProgress, 'Generated SQL', { sqlQuery: sql });

    const queryProgress = createProgressEntry(conversationId, 'Running query', 'running', { sqlQuery: sql });
    appendLocalChatEntry(queryProgress);
    await window.tracker.saveChatEntry(queryProgress);

    const result = await window.tracker.executeQuery(sql);
    lastQueryResult = result;
    await completeProgressEntry(queryProgress, `Query returned ${formatCount(result.rows.length)} rows`, { sqlQuery: sql });

    const renderProgress = createProgressEntry(conversationId, 'Rendering result', 'running', { sqlQuery: sql });
    appendLocalChatEntry(renderProgress);
    await window.tracker.saveChatEntry(renderProgress);

    const answerText = buildAssistantSummary(result);
    const answerEntry = createMessageEntry(conversationId, 'assistant', answerText, { sqlQuery: sql });
    appendLocalChatEntry(answerEntry);
    await window.tracker.saveChatEntry(answerEntry);
    await completeProgressEntry(renderProgress, result.rows.length > 0 ? 'Rendered result' : 'Rendered empty result', { sqlQuery: sql });
    renderChatResult({ sqlQuery: sql, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latestProgressEntry = getLatestRenderableProgressEntry(activeConversationEntries);
    if (latestProgressEntry && latestProgressEntry.status !== 'completed') {
      latestProgressEntry.text = message;
      latestProgressEntry.status = 'error';
      appendLocalChatEntry(latestProgressEntry);
      await window.tracker.saveChatEntry(latestProgressEntry);
    } else {
      const errorEntry = createProgressEntry(conversationId, message, 'error');
      appendLocalChatEntry(errorEntry);
      await window.tracker.saveChatEntry(errorEntry);
    }
    chatResult.style.display = 'none';
  } finally {
    await refreshChatConversations();
    renderChatConversationHeader();
    renderChatTranscript();
    setChatBusy(false);
  }
}

async function generateSqlFromLlm(query: string, config: LlmConfig): Promise<string> {
  const schemaPrompt = `You are a SQL generator for a SQLite database tracking keyboard and mouse activity.
The database has the following tables:

1. input_events - records every keyboard and mouse event
   Columns: id(TEXT), ts(INTEGER - unix ms), type(TEXT - key_down/key_up/mouse_down/mouse_up/wheel), device(TEXT - keyboard/mouse), key_code(TEXT), key_label(TEXT), button(TEXT - left/right/middle), wheel_delta_x(REAL), wheel_delta_y(REAL), repeat(INTEGER 0/1), noise(INTEGER 0/1), source(TEXT), created_at(INTEGER)

2. minute_stats - pre-aggregated per-minute stats
   Columns: bucket_start(INTEGER - unix ms), key_down_count, mouse_click_count, wheel_count, active_ms, updated_at

Generate ONLY a SQLite SQL query (SELECT or WITH only) for this request. Output ONLY the SQL, no markdown, no explanation, no code fences.
Request: ${query}`;

  let response: Response;
  if (config.provider === 'anthropic') {
    response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.accessKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: config.model, max_tokens: 1000, messages: [{ role: 'user', content: schemaPrompt }] })
    });
  } else {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.accessKey}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: schemaPrompt }], temperature: 0 })
    });
  }

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let sql: string;
  if (config.provider === 'anthropic') {
    sql = data.content?.[0]?.text ?? '';
  } else {
    sql = data.choices?.[0]?.message?.content ?? '';
  }

  sql = sql.replace(/```sql\s*/gi, '').replace(/```/g, '').trim();

  if (!sql.toUpperCase().startsWith('SELECT') && !sql.toUpperCase().startsWith('WITH')) {
    throw new Error('LLM did not generate a valid SELECT query');
  }

  return sql;
}

function renderChatTranscript(): void {
  chatMessages.innerHTML = '';
  const visibleEntries = getVisibleChatEntries(activeConversationEntries);

  if (visibleEntries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty chatEmptyState';
    empty.textContent = 'Start a conversation to query your activity history.';
    chatMessages.appendChild(empty);
    return;
  }

  for (const entry of visibleEntries) {
    chatMessages.appendChild(buildChatEntryElement(entry));
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function buildChatEntryElement(entry: ChatEntry): HTMLElement {
  const item = document.createElement('div');
  item.className = `chatMessage chat-${entry.role} chat-${entry.kind}`;

  if (entry.kind === 'progress') {
    item.classList.add(`chat-progress-${entry.status ?? 'completed'}`);
    item.innerHTML = `
      <div class="chatMessageHeader">
        <span>${escapeHtml(progressLabel(entry.status ?? 'completed'))}</span>
        <time>${escapeHtml(formatChatTimestamp(entry.createdAt))}</time>
      </div>
      <div>${escapeHtml(entry.text)}</div>
      ${entry.sqlQuery ? `<pre class="chatInlineSql">${escapeHtml(entry.sqlQuery)}</pre>` : ''}
    `;
    return item;
  }

  item.innerHTML = `
    <div class="chatMessageHeader">
      <span>${escapeHtml(messageRoleLabel(entry.role))}</span>
      <time>${escapeHtml(formatChatTimestamp(entry.createdAt))}</time>
    </div>
    <div>${escapeHtml(entry.text).replace(/\n/g, '<br>')}</div>
    ${entry.sqlQuery ? `<pre class="chatInlineSql">${escapeHtml(entry.sqlQuery)}</pre>` : ''}
  `;
  return item;
}

function renderChatResult(state?: ChatRenderState): void {
  const renderState = state ?? restoreChatRenderState(activeConversationEntries);
  lastQuerySql = renderState.sqlQuery ?? '';
  lastQueryResult = state?.result ?? lastQueryResult;
  chartTitle.value = '';

  if (!renderState.sqlQuery) {
    chatResult.style.display = 'none';
    saveChartBtn.disabled = true;
    return;
  }

  chatResult.style.display = '';
  chatSqlPanel.style.display = '';
  chatSqlText.textContent = renderState.sqlQuery;

  if (!renderState.result) {
    chatResultChart.style.display = 'none';
    chatEmptyResult.style.display = 'none';
    chatResultMeta.textContent = 'Latest saved SQL';
    saveChartBtn.disabled = true;
    return;
  }

  chatResultMeta.textContent = `${formatCount(renderState.result.rows.length)} rows · ${formatCount(renderState.result.columns.length)} columns`;
  if (renderState.result.rows.length === 0 || renderState.result.columns.length < 2) {
    chatResultChart.style.display = 'none';
    chatEmptyResult.style.display = '';
    chatEmptyResult.textContent = renderState.result.rows.length === 0 ? 'No rows returned for this query.' : 'Not enough columns to draw a chart.';
    saveChartBtn.disabled = false;
    return;
  }

  renderChatChart(renderState.result);
  saveChartBtn.disabled = false;
}

function renderChatChart(result: ChartQueryResult): void {
  const firstCol = result.columns[0];
  const valueCol = result.columns.find((column) => column !== firstCol && typeof result.rows[0]?.[column] === 'number') ?? result.columns[1];
  if (!firstCol || !valueCol) {
    chatResultChart.style.display = 'none';
    chatEmptyResult.style.display = '';
    chatEmptyResult.textContent = 'Not enough columns to draw a chart.';
    return;
  }

  const values = result.rows.map((row) => Number(row[valueCol]) || 0);
  const max = Math.max(1, ...values);
  const totalCols = result.rows.length;

  chatBars.innerHTML = '';
  chatXAxis.innerHTML = '';
  chatBars.style.gridTemplateColumns = `repeat(${Math.max(1, totalCols)}, minmax(4px, 1fr))`;
  chatXAxis.style.gridTemplateColumns = chatBars.style.gridTemplateColumns;

  for (const row of result.rows) {
    const value = Number(row[valueCol]) || 0;
    const height = Math.max(4, (value / max) * 96);
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--bar-height', `${height}px`);
    bar.title = `${String(row[firstCol])} - ${value} events`;
    bar.innerHTML = `${value > 0 ? `<span class="barValue">${formatCount(value)}</span>` : ''}<i></i>`;
    chatBars.appendChild(bar);

    const label = document.createElement('span');
    label.textContent = String(row[firstCol]);
    label.title = String(row[firstCol]);
    chatXAxis.appendChild(label);
  }

  chatResultChart.style.display = '';
  chatEmptyResult.style.display = 'none';
}

async function handleSaveChart(): Promise<void> {
  const title = chartTitle.value.trim();
  if (!title || !lastQueryResult || !lastQuerySql) {
    return;
  }
  await window.tracker.saveChart({
    id: crypto.randomUUID(),
    title,
    sqlQuery: lastQuerySql,
    chartType: 'bar',
    pinned: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  if (activeConversationId) {
    const savedEntry = createProgressEntry(activeConversationId, `Saved chart "${title}"`, 'completed', {
      sqlQuery: lastQuerySql,
      chartTitle: title
    });
    appendLocalChatEntry(savedEntry);
    await window.tracker.saveChatEntry(savedEntry);
    await refreshChatConversations();
    renderChatConversationHeader();
    renderChatTranscript();
  }
  chartTitle.value = '';
}

async function handleDeleteConversation(): Promise<void> {
  if (!activeConversationId) {
    await startNewConversation();
    return;
  }

  await window.tracker.deleteChatConversation(activeConversationId);
  await refreshChatConversations();
  if (chatConversations.length > 0) {
    await loadConversation(chatConversations[0].id);
    return;
  }
  await startNewConversation();
}

async function maybeCompactConversation(conversationId: string): Promise<void> {
  const messageEntries = activeConversationEntries.filter((entry) => entry.kind === 'message');
  if (messageEntries.length <= visibleChatEntryLimit) {
    renderChatTranscript();
    return;
  }

  const compactUntil = messageEntries[messageEntries.length - visibleChatEntryLimit - 1];
  if (!compactUntil) {
    renderChatTranscript();
    return;
  }

  const earliestVisible = messageEntries[0];
  const summaryText = buildConversationSummary(activeConversationEntries, compactUntil.createdAt);
  const summaryEntry: ChatEntry = {
    id: crypto.randomUUID(),
    conversationId,
    kind: 'summary',
    role: 'system',
    text: summaryText,
    rangeStart: earliestVisible?.createdAt,
    rangeEnd: compactUntil.createdAt,
    createdAt: Date.now()
  };

  await window.tracker.compactChatConversation(conversationId, summaryEntry, compactUntil.id);
  const detail = await window.tracker.getChatConversation(conversationId);
  if (!detail) {
    return;
  }
  activeConversationEntries = detail.entries;
  conversationDraft = detail.conversation;
  renderChatTranscript();
}

async function renderPinnedCharts(): Promise<void> {
  const charts = await window.tracker.getSavedCharts();
  const pinned = charts.filter((chart) => chart.pinned);
  pinnedCharts.style.display = pinned.length > 0 ? '' : 'none';
  pinnedChartList.innerHTML = '';

  for (const chart of pinned) {
    const card = document.createElement('div');
    card.className = 'pinnedChartCard';
    const header = document.createElement('div');
    header.className = 'pinnedChartHeader';
    header.innerHTML = `<span>${escapeHtml(chart.title)}</span>`;
    card.appendChild(header);

    try {
      const result = await window.tracker.executeQuery(chart.sqlQuery);
      const firstCol = result.columns[0];
      const valueCol = result.columns.find((c) => c !== firstCol && typeof result.rows[0]?.[c] === 'number') ?? result.columns[1];
      const values = result.rows.map((r) => Number(r[valueCol]) || 0);
      const max = Math.max(1, ...values);
      const body = document.createElement('div');
      body.className = 'bars';
      body.style.gridTemplateColumns = `repeat(${Math.max(1, result.rows.length)}, minmax(4px, 1fr))`;
      for (const row of result.rows) {
        const v = Number(row[valueCol]) || 0;
        const h = Math.max(4, (v / max) * 70);
        const b = document.createElement('div');
        b.className = 'bar';
        b.style.setProperty('--bar-height', `${h}px`);
        b.title = `${String(row[firstCol])} - ${v}`;
        b.innerHTML = '<i></i>';
        body.appendChild(b);
      }
      card.appendChild(body);
    } catch {
      const err = document.createElement('div');
      err.className = 'pinnedChartError';
      err.textContent = 'Failed to load';
      card.appendChild(err);
    }

    const unpin = document.createElement('button');
    unpin.className = 'tinyButton';
    unpin.textContent = 'Unpin';
    unpin.addEventListener('click', async () => {
      await window.tracker.togglePinChart(chart.id);
      void renderPinnedCharts();
    });
    card.appendChild(unpin);
    pinnedChartList.appendChild(card);
  }
}

function createDraftConversation(): ChatConversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    summary: '',
    createdAt: now,
    updatedAt: now
  };
}

function createMessageEntry(
  conversationId: string,
  role: ChatMessageRole,
  text: string,
  extras: Partial<ChatEntry> = {}
): ChatEntry {
  return {
    id: crypto.randomUUID(),
    conversationId,
    kind: 'message',
    role,
    text,
    createdAt: Date.now(),
    ...extras
  };
}

function createProgressEntry(
  conversationId: string,
  text: string,
  status: ProgressStatus,
  extras: Partial<ChatEntry> = {}
): ChatEntry {
  return {
    id: crypto.randomUUID(),
    conversationId,
    kind: 'progress',
    role: 'system',
    text,
    status,
    createdAt: Date.now(),
    ...extras
  };
}

function appendLocalChatEntry(...entries: ChatEntry[]): void {
  for (const entry of entries) {
    const existingIndex = activeConversationEntries.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) {
      activeConversationEntries.splice(existingIndex, 1, entry);
    } else {
      activeConversationEntries.push(entry);
    }
  }
  activeConversationEntries.sort((a, b) => a.createdAt - b.createdAt);
}

async function completeProgressEntry(
  entry: ChatEntry,
  text: string,
  extras: Partial<ChatEntry> = {}
): Promise<void> {
  entry.text = text;
  entry.status = 'completed';
  Object.assign(entry, extras);
  appendLocalChatEntry(entry);
  await window.tracker.saveChatEntry(entry);
}

function getLatestSql(entries: ChatEntry[]): string {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const sql = entries[index]?.sqlQuery;
    if (sql) {
      return sql;
    }
  }
  return '';
}

function restoreChatRenderState(entries: ChatEntry[]): ChatRenderState {
  const sqlQuery = getLatestSql(entries);
  return sqlQuery ? { sqlQuery } : {};
}

function buildAssistantSummary(result: ChartQueryResult): string {
  if (result.rows.length === 0) {
    return 'I ran the query, but it returned no rows.';
  }

  const firstColumn = result.columns[0];
  const numericColumn = result.columns.find((column) => typeof result.rows[0]?.[column] === 'number');
  if (!firstColumn || !numericColumn) {
    return `I ran the query and got ${formatCount(result.rows.length)} rows.`;
  }

  const preview = result.rows
    .slice(0, 3)
    .map((row) => `${String(row[firstColumn])}: ${formatCount(Number(row[numericColumn]) || 0)}`)
    .join(', ');
  return `I ran the query and got ${formatCount(result.rows.length)} rows. Top results: ${preview}.`;
}

function progressLabel(status: ProgressStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Working';
    case 'error':
      return 'Error';
    default:
      return 'Done';
  }
}

function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function messageRoleLabel(role: ChatMessageRole): string {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'Assistant';
    default:
      return 'System';
  }
}

function getVisibleChatEntries(entries: ChatEntry[]): ChatEntry[] {
  const summaryEntries = entries.filter((entry) => entry.kind === 'summary');
  const nonSummaryEntries = entries.filter((entry) => entry.kind !== 'summary');
  return [...summaryEntries, ...nonSummaryEntries.slice(-visibleChatEntryLimit)];
}

function getLatestRenderableProgressEntry(entries: ChatEntry[]): ChatEntry | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry?.kind === 'progress') {
      return entry;
    }
  }
  return null;
}

function buildConversationTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  return normalized.length <= 48 ? normalized : `${normalized.slice(0, 45)}...`;
}

function buildConversationSummary(entries: ChatEntry[], throughTimestamp: number): string {
  const source = entries
    .filter((entry) => entry.createdAt <= throughTimestamp && entry.kind === 'message')
    .slice(-6)
    .map((entry) => `${messageRoleLabel(entry.role)}: ${entry.text.replace(/\s+/g, ' ').trim()}`);
  return source.length > 0 ? `Earlier discussion: ${source.join(' | ')}` : 'Earlier discussion summary';
}

function renderChatConversationList(): void {
  chatConversationList.innerHTML = '';

  if (chatConversations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty chatConversationEmpty';
    empty.textContent = 'No saved conversations yet.';
    chatConversationList.appendChild(empty);
    return;
  }

  for (const conversation of chatConversations) {
    const title = conversation.title.trim() || 'Untitled conversation';
    const summary = conversation.summary.trim() || 'Ask about your keyboard or mouse activity.';
    const button = document.createElement('button');
    button.className = 'chatConversationItem';
    if (conversation.id === activeConversationId) {
      button.classList.add('active');
    }
    button.innerHTML = `
      <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
      <span title="${escapeHtml(summary)}">${escapeHtml(summary)}</span>
      <time>${escapeHtml(formatChatTimestamp(conversation.updatedAt))}</time>
    `;
    button.addEventListener('click', () => {
      void loadConversation(conversation.id);
    });
    chatConversationList.appendChild(button);
  }
}

function renderChatConversationHeader(): void {
  const activeConversation = activeConversationId
    ? chatConversations.find((conversation) => conversation.id === activeConversationId) ?? conversationDraft
    : conversationDraft;
  const title = activeConversation.title.trim() || 'New conversation';
  const summary = activeConversation.summary.trim() || 'Describe what you want to see about your activity data';
  chatConversationTitle.textContent = title;
  chatConversationMeta.textContent = summary;
  deleteConversationBtn.disabled = !activeConversationId || chatBusy;
}

function setChatBusy(busy: boolean): void {
  chatBusy = busy;
  sendChat.disabled = busy;
  chatInput.disabled = busy;
  saveChartBtn.disabled = busy || !lastQueryResult || !lastQuerySql;
  newConversationBtn.disabled = busy;
  deleteConversationBtn.disabled = busy || !activeConversationId;
}


async function startOrResume(): Promise<void> {
  await runAction(async () => {
    const state = lastSummary?.trackingState;
    if (state === 'paused' || state === 'blocked') {
      return window.tracker.resume();
    }
    return window.tracker.start();
  });
}

async function runAction(action: () => Promise<unknown>): Promise<void> {
  try {
    permission.textContent = '';
    await action();
  } catch (error) {
    permission.textContent = error instanceof Error ? error.message : String(error);
  }
}

function renderSummary(summary: ActivitySummary): void {
  lastSummary = summary;
  keys.textContent = formatCount(summary.today.keyDownCount);
  clicks.textContent = formatCount(summary.today.mouseClickCount);
  wheels.textContent = formatCount(summary.today.wheelCount);
  active.textContent = formatDuration(summary.today.activeMs);
  dayKey.textContent = summary.today.dayKey;
  themeSelect.value = summary.theme;
  applyTheme(summary.theme);
  renderState(summary.trackingState, summary.permissionMessage);
}

async function refreshStats(): Promise<void> {
  const referenceTime =
    selectedDimension === 'year' ? new Date(selectedYear, 0, 1).getTime() : undefined;
  const stats = await window.tracker.getStats(selectedDimension, referenceTime);
  renderStats(stats);
}

function renderStats(stats: DimensionStats): void {
  rangeLabel.textContent = `${formatRange(stats)} · ${formatBucketUnit(stats.dimension)}`;
  statKeys.textContent = formatCount(stats.keyTotal);
  statMouse.textContent = formatCount(stats.mouseTotal);
  statWheel.textContent = formatCount(stats.wheelTotal);
  renderKeyboardHeatmap(keyFrequency, stats.keyFrequencies);
  renderFrequencyList(mouseFrequency, stats.mouseButtonFrequencies, stats.mouseTotal, 'No mouse clicks yet');
  latestWheelItems = stats.wheelDirectionFrequencies;
  wheelPage = Math.min(wheelPage, Math.max(1, Math.ceil(latestWheelItems.length / wheelPageSize)));
  renderWheelFrequency();
  renderBars(stats);
}

function renderKeyboardHeatmap(target: HTMLElement, items: FrequencyItem[]): void {
  const counts = new Map(items.map((item) => [normalizeKeyLabel(item.label), item.count]));
  const max = Math.max(1, ...items.map((item) => item.count));

  // Cache current counts so old data is never cleared before new data is ready
  if (counts.size > 0) {
    cachedHeatmapCounts = counts;
  }
  const effectiveCounts = counts.size > 0 ? counts : (cachedHeatmapCounts ?? counts);

  const fragment = document.createDocumentFragment();
  const keyboard = document.createElement('div');
  keyboard.className = 'keyboardHeatmap';

  for (const row of keyboardLayout) {
    const rowElement = document.createElement('div');
    rowElement.className = 'keyboardRow';
    rowElement.style.gridTemplateColumns = row.map((key) => `${keyboardKeyWeight(key)}fr`).join(' ');

    for (const key of row) {
      const count = effectiveCounts.get(normalizeKeyLabel(key.label)) ?? 0;
      const intensity = count > 0 ? 0.16 + (count / max) * 0.84 : 0;
      const keyElement = document.createElement('div');
      keyElement.className = `keyboardKey ${key.size ?? ''}`;
      keyElement.style.setProperty('--key-intensity', String(intensity));
      keyElement.title = `${key.label}: ${formatCount(count)} presses`;
      keyElement.innerHTML = `
        <span>${escapeHtml(key.label)}</span>
        ${count > 0 ? `<b>${formatCount(count)}</b>` : ''}
      `;
      rowElement.appendChild(keyElement);
    }

    keyboard.appendChild(rowElement);
  }

  fragment.appendChild(keyboard);
  target.innerHTML = '';
  target.appendChild(fragment);
}

function keyboardKeyWeight(key: KeyboardKey): number {
  if (key.size === 'space') {
    return 8;
  }

  if (key.size === 'wider') {
    return 1.8;
  }

  if (key.size === 'wide') {
    return 1.35;
  }

  return 1;
}

function renderWheelFrequency(): void {
  const totalPages = Math.max(1, Math.ceil(latestWheelItems.length / wheelPageSize));
  wheelPage = Math.max(1, Math.min(totalPages, wheelPage));
  const start = (wheelPage - 1) * wheelPageSize;
  const pageItems = latestWheelItems.slice(start, start + wheelPageSize);
  wheelPageLabel.textContent = `${wheelPage} / ${totalPages}`;
  prevWheelPage.disabled = wheelPage <= 1;
  nextWheelPage.disabled = wheelPage >= totalPages;
  const total = latestWheelItems.reduce((sum, item) => sum + item.count, 0);
  renderFrequencyList(wheelFrequency, pageItems, total, 'No wheel events yet');
}

async function refreshEventLog(): Promise<void> {
  const page = await window.tracker.getEventLog(eventLogPage, eventLogPageSize);
  renderEventLog(page);
}

function renderEventLog(page: EventLogPage): void {
  eventList.innerHTML = '';
  eventLogPage = page.page;
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));
  logPageLabel.textContent = `Page ${page.page} / ${totalPages} · ${formatCount(page.total)} events`;
  prevLogPage.disabled = page.page <= 1;
  nextLogPage.disabled = page.page >= totalPages;

  if (page.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No events recorded yet';
    eventList.appendChild(empty);
    return;
  }

  for (const event of page.items) {
    const row = document.createElement('div');
    row.className = `eventRow ${event.device}`;
    row.innerHTML = `
      <span class="eventTime">${escapeHtml(event.timeLabel)}</span>
      <span class="eventInput">${escapeHtml(event.label)}</span>
      <span class="eventDetail">${escapeHtml(event.detail)}</span>
    `;
    eventList.appendChild(row);
  }
}

function renderState(state: TrackingState, message?: string): void {
  stateLabel.textContent = state[0].toUpperCase() + state.slice(1);
  statusDot.dataset.state = state;
  startButton.textContent = state === 'active' ? 'Tracking' : state === 'paused' ? 'Resume' : 'Start';
  startButton.disabled = state === 'active';
  pauseButton.disabled = state !== 'active';
  stopButton.disabled = state === 'stopped';
  permission.textContent = state === 'blocked' ? message ?? 'Input capture is blocked.' : '';
}

function renderBars(stats: DimensionStats): void {
  const buckets = stats.chartBuckets;
  const max = Math.max(1, ...buckets.map(bucketTotal));
  bars.innerHTML = '';
  xAxis.innerHTML = '';
  chartLine.innerHTML = '';
  bars.style.gridTemplateColumns = `repeat(${Math.max(1, buckets.length)}, minmax(4px, 1fr))`;
  xAxis.style.gridTemplateColumns = bars.style.gridTemplateColumns;

  buckets.forEach((bucket, index) => {
    const total = bucketTotal(bucket);
    const height = Math.max(4, (total / max) * 96);
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.setProperty('--bar-height', `${height}px`);
    bar.title = `${bucket.label} - ${formatCount(total)} events`;
    bar.innerHTML = `
      ${total > 0 ? `<span class="barValue">${formatCount(total)}</span>` : ''}
      <i></i>
    `;
    bars.appendChild(bar);

    const axisLabel = document.createElement('span');
    axisLabel.textContent = shouldShowAxisLabel(index, buckets.length) ? bucket.label : '';
    axisLabel.title = bucket.label;
    xAxis.appendChild(axisLabel);
  });

  renderChartLine(buckets, max);
}

function renderChartLine(buckets: DimensionStats['chartBuckets'], max: number): void {
  if (buckets.length === 0) {
    return;
  }

  const points = buckets
    .map((bucket, index) => {
      const x = buckets.length === 1 ? 50 : (index / (buckets.length - 1)) * 100;
      const y = 98 - (bucketTotal(bucket) / max) * 92;
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    })
    .join(' ');

  const circles = buckets
    .map((bucket, index) => {
      const total = bucketTotal(bucket);
      if (total <= 0) {
        return '';
      }
      const x = buckets.length === 1 ? 50 : (index / (buckets.length - 1)) * 100;
      const y = 98 - (total / max) * 92;
      return `<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="1.35"></circle>`;
    })
    .join('');

  chartLine.innerHTML = `
    <polyline points="${points}"></polyline>
    ${circles}
  `;
}

function bucketTotal(bucket: DimensionStats['chartBuckets'][number]): number {
  return bucket.keyDownCount + bucket.mouseClickCount + bucket.wheelCount;
}

function shouldShowAxisLabel(index: number, total: number): boolean {
  if (total <= 12) {
    return true;
  }

  if (index === 0 || index === total - 1) {
    return true;
  }

  if (total <= 24) {
    return index % 3 === 0;
  }

  if (total <= 31) {
    return index % 5 === 0;
  }

  return index % 10 === 0;
}

function renderFrequencyList(
  target: HTMLElement,
  items: FrequencyItem[],
  total: number,
  emptyText: string
): void {
  target.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = emptyText;
    target.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'frequencyRow';
    row.innerHTML = `
      <span class="keyName">${escapeHtml(item.label)}</span>
      <span class="keyCount">${formatCount(item.count)}</span>
      <span class="keyShare">${Math.round(item.share * 100)}%</span>
      <span class="keyBar"><i style="width:${total > 0 ? Math.max(4, item.share * 100) : 0}%"></i></span>
    `;
    target.appendChild(row);
  }
}

function updateDimensionButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.segment')) {
    button.classList.toggle('active', button.dataset.dimension === selectedDimension);
  }
  if (selectedDimension === 'year') {
    yearNav.style.display = '';
    yearLabel.textContent = String(selectedYear);
    const now = new Date();
    nextYear.disabled = selectedYear >= now.getFullYear();
  } else {
    yearNav.style.display = 'none';
  }
}

function switchPage(page: string): void {
  currentPage = page;
  for (const button of document.querySelectorAll<HTMLButtonElement>('.tab')) {
    button.classList.toggle('active', button.dataset.page === page);
  }
  getEl<HTMLElement>('overviewPage').classList.toggle('active', page === 'overview');
  getEl<HTMLElement>('chatPage').classList.toggle('active', page === 'chat');
  getEl<HTMLElement>('eventsPage').classList.toggle('active', page === 'events');
  getEl<HTMLElement>('configPage').classList.toggle('active', page === 'config');
  if (page === 'overview') {
    void renderPinnedCharts();
    startRefreshTimer();
  } else {
    stopRefreshTimer();
  }
}

function startRefreshTimer(): void {
  stopRefreshTimer();
  if (currentPage === 'overview') {
    refreshTimer = setInterval(() => {
      void refreshStats();
      void refreshEventLog();
    }, refreshInterval);
  }
}

function stopRefreshTimer(): void {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function formatRange(stats: DimensionStats): string {
  const start = new Date(stats.rangeStart);
  if (stats.dimension === 'day') {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate()
    ).padStart(2, '0')}`;
  }

  if (stats.dimension === 'month') {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  }

  if (stats.dimension === 'year') {
    return String(start.getFullYear());
  }

  const end = new Date(stats.rangeEnd);
  return `${formatTime(start)}-${formatTime(end)}`;
}

function formatBucketUnit(dimension: StatsDimension): string {
  if (dimension === 'minute') {
    return 'seconds';
  }

  if (dimension === 'hour') {
    return 'minutes';
  }

  if (dimension === 'day') {
    return 'hours';
  }

  if (dimension === 'month') {
    return 'days';
  }

  if (dimension === 'year') {
    return 'months';
  }

  return 'hours';
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function applyTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
}

function readSavedTheme(): ThemeChoice | null {
  const value = localStorage.getItem(themeStorageKey);
  return isThemeChoice(value) ? value : null;
}

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'dark' || value === 'light' || value === 'blue' || value === 'green' || value === 'purple';
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function normalizeKeyLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  const aliases: Record<string, string> = {
    escape: 'esc',
    esc: 'esc',
    backspace: 'delete',
    delete: 'delete',
    return: 'enter',
    enter: 'enter',
    spacebar: 'space',
    space: 'space',
    command: 'cmd',
    meta: 'cmd',
    cmd: 'cmd',
    option: 'opt',
    alt: 'opt',
    opt: 'opt',
    control: 'ctrl',
    ctrl: 'ctrl',
    arrowup: 'up',
    up: 'up',
    arrowdown: 'down',
    down: 'down',
    arrowleft: 'left',
    left: 'left',
    arrowright: 'right',
    right: 'right'
  };
  return aliases[normalized] ?? normalized;
}

function getEl<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as unknown as T;
}

type KeyboardKey = {
  label: string;
  size?: 'wide' | 'wider' | 'space';
};

const keyboardLayout: KeyboardKey[][] = [
  [
    { label: 'Esc', size: 'wide' },
    { label: '1' },
    { label: '2' },
    { label: '3' },
    { label: '4' },
    { label: '5' },
    { label: '6' },
    { label: '7' },
    { label: '8' },
    { label: '9' },
    { label: '0' },
    { label: 'Delete', size: 'wide' }
  ],
  [
    { label: 'Tab', size: 'wide' },
    { label: 'Q' },
    { label: 'W' },
    { label: 'E' },
    { label: 'R' },
    { label: 'T' },
    { label: 'Y' },
    { label: 'U' },
    { label: 'I' },
    { label: 'O' },
    { label: 'P' }
  ],
  [
    { label: 'Caps', size: 'wide' },
    { label: 'A' },
    { label: 'S' },
    { label: 'D' },
    { label: 'F' },
    { label: 'G' },
    { label: 'H' },
    { label: 'J' },
    { label: 'K' },
    { label: 'L' },
    { label: 'Enter', size: 'wide' }
  ],
  [
    { label: 'Shift', size: 'wider' },
    { label: 'Z' },
    { label: 'X' },
    { label: 'C' },
    { label: 'V' },
    { label: 'B' },
    { label: 'N' },
    { label: 'M' },
    { label: 'Up' },
    { label: 'Shift', size: 'wider' }
  ],
  [
    { label: 'Ctrl', size: 'wide' },
    { label: 'Opt', size: 'wide' },
    { label: 'Cmd', size: 'wide' },
    { label: 'Space', size: 'space' },
    { label: 'Left' },
    { label: 'Down' },
    { label: 'Right' }
  ]
];
