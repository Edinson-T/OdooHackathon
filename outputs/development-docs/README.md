# Green Assets — Hackathon Development Guide

Green Assets is a working project name for a 24-hour website demo. Community members report problems with farms, ponds, and solar systems, then claim and complete inspection jobs. An admin maintains the asset registry.

**Package status:** these are development specifications. Application source code and dependency files are not included. Commands below describe how to initialize the planned application; they have not been run against an implementation.

## Read first

| Document | Use it for |
| --- | --- |
| [PRD.md](PRD.md) | Scope, users, acceptance criteria, delivery plan |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, folders, data flow, integration boundaries |
| [API.md](API.md) | Browser service interface and behavior contracts |
| [DATABASE.md](DATABASE.md) | Canonical types, relationships, storage rules |
| [ADR.md](ADR.md) | Decisions and reasons |

## Stack

React, TypeScript, Vite, Tailwind CSS, Leaflet, React Context/useReducer, and localStorage. Run the website locally with Vite for the presentation. All business logic executes in the browser. External map tiles require an internet connection; retain an asset-list fallback.

## Initialize the application — once, by the integration owner

Use Node.js 22.12+ on the 22.x line, or a newer compatible supported release, plus npm and Git. Create the application in an empty parent directory:

```sh
npm create vite@latest green-assets -- --template react-ts
cd green-assets
npm install
npm install leaflet tailwindcss @tailwindcss/vite
npm install -D @types/leaflet
```

Preserve the React plugin when adding Tailwind to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({ plugins: [react(), tailwindcss()] });
```

In the stylesheet imported by `src/main.tsx`, use:

```css
@import "tailwindcss";
@import "leaflet/dist/leaflet.css";
```

Copy these six documents to the new repository root. Commit `package-lock.json`; teammates should use the committed dependency versions. Select a stable Leaflet release compatible with the chosen typings and use documentation for that release. A circle marker can avoid default marker-image configuration work.

Official setup references: [Vite getting started](https://vite.dev/guide/), [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite).

## Run after the initialized app has been shared

From the application repository root:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. No database setup, backend process, credentials, or environment variables are required for the core demo. Map-provider configuration is the only optional external configuration; never embed secret keys in frontend code.

```sh
npm run build
npm run preview
npm run lint
```

These commands assume the standard React/TypeScript Vite scaffold scripts are retained. Build and preview check the application locally; `npm run dev` runs the development demo. Use hash-based navigation, such as `#/jobs`, for the different screens.

## Demo setup and story

Seed 12 fictional assets, two community identities, and one admin identity. Generate inspection dates relative to the current demo date. Use a labeled demo-identity selector; it is not a login system.

1. Admin adds a pond with a future inspection date.
2. Community member A reports a blocked outlet.
3. Community member B claims the resulting job and submits findings.
4. Show that completing an inspection can leave an issue awaiting action.
5. Simulate a flood in another zone and show new jobs.
6. Run the due-inspection check and show an overdue solar asset.
7. Refresh to demonstrate persistence; use Reset demo to rehearse again.

## Before presenting

- Confirm the local build and lint checks pass once implementation exists.
- Complete the acceptance scenarios in PRD.md, including duplicate triggers and claim ownership.
- Check a narrow screen, the local demo URL, refresh behavior, and map failure fallback.
- Keep screenshots and a locally served build available for a connectivity problem.

## Boundaries

Data is local to one browser and origin, and can be cleared by the user. Different devices do not share records. Identity switching and client-side permission checks demonstrate behavior, not security. Present hazards as simulations and use fictional data. A completed inspection is not proof that a reported problem was repaired.
