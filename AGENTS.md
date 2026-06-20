# Repository Guidelines

## Project Structure & Module Organization

This is an Electron + TypeScript desktop app for tracking keyboard and mouse activity. Main-process code lives in `src/main`, including input capture, tracking control, analytics, and SQLite storage. Preload bridge code is in `src/preload`, renderer UI code is in `src/renderer`, and shared types/config live in `src/shared`. Tests are in `tests/*.test.ts`. Product/spec notes are under `docs/` and `openspec/`. Build outputs are generated in `dist/` and packaged macOS artifacts in `release/`; do not edit generated output directly.

## Build, Test, and Development Commands

- `npm run dev`: starts the Vite renderer dev server on `127.0.0.1`.
- `npm run dev:electron`: runs Vite, TypeScript watch, and Electron together for local app development.
- `npm run build`: compiles TypeScript and builds renderer assets.
- `npm run typecheck`: runs TypeScript checks without emitting files.
- `npm test`: rebuilds native Node dependencies, then runs Vitest.
- `npm run lint`: runs ESLint for `.ts` and `.tsx` files.
- `npm run mac:dir`: builds and packages a macOS `.app` under `release/mac-arm64`.

Native modules (`better-sqlite3`, `uiohook-napi`) must match the runtime. Use `npm run rebuild:native:electron` for Electron and `npm run rebuild:native:node` for Node-based tests.

## Coding Style & Naming Conventions

Use TypeScript throughout. Keep modules focused by process boundary: Electron main APIs in `src/main`, browser UI in `src/renderer`, and cross-process contracts in `src/shared`. Prefer explicit types for public interfaces and IPC-facing data. Use camelCase for variables/functions, PascalCase for classes/types, and descriptive filenames such as `sqliteEventStore.ts` or `trackingController.ts`. Follow the existing two-space indentation style and run `npm run lint` before submitting changes.

## Testing Guidelines

Vitest is the test framework. Add or update tests in `tests/` when changing analytics, normalization, storage, or controller behavior. Test files should use the existing `*.test.ts` naming pattern. For UI-only changes, still run `npm run typecheck`, `npm run lint`, and `npm run build`; for packaged behavior, run `npm run mac:dir`.

## Commit & Pull Request Guidelines

This repository currently has no commit history, so no established commit convention exists. Use short imperative commit subjects, for example `Add keyboard heatmap view` or `Fix wheel direction aggregation`. Pull requests should include a concise description, validation commands run, screenshots for renderer UI changes, and notes about native dependency or packaging changes when relevant.

## Security & Configuration Tips

The app records local input metadata, so avoid logging raw event streams unnecessarily. Keep database writes and capture permissions local. Do not commit `dist/`, `release/`, local databases, or generated temporary screenshots unless explicitly required.
