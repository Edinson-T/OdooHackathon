# Interfaces

Supabase Auth handles Google OAuth using PKCE, session refresh and local sign-out. Member profiles use the authenticated user ID. The application reads administrator status from app metadata.

The dashboard requests hourly rain and showers in Europe/Brussels from Open-Meteo. It uses the total for today's elapsed hours and the total forecast for the next 24 hours. It refreshes on entry and every 15 minutes while live sources are selected. A failed source displays a status message.

Set `VITE_SENSOR_FEED_URL` to a CORS-enabled HTTPS endpoint returning a JSON array of readings. Use zone IDs from the asset registry's seed data. A flood station reports water level in metres. A mosquito station reports mosquitoes per trap per day. Supply an ISO timestamp with timezone for each reading.

```json
[{"zoneId":"<zone-id>","type":"flooding","value":1.7,"observedAt":"2026-11-21T09:00:00Z"},
 {"zoneId":"<zone-id>","type":"mosquito","value":25,"observedAt":"2026-11-21T09:00:00Z"}]
```

A row of the older `disease` type is still accepted. Its `mosquitoes` count becomes the mosquito reading. Its microbial count is not used.

Admin users may also enter measured values in the dashboard. Alerts raised by them are marked as entered by hand. Newer readings supersede older ones at the same station. A threshold crossing opens one alert per zone and type, which lasts until a reading clears it. Each affected asset receives a deduplicated job trigger. Live readings are set aside while the simulated scenario is selected.
