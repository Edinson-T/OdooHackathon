# Architecture

React and TypeScript render the dashboard, registry, asset editor, report form and inspection workflow. Leaflet renders zone outlines, asset pins and environmental stations. The pin picker uses OpenStreetMap tiles.

Supabase handles Google sign-in. The authenticated account mounts a fresh application provider; logout removes the workspace. Asset and job records use a browser-local repository. Tabs on the same origin coordinate writes with Web Locks and receive storage updates. Different browsers and devices hold independent workspaces. Shared deployment requires a server-side repository with access policies and transactional claims.

In live mode the dashboard fetches weather from Open-Meteo and passes it to the repository. The repository applies the rules in `domain/warnings.ts` to each reading: it raises or clears the zone's alert and gives the affected assets a job trigger. The map and the job list read the same alerts. Every threshold sits in `domain/hazardConfig.ts`. Scheduled work is checked on login, after schedule changes and every minute while signed in.

The simulated scenario in `domain/scenario.ts` is the default source of readings. An administrator can switch to live weather. The scenario is a pure function of a seed and the scenario day, so two devices on the same day show the same readings without a shared database. It generates rain and temperature, and a health authority feed that answers yes or no for dengue in each zone. `npm test` runs the checks for these rules in Node, with no browser.
