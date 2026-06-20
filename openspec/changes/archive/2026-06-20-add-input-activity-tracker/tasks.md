## 1. Project Setup

- [x] 1.1 Scaffold a TypeScript desktop application with Electron main, preload, and renderer processes
- [x] 1.2 Add linting, formatting, type-checking, and test scripts
- [x] 1.3 Add local configuration for tracking defaults, idle threshold, segment tail, visual feedback, and data retention
- [x] 1.4 Define shared TypeScript types for input events, tracking state, aggregate buckets, and UI summaries

## 2. Input Capture

- [x] 2.1 Define the `InputCaptureAdapter` interface and normalized event model
- [x] 2.2 Implement a global keyboard and mouse capture adapter behind the interface
- [x] 2.3 Implement start, pause, resume, and stop lifecycle handling
- [x] 2.4 Detect missing operating-system permissions and surface a blocked tracking state
- [x] 2.5 Normalize keyboard events without storing typed text content by default
- [x] 2.6 Normalize mouse button and wheel events while ignoring pointer movement by default

## 3. Persistence

- [x] 3.1 Add SQLite database initialization and schema versioning
- [x] 3.2 Create tables for raw input events and minute-level aggregate statistics
- [x] 3.3 Implement batched event writes that preserve event order
- [x] 3.4 Implement startup recovery so persisted events remain queryable after restart
- [x] 3.5 Add retention cleanup hooks for future configurable history limits

## 4. Analytics

- [x] 4.1 Implement minute, hour, and day activity count queries
- [x] 4.2 Implement active-time estimation with configurable idle threshold and segment tail
- [x] 4.3 Exclude key auto-repeat and configured duplicate events from primary statistics by default
- [x] 4.4 Implement aggregate recomputation from raw events for a selected date range
- [x] 4.5 Add local-time bucket handling and document the timezone rule

## 5. Desktop UI

- [x] 5.1 Implement menu-bar or tray entry with tracking state and quick controls
- [x] 5.2 Implement compact activity window with today's key, mouse, wheel, and active-time totals
- [x] 5.3 Add same-day hourly activity visualization
- [x] 5.4 Wire main-process tracking and analytics updates to the renderer through IPC
- [x] 5.5 Add visible pause/resume controls from both menu-bar/tray and compact view

## 6. Visual Feedback

- [x] 6.1 Implement optional renderer-side visual effects for keyboard events
- [x] 6.2 Implement optional renderer-side visual effects for mouse click and wheel events
- [x] 6.3 Add visual feedback intensity controls
- [x] 6.4 Add low-power or minimal-effects mode that preserves tracking

## 7. Verification

- [x] 7.1 Add unit tests for event normalization and noise filtering
- [x] 7.2 Add unit tests for minute, hour, day, and active-time analytics
- [x] 7.3 Add persistence tests for database initialization, batched writes, restart reads, and aggregate recomputation
- [x] 7.4 Add renderer tests or manual verification notes for live counter updates and visual feedback toggles
- [x] 7.5 Verify the app clearly reports missing input permissions instead of silently failing
