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

export type HazardType = "rainfall" | "heat" | "dengue";
// Alerts have one level. The field is kept so saved records stay readable.
export type HazardLevel = "watch" | "warning";
// Where a reading came from. Simulated readings come from the scenario generator.
export type ReadingSource = "live" | "sensor" | "manual" | "simulated";

export type Trigger =
  | { kind: "complaint"; complaintId: Id; key: string }
  | { kind: "due"; dueDate: LocalDate; key: string }
  | { kind: "hazard"; hazardEventId: Id; key: string; level?: HazardLevel };

export interface Checklist {
  version: number;
  questions: { id: string; label: string }[];
}

export interface InspectionJob {
  id: Id;
  assetId: Id;
  triggers: Trigger[];
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
  type: HazardType;
  zoneId: Id;
  level: HazardLevel; // Current level while active, last level once cleared.
  reason: string; // The rule that fired, in plain words.
  source: ReadingSource;
  affectedAssetIds: Id[]; // Assets that received an inspection trigger.
  simulated: boolean;
  createdAt: Timestamp;
  clearedAt: Timestamp | null; // null while the warning is active.
}

export interface Reading {
  zoneId: Id;
  type: HazardType;
  // rainfall: mm today. heat: the day's highest temperature in °C.
  // dengue: 1 when the health feed reports dengue in the zone, otherwise 0.
  value: number;
  forecast?: number; // rainfall only: mm expected in the next 24 hours.
  source: ReadingSource;
  note?: string; // What lies behind a simulated reading.
  observedAt: Timestamp;
}

export interface Scenario {
  mode: "live" | "simulated";
  seed: number; // The same seed gives the same weather on every device.
  day: number; // 0 is the first day of the simulated scenario.
  // A storm, a heatwave or a dengue report that someone triggered by hand.
  triggered: { zoneId: Id; day: number; kind: HazardType }[];
}

export interface Snapshot {
  schemaVersion: 1;
  users: User[];
  zones: Zone[];
  assets: Asset[];
  complaints: Complaint[];
  jobs: InspectionJob[];
  readings: Reading[];
  hazardEvents: HazardEvent[];
  scenario: Scenario;
  // Scheduled inspections become jobs only after someone asks for the check,
  // so a new workspace opens with an empty job list.
  dueChecks: boolean;
  healthNotices: Id[]; // Zones with a public health notice in effect.
}
