# Interfaces

Supabase Auth handles Google OAuth using PKCE, session refresh and local sign-out. Member profiles use the authenticated user ID. The application reads administrator status from app metadata.

When an administrator selects live weather, the dashboard requests hourly rain, showers and temperature in Europe/Brussels from Open-Meteo. It uses the rain total and the highest temperature for today's elapsed hours, and the rain forecast for the next 24 hours. It refreshes on entry and every 15 minutes. A failed source displays a status message. The service is free and needs no key.

The dengue feed stands in for a health authority's interface. It answers yes or no for each zone and gives no number of cases. In the simulated scenario the generator produces the answer. In live mode an administrator sets it by hand, and the alert is marked as entered by hand. No real health service is called.

Newer readings supersede older ones for the same zone and type. A threshold crossing opens one alert per zone and type, which lasts until a reading clears it. Each affected asset receives a deduplicated job trigger. Live readings are set aside while the simulated scenario is selected.

There are no water level gauges or mosquito traps any more, and the app no longer reads a sensor feed.
