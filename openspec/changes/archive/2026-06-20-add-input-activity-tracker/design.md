## Context

This repository currently contains only OpenSpec planning artifacts, so this change defines the baseline architecture for a new TypeScript desktop application. The application will run locally, listen to global keyboard and mouse events while enabled, persist privacy-conscious event metadata, and present live and historical activity statistics.

Global input capture is sensitive and platform-dependent. The design therefore treats the listener as an isolated adapter with explicit permission handling and avoids storing typed text content by default.

## Goals / Non-Goals

**Goals:**

- Build a local desktop app using TypeScript for the application, data, and UI layers.
- Support a menu-bar/tray style presence with a compact real-time activity window.
- Capture keyboard and mouse input metadata while tracking is enabled.
- Persist raw events locally and derive minute, hour, and day statistics.
- Estimate active computer time with idle-gap filtering and repeat-event filtering.
- Trigger optional visual feedback such as color flashes or particle bursts from captured events.
- Keep the input listener and storage model privacy-conscious by default.

**Non-Goals:**

- Recording typed text, clipboard content, screenshots, active document contents, or passwords.
- Syncing captured activity to a remote service.
- Implementing employee monitoring, stealth tracking, or hidden background capture.
- Delivering full cross-platform parity in the first implementation; macOS-first behavior is acceptable if the listener remains adapter-based.
- Classifying activity by application or website in the first implementation.

## Decisions

### Use Electron with a TypeScript renderer and main process

Electron provides a practical TypeScript-first desktop shell, menu-bar/tray integration, IPC, packaging, and a rich UI surface for charts and visual effects. Tauri was considered because it is lighter, but it would require Rust for the system-facing backend; that conflicts with the preference to keep the first implementation mostly TypeScript.

The app should still isolate platform-specific code behind interfaces so a future Tauri or native backend remains possible.

### Isolate global input capture behind an adapter

The main process will own input capture through an `InputCaptureAdapter` interface. A concrete adapter can use a native hook dependency such as `uiohook-napi` or a platform-specific package. The rest of the app consumes normalized `InputEvent` records and does not depend directly on the hook library.

This reduces lock-in and lets the app degrade cleanly when OS permissions are missing or a platform hook is unavailable.

### Store metadata, not typed content

Raw events will include timestamp, event type, device kind, normalized key/button identity, repeat flag, and source metadata needed for diagnostics. Printable character text, active window titles, clipboard data, and screenshots are not stored by default.

This preserves useful activity analytics while reducing the risk that the app behaves like a keylogger.

### Use SQLite for local persistence

SQLite is appropriate for an always-on local app because it supports durable storage, efficient time-range queries, transactional batch writes, and easy backup/export options. The first implementation should keep both raw events and derived aggregate tables so live dashboards are fast while historical data can be recomputed if aggregation logic changes.

### Aggregate in time buckets with recomputation support

The analytics layer will maintain minute-level aggregates and derive hour/day views from those buckets. Raw events remain the source of truth. Aggregates can be rebuilt for a selected date range after changing idle thresholds, repeat filtering, or noise handling.

### Estimate active time from event sessions

Active time will be estimated from ordered non-noise events. Consecutive events separated by no more than a configurable idle threshold, defaulting to five minutes, belong to the same active segment. A short tail, defaulting to sixty seconds and capped by the idle threshold, is added to the final event in a segment.

This avoids counting a whole day as active time while still reflecting short pauses during computer use.

### Render visual effects in the UI layer

Input events flow from the main process to the renderer over IPC. The renderer is responsible for live counters, charts, and visual effects using Canvas/WebGL/CSS. This keeps global input capture separate from presentation and allows effects to be disabled without affecting tracking.

## Risks / Trade-offs

- [Risk] Native hook dependencies may fail to build or behave differently across operating systems. -> Mitigation: keep capture behind an adapter, start macOS-first, and document platform support explicitly.
- [Risk] Users may not grant accessibility/input-monitoring permissions. -> Mitigation: detect missing permissions, show clear setup guidance, and avoid silent failure.
- [Risk] Global input metadata can still be sensitive. -> Mitigation: default to local-only storage, avoid typed text capture, provide pause/stop controls, and expose retention controls.
- [Risk] High-frequency events can cause write amplification or UI jank. -> Mitigation: batch database writes, throttle aggregate recomputation, and decouple visual effects from persistence.
- [Risk] Active-time estimates are approximate. -> Mitigation: make idle threshold, tail padding, and repeat filtering configurable; keep raw data so estimates can be recomputed.
- [Risk] Visual effects may distract or consume resources. -> Mitigation: make effects optional, provide intensity controls, and support a low-power mode.

## Migration Plan

This is a new application with no existing runtime data. The first implementation should create the SQLite schema on startup and version future schema changes through explicit migrations.

Rollback for the initial implementation is removing the generated app code and the local database file. Future migrations should keep raw event rows forward-compatible wherever possible.

## Open Questions

- Which operating system should be the first supported target for global input capture: macOS-only, or macOS plus Windows?
- Should printable keys be stored as normalized key codes, coarse categories, or user-configurable labels?
- What default data retention period is appropriate: unlimited local history, 30 days, 90 days, or user-configurable?
- Should mouse movement ever be captured, or should the product remain limited to clicks, button presses, and wheel events?
