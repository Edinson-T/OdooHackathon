# Architecture Decision Records — Green Assets

Status: accepted for the planned hackathon MVP. Revisit when the scope changes.

## ADR-001 — Browser-only application

**Decision:** use React/TypeScript/Vite, run the demo locally, and keep business logic in a repository module inside the browser.

**Reason:** the 24-hour goal is a coherent website demonstration. One locally running application minimizes integration and setup work.

**Consequence:** no server-enforced permissions, shared data, or processing while the site is closed.

## ADR-002 — One community role, plus asset administration

**Decision:** community members both report complaints and perform inspections. Admins additionally add/edit asset metadata and can use community features.

**Reason:** this matches the agreed user model and makes volunteer job pickup the core interaction.

**Consequence:** there is no supervisor approval step in the MVP. Client-side role checks demonstrate navigation and behavior only.

## ADR-003 — Versioned localStorage snapshot

**Decision:** persist one small fictional dataset under `green-assets:demo:v1`, expose it through an async repository, and refresh shared UI state after mutations.

**Reason:** persistence survives refresh without provisioning a database. A single contract lets teammates build different screens consistently.

**Consequence:** support one editing tab on the presentation device. Browser data can be cleared; quota/corruption need visible errors and explicit reset.

## ADR-004 — Zone-based simulated hazards and manual due checks

**Decision:** label hazards simulated, match predefined zone IDs, and run due checks when the app opens, after asset edits, or through a button.

**Reason:** deterministic inputs make the demonstration repeatable without live weather or scheduling infrastructure.

**Consequence:** this is not flood prediction or geometric exposure analysis. No new jobs appear while the website is closed. Replaying one event deduplicates; creating another event represents another occurrence.

## ADR-005 — Inspection completion is separate from resolution

**Decision:** save inspection status, observed asset condition, and complaint status separately. An inspector must explicitly confirm complaint resolution, supported by a healthy result without failed answers.

**Reason:** inspecting a defect does not fix it.

**Consequence:** completed jobs can leave assets needing attention and complaints awaiting action. The demo records inspection findings and complaint review; it does not execute repairs or independently verify closure.

## ADR-006 — Fixed assigned scope and immutable inspection results

**Decision:** merge new reasons only into an available job; otherwise create a new available job. Copy the checklist into each job and preserve completed results.

**Reason:** an assignee should not unknowingly inherit new inspection requirements, and checklist edits should not rewrite history.

**Consequence:** one asset can have multiple assigned jobs. Trigger keys prevent the same source occurrence from being processed twice. Schedule edits are blocked while unfinished work exists.

## ADR-007 — Map enhancement with a list fallback

**Decision:** use Leaflet for visual asset context, retain an asset list for every core action, and use hash navigation.

**Reason:** maps improve the jury story; lists keep the workflow usable if external tiles fail. Hash navigation keeps screen navigation inside the local website.

**Consequence:** configure tile-provider attribution and terms, and handle loading failure visibly. The demo does not provide offline map tiles.
