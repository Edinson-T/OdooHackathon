# Data model

Supabase stores Google account identities and sessions. The local workspace stores a profile keyed by the Supabase user ID so assignments and reports survive sign-out.

The version-one snapshot contains zones, assets, complaints, jobs, users, environmental readings and hazard events. Assets store a zone, pin coordinates, inspection interval and due date. Jobs store triggers, assignment, checklist snapshot, answers, observed condition and completion notes. Older priority fields are discarded when reading saved records; historical critical conditions remain readable.

Readings are keyed by zone and station type. A timestamp determines freshness. Hazard events reference affected asset IDs. Each trigger key is unique across jobs so repeated refreshes reuse the original work. Completing a matching scheduled inspection advances the asset schedule.
