import type { Snapshot, Asset, Trigger, InspectionJob } from "./types";
import { checklist } from "./checklists";
import type { TriggerResult } from "../services/repository";
export const summary = (): TriggerResult => ({
  createdJobIds: [],
  updatedJobIds: [],
  skippedTriggerKeys: [],
});
export function attach(
  s: Snapshot,
  a: Asset,
  t: Trigger,
  result: TriggerResult,
) {
  const duplicate = s.jobs.find((j) =>
    j.triggers.some((old) => old.key === t.key),
  );
  if (duplicate) {
    result.skippedTriggerKeys.push(t.key);
    return duplicate;
  }
  const available = s.jobs.find(
    (j) => j.assetId === a.id && j.status === "available",
  );
  if (available) {
    available.triggers.push(t);
    result.updatedJobIds.push(available.id);
    return available;
  }
  const job: InspectionJob = {
    id: crypto.randomUUID(),
    assetId: a.id,
    triggers: [t],
    status: "available",
    assigneeId: null,
    claimedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    checklist: checklist(a.type),
    inspection: null,
  };
  s.jobs.push(job);
  result.createdJobIds.push(job.id);
  return job;
}
