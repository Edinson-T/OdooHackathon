# Interfaces

Supabase Auth handles Google OAuth using PKCE, session refresh and local sign-out. Member profiles use the authenticated user ID. The application reads administrator status from app metadata.

The dashboard requests hourly rain estimates for today's elapsed hours in Europe/Brussels from Open-Meteo. It refreshes on entry and every 15 minutes. A failed source displays a status message.

Set `VITE_SENSOR_FEED_URL` to a CORS-enabled HTTPS endpoint returning a JSON array of readings. Use zone IDs from the asset registry's seed data. A flood station reports water level in metres. A disease station reports microbial counts per mL and mosquitoes per trap-day. Supply an ISO timestamp with timezone for each reading.

```json
[{"zoneId":"<zone-id>","type":"flooding","value":1.7,"observedAt":"2026-11-21T09:00:00Z"},
 {"zoneId":"<zone-id>","type":"disease","value":130,"mosquitoes":25,"observedAt":"2026-11-21T09:00:00Z"}]
```

Admin users may also enter measured values in the dashboard. Newer readings supersede older ones at the same station. A threshold crossing creates one event per zone, type and local day. Each affected asset receives a deduplicated job trigger.
