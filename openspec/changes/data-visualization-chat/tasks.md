## 1. Database & IPC

- [ ] 1.1 Add `saved_charts` table to sqliteEventStore schema
- [ ] 1.2 Add read-only SQL query IPC handler in main process
- [ ] 1.3 Add chart CRUD IPC handlers (save, list, delete, pin)
- [ ] 1.4 Add LLM config IPC handlers (get/set)
- [ ] 1.5 Add chat conversation and message tables to sqliteEventStore schema
- [ ] 1.6 Add chat history IPC handlers (list, create, load, delete, append, compact)

## 2. LLM Settings UI

- [ ] 2.1 Add LLM configuration form to config page
- [ ] 2.2 Support OpenAI-compatible API and Anthropic API protocols

## 3. Chat Query Interface

- [ ] 3.1 Add "Chat" tab page with message input
- [ ] 3.2 Build LLM client module (send query with schema context)
- [ ] 3.3 Parse LLM SQL response and execute query
- [ ] 3.4 Render query results as charts
- [ ] 3.5 Error handling for LLM failures and invalid SQL
- [ ] 3.6 Show visible progress events for request preparation, SQL generation, query execution, and chart rendering
- [ ] 3.7 Add SQL inspection surface for generated queries

## 4. Chat History & Compaction

- [ ] 4.1 Build conversation list with new conversation action
- [ ] 4.2 Persist transcript entries across app restarts
- [ ] 4.3 Add delete conversation/history controls
- [ ] 4.4 Compact long transcripts by storing summary entries while preserving full history rows

## 5. Chart Save & Pin

- [ ] 5.1 Add save chart button
- [ ] 5.2 Build saved charts list UI
- [ ] 5.3 Build dashboard pinned charts section
- [ ] 5.4 Load pinned charts on home page

## 6. Validation

- [ ] 6.1 Add/update automated tests for SQL safety, chart persistence, and chat history storage
- [ ] 6.2 Manually exercise the chat UI, history lifecycle, and compact transcript behavior in Electron
