## ADDED Requirements

### Requirement: Time-bucketed activity counts
The system SHALL aggregate input events into minute, hour, and day buckets.

#### Scenario: Minute aggregation
- **WHEN** events exist within the same calendar minute
- **THEN** the system reports key press, mouse click, and wheel counts for that minute

#### Scenario: Hour aggregation
- **WHEN** the user requests hourly statistics for a day
- **THEN** the system reports per-hour totals derived from captured events or minute aggregates

#### Scenario: Day aggregation
- **WHEN** the user requests daily statistics
- **THEN** the system reports total key presses, mouse clicks, wheel events, and active time for each day

### Requirement: Active time estimation
The system SHALL estimate active computer time from non-noise input events using configurable idle-gap logic.

#### Scenario: Continuous activity
- **WHEN** consecutive non-noise events are separated by no more than the configured idle threshold
- **THEN** the system counts the gap between those events as active time

#### Scenario: Idle gap
- **WHEN** consecutive non-noise events are separated by more than the configured idle threshold
- **THEN** the system does not count the idle gap as active time

#### Scenario: Segment tail
- **WHEN** an active segment ends
- **THEN** the system adds a configurable tail duration to the segment, capped by the idle threshold

### Requirement: Noise filtering
The system SHALL exclude configured noise from primary activity statistics.

#### Scenario: Key auto-repeat excluded
- **WHEN** keyboard events are marked as auto-repeat
- **THEN** the system excludes those events from primary key press counts and active-time estimation by default

#### Scenario: Duplicate event suppression
- **WHEN** duplicate listener events with the same normalized identity occur within the configured duplicate window
- **THEN** the system can suppress duplicates from aggregate statistics

#### Scenario: Raw data preserved
- **WHEN** an event is excluded from primary statistics as noise
- **THEN** the raw event remains available unless the user deletes it through retention controls

### Requirement: Recomputable analytics
The system SHALL be able to recompute aggregate statistics from persisted raw events.

#### Scenario: Idle threshold changed
- **WHEN** the user changes the active-time idle threshold
- **THEN** the system can recompute affected active-time statistics from raw events

#### Scenario: Aggregation logic changed
- **WHEN** a future version changes aggregation or filtering behavior
- **THEN** the system can rebuild affected aggregate rows from raw events

### Requirement: Date and time handling
The system SHALL compute calendar day, hour, and minute buckets using the user's local timezone.

#### Scenario: Local day boundary
- **WHEN** events occur around midnight in the user's local timezone
- **THEN** the system assigns events to the correct local calendar day

#### Scenario: Timezone change
- **WHEN** the user's timezone changes between capture and query time
- **THEN** the system uses a consistent documented timezone rule for historical bucket calculations
