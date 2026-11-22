// Every number the inspection priority score uses.
//
// ALL VALUES ARE PLACEHOLDERS chosen by the team. None is validated. They sit
// in this one file so that people who know farming, ponds and solar
// maintenance can tune them later.
//
// The idea behind them: the four parts weigh the same, 25 each. One clear
// signal (an inspection that is due, a problem found, an alert that matters
// to the asset, a report) is worth about 20, which is "this week". Two of
// them together reach 40, which is "inspect first".
import type { AssetType, Condition } from "./types";

export const riskConfig = {
  // What the last inspection found. An asset nobody has inspected sits in between.
  condition: {
    max: 25,
    points: { healthy: 0, unknown: 10, needs_attention: 25, critical: 25 } as Record<
      Condition,
      number
    >,
  },
  // How far the asset is into its inspection interval.
  inspection: { max: 25, early: 0, withinInterval: 5, due: 20, longOverdue: 25 },
  // Alerts in effect in the asset's zone, by how much each matters to the
  // asset's type. Dengue is left out on purpose: the score is about the asset,
  // not about disease.
  alerts: {
    max: 25,
    heat: { farm: 20, pond: 5, solar_system: 0 } as Record<AssetType, number>,
    rain: { farm: 5, pond: 10, solar_system: 5 } as Record<AssetType, number>,
    // Rain has stopped and the check it asked for has not been done yet.
    afterRain: { farm: 0, pond: 0, solar_system: 20 } as Record<AssetType, number>,
  },
  // Problems members reported that are not resolved yet.
  reports: { max: 25, one: 20, twoOrMore: 25 },
  // Score at which each level starts.
  levels: { inspectFirst: 40, thisWeek: 20 },
};
