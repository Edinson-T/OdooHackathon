import type { Asset } from "../domain/types";
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "JOB_UNAVAILABLE"
  | "INVALID_STATE"
  | "STORAGE_UNAVAILABLE"
  | "DATA_VERSION_UNSUPPORTED"
  | "DATA_INVALID";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export type Actor = { actorId: string };

export type AssetInput = Pick<
  Asset,
  | "name"
  | "type"
  | "latitude"
  | "longitude"
  | "zoneId"
  | "inspectionIntervalDays"
  | "nextInspectionDue"
>;

// Condition/history are changed through inspections, not metadata edits.
export type AssetPatch = Partial<Omit<AssetInput, "type">>;

export type CompletionInput = {
  answers: Record<string, "pass" | "fail" | "not_applicable">;
  condition: "healthy" | "needs_attention" | "critical";
  notes: string;
  resolvedComplaintIds: string[];
};

export type TriggerResult = {
  createdJobIds: string[];
  updatedJobIds: string[];
  skippedTriggerKeys: string[];
};
