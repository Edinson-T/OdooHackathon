// Checks for the alert rules and the simulated scenario.
// Run with `npm test`. It needs no browser.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checklist } from "../src/domain/checklists.ts";
import { hazardConfig, simulation } from "../src/domain/hazardConfig.ts";
import {
  newScenario,
  rainStrip,
  scenarioReadings,
  simulate,
} from "../src/domain/scenario.ts";
import { activeEvents, exceeds, explain } from "../src/domain/warnings.ts";
import type { HazardEvent, HazardType, Reading, Scenario } from "../src/domain/types.ts";

// The seeded demo data has three zones.
const zones = [{ id: "zone-0" }, { id: "zone-1" }, { id: "zone-2" }];
const seed = simulation.defaultSeed;
const run = (lastDay: number, extra: Partial<Pick<Scenario, "seed" | "triggered">> = {}) =>
  simulate(zones, { seed, triggered: [], ...extra }, lastDay);
// Which alerts a zone has on a day: R for rain, H for heat, D for dengue.
const alerts = (d: { rain: number; temperature: number; dengue: boolean }) =>
  (exceeds({ type: "rainfall", value: d.rain }) ? "R" : "-") +
  (exceeds({ type: "heat", value: d.temperature }) ? "H" : "-") +
  (d.dengue ? "D" : "-");

test("the same seed gives the same days, however far the scenario has run", () => {
  assert.deepEqual(run(13), run(13));
  const short = run(5), long = run(13);
  for (const zone of zones) assert.deepEqual(long[zone.id].slice(0, 6), short[zone.id]);
});

test("another seed gives other weather", () => {
  const a = run(13)["zone-0"].map((d) => d.rain);
  const b = run(13, { seed: seed + 1 })["zone-0"].map((d) => d.rain);
  assert.notDeepEqual(a, b);
});

// This pins the story of the default scenario. If hazardConfig.ts changes,
// choose a default seed that still tells it and update the days below.
test("the default scenario opens calm, then brings heat, dengue and rain together", () => {
  const days = run(13);
  const on = (zone: string, day: number) => alerts(days[zone][day - 1]);
  // Days 1 to 5: nothing anywhere, so no job is created at the start.
  for (const zone of zones)
    for (let day = 1; day <= 5; day++) assert.equal(on(zone.id, day), "---");
  // Day 6: hot everywhere, and the health feed reports dengue in the river basin.
  assert.deepEqual(zones.map((z) => on(z.id, 6)), ["-H-", "-HD", "-H-"]);
  // Day 7: the storm arrives. The river basin has all three alerts at once.
  assert.equal(on("zone-1", 7), "RHD");
  assert.equal(on("zone-0", 7)[0], "R");
  assert.equal(on("zone-2", 7)[0], "R");
  // Day 8: the rain is back under the threshold everywhere.
  assert.ok(zones.every((z) => on(z.id, 8)[0] === "-"));
  // Day 14: calm again.
  assert.ok(zones.every((z) => on(z.id, 14) === "---"));
});

test("a triggered storm, heatwave or dengue report shows that day in that zone only", () => {
  const calm = run(4);
  const triggered = (["rainfall", "heat", "dengue"] as HazardType[]).map((kind) => ({
    zoneId: "zone-1",
    day: 2,
    kind,
  }));
  const busy = run(4, { triggered });
  assert.equal(alerts(calm["zone-1"][2]), "---");
  assert.equal(alerts(busy["zone-1"][2]), "RHD");
  assert.ok(busy["zone-1"][2].rain >= simulation.weather.triggeredStormMin);
  assert.ok(busy["zone-1"][2].temperature >= simulation.weather.triggeredHeat);
  // A storm someone triggers was not in the forecast made the day before.
  assert.equal(busy["zone-1"][1].forecast, calm["zone-1"][1].forecast);
  // A dengue report stays in effect for a few days. The storm and the heat do not.
  assert.equal(alerts(busy["zone-1"][3]), "--D");
  assert.equal(alerts(busy["zone-1"][4]), "--D");
  assert.deepEqual(busy["zone-0"], calm["zone-0"]);
});

