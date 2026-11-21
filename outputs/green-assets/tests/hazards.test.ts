// Checks for the warning rules and the simulated scenario.
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
import {
  activeEvents,
  explain,
  flooded,
  fromFeed,
  nextLevel,
} from "../src/domain/warnings.ts";
import type {
  HazardEvent,
  HazardLevel,
  HazardType,
  Reading,
  Scenario,
} from "../src/domain/types.ts";

// The seeded demo data: three zones with four assets each.
const zones = [{ id: "zone-0" }, { id: "zone-1" }, { id: "zone-2" }];
const assets = zones.flatMap((z) =>
  [0, 1, 2, 3].map((n) => ({ id: z.id + "-asset-" + n, zoneId: z.id })),
);
const seed = simulation.defaultSeed;
const run = (
  lastDay: number,
  extra: Partial<Pick<Scenario, "seed" | "storms" | "controls">> = {},
) => simulate(zones, assets, { seed, storms: [], controls: [], ...extra }, lastDay);

// The level of each hazard in each zone on each day, carried from day to day
// the way the app carries it.
type Levels = Record<HazardType, HazardLevel | null>;
function levels(days: ReturnType<typeof simulate>) {
  const out: Record<string, Levels[]> = {};
  for (const zone of zones) {
    const now: Levels = { rainfall: null, flooding: null, mosquito: null };
    out[zone.id] = days[zone.id].map((d) => {
      now.rainfall = nextLevel("rainfall", { value: d.rain, forecast: d.forecast }, now.rainfall);
      now.flooding = nextLevel("flooding", { value: d.waterLevel }, now.flooding);
      now.mosquito = nextLevel("mosquito", { value: d.mosquito }, now.mosquito);
      return { ...now };
    });
  }
  return out;
}
const everywhere = (check: (zoneId: string) => boolean) => zones.every((z) => check(z.id));

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
test("the default scenario runs from a forecast to a flood to mosquitoes and back to calm", () => {
  const days = run(13);
  const at = levels(days);

  // Day 1: heavy rain is forecast everywhere and nothing else is wrong.
  assert.ok(everywhere((z) => days[z][0].rain < hazardConfig.rainfall.warning));
  assert.ok(everywhere((z) => at[z][0].rainfall === "watch"));
  assert.ok(everywhere((z) => at[z][0].flooding === null && at[z][0].mosquito === null));

  // Day 2: the storm. Rain warnings everywhere, a flood only in the river basin.
  assert.ok(everywhere((z) => at[z][1].rainfall === "warning"));
  assert.equal(at["zone-1"][1].flooding, "warning");
  assert.notEqual(at["zone-0"][1].flooding, "warning");
  assert.notEqual(at["zone-2"][1].flooding, "warning");

  // Day 3: the water is falling, so the flood is a watch and jobs open. Day 5: over.
  assert.equal(at["zone-1"][2].flooding, "watch");
  assert.equal(at["zone-1"][4].flooding, null);

  // The storm flushed the river basin and the south ridge, not the north meadow.
  assert.equal(days["zone-0"][1].flushed, false);
  assert.equal(days["zone-1"][1].flushed, true);
  assert.equal(days["zone-2"][1].flushed, true);

  // No mosquito alert in the first week. The zone that was not flushed warns
  // first, on day 10. The flushed zones follow a day later.
  assert.ok(everywhere((z) => at[z].slice(0, 7).every((x) => x.mosquito === null)));
  const firstWarning = (z: string) => at[z].findIndex((x) => x.mosquito === "warning") + 1;
  assert.equal(firstWarning("zone-0"), 10);
  assert.equal(firstWarning("zone-1"), 11);
  assert.equal(firstWarning("zone-2"), 11);

  // Day 13, after a dry spell: no warning or watch is left.
  assert.ok(everywhere((z) => Object.values(at[z][12]).every((x) => x === null)));
});

test("a triggered storm floods the river basin and was not in the forecast", () => {
  const calm = run(4);
  const stormy = run(4, { storms: [{ zoneId: "zone-1", day: 3 }] });
  assert.ok(stormy["zone-1"][3].rain >= simulation.weather.triggeredStormMin);
  assert.ok(stormy["zone-1"][3].triggered);
  assert.ok(stormy["zone-1"][3].waterLevel > hazardConfig.flooding.warning);
  // The forecast made the day before is the one made without the storm.
  assert.equal(stormy["zone-1"][2].forecast, calm["zone-1"][2].forecast);
  // The other zones are untouched.
  assert.deepEqual(stormy["zone-0"], calm["zone-0"]);
});

