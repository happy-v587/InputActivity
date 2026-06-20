# Manual Verification

Use this checklist after installing dependencies and launching the Electron app.

## Live UI and controls

- Start the app with `npm run dev:electron`.
- Open the tray/menu-bar item and verify the compact activity window appears.
- Select Start and verify the state indicator changes to Active when permissions are available.
- Select Pause and verify the state indicator changes to Paused and counters stop changing.
- Select Stop and verify the state indicator changes to Stopped.

## Visual feedback

- Enable Visual feedback and set Intensity above 0.5.
- Press keyboard keys and verify short colorful bursts appear.
- Click or scroll the mouse and verify mouse-triggered bursts appear.
- Disable Visual feedback and verify counters still update while bursts stop.
- Enable Low power and verify tracking continues while expensive visual effects are suppressed.

## Permission handling

- On macOS, remove Accessibility permission for the app and try Start.
- Verify the app enters Blocked state with a permission message instead of showing Active.
- Grant Accessibility permission and try Start again.
- Verify tracking can start without deleting existing event data or reinstalling the app.
