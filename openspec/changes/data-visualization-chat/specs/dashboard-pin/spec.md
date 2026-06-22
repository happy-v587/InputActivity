## ADDED Requirements

### Requirement: Pin Chart to Dashboard
The system SHALL allow charts to be pinned to the home page for quick access.

#### Scenario: Toggle pin status
- **WHEN** user pins a chart
- **THEN** the chart appears in a new "Pinned Charts" section on the home page

#### Scenario: Unpin from dashboard
- **WHEN** user unpins a chart from the dashboard
- **THEN** the chart is removed from the dashboard but still exists in saved charts

### Requirement: Dashboard Display
The home page SHALL display pinned charts with rendered visuals.

#### Scenario: Dashboard shows pinned charts
- **WHEN** the home page loads
- **THEN** any pinned charts are rendered with their most recent data
