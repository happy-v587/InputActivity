## Why

Issue #25 reports two chat usability gaps: (1) after a user saves a generated chart, there is no visible place to find or reopen it unless they happen to pin it to the dashboard, and (2) the inline SQL shown in chat messages cannot be re-run, so users cannot revisit a historical query without retyping the prompt. Both gaps make the chat feature feel like a black hole — work goes in, but it is hard to recover.

## What Changes

- Add a "Saved Charts" panel inside the chat sidebar listing every saved chart (pinned or not), with actions: Open (re-run SQL into the chat result panel), Pin/Unpin, Delete.
- Refresh the saved-charts list after save / pin / delete so the sidebar always reflects current state.
- Wrap each inline SQL block in chat messages (both `progress` and `message` entries with `sqlQuery`) in a container with a "Run" button that re-executes the SQL and renders the result in the chat result panel.
- Surface re-run errors in the existing `chatEmptyResult` area instead of dropping them silently.
- Add an automated test asserting that a non-pinned saved chart is still returned by `getSavedCharts()` (locks the "save means findable" invariant).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `chat-query`: chat messages that carry a SQL query now expose a re-run affordance, and re-run results render in the shared chat result panel.
- `chart-save`: saved charts are listed inside the chat sidebar with open / pin / delete actions, so non-pinned charts are no longer invisible after saving.

## Impact

- `src/renderer/App.ts` — new sidebar section + run buttons in `buildChatEntryElement`; new `renderSavedChartsList` and `handleOpenSavedChart` helpers; refresh hookups in `handleSaveChart` and existing pin/delete call sites.
- `src/renderer/styles.css` — minor styles for the saved-charts list and the inline SQL Run button.
- `tests/sqliteEventStore.test.ts` — one new assertion for non-pinned chart visibility.
- No IPC, preload, main, or schema changes — all required APIs (`getSavedCharts`, `executeQuery`, `togglePinChart`, `deleteChart`) already exist.
