# Last Mile Health Monitor

Last Mile Health Monitor is a local-first posture and break-awareness web app built for desk use. It uses webcam-based pose estimation in the browser to monitor posture, calibrate to the user, surface live feedback, log monitoring sessions, and show local history without sending camera data to a backend.

## What It Does

- runs webcam-based posture monitoring directly in the browser
- uses TensorFlow.js MoveNet in a worker for pose inference
- calibrates thresholds to the current user instead of relying on fixed defaults
- classifies posture states such as `GOOD_POSTURE`, `MILD_SLOUCH`, `DEEP_SLOUCH`, `AWAY`, and `NO_PERSON`
- tracks sessions, daily rollups, events, and reminders in IndexedDB
- shows a live monitor, onboarding flow, dashboard, history, settings, and privacy/data controls
- keeps camera processing local to the device

## Core Features

### Live monitor

- camera start/stop and device switching
- live posture state with calmer displayed-state behavior
- reminder banners for posture, break, and recovery nudges
- inference/debug panels for keypoints, thresholds, signal quality, and runtime state

### Calibration

- onboarding flow for collecting baseline posture samples
- user-specific thresholds for slouch, head offset, and shoulder tilt
- persisted calibration profile in IndexedDB

### Analytics and history

- local monitoring sessions and posture-event logging
- daily rollups and cross-midnight aggregation
- dashboard summaries and trends
- history page for saved sessions and event timelines

### Privacy and control

- local JSON export
- clear history, reset calibration, and reset settings
- storage usage snapshot and local data visibility

## Tech Stack

- `React 18`
- `TypeScript`
- `Vite`
- `React Router`
- `Tailwind CSS`
- `TensorFlow.js` + `@tensorflow-models/pose-detection`
- `Dexie` / IndexedDB
- `Zod`
- `React Hook Form`
- `Vitest` + React Testing Library
- `Playwright`
- `vite-plugin-pwa`
- `Firebase Hosting` config is included for static deployment

## App Routes

- `/` dashboard
- `/live-monitor` live posture monitoring
- `/onboarding` calibration flow
- `/history` session history and trends
- `/settings` reminder and app settings
- `/privacy` export and local data controls

## Project Structure

```text
src/
  app/                  app shell, router, store scaffold
  components/           UI building blocks
  core/                 posture, inference, reminders, metrics, history logic
  hooks/                camera, pose stream, calibration, reminders, sessions
  pages/                route screens
  storage/              Dexie schema and repositories
  test/                 Vitest coverage
tests/                  Playwright browser tests
```

## Local-First Architecture

The main runtime flow is:

`camera stream -> video element -> createImageBitmap -> worker -> MoveNet inference -> confidence gating -> normalization -> smoothing -> feature extraction -> posture state machine -> displayed posture state -> reminders/session metrics -> IndexedDB -> dashboard/history/privacy UI`

Important privacy characteristic:
- camera frames and pose processing stay in the browser
- app data is stored locally in IndexedDB
- there is no server-side persistence in the current implementation

## Getting Started

### Prerequisites

- `Node.js 20+` recommended
- `npm`
- a modern Chromium-based browser is recommended for the live monitor

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Open the local Vite URL in your browser and allow camera access when prompted.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Available Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` runs TypeScript build mode and creates the production bundle
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint
- `npm run lint:fix` runs ESLint with autofix
- `npm run format` formats the repo with Prettier
- `npm run format:check` checks formatting
- `npm run test` runs Vitest
- `npm run test:watch` runs Vitest in watch mode
- `npm run test:e2e` runs Playwright browser tests

## Testing

Current automated coverage includes:

- Vitest logic and UI coverage for processing, calibration, state machine behavior, reminders, privacy, selectors, and app shell behavior
- Playwright route smoke coverage
- Playwright live-monitor browser coverage with mocked camera and mocked pose input

Current verification commands:

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Deployment

The repo includes [`firebase.json`](./firebase.json) configured to serve the built `dist` directory as a single-page app.

Typical deployment flow:

```bash
npm run build
firebase deploy
```

If you publish this to Firebase Hosting, make sure the Firebase project is initialized for this repo first.

## Current Status

The milestone roadmap defined in the planning documents is implemented through Milestone 9. After roadmap completion, the project also received several hardening passes:

- bundle reduction through route lazy loading and chunk splitting
- cross-midnight daily aggregation
- PWA dev-warning cleanup
- live-monitor runtime stabilization
- mocked browser automation for the live-monitor flow

For the detailed verified state of the repo, see [`last-mile-project-status.md`](./last-mile-project-status.md).

## Known Limitations

- there is no real hardware-webcam end-to-end test yet; the live-monitor browser test uses mocked media input
- reminder recovery history is not persisted across full app restarts
- privacy export is JSON-only
- `sessionSamples` exists in the schema, but no current runtime feature writes to it
- the Zustand store is mostly a scaffold, not the main application-state layer
- this workspace is not currently a Git repository, so Husky hooks are not active until Git is initialized

## Notes for Contributors

- the project is local-first and browser-first; avoid introducing backend dependencies unless the product direction changes
- live-monitor changes should preserve single in-flight inference behavior and avoid UI flicker/regressions
- if you touch the posture pipeline, update tests around dropout handling, displayed-state stability, and session/reminder behavior
- keep `last-mile-project-status.md` current when implementation state changes

## Planning and Handoff Docs

- [`last-mile-implementation-plan-tech-finalization.md`](./last-mile-implementation-plan-tech-finalization.md)
- [`last-mile-full-implementation-plan.md`](./last-mile-full-implementation-plan.md)
- [`last-mile-project-status.md`](./last-mile-project-status.md)
- [`next-steps.md`](./next-steps.md)
