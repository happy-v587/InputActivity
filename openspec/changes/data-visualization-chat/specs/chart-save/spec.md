## ADDED Requirements

### Requirement: Save Generated Chart
The system SHALL persist chart configurations so users can revisit them later.

#### Scenario: Save chart with metadata
- **WHEN** user saves a generated chart
- **THEN** the chart title, SQL query, chart type, and creation timestamp are persisted

#### Scenario: View saved charts
- **WHEN** user navigates to saved charts list
- **THEN** all saved charts are shown with their titles and creation dates

#### Scenario: Delete a saved chart
- **WHEN** user deletes a saved chart
- **THEN** the chart is removed from the database

### Requirement: Chart Data Storage
The system SHALL store chart data in a `saved_charts` SQLite table.

#### Scenario: Table schema
- **WHEN** the app initializes or migrates
- **THEN** a `saved_charts` table exists with columns: id, title, sql_query, chart_type, pinned, created_at, updated_at
