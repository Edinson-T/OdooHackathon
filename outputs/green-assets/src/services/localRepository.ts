import { exceeds, explain, fieldDate, hazardTypes } from "../domain/warnings";
import { jobRules } from "../domain/hazardConfig";
import { newScenario, scenarioReadings } from "../domain/scenario";
import type {
  Snapshot,
  Asset,
  Complaint,
  HazardEvent,
  HazardType,
  Reading,
  Scenario,
} from "../domain/types";
import type {
  Actor,
  AssetInput,
  AssetPatch,
  CompletionInput,
  Result,
} from "./repository";
import { load, save, Problem } from "../lib/storage";
import { seed } from "../data/seed";
import { attach, summary } from "../domain/rules";
import { checklist } from "../domain/checklists";
import { localDate, realDate } from "../lib/clock";
const now = () => new Date().toISOString();
function check(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new Problem("VALIDATION_ERROR", msg);
}
function byId<T extends { id: string }>(items: T[], id: string) {
  const item = items.find((r) => r.id === id);
  if (!item) throw new Problem("NOT_FOUND", "Record could not be found.");
  return item;
}
function permit(ok: boolean) {
  if (!ok)
    throw new Problem(
      "FORBIDDEN",
      "This action belongs to another account.",
    );
}
function state(ok: boolean, msg: string) {
  if (!ok) throw new Problem("INVALID_STATE", msg);
}
async function result<T>(f: () => T): Promise<Result<T>> {
  try {
    return { ok: true, data: f() };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Problem
          ? { code: e.code, message: e.message }
          : {
              code: "VALIDATION_ERROR",
              message: "Check your input and try again.",
            },
    };
  }
}
function edit<T>(f: (s: Snapshot) => T) {
  const transaction = () => result(() => {
    const s = load();
    const out = f(s);
    save(s);
    return out;
  });
  return navigator.locks.request("green-assets:write", transaction) as Promise<Result<T>>;
}
function validate(s: Snapshot, a: AssetInput, existing?: Asset) {
  const keepLocation = existing && !existing.zoneId && !a.zoneId &&
    a.latitude === existing.latitude && a.longitude === existing.longitude;
  check(keepLocation || a.zoneId, "Choose a zone for the asset.");
  const z = a.zoneId ? byId(s.zones, a.zoneId).bounds : undefined;
  check(
    typeof a.name === "string" &&
      a.name.trim().length > 0 &&
      a.name.trim().length <= 80,
    "Enter a name between 1 and 80 characters.",
  );
  check(
    ["farm", "pond", "solar_system"].includes(a.type) &&
      realDate(a.nextInspectionDue),
    "Choose a valid type and date.",
  );
  check(
    Number.isInteger(a.inspectionIntervalDays) &&
      a.inspectionIntervalDays >= 1 &&
      a.inspectionIntervalDays <= 365,
    "Interval must be 1–365 days.",
  );
  check(
    keepLocation || (z && Number.isFinite(a.latitude) &&
      Number.isFinite(a.longitude) &&
      a.latitude >= z.south &&
      a.latitude <= z.north &&
      a.longitude >= z.west &&
      a.longitude <= z.east),
    "Coordinates must be inside the selected zone.",
  );
}
// Gives the zone's assets of the named types an inspection trigger for an alert.
function dispatch(s: Snapshot, event: HazardEvent, types: string[], stage: string) {
  const result = summary();
  for (const a of s.assets)
    if (a.zoneId === event.zoneId && types.includes(a.type)) {
      const key = ["hazard", event.id, stage, a.id].join(":");
      attach(s, a, { kind: "hazard", hazardEventId: event.id, key }, result);
      if (!event.affectedAssetIds.includes(a.id)) event.affectedAssetIds.push(a.id);
    }
}
// Applies the alert rules to one reading. An alert is one event from the first
// reading over the threshold until a reading back under it.
// - Heat: farms are checked when the alert starts.
// - Rain: solar panels are checked on the first reading back under the threshold.
// - Dengue: the alert is shown and no job is created.
function assess(s: Snapshot, r: Reading) {
  const current = s.hazardEvents.find(
    (e) => e.zoneId === r.zoneId && e.type === r.type && e.clearedAt === null,
  );
  if (!exceeds(r)) {
    if (!current) return;
    current.clearedAt = now();
    if (r.type === "rainfall") dispatch(s, current, jobRules.afterRain, "after");
    return;
  }
  const event: HazardEvent = current ?? {
    id: crypto.randomUUID(),
    type: r.type,
    zoneId: r.zoneId,
    level: "warning",
    reason: "",
    source: r.source,
    simulated: false,
    affectedAssetIds: [],
    createdAt: now(),
    clearedAt: null,
  };
  if (!current) s.hazardEvents.push(event);
  event.reason = explain(r);
  event.source = r.source;
  event.simulated = r.source === "simulated";
  if (r.type === "heat") dispatch(s, event, jobRules.heat, "start");
}
function endWarnings(s: Snapshot) {
  for (const e of s.hazardEvents) if (e.clearedAt === null) e.clearedAt = now();
}
// When the simulated scenario restarts or ends, every job it created is
// deleted, claimed and completed ones included, so each run starts clean.
// What members reported by hand stays, and so do scheduled inspections.
function withdrawSimulated(s: Snapshot) {
  // A missing alert can belong to a retired sensor type. Keep its job history.
  const simulatedEvent = (id: string) =>
    s.hazardEvents.find((e) => e.id === id)?.simulated === true;
  for (const j of s.jobs) {
    const kept = j.triggers.filter(
      (t) => t.kind !== "hazard" || !simulatedEvent(t.hazardEventId),
    );
    if (kept.length === j.triggers.length) continue;
    j.triggers = kept;
    // The scenario's extra checks leave with it, unless the job is already answered.
    if (j.status === "completed") continue;
    const hazards = j.triggers.flatMap((t) =>
      t.kind === "hazard"
        ? (s.hazardEvents.find((e) => e.id === t.hazardEventId)?.type ?? [])
        : [],
    );
    j.checklist = checklist(byId(s.assets, j.assetId).type, [...new Set(hazards)]);
  }
  s.jobs = s.jobs.filter((j) => j.triggers.length > 0);
  s.hazardEvents = s.hazardEvents.filter((e) => !e.simulated);
}
// Replaces the readings with those of the scenario's current day.
function runScenario(s: Snapshot) {
  s.readings = scenarioReadings(s.zones, s.scenario, now());
  for (const r of s.readings) assess(s, r);
}
function simulated(s: Snapshot) {
  state(s.scenario.mode === "simulated", "Switch to the simulated scenario first.");
}
export const repository = {
  registerUser: (user: Snapshot["users"][number]) => edit(s => {
    const existing = s.users.find(u => u.id === user.id);
    if (existing) Object.assign(existing, user);
    else s.users.push(user);
    // The simulated scenario is the default for everyone. It starts here, on
    // day 1, the first time a workspace is opened with it selected.
    if (
      s.scenario.mode === "simulated" &&
      !s.readings.some((r) => r.source === "simulated")
    ) {
      endWarnings(s);
      withdrawSimulated(s);
      runScenario(s);
    }
  }),
  getSnapshot: () => result(load),
  resetDemo: () =>
    result(() => {
      const s = seed();
      save(s);
      return s;
    }),
  createAsset: (actor: Actor, input: AssetInput) =>
    edit((s) => {
      permit(byId(s.users, actor.actorId).role === "admin");
      validate(s, input);
      const a: Asset = {
        ...input,
        name: input.name.trim(),
        id: crypto.randomUUID(),
        condition: "unknown",
        lastInspectedAt: null,
        createdAt: now(),
      };
      s.assets.push(a);
      return a;
    }),
  updateAsset: (actor: Actor, id: string, patch: AssetPatch) =>
    edit((s) => {
      permit(byId(s.users, actor.actorId).role === "admin");
      check(
        Object.keys(patch).every((k) =>
          [
            "name",
            "latitude",
            "longitude",
            "zoneId",
            "inspectionIntervalDays",
            "nextInspectionDue",
          ].includes(k),
        ),
        "Unsupported asset field.",
      );
      const a = byId(s.assets, id),
        v = { ...a, ...patch };
      validate(s, v, a);
      if (
        v.nextInspectionDue !== a.nextInspectionDue ||
        v.inspectionIntervalDays !== a.inspectionIntervalDays
      )
        state(
          !s.jobs.some((j) => j.assetId === id && j.status !== "completed"),
          "Complete outstanding jobs before editing the schedule.",
        );
      Object.assign(a, v, { name: v.name.trim() });
      return a;
    }),
  submitComplaint: (
    actor: Actor,
    input: { assetId: string; description: string },
  ) =>
    edit((s) => {
      byId(s.users, actor.actorId);
      const a = byId(s.assets, input.assetId),
        description = input.description.trim();
      check(
        description.length >= 10 && description.length <= 1000,
        "Describe the issue in 10–1000 characters.",
      );
      const complaint: Complaint = {
        id: crypto.randomUUID(),
        assetId: a.id,
        reporterId: actor.actorId,
        description,
        status: "open",
        createdAt: now(),
      };
      s.complaints.push(complaint);
      const job = attach(
        s,
        a,
        {
          kind: "complaint",
          key: "complaint:" + complaint.id,
          complaintId: complaint.id,
        },
        summary(),
      );
      return { complaint, job };
    }),
  // Turns inspections that are due into jobs. It does nothing until someone
  // has asked for the check once (`start`), so a new workspace opens with no
  // jobs. After that it runs by itself, as before.
  createDueJobs: (date: string, start = false) =>
    edit((s) => {
      check(realDate(date), "Invalid inspection date.");
      const r = summary();
      if (start) s.dueChecks = true;
      if (!s.dueChecks) return r;
      for (const a of s.assets.filter((a) => new Date(a.nextInspectionDue + "T00:00:00").getTime() <= Date.now() + 86400000))
        attach(
          s,
          a,
          {
            kind: "due",
            dueDate: a.nextInspectionDue,
            key: "due:" + a.id + ":" + a.nextInspectionDue,
          },
          r,
        );
      return r;
    }),
  // Readings from live sources: the weather service, a sensor feed or an
  // admin's entry. They are set aside while a simulated scenario runs.
  recordReadings: (readings: Reading[]) =>
    edit((s) => {
      if (s.scenario.mode === "simulated") return;
      for (const reading of readings) {
        byId(s.zones, reading.zoneId);
        const amount = (v: number | undefined) =>
          v !== undefined && Number.isFinite(v) && v >= 0;
        check(
          hazardTypes.includes(reading.type) &&
            ["live", "sensor", "manual"].includes(reading.source) &&
            // A temperature may be below zero. Rain and a yes or no may not.
            (reading.type === "heat"
              ? Number.isFinite(reading.value)
              : amount(reading.value)) &&
            (reading.forecast === undefined || amount(reading.forecast)),
          "Invalid sensor measurement.",
        );
        check(
          Number.isFinite(Date.parse(reading.observedAt)) &&
            Date.parse(reading.observedAt) <= Date.now(),
          "Invalid measurement time.",
        );
        if (fieldDate(reading.observedAt) !== fieldDate(now())) continue;
        const previous = s.readings.find(
          (r) => r.zoneId === reading.zoneId && r.type === reading.type,
        );
        if (
          previous &&
          previous.source !== "simulated" &&
          Date.parse(previous.observedAt) >= Date.parse(reading.observedAt)
        )
          continue;
        const stored = {
          ...reading,
          observedAt: new Date(reading.observedAt).toISOString(),
        };
        s.readings = s.readings.filter((r) => r !== previous);
        s.readings.push(stored);
        assess(s, stored);
      }
    }),
  // Live sources or the simulated scenario. Switching ends the warnings of the
  // mode that is left, because their readings no longer apply.
  setMonitoring: (actor: Actor, mode: Scenario["mode"]) =>
    edit((s) => {
      // Any member may switch, not only an admin: it only changes the demo's weather source.
      byId(s.users, actor.actorId);
      check(
        mode === "live" || mode === "simulated",
        "Choose live sources or the simulated scenario.",
      );
      if (s.scenario.mode !== mode) {
        endWarnings(s);
        withdrawSimulated(s);
        s.readings = [];
        s.scenario.mode = mode;
        if (mode === "simulated") runScenario(s);
      }
      return s.scenario;
    }),
  // Moves the scenario on by one day or several. Every day in between is
  // judged in turn, so alerts and jobs come out the same as stepping by hand.
  advanceScenario: (actor: Actor, days = 1) =>
    edit((s) => {
      byId(s.users, actor.actorId);
      simulated(s);
      check(
        Number.isInteger(days) && days >= 1 && days <= 60,
        "Move the scenario on by 1 to 60 days.",
      );
      for (let i = 0; i < days; i++) {
        s.scenario.day += 1;
        runScenario(s);
      }
      return s.scenario;
    }),
  // A storm, a heatwave or a dengue report on the scenario's current day.
  triggerHazard: (actor: Actor, zoneId: string, kind: HazardType) =>
    edit((s) => {
      byId(s.users, actor.actorId);
      simulated(s);
      const day = s.scenario.day;
      byId(s.zones, zoneId);
      check(hazardTypes.includes(kind), "Choose rain, heat or dengue.");
      if (
        !s.scenario.triggered.some(
          (x) => x.zoneId === zoneId && x.day === day && x.kind === kind,
        )
      )
        s.scenario.triggered.push({ zoneId, day, kind });
      runScenario(s);
      return s.scenario;
    }),
  // Back to day 1. With a seed, the weather is a new one.
  restartScenario: (actor: Actor, seed?: number) =>
    edit((s) => {
      byId(s.users, actor.actorId);
      simulated(s);
      check(
        seed === undefined || (Number.isInteger(seed) && seed >= 0),
        "A scenario seed is a whole number.",
      );
      endWarnings(s);
      withdrawSimulated(s);
      // Scheduled inspections nobody claimed go back to waiting for the check.
      s.dueChecks = false;
      for (const j of s.jobs)
        if (j.status === "available")
          j.triggers = j.triggers.filter((t) => t.kind !== "due");
      s.jobs = s.jobs.filter((j) => j.triggers.length > 0);
      s.scenario = { ...newScenario(seed ?? s.scenario.seed), mode: "simulated" };
      runScenario(s);
      return s.scenario;
    }),
  claimJob: (actor: Actor, id: string) =>
    edit((s) => {
      byId(s.users, actor.actorId);
      const j = byId(s.jobs, id);
      state(j.status !== "completed", "Job already completed.");
      if (j.status === "assigned") {
        if (j.assigneeId !== actor.actorId)
          throw new Problem(
            "JOB_UNAVAILABLE",
            "Another member has claimed this job.",
          );
        return j;
      }
      const eligible = j.triggers.some(trigger => trigger.kind !== "due" ||
        new Date(trigger.dueDate + "T00:00:00").getTime() <= Date.now() + 86400000);
      state(eligible, "Scheduled inspections open 24 hours before the due date.");
      state(!s.jobs.some(other => other.status === "assigned" && other.assigneeId === actor.actorId), "Finish your current inspection before claiming another.");
      j.status = "assigned";
      j.assigneeId = actor.actorId;
      j.claimedAt = now();
      return j;
    }),
  completeJob: (actor: Actor, id: string, input: CompletionInput) =>
    edit((s) => {
      const j = byId(s.jobs, id);
      state(
        j.status === "assigned",
        "Claim an available job before submitting.",
      );
      permit(j.assigneeId === actor.actorId);
      const a = byId(s.assets, j.assetId),
        answers = Object.values(input.answers);
      check(
        j.checklist.questions.length === answers.length &&
          j.checklist.questions.every((q) =>
            ["pass", "fail", "not_applicable"].includes(input.answers[q.id]),
          ) &&
          answers.some((v) => v !== "not_applicable"),
        "Answer every question and include at least one applicable check.",
      );
      check(
        ["healthy", "needs_attention"].includes(input.condition) &&
          !(answers.includes("fail") && input.condition === "healthy"),
        "A failed check requires the Needs inspection condition.",
      );
      const notes = input.notes.trim();
      check(
        notes.length > 0 && notes.length <= 2000,
        "Enter inspection notes (1–2000 characters).",
      );
      const complaints = j.triggers.flatMap((t) =>
        t.kind === "complaint" ? [byId(s.complaints, t.complaintId)] : [],
      );
      check(
        input.resolvedComplaintIds.every((id) =>
          complaints.some((c) => c.id === id),
        ) &&
          (!input.resolvedComplaintIds.length || input.condition === "healthy"),
        "Resolve linked complaints only with a healthy inspection.",
      );
      for (const c of complaints) {
        if (c.status !== "resolved")
          c.status = input.resolvedComplaintIds.includes(c.id)
            ? "resolved"
            : "reviewed_action_needed";
      }
      j.status = "completed";
      j.completedAt = now();
      j.inspection = { ...input, notes };
      a.lastInspectedAt = j.completedAt;
      a.condition = input.condition;
      if (
        j.triggers.some(
          (t) => t.kind === "due" && t.dueDate === a.nextInspectionDue,
        )
      )
        a.nextInspectionDue = localDate(a.inspectionIntervalDays);
      return { job: j, asset: a, complaints };
    }),
};
