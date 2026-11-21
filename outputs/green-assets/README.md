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

The overview shows heavy rain, flood and mosquito breeding alerts for each zone, each with the reading and the threshold that raised it. Alerts show where to look first. They are not forecasts of disease. The thresholds in `src/domain/hazardConfig.ts` are illustrative values and have not been validated.

The simulated scenario is the default data source for every account. It generates the weather and marks everything it produces as simulated. Any member can play it, move it on and restart it. An administrator can switch to live sources instead: today's rain and the 24 hour forecast from Open-Meteo, an optional sensor feed and readings entered by hand. To present the scenario:

1. Open the overview. Day 1 forecasts heavy rain, which sends members to clear outlets and drainage. The strip of bars shows the rain of each day: solid for what fell, hatched for the forecast.
2. Press **Next day**, or **Play** to move on a day every second and a half. The storm arrives and the river basin floods. Jobs there stay closed until the water has receded.
3. Keep going, or select a later day on the strip. Mosquito counts rise about a week later, first in the zone the storm did not flush. An asset inspected and found healthy lowers its zone's count.
4. **Trigger storm** brings a storm to a chosen zone at any time. **Restart** returns to day 1 and withdraws the work nobody claimed, so every rehearsal starts the same.

The same seed gives the same weather on every device.

## Running the field demo

Admins place asset pins inside the selected zone. Members filter reports by asset category and claim one inspection at a time. Records persist in this browser. See [PRD](PRD.md) for the user workflow, [architecture](ARCHITECTURE.md) for deployment boundaries, [API](API.md) for sensor integration, [database](DATABASE.md) for stored records and [decisions](ADR.md) for scheduling and alert assumptions.
