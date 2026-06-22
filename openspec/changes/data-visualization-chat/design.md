## Context

This feature adds a natural language chat interface for data visualization. Users describe what they want to see about their activity data, and the app uses an LLM to generate SQL, executes it against the local SQLite database, and renders the results as charts.

## Goals / Non-Goals

**Goals:**
- Chat tab with natural language query input
- LLM integration (OpenAI-compatible and Anthropic API)
- Secure read-only SQL execution
- Chart rendering of query results
- Save and pin charts

**Non-Goals:**
- Real-time streaming of LLM responses (MVP uses request/response)
- Custom chart type selection (auto-detect based on data)

## Decisions

- **LLM client in renderer**: LLM API calls are made from the renderer via HTTPS directly, avoiding IPC overhead. The config (base URL, key) is stored in the main process and exposed via a new IPC channel.
- **Read-only SQL execution**: A new IPC handler `tracker:query-sql` accepts a SELECT-only SQL string. The handler validates the query (rejects non-SELECT statements with a regex check) before executing against the store's DB.
- **Saved charts stored in SQLite**: A new `saved_charts` table in the existing database, avoiding a separate storage file.
- **Chart rendering reuses existing components**: The bar chart rendering logic from App.ts is reused for query results.
- **Phase 1 scope**: Core query-execute-render flow only. Streaming and custom chart types in later phases.

## Risks / Trade-offs

- [LLM-generated SQL] → Validate before execution; read-only guard
- [API key stored in config] → Stored in the existing local config, not exposed via IPC to other apps
- [Large query results] → Limit to 1000 rows; chart summarization
