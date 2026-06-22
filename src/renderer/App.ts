import './styles.css';
import type {
  ActivitySummary,
  DimensionStats,
  EventLogPage,
  EventLogItem,
  FrequencyItem,
  StatsDimension,
  ThemeChoice,
  TrackingState
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

        <section class="chartPanel" aria-label="activity pattern">
          <div class="chartHeader">
            <div>
              <span>Activity Pattern</span>
              <strong id="rangeLabel"></strong>
            </div>
            <div class="segments" role="tablist" aria-label="statistics dimension">
              <button class="segment active" id="dimensionMinute" data-dimension="minute">Minute</button>
              <button class="segment" id="dimensionHour" data-dimension="hour">Hour</button>
              <button class="segment" id="dimensionDay" data-dimension="day">Day</button>
              <button class="segment" id="dimensionMonth" data-dimension="month">Month</button>
              <button class="segment" id="dimensionYear" data-dimension="year">Year</button>
            </div>
            <div class="yearNav" id="yearNav" style="display:none">
              <button id="prevYear" class="tinyButton" title="Previous year">◀</button>
              <span id="yearLabel"></span>
              <button id="nextYear" class="tinyButton" title="Next year">▶</button>
            </div>
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

let lastSummary: ActivitySummary | null = null;
let selectedDimension: StatsDimension = 'minute';
let selectedYear: number = new Date().getFullYear();
let latestWheelItems: FrequencyItem[] = [];
let wheelPage = 1;
const wheelPageSize = 2;
let eventLogPage = 1;
const eventLogPageSize = 50;

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
  return Promise.all([refreshStats(), refreshEventLog()]);
});
window.tracker.onSummary(renderSummary);
window.tracker.onTrackingState((state, message) => {
  renderState(state, message);
});
window.tracker.onInput(() => {
  void refreshStats();
  void refreshEventLog();
});

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
  target.innerHTML = '';
  const counts = new Map(items.map((item) => [normalizeKeyLabel(item.label), item.count]));
  const max = Math.max(1, ...items.map((item) => item.count));

  const keyboard = document.createElement('div');
  keyboard.className = 'keyboardHeatmap';

  for (const row of keyboardLayout) {
    const rowElement = document.createElement('div');
    rowElement.className = 'keyboardRow';
    rowElement.style.gridTemplateColumns = row.map((key) => `${keyboardKeyWeight(key)}fr`).join(' ');

    for (const key of row) {
      const count = counts.get(normalizeKeyLabel(key.label)) ?? 0;
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

  target.appendChild(keyboard);
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
  for (const button of document.querySelectorAll<HTMLButtonElement>('.tab')) {
    button.classList.toggle('active', button.dataset.page === page);
  }
  getEl<HTMLElement>('overviewPage').classList.toggle('active', page === 'overview');
  getEl<HTMLElement>('eventsPage').classList.toggle('active', page === 'events');
  getEl<HTMLElement>('configPage').classList.toggle('active', page === 'config');
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
