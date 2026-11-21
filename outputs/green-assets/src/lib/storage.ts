import { z } from "zod";
import { seed } from "../data/seed";
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
  lng = z.number().min(-180).max(180);
const trigger = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("due"), key: id, dueDate: date }),
  z.object({ kind: z.literal("hazard"), key: id, hazardEventId: id }),
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
  readings: z.array(z.object({zoneId:id,type:z.enum(["rainfall","flooding","disease"]),value:z.number().nonnegative(),mosquitoes:z.number().nonnegative().optional(),observedAt:time})).default([]),
  hazardEvents: z.array(
    z.object({
      id,
      type: z.enum(["rainfall", "flooding", "disease"]),
      zoneId: id,
      affectedAssetIds: z.array(id),
      simulated: z.boolean(),
      createdAt: time,
    }),
  ),
});
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
  const parsed = format.safeParse(data);
  if (!parsed.success)
    throw new Problem(
      "DATA_INVALID",
      "Saved records are invalid. Reset demo to start again.",
    );
  return parsed.data;
}
