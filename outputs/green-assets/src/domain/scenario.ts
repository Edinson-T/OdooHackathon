// The simulated scenario: seeded weather and a simulated health feed, one day
// at a time. Everything here is a pure function of the scenario's seed, so the
// same seed gives the same days on every device and in every rehearsal. The
// numbers come from hazardConfig.ts and are illustrative.
import { simulation } from "./hazardConfig.ts";
import type { HazardType, Id, Reading, Scenario, Zone } from "./types";

// Each use of chance has its own stream, so one never echoes another.
const stream = {
  wet: 1,
  storm: 2,
  amount: 3,
  zone: 4,
  forecast: 5,
  triggered: 6,
  temperature: 7,
  zoneTemperature: 8,
  dengue: 9,
};

function mix(h: number) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return h ^ (h >>> 16);
}

// A number from 0 up to 1 that depends only on its four arguments.
export function chance(seed: number, use: number, day: number, zone = 0) {
  let h = mix((seed | 0) ^ Math.imul(use, 0x9e3779b1));
  h = mix(h ^ Math.imul(day, 0x7feb352d));
  h = mix(h ^ Math.imul(zone, 0x846ca68b));
  return (h >>> 0) / 4294967296;
}

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

// Rain over the whole area, in mm, for each day from `first` to `last`.
// A wet day is more likely after a wet day, which gives wet and dry spells.
function areaRain(seed: number, first: number, last: number) {
  const w = simulation.weather;
  const rain: number[] = [];
  let wet = false;
  for (let day = first; day <= last; day++) {
    wet = chance(seed, stream.wet, day) < (wet ? w.wetAfterWet : w.wetAfterDry);
    const amount = chance(seed, stream.amount, day);
    if (!wet) rain.push(0);
    else if (chance(seed, stream.storm, day) < w.stormChance)
      rain.push(w.stormMin + amount * (w.stormMax - w.stormMin));
    else rain.push(-w.showerMean * Math.log(1 - amount));
  }
  return rain;
}

export interface ZoneDay {
  day: number;
  rain: number; // mm that day.
  forecast: number; // mm forecast for the following day.
  temperature: number; // The day's highest temperature, °C.
  dengue: boolean; // The simulated health feed reports dengue here.
  triggered: HazardType[]; // What someone triggered here that day.
}

// Every zone's weather and health feed for day 0 up to `lastDay`.
export function simulate(
  zones: Pick<Zone, "id">[],
  scenario: Pick<Scenario, "seed" | "triggered">,
  lastDay: number,
): Record<Id, ZoneDay[]> {
  const { weather: w, dengue, warmUpDays } = simulation;
  const { seed } = scenario;
  const first = -warmUpDays;
  // One day further than asked, for the forecast of the day after.
  const area = areaRain(seed, first, lastDay + 1);
  const out: Record<Id, ZoneDay[]> = {};
  zones.forEach((zone, index) => {
    const z = index + 1;
    const natural = (day: number) =>
      area[day - first] *
      (1 + w.zoneSpread * (2 * chance(seed, stream.zone, day, z) - 1));
    const triggeredOn = (day: number) =>
      scenario.triggered
        .filter((t) => t.zoneId === zone.id && t.day === day)
        .map((t) => t.kind);
    // A yes from the health feed stays in effect for a few days.
    const reported = (day: number) =>
      chance(seed, stream.dengue, day, z) < dengue.chance ||
      triggeredOn(day).includes("dengue");
    out[zone.id] = [];
    for (let day = 0; day <= lastDay; day++) {
      const triggered = triggeredOn(day);
      const storm =
        w.triggeredStormMin +
        chance(seed, stream.triggered, day, z) * (w.stormMax - w.triggeredStormMin);
      const rain = triggered.includes("rainfall")
        ? Math.max(natural(day), storm)
        : natural(day);
      // Wet days are cooler. The whole area shares the day's weather, and each
      // zone differs a little.
      const [low, high] = area[day - first] > 0 ? w.wetDayTemp : w.dryDayTemp;
      const temperature =
        low +
        chance(seed, stream.temperature, day) * (high - low) +
        w.zoneTempSpread * (2 * chance(seed, stream.zoneTemperature, day, z) - 1);
      const error =
        1 + w.forecastError * (2 * chance(seed, stream.forecast, day + 1, z) - 1);
      let dengueNow = false;
      for (let back = 0; back < dengue.days; back++)
        if (day - back >= 0 && reported(day - back)) dengueNow = true;
      out[zone.id].push({
        day,
        rain: round(rain, 1),
        forecast: round(natural(day + 1) * error, 1),
        temperature: round(
          triggered.includes("heat")
            ? Math.max(temperature, w.triggeredHeat + chance(seed, stream.triggered, day, z + 50))
            : temperature,
          1,
        ),
        dengue: dengueNow,
        triggered,
      });
    }
  });
  return out;
}

// The readings of the scenario's current day, one of each type per zone.
export function scenarioReadings(
  zones: Pick<Zone, "id">[],
  scenario: Scenario,
  observedAt: string,
): Reading[] {
  const days = simulate(zones, scenario, scenario.day);
  return zones.flatMap((zone): Reading[] => {
    const today = days[zone.id][scenario.day];
    const common = { zoneId: zone.id, source: "simulated" as const, observedAt };
    const note = (type: HazardType) =>
      today.triggered.includes(type) ? "Triggered by hand." : undefined;
    return [
      {
        ...common,
        type: "rainfall",
        value: today.rain,
        forecast: today.forecast,
        note: note("rainfall"),
      },
      { ...common, type: "heat", value: today.temperature, note: note("heat") },
      { ...common, type: "dengue", value: today.dengue ? 1 : 0, note: note("dengue") },
    ];
  });
}

export interface StripDay {
  day: number;
  rain: number; // mm, the average of the zones.
  temperature: number; // °C, the highest of the zones.
  dengue: boolean; // Reported in at least one zone.
  forecast: boolean; // true for days after the scenario's current day.
  byZone: number[]; // Rain in mm per zone, in the order of `zones`.
}

// One entry per day from `first` to `last`: what happened up to the scenario's
// current day, and the rain forecast for the days after it. Temperature and
// the health feed are shown only for days that have happened.
export function rainStrip(
  zones: Pick<Zone, "id">[],
  scenario: Scenario,
  first: number,
  last: number,
): StripDay[] {
  const days = simulate(zones, scenario, last);
  const strip: StripDay[] = [];
  for (let day = Math.max(0, first); day <= last; day++) {
    const forecast = day > scenario.day;
    const byZone = zones.map((z) =>
      forecast ? days[z.id][day - 1].forecast : days[z.id][day].rain,
    );
    const mean = byZone.reduce((a, b) => a + b, 0) / Math.max(1, byZone.length);
    strip.push({
      day,
      rain: round(mean, 1),
      temperature: Math.max(...zones.map((z) => days[z.id][day].temperature)),
      dengue: zones.some((z) => days[z.id][day].dengue),
      forecast,
      byZone,
    });
  }
  return strip;
}

export function newScenario(seed: number = simulation.defaultSeed): Scenario {
  return { mode: "simulated", seed, day: 0, triggered: [] };
}
