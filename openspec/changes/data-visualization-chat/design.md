## Context

This feature adds a natural language chat interface for data visualization. Users describe what they want to see about their activity data, and the app uses an LLM to generate SQL, executes it against the local SQLite database, and renders the results as charts.

Issue #7 expands that scope to make chat practical for ongoing use: the transcript must occupy more of the screen, visible progress must be shown while work is happening, conversations must persist across restarts, and long histories must stay usable through compaction without losing stored records.

## Goals / Non-Goals

**Goals:**
- Chat tab with natural language query input
- LLM integration (OpenAI-compatible and Anthropic API)
- Secure read-only SQL execution
- Chart rendering of query results
- Save and pin charts
- Conversation history with new conversation and delete actions
- Visible progress events that describe what the app is doing without exposing hidden model reasoning
- Transcript compaction that summarizes older messages while preserving the full stored conversation

**Non-Goals:**
- Revealing hidden chain-of-thought or internal model reasoning
- Real-time token streaming of LLM responses (request/response progress events are enough for now)
- Custom chart type selection (auto-detect based on data)

## Decisions

- **LLM client in renderer**: LLM API calls are made from the renderer via HTTPS directly, avoiding IPC overhead. The config (base URL, key) is stored in the main process and exposed via a new IPC channel.
- **Read-only SQL execution**: A new IPC handler `tracker:query-sql` accepts a SELECT-only SQL string. The handler validates the query (rejects non-SELECT statements with a regex check) before executing against the store's DB.
- **Saved charts stored in SQLite**: A new `saved_charts` table in the existing database, avoiding a separate storage file.
- **Chat history stored in SQLite**: Conversations, transcript entries, and compaction summaries are stored locally in the same database so history survives restarts.
- **Visible progress instead of hidden reasoning**: The chat timeline records user-safe execution steps such as preparing request, generating SQL, running query, rendering chart, and saving chart. These are rendered as system progress events, not internal reasoning dumps.
- **Compaction preserves stored history**: When a conversation grows beyond a threshold, the app writes a summary entry that covers an older message range and loads the compact summary plus recent messages by default. Original transcript rows remain stored for future replay/debugging.
- **Chart rendering reuses existing components**: The bar chart rendering logic from App.ts is reused for query results.
- **Phase 2 scope**: Focus on conversation lifecycle, compact history, and improved chat UX on top of the core query-execute-render flow.

## Risks / Trade-offs

- [LLM-generated SQL] → Validate before execution; read-only guard
- [API key stored in config] → Stored in the existing local config, not exposed via IPC to other apps
- [Large query results] → Limit to 1000 rows; chart summarization
- [Large transcripts] → Load summaries plus recent messages by default; keep originals in storage to avoid destructive compaction
