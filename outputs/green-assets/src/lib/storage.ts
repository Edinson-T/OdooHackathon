import { z } from "zod";
import { seed } from "../data/seed";
import { newScenario } from "../domain/scenario";
import type { Snapshot } from "../domain/types";
import type { ErrorCode } from "../services/repository";
import { realDate } from "./clock";
export class Problem extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
export const key = "green-assets:demo:v1";
const id = z.string().min(1),
  time = z.string().datetime(),
  date = z.string().refine(realDate),
  condition = z.enum(["healthy", "needs_attention", "critical"]),
  lat = z.number().min(-90).max(90),
  lng = z.number().min(-180).max(180),
  hazard = z.enum(["rainfall", "flooding", "mosquito"]),
  level = z.enum(["watch", "warning"]),
  source = z.enum(["live", "sensor", "manual", "simulated"]),
  whole = z.number().int();
const trigger = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("due"), key: id, dueDate: date }),
  z.object({
    kind: z.literal("hazard"),
    key: id,
    hazardEventId: id,
    level: level.optional(),
  }),
  z.object({ kind: z.literal("complaint"), key: id, complaintId: id }),
]);
const format = z.object({
  schemaVersion: z.literal(1),
  users: z.array(
    z.object({ id, name: id, role: z.enum(["community", "admin"]) }),
  ),
  zones: z.array(
    z.object({
      id,
      name: id,
      bounds: z.object({ north: lat, south: lat, east: lng, west: lng }),
    }),
  ),
  assets: z.array(
    z.object({
      id,
      name: id,
      type: z.enum(["farm", "pond", "solar_system"]),
      latitude: lat,
      longitude: lng,
      zoneId: id,
      condition: z.union([condition, z.literal("unknown")]),
      inspectionIntervalDays: z.number().int().min(1).max(365),
      nextInspectionDue: date,
      lastInspectedAt: time.nullable(),
      createdAt: time,
    }),
  ),
  complaints: z.array(
    z.object({
      id,
      assetId: id,
      reporterId: id,
      description: id,
      status: z.enum(["open", "reviewed_action_needed", "resolved"]),
      createdAt: time,
    }),
  ),
  jobs: z.array(
    z.object({
      id,
      assetId: id,
      status: z.enum(["available", "assigned", "completed"]),
      triggers: z.array(trigger).min(1),
      assigneeId: id.nullable(),
      createdAt: time,
      claimedAt: time.nullable(),
      completedAt: time.nullable(),
      checklist: z.object({
        version: z.number().int(),
        questions: z.array(z.object({ id, label: id })).min(1),
      }),
      inspection: z
        .object({
          notes: id,
          condition,
          answers: z.record(z.enum(["pass", "fail", "not_applicable"])),
          resolvedComplaintIds: z.array(id),
        })
        .nullable(),
    }),
  ),
  readings: z
    .array(
      z.object({
        zoneId: id,
        type: hazard,
        value: z.number().nonnegative(),
        forecast: z.number().nonnegative().optional(),
        source,
        note: z.string().optional(),
        observedAt: time,
      }),
    )
    .default([]),
  hazardEvents: z.array(
    z.object({
      id,
      type: hazard,
      zoneId: id,
      level,
      reason: z.string(),
      source,
      affectedAssetIds: z.array(id),
      simulated: z.boolean(),
      createdAt: time,
      clearedAt: time.nullable(),
    }),
  ),
  scenario: z
    .object({
      mode: z.enum(["live", "simulated"]),
      seed: whole,
      day: whole.min(0),
      storms: z.array(z.object({ zoneId: id, day: whole })),
      controls: z.array(z.object({ zoneId: id, assetId: id, day: whole })),
    })
    .default(newScenario),
  healthNotices: z.array(id).default([]),
});
// Records saved before warnings had levels. A "disease" reading held a
// microbial count in `value` and the trap count in `mosquitoes`: the trap
// count is kept as a mosquito reading. Old warnings had no end, so they are
// read as history that closed when it opened.
function upgrade(data: unknown) {
  if (typeof data !== "object" || data === null) return data;
  const saved = data as Record<string, unknown>;
  const rows = (list: unknown): Record<string, unknown>[] =>
    Array.isArray(list)
      ? list.filter((row) => typeof row === "object" && row !== null)
      : [];
  const renamed = (type: unknown) => (type === "disease" ? "mosquito" : type);
  return {
    ...saved,
    readings: rows(saved.readings).map((r) =>
      r.source === undefined
        ? {
            ...r,
            type: renamed(r.type),
            value: r.type === "disease" ? (r.mosquitoes ?? 0) : r.value,
            source: r.type === "rainfall" ? "live" : "sensor",
          }
        : r,
    ),
    hazardEvents: rows(saved.hazardEvents).map((e) =>
      e.level === undefined
        ? {
            ...e,
            type: renamed(e.type),
            level: "warning",
            reason: "",
            source: e.simulated ? "simulated" : "sensor",
            clearedAt: e.createdAt,
          }
        : e,
    ),
  };
}
export function save(s: Snapshot) {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    throw new Problem(
      "STORAGE_UNAVAILABLE",
      "Allow browser storage or free some space, then retry.",
    );
  }
}
export function load(): Snapshot {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    throw new Problem(
      "STORAGE_UNAVAILABLE",
      "Allow storage for this website and retry.",
    );
  }
  if (raw === null) {
    const s = seed();
    save(s);
    return s;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Problem(
      "DATA_INVALID",
      "Saved data is unreadable. Use Reset demo to start again.",
    );
  }
  if (data?.schemaVersion !== undefined && data.schemaVersion !== 1)
    throw new Problem(
      "DATA_VERSION_UNSUPPORTED",
      "Unsupported saved format. Reset demo to start again.",
    );
  const parsed = format.safeParse(upgrade(data));
  if (!parsed.success)
    throw new Problem(
      "DATA_INVALID",
      "Saved records are invalid. Reset demo to start again.",
    );
  return parsed.data;
}
