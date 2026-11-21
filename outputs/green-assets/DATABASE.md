# Data model

Supabase stores Google account identities and sessions. The local workspace stores a profile keyed by the Supabase user ID so assignments and reports survive sign-out.

The version-one snapshot contains zones, assets, complaints, jobs, users, environmental readings, hazard events, the scenario state and public health notices. Assets store a zone, pin coordinates, inspection interval and due date. Jobs store triggers, assignment, checklist snapshot, answers, observed condition and completion notes. Older priority fields are discarded when reading saved records; historical critical conditions remain readable.

Readings are keyed by zone and station type, and record where they came from: a live source, a sensor feed, an entry by hand or the simulated scenario. A timestamp determines freshness. A hazard event is one alert, from the first reading that raised it until a reading clears it. It stores its current level, the reason in words, its source and the assets it sent a trigger to. Each trigger key is unique across jobs and includes the alert's level, so a repeated reading reuses the original work while a watch that becomes a warning asks for a new visit. Completing a matching scheduled inspection advances the asset schedule.

The scenario state holds the data source in use, the seed, the current day, the storms an administrator triggered and the inspections that found an asset healthy. Records saved before alerts had levels are upgraded when read: a disease reading becomes a mosquito reading that keeps its trap count, and an old event is read as closed history.
