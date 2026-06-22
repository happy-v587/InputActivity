## Why

The Linux build in CI fails because `uiohook-napi` requires `X11/extensions/Xrandr.h` which is provided by `libxrandr-dev`. This dependency was not listed in the workflow's apt install step.

## What Changes

- Add `libxrandr-dev` to the Linux build dependencies in `.github/workflows/release.yml`

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
<!-- None -->

## Impact

- `.github/workflows/release.yml`: CI pipeline, Linux build job