test("rain heavy enough to flush restarts the count of standing days", () => {
  const days = run(13, { storms: [{ zoneId: "zone-0", day: 8 }] })["zone-0"];
  assert.ok(days[7].standingDays >= simulation.mosquito.lagDays);
  assert.equal(days[8].flushed, true);
  assert.equal(days[8].standingDays, 0);
  // The count had started to climb. After the flush it falls instead.
  const untouched = run(13)["zone-0"];
  assert.ok(days[10].mosquito < untouched[10].mosquito);
});

test("assets found healthy lower the count on later days, not on the same day", () => {
  const controls = [0, 1, 2].map((n) => ({
    zoneId: "zone-0",
    assetId: "zone-0-asset-" + n,
    day: 6,
  }));
  const plain = run(13), cared = run(13, { controls });
  assert.equal(cared["zone-0"][6].mosquito, plain["zone-0"][6].mosquito);
  assert.equal(cared["zone-0"][9].inspected, 3);
  assert.ok(cared["zone-0"][9].mosquito < plain["zone-0"][9].mosquito);
  // Three of four assets cared for: the zone never reaches a warning.
  assert.ok(levels(cared)["zone-0"].every((x) => x.mosquito !== "warning"));
  // The neighbours are untouched.
  assert.deepEqual(cared["zone-1"], plain["zone-1"]);
});

test("the scenario's readings are one of each type per zone, marked simulated", () => {
  const readings = scenarioReadings(zones, assets, { ...newScenario(), day: 1 }, "2026-11-21T10:00:00.000Z");
  assert.equal(readings.length, 9);
  assert.ok(readings.every((r) => r.source === "simulated"));
  const basin = (type: HazardType) => readings.find((r) => r.zoneId === "zone-1" && r.type === type)!;
  assert.equal(basin("rainfall").value, run(1)["zone-1"][1].rain);
  assert.equal(basin("flooding").value, run(1)["zone-1"][1].waterLevel);
  assert.match(basin("mosquito").note!, /flushed larvae out/);
});

test("rain: a warning when measured above the threshold, a watch when forecast above it", () => {
  const limit = hazardConfig.rainfall.warning;
  assert.equal(nextLevel("rainfall", { value: limit + 1, forecast: 0 }, null), "warning");
  assert.equal(nextLevel("rainfall", { value: 3, forecast: limit + 1 }, null), "watch");
  assert.equal(nextLevel("rainfall", { value: limit, forecast: limit }, "warning"), null);
  assert.equal(nextLevel("rainfall", { value: 3 }, "watch"), null);
});

test("water level: a level is entered above its threshold and left below 80% of it", () => {
  const steps: [number, HazardLevel | null][] = [
    [1.0, null],
    [1.3, "watch"],
    [1.6, "warning"],
    [1.3, "warning"], // Below 1.5 but not yet below 1.2: the warning holds.
    [1.19, "watch"],
    [1.0, "watch"], // Below 1.2 but not yet below 0.96: the watch holds.
    [0.95, null],
    [1.0, null], // Falling water held the watch. Rising water at 1.0 raises nothing.
  ];
  let current: HazardLevel | null = null;
  for (const [value, expected] of steps) {
    current = nextLevel("flooding", { value }, current);
    assert.equal(current, expected, "at " + value + " m");
  }
});

test("mosquitoes: a public health notice makes the watch threshold the warning threshold", () => {
  assert.equal(nextLevel("mosquito", { value: 16 }, null), "watch");
  assert.equal(nextLevel("mosquito", { value: 16 }, null, true), "warning");
  assert.equal(nextLevel("mosquito", { value: 14 }, null, true), null);
  assert.equal(nextLevel("mosquito", { value: 21 }, null), "warning");
});

test("each warning says which reading crossed which threshold", () => {
  assert.equal(
    explain("flooding", "warning", { value: 1.63 }),
    "Water level is 1.63 m, above the 1.5 m warning threshold.",
  );
  assert.equal(
    explain("flooding", "warning", { value: 1.3 }),
    "Water level is 1.30 m. The warning stays until it falls below 1.2 m.",
  );
  assert.equal(
    explain("rainfall", "watch", { value: 1, forecast: 60.1 }),
    "The forecast for the next 24 hours is 60.1 mm, above the 25 mm warning threshold.",
  );
  assert.equal(
    explain("mosquito", "warning", { value: 16.4 }, true),
    "The trap count is 16.4 per trap-day, above the 15 threshold that applies while a public health notice is in effect.",
  );
});

