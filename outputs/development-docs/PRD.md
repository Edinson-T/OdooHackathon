# Product Requirements — Green Assets

Status: proposed implementation scope for a 24-hour hackathon.

## Problem and goal

Communities need a simple way to see green assets, report issues, and organize inspections. Demonstrate one connected journey from a complaint, due date, or simulated hazard to a community inspection and visible findings.

## Users

| Role | Capabilities |
| --- | --- |
| Community | View assets, post complaints, claim/release available inspection work, submit own assigned inspections, track activity |
| Admin | All community capabilities, plus add/edit asset metadata |

There is no separate inspector or supervisor role. Claiming a job makes that community member its inspector. An admin is not required to approve inspections in this MVP.

## MVP screens

| Screen | Required behavior |
| --- | --- |
| Dashboard / assets | Counts, searchable asset list, type/condition filters, map, overdue indicator |
| Asset details | Asset information, linked complaints, inspection history, report button |
| Inspection jobs | Available jobs, reason/priority/type filters, claim action |
| My activity | Own complaints, assigned/completed jobs, checklist submission |
| Admin assets | Add/edit asset metadata, location, zone, inspection interval, due date |

Provide clearly labeled demo-identity selection, hazard simulation, due-inspection check, and Reset demo controls. These are presentation utilities.

## Required behavior

- Asset types: farm, pond, solar system. A new asset starts with unknown condition.
- A complaint selects one existing asset and includes a description.
- Complaints, due dates, and simulated hazards create or link inspection jobs.
- Jobs move from available to assigned to completed. An assignee can release a job back to available.
- Only the assignee submits an inspection; include all checklist answers, observed condition, notes, and review of linked complaints.
- Asset condition and job status are separate. Failed checks require a needs-attention or critical condition.
- Completing a job marks unresolved linked complaints as reviewed/action-needed. A complaint is resolved only when the inspector explicitly confirms it resolved and submits a healthy result with no failed checks.
- Completion updates the inspection date. Only completion covering the current due occurrence advances its due date.
- Repeated triggers cannot generate duplicate work. Matching available jobs for the same asset can combine reasons; an assigned job's scope is fixed.
- Keep data after refresh and restore the same seed scenario through Reset demo.

## Acceptance scenarios

| Scenario | Pass condition |
| --- | --- |
| Admin adds asset | Valid asset appears in list and map; community account cannot call the add/edit service successfully |
| Report complaint | Tracking ID appears; complaint links to an inspection job |
| Claim and ownership | Member A claims a job; member B cannot claim or submit it; A can release it |
| Inspection finds a defect | Job completes, asset needs attention, complaint remains action-needed |
| Inspection confirms resolution | Explicitly selected linked complaint resolves only with a healthy inspection and no failed answers |
| Flood simulation | Only assets in the selected zone receive flood triggers; replay of the same event creates none |
| Due check | Assets due on/before the selected date receive jobs; repeating the check creates no duplicate due triggers |
| Persistence and reset | Refresh retains changes; Reset demo restores seed data and the default demo identity |
| Map unavailable | List, complaint form, and job workflow remain usable |

## Outside this hackathon

Real authentication, shared multi-device data, live weather feeds, server scheduling, email/SMS, photograph uploads, payments, rewards, automated damage diagnosis, repair management, and independent verification. Open action-needed complaints remain visible; do not imply the demo performs repairs.

## Delivery plan

| Hours | Deliverable |
| --- | --- |
| 0–2 | Confirm types, service contract, seed scenario, screen sketches |
| 2–7 | App shell, state/persistence, asset list/map, admin form |
| 7–12 | Complaint creation, job board, claim/release |
| 12–16 | Checklists, completion, complaint review, history |
| 16–19 | Due checks and hazard simulation |
| 19–22 | Integrate, check acceptance scenarios, prepare the local demo |
| 22–24 | Fix critical problems, rehearse, prepare backups |

If time is short, prioritize list views and the complaint-to-inspection journey before map styling. Finish with a locally running website and a repeatable three-minute story.
