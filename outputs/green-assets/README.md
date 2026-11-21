# Green Assets

Run Green Assets from this directory with Node 22.12 or later. Install dependencies with `npm ci`, then run `npm run dev`. The default address is http://127.0.0.1:5173. Use `npm run build` for the production bundle and `npm run lint` for static checks.

## Local demo

With authentication unconfigured, choose a local demo member or administrator. Use the administrator role to place asset pins and record sample sensor measurements. Switch account returns to the role chooser. Hosted Google authentication replaces this chooser once configured.

## Google account setup

In your Supabase project, enable the Google authentication provider. Create a Google OAuth web client with the callback URL displayed by Supabase. Enter its client ID and secret in the provider settings. In Supabase URL Configuration, allow the app's exact origin and callback path, including the development address above. Set these public values in an ignored `.env.local` file and restart Vite:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Google creates a member account on first login. Assign administrators using Supabase's trusted user app metadata field `role: admin`. Switch account signs out the previous local session before opening Google's account chooser.

## Running the field demo

Admins place asset pins inside the selected zone. Members filter reports by asset category and claim one inspection at a time. Records persist in this browser. See [PRD](PRD.md) for the user workflow, [architecture](ARCHITECTURE.md) for deployment boundaries, [API](API.md) for sensor integration, [database](DATABASE.md) for stored records and [decisions](ADR.md) for scheduling and alert assumptions.
