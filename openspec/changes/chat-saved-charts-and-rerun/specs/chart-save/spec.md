## ADDED Requirements

### Requirement: Saved Charts List in Chat Sidebar
The system SHALL list every saved chart (pinned and non-pinned) inside the chat sidebar so users can find charts they saved without pinning them.

#### Scenario: Saved chart appears in sidebar after save
- **WHEN** the user saves a generated chart with a title
- **THEN** the chart appears in the chat sidebar's saved-charts list
- **THEN** the list shows the chart title and creation timestamp

#### Scenario: Non-pinned chart is visible
- **WHEN** a saved chart has `pinned` set to 0
- **THEN** the chart is still listed in the chat sidebar's saved-charts list

#### Scenario: List refreshes after pin or delete
- **WHEN** the user pins, unpins, or deletes a saved chart from the sidebar
- **THEN** the saved-charts list updates to reflect the new state without a full app restart

### Requirement: Reopen Saved Chart
The system SHALL let users reopen a saved chart from the chat sidebar by re-executing its stored SQL and rendering the result in the chat result panel.

#### Scenario: Open a saved chart
- **WHEN** the user chooses to open a saved chart from the sidebar
- **THEN** the system executes the chart's stored SQL in read-only mode
- **THEN** the chat result panel shows the SQL and the rendered chart

#### Scenario: Open fails gracefully
- **WHEN** re-executing a saved chart's SQL fails
- **THEN** the chat result panel surfaces the error in the empty-result area instead of crashing

### Requirement: Delete Saved Chart from Sidebar
The system SHALL let users delete a saved chart directly from the chat sidebar.

#### Scenario: Delete a saved chart
- **WHEN** the user deletes a saved chart from the sidebar
- **THEN** the chart is removed from the database
- **THEN** the chart no longer appears in the saved-charts list or the dashboard pinned section
