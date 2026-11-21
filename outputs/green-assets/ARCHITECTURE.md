# Architecture

React and TypeScript render the dashboard, registry, asset editor, report form and inspection workflow. Leaflet renders zone outlines, asset pins and environmental stations. The pin picker uses OpenStreetMap tiles.

Supabase handles Google sign-in. The authenticated account mounts a fresh application provider; logout removes the workspace. Asset and job records use a browser-local repository. Tabs on the same origin coordinate writes with Web Locks and receive storage updates. Different browsers and devices hold independent workspaces. Shared deployment requires a server-side repository with access policies and transactional claims.

The dashboard fetches weather and optional sensor measurements, then passes them to the repository. The map and job generator share the warning rules. Scheduled work is checked on login, after schedule changes and every minute while signed in.
