// One place for every number the hazard alerts use.
//
// ALL VALUES ARE ILLUSTRATIVE. They were chosen so the demo is easy to follow.
// None is validated. Each needs review by people who know local weather,
// farming and public health before it is used for a real decision.
import type { AssetType } from "./types";

export const hazardConfig = {
  // Rain in a day above this raises a heavy rain warning.
  rainfall: { unit: "mm", warning: 25 },
  // A day's highest temperature above this raises a high temperature warning.
  heat: { unit: "°C", warning: 30 },
};

// Which assets get an inspection job.
export const jobRules: Record<"heat" | "afterRain", AssetType[]> = {
  // When a zone turns hot, its farms are checked.
  heat: ["farm"],
  // On the first day rain is back under the threshold, solar panels are checked.
  afterRain: ["solar_system"],
};

// The simulated scenario.
export const simulation = {
  // With this seed days 1 to 5 are calm, so a presenter can first show a
  // member reporting a problem by hand. Day 6 turns hot and the health feed
  // reports dengue in the river basin. Day 7 adds a storm, so that zone has
  // all three alerts at once. Day 8 is the first day after the rain.
  defaultSeed: 290,
  // Days simulated before day 0, so the weather does not start from rest.
  warmUpDays: 3,
  weather: {
    wetAfterDry: 0.35, // Chance of a wet day after a dry day.
    wetAfterWet: 0.6, // Chance of a wet day after a wet day.
    showerMean: 9, // Mean rain on an ordinary wet day, mm.
    stormChance: 0.2, // Share of wet days that bring a storm.
    stormMin: 35, // Rain on a storm day, mm.
    stormMax: 80,
    triggeredStormMin: 50, // A storm someone triggers brings at least this much.
    zoneSpread: 0.2, // Rain differs between zones by up to this share.
    forecastError: 0.2, // A forecast is off by up to this share.
    dryDayTemp: [27, 34], // Highest temperature on a dry day, °C, from and to.
    wetDayTemp: [25, 32], // The same on a wet day.
    zoneTempSpread: 1, // Zones differ by up to this many °C.
    triggeredHeat: 34, // A heatwave someone triggers reaches at least this.
  },
  dengue: {
    // The health authority's feed is simulated: each day it answers yes or no
    // for each zone. It does not give a number of cases.
    chance: 0.05, // Chance of a yes for a zone on a day.
    days: 3, // A yes stays in effect this many days.
  },
};
