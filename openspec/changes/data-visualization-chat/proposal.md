## Why

Users want to explore their keyboard/mouse activity data using natural language queries and visualize results without writing SQL manually. Adding a chat-driven data visualization feature makes the app more approachable for non-technical users and provides a flexible analytics interface.

The first chat implementation also needs stronger day-to-day usability. Issue #7 calls out a cramped chat layout, lack of visible execution progress, no durable conversation history, and no way to start fresh or remove old conversations. The chat experience needs to feel like a guided agent workflow without exposing hidden model reasoning.

## What Changes

- New "Chat" tab with a dialog interface where users describe their data requirements
- LLM integration (OpenAI/Anthropic compatible API) that converts natural language to SQL
- SQL execution against the local SQLite database
- Chart rendering of query results (reuse existing chart infrastructure)
- Save/load generated charts
- Pin charts to the home page dashboard
- Settings panel for LLM configuration (base URL, accessKey, model, protocol)
- Persisted chat conversations with new conversation and delete history controls
- Visible chat progress events for SQL generation, query execution, and chart rendering
- Transcript compaction that keeps long conversations usable without dropping stored history

## Capabilities

### New Capabilities
- `llm-settings`: LLM provider configuration (OpenAI-compatible / Anthropic API, base URL, accessKey, model)
- `chat-query`: Natural language query interface with SQL generation and execution
- `chart-save`: Persist and manage saved charts
- `dashboard-pin`: Pin saved charts to the home page
- `chat-history`: Persist and manage chat conversations, progress events, and transcript compaction

### Modified Capabilities
<!-- None -->

## Impact

- New renderer pages/tabs
- New LLM client module in preload or renderer
- New SQL query execution path in main process
- Schema changes for saved charts and chat conversation storage
- New IPC handlers for LLM calls, SQL query, chart CRUD, and chat history management
