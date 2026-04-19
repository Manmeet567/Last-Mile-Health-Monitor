# Last Mile

Last Mile is a privacy-first, local-only desk-health companion built for the **MeDo hackathon**. It combines browser-based posture tracking, local symptom check-ins, combined history review, and calm session summaries so users can understand how desk sessions are going without sending camera or health data to a backend.

## Product Summary

Last Mile currently focuses on:

- webcam-based posture tracking in the browser
- stabilized posture feedback for a front-facing desk setup
- calm nudges and break detection during live sessions
- local symptom check-ins and symptom history
- combined posture + symptom history by local day
- completed-session summaries with:
  - label-only session quality
  - up to 2 short insights
  - 1 reflection line
  - 1 recovery suggestion

Current product boundaries:

- all core logic stays local in the browser
- there is no application backend
- there is no medical diagnosis or predictive medical behavior
- there is no MeDo integration in the current implementation

## Current UI

The app uses a premium dark desktop-first shell with responsive mobile support.

Main sections:

- `Overview`
- `Posture`
- `Symptoms`
- `History`
- `Project Overview`

Utility pages:

- `Onboarding`
- `Settings`
- `Privacy`

## Core Runtime Architecture

The main posture flow is:

`camera -> browser worker -> MoveNet -> posture features -> rule-based classification -> stabilized displayed state -> behavior engine -> session intelligence -> IndexedDB -> UI`

Key runtime layers:

- **Pose inference:** TensorFlow.js + MoveNet in a browser worker
- **Posture processing:** rule-based seated-posture classification for front-facing webcam use
- **Stabilization:** separates raw/runtime posture from calmer displayed posture
- **Frame quality gating:** avoids misleading posture labels when the user is not well framed
- **Behavior engine:** tracks slouch duration, nudges, breaks, and live session metrics
- **Session intelligence:** converts live behavior into compact session summaries, insights, reflection, and recovery text
- **Persistence:** Dexie / IndexedDB for all app data

## Implemented Milestones

- **Phase 0:** cleanup and stabilization complete
- **Milestone 1:** complete
  - symptom input
  - symptom history and summaries
  - combined daily posture + symptom view
  - history filters and persistence
- **Milestone 2:** complete
  - pose stabilization
  - seated-posture accuracy upgrade
- **Milestone 3 through Phase 3.3:** complete
  - smart breaks and nudges
  - session intelligence and insight layer
  - session reflection and recovery layer

## Tech Stack

- `React 18`
- `TypeScript`
- `Vite`
- `React Router`
- `Tailwind CSS`
- `TensorFlow.js`
- `@tensorflow-models/pose-detection` / MoveNet
- `Dexie` / IndexedDB
- `React Hook Form`
- `Zod`
- `Vitest` + React Testing Library
- `Playwright`
- `vite-plugin-pwa`

The repo also includes Firebase Hosting config for static deployment.

## Routes

- `/` overview landing page
- `/dashboard` dashboard summary page
- `/live-monitor` posture page
- `/symptom-check-in` symptoms page
- `/history` history and review
- `/project-overview` product overview
- `/onboarding` calibration flow
- `/settings` reminder settings
- `/privacy` local data controls

## Project Structure

```text
src/
  app/                  app shell and router
  components/           reusable UI pieces
  core/                 posture, inference, history, reminders, metrics
  features/             higher-level runtime feature modules
  hooks/                React integration for camera, pose, reminders, sessions
  pages/                route screens
  storage/              Dexie schema and repositories
  test/                 Vitest coverage
tests/                  Playwright browser tests
```

## Getting Started

### Prerequisites

- `Node.js 20+` recommended
- `npm`
- a modern Chromium-based browser for the live posture flow

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local Vite URL in your browser and allow camera access when prompted.

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` builds the app for production
- `npm run preview` previews the production build
- `npm run lint` runs ESLint
- `npm run lint:fix` runs ESLint with autofix
- `npm run format` formats the repo with Prettier
- `npm run format:check` checks formatting
- `npm run test` runs Vitest
- `npm run test:watch` runs Vitest in watch mode
- `npm run test:e2e` runs Playwright browser tests

## Verification

Current standard verification commands:

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

## Known Limitations

- live-monitor browser automation still uses mocked media input and mocked pose frames
- there is no real hardware-webcam automated end-to-end test yet
- privacy export is JSON-only
- reminder recovery history is not persisted across full app restarts
- the Zustand store is still minimal scaffolding rather than the main state layer
- all posture/session/symptom intelligence remains descriptive only, not medical or predictive

## Contributor Notes

- keep the app local-first unless a task explicitly changes product direction
- do not add backend dependencies unless explicitly requested
- do not add medical diagnosis, prediction, or serious-mode behavior unless explicitly requested
- preserve the current premium dark UI direction unless a task explicitly asks for a visual change
- update the handoff docs when meaningful milestones are completed

## Project Docs

Read these in this order for implementation context:

1. [`project-context.md`](./project-context.md)
2. [`project-history.md`](./project-history.md)
3. [`next-steps.md`](./next-steps.md)

Additional planning/reference docs still in the repo:

- [`last-mile-implementation-plan-tech-finalization.md`](./last-mile-implementation-plan-tech-finalization.md)
- [`last-mile-full-implementation-plan.md`](./last-mile-full-implementation-plan.md)
