## ADDED Requirements

### Requirement: Tracking lifecycle
The system SHALL provide an explicit tracking lifecycle with start, pause, resume, and stop states for global input capture.

#### Scenario: Start tracking
- **WHEN** the user enables tracking and required permissions are available
- **THEN** the system starts capturing global keyboard and mouse events

#### Scenario: Pause tracking
- **WHEN** the user pauses tracking
- **THEN** the system stops recording new input events until tracking is resumed

#### Scenario: Stop tracking
- **WHEN** the user stops tracking
- **THEN** the system stops the global listener and records no further input events

### Requirement: Permission-aware capture
The system SHALL detect when operating-system permissions required for global input capture are missing.

#### Scenario: Missing permission
- **WHEN** tracking is enabled but the operating system denies required input permissions
- **THEN** the system does not claim tracking is active and presents permission guidance to the user

#### Scenario: Permission granted after denial
- **WHEN** the user grants the required operating-system permissions
- **THEN** the system can start tracking without requiring data loss or application reinstall

### Requirement: Keyboard event metadata
The system SHALL capture keyboard event metadata without storing typed text content by default.

#### Scenario: Key press captured
- **WHEN** the user presses a keyboard key while tracking is active
- **THEN** the system records a timestamped keyboard event with normalized key identity, event direction, and repeat status

#### Scenario: Printable text privacy
- **WHEN** the user types printable characters while tracking is active
- **THEN** the system does not store the resulting typed text string by default

#### Scenario: Auto-repeat captured
- **WHEN** the operating system emits repeated key events from a held key
- **THEN** the system marks those events with repeat metadata when the listener can identify them

### Requirement: Mouse event metadata
The system SHALL capture mouse button and wheel metadata while excluding mouse movement by default.

#### Scenario: Mouse click captured
- **WHEN** the user clicks a mouse button while tracking is active
- **THEN** the system records a timestamped mouse event with the normalized button identifier

#### Scenario: Mouse wheel captured
- **WHEN** the user scrolls with a mouse wheel or equivalent device while tracking is active
- **THEN** the system records a timestamped wheel event with direction or delta metadata when available

#### Scenario: Mouse movement ignored
- **WHEN** the user moves the pointer without clicking or scrolling
- **THEN** the system does not record a mouse movement event by default

### Requirement: Local event persistence
The system SHALL persist captured input events locally in durable storage.

#### Scenario: Event stored
- **WHEN** a keyboard or mouse event is captured
- **THEN** the system persists the event with a unique identifier, timestamp, type, device kind, normalized input identity, and relevant flags

#### Scenario: Application restart
- **WHEN** the application restarts after events have been captured
- **THEN** previously persisted events remain available for analytics

#### Scenario: Batched writes
- **WHEN** many input events occur in quick succession
- **THEN** the system can batch writes without losing event order
