## ADDED Requirements

### Requirement: Menu-bar or tray presence
The system SHALL provide a persistent menu-bar or tray presence while the application is running.

#### Scenario: App running
- **WHEN** the application is running
- **THEN** the user can access tracking controls and summary activity status from the menu bar or tray

#### Scenario: Tracking status visible
- **WHEN** tracking is active, paused, stopped, or blocked by permissions
- **THEN** the menu-bar or tray surface communicates the current tracking state

### Requirement: Compact real-time activity view
The system SHALL provide a compact activity view for live and same-day statistics.

#### Scenario: Live counters update
- **WHEN** a keyboard or mouse event is captured
- **THEN** the compact activity view updates today's relevant counters without requiring manual refresh

#### Scenario: Same-day summary shown
- **WHEN** the user opens the compact activity view
- **THEN** the system shows today's key press count, mouse click count, wheel count, and estimated active time

#### Scenario: Hourly pattern shown
- **WHEN** enough same-day data exists
- **THEN** the compact activity view can show an hourly activity pattern or chart

### Requirement: Visual input feedback
The system SHALL optionally render visual feedback in response to captured input events.

#### Scenario: Key feedback
- **WHEN** a keyboard event is captured and visual feedback is enabled
- **THEN** the system renders a short visual effect associated with that event

#### Scenario: Mouse feedback
- **WHEN** a mouse click or wheel event is captured and visual feedback is enabled
- **THEN** the system renders a short visual effect associated with that mouse action

#### Scenario: Feedback disabled
- **WHEN** visual feedback is disabled
- **THEN** input capture and analytics continue without rendering effects

### Requirement: Effect controls
The system SHALL provide controls for visual feedback intensity and availability.

#### Scenario: Intensity changed
- **WHEN** the user changes visual feedback intensity
- **THEN** subsequent effects use the selected intensity

#### Scenario: Low-power mode
- **WHEN** the user enables low-power or minimal-effects mode
- **THEN** the system reduces or disables expensive visual effects while preserving tracking

### Requirement: Privacy-visible controls
The system SHALL keep tracking controls visible and easily accessible.

#### Scenario: Immediate pause
- **WHEN** the user chooses pause from the compact view or menu-bar surface
- **THEN** the system stops recording new events immediately

#### Scenario: Clear state display
- **WHEN** the application is capturing global input
- **THEN** the user can see that tracking is active from the application's persistent surface
