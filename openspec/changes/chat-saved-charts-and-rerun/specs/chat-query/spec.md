## ADDED Requirements

### Requirement: Re-run Inline SQL from Chat History
The system SHALL attach a Run affordance to every inline SQL block shown in chat messages so users can re-execute historical queries without retyping the natural-language prompt.

#### Scenario: Run button on SQL-bearing messages
- **WHEN** a chat message or progress entry carries a SQL query
- **THEN** the rendered entry shows a Run button beneath the SQL block

#### Scenario: Re-run a historical SQL query
- **WHEN** the user clicks the Run button on an inline SQL block
- **THEN** the system executes the SQL in read-only mode
- **THEN** the chat result panel renders the SQL and the resulting chart

#### Scenario: Re-run fails gracefully
- **WHEN** re-executing an inline SQL fails
- **THEN** the chat result panel surfaces the error in the empty-result area

#### Scenario: Run disabled while chat is busy
- **WHEN** a chat query is in flight
- **THEN** Run buttons on inline SQL blocks are disabled until the in-flight query completes
