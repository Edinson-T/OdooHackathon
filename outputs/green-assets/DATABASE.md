# Data model

Supabase stores Google account identities and sessions. The local workspace stores a profile keyed by the Supabase user ID so assignments and reports survive sign-out.

The version-one snapshot contains zones, assets, complaints, jobs, users, environmental readings, hazard events and the scenario state. Assets store a zone, pin coordinates, inspection interval and due date. Jobs store triggers, assignment, checklist snapshot, answers, observed condition and completion notes. Older priority fields are discarded when reading saved records; historical critical conditions remain readable.

Readings are keyed by zone and type: rain in mm, the day's highest temperature in °C, and a yes or no from the dengue feed. Each records where it came from: live weather, an entry by hand or the simulated scenario. A timestamp determines freshness. A hazard event is one alert, from the first reading over the threshold until a reading back under it. It stores the reason in words, its source and the assets it sent a trigger to. Each trigger key is unique across jobs so a repeated reading reuses the original work. Completing a matching scheduled inspection advances the asset schedule.

The scenario state holds the data source in use, the seed, the current day and the events someone triggered by hand. Restarting the scenario deletes its alerts and every job they created. Readings and alerts of types from earlier versions are dropped when saved records are read.
