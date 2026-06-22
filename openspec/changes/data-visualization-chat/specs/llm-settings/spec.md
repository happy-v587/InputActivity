## ADDED Requirements

### Requirement: LLM Settings Configuration
The system SHALL provide a configuration panel for LLM provider settings.

#### Scenario: Configure OpenAI-compatible API
- **WHEN** user enters base URL, accessKey, and model name
- **THEN** the settings are saved and persisted locally

#### Scenario: Configure Anthropic API
- **WHEN** user selects Anthropic protocol and enters accessKey and model
- **THEN** the settings are saved with anthropic protocol flag

### Requirement: Chat Query Interface
The system SHALL provide a chat interface where users can describe data requirements in natural language.

#### Scenario: Submit a natural language query
- **WHEN** user types a question about their activity data and submits
- **THEN** the system sends the query to the configured LLM
- **THEN** the LLM generates a SQL query
- **THEN** the SQL is executed against the local database
- **THEN** results are displayed as a chart

#### Scenario: Handle LLM error
- **WHEN** the LLM request fails or returns invalid SQL
- **THEN** the system shows a descriptive error message

### Requirement: Chart Saving
The system SHALL allow users to save generated charts for later viewing.

#### Scenario: Save a chart
- **WHEN** user clicks save on a generated chart
- **THEN** the chart configuration (query, title, type) is persisted

#### Scenario: List saved charts
- **WHEN** user opens the saved charts panel
- **THEN** all previously saved charts are displayed

### Requirement: Dashboard Pinning
The system SHALL allow users to pin saved charts to the home page.

#### Scenario: Pin chart to dashboard
- **WHEN** user pins a chart
- **THEN** it appears on the home page dashboard

#### Scenario: Remove chart from dashboard
- **WHEN** user unpins a chart
- **THEN** it is removed from the home page but remains in saved charts