test("the scenario's readings are one of each type per zone, marked simulated", () => {
  const readings = scenarioReadings(zones, { ...newScenario(), day: 6 }, "2026-11-21T10:00:00.000Z");
  assert.equal(readings.length, 9);
  assert.ok(readings.every((r) => r.source === "simulated"));
  const basin = (type: HazardType) =>
    readings.find((r) => r.zoneId === "zone-1" && r.type === type)!;
  assert.equal(basin("rainfall").value, run(6)["zone-1"][6].rain);
  assert.equal(basin("heat").value, run(6)["zone-1"][6].temperature);
  assert.equal(basin("dengue").value, 1);
  assert.ok((["rainfall", "heat", "dengue"] as HazardType[]).every((t) => exceeds(basin(t))));
});

test("an alert needs a reading above its threshold, and dengue is a yes or a no", () => {
  const rain = hazardConfig.rainfall.warning, heat = hazardConfig.heat.warning;
  assert.equal(exceeds({ type: "rainfall", value: rain }), false);
  assert.equal(exceeds({ type: "rainfall", value: rain + 0.1 }), true);
  assert.equal(exceeds({ type: "heat", value: heat }), false);
  assert.equal(exceeds({ type: "heat", value: heat + 0.1 }), true);
  assert.equal(exceeds({ type: "heat", value: -4 }), false);
  assert.equal(exceeds({ type: "dengue", value: 0 }), false);
  assert.equal(exceeds({ type: "dengue", value: 1 }), true);
});

test("each alert says which reading crossed which threshold", () => {
  assert.equal(
    explain({ type: "rainfall", value: 61.2 }),
    "Rain today is 61.2 mm, above the 25 mm threshold.",
  );
  assert.equal(
    explain({ type: "heat", value: 33.3 }),
    "Today's highest temperature is 33.3 °C, above the 30 °C threshold.",
  );
  assert.match(explain({ type: "dengue", value: 1 }), /yes or no and gives no number of cases/);
});

test("heat adds checks for farms, the day after rain adds checks for solar panels", () => {
  assert.equal(checklist("farm").questions.length, 3);
  assert.equal(checklist("farm", ["heat"]).questions.length, 5);
  assert.equal(checklist("solar_system", ["rainfall"]).questions.length, 5);
  assert.equal(checklist("pond", ["heat", "rainfall", "dengue"]).questions.length, 3);
  const ids = checklist("solar_system", ["rainfall"]).questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the strip shows what happened up to today and the rain forecast after it", () => {
  const scenario = { ...newScenario(), day: 6 };
  const strip = rainStrip(zones, scenario, 0, 13);
  const days = run(13);
  assert.equal(strip.length, 14);
  assert.deepEqual(
    strip.map((d) => d.forecast),
    [...Array(7).fill(false), ...Array(7).fill(true)],
  );
  assert.deepEqual(strip[6].byZone, zones.map((z) => days[z.id][6].rain));
  assert.deepEqual(strip[7].byZone, zones.map((z) => days[z.id][6].forecast));
  assert.equal(strip[6].dengue, true);
  assert.equal(
    strip[5].temperature,
    Math.max(...zones.map((z) => days[z.id][5].temperature)),
  );
});

test("an alert is in effect only while a current reading backs it", () => {
  const event: HazardEvent = {
    id: "e1",
    type: "heat",
    zoneId: "zone-1",
    level: "warning",
    reason: "",
    source: "live",
    affectedAssetIds: [],
    simulated: false,
    createdAt: "2026-11-20T08:00:00.000Z",
    clearedAt: null,
  };
  const reading = (observedAt: string, source: Reading["source"]): Reading => ({
    zoneId: "zone-1",
    type: "heat",
    value: 32,
    source,
    observedAt,
  });
  const now = "2026-11-21T10:00:00.000Z";
  const yesterday = {
    hazardEvents: [event],
    readings: [reading("2026-11-20T08:00:00.000Z", "live")],
  };
  assert.equal(activeEvents(yesterday, now).length, 0);
  const today = {
    hazardEvents: [event],
    readings: [reading("2026-11-21T08:00:00.000Z", "live")],
  };
  assert.equal(activeEvents(today, now).length, 1);
  // A simulated reading counts until the scenario moves on, whatever the date.
  const simulated = {
    hazardEvents: [event],
    readings: [reading("2026-11-20T08:00:00.000Z", "simulated")],
  };
  assert.equal(activeEvents(simulated, now).length, 1);
  assert.equal(
    activeEvents({ ...simulated, hazardEvents: [{ ...event, clearedAt: now }] }, now).length,
    0,
  );
});
