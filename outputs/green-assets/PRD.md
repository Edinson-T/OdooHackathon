# Green Assets workflows

Members sign in with Google to report problems, inspect assets and review their work. Administrators register farms, ponds and solar systems, choose a zone and click inside it on OpenStreetMap to set the location.

The reporting form groups assets by category and supports filtering. The jobs page lists inspection dates. Scheduled jobs open 24 hours before local midnight on their due date. Complaints and environmental warnings can create immediate work. Members complete their current assignment before claiming another.

Inspectors mark each check Pass, Fail or Not applicable, choose Healthy or Needs inspection, and record notes. Failed checks require Needs inspection. At least one check must be applicable. Historical inspections retain their recorded condition.

The overview shows three alerts for each zone: heavy rain, high temperature, and dengue and mosquito. Each alert states the reading and the threshold that raised it. When a zone has several at once, the map frames the zone in red and labels each alert on it in words, and the zone's card lights one tile per alert. The list view remains available when map tiles cannot load.

Alerts create inspection work by fixed rules. A temperature above 30 °C gives the zone's farms a job. Heavy rain shows a warning, and on the first day the rain is back under the threshold the zone's solar systems get a job. A dengue report from the simulated health authority feed shows its alert at once and creates no job. A job raised by an alert carries extra checks for that hazard.

A new workspace starts with no jobs, so a member can first report a problem by hand. Scheduled inspections that are due become jobs once a member runs the check on the jobs page. Readings come from a simulated scenario unless a member switches to live weather. Any member can play the scenario, step through it day by day, jump to a later day or trigger an event. Restarting it deletes every job it created and keeps what members reported. Everything it produces is marked as simulated.