test("a hazard adds its own checks to the asset's usual ones", () => {
  const usual = checklist("pond"), flood = checklist("pond", ["flooding", "mosquito"]);
  assert.equal(usual.questions.length, 3);
  assert.deepEqual(flood.questions.slice(0, 3), usual.questions);
  assert.equal(flood.questions.length, 5);
  assert.equal(new Set(flood.questions.map((q) => q.id)).size, 5);
  assert.match(checklist("solar_system", ["flooding"]).questions[3].label, /do not touch/);
});

test("an older feed's disease row becomes a mosquito reading; anything else odd is dropped", () => {
  const at = "2026-11-21T09:00:00Z";
  assert.deepEqual(
    fromFeed({ zoneId: "zone-1", type: "disease", value: 130, mosquitoes: 25, observedAt: at }),
    { zoneId: "zone-1", type: "mosquito", value: 25, source: "sensor", observedAt: at },
  );
  assert.deepEqual(
    fromFeed({ zoneId: "zone-1", type: "flooding", value: 1.7, observedAt: at }),
    { zoneId: "zone-1", type: "flooding", value: 1.7, source: "sensor", observedAt: at },
  );
  assert.equal(fromFeed({ zoneId: "zone-1", type: "rainfall", value: 40, observedAt: at }), null);
  assert.equal(fromFeed({ zoneId: "zone-1", type: "flooding", value: "high", observedAt: at }), null);
  assert.equal(fromFeed("flooding"), null);
});

test("a warning is in effect only while a current reading backs it", () => {
  const event: HazardEvent = {
    id: "e1",
    type: "flooding",
    zoneId: "zone-1",
    level: "warning",
    reason: "",
    source: "sensor",
    affectedAssetIds: [],
    simulated: false,
    createdAt: "2026-11-20T08:00:00.000Z",
    clearedAt: null,
  };
  const reading = (observedAt: string, source: Reading["source"]): Reading => ({
    zoneId: "zone-1",
    type: "flooding",
    value: 1.7,
    source,
    observedAt,
  });
  const now = "2026-11-21T10:00:00.000Z";
  const yesterday = { hazardEvents: [event], readings: [reading("2026-11-20T08:00:00.000Z", "sensor")] };
  assert.equal(activeEvents(yesterday, now).length, 0);
  const today = { hazardEvents: [event], readings: [reading("2026-11-21T08:00:00.000Z", "sensor")] };
  assert.equal(activeEvents(today, now).length, 1);
  // A simulated reading counts until the scenario moves on, whatever the date.
  const simulated = { hazardEvents: [event], readings: [reading("2026-11-20T08:00:00.000Z", "simulated")] };
  assert.equal(activeEvents(simulated, now).length, 1);
  assert.equal(flooded(simulated, "zone-1"), true);
  assert.equal(flooded(simulated, "zone-0"), false);
  assert.equal(activeEvents({ ...simulated, hazardEvents: [{ ...event, clearedAt: now }] }, now).length, 0);
});

test("the rain strip shows what fell up to today and the forecast after it", () => {
  const scenario = { ...newScenario(), day: 3, storms: [{ zoneId: "zone-1", day: 3 }] };
  const strip = rainStrip(zones, assets, scenario, 0, 13);
  const days = simulate(zones, assets, scenario, 13);
  assert.equal(strip.length, 14);
  assert.deepEqual(strip.map((d) => d.forecast), [false, false, false, false, ...Array(10).fill(true)]);
  // Up to today: the rain that fell, the triggered storm included.
  assert.deepEqual(strip[3].byZone, zones.map((z) => days[z.id][3].rain));
  assert.ok(strip[3].byZone[1] >= simulation.weather.triggeredStormMin);
  // After today: the forecast made the day before.
  assert.deepEqual(strip[4].byZone, zones.map((z) => days[z.id][3].forecast));
  // Moving on a day turns that day's forecast into what fell.
  const next = rainStrip(zones, assets, { ...scenario, day: 4 }, 0, 13);
  assert.equal(next[4].forecast, false);
  assert.deepEqual(next[4].byZone, zones.map((z) => days[z.id][4].rain));
});
