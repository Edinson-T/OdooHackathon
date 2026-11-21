// One place for every number the hazard warnings use.
//
// ALL VALUES ARE ILLUSTRATIVE. They were chosen so the demo is easy to follow.
// None is validated. Each needs review by people who know local weather,
// drainage and mosquito control before it is used for a real decision.
import type { AssetType, HazardLevel, HazardType } from "./types";

export const hazardConfig = {
  // A level is left only when the reading falls below this share of the
  // threshold that raised it. A value hovering at a threshold therefore does
  // not switch a warning on and off.
  clearRatio: 0.8,
  // Rain measured today above `warning` is a warning. A forecast above it for
  // the next 24 hours is a watch.
  rainfall: { unit: "mm", warning: 25 },
  // Water level at the zone's gauge.
  flooding: { unit: "m", watch: 1.2, warning: 1.5 },
  // Mosquitoes caught per trap per day.
  mosquito: { unit: "per trap-day", watch: 15, warning: 20 },
};

// Which assets get an inspection job, by hazard and level. A watch on rain
// sends people to farms and ponds before the rain arrives. A watch on water
// level or mosquitoes only shows on the map.
export const jobRules: Record<
  HazardType,
  Record<HazardLevel, AssetType[]>
> = {
  rainfall: { watch: ["farm", "pond"], warning: ["farm", "pond"] },
  flooding: { watch: [], warning: ["farm", "pond", "solar_system"] },
  mosquito: { watch: [], warning: ["farm", "pond", "solar_system"] },
};

// The simulated scenario. One weather series drives all three readings.
export const simulation = {
  // With this seed the first two weeks tell the whole story: a forecast of
  // heavy rain, the storm and a flood in the river basin, then mosquitoes
  // about a week later, first in the zone the storm did not flush.
  defaultSeed: 18703,
  // Days simulated before day 0, so the scenario does not start from rest.
  warmUpDays: 14,
  weather: {
    wetAfterDry: 0.35, // Chance of a wet day after a dry day.
    wetAfterWet: 0.65, // Chance of a wet day after a wet day.
    showerMean: 9, // Mean rain on an ordinary wet day, mm.
    stormChance: 0.12, // Share of wet days that bring a storm.
    stormMin: 45, // Rain on a storm day, mm.
    stormMax: 90,
    triggeredStormMin: 70, // A storm the presenter triggers brings at least this much.
    zoneSpread: 0.2, // Rain differs between zones by up to this share.
    forecastError: 0.2, // A forecast is off by up to this share.
  },
  water: {
    restLevel: 0.6, // Gauge level with no recent rain, m.
    recession: 0.5, // Share of the level above rest that is left a day later.
    risePerMm: 0.006, // Rise for each mm of rain, m.
    // The river basin sits lowest, so the same rain raises its gauge more.
    risePerMmByZone: { "zone-1": 0.014 } as Record<string, number>,
    gaugeNoise: 0.02, // A gauge reading is off by up to this much, m.
  },
  mosquito: {
    wetDayMm: 2, // Rain in a day that leaves water standing.
    holdDays: 3, // Days that water stands after such rain.
    flushMm: 50, // Rain in a day that flushes larvae out. The count of days restarts.
    lagDays: 7, // Unbroken days of standing water before adults emerge.
    rampDays: 4, // Days from first emergence to full emergence.
    baseline: 6, // Trap count with no standing water.
    ceiling: 36, // Trap count at full emergence when nothing was inspected.
    approach: 0.5, // Share of the gap to the day's target closed each day.
    controlDays: 7, // Days that an inspection finding an asset healthy keeps counting.
    trapNoise: 1, // A trap count is off by up to this much.
  },
};
