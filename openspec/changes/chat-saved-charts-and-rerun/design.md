## Context

The chat feature (`src/renderer/App.ts` plus the IPC surface in `src/main` and `src/preload`) already supports LLM-driven SQL generation, read-only execution, chart rendering, and saving charts to the `saved_charts` SQLite table. Two UX gaps are reported in issue #25:

1. `handleSaveChart` stores a chart with `pinned: 0`. The only place charts are surfaced is `renderPinnedCharts`, which filters on `chart.pinned`. Non-pinned saved charts are therefore invisible after save — there is no list view, even though `chart-save` spec scenario "View saved charts" already requires one.
2. `buildChatEntryElement` renders `entry.sqlQuery` as a bare `<pre class="chatInlineSql">`. Historical SQL cannot be re-run; the user must retype the natural-language prompt.

All required data APIs already exist on the tracker bridge: `getSavedCharts()`, `executeQuery(sql)`, `togglePinChart(id)`, `deleteChart(id)`. No schema, IPC, or main-process changes are needed.

## Goals / Non-Goals

**Goals:**
- Make every saved chart discoverable and re-openable from the chat page, regardless of pin state.
- Let users re-run any inline SQL shown in chat history with a single click.
- Keep the change renderer-local; no new IPC channels, no DB migration.

**Non-Goals:**
- Editing or renaming saved charts (delete + re-save is sufficient for v1).
- Re-running SQL from the dashboard pinned-chart cards (out of scope; the dashboard already re-renders them on load).
- Chart-type switching on re-run (re-run reuses the existing bar renderer).
- Persisting re-run results as new chat entries (re-run only updates the chat result panel; it does not append to the transcript).

## Decisions

### D1: Saved-charts list lives inside the chat sidebar, not as a new top-level tab
**Choice:** Add a "Saved Charts" section under the existing conversations list in `chatSidebarPanel`, each section `flex: 1` with its own scroll.
**Alternatives considered:** A new top-level "Library" tab; a modal opened from the chat header.
**Why:** The chat sidebar is already the natural home for "things saved from chat". A new tab would fragment the chat workflow; a modal would hide the list behind a click. The sidebar keeps saved charts one glance away and matches the existing visual language.

### D2: Re-run renders into the shared `chatResult` panel, not inline in the message
**Choice:** Clicking Run on a message's SQL calls `executeQuery` and `renderChatResult({ sqlQuery, result })`, the same path used by `handleChatQuery`. Errors go into `chatEmptyResult`.
**Alternatives considered:** Render a fresh mini-chart inline beneath the message.
**Why:** Reusing `renderChatResult` keeps a single source of truth for chart rendering, stays consistent with the live chat flow, and avoids duplicating the chart-drawing code (which is already 40+ lines). The trade-off is the chart appears at the bottom of the panel, not next to the message — acceptable for v1.

### D3: Run button appears on both `progress` and `message` entries that carry `sqlQuery`
**Choice:** In `buildChatEntryElement`, when `entry.sqlQuery` is set, wrap the `<pre>` in a `.chatInlineSqlWrap` div and append a `<button class="tinyButton chatRunSqlBtn">Run</button>`.
**Why:** Progress entries (Running query, Rendering result) and the final assistant message all carry `sqlQuery`. Excluding progress entries would miss the most common re-run target. The Run button is disabled while `chatBusy` is true (a query is in flight).

### D4: Saved-charts list refresh hooks
**Choice:** Call `renderSavedChartsList()` at the end of `handleSaveChart`, inside the existing pin/unpin and delete handlers in `renderPinnedCharts`, and on `loadConversation` / `initializeChatPage`.
**Why:** Keeps the sidebar in sync without introducing a global event bus. `renderPinnedCharts` already calls `getSavedCharts` for the dashboard, so the data is fresh.

### D5: Lock the "non-pinned saved chart is findable" invariant with a unit test
**Choice:** Add a test in `tests/sqliteEventStore.test.ts` next to the existing "maps saved chart rows back to camelCase fields" test, asserting that after saving with `pinned: 0`, `getSavedCharts()` returns the chart.
**Why:** The original bug was that the renderer filtered out non-pinned charts. A storage-level test cannot catch a renderer filter, but it locks the storage contract so a future "only return pinned" regression at the store layer would fail loudly. The renderer behavior is covered by manual verification.

## Risks / Trade-offs

- **Sidebar height pressure** with many conversations + many saved charts. → Both lists scroll independently with `overflow-y: auto`; each capped by `min-height: 0` inside the flex column.
- **Re-run on stale schema** (e.g. saved chart references a column that was renamed). → `executeQuery` already surfaces SQL errors; re-run shows them in `chatEmptyResult`. No new failure mode.
- **Run button visual noise** on every SQL-bearing message. → Use `tinyButton` styling, place beneath the `<pre>`, keep it small. Acceptable trade-off for the affordance.
- **No persisted re-run history** — re-running does not append a chat entry, so the action is ephemeral. → Intentional (Non-Goal); keeps transcript clean and avoids duplicates of the original progress entries.

## Migration Plan

None. No schema or IPC changes; the change is renderer-only plus one storage test. Rollback is `git revert`.
