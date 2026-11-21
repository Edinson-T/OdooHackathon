// The simulated scenario: one weather series drives rain, water level and the
// mosquito trap count, so the three warnings follow each other the way they
// would in the field. Everything here is a pure function of the scenario's
// seed, so the same seed gives the same weather on every device and in every
// rehearsal. The numbers come from hazardConfig.ts and are illustrative.
import { simulation } from "./hazardConfig.ts";
import type { Asset, Id, Reading, Scenario, Zone } from "./types";

// Each use of chance has its own stream, so one never echoes another.
const stream = {
  wet: 1,
  storm: 2,
  amount: 3,
  zone: 4,
  forecast: 5,
  triggered: 6,
  gauge: 7,
  trap: 8,
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
  triggered: boolean; // The presenter triggered a storm here that day.
  flushed: boolean; // Rain heavy enough to flush larvae out.
  standingDays: number; // Unbroken days of standing water.
  waterLevel: number; // Gauge reading, m.
  mosquito: number; // Trap count, per trap-day.
  inspected: number; // Assets found healthy in the days that still count.
  assets: number; // Assets in the zone.
}

// Every zone's readings for day 0 up to `lastDay`.
export function simulate(
  zones: Pick<Zone, "id">[],
  assets: Pick<Asset, "id" | "zoneId">[],
  scenario: Pick<Scenario, "seed" | "storms" | "controls">,
  lastDay: number,
): Record<Id, ZoneDay[]> {
  const { weather: w, water, mosquito: m, warmUpDays } = simulation;
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
    const rise = water.risePerMmByZone[zone.id] ?? water.risePerMm;
    const inZone = assets.filter((a) => a.zoneId === zone.id).length;
    const recent: number[] = [];
    let level = water.restLevel;
    let count = m.baseline;
    let standing = 0;
    out[zone.id] = [];
    for (let day = first; day <= lastDay; day++) {
      const triggered = scenario.storms.some(
        (x) => x.zoneId === zone.id && x.day === day,
      );
      const storm =
        w.triggeredStormMin +
        chance(seed, stream.triggered, day, z) *
          (w.stormMax - w.triggeredStormMin);
      const rain = round(triggered ? Math.max(natural(day), storm) : natural(day), 1);

      // Water level: rises with the rain, then falls back toward rest.
      level = water.restLevel + (level - water.restLevel) * water.recession + rise * rain;

      // Standing water: rain leaves water for a few days. Showers that return
      // before it dries keep the count running. A flush restarts it.
      recent.push(rain);
      if (recent.length > m.holdDays) recent.shift();
      const flushed = rain >= m.flushMm;
      const wetGround = recent.some((mm) => mm >= m.wetDayMm);
      standing = flushed || !wetGround ? 0 : standing + 1;

      // Mosquitoes: adults emerge once water has stood long enough. Assets
      // that were inspected and found healthy take their share off the target.
      const inspected = new Set(
        scenario.controls
          .filter(
            (c) =>
              c.zoneId === zone.id &&
              c.day < day &&
              c.day >= day - m.controlDays,
          )
          .map((c) => c.assetId),
      ).size;
      const share = inZone ? Math.min(1, inspected / inZone) : 0;
      const ramp = Math.min(1, Math.max(0, (standing - m.lagDays + 1) / m.rampDays));
      const target = m.baseline + (m.ceiling - m.baseline) * ramp * (1 - share);
      count += (target - count) * m.approach;

      if (day < 0) continue;
      const error = 1 + w.forecastError * (2 * chance(seed, stream.forecast, day + 1, z) - 1);
      out[zone.id].push({
        day,
        rain,
        forecast: round(natural(day + 1) * error, 1),
        triggered,
        flushed,
        standingDays: standing,
        waterLevel: round(
          Math.max(0, level + water.gaugeNoise * (2 * chance(seed, stream.gauge, day, z) - 1)),
          2,
        ),
        mosquito: round(
          Math.max(0, count + m.trapNoise * (2 * chance(seed, stream.trap, day, z) - 1)),
          1,
        ),
        inspected,
        assets: inZone,
      });
    }
  });
  return out;
}

function mosquitoNote(today: ZoneDay) {
  const parts = [
    today.flushed
      ? "Today's rain flushed larvae out, so the count of days restarts."
      : today.standingDays
        ? `Water has stood for ${today.standingDays} unbroken day${today.standingDays === 1 ? "" : "s"}.`
        : "No standing water.",
  ];
  if (today.inspected)
    parts.push(
      `${today.inspected} of ${today.assets} assets here ${today.inspected === 1 ? "was" : "were"} inspected and found healthy in the last ${simulation.mosquito.controlDays} days, which lowers the count.`,
    );
  return parts.join(" ");
}

// The readings of the scenario's current day, one of each type per zone.
export function scenarioReadings(
  zones: Pick<Zone, "id">[],
  assets: Pick<Asset, "id" | "zoneId">[],
  scenario: Scenario,
  observedAt: string,
): Reading[] {
  const days = simulate(zones, assets, scenario, scenario.day);
  return zones.flatMap((zone): Reading[] => {
    const today = days[zone.id][scenario.day];
    const common = { zoneId: zone.id, source: "simulated" as const, observedAt };
    return [
      {
        ...common,
        type: "rainfall",
        value: today.rain,
        forecast: today.forecast,
        note: today.triggered ? "A storm triggered by the presenter." : undefined,
      },
      { ...common, type: "flooding", value: today.waterLevel },
      { ...common, type: "mosquito", value: today.mosquito, note: mosquitoNote(today) },
    ];
  });
}

export function newScenario(seed: number = simulation.defaultSeed): Scenario {
  return { mode: "live", seed, day: 0, storms: [], controls: [] };
}
