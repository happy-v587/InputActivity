## Context

The Linux CI build in `.github/workflows/release.yml` fails because `uiohook-napi` native module compilation requires `libxrandr-dev`. The workflow already installs other X11 dev libraries but misses this one.

## Goals / Non-Goals

**Goals:**
- Fix the Linux build in CI by adding the missing system dependency

**Non-Goals:**
- No changes to application code or build scripts
- No changes to other platforms (macOS, Windows)

## Decisions

- **Add `libxrandr-dev`** to existing apt install step rather than creating a separate step — keeps the workflow concise and the dependency colocated with other X11 libs.

## Risks / Trade-offs

- None. This is a single package addition to an existing CI step.
