export type Id = string;
export type LocalDate = string; // Valid YYYY-MM-DD, using demo browser's local date.
export type Timestamp = string; // ISO 8601 UTC timestamp.
export type Condition = "unknown" | "healthy" | "needs_attention" | "critical";
export type AssetType = "farm" | "pond" | "solar_system";

export interface User {
  id: Id;
  name: string;
  role: "community" | "admin";
}

export interface Zone {
  id: Id;
  name: string;
  bounds: { south: number; west: number; north: number; east: number };
}

export interface Asset {
  id: Id;
  name: string;
  type: AssetType;
  latitude: number;
  longitude: number;
  zoneId: Id;
  condition: Condition;
  inspectionIntervalDays: number;
  nextInspectionDue: LocalDate;
  lastInspectedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface Complaint {
  id: Id;
  assetId: Id;
  reporterId: Id;
  description: string;
  status: "open" | "reviewed_action_needed" | "resolved";
  createdAt: Timestamp;
}

export type Trigger =
  | { kind: "complaint"; complaintId: Id; key: string }
  | { kind: "due"; dueDate: LocalDate; key: string }
  | { kind: "hazard"; hazardEventId: Id; key: string };

export interface Checklist {
  version: number;
  questions: { id: string; label: string }[];
}

export interface InspectionJob {
  id: Id;
  assetId: Id;
  triggers: Trigger[];
  priority: "low" | "medium" | "high";
  status: "available" | "assigned" | "completed";
  assigneeId: Id | null;
  createdAt: Timestamp;
  claimedAt: Timestamp | null;
  completedAt: Timestamp | null;
  checklist: Checklist; // Copy of template at job creation, not a live reference.
  inspection: {
    answers: Record<string, "pass" | "fail" | "not_applicable">;
    condition: Exclude<Condition, "unknown">;
    notes: string;
    resolvedComplaintIds: Id[];
  } | null;
}

export interface HazardEvent {
  id: Id;
  type: "rainfall" | "flooding";
  zoneId: Id;
  affectedAssetIds: Id[];
  simulated: true;
  createdAt: Timestamp;
}

export interface Snapshot {
  schemaVersion: 1;
  users: User[];
  zones: Zone[];
  assets: Asset[];
  complaints: Complaint[];
  jobs: InspectionJob[];
  hazardEvents: HazardEvent[];
}
