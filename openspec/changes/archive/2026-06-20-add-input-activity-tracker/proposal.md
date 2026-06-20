## Why

Users need a lightweight way to understand their daily keyboard and mouse activity without manually tracking time at the computer. Capturing input activity and aggregating it into useful time-based statistics enables visibility into typing/clicking frequency, active computer time, and interaction patterns.

## What Changes

- Add a desktop activity tracker that can run as a small always-available app or menu-bar utility.
- Capture global keyboard and mouse input events while tracking is enabled.
- Persist privacy-conscious input metadata, such as event type, timestamp, normalized key/button identifier, and repeat flags.
- Aggregate captured events by minute, hour, and day for key press counts, mouse click counts, scroll counts, and derived active time.
- Estimate computer active time while filtering noise such as long idle gaps and key auto-repeat.
- Provide a compact real-time view for today's activity.
- Provide optional visual feedback, such as colorful flashes or particle bursts, when keyboard or mouse events are captured.

## Capabilities

### New Capabilities

- `input-event-capture`: Captures global keyboard and mouse activity as privacy-conscious timestamped events.
- `activity-analytics`: Aggregates captured events into time-based statistics and estimates active computer time.
- `desktop-activity-visualization`: Presents real-time activity status in a compact desktop/menu-bar interface and triggers visual feedback for input events.

### Modified Capabilities

- None.

## Impact

- Adds a TypeScript desktop application surface, likely using Electron or a similar shell.
- Adds a global input listener integration, which may require a native hook dependency and operating-system permissions.
- Adds local persistence, likely SQLite, for raw events and aggregated statistics.
- Adds renderer UI for live counters, charts, configuration, and visual effects.
- Adds privacy and permissions considerations because global input capture can be sensitive.
