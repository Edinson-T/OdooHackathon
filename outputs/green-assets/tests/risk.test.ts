// Checks for the inspection priority score. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { riskOf } from "../src/domain/risk.ts";
import type {
  Asset,
  Complaint,
  HazardEvent,
  HazardType,
  InspectionJob,
  Reading,
} from "../src/domain/types.ts";

const today = "2026-11-21";
const at = "2026-11-21T10:00:00.000Z";
const asset = (over: Partial<Asset> = {}): Asset => ({
  id: "farm-01",
  name: "Cloverfield Farm",
  type: "farm",
  latitude: 50.9,
  longitude: 4.35,
  zoneId: "zone-0",
  condition: "healthy",
  inspectionIntervalDays: 30,
  nextInspectionDue: "2026-12-15",
  lastInspectedAt: "2026-11-15T10:00:00.000Z",
  createdAt: "2026-10-01T10:00:00.000Z",
  ...over,
});
const event = (type: HazardType, cleared = false): HazardEvent => ({
  id: "event-" + type,
  type,
  zoneId: "zone-0",
  level: "warning",
  reason: "",
  source: "simulated",
  affectedAssetIds: [],
  simulated: true,
  createdAt: at,
  clearedAt: cleared ? at : null,
});
const reading = (type: HazardType): Reading => ({
  zoneId: "zone-0",
  type,
  value: 99,
  source: "simulated",
  observedAt: at,
});
const complaint = (id: string, status: Complaint["status"] = "open"): Complaint => ({
  id,
  assetId: "farm-01",
  reporterId: "user-a",
  description: "Something is wrong here.",
  status,
  createdAt: at,
});
const nothing = { complaints: [], jobs: [], hazardEvents: [], readings: [] };
const points = (r: ReturnType<typeof riskOf>) =>
  Object.fromEntries(r.parts.map((p) => [p.key, p.points]));

test("a healthy asset with nothing going on scores 0 and is routine", () => {
  const r = riskOf(nothing, asset(), today, at);
  assert.equal(r.score, 0);
  assert.equal(r.level, "routine");
  assert.deepEqual(r.parts.map((p) => p.max), [25, 25, 25, 25]);
});

test("condition: unknown sits between healthy and a problem", () => {
  const of = (condition: Asset["condition"]) =>
    points(riskOf(nothing, asset({ condition }), today, at)).condition;
  assert.deepEqual(
    [of("healthy"), of("unknown"), of("needs_attention"), of("critical")],
    [0, 10, 25, 25],
  );
});

test("inspection: points rise through the interval and again when long overdue", () => {
  const of = (nextInspectionDue: string) =>
    points(riskOf(nothing, asset({ nextInspectionDue }), today, at)).inspection;
  assert.equal(of("2026-12-07"), 0); // 16 days left of 30: first half.
  assert.equal(of("2026-12-06"), 5); // 15 days left: second half.
  assert.equal(of("2026-11-22"), 5);
  assert.equal(of("2026-11-21"), 20); // Due today.
  assert.equal(of("2026-11-18"), 20); // 3 days overdue.
  assert.equal(of("2026-10-22"), 25); // 30 days overdue: a whole interval.
});

test("alerts count by what they mean for the kind of asset, and dengue never counts", () => {
  const during = (types: HazardType[], kind: Asset["type"]) =>
    points(
      riskOf(
        { ...nothing, hazardEvents: types.map((t) => event(t)), readings: types.map(reading) },
        asset({ type: kind }),
        today,
        at,
      ),
    ).alerts;
  assert.equal(during(["heat"], "farm"), 20);
  assert.equal(during(["heat"], "solar_system"), 0);
  assert.equal(during(["rainfall"], "pond"), 10);
  assert.equal(during(["heat", "rainfall"], "farm"), 25);
  assert.equal(during(["dengue"], "pond"), 0);
  assert.equal(during(["heat", "rainfall", "dengue"], "pond"), 15);
  // An alert in another zone does not count.
  const elsewhere = riskOf(
    { ...nothing, hazardEvents: [event("heat")], readings: [reading("heat")] },
    asset({ zoneId: "zone-2" }),
    today,
    at,
  );
  assert.equal(points(elsewhere).alerts, 0);
});

test("a solar system scores until the check after heavy rain is done", () => {
  const solar = asset({ id: "solar-01", type: "solar_system" });
  const job = (status: InspectionJob["status"]): InspectionJob => ({
    id: "job-1",
    assetId: "solar-01",
    triggers: [{ kind: "hazard", hazardEventId: "event-rainfall", key: "k" }],
    status,
    assigneeId: null,
    createdAt: at,
    claimedAt: null,
    completedAt: null,
    checklist: { version: 1, questions: [] },
    inspection: null,
  });
  const after = (status: InspectionJob["status"]) =>
    points(
      riskOf(
        { ...nothing, hazardEvents: [event("rainfall", true)], jobs: [job(status)] },
        solar,
        today,
        at,
      ),
    ).alerts;
  assert.equal(after("available"), 20);
  assert.equal(after("assigned"), 20);
  assert.equal(after("completed"), 0);
});

test("reports: one open report is 20, two or more are 25, resolved ones are 0", () => {
  const of = (complaints: Complaint[]) =>
    points(riskOf({ ...nothing, complaints }, asset(), today, at)).reports;
  assert.equal(of([complaint("a")]), 20);
  assert.equal(of([complaint("a"), complaint("b", "reviewed_action_needed")]), 25);
  assert.equal(of([complaint("a", "resolved")]), 0);
});

test("the parts add up, and the level follows the score", () => {
  // A farm with a problem found, overdue, in the heat, with one report: 25 + 20 + 20 + 20.
  const busy = riskOf(
    {
      ...nothing,
      complaints: [complaint("a")],
      hazardEvents: [event("heat")],
      readings: [reading("heat")],
    },
    asset({ condition: "needs_attention", nextInspectionDue: "2026-11-18" }),
    today,
    at,
  );
  assert.equal(busy.score, 85);
  assert.equal(busy.level, "inspect_first");
  // After the inspection: healthy, next one a month away, report resolved. The heat stays.
  const done = riskOf(
    {
      ...nothing,
      complaints: [complaint("a", "resolved")],
      hazardEvents: [event("heat")],
      readings: [reading("heat")],
    },
    asset({ nextInspectionDue: "2026-12-21" }),
    today,
    at,
  );
  assert.equal(done.score, 20);
  assert.equal(done.level, "this_week");
  // One signal alone is "this week": here an inspection due today.
  const middle = riskOf(
    nothing,
    asset({ nextInspectionDue: "2026-11-21" }),
    today,
    at,
  );
  assert.equal(middle.score, 20);
  assert.equal(middle.level, "this_week");
});
