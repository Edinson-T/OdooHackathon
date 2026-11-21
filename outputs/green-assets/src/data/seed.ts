import type { Snapshot, AssetType, Condition } from "../domain/types";
import { localDate } from "../lib/clock";
import { checklist } from "../domain/checklists";
import { newScenario } from "../domain/scenario";
export function seed(): Snapshot {
  const zones = ["North meadow", "River basin", "South ridge"].map(
    (name, i) => ({
      name,
      id: "zone-" + i,
      bounds: {
        north: 50.91 - i * 0.02,
        south: 50.89 - i * 0.02,
        west: 4.33,
        east: 4.47,
      },
    }),
  );
  const names = [
    "Cloverfield Farm",
    "Willow Pond",
    "Sunrise Solar Array",
    "Orchard Commons",
    "Reedwater Pond",
    "Meadow Solar Garden",
    "Alder Grove Farm",
    "Heron Pond",
    "Ridge Solar Station",
    "Terrace Farm",
    "Lily Basin",
    "Westbank Solar",
  ];
  const kinds: AssetType[] = ["farm", "pond", "solar_system"];
  const conditions: Condition[] = [
    "healthy",
    "needs_attention",
    "healthy",
    "healthy",
    "healthy",
    "healthy",
    "healthy",
    "healthy",
    "critical",
    "healthy",
    "unknown",
    "healthy",
  ];
  const s: Snapshot = {
    schemaVersion: 1,
    zones,
    users: [
      { id: "user-a", name: "Maya Chen", role: "community" },
      { id: "user-b", name: "Eli Reed", role: "community" },
      { id: "admin-1", name: "Alex Moss", role: "admin" },
    ],
    assets: [],
    jobs: [],
    complaints: [],
    readings: [],
    hazardEvents: [],
    scenario: newScenario(),
    dueChecks: false,
    healthNotices: [],
  };
  names.forEach((name, i) => {
    const type = kinds[i % 3],
      z = zones[Math.floor(i / 4)],
      date = localDate(-12) + "T10:00:00Z";
    const id = type + "-0" + (Math.floor(i / 3) + 1);
    const condition = conditions[i];
    s.assets.push({
      id,
      name,
      type,
      zoneId: z.id,
      latitude: z.bounds.north - [0.006, 0.012, 0.005, 0.014][i % 4],
      longitude:
        4.33 + [0.019, 0.052, 0.094, 0.122][i % 4] + (i > 3 ? 0.002 : 0),
      condition,
      inspectionIntervalDays: 30,
      nextInspectionDue: localDate(i === 2 ? -3 : i === 7 ? 0 : 18 + i),
      createdAt: localDate(-42) + "T10:00:00Z",
      lastInspectedAt: condition === "unknown" ? null : date,
    });
    if (condition !== "unknown") {
      const list = checklist(type),
        due = localDate(-12);
      s.jobs.push({
        id: "history-" + id,
        assetId: id,
        status: "completed",
        assigneeId: "user-b",
        createdAt: date,
        claimedAt: date,
        completedAt: date,
        triggers: [{ kind: "due", key: "due:" + id + ":" + due, dueDate: due }],
        checklist: list,
        inspection: {
          condition,
          notes:
            condition === "healthy"
              ? "Routine inspection complete."
              : type === "pond"
                ? "Debris observed near outlet."
                : "Inverter fault observed.",
          answers: Object.fromEntries(
            list.questions.map((q, n) => [
              q.id,
              n === 0 && condition !== "healthy" ? "fail" : "pass",
            ]),
          ),
          resolvedComplaintIds: [],
        },
      });
    }
  });
  return s;
}
