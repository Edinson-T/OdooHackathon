# Green Assets

Run Green Assets from this directory with Node 22.12 or later. Install dependencies with `npm ci`, then run `npm run dev`. The default address is http://127.0.0.1:5173. Use `npm run build` for the production bundle, `npm run lint` for static checks and `npm test` for the checks on the alert rules.

## Local demo

With authentication unconfigured, choose a local demo member or administrator. Use the administrator role to place asset pins and record sample sensor measurements. Switch account returns to the role chooser. Hosted Google authentication replaces this chooser once configured.

## Google account setup

In your Supabase project, enable the Google authentication provider. Create a Google OAuth web client with the callback URL displayed by Supabase. Enter its client ID and secret in the provider settings. In Supabase URL Configuration, allow the app's exact origin and callback path, including the development address above. Set these public values in an ignored `.env.local` file and restart Vite:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Google creates a member account on first login. Assign administrators using Supabase's trusted user app metadata field `role: admin`. Switch account signs out the previous local session before opening Google's account chooser.

## Hazard alerts

The overview shows three alerts for each zone: heavy rain, high temperature, and dengue and mosquito. Each states the reading and the threshold that raised it. The thresholds in `src/domain/hazardConfig.ts` are illustrative values and have not been validated. The dengue feed is simulated: the app does not detect or forecast disease.

- **High temperature**, above 30 °C: the zone's farms get an inspection job.
- **Heavy rain**, more than 25 mm in a day: a warning is shown. On the first day the rain is back under the threshold, the zone's solar systems get an inspection job.
- **Dengue and mosquito**: a simulated health authority feed answers yes or no for each zone. A yes shows the alert at once and creates no job.

The simulated scenario is the default data source for every account, and any member can run it. An administrator can switch to live weather from Open-Meteo instead. To present the scenario:

1. Open the overview. Days 1 to 5 are calm and there are no jobs, so this is the moment to show a member reporting a problem by hand. **Check due inspections** on the jobs page then turns the two seeded inspections that are due into jobs.
2. Press **Play**, **Next day** or a later day on the strip. Day 6 turns hot and dengue is reported in the river basin. Day 7 adds a storm, so that zone shows all three alerts at once. Day 8 is the first day after the rain.
3. **Trigger** brings a storm, a heatwave or a dengue report to a chosen zone today.
4. **Restart** returns to day 1 and deletes every job the scenario created. Problems that members reported by hand stay, and due inspections wait for the check again.

The same seed gives the same days on every device.

## Running the field demo

Admins place asset pins inside the selected zone. Members filter reports by asset category and claim one inspection at a time. Records persist in this browser. See [PRD](PRD.md) for the user workflow, [architecture](ARCHITECTURE.md) for deployment boundaries, [API](API.md) for sensor integration, [database](DATABASE.md) for stored records and [decisions](ADR.md) for scheduling and alert assumptions.
