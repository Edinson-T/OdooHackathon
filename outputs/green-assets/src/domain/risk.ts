// The inspection priority score: which asset to look at first. It adds four
// parts, up to 100, from what the app already knows about an asset. It is a
// way to order work. It is not a forecast of disease or of anything else.
import { riskConfig } from "./riskConfig.ts";
import { activeEvents } from "./warnings.ts";
import type { Asset, LocalDate, Snapshot } from "./types";

export type RiskLevel = "inspect_first" | "this_week" | "routine";
export const riskLevelNames: Record<RiskLevel, string> = {
  inspect_first: "Inspect first",
  this_week: "This week",
  routine: "Routine",
};

export interface RiskPart {
  key: "condition" | "inspection" | "alerts" | "reports";
  name: string;
  points: number;
  max: number;
  reason: string;
}
export interface Risk {
  score: number;
  level: RiskLevel;
  parts: RiskPart[];
}

const dayNumber = (date: LocalDate) => Date.parse(date + "T00:00:00Z") / 86400000;
const days = (n: number) => n + (n === 1 ? " day" : " days");

export function riskOf(
  s: Pick<Snapshot, "complaints" | "jobs" | "hazardEvents" | "readings">,
  asset: Asset,
  today: LocalDate,
  at = new Date().toISOString(),
): Risk {
  const c = riskConfig;

  const condition: RiskPart = {
    key: "condition",
    name: "Condition",
    max: c.condition.max,
    points: c.condition.points[asset.condition],
    reason:
      asset.condition === "unknown"
        ? "Nobody has inspected this asset yet."
        : asset.condition === "healthy"
          ? "The last inspection found it healthy."
          : "The last inspection found a problem.",
  };

  // Days until the next inspection is due. Negative once it is overdue.
  const left = dayNumber(asset.nextInspectionDue) - dayNumber(today);
  const interval = asset.inspectionIntervalDays;
  const inspection: RiskPart = {
    key: "inspection",
    name: "Inspection",
    max: c.inspection.max,
    ...(left > interval / 2
      ? { points: c.inspection.early, reason: `Next inspection in ${days(left)}.` }
      : left > 0
        ? {
            points: c.inspection.withinInterval,
            reason: `Next inspection in ${days(left)}, in the second half of its ${interval} day interval.`,
          }
        : left > -interval
          ? {
              points: c.inspection.due,
              reason: left === 0 ? "Inspection due today." : `Inspection overdue by ${days(-left)}.`,
            }
          : {
              points: c.inspection.longOverdue,
              reason: `Inspection overdue by ${days(-left)}, more than a whole interval.`,
            }),
  };

  const here = activeEvents(s, at).filter((e) => e.zoneId === asset.zoneId);
  const found: [number, string][] = [];
  if (here.some((e) => e.type === "heat"))
    found.push([c.alerts.heat[asset.type], "high temperature in its zone"]);
  if (here.some((e) => e.type === "rainfall"))
    found.push([c.alerts.rain[asset.type], "heavy rain in its zone"]);
  // A check that was asked for when the rain stopped and is still open.
  const waiting = s.jobs.some(
    (j) =>
      j.assetId === asset.id &&
      j.status !== "completed" &&
      j.triggers.some(
        (t) =>
          t.kind === "hazard" &&
          s.hazardEvents.some(
            (e) => e.id === t.hazardEventId && e.type === "rainfall" && e.clearedAt !== null,
          ),
      ),
  );
  if (waiting)
    found.push([c.alerts.afterRain[asset.type], "not yet checked after heavy rain"]);
  const counted = found.filter(([points]) => points > 0);
  const alerts: RiskPart = {
    key: "alerts",
    name: "Alerts",
    max: c.alerts.max,
    points: Math.min(
      c.alerts.max,
      counted.reduce((sum, [points]) => sum + points, 0),
    ),
    reason: counted.length
      ? counted.map(([points, why]) => `${why} (${points})`).join(", ").replace(/^./, (x) => x.toUpperCase()) + "."
      : "No alert in its zone that matters to this kind of asset.",
  };

  const open = s.complaints.filter(
    (x) => x.assetId === asset.id && x.status !== "resolved",
  ).length;
  const reports: RiskPart = {
    key: "reports",
    name: "Reports",
    max: c.reports.max,
    points: open === 0 ? 0 : open === 1 ? c.reports.one : c.reports.twoOrMore,
    reason:
      open === 0
        ? "No open report from members."
        : open === 1
          ? "One open report from a member."
          : `${open} open reports from members.`,
  };

  const parts = [condition, inspection, alerts, reports];
  const score = Math.min(
    100,
    parts.reduce((sum, p) => sum + p.points, 0),
  );
  return {
    score,
    level:
      score >= c.levels.inspectFirst
        ? "inspect_first"
        : score >= c.levels.thisWeek
          ? "this_week"
          : "routine",
    parts,
  };
}
