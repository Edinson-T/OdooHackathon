import { Sprout, Waves, Sun, PackageOpen } from "lucide-react";
import { alertTitle } from "../domain/warnings";
import type {
  AssetType,
  HazardLevel,
  Snapshot,
  Trigger,
} from "../domain/types";
export const labels: Record<string, string> = {
  farm: "Farm",
  pond: "Pond",
  solar_system: "Solar system",
  healthy: "Healthy",
  needs_attention: "Needs inspection",
  critical: "Critical",
  unknown: "Unknown",
  available: "Available",
  assigned: "Assigned",
  completed: "Completed",
  due: "Due inspection",
  complaint: "Complaint",
  hazard: "Hazard",
  open: "Open",
  reviewed_action_needed: "Reviewed · action needed",
  resolved: "Resolved",
  low: "Low",
  medium: "Medium",
  high: "High",
  watch: "Watch",
  warning: "Warning",
  live: "Live source",
  sensor: "Sensor feed",
  manual: "Entered by an admin",
  simulated: "Simulated",
};
// What caused a job, in words. A hazard is named with the highest level the
// job was given for that warning, for example "Flood warning".
export function reasons(s: Snapshot, triggers: Trigger[]) {
  const top = new Map<string, HazardLevel>();
  for (const t of triggers)
    if (t.kind === "hazard" && top.get(t.hazardEventId) !== "warning")
      top.set(t.hazardEventId, t.level ?? "warning");
  return Array.from(
    new Set(
      triggers.map((t) => {
        if (t.kind !== "hazard") return labels[t.kind];
        const event = s.hazardEvents.find((e) => e.id === t.hazardEventId);
        return event ? alertTitle(event.type, top.get(event.id)!) : labels.hazard;
      }),
    ),
  );
}
export function KindIcon({
  kind,
  size = 19,
}: {
  kind: AssetType;
  size?: number;
}) {
  const Icon = { farm: Sprout, pond: Waves, solar_system: Sun }[kind];
  return <Icon size={size} />;
}
export function Badge({ v }: { v: string }) {
  return (
    <span className={"badge " + v}>
      <i />
      {labels[v] || v}
    </span>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <PackageOpen size={24} />
      <p>{text}</p>
    </div>
  );
}
export const dateText = (s: string) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function go(path: string) {
  location.hash = path;
}
