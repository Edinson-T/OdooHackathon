import { exceeds, fieldDate } from "../domain/warnings";
import type { Snapshot, Asset, Complaint, HazardEvent, Reading } from "../domain/types";
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
function validate(s: Snapshot, a: AssetInput) {
  const z = byId(s.zones, a.zoneId).bounds;
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
    Number.isFinite(a.latitude) &&
      Number.isFinite(a.longitude) &&
      a.latitude >= z.south &&
      a.latitude <= z.north &&
      a.longitude >= z.west &&
      a.longitude <= z.east,
    "Coordinates must be inside the selected zone.",
  );
}
function impacts(s: Snapshot, e: HazardEvent) {
  const r = summary();
  for (const id of e.affectedAssetIds)
    attach(
      s,
      byId(s.assets, id),
      { kind: "hazard", hazardEventId: e.id, key: "hazard:" + e.id + ":" + id },
      r,
    );
  return r;
}
export const repository = {
  registerUser: (user: Snapshot["users"][number]) => edit(s => {
    const existing = s.users.find(u => u.id === user.id);
    if (existing) Object.assign(existing, user);
    else s.users.push(user);
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
      validate(s, v);
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
  createDueJobs: (date: string) =>
    edit((s) => {
      check(realDate(date), "Invalid inspection date.");
      const r = summary();
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
  recordReadings: (readings:Reading[]) => edit(s => {
    for (const reading of readings) {
      byId(s.zones,reading.zoneId);
      check(["rainfall","flooding","disease"].includes(reading.type) && Number.isFinite(reading.value) && reading.value >= 0 &&
        (reading.type !== "disease" || (Number.isFinite(reading.mosquitoes) && reading.mosquitoes! >= 0)), "Invalid sensor measurement.");
      check(Number.isFinite(Date.parse(reading.observedAt)) && Date.parse(reading.observedAt) <= Date.now(), "Invalid measurement time.");
      const day = fieldDate(reading.observedAt);
      if(day !== fieldDate(now())) continue;
      const previous = s.readings.find(r => r.zoneId === reading.zoneId && r.type === reading.type);
      if(previous && Date.parse(previous.observedAt) >= Date.parse(reading.observedAt)) continue;
      s.readings = s.readings.filter(r => r !== previous);
      s.readings.push({...reading,observedAt:new Date(reading.observedAt).toISOString()});
      if (!exceeds(reading)) continue;
      const id = [reading.zoneId,reading.type,day].join(":");
      if (s.hazardEvents.some(e=>e.id === id)) continue;
      const event:HazardEvent = {id,type:reading.type,zoneId:reading.zoneId,createdAt:now(),simulated:false,
        affectedAssetIds:s.assets.filter(a=>a.zoneId===reading.zoneId).map(a=>a.id)};
      s.hazardEvents.push(event);
      impacts(s,event);
    }
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
