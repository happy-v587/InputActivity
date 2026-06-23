## 1. Saved Charts Sidebar

- [x] 1.1 Add "Saved Charts" section markup under the conversations list in `chatSidebarPanel` (`src/renderer/App.ts` chat template), with its own header and scroll container
- [x] 1.2 Add `getEl` references for the new saved-charts list container
- [x] 1.3 Implement `renderSavedChartsList()` that fetches `getSavedCharts()` and renders one card per chart with title, timestamp, and Open / Pin-Unpin / Delete buttons
- [x] 1.4 Implement `handleOpenSavedChart(sql, title)` that calls `executeQuery` and `renderChatResult({ sqlQuery, result })`, surfacing errors in `chatEmptyResult`
- [x] 1.5 Wire pin/unpin and delete buttons to `togglePinChart` / `deleteChart`, then refresh both `renderSavedChartsList` and `renderPinnedCharts`
- [x] 1.6 Call `renderSavedChartsList()` in `initializeChatPage`, `loadConversation`, and at the end of `handleSaveChart`
- [x] 1.7 Add CSS for `.chatSavedChartsSection`, `.chatSavedChartCard`, and the action buttons (`src/renderer/styles.css`)

## 2. Inline SQL Run Button

- [x] 2.1 Refactor `buildChatEntryElement` so that when `entry.sqlQuery` is set, the `<pre class="chatInlineSql">` is wrapped in `.chatInlineSqlWrap` with a `Run` button beneath it
- [x] 2.2 Wire the Run button to call `handleOpenSavedChart(entry.sqlQuery, '')` (reuses the same execute+render path)
- [x] 2.3 In `setChatBusy`, disable/enable all `.chatRunSqlBtn` elements based on `busy`
- [x] 2.4 Add CSS for `.chatInlineSqlWrap` and `.chatRunSqlBtn` (`src/renderer/styles.css`)

## 3. Tests

- [x] 3.1 Add a test in `tests/sqliteEventStore.test.ts` asserting that a saved chart with `pinned: 0` is returned by `getSavedCharts()`

## 4. Validation

- [x] 4.1 Run `npm run typecheck`
- [x] 4.2 Run `npm run lint`
- [x] 4.3 Run `npm test`
- [x] 4.4 Run `npm run build`
- [ ] 4.5 Manually exercise: save a chart → see it in sidebar → Open → re-run; click Run on a message SQL → re-run; Pin/Unpin and Delete from sidebar
