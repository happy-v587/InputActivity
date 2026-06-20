# Keyboard Activity Tracker

Local Electron and TypeScript desktop app for tracking keyboard and mouse activity.

## What it does

- Runs as an Electron desktop app with tray/menu-bar controls.
- Captures global keyboard, mouse button, and wheel metadata while tracking is active.
- Stores local SQLite event data without typed text content by default.
- Aggregates activity by minute, hour, and day.
- Estimates active computer time with idle-gap and repeat-event filtering.
- Shows a compact live dashboard with optional colorful input feedback.
- Shows per-key and per-mouse-button frequency details for the current minute, current hour, and current day.
- Shows a raw event log with the exact local time each key, mouse button, and wheel event was recorded.
- Distinguishes mouse left/right/middle clicks and wheel up/down/left/right directions.
- Uses paginated event logs so large wheel or input histories can be reviewed page by page.
- Runs as a macOS menu-bar/status-bar app when packaged.

## Development

```bash
npm install
npm run dev:electron
```

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Manual UI and permission checks are listed in [docs/manual-verification.md](docs/manual-verification.md).

## macOS packaging

Generate a local `.app` bundle:

```bash
npm run mac:dir
```

The app is written to:

```text
release/mac-arm64/Input Activity.app
```

Generate a `.dmg` installer:

```bash
npm run mac:dmg
```

These local builds are unsigned. On first launch, macOS may require opening the app through Finder's context menu or Privacy & Security settings.

The packaged app is configured as a menu-bar app. It does not stay in the Dock; use the `Input Activity` icon in the macOS menu bar to show the activity window again after closing it.

## Permissions

Global input capture requires operating-system permissions. On macOS, grant Accessibility permission to the packaged app or Electron runtime. If permission is missing, the app enters a blocked state and shows guidance instead of pretending tracking is active.
