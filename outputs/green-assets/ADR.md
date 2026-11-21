# Design decisions

- Use hosted Google OAuth so credentials stay with the identity provider. New accounts default to community access.
- Treat a date-only inspection as due at local midnight. Open claims exactly 24 hours earlier. Unscheduled reports and environmental incidents can be investigated immediately.
- Serialize local mutations with Web Locks. Check existing assignments in the same transaction that claims a job.
- Keep field data local for this demo. Browser roles guide the UI; protecting shared records requires server-side authorization.
- Use configurable source URLs and explicit sensor units. The demo thresholds are 25 mm daily rain, 1.5 m water, and both 100 microbial counts/mL and 20 mosquitoes per trap-day. Values must strictly exceed their thresholds. These are illustrative thresholds for the demo.
- The three monitoring locations per zone are illustrative station positions. Active warnings use today's latest readings in the Brussels timezone. Missing data appears as awaiting data. A lower reading clears the map warning while preserving inspection history.
